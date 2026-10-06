import mongoose from "mongoose";

const chatPresenceSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    lastActiveAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

const ChatPresence = mongoose.model("ChatPresence", chatPresenceSchema);

export default ChatPresence;
