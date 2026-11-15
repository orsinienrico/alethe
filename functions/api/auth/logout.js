/* ALETHE — POST /api/auth/logout — Cloudflare Pages Function (binding D1: DB). */
import { sha256Hex, clearCookie } from './register.js';

export async function onRequestPost({ request, env }) {
  try {
    const cookie = request.headers.get('Cookie') || '';
    const m = cookie.match(/alethe_session=([^;]+)/);
    if (m && env && env.DB) {
      const tokenHash = await sha256Hex(m[1]);
      await env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?1').bind(tokenHash).run();
    }
  } catch (err) { /* logout è best-effort */ }
  return Response.json({ ok: true }, { headers: { 'Set-Cookie': clearCookie() } });
}
