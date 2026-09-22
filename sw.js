const CACHE="my-location-info-v13";
const LOCAL_ASSETS=["./","./index.html","./styles.css","./manifest.json","./js/app.js","./js/globe.js","./js/gps.js","./js/coordinates.js","./js/astronomy.js","./js/digipin.js","./js/storage.js","./js/compass.js","./js/units.js","./js/services/weather.js","./js/services/location.js","./icons/icon.svg"];
const EXTERNAL_ASSETS=["https://cdn.jsdelivr.net/npm/three@0.179.1/build/three.min.js","https://cdn.jsdelivr.net/npm/globe.gl@2.46.2/dist/globe.gl.min.js","https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg","https://unpkg.com/three-globe/example/img/earth-topology.png","https://unpkg.com/three-globe/example/img/night-sky.png","https://api.open-meteo.com/v1/forecast"];
self.addEventListener("install",event=>{event.waitUntil((async()=>{const cache=await caches.open(CACHE);await cache.addAll(LOCAL_ASSETS);await Promise.all(EXTERNAL_ASSETS.map(async url=>{try{const r=await fetch(new Request(url,{mode:"cors",cache:"reload"}));if(r.ok)await cache.put(url,r)}catch{}}));await self.skipWaiting()})())});
self.addEventListener("activate",event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener("fetch",event=>{
 if(event.request.method!=="GET")return;
 const url=new URL(event.request.url);
 const isAPI=url.hostname==="api.open-meteo.com"||url.hostname==="api.bigdatacloud.net"||url.hostname==="nominatim.openstreetmap.org"||url.hostname==="photon.komoot.io"||url.hostname==="www.7timer.info";
 event.respondWith((async()=>{
  if(isAPI){
   try{return await fetch(event.request,{cache:"no-store"})}
   catch{const cached=await caches.match(event.request);if(cached)return cached;return new Response("Offline",{status:503})}
  }
  const cached=await caches.match(event.request);if(cached)return cached;
  try{const response=await fetch(event.request),copy=response.clone();caches.open(CACHE).then(c=>c.put(event.request,copy)).catch(()=>{});return response}
  catch{return new Response("Offline",{status:503,headers:{"Content-Type":"text/plain"}})}
 })());
});