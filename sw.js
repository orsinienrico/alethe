/* ALETHE — service worker.
   Network-first sui contenuti quotidiani (index.html, privacy, js/data.js): il giocatore vede sempre la sfida di oggi.
   Cache-first + precache su css/js/icons/fonts (statici, versionati dal bump di CACHE). */
var CACHE='alethe-v12';
var ASSETS=['./','./index.html','./privacy.html','./terms.html','./css/alethe.css','./js/data.js','./js/data2.js','./js/card.js','./js/app.js','./icons/icon.svg','./icons/icon-maskable.svg','./icons/flame.svg','./fonts/fraunces-latin-full-normal.woff2','./fonts/fraunces-latin-full-italic.woff2','./fonts/libre-franklin-latin-wght-normal.woff2','./fonts/courier-prime-latin-700-normal.woff2','./manifest.webmanifest','./og.png'];
var NETWORK_FIRST=['./index.html','./privacy.html','./terms.html','./js/data.js'];
self.addEventListener('install',function(e){e.waitUntil(caches.open(CACHE).then(function(c){return c.addAll(ASSETS)}).then(function(){return self.skipWaiting()}))});
self.addEventListener('activate',function(e){e.waitUntil(caches.keys().then(function(keys){return Promise.all(keys.map(function(k){return k===CACHE?null:caches.delete(k)}))}).then(function(){return self.clients.claim()}))});
self.addEventListener('fetch',function(e){
  if(e.request.method!=='GET')return;
  var url=e.request.url;
  var sameOrigin=(function(){try{return new URL(url).origin===self.location.origin}catch(err){return false}})();
  var isContent=false;
  if(sameOrigin){var path=url.replace(self.location.origin+'/','');if(NETWORK_FIRST.indexOf('./'+path)>=0||url===self.location.origin+'/'||url===self.location.origin+'/index.html')isContent=true}
  if(isContent){
    e.respondWith(
      fetch(e.request).then(function(res){
        try{if(res.ok){var copy=res.clone();caches.open(CACHE).then(function(c){c.put(e.request,copy)})}}catch(err){}
        return res;
      }).catch(function(){return caches.match(e.request)})
    );
    return;
  }
  e.respondWith(
    caches.match(e.request).then(function(hit){
      if(hit)return hit;
      return fetch(e.request).then(function(res){
        try{
          if(res.ok&&sameOrigin){
            var copy=res.clone();
            caches.open(CACHE).then(function(c){c.put(e.request,copy)})
          }
        }catch(err){}
        return res;
      }).catch(function(){return caches.match('./')})
    })
  )
});
