import mongoose from "mongoose";

const chatPreferenceSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    readReceiptsEnabled: { type: Boolean, default: true },
    activitySharingEnabled: { type: Boolean, default: true },
  },
  { timestamps: true },
);

const ChatPreference = mongoose.model("ChatPreference", chatPreferenceSchema);

export default ChatPreference;
