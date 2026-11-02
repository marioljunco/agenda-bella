import { json, requireAuth } from "./_utils.js";

export async function onRequestGet(context) {
  const { env } = context;
  const { results } = await env.DB.prepare("SELECT clave, valor FROM config").all();
  
  const config = {};
  results.forEach(row => { config[row.clave] = row.valor; });
  
  return json(config);
}

export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    requireAuth(request, env);
    const body = await request.json();
    
    for (const [clave, valor] of Object.entries(body)) {
      await env.DB.prepare("UPDATE config SET valor = ? WHERE clave = ?")
        .bind(String(valor), clave).run();
    }
    
    return json({ ok: true });
  } catch (e) {
    return json({ error: "No autorizado" }, 401);
  }
}