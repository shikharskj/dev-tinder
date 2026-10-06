import jwt from "jsonwebtoken";
import { Server } from "socket.io";
import ChatBlock from "../models/chatBlock.js";
import ChatPreference from "../models/chatPreference.js";
import ChatPresence from "../models/chatPresence.js";
import ConnectionRequest from "../models/connectionRequest.js";
import Conversation from "../models/conversation.js";
import User from "../models/user.js";
import { effectiveUsagePlan } from "./subscription.js";
import { activeChatSockets } from "./chatSocketState.js";
import {
  getChatAccess,
  getPreferences,
  isValidObjectId,
  markDelivered,
} from "./chat.js";
import { signAttachmentUrls } from "./attachments.js";
import {
  loadReplyMap,
  markChatRead,
  publicMessage,
  sendChatMessage,
} from "./chatOperations.js";

function readCookie(cookieHeader, cookieName) {
  const item = cookieHeader
    ?.split(";")
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(`${cookieName}=`));
  if (!item) return null;
  try {
    return decodeURIComponent(item.slice(cookieName.length + 1));
  } catch {
    return null;
  }
}

function acknowledge(callback, result) {
  if (typeof callback === "function") callback(result);
}

const initializeSocket = (server) => {
  const allowedOrigins = new Set([
    process.env.FRONTEND_ORIGIN || "http://localhost:5174",
  ]);
  if (process.env.NODE_ENV !== "production") {
    allowedOrigins.add("http://localhost:5173");
    allowedOrigins.add("http://127.0.0.1:5173");
    allowedOrigins.add("http://localhost:5174");
    allowedOrigins.add("http://127.0.0.1:5174");
  }
  const io = new Server(server, {
    cors: {
      origin: [...allowedOrigins],
      methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
      credentials: true,
    },
    allowRequest: (request, callback) => {
      callback(null, allowedOrigins.has(request.headers.origin));
    },
  });

  io.use(async (socket, next) => {
    try {
      const token = readCookie(socket.handshake.headers.cookie, "token");
      if (!token || !process.env.JWT_SECRET) {
        return next(new Error("Authentication required."));
      }
      const { userId } = jwt.verify(token, process.env.JWT_SECRET, {
        issuer: "dev-tinder",
        audience: "dev-tinder-client",
      });
      const user = await User.findById(userId).select(
        "_id usagePlan eliteSubscriptionExpiresAt",
      );
      if (!user) return next(new Error("Authentication required."));
      socket.data.userId = String(user._id);
      socket.data.usagePlan = effectiveUsagePlan(user);
      return next();
    } catch {
      return next(new Error("Authentication required."));
    }
  });

  async function sendPresenceToConnections(userId, online) {
    const preferences = await ChatPreference.findOne({ userId }).lean();
    if (preferences?.activitySharingEnabled === false) return;

    const requests = await ConnectionRequest.find({
      status: "accepted",
      $or: [{ fromUserId: userId }, { toUserId: userId }],
    }).select("fromUserId toUserId");
    const peerIds = requests
      .map((request) =>
        String(request.fromUserId) === String(userId)
          ? request.toUserId
          : request.fromUserId,
      )
      .filter(Boolean);
    if (!peerIds.length) return;

    const pairKeys = peerIds.map((peerId) =>
      [String(userId), String(peerId)].sort().join(":"),
    );
    const blockedPairs = await ChatBlock.find({
      pairKey: { $in: pairKeys },
    }).select("pairKey");
    const blocked = new Set(blockedPairs.map(({ pairKey }) => pairKey));
    const lastActiveAt = online
      ? null
      : (
          await ChatPresence.findOne({ userId }).select("lastActiveAt").lean()
        )?.lastActiveAt || new Date();

    peerIds.forEach((peerId) => {
      const pairKey = [String(userId), String(peerId)].sort().join(":");
      if (!blocked.has(pairKey)) {
        io.to(`user:${peerId}`).emit("presence:update", {
          userId: String(userId),
          online,
          lastActiveAt,
        });
      }
    });
  }

  io.on("connection", (socket) => {
    const userId = socket.data.userId;
    socket.join(`user:${userId}`);
    const userSockets = activeChatSockets.get(userId) || new Set();
    userSockets.add(socket.id);
    activeChatSockets.set(userId, userSockets);
    void markDelivered(io, userId).catch((error) => {
      console.error("Unable to mark messages delivered:", error);
    });
    void sendPresenceToConnections(userId, true).catch((error) => {
      console.error("Unable to broadcast chat presence:", error);
    });

    socket.on("conversation:join", async (payload = {}, callback) => {
      try {
        const conversationId = payload?.conversationId;
        if (!isValidObjectId(conversationId)) {
          return acknowledge(callback, {
            ok: false,
            message: "Invalid conversation.",
          });
        }
        const conversation = await Conversation.findOne({
          _id: conversationId,
          participants: userId,
        });
        if (!conversation) {
          return acknowledge(callback, {
            ok: false,
            message: "Conversation not found.",
          });
        }
        const targetUserId = conversation.participants.find(
          (participantId) => String(participantId) !== userId,
        );
        const access = await getChatAccess(userId, targetUserId);
        if (!access.accepted || access.blocked) {
          return acknowledge(callback, {
            ok: false,
            readOnly: true,
            message: "This conversation is read-only.",
          });
        }
        socket.join(String(conversation._id));
        socket.data.conversationId = String(conversation._id);

        const [targetPreferences, targetPresence, ownPreferences] =
          await Promise.all([
            getPreferences(targetUserId),
            ChatPresence.findOne({ userId: targetUserId })
              .select("lastActiveAt")
              .lean(),
            getPreferences(userId),
          ]);
        const targetSockets = activeChatSockets.get(String(targetUserId));
        socket.emit("presence:update", {
          userId: String(targetUserId),
          online:
            targetPreferences.activitySharingEnabled &&
            Boolean(targetSockets?.size),
          lastActiveAt:
            targetPreferences.activitySharingEnabled && !targetSockets?.size
              ? targetPresence?.lastActiveAt || null
              : null,
          hidden: !targetPreferences.activitySharingEnabled,
        });
        if (ownPreferences.activitySharingEnabled) {
          io.to(`user:${targetUserId}`).emit("presence:update", {
            userId,
            online: true,
            lastActiveAt: null,
          });
        }
        return acknowledge(callback, { ok: true, readOnly: false });
      } catch (error) {
        console.error("Unable to join chat conversation:", error);
        return acknowledge(callback, {
          ok: false,
          message: "Unable to join this conversation.",
        });
      }
    });

    socket.on("conversation:leave", (payload = {}) => {
      const conversationId = payload?.conversationId;
      if (
        isValidObjectId(conversationId) &&
        socket.rooms.has(String(conversationId))
      ) {
        socket.leave(String(conversationId));
        if (socket.data.conversationId === String(conversationId)) {
          delete socket.data.conversationId;
        }
      }
    });

    socket.on("message:send", async (payload = {}, callback) => {
      try {
        const { conversationId } = payload;
        if (
          !isValidObjectId(conversationId) ||
          !socket.rooms.has(String(conversationId))
        ) {
          return acknowledge(callback, {
            ok: false,
            message: "Join an authorized conversation before sending.",
          });
        }
        const conversation = await Conversation.findOne({
          _id: conversationId,
          participants: userId,
        });
        if (!conversation) {
          return acknowledge(callback, {
            ok: false,
            message: "Conversation not found.",
          });
        }
        const message = await sendChatMessage(
          io,
          conversation,
          userId,
          payload,
        );
        return acknowledge(callback, {
          ok: true,
          message: publicMessage(message, {
            viewerId: userId,
            replyMap: await loadReplyMap([message]),
            attachmentUrls: await signAttachmentUrls([message]),
          }),
        });
      } catch (error) {
        if (error.status) {
          return acknowledge(callback, { ok: false, message: error.message });
        }
        console.error("Unable to persist chat message:", error);
        return acknowledge(callback, {
          ok: false,
          message: "Unable to send message. Please retry.",
        });
      }
    });

    socket.on("typing:start", async (payload = {}) => {
      try {
        const conversationId = payload?.conversationId;
        if (
          !isValidObjectId(conversationId) ||
          !socket.rooms.has(String(conversationId))
        ) {
          return;
        }
        const conversation = await Conversation.findOne({
          _id: conversationId,
          participants: userId,
        }).select("participants");
        if (!conversation) return;
        const targetUserId = conversation.participants.find(
          (participantId) => String(participantId) !== userId,
        );
        const access = await getChatAccess(userId, targetUserId);
        if (access.accepted && !access.blocked) {
          socket.to(String(conversationId)).emit("typing:update", {
            conversationId: String(conversationId),
            userId,
            typing: true,
          });
        }
      } catch (error) {
        console.error("Unable to broadcast chat typing status:", error);
      }
    });

    socket.on("typing:stop", async (payload = {}) => {
      try {
        const conversationId = payload?.conversationId;
        if (
          !isValidObjectId(conversationId) ||
          !socket.rooms.has(String(conversationId))
        ) {
          return;
        }
        const conversation = await Conversation.findOne({
          _id: conversationId,
          participants: userId,
        }).select("participants");
        if (!conversation) return;
        const targetUserId = conversation.participants.find(
          (participantId) => String(participantId) !== userId,
        );
        const access = await getChatAccess(userId, targetUserId);
        if (!access.accepted || access.blocked) return;
        socket.to(String(conversationId)).emit("typing:update", {
          conversationId: String(conversationId),
          userId,
          typing: false,
        });
      } catch (error) {
        console.error("Unable to stop chat typing status:", error);
      }
    });

    socket.on("conversation:read", async (payload = {}, callback) => {
      try {
        const conversationId = payload?.conversationId;
        if (
          !isValidObjectId(conversationId) ||
          !socket.rooms.has(String(conversationId))
        ) {
          return acknowledge(callback, {
            ok: false,
            message: "Join an authorized conversation before marking it read.",
          });
        }
        const conversation = await Conversation.findOne({
          _id: conversationId,
          participants: userId,
        });
        if (!conversation) {
          return acknowledge(callback, {
            ok: false,
            message: "Conversation not found.",
          });
        }
        const readAt = await markChatRead(io, conversation, userId);
        return acknowledge(callback, {
          ok: true,
          readAt,
        });
      } catch (error) {
        console.error("Unable to mark chat as read:", error);
        return acknowledge(callback, {
          ok: false,
          message: "Unable to mark chat as read.",
        });
      }
    });

    socket.on("disconnect", async () => {
      const sockets = activeChatSockets.get(userId);
      sockets?.delete(socket.id);
      if (sockets?.size) return;
      activeChatSockets.delete(userId);
      try {
        const lastActiveAt = new Date();
        await ChatPresence.findOneAndUpdate(
          { userId },
          { $set: { userId, lastActiveAt } },
          { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
        );
        await sendPresenceToConnections(userId, false);
      } catch (error) {
        console.error("Unable to persist chat last-active time:", error);
      }
    });
  });

  return io;
};

export default initializeSocket;
