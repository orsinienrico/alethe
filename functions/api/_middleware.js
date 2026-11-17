// Privacy: API responses must never be stored in shared or browser HTTP caches.
export async function onRequest(context) {
  if (new URL(context.request.url).pathname !== '/api/health') {
    return Response.json({error:'maintenance'}, {status:503,headers:{'Cache-Control':'no-store','Retry-After':'3600'}});
  }
  const response = await context.next();
  const headers = new Headers(response.headers);
  headers.set('Cache-Control', 'no-store');
  headers.set('X-Content-Type-Options', 'nosniff');
  return new Response(response.body, {status:response.status,statusText:response.statusText,headers});
}
