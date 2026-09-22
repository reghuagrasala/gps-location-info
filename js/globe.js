import{solarPosition,solarAltitude}from "./astronomy.js";
const EARTH_DAY="https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg";
const BUMP="https://unpkg.com/three-globe/example/img/earth-topology.png";
const SKY="https://unpkg.com/three-globe/example/img/night-sky.png";
const instances=new Map(),state=new WeakMap();
function fallback(el){if(!el)return;el.classList.add("globe-fallback-host");if(!el.querySelector(".globe-fallback"))el.insertAdjacentHTML("beforeend",'<div class="globe-fallback">3D Earth is unavailable here.<br><small>GPS coordinates continue to work.</small></div>')}
function makeMarker(){const el=document.createElement("div");el.className="earth-marker";el.innerHTML='<span class="earth-marker-dot"></span><span class="earth-marker-copy"><b></b><strong></strong><small></small></span>';return el}
function updateSun(s){
 try{
  const g=s.g,now=new Date(),sun=solarPosition(now),lights=g.lights?.(),dir=lights?.find(x=>x&&x.isDirectionalLight);
  if(!dir)return;
  const p=g.getCoords(sun.lat,sun.lng,1.2);
  dir.position.set(p.x,p.y,p.z);
  dir.intensity=2.35;
  dir.castShadow=false;
  s.sun={lat:sun.lat,lng:sun.lng};
 }catch{}
}
function updateStatus(s,p){
 try{
  const alt=solarAltitude(p.lat,p.lon,new Date(p.time||Date.now()));
  s.isDay=alt>=-6;
  const status=s.element?.parentElement?.querySelector(".globe-status");
  if(status)status.textContent=(alt>=0?"Daylight":"Night")+ " · Drag · pinch · zoom";
 }catch{}
}
export function initGlobe(element,{mini=false}={}){
 if(!element)return null;
 if(instances.has(element))return instances.get(element);
 if(typeof window.Globe!=="function"){fallback(element);return null}
 try{
  const g=new window.Globe(element,{rendererConfig:{antialias:true,alpha:true,powerPreference:"high-performance"},waitForGlobeReady:false,animateIn:false})
   .globeImageUrl(EARTH_DAY).bumpImageUrl(BUMP).backgroundImageUrl(SKY).backgroundColor("rgba(0,0,0,0)")
   .showAtmosphere(true).atmosphereColor("#1a3a6e").atmosphereAltitude(mini?.10:.18)
   .globeCurvatureResolution(mini?6:4).showGraticules(false)
   .pointsData([]).pointColor(()=>"#00ff88").pointAltitude(.025).pointRadius(mini?.20:.32).pointResolution(12).pointsMerge(true)
   .ringsData([]).ringColor(()=>["rgba(0,255,136,.95)","rgba(0,255,136,0)"]).ringMaxRadius(1.8).ringPropagationSpeed(1.8).ringRepeatPeriod(1300).ringAltitude(.008)
   .enablePointerInteraction(true);
  try{const m=g.globeMaterial();m.color?.set?.("#ffffff");m.shininess=6;m.opacity=1;m.transparent=false}catch{}
  const controls=g.controls();controls.enableZoom=true;controls.enablePan=false;controls.enableDamping=true;controls.dampingFactor=.08;controls.autoRotate=false;controls.minDistance=120;controls.maxDistance=420;
  g.pointOfView({lat:20,lng:78,altitude:mini?2.55:2.28},0);
  const s={g,mini,element,marker:null,centered:false,ready:false,sun:null,isDay:true,lastP:null};
  state.set(element,s);instances.set(element,g);
  g.onGlobeReady?.(()=>{s.ready=true;updateSun(s);try{g.renderer().setPixelRatio(Math.min(window.devicePixelRatio||1,2))}catch{}});
  controls.addEventListener("change",()=>{});
  setTimeout(()=>resizeGlobe(element),60);setInterval(()=>{updateSun(s);if(s.lastP)updateStatus(s,s.lastP)},30000);
  return g;
 }catch{fallback(element);return null}
}
export function resizeGlobe(element){const g=instances.get(element);if(!g)return;try{const size=Math.max(1,Math.min(element.clientWidth,element.clientHeight));g.width(size).height(size)}catch{}}
export function updateGlobe(element,p){
 const g=instances.get(element),s=state.get(element);if(!g||!s)return;
 updateSun(s);s.lastP=p||null;
 if(!p||!Number.isFinite(p.lat)||!Number.isFinite(p.lon)){if(s.marker){g.pointsData([]);g.ringsData([]);g.htmlElementsData([])}return}
 const place=p.place||"Thrissur",d=new Date(p.time||Date.now()),time=d.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}),date=d.toLocaleDateString([],{day:"2-digit",month:"short",year:"numeric"});
 if(!s.marker){
  s.marker=makeMarker();
  g.htmlElementsData([{lat:p.lat,lng:p.lon,el:s.marker}]).htmlLat(d=>d.lat).htmlLng(d=>d.lng).htmlAltitude(.015).htmlElement(d=>d.el).htmlTransitionDuration(0);
 }else g.htmlElementsData([{lat:p.lat,lng:p.lon,el:s.marker}]);
 const b=s.marker.querySelector("b"),strong=s.marker.querySelector("strong"),small=s.marker.querySelector("small");
 if(b)b.textContent=place;if(strong)strong.textContent=time;if(small)small.textContent=date;
 g.pointsData([{lat:p.lat,lng:p.lon}]);g.ringsData([{lat:p.lat,lng:p.lon}]);
 updateStatus(s,p);
 if(!s.centered){g.pointOfView({lat:p.lat,lng:p.lon,altitude:s.mini?2.55:2.28},1200);s.centered=true}
}
