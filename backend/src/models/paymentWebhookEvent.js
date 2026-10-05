import mongoose from "mongoose";

const paymentWebhookEventSchema = new mongoose.Schema(
  {
    eventId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    payloadHash: {
      type: String,
      required: true,
      unique: true,
    },
    eventType: {
      type: String,
      required: true,
      trim: true,
    },
    processingStatus: {
      type: String,
      enum: ["pending", "processed"],
      default: "pending",
      required: true,
    },
    processedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

const PaymentWebhookEvent = mongoose.model(
  "PaymentWebhookEvent",
  paymentWebhookEventSchema,
);

export default PaymentWebhookEvent;
