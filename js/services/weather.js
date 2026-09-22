const FALLBACK_URL="https://api.open-meteo.com/v1/forecast";
export async function getWeather(lat=null,lon=null){
  if(!Number.isFinite(lat)||!Number.isFinite(lon))return{ok:false,message:"Weather will be available when data is connected."};
  try{
    const u=new URL(FALLBACK_URL);
    u.searchParams.set("latitude",lat);u.searchParams.set("longitude",lon);
    u.searchParams.set("current","temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,wind_direction_10m,cloud_cover,surface_pressure");
    u.searchParams.set("daily","sunrise,sunset,uv_index_max");
    u.searchParams.set("timezone","auto");
    u.searchParams.set("forecast_days","3");
    const res=await fetch(u,{cache:"no-store"});if(!res.ok)throw new Error("weather "+res.status);
    const d=await res.json();
    return{ok:true,current:d.current||{},daily:d.daily||{},message:"Updated "+new Date(d.current?.time||Date.now()).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})};
  }catch{return{ok:false,message:"Weather unavailable — showing offline status."}}
}