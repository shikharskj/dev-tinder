import { useEffect, useRef, useState } from "react";
import {
  BadgeCheck,
  CalendarDays,
  Check,
  CircleCheck,
  Crown,
  LoaderCircle,
  Minus,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { api } from "../api.js";
import { useAuth } from "../auth.js";
import { USAGE_PLANS } from "../constants";

let razorpayCheckoutPromise;

function loadRazorpayCheckout() {
  if (window.Razorpay) return Promise.resolve();
  if (razorpayCheckoutPromise) return razorpayCheckoutPromise;

  razorpayCheckoutPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => {
      if (window.Razorpay) {
        resolve();
      } else {
        razorpayCheckoutPromise = null;
        reject(new Error("Razorpay checkout could not be initialized."));
      }
    };
    script.onerror = () => {
      razorpayCheckoutPromise = null;
      script.remove();
      reject(new Error("Unable to load secure Razorpay checkout."));
    };
    document.head.appendChild(script);
  });

  return razorpayCheckoutPromise;
}

function formatDate(date) {
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(date));
}

export default function EnrollPremium() {
  const { setUser } = useAuth();
  const [subscription, setSubscription] = useState(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [confirmationPending, setConfirmationPending] = useState(false);
  const [error, setError] = useState("");
  const idempotencyKey = useRef(null);
  const checkoutInstance = useRef(null);

  async function refreshSubscription() {
    setStatusLoading(true);
    try {
      const { data } = await api.get("/payment/subscription");
      setSubscription(data);
      setError("");
      return data;
    } catch (requestError) {
      setError(requestError.message);
      throw requestError;
    } finally {
      setStatusLoading(false);
    }
  }

  useEffect(() => {
    let active = true;

    api
      .get("/payment/subscription")
      .then(({ data }) => {
        if (active) setSubscription(data);
      })
      .catch((requestError) => {
        if (active) setError(requestError.message);
      })
      .finally(() => {
        if (active) setStatusLoading(false);
      });

    return () => {
      active = false;
      checkoutInstance.current?.close();
    };
  }, []);

  useEffect(() => {
    if (!subscription) return;
    if (subscription.creationStatus === "failed") idempotencyKey.current = null;
    setUser((current) =>
      current
        ? {
            ...current,
            usagePlan: subscription.usagePlan,
            eliteSubscriptionExpiresAt: subscription.expiresAt,
          }
        : current,
    );
  }, [subscription, setUser]);

  const currentPlan = subscription?.usagePlan ?? "Basic";
  const checkout = subscription?.checkout;
  const requestPending =
    subscription?.status === "created" ||
    subscription?.status === "authenticated" ||
    subscription?.status === "pending" ||
    subscription?.status === "halted" ||
    subscription?.status === "paused" ||
    (subscription?.status === "active" && currentPlan !== "Elite");

  async function confirmSubscriptionStatus() {
    setConfirmationPending(true);
    for (let attempt = 0; attempt < 8; attempt += 1) {
      try {
        const { data } = await api.get("/payment/subscription");
        setSubscription(data);
        if (data.usagePlan === "Elite") {
          setError("");
          setConfirmationPending(false);
          return;
        }
      } catch (requestError) {
        setError(requestError.message);
      }
      await new Promise((resolve) => window.setTimeout(resolve, 1500));
    }
    setConfirmationPending(false);
    setError(
      "Your checkout was submitted. We’re still waiting for payment confirmation; refresh this page in a moment.",
    );
  }

  async function openRazorpayCheckout(checkoutDetails) {
    if (!checkoutDetails?.keyId || !checkoutDetails?.subscriptionId) {
      throw new Error("Checkout details are unavailable. Please refresh.");
    }

    await loadRazorpayCheckout();
    const razorpay = new window.Razorpay({
      key: checkoutDetails.keyId,
      subscription_id: checkoutDetails.subscriptionId,
      name: "DevTinder",
      description: "Elite · ₹199/month · 12 monthly cycles",
      prefill: checkoutDetails.customer,
      notes: { usagePlan: "Elite" },
      theme: { color: "#c74f38" },
      modal: {
        confirm_close: true,
        ondismiss: () => {
          checkoutInstance.current = null;
          setCheckoutOpen(false);
        },
      },
      handler: async (response) => {
        checkoutInstance.current = null;
        setCheckoutOpen(false);
        try {
          await api.post("/payment/verify-subscription", response);
          await confirmSubscriptionStatus();
        } catch (verificationError) {
          setError(verificationError.message);
        }
      },
    });
    checkoutInstance.current = razorpay;
    setCheckoutOpen(true);
    razorpay.open();
  }

  async function handleEnrollClick() {
    if (submitting) return;

    setError("");
    if (checkout) {
      setSubmitting(true);
      try {
        await openRazorpayCheckout(checkout);
      } catch (checkoutError) {
        setError(checkoutError.message);
      } finally {
        setSubmitting(false);
      }
      return;
    }
    if (requestPending) {
      await refreshSubscription().catch(() => {});
      return;
    }

    idempotencyKey.current ??= window.crypto.randomUUID();
    setSubmitting(true);

    try {
      const { data } = await api.post(
        "/payment/create-subscription",
        { usagePlan: "Elite" },
        { "Idempotency-Key": idempotencyKey.current },
      );

      setSubscription((currentSubscription) => ({
        ...currentSubscription,
        ...data,
        checkout:
          data.status === "created" && data.usagePlan !== "Elite" ? data : null,
      }));
      if (data.status === "created" && data.usagePlan !== "Elite") {
        await openRazorpayCheckout(data);
      } else {
        await refreshSubscription();
      }
    } catch (requestError) {
      if (requestError.status === 502) idempotencyKey.current = null;
      if (requestError.status === 409) {
        // Refresh state; never assume every conflict permits another subscription.
        await refreshSubscription().catch(() => {});
      }
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  }

  useEffect(() => {
    if (!requestPending || checkout || currentPlan === "Elite")
      return undefined;

    const interval = window.setInterval(() => {
      api
        .get("/payment/subscription")
        .then(({ data }) => {
          setSubscription(data);
          if (data.usagePlan === "Elite") setError("");
        })
        .catch((requestError) => setError(requestError.message));
    }, 5000);

    return () => window.clearInterval(interval);
  }, [requestPending, checkout, currentPlan]);

  return (
    <div className="premium-page">
      <section className="premium-hero" aria-labelledby="premium-heading">
        <div className="premium-hero__copy">
          <p className="premium-eyebrow">
            <Sparkles size={15} aria-hidden="true" />
            Find your next great connection
          </p>
          <h1 id="premium-heading">Make every connection count.</h1>
          <p>
            Compare the free community experience with the paid Elite
            subscription. We’ll clearly mark which product benefits are
            available today.
          </p>
        </div>
        <div className="premium-hero__mark" aria-hidden="true">
          <Crown size={34} strokeWidth={1.5} />
          <span>
            Clear
            <br />
            choices
          </span>
        </div>
      </section>

      {error && (
        <div className="premium-message premium-message--error" role="alert">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError("")}
            aria-label="Dismiss payment message"
          >
            Dismiss
          </button>
        </div>
      )}

      {currentPlan === "Elite" && (
        <div className="premium-message premium-message--success" role="status">
          <CircleCheck size={20} aria-hidden="true" />
          <span>
            Elite subscription is active
            {subscription?.expiresAt &&
              ` until ${formatDate(subscription.expiresAt)}`}
          </span>
        </div>
      )}

      <div className="premium-capability-note" role="note">
        Elite is currently a paid subscription tier. Features marked as
        unavailable below are not active in the app yet; review the comparison
        before upgrading.
      </div>

      <section className="premium-plans" aria-labelledby="plans-heading">
        <div className="premium-plans__intro">
          <div>
            <p className="premium-section-label">Simple, transparent plans</p>
            <h2 id="plans-heading">Choose what works for you</h2>
          </div>
          <p>
            {statusLoading
              ? "Checking your subscription…"
              : currentPlan === "Elite"
                ? "Your membership is active."
                : "Every great connection starts somewhere."}
          </p>
        </div>

        <div className="premium-plan-grid">
          {USAGE_PLANS.map((plan) => (
            <article
              className={`premium-plan${currentPlan === plan.name ? " premium-plan--current" : plan.name === "Elite" ? " premium-plan--elite" : ""}`}
              key={plan.name}
              aria-label={`${plan.name} plan`}
            >
              <div className="premium-plan__topline">
                <h3 className="premium-plan__name">
                  {plan.name === "Basic" ? (
                    <span className="premium-plan__icon premium-plan__icon--basic">
                      <Check size={18} aria-hidden="true" />
                    </span>
                  ) : (
                    <span className="premium-plan__icon premium-plan__icon--elite">
                      <Crown size={18} aria-hidden="true" />
                    </span>
                  )}
                  {plan.name}
                </h3>
                {currentPlan === plan.name ? (
                  <span className="premium-plan__badge">Your current plan</span>
                ) : plan.name === "Elite" ? (
                  <span className="premium-plan__badge premium-plan__badge--elite">
                    <Sparkles size={13} aria-hidden="true" />
                    Paid subscription
                  </span>
                ) : (
                  <span className="premium-plan__badge">Free plan</span>
                )}
              </div>

              <p className="premium-plan__description">
                {plan.name === "Elite" && currentPlan === "Elite"
                  ? "Your paid subscription is active. See the feature availability below."
                  : plan.description}
              </p>

              <div className="premium-plan__price">
                <span>{plan.price}</span>
                <span>{plan.billing}</span>
              </div>

              <div className="premium-plan__divider" />

              <p className="premium-plan__features-title">
                Feature availability
              </p>
              <ul className="premium-plan__features">
                {plan.features.map((feature) => (
                  <li key={feature.label}>
                    <span
                      className={`premium-plan__check${feature.included === false ? " premium-plan__check--excluded" : ""}`}
                    >
                      {feature.included === false ? (
                        <Minus size={15} strokeWidth={2.5} aria-hidden="true" />
                      ) : (
                        <Check size={15} strokeWidth={2.5} aria-hidden="true" />
                      )}
                    </span>
                    <span className="premium-plan__feature-copy">
                      <span className="premium-plan__feature-label">
                        {feature.label}
                      </span>
                      <span className="premium-plan__feature-value">
                        {feature.value}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>

              {plan.name === "Elite" && currentPlan !== "Elite" && (
                <div className="premium-billing-summary">
                  <div>
                    <span>Membership term</span>
                    <strong>12 monthly cycles</strong>
                  </div>
                  <div>
                    <span>
                      <CalendarDays size={14} aria-hidden="true" />
                      Next due date
                    </span>
                    <strong>
                      {subscription?.nextBillingAt
                        ? formatDate(subscription.nextBillingAt)
                        : "Shown after subscription authorization"}
                    </strong>
                  </div>
                  <p>
                    The next charge date is set by Razorpay after you authorize
                    the subscription.
                  </p>
                </div>
              )}

              {plan.name === "Basic" || currentPlan === "Elite" ? (
                <div
                  className={`premium-plan__action${currentPlan === plan.name ? " premium-plan__action--current" : ""}`}
                  role="status"
                >
                  {currentPlan === plan.name ? (
                    <>
                      <BadgeCheck size={17} aria-hidden="true" />
                      Current plan: {plan.name}
                    </>
                  ) : (
                    "Included as your fallback plan"
                  )}
                </div>
              ) : requestPending && !checkout ? (
                <div className="premium-plan__pending" role="status">
                  <span>
                    <LoaderCircle
                      size={17}
                      className="animate-spin"
                      aria-hidden="true"
                    />
                    {confirmationPending
                      ? "Confirming your payment…"
                      : ["halted", "paused"].includes(subscription?.status)
                        ? "Your subscription needs attention. Contact support before starting another."
                        : "Checkout is awaiting payment confirmation"}
                  </span>
                  <button
                    type="button"
                    onClick={() => refreshSubscription().catch(() => {})}
                    disabled={statusLoading}
                  >
                    <RefreshCw size={15} aria-hidden="true" />
                    Refresh status
                  </button>
                </div>
              ) : (
                <button
                  className="premium-plan__action premium-plan__action--upgrade"
                  type="button"
                  onClick={handleEnrollClick}
                  disabled={submitting || statusLoading || checkoutOpen}
                  aria-busy={submitting}
                >
                  {submitting ? (
                    <>
                      <LoaderCircle
                        size={17}
                        className="animate-spin"
                        aria-hidden="true"
                      />
                      Creating checkout…
                    </>
                  ) : checkout ? (
                    <>
                      <Crown size={17} aria-hidden="true" />
                      Continue Elite checkout
                    </>
                  ) : (
                    <>
                      <Crown size={17} aria-hidden="true" />
                      Upgrade to Elite
                    </>
                  )}
                </button>
              )}
            </article>
          ))}
        </div>

        <p className="premium-footnote">
          Elite costs ₹199 per month for 12 monthly billing cycles. After the
          final cycle, your plan returns to Basic automatically. The feature
          list above reflects what is currently implemented; features marked
          unavailable are not part of the active app experience yet.
        </p>
        <p className="premium-security-note">
          <ShieldCheck size={16} aria-hidden="true" />
          Payments are securely processed by Razorpay. The first renewal date
          appears after subscription authorization.
        </p>
      </section>
    </div>
  );
}
