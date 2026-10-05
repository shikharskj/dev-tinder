import { BadgeCheck, Check, Crown, Minus, Sparkles } from "lucide-react";
import { USAGE_PLANS } from "../constants";

export default function EnrollPremium() {

  const handleEnrollClick = () => {
    
  };

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
            Start with the essentials, or go Elite to get seen sooner and make
            more of every conversation.
          </p>
        </div>
        <div className="premium-hero__mark" aria-hidden="true">
          <Crown size={34} strokeWidth={1.5} />
          <span>
            More room
            <br />
            to connect
          </span>
        </div>
      </section>

      <section className="premium-plans" aria-labelledby="plans-heading">
        <div className="premium-plans__intro">
          <div>
            <p className="premium-section-label">Simple, transparent plans</p>
            <h2 id="plans-heading">Choose what works for you</h2>
          </div>
          <p>Every great connection starts somewhere.</p>
        </div>

        <div className="premium-plan-grid">
          {USAGE_PLANS.map((plan) => (
            <article
              className={`premium-plan${plan.current ? " premium-plan--current" : " premium-plan--elite"}`}
              key={plan.name}
              aria-label={`${plan.name} plan`}
            >
              <div className="premium-plan__topline">
                <h3 className="premium-plan__name">
                  {plan.current ? (
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
                {plan.current ? (
                  <span className="premium-plan__badge">Your current plan</span>
                ) : (
                  <span className="premium-plan__badge premium-plan__badge--elite">
                    <Sparkles size={13} aria-hidden="true" />
                    More visibility
                  </span>
                )}
              </div>

              <p className="premium-plan__description">{plan.description}</p>

              <div className="premium-plan__price">
                <span>{plan.price}</span>
                <span>{plan.billing}</span>
              </div>

              <div className="premium-plan__divider" />

              <p className="premium-plan__features-title">What’s included</p>
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

              <div
                className={`premium-plan__action${plan.current ? " premium-plan__action--current" : ""}`}
                role="status"
              >
                {plan.current ? (
                  <>
                    <BadgeCheck size={17} aria-hidden="true" />
                    Current plan: Basic
                  </>
                ) : (
                  <>
                    <Crown size={17} aria-hidden="true" />
                    Elite checkout is coming soon
                  </>
                )}
              </div>
            </article>
          ))}
        </div>

        <p className="premium-footnote">
          You can keep using DevTinder on Basic for free. Elite is an optional
          upgrade. The Elite badge highlights your plan; it does not indicate
          identity verification.
        </p>
      </section>
    </div>
  );
}
