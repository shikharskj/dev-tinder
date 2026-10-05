import { createHash } from "node:crypto";
import Razorpay from "razorpay";
import razorpayUtils from "razorpay/dist/utils/razorpay-utils.js";
import {
  toUnixDate,
  hasPaidAccess,
  resolveEventStatus,
} from "../utils/subscription.js";
import express from "express";
import {
  ACTIVE_SUBSCRIPTION_STATUSES,
  IDEMPOTENCY_KEY_PATTERN,
  WEBHOOK_SIGNATURE_PATTERN,
} from "../../constants.js";
import authenticateUser from "../middlewares/auth.js";
import Payment from "../models/payment.js";
import PaymentWebhookEvent from "../models/paymentWebhookEvent.js";
import User from "../models/user.js";
import { enqueueEmail } from "../utils/emailNotifications.js";
import createRazorpayInstance from "../utils/razorpay.js";
import { sendError, sendSuccess } from "../utils/response.js";
import { sanitizeSubscriptionRequest } from "../utils/validateSubscriptionRequest.js";

const paymentRouter = express.Router();

const ELITE = Object.freeze({ amount: 19900, currency: "INR", cycles: 12 });

const EVENT_STATUS = new Map([
  ["subscription.authenticated", "authenticated"],
  ["subscription.activated", "active"],
  ["subscription.charged", "active"],
  ["subscription.pending", "pending"],
  ["subscription.halted", "halted"],
  ["subscription.cancelled", "cancelled"],
  ["subscription.completed", "completed"],
  ["subscription.expired", "expired"],
  ["subscription.paused", "paused"],
  ["subscription.resumed", "active"],
]);
// Preserves the existing product policy: these events revoke access immediately.
const REVOKE_ACCESS = new Set([
  "cancelled",
  "completed",
  "expired",
  "halted",
  "paused",
]);

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
const fail = (status, message) => {
  throw new HttpError(status, message);
};

const handle = (label, handler) => async (req, res) => {
  try {
    return await handler(req, res);
  } catch (error) {
    console.error(
      label,
      error instanceof Error ? error.message : "Unknown error",
    );
    return sendError(
      res,
      error instanceof HttpError ? error.status : 500,
      error instanceof HttpError ? error.message : `Unable to ${label}.`,
    );
  }
};

function checkoutResponse(payment) {
  return {
    keyId: process.env.RAZORPAY_KEY_ID,
    subscriptionId: payment.razorpaySubscriptionId,
    customer: {
      name: [payment.firstName, payment.lastName].filter(Boolean).join(" "),
      email: payment.email,
    },
  };
}

function subscriptionResponse(payment) {
  return {
    ...checkoutResponse(payment),
    status: payment.subscriptionStatus,
    creationStatus: payment.creationStatus,
    expiresAt: hasPaidAccess(
      payment.accessGranted,
      payment.subscriptionExpiresIn,
    )
      ? payment.subscriptionExpiresIn
      : null,
    nextBillingAt: payment.nextBillingAt ?? null,
    usagePlan: hasPaidAccess(
      payment.accessGranted,
      payment.subscriptionExpiresIn,
    )
      ? "Elite"
      : "Basic",
  };
}
function getProvider() {
  const { RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET } = process.env;

  if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
    fail(503, "Subscriptions are not configured.");
  }

  return createRazorpayInstance(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET);
}

function releaseCreationLock(userId, key, session) {
  return User.updateOne(
    { _id: userId, subscriptionCreationKey: key },
    { $unset: { subscriptionCreationKey: 1 } },
    session ? { session } : {},
  );
}

async function saveCreatedSubscription(attempt, subscription) {
  // Never overwrite lifecycle state or dates: a webhook may already have run.
  const saved = await Payment.findOneAndUpdate(
    {
      _id: attempt._id,
      $or: [
        { razorpaySubscriptionId: null },
        { razorpaySubscriptionId: subscription.id },
      ],
    },
    {
      $set: {
        razorpaySubscriptionId: subscription.id,
        shortUrl: subscription.short_url,
        creationStatus: "created",
      },
    },
    { returnDocument: "after", runValidators: true },
  );

  if (!saved)
    fail(503, "Subscription could not be linked to its payment attempt.");
  await releaseCreationLock(saved.userId, saved.idempotencyKey);

  return saved;
}

// app.js applies express.raw() before its JSON parser for this path.
paymentRouter.post(
  "/payment/webhook",
  handle("process payment webhook", async (req, res) => {
    const input = parseWebhook(req);
    const record = await getWebhookRecord(input);

    // Re-read INSIDE the transaction: simultaneous deliveries must see committed completion.
    const message = await Payment.db.transaction(async (session) => {
      const current = await PaymentWebhookEvent.findById(record._id).session(
        session,
      );

      if (!current) fail(503, "Webhook record unavailable. Retry delivery.");

      if (current.processingStatus === "processed")
        return "Webhook already processed.";

      const result = await applySubscriptionEvent(
        input.event,
        input.eventId,
        session,
      );

      current.processingStatus = "processed";
      current.processedAt = new Date();

      await current.save({ session });

      return result;
    });

    return sendSuccess(res, 200, message);
  }),
);

paymentRouter.get(
  "/payment/subscription",
  authenticateUser,
  handle("fetch subscription status", async (req, res) => {
    const user = await User.findById(req.user._id).lean();

    if (!user) fail(404, "User not found.");

    // GET computes expiry without modifying provider state or racing a renewal.
    const active = hasPaidAccess(
      user.usagePlan === "Elite",
      user.eliteSubscriptionExpiresAt,
    );

    const query = user.razorpaySubscriptionId
      ? {
          userId: user._id,
          razorpaySubscriptionId: user.razorpaySubscriptionId,
        }
      : { userId: user._id };

    const payment = await Payment.findOne(query).sort({ createdAt: -1 }).lean();

    const canCheckout =
      payment?.creationStatus === "created" &&
      payment.subscriptionStatus === "created" &&
      payment.razorpaySubscriptionId &&
      !active &&
      process.env.RAZORPAY_KEY_ID;

    return sendSuccess(res, 200, "Subscription status fetched.", {
      usagePlan: active ? "Elite" : "Basic",
      creationStatus: payment?.creationStatus ?? null,
      status:
        payment?.creationStatus === "failed"
          ? null
          : (payment?.subscriptionStatus ?? null),
      expiresAt: active ? user.eliteSubscriptionExpiresAt : null,
      nextBillingAt: payment?.nextBillingAt ?? null,
      checkout: canCheckout ? checkoutResponse(payment) : null,
    });
  }),
);

paymentRouter.post(
  "/payment/create-subscription",
  authenticateUser,
  handle("create subscription", async (req, res) => {
    if (!sanitizeSubscriptionRequest(req.body)) {
      fail(400, "Provide a valid Elite subscription request.");
    }

    const key = req.get("Idempotency-Key");

    if (!IDEMPOTENCY_KEY_PATTERN.test(key ?? "")) {
      fail(400, "A valid Idempotency-Key header is required.");
    }

    const provider = getProvider();

    const planId = process.env.RAZORPAY_ELITE_PLAN_ID;

    if (!planId) fail(503, "Elite subscriptions are not configured.");

    const userId = req.user._id;

    const existing = await Payment.findOne({ idempotencyKey: key });

    if (existing) {
      if (String(existing.userId) !== String(userId))
        fail(409, "Request key already in use.");

      if (!existing.razorpaySubscriptionId) {
        fail(
          409,
          existing.creationStatus === "failed"
            ? "This attempt failed. Start a new attempt with a new request key."
            : "Subscription creation is unresolved. Do not start another checkout; contact support.",
        );
      }

      if (!ACTIVE_SUBSCRIPTION_STATUSES.includes(existing.subscriptionStatus)) {
        fail(
          409,
          "This subscription has ended. Start a new checkout with a new request key.",
        );
      }

      await releaseCreationLock(userId, key);

      return sendSuccess(
        res,
        200,
        "Subscription already created.",
        subscriptionResponse(existing),
      );
    }

    const plan = await provider.plans.fetch(planId);

    if (
      plan.period !== "monthly" ||
      plan.interval !== 1 ||
      plan.item?.amount !== ELITE.amount ||
      plan.item?.currency !== ELITE.currency
    ) {
      fail(503, "Configured Elite plan must be INR 199 per month.");
    }
    const locked = await User.updateOne(
      {
        _id: userId,
        subscriptionCreationKey: null,
        $or: [
          { usagePlan: { $ne: "Elite" } },
          { eliteSubscriptionExpiresAt: { $lte: new Date() } },
        ],
      },
      { $set: { subscriptionCreationKey: key } },
    );
    if (locked.modifiedCount !== 1) {
      fail(
        409,
        "An Elite subscription is active or another creation request is in progress.",
      );
    }

    let attempt;
    let remote;
    let requestStarted = false;
    try {
      // Check under the per-user lock to prevent two subscriptions per user.
      const current = await Payment.findOne({
        userId,
        $or: [
          { creationStatus: "creating" },
          {
            creationStatus: "created",
            subscriptionStatus: { $in: ACTIVE_SUBSCRIPTION_STATUSES },
          },
        ],
      }).sort({ createdAt: -1 });

      if (current) {
        await releaseCreationLock(userId, key);

        if (!current.razorpaySubscriptionId) {
          fail(409, "A subscription request is still being reconciled.");
        }

        return sendSuccess(
          res,
          200,
          "Subscription already exists.",
          subscriptionResponse(current),
        );
      }

      attempt = new Payment({
        userId,
        firstName: req.user.firstName,
        lastName: req.user.lastName,
        email: req.user.email,
        usagePlan: "Elite",
        idempotencyKey: key,
        razorpayPlanId: planId,
        amount: ELITE.amount,
        currency: ELITE.currency,
        totalBillingCycles: ELITE.cycles,
        creationStatus: "creating",
        subscriptionStatus: "created",
        accessGranted: false,
      });

      await attempt.save();
      requestStarted = true;

      remote = await provider.subscriptions.create({
        plan_id: planId,
        total_count: ELITE.cycles,
        quantity: 1,
        customer_notify: true,
        notes: {
          userId: String(userId),
          paymentAttemptId: String(attempt._id),
          idempotencyKey: key,
          usagePlan: "Elite",
        },
      });

      const saved = await saveCreatedSubscription(attempt, remote);

      return sendSuccess(
        res,
        201,
        "Subscription created. Complete checkout.",
        subscriptionResponse(saved),
      );
    } catch (error) {
      // Retry only local persistence, never the remote create call.
      if (remote && attempt) {
        try {
          const saved = await saveCreatedSubscription(attempt, remote);

          return sendSuccess(
            res,
            201,
            "Subscription created. Complete checkout.",
            subscriptionResponse(saved),
          );
        } catch (recoveryError) {
          console.error(
            "Subscription persistence needs reconciliation",
            String(attempt._id),
            recoveryError.message,
          );
        }
      }
      // Timeouts, rate limits, and 5xx may have an unknown outcome. Keep the lock.
      const rejected =
        requestStarted &&
        !remote &&
        [400, 401, 403, 404, 422].includes(error?.statusCode);

      if (!requestStarted || rejected) {
        // If cleanup fails, keep the lock rather than risk another remote create.
        if (attempt) {
          await Payment.updateOne(
            {
              _id: attempt._id,
              razorpaySubscriptionId: null,
              creationStatus: "creating",
            },
            { $set: { creationStatus: "failed" } },
          );
        }

        await releaseCreationLock(userId, key);
      }
      if (error instanceof HttpError && !requestStarted) throw error;

      fail(
        rejected ? 502 : 503,
        requestStarted && !rejected
          ? "Subscription creation could not be confirmed. Do not start another checkout; contact support."
          : "Unable to create subscription. Retry with a new request key.",
      );
    }
  }),
);

paymentRouter.post(
  "/payment/verify-subscription",
  authenticateUser,
  handle("verify subscription checkout", async (req, res) => {
    const {
      razorpay_payment_id: paymentId,
      razorpay_subscription_id: subscriptionId,
      razorpay_signature: signature,
    } = req.body ?? {};

    if (
      typeof paymentId !== "string" ||
      !/^pay_[a-zA-Z0-9]+$/.test(paymentId) ||
      typeof subscriptionId !== "string" ||
      !/^sub_[a-zA-Z0-9]+$/.test(subscriptionId) ||
      !WEBHOOK_SIGNATURE_PATTERN.test(signature ?? "")
    ) {
      fail(400, "Invalid subscription checkout response.");
    }

    const payment = await Payment.findOne({
      userId: req.user._id,
      razorpaySubscriptionId: subscriptionId,
    });

    if (!payment) fail(404, "Subscription not found.");

    const secret = process.env.RAZORPAY_KEY_SECRET;

    if (!secret) fail(503, "Subscription verification is not configured.");

    const valid = razorpayUtils.validatePaymentVerification(
      {
        payment_id: paymentId,
        subscription_id: payment.razorpaySubscriptionId,
      },
      signature.toLowerCase(),
      secret,
    );

    if (!valid) fail(400, "Invalid subscription checkout signature.");

    // Authentication can be a nominal charge. Only subscription.charged grants access.
    return sendSuccess(
      res,
      200,
      "Checkout verified. Awaiting payment confirmation.",
      {
        verified: true,
        ...subscriptionResponse(payment),
      },
    );
  }),
);

function parseWebhook(req) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) fail(503, "Payment webhook is not configured.");

  const signature = req.get("x-razorpay-signature");
  const eventId = req.get("x-razorpay-event-id");

  if (
    !Buffer.isBuffer(req.body) ||
    !WEBHOOK_SIGNATURE_PATTERN.test(signature ?? "") ||
    typeof eventId !== "string" ||
    !eventId.trim() ||
    eventId.length > 255
  ) {
    fail(400, "Invalid payment webhook request.");
  }

  if (
    !Razorpay.validateWebhookSignature(
      req.body,
      signature.toLowerCase(),
      secret,
    )
  ) {
    fail(400, "Invalid payment webhook signature.");
  }

  let event;
  try {
    event = JSON.parse(req.body.toString("utf8"));
  } catch {
    fail(400, "Invalid payment webhook payload.");
  }

  if (
    !event ||
    Array.isArray(event) ||
    typeof event !== "object" ||
    typeof event.event !== "string"
  ) {
    fail(400, "Invalid payment webhook event.");
  }

  return {
    event,
    eventId,
    payloadHash: createHash("sha256").update(req.body).digest("hex"),
  };
}
async function getWebhookRecord({ event, eventId, payloadHash }) {
  const query = { $or: [{ eventId }, { payloadHash }] };

  let record = await PaymentWebhookEvent.findOne(query);

  if (!record) {
    try {
      record = await PaymentWebhookEvent.create({
        eventId,
        payloadHash,
        eventType: event.event,
        processingStatus: "pending",
      });
    } catch (error) {
      if (error.code !== 11000) throw error;
      record = await PaymentWebhookEvent.findOne(query);
    }
  }

  if (!record) fail(503, "Webhook record unavailable. Retry delivery.");

  if (record.payloadHash !== payloadHash)
    fail(400, "Event ID has a different payload.");

  return record;
}

function formatEmailDate(date) {
  return date
    ? new Intl.DateTimeFormat("en-IN", {
        dateStyle: "long",
        timeZone: "UTC",
      }).format(date)
    : null;
}

async function applySubscriptionEvent(event, eventId, session) {
  let status = EVENT_STATUS.get(event.event);

  if (!status) return "Webhook event acknowledged.";

  const subscription = event.payload?.subscription?.entity;
  const subscriptionId = subscription?.id;
  const eventDate = toUnixDate(event.created_at);

  if (typeof subscriptionId !== "string" || !subscriptionId || !eventDate) {
    fail(
      400,
      "Webhook requires a subscription entity and a valid event timestamp.",
    );
  }

  let payment = await Payment.findOne({
    razorpaySubscriptionId: subscriptionId,
  }).session(session);

  const attemptId = subscription.notes?.paymentAttemptId;

  if (
    !payment &&
    typeof attemptId === "string" &&
    /^[a-f0-9]{24}$/i.test(attemptId)
  ) {
    payment = await Payment.findById(attemptId).session(session);
  }

  if (!payment)
    fail(503, "Subscription record is not available yet. Retry delivery.");

  if (
    payment.razorpaySubscriptionId &&
    payment.razorpaySubscriptionId !== subscriptionId
  ) {
    fail(409, "Payment attempt belongs to a different subscription.");
  }

  if (
    subscription.plan_id !== payment.razorpayPlanId ||
    (subscription.notes?.userId &&
      String(payment.userId) !== subscription.notes.userId)
  ) {
    fail(409, "Subscription does not match the local payment attempt.");
  }

  status = resolveEventStatus(payment, status, eventDate);

  if (!status) return "Older webhook event ignored.";
  const charged = event.event === "subscription.charged";
  const firstSuccessfulCharge = !payment.subscriptionStartDate;

  if (charged) {
    const charge = event.payload?.payment?.entity;

    if (
      !charge ||
      charge.status !== "captured" ||
      charge.amount !== payment.amount ||
      charge.currency !== payment.currency ||
      subscription.quantity !== 1
    ) {
      fail(
        409,
        "Subscription charge does not match the expected captured payment.",
      );
    }
  }
  const dates = {
    subscriptionStartDate: toUnixDate(subscription.current_start),
    subscriptionExpiresIn: toUnixDate(subscription.current_end),
    nextBillingAt: toUnixDate(subscription.charge_at),
  };

  if (
    charged &&
    (!dates.subscriptionStartDate ||
      !dates.subscriptionExpiresIn ||
      dates.subscriptionExpiresIn <= dates.subscriptionStartDate)
  ) {
    // A current API fetch may describe a different cycle from this historical event.
    fail(
      503,
      "Charged event has missing or invalid billing dates. Reconciliation required.",
    );
  }

  payment.razorpaySubscriptionId = subscriptionId;
  payment.creationStatus = "created";
  payment.subscriptionStatus = status;
  payment.lastProviderEventAt = eventDate;

  if (charged) {
    payment.accessGranted = !REVOKE_ACCESS.has(status);
    Object.assign(payment, dates);
    if (REVOKE_ACCESS.has(status)) payment.nextBillingAt = null;
  } else if (REVOKE_ACCESS.has(status)) {
    payment.accessGranted = false;
    payment.nextBillingAt = null;
  }

  await payment.save({ session });

  const user = await User.findById(payment.userId).session(session);

  if (!user)
    fail(503, "Subscription user is unavailable. Reconciliation required.");

  const update = {};
  let notification = null;

  if (charged && !REVOKE_ACCESS.has(status)) {
    if (
      user.razorpaySubscriptionId &&
      user.razorpaySubscriptionId !== subscriptionId
    ) {
      fail(
        409,
        "User is linked to a different subscription. Reconciliation required.",
      );
    }

    update.$set = {
      usagePlan: "Elite",
      razorpaySubscriptionId: subscriptionId,
      eliteSubscriptionExpiresAt: dates.subscriptionExpiresIn,
    };
    notification = {
      template: firstSuccessfulCharge ? "elite-purchase" : "elite-renewal",
      data: firstSuccessfulCharge
        ? {
            recipientName: payment.firstName,
            amount: (payment.amount / 100).toFixed(2),
            currency: payment.currency,
            billingCycles: payment.totalBillingCycles,
            expiresAt: formatEmailDate(dates.subscriptionExpiresIn),
          }
        : {
            recipientName: payment.firstName,
            amount: (payment.amount / 100).toFixed(2),
            currency: payment.currency,
            nextBillingAt: formatEmailDate(dates.nextBillingAt),
          },
    };
  } else if (
    REVOKE_ACCESS.has(status) &&
    user.razorpaySubscriptionId === subscriptionId
  ) {
    update.$set = { usagePlan: "Basic" };

    update.$unset = {
      razorpaySubscriptionId: 1,
      eliteSubscriptionExpiresAt: 1,
    };
  }
  if (status === "halted" || status === "paused") {
    notification = {
      template: "elite-payment-attention",
      data: {
        recipientName: payment.firstName,
        status,
      },
    };
  } else if (
    ["cancelled", "completed", "expired"].includes(status)
  ) {
    notification = {
      template: "elite-subscription-ended",
      data: {
        recipientName: payment.firstName,
        status,
        effectiveDate: formatEmailDate(eventDate),
      },
    };
  }

  if (user.subscriptionCreationKey === payment.idempotencyKey) {
    update.$unset = { ...update.$unset, subscriptionCreationKey: 1 };
  }

  if (Object.keys(update).length) {
    const result = await User.updateOne({ _id: user._id }, update, {
      session,
      runValidators: true,
    });

    if (result.matchedCount !== 1)
      fail(503, "Subscription user changed. Retry delivery.");
  }

  if (notification) {
    await enqueueEmail(
      {
        eventKey: `razorpay:${eventId}:${notification.template}`,
        template: notification.template,
        toAddress: payment.email,
        data: notification.data,
      },
      { session },
    );
  }

  return "Webhook processed.";
}

export default paymentRouter;
