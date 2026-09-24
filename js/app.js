(function(){
  function initGPS(){
    if(!window.MyLocationGPS)return;
    MyLocationGPS.subscribe(s=>{
      document.querySelectorAll("[data-gps-lat]").forEach(e=>e.textContent=s.position?.coords.latitude?.toFixed(6)??"—");
      document.querySelectorAll("[data-gps-lon]").forEach(e=>e.textContent=s.position?.coords.longitude?.toFixed(6)??"—");
      document.querySelectorAll("[data-gps-accuracy]").forEach(e=>e.textContent=s.position?.coords.accuracy?Math.round(s.position.coords.accuracy)+" m":"—");
      document.querySelectorAll("[data-gps-status]").forEach(e=>e.textContent=s.position?"Active":"Waiting for GPS");
      document.querySelectorAll("[data-online]").forEach(e=>e.textContent=s.online?"Online":"Offline");
    });
  }
  document.addEventListener("DOMContentLoaded",initGPS);
})();
