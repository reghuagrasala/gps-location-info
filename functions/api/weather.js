function json(data,status=200){return new Response(JSON.stringify(data),{status,headers:{"content-type":"application/json","cache-control":"no-store"}})}
async function get(url){const c=new AbortController(),t=setTimeout(()=>c.abort(),7000);try{const r=await fetch(url,{signal:c.signal});if(!r.ok)throw new Error(String(r.status));return await r.json()}finally{clearTimeout(t)}}
export async function onRequestGet({request}){
 const u=new URL(request.url),lat=Number(u.searchParams.get("lat")),lon=Number(u.searchParams.get("lon"));
 if(!Number.isFinite(lat)||!Number.isFinite(lon))return json({ok:false,message:"Invalid coordinates"},400);
 try{
  const q=new URL("https://api.open-meteo.com/v1/forecast");q.searchParams.set("latitude",lat.toFixed(6));q.searchParams.set("longitude",lon.toFixed(6));
  q.searchParams.set("current","temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,wind_direction_10m,cloud_cover,surface_pressure,is_day");
  q.searchParams.set("hourly","temperature_2m,relative_humidity_2m,dew_point_2m,precipitation_probability,visibility,wind_gusts_10m,uv_index,weather_code,wind_speed_10m");q.searchParams.set("daily","weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max,precipitation_probability_max");q.searchParams.set("timezone","auto");q.searchParams.set("forecast_days","3");
  const d=await get(q);if(!d.current)throw new Error("No current weather");
  const h=d.hourly||{},now=new Date(d.current.time||Date.now()),times=h.time||[];let i=times.findIndex(t=>new Date(t)>=now);if(i<0)i=0;const current={...d.current};for(const k of ["dew_point_2m","visibility","wind_gusts_10m","uv_index"]){if(!Number.isFinite(current[k])&&Array.isArray(h[k])&&Number.isFinite(h[k][i]))current[k]=h[k][i]}return json({ok:true,provider:"Open-Meteo",current,hourly:h,daily:d.daily||{},message:"Updated "+new Date(d.current.time).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})});
 }catch{
  try{
   const q=new URL("https://www.7timer.info/bin/api.pl");q.searchParams.set("lon",lon.toFixed(3));q.searchParams.set("lat",lat.toFixed(3));q.searchParams.set("product","civillight");q.searchParams.set("output","json");
   const d=await get(q),x=d.dataseries?.[0];if(!x)throw new Error("No 7Timer data");const temp=Number(x.temp2m),rh=Number(x.rh2m),w=String(x.weather||"").toLowerCase(),code=w.includes("thunder")?95:w.includes("rain")||w.includes("shower")?63:w.includes("cloud")?2:0;
   return json({ok:true,provider:"7Timer",current:{temperature_2m:Number.isFinite(temp)?temp:null,apparent_temperature:Number.isFinite(temp)?temp:null,relative_humidity_2m:Number.isFinite(rh)?rh:null,weather_code:code,wind_speed_10m:Number(x.wind10m?.speed)||null,wind_direction_10m:Number(x.wind10m?.direction)||null,cloud_cover:null,time:new Date().toISOString()},hourly:{},daily:{},message:"Updated · 7Timer fallback"});
  }catch{return json({ok:false,message:"Weather providers unavailable"},502)}
 }
}