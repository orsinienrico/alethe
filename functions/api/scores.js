/* ALETHE — /api/scores — Cloudflare Pages Function (binding D1: DB).
   POST: salva il punteggio di una partita (richiede sessione). GET: ultime 20 partite dell'utente. */
import { sessionUser } from './auth/register.js';

function clampInt(v, min, max) {
  const n = parseInt(v, 10);
  if (isNaN(n)) return min;
  return Math.max(min, Math.min(max, n));
}

export async function onRequestPost({ request, env }) {
  try {
    if (!env || !env.DB) return Response.json({ error: 'DB non configurato' }, { status: 500 });
    const user = await sessionUser(request, env);
    if (!user) return Response.json({ error: 'non_autenticato' }, { status: 401 });
    const body = await request.json().catch(() => ({}));
    const setId = String(body.set_id || '').slice(0, 16);
    const pct = clampInt(body.pct, 0, 100);
    const correct = clampInt(body.correct, 0, 50);
    const total = clampInt(body.total, 1, 50);
    const credits = clampInt(body.credits, 0, 500);
    await env.DB.prepare(
      'INSERT INTO scores (user_id, set_id, pct, correct, total, credits) VALUES (?1, ?2, ?3, ?4, ?5, ?6)'
    ).bind(user.id, setId, pct, correct, total, credits).run();
    return Response.json({ ok: true });
  } catch (err) {
    return Response.json({ error: 'errore_salvataggio' }, { status: 500 });
  }
}

export async function onRequestGet({ request, env }) {
  try {
    if (!env || !env.DB) return Response.json({ scores: [] }, { status: 500 });
    const user = await sessionUser(request, env);
    if (!user) return Response.json({ error: 'non_autenticato' }, { status: 401 });
    const res = await env.DB.prepare(
      'SELECT set_id, pct, correct, total, credits, played_at FROM scores WHERE user_id = ?1 ORDER BY played_at DESC LIMIT 20'
    ).bind(user.id).all();
    return Response.json({ scores: res.results || [] });
  } catch (err) {
    return Response.json({ scores: [] }, { status: 500 });
  }
}
