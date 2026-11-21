
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
  const code = String(data.code || "").trim();

  if (!reference || !email || !code) {
    return json({
      error: "Enter your reference, email and verification code."
    }, 400);
  }

  if (!/^\d{6}$/.test(code)) {
    return json({
      error: "Enter the six-digit verification code."
    }, 400);
  }

  try {
    const application = await env.DB.prepare(`
      SELECT full_name, email, tracking_code_hash
      FROM applications
      WHERE reference_number = ?
      AND LOWER(email) = ?
    `).bind(reference, email).first();

    if (!application) {
      return json({
        error: "Invalid or expired verification request."
      }, 400);
    }

    const recovery = await env.DB.prepare(`
      SELECT id, verification_hash, expires_at, attempts
      FROM tracking_recovery
      WHERE reference_number = ?
    `).bind(reference).first();

    if (!recovery) {
      return json({
        error: "No active recovery request. Please start again."
      }, 400);
    }

    if (
      Number(recovery.expires_at) < Math.floor(Date.now() / 1000) ||
      Number(recovery.attempts) >= 5
    ) {
      await env.DB.prepare(`
        DELETE FROM tracking_recovery
        WHERE id = ?
      `).bind(recovery.id).run();

      return json({
        error: "Verification code expired. Please start again."
      }, 400);
    }

    await env.DB.prepare(`
      UPDATE tracking_recovery
      SET attempts = attempts + 1
      WHERE id = ?
    `).bind(recovery.id).run();

    const submittedHash = await hash(reference + ":" + code);

    if (submittedHash !== recovery.verification_hash) {
      return json({
        error: "Incorrect verification code."
      }, 400);
    }

    const newTrackingCode = token();
    const newTrackingHash = await hash(newTrackingCode);
    const oldTrackingHash = application.tracking_code_hash;

    // SAVE THE NEW TRACKING CODE BEFORE SENDING THE EMAIL
    const updated = await env.DB.prepare(`
      UPDATE applications
      SET tracking_code_hash = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE reference_number = ?
      AND LOWER(email) = ?
      AND tracking_code_hash = ?
    `).bind(
      newTrackingHash,
      reference,
      email,
      oldTrackingHash
    ).run();

    if (!updated.meta || updated.meta.changes !== 1) {
      return json({
        error: "Unable to update your tracking code. Please start recovery again."
      }, 500);
    }

    // SEND THE NEW TRACKING CODE
    let mail;

    try {
      mail = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.RESEND_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          from: env.MAIL_FROM,
          to: application.email,
          subject: "Your New Foundation Tracking Code",
          html: `
            <p>Dear ${escapeHtml(application.full_name)},</p>
            <p>Your tracking code recovery was successful.</p>
            <p>Your new private tracking code is:</p>
            <h2>${newTrackingCode}</h2>
            <p>Application reference: ${escapeHtml(reference)}</p>
            <p>Please keep this code safe.</p>
          `
        })
      });
    } catch {
      mail = null;
    }

    // RESTORE THE PREVIOUS CODE IF EMAIL DELIVERY IS REJECTED
    if (!mail || !mail.ok) {
      const restored = await env.DB.prepare(`
        UPDATE applications
        SET tracking_code_hash = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE reference_number = ?
        AND tracking_code_hash = ?
      `).bind(
        oldTrackingHash,
        reference,
        newTrackingHash
      ).run();

      if (!restored.meta || restored.meta.changes !== 1) {
        return json({
          error: "Email delivery failed and the previous tracking code could not be restored. Please contact support."
        }, 500);
      }

      return json({
        error: "Unable to send your new tracking code. Your previous tracking code has been restored. Please try again."
      }, 503);
    }

    // REMOVE THE USED RECOVERY REQUEST
    await env.DB.prepare(`
      DELETE FROM tracking_recovery
      WHERE id = ?
    `).bind(recovery.id).run();

    return json({
      ok: true,
      message: "A new tracking code has been sent to your registered email address."
    });

  } catch {
    return json({
      error: "Unable to complete tracking code recovery."
    }, 500);
  }
}
