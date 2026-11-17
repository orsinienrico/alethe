// Ask browsers with an existing Alethe PWA to install the cache retirement worker.
if ('serviceWorker' in navigator) {
 navigator.serviceWorker.getRegistrations().then(registrations => {
   const ownScope = new URL('./', location.href).href;
   for (const registration of registrations)
     if (registration.scope === ownScope) registration.update().catch(()=>{});
 }).catch(()=>{});
}
