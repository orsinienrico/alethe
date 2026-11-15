/* ALETHE — GET /api/leaderboard — top 10 della settimana (binding D1: DB). */
export async function onRequestGet({ env }) {
  try {
    if (!env || !env.DB) return Response.json({ players: [] }, { status: 501 });
    const res = await env.DB.prepare(
      `SELECT u.name, MAX(s.pct) AS best, MAX(s.played_at) AS last
       FROM scores s JOIN users u ON u.id = s.user_id
       WHERE s.played_at >= datetime('now', '-7 days')
       GROUP BY s.user_id ORDER BY best DESC LIMIT 10`
    ).all();
    return Response.json({ players: res.results || [] });
  } catch (err) {
    return Response.json({ players: [] }, { status: 500 });
  }
}
