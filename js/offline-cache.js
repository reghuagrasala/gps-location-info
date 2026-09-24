/* Lightweight cache policy placeholder.
   Network APIs remain replaceable; last successful address/weather/GPS
   results are retained in localStorage by their service modules. */
window.MLIOfflineCache={
  online:()=>navigator.onLine,
  save:(key,value)=>{try{localStorage.setItem(key,JSON.stringify(value))}catch(e){}},
  load:(key)=>{try{return JSON.parse(localStorage.getItem(key)||"null")}catch(e){return null}}
};