import {parseCoordinate} from './coordinate-query.js';
import {decodeArray,pixelToSky,skyToPixel} from './science.js';
import {attachViewportInput} from './viewport-input.js';
import {combineFrames,referencePosition,spectrumAt} from './observations-analysis.js';
import {alignFrame,bicubicBitmap,displayLimits,displayPixels} from './observations-render.js';
import {attachSkyBackground} from './observations-sky-background.js';
import {createFramePicker} from './observations-picker.js';
import {installWorkbenchTabs} from './observations-tools.js';
import {NARROW_BAND_HALF_WIDTH, framesInWavelengthWindow, largestSameBand, readWavelengthWindow, writeWavelengthWindow} from './observations-band.js';

const $=id=>document.getElementById(id);
let applicationAudio;
import('./application-sound.js').then(module=>{applicationAudio=module.applicationAudio;}).catch(()=>{});
const state={target:null,search:null,frames:[],pairOverrides:{},loading:false,timer:null,current:0,mode:'single',view:{zoom:1,center_x:0,center_y:0},wipe:50};
const comparison=Boolean($('canvas-a'));
const comparePage=location.pathname.endsWith('/compare.html');
const modeButtons={single:'single',side:'side',wipe:'wipe',difference:'difference-mode'};
let openBackground=location.hash==='#sky-background';
let sharedView=new URLSearchParams(location.search);
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const svgNS='http://www.w3.org/2000/svg';
const catalogs={gaia:null,wise:null};
const catalogNames={gaia:'Gaia DR3',wise:'AllWISE'};
const referenceRequests=new Map();
const widePreviewTargets=new Set(['barnards-star','epsilon-indi-b','wise-0855','rw-aurigae','r-draconis']);
const displaySettings={subtract:true,lower:null,upper:null,showMasks:false,upperPercentile:.997,revision:0};
const updateSkyBackground=$('sky-background')?attachSkyBackground({
  panel:$('sky-background'),host:$('dss-view'),status:$('dss-status'),retry:$('retry-dss'),opacity:$('dss-opacity'),output:$('dss-opacity-value'),
}):null;
const searchPanel=$('search'),searchFeedback=$('search-feedback');
const selectTool=installWorkbenchTabs($('tools-tabs'),$('tools-scroll'));
$('show-search').onclick=()=>{
  $('search-feedback-top').append(searchFeedback);
  searchPanel.showModal();
};
$('close-search').onclick=()=>searchPanel.close();
searchPanel.addEventListener('close',()=>$('search-feedback-loaded').append(searchFeedback));

const skyBackground=$('sky-background');
if(skyBackground){
  $('open-sky-background').onclick=()=>skyBackground.showModal();
  $('close-sky-background').onclick=()=>skyBackground.close();
}
const targetDetails={
  'barnards-star':['✦','Fast-moving star'],
  'epsilon-indi-b':['◎','Brown dwarf pair'],
  'wise-0855':['◉','Cold brown dwarf'],
  'rw-aurigae':['✧','Young variable star'],
  'r-draconis':['◈','Pulsating red giant'],
};
let frameChoices=new Map();
const picker=createFramePicker({
  dialog:$('frame-picker-dialog'),list:$('frame-picker-options'),title:$('picker-title'),close:$('close-frame-picker'),
  frames:()=>frameChoices,selection:id=>$(id).value,choose:setPair,thumbnail:frame=>thumbnail(frame),discard:canvas=>thumbnails.unobserve(canvas),label:frame=>readout(frame),
});
for(const id of ['frame-a','frame-b'])$('choose-'+id).onclick=event=>picker(id,event.currentTarget);
$('use-frame-b').onclick=()=>{
  const frame=filteredFrames()[state.current];
  if(frame)setPair('frame-b',String(state.frames.indexOf(frame)));
};

let releases=[...$('release').options].map(option=>option.value).filter(value=>value!=='all');

function message(text,error=false,pending=false){
  const status=$('search-message');
  if(status.textContent!==text)status.textContent=text;
  status.dataset.state=error?'error':pending?'loading':'ready';
}
const frameDate=frame=>frame.time_start_utc??frame.archiveRow?.time_start_utc;
function wavelength(frame){
  if(!Number.isFinite(frame.wavelength_center_um))return 'λ unavailable';
  return frame.wavelength_center_um.toFixed(3)+' µm'+(frame.target?.valid?'':' (nominal)');
}
const readout=frame=>`${frameDate(frame).slice(0,10)} · D${frame.detector} · ${wavelength(frame)}`;
function viewerEmpty(title,description,pending=false){
  $('empty-viewer-title').textContent=title;
  $('empty-viewer-note').textContent=description;
  $('empty-viewer').classList.toggle('is-loading',pending);
  $('empty-viewer').setAttribute('aria-busy',String(pending));
}
function shareParameters(request){
  const value=new URLSearchParams({ra:request.region.ra_deg,dec:request.region.dec_deg,fov:Number($('field').value),release:$('release').value});
  if(request.target_id)value.set('target',request.target_id);
  for(const [key,id] of [['from','frame-start'],['to','frame-end']])if($(id).value)value.set(key,$(id).value);
  return value;
}
function setTarget(target,button){
  state.target=target;
  document.querySelectorAll('#target-buttons button').forEach(item=>item.setAttribute('aria-pressed',String(item===button)));
  $('ra').value=target.ra;$('dec').value=target.dec;
  $('epoch-note').textContent=`${target.name} · SIMBAD J${Number(target.reference_epoch_jyear).toFixed(1)}. Each exposure shows its propagated observation epoch.`;
}
function requestPayload(){
  const ra=parseCoordinate($('ra').value,'ra'),dec=parseCoordinate($('dec').value,'dec'),arcmin=Number($('field').value);
  if(!Number.isFinite(arcmin)||arcmin<1||arcmin>30)throw Error('Field width must be between 1 and 30 arcminutes.');
  return {region:{ra_deg:ra,dec_deg:dec,size_deg:arcmin/60,frame:'icrs'},target_id:state.target?.id||null,releases:$('release').value==='all'?[...releases]:[$('release').value],detectors:[1,2,3,4,5,6],refresh:false};
}

async function getJSON(url,options){
  const response=await fetch(url,{cache:'no-cache',...options});
  const value=await response.json().catch(()=>null);
  if(!response.ok){
    const error=Error(value?.error||`Request failed (HTTP ${response.status}).`);
    error.status=response.status;
    throw error;
  }
  if(!value)throw Error('The service returned an unreadable response.');
  return value;
}

async function loadTargets(){
  const capabilities=getJSON('/api/observations/releases',{signal:AbortSignal.timeout(1500)}).catch(()=>null);
  const catalog=await getJSON('./observations-targets.json');
  for(const target of catalog.targets){
    const button=document.createElement('button');button.type='button';button.dataset.targetId=target.id;button.dataset.sound='select';button.setAttribute('aria-pressed','false');
    const [icon,description]=targetDetails[target.id]??['✦',''];
    const glyph=document.createElement('span'),copy=document.createElement('span'),name=document.createElement('strong'),detail=document.createElement('small');
    glyph.className='target-icon';glyph.setAttribute('aria-hidden','true');glyph.textContent=icon;
    name.textContent=target.name;detail.textContent=description;copy.append(name,detail);button.append(glyph,copy);
    button.onclick=()=>{setTarget(target,button);$('search-form').requestSubmit();};
    $('target-buttons').append(button);
  }
  const params=new URLSearchParams(location.search);
  const configured=(await capabilities)?.releases;
  if(Array.isArray(configured)&&configured.length&&configured.every(name=>typeof name==='string'&&/^[a-z0-9]+$/.test(name))){
    const previous=$('release').value;
    releases=configured;
    $('release').replaceChildren(new Option(releases.map(name=>name.toUpperCase()).join(' + '),'all'),...releases.map(name=>new Option(name.toUpperCase(),name)));
    if(['all',...releases].includes(previous))$('release').value=previous;
  }
  const target=catalog.targets.find(item=>item.id===params.get('target'));
  if(target)setTarget(target,[...$('target-buttons').children].find(button=>button.dataset.targetId===target.id));
  const coordinates=params.has('ra')&&params.has('dec');
  if(coordinates){
    const matches=target&&Number(params.get('ra'))===target.ra_deg&&Number(params.get('dec'))===target.dec_deg;
    if(!matches&&(!target||Math.abs(Number(params.get('ra'))-target.ra_deg)>1e-8||Math.abs(Number(params.get('dec'))-target.dec_deg)>1e-8))state.target=null;
    $('ra').value=params.get('ra');$('dec').value=params.get('dec');
  }
  for(const [key,id] of [['fov','field'],['from','frame-start'],['to','frame-end']])if(params.has(key))$(id).value=params.get(key);
  if(['all',...releases].includes(params.get('release')))$('release').value=params.get('release');
  if(coordinates||target){$('search-form').requestSubmit();return;}
  if(comparePage&&/^[0-9a-f]{32}$/.test(params.get('search')||''))await reopenSearch(params.get('search'));
}

async function reopenSearch(id){
  state.search=new AbortController();
  const {signal}=state.search;
  viewerEmpty('Opening shared observations','Looking up this archive search.',true);
  try{
    const result=await pollSearch(id,signal);
    const region=result.request.region;
    $('ra').value=region.ra_deg;$('dec').value=region.dec_deg;$('field').value=region.size_deg*60;
    if(result.target){
      state.target=result.target;
      $('epoch-note').textContent=`${result.target.name}: reference epoch J${Number(result.target.reference_epoch_jyear).toFixed(1)}.`;
    }
    state.request=result.request;setContext(region,result.target?.id);
    await presentResult(result,signal,id);
  }
  catch(error){if(!signal.aborted){
    viewerEmpty('This search could not be reopened','Enter its coordinates or choose a challenge target to start a new search.');
    message(`Could not reopen the archive search. ${error.message}`,true);
  }}
}

for(const input of [$('ra'),$('dec')])input.addEventListener('input',()=>{state.target=null;document.querySelectorAll('#target-buttons button').forEach(button=>button.setAttribute('aria-pressed','false'));$('epoch-note').textContent='Custom coordinate: no proper-motion propagation is applied.';});

async function pollSearch(id,signal){
  const started=Date.now();
  while(true){
    const status=await getJSON(`/api/observations/searches/${id}`,{signal:AbortSignal.any([signal,AbortSignal.timeout(15000)])});
    signal.throwIfAborted();
    message(status.message,false,status.state==='queued'||status.state==='running');
    if(status.state==='complete')return status.result;
    if(status.state==='failed')throw Error(status.message||'Archive search failed.');
    if(Date.now()-started>180000)throw Error('The archive search timed out. Try again or open a cached target.');
    await sleep(650);
  }
}

async function prebaked(target,field,signal){
  if(!target)return null;
  if(widePreviewTargets.has(target.id)&&Math.abs(field-8)<1e-7){
    try{return await getJSON(`./data/observation-targets/${target.id}/preview-8.json`,{signal});}
    catch{signal.throwIfAborted();}
  }
  try{return await getJSON(`./data/observation-targets/${target.id}/manifest.json`,{signal});}catch{return null;}
}

async function runSearch(event,refresh=false){
  event?.preventDefault();
  state.search?.abort();
  state.search=new AbortController();
  const {signal}=state.search;
  let cachedMatch;
  let cachedPreview;
  let contactedAPI=false;
  let jobAccepted=false;
  const waking=()=>{
    viewerEmpty('The server may be waking up','Render can take about a minute to start. You can open a cached challenge target.',true);
    message('Waking the server. This can take about a minute.',false,true);
  };
  const useOffline=async reason=>{
    await presentResult(cachedPreview,signal);
    if(signal.aborted)return;
    const loaded=state.frames.length;
    const actualField=cachedPreview.field_arcmin;
    const narrower=Math.abs(actualField/60-state.request.region.size_deg)>1e-8;
    message(`${reason} ${loaded?`Showing ${loaded} real ${narrower?`${actualField}′ `:''}cutouts from the offline cache.`:'The offline cutouts could not be loaded.'}`,true);
    $('retry').textContent='Retry archive search';
    $('retry').hidden=false;
  };
  stop();resetResults();$('retry').hidden=true;$('retry').textContent='Retry archive search';
  try{
    const request={...requestPayload(),refresh};
    const from=Number($('frame-start').value||1),to=Number($('frame-end').value||Number.MAX_SAFE_INTEGER);
    if(!Number.isSafeInteger(from)||!Number.isSafeInteger(to)||from<1||to<from)throw Error('Enter an ordered frame range starting at 1 or higher.');
    state.request=request;
    state.range={from,to,explicit:Boolean($('frame-start').value||$('frame-end').value)};
    history.replaceState(null,'',location.pathname+'?'+shareParameters(request));
    setContext(request.region,state.target?.id);
    viewerEmpty('Finding SPHEREx observations',refresh?'Searching IRSA again.':'Checking for real cutouts at these coordinates.',true);
    message(refresh?'Retrying IRSA live…':'Checking the target cache…',false,true);
    const installed=await prebaked(state.target,request.region.size_deg*60,signal);
    signal.throwIfAborted();
    if(['complete','partial'].includes(installed?.status)&&installed.observations?.length){
      const matching=installed.observations.filter(row=>request.releases.includes(row.release));
      if(matching.length){
        const exact=Math.abs(installed.field_arcmin/60-request.region.size_deg)<1e-8;
        if(exact||Math.abs(request.region.size_deg*60-8)<1e-7){
          cachedPreview={...installed,observations:matching};
          if(exact)cachedMatch=cachedPreview;
          if(!refresh){await presentResult(cachedPreview,signal);return;}
        }
      }
    }
    if(installed?.failure_reason)message(`Cached target preparation is unavailable: ${installed.failure_reason} Retrying IRSA live…`,true);
    contactedAPI=true;
    const timer=setTimeout(()=>{if(!signal.aborted)waking();},1800);
    let job;
    try{
      job=await getJSON('/api/observations/searches',{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify(request),signal:AbortSignal.any([signal,AbortSignal.timeout(75000)])});
      jobAccepted=true;
    }finally{clearTimeout(timer);}
    viewerEmpty('Searching the live SPHEREx archive','The archive may take a few moments to respond.',true);
    const result=await pollSearch(job.id,signal);
    if(cachedPreview&&result.status!=='complete'&&!result.observations.length){
      await useOffline(`Live archive search was incomplete. ${(result.failures??[]).join(' ')}`);return;
    }
    await presentResult(result,signal,job.id,cachedMatch);
  }catch(error){
    if(signal.aborted)return;
    if(refresh&&cachedPreview){await useOffline(error.message);return;}
    const mayBeWaking=contactedAPI&&!jobAccepted&&(!error.status||[502,503,504].includes(error.status));
    viewerEmpty(state.request?'The archive search is unavailable':'Check your search coordinates',
      mayBeWaking?'The server may be waking up. Allow about a minute, then retry or open a cached challenge target.':
      state.request?'Retry the IRSA search or open a cached challenge target.':'Review RA, Dec and field width, then try again.');
    message(mayBeWaking?'Could not reach the service. It may take about a minute to wake.':error.message,true);
    $('retry').hidden=false;
  }
}

function resetResults(){
  state.request=null;state.frames=[];state.current=0;state.mode='single';
  state.band=null;state.sameBand=null;state.bandFeedback='';
  $('viewer-target').textContent='SPHEREx DR1 / QR3';
  if(skyBackground)$('open-sky-background').disabled=true;
  state.pairOverrides={};state.loading=false;
  $('pair-note').textContent='';$('pair-note').hidden=true;
  state.grid=null;
  state.window=null;
  state.derived=null;
  state.difference=null;
  state.range=null;state.spectrumPosition=null;state.timelineKey=null;state.displayFrame=null;
  $('frame-details').hidden=true;
  $('empty-viewer').setAttribute('aria-busy','false');
  for(const id of ['mask-a','mask-b'])$(id).hidden=true;
  frameChoices.clear();
  if(comparison){$('derived-result').hidden=true;$('spectrum').setAttribute('hidden','');$('spectrum-status').textContent='';}
  $('filter-detector').value='all';$('filter-min').value='';$('filter-max').value='';
  $('results').hidden=true;$('compare').hidden=true;$('download-progress').hidden=true;
  $('empty-viewer').hidden=false;
  $('view-jump').hidden=true;
  $('view-description').textContent='Pick a place to see a dated infrared image.';
  $('viewer-announcement').textContent='';
  $('viewer-load-status').textContent='';
  $('wavelength-note').hidden=true;$('release-note').hidden=true;$('window-summary').hidden=true;
  $('observation-rows').replaceChildren();$('frame-a').value='';$('frame-b').value='';
  refreshControls();
}

async function presentResult(result,signal,searchId,cachedMatch){
  const cached=searchId===undefined;
  displaySettings.upperPercentile=state.target?.id==='rw-aurigae' ? .993 : .997;
  const offset=(state.range?.from??1)-1;
  const shipped=new Map(cachedMatch?.observations.map(row=>[row.access_url,row])??[]);
  const rows=result.observations.map((row,index)=>{
    const stored=shipped.get(row.access_url);
    shipped.delete(row.access_url);
    return {...row,frame_url:stored?.frame_url??row.frame_url,liveIndex:index};
  });
  if(!cached&&result.status!=='complete'&&shipped.size){
    rows.push(...shipped.values());
    rows.sort((a,b)=>a.start_mjd-b.start_mjd||a.detector-b.detector||a.observation_id.localeCompare(b.observation_id));
  }
  const preview=cached&&(result.preview||Math.abs(result.field_arcmin/60-(state.request?.region.size_deg??result.field_arcmin/60))>1e-8);
  const previewUrls=new Set(result.preview_frame_urls??[]);
  const sample=preview&&!state.range?.explicit?rows.filter(row=>previewUrls.has(row.frame_url)):[];
  const observations=sample.length?sample:rows.slice(offset,state.range?.to);
  const count=observations.length;
  $('results').hidden=false;
  const link=$('open-compare');
  link.hidden=comparePage||!count;
  if(!link.hidden){
    const query=state.request?shareParameters(state.request):new URLSearchParams(cached?{target:result.target_id}:{search:searchId});
    link.href='./compare.html?'+query;
    if($('dss-view-link'))$('dss-view-link').href=link.href+'#sky-background';
  }
  $('result-count').textContent=cached?
    (count===rows.length?count+' cached frames':count+' of '+rows.length+' cached frames selected'):
    count+' archive matches in this selection';
  buildRows(observations);
  const incomplete=result.status!=='complete';
  if(cached){
    const remainder=preview||incomplete;
    const selected=count===rows.length?count+' cached cutouts selected':count+' of '+rows.length+' cached cutouts selected';
    const coverage=selected+' for the '+result.field_arcmin+'′ '+(preview?'preview.':'field.');
    const discovery=result.archive_discovery;
    const extra=state.request?.releases.reduce((sum,release)=>sum+(discovery?.uncached_matches[release]??0),0)??0;
    const live=discovery?.status==='complete'?' '+extra+' additional archive matches can be requested live.':
      extra?' At least '+extra+' additional matches found. Search IRSA for live results.':
      remainder?' Search IRSA to count additional archive matches.':'';
    const outside=result.preview_missing_coverage;
    const gap=outside?' '+outside+' other candidate cutouts did not cover the propagated position.':'';
    message(coverage+live+gap,false);
    $('retry').textContent=preview?'Load requested field from IRSA':remainder?'Load remaining from IRSA':'Retry archive search';
  }else{
    const detail=(result.failures??[]).join(' ');
    message(count||incomplete?`${result.message??''} ${detail}`.trim():result.observations.length?'No observations lie in this frame range.':'IRSA returned no observations for this field.',incomplete||!count);
  }
  $('retry').hidden=!(incomplete||!count||cached&&Math.abs(result.field_arcmin/60-state.request?.region.size_deg)>1e-8);
  if(!count){
    viewerEmpty(incomplete?'IRSA returned an incomplete search':'No observations in this selection',
      incomplete?'Try the archive search again, or choose a cached challenge target.':'Try a wider field, another release, or a different frame range.');
    return;
  }
  viewerEmpty('Loading real cutouts','The first image will appear as soon as it is ready.',true);
  state.loading=true;
  $('progress-caption').textContent='Selected frames loaded';
  $('download-progress').hidden=false;$('progress').max=count;$('progress').value=0;$('progress-label').textContent=`0 / ${count}`;
  const download=index=>{
    const row=observations[index];
    const url=row.frame_url||`/api/observations/searches/${searchId}/frames/${row.liveIndex}`;
    return getJSON(url,{signal}).then(frame=>({frame}),error=>({error}));
  };
  const queue=[download(0),...(count>1?[download(1)]:[])];
  let unavailableCount=0;
  for(let index=0;index<count;index++){
    try{
      const observation=observations[index];
      const {frame,error}=await queue.shift();
      signal.throwIfAborted();
      if(index+2<count)queue.push(download(index+2));
      if(error)throw error;
      if(frame.dataset_kind!=='real'||!releases.includes(frame.release)||
         frame.archive_id!==observation.observation_id||frame.detector!==observation.detector)throw Error('The cutout does not match the archive row.');
      frame.arraysDecoded=decodeFrame(frame);
      state.grid??={shape:frame.arraysDecoded.shape,wcs:frame.wcs};
      alignFrame(frame,state.grid);
      frame.archiveRow=observation;
      frame.isCached=Boolean(observation.frame_url);
      frame.rowIndex=index;
      state.frames.push(frame);
      drawThumbnail(index,frame);
      if(state.frames.length===1)showMetadata(frame);
      if(comparison){
        if(state.frames.length===1){
          $('compare').hidden=false;$('empty-viewer').hidden=true;$('empty-viewer').setAttribute('aria-busy','false');setInitialView();
          $('viewer-target').textContent=result.target?.name??state.target?.name??'Custom coordinates';
          $('view-jump').hidden=false;
          $('viewer-load-status').textContent='The first cutout is ready. More frames may still be loading.';
          if(skyBackground){
            $('open-sky-background').disabled=false;
            if(openBackground){
              selectTool($('tools-tab-overlays'));
              if(searchPanel.open)searchPanel.close();
              skyBackground.showModal();
            }
          }
          openBackground=false;
        }
        if(state.frames.length<=2||(index+1)%20===0){refreshFrameOptions();render();}
      }
    }catch(error){
      if(signal.aborted)return;
      unavailableCount++;
      const cell=document.querySelector(`tr[data-index="${index}"] .preview-state`);
      if(cell){
        const reason=document.createElement('small');
        reason.textContent=error.message;
        cell.replaceChildren('Unavailable',reason);
      }
    }
    $('progress').value=state.frames.length;$('progress-label').textContent=`${state.frames.length} / ${count}`;
  }
  state.loading=false;
  if(!state.frames.length){$('download-progress').hidden=true;viewerEmpty('No images could be loaded','Try again when IRSA is available.');message('Archive metadata was found, but no real cutout could be downloaded. Retry when IRSA is available.',true);$('retry').hidden=false;return;}
  if(unavailableCount){message(`${state.frames.length} real cutouts loaded · ${unavailableCount} unavailable. Retry to resume from disk.`,true);$('retry').hidden=false;}
  $('download-progress').hidden=true;
  if(searchPanel.open)searchPanel.close();
  else $('search-feedback-loaded').append(searchFeedback);
  $('view-jump').hidden=true;
  $('viewer-load-status').textContent=`${state.frames.length} cutouts ready in the viewer.`;
  applyFilters();
  if(comparison){refreshFrameOptions();restoreView();render();drawSpectrum();}
}

function svg(tag,attributes={},text){
  const node=document.createElementNS(svgNS,tag);
  for(const [name,value] of Object.entries(attributes))node.setAttribute(name,value);
  if(text!==undefined)node.textContent=text;
  return node;
}

function setContext(region,target){
  state.region=region;
  for(const kind of Object.keys(catalogs)){
    referenceRequests.get(kind)?.abort();
    referenceRequests.delete(kind);
    catalogs[kind]=null;$(`overlay-${kind}`).checked=false;$(`${kind}-credit`).hidden=true;
    referenceStatus(kind,'off','Off');
  }
  const confirmed=target==='barnards-star'&&region.size_deg<=.2;
  $('neossat-reference').hidden=!confirmed;$('neossat-credit').hidden=!confirmed;
  $('sky-context').hidden=false;
  $('overlay-gaia').disabled=false;$('overlay-wise').disabled=false;
  refreshContext(null);
}

function activeCatalogs(){return Object.keys(catalogs).filter(kind=>catalogs[kind]&&$(`overlay-${kind}`).checked);}

function refreshContext(frame){
  const region=frame?.region??state.region;
  if(!region)return;
  const {ra_deg:ra,dec_deg:dec,size_deg:size}=region,utc=frame?.time_start_utc;
  const aladin=new URL('https://aladin.cds.unistra.fr/AladinLite/');
  aladin.search=new URLSearchParams({target:`${ra} ${dec}`,fov:String(size),survey:'CDS/P/DSS2/color'});
  $('aladin-link').href=aladin;
  const map=$('context-map'),scale=100/size;
  map.replaceChildren(svg('path',{d:'M 120 10 V 170 M 20 90 H 220',class:'map-grid'}),
    svg('rect',{x:70,y:40,width:100,height:100,class:'map-field'}),
    svg('circle',{cx:120,cy:90,r:4,class:'map-target'}),svg('text',{x:127,y:21},'N'),svg('text',{x:23,y:84},'E'));
  for(const kind of activeCatalogs())for(const source of catalogs[kind].sources){
    const sky=referencePosition(source,utc,kind==='gaia');
    const dx=((sky.ra_deg-ra+540)%360-180)*Math.cos(dec*Math.PI/180);
    const x=120-dx*scale,y=90-(sky.dec_deg-dec)*scale;
    if(x<5||x>235||y<5||y>175)continue;
    const mark=kind==='gaia'?svg('circle',{cx:x,cy:y,r:2,class:'map-gaia'}):
      svg('rect',{x:x-2,y:y-2,width:4,height:4,class:'map-wise'});
    mark.append(svg('title',{},`${catalogNames[kind]} ${source.id}`));map.append(mark);
  }
  $('context-coordinate').textContent=`ICRS ${ra.toFixed(6)}°, ${dec.toFixed(6)}° · ${(size*60).toFixed(1)}′ field${utc&&activeCatalogs().includes('gaia')?` · Gaia positions at ${utc} where proper motion is available`:''}.`;
}

function referenceStatus(kind,status,message){
  const output=$(`overlay-${kind}-status`);
  output.textContent=message;
  output.dataset.state=status;
  $(`retry-${kind}`).hidden=status!=='error';
}

function showReference(kind){
  const data=catalogs[kind], enabled=$(`overlay-${kind}`).checked;
  $(`${kind}-credit`).hidden=!data;
  if(!enabled||!data){
    referenceStatus(kind,'off','Off');
  }else{
    const markers=kind==='gaia'?'Cyan circles. Catalog epochs are retained where motion is missing.':'Gold squares at published ICRS positions. AllWISE is not propagated to the SPHEREx date.';
    referenceStatus(kind,'ready',`${data.sources.length} sources in the ${data.radius_deg.toFixed(3)}° field${data.truncated?' (first 500)':''}. ${markers}`);
  }
  refreshContext(state.displayFrame);
  render();
}

async function toggleReference(kind){
  const input=$(`overlay-${kind}`);
  referenceRequests.get(kind)?.abort();
  referenceRequests.delete(kind);
  if(!input.checked||catalogs[kind]){
    showReference(kind);
    return;
  }
  const request=new AbortController();
  referenceRequests.set(kind,request);
  const timeout=AbortSignal.timeout(10000);
  const signal=AbortSignal.any([request.signal,timeout]);
  referenceStatus(kind,'loading',`Loading ${catalogNames[kind]}…`);
  try{
    const options={method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify(state.displayFrame?.region??state.region),signal};
    const result=await getJSON(`/api/observations/reference/${kind}`,options);
    if(referenceRequests.get(kind)!==request)return;
    catalogs[kind]=result;
    showReference(kind);
  }catch{
    if(referenceRequests.get(kind)!==request)return;
    input.checked=false;
    referenceStatus(kind,'error',timeout.aborted?`${catalogNames[kind]} timed out after 10 seconds.`:`Could not load ${catalogNames[kind]}.`);
  }finally{
    if(referenceRequests.get(kind)===request)referenceRequests.delete(kind);
  }
}

function showMetadata(frame){
  if(!frame||state.displayFrame===frame)return;
  state.displayFrame=frame;
  const row=frame.archiveRow??{},quality=frame.quality??row.quality,position=frame.target?.position;
  const low=frame.wavelength_min_um??(Number.isFinite(row.wavelength_min_m)? row.wavelength_min_m*1e6:null);
  const high=frame.wavelength_max_um??(Number.isFinite(row.wavelength_max_m)?row.wavelength_max_m*1e6:null);
  const [height,width]=frame.arraysDecoded.shape;
  const details=[['Observed (UTC)',frame.time_start_utc],['Release / detector',`${frame.release.toUpperCase()} / D${frame.detector}`],
    ['Display sampling',`${width} × ${height} · ${(Math.abs(frame.wcs.CDELT2)*3600).toFixed(2)}″/pixel · ${(frame.region.size_deg*60).toFixed(1)}′ requested field`],
    ['Archive ID',frame.archive_id],['Wavelength range',Number.isFinite(low)&&Number.isFinite(high)?`${low.toFixed(4)}–${high.toFixed(4)} µm (archive coverage)`:'Not reported by the archive'],
    ['Target channel',Number.isFinite(frame.bandwidth_um)?`${frame.wavelength_center_um.toFixed(4)} µm; bandwidth ${frame.bandwidth_um.toFixed(4)} µm`:'No usable target channel'],
    ['Target position',frame.target?.valid?'Usable measured pixel':'Masked or invalid pixel'],
    ['Target epochs',position?`${position.reference_epoch} → ${position.observation_epoch_utc}`:'Not recorded'],
    ['Native pixel flags',quality?.target_bits!=null?`${quality.target_flags?.join(', ')||'No named flags set'} (bits ${quality.target_bits}${quality.target_unknown_bits?`; unknown bits ${quality.target_unknown_bits}`:''})`:'Not available in this cutout receipt'],
    ['Archive quality / contamination',Object.entries(quality?.archive_flags??row.quality_metadata??{}).map(([name,value])=>`${name}: ${value}`).join(' · ')||'No fields reported']];
  const list=document.createElement('dl'),technical=document.createElement('dl'),more=document.createElement('details'),summary=document.createElement('summary');
  summary.textContent='Quality flags & identifiers';
  more.className='frame-technical';more.append(summary,technical);
  const technicalLabels=new Set(['Archive ID','Target epochs','Wavelength range','Native pixel flags','Archive quality / contamination']);
  for(const [label,value] of details){const term=document.createElement('dt'),description=document.createElement('dd');term.textContent=label;description.textContent=value;(technicalLabels.has(label)?technical:list).append(term,description);}
  for(const [label,url] of [['Archive source',frame.archive_source_url],['Regional FITS cutout',frame.cutout_source_url]])if(url){
    const term=document.createElement('dt'),description=document.createElement('dd'),anchor=document.createElement('a');
    term.textContent=label;anchor.href=url;anchor.target='_blank';anchor.rel='noopener noreferrer';
    anchor.textContent=label==='Archive source'?'Open IRSA source ↗':'Open cutout FITS ↗';
    description.append(anchor);(label==='Archive source'?list:technical).append(term,description);
  }
  more.open=$('frame-metadata').querySelector('.frame-technical')?.open??false;
  $('frame-metadata').replaceChildren(list,more);$('frame-details').hidden=false;
  refreshContext(frame);
}

function setPair(id,value){
  $(id).value=value;
  state.pairOverrides[id]=value;
  if(id==='frame-b'&&!selectedFrame(id))state.mode='single';
  if(id==='frame-a'&&state.mode==='single'){
    const index=filteredFrames().indexOf(selectedFrame(id));
    if(index>=0)state.current=index;
  }
  stop();refreshControls();render();
}

const visibleTiles=new WeakMap();
const thumbnails=new IntersectionObserver(entries=>{
  for(const {target,isIntersecting} of entries){
    if(isIntersecting){
      paintThumbnail(target,visibleTiles.get(target));
      thumbnails.unobserve(target);
    }
  }
},{rootMargin:'60px'});

function paintThumbnail(canvas,frame){
  if(!frame||canvas.dataset.revision===String(displaySettings.revision))return;
  canvas.getContext('2d').drawImage(imageFor(frame),0,0,canvas.width,canvas.height);
  canvas.dataset.revision=displaySettings.revision;
}

function thumbnail(frame){
  const canvas=document.createElement('canvas');
  canvas.width=96;canvas.height=96;canvas.setAttribute('aria-hidden','true');
  visibleTiles.set(canvas,frame);
  thumbnails.observe(canvas);
  return canvas;
}

function selectTimeline(index){
  stop();state.mode='single';state.current=index;
  const id=String(state.frames.indexOf(filteredFrames()[index]));
  $('frame-a').value=id;state.pairOverrides['frame-a']=id;
  refreshControls();render();
}

function renderTimeline(frames){
  const strip=$('frame-strip');
  if(frames.length!==state.timelineFrames?.length||frames.some((frame,i)=>frame!==state.timelineFrames[i])){
    const focused=strip.contains(document.activeElement)?document.activeElement.dataset.id:null;
    state.timelineFrames=frames;
    strip.querySelectorAll('canvas').forEach(canvas=>thumbnails.unobserve(canvas));
    strip.replaceChildren(...frames.map((frame,index)=>{
      const button=document.createElement('button'),date=document.createElement('time'),unit=document.createElement('span'),marker=document.createElement('span');
      const id=String(state.frames.indexOf(frame));
      button.type='button';button.dataset.id=id;button.dataset.sound='date';
      date.dateTime=frameDate(frame);date.textContent=frameDate(frame).slice(0,10);
      unit.className='frame-wavelength';unit.textContent=wavelength(frame);
      marker.className='film-marker';marker.hidden=true;
      const detail=document.createElement('span');
      detail.className='visually-hidden';detail.textContent=`D${frame.detector}, ${frameDate(frame).slice(11,19)} UTC, ${frame.release.toUpperCase()}`;
      button.append(thumbnail(frame),date,' ',unit,' ',marker,' ',detail);
      button.onclick=event=>event.shiftKey?setPair('frame-b',id):selectTimeline(index);
      return button;
    }));
    if(focused!==null)[...strip.children].find(button=>button.dataset.id===focused)?.focus({preventScroll:true});
    strip.scrollLeft=0;
    state.timelineCurrent=null;
  }
  const selectedA=$('frame-a').value, selectedB=$('frame-b').value;
  const changed=state.timelineCurrent!==state.current;
  for(const [index,button] of [...strip.children].entries()){
    const current=state.mode==='single'?index===state.current:button.dataset.id===selectedA;
    const marker=button.lastElementChild;
    const label=[button.dataset.id===selectedA?'A':'',button.dataset.id===selectedB?'B':''].filter(Boolean).join(' · ');
    button.toggleAttribute('data-paired',Boolean(label));
    button.setAttribute('aria-current',String(current));
    marker.hidden=!label;marker.textContent=label;
    if(changed&&current){
      const tile=button.getBoundingClientRect(),viewport=strip.getBoundingClientRect();
      if(tile.left<viewport.left||tile.right>viewport.right)strip.scrollLeft+=tile.left-viewport.left;
    }
  }
  state.timelineCurrent=state.current;
}

function refreshPicker(id){
  const value=$(id).value,frame=selectedFrame(id),host=$('value-'+id);
  if(host.dataset.key===`${value}:${displaySettings.revision}`&&host.frame===frame)return;
  host.dataset.key=`${value}:${displaySettings.revision}`;host.frame=frame;
  if(frame){
    const date=document.createElement('time');
    date.dateTime=frameDate(frame);
    date.textContent=frameDate(frame).slice(0,10);
    host.replaceChildren(date);
    host.closest('button').title=readout(frame);
  }else{
    host.textContent='Choose a date';
    host.closest('button').removeAttribute('title');
  }
}

function decodeFrame(frame){
  const arrays={shape:frame.arrays.SCI.shape};
  for(const name of ['SCI','VALID','WAVE','BAND'])if(frame.arrays[name])arrays[name]=decodeArray(frame.arrays[name]);
  return arrays;
}

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

function drawThumbnail(index,frame){
  const cell=document.querySelector(`tr[data-index="${index}"] .preview-state`);
  if(!cell)return;
  cell.replaceChildren();
  const button=document.createElement('button'),canvas=document.createElement('canvas');
  button.className='frame-thumbnail';button.type='button';button.setAttribute('aria-label',`Inspect frame ${frame.archive_id}, detector ${frame.detector}`);
  button.onclick=()=>{if(comparison){const n=filteredFrames().indexOf(frame);if(n>=0)selectTimeline(n);}else showMetadata(frame);};
  canvas.width=110;canvas.height=84;canvas.setAttribute('aria-hidden','true');button.append(canvas,'Inspect frame');cell.append(button);
  if(Number.isFinite(frame.wavelength_center_um)){
    const row=cell.closest('tr');row.dataset.wave=frame.wavelength_center_um;
    row.cells[2].textContent=`${frame.wavelength_center_um.toFixed(4)} µm`;
  }
  drawFrame(canvas,frame,{zoom:1,center_x:(frame.arraysDecoded.shape[1]-1)/2,center_y:(frame.arraysDecoded.shape[0]-1)/2},false);
  const coverage=document.createElement('small');
  coverage.className='preview-quality';coverage.textContent=maskSummary(frame);cell.append(coverage);
}

function baseFrames(){const detector=$('filter-detector').value,min=parseFloat($('filter-min').value),max=parseFloat($('filter-max').value);return state.frames.filter(frame=>(detector==='all'||String(frame.detector)===detector)&&(!Number.isFinite(min)||!Number.isFinite(frame.wavelength_center_um)||frame.wavelength_center_um>=min)&&(!Number.isFinite(max)||!Number.isFinite(frame.wavelength_center_um)||frame.wavelength_center_um<=max));}
function filteredFrames(){return framesInWavelengthWindow(baseFrames(),state.band);}
function applyFilters(){const detector=$('filter-detector').value,min=parseFloat($('filter-min').value),max=parseFloat($('filter-max').value);for(const row of $('observation-rows').rows){const wave=parseFloat(row.dataset.wave);row.hidden=(detector!=='all'&&row.dataset.detector!==detector)||(Number.isFinite(min)&&Number.isFinite(wave)&&wave<min)||(Number.isFinite(max)&&Number.isFinite(wave)&&wave>max);}}
for(const id of ['filter-detector','filter-min','filter-max'])$(id).oninput=()=>{applyFilters();refreshFrameOptions();render();if(comparison)drawSpectrum();};

function defaultPair(frames){
  const usableByDetector=new Map();
  let pair=null,span=0,sameRelease=false;
  for(const frame of frames){
    const wavelength=frame.wavelength_center_um;
    if(!frame.target?.valid||!Number.isFinite(wavelength)||wavelength<=0)continue;
    const date=frameDate(frame);
    const candidates=usableByDetector.get(frame.detector)??[];
    for(const earlier of candidates){
      const firstDate=frameDate(earlier);
      if(firstDate.slice(0,10)===date.slice(0,10))continue;
      // One channel width, with a 2.5% tolerance if widths are unavailable.
      const a=earlier.wavelength_center_um;
      const width=Math.max(earlier.bandwidth_um||0,frame.bandwidth_um||0)||Math.min(a,wavelength)*.025;
      if(Math.abs(a-wavelength)>width)continue;
      const gap=Date.parse(date)-Date.parse(firstDate);
      const matchedRelease=earlier.release===frame.release;
      if(!pair||matchedRelease&&!sameRelease||matchedRelease===sameRelease&&gap>span){
        pair=[earlier,frame];span=gap;sameRelease=matchedRelease;
      }
    }
    candidates.push(frame);
    usableByDetector.set(frame.detector,candidates);
  }
  return pair;
}

function refreshFrameOptions(){
  const frames=baseFrames(), timeline=framesInWavelengthWindow(frames,state.band);
  state.sameBand=state.loading?null:largestSameBand(frames.filter(frame=>frame.isCached));
  const pair=state.loading?null:defaultPair(timeline)??(state.band?defaultPair(frames):null);
  const indexByFrame=new Map(state.frames.map((frame,index)=>[frame,String(index)]));
  frameChoices=new Map(frames.map(frame=>[indexByFrame.get(frame),frame]));
  for(const [i,id] of ['frame-a','frame-b'].entries()){
    const select=$(id),override=state.pairOverrides[id];
    const fallback=i===0?frames.find(frame=>frame.target?.valid)??frames[0]:null;
    const picking=frameChoices.has(override)||(i===1&&override==='');
    select.value=picking?override:indexByFrame.get(pair?.[i]??fallback)??'';
  }
  const note=$('pair-note');
  note.hidden=frames.length===0;
  note.textContent=pair?'Suggested pair uses detector D'+pair[0].detector+' on '+frameDate(pair[0]).slice(0,10)+' and '+frameDate(pair[1]).slice(0,10)+'. Both target pixels are usable.':
    state.loading?'Checking loaded frames for a comparable pair…':
    'No default pair in these frames. A default needs two dates on one detector, similar wavelengths and two usable target pixels. You can still choose frames manually.';
  $('scrubber').max=String(Math.max(0,timeline.length-1));state.current=Math.min(state.current,Math.max(0,timeline.length-1));$('scrubber').value=String(state.current);refreshControls();
}

function setBand(window, anchor, feedback=''){
  stop();
  state.band=window;
  state.bandFeedback=feedback;
  state.current=Math.max(0,filteredFrames().indexOf(anchor));
  refreshFrameOptions();
  const url=new URL(location.href);
  for(const key of ['mode','frame','a','b','wipe'])url.searchParams.delete(key);
  addViewParameters(url.searchParams);
  history.replaceState(null,'',url);
  render();
}

function describeBand(count, total){
  const window=state.band;
  const select=$('wavelength-window');
  select.value=window?.halfWidth??'';
  select.disabled=!total;
  $('same-band').disabled=state.loading||!total;
  const countText=`${count} of ${total} frames`+(window?` · ${window.center.toFixed(3)} µm${window.singleDetector?` · D${window.detector}`:''}`:'');
  if($('wavelength-count').textContent!==countText)$('wavelength-count').textContent=countText;
  const groupCount=state.sameBand?.count??0;
  const status=state.bandFeedback||(!state.loading&&total&&groupCount<3?
    'The largest cached same-band group has fewer than 3 frames. Widen the window for more dates.':'');
  const note=$('same-band-status');
  if(note.textContent!==status)note.textContent=status;
  note.hidden=!status;
}

function setInitialView(){const frame=state.frames[0],shape=frame.arraysDecoded.shape;state.view={zoom:1,center_x:(shape[1]-1)/2,center_y:(shape[0]-1)/2};}
function selectedFrame(id){
  const value=$(id).value;
  return value===''?null:state.frames[Number(value)];
}

function imageFor(frame){
  if(frame.bitmap&&frame.bitmapRevision===displaySettings.revision)return frame.bitmap;
  const [height,width]=frame.arraysDecoded.shape,canvas=document.createElement('canvas');
  canvas.width=width;canvas.height=height;
  const context=canvas.getContext('2d'),image=context.createImageData(width,height);
  const {values:sci,valid,masked,filled}=displayPixels(frame,displaySettings.showMasks);
  const {background,lower,upper}=displayLimits(frame,displaySettings);
  for(let i=0;i<sci.length;i++){
    // FITS rows increase northward. Canvas rows increase down the screen.
    const offset=((height-1-Math.floor(i/width))*width+i%width)*4;
    if(!valid[i]||!Number.isFinite(sci[i])){image.data.set([23,23,23,255],offset);continue;}
    if(frame.derived==='difference'){
      const v=Math.min(1,Math.abs(sci[i])/(frame.display?.vmax??1)),t=Math.round(148*v);
      image.data.set(sci[i]<0?[45,50+t*.65,55+t,255]:[45+t,50+t*.55,55,255],offset);continue;
    }
    const intensity=Math.max(0,Math.min(1,(sci[i]-background-lower)/(upper-lower)));
    const level=Math.round(Math.asinh(intensity/.06)/Math.asinh(1/.06)*255);
    image.data.set([level,level,level,255],offset);
  }
  context.putImageData(image,0,0);
  frame.bitmap=canvas;frame.bitmapRevision=displaySettings.revision;
  frame.displayCoverage={valid,masked,filled};
  return canvas;
}

function geometry(canvas,frame,view=state.view){const [height,width]=frame.arraysDecoded.shape;const base=Math.min(canvas.width/width,canvas.height/height);return {width:canvas.width,height:canvas.height,scale:base*view.zoom,imageWidth:width,imageHeight:height};}
function paint(context,canvas,frame,view,clip,overlays=true){
  const raw=imageFor(frame),g=geometry(canvas,frame,view);
  const native=$('native-pixels').checked;
  const source=native||canvas.width<=110?raw:bicubicBitmap(raw,frame.displayCoverage.valid);
  const x=canvas.width/2-(view.center_x+.5)*g.scale;
  const y=canvas.height/2-(g.imageHeight-.5-view.center_y)*g.scale;
  context.save();
  if(clip){context.beginPath();context.rect(clip.x,0,clip.width,canvas.height);context.clip();}
  context.imageSmoothingEnabled=!native;
  context.imageSmoothingQuality='high';
  context.drawImage(source,x,y,g.imageWidth*g.scale,g.imageHeight*g.scale);
  if(overlays&&!frame.derived)drawReferences(context,canvas,frame,view,g);
  drawMarker(context,canvas,frame,view);
  context.restore();
}
function drawMarker(context,canvas,frame,view){if(!frame.target)return;const g=geometry(canvas,frame,view),x=canvas.width/2+(frame.target.x-view.center_x)*g.scale,y=canvas.height/2-(frame.target.y-view.center_y)*g.scale;context.save();context.strokeStyle=frame.target.valid?'#77d7ff':'#ff7373';context.lineWidth=2;context.beginPath();context.arc(x,y,10,0,Math.PI*2);context.moveTo(x-15,y);context.lineTo(x+15,y);context.moveTo(x,y-15);context.lineTo(x,y+15);context.stroke();context.restore();}
function drawFrame(canvas,frame,view=state.view,overlays=true){const context=canvas.getContext('2d');context.clearRect(0,0,canvas.width,canvas.height);paint(context,canvas,frame,view,null,overlays);}

function maskSummary(frame){
  if(!frame.displayCoverage)return '';
  const {masked,filled}=frame.displayCoverage;
  return `${masked} masked or invalid grid pixels. ${filled?`${filled} filled for display only.`:''}`.trim();
}

function drawReferences(context,canvas,frame,view,g){
  for(const kind of activeCatalogs()){
    context.strokeStyle=kind==='gaia'?'#77d7ff':'#ffcf7a';context.lineWidth=1.5;
    for(const source of catalogs[kind].sources){
      const position=referencePosition(source,frame.time_start_utc,kind==='gaia');
      let p;
      try{p=skyToPixel(position.ra_deg,position.dec_deg,frame.wcs);}catch{continue;}
      if(p.x<0||p.x>=g.imageWidth||p.y<0||p.y>=g.imageHeight)continue;
      const x=canvas.width/2+(p.x-view.center_x)*g.scale,y=canvas.height/2-(p.y-view.center_y)*g.scale;
      if(kind==='gaia'){context.beginPath();context.arc(x,y,4,0,Math.PI*2);context.stroke();}
      else context.strokeRect(x-3,y-3,6,6);
    }
  }
}

const currentFrame=()=>state.mode==='single'?filteredFrames()[state.current]:selectedFrame('frame-a');

function windowFrame(reference,frames){
  const mode=$('flipbook-view').value;
  if(mode==='single')return {frame:reference,count:1};
  const pool=mode==='detector'?frames.filter(frame=>frame.detector===reference.detector):frames;
  const start=pool.indexOf(reference);
  const length=Math.max(1,Math.min(15,Math.trunc(Number($('window-size').value)||3)));
  const group=pool.slice(start,start+length);
  if(group.length<2)return {frame:reference,count:1,detector:mode==='detector'};
  if(state.window?.group.length!==group.length||group.some((frame,index)=>frame!==state.window?.group[index])){
    state.window={group,frame:combineFrames(reference,group,'mean')};
  }
  return {frame:state.window.frame,count:group.length,detector:mode==='detector'};
}

function showDerived(mode){
  const a=selectedFrame('frame-a'),b=selectedFrame('frame-b'),detector=Number($('coadd-detector').value);
  const byDetector=mode==='detector';
  const group=byDetector?state.frames.filter(frame=>frame.detector===detector):[a,b].filter(Boolean);
  $('derived-result').hidden=true;
  if(group.length<2||group[0]===group[1]&&!byDetector){$('analysis-note').textContent='Choose two distinct loaded exposures to combine.';return;}
  try{
    const frame=combineFrames(group[0],mode==='difference'?[group[1]]:group,mode);
    const waves=group.map(item=>item.wavelength_center_um).filter(Number.isFinite);
    const range=waves.length?`${Math.min(...waves).toFixed(3)}–${Math.max(...waves).toFixed(3)} µm at target`:'wavelengths unavailable';
    const waveWarning=waves.length<group.length||Math.max(...waves)-Math.min(...waves)>1e-5?' Wavelength coverage differs or is unknown.':'';
    const releases=new Set(group.map(item=>item.release));
    const releaseWarning=releases.size>1?' Mixed archive releases can differ in processing.':'';
    $('derived-caption').textContent=`${frame.label}${byDetector?` · D${detector}`:''} · ${range} · ${Math.round(frame.usable_fraction*100)}% usable pixels`;
    $('analysis-note').textContent=(mode==='difference'?'Exploratory A − B uses pixels usable in both exposures. Blue is negative and orange is positive.':'Exploratory equal-weight average of usable sky pixels.')+waveWarning+releaseWarning+' Background and PSF differences may remain.';
    const [height,width]=frame.arraysDecoded.shape;
    const view={zoom:1,center_x:(width-1)/2,center_y:(height-1)/2};
    state.derived={frame,view};
    drawFrame($('derived-canvas'),frame,view,false);
    $('derived-result').hidden=false;
  }catch(error){$('analysis-note').textContent=error.message;}
}

function drawSpectrum(){
  if(!state.spectrumPosition)return;
  const sky=state.spectrumPosition,plot=$('spectrum'),samples=spectrumAt(filteredFrames(),sky);
  plot.toggleAttribute('hidden',!samples.length);
  if(!samples.length){$('spectrum-status').textContent='No wavelength samples at this position in the loaded frames.';return;}
  const good=samples.filter(s=>s.valid),minX=samples[0].wave,maxX=samples.at(-1).wave;
  const minY=good.length?Math.min(...good.map(s=>s.value)):0,maxY=good.length?Math.max(...good.map(s=>s.value)):1;
  const x=value=>minX===maxX?264:52+(value-minX)/(maxX-minX)*424;
  const y=value=>minY===maxY?78:133-(value-minY)/(maxY-minY)*109;
  plot.replaceChildren(svg('path',{d:'M 52 20 V 135 H 479 M 52 152 H 479',class:'map-grid'}),
    svg('text',{x:52,y:16},'Surface brightness · MJy/sr'),svg('text',{x:52,y:178},`${minX.toFixed(3)} µm`),
    svg('text',{x:479,y:178,'text-anchor':'end'},`${maxX.toFixed(3)} µm`),svg('text',{x:6,y:155},'masked'));
  for(const sample of samples){
    const cx=x(sample.wave),cy=sample.valid?y(sample.value):152;
    const marker=svg('circle',{cx,cy,r:sample.valid?3:4,class:sample.valid?'spectrum-sample':'spectrum-masked'});
    marker.append(svg('title',{},`${sample.id} · D${sample.detector} · ${sample.wave.toFixed(4)} µm${sample.measured?'':' (nominal)'} · ${sample.valid?sample.value.toPrecision(4)+' MJy/sr':'masked or invalid'}`));plot.append(marker);
  }
  $('spectrum-status').textContent=`ICRS ${sky.ra_deg.toFixed(6)}°, ${sky.dec_deg.toFixed(6)}° · ${good.length} usable, ${samples.length-good.length} masked / invalid. These are exploratory samples across exposures. Nominal channel centers are labelled where pixel wavelengths are unavailable.`;
}

function sampleSpectrum(frame,point){
  if(!frame)return;
  state.spectrumPosition=pixelToSky(point.x,point.y,frame.wcs);
  $('analysis-tools').open=true;drawSpectrum();
}

function describeView(a,b,count){
  if(!a)return 'No loaded frames match the current filters.';
  const describe=frame=>`${frameDate(frame).slice(0,10)} at ${frameDate(frame).slice(11,19)} UTC, detector ${frame.detector}, ${Number.isFinite(frame.wavelength_center_um)?frame.wavelength_center_um.toFixed(3)+' micrometres'+(frame.target?.valid?'':' (nominal channel)'):'wavelength unavailable'}`;
  if(state.mode==='single')return `Blink view, frame ${state.current+1}. ${describe(a)}.${count>1?` The image averages ${count} consecutive frames.`:''}`;
  if(!b)return `Frame A is ${describe(a)}. Choose a second frame to compare.`;
  const heading={side:'Side by side with A on the left',wipe:`Wipe at ${state.wipe}% with A on the left`,
    difference:'Difference subtracts B from A. Blue is negative and orange is positive. Only pixels usable in both frames contribute.'};
  return `${heading[state.mode]}. Frame A is ${describe(a)}. Frame B is ${describe(b)}.`;
}

function displayedDifference(a,b){
  if(!a||!b||a===b)return null;
  if(state.difference?.a!==a||state.difference?.b!==b){
    state.difference={a,b,frame:combineFrames(a,[b],'difference')};
  }
  return state.difference.frame;
}

function instrumentScale(side,frame){
  const scale=$('scale-'+side);
  scale.hidden=!frame;
  if(!frame)return;
  const arcseconds=frame.arraysDecoded.shape[1]*Math.abs(frame.wcs.CDELT1)*3600/state.view.zoom;
  const length=[240,120,60,30,15,10,5,2,1].find(value=>value<=arcseconds*.22);
  scale.hidden=!length;
  if(!length)return;
  scale.style.width=`${length/arcseconds*100}%`;
  scale.firstElementChild.textContent=length>=60?`${length/60}′`:`${length}″`;
}

function targetMaskNote(id,frame,view){
  const note=$(id);
  if(!frame){note.hidden=true;note.textContent='';return;}
  const flag=frame.quality?.target_flags??[];
  const mask=frame.target?.valid?'':`Target pixel is masked or outside usable coverage.${flag.length?` Native flags: ${flag.join(', ')}.`:''}`;
  note.textContent=[mask,view?maskSummary(view):''].filter(Boolean).join(' ');
  note.hidden=!note.textContent;
}

function render(){
  if(!comparison||$('compare').hidden)return;
  const frames=filteredFrames();
  const a=currentFrame();
  const b=state.mode==='single'?null:selectedFrame('frame-b');
  const comparedFrames=state.mode==='single'?frames:[a,b].filter(Boolean);
  const waves=comparedFrames.map(frame=>frame.wavelength_center_um).filter(Number.isFinite);
  const different=comparedFrames.length>1&&(waves.length<comparedFrames.length||Math.max(...waves)-Math.min(...waves)>1e-5);
  const similar=state.band?.halfWidth===NARROW_BAND_HALF_WIDTH&&comparedFrames.length>1&&
    waves.length===comparedFrames.length&&waves.every(wave=>Math.abs(wave-state.band.center)<=NARROW_BAND_HALF_WIDTH+1e-9);
  const wavelengthNote=$('wavelength-note');
  wavelengthNote.textContent=similar?'Frames in this window have similar wavelengths.':
    'Wavelength warning: exposure wavelengths differ or are unavailable. Wavelength affects image brightness.';
  wavelengthNote.classList.toggle('band-match',similar);
  $('release-note').hidden=new Set(comparedFrames.map(frame=>frame.release)).size<2;
  wavelengthNote.hidden=!similar&&!different;
  let window={frame:a,count:1};
  let windowError='';
  if(a&&state.mode==='single'){
    try{window=windowFrame(a,frames);}
    catch(error){windowError=error.message;}
  }
  let differenceMessage='';
  if(state.mode==='difference'){
    try{window.frame=displayedDifference(a,b);}
    catch(error){window.frame=null;differenceMessage=error.message;}
    if(!window.frame&&!differenceMessage)differenceMessage='Choose two different frames to display their difference.';
  }
  const canvasA=$('canvas-a'),canvasB=$('canvas-b'),context=canvasA.getContext('2d');
  context.clearRect(0,0,canvasA.width,canvasA.height);
  if(window.frame){
    const divider=canvasA.width*state.wipe/100;
    paint(context,canvasA,window.frame,state.view,state.mode==='wipe'?{x:0,width:divider}:null);
    if(state.mode==='wipe'&&b)paint(context,canvasA,b,state.view,{x:divider,width:canvasA.width-divider});
  }
  if(state.mode==='side'&&b)drawFrame(canvasB,b);
  if(state.mode==='wipe')$('canvases').style.setProperty('--wipe-position',state.wipe+'%');
  $('meta-a').textContent=state.mode==='difference'?(differenceMessage||'Difference A − B · exploratory'):
    a?(state.mode==='single'?'':'A · ')+readout(a)+(window.count>1?` · ${window.count}-frame coadd`:''):'No loaded frame matches these filters.';
  $('window-summary').textContent=windowError||(state.mode!=='single'?'':window.count>1?
    `Exploratory mean of ${window.count} consecutive ${window.detector?`D${a.detector} `:''}exposures starting at the selected frame, using only usable pixels.`:
    a&&$('flipbook-view').value!=='single'&&Number($('window-size').value)>1?'This position in the timeline has one frame available for the coadd.':'');
  $('window-summary').hidden=!$('window-summary').textContent;
  $('meta-b').textContent=b?'B · '+readout(b):'';
  targetMaskNote('mask-a',a,window.frame);
  targetMaskNote('mask-b',b,b);
  instrumentScale('a',window.frame);
  instrumentScale('b',state.mode==='side'?b:null);
  const description= differenceMessage||describeView(a,b,window.count);
  $('view-description').textContent=description;
  const announcement=$('viewer-announcement');
  const update=!wavelengthNote.hidden&&!differenceMessage?description+' '+wavelengthNote.textContent:description;
  if(!state.timer&&announcement.textContent!==update)announcement.textContent=update;
  $('zoom-value').textContent=`${state.view.zoom.toFixed(1)}×`;$('scrubber-value').textContent=`${frames.length?state.current+1:0} / ${frames.length}`;$('scrubber').value=String(state.current);
  renderTimeline(frames);showMetadata(a);
  for(const id of ['frame-a','frame-b'])refreshPicker(id);
  updateSkyBackground?.(window.frame,displaySettings);
}

function refreshControls(){
  const count=filteredFrames().length,total=frameChoices.size,two=total>=2;
  if(count<2)stop();
  if(!two)state.mode='single';
  describeBand(count,total);
  for(const id of ['play','prev','next','scrubber'])$(id).disabled=count<2;
  for(const id of ['side','wipe','difference-mode','choose-frame-b','use-frame-b'])$(id).disabled=!two;
  if(comparison)for(const id of ['add-frames','subtract-frames'])$(id).disabled=!two;
  $('choose-frame-a').disabled=!total;
  for(const id of ['single','zoom-out','zoom-in','fit','sample-centre'])$(id).disabled=count<1&&state.mode==='single';
  $('control-reason').textContent=two?'':count===1?'Two-frame tools need a second loaded image.':'Choose observations to populate the timeline.';
  $('control-reason').hidden=two;
  $('figure-b').hidden=!['side','wipe'].includes(state.mode)||!selectedFrame('frame-b');
  $('canvas-b').hidden=state.mode!=='side';$('wipe-control').hidden=state.mode!=='wipe';$('canvases').className=`canvases mode-${state.mode}`;
  for(const [mode,id] of Object.entries(modeButtons))$(id).setAttribute('aria-pressed',String(state.mode===mode));
}
function step(direction){const frames=filteredFrames();if(frames.length<2)return;state.mode='single';state.current=(state.current+direction+frames.length)%frames.length;refreshControls();render();}
function playbackState(playing){
  $('play-label').textContent=playing?'Pause':'Play';
  $('play').setAttribute('aria-pressed',String(playing));
}
function stop(){if(state.timer)clearInterval(state.timer);state.timer=null;playbackState(false);}
function play(){if(state.timer){stop();render();return;}if($('play').disabled)return;state.mode='single';refreshControls();playbackState(true);state.timer=setInterval(()=>step(1),Number($('speed').value));render();}

function addViewParameters(params){
  writeWavelengthWindow(params,state.band);
  if(state.mode!=='single'){
    params.set('mode',state.mode);
    for(const side of ['a','b'])params.set(side,$('frame-'+side).value);
    if(state.mode==='wipe'&&state.wipe!==50)params.set('wipe',state.wipe);
  }else if(state.current>0){
    params.set('frame',state.current+1);
  }
  return params;
}

function restoreView(){
  const params=sharedView;
  sharedView=new URLSearchParams();
  const mode=params.get('mode');
  state.band=readWavelengthWindow(params);
  refreshFrameOptions();
  let restored=Boolean(state.band);
  if(['side','wipe','difference'].includes(mode)&&frameChoices.size>1){
    for(const side of ['a','b']){
      const select=$('frame-'+side),value=params.get(side);
      if(frameChoices.has(value)||(side==='b'&&value==='')){
        select.value=value;
        state.pairOverrides[select.id]=value;
      }
    }
    const wipe=Number(params.get('wipe')??50);
    if(selectedFrame('frame-b'))state.mode=mode;
    if(state.mode==='wipe'&&Number.isFinite(wipe)&&wipe>=0&&wipe<=100){
      state.wipe=wipe;$('wipe-position').value=String(wipe);
    }
    restored=restored||state.mode===mode;
  }else{
    const index=Number(params.get('frame'))-1;
    if(Number.isInteger(index)&&index>0&&index<filteredFrames().length){state.current=index;restored=true;}
  }
  if(restored){
    const url=new URL(location.href);
    url.search=addViewParameters(url.searchParams);
    history.replaceState(null,'',url);
    refreshControls();
  }
}

$('search-form').onsubmit=runSearch;$('retry').onclick=event=>runSearch(event,true);$('prev').onclick=()=>{stop();step(-1)};$('next').onclick=()=>{stop();step(1)};$('play').onclick=play;
$('wavelength-window').onchange=event=>{
  const halfWidth=Number(event.target.value);
  const anchor=currentFrame()??selectedFrame('frame-a');
  if(!halfWidth){setBand(null,anchor);return;}
  if(!Number.isFinite(anchor?.wavelength_center_um)){
    state.bandFeedback='Choose a frame with a wavelength before narrowing the window.';
    describeBand(filteredFrames().length,frameChoices.size);
    return;
  }
  setBand({center:anchor.wavelength_center_um,halfWidth,detector:anchor.detector,singleDetector:false},anchor);
};
$('same-band').onclick=()=>{
  const group=state.sameBand;
  if(!group||group.count<2){
    state.bandFeedback='Fewer than 2 cached frames qualify for Same band. Widen the wavelength window to see more frames.';
    describeBand(filteredFrames().length,frameChoices.size);
    return;
  }
  const pair=defaultPair(group.frames)??[group.frames[0],group.frames.at(-1)];
  for(const [i,id] of ['frame-a','frame-b'].entries())state.pairOverrides[id]=String(state.frames.indexOf(pair[i]));
  state.mode='single';
  setBand({center:group.center,halfWidth:NARROW_BAND_HALF_WIDTH,detector:group.detector,singleDetector:true},group.frames[0]);
  play();
};
for(const kind of Object.keys(catalogs)){
  const input=$(`overlay-${kind}`);
  input.onchange=()=>toggleReference(kind);
  $(`retry-${kind}`).onclick=()=>{
    input.checked=true;
    toggleReference(kind);
  };
}
$('copy-view').onclick=async()=>{
  try{
    const url=new URL(location.href);
    if($('ra').value.trim()&&$('dec').value.trim())url.search=addViewParameters(shareParameters(requestPayload()));
    try{await navigator.clipboard.writeText(url.href);$('share-note').textContent='View link copied.';}
    catch{$('share-note').textContent=url.href;}
  }catch(error){$('share-note').textContent=error.message;}
};
$('scrubber').oninput=()=>{stop();state.mode='single';state.current=Number($('scrubber').value);refreshControls();render();};$('speed').oninput=()=>{$('speed-value').textContent=`${(Number($('speed').value)/1000).toFixed(2)} s`;if(state.timer){stop();play();}};
for(const [mode,id] of Object.entries(modeButtons))$(id).onclick=()=>{
  if(mode!=='single'&&!selectedFrame('frame-b')){
    $('choose-frame-b').click();
    return;
  }
  state.mode=mode;stop();refreshControls();render();
};
$('wipe-position').oninput=()=>{state.wipe=Number($('wipe-position').value);render();};
$('zoom-in').onclick=()=>{state.view.zoom=Math.min(20,state.view.zoom*1.25);render();};$('zoom-out').onclick=()=>{state.view.zoom=Math.max(1,state.view.zoom/1.25);render();};$('fit').onclick=()=>{setInitialView();render();};

$('native-pixels').onchange=()=>{
  for(const frame of state.frames)drawThumbnail(frame.rowIndex,frame);
  render();
};

function updateStretch(){
  const lower=$('stretch-low').valueAsNumber,upper=$('stretch-high').valueAsNumber;
  const invalid=Number.isFinite(lower)&&Number.isFinite(upper)&&lower>=upper;
  for(const id of ['stretch-low','stretch-high'])$(id).setAttribute('aria-invalid',String(invalid));
  $('stretch-status').textContent=invalid?'The upper limit must be greater than the lower limit.':'Blank limits use each image’s percentiles.';
  if(invalid)return;
  Object.assign(displaySettings,{subtract:$('subtract-background').checked,
    lower:Number.isFinite(lower)?lower:null,upper:Number.isFinite(upper)?upper:null});
  redrawDisplay();
}

function redrawDisplay(){
  displaySettings.revision++;
  for(const frame of state.frames)drawThumbnail(frame.rowIndex,frame);
  for(const canvas of $('frame-strip').querySelectorAll('canvas')){
    if(canvas.dataset.revision)paintThumbnail(canvas,visibleTiles.get(canvas));
  }
  if(comparison&&state.derived&&!$('derived-result').hidden){
    drawFrame($('derived-canvas'),state.derived.frame,state.derived.view,false);
  }
  render();
}
for(const id of ['subtract-background','stretch-low','stretch-high'])$(id).onchange=updateStretch;
$('show-masks').onchange=()=>{
  displaySettings.showMasks=$('show-masks').checked;
  redrawDisplay();
};

if(comparison){
  $('sample-centre').onclick=()=>sampleSpectrum(currentFrame(),{x:state.view.center_x,y:state.view.center_y});
  $('flipbook-view').onchange=()=>{
    if($('flipbook-view').value==='single')$('window-size').value='1';
    else if(Number($('window-size').value)<2)$('window-size').value='2';
    render();
  };
  $('window-size').oninput=()=>{
    if(Number($('window-size').value)>1&&$('flipbook-view').value==='single')$('flipbook-view').value='window';
    else if(Number($('window-size').value)===1)$('flipbook-view').value='single';
    render();
  };
  $('add-frames').onclick=()=>showDerived('mean');$('subtract-frames').onclick=()=>showDerived('difference');$('coadd-frames').onclick=()=>showDerived('detector');
  for(const canvas of [$('canvas-a'),$('canvas-b')])attachViewportInput(canvas,{
    getView:()=>filteredFrames().length?state.view:null,
    getGeometry:()=>{
      const {width,height}=canvas.getBoundingClientRect();
      const shape=filteredFrames()[0].arraysDecoded.shape;
      return {width,height,scale:Math.min(width/shape[1],height/shape[0])*state.view.zoom};
    },
    getBounds:()=>{
      const shape=filteredFrames()[0].arraysDecoded.shape;
      return {width:shape[1],height:shape[0]};
    },
    onView:view=>{state.view=view;render();},
    onTap:point=>{
      let frame=canvas.id==='canvas-b'?selectedFrame('frame-b'):currentFrame();
      if(frame&&state.mode==='wipe'){
        const screenX=.5+(point.x-state.view.center_x)*geometry(canvas,frame).scale/canvas.width;
        if(screenX*100>=state.wipe)frame=selectedFrame('frame-b');
      }
      sampleSpectrum(frame,point);
    },
  });
  const keys={' ':'play',ArrowLeft:'prev',ArrowRight:'next','1':'single','2':'side','3':'wipe','4':'difference-mode','+':'zoom-in','=':'zoom-in','-':'zoom-out',Home:'fit'};
  document.addEventListener('keydown',event=>{
    if($('compare').hidden||event.ctrlKey||event.altKey||event.metaKey||(event.shiftKey&&event.key.startsWith('Arrow'))||
       !event.target.closest('#canvas-a, #canvas-b'))return;
    const button=$(keys[event.key]??'');
    if(!button||button.disabled)return;
    event.preventDefault();event.stopPropagation();button.click();
    if(event.isTrusted&&button.dataset.sound&&applicationAudio&&!applicationAudio.cue(button.dataset.sound)){
      applicationAudio.unlock().then(()=>applicationAudio.cue(button.dataset.sound)).catch(()=>{});
    }
  },true);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
}

loadTargets().catch(error=>message(`Challenge targets could not load: ${error.message}`,true));
refreshControls();
