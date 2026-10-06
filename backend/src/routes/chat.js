import express from "express";
import { subDays } from "date-fns";
import ChatPreference from "../models/chatPreference.js";
import ChatPresence from "../models/chatPresence.js";
import Conversation, {
  getConversationPairKey,
} from "../models/conversation.js";
import Message from "../models/message.js";
import User from "../models/user.js";
import authenticateUser from "../middlewares/auth.js";
import { sendError, sendSuccess } from "../utils/response.js";
import {
  ensureConversation,
  getChatAccess,
  getPreferences,
  getUnreadCounts,
  isValidObjectId,
  markDelivered,
  participantState,
} from "../utils/chat.js";
import { activeChatSockets } from "../utils/chatSocketState.js";
import { effectiveUsagePlan } from "../utils/subscription.js";
import {
  attachmentsEnabled,
  createUploadTarget,
  signAttachmentUrls,
} from "../utils/attachments.js";
import { getLinkPreview } from "../utils/linkPreview.js";
import {
  deleteChatMessage,
  loadReplyMap,
  markChatRead,
  publicMessage,
  reactToChatMessage,
  sendChatMessage,
} from "../utils/chatOperations.js";
import chatPreferencesRouter from "./chat/preferences.js";
import chatSafetyRouter from "./chat/safety.js";

const chatRouter = express.Router();
const PAGE_SIZE = 30;
const BASIC_HISTORY_DAYS = 7;

function createRateLimiter(limit, windowMs) {
  const buckets = new Map();
  return (userId) => {
    const key = String(userId);
    const now = Date.now();
    const bucket = buckets.get(key);
    if (!bucket || now - bucket.startedAt >= windowMs) {
      buckets.set(key, { startedAt: now, count: 1 });
      return;
    }
    if (bucket.count >= limit) {
      const error = new Error("Too many requests. Try again shortly.");
      error.status = 429;
      throw error;
    }
    bucket.count += 1;
  };
}

const enforceUploadRateLimit = createRateLimiter(20, 60_000);
const enforcePreviewRateLimit = createRateLimiter(30, 60_000);

function conversationForParticipant(conversationId, userId) {
  return Conversation.findOne({
    _id: conversationId,
    participants: userId,
  });
}

async function getReadReceiptVisibility(conversation, viewer) {
  if (viewer.usagePlan !== "Elite") {
    return false;
  }

  const otherUserId = conversation.participants.find(
    (participantId) => String(participantId) !== String(viewer._id),
  );

  if (!otherUserId) {
    return false;
  }

  const [preferences, access] = await Promise.all([
    ChatPreference.findOne({ userId: otherUserId }).lean(),
    getChatAccess(viewer._id, otherUserId),
  ]);

  if (!access.accepted || access.blocked) {
    return false;
  }

  return preferences?.readReceiptsEnabled !== false;
}

chatRouter.get("/chat/conversations", authenticateUser, async (req, res) => {
  try {
    const archived = req.query.archived === "true";

    const conversations = await Conversation.find({
      participants: req.user._id,
      "participantStates": {
        $elemMatch: { userId: req.user._id, archived },
      },
    }).sort({ "lastMessage.createdAt": -1, updatedAt: -1 });

    void markDelivered(
      req.app.get("io"),
      req.user._id,
      conversations.map(({ _id }) => _id),
    ).catch((error) => console.error("Unable to mark delivered:", error));

    const otherIds = conversations
      .map((conversation) =>
        conversation.participants.find(
          (participantId) => String(participantId) !== String(req.user._id),
        ),
      )
      .filter(Boolean);

    const [users, unreadCounts] = await Promise.all([
      User.find({ _id: { $in: otherIds } }).select(
        "firstName lastName photoUrl usagePlan",
      ),
      getUnreadCounts(
        conversations,
        req.user._id,
        req.user.usagePlan === "Elite"
          ? null
          : subDays(new Date(), BASIC_HISTORY_DAYS),
      ),
    ]);

    const usersById = new Map(users.map((user) => [String(user._id), user]));

    const results = conversations.map((conversation) => {
      const state = participantState(conversation, req.user._id);

      const otherId = conversation.participants.find(
        (participantId) => String(participantId) !== String(req.user._id),
      );

      const otherUser = usersById.get(String(otherId));

      return {
        conversationId: conversation._id,
        user: otherUser,
        lastMessage:
          req.user.usagePlan === "Elite" ||
          !conversation.lastMessage?.createdAt ||
          conversation.lastMessage.createdAt >= subDays(
            new Date(),
            BASIC_HISTORY_DAYS,
          )
            ? conversation.lastMessage
            : null,
        unreadCount: unreadCounts.get(String(conversation._id)) || 0,
        archived: state?.archived || false,
        muted: state?.muted || false,
      };
    });

    return sendSuccess(res, 200, "Conversations fetched.", results);
  } catch (error) {
    console.error("Error fetching conversations:", error);
    return sendError(res, 500, "Unable to fetch conversations.");
  }
});

chatRouter.get("/chat/unread-count", authenticateUser, async (req, res) => {
  try {
    const conversations = await Conversation.find({
      participants: req.user._id,
    });

    void markDelivered(req.app.get("io"), req.user._id).catch((error) =>
      console.error("Unable to mark delivered:", error),
    );

    const counts = await getUnreadCounts(
      conversations,
      req.user._id,
      req.user.usagePlan === "Elite"
        ? null
        : subDays(new Date(), BASIC_HISTORY_DAYS),
    );

    const unreadCount = [...counts.values()].reduce(
      (total, count) => total + count,
      0,
    );
    
    return sendSuccess(res, 200, "Unread message count fetched.", {
      unreadCount,
    });
  } catch (error) {
    console.error("Error fetching unread message count:", error);
    return sendError(res, 500, "Unable to fetch unread message count.");
  }
});

// Opening a conversation
chatRouter.get(
  "/chat/conversations/with/:targetUserId",
  authenticateUser,
  async (req, res) => {
    const { targetUserId } = req.params;

    if (!isValidObjectId(targetUserId) || targetUserId === String(req.user._id)) {
      return sendError(res, 400, "Invalid chat participant.");
    }

    try {
      const pairKey = getConversationPairKey(req.user._id, targetUserId);
      let conversation = await Conversation.findOne({ pairKey });

      if (!conversation) {
        conversation = await ensureConversation(req.user._id, targetUserId);
      }

      // Fetch the target user, access, and preferences in parallel
      const [target, access, preferences] = await Promise.all([
        User.findById(targetUserId).select(
          "firstName lastName photoUrl usagePlan bio skills interests age",
        ),
        getChatAccess(req.user._id, targetUserId),
        getPreferences(req.user._id),
      ]);

      if (!target) {
        return sendError(res, 404, "Connection not found.");
      }

      // Determine the state of the logged-in user in the conversation
      const ownState = participantState(conversation, req.user._id);

      // Determine if the target user shares activity and their online status
      const targetPreferences = await ChatPreference.findOne({
        userId: targetUserId,
      }).lean();
      const targetSharesActivity =
        access.accepted &&
        !access.blocked &&
        targetPreferences?.activitySharingEnabled !== false;

      // Determine if the target user is online based on active chat sockets
      const targetOnline =
        targetSharesActivity &&
        Boolean(activeChatSockets.get(String(targetUserId))?.size);

      // Determine if the conversation history is limited based on the logged-in user's usage plan
      const historyCutoff =
        req.user.usagePlan === "Elite"
          ? null
          : subDays(new Date(), BASIC_HISTORY_DAYS);

      const historyLimited = historyCutoff
        ? Boolean(
            await Message.exists({
              conversationId: conversation._id,
              createdAt: { $lt: historyCutoff },
            }),
          )
        : false;

      return sendSuccess(res, 200, "Conversation fetched.", {
        conversationId: conversation._id,
        targetUser: {
          _id: target._id,
          firstName: target.firstName,
          lastName: target.lastName,
          photoUrl: target.photoUrl,
          usagePlan: effectiveUsagePlan(target),
          bio: target.bio,
          skills: target.skills,
          interests: target.interests,
          age: target.age,
        },
        lastReadAt: ownState?.lastReadAt || null,
        readOnly: !access.accepted || access.blocked,
        blocked: access.blocked,
        blockedByMe: access.blockedByMe,
        archived: ownState?.archived || false,
        muted: ownState?.muted || false,
        preferences: {
          readReceiptsEnabled: preferences.readReceiptsEnabled,
          activitySharingEnabled: preferences.activitySharingEnabled,
        },
        targetSharesActivity,
        presence: {
          online: targetOnline,
          lastActiveAt:
            targetSharesActivity && !targetOnline
              ? (
                  await ChatPresence.findOne({
                    userId: targetUserId,
                  }).select("lastActiveAt").lean()
                )?.lastActiveAt || null
              : null,
          hidden: !targetSharesActivity,
        },
        historyWindowDays:
          req.user.usagePlan === "Elite" ? null : BASIC_HISTORY_DAYS,
        historyLimited,
      });
    } catch (error) {
      if (error.status) return sendError(res, error.status, error.message);
      console.error("Error opening conversation:", error);
      return sendError(res, 500, "Unable to open conversation.");
    }
  },
);

// Loading message history and scrolling backward
chatRouter.get(
  "/chat/conversations/:conversationId/messages",
  authenticateUser,
  async (req, res) => {
    const { conversationId } = req.params;

    const { before } = req.query;

    if (
      !isValidObjectId(conversationId) ||
      (before !== undefined && !isValidObjectId(before))
    ) {
      return sendError(res, 400, "Invalid conversation or pagination cursor.");
    }

    try {
      const conversation = await conversationForParticipant(
        conversationId,
        req.user._id,
      );

      if (!conversation) {
        return sendError(res, 404, "Conversation not found.");
      }

      const query = {
        conversationId: conversation._id,
        deletedFor: { $ne: req.user._id },
      };

      // Determine the cutoff date for message history based on the user's usage plan
      const historyCutoff =
        req.user.usagePlan === "Elite"
          ? null
          : subDays(new Date(), BASIC_HISTORY_DAYS);

      if (historyCutoff) {
        query.createdAt = { $gte: historyCutoff };
      }

      // If a pagination cursor is provided, find the message corresponding to that cursor and adjust the query to fetch messages before that point
      if (before) {
        const cursorMessage = await Message.findOne({
          _id: before,
          conversationId: conversation._id,
        }).select("createdAt");

        if (!cursorMessage) {
          return sendError(res, 400, "Invalid message pagination cursor.");
        }

        if (
          historyCutoff &&
          cursorMessage.createdAt < historyCutoff
        ) {
          return sendError(
            res,
            400,
            "Basic plan history is limited to the last 7 days.",
          );
        }

        // Adjust the query to fetch messages created before the cursor message, and if they have the same timestamp, also ensure they have a lower ID to maintain consistent ordering
        query.$or = [
          { createdAt: { $lt: cursorMessage.createdAt } },
          {
            createdAt: cursorMessage.createdAt,
            _id: { $lt: cursorMessage._id },
          },
        ];
      }

      // Fetch messages and determine if read receipts should be revealed based on the user's preferences and the other participant's settings
      const [messages, revealReadAt] = await Promise.all([
        Message.find(query)
          .sort({ createdAt: -1, _id: -1 })
          .limit(PAGE_SIZE + 1)
          .lean(),
        getReadReceiptVisibility(conversation, req.user),
      ]);

      const hasMore = messages.length > PAGE_SIZE;
      const page = messages.slice(0, PAGE_SIZE).reverse();
      const [replyMap, attachmentUrls] = await Promise.all([
        loadReplyMap(page),
        signAttachmentUrls(page),
      ]);

      return sendSuccess(res, 200, "Messages fetched.", {
        messages: page.map((message) =>
          publicMessage(message, {
            revealReadAt,
            viewerId: req.user._id,
            replyMap,
            attachmentUrls,
          }),
        ),
        hasMore,
        nextCursor: hasMore ? page[0]?._id : null,
      });
    } catch (error) {
      console.error("Error fetching messages:", error);
      return sendError(res, 500, "Unable to fetch messages.");
    }
  },
);

// Sending a message
chatRouter.post(
  "/chat/conversations/:conversationId/messages",
  authenticateUser,
  async (req, res) => {
    const { conversationId } = req.params;

    if (!isValidObjectId(conversationId)) {
      return sendError(res, 400, "Invalid conversation ID.");
    }

    try {
      const conversation = await conversationForParticipant(
        conversationId,
        req.user._id,
      );

      if (!conversation) {
        return sendError(res, 404, "Conversation not found.");
      }

      const message = await sendChatMessage(
        req.app.get("io"),
        conversation,
        req.user._id,
        req.body,
      );

      return sendSuccess(
        res,
        201,
        "Message sent.",
        publicMessage(message, {
          viewerId: req.user._id,
          replyMap: await loadReplyMap([message]),
          attachmentUrls: await signAttachmentUrls([message]),
        }),
      );
    } catch (error) {
      if (error.status) {
        return sendError(res, error.status, error.message);
      }

      console.error(
        "Error sending chat message:",
        error?.name || "Unknown error",
        error?.code || "",
      );
      return sendError(res, 500, "Unable to send message.");
    }
  },
);

// Requesting a short-lived presigned URL to upload one chat image
chatRouter.post(
  "/chat/conversations/:conversationId/attachments",
  authenticateUser,
  async (req, res) => {
    if (!isValidObjectId(req.params.conversationId)) {
      return sendError(res, 400, "Invalid conversation ID.");
    }

    try {
      const conversation = await conversationForParticipant(
        req.params.conversationId,
        req.user._id,
      );
      if (!conversation) {
        return sendError(res, 404, "Conversation not found.");
      }

      const otherUserId = conversation.participants.find(
        (participantId) => String(participantId) !== String(req.user._id),
      );
      const access = await getChatAccess(req.user._id, otherUserId);
      if (!access.accepted || access.blocked) {
        return sendError(res, 403, "You can’t send images in this conversation.");
      }
      enforceUploadRateLimit(req.user._id);

      const target = await createUploadTarget(
        String(conversation._id),
        req.body?.contentType,
        req.body?.size,
      );
      return sendSuccess(res, 201, "Upload URL created.", target);
    } catch (error) {
      if (error.status) return sendError(res, error.status, error.message);
      console.error("Error creating attachment upload:", error);
      return sendError(res, 500, "Unable to prepare the image upload.");
    }
  },
);

chatRouter.get("/chat/capabilities", authenticateUser, (req, res) =>
  sendSuccess(res, 200, "Chat capabilities fetched.", {
    imageUploads: attachmentsEnabled(),
  }),
);

// Link preview for a URL found in a message (SSRF-guarded fetch)
chatRouter.get("/chat/link-preview", authenticateUser, async (req, res) => {
  const url = typeof req.query.url === "string" ? req.query.url : "";
  if (!url || url.length > 2048) {
    return sendError(res, 400, "Provide a valid URL.");
  }

  try {
    enforcePreviewRateLimit(req.user._id);
    const preview = await getLinkPreview(url);
    return sendSuccess(res, 200, "Link preview fetched.", preview);
  } catch (error) {
    if (error.status) return sendError(res, error.status, error.message);
    return sendSuccess(res, 200, "No preview available.", null);
  }
});

// Deleting a message for the current user or for everyone
chatRouter.delete(
  "/chat/conversations/:conversationId/messages/:messageId",
  authenticateUser,
  async (req, res) => {
    const { conversationId, messageId } = req.params;
    if (!isValidObjectId(conversationId) || !isValidObjectId(messageId)) {
      return sendError(res, 400, "Invalid conversation or message ID.");
    }

    try {
      const conversation = await conversationForParticipant(
        conversationId,
        req.user._id,
      );
      if (!conversation) {
        return sendError(res, 404, "Conversation not found.");
      }

      const result = await deleteChatMessage(
        req.app.get("io"),
        conversation,
        req.user._id,
        messageId,
        req.query.scope,
      );
      return sendSuccess(res, 200, "Message deleted.", result);
    } catch (error) {
      if (error.status) return sendError(res, error.status, error.message);
      console.error("Error deleting message:", error);
      return sendError(res, 500, "Unable to delete message.");
    }
  },
);

// Reacting to a message (same emoji again removes the reaction)
chatRouter.put(
  "/chat/conversations/:conversationId/messages/:messageId/reaction",
  authenticateUser,
  async (req, res) => {
    const { conversationId, messageId } = req.params;
    if (!isValidObjectId(conversationId) || !isValidObjectId(messageId)) {
      return sendError(res, 400, "Invalid conversation or message ID.");
    }

    try {
      const conversation = await conversationForParticipant(
        conversationId,
        req.user._id,
      );
      if (!conversation) {
        return sendError(res, 404, "Conversation not found.");
      }

      const message = await reactToChatMessage(
        req.app.get("io"),
        conversation,
        req.user._id,
        messageId,
        req.body?.emoji,
      );
      return sendSuccess(res, 200, "Reaction saved.", message);
    } catch (error) {
      if (error.status) return sendError(res, error.status, error.message);
      console.error("Error saving reaction:", error);
      return sendError(res, 500, "Unable to save reaction.");
    }
  },
);

// Marking messages as read
chatRouter.post(
  "/chat/conversations/:conversationId/read",
  authenticateUser,
  async (req, res) => {
    if (!isValidObjectId(req.params.conversationId)) {
      return sendError(res, 400, "Invalid conversation ID.");
    }

    try {
      const conversation = await conversationForParticipant(
        req.params.conversationId,
        req.user._id,
      );

      if (!conversation) {
        return sendError(res, 404, "Conversation not found.");
      }

      const readAt = await markChatRead(
        req.app.get("io"),
        conversation,
        req.user._id,
      );

      return sendSuccess(res, 200, "Conversation marked as read.", { readAt });
    } catch (error) {
      console.error("Error marking conversation as read:", error);
      return sendError(res, 500, "Unable to mark conversation as read.");
    }
  },
);

chatRouter.use(chatPreferencesRouter, chatSafetyRouter);

export default chatRouter;
