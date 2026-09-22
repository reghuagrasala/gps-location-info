import{solarPosition,solarAltitude}from "./astronomy.js";
const EARTH_DAY="https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-blue-marble.jpg";
const BUMP="https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-topology.png";
const SKY="https://cdn.jsdelivr.net/npm/three-globe/example/img/night-sky.png";
const instances=new Map(),state=new WeakMap();

function fallback(el){if(!el)return;el.classList.add("globe-fallback-host");if(!el.querySelector(".globe-fallback"))el.insertAdjacentHTML("beforeend",'<div class="globe-fallback"><b>Earth view unavailable</b><br><small>GPS coordinates continue to work.</small></div>')}
function makeMarker(mini=false){const el=document.createElement("div");el.className="earth-marker"+(mini?" mini-marker":"");el.innerHTML=mini?'<span class="earth-marker-dot"></span>':'<span class="earth-marker-dot"></span><span class="earth-marker-copy"><b></b><strong></strong><small></small></span>';return el}
function updateSun(s){try{const sun=solarPosition(new Date()),lights=s.g.lights?.(),dir=lights?.find(x=>x&&x.isDirectionalLight);if(!dir)return;const p=s.g.getCoords(sun.lat,sun.lng,1.2);dir.position.set(p.x,p.y,p.z);dir.intensity=2.35;s.sun=sun}catch{}}
function updateStatus(s,p){try{const alt=solarAltitude(p.lat,p.lon,new Date(p.time||Date.now()));const el=s.element.parentElement?.querySelector(".globe-status");if(el)el.textContent=(alt>=0?"Daylight":"Night")+" · Drag · pinch · zoom"}catch{}}

export function initGlobe(element,{mini=false}={}){
 if(!element)return null;
 if(instances.has(element))return instances.get(element);
 if(typeof window.Globe!=="function"){fallback(element);return null}
 try{
  const g=new window.Globe(element,{rendererConfig:{antialias:true,alpha:true,powerPreference:"high-performance"},waitForGlobeReady:false,animateIn:false})
   .globeImageUrl(EARTH_DAY).bumpImageUrl(BUMP).backgroundImageUrl(SKY).backgroundColor("rgba(0,0,0,0)")
   .showAtmosphere(true).atmosphereColor("#1a3a6e").atmosphereAltitude(mini?.10:.18)
   .globeCurvatureResolution(mini?6:4).showGraticules(false)
   .pointsData([]).pointColor(()=>"#7dff69").pointAltitude(.006).pointRadius(mini?.12:.20).pointResolution(12).pointsMerge(false)
   .ringsData([]).ringColor(()=>["rgba(125,255,105,.95)","rgba(125,255,105,0)"]).ringMaxRadius(1.8).ringPropagationSpeed(1.8).ringRepeatPeriod(1300).ringAltitude(.008)
   .enablePointerInteraction(true);
  try{const m=g.globeMaterial();m.color?.set?.("#ffffff");m.shininess=6;m.opacity=1;m.transparent=false}catch{}
  const controls=g.controls();controls.enableZoom=true;controls.enablePan=false;controls.enableDamping=true;controls.dampingFactor=.08;controls.autoRotate=false;controls.minDistance=120;controls.maxDistance=420;
  g.pointOfView({lat:20,lng:78,altitude:mini?2.55:2.28},0);
  const s={g,mini,element,marker:null,centered:false,ready:false,lastP:null,lastSize:""};
  state.set(element,s);instances.set(element,g);
  g.onGlobeReady?.(()=>{s.ready=true;updateSun(s);resizeGlobe(element)});
  setTimeout(()=>resizeGlobe(element),50);
  return g;
 }catch{fallback(element);return null}
}
export function resizeGlobe(element){
 const g=instances.get(element);if(!g||!element)return false;
 try{const w=Math.max(1,element.clientWidth),h=Math.max(1,element.clientHeight);if(w<30||h<30)return false;const key=w+"x"+h;if(key!==state.get(element)?.lastSize){g.width(w).height(h);if(state.get(element))state.get(element).lastSize=key}return true}catch{return false}
}
export function restoreGlobe(element){
 const g=instances.get(element),s=state.get(element);if(!g)return false;
 const restore=()=>{try{if(!resizeGlobe(element))return false;g.resumeAnimation?.();if(s?.lastP)updateGlobe(element,s.lastP);return true}catch{return false}};
 restore();[80,220,500].forEach(ms=>setTimeout(restore,ms));return true;
}
export function recenterGlobe(element,p){
 const g=instances.get(element),s=state.get(element);if(!g||!p||!Number.isFinite(p.lat)||!Number.isFinite(p.lon))return;
 try{g.pointOfView({lat:p.lat,lng:p.lon,altitude:s?.mini?2.55:2.28},650);if(s)s.centered=true}catch{}
}
export function updateGlobe(element,p){
 const g=instances.get(element),s=state.get(element);if(!g||!s)return;
 s.lastP=p||null;updateSun(s);
 if(!p||!Number.isFinite(p.lat)||!Number.isFinite(p.lon)){g.pointsData([]);g.ringsData([]);g.htmlElementsData([]);return}
 const place=p.place||"Thrissur",d=new Date(p.time||Date.now()),time=d.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}),date=d.toLocaleDateString([],{day:"2-digit",month:"short",year:"numeric"});
 if(!s.marker){s.marker=makeMarker(s.mini);g.htmlElementsData([{lat:p.lat,lng:p.lon,el:s.marker}]).htmlLat(x=>x.lat).htmlLng(x=>x.lng).htmlAltitude(.004).htmlElement(x=>x.el).htmlTransitionDuration(0)}
 else g.htmlElementsData([{lat:p.lat,lng:p.lon,el:s.marker}]);
 const b=s.marker.querySelector("b"),strong=s.marker.querySelector("strong"),small=s.marker.querySelector("small");if(b)b.textContent=place;if(strong)strong.textContent=time;if(small)small.textContent=date;
 g.pointsData([{lat:p.lat,lng:p.lon}]);g.ringsData([{lat:p.lat,lng:p.lon}]);updateStatus(s,p);
 if(!s.centered){g.pointOfView({lat:p.lat,lng:p.lon,altitude:s.mini?2.55:2.28},900);s.centered=true}
}
