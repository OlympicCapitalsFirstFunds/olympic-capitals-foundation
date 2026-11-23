
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
    const safeCountry = escapeHtml(country);

    let adminEmailSent = false;
    let applicantEmailSent = false;

    try {
      adminEmailSent = await sendEmail(
        env,
        inbox,
        "New grant application: " + reference,
        `<p>New application received.</p>
         <p>Name: ${safeName}</p>
         <p>Email: ${safeEmail}</p>
         <p>Country: ${safeCountry}</p>
         <p>Requested amount: USD ${amount.toLocaleString("en-US")}</p>
         <p>Reference: ${escapeHtml(reference)}</p>`
      );

      // Allow time between messages for personal Gmail sending limits.
      await new Promise(resolve => setTimeout(resolve, 1100));

      applicantEmailSent = await sendEmail(
        env,
        email,
        "Application received",
        `<p>Dear ${safeName},</p>
         <p>Your application has been received.</p>
         <p>Reference: ${escapeHtml(reference)}</p>
         <p>Private tracking code: ${escapeHtml(trackingCode)}</p>
         <p>Please keep these details safe.</p>`
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
