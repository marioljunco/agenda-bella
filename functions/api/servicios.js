import { json, requireAuth } from "./_utils.js";

export async function onRequestGet(context) {
  const { env } = context;
  const { results } = await env.DB.prepare(
    "SELECT id, nombre, duracion, precio FROM servicios WHERE activo = 1 ORDER BY nombre"
  ).all();
  return json(results);
}

export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    requireAuth(request, env);
    const body = await request.json();
    const id = body.id || crypto.randomUUID();
    const creado = new Date().toISOString();

    if (body.id) {
      await env.DB.prepare(
        "UPDATE servicios SET nombre = ?, duracion = ?, precio = ?, activo = ? WHERE id = ?"
      ).bind(body.nombre, body.duracion, body.precio, body.activo ? 1 : 0, id).run();
    } else {
      await env.DB.prepare(
        "INSERT INTO servicios (id, nombre, duracion, precio, activo, creado) VALUES (?, ?, ?, ?, ?, ?)"
      ).bind(id, body.nombre, body.duracion, body.precio, body.activo ? 1 : 0, creado).run();
    }
    return json({ ok: true, id });
  } catch (e) {
    return json({ error: "No autorizado o error al guardar" }, 401);
  }
}