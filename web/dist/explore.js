import {loadCatalog,galleries,make} from './site.js';
import {pixelToSky} from './science.js';
import {defaultVisualization,displayLevel,paletteRGB,validateVisualization} from './visualization.js';
import {stories,availability,friendlyDate} from './field-guide.js';
import {showSources} from './visitor.js';
import {createExposureLoader} from './exposure-loader.js';
import {MAX_VIEW_RECORD_BYTES,createExposureRecord,parseExposureRecord,resolveExposureRecord,validateExposureRecord} from './exposure-records.js';

const $=id=>document.getElementById(id);
const state={catalog:null,field:null,product:null,arrays:null,entry:null,visual:{...defaultVisualization},zoom:1,cx:0,cy:0,contrast:1,request:0,importRequest:0};
const loadExposure=createExposureLoader();
let source=null;

function busy(value){
  $('explorer').setAttribute('aria-busy',String(value));
  $('explore-loading').hidden=!value;
  $('explore-content').hidden=value||!state.product;
  $('context-source').disabled=value||!state.product;
  $('export-context').disabled=value||!state.product;
}
function facts(){
  const p=state.product,o=p.observation;
  $('exposure-summary').textContent='Viewing one exposure · '+friendlyDate(o.time_start_utc,true);
  const items=[['Exposure start (UTC)',o.time_start_utc],['Exposure end (UTC)',o.time_end_utc],['Wavelength range',p.wavelength_range_um.map(x=>x.toFixed(4)).join('–')+' μm'],['At the field center',`λ ${o.center_wavelength_um.toFixed(4)} μm · bandwidth ${o.center_bandwidth_um.toFixed(4)} μm`],['Release / detector / pipeline',`${o.release.toUpperCase()} / D${o.detector} / ${o.pipeline_version}`],['Original cutout',`${p.native_shape[1]} × ${p.native_shape[0]} pixels`],['Prepared context',`${p.shape[1]} × ${p.shape[0]} pixels · ${p.pixel_scale_arcsec} arcsec/pixel`],['Usable context pixels',(100*state.arrays.VALID.reduce((a,b)=>a+b,0)/state.arrays.VALID.length).toFixed(1)+'%'],['Center (ICRS sky coordinates)',`${state.field.ra_deg.toFixed(5)}°, ${state.field.dec_deg.toFixed(5)}°`]];
  $('explore-facts').replaceChildren();
  for(const [k,v]of items){const row=make('div');row.append(make('dt',k),make('dd',v));$('explore-facts').append(row);}
  $('explore-source').replaceChildren();
  for(const [label,f]of [['Original FITS',o.source],['Full spectral calibration',o.spectral_calibration]]){
    const row=make('div',undefined,'source-row');row.append(make('strong',label),make('code',f.path),make('code','SHA-256 '+f.sha256));
    const a=make('a','Open original NASA/IPAC source ↗');a.href=f.source_url;a.target='_blank';a.rel='noreferrer';row.append(a);$('explore-source').append(row);
  }
  $('explore-source').append(make('p','Conservative mask: only the SOURCE flag is retained. Other declared and unknown flags are masked, and every bilinear contributor must be usable.'));
}
function render(){
  if(!state.product)return;
  const [h,w]=state.product.shape,p=state.product,canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
  const ctx=canvas.getContext('2d'),im=ctx.createImageData(w,h),display={...p.display,vmax:p.display.vmin+(p.display.vmax-p.display.vmin)/state.contrast};
  for(let i=0;i<w*h;i++){
    const rgb=state.arrays.VALID[i]?paletteRGB(displayLevel(state.arrays.SCI[i],display,state.visual),state.visual.palette):[20,33,51];
    im.data.set([...rgb,255],i*4);
  }
  ctx.putImageData(im,0,0);source=canvas;draw();
}
function geometry(){const rect=$('explore-canvas').getBoundingClientRect(),[h,w]=state.product.shape;return {width:rect.width,height:rect.height,scale:Math.min(rect.width/w,rect.height/h)*state.zoom};}
function draw(){
  if(!source||!state.product||$('explore-content').hidden)return;
  const c=$('explore-canvas'),g=geometry(),dpr=Math.min(devicePixelRatio||1,2);if(!g.width||!g.height)return;
  c.width=Math.round(g.width*dpr);c.height=Math.round(g.height*dpr);const ctx=c.getContext('2d');
  ctx.setTransform(dpr,0,0,dpr,0,0);ctx.fillStyle='#030710';ctx.fillRect(0,0,g.width,g.height);ctx.save();
  ctx.translate(g.width/2,g.height/2);ctx.scale(g.scale,-g.scale);ctx.imageSmoothingEnabled=state.visual.interpolation==='smooth';ctx.imageSmoothingQuality='high';ctx.drawImage(source,-state.cx-.5,-state.cy-.5);
  const [h,w]=state.product.shape;ctx.fillStyle='#142133';
  for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(!state.arrays.VALID[y*w+x])ctx.fillRect(x-state.cx-.5,y-state.cy-.5,1,1);
  ctx.restore();ctx.font='11px Consolas,monospace';ctx.fillStyle='#cbd9f4';ctx.fillText('N ↑',g.width-45,26);ctx.fillText('E ←',g.width-45,44);$('explore-zoom').textContent=state.zoom.toFixed(1)+'×';
}
function setZoom(z){if(!state.product)return;state.zoom=Math.max(1,Math.min(20,z));draw();}

async function selectObservation(entry,index,remember=false){
  const seq=++state.request;
  const button=$('observation-timeline').children[index],returnFocus=document.activeElement===button;
  if(!$('open-context').disabled)fileFeedback('Use an Explore JSON record. Comparison ZIPs reopen in Compare.');
  state.entry=entry;state.product=null;state.arrays=null;source=null;
  $('explore-error').hidden=true;$('explore-retry').hidden=true;$('exposure-summary').textContent='Checking the selected exposure…';busy(true);
  try{
    const loaded=await loadExposure(entry);
    if(seq!==state.request)return;
    state.product=loaded.product;state.arrays=loaded.arrays;
    const [h,w]=state.product.shape;
    state.zoom=1;state.cx=(w-1)/2;state.cy=(h-1)/2;state.contrast=1;$('explore-contrast').value=1;
    for(const [i,b]of [...$('observation-timeline').children].entries()){b.classList.toggle('selected',i===index);b.setAttribute('aria-pressed',String(i===index));}
    facts();busy(false);render();$('explore-coordinate').textContent='Move over the image to read a prepared pixel.';
    if(remember)rememberExposure(state.field,entry);
    if(returnFocus)button.focus({preventScroll:true});
  }catch(e){
    if(seq!==state.request)return;
    state.product=null;state.arrays=null;source=null;busy(false);$('explore-loading').hidden=true;
    $('exposure-summary').textContent='Exposure unavailable · nothing has been displayed';
    $('explore-error').hidden=false;$('explore-error').textContent=e.message;$('explore-retry').hidden=false;
  }
}

function describeField(f){
  const story=stories[f.id],status=availability(f);state.field=f;
  $('explore-title').textContent=f.title;$('explore-description').textContent='Explore a single real infrared exposure. This larger view is not a time comparison.';
  $('compare-link').hidden=!status.limited;$('explore-status').textContent=status.explanation;
  $('object-kind').textContent=story?.kind||'CURATED SKY REGION';$('object-name').textContent=story?.name||f.title;
  $('object-story').textContent=story?.story||f.description;$('look-prompt').textContent=story?.look||'Explore the measured light and its quality mask.';$('object-caution').textContent=story?.caution||'';
  $('object-source').href=story?.source||'https://science.nasa.gov/mission/spherex/';
  for(const a of document.querySelectorAll('[data-field]')){if(a.dataset.field===f.id)a.setAttribute('aria-current','true');else a.removeAttribute('aria-current');}
  $('observation-timeline').replaceChildren();
  for(const [i,o]of f.observations.entries()){
    const b=make('button',friendlyDate(o.time_start_utc));b.title='Individual exposure · '+friendlyDate(o.time_start_utc,true);b.setAttribute('aria-label','View single exposure '+friendlyDate(o.time_start_utc));
    b.addEventListener('click',()=>selectObservation(o,i,true));$('observation-timeline').append(b);
  }
}
function rememberExposure(field,entry){
  const url=new URL(location.href);url.searchParams.set('field',field.id);url.searchParams.set('observation',entry.observation_id);url.hash='explorer';
  if(url.href!==location.href)history.pushState(null,'',url);
}
function choose(id,observationId){
  const known=state.catalog.fields.find(f=>f.id===id),f=known||state.catalog.fields[0];
  const requested=f.observations.findIndex(o=>o.observation_id===observationId),index=requested>=0?requested:0;
  describeField(f);const pending=selectObservation(f.observations[index],index);
  if(id&&!known)fileFeedback('Requested sky region is unavailable. Showing '+f.title+' instead.',true);
  else if(observationId&&requested<0)fileFeedback('Requested observation is unavailable. Showing this field’s first verified exposure instead.',true);
  return pending;
}
function openLocation(){
  const query=new URLSearchParams(location.search);return choose(query.get('field')||'m101',query.get('observation'));
}

const canvas=$('explore-canvas');let drag=null;
canvas.addEventListener('pointerdown',e=>{if(!state.product)return;canvas.setPointerCapture(e.pointerId);drag={x:e.clientX,y:e.clientY,cx:state.cx,cy:state.cy};});
canvas.addEventListener('pointermove',e=>{
  if(!state.product)return;
  const g=geometry(),rect=canvas.getBoundingClientRect(),[h,w]=state.product.shape;
  if(drag){state.cx=Math.max(0,Math.min(w-1,drag.cx-(e.clientX-drag.x)/g.scale));state.cy=Math.max(0,Math.min(h-1,drag.cy+(e.clientY-drag.y)/g.scale));draw();}
  const x=(e.clientX-rect.left-g.width/2)/g.scale+state.cx,y=-(e.clientY-rect.top-g.height/2)/g.scale+state.cy,ix=Math.round(x),iy=Math.round(y);
  if(ix<0||iy<0||ix>=w||iy>=h){$('explore-coordinate').textContent='Outside the prepared image.';return;}
  const i=iy*w+ix,sky=pixelToSky(ix,iy,state.product.wcs),valid=state.arrays.VALID[i];
  $('explore-coordinate').textContent=`ICRS ${sky.ra_deg.toFixed(6)}°, ${sky.dec_deg.toFixed(6)}° · pixel ${ix}, ${iy} · ${valid?state.arrays.SCI[i].toPrecision(6)+' MJy/sr · wavelength '+state.arrays.WAVE[i].toFixed(4)+' μm · bandwidth '+state.arrays.BAND[i].toFixed(4)+' μm':'excluded / no usable data'}`;
});
for(const event of ['pointerup','pointercancel'])canvas.addEventListener(event,()=>drag=null);
canvas.addEventListener('wheel',e=>{if(!state.product)return;e.preventDefault();setZoom(state.zoom*(e.deltaY<0?1.15:1/1.15));},{passive:false});
$('explore-plus').onclick=()=>setZoom(state.zoom*1.25);$('explore-minus').onclick=()=>setZoom(state.zoom/1.25);
$('explore-reset').onclick=()=>{if(!state.product)return;state.cx=(state.product.shape[1]-1)/2;state.cy=(state.product.shape[0]-1)/2;setZoom(1);};
canvas.addEventListener('keydown',e=>{
  if(!state.product)return;
  if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();const [h,w]=state.product.shape;state.cx=Math.max(0,Math.min(w-1,state.cx+({'ArrowLeft':-1,'ArrowRight':1}[e.key]||0)));state.cy=Math.max(0,Math.min(h-1,state.cy+({'ArrowUp':1,'ArrowDown':-1}[e.key]||0)));draw();}
  if(e.key==='+'||e.key==='='){e.preventDefault();setZoom(state.zoom*1.25);}if(e.key==='-'){e.preventDefault();setZoom(state.zoom/1.25);}
});
new ResizeObserver(draw).observe(canvas);
for(const key of ['stretch','palette','interpolation'])$('explore-'+key).addEventListener('change',e=>{state.visual=validateVisualization({...state.visual,[key]:e.target.value});render();});
$('explore-contrast').addEventListener('input',e=>{state.contrast=Number(e.target.value);render();});
$('context-source').onclick=e=>{if(state.product)showSources([state.product.observation],state.product.processing,e.currentTarget);};
$('explore-retry').onclick=()=>{const i=state.field.observations.indexOf(state.entry);selectObservation(state.entry,i);};
$('export-context').onclick=()=>{
  if(!state.product)return;
  const p=state.product,record=createExposureRecord(state.field,state.entry,p,{visualization:state.visual,contrast:state.contrast,viewport:{zoom:state.zoom,center_x:state.cx,center_y:state.cy}});
  const a=make('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(record,null,2)],{type:'application/json'}));a.download='SKYSHIFT-'+p.observation.observation_id+'-single-view.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),10000);
};
function fileFeedback(message,error=false){$('view-record-feedback').textContent=message;$('view-record-feedback').classList.toggle('is-error',error);}
$('open-context').onclick=()=>$('import-context-file').click();
$('import-context-file').onchange=async event=>{
  const file=event.currentTarget.files?.[0];event.currentTarget.value='';if(!file||!state.catalog)return;
  const importSeq=++state.importRequest,selectionSeq=state.request;
  $('open-context').disabled=true;fileFeedback('Checking your saved exposure view…');
  try{
    if(file.size>MAX_VIEW_RECORD_BYTES)throw Error('Saved exposure view must be a JSON file no larger than 128 KB.');
    const record=parseExposureRecord(new Uint8Array(await file.arrayBuffer()));
    const {field,entry,index}=resolveExposureRecord(record,state.catalog);
    const loaded=await loadExposure(entry);
    const view=validateExposureRecord(record,field,entry,loaded.product);
    if(importSeq!==state.importRequest)return;
    if(selectionSeq!==state.request){fileFeedback('Opening canceled because you selected another exposure.');return;}
    // Commit only after all validation succeeds. Bad files leave the current view intact.
    state.request++;describeField(field);
    state.product=loaded.product;state.arrays=loaded.arrays;state.entry=entry;state.visual=view.visualization;
    state.contrast=view.contrast;state.zoom=view.viewport.zoom;state.cx=view.viewport.center_x;state.cy=view.viewport.center_y;
    for(const key of ['stretch','palette','interpolation'])$('explore-'+key).value=state.visual[key];
    $('explore-contrast').value=state.contrast;
    for(const [i,button]of [...$('observation-timeline').children].entries()){button.classList.toggle('selected',i===index);button.setAttribute('aria-pressed',String(i===index));}
    $('explore-error').hidden=true;$('explore-retry').hidden=true;
    facts();busy(false);render();$('explore-coordinate').textContent='Move over the image to read a prepared pixel.';
    rememberExposure(field,entry);
    fileFeedback('Saved exposure view restored. Scientific data and restrictions are unchanged.');
    $('explore-canvas').focus({preventScroll:true});
  }catch(e){if(importSeq===state.importRequest)fileFeedback('Could not open this view: '+e.message,true);}
  finally{if(importSeq===state.importRequest)$('open-context').disabled=false;}
};
function skyMap(catalog){
  const svg=$('sky-map'),NS='http://www.w3.org/2000/svg';
  function add(tag,attrs,text){const e=document.createElementNS(NS,tag);for(const [k,v]of Object.entries(attrs))e.setAttribute(k,String(v));if(text)e.textContent=text;svg.append(e);}
  for(let dec=-60;dec<=60;dec+=30){const y=25+(90-dec)/180*200;add('line',{x1:45,y1:y,x2:690,y2:y,stroke:'#273b59'});add('text',{x:7,y:y+4,fill:'#97afd2','font-size':10},dec+'°');}
  for(let ra=0;ra<=360;ra+=60){const x=45+(360-ra)/360*645;add('line',{x1:x,y1:25,x2:x,y2:225,stroke:'#273b59'});add('text',{x:x-10,y:245,fill:'#97afd2','font-size':10},ra+'°');}
  for(const f of catalog.fields){const x=45+(360-f.ra_deg)/360*645,y=25+(90-f.dec_deg)/180*200;add('circle',{cx:x,cy:y,r:4,fill:'#ed6861'});add('text',{x:x>620?x-13:x+10,y:y<40?y+19:y-9,'text-anchor':x>620?'end':'start',fill:'#e2ebff','font-size':12},f.id==='ngc188'?'NGC 188':f.id.toUpperCase());}
}
try{state.catalog=await loadCatalog();galleries(state.catalog,choose);skyMap(state.catalog);$('open-context').disabled=false;openLocation();window.addEventListener('popstate',openLocation);}
catch(e){$('explore-title').textContent='The local catalogue could not be opened.';state.product=null;busy(false);$('explore-error').hidden=false;$('explore-error').textContent=e.message;}
