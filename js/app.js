import{startGPS,onGPS}from "./gps.js";
import{dms,plusCode,bearingName}from "./coordinates.js";
import{moonPhase}from "./astronomy.js";
import{getDigiPin,isIndiaForDigiPin}from "./digipin.js";
import{savePlace,getPlaces,deletePlace}from "./storage.js";
import{enableCompass,onHeading,isActive}from "./compass.js";
import{getWeather}from "./services/weather.js";
import{reverseGeocode}from "./services/location.js";
import{initGlobe,updateGlobe,resizeGlobe,recenterGlobe,restoreGlobe}from "./globe.js";

const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
let gps=null,selected=null,currentHeading=null,lastGeo={lat:null,lon:null,time:0},geoBusy=false,weatherBusy=false,lastWeather=null,lastWeatherAt=0,weatherRequestId=0,lastAddress={lat:null,lon:null,place:"",address:"",postcode:"",district:"",state:"",country:""};
const views={home:"homeView",position:"positionView",gps:"gpsView",address:"addressView",weather:"weatherView"};

const infoDescriptions={
"gps-status":["GPS Status","Shows whether the browser is actively receiving location fixes.","📡"],
"location-fix":["Location Fix","Available means a usable latitude and longitude have been received.","◎"],
"accuracy":["Accuracy","The estimated horizontal uncertainty of the current position.","🎯"],
"elevation":["Elevation","Approximate height above mean sea level when altitude is supplied by the device.","↕"],
"speed":["Speed","Current movement speed supplied by the location service. If no speed is supplied, the app displays 0.0 km/h.","↝"],
"heading":["Heading","Direction in degrees. When the live compass is active, this comes from the device orientation sensor.","🧭"],
"date":["Date","The date attached to the current GPS measurement.","📅"],
"time":["Time","The local time attached to the current GPS measurement.","◷"],
"time-zone":["Time Zone","The device time-zone identifier used for local date and time.","🌐"],
"compass":["Compass","Shows whether the device compass has been enabled.","🧭"],
"latitude":["Latitude","Position north or south of the Equator.","N"],
"longitude":["Longitude","Position east or west of the Prime Meridian.","E"],
"dms-latitude":["DMS Latitude","Degrees, minutes and seconds notation for latitude.","N"],
"dms-longitude":["DMS Longitude","Degrees, minutes and seconds notation for longitude.","E"],
"plus-code":["Plus Code","A compact location code derived from latitude and longitude.","＋"],
"digipin":["DIGIPIN","India Post digital addressing code calculated from the location grid.","▦"],
"place":["Place","The locality identified for the current coordinates.","⌖"],
"district":["District","The administrative district associated with the coordinates.","▤"],
"feels-like":["Feels like","Apparent temperature combines air temperature with other weather factors.","🌡"],
"wind":["Wind","Current wind speed at the weather location.","💨"],
"gusts":["Gusts","The strongest short-term wind gust reported in the weather data.","≋"],
"visibility":["Visibility","Approximate horizontal visibility in kilometres.","◉"],
"humidity":["Humidity","Relative humidity is the percentage of moisture in the air.","💧"],
"clouds":["Cloud cover","Estimated fraction of the sky covered by clouds.","☁"],
"uv-index":["UV Index","Ultraviolet radiation index indicating potential UV exposure.","☀"],
"air-quality-aqi":["Air Quality (AQI)","Air Quality Index from available air-quality data. The provider may report US AQI or European AQI.","AQ"],
"air-pressure":["Air Pressure","Atmospheric pressure, normally expressed in hPa.","P"],
"dew-point":["Dew Point","Temperature at which air becomes saturated with water vapour.","💧"],
"precipitation":["Precipitation","Precipitation amount for the current weather interval.","☔"],
"chance-of-rain":["Chance of Rain","Forecast probability of precipitation.","☂"],
"sunrise":["Sunrise","Local time when the Sun rises above the horizon.","🌅"],
"sunset":["Sunset","Local time when the Sun sets below the horizon.","🌇"],
"moon-phase":["Moon Phase","The Moon phase is calculated locally. Tap to see its current shape and a brief explanation.","☾"]
};

function card(label,value){
 const key=String(label).toLowerCase().replace(/[^a-z0-9]+/g,"-");
 return'<div class="data-card" role="button" tabindex="0" data-info-key="'+key+'"><label>'+label+'</label><b>'+value+'</b></div>';
}
function placeName(p){
 if(!p)return"Waiting for GPS…";
 if(p.place)return p.place;
 if(p.lat>=10.1&&p.lat<=10.85&&p.lon>=75.9&&p.lon<=76.8)return"Thrissur";
 if(isIndiaForDigiPin(p.lat,p.lon))return"India";
 return"Location";
}
function distanceMeters(a,b,c,d){
 const R=6371000,rad=Math.PI/180,la1=a*rad,la2=c*rad,dl=(c-a)*rad,dlo=(d-b)*rad;
 const x=Math.sin(dl/2)**2+Math.cos(la1)*Math.cos(la2)*Math.sin(dlo/2)**2;
 return 2*R*Math.asin(Math.sqrt(x));
}
async function enrichPlace(p,force=false){
 if((geoBusy&&!force)||!navigator.onLine||!p||!Number.isFinite(p.lat)||!Number.isFinite(p.lon))return;
 const now=Date.now();
 if(!force&&lastGeo.lat!==null&&(now-lastGeo.time<60000||distanceMeters(lastGeo.lat,lastGeo.lon,p.lat,p.lon)<150))return;
 const status=$("#addressStatus");
 if(status)status.textContent=force?"Refreshing address…":"Fetching address…";
 geoBusy=true;
 try{
  const r=await reverseGeocode(p.lat,p.lon);
  if(r?.ok){
   const place=r.locality||r.label||p.place||"";const address=r.address||p.address||"";const postcode=r.postcode||p.postcode||"";const district=r.district||p.district||"";const state=r.state||p.state||"";const country=r.country||p.country||"";
   Object.assign(lastAddress,{lat:p.lat,lon:p.lon,place,address,postcode,district,state,country});Object.assign(p,{place,address,postcode,district,state,country});
   if(!p.district&&p.lat>=10.1&&p.lat<=10.85&&p.lon>=75.9&&p.lon<=76.8)p.district="Thrissur";
   lastGeo={lat:p.lat,lon:p.lon,time:Date.now()};
   if(status)status.textContent="Address updated";
   renderAll();
  }else if(status)status.textContent="Address fetch failed — tap ↻ to retry.";
 }catch{if(status)status.textContent="Address fetch failed — tap ↻ to retry."}
 finally{geoBusy=false}
}

function renderAll(){
 const waiting=$("#globeWaiting");
 if(!gps||!Number.isFinite(gps.lat)||!Number.isFinite(gps.lon)){
  waiting?.classList.remove("hidden");
  return;
 }
 const p=gps,d=new Date(p.time||Date.now());
 const a=lastAddress.lat!==null&&distanceMeters(lastAddress.lat,lastAddress.lon,p.lat,p.lon)<150?lastAddress:null;
 if(a)Object.assign(p,{place:a.place,address:a.address,postcode:a.postcode,district:a.district,state:a.state,country:a.country});
 const pin=isIndiaForDigiPin(p.lat,p.lon)?getDigiPin(p.lat,p.lon):"Not available outside India";
 const heading=Number.isFinite(currentHeading)?currentHeading:Number.isFinite(p.heading)?p.heading:null;
 const head=Number.isFinite(heading)?Math.round(heading)+"° "+bearingName(heading):"Unavailable";
 const spd=Number.isFinite(p.speed)&&p.speed>=0?(p.speed*3.6).toFixed(1)+" km/h":"0.0 km/h";
 const name=placeName(p);
 waiting?.classList.add("hidden");
 const place=$("#positionPlace"),latlon=$("#positionLatLon"),acc=$("#positionAccuracy");
 if(place)place.textContent=name;
 if(latlon)latlon.textContent=p.lat.toFixed(6)+"° "+(p.lat>=0?"N":"S")+" · "+p.lon.toFixed(6)+"° "+(p.lon>=0?"E":"W");
 if(acc)acc.textContent="Accuracy "+(Number.isFinite(p.accuracy)?Math.round(p.accuracy):"—")+" m";
 const pd=$("#positionData");
 if(pd)pd.innerHTML=[
  card("Latitude",p.lat.toFixed(6)+"°"),card("Longitude",p.lon.toFixed(6)+"°"),
  card("DMS Latitude",dms(p.lat,true)),card("DMS Longitude",dms(p.lon,false)),
  card("Plus Code",plusCode(p.lat,p.lon)),card("DIGIPIN",pin),
  card("Elevation",Number.isFinite(p.altitude)?Math.round(p.altitude)+" m":"Unavailable"),
  card("Accuracy",Number.isFinite(p.accuracy)?Math.round(p.accuracy)+" m":"Unavailable")
 ].join("");
 const gd=$("#gpsData");
 if(gd)gd.innerHTML=[
  card("GPS Status",p.error?"WAITING":"ACTIVE"),card("Location Fix",p.error?"Last fix retained":"Available"),
  card("Accuracy",Number.isFinite(p.accuracy)?Math.round(p.accuracy)+" m":"Unavailable"),
  card("Elevation",Number.isFinite(p.altitude)?Math.round(p.altitude)+" m":"Unavailable"),
  card("Speed",spd),card("Heading",head),card("Date",d.toLocaleDateString()),card("Time",d.toLocaleTimeString()),
  card("Time Zone",Intl.DateTimeFormat().resolvedOptions().timeZone),card("Compass",isActive()?"Active":"Not active")
 ].join("");
 const as=$("#addressStatus"),at=$("#addressText");
 if(as)as.textContent=p.address?(p.error?"GPS fix retained · address updated":"Address updated · GPS coordinates current"):(p.error?"GPS fix retained · address enrichment needs a connection":"Fetching address…");
 if(at)at.textContent=p.address||"Address will be available when data is connected.";
 const ad=$("#addressData");
 if(ad)ad.innerHTML=[card("Latitude",p.lat.toFixed(6)),card("Longitude",p.lon.toFixed(6)),card("Place",name),card("District",p.district||"—")].join("");
 const postal=$("#postalInfo");
 if(postal)postal.innerHTML="<div><span>Postcode</span><b>"+(p.postcode||"—")+"</b></div><div><span>DIGIPIN</span><b>"+pin+"</b></div>";
 updateGlobe($("#globe"),p);updateGlobe($("#positionGlobe"),p);
}

async function renderSaved(){
 const el=$("#savedPlaces");if(!el)return;
 const list=await getPlaces().catch(()=>[]);
 el.innerHTML=list.length?list.map(p=>'<button class="saved-card" data-id="'+p.id+'"><b>'+p.label+"</b><small>"+p.lat.toFixed(5)+", "+p.lon.toFixed(5)+"</small><small>"+new Date(p.time).toLocaleString()+"</small></button>").join(""):'<div class="empty-saved">No saved places yet. Save the current position below.</div>';
 $$(".saved-card").forEach(b=>b.onclick=()=>{selected=list.find(p=>p.id===b.dataset.id)||null;actionNote(selected?"Saved place selected":"")});
}

const weatherLabels=["Feels like","Wind","Gusts","Visibility","Humidity","Clouds","UV Index","Air Quality (AQI)","Air Pressure","Dew Point","Precipitation","Chance of Rain","Sunrise","Sunset","Moon Phase"];

async function renderWeather(force=false){
 const g=$("#weatherGrid");
 if(!g)return;
 if(!gps||!Number.isFinite(gps.lat)||!Number.isFinite(gps.lon)){
  if(!g.children.length)g.innerHTML=weatherLabels.map(x=>'<button class="weather-card" data-info-key="'+x.toLowerCase().replace(/[^a-z0-9]+/g,"-")+'"><label>'+x+"</label><b>—</b><small>Waiting for GPS</small></button>").join("");
  $("#weatherUpdated").textContent="Waiting for GPS";return;
 }
 if(weatherBusy&&!force)return;
 const requestId=++weatherRequestId;weatherBusy=true;
 const old=lastWeather;
 if(!g.children.length)g.innerHTML=weatherLabels.map(x=>'<button class="weather-card" data-info-key="'+x.toLowerCase().replace(/[^a-z0-9]+/g,"-")+'"><label>'+x+"</label><b>—</b><small>Fetching weather…</small></button>").join("");
 $("#weatherUpdated").textContent=old?.message||"Fetching weather…";
 try{
  const r=await getWeather(gps.lat,gps.lon);
  if(requestId!==weatherRequestId)return;
  if(!r.ok){$("#weatherUpdated").textContent=old?.message?old.message+" · refresh failed; last data retained":(r.message||"Weather unavailable — tap ↻ to try again.");return;}
  lastWeather=r;lastWeatherAt=Date.now();
  const c=r.current||{},d=r.daily||{},code=Number(c.weather_code);
  const labels={0:"Clear sky",1:"Mainly clear",2:"Partly cloudy",3:"Overcast",45:"Fog",48:"Rime fog",51:"Light drizzle",53:"Drizzle",55:"Dense drizzle",61:"Light rain",63:"Rain",65:"Heavy rain",71:"Light snow",73:"Snow",75:"Heavy snow",80:"Rain showers",81:"Rain showers",82:"Heavy showers",95:"Thunderstorm",96:"Thunderstorm",99:"Thunderstorm"};
  $("#weatherTemp").textContent=Number.isFinite(c.temperature_2m)?Math.round(c.temperature_2m)+"°C":"—";
  $("#weatherCondition").textContent=labels[code]||"Current conditions";
  $("#weatherUpdated").textContent=(r.message||"Updated")+(r.provider?" · "+r.provider:"");
  const aq=r.airQuality||{},moon=moonPhase(new Date());
  const aqValue=Number.isFinite(aq.us_aqi)?Math.round(aq.us_aqi)+" US":Number.isFinite(aq.european_aqi)?Math.round(aq.european_aqi)+" EU":"Unavailable";
  const vals=[
   Number.isFinite(c.apparent_temperature)?c.apparent_temperature.toFixed(1)+"°C":"—",
   Number.isFinite(c.wind_speed_10m)?c.wind_speed_10m.toFixed(1)+" km/h":"—",
   Number.isFinite(c.wind_gusts_10m)?c.wind_gusts_10m.toFixed(1)+" km/h":"—",
   Number.isFinite(c.visibility)?(c.visibility/1000).toFixed(1)+" km":"—",
   Number.isFinite(c.relative_humidity_2m)?c.relative_humidity_2m+" %":"—",
   Number.isFinite(c.cloud_cover)?c.cloud_cover+" %":"—",
   Number.isFinite(c.uv_index)?c.uv_index.toFixed(1):"—",aqValue,
   Number.isFinite(c.surface_pressure)?Math.round(c.surface_pressure)+" hPa":"—",
   Number.isFinite(c.dew_point_2m)?c.dew_point_2m.toFixed(1)+"°C":"—",
   Number.isFinite(c.precipitation)?c.precipitation+" mm":"—",
   Number.isFinite(d.precipitation_probability_max?.[0])?d.precipitation_probability_max[0]+" %":"—",
   d.sunrise?.[0]?new Date(d.sunrise[0]).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}):"—",
   d.sunset?.[0]?new Date(d.sunset[0]).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}):"—",moon.name
  ];
  g.querySelectorAll(".weather-card").forEach((el,i)=>{el.dataset.infoKey=weatherLabels[i].toLowerCase().replace(/[^a-z0-9]+/g,"-");const b=el.querySelector("b"),small=el.querySelector("small");if(b)b.textContent=vals[i]??"—";if(small)small.textContent=i===7&&aqValue==="Unavailable"?"AQI service unavailable":(r.provider||"Updated")});
 }finally{weatherBusy=false}
}

function actionNote(message){const el=$("#actionStatus");if(el)el.textContent=message}

function show(v){
 v=views[v]?v:"home";
 document.body.classList.toggle("detail-mode",v!=="home");
 $$(".view").forEach(x=>x.classList.remove("active"));
 $("#"+views[v]).classList.add("active");
 history.replaceState({v},"","#"+v);
 window.scrollTo(0,0);
 if(v==="position"){renderSaved();setTimeout(()=>{resizeGlobe($("#positionGlobe"));if(gps)recenterGlobe($("#positionGlobe"),gps)},80)}
 if(v==="address"&&gps){renderAll();if(!gps.address)enrichPlace(gps);}
 if(v==="weather"&&gps)renderWeather(true);
 if(v==="home"){restoreGlobe($("#globe"));if(gps)setTimeout(()=>recenterGlobe($("#globe"),gps),180);}
 renderAll();
}

function moonPhaseDescription(m){
 const n=m.name;
 if(n==="Waxing Gibbous")return"More than half of the Moon is illuminated, and the illuminated portion is growing toward Full Moon.";
 if(n==="Waning Gibbous")return"More than half is illuminated, but the illuminated portion is shrinking after Full Moon.";
 if(n==="First Quarter")return"About half of the visible Moon is illuminated, and the illuminated portion is increasing.";
 if(n==="Last Quarter")return"About half is illuminated, and the illuminated portion is decreasing.";
 if(n==="Waxing Crescent")return"A thin illuminated crescent is growing toward First Quarter.";
 if(n==="Waning Crescent")return"A thin illuminated crescent is shrinking toward New Moon.";
 if(n==="Full Moon")return"The Earth-facing side is nearly fully illuminated.";
 return"The Moon is near New Moon, when the Earth-facing side is mostly unilluminated.";
}
function moonVisual(m){
 const f=Math.max(0,Math.min(1,m.illumination)),R=42,rx=Math.max(.5,Math.abs(2*f-1)*R),waxing=m.age<14.7652944265;
 let path="";
 if(f<.001)path='<circle cx="50" cy="50" r="42" fill="#071b2d"/>';
 else if(f>.999)path='<circle cx="50" cy="50" r="42" fill="#f4f0d5"/>';
 else if(waxing)path='<path d="M50 8 A42 42 0 0 1 50 92 A '+rx+' 42 0 0 0 50 8 Z" fill="#f4f0d5"/>';
 else path='<path d="M50 8 A42 42 0 0 0 50 92 A '+rx+' 42 0 0 1 50 8 Z" fill="#f4f0d5"/>';
 return'<div class="moon-visual"><svg class="moon-svg" viewBox="0 0 100 100" role="img" aria-label="'+m.name+', '+Math.round(f*100)+'% illuminated"><circle cx="50" cy="50" r="42" fill="#071b2d"/>'+path+'</svg><b>'+m.name+'</b><small>'+Math.round(f*100)+"% illuminated</small></div>";
}
function showInfo(label,value){
 const key=String(label).toLowerCase().replace(/[^a-z0-9]+/g,"-"),info=infoDescriptions[key],sheet=$("#infoSheet");
 if(!info||!sheet)return;
 const m=key==="moon-phase"?moonPhase(new Date()):null;
 $("#infoTitle").textContent=info[0];$("#infoDescription").textContent=m?moonPhaseDescription(m):info[1];
 const v=$("#infoVisual");v.innerHTML=m?moonVisual(m):'<div class="info-symbol">'+info[2]+'</div><small>'+String(value||"Current value")+"</small>";
 sheet.classList.add("open");sheet.setAttribute("aria-hidden","false");
}
function closeInfo(){const s=$("#infoSheet");if(s){s.classList.remove("open");s.setAttribute("aria-hidden","true")}}
async function copyText(t){if(!t||t==="—")return;try{if(navigator.clipboard)await navigator.clipboard.writeText(t);actionNote("Copied")}catch{}}

function weatherTab(i){
 $$(".weather-tabs button").forEach((x,n)=>x.classList.toggle("active",n===i));
 if(i===0){renderWeather(true);return}
 if(!lastWeather){renderWeather(true);return}
 const g=$("#weatherGrid"),h=lastWeather.hourly||{},d=lastWeather.daily||{};
 if(i===1){
  const times=h.time||[],temps=h.temperature_2m||[],probs=h.precipitation_probability||[],rows=[];
  let start=times.findIndex(t=>new Date(t)>=new Date());if(start<0)start=0;
  for(let j=start;j<Math.min(start+12,times.length);j++){const t=new Date(times[j]).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"});rows.push('<div class="weather-card"><label>'+t+"</label><b>"+(Number.isFinite(temps[j])?temps[j].toFixed(1)+"°C":"—")+"</b><small>Rain chance "+(Number.isFinite(probs[j])?probs[j]+"%":"—")+"</small></div>")}
  g.innerHTML=rows.join("")||'<div class="weather-card weather-message"><b>Hourly data unavailable</b><small>Refresh weather to try again.</small></div>';
  $("#weatherUpdated").textContent="Hourly forecast · "+(lastWeather.provider||"weather service");return;
 }
 if(i===2){
  const dates=d.time||[],max=d.temperature_2m_max||[],min=d.temperature_2m_min||[],rows=[];
  for(let j=0;j<Math.min(3,dates.length);j++){const day=new Date(dates[j]+"T12:00:00").toLocaleDateString([],{weekday:"short",day:"numeric",month:"short"});rows.push('<div class="weather-card"><label>'+day+"</label><b>"+(Number.isFinite(max[j])?Math.round(max[j])+"°":"—")+" / "+(Number.isFinite(min[j])?Math.round(min[j])+"°C":"—")+"</b><small>High / Low</small></div>")}
  g.innerHTML=rows.join("")||'<div class="weather-card weather-message"><b>Daily data unavailable</b><small>Refresh weather to try again.</small></div>';
  $("#weatherUpdated").textContent="3-day forecast · "+(lastWeather.provider||"weather service");return;
 }
 const title=i===3?"Radar":"Map",msg=i===3?"Radar requires a radar provider.":"Map requires a map provider. Use MAP on Position for navigation.";
 g.innerHTML='<div class="weather-card weather-message" style="grid-column:1/-1;min-height:110px"><b>'+title+"</b><small>"+msg+"</small></div>";
 $("#weatherUpdated").textContent=title+" · provider not connected";
}

function bindWeatherTabs(){$(".weather-tabs button").forEach((b,i)=>b.onclick=e=>{e.preventDefault();e.stopPropagation();weatherTab(i)})}
function wireEvents(){
 $$("[data-view]").forEach(b=>b.onclick=()=>show(b.dataset.view));
 $$("[data-back]").forEach(b=>b.onclick=()=>show("home"));
 $("#addressRefresh").onclick=()=>gps?enrichPlace(gps,true):actionNote("Waiting for GPS");
 $("#weatherRefresh").onclick=()=>{lastWeather=null;lastWeatherAt=0;$("#weatherGrid").innerHTML="";renderWeather(true)};
 $("#compassBtn").onclick=async()=>{const ok=await enableCompass();$("#compassStatus").textContent=ok?"Active":"Unavailable — tap again if iOS requests permission";$("#compassBtn").textContent=ok?"COMPASS ACTIVE":"ENABLE COMPASS";$("#compassBtn").classList.toggle("is-active",ok)};
 $("#saveBtn").onclick=async e=>{e.preventDefault();if(!gps){actionNote("Waiting for GPS…");return}try{const s={id:crypto.randomUUID(),time:gps.time,lat:gps.lat,lon:gps.lon,accuracy:gps.accuracy,altitude:gps.altitude,speed:gps.speed,heading:gps.heading,label:placeName(gps)};await savePlace(s);selected=s;await renderSaved();actionNote("Location saved")}catch{actionNote("Could not save location")}};
 $("#shareBtn").onclick=async e=>{e.preventDefault();if(!gps){actionNote("Waiting for GPS…");return}const text="My Location Info\n"+gps.lat.toFixed(6)+", "+gps.lon.toFixed(6);try{if(navigator.share)await navigator.share({title:"My Location Info",text});else if(navigator.clipboard)await navigator.clipboard.writeText(text);actionNote("Location shared")}catch(err){if(err?.name!=="AbortError")actionNote("Share unavailable")}};
 $("#mapBtn").onclick=e=>{e.preventDefault();if(gps){location.href="https://maps.apple.com/?ll="+gps.lat+","+gps.lon+"&q="+encodeURIComponent(placeName(gps));}else actionNote("Waiting for GPS…")};
 $("#deleteBtn").onclick=async e=>{e.preventDefault();if(!selected){actionNote("Select a saved place first");return}if(confirm("Delete this saved place?"))try{await deletePlace(selected.id);selected=null;await renderSaved();actionNote("Saved place deleted")}catch{actionNote("Could not delete saved place")}};
 $("#infoBtn").onclick=()=>alert("My Location Info\nThe Earth is a live WebGL globe. GPS is the authoritative position; core GPS functions continue to work without a network connection.");
 $("#settingsBtn").onclick=()=>alert("Settings will include units, compass behavior, API services and backup.");
 $("#copyAddress").onclick=async()=>{const t=$("#addressText")?.textContent;if(t&&t!=="Address will be available when data is connected.")await copyText(t)};
 $("#installBtn").onclick=async()=>{if(deferredInstallPrompt){const p=deferredInstallPrompt;deferredInstallPrompt=null;updateInstallButton();try{await p.prompt();await p.userChoice}catch{}return}if(isIOS())showInfo("Add to Home Screen","In Safari, tap Share, choose Add to Home Screen, enable Open as Web App, then tap Add.");else showInfo("Install App","Use the browser's Install or Add to Home Screen command. Supported Android browsers may also show an install prompt.")};
}

document.addEventListener("click",e=>{
 if(e.target.closest("[data-info-close]")){closeInfo();return}
 const cardEl=e.target.closest(".data-card,.weather-card");
 if(cardEl&&!e.target.closest("button")){showInfo(cardEl.dataset.infoKey||cardEl.querySelector("label")?.textContent||"",cardEl.querySelector("b")?.textContent||"");return}
 const tab=e.target.closest(".weather-tabs button");
 if(tab){e.preventDefault();weatherTab([...$$(".weather-tabs button")].indexOf(tab));return}
 if(cardEl){showInfo(cardEl.dataset.infoKey||cardEl.querySelector("label")?.textContent||"",cardEl.querySelector("b")?.textContent||"")}
});
document.addEventListener("keydown",e=>{if(e.key==="Escape")closeInfo();if((e.key==="Enter"||e.key===" ")&&document.activeElement?.matches(".data-card,.weather-card")){e.preventDefault();document.activeElement.click()}});

onHeading(h=>{currentHeading=(h+360)%360;if(gps)gps.heading=currentHeading;const hv=$("#headingValue"),hd=$("#headingDir"),cs=$("#compassStatus"),dial=$("#compassRing .compass-dial");if(hv)hv.textContent=Math.round(currentHeading)+"°";if(hd)hd.textContent=bearingName(currentHeading);if(cs)cs.textContent="Active";if(dial)dial.style.transform="rotate("+(-currentHeading)+"deg)";renderAll()});
onGPS(p=>{const moved=Number.isFinite(gps?.lat)&&Number.isFinite(gps?.lon)&&Number.isFinite(p?.lat)&&Number.isFinite(p?.lon)&&distanceMeters(gps.lat,gps.lon,p.lat,p.lon)>=150;if(moved){lastAddress={lat:null,lon:null,place:"",address:"",postcode:"",district:"",state:"",country:""};lastGeo={lat:null,lon:null,time:0}}gps=p;renderAll();if(p&&!p.error)enrichPlace(p);if(!p.error&&(!lastWeather||Date.now()-lastWeatherAt>300000)&&navigator.onLine)renderWeather(true)});

let deferredInstallPrompt=null;
function isStandalone(){return window.matchMedia?.("(display-mode: standalone)").matches||window.navigator.standalone===true}
function isIOS(){return /iphone|ipad|ipod/i.test(navigator.userAgent)}
function updateInstallButton(){const b=$("#installBtn");if(!b)return;if(isStandalone()){b.hidden=true;return}b.hidden=false;b.textContent=deferredInstallPrompt?"Install App":(isIOS()?"Add to Home Screen":"Install App")}
window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();deferredInstallPrompt=e;updateInstallButton()});
window.addEventListener("appinstalled",()=>{deferredInstallPrompt=null;updateInstallButton()});
window.addEventListener("online",()=>{renderAll();if(gps){enrichPlace(gps,true);lastWeather=null;lastWeatherAt=0;renderWeather(true)}});

function refreshGlobe(){restoreGlobe($("#globe"));resizeGlobe($("#globe"));resizeGlobe($("#positionGlobe"));if(gps&&location.hash==="#home")setTimeout(()=>recenterGlobe($("#globe"),gps),180)}
window.addEventListener("pageshow",refreshGlobe);
window.addEventListener("resize",refreshGlobe);
document.addEventListener("visibilitychange",()=>{if(!document.hidden)refreshGlobe()});
window.addEventListener("orientationchange",()=>setTimeout(refreshGlobe,180));

wireEvents();bindWeatherTabs();updateInstallButton();
if("serviceWorker"in navigator)navigator.serviceWorker.register("./sw.js").catch(()=>{});
startGPS();show(location.hash.slice(1)||"home");
