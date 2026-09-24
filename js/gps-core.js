(function(){
  const KEY="mli:last-gps-v1"; const listeners=new Set();
  let state={position:null,error:null,online:navigator.onLine,gpsAvailable:"geolocation" in navigator};
  try{const saved=JSON.parse(localStorage.getItem(KEY)||"null");if(saved?.coords)state.position=saved}catch(e){}
  function emit(){listeners.forEach(fn=>{try{fn({...state})}catch(e){}})}
  function save(pos){
    const p={coords:{latitude:pos.coords.latitude,longitude:pos.coords.longitude,accuracy:pos.coords.accuracy,altitude:pos.coords.altitude,altitudeAccuracy:pos.coords.altitudeAccuracy,speed:pos.coords.speed,heading:pos.coords.heading},timestamp:pos.timestamp||Date.now(),source:"GPS (Device)"};
    state.position=p;state.error=null;try{localStorage.setItem(KEY,JSON.stringify(p))}catch(e){} emit();
  }
  function start(){if(!navigator.geolocation){state.gpsAvailable=false;emit();return} navigator.geolocation.watchPosition(save,err=>{state.error=err;emit()},{enableHighAccuracy:true,maximumAge:0,timeout:10000})}
  window.MyLocationGPS={getState:()=>({...state}),getPosition:()=>state.position,subscribe(fn){listeners.add(fn);fn({...state});return()=>listeners.delete(fn)},start};
  addEventListener("online",()=>{state.online=true;emit()}); addEventListener("offline",()=>{state.online=false;emit()}); start();
})();