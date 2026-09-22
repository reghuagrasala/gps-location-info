let watch=null,last=null,listeners=new Set(),retryTimer=null;
export function onGPS(fn){listeners.add(fn);if(last)fn(last);return()=>listeners.delete(fn)}
function emit(x){last=x;listeners.forEach(f=>{try{f(x)}catch{}})}
function success(p){emit({lat:p.coords.latitude,lon:p.coords.longitude,accuracy:p.coords.accuracy,altitude:p.coords.altitude,speed:p.coords.speed,heading:p.coords.heading,time:p.timestamp,error:null})}
function error(e){emit({...last,error:e?.message||"Unable to obtain GPS position",code:e?.code||0})}
function scheduleRetry(){if(retryTimer)return;retryTimer=setTimeout(()=>{retryTimer=null;startGPS()},15000)}
export function startGPS(){
 if(!navigator.geolocation){emit({error:"Geolocation is not supported by this browser."});return false}
 if(watch!==null)return true;
 try{
  navigator.geolocation.getCurrentPosition(success,error,{enableHighAccuracy:true,timeout:20000,maximumAge:0});
  watch=navigator.geolocation.watchPosition(success,error,{enableHighAccuracy:true,timeout:30000,maximumAge:5000});
  return true;
 }catch(e){error(e);scheduleRetry();return false}
}
export function retryGPS(){if(watch!==null){try{navigator.geolocation.clearWatch(watch)}catch{}watch=null}startGPS()}
export function current(){return last}