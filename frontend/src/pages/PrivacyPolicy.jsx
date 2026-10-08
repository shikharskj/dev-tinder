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
        Last updated: [Add publication date]
      </p>

      <p className="mt-6 leading-7">
        This policy explains how DevTinder collects, uses, and shares personal
        information when you use the service.
      </p>

      <div className="mt-8 space-y-8">
        {PRIVACY_POLICY_SECTIONS.map(({ title, content }) => (
          <section key={title}>
            <h2 className="text-xl font-semibold">{title}</h2>
            <p className="mt-3 whitespace-pre-line leading-7 text-base-content/80">
              {content}
            </p>
          </section>
        ))}
      </div>
    </article>
  );
}
