const BDC="https://api.bigdatacloud.net/data/reverse-geocode-client";
const NOMINATIM="https://nominatim.openstreetmap.org/reverse";
const PHOTON="https://photon.komoot.io/reverse";
async function fetchJSON(url,ms=8000){
 const c=new AbortController(),t=setTimeout(()=>c.abort(),ms);
 try{const r=await fetch(url,{method:"GET",cache:"no-store",signal:c.signal,headers:{"Accept":"application/json"}});if(!r.ok)throw new Error(String(r.status));return await r.json()}finally{clearTimeout(t)}
}
function normalise(d){
 const a=d.address||{},city=d.city||d.town||d.village||d.locality||a.city||a.town||a.village||a.municipality||"";
 const state=d.principalSubdivision||a.state||"";
 const district=d.localityInfo?.administrative?.find?.(x=>/district|county/i.test(x.name||""))?.name||a.county||"";
 const postcode=d.postcode||a.postcode||"";
 const country=d.countryName||d.country||a.country||"";
 const locality=d.locality||a.suburb||a.neighbourhood||a.hamlet||a.village||city;
 const label=[locality||city,state,country].filter((v,i,a)=>v&&a.indexOf(v)===i).join(", ");
 const address=[a.house_number&&a.house_number+" "+(a.road||""),d.locality||a.suburb,a.city||a.town||a.village,state,district,postcode,country].filter(Boolean).filter((v,i,a)=>a.indexOf(v)===i).join(", ");
 return{ok:Boolean(label||address),label:label||city,address:address||label,postcode};
}
export async function reverseGeocode(lat,lon){
 if(!Number.isFinite(lat)||!Number.isFinite(lon)||!navigator.onLine)return{ok:false};
 try{const q=new URL("./functions/api/address.js",location.href);q.searchParams.set("lat",lat.toFixed(6));q.searchParams.set("lon",lon.toFixed(6));const d=await fetchJSON(q.toString(),9000);if(d?.ok)return d}catch{}
 const providers=[
  async()=>{
   const u=new URL(PHOTON);u.searchParams.set("lat",lat);u.searchParams.set("lon",lon);
   const d=await fetchJSON(u.toString());const f=d.features?.[0]?.properties||{};
   if(!f.city&&!f.town&&!f.village&&!f.suburb&&!f.street)throw new Error("Photon empty");
   return normalise({address:{road:f.street,suburb:f.suburb,district:f.district,city:f.city||f.town||f.village,postcode:f.postcode,country:f.country,state:f.state},city:f.city||f.town||f.village,principalSubdivision:f.state,countryName:f.country,postcode:f.postcode,locality:f.suburb});
  },
  async()=>{
   const u=new URL(BDC);u.searchParams.set("latitude",lat);u.searchParams.set("longitude",lon);u.searchParams.set("localityLanguage","en");
   return normalise(await fetchJSON(u.toString()));
  },
  async()=>{
   const u=new URL(NOMINATIM);u.searchParams.set("lat",lat);u.searchParams.set("lon",lon);u.searchParams.set("format","jsonv2");u.searchParams.set("zoom","18");u.searchParams.set("addressdetails","1");u.searchParams.set("accept-language","en");
   return normalise(await fetchJSON(u.toString()));
  }
 ];
 for(const provider of providers){try{const r=await provider();if(r?.ok)return r}catch{}}
 return{ok:false};
}
