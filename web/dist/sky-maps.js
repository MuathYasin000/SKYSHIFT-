import {sha256,pixelToSky,skyToPixel} from './science.js';
import {displayLevel,paletteRGB} from './visualization.js';
import {requestFromURL,requestURL} from './coordinate-query.js';
import {validateMosaicManifest,createMosaicLoader} from './mosaic-data.js';

export function createSkyMaps({root}) {
 root.className='sky-maps';
 root.innerHTML=`<header class="map-header"><div><p class="map-eyebrow">SPHEREX / WAVELENGTH & SKY CONTEXT</p><h1 id="map-title">Explore the infrared sky</h1></div><div class="map-actions"><a id="map-dates" class="map-primary">Explore observations at this position →</a><a id="map-native" href="#target-example/m101-time-explorer">M101 native images & dates ↗</a><a href="#sky-search">Coordinates</a></div></header>
 <nav id="map-regions" class="map-regions" aria-label="Genuine SPHEREx sky regions"></nav>
 <p id="map-description" class="map-description"></p><div id="map-controls" class="map-tools"><label class="map-wavelength">Infrared wavelength <input id="map-plane" type="range" min="1" max="102" value="63" aria-label="Mosaic wavelength plane"><output id="map-wave"></output></label><label>Limits<select id="map-limits"><option value="percentile">1–99.7 percentile</option><option value="zscale">ZScale</option></select></label><label>Stretch<select id="map-stretch"><option value="asinh">Asinh</option><option value="linear">Linear</option><option value="log">Log</option></select></label><label>Palette<select id="map-palette"><option value="ember">Ember · false color</option><option value="grayscale">Grayscale</option><option value="ice">Ice · false color</option></select></label></div>
 <div class="map-caption"><span id="map-identity"></span><span id="map-coverage"></span></div><div class="map-canvas-wrap"><canvas id="map-canvas" tabindex="0" aria-label="Infrared sky image; drag to pan, wheel or plus/minus to zoom, Home to fit; click or Enter to inspect"></canvas></div>
 <div class="map-footer"><div><button id="map-fit">Fit sky</button><button id="map-one">1:1 pixels</button><button id="map-minus" aria-label="Zoom sky image out">−</button><button id="map-plus" aria-label="Zoom sky image in">+</button></div><output id="map-scale"></output><div><button id="map-save">Save view receipt ↓</button><a id="map-original" target="_blank" rel="noopener noreferrer">Original source ↗</a></div></div>
 <p id="map-status" class="map-loading" role="status"></p><div id="map-pixel" class="map-inspection">Select a measured mosaic pixel.</div><p id="map-coordinate" class="map-coordinate"></p><p id="map-credit" class="map-description"></p><details class="map-provenance"><summary>Source identity, processing & limitations</summary><pre id="map-provenance"></pre></details>`;
 const $=id=>root.querySelector('#map-'+id),canvas=$('canvas'),context=canvas.getContext('2d');
 let catalog,entry,manifest,planeData,bitmap,texture,ticket=0,active=false,selected,scale=1,cx=0,cy=0,drag,loader=createMosaicLoader(),currentPlane=62;
 const format=n=>Number.isFinite(n)?n.toPrecision(7):'nonfinite';
 const settings=()=>({limits:$('limits').value,stretch:$('stretch').value,palette:$('palette').value});
 async function checked(url,hash,bound=2000000){const r=await fetch(url,{signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error('Official sky asset unavailable');if(Number(r.headers.get('Content-Length'))>bound)throw Error('Sky asset exceeds its transfer bound');const b=new Uint8Array(await r.arrayBuffer());if(b.length>bound||hash&&await sha256(b)!==hash)throw Error('Sky asset checksum or transfer bound differs');return b;}
 function dimensions(){return manifest?manifest.shape.slice(1):bitmap?[bitmap.height,bitmap.width]:null;}
 function links(){
  if(!selected)return;
  $('coordinate').textContent=`Selected search centre · ICRS ${selected.ra_deg.toFixed(7)}°, ${selected.dec_deg.toFixed(7)}°. `+(manifest?'Click the WCS-calibrated mosaic to change this position.':'Published target centre only; image pixels are not assigned celestial coordinates.');
  const request={schema_version:'1.0',kind:'skyshift-observation-request',release:'qr2',detector:2,region:{...selected,size_deg:.04,frame:'icrs'}};
  $('dates').href=requestURL(request,location.href);
  $('native').hidden=entry.id!=='m101';
  const url=new URL(location.href);url.searchParams.set('ra',selected.ra_deg);url.searchParams.set('dec',selected.dec_deg);url.searchParams.set('fov','2.4');url.searchParams.set('release','qr2');
  if(manifest)url.searchParams.set('plane',currentPlane+1);else url.searchParams.delete('plane');history.replaceState(null,'',url);
 }
 function draw(){
  if(!active)return;
  const box=canvas.getBoundingClientRect(),dpr=devicePixelRatio||1;canvas.width=Math.max(1,Math.round(box.width*dpr));canvas.height=Math.max(1,Math.round(box.height*dpr));context.setTransform(dpr,0,0,dpr,0,0);context.fillStyle='#000';context.fillRect(0,0,box.width,box.height);
  const image=texture||bitmap;if(!image)return;
  context.save();context.translate(box.width/2,box.height/2);context.scale(scale,manifest?-scale:scale);context.imageSmoothingEnabled=!manifest;context.drawImage(image,-cx-.5,-cy-.5);context.restore();
  if(manifest&&selected){const p=skyToPixel(selected.ra_deg,selected.dec_deg,manifest.wcs),x=box.width/2+(p.x-cx)*scale,y=box.height/2-(p.y-cy)*scale;if(p.x>=0&&p.y>=0&&p.x<manifest.shape[2]&&p.y<manifest.shape[1]){context.strokeStyle='#fff';context.beginPath();context.moveTo(x-7,y);context.lineTo(x+7,y);context.moveTo(x,y-7);context.lineTo(x,y+7);context.stroke();}}
  const [h,w]=dimensions();$('scale').textContent=`${w} × ${h} ${manifest?'measured samples · N ↑ E ← · nearest-pixel display':'published image pixels · no calibrated pixel WCS'} · ${scale.toFixed(2)} CSS px / pixel`;
 }
 function fit(){const shape=dimensions();if(!shape)return;const [h,w]=shape;scale=Math.min(canvas.clientWidth/w,canvas.clientHeight/h);cx=(w-1)/2;cy=(h-1)/2;draw();}
 function paint(){
  if(!planeData||!manifest)return;
  const [h,w]=manifest.shape.slice(1),a=planeData.arrays,c=manifest.channels[currentPlane],s=settings(),d={...c.display[s.limits],asinh_a:.06};
  const image=new ImageData(w,h);
  for(let i=0;i<a.SCI.length;i++)image.data.set([...(a.VALID[i]?paletteRGB(displayLevel(a.SCI[i],d,s),s.palette):a.HITS[i]>0?[67,23,75]:[18,18,18]),255],i*4);
  texture=document.createElement('canvas');texture.width=w;texture.height=h;texture.getContext('2d').putImageData(image,0,0);draw();
 }
 async function selectPlane(index){
  if(!manifest||!Number.isInteger(index)||index<0||index>=102)return;
  const current=++ticket;currentPlane=index;planeData=texture=null;draw();$('plane').value=String(index+1);const c=manifest.channels[index];
  $('wave').textContent=`${c.wavelength_um.toFixed(3)} μm · ${index+1}/102`; $('plane').setAttribute('aria-valuetext',$('wave').textContent);
  $('identity').textContent=`Official IRSA mosaic · plane ${index+1} · D${c.detector}/${c.subchannel} · bandwidth ${c.bandwidth_um.toFixed(3)} μm`;
  $('coverage').textContent=`${(c.coverage_fraction*100).toFixed(1)}% hit coverage · ${(c.valid_fraction*100).toFixed(1)}% display-usable`;
  $('status').textContent='Verifying original mosaic plane and measured-array checksums…';$('pixel').textContent='No pixel measurement selected for this wavelength.';links();
  try{const value=await loader.load(manifest,index);if(current!==ticket||!active)return;planeData=value;paint();$('status').textContent=c.available?'Wavelength exploration only — this is not a time sequence. Gray: no hits; purple: quality excluded. No variance map is supplied.':'This wavelength plane has no display-usable coverage. No neighbouring wavelength has been substituted.';}
  catch(e){if(current===ticket)$('status').textContent=e.message;}
 }
 function inspect(x,y){
  if(!manifest||!planeData)return;
  x=Math.round(x);y=Math.round(y);const [h,w]=manifest.shape.slice(1);
  if(x<0||y<0||x>=w||y>=h){$('pixel').textContent='Outside the original mosaic footprint; no measurement.';return;}
  const a=planeData.arrays,i=y*w+x,sky=pixelToSky(x,y,manifest.wcs);selected=sky;links();draw();
  const flags=Object.entries(manifest.flag_definitions).filter(([,b])=>(a.FLAGS[i]&(2**b))!==0).map(([n])=>n);
  $('pixel').textContent=`Pixel [${x}, ${y}] · IMAGE ${format(a.SCI[i])} MJy/sr · NHITS ${a.HITS[i]} · flags ${flags.join(', ')||'none'} · ${manifest.channels[currentPlane].wavelength_um.toFixed(3)} μm · ${a.VALID[i]?'Display-usable; no calibrated photometry or variability is established.':'No usable measurement under the conservative display mask.'}`;
 }
 async function open(id='m101'){
  active=true;root.hidden=false;const current=++ticket;planeData=manifest=texture=null;bitmap?.close();bitmap=null;loader.clear();draw();$('status').textContent='Loading authenticated SPHEREx sky context…';
  try{
   catalog??=JSON.parse(new TextDecoder().decode(await checked('./data/sky-products.json',null)));
   if(current!==ticket||!active)return;
   const next=catalog.entries.find(e=>e.id===id);if(!next)throw Error('This region has no supported installed sky product');entry=next;
   $('regions').replaceChildren();for(const region of catalog.entries){const a=document.createElement('button');a.textContent=region.name;a.setAttribute('aria-pressed',String(region.id===id));a.onclick=()=>{const url=new URL(location.href);url.search='';url.hash='sky-map/'+region.id;history.pushState(null,'',url);void open(region.id);};$('regions').append(a);}
   $('title').textContent=entry.name;$('description').textContent=entry.description;$('credit').textContent=entry.credit;
   const request=requestFromURL(location.href);selected=request?.region?{ra_deg:request.region.ra_deg,dec_deg:request.region.dec_deg}:{...entry.centre};
   $('controls').hidden=entry.kind!=='mosaic_cube';$('original').href=entry.source_url;
   if(entry.kind==='mosaic_cube'){
    const data=JSON.parse(new TextDecoder().decode(await checked(entry.manifest_url,entry.manifest_sha256)));
    validateMosaicManifest(data);if(current!==ticket)return;manifest=data;
    $('provenance').textContent=JSON.stringify(manifest,null,2);
    const p=new URL(location.href).searchParams.get('plane');const requested=p?Number(p):manifest.default_plane;
    if(!Number.isInteger(requested)||requested<1||requested>102)throw Error('Wavelength plane must be an integer from 1 to 102');
    fit();await selectPlane(requested-1);
   }else{
    const raw=await checked(entry.image_url,entry.sha256,8000000);const image=await createImageBitmap(new Blob([raw],{type:'image/jpeg'}));if(current!==ticket){image.close();return;}bitmap=image;
    $('identity').textContent='Official published SPHEREx image · contextual reference only';$('coverage').textContent='Publication date '+entry.published_date+' · not an exposure timestamp';
    $('pixel').textContent='This credited published image has no independently validated pixel WCS in SKYSHIFT. Pixel measurements, masks and temporal comparison are unavailable.';
    $('status').textContent=entry.mapping+' No published JPG enters a scientific time series.';$('provenance').textContent=JSON.stringify(entry,null,2);fit();links();
   }
  }catch(e){if(current===ticket){$('status').textContent=e.message;texture=null;draw();}}
 }
 for(const name of ['limits','stretch','palette'])$(name).onchange=paint;
 $('plane').oninput=()=>selectPlane(Number($('plane').value)-1);$('fit').onclick=fit;$('one').onclick=()=>{scale=1;draw();};$('plus').onclick=()=>{scale=Math.min(64,scale*1.5);draw();};$('minus').onclick=()=>{scale=Math.max(.1,scale/1.5);draw();};
 canvas.onpointerdown=e=>{canvas.setPointerCapture(e.pointerId);drag={x:e.clientX,y:e.clientY,cx,cy};const r=canvas.getBoundingClientRect();if(manifest)inspect((e.clientX-r.left-r.width/2)/scale+cx,(r.height/2-e.clientY+r.top)/scale+cy);};
 canvas.onpointermove=e=>{if(drag){cx=drag.cx-(e.clientX-drag.x)/scale;cy=drag.cy+(manifest?1:-1)*(e.clientY-drag.y)/scale;draw();}};
 canvas.onpointerup=canvas.onpointercancel=()=>drag=null;
 canvas.addEventListener('wheel',e=>{e.preventDefault();scale=Math.max(.1,Math.min(64,scale*Math.exp(-e.deltaY*.001)));draw();},{passive:false});
 canvas.onkeydown=e=>{if(['Home','Enter','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','-'].includes(e.key)){e.preventDefault();if(e.key==='Home')fit();else if(e.key==='Enter')inspect(cx,cy);else if(e.key==='+'||e.key==='-'){scale=Math.max(.1,Math.min(64,scale*(e.key==='+'?1.5:1/1.5)));draw();}else{cx+=e.key==='ArrowLeft'?-5:e.key==='ArrowRight'?5:0;cy+=e.key==='ArrowDown'?(manifest?-5:5):e.key==='ArrowUp'?(manifest?5:-5):0;draw();}}};
 new ResizeObserver(draw).observe(canvas.parentElement);
 $('save').onclick=()=>{if(!entry)return;const receipt={schema_version:'1.0',kind:'sky_context_view_receipt',usage:manifest?'multi_epoch_wavelength_context_only':'published_image_context_only',temporal_comparison_allowed:false,product:entry,plane:manifest?manifest.channels[currentPlane]:null,selected_coordinate:selected,display:settings(),viewport:{scale,cx,cy},source:manifest?.source||entry.source_url};const url=URL.createObjectURL(new Blob([JSON.stringify(receipt,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download=entry.id+'-sky-context.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
 $('dates').onclick=e=>{e.preventDefault();history.pushState(null,'',$('dates').href);window.dispatchEvent(new PopStateEvent('popstate'));window.dispatchEvent(new HashChangeEvent('hashchange'));};
 return {open,close(){active=false;root.hidden=true;++ticket;},diagnostics:()=>({active,id:entry?.id,kind:entry?.kind,plane:manifest?currentPlane+1:null,wavelength_um:manifest?.channels[currentPlane]?.wavelength_um,loaded:Boolean(planeData||bitmap),selected,cache_planes:loader.size(),source_sha256:manifest?.source.sha256||entry?.sha256,shape:dimensions()}),pixels:()=>texture?Array.from(texture.getContext('2d').getImageData(0,0,texture.width,texture.height).data):null};
}
