let active=false,heading=null,listeners=new Set(),installed=false;
export function onHeading(fn){listeners.add(fn);if(Number.isFinite(heading))fn(heading);return()=>listeners.delete(fn)}
function emit(h){if(!Number.isFinite(h))return;heading=(h+360)%360;listeners.forEach(fn=>{try{fn(heading)}catch{}})}
function handle(e){let h=null;if(Number.isFinite(e.webkitCompassHeading))h=e.webkitCompassHeading;else if(Number.isFinite(e.alpha))h=(360-e.alpha)%360;emit(h)}
export async function enableCompass(){
 if(!("DeviceOrientationEvent"in window))return false;
 try{
  if(typeof DeviceOrientationEvent.requestPermission==="function"){const p=await DeviceOrientationEvent.requestPermission();if(p!=="granted")return false}
  if(!installed){window.addEventListener("deviceorientation",handle,true);window.addEventListener("deviceorientationabsolute",handle,true);installed=true}
  active=true;return true;
 }catch{return false}
}
export function isActive(){return active}
