import {parseCoordinate} from './coordinate-query.js';
import {decodeArray} from './science.js';
import {attachViewportInput} from './viewport-input.js';

const $=id=>document.getElementById(id);
const state={targets:[],target:null,request:null,searchId:null,result:null,frames:[],timer:null,current:0,mode:'single',view:{zoom:1,center_x:0,center_y:0},wipe:50};
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));

function message(text,error=false){$('search-message').textContent=text;$('search-message').classList.toggle('error',error);}
function frameLabel(frame){const wave=Number.isFinite(frame.wavelength_center_um)?`${frame.wavelength_center_um.toFixed(4)} µm`:'wavelength unavailable';return `${frame.time_start_utc} · ${wave} · D${frame.detector} · ${frame.release.toUpperCase()}`;}
function requestPayload(){
  const ra=parseCoordinate($('ra').value,'ra'),dec=parseCoordinate($('dec').value,'dec'),arcmin=Number($('field').value);
  if(!Number.isFinite(arcmin)||arcmin<1||arcmin>30)throw Error('Field width must be between 1 and 30 arcminutes.');
  return {region:{ra_deg:ra,dec_deg:dec,size_deg:arcmin/60,frame:'icrs'},target_id:state.target?.id||null,releases:['dr1','qr3'],detectors:[1,2,3,4,5,6],refresh:false};
}

async function getJSON(url,options){const response=await fetch(url,{cache:'no-cache',...options});const value=await response.json().catch(()=>({error:'The service returned an unreadable response.'}));if(!response.ok)throw Error(value.error||`Request failed (${response.status}).`);return value;}

async function loadTargets(){
  const catalog=await getJSON('./challenge-targets.json');state.targets=catalog.targets;
  for(const target of state.targets){
    const button=document.createElement('button');button.type='button';button.textContent=target.name;button.setAttribute('aria-pressed','false');
    button.onclick=()=>{state.target=target;document.querySelectorAll('#target-buttons button').forEach(item=>item.setAttribute('aria-pressed',String(item===button)));$('ra').value=target.ra;$('dec').value=target.dec;$('field').value=target.fov_arcmin;$('epoch-note').textContent=`${target.name}: ${target.coordinate_context} Reference epoch J${Number(target.reference_epoch_jyear).toFixed(1)}; each frame shows its observation epoch.`;$('search-form').requestSubmit();};
    $('target-buttons').append(button);
  }
}

for(const input of [$('ra'),$('dec'),$('field')])input.addEventListener('input',()=>{state.target=null;document.querySelectorAll('#target-buttons button').forEach(button=>button.setAttribute('aria-pressed','false'));$('epoch-note').textContent='Custom coordinate: no proper-motion propagation is applied.';});

async function pollSearch(id){
  const started=Date.now();
  while(true){
    const status=await getJSON(`/api/searches/${id}`);message(status.message);
    if(status.state==='complete')return status.result;
    if(status.state==='failed')throw Error(status.message||'Archive search failed.');
    if(Date.now()-started>300000)throw Error('Archive search exceeded five minutes. Retry when IRSA is available.');
    await sleep(650);
  }
}

async function prebaked(target){
  if(!target)return null;
  try{return await getJSON(`./data/targets/${target.id}/manifest.json`);}catch{return null;}
}

async function runSearch(event){
  event?.preventDefault();stop();resetResults();$('retry').hidden=true;
  try{
    state.request=requestPayload();message('Checking the verified target cache…');
    const installed=await prebaked(state.target);
    if(installed?.status==='complete'&&installed.observations?.length){
      state.result=installed;message(`Loaded ${installed.observations.length} verified cached DR1/QR3 observations. No archive round trip was needed.`);await presentResult(installed,true);return;
    }
    if(installed?.failure_reason)message(`Cached target preparation is unavailable: ${installed.failure_reason} Retrying IRSA live…`,true);
    const job=await getJSON('/api/searches',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(state.request)});state.searchId=job.id;
    state.result=await pollSearch(job.id);await presentResult(state.result,false);
  }catch(error){message(error.message,true);$('retry').hidden=false;}
}

function resetResults(){state.searchId=null;state.result=null;state.frames=[];state.current=0;$('results').hidden=true;$('compare').hidden=true;$('observation-rows').replaceChildren();$('frame-a').replaceChildren();$('frame-b').replaceChildren();$('download-progress').hidden=true;}

async function presentResult(result,cached){
  $('results').hidden=false;$('result-count').textContent=`${result.observations.length} archive matches · DR1 + QR3 · D1–D6`;
  buildRows(result.observations);
  if(result.status!=='complete'){
    const detail=(result.failures||result.collections?.filter(item=>item.status!=='complete').map(item=>`${item.collection}: ${item.reason}`)||[]).join(' ');
    message(`${result.message} ${detail}`.trim(),true);$('retry').hidden=false;
    if(!result.observations.length)return;
  }else message(result.message||`Found ${result.observations.length} observations.`);
  $('download-progress').hidden=false;$('progress').max=Math.max(1,result.observations.length);$('progress').value=0;$('progress-label').textContent=`0 / ${result.observations.length}`;
  for(let index=0;index<result.observations.length;index++){
    try{
      const observation=result.observations[index];
      const url=cached?observation.frame_url:`/api/searches/${state.searchId}/frames/${index}`;
      const frame=await getJSON(url);frame.search_index=index;frame.arraysDecoded=decodeFrame(frame);state.frames.push(frame);drawThumbnail(index,frame);refreshFrameOptions();
    }catch(error){const cell=document.querySelector(`tr[data-index="${index}"] .preview-state`);if(cell){cell.textContent='Unavailable';cell.title=error.message;}}
    $('progress').value=index+1;$('progress-label').textContent=`${index+1} / ${result.observations.length}`;
  }
  if(!state.frames.length){message('Archive metadata was found, but no real cutout could be downloaded. Retry when IRSA is available.',true);$('retry').hidden=false;return;}
  $('compare').hidden=false;setInitialView();refreshControls();render();
  if(state.frames.length<2)$('control-reason').textContent='Only one real cutout loaded; flipbook inspection works, but two-frame comparison needs another frame.';
}

function decodeFrame(frame){return {SCI:decodeArray(frame.arrays.SCI),VALID:decodeArray(frame.arrays.VALID),shape:frame.arrays.SCI.shape};}

function buildRows(observations){
  const body=$('observation-rows');body.replaceChildren();
  observations.forEach((observation,index)=>{
    const row=document.createElement('tr');row.dataset.index=index;row.dataset.detector=observation.detector;row.dataset.wave=observation.wavelength_center_um??'';
    const preview=document.createElement('td');preview.className='preview-state';preview.textContent='Queued';
    const source=document.createElement('a');source.href=observation.access_url||observation.archive_source_url;source.target='_blank';source.rel='noopener noreferrer';source.textContent='IRSA ↗';
    const values=[preview,observation.time_start_utc||'Unknown',Number.isFinite(observation.wavelength_center_um)?`${observation.wavelength_center_um.toFixed(4)} µm`:'Pending cutout',`D${observation.detector}`,String(observation.release).toUpperCase(),observation.observation_id||observation.archive_id,source];
    for(const value of values){if(value===preview){row.append(value);continue;}const cell=document.createElement('td');if(value instanceof Node)cell.append(value);else cell.textContent=value;row.append(cell);}body.append(row);
  });applyFilters();
}

function drawThumbnail(index,frame){const cell=document.querySelector(`tr[data-index="${index}"] .preview-state`);if(!cell)return;cell.textContent='';const canvas=document.createElement('canvas');canvas.width=110;canvas.height=84;cell.append(canvas);drawFrame(canvas,frame,{zoom:1,center_x:(frame.arraysDecoded.shape[1]-1)/2,center_y:(frame.arraysDecoded.shape[0]-1)/2},false);}

function filteredFrames(){const detector=$('filter-detector').value,min=parseFloat($('filter-min').value),max=parseFloat($('filter-max').value);return state.frames.filter(frame=>(detector==='all'||String(frame.detector)===detector)&&(!Number.isFinite(min)||!Number.isFinite(frame.wavelength_center_um)||frame.wavelength_center_um>=min)&&(!Number.isFinite(max)||!Number.isFinite(frame.wavelength_center_um)||frame.wavelength_center_um<=max));}
function applyFilters(){const detector=$('filter-detector').value,min=parseFloat($('filter-min').value),max=parseFloat($('filter-max').value);for(const row of $('observation-rows').rows){const wave=parseFloat(row.dataset.wave);row.hidden=(detector!=='all'&&row.dataset.detector!==detector)||(Number.isFinite(min)&&Number.isFinite(wave)&&wave<min)||(Number.isFinite(max)&&Number.isFinite(wave)&&wave>max);}}
for(const id of ['filter-detector','filter-min','filter-max'])$(id).oninput=()=>{applyFilters();refreshFrameOptions();render();};

function refreshFrameOptions(){
  const frames=filteredFrames(),previousA=$('frame-a').value,previousB=$('frame-b').value;
  for(const select of [$('frame-a'),$('frame-b')])select.replaceChildren();
  frames.forEach((frame,index)=>{for(const select of [$('frame-a'),$('frame-b')]){const option=document.createElement('option');option.value=String(state.frames.indexOf(frame));option.textContent=`${index+1} · ${frame.time_start_utc} · D${frame.detector} · ${frame.release.toUpperCase()}`;select.append(option);}});
  if(frames.length){$('frame-a').value=state.frames.includes(state.frames[Number(previousA)])?previousA:String(state.frames.indexOf(frames[0]));$('frame-b').value=state.frames.includes(state.frames[Number(previousB)])?previousB:String(state.frames.indexOf(frames[Math.min(1,frames.length-1)]));}
  $('scrubber').max=String(Math.max(0,frames.length-1));state.current=Math.min(state.current,Math.max(0,frames.length-1));$('scrubber').value=String(state.current);refreshControls();
}

function setInitialView(){const frame=state.frames[0],shape=frame.arraysDecoded.shape;state.view={zoom:1,center_x:(shape[1]-1)/2,center_y:(shape[0]-1)/2};}
function selectedA(){return state.frames[Number($('frame-a').value)]||filteredFrames()[state.current]||state.frames[0];}
function selectedB(){return state.frames[Number($('frame-b').value)]||state.frames[1]||state.frames[0];}

function imageFor(frame){
  if(frame.bitmap)return frame.bitmap;const [height,width]=frame.arraysDecoded.shape,canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const context=canvas.getContext('2d'),image=context.createImageData(width,height),sci=frame.arraysDecoded.SCI,valid=frame.arraysDecoded.VALID,lo=frame.display?.vmin??0,hi=frame.display?.vmax??1;
  for(let i=0;i<sci.length;i++){const o=i*4;if(!valid[i]||!Number.isFinite(sci[i])){image.data[o]=14;image.data[o+1]=28;image.data[o+2]=47;image.data[o+3]=255;continue;}let x=Math.max(0,Math.min(1,(sci[i]-lo)/(hi-lo)));x=Math.asinh(x/.06)/Math.asinh(1/.06);const level=Math.round(x*255);image.data[o]=level;image.data[o+1]=level;image.data[o+2]=level;image.data[o+3]=255;}context.putImageData(image,0,0);frame.bitmap=canvas;return canvas;
}

function geometry(canvas,frame,view=state.view){const [height,width]=frame.arraysDecoded.shape;const base=Math.min(canvas.width/width,canvas.height/height);return {width:canvas.width,height:canvas.height,scale:base*view.zoom,imageWidth:width,imageHeight:height};}
function paint(context,canvas,frame,view,clip){const source=imageFor(frame),g=geometry(canvas,frame,view),x=canvas.width/2+(0-view.center_x)*g.scale,y=canvas.height/2-(source.height-1-view.center_y)*g.scale;context.save();if(clip){context.beginPath();context.rect(clip.x,0,clip.width,canvas.height);context.clip();}context.imageSmoothingEnabled=false;context.drawImage(source,x,y,source.width*g.scale,source.height*g.scale);context.restore();drawMarker(context,canvas,frame,view);}
function drawMarker(context,canvas,frame,view){if(!frame.target)return;const g=geometry(canvas,frame,view),x=canvas.width/2+(frame.target.x-view.center_x)*g.scale,y=canvas.height/2-(frame.target.y-view.center_y)*g.scale;context.save();context.strokeStyle=frame.target.valid?'#77d7ff':'#ff7373';context.lineWidth=2;context.beginPath();context.arc(x,y,10,0,Math.PI*2);context.moveTo(x-15,y);context.lineTo(x+15,y);context.moveTo(x,y-15);context.lineTo(x,y+15);context.stroke();context.restore();}
function drawFrame(canvas,frame,view=state.view,marker=true){const context=canvas.getContext('2d');context.clearRect(0,0,canvas.width,canvas.height);paint(context,canvas,frame,view);if(!marker){/* marker is intentionally still part of every preview */}}

function render(){
  if(!state.frames.length)return;const a=state.mode==='single'?(filteredFrames()[state.current]||selectedA()):selectedA(),b=selectedB(),canvasA=$('canvas-a'),canvasB=$('canvas-b');
  const context=canvasA.getContext('2d');context.clearRect(0,0,canvasA.width,canvasA.height);paint(context,canvasA,a,state.view);
  if(state.mode==='wipe'&&b){paint(context,canvasA,b,state.view,{x:canvasA.width*state.wipe/100,width:canvasA.width*(1-state.wipe/100)});}
  if(state.mode==='side'&&b)drawFrame(canvasB,b);
  $('meta-a').textContent=frameLabel(a);$('mask-a').textContent=a.target?.valid?'Target position falls on a usable measured pixel.':'Target position is masked or invalid in this frame.';$('mask-a').classList.toggle('invalid',!a.target?.valid);
  $('meta-b').textContent=b?frameLabel(b):'';$('mask-b').textContent=b?(b.target?.valid?'Target position falls on a usable measured pixel.':'Target position is masked or invalid in this frame.'):'';$('mask-b').classList.toggle('invalid',Boolean(b&&!b.target?.valid));
  const different=a&&b&&Number.isFinite(a.wavelength_center_um)&&Number.isFinite(b.wavelength_center_um)&&Math.abs(a.wavelength_center_um-b.wavelength_center_um)>1e-5;$('wavelength-note').hidden=!different;
  $('zoom-value').textContent=`${state.view.zoom.toFixed(1)}×`;const frames=filteredFrames();$('scrubber-value').textContent=`${frames.length?state.current+1:0} / ${frames.length}`;$('scrubber').value=String(state.current);
}

function refreshControls(){
  const count=filteredFrames().length,two=count>=2;
  for(const id of ['play','prev','next','scrubber'])$(id).disabled=count<2;
  for(const id of ['side','wipe','frame-b'])$(id).disabled=!two;
  for(const id of ['single','frame-a','zoom-out','zoom-in','fit'])$(id).disabled=count<1;
  $('control-reason').textContent=two?'All visual controls are available. Wavelength differences are warnings, not gates.':count===1?'Only one real frame is loaded; two-frame controls need another frame.':'No real frames are loaded yet.';
  $('figure-b').hidden=state.mode!=='side';$('wipe-control').hidden=state.mode!=='wipe';$('canvases').className=`canvases mode-${state.mode}`;
  for(const id of ['single','side','wipe'])$(id).setAttribute('aria-pressed',String(state.mode===id));
}
function step(direction){const frames=filteredFrames();if(!frames.length)return;state.current=(state.current+direction+frames.length)%frames.length;render();}
function stop(){if(state.timer)clearInterval(state.timer);state.timer=null;$('play').textContent='Play';$('play').setAttribute('aria-pressed','false');}
function play(){if(state.timer){stop();return;}$('play').textContent='Pause';$('play').setAttribute('aria-pressed','true');state.timer=setInterval(()=>step(1),Number($('speed').value));}

$('search-form').onsubmit=runSearch;$('retry').onclick=runSearch;$('prev').onclick=()=>{stop();step(-1)};$('next').onclick=()=>{stop();step(1)};$('play').onclick=play;
$('scrubber').oninput=()=>{stop();state.current=Number($('scrubber').value);render();};$('speed').oninput=()=>{$('speed-value').textContent=`${(Number($('speed').value)/1000).toFixed(2)} s`;if(state.timer){stop();play();}};
for(const id of ['frame-a','frame-b'])$(id).onchange=()=>{stop();render();};
for(const id of ['single','side','wipe'])$(id).onclick=()=>{state.mode=id;stop();refreshControls();render();};
$('wipe-position').oninput=()=>{state.wipe=Number($('wipe-position').value);render();};
$('zoom-in').onclick=()=>{state.view.zoom=Math.min(20,state.view.zoom*1.25);render();};$('zoom-out').onclick=()=>{state.view.zoom=Math.max(1,state.view.zoom/1.25);render();};$('fit').onclick=()=>{setInitialView();render();};

for(const canvas of [$('canvas-a'),$('canvas-b')])attachViewportInput(canvas,{getView:()=>state.frames.length?state.view:null,getGeometry:()=>geometry(canvas,selectedA()),getBounds:()=>{const shape=selectedA().arraysDecoded.shape;return {width:shape[1],height:shape[0]}},onView:view=>{state.view=view;render();}});
window.addEventListener('resize',render);document.addEventListener('keydown',event=>{if(event.target.matches('input,select,button'))return;if(event.code==='Space'){event.preventDefault();play();}else if(event.key==='ArrowLeft'){event.preventDefault();stop();step(-1);}else if(event.key==='ArrowRight'){event.preventDefault();stop();step(1);}else if(event.key.toLowerCase()==='w'&&state.frames.length>1){state.mode='wipe';refreshControls();render();}else if(event.key.toLowerCase()==='s'&&state.frames.length>1){state.mode='side';refreshControls();render();}else if(event.key.toLowerCase()==='f'){state.mode='single';refreshControls();render();}});

loadTargets().catch(error=>message(`Challenge targets could not load: ${error.message}`,true));
refreshControls();
