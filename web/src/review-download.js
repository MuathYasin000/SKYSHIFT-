import {sha256} from './science.js';
// Immutable m101-review-v6.zip identity, retained in provenance-audit.json and
// independently checked against all six unchanged components by the build.
export const REVIEW_ARCHIVE_SHA256='2187c38e4e97e8c94999e0ac9794a69e9c357f04ead6298e56b877ed64e30d78';
export function createReviewDownloader(fetcher=globalThis.fetch){
  const cache=new Map();let pending=null;
  async function run(packet,{signal,onProgress=()=>{}}={}){
    if(!packet||packet.name!=='m101-review-v6.zip'||packet.size_bytes!==40697263||packet.parts?.length!==6||packet.parts.reduce((s,p)=>s+p.size_bytes,0)!==packet.size_bytes)throw Error('Unsupported review archive identity.');
    const chunks=[];let completed=0;
    for(const [i,p] of packet.parts.entries()){
      if(p.url!==`./data/review-part-${i}.bin`||!Number.isSafeInteger(p.size_bytes)||p.size_bytes<1||p.size_bytes>8000000||!/^[a-f0-9]{64}$/.test(p.sha256))throw Error('Unsupported review component.');
      signal?.throwIfAborted();
      const key=p.url+'#'+p.sha256;let bytes=cache.get(key);
      if(!bytes){
        const timeout=AbortSignal.timeout(30000),combined=signal?AbortSignal.any([signal,timeout]):timeout;
        const response=await fetcher(p.url,{signal:combined});if(!response.ok)throw Error(`Component ${i+1} unavailable (${response.status}). Retry to resume verified components.`);
        const parts=[];let received=0;
        if(response.body){const reader=response.body.getReader();try{while(true){const {done,value}=await reader.read();if(done)break;received+=value.length;if(received>p.size_bytes)throw Error('Review component exceeds recorded size.');parts.push(value);onProgress({loaded:completed+received,total:packet.size_bytes,part:i+1,parts:packet.parts.length,state:'downloading'});}}catch(e){await reader.cancel().catch(()=>{});throw e;}finally{reader.releaseLock();}}
        else{const data=new Uint8Array(await response.arrayBuffer());parts.push(data);received=data.length;}
        if(received!==p.size_bytes)throw Error('Incomplete review component. Retry to resume verified components.');
        bytes=new Uint8Array(received);let offset=0;for(const b of parts){bytes.set(b,offset);offset+=b.length;}
        if(await sha256(bytes)!==p.sha256)throw Error('Review component checksum mismatch. No archive was saved.');
        cache.set(key,bytes);
      }
      chunks.push(bytes);completed+=bytes.length;onProgress({loaded:completed,total:packet.size_bytes,part:i+1,parts:packet.parts.length,state:'verified component'});
    }
    signal?.throwIfAborted();onProgress({loaded:completed,total:packet.size_bytes,state:'verifying archive'});
    const bytes=new Uint8Array(completed);let offset=0;for(const b of chunks){bytes.set(b,offset);offset+=b.length;}
    if(await sha256(bytes)!==REVIEW_ARCHIVE_SHA256)throw Error('Final review archive checksum mismatch. No archive was saved.');
    signal?.throwIfAborted();return {bytes,name:packet.name,type:'application/zip'};
  }
  return (packet,options)=>{
    if(pending)return pending;
    pending=run(packet,options).finally(()=>{pending=null;});return pending;
  };
}
export function attachReviewDownload(button,getPacket,download,{fetcher=globalThis.fetch,onError=()=>{},load=createReviewDownloader(fetcher)}={}){
  const label=button.textContent;
  const cancel=document.createElement('button'),status=document.createElement('p'),progress=document.createElement('progress');
  cancel.type='button';cancel.textContent='Cancel download';cancel.hidden=true;
  status.setAttribute('role','status');progress.setAttribute('aria-label','Review archive download');progress.hidden=true;
  button.after(progress,cancel,status);let controller=null;
  button.closest('dialog')?.addEventListener('close',()=>controller?.abort(),{once:true});
  cancel.onclick=()=>controller?.abort();
  button.onclick=async()=>{
    if(controller)return;controller=new AbortController();button.disabled=true;cancel.hidden=false;progress.hidden=false;progress.value=0;progress.max=40697263;
    try{const file=await load(await getPacket(),{signal:controller.signal,onProgress:p=>{progress.value=p.loaded;status.textContent=`${(p.loaded/1e6).toFixed(1)} / ${(p.total/1e6).toFixed(1)} MB · ${p.state}${p.part?' · component '+p.part+' / '+p.parts:''}`;}});download(file);status.textContent='Download ready. All component hashes and the final archive SHA-256 verified.';}
    catch(e){status.textContent=controller.signal.aborted?'Download canceled. Retry resumes verified components.':e.message;onError(status.textContent);}
    finally{controller=null;button.disabled=false;button.textContent=label;cancel.hidden=true;}
  };
}
