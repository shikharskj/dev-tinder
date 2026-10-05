import express from "express";
import { addYears } from "date-fns";
import authenticateUser from "../middlewares/auth.js";
import createRazorpayInstance from "../utils/razorpay.js";
import { sendError, sendSuccess } from "../utils/response.js";
import { sanitizeSubscriptionRequest } from "../utils/validateSubscriptionRequest.js";
import Payment from "../models/payment.js";

const paymentRouter = express.Router();

paymentRouter.post(
  "/payment/create-subscription",
  authenticateUser,
  async (req, res) => {
    const subscriptionRequest = sanitizeSubscriptionRequest(req.body);

    if (subscriptionRequest === null) {
      return sendError(res, 400, "Provide a valid Elite subscription request.");
    }

    const { RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_ELITE_PLAN_ID } =
      process.env;

    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET || !RAZORPAY_ELITE_PLAN_ID) {
      return sendError(
        res,
        503,
        "Elite subscriptions are not configured. Please try again later.",
      );
    }

    try {
      const subscriptionExpiresIn = addYears(new Date(), 1).toISOString();

      const razorpay = createRazorpayInstance(
        RAZORPAY_KEY_ID,
        RAZORPAY_KEY_SECRET,
      );

      const subscription = await razorpay.subscriptions.create({
        plan_id: RAZORPAY_ELITE_PLAN_ID,
        total_count: 12,
        quantity: 1,
        customer_notify: true,
        notes: {
          userId: req.user._id.toString(),
          firstName: subscriptionRequest.firstName,
          lastName: subscriptionRequest.lastName,
          email: subscriptionRequest.email,
          usagePlan: subscriptionRequest.usagePlan,
          subscriptionExpiresIn,
        },
      });

      console.log("Razorpay subscription created:", subscription);

      const payment = new Payment({
        userId: req.user._id,
        firstName: subscriptionRequest.firstName,
        lastName: subscriptionRequest.lastName,
        email: subscriptionRequest.email,
        usagePlan: subscriptionRequest.usagePlan,
        razorpaySubscriptionId: subscription.id,
        razorpayPlanId: RAZORPAY_ELITE_PLAN_ID,
        subscriptionStatus: subscription.status,
        shortUrl: subscription.short_url,
        subscriptionStartDate: new Date(),
      });

      const savedPayment = await payment.save();

      return sendSuccess(
        res,
        201,
        "Congratulations! Your Elite subscription has been created.",
        savedPayment.toJSON(),
      );
    } catch (error) {
      console.error(
        "Error creating Elite subscription:",
        error instanceof Error ? error.message : "Unknown provider error",
      );
      return sendError(
        res,
        502,
        "Unable to create an Elite subscription. Please try again later.",
      );
    }
  },
);

export default paymentRouter;
