import {sha256} from './science.js';
import {gunzipSync} from './vendor/fflate.js';

export function validateMosaicManifest(m) {
 if(m?.schema_version!=='1.0'||m.kind!=='spherex_mosaic_cube'||m.usage!=='multi_epoch_wavelength_context_only'||m.temporal_comparison_allowed!==false||m.adapter_version!=='irsa-mosaic-cube-v1'||m.science_unit!=='MJy/sr'||!Array.isArray(m.shape)||m.shape.length!==3||m.shape[0]!==102||m.shape.slice(1).some(n=>!Number.isInteger(n)||n<1)||m.shape[1]*m.shape[2]>300000||m.channels?.length!==102||!/^[a-f0-9]{64}$/.test(m.source?.sha256))throw Error('Unsupported mosaic identity or geometry');
 const w=m.wcs;
 if(w?.CTYPE1!=='RA---TAN'||w.CTYPE2!=='DEC--TAN'||w.RADESYS!=='ICRS'||!['CRPIX1','CRPIX2','CRVAL1','CRVAL2','CDELT1','CDELT2'].every(k=>Number.isFinite(w[k]))||w.CDELT1>=0||w.CDELT2<=0)throw Error('Unsupported mosaic sky projection');
 for(const [i,c] of m.channels.entries())if(c.plane!==i+1||!Number.isFinite(c.wavelength_um)||c.wavelength_um<.7||c.wavelength_um>5.1||!Number.isFinite(c.bandwidth_um)||c.bandwidth_um<=0||i&&c.wavelength_um<=m.channels[i-1].wavelength_um||!/^\.\/data\/mosaics\/[a-z0-9-]+\/plane-\d{3}\.json\.gz$/.test(c.url)||!/^[a-f0-9]{64}$/.test(c.sha256)||!Number.isInteger(c.bytes)||c.bytes>2000000||!Number.isInteger(c.decoded_bytes)||c.decoded_bytes>6000000||!Number.isFinite(c.valid_fraction)||c.valid_fraction<0||c.valid_fraction>1)throw Error('Invalid mosaic wavelength plane');
 return m;
}

export async function decodeMosaicPlane(bytes,manifest,index) {
 const c=manifest.channels[index];
 if(!c||bytes.length!==c.bytes||await sha256(bytes)!==c.sha256)throw Error('Mosaic plane source checksum mismatch');
 if(new DataView(bytes.buffer,bytes.byteOffset+bytes.length-4,4).getUint32(0,true)!==c.decoded_bytes)throw Error('Mosaic expansion differs from its declared bound');
 const raw=gunzipSync(bytes,{out:new Uint8Array(c.decoded_bytes)});
 if(raw.length!==c.decoded_bytes)throw Error('Mosaic plane expansion differs');
 const p=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(raw));
 if(p.kind!=='spherex_mosaic_plane'||p.usage!==manifest.usage||p.temporal_comparison_allowed!==false||p.source_sha256!==manifest.source.sha256||JSON.stringify(p.shape)!==JSON.stringify(manifest.shape.slice(1))||JSON.stringify(p.channel)!==JSON.stringify(Object.fromEntries(['plane','wavelength_um','bandwidth_um','detector','subchannel'].map(k=>[k,c[k]]))))throw Error('Mosaic plane identity differs');
 const arrays={},roles={SCI:'<f4',HITS:'<i4',FLAGS:'<u4',VALID:'|u1'},n=p.shape[0]*p.shape[1];
 if(Object.keys(p.arrays||{}).sort().join()!==Object.keys(roles).sort().join())throw Error('Unexpected mosaic arrays');
 for(const [key,dtype] of Object.entries(roles)) {
  const a=p.arrays[key];if(a.dtype!==dtype||typeof a.data!=='string'||a.data.length>n*(key==='VALID'?1:4)*2+8)throw Error('Invalid mosaic array allocation');
  const b=Uint8Array.from(atob(a.data),x=>x.charCodeAt(0));
  if(b.length!==n*(key==='VALID'?1:4)||await sha256(b)!==a.sha256)throw Error('Mosaic measured-array checksum mismatch');
  const d=new DataView(b.buffer);arrays[key]=key==='VALID'?b:key==='SCI'?Float32Array.from({length:n},(_,i)=>d.getFloat32(i*4,true)):key==='HITS'?Int32Array.from({length:n},(_,i)=>d.getInt32(i*4,true)):Uint32Array.from({length:n},(_,i)=>d.getUint32(i*4,true));
 }
 const known=(1<<1)|(1<<19)|(1<<21);
 for(let i=0;i<n;i++) {
  const usable=Number.isFinite(arrays.SCI[i])&&arrays.HITS[i]>0&&(arrays.FLAGS[i]&~known)===0&&(arrays.FLAGS[i]&((1<<1)|(1<<19)))===0;
  if(![0,1].includes(arrays.VALID[i])||Boolean(arrays.VALID[i])!==usable||arrays.HITS[i]<0)throw Error('Mosaic mask disagrees with original coverage and flags');
 }
 return {payload:p,arrays};
}

export function createMosaicLoader(fetcher=fetch) {
 const cache=new Map();
 return {async load(manifest,index) {
  const key=manifest.source.sha256+':'+index;
  if(cache.has(key)){const item=cache.get(key);cache.delete(key);cache.set(key,item);return item;}
  const c=manifest.channels[index];if(!c)throw Error('Unknown mosaic plane');
  const promise=(async()=>{const r=await fetcher(c.url,{signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error('This wavelength plane is unavailable; no neighbouring plane was substituted');if(Number(r.headers?.get('Content-Length'))>c.bytes)throw Error('Mosaic transfer exceeds its declared bound');const b=new Uint8Array(await r.arrayBuffer());return decodeMosaicPlane(b,manifest,index);})();
  cache.set(key,promise);if(cache.size>6)cache.delete(cache.keys().next().value);
  try{return await promise;}catch(e){if(cache.get(key)===promise)cache.delete(key);throw e;}
 },size:()=>cache.size,clear:()=>cache.clear()};
}
