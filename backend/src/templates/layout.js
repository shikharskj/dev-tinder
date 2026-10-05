import { HTML_ESCAPE_PATTERN } from "../../constants.js";

export function escapeHtml(value) {
  return String(value ?? "").replace(HTML_ESCAPE_PATTERN, (character) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };

    return entities[character];
  });
}

export function applicationUrl(path) {
  const configuredUrl = process.env.APP_URL;

  if (!configuredUrl) throw new Error("APP_URL is required for email links.");

  const baseUrl = new URL(configuredUrl);
  if (
    baseUrl.protocol !== "https:" ||
    baseUrl.username ||
    baseUrl.password
  ) {
    throw new Error("APP_URL must be an HTTPS URL without credentials.");
  }

  return new URL(path, baseUrl).href;
}

export function renderLayout({
  preheader,
  eyebrow = "YOUR DEVELOPER COMMUNITY",
  title,
  intro,
  paragraphs = [],
  details = [],
  ctaLabel,
  ctaPath,
  footer = "Good work starts with good people.",
}) {
  const ctaUrl = applicationUrl(ctaPath);
  const safePreheader = escapeHtml(preheader);
  const safeTitle = escapeHtml(title);
  const safeEyebrow = escapeHtml(eyebrow);
  const safeIntro = escapeHtml(intro);
  const safeFooter = escapeHtml(footer);
  const safeCtaLabel = escapeHtml(ctaLabel);
  const safeCtaUrl = escapeHtml(ctaUrl);
  const year = new Date().getFullYear();
  const detailsHtml = details.length
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;border:1px solid #e2e6df;background:#f5f6f2;">${details
        .map(
          ({ label, value }) =>
            `<tr><td style="padding:12px 16px;color:#52615b;font-size:14px;line-height:20px;">${escapeHtml(label)}</td><td align="right" style="padding:12px 16px;color:#182521;font-size:14px;line-height:20px;font-weight:bold;">${escapeHtml(value)}</td></tr>`,
        )
        .join("")}</table>`
    : "";
  const paragraphsHtml = paragraphs
    .map(
      (paragraph) =>
        `<p style="margin:0 0 16px;color:#52615b;font-size:16px;line-height:26px;">${escapeHtml(paragraph)}</p>`,
    )
    .join("");
  const text = [
    title,
    "",
    intro,
    ...paragraphs,
    ...(details.length
      ? ["", ...details.map(({ label, value }) => `${label}: ${value}`)]
      : []),
    "",
    `${ctaLabel}: ${ctaUrl}`,
    "",
    footer,
    "",
    `© ${year} DevTinder`,
  ].join("\n");

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="x-apple-disable-message-reformatting">
  <title>${safeTitle}</title>
  <style>
    body, table, td, a { -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%; }
    table, td { mso-table-lspace:0pt; mso-table-rspace:0pt; }
    table { border-collapse:collapse; }
    a { text-decoration:none; }
    @media screen and (max-width:600px) {
      .outer { padding:20px 12px !important; }
      .content { padding:28px 24px !important; }
      .headline { font-size:30px !important; line-height:36px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;width:100%;background-color:#f5f6f2;font-family:'Avenir Next','Trebuchet MS',Arial,sans-serif;color:#182521;">
  <div style="display:none;font-size:1px;line-height:1px;color:#f5f6f2;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">${safePreheader}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#f5f6f2">
    <tr><td class="outer" align="center" style="padding:40px 16px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;">
        <tr><td style="padding:0 0 24px;">
          <table role="presentation" cellpadding="0" cellspacing="0"><tr>
            <td width="40" height="40" align="center" bgcolor="#c74f38" style="width:40px;height:40px;border-radius:10px;color:#ffffff;font-family:Consolas,monospace;font-size:20px;font-weight:bold;">&lt;/&gt;</td>
            <td style="padding-left:12px;color:#182521;font-size:22px;font-weight:bold;letter-spacing:-0.5px;">DevTinder</td>
          </tr></table>
        </td></tr>
        <tr><td>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#ffffff" style="border:1px solid #e2e6df;">
            <tr><td class="content" bgcolor="#1a2925" style="padding:36px 40px;">
              <p style="margin:0 0 16px;color:#d9e96d;font-size:11px;line-height:18px;font-weight:bold;letter-spacing:2px;">${safeEyebrow}</p>
              <h1 class="headline" style="margin:0;color:#ffffff;font-size:36px;line-height:42px;font-weight:bold;letter-spacing:-1px;">${safeTitle}</h1>
              <p style="margin:16px 0 0;color:#dbe4df;font-size:15px;line-height:24px;">${safeIntro}</p>
            </td></tr>
            <tr><td class="content" style="padding:36px 40px;">
              ${paragraphsHtml}
              ${detailsHtml}
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:24px;"><tr>
                <td align="center" bgcolor="#c74f38" style="border-radius:6px;">
                  <a href="${safeCtaUrl}" style="display:inline-block;border:1px solid #c74f38;border-radius:6px;padding:15px 24px;color:#ffffff;font-size:15px;line-height:20px;font-weight:bold;">${safeCtaLabel}</a>
                </td>
              </tr></table>
              <p style="margin:28px 0 0;border-top:1px solid #e2e6df;padding-top:20px;color:#42746a;font-size:14px;line-height:22px;font-weight:bold;">${safeFooter}</p>
            </td></tr>
          </table>
        </td></tr>
        <tr><td align="center" style="padding:24px 12px 0;">
          <p style="margin:0;color:#64716b;font-size:12px;line-height:20px;">You received this email because of activity on your DevTinder account.</p>
          <p style="margin:12px 0 0;color:#64716b;font-size:11px;line-height:18px;">© ${year} DevTinder</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  return { html, text, ctaUrl };
}
