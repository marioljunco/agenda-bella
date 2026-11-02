import { json } from "./_utils.js";

export async function onRequestGet(context) {
  const { env } = context;
  const { results } = await env.DB.prepare("SELECT * FROM negocios").all();
  return json(results);
}