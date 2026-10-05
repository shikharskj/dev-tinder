import { createHash } from "node:crypto";
import express from "express";
import { isAfter } from "date-fns";
import Razorpay from "razorpay";
import {
  ACTIVE_SUBSCRIPTION_STATUSES,
  IDEMPOTENCY_KEY_PATTERN,
  WEBHOOK_SIGNATURE_PATTERN,
} from "../../constants.js";
import authenticateUser from "../middlewares/auth.js";
import Payment from "../models/payment.js";
import PaymentWebhookEvent from "../models/paymentWebhookEvent.js";
import User from "../models/user.js";
import createRazorpayInstance from "../utils/razorpay.js";
import { sendError, sendSuccess } from "../utils/response.js";
import { sanitizeSubscriptionRequest } from "../utils/validateSubscriptionRequest.js";

const paymentRouter = express.Router();

const toUnixDate = (timestamp) =>
  Number.isSafeInteger(timestamp) && timestamp > 0
    ? new Date(timestamp * 1000)
    : null;

const subscriptionResponse = (payment, keyId) => ({
  keyId,
  subscriptionId: payment.razorpaySubscriptionId,
  customer: {
    name: `${payment.firstName} ${payment.lastName}`.trim(),
    email: payment.email,
  },
  status: payment.subscriptionStatus,
  usagePlan: payment.accessGranted ? "Elite" : "Basic",
});

paymentRouter.get(
  "/payment/subscription",
  authenticateUser,
  async (req, res) => {
    try {
      const user = await User.findById(req.user._id);
      if (!user) {
        return sendError(res, 404, "User not found.");
      }

      let currentPlan = user.usagePlan === "Elite" ? "Elite" : "Basic";
      let expiresAt = user.eliteSubscriptionExpiresAt ?? null;

      if (
        user.usagePlan === "Elite" &&
        user.eliteSubscriptionExpiresAt &&
        !isAfter(user.eliteSubscriptionExpiresAt, new Date())
      ) {
        const expiredSubscriptionId = user.razorpaySubscriptionId;
        await User.updateOne(
          { _id: user._id, razorpaySubscriptionId: expiredSubscriptionId },
          {
            $set: { usagePlan: "Basic" },
            $unset: {
              razorpaySubscriptionId: 1,
              eliteSubscriptionExpiresAt: 1,
            },
          },
        );
        await Payment.updateOne(
          {
            razorpaySubscriptionId: expiredSubscriptionId,
            subscriptionStatus: "active",
          },
          { $set: { subscriptionStatus: "expired", accessGranted: false } },
        );
        currentPlan = "Basic";
        expiresAt = null;
      }

      const payment = await Payment.findOne({ userId: req.user._id })
        .sort({ createdAt: -1 })
        .select(
          "creationStatus usagePlan subscriptionStatus accessGranted subscriptionExpiresIn nextBillingAt razorpaySubscriptionId firstName lastName email",
        );

      return sendSuccess(res, 200, "Subscription status fetched.", {
        usagePlan: currentPlan,
        status:
          payment?.creationStatus === "failed"
            ? null
            : (payment?.subscriptionStatus ?? null),
        expiresAt,
        nextBillingAt: payment?.nextBillingAt ?? null,
        checkout:
          payment &&
          payment.creationStatus === "created" &&
          !payment.accessGranted &&
          payment.subscriptionStatus === "created"
            ? {
                keyId: process.env.RAZORPAY_KEY_ID,
                subscriptionId: payment.razorpaySubscriptionId,
                customer: {
                  name: `${payment.firstName} ${payment.lastName}`.trim(),
                  email: payment.email,
                },
              }
            : null,
      });
    } catch (error) {
      console.error(
        "Error fetching subscription status:",
        error instanceof Error ? error.message : "Unknown error",
      );
      return sendError(res, 500, "Unable to fetch subscription status.");
    }
  },
);

paymentRouter.post(
  "/payment/create-subscription",
  authenticateUser,
  async (req, res) => {
    const subscriptionRequest = sanitizeSubscriptionRequest(req.body);
    if (!subscriptionRequest) {
      return sendError(res, 400, "Provide a valid Elite subscription request.");
    }

    const idempotencyKey = req.get("Idempotency-Key");
    if (!IDEMPOTENCY_KEY_PATTERN.test(idempotencyKey ?? "")) {
      return sendError(res, 400, "A valid Idempotency-Key header is required.");
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

    let paymentAttempt;
    let providerSubscription;
    let userLockAcquired = false;
    let providerRequestStarted = false;

    try {
      const existingAttempt = await Payment.findOne({ idempotencyKey });
      if (existingAttempt) {
        if (existingAttempt.userId.toString() !== req.user._id.toString()) {
          return sendError(res, 409, "This request key is already in use.");
        }
        if (existingAttempt.razorpaySubscriptionId) {
          if (
            !ACTIVE_SUBSCRIPTION_STATUSES.includes(
              existingAttempt.subscriptionStatus,
            )
          ) {
            return sendError(
              res,
              409,
              "This Elite subscription has ended. Start a new checkout to subscribe again.",
            );
          }
          await User.updateOne(
            {
              _id: req.user._id,
              subscriptionCreationKey: idempotencyKey,
            },
            { $unset: { subscriptionCreationKey: 1 } },
          );
          return sendSuccess(
            res,
            200,
            "Elite subscription already created.",
            subscriptionResponse(existingAttempt, RAZORPAY_KEY_ID),
          );
        }
        if (existingAttempt.creationStatus !== "failed") {
          return sendError(
            res,
            409,
            "This subscription request is still being reconciled. Please do not start another checkout.",
          );
        }
        paymentAttempt = existingAttempt;
      }

      const razorpay = createRazorpayInstance(
        RAZORPAY_KEY_ID,
        RAZORPAY_KEY_SECRET,
      );
      const plan = await razorpay.plans.fetch(RAZORPAY_ELITE_PLAN_ID);
      if (
        plan.period !== "monthly" ||
        plan.interval !== 1 ||
        plan.item?.amount !== 19900 ||
        plan.item?.currency !== "INR"
      ) {
        console.error(
          "Configured Razorpay Elite plan does not match pricing.",
          {
            period: plan.period,
            interval: plan.interval,
            amount: plan.item?.amount,
            currency: plan.item?.currency,
            expected: {
              period: "monthly",
              interval: 1,
              amount: 19900,
              currency: "INR",
            },
          },
        );
        return sendError(
          res,
          503,
          "Elite subscription pricing is not configured correctly.",
        );
      }

      const lockResult = await User.updateOne(
        {
          _id: req.user._id,
          usagePlan: { $ne: "Elite" },
          $or: [
            { subscriptionCreationKey: null },
            { subscriptionCreationKey: { $exists: false } },
          ],
        },
        { $set: { subscriptionCreationKey: idempotencyKey } },
      );
      if (lockResult.modifiedCount !== 1) {
        return sendError(
          res,
          409,
          "An Elite subscription is already active or being created.",
        );
      }
      userLockAcquired = true;

      const existingSubscription = await Payment.findOne({
        userId: req.user._id,
        creationStatus: { $in: ["creating", "created"] },
        subscriptionStatus: { $in: ACTIVE_SUBSCRIPTION_STATUSES },
      }).sort({ createdAt: -1 });

      if (existingSubscription) {
        await User.updateOne(
          { _id: req.user._id, subscriptionCreationKey: idempotencyKey },
          { $unset: { subscriptionCreationKey: 1 } },
        );
        userLockAcquired = false;
        if (existingSubscription.razorpaySubscriptionId) {
          return sendSuccess(
            res,
            200,
            "An Elite subscription is already awaiting checkout.",
            subscriptionResponse(existingSubscription, RAZORPAY_KEY_ID),
          );
        }
        return sendError(
          res,
          409,
          "An Elite subscription request is already being processed.",
        );
      }

      paymentAttempt ??= new Payment({
        userId: req.user._id,
        firstName: req.user.firstName,
        lastName: req.user.lastName,
        email: req.user.email,
        usagePlan: subscriptionRequest.usagePlan,
        idempotencyKey,
        razorpayPlanId: RAZORPAY_ELITE_PLAN_ID,
        amount: plan.item.amount,
        currency: plan.item.currency,
        totalBillingCycles: 12,
        subscriptionStatus: "created",
      });
      paymentAttempt.creationStatus = "creating";
      paymentAttempt.subscriptionStatus = "created";
      paymentAttempt.accessGranted = false;
      paymentAttempt.razorpayPlanId = RAZORPAY_ELITE_PLAN_ID;
      paymentAttempt.amount = plan.item.amount;
      paymentAttempt.currency = plan.item.currency;
      await paymentAttempt.save();

      providerRequestStarted = true;
      providerSubscription = await razorpay.subscriptions.create({
        plan_id: RAZORPAY_ELITE_PLAN_ID,
        total_count: 12,
        quantity: 1,
        customer_notify: true,
        notes: {
          userId: req.user._id.toString(),
          paymentAttemptId: paymentAttempt._id.toString(),
          idempotencyKey,
          usagePlan: "Elite",
        },
      });

      const providerDates = {
        ...(toUnixDate(providerSubscription.current_start)
          ? {
              subscriptionStartDate: toUnixDate(
                providerSubscription.current_start,
              ),
            }
          : {}),
        ...(toUnixDate(providerSubscription.current_end)
          ? {
              subscriptionExpiresIn: toUnixDate(
                providerSubscription.current_end,
              ),
            }
          : {}),
        ...(toUnixDate(providerSubscription.charge_at)
          ? { nextBillingAt: toUnixDate(providerSubscription.charge_at) }
          : {}),
      };
      await Payment.updateOne(
        { _id: paymentAttempt._id },
        {
          $set: {
            razorpaySubscriptionId: providerSubscription.id,
            shortUrl: providerSubscription.short_url,
            creationStatus: "created",
            ...providerDates,
          },
        },
      );
      paymentAttempt = await Payment.findById(paymentAttempt._id);
      if (!paymentAttempt) {
        throw new Error("Subscription attempt disappeared before persistence.");
      }

      await User.updateOne(
        { _id: req.user._id, subscriptionCreationKey: idempotencyKey },
        { $unset: { subscriptionCreationKey: 1 } },
      );
      userLockAcquired = false;

      return sendSuccess(
        res,
        201,
        "Elite subscription created. Complete checkout to activate Elite.",
        subscriptionResponse(paymentAttempt, RAZORPAY_KEY_ID),
      );
    } catch (error) {
      if (providerSubscription && paymentAttempt) {
        try {
          await Payment.updateOne(
            { _id: paymentAttempt._id },
            {
              $set: {
                razorpaySubscriptionId: providerSubscription.id,
                shortUrl: providerSubscription.short_url,
                creationStatus: "created",
                ...(toUnixDate(providerSubscription.current_start)
                  ? {
                      subscriptionStartDate: toUnixDate(
                        providerSubscription.current_start,
                      ),
                    }
                  : {}),
                ...(toUnixDate(providerSubscription.current_end)
                  ? {
                      subscriptionExpiresIn: toUnixDate(
                        providerSubscription.current_end,
                      ),
                    }
                  : {}),
                ...(toUnixDate(providerSubscription.charge_at)
                  ? {
                      nextBillingAt: toUnixDate(providerSubscription.charge_at),
                    }
                  : {}),
              },
            },
          );
          const recoveredAttempt = await Payment.findById(paymentAttempt._id);
          if (recoveredAttempt) {
            await User.updateOne(
              {
                _id: req.user._id,
                subscriptionCreationKey: idempotencyKey,
              },
              { $unset: { subscriptionCreationKey: 1 } },
            );
            return sendSuccess(
              res,
              201,
              "Elite subscription created. Complete checkout to activate Elite.",
              subscriptionResponse(recoveredAttempt, RAZORPAY_KEY_ID),
            );
          }
        } catch (recoveryError) {
          console.error("Unable to recover created subscription:", {
            message:
              recoveryError instanceof Error
                ? recoveryError.message
                : "Unknown database error",
            paymentAttemptId: paymentAttempt._id.toString(),
          });
        }
      }

      const providerStatus = error?.statusCode;
      const definiteProviderRejection =
        providerStatus >= 400 && providerStatus < 500;
      if (
        paymentAttempt &&
        providerRequestStarted &&
        definiteProviderRejection
      ) {
        paymentAttempt.creationStatus = "failed";
        await paymentAttempt.save().catch((saveError) => {
          console.error(
            "Unable to mark rejected subscription attempt:",
            saveError instanceof Error ? saveError.message : "Unknown error",
          );
        });
        if (userLockAcquired) {
          await User.updateOne(
            { _id: req.user._id, subscriptionCreationKey: idempotencyKey },
            { $unset: { subscriptionCreationKey: 1 } },
          );
        }
      } else if (userLockAcquired && !providerRequestStarted) {
        await User.updateOne(
          { _id: req.user._id, subscriptionCreationKey: idempotencyKey },
          { $unset: { subscriptionCreationKey: 1 } },
        );
      }

      console.error("Error creating Elite subscription:", {
        message:
          error instanceof Error
            ? error.message
            : "Unknown provider or database error",
        paymentAttemptId: paymentAttempt?._id?.toString(),
      });
      return sendError(
        res,
        definiteProviderRejection ? 502 : 503,
        paymentAttempt && providerRequestStarted && !definiteProviderRejection
          ? "Subscription creation could not be confirmed. Do not start another checkout; please contact support."
          : "Unable to create an Elite subscription. Please try again later.",
      );
    }
  },
);

paymentRouter.post("/payment/webhook", async (req, res) => {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  const signature = req.get("x-razorpay-signature");
  const eventId = req.get("x-razorpay-event-id");

  if (!webhookSecret) {
    return sendError(res, 503, "Payment webhook is not configured.");
  }

  if (
    !Buffer.isBuffer(req.body) ||
    !signature ||
    !WEBHOOK_SIGNATURE_PATTERN.test(signature) ||
    !eventId ||
    eventId.length > 255
  ) {
    return sendError(res, 400, "Invalid payment webhook request.");
  }

  let isValidSignature;

  try {
    isValidSignature = Razorpay.validateWebhookSignature(
      req.body,
      signature.toLowerCase(),
      webhookSecret,
    );
  } catch {
    return sendError(res, 400, "Invalid payment webhook signature.");
  }

  if (!isValidSignature) {
    return sendError(res, 400, "Invalid payment webhook signature.");
  }

  const payloadHash = createHash("sha256").update(req.body).digest("hex");

  let event;
  try {
    event = JSON.parse(req.body.toString("utf8"));
  } catch {
    return sendError(res, 400, "Invalid payment webhook payload.");
  }

  if (typeof event.event !== "string") {
    return sendError(res, 400, "Invalid payment webhook event.");
  }

  try {
    let webhookRecord = await PaymentWebhookEvent.findOne({
      $or: [{ eventId }, { payloadHash }],
    });

    if (webhookRecord?.processingStatus === "processed") {
      return sendSuccess(res, 200, "Webhook already processed.");
    }

    if (!webhookRecord) {
      try {
        webhookRecord = await PaymentWebhookEvent.create({
          eventId,
          payloadHash,
          eventType: event.event,
          processingStatus: "pending",
        });
      } catch (error) {
        if (error.code !== 11000) throw error;

        webhookRecord = await PaymentWebhookEvent.findOne({
          $or: [{ eventId }, { payloadHash }],
        });
      }
    }

    const eventStatus = {
      "subscription.authenticated": "authenticated",
      "subscription.activated": "active",
      "subscription.charged": "active",
      "subscription.pending": "pending",
      "subscription.halted": "halted",
      "subscription.cancelled": "cancelled",
      "subscription.completed": "completed",
      "subscription.expired": "expired",
    }[event.event];

    if (!eventStatus) {
      webhookRecord.processingStatus = "processed";
      webhookRecord.processedAt = new Date();
      await webhookRecord.save();

      return sendSuccess(res, 200, "Webhook event acknowledged.");
    }

    let subscription = event.payload?.subscription?.entity;

    const subscriptionId =
      subscription?.id ?? event.payload?.payment?.entity?.subscription_id;

    if (typeof subscriptionId !== "string") {
      return sendError(res, 400, "Subscription ID is missing from webhook.");
    }

    if (
      event.event === "subscription.charged" &&
      !toUnixDate(subscription?.current_end)
    ) {
      const { RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET } = process.env;

      if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
        return sendError(
          res,
          503,
          "Subscription verification is not configured.",
        );
      }

      const razorpay = createRazorpayInstance(
        RAZORPAY_KEY_ID,
        RAZORPAY_KEY_SECRET,
      );

      subscription = await razorpay.subscriptions.fetch(subscriptionId);
    }

    const attemptId = subscription?.notes?.paymentAttemptId;

    let payment = await Payment.findOne({
      razorpaySubscriptionId: subscriptionId,
    });

    if (!payment && typeof attemptId === "string") {
      payment = await Payment.findById(attemptId);

      if (payment && !payment.razorpaySubscriptionId) {
        payment.razorpaySubscriptionId = subscriptionId;
        payment.creationStatus = "created";
      }
    }
    if (!payment) {
      return sendError(
        res,
        503,
        "Subscription record is not available yet. Retry this webhook.",
      );
    }

    const eventDate = toUnixDate(event.created_at) ?? new Date();
    if (
      payment.lastProviderEventAt &&
      eventDate < payment.lastProviderEventAt
    ) {
      webhookRecord.processingStatus = "processed";
      webhookRecord.processedAt = new Date();
      await webhookRecord.save();

      return sendSuccess(res, 200, "Older webhook event ignored.");
    }

    const isPaidCycle = event.event === "subscription.charged";

    const isTerminal = ["cancelled", "completed", "expired", "halted"].includes(
      eventStatus,
    );

    const subscriptionStartDate = toUnixDate(subscription?.current_start);
    const subscriptionExpiresIn = toUnixDate(subscription?.current_end);
    const nextBillingAt = toUnixDate(subscription?.charge_at);

    if (isPaidCycle && !subscriptionExpiresIn) {
      return sendError(
        res,
        503,
        "Subscription billing dates are missing. Retry this webhook.",
      );
    }

    payment.subscriptionStatus = eventStatus;

    if (isPaidCycle) payment.accessGranted = true;
    if (isTerminal) payment.accessGranted = false;

    payment.lastProviderEventAt = eventDate;

    if (subscriptionStartDate) {
      payment.subscriptionStartDate = subscriptionStartDate;
    }

    if (subscriptionExpiresIn) {
      payment.subscriptionExpiresIn = subscriptionExpiresIn;
    }

    if (nextBillingAt) {
      payment.nextBillingAt = nextBillingAt;
    }

    await payment.save();

    await User.updateOne(
      {
        _id: payment.userId,
        subscriptionCreationKey: payment.idempotencyKey,
      },
      { $unset: { subscriptionCreationKey: 1 } },
    );

    if (isPaidCycle) {
      await User.updateOne(
        {
          _id: payment.userId,
          $or: [
            { razorpaySubscriptionId: null },
            { razorpaySubscriptionId: subscriptionId },
          ],
        },
        {
          $set: {
            usagePlan: "Elite",
            razorpaySubscriptionId: subscriptionId,
            eliteSubscriptionExpiresAt: subscriptionExpiresIn,
          },
          $unset: { subscriptionCreationKey: 1 },
        },
      );
    } else if (isTerminal) {
      await User.updateOne(
        { _id: payment.userId, razorpaySubscriptionId: subscriptionId },
        {
          $set: { usagePlan: "Basic" },
          $unset: {
            razorpaySubscriptionId: 1,
            eliteSubscriptionExpiresAt: 1,
            subscriptionCreationKey: 1,
          },
        },
      );
    }

    webhookRecord.processingStatus = "processed";
    webhookRecord.processedAt = new Date();
    await webhookRecord.save();

    return sendSuccess(res, 200, "Webhook processed.");
  } catch (error) {
    console.error(
      "Error processing Razorpay webhook:",
      error instanceof Error ? error.message : "Unknown error",
    );

    return sendError(res, 500, "Unable to process payment webhook.");
  }
});

export default paymentRouter;
