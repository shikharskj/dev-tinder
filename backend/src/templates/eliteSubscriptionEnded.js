import { renderLayout } from "./layout.js";

export default function eliteSubscriptionEnded({
  recipientName,
  status,
  effectiveDate,
}) {
  return {
    subject: "Your DevTinder Elite subscription has ended",
    preheader: "Your subscription status changed and your plan is now Basic.",
    ...renderLayout({
      eyebrow: "SUBSCRIPTION ENDED",
      title: "Your plan is now Basic",
      intro: `Hi ${recipientName}, your Elite subscription is ${status}.`,
      paragraphs: [
        "Your account has returned to the Basic plan. You can continue using the community and review available plans at any time.",
      ],
      details: effectiveDate
        ? [{ label: "Status effective", value: effectiveDate }]
        : [],
      ctaLabel: "Review plans",
      ctaPath: "/enroll-premium",
    }),
  };
}
