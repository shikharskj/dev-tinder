import mongoose from "mongoose";

const participantStateSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    lastReadAt: { type: Date, default: Date.now },
    archived: { type: Boolean, default: false },
    muted: { type: Boolean, default: false },
  },
  { _id: false },
);

const conversationSchema = new mongoose.Schema(
  {
    pairKey: { type: String, required: true, unique: true, index: true },
    participants: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
      required: true,
      validate: {
        validator: (participants) => participants.length === 2,
        message: "A conversation must have exactly two participants.",
      },
    },
    participantStates: {
      type: [participantStateSchema],
      required: true,
    },
    lastMessage: {
      text: { type: String, default: "" },
      senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
      createdAt: { type: Date, default: null },
    },
  },
  { timestamps: true },
);

conversationSchema.index({ participants: 1, updatedAt: -1 });

export const getConversationPairKey = (firstUserId, secondUserId) =>
  [String(firstUserId), String(secondUserId)].sort().join(":");

const Conversation = mongoose.model("Conversation", conversationSchema);

export default Conversation;
