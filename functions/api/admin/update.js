
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
    return json({ error: "Invalid reference or application status." }, 400);
  }

  try {
    const application = await env.DB.prepare(`
      SELECT full_name, email
      FROM applications
      WHERE reference_number = ?
    `).bind(reference).first();

    if (!application) {
      return json({ error: "Application not found." }, 404);
    }

    await env.DB.prepare(`
      UPDATE applications
      SET status = ?, admin_notes = ?, updated_at = CURRENT_TIMESTAMP
      WHERE reference_number = ?
    `).bind(status, note, reference).run();

    let emailSent = false;

    if (env.RESEND_API_KEY && env.MAIL_FROM) {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.RESEND_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          from: env.MAIL_FROM,
          to: application.email,
          subject: "Update on your foundation application",
          html: `
            <p>Dear ${escapeHtml(application.full_name)},</p>
            <p>Your application reference is <strong>${escapeHtml(reference)}</strong>.</p>
            <p>Current status: <strong>${escapeHtml(status)}</strong></p>
            ${note ? `<p>Message: ${escapeHtml(note)}</p>` : ""}
            <p>Thank you.</p>
          `
        })
      });

      emailSent = response.ok;
    }

    return json({
      ok: true,
      message: "Application status updated.",
      emailSent
    });

  } catch {
    return json({ error: "Unable to update application status." }, 500);
  }
}
