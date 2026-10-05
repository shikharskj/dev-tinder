export const USAGE_PLANS = [
  {
    name: "Basic",
    description: "Explore developers and send connection requests for free.",
    price: "Free",
    billing: "forever",
    features: [
      {
        label: "Connection requests",
        value: "No daily cap is currently enforced",
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
        value: "Plan badges are not shown yet",
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
        value: "An Elite-specific allowance is not active yet",
        included: false,
      },
      {
        label: "Discovery placement",
        value: "Priority placement is not active yet",
        included: false,
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
        value: "Elite badges are not shown yet",
        included: false,
      },
    ],
    current: false,
  },
];
