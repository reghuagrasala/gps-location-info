(function(){
  const PREFIX="mli:";
  window.MLIOfflineCache={
    online:()=>navigator.onLine,
    save:(key,value)=>{try{localStorage.setItem(PREFIX+key,JSON.stringify(value))}catch(e){}},
    load:(key)=>{try{return JSON.parse(localStorage.getItem(PREFIX+key)||"null")}catch(e){return null}}
  };
  addEventListener("online",()=>document.documentElement.dataset.network="online");
  addEventListener("offline",()=>document.documentElement.dataset.network="offline");
})();