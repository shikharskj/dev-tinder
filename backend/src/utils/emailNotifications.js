import { createHash } from "node:crypto";
import { Resend } from "resend";
import EmailOutbox from "../models/emailOutbox.js";
import { renderEmail } from "../templates/index.js";

const MAX_ATTEMPTS = 8;
const LOCK_DURATION_MS = 60_000;
const MAX_BACKOFF_MS = 6 * 60 * 60 * 1000;
const POLL_INTERVAL_MS = 15_000;

let resendClient;
let dispatching = false;
let worker;
let configurationWarningShown = false;

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY;
  const fromAddress = process.env.RESEND_FROM_EMAIL;

  if (!apiKey || !fromAddress || !process.env.APP_URL) {
    if (!configurationWarningShown) {
      console.warn(
        "Email delivery is disabled until RESEND_API_KEY, RESEND_FROM_EMAIL, and APP_URL are configured.",
      );
      configurationWarningShown = true;
    }
    return null;
  }

  if (!resendClient) resendClient = new Resend(apiKey);
  return { client: resendClient, fromAddress };
}

export async function enqueueEmail(
  { eventKey, template, toAddress, data },
  options = {},
) {
  if (!eventKey || !toAddress) {
    throw new Error("Email outbox requires an event key and recipient.");
  }

  await EmailOutbox.updateOne(
    { eventKey },
    {
      $setOnInsert: {
        eventKey,
        template,
        toAddress,
        data,
        status: "pending",
        nextAttemptAt: new Date(),
      },
    },
    { upsert: true, ...(options.session ? { session: options.session } : {}) },
  );
}

async function deliver(outboxEntry) {
  const config = getResendClient();
  if (!config) return false;

  const rendered = renderEmail(outboxEntry.template, outboxEntry.data);
  const { data, error } = await config.client.emails.send(
    {
      from: config.fromAddress,
      to: outboxEntry.toAddress,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
    },
    {
      idempotencyKey: createHash("sha256")
        .update(outboxEntry.eventKey)
        .digest("hex"),
    },
  );

  if (error) {
    const providerError = new Error("Resend rejected the email.");
    providerError.name = error.name || "ResendError";
    throw providerError;
  }

  return data;
}

async function claimNextEmail() {
  const now = new Date();
  await EmailOutbox.updateMany(
    {
      status: "sending",
      attempts: { $gte: MAX_ATTEMPTS },
      lockedUntil: { $lte: now },
    },
    { $set: { status: "failed", lockedUntil: null } },
  );

  return EmailOutbox.findOneAndUpdate(
    {
      attempts: { $lt: MAX_ATTEMPTS },
      $or: [
        { status: "pending", nextAttemptAt: { $lte: now } },
        { status: "sending", lockedUntil: { $lte: now } },
      ],
    },
    {
      $set: {
        status: "sending",
        lockedUntil: new Date(now.getTime() + LOCK_DURATION_MS),
      },
      $inc: { attempts: 1 },
    },
    { sort: { createdAt: 1 }, returnDocument: "after" },
  );
}

async function recordFailure(outboxEntry, error) {
  const exhausted = outboxEntry.attempts >= MAX_ATTEMPTS;
  const delay = Math.min(
    30_000 * 2 ** Math.max(0, outboxEntry.attempts - 1),
    MAX_BACKOFF_MS,
  );

  await EmailOutbox.updateOne(
    { _id: outboxEntry._id, status: "sending" },
    {
      $set: {
        status: exhausted ? "failed" : "pending",
        lockedUntil: null,
        nextAttemptAt: new Date(Date.now() + delay),
        lastError: String(error?.name || "EmailDeliveryError").slice(0, 100),
      },
    },
  );

  console.error("Email delivery failed.", {
    eventKey: outboxEntry.eventKey,
    template: outboxEntry.template,
    attempt: outboxEntry.attempts,
    retrying: !exhausted,
    errorName: error?.name || "EmailDeliveryError",
  });
}

export async function dispatchPendingEmails() {
  if (dispatching || !getResendClient()) return;
  dispatching = true;

  try {
    for (let count = 0; count < 20; count += 1) {
      const entry = await claimNextEmail();
      if (!entry) break;

      try {
        const result = await deliver(entry);
        await EmailOutbox.updateOne(
          { _id: entry._id, status: "sending" },
          {
            $set: {
              status: "sent",
              sentAt: new Date(),
              resendId: result?.id || null,
              lockedUntil: null,
              lastError: null,
            },
          },
        );
      } catch (error) {
        await recordFailure(entry, error);
      }
    }
  } catch (error) {
    console.error("Email outbox dispatch failed.", {
      errorName: error?.name || "EmailOutboxError",
    });
  } finally {
    dispatching = false;
  }
}

export function startEmailWorker() {
  if (worker) return;
  if (!getResendClient()) return;

  void dispatchPendingEmails();
  worker = setInterval(() => {
    void dispatchPendingEmails();
  }, POLL_INTERVAL_MS);
  worker.unref();
}
