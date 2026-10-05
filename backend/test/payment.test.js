import { after, afterEach, before, beforeEach, mock, test } from "node:test";
import assert from "node:assert/strict";
import { createHmac, createHash, randomUUID } from "node:crypto";
import express from "express";
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken";
import RazorpayAPI from "razorpay/dist/api.js";
import Payment from "../src/models/payment.js";
import User from "../src/models/user.js";
import PaymentWebhookEvent from "../src/models/paymentWebhookEvent.js";
import paymentRouter from "../src/routes/payment.js";
import {
  toUnixDate,
  hasPaidAccess,
  resolveEventStatus,
} from "../src/utils/subscription.js";
import { ACTIVE_SUBSCRIPTION_STATUSES } from "../constants.js";

const userId = "a".repeat(24);
const session = { testSession: true };
let server, base, payment, user, record, writes;
const query = (value) => ({
  session: () => Promise.resolve(value),
  select: () => Promise.resolve(value),
  sort() {
    return this;
  },
  lean: () => Promise.resolve(value),
  then(resolve, reject) {
    return Promise.resolve(value).then(resolve, reject);
  },
});
const signed = (body, secret) =>
  createHmac("sha256", secret).update(body).digest("hex");
const event = (name = "subscription.charged") => ({
  event: name,
  created_at: 1700000001,
  payload: {
    subscription: {
      entity: {
        id: "sub_A",
        plan_id: "plan_A",
        quantity: 1,
        current_start: 1700000000,
        current_end: 1702592000,
        charge_at: 1702592000,
      },
    },
    payment: {
      entity: {
        id: "pay_A",
        status: "captured",
        amount: 19900,
        currency: "INR",
      },
    },
  },
});
async function call(path, body, headers = {}) {
  const raw = typeof body === "string" ? body : JSON.stringify(body);
  const response = await fetch(`${base}${path}`, {
    method: body === undefined ? "GET" : "POST",
    body: raw,
    headers: {
      "Content-Type": "application/json",
      Cookie: `token=${jwt.sign({ userId }, process.env.JWT_SECRET)}`,
      ...headers,
    },
  });
  return { status: response.status, ...(await response.json()) };
}
async function webhook(payload, headers = {}) {
  const body = typeof payload === "string" ? payload : JSON.stringify(payload);
  record.payloadHash = createHash("sha256").update(body).digest("hex");
  return call("/payment/webhook", body, {
    "x-razorpay-event-id": "event_A",
    "x-razorpay-signature": signed(body, process.env.RAZORPAY_WEBHOOK_SECRET),
    ...headers,
  });
}
before(async () => {
  process.env.JWT_SECRET = "unit-test-jwt";
  process.env.RAZORPAY_KEY_SECRET = "unit-test-api";
  process.env.RAZORPAY_KEY_ID = "rzp_test_dummy";
  process.env.RAZORPAY_ELITE_PLAN_ID = "plan_A";
  process.env.RAZORPAY_WEBHOOK_SECRET = "unit-test-webhook";
  const app = express();
  app.use(cookieParser());
  app.use(
    "/payment/webhook",
    express.raw({ type: "application/json", limit: "100kb" }),
  );
  app.use(express.json({ limit: "10kb" }));
  app.use(paymentRouter);
  server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => new Promise((resolve) => server.close(resolve)));
beforeEach(() => {
  writes = [];
  mock.method(RazorpayAPI.prototype, "get", async () => {
    throw new Error("Unexpected provider GET");
  });
  mock.method(RazorpayAPI.prototype, "post", async () => {
    throw new Error("Unexpected provider POST");
  });
  payment = {
    _id: "b".repeat(24),
    userId,
    idempotencyKey: randomUUID(),
    razorpaySubscriptionId: "sub_A",
    razorpayPlanId: "plan_A",
    amount: 19900,
    currency: "INR",
    subscriptionStatus: "created",
    creationStatus: "created",
    accessGranted: false,
    async save(options) {
      writes.push(["payment", options]);
    },
  };
  user = {
    firstName: "Test",
    lastName: "User",
    email: "test@example.com",
    _id: userId,
    usagePlan: "Basic",
    razorpaySubscriptionId: null,
  };
  record = {
    _id: "c".repeat(24),
    processingStatus: "pending",
    async save(options) {
      writes.push(["event", options]);
    },
  };
  mock.method(User, "findById", () => query({ ...user }));
  mock.method(User, "updateOne", async (filter, update, options) => {
    writes.push(["user", options, filter, update]);
    return { matchedCount: 1, modifiedCount: 1 };
  });
  mock.method(Payment, "findOne", () => query(payment));
  mock.method(PaymentWebhookEvent, "findOne", async () => record);
  mock.method(PaymentWebhookEvent, "findById", () => query(record));
  // Tests session propagation/route behavior, not MongoDB's actual transaction engine.
  mock.method(Payment.db, "transaction", (callback) => callback(session));
});
afterEach(() => mock.restoreAll());

test("date conversion and paid access fail closed at expiry or invalid values", () => {
  assert.equal(toUnixDate(Number.MAX_SAFE_INTEGER), null);
  assert.equal(toUnixDate(-1), null);
  assert.equal(+toUnixDate(1700000000), 1700000000000);
  assert.equal(hasPaidAccess(true, new Date(1000), new Date(1000)), false);
  assert.equal(hasPaidAccess(true, new Date(1001), new Date(1000)), true);
  assert.equal(hasPaidAccess(true, null), false);
});
test("normal same-second activation and authentication converge to active", () => {
  const date = new Date(1000);
  assert.equal(
    resolveEventStatus(
      { subscriptionStatus: "authenticated", lastProviderEventAt: date },
      "active",
      date,
    ),
    "active",
  );
  assert.equal(
    resolveEventStatus(
      { subscriptionStatus: "active", lastProviderEventAt: date },
      "authenticated",
      date,
    ),
    "active",
  );
});
test("same-second revocation wins and newer recovery from halted is allowed", () => {
  const date = new Date(1000);
  assert.equal(
    resolveEventStatus(
      { subscriptionStatus: "active", lastProviderEventAt: date },
      "halted",
      date,
    ),
    "halted",
  );
  assert.equal(
    resolveEventStatus(
      { subscriptionStatus: "halted", lastProviderEventAt: date },
      "active",
      date,
    ),
    "halted",
  );
  assert.equal(
    resolveEventStatus(
      { subscriptionStatus: "halted", lastProviderEventAt: date },
      "active",
      new Date(2000),
    ),
    "active",
  );
  assert.equal(
    resolveEventStatus(
      { subscriptionStatus: "cancelled", lastProviderEventAt: date },
      "active",
      new Date(2000),
    ),
    null,
  );
});
test("recoverable subscriptions block new billable subscriptions", () => {
  assert.ok(ACTIVE_SUBSCRIPTION_STATUSES.includes("halted"));
  assert.ok(ACTIVE_SUBSCRIPTION_STATUSES.includes("paused"));
});
test("webhook rejects tampered signature before database changes", async () => {
  assert.equal(
    (await webhook(event(), { "x-razorpay-signature": "0".repeat(64) })).status,
    400,
  );
  assert.equal(writes.length, 0);
});
test("signed null, array and malformed JSON return 400", async () => {
  for (const body of ["null", "[]", "{"])
    assert.equal((await webhook(body)).status, 400);
});
test("valid raw signed charged event uses the same session for every write", async () => {
  const result = await webhook(event());
  assert.equal(result.status, 200);
  assert.deepEqual(
    writes.map(([kind]) => kind),
    ["payment", "user", "event"],
  );
  assert.ok(writes.every(([, options]) => options.session === session));
  assert.equal(writes[1][3].$set.usagePlan, "Elite");
});
test("processed webhook replay makes no further writes", async () => {
  record.processingStatus = "processed";
  assert.equal((await webhook(event())).status, 200);
  assert.equal(writes.length, 0);
});
test("wrong plan, amount or uncaptured payment cannot grant access", async () => {
  for (const mutate of [
    (e) => {
      e.payload.subscription.entity.plan_id = "plan_B";
    },
    (e) => {
      e.payload.payment.entity.amount = 100;
    },
    (e) => {
      e.payload.payment.entity.status = "authorized";
    },
  ]) {
    const e = event();
    mutate(e);
    assert.equal((await webhook(e)).status, 409);
    assert.equal(writes.length, 0);
  }
});
test("missing charged billing dates remains retryable", async () => {
  const e = event();
  delete e.payload.subscription.entity.current_end;
  assert.equal((await webhook(e)).status, 503);
  assert.equal(record.processingStatus, "pending");
});
test("database failure does not mark event completed", async () => {
  mock.method(User, "updateOne", async () => {
    throw new Error("injected database failure");
  });
  assert.equal((await webhook(event())).status, 500);
  assert.equal(record.processingStatus, "pending");
  assert.ok(!writes.some(([kind]) => kind === "event"));
});
test("older events do not update payment or user", async () => {
  payment.lastProviderEventAt = new Date(1800000000000);
  assert.equal((await webhook(event())).status, 200);
  assert.deepEqual(
    writes.map(([kind]) => kind),
    ["event"],
  );
});
test("Checkout verification uses payment|stored-subscription and never grants access", async () => {
  const body = {
    razorpay_payment_id: "pay_A",
    razorpay_subscription_id: "sub_A",
    razorpay_signature: signed("pay_A|sub_A", process.env.RAZORPAY_KEY_SECRET),
  };
  const result = await call("/payment/verify-subscription", body);
  assert.equal(result.status, 200);
  assert.equal(result.data.verified, true);
  assert.equal(writes.length, 0);
  body.razorpay_signature = signed(
    "sub_A|pay_A",
    process.env.RAZORPAY_KEY_SECRET,
  );
  assert.equal((await call("/payment/verify-subscription", body)).status, 400);
});
test("Checkout lookup is scoped to the authenticated user", async () => {
  mock.method(Payment, "findOne", (filter) => {
    assert.equal(String(filter.userId), userId);
    assert.equal(filter.razorpaySubscriptionId, "sub_B");
    return query(null);
  });
  const result = await call("/payment/verify-subscription", {
    razorpay_payment_id: "pay_B",
    razorpay_subscription_id: "sub_B",
    razorpay_signature: "a".repeat(64),
  });
  assert.equal(result.status, 404);
});
test("expired user status and authentication do not rewrite provider lifecycle", async () => {
  user.usagePlan = "Elite";
  user.eliteSubscriptionExpiresAt = new Date(1000);
  user.razorpaySubscriptionId = "sub_A";
  payment.subscriptionStatus = "active";
  const result = await call("/payment/subscription");
  assert.equal(result.status, 200);
  assert.equal(result.data.usagePlan, "Basic");
  assert.equal(result.data.status, "active");
  assert.equal(writes.length, 0);
});
test("invalid create input is rejected without contacting Razorpay", async () => {
  assert.equal(
    (
      await call("/payment/create-subscription", {
        usagePlan: "Elite",
        amount: 1,
      })
    ).status,
    400,
  );
  assert.equal(
    (await call("/payment/create-subscription", { usagePlan: "Elite" })).status,
    400,
  );
});

function prepareCreation() {
  mock.method(Payment, "findOne", () => query(null));
  mock.method(Payment.prototype, "save", async function () {
    await this.validate();
    payment = this;
    return this;
  });
  mock.method(RazorpayAPI.prototype, "get", async () => ({
    period: "monthly",
    interval: 1,
    item: { amount: 19900, currency: "INR" },
  }));
  mock.method(Payment, "updateOne", async (filter, update) => {
    writes.push(["attempt-update", {}, filter, update]);
    return { matchedCount: 1 };
  });
}
test("uncertain provider timeout retains creation lock and never retries remote create", async () => {
  prepareCreation();
  const post = mock.method(RazorpayAPI.prototype, "post", async () => {
    throw new Error("timeout");
  });
  const result = await call(
    "/payment/create-subscription",
    { usagePlan: "Elite" },
    { "Idempotency-Key": randomUUID() },
  );
  assert.equal(result.status, 503);
  assert.equal(post.mock.callCount(), 1);
  assert.ok(
    !writes.some(([, , , update]) => update?.$unset?.subscriptionCreationKey),
  );
  assert.equal(payment.creationStatus, "creating");
});
test("definite provider rejection marks failure and releases matching lock", async () => {
  prepareCreation();
  const post = mock.method(RazorpayAPI.prototype, "post", async () => {
    throw { statusCode: 400 };
  });
  const result = await call(
    "/payment/create-subscription",
    { usagePlan: "Elite" },
    { "Idempotency-Key": randomUUID() },
  );
  assert.equal(result.status, 502);
  assert.equal(post.mock.callCount(), 1);
  assert.ok(
    writes.some(([, , , update]) => update?.$set?.creationStatus === "failed"),
  );
  assert.ok(
    writes.some(([, , , update]) => update?.$unset?.subscriptionCreationKey),
  );
});
test("local persistence recovery never recreates the provider subscription or overwrites webhook dates", async () => {
  prepareCreation();
  const post = mock.method(RazorpayAPI.prototype, "post", async () => ({
    id: "sub_A",
    short_url: "https://example.com",
  }));
  let saves = 0;
  mock.method(Payment, "findOneAndUpdate", async (filter, update) => {
    assert.equal(update.$set.subscriptionExpiresIn, undefined);
    assert.equal(update.$set.subscriptionStatus, undefined);
    if (++saves === 1) throw new Error("temporary database failure");
    return { ...payment.toObject(), ...update.$set };
  });
  const result = await call(
    "/payment/create-subscription",
    { usagePlan: "Elite" },
    { "Idempotency-Key": randomUUID() },
  );
  assert.equal(result.status, 201);
  assert.equal(post.mock.callCount(), 1);
  assert.equal(saves, 2);
});
test("repeated unresolved creation key does not contact the provider", async () => {
  payment.razorpaySubscriptionId = undefined;
  payment.creationStatus = "creating";
  const result = await call(
    "/payment/create-subscription",
    { usagePlan: "Elite" },
    { "Idempotency-Key": payment.idempotencyKey },
  );
  assert.equal(result.status, 409);
  assert.equal(writes.length, 0);
});
