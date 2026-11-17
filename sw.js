/* ALETHE — static-only PWA cache; version replaced automatically by scripts/build.cjs. */
const CACHE='alethe-__RELEASE__';
const ASSETS=['./','./index.html','./privacy.html','./terms.html','./css/alethe.css','./js/data.js','./js/data2.js','./js/card.js','./js/app.js','./icons/icon.svg','./icons/icon-maskable.svg','./icons/flame.svg','./fonts/fraunces-latin-full-normal.woff2','./fonts/fraunces-latin-full-italic.woff2','./fonts/libre-franklin-latin-wght-normal.woff2','./fonts/courier-prime-latin-700-normal.woff2','./manifest.webmanifest','./og.png'];
const STATIC = new Set(ASSETS.map(p=>new URL(p,self.registration.scope).pathname));
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('alethe-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  const req=e.request, url=new URL(req.url);
  // Never cache or substitute responses for API calls or third-party requests.
  if(req.method!=='GET'||url.origin!==self.location.origin||url.pathname==='/api'||url.pathname.startsWith('/api/'))return;
  const navigation=req.mode==='navigate';
  if(!STATIC.has(url.pathname))return;
  const key=navigation?new URL(url.pathname,url.origin).href:req;
  const network=async()=>{
    const res=await fetch(req);
    if(res.ok){const cache=await caches.open(CACHE);await cache.put(key,res.clone());}
    return res;
  };
  const networkFirst=navigation||/\.(?:html|js)$/.test(url.pathname)||url.pathname==='/';
  e.respondWith(networkFirst?network().catch(async()=>{const cache=await caches.open(CACHE);return await cache.match(key)||Response.error();}):(async()=>{const cache=await caches.open(CACHE);return await cache.match(key)||network();})());
});
