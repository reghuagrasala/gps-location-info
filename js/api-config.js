/*
  API CONFIGURATION
  Add providers later without changing page HTML/CSS.
  Secrets must stay in Cloudflare Worker Secrets, never here.
*/
window.MLI_API_CONFIG = {
  address: {
    providers: [
      { id:"here", enabled:true, endpoint:"/api/reverse", secretSide:"worker" },
      { id:"mapbox", enabled:false, endpoint:"/api/mapbox/reverse", secretSide:"worker" },
      { id:"future", enabled:false, endpoint:"", secretSide:"worker" }
    ]
  },
  weather: {
    providers: [
      { id:"primary", enabled:false, endpoint:"", secretSide:"worker" },
      { id:"openmeteo", enabled:true, endpoint:"https://api.open-meteo.com/v1/forecast", secretSide:"none" },
      { id:"future", enabled:false, endpoint:"", secretSide:"worker" }
    ]
  },
  map: {
    providers: [
      { id:"mapbox", enabled:false, endpoint:"/api/mapbox", secretSide:"worker" },
      { id:"here", enabled:false, endpoint:"/api/here-map", secretSide:"worker" }
    ]
  }
};
