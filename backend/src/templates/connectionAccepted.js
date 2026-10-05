import { renderLayout } from "./layout.js";

export default function connectionAccepted({ recipientName, senderName }) {
  return {
    subject: "Your connection request was accepted",
    preheader: `${senderName} accepted your connection request.`,
    ...renderLayout({
      eyebrow: "YOU’RE CONNECTED",
      title: "A new connection, confirmed",
      intro: `Hi ${recipientName}, ${senderName} accepted your request.`,
      paragraphs: [
        "You can now find each other in Connections. In-app messaging is not available yet, but your connection is ready for the next step.",
      ],
      ctaLabel: "View connections",
      ctaPath: "/connections",
    }),
  };
}
