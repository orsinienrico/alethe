/* ALETHE — POST /api/auth/login — Cloudflare Pages Function (binding D1: DB). */
import { hashPassword, createSession, sessionCookie } from './register.js';

export async function onRequestPost({ request, env }) {
  try {
    if (!env || !env.DB) return Response.json({ error: 'DB non configurato' }, { status: 500 });
    const body = await request.json().catch(() => ({}));
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    const row = await env.DB.prepare('SELECT id, name, email, pass_hash, salt, plan FROM users WHERE email = ?1').bind(email).first();
    // risposta identica per utente inesistente e password errata (no user enumeration)
    if (!row) return Response.json({ error: 'Credenziali non valide' }, { status: 401 });
    const candidate = await hashPassword(password, row.salt);
    let diff = candidate.length !== row.pass_hash.length ? 1 : 0;
    for (let z = 0; z < candidate.length; z++) diff |= candidate.charCodeAt(z) ^ row.pass_hash.charCodeAt(z);
    if (diff !== 0) return Response.json({ error: 'Credenziali non valide' }, { status: 401 });
    const token = await createSession(row.id, env);
    return Response.json({ user: { name: row.name, email: row.email, plan: row.plan } }, {
      headers: { 'Set-Cookie': sessionCookie(token) }
    });
  } catch (err) {
    return Response.json({ error: 'Errore di accesso' }, { status: 500 });
  }
}
