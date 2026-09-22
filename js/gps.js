let watch=null,last=null,listeners=new Set(),retryTimer=null,starting=false;
export function onGPS(fn){listeners.add(fn);if(last)fn(last);return()=>listeners.delete(fn)}
function emit(x){last=x;listeners.forEach(f=>{try{f(x)}catch{}})}
function success(p){starting=false;emit({lat:p.coords.latitude,lon:p.coords.longitude,accuracy:p.coords.accuracy,altitude:p.coords.altitude,speed:p.coords.speed,heading:p.coords.heading,time:p.timestamp,error:null})}
function error(e){starting=false;const code=e?.code||0;const msg=code===1?"Location permission denied. Allow location access for this website.":code===2?"GPS position unavailable. Try outdoors or near a window.":code===3?"GPS timed out. Tap the globe to retry.":e?.message||"Unable to obtain GPS position";emit({...last,error:msg,code})}
function scheduleRetry(){if(retryTimer)return;retryTimer=setTimeout(()=>{retryTimer=null;if(!last||last.error)startGPS()},15000)}
export function startGPS(){
 if(!navigator.geolocation){emit({error:"Geolocation is not supported by this browser."});return false}
 if(starting)return true;
 if(watch!==null){try{navigator.geolocation.clearWatch(watch)}catch{}watch=null}
 starting=true;
 try{
  navigator.geolocation.getCurrentPosition(success,error,{enableHighAccuracy:true,timeout:15000,maximumAge:10000});
  watch=navigator.geolocation.watchPosition(success,error,{enableHighAccuracy:true,timeout:30000,maximumAge:10000});
  return true;
 }catch(e){error(e);scheduleRetry();return false}
}
export function retryGPS(){starting=false;if(watch!==null){try{navigator.geolocation.clearWatch(watch)}catch{}watch=null}return startGPS()}
export function current(){return last}