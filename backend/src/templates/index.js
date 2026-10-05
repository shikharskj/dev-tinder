import connectionAccepted from "./connectionAccepted.js";
import connectionDeclined from "./connectionDeclined.js";
import connectionRequest from "./connectionRequest.js";
import elitePaymentAttention from "./elitePaymentAttention.js";
import elitePurchase from "./elitePurchase.js";
import eliteRenewal from "./eliteRenewal.js";
import eliteSubscriptionEnded from "./eliteSubscriptionEnded.js";
import welcome from "./welcome.js";

const templates = Object.freeze({
  welcome,
  "connection-request": connectionRequest,
  "connection-accepted": connectionAccepted,
  "connection-declined": connectionDeclined,
  "elite-purchase": elitePurchase,
  "elite-renewal": eliteRenewal,
  "elite-payment-attention": elitePaymentAttention,
  "elite-subscription-ended": eliteSubscriptionEnded,
});

export function renderEmail(templateName, data) {
  const render = templates[templateName];
  if (!render) throw new Error(`Unknown email template: ${templateName}`);

  const email = render(data);
  return {
    ...email,
    subject: email.subject.replaceAll("\r", " ").replaceAll("\n", " ").trim(),
  };
}
