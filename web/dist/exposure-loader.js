import {decodeArray,sha256} from './science.js';
import {equalEvidence} from './evidence-identity.js';

// Bound the cache to the four curated exposures; rejected loads are never cached.
export function createExposureLoader(fetcher=globalThis.fetch,maxEntries=4){
  if(!Number.isInteger(maxEntries)||maxEntries<1||maxEntries>8)throw Error('Invalid exposure cache size');
  const cache=new Map();
  return async function load(entry){
    if(!/^\.\/data\/explore\/[A-Za-z0-9_-]+\.json$/.test(entry.url)||!/^[a-f0-9]{64}$/.test(entry.sha256))throw Error('Exposure must reference a verified local product.');
    const key=entry.url+'#'+entry.sha256;
    let promise=cache.get(key);
    if(promise){cache.delete(key);cache.set(key,promise);}
    else{
      promise=(async()=>{
        const response=await fetcher(entry.url);
        if(!response.ok)throw Error('This exposure could not be loaded from your local server.');
        const bytes=new Uint8Array(await response.arrayBuffer());
        if(bytes.length>8*1024*1024)throw Error('This exposure exceeds the supported local product size.');
        if(await sha256(bytes)!==entry.sha256)throw Error('The exposure did not match its recorded checksum. It has not been displayed.');
        const product=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
        if(product.dataset_kind!=='real'||product.usage!=='single_observation_only'||product.scientific_approval!=='PENDING')throw Error('This exposure has an unsupported data identity.');
        const arrays=Object.fromEntries(Object.entries(product.arrays).map(([name,value])=>[name,decodeArray(value)]));
        const [h,w]=product.shape;
        if(!equalEvidence(Object.keys(arrays).sort(),['BAND','SCI','VALID','WAVE'])||!Number.isInteger(h)||!Number.isInteger(w)||h<1||w<1||!equalEvidence(entry.shape,product.shape)||!equalEvidence(entry.native_shape,product.native_shape))throw Error('Exposure arrays have inconsistent shapes.');
        for(const value of Object.values(product.arrays))if(!equalEvidence(value.shape,product.shape))throw Error('Exposure arrays have inconsistent shapes.');
        for(const [name,value]of Object.entries(product.arrays))if(value.dtype!==(name==='VALID'?'uint8':'float32'))throw Error('Exposure array encoding does not match its scientific role.');
        return {product,arrays};
      })();
      cache.set(key,promise);
      while(cache.size>maxEntries)cache.delete(cache.keys().next().value);
    }
    try{
      const loaded=await promise;
      if(loaded.product.observation.observation_id!==entry.observation_id||loaded.product.observation.time_start_utc!==entry.time_start_utc)throw Error('Exposure identity differs from the local catalogue.');
      if(!equalEvidence(entry.shape,loaded.product.shape)||!equalEvidence(entry.native_shape,loaded.product.native_shape))throw Error('Exposure arrays have inconsistent shapes.');
      return loaded;
    }catch(e){if(cache.get(key)===promise)cache.delete(key);throw e;}
  };
}
