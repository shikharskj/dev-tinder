import express from "express";
import ChatBlock from "../../models/chatBlock.js";
import ChatPreference from "../../models/chatPreference.js";
import ConnectionRequest from "../../models/connectionRequest.js";
import Conversation, {
  getConversationPairKey,
} from "../../models/conversation.js";
import authenticateUser from "../../middlewares/auth.js";
import { sendError, sendSuccess } from "../../utils/response.js";
import { isValidObjectId, participantState } from "../../utils/chat.js";
import { activeChatSockets } from "../../utils/chatSocketState.js";

const router = express.Router();

router.patch(
  "/chat/conversations/:conversationId/settings",
  authenticateUser,
  async (req, res) => {
    if (!isValidObjectId(req.params.conversationId)) {
      return sendError(res, 400, "Invalid conversation ID.");
    }

    const updates = {};
    for (const key of ["archived", "muted"]) {
      if (req.body?.[key] !== undefined) {
        if (typeof req.body[key] !== "boolean") {
          return sendError(res, 400, `${key} must be a boolean.`);
        }
        updates[`participantStates.$.${key}`] = req.body[key];
      }
    }

    if (!Object.keys(updates).length) {
      return sendError(res, 400, "Provide an archive or mute setting.");
    }

    try {
      const conversation = await Conversation.findOneAndUpdate(
        {
          _id: req.params.conversationId,
          "participantStates.userId": req.user._id,
        },
        { $set: updates },
        { returnDocument: "after" },
      );
      if (!conversation) {
        return sendError(res, 404, "Conversation not found.");
      }

      const state = participantState(conversation, req.user._id);
      const otherId = conversation.participants.find(
        (participantId) => String(participantId) !== String(req.user._id),
      );
      req.app.get("io")?.to(`user:${otherId}`).emit("chat:inbox-updated", {
        conversationId: String(conversation._id),
      });

      return sendSuccess(res, 200, "Conversation settings saved.", {
        archived: state.archived,
        muted: state.muted,
      });
    } catch (error) {
      console.error("Error updating conversation settings:", error);
      return sendError(res, 500, "Unable to update conversation settings.");
    }
  },
);

router.patch("/chat/preferences", authenticateUser, async (req, res) => {
  const updates = {};
  for (const key of ["readReceiptsEnabled", "activitySharingEnabled"]) {
    if (req.body?.[key] !== undefined) {
      if (typeof req.body[key] !== "boolean") {
        return sendError(res, 400, `${key} must be a boolean.`);
      }
      updates[key] = req.body[key];
    }
  }

  if (!Object.keys(updates).length) {
    return sendError(res, 400, "Provide at least one chat preference.");
  }

  try {
    const preferences = await ChatPreference.findOneAndUpdate(
      { userId: req.user._id },
      { $set: updates, $setOnInsert: { userId: req.user._id } },
      { upsert: true, returnDocument: "after", runValidators: true, setDefaultsOnInsert: true },
    );

    if (updates.activitySharingEnabled !== undefined) {
      const acceptedRequests = await ConnectionRequest.find({
        status: "accepted",
        $or: [
          { fromUserId: req.user._id },
          { toUserId: req.user._id },
        ],
      }).select("fromUserId toUserId");
      const peers = acceptedRequests.map((request) =>
        String(request.fromUserId) === String(req.user._id)
          ? request.toUserId
          : request.fromUserId,
      );
      const pairKeys = peers.map((peerId) =>
        getConversationPairKey(req.user._id, peerId),
      );
      const blocks = await ChatBlock.find({ pairKey: { $in: pairKeys } }).select(
        "pairKey",
      );
      const blockedPairs = new Set(blocks.map(({ pairKey }) => pairKey));
      const online = Boolean(activeChatSockets.get(String(req.user._id))?.size);

      peers.forEach((peerId) => {
        if (blockedPairs.has(getConversationPairKey(req.user._id, peerId))) {
          return;
        }
        req.app.get("io")?.to(`user:${peerId}`).emit("presence:update", {
          userId: String(req.user._id),
          online: preferences.activitySharingEnabled && online,
          lastActiveAt: null,
          hidden: !preferences.activitySharingEnabled,
        });
      });
    }

    return sendSuccess(res, 200, "Chat preferences saved.", {
      readReceiptsEnabled: preferences.readReceiptsEnabled,
      activitySharingEnabled: preferences.activitySharingEnabled,
    });
  } catch (error) {
    console.error("Error updating chat preferences:", error);
    return sendError(res, 500, "Unable to update chat preferences.");
  }
});

export default router;
