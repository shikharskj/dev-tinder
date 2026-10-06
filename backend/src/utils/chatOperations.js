import Conversation from "../models/conversation.js";
import Message from "../models/message.js";
import User from "../models/user.js";
import { effectiveUsagePlan } from "./subscription.js";
import {
  attachmentKeyBelongsTo,
  signAttachmentUrls,
  verifyAttachment,
} from "./attachments.js";
import {
  ALLOWED_REACTIONS,
  DELETE_FOR_EVERYONE_WINDOW_MS,
  getChatAccess,
  isValidObjectId,
  getPreferences,
  isUserOnline,
  markDelivered,
  MAX_MESSAGE_LENGTH,
  persistMessage,
  updateReadState,
} from "./chat.js";

const MESSAGE_ID_PATTERN = /^[\w-]{8,100}$/;

const REPLY_PREVIEW_LENGTH = 140;

function badRequest(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

// Shapes a message for clients. `viewerId` hides sender-only fields from the
// other participant; omit it for room broadcasts shared by both.
export function publicMessage(
  message,
  {
    viewerId = null,
    revealReadAt = false,
    replyMap = null,
    attachmentUrls = null,
  } = {},
) {
  const own = viewerId && String(message.senderId) === String(viewerId);
  const deleted = Boolean(message.deletedForEveryoneAt);
  const replied = message.replyTo
    ? replyMap?.get(String(message.replyTo)) || null
    : null;

  return {
    _id: message._id,
    conversationId: message.conversationId,
    senderId: message.senderId,
    clientMessageId: message.clientMessageId,
    text: deleted ? "" : message.text,
    createdAt: message.createdAt,
    ...(deleted ? { deleted: true } : {}),
    ...(!deleted && message.attachment?.key && attachmentUrls?.has(String(message._id))
      ? {
          attachment: {
            url: attachmentUrls.get(String(message._id)),
            contentType: message.attachment.contentType,
            size: message.attachment.size,
          },
        }
      : {}),
    ...(message.reactions?.length && !deleted
      ? {
          reactions: message.reactions.map(({ userId, emoji }) => ({
            userId,
            emoji,
          })),
        }
      : {}),
    ...(message.replyTo
      ? {
          replyTo: replied
            ? {
                _id: replied._id,
                senderId: replied.senderId,
                deleted: Boolean(replied.deletedForEveryoneAt),
                text: replied.deletedForEveryoneAt
                  ? ""
                  : replied.text
                    ? replied.text.slice(0, REPLY_PREVIEW_LENGTH)
                    : "📷 Photo",
              }
            : { _id: message.replyTo, unavailable: true },
        }
      : {}),
    ...((!viewerId || own) && message.deliveredAt
      ? { deliveredAt: message.deliveredAt }
      : {}),
    ...(revealReadAt && message.readAt ? { readAt: message.readAt } : {}),
  };
}

export async function loadReplyMap(messages) {
  const ids = [
    ...new Set(
      messages.filter((message) => message.replyTo).map((m) => String(m.replyTo)),
    ),
  ];
  if (!ids.length) return new Map();
  const replied = await Message.find({ _id: { $in: ids } })
    .select("senderId text attachment deletedForEveryoneAt")
    .lean();
  return new Map(replied.map((message) => [String(message._id), message]));
}

function otherParticipant(conversation, userId) {
  return String(
    conversation.participants.find(
      (participantId) => String(participantId) !== String(userId),
    ),
  );
}

async function broadcastMessageUpdate(io, conversation, message, replyMap) {
  if (!io) return;
  const conversationId = String(conversation._id);
  io.to(conversationId).emit("message:updated", {
    conversationId,
    message: publicMessage(message, {
      replyMap,
      attachmentUrls: await signAttachmentUrls([message]),
    }),
  });
  conversation.participants.forEach((participantId) =>
    io.to(`user:${participantId}`).emit("chat:inbox-updated", { conversationId }),
  );
}

async function loadAuthorizedMessage(conversation, messageId, userId) {
  if (!isValidObjectId(String(messageId))) {
    throw badRequest("Invalid message ID.");
  }
  const message = await Message.findOne({
    _id: messageId,
    conversationId: conversation._id,
    deletedFor: { $ne: userId },
  });
  if (!message) throw badRequest("Message not found.", 404);
  return message;
}

async function requireOpenChat(conversation, userId) {
  const access = await getChatAccess(userId, otherParticipant(conversation, userId));
  if (!access.accepted || access.blocked) {
    throw badRequest(
      access.blocked
        ? "This conversation is blocked."
        : "Only accepted connections can interact in this chat.",
      403,
    );
  }
}

export async function sendChatMessage(io, conversation, senderId, payload) {
  const hasAttachment =
    payload?.attachmentKey !== undefined && payload?.attachmentKey !== null;
  const text = typeof payload?.text === "string" ? payload.text.trim() : "";

  if (
    !payload ||
    (typeof payload.text !== "string" && !hasAttachment) ||
    (!text && !hasAttachment) ||
    text.length > MAX_MESSAGE_LENGTH ||
    typeof payload.clientMessageId !== "string" ||
    !MESSAGE_ID_PATTERN.test(payload.clientMessageId)
  ) {
    throw badRequest(
      "Messages must contain 1–4000 characters and a valid client message ID.",
    );
  }

  let attachment = null;
  if (hasAttachment) {
    if (!attachmentKeyBelongsTo(payload.attachmentKey, String(conversation._id))) {
      throw badRequest("Invalid image attachment.");
    }
    attachment = {
      key: payload.attachmentKey,
      ...(await verifyAttachment(payload.attachmentKey)),
    };
  }

  let replyTo = null;
  if (payload.replyToId !== undefined && payload.replyToId !== null) {
    if (typeof payload.replyToId !== "string" || !isValidObjectId(payload.replyToId)) {
      throw badRequest("Invalid reply target.");
    }
    const target = await Message.exists({
      _id: payload.replyToId,
      conversationId: conversation._id,
      deletedFor: { $ne: senderId },
    });
    if (!target) throw badRequest("The message you are replying to no longer exists.");
    replyTo = payload.replyToId;
  }

  const message = await persistMessage({
    conversation,
    senderId,
    clientMessageId: payload.clientMessageId,
    text,
    replyTo,
    attachment,
  });

  const sender = String(senderId);
  const recipient = otherParticipant(conversation, sender);

  if (!message.deliveredAt && isUserOnline(recipient)) {
    const deliveredAt = new Date();
    await Message.updateOne(
      { _id: message._id, deliveredAt: null },
      { $set: { deliveredAt } },
    );
    message.deliveredAt = deliveredAt;
  }

  if (io) {
    const conversationId = String(conversation._id);
    const [replyMap, attachmentUrls] = await Promise.all([
      loadReplyMap([message]),
      signAttachmentUrls([message]),
    ]);
    const event = {
      conversationId,
      message: publicMessage(message, { replyMap, attachmentUrls }),
    };

    io.to(`user:${recipient}`).emit("chat:inbox-updated", { conversationId });
    io.to(`user:${sender}`).emit("chat:inbox-updated", { conversationId });
    io.to(conversationId).emit("message:new", event);
  }

  return message;
}

export async function deleteChatMessage(
  io,
  conversation,
  userId,
  messageId,
  scope,
) {
  const message = await loadAuthorizedMessage(conversation, messageId, userId);

  if (scope === "me") {
    await Message.updateOne(
      { _id: message._id },
      { $addToSet: { deletedFor: userId } },
    );
    return { scope, messageId: String(message._id) };
  }

  if (scope !== "everyone") throw badRequest("Invalid delete scope.");
  await requireOpenChat(conversation, userId);
  if (String(message.senderId) !== String(userId)) {
    throw badRequest("Only the sender can delete a message for everyone.", 403);
  }
  if (
    Date.now() - new Date(message.createdAt).getTime() >
    DELETE_FOR_EVERYONE_WINDOW_MS
  ) {
    throw badRequest("This message is too old to delete for everyone.", 403);
  }

  if (!message.deletedForEveryoneAt) {
    message.deletedForEveryoneAt = new Date();
    await Message.updateOne(
      { _id: message._id },
      { $set: { deletedForEveryoneAt: message.deletedForEveryoneAt, reactions: [] } },
    );
    message.reactions = [];
    await Conversation.updateOne(
      {
        _id: conversation._id,
        "lastMessage.createdAt": message.createdAt,
        "lastMessage.senderId": message.senderId,
      },
      { $set: { "lastMessage.text": "🚫 This message was deleted" } },
    );
    await broadcastMessageUpdate(io, conversation, message, new Map());
  }

  return { scope, message: publicMessage(message, { viewerId: userId }) };
}

export async function reactToChatMessage(
  io,
  conversation,
  userId,
  messageId,
  emoji,
) {
  if (typeof emoji !== "string" || !ALLOWED_REACTIONS.includes(emoji)) {
    throw badRequest("Unsupported reaction.");
  }
  await requireOpenChat(conversation, userId);
  const message = await loadAuthorizedMessage(conversation, messageId, userId);
  if (message.deletedForEveryoneAt) {
    throw badRequest("You can’t react to a deleted message.");
  }

  const existing = message.reactions.find(
    (reaction) => String(reaction.userId) === String(userId),
  );
  const others = message.reactions.filter(
    (reaction) => String(reaction.userId) !== String(userId),
  );
  // Same emoji toggles the reaction off; a different one replaces it.
  const next =
    existing?.emoji === emoji ? others : [...others, { userId, emoji }];

  await Message.updateOne({ _id: message._id }, { $set: { reactions: next } });
  message.reactions = next;

  const replyMap = await loadReplyMap([message]);
  await broadcastMessageUpdate(io, conversation, message, replyMap);
  return publicMessage(message, {
    viewerId: userId,
    replyMap,
    attachmentUrls: await signAttachmentUrls([message]),
  });
}

export async function markChatRead(io, conversation, readerId) {
  await markDelivered(io, readerId, [conversation._id]);
  const readAt = await updateReadState(conversation, readerId);
  const targetUserId = conversation.participants.find(
    (participantId) => String(participantId) !== String(readerId),
  );
  const [access, readerPreferences, sender] = await Promise.all([
    getChatAccess(readerId, targetUserId),
    getPreferences(readerId),
    User.findById(targetUserId).select(
      "usagePlan eliteSubscriptionExpiresAt",
    ),
  ]);

  if (
    io &&
    access.accepted &&
    !access.blocked &&
    readerPreferences.readReceiptsEnabled &&
    sender &&
    effectiveUsagePlan(sender) === "Elite"
  ) {
    io.to(`user:${targetUserId}`).emit("message:read", {
      conversationId: String(conversation._id),
      readerId: String(readerId),
      readAt,
    });
  }

  io?.to(`user:${readerId}`).emit("chat:inbox-updated", {
    conversationId: String(conversation._id),
  });

  return readAt;
}
