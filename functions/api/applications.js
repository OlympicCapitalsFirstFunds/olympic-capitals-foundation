
const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store"
    }
  });

async function hash(value) {
  const result = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value)
  );

  return [...new Uint8Array(result)]
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

function token(bytes = 8) {
  const data = crypto.getRandomValues(new Uint8Array(bytes));
  return [...data]
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({
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

          <!-- GOLD TOP BORDER -->
          <tr>
            <td style="height:5px;background-color:#c69b45;font-size:0;line-height:0;">
              &nbsp;
            </td>
          </tr>

          <!-- BRAND HEADER -->
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

          <!-- GOLD DIVIDER -->
          <tr>
            <td style="height:1px;background-color:#e5d3aa;font-size:0;line-height:0;">
              &nbsp;
            </td>
          </tr>

          <!-- EMAIL BODY -->
          <tr>
            <td
              background="https://olympic-capitals-foundation.pages.dev/foundation-logo.jpg"
              style="
                padding:35px 30px;
                background-color:#ffffff;
                background-image:url('https://olympic-capitals-foundation.pages.dev/foundation-logo.jpg');
                background-repeat:no-repeat;
                background-position:center;
                background-size:190px auto;
              ">

              <div style="font-size:22px;line-height:30px;font-weight:bold;color:#10284b;margin-bottom:22px;">
                ${title}
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

          <!-- FOOTER -->
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
  if (!env.SENDLIBERTY_API_KEY) {
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

export async function onRequestPost({ request, env }) {
  let d;

  try {
    d = await request.json();
  } catch {
    return json({ error: "Invalid application data." }, 400);
  }

  if (!env.DB) {
    return json({
      error: "Application database is unavailable."
    }, 503);
  }

  const name = String(d.fullName || "").trim();
  const email = String(d.email || "").trim().toLowerCase();
  const phone = String(d.phone || "").trim();
  const country = String(d.country || "").trim();
  const pillar = String(d.pillar || "").trim();
  const applicantType = String(d.applicantType || "").trim();
  const projectTitle = String(d.projectTitle || "").trim();
  const description = String(d.description || "").trim();
  const amount = Number(d.requestedAmount);

  const pillars = [
    "Business Empowerment",
    "Community Support",
    "Education",
    "Healthcare"
  ];

  if (
    !name || !email.includes("@") || !phone || !country ||
    !pillars.includes(pillar) || !applicantType ||
    !projectTitle || description.length < 40 ||
    !Number.isFinite(amount) ||
    amount < 10000 || amount > 1000000 ||
    !d.consent
  ) {
    return json({
      error: "Please complete all required fields correctly."
    }, 400);
  }

  const reference =
    "OCFF-" + new Date().getFullYear() + "-" +
    token(3).toUpperCase();

  const trackingCode = token();
  const trackingHash = await hash(trackingCode);

  const details = JSON.stringify({
    pillar,
    applicantType,
    projectTitle,
    description
  });

  try {
    await env.DB.prepare(`
      INSERT INTO applications (
        reference_number,
        tracking_code_hash,
        full_name,
        email,
        phone,
        country,
        grant_amount,
        application_details,
        status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      reference,
      trackingHash,
      name,
      email,
      phone,
      country,
      amount,
      details,
      "Submitted"
    ).run();

    const inbox =
      env.APPLICATION_EMAIL ||
      "olympiccapitalsfirstfunds@gmail.com";

    const safeName = escapeHtml(name);
    const safeEmail = escapeHtml(email);
    const safePhone = escapeHtml(phone);
    const safeCountry = escapeHtml(country);
    const safePillar = escapeHtml(pillar);
    const safeApplicantType = escapeHtml(applicantType);
    const safeProjectTitle = escapeHtml(projectTitle);
    const safeDescription = escapeHtml(description);
    const safeReference = escapeHtml(reference);
    const safeTrackingCode = escapeHtml(trackingCode);
    const formattedAmount = amount.toLocaleString("en-US");

    const adminContent = `
      <p style="margin:0 0 16px;">
        A new grant application has been submitted through the foundation website.
      </p>

      <table role="presentation" width="100%" cellspacing="0" cellpadding="10"
        style="border-collapse:collapse;background-color:#f5f7fa;font-size:14px;line-height:22px;">

        <tr>
          <td style="font-weight:bold;color:#10284b;width:38%;">Applicant</td>
          <td>${safeName}</td>
        </tr>

        <tr>
          <td style="font-weight:bold;color:#10284b;">Email</td>
          <td>${safeEmail}</td>
        </tr>

        <tr>
          <td style="font-weight:bold;color:#10284b;">Phone</td>
          <td>${safePhone}</td>
        </tr>

        <tr>
          <td style="font-weight:bold;color:#10284b;">Country</td>
          <td>${safeCountry}</td>
        </tr>

        <tr>
          <td style="font-weight:bold;color:#10284b;">Funding area</td>
          <td>${safePillar}</td>
        </tr>

        <tr>
          <td style="font-weight:bold;color:#10284b;">Applicant type</td>
          <td>${safeApplicantType}</td>
        </tr>

        <tr>
          <td style="font-weight:bold;color:#10284b;">Project</td>
          <td>${safeProjectTitle}</td>
        </tr>

        <tr>
          <td style="font-weight:bold;color:#10284b;">Requested amount</td>
          <td>USD ${formattedAmount}</td>
        </tr>

        <tr>
          <td style="font-weight:bold;color:#10284b;">Reference</td>
          <td>${safeReference}</td>
        </tr>
      </table>

      <div style="margin-top:20px;">
        <strong style="color:#10284b;">Project description</strong>
        <p style="white-space:pre-line;">${safeDescription}</p>
      </div>
    `;

    const applicantContent = `
      <div style="padding:18px;background-color:#f4f7fb;border-left:4px solid #c69b45;margin:20px 0;">
        <div style="font-size:13px;color:#64748b;">APPLICATION REFERENCE</div>
        <div style="font-size:20px;font-weight:bold;letter-spacing:1px;color:#10284b;margin-top:7px;">
          ${safeReference}
        </div>
      </div>

      <p>
        Your application has been successfully received by Olympic Capitals First Funds Foundation.
        Thank you for taking the time to submit your application.
      </p>

      <p>
        Your application will be subject to the foundation's review and assessment process.
        Submission does not guarantee approval or funding.
      </p>

      <div style="padding:20px;background-color:#f4f7fb;border:1px solid #e1e8f0;border-radius:6px;margin:20px 0;">
        <div style="font-size:13px;color:#64748b;font-weight:bold;">
          YOUR PRIVATE APPLICATION TRACKING CODE
        </div>

        <div style="font-size:19px;font-weight:bold;letter-spacing:2px;color:#10284b;margin-top:10px;">
          ${safeTrackingCode}
        </div>

        <p style="font-size:12px;color:#64748b;margin-bottom:0;">
          Keep this code confidential. You will need it together with your reference number to check your application status.
        </p>
      </div>

      <p>
        Please retain this email for your records. We recommend keeping your reference number and tracking code in a safe place.
      </p>

      <p>
        Thank you for your interest in the foundation's work.
      </p>
    `;

    const adminEmail = emailTemplate({
      preheader: "A new foundation grant application has been received.",
      title: "New Grant Application",
      greeting: "Foundation Administration Team,",
      intro: "A new application has been received and recorded in the application database.",
      content: adminContent,
      note: "Please review the application through the authorized administration process."
    });

    const applicantEmail = emailTemplate({
      preheader: "Your application has been received successfully.",
      title: "Application Received",
      greeting: `Dear ${safeName},`,
      intro: "Thank you for submitting your application to Olympic Capitals First Funds Foundation.",
      content: applicantContent,
      note: "For your security, do not share your private tracking code with anyone."
    });

    let adminEmailSent = false;
    let applicantEmailSent = false;

    try {
      adminEmailSent = await sendEmail(
        env,
        inbox,
        "New grant application: " + reference,
        adminEmail
      );

      // Allow time between messages for personal Gmail sending limits.
      await new Promise(resolve => setTimeout(resolve, 1100));

      applicantEmailSent = await sendEmail(
        env,
        email,
        "Application received - " + reference,
        applicantEmail
      );

    } catch {
      // The application remains saved even if an email fails.
    }

    return json({
      ok: true,
      reference,
      trackingCode,
      adminEmailSent,
      applicantEmailSent
    });

  } catch {
    return json({
      error: "Unable to save your application. Please try again."
    }, 500);
  }
}
