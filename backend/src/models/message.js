import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
      index: true,
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    clientMessageId: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    text: {
      type: String,
      required() {
        return !this.attachment?.publicId;
      },
      default: "",
      trim: true,
      maxlength: 4000,
    },
    attachment: {
      type: new mongoose.Schema(
        {
          publicId: { type: String, required: true },
          resourceType: { type: String, enum: ["image", "video"], required: true },
          format: { type: String, required: true },
          contentType: { type: String, required: true },
          size: { type: Number, required: true },
          width: Number,
          height: Number,
          duration: Number,
        },
        { _id: false },
      ),
      default: undefined,
    },
    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      default: null,
    },
    reactions: {
      type: [
        new mongoose.Schema(
          {
            userId: {
              type: mongoose.Schema.Types.ObjectId,
              ref: "User",
              required: true,
            },
            emoji: { type: String, required: true, maxlength: 8 },
          },
          { _id: false },
        ),
      ],
      default: [],
    },
    deletedForEveryoneAt: { type: Date, default: null },
    deletedFor: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
      default: [],
    },
    deliveredAt: { type: Date, default: null },
    readAt: { type: Date, default: null },
  },
  { timestamps: true },
);

messageSchema.index(
  { conversationId: 1, senderId: 1, clientMessageId: 1 },
  { unique: true },
);
messageSchema.index({ conversationId: 1, createdAt: -1, _id: -1 });
messageSchema.index({ conversationId: 1, senderId: 1, readAt: 1 });
messageSchema.index({ conversationId: 1, senderId: 1, deliveredAt: 1 });

const Message = mongoose.model("Message", messageSchema);

export default Message;
