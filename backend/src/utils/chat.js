import mongoose from "mongoose";
import ChatBlock from "../models/chatBlock.js";
import ChatPreference from "../models/chatPreference.js";
import ConnectionRequest from "../models/connectionRequest.js";
import Conversation, {
  getConversationPairKey,
} from "../models/conversation.js";
import Message from "../models/message.js";
import { activeChatSockets } from "./chatSocketState.js";

export const MAX_MESSAGE_LENGTH = 4000;
const MESSAGE_RATE_WINDOW_MS = 60_000;
const MESSAGE_RATE_LIMIT = 60;
const messageRateByUser = new Map();

function enforceMessageRateLimit(userId) {
  const now = Date.now();
  const key = String(userId);
  const current = messageRateByUser.get(key);
  if (!current || now - current.startedAt >= MESSAGE_RATE_WINDOW_MS) {
    messageRateByUser.set(key, { startedAt: now, count: 1 });
    return;
  }
  if (current.count >= MESSAGE_RATE_LIMIT) {
    const error = new Error("You’re sending messages too quickly. Try again shortly.");
    error.status = 429;
    throw error;
  }
  current.count += 1;
}

export function isValidObjectId(value) {
  return typeof value === "string" && mongoose.isValidObjectId(value);
}

export async function getChatAccess(firstUserId, secondUserId) {
  const pairKey = getConversationPairKey(firstUserId, secondUserId);
  const [accepted, blocks, ownBlock] = await Promise.all([
    ConnectionRequest.exists({
      status: "accepted",
      $or: [
        { fromUserId: firstUserId, toUserId: secondUserId },
        { fromUserId: secondUserId, toUserId: firstUserId },
      ],
    }),
    ChatBlock.exists({ pairKey }),
    ChatBlock.exists({ blockerId: firstUserId, blockedId: secondUserId }),
  ]);

  return {
    accepted: Boolean(accepted),
    blocked: Boolean(blocks),
    blockedByMe: Boolean(ownBlock),
    pairKey,
  };
}

export async function ensureConversation(firstUserId, secondUserId) {
  const access = await getChatAccess(firstUserId, secondUserId);
  if (!access.accepted) {
    const error = new Error("Chat is available only to accepted connections.");
    error.status = 403;
    throw error;
  }
  if (access.blocked) {
    const error = new Error("This conversation is blocked.");
    error.status = 403;
    throw error;
  }

  const participants = [firstUserId, secondUserId].sort((a, b) =>
    String(a).localeCompare(String(b)),
  );

  try {
    return await Conversation.findOneAndUpdate(
      { pairKey: access.pairKey },
      {
        $setOnInsert: {
          pairKey: access.pairKey,
          participants,
          participantStates: participants.map((userId) => ({
            userId,
            lastReadAt: new Date(0),
          })),
        },
      },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
    );
  } catch (error) {
    if (error?.code !== 11000) throw error;
    const conversation = await Conversation.findOne({
      pairKey: access.pairKey,
    });
    if (conversation) return conversation;
    throw error;
  }
}

export function participantState(conversation, userId) {
  return conversation.participantStates.find(
    (state) => String(state.userId) === String(userId),
  );
}

export async function getUnreadCounts(
  conversations,
  userId,
  historyCutoff = null,
) {
  if (!conversations.length) return new Map();

  const messageMatch = {
    conversationId: { $in: conversations.map(({ _id }) => _id) },
    senderId: { $ne: userId },
    readAt: null,
  };
  if (historyCutoff) messageMatch.createdAt = { $gte: historyCutoff };

  const counts = await Message.aggregate([
    { $match: messageMatch },
    { $group: { _id: "$conversationId", count: { $sum: 1 } } },
  ]);
  return new Map(counts.map(({ _id, count }) => [String(_id), count]));
}

export const ALLOWED_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];
export const DELETE_FOR_EVERYONE_WINDOW_MS = 60 * 60 * 1000;

export async function persistMessage({
  conversation,
  senderId,
  clientMessageId,
  text,
  replyTo = null,
  attachment = null,
}) {
  const access = await getChatAccess(
    senderId,
    conversation.participants.find(
      (participantId) => String(participantId) !== String(senderId),
    ),
  );

  if (!access.accepted || access.blocked) {
    const error = new Error(
      access.blocked
        ? "This conversation is blocked."
        : "Only accepted connections can send messages.",
    );
    error.status = 403;
    throw error;
  }

  const cleanText = typeof text === "string" ? text.trim() : "";

  if (
    (!cleanText && !attachment) ||
    cleanText.length > MAX_MESSAGE_LENGTH ||
    typeof clientMessageId !== "string" ||
    !/^[\w-]{8,100}$/.test(clientMessageId)
  ) {
    const error = new Error("Provide a valid message and message ID.");
    error.status = 400;
    throw error;
  }

  let message = await Message.findOne({
    conversationId: conversation._id,
    senderId,
    clientMessageId,
  });

  if (!message) {
    enforceMessageRateLimit(senderId);

    try {
      message = await Message.create({
        conversationId: conversation._id,
        senderId,
        clientMessageId,
        text: cleanText,
        replyTo,
        ...(attachment ? { attachment } : {}),
      });
    } catch (error) {
      if (error?.code !== 11000) throw error;

      message = await Message.findOne({
        conversationId: conversation._id,
        senderId,
        clientMessageId,
      });

      if (!message) throw error;
    }
  }

  if (!message) {
    throw new Error("Message could not be persisted.");
  }

  const recipientId = conversation.participants.find(
    (participantId) => String(participantId) !== String(senderId),
  );
  
  await Conversation.updateOne(
    {
      _id: conversation._id,
      $or: [
        { "lastMessage.createdAt": null },
        { "lastMessage.createdAt": { $lte: message.createdAt } },
      ],
    },
    {
      $set: {
        lastMessage: {
          text: message.text
            ? message.text.slice(0, 180)
            : message.attachment?.resourceType === "video"
              ? "🎥 Video"
              : "📷 Photo",
          senderId,
          createdAt: message.createdAt,
        },
        "participantStates.$[recipient].archived": false,
      },
    },
    {
      arrayFilters: [{ "recipient.userId": recipientId }],
    },
  );

  return message;
}

// Marks the user's undelivered incoming messages as delivered and tells each
// sender, skipping blocked pairs so delivery state never leaks across a block.
export async function markDelivered(io, userId, conversationIds = null) {
  const conversationFilter = conversationIds
    ? { _id: { $in: conversationIds } }
    : {};
  const conversations = await Conversation.find({
    participants: userId,
    ...conversationFilter,
  }).select("participants pairKey");
  if (!conversations.length) return;

  const blocked = new Set(
    (
      await ChatBlock.find({
        pairKey: { $in: conversations.map(({ pairKey }) => pairKey) },
      }).select("pairKey")
    ).map(({ pairKey }) => pairKey),
  );
  const open = conversations.filter(({ pairKey }) => !blocked.has(pairKey));
  if (!open.length) return;

  const pending = await Message.distinct("conversationId", {
    conversationId: { $in: open.map(({ _id }) => _id) },
    senderId: { $ne: userId },
    deliveredAt: null,
  });
  if (!pending.length) return;

  const deliveredAt = new Date();
  await Message.updateMany(
    {
      conversationId: { $in: pending },
      senderId: { $ne: userId },
      deliveredAt: null,
      createdAt: { $lte: deliveredAt },
    },
    { $set: { deliveredAt } },
  );

  const pendingIds = new Set(pending.map(String));
  open
    .filter(({ _id }) => pendingIds.has(String(_id)))
    .forEach((conversation) => {
      const senderId = conversation.participants.find(
        (participantId) => String(participantId) !== String(userId),
      );
      io?.to(`user:${senderId}`).emit("message:delivered", {
        conversationId: String(conversation._id),
        deliveredAt,
      });
    });
}

export function isUserOnline(userId) {
  return Boolean(activeChatSockets.get(String(userId))?.size);
}

export async function updateReadState(conversation, userId) {
  const readAt = new Date();
  await Conversation.updateOne(
    { _id: conversation._id, "participantStates.userId": userId },
    { $set: { "participantStates.$.lastReadAt": readAt } },
  );
  await Message.updateMany(
    {
      conversationId: conversation._id,
      senderId: { $ne: userId },
      createdAt: { $lte: readAt },
      readAt: null,
    },
    { $set: { readAt } },
  );
  await Message.updateMany(
    {
      conversationId: conversation._id,
      senderId: { $ne: userId },
      createdAt: { $lte: readAt },
      deliveredAt: null,
    },
    { $set: { deliveredAt: readAt } },
  );
  return readAt;
}

export async function getPreferences(userId) {
  return ChatPreference.findOneAndUpdate(
    { userId },
    { $setOnInsert: { userId } },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
  );
}
