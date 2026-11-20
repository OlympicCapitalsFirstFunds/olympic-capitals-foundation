
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

export async function onRequestPost({ request, env }) {
  if (!env.DB) {
    return json({ error: "Tracking service is unavailable." }, 503);
  }

  let data;

  try {
    data = await request.json();
  } catch {
    return json({ error: "Invalid request." }, 400);
  }

  const reference = String(data.reference || "").trim();
  const trackingCode = String(data.trackingCode || "").trim();

  if (!reference || !trackingCode) {
    return json({
      error: "Enter your application reference and tracking code."
    }, 400);
  }

  try {
    const result = await env.DB.prepare(`
      SELECT reference_number, tracking_code_hash, status, updated_at
      FROM applications
      WHERE reference_number = ?
    `).bind(reference).first();

    if (
      !result ||
      await hash(trackingCode) !== result.tracking_code_hash
    ) {
      return json({
        error: "Application not found. Check your reference and tracking code."
      }, 404);
    }

    const messages = {
      "Submitted": "Your application has been received.",
      "Under review": "Your application is being reviewed.",
      "Additional information required": "Please check your email for further instructions.",
      "Approved": "Your application has been approved. Please check your email.",
      "Declined": "A decision has been made. Please check your email."
    };

    return json({
      reference: result.reference_number,
      status: result.status,
      updatedAt: result.updated_at,
      message: messages[result.status] || "Your application status has been updated."
    });

  } catch {
    return json({ error: "Unable to retrieve your application status." }, 500);
  }
}
