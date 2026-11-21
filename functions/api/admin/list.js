
function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store"
    }
  });
}

export async function onRequestGet({ request, env }) {
  const token = env.ADMIN_TOKEN;
  const auth = request.headers.get("Authorization");

  if (!token || auth !== `Bearer ${token}`) {
    return json({ error: "Unauthorized access." }, 401);
  }

  if (!env.DB) {
    return json({ error: "Database unavailable." }, 503);
  }

  try {
    const result = await env.DB.prepare(`
      SELECT
        id,
        reference_number,
        full_name,
        email,
        phone,
        country,
        grant_amount,
        application_details,
        status,
        admin_notes,
        created_at,
        updated_at
      FROM applications
      ORDER BY created_at DESC
    `).all();

    return json({ applications: result.results || [] });
  } catch {
    return json({ error: "Unable to retrieve applications." }, 500);
  }
}
