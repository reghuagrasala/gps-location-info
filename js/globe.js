import{solarPosition}from "./astronomy.js";
const EARTH_DAY="https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-day.jpg";
const EARTH_NIGHT="https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-night.jpg";
const BUMP="https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-topology.png";
const SKY="https://cdn.jsdelivr.net/npm/three-globe/example/img/night-sky.png";
const instances=new Map(),state=new WeakMap();
const VERTEX=`
varying vec3 vNormal;
varying vec2 vUv;
void main(){vNormal=normalize(normalMatrix*normal);vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}
`;
const FRAGMENT=`
#define PI 3.141592653589793
uniform sampler2D dayTexture;
uniform sampler2D nightTexture;
uniform vec2 sunPosition;
uniform vec2 globeRotation;
varying vec3 vNormal;
varying vec2 vUv;
float toRad(float a){return a*PI/180.0;}
vec3 polar2Cartesian(vec2 c){
 float theta=toRad(90.0-c.x),phi=toRad(90.0-c.y);
 return vec3(sin(phi)*cos(theta),cos(phi),sin(phi)*sin(theta));
}
void main(){
 float invLon=toRad(globeRotation.x),invLat=-toRad(globeRotation.y);
 mat3 rotX=mat3(1,0,0,0,cos(invLat),-sin(invLat),0,sin(invLat),cos(invLat));
 mat3 rotY=mat3(cos(invLon),0,sin(invLon),0,1,0,-sin(invLon),0,cos(invLon));
 vec3 sun=normalize(rotX*rotY*polar2Cartesian(sunPosition));
 float intensity=dot(normalize(vNormal),sun);
 float blend=smoothstep(-0.12,0.12,intensity);
 vec4 day=texture2D(dayTexture,vUv);
 vec4 night=texture2D(nightTexture,vUv);
 gl_FragColor=mix(night,day,blend);
}
`;
function fallback(el){if(!el)return;el.classList.add("globe-fallback-host");if(!el.querySelector(".globe-fallback"))el.insertAdjacentHTML("beforeend",'<div class="globe-fallback">3D Earth is unavailable here.<br><small>GPS coordinates continue to work.</small></div>')}
function makeMarker(){const el=document.createElement("div");el.className="earth-marker";el.innerHTML='<span class="earth-marker-dot"></span><span class="earth-marker-copy"><b></b><strong></strong><small></small></span>';return el}
function setRotation(s){
 try{const c=s.g.camera(),geo=s.g.toGeoCoords(c.position);if(s.material?.uniforms?.globeRotation&&geo)s.material.uniforms.globeRotation.value.set(geo.lng,geo.lat)}catch{}
}
function setSun(s){
 try{if(!s.material?.uniforms?.sunPosition)return;const sun=solarPosition(new Date());s.material.uniforms.sunPosition.value.set(sun.lng,sun.lat)}catch{}
}
function installMaterial(s){
 try{
  const T=window.THREE;if(!T)return;
  const loader=new T.TextureLoader();
  Promise.all([
   loader.loadAsync(EARTH_DAY),
   loader.loadAsync(EARTH_NIGHT)
  ]).then(([day,night])=>{
   day.colorSpace=T.SRGBColorSpace||day.colorSpace;
   night.colorSpace=T.SRGBColorSpace||night.colorSpace;
   s.material=new T.ShaderMaterial({
    uniforms:{
     dayTexture:{value:day},
     nightTexture:{value:night},
     sunPosition:{value:new T.Vector2()},
     globeRotation:{value:new T.Vector2()}
    },
    vertexShader:VERTEX,
    fragmentShader:FRAGMENT
   });
   s.g.globeMaterial(s.material);
   setSun(s);setRotation(s);
   s.texturesReady=true;
  }).catch(()=>{});
 }catch{}
}
export function initGlobe(element,{mini=false}={}){
 if(!element)return null;if(instances.has(element))return instances.get(element);
 if(typeof window.Globe!=="function"){fallback(element);return null}
 try{
  const g=new window.Globe(element,{rendererConfig:{antialias:true,alpha:true,powerPreference:"high-performance"},waitForGlobeReady:false,animateIn:false})
   .backgroundImageUrl(SKY).backgroundColor("#020913").showAtmosphere(true).atmosphereColor("#65cfff")
   .atmosphereAltitude(mini?.10:.14).globeCurvatureResolution(mini?6:4).showGraticules(false)
   .pointsData([]).pointColor(()=>"#7dff69").pointAltitude(.018).pointRadius(mini?.20:.30).pointResolution(12).pointsMerge(false)
   .ringsData([]).ringColor(()=>["rgba(125,255,105,.95)","rgba(125,255,105,0)"]).ringMaxRadius(1.7).ringPropagationSpeed(1.7).ringRepeatPeriod(1300).ringAltitude(.008)
   .enablePointerInteraction(true);
  try{const m=g.globeMaterial();m.color?.set?.("#ffffff");m.shininess=4;m.opacity=1;m.transparent=false}catch{}
  g.controls().enableDamping=true;g.controls().dampingFactor=.08;g.controls().autoRotate=false;g.controls().minDistance=120;g.controls().maxDistance=420;
  g.pointOfView({lat:20,lng:78,altitude:mini?2.55:2.28},0);
  const s={g,mini,marker:null,centered:false,ready:false,texturesReady:false,material:null};
  state.set(element,s);instances.set(element,g);
  g.onGlobeReady?.(()=>{s.ready=true;setSun(s);setRotation(s);try{g.renderer().setPixelRatio(Math.min(window.devicePixelRatio||1,2))}catch{};installMaterial(s)});
  g.controls().addEventListener("change",()=>setRotation(s));
  setTimeout(()=>resizeGlobe(element),60);
  return g
 }catch{fallback(element);return null}
}
export function resizeGlobe(element){const g=instances.get(element);if(!g)return;try{const w=Math.max(1,element.clientWidth),h=Math.max(1,element.clientHeight);g.width(w);g.height(h);setRotation(state.get(element))}catch{}}
export function updateGlobe(element,p){
 const g=instances.get(element),s=state.get(element);if(!g||!s)return;
 setSun(s);
 if(!p||!Number.isFinite(p.lat)||!Number.isFinite(p.lon)){if(s.marker){g.pointsData([]);g.ringsData([]);g.htmlElementsData([])}return}
 const place=p.place||"Thrissur",d=new Date(p.time||Date.now()),time=d.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}),date=d.toLocaleDateString([],{day:"2-digit",month:"short",year:"numeric"});
 if(!s.marker){s.marker=makeMarker();g.htmlElementsData([{lat:p.lat,lng:p.lon,el:s.marker}]).htmlLat(d=>d.lat).htmlLng(d=>d.lng).htmlAltitude(.025).htmlElement(d=>d.el).htmlTransitionDuration(0)}else g.htmlElementsData([{lat:p.lat,lng:p.lon,el:s.marker}]);
 const b=s.marker.querySelector("b"),strong=s.marker.querySelector("strong"),small=s.marker.querySelector("small");if(b)b.textContent=place;if(strong)strong.textContent=time;if(small)small.textContent=date;
 g.pointsData([{lat:p.lat,lng:p.lon}]);g.ringsData([{lat:p.lat,lng:p.lon}]);
 if(!s.centered){g.pointOfView({lat:p.lat,lng:p.lon,altitude:s.mini?2.55:2.28},700);s.centered=true;setTimeout(()=>setRotation(s),750)}
}
