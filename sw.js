const CACHE="mli-safe-v6";
self.addEventListener("install",event=>{event.waitUntil(self.skipWaiting())});
self.addEventListener("activate",event=>{event.waitUntil((async()=>{const keys=await caches.keys();await Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)));await self.clients.claim()})())});
// Deliberately do not intercept fetch requests.
// Safari/iOS must receive Cloudflare's normal redirects directly.
// Offline GPS itself does not require a service worker.