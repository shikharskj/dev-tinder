import mongoose from "mongoose";

const chatReportSchema = new mongoose.Schema(
  {
    reporterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    reportedId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
    },
    messageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      default: null,
    },
    reportedText: { type: String, maxlength: 4000, default: "" },
    reason: {
      type: String,
      enum: ["spam", "harassment", "inappropriate", "other"],
      required: true,
    },
    details: { type: String, trim: true, maxlength: 1000, default: "" },
  },
  { timestamps: true },
);

chatReportSchema.index({ reporterId: 1, createdAt: -1 });

const ChatReport = mongoose.model("ChatReport", chatReportSchema);

export default ChatReport;
