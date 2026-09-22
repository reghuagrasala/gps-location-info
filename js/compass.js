let active=false,heading=null,listeners=new Set(),orientationHandler=null;
export function onHeading(f){listeners.add(f);if(Number.isFinite(heading))f(heading);return()=>listeners.delete(f)}
export async function enableCompass(){
 if(!("DeviceOrientationEvent"in window))return false;
 try{
  if(typeof DeviceOrientationEvent.requestPermission==="function"){const p=await DeviceOrientationEvent.requestPermission();if(p!=="granted")return false}
  if(!orientationHandler){orientationHandler=e=>{let h=Number.isFinite(e.webkitCompassHeading)?e.webkitCompassHeading:Number.isFinite(e.alpha)?(360-e.alpha)%360:null;if(Number.isFinite(h)){heading=(h+360)%360;listeners.forEach(f=>f(heading))}};window.addEventListener("deviceorientation",orientationHandler,true)}
  active=true;if(Number.isFinite(heading))listeners.forEach(f=>f(heading));return true
 }catch{return false}
}
export function isActive(){return active}