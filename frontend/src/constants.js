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
        value: "In-app messaging is not available yet",
        included: false,
      },
      {
        label: "Message history",
        value: "In-app messaging is not available yet",
        included: false,
      },
      {
        label: "Read receipts",
        value: "In-app messaging is not available yet",
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
        value: "In-app messaging is not available yet",
        included: false,
      },
      {
        label: "Message history",
        value: "In-app messaging is not available yet",
        included: false,
      },
      {
        label: "Read receipts",
        value: "In-app messaging is not available yet",
        included: false,
      },
      {
        label: "Profile badge",
        value: "Distinctive Elite badge on your profile and discovery card",
      },
    ],
    current: false,
  },
];
