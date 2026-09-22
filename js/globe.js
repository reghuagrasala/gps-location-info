const instances=new Map(),state=new WeakMap();
const EARTH="https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-blue-marble.jpg";
const BUMP="https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-topology.png";
const SKY="https://cdn.jsdelivr.net/npm/three-globe/example/img/night-sky.png";

function fallback(el){
 if(!el)return;
 if(!el.querySelector(".globe-fallback"))el.insertAdjacentHTML("beforeend",'<div class="globe-fallback"><b>Earth view unavailable</b><br><small>GPS coordinates continue to work.</small></div>');
}
function marker(mini){
 const el=document.createElement("div");el.className="earth-marker"+(mini?" mini-marker":"");
 el.innerHTML=mini?'<span class="earth-marker-dot"></span>':'<span class="earth-marker-dot"></span><span class="earth-marker-copy"><b></b><strong></strong><small></small></span>';
 return el;
}
export function initGlobe(el,{mini=false}={}){
 if(!el||instances.has(el))return instances.get(el)||null;
 if(typeof window.Globe!=="function"){fallback(el);return null}
 try{
  const g=new window.Globe(el,{rendererConfig:{antialias:true,alpha:true,powerPreference:"high-performance"},waitForGlobeReady:false,animateIn:false})
   .backgroundColor("#020913")
   .globeImageUrl(EARTH)
   .bumpImageUrl(BUMP)
   .backgroundImageUrl(SKY)
   .showAtmosphere(true).atmosphereColor("#3f9cff").atmosphereAltitude(mini?.10:.16)
   .globeCurvatureResolution(mini?6:4).showGraticules(false)
   .pointsData([]).pointColor(()=>"#7dff69").pointAltitude(.006).pointRadius(mini?.12:.20).pointResolution(12)
   .ringsData([]).ringColor(()=>["rgba(125,255,105,.95)","rgba(125,255,105,0)"]).ringMaxRadius(1.8).ringPropagationSpeed(1.8).ringRepeatPeriod(1300).ringAltitude(.008)
   .enablePointerInteraction(true);
  const controls=g.controls();controls.enableZoom=true;controls.enablePan=false;controls.enableDamping=true;controls.dampingFactor=.08;controls.autoRotate=false;controls.minDistance=120;controls.maxDistance=420;
  g.pointOfView({lat:20,lng:78,altitude:mini?2.55:2.28},0);
  const s={g,mini,el,marker:null,centered:false,lastP:null};state.set(el,s);instances.set(el,g);
  setTimeout(()=>resizeGlobe(el),100);
  return g;
 }catch(e){fallback(el);return null}
}
export function resizeGlobe(el){
 const g=instances.get(el);if(!g||!el)return false;
 try{const w=Math.max(1,el.clientWidth),h=Math.max(1,el.clientHeight);if(w<30||h<30)return false;g.width(w).height(h);return true}catch{return false}
}
export function restoreGlobe(el){const g=instances.get(el),s=state.get(el);if(!g)return false;resizeGlobe(el);g.resumeAnimation?.();if(s?.lastP)updateGlobe(el,s.lastP);return true}
export function recenterGlobe(el,p,force=false){const g=instances.get(el),s=state.get(el);if(!g||!p)return;try{g.pointOfView({lat:p.lat,lng:p.lon,altitude:s?.mini?2.55:2.28},force?450:650);if(s)s.centered=true}catch{}}
export function updateGlobe(el,p){
 const g=instances.get(el),s=state.get(el);if(!g||!s)return;s.lastP=p||null;
 if(!p||!Number.isFinite(p.lat)||!Number.isFinite(p.lon)){g.pointsData([]);g.ringsData([]);g.htmlElementsData([]);return}
 const d=new Date(p.time||Date.now()),time=d.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}),date=d.toLocaleDateString([],{day:"2-digit",month:"short",year:"numeric"}),place=p.place||"Location";
 if(!s.marker)s.marker=marker(s.mini);
 g.htmlElementsData([{lat:p.lat,lng:p.lon,el:s.marker}]).htmlLat(x=>x.lat).htmlLng(x=>x.lng).htmlAltitude(.004).htmlElement(x=>x.el).htmlTransitionDuration(0);
 const b=s.marker.querySelector("b"),strong=s.marker.querySelector("strong"),small=s.marker.querySelector("small");
 if(b)b.textContent=place;if(strong)strong.textContent=time;if(small)small.textContent=date;
 g.pointsData([{lat:p.lat,lng:p.lon}]);g.ringsData([{lat:p.lat,lng:p.lon}]);
 if(!s.centered){recenterGlobe(el,p)}
}
