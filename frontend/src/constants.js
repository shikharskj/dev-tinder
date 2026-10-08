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
        value:
          "See when your messages are read when the other member shares receipts",
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

export const PRIVACY_POLICY_SECTIONS = [
  {
    title: "Who operates DevTinder",
    content: "[Add the operator’s name and a working privacy contact email.]",
  },
  {
    title: "Information we collect",
    content:
      "[Describe account details, profile information, messages, uploaded media, payment records, and technical data actually collected.]",
  },
  {
    title: "How we use information",
    content:
      "[Explain how information supports accounts, matching, chat, subscriptions, notifications, and security.]",
  },
  {
    title: "Information visible to other users",
    content:
      "[Explain who can see profiles, messages, online status, and other shared information.]",
  },
  {
    title: "Service providers and sharing",
    content:
      "[Describe the hosting, database, payment, email, storage, and analytics providers actually used, and what they receive.]",
  },
  {
    title: "Cookies and browser storage",
    content:
      "[Describe authentication cookies and any other cookies or browser storage used.]",
  },
  {
    title: "Retention and deletion",
    content:
      "[Explain how long data is retained and how users can request account or data deletion, including any retained records.]",
  },
  {
    title: "Your choices and contacting us",
    content:
      "[Explain available privacy settings and how users can request access, corrections, or deletion.]",
  },
  {
    title: "Changes to this policy",
    content: "[Explain how policy updates will be communicated.]",
  },
];
