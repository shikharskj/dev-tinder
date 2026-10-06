import express from "express";
import User from "../models/user.js";
import authenticateUser from "../middlewares/auth.js";
import { DIGITS_ONLY_PATTERN, UPDATE_FIELDS } from "../../constants.js";
import { sendError, sendSuccess } from "../utils/response.js";
import ConnectionRequest from "../models/connectionRequest.js";
import mongoose from "mongoose";
import { subDays } from "date-fns";
import Conversation, {
  getConversationPairKey,
} from "../models/conversation.js";
import ChatBlock from "../models/chatBlock.js";
import { getUnreadCounts } from "../utils/chat.js";
import ChatPreference from "../models/chatPreference.js";
import ChatPresence from "../models/chatPresence.js";
import { activeChatSockets } from "../utils/chatSocketState.js";

const userRouter = express.Router();
const BASIC_CHAT_HISTORY_DAYS = 7;

// Get incoming connection requests that are awaiting review.
userRouter.get("/user/requests", authenticateUser, async (req, res) => {
  const loggedInUserId = req.user._id;

  try {
    const connectionRequests = await ConnectionRequest.find({
      toUserId: loggedInUserId,
      status: "interested",
    }).populate("fromUserId", [
      "firstName",
      "lastName",
      "photoUrl",
      "bio",
      "skills",
      "interests",
      "location",
      "age",
      "gender",
    ]);

    return sendSuccess(
      res,
      200,
      "Connection requests fetched successfully.",
      connectionRequests,
    );
  } catch (error) {
    console.error("Error fetching connection requests:", error);
    return sendError(res, 500, "Error fetching connection requests.");
  }
});

userRouter.get("/user/requests/sent", authenticateUser, async (req, res) => {
  try {
    const sentRequests = await ConnectionRequest.find({
      fromUserId: req.user._id,
      status: { $in: ["interested", "accepted", "rejected"] },
    })
      .populate(
        "toUserId",
        "firstName lastName photoUrl bio skills interests location age gender",
      )
      .sort({ updatedAt: -1 });

    return sendSuccess(
      res,
      200,
      "Sent connection requests fetched successfully.",
      sentRequests,
    );
  } catch (error) {
    console.error("Error fetching sent connection requests:", error);
    return sendError(res, 500, "Error fetching sent connection requests.");
  }
});

userRouter.get("/user/connections", authenticateUser, async (req, res) => {
  const loggedInUserId = req.user._id;

  try {
    const connectionRequests = await ConnectionRequest.find({
      $or: [
        { fromUserId: loggedInUserId, status: "accepted" },
        { toUserId: loggedInUserId, status: "accepted" },
      ],
    })
      .populate(
        "fromUserId",
        "firstName lastName photoUrl bio skills interests location age gender",
      )
      .populate(
        "toUserId",
        "firstName lastName photoUrl bio skills interests location age gender",
      );

    const connections = connectionRequests.map((request) => {
      const otherUser =
        request.fromUserId?._id?.toString() === loggedInUserId.toString()
          ? request.toUserId
          : request.fromUserId;

      return {
        requestId: request._id,
        connectedAt: request.updatedAt,
        user: otherUser,
        pairKey: otherUser
          ? getConversationPairKey(loggedInUserId, otherUser._id)
          : null,
      };
    });

    const pairKeys = connections.map(({ pairKey }) => pairKey).filter(Boolean);

    const conversations = await Conversation.find({
      pairKey: { $in: pairKeys },
    });

    const conversationsByPair = new Map(
      conversations.map((conversation) => [conversation.pairKey, conversation]),
    );

    const [unreadCounts, blocks] = await Promise.all([
      getUnreadCounts(
        conversations,
        loggedInUserId,
        req.user.usagePlan === "Elite"
          ? null
          : subDays(new Date(), BASIC_CHAT_HISTORY_DAYS),
      ),
      ChatBlock.find({ pairKey: { $in: pairKeys } }).select(
        "pairKey blockerId blockedId",
      ),
    ]);
    const blockedPairs = new Map(blocks.map((block) => [block.pairKey, block]));
    const peerIds = connections
      .map(({ user }) => user?._id)
      .filter(Boolean);
    const [preferences, presences] = await Promise.all([
      ChatPreference.find({ userId: { $in: peerIds } }).lean(),
      ChatPresence.find({ userId: { $in: peerIds } })
        .select("userId lastActiveAt")
        .lean(),
    ]);
    const preferencesByUser = new Map(
      preferences.map((preference) => [String(preference.userId), preference]),
    );
    const presenceByUser = new Map(
      presences.map((presence) => [String(presence.userId), presence]),
    );

    const results = connections.map(({ pairKey, ...connection }) => {
      const conversation = conversationsByPair.get(pairKey);

      const state = conversation?.participantStates.find(
        (participantState) =>
          String(participantState.userId) === String(loggedInUserId),
      );

      const block = blockedPairs.get(pairKey);
      const peerId = String(connection.user?._id || "");
      const activityShared =
        !block &&
        preferencesByUser.get(peerId)?.activitySharingEnabled !== false;
      const online =
        activityShared && Boolean(activeChatSockets.get(peerId)?.size);
      return {
        ...connection,
        presence: {
          online,
          lastActiveAt:
            activityShared && !online
              ? presenceByUser.get(peerId)?.lastActiveAt || null
              : null,
          hidden: !activityShared,
        },
        chat: conversation
          ? {
              conversationId: conversation._id,
              lastMessage:
                req.user.usagePlan === "Elite" ||
                !conversation.lastMessage?.createdAt ||
                conversation.lastMessage.createdAt >=
                  subDays(new Date(), BASIC_CHAT_HISTORY_DAYS)
                  ? conversation.lastMessage
                  : null,
              unreadCount: unreadCounts.get(String(conversation._id)) || 0,
              archived: state?.archived || false,
              muted: state?.muted || false,
              blocked: Boolean(block),
              blockedByMe:
                String(block?.blockerId || "") === String(loggedInUserId),
            }
          : null,
      };
    });

    return sendSuccess(
      res,
      200,
      "All connections fetched successfully.",
      results,
    );
  } catch (error) {
    console.error("Error fetching user connections:", error);
    return sendError(res, 500, "Error fetching user connections.");
  }
});

userRouter.get("/feed", authenticateUser, async (req, res) => {
  const loggedInUserId = req.user._id;

  const parsePositiveInteger = (value, defaultValue) => {
    if (value === undefined) {
      return defaultValue;
    }

    if (typeof value !== "string" || !DIGITS_ONLY_PATTERN.test(value)) {
      return null;
    }

    const parsedValue = Number(value);
    return Number.isSafeInteger(parsedValue) && parsedValue > 0
      ? parsedValue
      : null;
  };

  const page = parsePositiveInteger(req.query.page, 1);
  let limit = parsePositiveInteger(req.query.limit, 10);

  if (page === null || limit === null) {
    return sendError(res, 400, "Page and limit must be positive integers.");
  }

  limit = limit > 50 ? 50 : limit;

  const skip = (page - 1) * limit;

  if (!Number.isSafeInteger(skip)) {
    return sendError(res, 400, "Page is too large.");
  }

  // Logged in user should see all cards on his feed except -
  // 1 - His own cards
  // 2 - His connections/matches
  // 3 - Already ignored/sent connection requests

  try {
    const connectionRequest = await ConnectionRequest.find({
      $or: [{ fromUserId: loggedInUserId }, { toUserId: loggedInUserId }],
    }).select("fromUserId toUserId");

    const hideUsersFromFeed = new Set();

    connectionRequest.forEach((request) => {
      hideUsersFromFeed.add(request.fromUserId.toString());
      hideUsersFromFeed.add(request.toUserId.toString());
    });

    const users = await User.aggregate([
      {
        $match: {
          _id: {
            $nin: Array.from(
              hideUsersFromFeed,
              (userId) => new mongoose.Types.ObjectId(userId),
            ),
            $ne: loggedInUserId,
          },
        },
      },
      {
        $addFields: {
          isElite: {
            $and: [
              { $eq: ["$usagePlan", "Elite"] },
              { $gt: ["$eliteSubscriptionExpiresAt", new Date()] },
            ],
          },
        },
      },
      { $sort: { isElite: -1, _id: 1 } },
      { $skip: skip },
      { $limit: limit },
      {
        $project: {
          firstName: 1,
          lastName: 1,
          photoUrl: 1,
          bio: 1,
          skills: 1,
          interests: 1,
          location: 1,
          age: 1,
          gender: 1,
          isElite: 1,
        },
      },
    ]);

    return sendSuccess(res, 200, "Feed fetched successfully.", users);
  } catch (error) {
    return sendError(res, 500, "Error fetching feed for the user.");
  }
});
export default userRouter;
