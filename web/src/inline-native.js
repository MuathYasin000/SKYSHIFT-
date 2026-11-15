// Original detector samples inside the shared observation console. This view is
// deliberately independent of the fixed-sky temporal comparison canvas.
import {sha256} from './science.js';
import {decodeNative,nativeRGBA,nativePixel} from './native-data.js';

const defaults={limits:'percentile',stretch:'asinh',asinh_a:.1,contrast:1,palette:'grayscale',mask:'overlay'};
const format=value=>Number.isFinite(value)?value.toPrecision(7):'nonfinite';

export function createNativeLoader({fetcher=globalThis.fetch}={}) {
  const cache=new Map();
  let catalogue;
  async function read(url,hash,maxBytes=48*1024*1024) {
    const response=await fetcher(url,{signal:AbortSignal.timeout(15000)});
    if(!response.ok)throw Error('Native observation unavailable');
    const announced=Number(response.headers?.get('Content-Length'));
    if(announced>maxBytes)throw Error('Native observation exceeds the display transfer limit');
    const bytes=new Uint8Array(await response.arrayBuffer());
    if(bytes.length>maxBytes)throw Error('Native observation exceeds the display transfer limit');
    if(hash&&await sha256(bytes)!==hash)throw Error('Native observation checksum mismatch');
    return JSON.parse(new TextDecoder().decode(bytes));
  }
  return async (observation,supplied=null)=>{
    const key=observation?.source?.sha256;
    if(!/^[a-f0-9]{64}$/.test(key))throw Error('No authenticated original source identity');
    const verify=async payload=>{
      if(payload?.observation?.source?.sha256!==key||payload.observation.observation_id!==observation.observation_id)
        throw Error('Native original differs from the selected observation; no substitute was displayed');
      return {payload,arrays:await decodeNative(payload)};
    };
    // An explicitly supplied payload must be checked, even when a valid version
    // of this source was previously cached. Corruption never falls back silently.
    if(supplied)return verify(supplied);
    if(cache.has(key)) {
      const result=await cache.get(key);
      if(result.payload.observation.observation_id!==observation.observation_id)
        throw Error('Native original differs from the selected observation; no substitute was displayed');
      return result;
    }
    const pending=(async()=>{
      if(!catalogue)catalogue=read('./data/native/catalog.json',null,1024*1024).catch(error=>{catalogue=null;throw error;});
      const c=await catalogue,entry=c.entries?.find(e=>e.source_sha256===key&&e.observation_id===observation.observation_id);
      if(!entry)throw Error('The native original is not installed for this observation. The fixed-sky image remains available. No source was substituted.');
      if(!/^\.\/data\/native\/[a-zA-Z0-9_-]+\.json$/.test(entry.url)||!/^[a-f0-9]{64}$/.test(entry.sha256))
        throw Error('Unsupported native asset identity');
      return verify(await read(entry.url,entry.sha256));
    })();
    cache.set(key,pending);
    // Keep only the few adjacent originals a visitor is actively exploring.
    if(cache.size>6)cache.delete(cache.keys().next().value);
    try{return await pending;}catch(error){if(cache.get(key)===pending)cache.delete(key);throw error;}
  };
}

export function createInlineNative({root,fetcher=globalThis.fetch}) {
  if(!document.getElementById('inline-native-style')) {
    const link=document.createElement('link');link.id='inline-native-style';link.rel='stylesheet';
    link.href=new URL('./inline-native.css',import.meta.url).href;document.head.append(link);
  }
  root.classList.add('inline-native');root.hidden=true;
  root.innerHTML=`<header class="inline-native-heading"><div><p class="inline-native-eyebrow">ORIGINAL DETECTOR SAMPLES</p><h2>Native observation</h2></div><a data-native="source" target="_blank" rel="noopener noreferrer">Original FITS ↗</a></header>
    <p data-native="identity"></p><p class="inline-native-limit">Independent single observation · native detector axes, x right / y up, not north up. These images are not aligned for temporal playback. Use the fixed-sky timeline to compare dates.</p>
    <div class="inline-native-controls">
      <label>Limits<select data-native="limits"><option value="percentile">1–99.5 percentile</option><option value="zscale">ZScale</option></select></label>
      <label>Stretch<select data-native="stretch"><option value="asinh">Asinh</option><option value="linear">Linear</option><option value="log">Logarithmic</option></select></label>
      <label>Palette<select data-native="palette"><option value="grayscale">Grayscale</option><option value="ember">Ember · false color</option><option value="ice">Ice · false color</option></select></label>
      <label>Masks<select data-native="mask"><option value="overlay">Purple exclusions</option><option value="excluded">Neutral exclusions</option></select></label>
      <label>Contrast<input data-native="contrast" type="range" min="0.25" max="4" step="0.05" value="1"></label>
    </div>
    <p data-native="status" role="status">Choose a verified observation.</p>
    <div class="inline-native-canvas-wrap"><canvas data-native="canvas" tabindex="0" aria-label="Original detector pixels. Drag to pan, scroll to zoom, arrow keys to pan, Home to fit. Click a pixel to inspect its measurement."></canvas></div>
    <div class="inline-native-viewtools"><div><button data-native="minus" aria-label="Zoom native image out">−</button><button data-native="plus" aria-label="Zoom native image in">+</button><button data-native="fit">Fit original</button><button data-native="one">1:1 pixels</button><button data-native="receipt">Save display settings ↓</button></div><output data-native="scale"></output></div>
    <p data-native="pixel">Select an original pixel to inspect its value, uncertainty, sky position and flags.</p><p data-native="parameters"></p>`;
  const $=name=>root.querySelector(`[data-native="${name}"]`),canvas=$('canvas'),context=canvas.getContext('2d');
  const load=createNativeLoader({fetcher});
  let payload=null,arrays=null,texture=null,effective=null,key=null,activeSupplied=null,attempt=0,scale=1,cx=0,cy=0,drag=null;
  const settings=()=>({...defaults,...Object.fromEntries(['limits','stretch','palette','mask'].map(name=>[name,$(name).value])),contrast:Number($('contrast').value)});
  const controls=[...root.querySelectorAll('button,input,select')];
  function draw() {
    const box=canvas.getBoundingClientRect();if(!box.width||!box.height)return;
    const dpr=globalThis.devicePixelRatio||1;
    canvas.width=Math.round(box.width*dpr);canvas.height=Math.round(box.height*dpr);context.setTransform(dpr,0,0,dpr,0,0);
    context.fillStyle='#050608';context.fillRect(0,0,box.width,box.height);if(!texture)return;
    context.save();context.translate(box.width/2,box.height/2);context.scale(scale,-scale);context.imageSmoothingEnabled=false;
    context.drawImage(texture,-cx-.5,-cy-.5);context.restore();
    $('scale').textContent=`${scale.toFixed(2)} CSS px / native pixel · ${payload.shape[1]} × ${payload.shape[0]} samples`;
  }
  function fit() {if(!payload)return;scale=Math.min(canvas.clientWidth/payload.shape[1],canvas.clientHeight/payload.shape[0]);cx=(payload.shape[1]-1)/2;cy=(payload.shape[0]-1)/2;draw();}
  function paint() {
    if(!arrays)return;
    const [h,w]=payload.shape,result=nativeRGBA(payload,arrays,settings());effective=result.display;
    texture=document.createElement('canvas');texture.width=w;texture.height=h;
    texture.getContext('2d').putImageData(new ImageData(result.rgba,w,h),0,0);
    $('parameters').textContent=`Display only: ${settings().limits} [${format(effective.vmin)}, ${format(effective.vmax)}] MJy/sr · ${settings().stretch} · contrast ${settings().contrast} · ${settings().palette}. Per-observation limits cannot establish brightness changes. Original arrays are unchanged.`;
    draw();
  }
  function inspectPixel(x,y) {
    const p=nativePixel(payload,arrays,x,y);
    $('pixel').textContent=p.x===undefined?p.reason:`Native [${x}, ${y}] · IMAGE ${format(p.value)} MJy/sr · VARIANCE ${format(p.variance)} (MJy/sr)² · λ ${format(p.wavelength_um)} μm · ICRS ${format(p.ra_deg)}°, ${format(p.dec_deg)}° · flags: ${p.flags.join(', ')||'none'} · ${p.reason}`;
  }
  function inspect(event) {
    if(!arrays)return;
    const box=canvas.getBoundingClientRect(),x=Math.floor((event.clientX-box.left-box.width/2)/scale+cx+.5),y=Math.floor(-(event.clientY-box.top-box.height/2)/scale+cy+.5);
    inspectPixel(x,y);
  }
  for(const element of root.querySelectorAll('input,select'))element.addEventListener('input',paint);
  $('fit').onclick=fit;$('one').onclick=()=>{if(payload){scale=1;cx=(payload.shape[1]-1)/2;cy=(payload.shape[0]-1)/2;draw();}};
  $('plus').onclick=()=>{scale=Math.min(64,scale*2);draw();};$('minus').onclick=()=>{scale=Math.max(.1,scale/2);draw();};
  canvas.onpointerdown=event=>{if(!arrays)return;canvas.setPointerCapture(event.pointerId);drag={x:event.clientX,y:event.clientY,cx,cy};inspect(event);};
  canvas.onpointermove=event=>{if(drag){cx=drag.cx-(event.clientX-drag.x)/scale;cy=drag.cy+(event.clientY-drag.y)/scale;draw();}inspect(event);};
  canvas.onpointerup=canvas.onpointercancel=()=>{drag=null;};
  canvas.addEventListener('wheel',event=>{if(!arrays)return;event.preventDefault();scale=Math.max(.1,Math.min(64,scale*Math.exp(-event.deltaY*.001)));draw();},{passive:false});
  canvas.onkeydown=event=>{if(!arrays)return;if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','Enter'].includes(event.key)){event.preventDefault();if(event.key==='Home')fit();else if(event.key==='Enter')inspectPixel(Math.round(cx),Math.round(cy));else{cx+=event.key==='ArrowLeft'?-5:event.key==='ArrowRight'?5:0;cy+=event.key==='ArrowDown'?-5:event.key==='ArrowUp'?5:0;draw();}}};
  const observer=new ResizeObserver(draw);observer.observe(canvas.parentElement);
  $('receipt').onclick=()=>{
    if(!payload)return;
    const receipt={schema_version:'1.0',kind:'native_display_receipt',usage:'single_observation_only',source:payload.observation.source,array_sha256:Object.fromEntries(Object.entries(payload.arrays).map(([name,a])=>[name,a.sha256])),settings:settings(),effective_limits:effective,viewport:{css_pixels_per_native_pixel:scale,cx,cy},scientific_approval:'PENDING',physical_change:'NOT_ESTABLISHED'};
    const url=URL.createObjectURL(new Blob([JSON.stringify(receipt,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download=payload.observation.observation_id+'-native-display.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  };
  return {
    async show(observation,supplied=null) {
      root.hidden=false;
      const selectedKey=observation?.source?.sha256+':'+observation?.observation_id;
      if(key===selectedKey&&payload&&(!supplied||supplied===activeSupplied)){draw();return true;}
      const ticket=++attempt;key=selectedKey;payload=arrays=texture=activeSupplied=null;drag=null;draw();
      $('identity').textContent='';$('source').removeAttribute('href');$('scale').textContent='';$('parameters').textContent='';
      $('pixel').textContent='No verified native measurement loaded.';$('status').textContent='Verifying original identity and native array checksums…';controls.forEach(e=>e.disabled=true);
      try {
        const result=await load(observation,supplied);if(ticket!==attempt)return false;
        payload=result.payload;arrays=result.arrays;activeSupplied=supplied;
        $('identity').textContent=`${payload.observation.observation_id} · ${payload.observation.time_start_utc} · ${payload.observation.release.toUpperCase()} / D${payload.observation.detector} · ${payload.shape[1]} × ${payload.shape[0]} original samples · ${payload.diagnostics.valid_percentage.toFixed(1)}% usable`;
        const source=new URL(payload.observation.source.source_url);
        if(source.protocol==='https:'&&['irsa.ipac.caltech.edu','nasa-irsa-spherex.s3.us-east-1.amazonaws.com'].includes(source.hostname))$('source').href=source.href;
        $('status').textContent='Verified original and native arrays. Single-observation inspection; no physical change is established.';
        controls.forEach(e=>e.disabled=false);paint();fit();return true;
      }catch(error){if(ticket===attempt){payload=arrays=texture=null;draw();$('status').textContent=error.message;}return false;}
    },
    hide(){root.hidden=true;++attempt;drag=null;},
    diagnostics(){return {visible:!root.hidden,loaded:Boolean(payload),source_sha256:payload?.observation.source.sha256,shape:payload?.shape,scale,settings:settings(),temporal_comparison_allowed:false};},
    destroy(){++attempt;observer.disconnect();root.replaceChildren();}
  };
}
