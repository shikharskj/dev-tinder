import mongoose from "mongoose";

const chatBlockSchema = new mongoose.Schema(
  {
    pairKey: { type: String, required: true, index: true },
    blockerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    blockedId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true },
);

chatBlockSchema.index({ blockerId: 1, blockedId: 1 }, { unique: true });

const ChatBlock = mongoose.model("ChatBlock", chatBlockSchema);

export default ChatBlock;
