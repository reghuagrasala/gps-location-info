const FALLBACK_URL="https://api.open-meteo.com/v1/forecast";
const SECONDARY_URL="https://www.7timer.info/bin/api.pl";
async function fetchWithTimeout(url,ms=9000){
 const c=new AbortController(),t=setTimeout(()=>c.abort(),ms);
 try{const r=await fetch(url,{cache:"no-store",signal:c.signal});if(!r.ok)throw new Error("HTTP "+r.status);return await r.json()}finally{clearTimeout(t)}
}
export async function getWeather(lat=null,lon=null){
 if(!Number.isFinite(lat)||!Number.isFinite(lon)||!navigator.onLine)return{ok:false,message:"Weather will be available when data is connected."};
 try{const q=new URL("/api/weather",location.origin);q.searchParams.set("lat",lat.toFixed(6));q.searchParams.set("lon",lon.toFixed(6));const d=await fetchWithTimeout(q.toString(),9000);if(d?.ok)return d}catch{}
 try{
  const u=new URL(FALLBACK_URL);
  u.searchParams.set("latitude",lat.toFixed(6));u.searchParams.set("longitude",lon.toFixed(6));
  u.searchParams.set("current","temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,wind_direction_10m,cloud_cover,surface_pressure,is_day");
  u.searchParams.set("hourly","temperature_2m,relative_humidity_2m,dew_point_2m,precipitation_probability,visibility,wind_gusts_10m,uv_index,weather_code");u.searchParams.set("daily","sunrise,sunset,uv_index_max,precipitation_probability_max");u.searchParams.set("timezone","auto");u.searchParams.set("forecast_days","3");
  const d=await fetchWithTimeout(u.toString());
  if(!d.current)throw new Error("No current weather");
  let airQuality=null;
  try{
   const aq=new URL("https://air-quality-api.open-meteo.com/v1/air-quality");
   aq.searchParams.set("latitude",lat.toFixed(6));aq.searchParams.set("longitude",lon.toFixed(6));
   aq.searchParams.set("current","us_aqi,european_aqi,pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,ozone");
   aq.searchParams.set("timezone","auto");
   const ad=await fetchWithTimeout(aq.toString(),7000);if(ad?.current)airQuality=ad.current;
  }catch{}

  const h=d.hourly||{},now=new Date(d.current.time||Date.now()),times=h.time||[];let i=times.findIndex(t=>new Date(t)>=now);if(i<0)i=0;const current={...d.current};for(const k of ["dew_point_2m","visibility","wind_gusts_10m","uv_index"]){if(!Number.isFinite(current[k])&&Array.isArray(h[k])&&Number.isFinite(h[k][i]))current[k]=h[k][i]}return{ok:true,current,hourly:h,daily:d.daily||{},airQuality,provider:"Open-Meteo",message:"Updated "+new Date(d.current.time||Date.now()).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})};
 }catch{
  try{
   const u=new URL(SECONDARY_URL);u.searchParams.set("lon",lon.toFixed(3));u.searchParams.set("lat",lat.toFixed(3));u.searchParams.set("product","civillight");u.searchParams.set("output","json");
   const d=await fetchWithTimeout(u.toString(),9000),x=d.dataseries?.[0];
   if(!x)throw new Error("No 7Timer data");
   const temp=Number(x.temp2m),rh=Number(x.rh2m),w=String(x.weather||"").toLowerCase();
   const code=w.includes("thunder")?95:w.includes("rain")||w.includes("shower")?63:w.includes("cloud")?2:0;
   return{ok:true,current:{temperature_2m:Number.isFinite(temp)?temp:null,apparent_temperature:Number.isFinite(temp)?temp:null,relative_humidity_2m:Number.isFinite(rh)?rh:null,weather_code:code,wind_speed_10m:Number(x.wind10m?.speed)||null,wind_direction_10m:Number(x.wind10m?.direction)||null,cloud_cover:null,time:new Date().toISOString()},daily:{},message:"Updated · 7Timer fallback"};
  }catch{return{ok:false,message:"Weather fallback unavailable — check connection and try ↻ again."}}
 }
}