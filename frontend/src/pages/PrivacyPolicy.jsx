import { PRIVACY_POLICY_SECTIONS } from "../constants";

export default function PrivacyPolicy() {
  return (
    <article
      className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6"
      aria-labelledby="privacy-title"
    >
      <h1 id="privacy-title" className="text-3xl font-bold">
        Privacy Policy
      </h1>

      <p className="mt-2 text-sm text-base-content/60">
        Last updated: <time dateTime="2026-10-08">8 October 2026</time>
      </p>

      <p className="mt-6 leading-7 text-base-content/80">
        Your privacy matters. This policy explains what information DevTinder
        processes, why we use it, who receives it, and the choices available to
        you.
      </p>

      <div className="mt-8 space-y-8">
        {PRIVACY_POLICY_SECTIONS.map(({ title, content }) => (
          <section key={title}>
            <h2 className="text-xl font-semibold">{title}</h2>

            <div className="mt-3 space-y-3 text-base-content/80">
              {content.split("\n\n").map((paragraph, index) => (
                <p key={index} className="leading-7">
                  {paragraph}
                </p>
              ))}
            </div>
          </section>
        ))}
      </div>

      <section className="mt-10 rounded-2xl border border-base-300 bg-base-200/50 p-6">
        <h2 className="text-lg font-semibold">Privacy questions?</h2>

        <p className="mt-2 leading-7 text-base-content/80">
          Contact Shikhar Jaiswal at{" "}
          <a
            href="mailto:support@dev-tinder-community.in"
            className="link link-primary break-all"
          >
            support@dev-tinder-community.in
          </a>
          .
        </p>
      </section>
    </article>
  );
}
