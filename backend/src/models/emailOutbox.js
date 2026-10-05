import mongoose from "mongoose";

const emailOutboxSchema = new mongoose.Schema(
  {
    eventKey: {
      type: String,
      required: true,
      unique: true,
      maxlength: 300,
    },
    template: {
      type: String,
      enum: [
        "welcome",
        "connection-request",
        "connection-accepted",
        "connection-declined",
        "elite-purchase",
        "elite-renewal",
        "elite-payment-attention",
        "elite-subscription-ended",
      ],
      required: true,
    },
    toAddress: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 254,
    },
    data: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "sending", "sent", "failed"],
      default: "pending",
      required: true,
    },
    attempts: {
      type: Number,
      default: 0,
      min: 0,
    },
    nextAttemptAt: {
      type: Date,
      default: Date.now,
    },
    lockedUntil: {
      type: Date,
      default: null,
    },
    sentAt: {
      type: Date,
      default: null,
    },
    resendId: {
      type: String,
      default: null,
      maxlength: 200,
    },
    lastError: {
      type: String,
      default: null,
      maxlength: 100,
    },
  },
  { timestamps: true },
);

emailOutboxSchema.index({ status: 1, nextAttemptAt: 1 });
emailOutboxSchema.index({ status: 1, lockedUntil: 1 });

const EmailOutbox = mongoose.model("EmailOutbox", emailOutboxSchema);

export default EmailOutbox;
