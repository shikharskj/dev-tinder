export const API_BASE_URL =
  location.hostname === "localhost" ? "http://localhost:7777" : "/api";

export const USAGE_PLANS = [
  {
    name: "Basic",
    description: "Explore developers and send connection requests for free.",
    price: "Free",
    billing: "forever",
    features: [
      {
        label: "Connection requests",
        value: "Up to 20 connection requests each day",
      },
      { label: "Discovery placement", value: "Standard feed ordering" },
      {
        label: "Messaging",
        value: "Message people after you become accepted connections",
        included: true,
      },
      {
        label: "Message history",
        value: "Access the most recent 7 days of chat history",
        included: true,
      },
      {
        label: "Read receipts",
        value: "Read receipts are an Elite feature",
        included: false,
      },
      {
        label: "Profile badge",
        value: "Standard profile",
        included: false,
      },
    ],
    current: true,
  },
  {
    name: "Elite",
    description: "A paid subscription tier with a clear, fixed billing term.",
    price: "₹199",
    billing: "per month",
    features: [
      {
        label: "Connection requests",
        value: "Unlimited connection requests",
      },
      {
        label: "Discovery placement",
        value: "Elite profiles are prioritized in Discover",
      },
      {
        label: "Messaging",
        value: "Message people after you become accepted connections",
        included: true,
      },
      {
        label: "Message history",
        value: "Unlimited message history",
        included: true,
      },
      {
        label: "Read receipts",
        value: "See when your messages are read when the other member shares receipts",
        included: true,
      },
      {
        label: "Profile badge",
        value: "Distinctive Elite badge on your profile and discovery card",
      },
    ],
    current: false,
  },
];
