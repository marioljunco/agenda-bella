import { json, timeToMinutes } from "./_utils.js";

export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    const body = await request.json();
    const { negocio_id, fecha, hora, servicios, cliente, telefono } = body;

    if (!negocio_id || !fecha || !hora || !servicios || !servicios.length || !cliente || !telefono) {
      return json({ error: "Faltan datos" }, 400);
    }

    // 1. Obtener negocio
    const negocio = await env.DB.prepare("SELECT * FROM negocios WHERE id = ?").bind(negocio_id).first();
    if (!negocio) return json({ error: "Negocio no encontrado" }, 404);

    // 2. Calcular duración total y nombres
    let duracionTotal = 0;
    let nombresServicios = [];
    for (let s of servicios) {
      duracionTotal += s.duracion;
      nombresServicios.push(s.nombre);
    }

    // 3. Validar solapamiento
    const { results: citasDia } = await env.DB.prepare(
      "SELECT hora, duracion FROM citas WHERE fecha = ? AND estado != 'cancelada'"
    ).bind(fecha).all();

    const nuevaInicio = timeToMinutes(hora);
    const nuevaFin = nuevaInicio + duracionTotal;

    for (const c of citasDia) {
      const cInicio = timeToMinutes(c.hora);
      const cFin = cInicio + c.duracion;
      if (nuevaInicio < cFin && nuevaFin > cInicio) {
        return json({ error: "El horario seleccionado ya está ocupado." }, 400);
      }
    }

    // 4. Guardar en base de datos
    const id = crypto.randomUUID();
    const creada = new Date().toISOString();

    await env.DB.prepare(
      `INSERT INTO citas (id, fecha, hora, servicio_id, servicio_nombre, duracion, precio, cliente, telefono, estado, creada) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pendiente', ?)`
    ).bind(
      id, fecha, hora, "multiple", nombresServicios.join(", "), duracionTotal, 0, cliente, telefono, creada
    ).run();

    // 5. Armar link de WhatsApp
    const telNegocio = (negocio.telefono || "").replace(/\D/g, "");
    const mensaje = `Hola, acabo de reservar una cita:\n\n*Cliente:* ${cliente}\n*Servicios:* ${nombresServicios.join(" + ")}\n*Duración total:* ${duracionTotal} min\n*Fecha:* ${fecha}\n*Hora:* ${hora}\n\n¡Por favor confírmame!`;
    const waLink = `https://wa.me/${telNegocio}?text=${encodeURIComponent(mensaje)}`;

    return json({ ok: true, waLink });

  } catch (e) {
    console.error(e);
    return json({ error: "Error interno del servidor" }, 500);
  }
}