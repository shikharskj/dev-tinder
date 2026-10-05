import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
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
      match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    },
    usagePlan: {
      type: String,
      enum: ["Elite"],
      required: true,
    },
    razorpaySubscriptionId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    razorpayPlanId: {
      type: String,
      required: true,
      trim: true,
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
    shortUrl: {
      type: String,
      trim: true,
    },
    subscriptionStartDate: {
      type: Date,
      default: Date.now,
    },
    subscriptionExpiresIn: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true },
);

const Payment = mongoose.model("Payment", paymentSchema);

export default Payment;
