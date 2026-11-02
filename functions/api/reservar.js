import { json, timeToMinutes, minutesToTime } from "./_utils.js";

export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    const body = await request.json();
    const { fecha, hora, servicio_id, cliente, telefono } = body;

    // 1. Validar datos
    if (!fecha || !hora || !servicio_id || !cliente || !telefono) {
      return json({ error: "Faltan datos" }, 400);
    }

    // 2. Obtener servicio
    const servicio = await env.DB.prepare("SELECT * FROM servicios WHERE id = ? AND activo = 1")
      .bind(servicio_id).first();
    if (!servicio) return json({ error: "Servicio no encontrado" }, 404);

    // 3. Obtener configuración
    const { results: cfgRows } = await env.DB.prepare("SELECT clave, valor FROM config").all();
    const cfg = {};
    cfgRows.forEach(r => { cfg[r.clave] = r.valor; });

    // 4. Validar antelación mínima
    const minHoras = parseInt(cfg.min_antelacion_horas || "4");
    const fechaHoraCita = new Date(`${fecha}T${hora}:00`);
    const ahora = new Date();
    const difHoras = (fechaHoraCita - ahora) / (1000 * 60 * 60);
    if (difHoras < minHoras) {
      return json({ error: `Debes reservar con al menos ${minHoras} horas de antelación.` }, 400);
    }

    // 5. Validar solapamiento (leer citas de ese día)
    const { results: citasDia } = await env.DB.prepare(
      "SELECT hora, duracion FROM citas WHERE fecha = ? AND estado != 'cancelada'"
    ).bind(fecha).all();

    const nuevaInicio = timeToMinutes(hora);
    const nuevaFin = nuevaInicio + servicio.duracion;

    for (const c of citasDia) {
      const cInicio = timeToMinutes(c.hora);
      const cFin = cInicio + c.duracion;
      // Si se cruzan
      if (nuevaInicio < cFin && nuevaFin > cInicio) {
        return json({ error: "El horario seleccionado ya está ocupado. Por favor, elige otro." }, 400);
      }
    }

    // 6. Guardar la cita
    const id = crypto.randomUUID();
    const creada = new Date().toISOString();

    await env.DB.prepare(
      `INSERT INTO citas (id, fecha, hora, servicio_id, servicio_nombre, duracion, precio, cliente, telefono, estado, creada) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pendiente', ?)`
    ).bind(
      id, fecha, hora, servicio_id, servicio.nombre, servicio.duracion, servicio.precio, cliente, telefono, creada
    ).run();

    // 7. Armar link de WhatsApp
    const telNegocio = (cfg.telefono_negocio || "").replace(/\D/g, "");
    const mensaje = `Hola, acabo de reservar una cita:\n\n*Cliente:* ${cliente}\n*Servicio:* ${servicio.nombre}\n*Fecha:* ${fecha}\n*Hora:* ${hora}\n\n¡Por favor confírmame!`;
    const waLink = `https://wa.me/${telNegocio}?text=${encodeURIComponent(mensaje)}`;

    return json({ ok: true, waLink });

  } catch (e) {
    console.error(e);
    return json({ error: "Error interno del servidor" }, 500);
  }
}