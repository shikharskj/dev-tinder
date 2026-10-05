import { renderLayout } from "./layout.js";

export default function eliteRenewal({
  recipientName,
  amount,
  currency,
  nextBillingAt,
}) {
  return {
    subject: "Your DevTinder Elite subscription renewed",
    preheader: "Your latest Elite subscription payment was confirmed.",
    ...renderLayout({
      eyebrow: "RENEWAL CONFIRMED",
      title: "Your Elite plan continues",
      intro: `Hi ${recipientName}, your latest recurring Elite payment was confirmed.`,
      paragraphs: [
        "Your subscription access remains active. Keep this email for your payment records.",
      ],
      details: [
        { label: "Amount paid", value: `${currency} ${amount}` },
        ...(nextBillingAt
          ? [{ label: "Next scheduled charge", value: nextBillingAt }]
          : []),
      ],
      ctaLabel: "View subscription",
      ctaPath: "/enroll-premium",
    }),
  };
}
