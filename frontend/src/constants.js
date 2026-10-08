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
    title: "1. Who we are",
    content: `DevTinder is a community platform for developers to discover other developers, build connections, and communicate.

DevTinder is operated by Shikhar Jaiswal. In this policy, “we”, “us”, and “our” refer to the operator of DevTinder, and “you” refers to a visitor or registered user.

For privacy questions or requests, email support@dev-tinder-community.in.`,
  },
  {
    title: "2. Information you provide",
    content: `Account information: When you register, we collect your first name, last name, email address, password, age, gender, and location. Passwords are stored as hashes rather than readable text.

Profile information: You may add a profile photo, biography, skills, and interests. We use these details to display your profile and help other developers discover you.

Connections and conversations: We store connection requests and their status, messages, shared photos and videos, reactions, and information about message delivery and read status.

Preferences and reports: We store settings such as read receipts, activity sharing, muted or archived conversations, blocked users, and reports you submit.

Subscriptions: If you use paid features, we process subscription and payment-related records, including payment identifiers, subscription status, and access expiry information.`,
  },
  {
    title: "3. Technical information",
    content: `When you use DevTinder, our servers and infrastructure providers may process technical information such as your IP address, browser information, request timestamps, requested pages, and error or security logs.

This information supports website delivery, troubleshooting, reliability, and protection against misuse.

Your activity can also generate information used by chat features, including whether you are connected, your last-active time, and typing events.`,
  },
  {
    title: "4. How we use information",
    content: `We use account information to register you, authenticate your session, and maintain your account.

We use profile and connection information to help you discover developers and manage connection requests.

We use messages and uploaded media to deliver conversations and support features such as replies, reactions, and message history.

We use subscription and payment records to enable paid features and reconcile payment updates.

We use email addresses to deliver service-related communications when those notifications are enabled.

We use preferences, reports, and technical information to apply your settings, investigate reported problems, and maintain the service.`,
  },
  {
    title: "5. What other users can see",
    content: `Your profile information, such as your name, photo, biography, skills, interests, age, gender, and location, may be visible to other users through discovery, connections, and profile features.

Messages and media you send are made available to the participants in that conversation. Recipients may save, copy, or take screenshots of content you share.

Chat features may show typing indicators, delivery information, read receipts, online status, and last-active information. Available read-receipt and activity-sharing settings let you control the corresponding features.

Avoid adding information to your profile or messages that you do not want other users to receive.`,
  },
  {
    title: "6. Service providers",
    content: `DevTinder uses external services to operate the application.

Amazon Web Services supports application hosting and the configured email-delivery integration. Cloudflare supports website delivery and network protection.

Cloudinary processes photos and videos uploaded through the chat media-sharing feature.

Razorpay processes payments and subscriptions. Payment details entered into Razorpay checkout are handled by Razorpay, and DevTinder receives information needed to track payments and subscription access.

Account and application records are stored in our configured database infrastructure.

Third-party services process information involved in providing their services. Their own privacy policies also describe their handling of that information.`,
  },
  {
    title: "7. Cookies and externally hosted content",
    content: `DevTinder uses an authentication cookie to maintain your signed-in session. Blocking or removing this cookie may prevent authenticated features from working or require you to sign in again.

Payment and infrastructure providers may use cookies or similar technologies in connection with their services.

Some images, including profile images supplied as external URLs, are loaded from third-party websites. Loading those images can disclose technical information, such as your IP address and browser information, to the image host.`,
  },
  {
    title: "8. Storage and security",
    content: `DevTinder uses HTTPS for the public website, password hashing, and authentication checks to help protect access to accounts and application features.

Chat messages are processed and stored by the service. DevTinder does not provide end-to-end encrypted messaging.

Information may be processed in locations used by our hosting and service providers, which may be outside your country.

No internet service can guarantee complete security. Protect your account credentials and contact us if you suspect unauthorized access.`,
  },
  {
    title: "9. Retention and deletion",
    content: `Account, profile, conversation, and subscription records are stored to support the service. Different categories of information may need different retention periods.

A limit on the message history visible under your subscription does not necessarily mean that older messages have been deleted from storage.

Deleting a message for yourself, archiving a conversation, blocking another user, and signing out do not delete your account.

You can request account or personal-data deletion by emailing support@dev-tinder-community.in. We may need to verify that the request relates to your account before acting on it.

Some records may need to be retained for payment reconciliation, dispute handling, security, or applicable legal obligations. Deletion cannot remove copies that other users have independently saved.`,
  },
  {
    title: "10. Your choices and requests",
    content: `You can update supported profile fields and adjust available chat settings within the app.

You can use conversation controls to mute, archive, block, or report, as supported by the relevant feature.

To request access to, correction of, or deletion of personal information, or to raise a privacy concern, email support@dev-tinder-community.in. You may also contact us about withdrawing consent where processing depends on it.

Include enough information to identify your account and explain your request. Do not send your password, authentication codes, or full payment credentials.

Requests will be considered under applicable law. Some requests may affect our ability to provide your account or particular features.`,
  },
  {
    title: "11. Age eligibility",
    content: `DevTinder is intended for adults aged 18 and over.

If you believe a person under 18 has registered or supplied personal information through the service, contact support@dev-tinder-community.in so that the situation can be investigated.`,
  },
  {
    title: "12. Changes to this policy",
    content: `We may update this policy as the application and its data practices change. The latest version will be published on this page with an updated date.

Where required, we will provide additional notice or obtain consent for relevant changes.`,
  },
];
