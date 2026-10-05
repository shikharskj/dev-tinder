# Razorpay subscription integration

This project uses Razorpay **Subscriptions**, not the Orders payment flow. Elite is INR 199 per month, quantity 1, for 12 billing cycles. The repository implementation supersedes the earlier standalone router draft.

## API contract

The backend routes have no `/api` prefix. Vite and the existing Nginx proxy strip `/api` before forwarding requests.

| Public path through the proxy | Method | Authentication | Purpose |
| --- | --- | --- | --- |
| `/api/payment/subscription` | GET | User cookie | Current effective access, creation status, provider lifecycle, expiry, resumable checkout |
| `/api/payment/create-subscription` | POST | User cookie + UUID `Idempotency-Key` | Create or reuse an Elite subscription |
| `/api/payment/verify-subscription` | POST | User cookie | Verify the Checkout callback for the user's stored subscription |
| `/api/payment/webhook` | POST | Razorpay signature | Apply subscription events and grant/revoke access |

Create body: `{"usagePlan":"Elite"}`. Prices are never accepted from the client.

Verification body: `razorpay_payment_id`, `razorpay_subscription_id`, `razorpay_signature` from Checkout. The installed SDK verifies `payment_id + "|" + stored_subscription_id` with the API secret. Successful verification does **not** grant Elite, since subscription authentication may involve a nominal charge. The frontend then polls for the verified charged webhook.

Webhook verification uses the installed SDK, the webhook secret and the original raw request bytes. `src/app.js` already registers `express.raw()` before `express.json()`; keep that order. No extra raw-body library is needed.

## Server configuration

Set these in the backend runtime environment; do not commit real values:

```dotenv
NODE_ENV=production
PORT=7777
FRONTEND_ORIGIN=https://dev-tinder-community.in
DB_CONNECTION_STRING=<your MongoDB replica-set or Atlas URI>
JWT_SECRET=<your existing strong application secret>
RAZORPAY_KEY_ID=<key for the selected Razorpay mode>
RAZORPAY_KEY_SECRET=<matching API key secret>
RAZORPAY_ELITE_PLAN_ID=<INR 199 monthly plan in the same mode>
RAZORPAY_WEBHOOK_SECRET=<new random webhook secret matching Dashboard>
```

The old example contained a concrete webhook-secret value. If you used it in Dashboard or production, replace it there and in the runtime environment. It is public repository content; editing the example does not revoke it. Coordinate any rotation with pending deliveries: older signed retries may need their original secret/reconciliation.

The example plan placeholder now says INR 199 instead of INR 200. Configure a monthly plan with interval 1, amount 19900 paise, currency INR. This version expects each regular charged payment to be captured for exactly the configured amount/currency with quantity 1. Do not enable offers, add-ons, trial/upfront billing or tax changes without updating the charge-validation rules and tests.

## MongoDB requirements

Webhook Payment/User/event-completion updates now use `Payment.db.transaction()`. Use a replica set or sharded cluster; standalone MongoDB will not support this path. All models in this repository use the same default Mongoose connection.

Verify these actual database indexes exist before accepting payments:

- `payments.idempotencyKey`: unique.
- `payments.razorpaySubscriptionId`: unique and sparse (already declared; absent IDs must remain omitted, not explicit null).
- `paymentwebhookevents.eventId`: unique.
- `paymentwebhookevents.payloadHash`: unique.

No new database collection or index definition is required by this change. The Payment enum now accepts `paused`. Existing documents do not require a blanket migration. If previous expiry handling marked an ongoing provider subscription `expired`, reconcile that record against Razorpay before allowing resubscription. Also audit old Elite users without a paid expiry; access now fails closed for missing/invalid dates.

Mongoose normally creates declared indexes when autoIndex is enabled; verify production settings and actual indexes rather than assuming they exist. Resolve duplicate data before creating a missing unique index. Never drop billing indexes simply to make startup succeed.

## Razorpay Dashboard

Configure the HTTPS webhook URL:

`https://dev-tinder-community.in/api/payment/webhook`

This assumes the existing Nginx `/api/` proxy strips the prefix. The Express backend receives `/payment/webhook`. Do not mount a second `/api` prefix without changing the proxy accordingly.

Enable:

- `subscription.authenticated`
- `subscription.activated`
- `subscription.charged`
- `subscription.pending`
- `subscription.halted`
- `subscription.cancelled`
- `subscription.completed`
- `subscription.expired`
- `subscription.paused`
- `subscription.resumed`

Set an alert email. Configure test and live modes separately, with matching mode-specific keys and plan IDs. Confirm that Subscriptions and the desired recurring payment methods are enabled for your account. No new order-paid webhook or Orders verification endpoint is needed for this flow.

## Access and event ordering

- Authentication and status reads calculate access from `usagePlan` and a future expiry. They no longer mutate subscription records on expiry, so a renewal cannot be overwritten by an unrelated read.
- Resumable checkout subscriptions are fetched from Razorpay before the server returns Checkout details. A missing ID or mismatched plan is surfaced for reconciliation instead of opening Checkout with a stale ID; a provider subscription that is no longer awaiting authorization is not offered again. New attempts retain the public Razorpay key ID used at creation, and checkout is blocked if the server key later changes. Test/live credentials and plan IDs must belong to the same account.
- Billing status and entitlement are separate: a provider subscription can still be `active` while paid access has expired.
- Subscription creation blocks halted/paused subscriptions too, because those can recover and bill again.
- State changes and event completion commit together. Duplicate delivery is recognised by event ID/payload fingerprint.
- Older lifecycle events are acknowledged without updating state. Equal-second events use a deterministic application policy: forward activation beats authentication, and more restrictive states win ties. Newer events can recover halted/pending states. Completed/cancelled/expired subscriptions cannot be resurrected by a delayed active event. This is not a claim that timestamps establish a total provider ordering.
- Cancellation, completion, expiry and halted states preserve the original immediate-revocation policy. Paused subscriptions also revoke access. Resumption alone does not grant access; a confirmed charge does. If customers should retain the remainder of a paid month, change this policy explicitly before launch.
- Missing billing dates, unexpected charge amounts or conflicting associations remain unprocessed and require investigation/reconciliation. We do not infer historical billing dates from a current subscription fetch.

## Creation recovery

Creation saves a local attempt and takes a per-user lock before the provider create call. A confirmed provider rejection marks the attempt failed and clears its matching lock. A new attempt then uses a new key. The frontend no longer interprets every 409 conflict as permission to create again.

If the provider times out or its outcome is uncertain, the lock remains. Do not automatically resend a create request or clear that lock. There is no provider idempotency guarantee from storing an idempotency key in `notes`.

Use `notes.paymentAttemptId`, `notes.userId` and `notes.idempotencyKey` to find an already-created subscription in Razorpay. Link a confirmed matching provider subscription to the existing attempt, set `creationStatus=created`, then clear only that attempt's user lock. If the process failed before the provider call, establish that no provider subscription exists before marking the attempt failed. No scheduled reconciliation worker is included in this patch.

## Install, verify and deploy

After reviewing and merging the pull request:

```bash
npm --prefix backend ci
npm --prefix frontend ci
npm --prefix frontend run lint
npm --prefix frontend run build
```

Subscription timestamp validation and paid-access comparisons use `date-fns`, declared directly in the backend dependencies.

Deploy the new frontend build and restart the backend with the updated environment. On the server, install from the backend lockfile before restarting PM2:

```bash
cd /home/ubuntu/dev-tinder
git pull
cd backend
npm ci --omit=dev
pm2 restart devTinder-backend --update-env
pm2 logs devTinder-backend --lines 50
```

The backend manifest and lockfile include `date-fns`, so installing only the backend dependencies provides the runtime import. Use the PM2 process name shown by `pm2 list`; this server's process is `devTinder-backend`. If PM2 continues to show an errored or restarting process, inspect its error log before retrying. Updating GitHub alone does not deploy the server.

Before live traffic, verify first authorization/charge, renewal, duplicate/concurrent deliveries, a deliberately failing user update, pause/resume, cancellation, expired access and an uncertain create outcome. Confirm failed transaction writes roll back and successful event completion is committed once. Check that the provider charge payload contains `subscription.entity`, `payment.entity`, billing dates and quantity.

## Remaining product work

- There is no customer-facing cancellation/resume API or reconciliation worker in this patch. Until one exists, manage those operations through Dashboard/support and process the corresponding webhooks.
- This is a subscription-state integration, not a full per-charge ledger/refund/dispute system. Add those for accounting and refunds; historical ignored lifecycle events do not become charge records.
- The plans page advertises request limits, priority feed placement, messaging history and read receipts. The reviewed routes do not implement corresponding plan-based gates/ranking, and the repository does not contain a messaging implementation. Implement those benefits or correct the advertised plan copy before selling them.

References: https://razorpay.com/docs/webhooks/validate-test/ and https://mongoosejs.com/docs/transactions.html. Subscription Checkout verification was also checked against the installed `razorpay` SDK implementation.
