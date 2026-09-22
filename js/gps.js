let watch=null,last=null,listeners=new Set(),retryTimer=null,starting=false,refreshTimer=null,lastEventAt=0;

export function onGPS(fn){listeners.add(fn);if(last)fn(last);return()=>listeners.delete(fn)}

function emit(x){
  last=x;
  lastEventAt=Date.now();
  listeners.forEach(f=>{try{f(x)}catch{}});
}

function errorName(code){
  return code===1?"PERMISSION_DENIED":code===2?"POSITION_UNAVAILABLE":code===3?"TIMEOUT":"UNKNOWN";
}

function success(p,source="geolocation"){
  starting=false;
  const c=p.coords;
  if(!Number.isFinite(c.latitude)||!Number.isFinite(c.longitude))return;
  emit({
    lat:c.latitude,lon:c.longitude,accuracy:c.accuracy,
    altitude:c.altitude,speed:c.speed,heading:c.heading,
    time:p.timestamp,error:null,code:0,source,eventAt:lastEventAt
  });
}

function error(e,source="geolocation"){
  starting=false;
  const code=e?.code||0;
  const name=errorName(code);
  const msg=code===1
    ?"Location permission denied. Allow location access for this website."
    :code===2
    ?"GPS position unavailable. Try outdoors or near a window."
    :code===3
    ?"GPS timed out. Tap RETRY GPS."
    :e?.message||"Unable to obtain GPS position";
  emit({...last,error:msg,code,errorName:name,source,eventAt:lastEventAt});
  if(code!==1)scheduleRetry();
}

function scheduleRetry(){
  if(retryTimer)return;
  retryTimer=setTimeout(()=>{
    retryTimer=null;
    if(!last||last.error)startGPS();
  },5000);
}

function freshPosition(){
  return new Promise((resolve,reject)=>{
    if(!navigator.geolocation){reject(new Error("Geolocation unavailable"));return}
    navigator.geolocation.getCurrentPosition(resolve,reject,{
      enableHighAccuracy:true,maximumAge:0,timeout:10000
    });
  });
}

async function refreshFreshGPS(){
  if(document.hidden||!navigator.geolocation)return;
  try{
    const pos=await freshPosition();
    const acc=Number(pos.coords.accuracy);
    if(!Number.isFinite(acc)||acc>500)return;
    success(pos,"fresh recovery");
  }catch(e){
    error(e,"fresh recovery");
  }
}

export function startGPS(){
  if(!navigator.geolocation){
    emit({error:"Geolocation is not supported by this browser.",code:0,errorName:"UNSUPPORTED",source:"startup"});
    return false;
  }
  if(starting)return true;
  if(watch!==null){try{navigator.geolocation.clearWatch(watch)}catch{};watch=null}
  starting=true;
  emit({...(last||{}),error:null,code:0,errorName:"STARTING",source:"startup"});
  try{
    navigator.geolocation.getCurrentPosition(
      p=>success(p,"getCurrentPosition"),
      e=>error(e,"getCurrentPosition"),
      {enableHighAccuracy:true,timeout:15000,maximumAge:0}
    );
    watch=navigator.geolocation.watchPosition(
      p=>success(p,"watchPosition"),
      e=>error(e,"watchPosition"),
      {enableHighAccuracy:true,timeout:30000,maximumAge:2000}
    );
    clearTimeout(refreshTimer);
    refreshTimer=setTimeout(refreshFreshGPS,1200);
    return true;
  }catch(e){
    error(e,"startup exception");
    return false;
  }
}

export function retryGPS(){
  starting=false;
  if(watch!==null){try{navigator.geolocation.clearWatch(watch)}catch{};watch=null}
  clearTimeout(retryTimer);retryTimer=null;
  return startGPS();
}

export function current(){return last}
export function diagnostic(){return {last,lastEventAt,starting,watchActive:watch!==null}}

document.addEventListener("visibilitychange",()=>{
  if(!document.hidden){
    clearTimeout(refreshTimer);
    refreshTimer=setTimeout(refreshFreshGPS,800);
  }
});
