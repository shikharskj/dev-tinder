# Transactional email

DevTinder sends transactional messages through Resend. Set these variables in
the backend runtime environment:

```dotenv
APP_URL=https://dev-tinder-community.in
RESEND_API_KEY=<Resend API key>
RESEND_FROM_EMAIL=DevTinder <notifications@your-verified-domain.example>
```

Verify the sender domain in Resend before using it. The sender must be an
address/domain authorized for the configured Resend account. `APP_URL` must be
an HTTPS URL and is used to build links back into the application.

## Notifications

| Event | Template | Recipient |
| --- | --- | --- |
| Account created | `welcome` | New account |
| Connection request sent | `connection-request` | Request recipient |
| Request accepted | `connection-accepted` | Original requester |
| Request declined | `connection-declined` | Original requester |
| First captured Elite subscription charge | `elite-purchase` | Subscriber |
| Later captured Elite subscription charge | `elite-renewal` | Subscriber |
| Subscription halted or paused | `elite-payment-attention` | Subscriber |
| Subscription cancelled, completed, or expired | `elite-subscription-ended` | Subscriber |

Each template has its own subject and copy, and shares a responsive branded
layout with an HTML and plain-text alternative. Template data is escaped before
being inserted into HTML. Payment notifications are created only from verified
Razorpay webhook processing, not from the browser checkout callback.

## Delivery and operations

Changes that trigger an email write a uniquely keyed record into MongoDB's
`emailoutboxes` collection in the same transaction as the account, request, or
subscription change. This prevents notification-provider downtime from
reversing the user action. The worker claims pending records, uses Resend
idempotency keys, retries failures with exponential backoff, and marks records
failed after eight attempts. Failed records should be monitored and reviewed
before being retried operationally.

The outbox contains recipient addresses and the small amount of event data
needed by a template. Restrict production database access and apply the same
retention and privacy controls used for other account data.

All emails in this module are transactional. Marketing campaigns and recurring
reminders are intentionally out of scope; add consent, preference, and
unsubscribe handling before sending those categories.
