import express from "express";
import { subDays } from "date-fns";
import ChatBlock from "../../models/chatBlock.js";
import ChatReport from "../../models/chatReport.js";
import Conversation, {
  getConversationPairKey,
} from "../../models/conversation.js";
import Message from "../../models/message.js";
import User from "../../models/user.js";
import authenticateUser from "../../middlewares/auth.js";
import { sendError, sendSuccess } from "../../utils/response.js";
import { isValidObjectId } from "../../utils/chat.js";

const router = express.Router();
const REPORT_REASONS = ["spam", "harassment", "inappropriate", "other"];

function conversationForParticipant(conversationId, userId) {
  return Conversation.findOne({
    _id: conversationId,
    participants: userId,
  });
}

router.post(
  "/chat/blocks/:targetUserId",
  authenticateUser,
  async (req, res) => {
    const { targetUserId } = req.params;
    if (
      !isValidObjectId(targetUserId) ||
      String(targetUserId) === String(req.user._id)
    ) {
      return sendError(res, 400, "Invalid user to block.");
    }

    try {
      const targetExists = await User.exists({ _id: targetUserId });
      if (!targetExists) {
        return sendError(res, 404, "User not found.");
      }

      const pairKey = getConversationPairKey(req.user._id, targetUserId);
      await ChatBlock.updateOne(
        { blockerId: req.user._id, blockedId: targetUserId },
        {
          $setOnInsert: {
            pairKey,
            blockerId: req.user._id,
            blockedId: targetUserId,
          },
        },
        { upsert: true },
      );

      const io = req.app.get("io");
      io?.to(`user:${targetUserId}`).emit("chat:blocked", {
        byUserId: String(req.user._id),
      });
      const conversation = await Conversation.findOne({ pairKey }).select("_id");
      if (conversation) {
        io?.to(String(conversation._id)).emit("chat:blocked", {
          byUserId: String(req.user._id),
        });
        await io?.in(String(conversation._id)).socketsLeave(
          String(conversation._id),
        );
      }
      return sendSuccess(res, 200, "User blocked.");
    } catch (error) {
      console.error("Error blocking user:", error);
      return sendError(res, 500, "Unable to block user.");
    }
  },
);

router.delete(
  "/chat/blocks/:targetUserId",
  authenticateUser,
  async (req, res) => {
    if (!isValidObjectId(req.params.targetUserId)) {
      return sendError(res, 400, "Invalid user ID.");
    }

    try {
      await ChatBlock.deleteOne({
        blockerId: req.user._id,
        blockedId: req.params.targetUserId,
      });
      req.app.get("io")?.to(`user:${req.params.targetUserId}`).emit(
        "chat:unblocked",
        { byUserId: String(req.user._id) },
      );

      const conversation = await Conversation.findOne({
        pairKey: getConversationPairKey(req.user._id, req.params.targetUserId),
      }).select("_id");
      if (conversation) {
        req.app.get("io")?.to(`user:${req.user._id}`).emit(
          "chat:inbox-updated",
          { conversationId: String(conversation._id) },
        );
      }
      return sendSuccess(res, 200, "User unblocked.");
    } catch (error) {
      console.error("Error unblocking user:", error);
      return sendError(res, 500, "Unable to unblock user.");
    }
  },
);

router.post(
  "/chat/conversations/:conversationId/reports",
  authenticateUser,
  async (req, res) => {
    const { conversationId } = req.params;
    const { messageId = null, reason, details = "" } = req.body || {};
    if (
      !isValidObjectId(conversationId) ||
      (messageId !== null && !isValidObjectId(messageId)) ||
      !REPORT_REASONS.includes(reason) ||
      typeof details !== "string" ||
      details.length > 1000
    ) {
      return sendError(res, 400, "Provide valid report details.");
    }

    try {
      const conversation = await conversationForParticipant(
        conversationId,
        req.user._id,
      );
      if (!conversation) {
        return sendError(res, 404, "Conversation not found.");
      }

      const reportedId = conversation.participants.find(
        (participantId) => String(participantId) !== String(req.user._id),
      );
      const reportsToday = await ChatReport.countDocuments({
        reporterId: req.user._id,
        createdAt: { $gte: subDays(new Date(), 1) },
      });
      if (reportsToday >= 5) {
        return sendError(
          res,
          429,
          "You’ve reached the daily report limit. Please try again tomorrow.",
        );
      }

      let reportedText = "";
      if (messageId) {
        const reportedMessage = await Message.findOne({
          _id: messageId,
          conversationId,
        }).select("text");
        if (!reportedMessage) {
          return sendError(res, 400, "The reported message is not in this chat.");
        }
        reportedText = reportedMessage.text;
      }

      const report = await ChatReport.create({
        reporterId: req.user._id,
        reportedId,
        conversationId,
        messageId,
        reportedText,
        reason,
        details: details.trim(),
      });
      return sendSuccess(res, 201, "Report submitted for review.", {
        reportId: report._id,
      });
    } catch (error) {
      console.error(
        "Error submitting chat report:",
        error?.name || "Unknown error",
        error?.code || "",
      );
      return sendError(res, 500, "Unable to submit report.");
    }
  },
);

export default router;
