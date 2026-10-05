import mongoose from "mongoose";
import { EMAIL_PATTERN } from "../../constants.js";

const paymentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    firstName: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 100,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 100,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 254,
      match: EMAIL_PATTERN,
    },
    usagePlan: {
      type: String,
      enum: ["Elite"],
      required: true,
    },
    idempotencyKey: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    creationStatus: {
      type: String,
      enum: ["creating", "created", "failed"],
      default: "creating",
      required: true,
    },
    razorpaySubscriptionId: {
      type: String,
      default: undefined,
      unique: true,
      sparse: true,
      trim: true,
    },
    razorpayPlanId: {
      type: String,
      required: true,
      trim: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 1,
      validate: {
        validator: Number.isSafeInteger,
        message: "Subscription amount must be an integer in paise.",
      },
    },
    currency: {
      type: String,
      enum: ["INR"],
      required: true,
    },
    totalBillingCycles: {
      type: Number,
      required: true,
      default: 12,
      min: 1,
    },
    subscriptionStatus: {
      type: String,
      enum: [
        "created",
        "authenticated",
        "active",
        "pending",
        "halted",
        "cancelled",
        "completed",
        "expired",
      ],
      default: "created",
    },
    accessGranted: {
      type: Boolean,
      default: false,
      required: true,
    },
    shortUrl: {
      type: String,
      trim: true,
    },
    subscriptionStartDate: {
      type: Date,
      default: null,
    },
    nextBillingAt: {
      type: Date,
      default: null,
    },
    subscriptionExpiresIn: {
      type: Date,
      default: null,
    },
    lastProviderEventAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

const Payment = mongoose.model("Payment", paymentSchema);

export default Payment;
