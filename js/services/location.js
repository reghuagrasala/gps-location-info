export async function reverseGeocode(lat,lon){
  if(!Number.isFinite(lat)||!Number.isFinite(lon)||!navigator.onLine)return{ok:false};
  const url=new URL("https://api.bigdatacloud.net/data/reverse-geocode-client");
  url.searchParams.set("latitude",lat);url.searchParams.set("longitude",lon);url.searchParams.set("localityLanguage","en");
  const res=await fetch(url.toString(),{method:"GET",cache:"no-store"});
  if(!res.ok)throw new Error("Reverse geocoding failed: "+res.status);
  const d=await res.json();
  if(d.lookupSource&&d.lookupSource!=="reverseGeocoding")return{ok:false};
  const city=d.city||d.locality||"";
  const country=d.countryName||"";
  const label=[city,country].filter(Boolean).join(", ");
  const address=[d.locality,d.city,d.principalSubdivision,d.postcode,d.countryName].filter((v,i,a)=>v&&a.indexOf(v)===i).join(", ");
  return{ok:Boolean(label),label,address,postcode:d.postcode||""};
}