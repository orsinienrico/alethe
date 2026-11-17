// Deployment readiness: do not expose database internals or credentials.
export async function onRequestGet({env}) {
  try {
    if(!env.DB) throw new Error('missing database');
    await env.DB.batch(['users','sessions','scores'].map(table=>env.DB.prepare('SELECT 1 FROM '+table+' LIMIT 1')));
    return Response.json({status:'ok'}, {headers:{'Cache-Control':'no-store'}});
  } catch {
    return Response.json({status:'not_ready'}, {status:503,headers:{'Cache-Control':'no-store'}});
  }
}
