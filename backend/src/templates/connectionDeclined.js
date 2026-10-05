import { renderLayout } from "./layout.js";

export default function connectionDeclined({ recipientName }) {
  return {
    subject: "An update on your DevTinder request",
    preheader: "Your connection request has been reviewed.",
    ...renderLayout({
      eyebrow: "REQUEST UPDATE",
      title: "Your request was reviewed",
      intro: `Hi ${recipientName}, your connection request was declined.`,
      paragraphs: [
        "We know reaching out takes a little courage. Keep discovering developers and finding people whose interests align with yours.",
      ],
      ctaLabel: "Discover developers",
      ctaPath: "/feed",
    }),
  };
}
