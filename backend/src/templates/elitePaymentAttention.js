import { renderLayout } from "./layout.js";

export default function elitePaymentAttention({ recipientName, status }) {
  return {
    subject: "Action may be needed for your DevTinder subscription",
    preheader: "Your Elite subscription needs attention.",
    ...renderLayout({
      eyebrow: "SUBSCRIPTION UPDATE",
      title: "Your subscription needs attention",
      intro: `Hi ${recipientName}, Razorpay reported that your Elite subscription is ${status}.`,
      paragraphs: [
        "Your Elite access may be unavailable while this status remains unresolved. Review the subscription details or contact support if you believe this is a mistake.",
      ],
      ctaLabel: "Review subscription",
      ctaPath: "/enroll-premium",
    }),
  };
}
