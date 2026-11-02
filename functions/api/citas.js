import { json, requireAuth } from "./_utils.js";

export async function onRequestGet(context) {
  const { request, env } = context;
  try {
    requireAuth(request, env);
    const url = new URL(request.url);
    const desde = url.searchParams.get("desde");
    const hasta = url.searchParams.get("hasta");

    let query = "SELECT * FROM citas";
    let params = [];

    if (desde && hasta) {
      query += " WHERE fecha >= ? AND fecha <= ?";
      params = [desde, hasta];
    }
    query += " ORDER BY fecha ASC, hora ASC";

    const { results } = await env.DB.prepare(query).bind(...params).all();
    return json(results);
  } catch (e) {
    return json({ error: "No autorizado" }, 401);
  }
}