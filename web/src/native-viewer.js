import {sha256} from './science.js';
import {decodeNative,nativeRGBA,nativePixel} from './native-data.js';
const $=id=>document.getElementById('native-'+id),canvas=$('canvas'),ctx=canvas.getContext('2d');
const defaults={limits:'percentile',stretch:'asinh',asinh_a:.1,contrast:1,palette:'grayscale',mask:'overlay'};
let catalog,payload,arrays,entry,texture,effective,reference,scale=1,cx=0,cy=0,ticket=0,drag=null;
for(const el of document.querySelectorAll('.controls input,.controls select,.view-footer button'))el.disabled=true;
const settings=()=>({limits:$('limits').value,stretch:$('stretch').value,asinh_a:Number($('asinh').value),contrast:Number($('contrast').value),palette:$('palette').value,mask:$('mask').value});
const fmt=v=>Number.isFinite(v)?v.toPrecision(7):'nonfinite';
async function checked(url,hash) {
 const r=await fetch(url,{signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error('Observation asset unavailable');
 const bytes=new Uint8Array(await r.arrayBuffer());if(hash&&await sha256(bytes)!==hash)throw Error('Observation checksum mismatch');return bytes;
}
function restoreDefaults(){for(const [k,v] of Object.entries(defaults))$(k==='asinh_a'?'asinh':k).value=v;}
function paintTexture(){
 if(!arrays)return;
 const [h,w]=payload.shape,r=nativeRGBA(payload,arrays,settings());effective=r.display;
 texture=document.createElement('canvas');texture.width=w;texture.height=h;
 texture.getContext('2d').putImageData(new ImageData(r.rgba,w,h),0,0);
 $('parameters').textContent=`Limits ${settings().limits}: [${fmt(effective.vmin)}, ${fmt(effective.vmax)}] MJy/sr · stretch ${settings().stretch} · a ${settings().asinh_a} · contrast ${settings().contrast} · ${settings().palette} · no background subtraction`;
 draw();
}
function draw(){
 const box=canvas.getBoundingClientRect(),dpr=devicePixelRatio||1;
 canvas.width=Math.round(box.width*dpr);canvas.height=Math.round(box.height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);
 ctx.fillStyle='#04070c';ctx.fillRect(0,0,box.width,box.height);
 if(!texture)return;
 ctx.save();ctx.translate(box.width/2,box.height/2);ctx.scale(scale,-scale);ctx.imageSmoothingEnabled=false;
 ctx.drawImage(texture,-cx-.5,-cy-.5);ctx.restore();
 $('scale').textContent=`${scale.toFixed(2)} CSS px / native pixel · ${payload.shape[1]} × ${payload.shape[0]} samples · nearest`;
}
function fit(){if(!payload)return;scale=Math.min(canvas.clientWidth/payload.shape[1],canvas.clientHeight/payload.shape[0]);cx=(payload.shape[1]-1)/2;cy=(payload.shape[0]-1)/2;draw();}
function histogram(){
 const c=$('histogram'),g=c.getContext('2d'),hist=payload.diagnostics.valid_science.histogram,max=Math.max(...hist.counts);
 g.fillStyle='#0c1422';g.fillRect(0,0,c.width,c.height);g.fillStyle='#85c8ff';
 hist.counts.forEach((n,i)=>{const height=Math.log1p(n)/Math.log1p(max)*160;g.fillRect(20+i*660/64,175-height,660/64-1,height);});
 g.fillStyle='#bacade';g.font='12px monospace';g.fillText(fmt(hist.edges[0]),20,195);g.fillText(fmt(hist.edges.at(-1))+' MJy/sr',520,195);
 $('histogram-caption').textContent=`64 equal-width bins; log(1 + count) vertical scale. ${payload.diagnostics.valid_pixels.toLocaleString()} valid native pixels. Exact counts and edges are in the source diagnostics.`;
}
function metrics(){
 const d=payload.diagnostics;
 const items=[['Native dimensions',`${payload.shape[1]} × ${payload.shape[0]}`],['Detector-axis sky extent',d.coverage.projected_extent_arcmin.map(x=>x.toFixed(3)+'′').join(' × ')],['Pixel scale',d.coverage.pixel_scale_arcsec.map(x=>x.toFixed(4)+'″').join(' × ')],['Valid native samples',d.valid_percentage.toFixed(4)+'%'],['Spatial IMAGE variance',fmt(d.valid_science.variance)+' (MJy/sr)²'],['Median native VARIANCE',fmt(d.native_measurement_variance.median)+' (MJy/sr)²'],['Background median',fmt(d.background.value)+' MJy/sr'],['Median ZODI model',fmt(d.zodiacal_model.statistics.median)+' MJy/sr']];
 $('metrics').replaceChildren();for(const [k,v] of items){const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=k;dd.textContent=v;$('metrics').append(dt,dd);}
 $('flags').textContent=JSON.stringify({disjoint_categories:d.categories,flag_counts_overlap:d.flag_counts},null,2);
 $('provenance').textContent=`${payload.observation.time_start_utc} · detector ${payload.observation.detector} · source SHA-256 ${payload.observation.source.sha256}`;
 $('source').href=payload.observation.source.source_url;
 $('wcs').textContent=payload.processing+'\n'+payload.wcs_header.match(/.{1,80}/g).join('\n');histogram();
}
async function context(field,current){
 $('reference-status').textContent='Verifying attributed optical reference…';
 const c=$('reference'),g=c.getContext('2d');g.clearRect(0,0,720,720);
 try{
  const r=JSON.parse(new TextDecoder().decode(await checked(`./data/native/${field}-reference.json`)));
  const raw=await checked(r.image,r.image_sha256),image=await createImageBitmap(new Blob([raw],{type:'image/png'}));
  if(current!==ticket){image.close();return;}reference=r;
  g.drawImage(image,0,0);image.close();g.strokeStyle='#ffcc7b';g.lineWidth=2;
  const points=r.footprints[entry.id];if(points){g.beginPath();points.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.closePath();g.stroke();}
  g.strokeStyle='#5ff1ff';g.strokeRect(360-14.4,360-14.4,28.8,28.8);
  g.fillStyle='white';g.font='15px monospace';g.fillText('N ↑  E ← · 1° DSS2 optical context',15,25);
  $('reference-credit').textContent=r.credit+' '+r.reference_epoch;$('reference-source').href=r.properties_url;
  $('reference-status').textContent='Gold: approximate native footprint · cyan: restricted 2.4′ field. '+r.credit;
 }catch(e){if(current===ticket)$('reference-status').textContent='Reference unavailable: '+e.message+'. Native measurements remain independent.';}
}
async function load(id){
 const current=++ticket;entry=catalog.entries.find(x=>x.id===id);payload=arrays=texture=reference=null;draw();
 $('title').textContent='No verified native observation loaded';
 for(const id of ['metrics','flags','provenance','wcs','parameters','scale'])$(id).replaceChildren();
 $('source').removeAttribute('href');$('pixel').textContent='No native pixel measurement loaded.';
 $('reference').getContext('2d').clearRect(0,0,720,720);$('reference-status').textContent='No reference loaded.';$('reference-credit').textContent='';
 $('status').textContent='Verifying native observation and array checksums…';
 for(const el of document.querySelectorAll('.controls input,.controls select,.view-footer button'))el.disabled=true;
 try{
  if(!entry)throw Error('This source has no installed native original. Return to its verified observation; no alternate source has been substituted.');
  const p=JSON.parse(new TextDecoder().decode(await checked(entry.url,entry.sha256)));
  if(p.observation.source.sha256!==entry.source_sha256||p.observation.observation_id!==entry.observation_id)throw Error('Original identity differs');
  const a=await decodeNative(p);if(current!==ticket)return;payload=p;arrays=a;
  $('title').textContent=(entry.field==='m101'?'M101':'R Draconis')+' / '+p.observation.observation_id;
  $('irsa').href='https://irsa.ipac.caltech.edu/irsaviewer/';
  $('irsa').title='Choose Upload → Upload from URL and paste the original archive FITS URL, or upload the downloaded original. The milestone evidence uses exact hash-checked uploads.';
  $('comparison').href=entry.field==='m101'?'./#compare':'./#target-example/r-draconis-temporal';
  $('pixel').textContent='Select a native pixel. Purple / neutral excluded values remain unmeasured in every display mode.';
  restoreDefaults();metrics();paintTexture();fit();
  $('status').textContent='Verified: original FITS identity + all native array checksums. Single observation only; no temporal eligibility is implied.';
  history.replaceState(null,'','?'+new URLSearchParams({source:entry.source_sha256}));
  for(const el of document.querySelectorAll('.controls input,.controls select,.view-footer button'))el.disabled=false;
  void context(entry.field,current);
 }catch(e){if(current===ticket)$('status').textContent=e.message;}
}
function observations(field,selected){
 $('field').value=field;$('observation').replaceChildren();
 for(const e of catalog.entries.filter(e=>e.field===field)){const o=document.createElement('option');o.value=e.id;o.textContent=e.observation_id;$('observation').append(o);}
 if(selected)$('observation').value=selected;return load($('observation').value);
}
for(const id of ['limits','stretch','asinh','contrast','palette','mask'])$(id).addEventListener('input',paintTexture);
$('field').onchange=()=>observations($('field').value);$('observation').onchange=()=>load($('observation').value);
$('fit').onclick=fit;$('1x').onclick=()=>{scale=1;cx=(payload.shape[1]-1)/2;cy=(payload.shape[0]-1)/2;draw();};
$('plus').onclick=()=>{scale=Math.min(64,scale*2);draw();};$('minus').onclick=()=>{scale=Math.max(.25,scale/2);draw();};
$('reset').onclick=()=>{restoreDefaults();paintTexture();fit();};
function inspect(e){if(!arrays)return;const r=canvas.getBoundingClientRect(),x=Math.floor((e.clientX-r.left-r.width/2)/scale+cx+.5),y=Math.floor(-(e.clientY-r.top-r.height/2)/scale+cy+.5),p=nativePixel(payload,arrays,x,y);
 $('pixel').textContent=p.x===undefined?p.reason:`Native [${x}, ${y}] · IMAGE ${fmt(p.value)} MJy/sr · VARIANCE ${fmt(p.variance)} (MJy/sr)² · λ ${fmt(p.wavelength_um)} μm · ICRS ${fmt(p.ra_deg)}°, ${fmt(p.dec_deg)}° · flags ${p.flags.join(', ')||'none'} · ${p.reason}`;}
canvas.onpointerdown=e=>{if(!arrays)return;canvas.setPointerCapture(e.pointerId);drag={x:e.clientX,y:e.clientY,cx,cy};inspect(e);};
canvas.onpointermove=e=>{if(drag){cx=drag.cx-(e.clientX-drag.x)/scale;cy=drag.cy+(e.clientY-drag.y)/scale;draw();}inspect(e);};
canvas.onpointerup=canvas.onpointercancel=()=>{drag=null;};canvas.onkeydown=e=>{if(!arrays)return;if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();cx+=e.key==='ArrowLeft'?-5:e.key==='ArrowRight'?5:0;cy+=e.key==='ArrowDown'?-5:e.key==='ArrowUp'?5:0;draw();}if(e.key==='Home')fit();};
new ResizeObserver(draw).observe(canvas.parentElement);
$('save').onclick=()=>{const receipt={schema_version:'1.0',kind:'native_display_receipt',usage:'single_observation_only',source:payload.observation.source,asset_sha256:entry.sha256,array_sha256:Object.fromEntries(Object.entries(payload.arrays).map(([k,v])=>[k,v.sha256])),diagnostics:payload.diagnostics,settings:settings(),effective_limits:effective,viewport:{css_pixels_per_native_pixel:scale,cx,cy},reference:reference?{survey:reference.survey,image_sha256:reference.image_sha256,usage:reference.usage}:null,scientific_approval:'PENDING',physical_change:'NOT_ESTABLISHED'};
 const url=URL.createObjectURL(new Blob([JSON.stringify(receipt,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download=entry.id+'-display.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
try{
 catalog=JSON.parse(new TextDecoder().decode(await checked('./data/native/catalog.json')));
 const hash=new URLSearchParams(location.search).get('source'),requested=catalog.entries.find(e=>e.source_sha256===hash);
 if(hash&&!requested)throw Error('This original is not installed in the native viewer. No source has been substituted. Return to the observation or select an installed source.');
 await observations(requested?.field||'m101',requested?.id);
}catch(e){$('status').textContent=e.message;}
Object.defineProperty(window,'skyshiftNative',{value:Object.freeze({diagnostics:()=>({id:entry?.id,shape:payload?.shape,settings:settings(),effective_limits:effective,scale,source_sha256:payload?.observation.source.sha256,reference:reference?.image_sha256}),renderPixels:()=>texture?Array.from(texture.getContext('2d').getImageData(0,0,texture.width,texture.height).data):null})});
