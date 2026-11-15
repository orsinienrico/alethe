/* ALETHE — GET /api/auth/me — Cloudflare Pages Function (binding D1: DB). */
import { sessionUser } from './register.js';

export async function onRequestGet({ request, env }) {
  try {
    if (!env || !env.DB) return Response.json({ user: null }, { status: 401 });
    const user = await sessionUser(request, env);
    if (!user) return Response.json({ user: null }, { status: 401 });
    return Response.json({ user: { name: user.name, email: user.email, plan: user.plan } });
  } catch (err) {
    return Response.json({ user: null }, { status: 401 });
  }
}
