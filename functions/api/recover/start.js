
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

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function verificationCode() {
  const values = crypto.getRandomValues(new Uint32Array(1));
  return String(100000 + (values[0] % 900000));
}

export async function onRequestPost({ request, env }) {
  if (!env.DB || !env.RESEND_API_KEY || !env.MAIL_FROM) {
    return json({
      error: "Recovery service is temporarily unavailable."
    }, 503);
  }

  let data;

  try {
    data = await request.json();
  } catch {
    return json({ error: "Invalid request." }, 400);
  }

  const reference = String(data.reference || "").trim();
  const email = String(data.email || "").trim().toLowerCase();

  if (!reference || !email || !email.includes("@")) {
    return json({
      error: "Enter your application reference and email."
    }, 400);
  }

  try {
    const application = await env.DB.prepare(`
      SELECT full_name, email
      FROM applications
      WHERE reference_number = ?
      AND LOWER(email) = ?
    `).bind(reference, email).first();

    const response = {
      ok: true,
      message: "If your details match an application, a verification code will be sent to its registered email."
    };

    if (!application) {
      return json(response);
    }

    const now = Math.floor(Date.now() / 1000);
    const windowStart = now - 900;

    await env.DB.prepare(`
      INSERT INTO tracking_recovery_limits (
        reference_number,
        window_started_at,
        request_count
      )
      VALUES (?, ?, 1)
      ON CONFLICT(reference_number) DO UPDATE SET
        request_count = CASE
          WHEN window_started_at <= ? THEN 1
          ELSE request_count + 1
        END,
        window_started_at = CASE
          WHEN window_started_at <= ? THEN excluded.window_started_at
          ELSE window_started_at
        END
    `).bind(reference, now, windowStart, windowStart).run();

    const limit = await env.DB.prepare(`
      SELECT request_count
      FROM tracking_recovery_limits
      WHERE reference_number = ?
    `).bind(reference).first();

    if (Number(limit?.request_count || 0) > 3) {
      return json(response);
    }

    const code = verificationCode();
    const codeHash = await hash(reference + ":" + code);
    const expiresAt = now + 600;

    await env.DB.prepare(`
      DELETE FROM tracking_recovery
      WHERE reference_number = ?
    `).bind(reference).run();

    await env.DB.prepare(`
      INSERT INTO tracking_recovery (
        reference_number,
        verification_hash,
        expires_at
      ) VALUES (?, ?, ?)
    `).bind(reference, codeHash, expiresAt).run();

    const html = `
      <p>Dear ${escapeHtml(application.full_name)},</p>
      <p>You requested to recover your application tracking code.</p>
      <p>Your verification code is:</p>
      <h2>${code}</h2>
      <p>This code expires in 10 minutes.</p>
      <p>If you did not request this, please ignore this email.</p>
    `;

    const mail = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: \`Bearer \${env.RESEND_API_KEY}\`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: env.MAIL_FROM,
        to: application.email,
        subject: "Tracking Code Recovery Verification",
        html
      })
    });

    if (!mail.ok) {
      await env.DB.prepare(`
        DELETE FROM tracking_recovery
        WHERE reference_number = ?
      `).bind(reference).run();

      return json({
        error: "Unable to send the verification email. Please try again later."
      }, 503);
    }

    return json(response);

  } catch {
    return json({
      error: "Unable to process your recovery request."
    }, 500);
  }
}
