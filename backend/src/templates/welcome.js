import { renderLayout } from "./layout.js";

export default function welcome({ recipientName }) {
  return {
    subject: "Welcome to DevTinder",
    preheader: "Your next great collaboration starts with a strong introduction.",
    ...renderLayout({
      title: `Welcome, ${recipientName}`,
      intro: "You’re now part of a community built around people who build.",
      paragraphs: [
        "Add your skills, interests, and a short introduction so other developers can discover what you would like to create.",
        "When you find someone interesting, send a connection request. You’ll be connected when they accept.",
      ],
      ctaLabel: "Complete your profile",
      ctaPath: "/profile",
    }),
  };
}
