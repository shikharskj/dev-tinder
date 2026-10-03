// import { SendEmailCommand } from "@aws-sdk/client-ses";
// import { sesClient } from "./sesClient.js";

// const run = async ({ toAddress, senderName }) => {
//   const fromAddress = process.env.SES_FROM_EMAIL;
//   const appUrl = process.env.APP_URL;

//   if (!fromAddress || !appUrl || !toAddress) {
//     throw new Error("Missing email sender, recipient, or application URL");
//   }

//   const name = String(senderName || "Someone")
//     .replace(/[\r\n]+/g, " ")
//     .slice(0, 100);

//   const command = new SendEmailCommand({
//     Source: `Dev Tinder <${fromAddress}>`,
//     Destination: {
//       ToAddresses: [toAddress],
//     },
//     Message: {
//       Subject: {
//         Charset: "UTF-8",
//         Data: "You have a new connection request on Dev Tinder",
//       },
//       Body: {
//         Text: {
//           Charset: "UTF-8",
//           Data: [
//             `You have received a new connection request from ${name}.`,
//             "",
//             "Sign in to review your connection requests:",
//             appUrl,
//           ].join("\n"),
//         },
//       },
//     },
//   });

//   return sesClient.send(command);
// };

// export { run };


import { SendEmailCommand } from "@aws-sdk/client-ses";
import { sesClient } from "./sesClient.js";

const escapeHtml = (value) =>
  String(value).replace(/[&<>"']/g, (character) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };

    return entities[character];
  });

const cleanName = (value, fallback) =>
  String(value || "")
    .replace(/[\r\n\t]+/g, " ")
    .trim()
    .slice(0, 100) || fallback;

const run = async ({
  toAddress,
  senderName,
  recipientName,
} = {}) => {
  const fromAddress = process.env.SES_FROM_EMAIL;
  const appUrl = process.env.APP_URL;

  if (!fromAddress || !appUrl || !toAddress) {
    throw new Error(
      "Missing email sender, recipient, or application URL",
    );
  }

  const baseUrl = new URL(appUrl);

  if (
    baseUrl.protocol !== "https:" ||
    baseUrl.username ||
    baseUrl.password
  ) {
    throw new Error("APP_URL must be an HTTPS URL without credentials");
  }

  const requestsUrl = new URL("/requests", baseUrl).href;

  const sender = cleanName(senderName, "Someone");
  const recipient = cleanName(recipientName, "there");

  const initials = sender
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => Array.from(part)[0])
    .join("")
    .toUpperCase();

  const safeSender = escapeHtml(sender);
  const safeRecipient = escapeHtml(recipient);
  const safeInitials = escapeHtml(initials);
  const safeRequestsUrl = escapeHtml(requestsUrl);
  const year = new Date().getFullYear();

  const subject = "A new connection is waiting on DevTinder";
  const preheader = `${sender} wants to connect with you. Review their request on DevTinder.`;

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="x-apple-disable-message-reformatting">
  <title>New connection request</title>
  <style>
    body, table, td, a {
      -webkit-text-size-adjust: 100%;
      -ms-text-size-adjust: 100%;
    }
    table, td {
      mso-table-lspace: 0pt;
      mso-table-rspace: 0pt;
    }
    table { border-collapse: collapse; }
    a { text-decoration: none; }
    @media screen and (max-width: 600px) {
      .outer { padding: 20px 12px !important; }
      .content { padding: 28px 24px !important; }
      .headline { font-size: 30px !important; line-height: 36px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;width:100%;background-color:#f5f6f2;font-family:'Avenir Next','Trebuchet MS',Arial,sans-serif;color:#182521;">

  <div style="display:none;font-size:1px;line-height:1px;color:#f5f6f2;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">
    ${escapeHtml(preheader)}
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#f5f6f2">
    <tr>
      <td class="outer" align="center" style="padding:40px 16px;">

        <!--[if mso]>
        <table role="presentation" width="600" align="center"><tr><td>
        <![endif]-->

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
          style="width:100%;max-width:600px;">

          <tr>
            <td style="padding:0 0 24px;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td width="40" height="40" align="center" bgcolor="#c74f38"
                    style="width:40px;height:40px;border-radius:10px;color:#ffffff;font-family:Consolas,monospace;font-size:20px;font-weight:bold;">
                    &lt;/&gt;
                  </td>
                  <td style="padding-left:12px;color:#182521;font-size:22px;font-weight:bold;letter-spacing:-0.5px;">
                    DevTinder
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
                bgcolor="#ffffff" style="border:1px solid #e2e6df;">

                <tr>
                  <td class="content" bgcolor="#1a2925" style="padding:36px 40px;">
                    <p style="margin:0 0 16px;color:#d9e96d;font-size:11px;line-height:18px;font-weight:bold;letter-spacing:2px;">
                      YOUR DEVELOPER COMMUNITY
                    </p>
                    <h1 class="headline" style="margin:0;color:#ffffff;font-size:36px;line-height:42px;font-weight:bold;letter-spacing:-1px;">
                      Good people.<br>A new connection.
                    </h1>
                    <p style="margin:16px 0 0;color:#dbe4df;font-size:15px;line-height:24px;">
                      Your next collaboration could start here.
                    </p>
                  </td>
                </tr>

                <tr>
                  <td class="content" style="padding:36px 40px;">
                    <p style="margin:0 0 12px;color:#182521;font-size:16px;line-height:26px;overflow-wrap:anywhere;">
                      Hi ${safeRecipient},
                    </p>
                    <p style="margin:0 0 24px;color:#52615b;font-size:16px;line-height:26px;">
                      Someone new wants to be part of your developer network.
                    </p>

                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
                      bgcolor="#f5f6f2" style="border:1px solid #e2e6df;">
                      <tr>
                        <td width="56" valign="top" style="padding:20px 0 20px 20px;">
                          <table role="presentation" width="56" cellpadding="0" cellspacing="0">
                            <tr>
                              <td width="56" height="56" align="center" bgcolor="#d9e96d"
                                style="width:56px;height:56px;border-radius:28px;color:#26320c;font-size:20px;font-weight:bold;">
                                ${safeInitials}
                              </td>
                            </tr>
                          </table>
                        </td>
                        <td valign="middle" style="padding:20px 20px 20px 16px;word-break:break-word;overflow-wrap:anywhere;">
                          <p style="margin:0 0 5px;color:#182521;font-size:18px;line-height:25px;font-weight:bold;">
                            ${safeSender}
                          </p>
                          <p style="margin:0;color:#52615b;font-size:14px;line-height:22px;">
                            Sent you a connection request
                          </p>
                        </td>
                      </tr>
                    </table>

                    <p style="margin:24px 0;color:#52615b;font-size:16px;line-height:26px;">
                      Take a look at their profile, explore their interests,
                      and decide if you would like to connect.
                    </p>

                    <table role="presentation" cellpadding="0" cellspacing="0">
                      <tr>
                        <td align="center" bgcolor="#c74f38" style="border-radius:6px;">
                          <a href="${safeRequestsUrl}"
                            style="display:inline-block;border:1px solid #c74f38;border-radius:6px;padding:15px 24px;mso-padding-alt:0;color:#ffffff;font-size:15px;line-height:20px;font-weight:bold;text-decoration:none;">
                            <!--[if mso]><i style="mso-font-width:150%;mso-text-raise:22pt;" hidden>&emsp;</i><![endif]-->
                            <span style="mso-text-raise:11pt;">Review connection request</span>
                            <!--[if mso]><i style="mso-font-width:150%;" hidden>&emsp;&#8203;</i><![endif]-->
                          </a>
                        </td>
                      </tr>
                    </table>

                    <p style="margin:16px 0 0;color:#64716b;font-size:12px;line-height:20px;">
                      Sign in to DevTinder to review and respond.
                    </p>

                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
                      style="margin-top:28px;">
                      <tr>
                        <td style="border-top:1px solid #e2e6df;padding-top:22px;">
                          <p style="margin:0;color:#42746a;font-size:14px;line-height:22px;font-weight:bold;">
                            Good work starts with good people.
                          </p>
                          <p style="margin:5px 0 0;color:#64716b;font-size:13px;line-height:21px;">
                            A community for people who build.
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td align="center" style="padding:24px 12px 0;">
              <p style="margin:0;color:#64716b;font-size:12px;line-height:20px;">
                You received this email because a developer sent you<br>
                a connection request on DevTinder.
              </p>
              <p style="margin:12px 0 0;color:#64716b;font-size:12px;line-height:20px;">
                Button not working? Open this link:
              </p>
              <p style="margin:4px 0 0;font-size:12px;line-height:20px;word-break:break-all;">
                <a href="${safeRequestsUrl}" style="color:#42746a;text-decoration:underline;">
                  ${safeRequestsUrl}
                </a>
              </p>
              <p style="margin:18px 0 0;color:#64716b;font-size:11px;line-height:18px;">
                &copy; ${year} DevTinder
              </p>
            </td>
          </tr>

        </table>

        <!--[if mso]>
        </td></tr></table>
        <![endif]-->

      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = [
    "DevTinder",
    "A community for people who build.",
    "",
    `Hi ${recipient},`,
    "",
    `${sender} has sent you a connection request on DevTinder.`,
    "",
    "Take a look at their profile and decide if you would like to connect.",
    "",
    `Review connection request: ${requestsUrl}`,
    "",
    "Sign in to review and respond.",
    "",
    "Good work starts with good people.",
    "",
    "You received this email because a developer sent you a connection request on DevTinder.",
  ].join("\n");

  return sesClient.send(
    new SendEmailCommand({
      Source: `DevTinder <${fromAddress}>`,
      Destination: {
        ToAddresses: [toAddress],
      },
      Message: {
        Subject: {
          Charset: "UTF-8",
          Data: subject,
        },
        Body: {
          Html: {
            Charset: "UTF-8",
            Data: html,
          },
          Text: {
            Charset: "UTF-8",
            Data: text,
          },
        },
      },
    }),
  );
};

export { run };