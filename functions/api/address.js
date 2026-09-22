function json(data,status=200){return new Response(JSON.stringify(data),{status,headers:{"content-type":"application/json","cache-control":"no-store"}})}
async function get(url){const c=new AbortController(),t=setTimeout(()=>c.abort(),8000);try{const r=await fetch(url,{signal:c.signal,headers:{"accept":"application/json"}});if(!r.ok)throw new Error(String(r.status));return await r.json()}finally{clearTimeout(t)}}
function normalise(d){
 const a=d.address||{},city=d.city||d.town||d.village||d.locality||a.city||a.town||a.village||a.municipality||"";
 const state=d.principalSubdivision||a.state||"";
 const district=d.district||a.state_district||a.county||d.localityInfo?.administrative?.find?.(x=>/district|county/i.test(x.name||""))?.name||"";
 const postcode=d.postcode||a.postcode||"";
 const country=d.countryName||d.country||a.country||"";
 const locality=d.locality||a.suburb||a.neighbourhood||a.hamlet||a.village||city;
 const label=[locality||city,state,country].filter((v,i,a)=>v&&a.indexOf(v)===i).join(", ");
 const address=[a.house_number&&[a.house_number,a.road].filter(Boolean).join(" "),d.locality||a.suburb,a.city||a.town||a.village,state,district,postcode,country].filter(Boolean).filter((v,i,a)=>a.indexOf(v)===i).join(", ");
 return{ok:Boolean(label||address),label:label||city,address:address||label,postcode,district,state,country,locality};
}
export async function onRequestGet({request}){
 const u=new URL(request.url),lat=Number(u.searchParams.get("lat")),lon=Number(u.searchParams.get("lon"));
 if(!Number.isFinite(lat)||!Number.isFinite(lon))return json({ok:false,message:"Invalid coordinates"},400);
 const providers=[
  async()=>{const q=new URL("https://api.bigdatacloud.net/data/reverse-geocode-client");q.searchParams.set("latitude",lat);q.searchParams.set("longitude",lon);q.searchParams.set("localityLanguage","en");return normalise(await get(q))},
  async()=>{const q=new URL("https://photon.komoot.io/reverse");q.searchParams.set("lat",lat);q.searchParams.set("lon",lon);const d=await get(q),f=d.features?.[0]?.properties||{};return normalise({address:{road:f.street,suburb:f.suburb,district:f.district,city:f.city||f.town||f.village,postcode:f.postcode,country:f.country,state:f.state},city:f.city||f.town||f.village,principalSubdivision:f.state,countryName:f.country,postcode:f.postcode,locality:f.suburb,district:f.district})},
  async()=>{const q=new URL("https://nominatim.openstreetmap.org/reverse");q.searchParams.set("lat",lat);q.searchParams.set("lon",lon);q.searchParams.set("format","jsonv2");q.searchParams.set("zoom","18");q.searchParams.set("addressdetails","1");q.searchParams.set("accept-language","en");return normalise(await get(q))}
 ];
 for(const provider of providers){try{const r=await provider();if(r.ok)return json(r)}catch{}}
 return json({ok:false,message:"No address provider returned a result"},502);
}