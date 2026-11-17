// Privacy: API responses must never be stored in shared or browser HTTP caches.
export async function onRequest(context) {
  const response = await context.next();
  const headers = new Headers(response.headers);
  headers.set('Cache-Control', 'no-store');
  headers.set('X-Content-Type-Options', 'nosniff');
  return new Response(response.body, {status:response.status,statusText:response.statusText,headers});
}
