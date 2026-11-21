
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

    if (
      env.EMAIL_SERVICE_URL &&
      env.EMAIL_SERVICE_SECRET &&
      application.email
    ) {
      try {
        const emailStatus = {
          "Submitted": "Submitted",
          "Under review": "Under Review",
          "Additional information required":
            "Additional Information Required",
          "Approved": "Approved",
          "Declined": "Declined"
        }[status];

        const response = await fetch(env.EMAIL_SERVICE_URL, {
          method: "POST",
          redirect: "follow",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            secret: env.EMAIL_SERVICE_SECRET,
            email: application.email,
            name: application.full_name,
            reference: reference,
            status: emailStatus
          })
        });

        const responseText = await response.text();

        if (response.ok) {
          try {
            const result = JSON.parse(responseText);
            emailSent = result.success === true;
          } catch {
            emailSent = false;
          }
        }
      } catch (emailError) {
        console.error("Email notification failed:", emailError);
      }
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
