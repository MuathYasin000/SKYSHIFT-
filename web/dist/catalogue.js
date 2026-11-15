// Validate the local curated catalogue before it can drive links, field selection or data requests.
export function validateCatalogue(catalogue){
  const bad=()=>{throw Error('The local observation catalogue is incomplete or unsupported. Restore a verified catalogue and try again.');};
  if(!catalogue||catalogue.schema_version!=='1.0'||!Array.isArray(catalogue.fields)||!catalogue.fields.length||catalogue.fields.length>100)bad();
  const fields=new Set(),products=new Set();
  for(const field of catalogue.fields){
    if(!field||typeof field.id!=='string'||!/^[a-z0-9_-]{1,64}$/.test(field.id)||fields.has(field.id)||typeof field.title!=='string'||!field.title.trim()||field.title.length>160||typeof field.description!=='string'||field.description.length>3000||!Number.isFinite(field.ra_deg)||field.ra_deg<0||field.ra_deg>=360||!Number.isFinite(field.dec_deg)||Math.abs(field.dec_deg)>90||!Number.isFinite(field.size_deg)||field.size_deg<=0||field.size_deg>10||!['provisional_restricted','incompatible_tested_pairs','unavailable'].includes(field.comparison_status)||!Array.isArray(field.observations)||!field.observations.length||field.observations.length>100)bad();
    fields.add(field.id);const observations=new Set();
    if(field.comparison_status==='provisional_restricted'&&field.id!=='m101')bad(); // Only the installed M101 bundle has a comparison implementation.
    for(const entry of field.observations){
      if(!entry||!/^\.\/data\/explore\/[A-Za-z0-9_-]+\.json$/.test(entry.url)||!/^\.\/data\/explore\/[A-Za-z0-9_-]+\.png$/.test(entry.preview)||typeof entry.observation_id!=='string'||!entry.observation_id||observations.has(entry.observation_id)||products.has(entry.url)||!/^[a-f0-9]{64}$/.test(entry.sha256)||typeof entry.time_start_utc!=='string'||!entry.time_start_utc.endsWith('Z')||!Number.isFinite(Date.parse(entry.time_start_utc)))bad();
      for(const shape of [entry.shape,entry.native_shape])if(!Array.isArray(shape)||shape.length!==2||shape.some(n=>!Number.isInteger(n)||n<1)||shape[0]*shape[1]>1000000)bad();
      observations.add(entry.observation_id);products.add(entry.url);
    }
  }
  return catalogue;
}
export async function fetchCatalogue(fetcher=globalThis.fetch,timeoutMs=10000){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);
  try{
    const response=await fetcher('./data/explore-catalog.json',{cache:'no-cache',signal:controller.signal});
    if(!response.ok)throw Error('The local observation catalogue could not be loaded. Check that SKYSHIFT is running, then try again.');
    return validateCatalogue(await response.json());
  }catch(e){
    if(controller.signal.aborted)throw Error('The local catalogue is taking too long to load. Check the server and try again.');
    if(e instanceof SyntaxError)throw Error('The local observation catalogue is not valid JSON. Restore a verified copy and try again.');
    if(e instanceof TypeError)throw Error('Could not reach the local catalogue. Check that SKYSHIFT is running and try again.');
    throw e;
  }finally{clearTimeout(timer);}
}
