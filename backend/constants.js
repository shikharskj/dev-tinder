export const SIGNUP_FIELDS = [
  "firstName",
  "lastName",
  "email",
  "password",
  "age",
  "gender",
  "location",
  "photoUrl",
  "bio",
  "interests",
  "skills",
];

export const UPDATE_FIELDS = [
  "password",
  "age",
  "gender",
  "location",
  "photoUrl",
  "bio",
  "interests",
  "skills",
];

// Includes recoverable states: block a second billable subscription.
export const ACTIVE_SUBSCRIPTION_STATUSES = [
  "created",
  "authenticated",
  "active",
  "pending",
  "halted",
  "paused",
];

// Matches UUIDs accepted as idempotency keys for subscription creation.
export const IDEMPOTENCY_KEY_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Matches the 64-character hexadecimal HMAC signature sent by Razorpay.
export const WEBHOOK_SIGNATURE_PATTERN = /^[0-9a-f]{64}$/i;

// Matches non-empty strings containing only decimal digits.
export const DIGITS_ONLY_PATTERN = /^\d+$/;

// Basic email shape check used by the user and payment schemas.
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Reserved domains used in examples and tests cannot receive real email.
export const PLACEHOLDER_EMAIL_DOMAINS = [
  "example.com",
  "example.net",
  "example.org",
  "invalid",
  "localhost",
  "test",
];

// Allows HTTP(S) URLs without whitespace.
export const HTTP_URL_PATTERN = /^https?:\/\/\S+$/i;

// Identifies bcrypt password hashes so save hooks do not hash them again.
export const BCRYPT_HASH_PATTERN = /^\$2[aby]\$\d{2}\$/;

// Matches HTML-sensitive characters that must be escaped in email templates.
export const HTML_ESCAPE_PATTERN = /[&<>"']/g;

// Matches line breaks and tabs so user names stay on one line in email.
export const NAME_CONTROL_CHARACTERS_PATTERN = /[\r\n\t]+/g;

// Splits a name into parts using one or more whitespace characters.
export const WHITESPACE_PATTERN = /\s+/;
