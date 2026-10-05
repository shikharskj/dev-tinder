import { renderLayout } from "./layout.js";

export default function elitePurchase({
  recipientName,
  amount,
  currency,
  billingCycles,
  expiresAt,
}) {
  return {
    subject: "Your DevTinder Elite subscription is active",
    preheader: "Your payment was confirmed and your Elite subscription is active.",
    ...renderLayout({
      eyebrow: "PAYMENT CONFIRMED",
      title: "Welcome to Elite",
      intro: `Hi ${recipientName}, your first Elite subscription payment has been confirmed.`,
      paragraphs: [
        "Your Elite access is active. Your subscription is billed for a fixed number of monthly cycles and then returns to Basic automatically.",
      ],
      details: [
        { label: "Amount paid", value: `${currency} ${amount}` },
        { label: "Billing term", value: `${billingCycles} monthly cycles` },
        ...(expiresAt ? [{ label: "Current term ends", value: expiresAt }] : []),
      ],
      ctaLabel: "View subscription",
      ctaPath: "/enroll-premium",
    }),
  };
}
