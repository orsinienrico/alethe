/* ALETHE — POST /api/auth/register — Cloudflare Pages Function (binding D1: DB).
   Password: PBKDF2-SHA256 100k iterazioni via WebCrypto, salt casuale per utente.
   Sessione: token opaco 256bit, salvato in D1 solo come SHA-256, cookie HttpOnly SameSite=Strict. */
const COOKIE = 'alethe_session';
const SESSION_DAYS = 30;

export function sessionCookie(token, maxAgeSeconds = SESSION_DAYS * 86400) {
  return `${COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAgeSeconds}`;
}
export function clearCookie() {
  return `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
}
export function bytesToHex(buf) {
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}
export function hexToBytes(hex) {
  const out = new Uint8Array(hex.length / 2);
  for (let z = 0; z < out.length; z++) out[z] = parseInt(hex.substr(z * 2, 2), 16);
  return out;
}
export async function hashPassword(password, saltHex) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: hexToBytes(saltHex), iterations: 100000 },
    key, 256
  );
  return bytesToHex(bits);
}
export async function sha256Hex(text) {
  return bytesToHex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)));
}
export async function createSession(userId, env) {
  const token = bytesToHex(crypto.getRandomValues(new Uint8Array(32)));
  const tokenHash = await sha256Hex(token);
  const expires = new Date(Date.now() + SESSION_DAYS * 86400 * 1000).toISOString();
  await env.DB.prepare('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?1, ?2, ?3)')
    .bind(tokenHash, userId, expires).run();
  return token;
}
export async function sessionUser(request, env) {
  const cookie = request.headers.get('Cookie') || '';
  const m = cookie.match(new RegExp(COOKIE + '=([^;]+)'));
  if (!m) return null;
  const tokenHash = await sha256Hex(m[1]);
  const row = await env.DB.prepare(
    'SELECT u.id, u.name, u.email, u.plan FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ?1 AND s.expires_at > ?2'
  ).bind(tokenHash, new Date().toISOString()).first();
  return row || null;
}

export async function onRequestPost({ request, env }) {
  try {
    if (!env || !env.DB) return Response.json({ error: 'DB non configurato' }, { status: 500 });
    const body = await request.json().catch(() => ({}));
    const email = String(body.email || '').trim().toLowerCase();
    const name = String(body.name || '').trim().slice(0, 40) || email.split('@')[0];
    const password = String(body.password || '');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return Response.json({ error: 'Email non valida' }, { status: 400 });
    }
    if (password.length < 8 || password.length > 200) {
      return Response.json({ error: 'La password deve avere almeno 8 caratteri' }, { status: 400 });
    }
    const exists = await env.DB.prepare('SELECT id FROM users WHERE email = ?1').bind(email).first();
    if (exists) return Response.json({ error: 'Email già registrata' }, { status: 409 });
    const salt = bytesToHex(crypto.getRandomValues(new Uint8Array(16)));
    const passHash = await hashPassword(password, salt);
    const ins = await env.DB.prepare(
      'INSERT INTO users (email, name, pass_hash, salt) VALUES (?1, ?2, ?3, ?4)'
    ).bind(email, name, passHash, salt).run();
    const token = await createSession(ins.meta.last_row_id, env);
    return Response.json({ user: { name, email, plan: 'free' } }, {
      headers: { 'Set-Cookie': sessionCookie(token) }
    });
  } catch (err) {
    return Response.json({ error: 'Errore di registrazione' }, { status: 500 });
  }
}
