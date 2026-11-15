import {sha256} from './science.js';

async function json(response) {
  const value=await response.json().catch(()=>({error:'The preparation service returned an unreadable response.'}));
  if(!response.ok)throw Error(value.error||'The preparation service is unavailable.');
  return value;
}
export async function preparedJob(id,{signal,fetcher=fetch}={}) {
  if(!/^[a-f0-9]{32}$/.test(id))throw Error('Invalid investigation link.');
  const state=await json(await fetcher('/api/investigations/'+id,{signal,cache:'no-cache'}));
  if(state.state!=='complete')throw Error(state.message||'This investigation is not ready.');
  const response=await fetcher('/api/investigations/'+id+'/result',{signal,cache:'no-cache'});
  if(!response.ok)throw Error('The prepared images could not be retrieved.');
  if(Number(response.headers.get('Content-Length'))>32*1024*1024)throw Error('Prepared sequence exceeds its size limit.');
  const raw=new Uint8Array(await response.arrayBuffer());
  if(raw.length>32*1024*1024||await sha256(raw)!==state.sha256)throw Error('Prepared sequence checksum mismatch.');
  return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(raw));
}
export async function prepareRequest(request,{signal,onProgress=()=>{},fetcher=fetch}={}) {
  let id=null;
  const cancel=()=>{if(id)fetcher('/api/investigations/'+id+'/cancel',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}',keepalive:true}).catch(()=>{});};
  signal?.addEventListener('abort',cancel,{once:true});
  try {
    const capabilities=await fetcher('/api/capabilities',{signal}).then(json).catch(e=>{if(signal?.aborted)throw e;throw Error('On-demand preparation is not available on this host. Verified installed examples and saved investigations remain usable.');});
    if(!capabilities.preparation)throw Error('This host supplies installed examples only. Its preparation service is not enabled.');
    const job=await json(await fetcher('/api/investigations',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(request),signal}));
    id=job.id;
    if(signal?.aborted){cancel();throw Error('Preparation cancelled.');}
    const start=Date.now();
    let state=job;
    while(['queued','running'].includes(state.state)) {
      onProgress(state.message);
      if(Date.now()-start>480000){cancel();throw Error('Preparation exceeded eight minutes. Retry a smaller field or use an installed example.');}
      await new Promise((resolve,reject)=>{
        const stop=()=>{clearTimeout(timer);reject(Error('Preparation cancelled.'));};
        const timer=setTimeout(()=>{signal?.removeEventListener('abort',stop);resolve();},600);
        signal?.addEventListener('abort',stop,{once:true});
        if(signal?.aborted)stop();
      });
      state=await json(await fetcher('/api/investigations/'+id,{signal,cache:'no-cache'}));
    }
    if(state.state!=='complete')throw Error(state.message||'Image preparation did not complete.');
    const bundle=await preparedJob(id,{signal,fetcher});
    return {bundle,id};
  }finally{signal?.removeEventListener('abort',cancel);}
}
