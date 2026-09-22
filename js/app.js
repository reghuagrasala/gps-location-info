import{startGPS,retryGPS,onGPS,diagnostic}from "./gps.js?v=30";
import{dms,plusCode,bearingName}from "./coordinates.js";
import{getDigiPin,isIndiaForDigiPin}from "./digipin.js";
import{enableCompass,onHeading,isActive}from "./compass.js";
import{getWeather}from "./services/weather.js";
import{reverseGeocode}from "./services/location.js";
import{initGlobe,updateGlobe,resizeGlobe,recenterGlobe,restoreGlobe}from "./globe.js";

const $=id=>document.getElementById(id);
let gps=null,lastAddress=null,lastWeather=null,lastWeatherAt=0,currentHeading=null,addressBusy=false;

function card(label,value){
 return '<div class="data-card" role="button" tabindex="0"><label>'+label+'</label><b>'+String(value??"—")+'</b></div>';
}
function distance(a,b,c,d){
 const R=6371000,r=Math.PI/180,x=Math.sin((c-a)*r/2)**2+Math.cos(a*r)*Math.cos(c*r)*Math.sin((d-b)*r/2)**2;
 return 2*R*Math.asin(Math.sqrt(x));
}
function placeName(){
 return lastAddress?.locality||lastAddress?.label||"Location";
}
function updateGPSDiagnostic(p){
 const box=$("gpsDiagnostic");if(!box)return;
 const api=navigator.geolocation?"AVAILABLE":"UNSUPPORTED";
 const secure=window.isSecureContext?"secure":"NOT secure";
 $("gpsDiagApi").textContent="API: "+api+" · Context: "+secure;
 if(navigator.permissions?.query){
  navigator.permissions.query({name:"geolocation"}).then(x=>{
   $("gpsDiagPermission").textContent="Permission: "+x.state;
  }).catch(()=>{$("gpsDiagPermission").textContent="Permission: unavailable"});
 }else $("gpsDiagPermission").textContent="Permission: unavailable";
 const d=diagnostic(),at=d.lastEventAt?new Date(d.lastEventAt).toLocaleTimeString():"—";
 if(p?.error){
  $("gpsDiagEvent").textContent=(p.errorName||"ERROR")+" · "+p.source+" · "+at;
  box.classList.remove("ok");box.classList.add("error");
 }else if(Number.isFinite(p?.lat)){
  $("gpsDiagEvent").textContent="SUCCESS · "+(p.source||"GPS")+" · accuracy "+(Number.isFinite(p.accuracy)?Math.round(p.accuracy)+" m":"—")+" · "+at;
  box.classList.add("ok");box.classList.remove("error");
 }else{
  $("gpsDiagEvent").textContent=d.starting?"Request sent · waiting for callback…":"No GPS callback yet";
  box.classList.remove("ok","error");
 }
}


function render(){
 const p=gps;
 const overlay=$("gpsOverlay"),status=$("globeStatus");
 if(!p||!Number.isFinite(p.lat)||!Number.isFinite(p.lon)){
  overlay?.classList.remove("ok");
  if(p?.error){overlay?.classList.add("error");overlay.querySelector("b").textContent=p.error+" · Tap to retry"}
  else overlay?.querySelector("b").textContent="Getting GPS…";
  if(status)status.textContent=p?.error||"GPS starting · Drag · pinch · zoom";
  $("placeName").textContent="Waiting for GPS…";$("latlon").textContent="—";$("accuracy").textContent="Accuracy —";
  $("positionData").innerHTML=[
   card("Latitude","Waiting for GPS…"),card("Longitude","Waiting for GPS…"),
   card("DMS Latitude","—"),card("DMS Longitude","—"),card("Plus Code","—"),card("DIGIPIN","—"),
   card("Elevation","Unavailable"),card("Accuracy","Unavailable")
  ].join("");
  $("gpsData").innerHTML=[
   card("GPS Status",p?.error?"ERROR":"WAITING"),card("Location Fix","Waiting for GPS"),
   card("Accuracy","Unavailable"),card("Elevation","Unavailable"),card("Speed","0.0 km/h"),
   card("Heading","Unavailable"),card("Date","—"),card("Time","—"),
   card("Time Zone",Intl.DateTimeFormat().resolvedOptions().timeZone),card("Compass",isActive()?"Active":"Not active")
  ].join("");
  $("addressData").innerHTML=[card("Latitude","—"),card("Longitude","—"),card("Place","Waiting for GPS…"),card("District","—")].join("");
  return;
 }
 overlay?.classList.add("ok");overlay?.classList.remove("error");
 const statusText=navigator.onLine?"GPS active":"GPS active · Offline";
 if(status)status.textContent=statusText+" · Drag · pinch · zoom";
 const lat=p.lat,lon=p.lon,pin=isIndiaForDigiPin(lat,lon)?getDigiPin(lat,lon):"Not available outside India";
 const hd=Number.isFinite(currentHeading)?currentHeading:(Number.isFinite(p.heading)?p.heading:null);
 const speed=Number.isFinite(p.speed)&&p.speed>=0?(p.speed*3.6).toFixed(1)+" km/h":"0.0 km/h";
 const d=new Date(p.time||Date.now()),name=placeName();
 $("placeName").textContent=name;$("latlon").textContent=lat.toFixed(6)+"° "+(lat>=0?"N":"S")+" · "+lon.toFixed(6)+"° "+(lon>=0?"E":"W");
 $("accuracy").textContent="Accuracy "+(Number.isFinite(p.accuracy)?Math.round(p.accuracy):"—")+" m";
 $("positionData").innerHTML=[
  card("Latitude",lat.toFixed(6)+"°"),card("Longitude",lon.toFixed(6)+"°"),
  card("DMS Latitude",dms(lat,true)),card("DMS Longitude",dms(lon,false)),
  card("Plus Code",plusCode(lat,lon)),card("DIGIPIN",pin),
  card("Elevation",Number.isFinite(p.altitude)?Math.round(p.altitude)+" m":"Unavailable"),
  card("Accuracy",Number.isFinite(p.accuracy)?Math.round(p.accuracy)+" m":"Unavailable")
 ].join("");
 $("gpsData").innerHTML=[
  card("GPS Status","ACTIVE"),card("Location Fix","Available"),
  card("Accuracy",Number.isFinite(p.accuracy)?Math.round(p.accuracy)+" m":"Unavailable"),
  card("Elevation",Number.isFinite(p.altitude)?Math.round(p.altitude)+" m":"Unavailable"),
  card("Speed",speed),
  card("Heading",Number.isFinite(hd)?Math.round(hd)+"° ("+bearingName(hd)+")":"Unavailable"),
  card("Date",d.toLocaleDateString()),card("Time",d.toLocaleTimeString()),
  card("Time Zone",Intl.DateTimeFormat().resolvedOptions().timeZone),card("Compass",isActive()?"Active":"Not active")
 ].join("");
 $("addressData").innerHTML=[card("Latitude",lat.toFixed(6)),card("Longitude",lon.toFixed(6)),card("Place",name),card("District",lastAddress?.district||"—")].join("");
 updateGlobe($("globe"),p);updateGlobe($("positionGlobe"),p);
}

async function refreshAddress(force=false){
 if(!gps||!navigator.onLine||addressBusy)return;
 addressBusy=true;$("addressStatus").textContent=force?"Refreshing address…":"Fetching address…";
 try{
  const r=await reverseGeocode(gps.lat,gps.lon);
  if(r?.ok){lastAddress=r;gps.place=r.locality||r.label||"Location";gps.address=r.address||"";gps.postcode=r.postcode||"";gps.district=r.district||"";gps.state=r.state||"";gps.country=r.country||"";$("addressText").textContent=r.address||r.label||"Address unavailable";$("addressStatus").textContent="Address updated";render()}
  else $("addressStatus").textContent="Address unavailable — tap ↻ to retry";
 }catch{$("addressStatus").textContent="Address unavailable — tap ↻ to retry"}
 finally{addressBusy=false}
}

async function refreshWeather(){
 if(!gps||!navigator.onLine)return;
 $("weatherUpdated").textContent="Fetching weather…";
 try{
  const r=await getWeather(gps.lat,gps.lon);
  if(!r.ok){$("weatherUpdated").textContent=r.message||"Weather unavailable";return}
  lastWeather=r;lastWeatherAt=Date.now();
  const c=r.current||{},aq=r.airQuality||{};
  const labels={0:"Clear sky",1:"Mainly clear",2:"Partly cloudy",3:"Overcast",45:"Fog",48:"Rime fog",51:"Drizzle",53:"Drizzle",55:"Dense drizzle",61:"Light rain",63:"Rain",65:"Heavy rain",71:"Snow",73:"Snow",75:"Heavy snow",80:"Rain showers",81:"Rain showers",82:"Heavy showers",95:"Thunderstorm",96:"Thunderstorm",99:"Thunderstorm"};
  $("weatherTemp").textContent=Number.isFinite(c.temperature_2m)?Math.round(c.temperature_2m)+"°C":"—";
  $("weatherCondition").textContent=labels[c.weather_code]||"Current conditions";
  $("weatherUpdated").textContent=r.message||"Updated";
  const aqi=Number.isFinite(aq.us_aqi)?Math.round(aq.us_aqi)+" US":Number.isFinite(aq.european_aqi)?Math.round(aq.european_aqi)+" EU":"Unavailable";
  $("weatherGrid").innerHTML=[
   card("Feels like",Number.isFinite(c.apparent_temperature)?c.apparent_temperature.toFixed(1)+"°C":"—"),
   card("Wind",Number.isFinite(c.wind_speed_10m)?c.wind_speed_10m.toFixed(1)+" km/h":"—"),
   card("Humidity",Number.isFinite(c.relative_humidity_2m)?c.relative_humidity_2m+" %":"—"),
   card("Clouds",Number.isFinite(c.cloud_cover)?c.cloud_cover+" %":"—"),
   card("Visibility",Number.isFinite(c.visibility)?(c.visibility/1000).toFixed(1)+" km":"—"),
   card("UV Index",Number.isFinite(c.uv_index)?c.uv_index.toFixed(1):"—"),
   card("Air Quality",aqi),
   card("Pressure",Number.isFinite(c.surface_pressure)?Math.round(c.surface_pressure)+" hPa":"—")
  ].join("");
 }catch{$("weatherUpdated").textContent="Weather unavailable — tap ↻ to retry"}
}

function show(id){
 document.querySelectorAll(".view").forEach(v=>v.classList.remove("active"));
 ($(id)||$("home")).classList.add("active");
 history.replaceState({}, "", "#"+id);window.scrollTo(0,0);
 if(id==="position")setTimeout(()=>{resizeGlobe($("positionGlobe"));if(gps)recenterGlobe($("positionGlobe"),gps)},100);
 if(id==="home"){restoreGlobe($("globe"));if(gps)setTimeout(()=>recenterGlobe($("globe"),gps),150)}
 if(id==="weather")refreshWeather();
 render();
}

function info(title,text){$("sheetTitle").textContent=title;$("sheetText").textContent=text;$("infoSheet").hidden=false}
function bind(){
 document.querySelectorAll("[data-view]").forEach(b=>b.onclick=()=>show(b.dataset.view));
 document.querySelectorAll("[data-back]").forEach(b=>b.onclick=()=>show("home"));
 $("gpsOverlay").onclick=()=>retryGPS();
 $("gpsRetry").onclick=()=>retryGPS();
 $("globe").onclick=()=>{if(!gps)retryGPS()};
 $("addressRefresh").onclick=()=>refreshAddress(true);
 $("weatherRefresh").onclick=()=>refreshWeather();
 $("copyAddress").onclick=async()=>{const t=$("addressText").textContent;try{await navigator.clipboard?.writeText(t)}catch{}};
 $("saveBtn").onclick=()=>gps?info("Location saved","The current GPS position is available on this device."):retryGPS();
 $("shareBtn").onclick=async()=>{if(!gps)return retryGPS();const t="My Location Info\n"+gps.lat.toFixed(6)+", "+gps.lon.toFixed(6);try{if(navigator.share)await navigator.share({title:"My Location Info",text:t});else await navigator.clipboard?.writeText(t)}catch{}};
 $("mapBtn").onclick=()=>gps?location.href="https://maps.apple.com/?ll="+gps.lat+","+gps.lon+"&q="+encodeURIComponent(placeName()):retryGPS();
 $("compassBtn").onclick=async()=>{const ok=await enableCompass();$("compassStatus").textContent=ok?"Active":"Unavailable";$("compassBtn").textContent=ok?"COMPASS ACTIVE":"ENABLE COMPASS"};
 $("infoBtn").onclick=()=>info("My Location Info","GPS Viewer architecture is used for location acquisition: a fresh GPS request, continuous watch, independent fresh recovery, and foreground refresh. GPS itself does not require an internet connection.");
 $("settingsBtn").onclick=()=>info("GPS settings","High accuracy is enabled. Startup uses a fresh GPS reading, continuous updates use watchPosition, and a separate fresh request runs after startup and when the app returns to the foreground.");
 $("sheetClose").onclick=()=>$("infoSheet").hidden=true;$("infoSheet").querySelector(".sheet-bg").onclick=()=>$("infoSheet").hidden=true;
}
onGPS(p=>{
 updateGPSDiagnostic(p);
 const moved=gps&&Number.isFinite(gps.lat)&&Number.isFinite(gps.lon)&&Number.isFinite(p.lat)&&Number.isFinite(p.lon)&&distance(gps.lat,gps.lon,p.lat,p.lon)>=150;
 if(moved)lastAddress=null;
 gps=p;render();
 if(p&&!p.error){if(moved||!lastAddress)refreshAddress();if(!lastWeather||Date.now()-lastWeatherAt>300000)refreshWeather()}
});
onHeading(h=>{currentHeading=(h+360)%360;if(gps)gps.heading=currentHeading;$("headingValue").textContent=Math.round(currentHeading)+"°";$("headingDir").textContent=bearingName(currentHeading);$("compassStatus").textContent="Active";$("compassDial").style.transform="rotate("+(-currentHeading)+"deg)";render()});
document.addEventListener("visibilitychange",()=>{if(!document.hidden){restoreGlobe($("globe"));if(gps)setTimeout(()=>recenterGlobe($("globe"),gps),120)}});
window.addEventListener("resize",()=>{resizeGlobe($("globe"));resizeGlobe($("positionGlobe"))});
window.addEventListener("online",()=>{if(gps){refreshAddress(true);refreshWeather()}});
window.addEventListener("offline",()=>{ $("globeStatus").textContent="GPS active · Offline · Drag · pinch · zoom"});
bind();
updateGPSDiagnostic(null);
try{initGlobe($("globe"),{mini:false})}catch(e){$("globeStatus").textContent="Globe unavailable · GPS independent";$("gpsDiagEvent").textContent="Globe error · "+(e?.message||e)}
try{initGlobe($("positionGlobe"),{mini:true})}catch(e){}
render();
try{startGPS()}catch(e){
 $("gpsDiagEvent").textContent="GPS startup error · "+(e?.message||e);
 $("globeStatus").textContent="GPS startup error · Tap RETRY GPS";
}
