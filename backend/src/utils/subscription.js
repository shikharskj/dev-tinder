import { fromUnixTime, isAfter, isValid } from "date-fns";

export function toUnixDate(timestamp) {
  if (!Number.isSafeInteger(timestamp) || timestamp <= 0) return null;
  const date = fromUnixTime(timestamp);
  return isValid(date) ? date : null;
}

export function hasPaidAccess(granted, expiresAt, now = new Date()) {
  return Boolean(granted && expiresAt && isAfter(new Date(expiresAt), now));
}

export function effectiveUsagePlan(user) {
  return hasPaidAccess(
    user.usagePlan === "Elite",
    user.eliteSubscriptionExpiresAt,
  )
    ? "Elite"
    : "Basic";
}

// Only resolves events whose timestamps tie. Newer events can recover pending/halted.
// More restrictive states win ties; this is an application policy, not provider ordering.
const TIE_PRIORITY = [
  "created",
  "authenticated",
  "active",
  "pending",
  "halted",
  "paused",
  "completed",
  "expired",
  "cancelled",
];

const ENDED = new Set(["cancelled", "completed", "expired"]);

export function resolveEventStatus(payment, incoming, eventDate) {
  const previousDate = payment.lastProviderEventAt;

  if (previousDate && eventDate < previousDate) {
    return null;
  }
  if (ENDED.has(payment.subscriptionStatus) && !ENDED.has(incoming)) {
    return null; // A delayed charge must not resurrect an ended subscription.
  }
  if (previousDate && +eventDate === +previousDate) {
    return TIE_PRIORITY.indexOf(incoming) >
      TIE_PRIORITY.indexOf(payment.subscriptionStatus)
      ? incoming
      : payment.subscriptionStatus;
  }
  return incoming;
}
