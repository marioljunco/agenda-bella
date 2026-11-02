import { json, requireAuth } from "./_utils.js";

export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    requireAuth(request, env);
    const { id, estado } = await request.json();
    
    await env.DB.prepare("UPDATE citas SET estado = ? WHERE id = ?")
      .bind(estado, id).run();
      
    return json({ ok: true });
  } catch (e) {
    return json({ error: "No autorizado" }, 401);
  }
}