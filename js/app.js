(function(){
  function initGPS(){
    if(!window.MyLocationGPS)return;
    MyLocationGPS.subscribe(s=>{
      document.querySelectorAll("[data-gps-lat]").forEach(e=>e.textContent=s.position?.coords.latitude?.toFixed(6)??"—");
      document.querySelectorAll("[data-gps-lon]").forEach(e=>e.textContent=s.position?.coords.longitude?.toFixed(6)??"—");
      document.querySelectorAll("[data-gps-accuracy]").forEach(e=>e.textContent=s.position?.coords.accuracy!=null?Math.round(s.position.coords.accuracy)+" m":"—");
      document.querySelectorAll("[data-gps-status]").forEach(e=>e.textContent=s.position?(s.online?"Active":"Active • Offline"):"Waiting for GPS");
      document.querySelectorAll("[data-online]").forEach(e=>e.textContent=s.online?"Online":"Offline");
      document.documentElement.dataset.network=s.online?"online":"offline";
    });
  }
  function registerOffline(){
    if("serviceWorker" in navigator){
      navigator.serviceWorker.register("./sw.js",{scope:"./"}).catch(()=>{});
    }
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>{initGPS();registerOffline()});
  else{initGPS();registerOffline()}
})();