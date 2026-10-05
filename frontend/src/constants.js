export const USAGE_PLANS = [
  {
    name: "Basic",
    description: "A great place to start making meaningful connections.",
    price: "Free",
    billing: "forever",
    features: [
      {
        label: "Likes & requests",
        value: "Up to 20 connection requests per day",
      },
      { label: "Discovery placement", value: "Standard visibility" },
      { label: "Start messaging", value: "After mutual interest" },
      { label: "Message history", value: "Messages from the last 30 days" },
      { label: "Read receipts", value: "Not included", included: false },
      { label: "Profile badge", value: "No featured badge", included: false },
    ],
    current: true,
  },
  {
    name: "Elite",
    description: "More ways to get noticed and keep the conversation going.",
    price: "₹200",
    billing: "per month",
    features: [
      {
        label: "Likes & requests",
        value: "Unlimited likes and connection requests",
      },
      { label: "Discovery placement", value: "Priority in the discovery feed" },
      { label: "Start messaging", value: "After mutual interest" },
      { label: "Message history", value: "Unlimited message history" },
      { label: "Read receipts", value: "See when your messages are read" },
      { label: "Profile badge", value: "Featured Elite badge" },
    ],
    current: false,
  },
];
