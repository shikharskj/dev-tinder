import { renderLayout } from "./layout.js";

export default function connectionRequest({ recipientName, senderName }) {
  return {
    subject: `${senderName} wants to connect on DevTinder`,
    preheader: `${senderName} sent you a developer connection request.`,
    ...renderLayout({
      eyebrow: "A NEW CONNECTION",
      title: "Someone wants to connect",
      intro: `Hi ${recipientName}, ${senderName} would like to connect with you.`,
      paragraphs: [
        "Take a look at their profile and decide if you would like to connect. Accepting the request adds you to each other’s Connections list.",
      ],
      ctaLabel: "Review request",
      ctaPath: "/requests",
    }),
  };
}
