import{startGPS,onGPS}from "./gps.js";
import{dms,plusCode,bearingName}from "./coordinates.js";
import{getDigiPin,isIndiaForDigiPin}from "./digipin.js";
import{savePlace,getPlaces,deletePlace}from "./storage.js";
import{enableCompass,onHeading,isActive}from "./compass.js";
import{getWeather}from "./services/weather.js";
import{reverseGeocode}from "./services/location.js";
import{initGlobe,updateGlobe,resizeGlobe}from "./globe.js";
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
let gps=null,selected=null,currentHeading=null,lastGeo={lat:null,lon:null,time:0},geoBusy=false;
const views={home:"homeView",position:"positionView",gps:"gpsView",address:"addressView",weather:"weatherView"};
const homeGlobe=initGlobe($("#globe")),positionGlobe=initGlobe($("#positionGlobe"),{mini:true});
function show(v){v=views[v]?v:"home";document.body.classList.toggle("detail-mode",v!=="home");$$(".view").forEach(x=>x.classList.remove("active"));$("#"+views[v]).classList.add("active");history.replaceState({v},"","#"+v);window.scrollTo(0,0);if(v==="position"){renderSaved();setTimeout(()=>resizeGlobe($("#positionGlobe")),50)}if(v==="address"){if(gps)enrichPlace(gps)}if(v==="weather"){if(gps)renderWeather()}renderAll()}
function card(a,b){return'<div class="data-card"><label>'+a+"</label><b>"+b+"</b></div>"}
function placeName(p){if(!p)return"Waiting for GPS…";if(p.place)return p.place;if(p.lat>=10.1&&p.lat<=10.85&&p.lon>=75.9&&p.lon<=76.8)return"Thrissur";if(isIndiaForDigiPin(p.lat,p.lon))return"India";return"Location"}
function distanceMeters(a,b,c,d){const R=6371000,rad=Math.PI/180,la1=a*rad,la2=c*rad,dl=(c-a)*rad,dlo=(d-b)*rad,x=Math.sin(dl/2)**2+Math.cos(la1)*Math.cos(la2)*Math.sin(dlo/2)**2;return 2*R*Math.asin(Math.sqrt(x))}
async function enrichPlace(p,force=false){if((geoBusy&&!force)||!navigator.onLine||!p||!Number.isFinite(p.lat)||!Number.isFinite(p.lon))return;const now=Date.now();if(!force&&lastGeo.lat!==null&&(now-lastGeo.time<60000||distanceMeters(lastGeo.lat,lastGeo.lon,p.lat,p.lon)<150))return;geoBusy=true;try{const r=await reverseGeocode(p.lat,p.lon);if(r?.ok){p.place=r.label||p.place;p.address=r.address||p.address;p.postcode=r.postcode||p.postcode;p.district=r.district||p.district;p.state=r.state||p.state;p.country=r.country||p.country;lastGeo={lat:p.lat,lon:p.lon,time:Date.now()};renderAll()}}catch{}finally{geoBusy=false}}
function renderAll(){if(!gps||!Number.isFinite(gps.lat)||!Number.isFinite(gps.lon)){$("#globeWaiting")?.classList.remove("hidden");return}const p=gps,d=new Date(p.time||Date.now()),pin=isIndiaForDigiPin(p.lat,p.lon)?getDigiPin(p.lat,p.lon):"Not available outside India",head=Number.isFinite(currentHeading)?Math.round(currentHeading)+"° "+bearingName(currentHeading):(Number.isFinite(p.heading)?Math.round(p.heading)+"° "+bearingName(p.heading):"Unavailable"),spd=Number.isFinite(p.speed)&&p.speed>=0?(p.speed*3.6).toFixed(1)+" km/h":"0.0 km/h",name=placeName(p);
$("#globeWaiting")?.classList.add("hidden");$("#positionPlace").textContent=name;$("#positionLatLon").textContent=p.lat.toFixed(6)+"° "+(p.lat>=0?"N":"S")+" · "+p.lon.toFixed(6)+"° "+(p.lon>=0?"E":"W");$("#positionAccuracy").textContent="Accuracy "+(Number.isFinite(p.accuracy)?Math.round(p.accuracy):"—")+" m";
$("#positionData").innerHTML=[card("Latitude",p.lat.toFixed(6)+"°"),card("Longitude",p.lon.toFixed(6)+"°"),card("DMS Latitude",dms(p.lat,true)),card("DMS Longitude",dms(p.lon,false)),card("Plus Code",plusCode(p.lat,p.lon)),card("DIGIPIN",pin),card("Elevation",Number.isFinite(p.altitude)?Math.round(p.altitude)+" m":"Unavailable"),card("Accuracy",Number.isFinite(p.accuracy)?Math.round(p.accuracy)+" m":"Unavailable")].join("");
$("#gpsData").innerHTML=[card("GPS Status",p.error?"WAITING":"ACTIVE"),card("Location Fix",p.error?"Last fix retained":"Available"),card("Accuracy",Number.isFinite(p.accuracy)?Math.round(p.accuracy)+" m":"Unavailable"),card("Elevation",Number.isFinite(p.altitude)?Math.round(p.altitude)+" m":"Unavailable"),card("Speed",spd),card("Heading",head),card("Date",d.toLocaleDateString()),card("Time",d.toLocaleTimeString()),card("Time Zone",Intl.DateTimeFormat().resolvedOptions().timeZone),card("Compass",isActive()?"Active":"Not active")].join("");
$("#addressStatus").textContent=p.error?"GPS fix retained · address enrichment needs a connection":"GPS coordinates available · online address enrichment active when connected";$("#addressText").textContent=p.address||"Address will be available when data is connected.";$("#addressData").innerHTML=[card("Latitude",p.lat.toFixed(6)),card("Longitude",p.lon.toFixed(6)),card("Place",name),card("District",p.district||"—")].join("");$("#postalInfo").innerHTML="<div><span>Postcode</span><b>"+(p.postcode||"—")+"</b></div><div><span>DIGIPIN</span><b>"+pin+"</b></div>";
updateGlobe($("#globe"),p);updateGlobe($("#positionGlobe"),p)}
async function renderSaved(){const el=$("#savedPlaces"),list=await getPlaces().catch(()=>[]);el.innerHTML=list.length?list.map(p=>'<button class="saved-card" data-id="'+p.id+'"><b>'+p.label+"</b><small>"+p.lat.toFixed(5)+", "+p.lon.toFixed(5)+"</small><small>"+new Date(p.time).toLocaleString()+"</small></button>").join(""):'<div class="empty-saved">No saved places yet. Save the current position below.</div>' ;$$(".saved-card").forEach(b=>b.onclick=()=>{selected=list.find(p=>p.id===b.dataset.id)||null})}
const weatherLabels=["Feels like","Wind","Gusts","Visibility","Humidity","Clouds","UV Index","Air Quality (AQI)","Air Pressure","Dew Point","Precipitation","Chance of Rain","Sunrise","Sunset","Moon Phase"];
async function renderWeather(){
 const g=$("#weatherGrid");
 g.innerHTML=weatherLabels.map(x=>'<button class="weather-card"><label>'+x+"</label><b>—</b><small>Available when connected</small></button>").join("");
 const r=await getWeather(gps?.lat,gps?.lon);
 $("#weatherUpdated").textContent=r.message+(r.provider?" · "+r.provider:"");
 if(!r.ok)return;
 const c=r.current||{},d=r.daily||{},code=Number(c.weather_code);
 const labels={0:"Clear sky",1:"Mainly clear",2:"Partly cloudy",3:"Overcast",45:"Fog",48:"Rime fog",51:"Light drizzle",53:"Drizzle",55:"Dense drizzle",61:"Light rain",63:"Rain",65:"Heavy rain",71:"Light snow",73:"Snow",75:"Heavy snow",80:"Rain showers",81:"Rain showers",82:"Heavy showers",95:"Thunderstorm"};
 $("#weatherTemp").textContent=Number.isFinite(c.temperature_2m)?Math.round(c.temperature_2m)+"°C":"—";
 $("#weatherCondition").textContent=labels[code]||"Current conditions";
 const vals=[c.apparent_temperature,Number.isFinite(c.wind_speed_10m)?c.wind_speed_10m.toFixed(1)+" km/h":"—","—","—",c.relative_humidity_2m,c.cloud_cover,c.uv_index_max??"—","—",c.surface_pressure,"—",c.precipitation,"—",d.sunrise?.[0]||"—",d.sunset?.[0]||"—","—"];
 g.querySelectorAll(".weather-card").forEach((el,i)=>{el.querySelector("b").textContent=vals[i]??"—";el.querySelector("small").textContent="Open-Meteo fallback"});
}
$$("[data-view]").forEach(b=>b.onclick=()=>show(b.dataset.view));$$("[data-back]").forEach(b=>b.onclick=()=>show("home"));window.addEventListener("popstate",()=>show(location.hash.slice(1)||"home"));
$("#compassBtn").onclick=async()=>{const ok=await enableCompass();$("#compassStatus").textContent=ok?"Active":"Unavailable — tap again if iOS requests permission";$("#compassBtn").textContent=ok?"Compass Active":"Enable Compass"};
onHeading(h=>{currentHeading=(h+360)%360;$("#headingValue").textContent=Math.round(currentHeading)+"°";$("#headingDir").textContent=bearingName(currentHeading);$("#compassStatus").textContent="Active";const dial=$("#compassRing .compass-dial");if(dial)dial.style.transform="rotate("+(-currentHeading)+"deg)";renderAll()});
$("#saveBtn").onclick=async()=>{if(!gps)return alert("Waiting for GPS.");const s={id:crypto.randomUUID(),time:gps.time,lat:gps.lat,lon:gps.lon,accuracy:gps.accuracy,altitude:gps.altitude,speed:gps.speed,heading:gps.heading,label:"Saved Location"};await savePlace(s);selected=s;renderSaved()};
$("#shareBtn").onclick=async()=>{if(!gps)return;const text="My Location Info\n"+gps.lat.toFixed(6)+", "+gps.lon.toFixed(6);if(navigator.share){try{await navigator.share({title:"My Location Info",text})}catch{}}else navigator.clipboard?.writeText(text)};
$("#mapBtn").onclick=()=>{if(gps)location.href="https://www.google.com/maps/search/?api=1&query="+gps.lat+","+gps.lon};
$("#deleteBtn").onclick=async()=>{if(!selected)return alert("Select a saved place first.");if(confirm("Delete this saved place?")){await deletePlace(selected.id);selected=null;renderSaved()}};
$("#copyAddress").onclick=async()=>{const t=$("#addressText").textContent;try{await navigator.clipboard.writeText(t)}catch{}};
$("#addressRefresh").onclick=async()=>{if(!gps){$("#addressStatus").textContent="Waiting for GPS…";return}$("#addressStatus").textContent="Refreshing address…";lastGeo={lat:null,lon:null,time:0};await enrichPlace(gps,true);if(!gps.address)$("#addressStatus").textContent=navigator.onLine?"Address services did not return a result. Tap ↻ again.":"Connect to the Internet and tap ↻.";
};
$("#weatherRefresh").onclick=async e=>{e.preventDefault();e.stopPropagation();const b=$("#weatherRefresh");if(b.dataset.busy)return;b.dataset.busy="1";b.textContent="…";$("#weatherUpdated").textContent="Refreshing weather…";try{await renderWeather()}catch{$("#weatherUpdated").textContent="Weather could not be fetched."}finally{delete b.dataset.busy;b.textContent="↻"};};

$("#infoBtn").onclick=()=>alert("My Location Info\nThe Earth is a live WebGL globe. GPS remains the authoritative position and core GPS functions work offline.");$("#settingsBtn").onclick=()=>alert("Settings will include units, compass behavior, API services and backup.");
onGPS(p=>{gps=p;renderAll();enrichPlace(p);if(location.hash==="#weather")renderWeather();if(location.hash==="#address")enrichPlace(p)});window.addEventListener("online",()=>{renderAll();if(gps){enrichPlace(gps);if(location.hash==="#weather")renderWeather();if(location.hash==="#address")enrichPlace(gps)}});window.addEventListener("pageshow",()=>{resizeGlobe($("#globe"));resizeGlobe($("#positionGlobe"));if(gps)renderAll()});window.addEventListener("resize",()=>{resizeGlobe($("#globe"));resizeGlobe($("#positionGlobe"))});document.addEventListener("visibilitychange",()=>{if(!document.hidden)renderAll()});
if("serviceWorker"in navigator)navigator.serviceWorker.register("./sw.js").catch(()=>{});startGPS();show(location.hash.slice(1)||"home");

function copyText(t){if(!t||t==="—")return;try{navigator.clipboard?.writeText(t)}catch{}}
document.addEventListener("click",e=>{
 const cardEl=e.target.closest(".data-card,.weather-card");
 if(cardEl){
   const b=cardEl.querySelector("b");if(b)copyText(b.textContent);
 }
 const tab=e.target.closest(".weather-tabs button");
 if(tab){
   $$(".weather-tabs button").forEach(x=>x.classList.remove("active"));tab.classList.add("active");
   const i=[...$$(".weather-tabs button")].indexOf(tab);
   const msg=["Current conditions","Hourly forecast","3-day forecast","Radar view is available when a radar provider is connected","Weather map is available when a map provider is connected"][i]||"";
   $("#weatherUpdated").textContent=msg;
 }
});
