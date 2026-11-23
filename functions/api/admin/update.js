
const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store"
    }
  });

function escapeHtml(value) {
  return String(value || "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

const LOGO_URL =
  "https://olympic-capitals-foundation.pages.dev/foundation-logo.jpg";

const WEBSITE_URL =
  "https://olympic-capitals-foundation.pages.dev";

function emailTemplate({ preheader, title, greeting, intro, content, note }) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <title>${escapeHtml(title)}</title>
</head>

<body style="margin:0;padding:0;background-color:#f1f4f8;font-family:Arial,Helvetica,sans-serif;color:#263449;">

  <div style="display:none;font-size:1px;color:#f1f4f8;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">
    ${escapeHtml(preheader)}
  </div>

  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"
    style="background-color:#f1f4f8;padding:30px 12px;">
    <tr>
      <td align="center">

        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"
          style="max-width:640px;background-color:#ffffff;border-radius:12px;overflow:hidden;">

          <tr>
            <td style="height:5px;background-color:#c69b45;font-size:0;line-height:0;">
              &nbsp;
            </td>
          </tr>

          <tr>
            <td align="center" style="padding:30px 24px 24px;background-color:#ffffff;">

              <img
                src="${LOGO_URL}"
                width="105"
                alt="Olympic Capitals First Funds Foundation logo"
                style="display:block;width:105px;max-width:100%;height:auto;margin:0 auto 16px;border:0;"
              >

              <div style="font-size:19px;line-height:27px;font-weight:bold;color:#10284b;">
                OLYMPIC CAPITALS FIRST FUNDS FOUNDATION
              </div>

              <div style="font-size:12px;letter-spacing:2px;color:#b58a35;margin-top:7px;">
                TOGETHER FOR A BETTER TOMORROW
              </div>

            </td>
          </tr>

          <tr>
            <td style="height:1px;background-color:#e5d3aa;font-size:0;line-height:0;">
              &nbsp;
            </td>
          </tr>

          <tr>
            <td
              background="${LOGO_URL}"
              style="
                padding:35px 30px;
                background-color:#ffffff;
                background-image:url('${LOGO_URL}');
                background-repeat:no-repeat;
                background-position:center;
                background-size:190px auto;
              ">

              <div style="font-size:22px;line-height:30px;font-weight:bold;color:#10284b;margin-bottom:22px;">
                ${escapeHtml(title)}
              </div>

              <div style="font-size:15px;line-height:25px;color:#263449;">
                ${greeting}
                <p style="margin:15px 0 20px;">${intro}</p>
                ${content}
              </div>

              <div style="margin-top:25px;padding-top:18px;border-top:1px solid #e8edf3;font-size:13px;line-height:22px;color:#64748b;">
                ${note}
              </div>

            </td>
          </tr>

          <tr>
            <td align="center"
              style="padding:25px 20px;background-color:#10284b;color:#ffffff;">

              <div style="font-size:14px;font-weight:bold;letter-spacing:0.5px;">
                OLYMPIC CAPITALS FIRST FUNDS FOUNDATION
              </div>

              <div style="font-size:12px;color:#e6c77e;margin-top:9px;">
                Together for a Better Tomorrow
              </div>

              <div style="font-size:12px;line-height:21px;margin-top:15px;color:#dce5f1;">
                <a href="${WEBSITE_URL}" style="color:#e6c77e;text-decoration:none;">
                  Visit Our Official Website
                </a>
              </div>

              <div style="font-size:10px;line-height:17px;color:#b9c7d8;margin-top:17px;">
                This is an official communication from Olympic Capitals First Funds Foundation.
                <br>
                Please do not share confidential application information.
              </div>

            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</body>
</html>`;
}

async function sendEmail(env, to, subject, html) {
  if (!env.SENDLIBERTY_API_KEY || !to) {
    return false;
  }

  const response = await fetch(
    "https://sendliberty.com/api/send",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.SENDLIBERTY_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: "Olympic Capitals First Funds Foundation <olympiccapitalsfirstfunds@gmail.com>",
        to,
        subject,
        html
      })
    }
  );

  return response.ok;
}

const STATUS_MESSAGES = {
  "Submitted": {
    title: "Application Received",
    subject: "Application received",
    intro: "Your application has been successfully received by Olympic Capitals First Funds Foundation. Thank you for submitting your application.",
    message: "Your application has been recorded and is awaiting the next stage of the foundation's assessment process."
  },

  "Under review": {
    title: "Application Under Review",
    subject: "Application under review",
    intro: "We would like to inform you that your application is currently under review by Olympic Capitals First Funds Foundation.",
    message: "Our team is assessing the information submitted. Please keep your application reference number for future correspondence."
  },

  "Additional information required": {
    title: "Additional Information Required",
    subject: "Additional information required",
    intro: "Our review team requires additional information concerning your application.",
    message: "Please read the message from the administration below and follow any instructions provided. Your application may require further review after the requested information is received."
  },

  "Approved": {
    title: "Application Approved",
    subject: "Application approved",
    intro: "We are pleased to inform you that your application has been approved by Olympic Capitals First Funds Foundation.",
    message: "Congratulations. Your application has been approved following the foundation's assessment process. Please follow any further official instructions communicated to you by the foundation. Approval does not mean funds have already been disbursed."
  },

  "Declined": {
    title: "Application Decision",
    subject: "Application decision",
    intro: "Thank you for applying to Olympic Capitals First Funds Foundation. Following the review process, we regret to inform you that your application has not been approved.",
    message: "We appreciate the time and effort you invested in your application. You may contact the foundation through its official website if you require clarification about this decision."
  }
};

export async function onRequestPost({ request, env }) {
  const token = env.ADMIN_TOKEN;
  const auth = request.headers.get("Authorization");

  if (!token || auth !== `Bearer ${token}`) {
    return json({ error: "Unauthorized access." }, 401);
  }

  if (!env.DB) {
    return json({ error: "Database unavailable." }, 503);
  }

  let data;

  try {
    data = await request.json();
  } catch {
    return json({ error: "Invalid request data." }, 400);
  }

  const reference = String(data.reference || "").trim();
  const status = String(data.status || "").trim();
  const note = String(data.note || "").trim();

  const allowedStatuses = [
    "Submitted",
    "Under review",
    "Additional information required",
    "Approved",
    "Declined"
  ];

  if (!reference || !allowedStatuses.includes(status)) {
    return json({
      error: "Invalid reference or application status."
    }, 400);
  }

  try {
    const application = await env.DB.prepare(`
      SELECT full_name, email, status
      FROM applications
      WHERE reference_number = ?
    `).bind(reference).first();

    if (!application) {
      return json({ error: "Application not found." }, 404);
    }

    const statusChanged = application.status !== status;

    await env.DB.prepare(`
      UPDATE applications
      SET status = ?, admin_notes = ?, updated_at = CURRENT_TIMESTAMP
      WHERE reference_number = ?
    `).bind(status, note, reference).run();

    if (!statusChanged) {
      return json({
        ok: true,
        message: "Application details saved. The status was unchanged, so no duplicate notification was sent.",
        emailSent: false,
        emailSkipped: true
      });
    }

    const message = STATUS_MESSAGES[status];

    const safeName = escapeHtml(application.full_name);
    const safeReference = escapeHtml(reference);
    const safeNote = escapeHtml(note);

    const content = `
      <div style="padding:18px;background-color:#f4f7fb;border-left:4px solid #c69b45;margin:20px 0;">

        <div style="font-size:13px;color:#64748b;">
          APPLICATION REFERENCE
        </div>

        <div style="font-size:20px;font-weight:bold;letter-spacing:1px;color:#10284b;margin-top:7px;">
          ${safeReference}
        </div>

        <div style="font-size:14px;font-weight:bold;color:#10284b;margin-top:15px;">
          CURRENT STATUS: ${escapeHtml(status.toUpperCase())}
        </div>

      </div>

      <p>${message.message}</p>

      ${
        note
          ? `
            <div style="padding:20px;background-color:#f4f7fb;border:1px solid #e1e8f0;border-radius:6px;margin:20px 0;">

              <div style="font-size:13px;color:#64748b;font-weight:bold;margin-bottom:10px;">
                MESSAGE FROM THE ADMINISTRATION
              </div>

              <p style="margin:0;white-space:pre-line;">${safeNote}</p>

            </div>
          `
          : ""
      }

      <p>
        Please retain this email for your records and use your application reference number in future correspondence.
      </p>

      <p>
        Thank you for your interest in Olympic Capitals First Funds Foundation.
      </p>
    `;

    const html = emailTemplate({
      preheader: message.intro,
      title: message.title,
      greeting: `Dear ${safeName},`,
      intro: message.intro,
      content,
      note: "This notification was generated following an update to your application. Please visit our official website for further information."
    });

    let emailSent = false;

    try {
      emailSent = await sendEmail(
        env,
        application.email,
        `${message.subject} - ${reference}`,
        html
      );
    } catch (emailError) {
      console.error("Status notification failed:", emailError);
      emailSent = false;
    }

    return json({
      ok: true,
      message: "Application status updated.",
      emailSent
    });

  } catch (error) {
    console.error("Application update failed:", error);

    return json({
      error: "Unable to update application status."
    }, 500);
  }
}
