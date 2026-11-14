import {observationRequest, requestFromURL, requestURL, archiveURL, nearbyFields,selectionOptions} from './coordinate-query.js';
import {fetchCatalogue} from './catalogue.js';
import {prepareRequest} from './preparation-client.js';

const $ = id => document.getElementById(id), form = $('sky-search-form');
let active = null, sequence = 0;
let preparation = null;
function clearResult() {
  preparation?.abort();preparation=null;
  $('sky-search-cancel').hidden=true;$('sky-search-prepare').disabled=false;
  $('sky-search-discover').disabled=false;
  ++sequence;
  active = null;
  $('sky-search-actions').hidden = true;
  $('sky-search-matches').replaceChildren();
}
async function prepare() {
  clearResult();const ticket=sequence;
  try {
    const request={...read(),use_cache:!$('search-fresh').checked};
    active=request;preparation=new AbortController();
    history.pushState(null,'',requestURL(request,location.href));
    $('sky-search-cancel').hidden=false;$('sky-search-prepare').disabled=true;
    $('sky-search-status').textContent='Loading observations…';
    const {bundle,id}=await prepareRequest(request,{signal:preparation.signal,onProgress:message=>{if(ticket===sequence&&$('sky-search-status').textContent!==message)$('sky-search-status').textContent=message;}});
    if(ticket!==sequence)return;
    if(!bundle.frames.length) {
      const reasons=[...new Set([...(bundle.rejections||[]),...(bundle.selection?.rejections||[])].map(r=>r.reason))];
      $('sky-search-status').textContent='No supported image could be prepared for this release, wavelength group, dates and field. This is not a target nondetection. '+(bundle.selection?.outcome||'')+' '+reasons.slice(0,3).join(' ');
      return;
    }
    if(!window.skyshiftWebsite)throw Error('The main viewer is unavailable. Reload or use the independent observation tools.');
    await window.skyshiftWebsite.openPrepared(bundle,id);
  }catch(e){if(ticket===sequence)$('sky-search-status').textContent=preparation?.signal.aborted?'Preparation cancelled. No late result will replace your view.':e.message;}
  finally{if(ticket===sequence){$('sky-search-cancel').hidden=true;$('sky-search-prepare').disabled=false;preparation=null;}}
}
async function discoverArchive() {
  clearResult();const ticket=sequence;
  try {
    const request={...read(),discovery_only:true,discovery_scope:'all_supported',use_cache:!$('search-fresh').checked};
    active=request;preparation=new AbortController();$('sky-search-cancel').hidden=false;$('sky-search-prepare').disabled=true;$('sky-search-discover').disabled=true;
    $('sky-search-status').textContent='Discovering archive metadata; no observation FITS will be downloaded…';
    const {bundle}=await prepareRequest(request,{signal:preparation.signal,onProgress:message=>{if(ticket===sequence)$('sky-search-status').textContent=message;}});
    if(ticket!==sequence)return;
    if(bundle.kind!=='spherex_archive_discovery'||!Array.isArray(bundle.collections)||!Array.isArray(bundle.observations))throw Error('Unsupported metadata discovery response');
    $('sky-search-status').textContent=`${bundle.metadata_rows} metadata rows across supported collections · ${bundle.network_requests} network requests · ${(bundle.network_bytes/1024).toFixed(1)} KiB received. `+(bundle.status==='complete'?'Requested scope completed.':'Search is partial or temporarily unavailable; no absence or complete coverage is inferred.')+' Candidates still need exact wavelength, mask and registration checks.';
    for(const collection of bundle.collections){const li=document.createElement('li');li.textContent=`${collection.collection}: ${collection.rows} candidates · ${collection.status} · ${collection.origin}`;$('sky-search-matches').append(li);}
    const save=document.createElement('button');save.textContent='Save archive metadata receipt ↓';save.type='button';save.onclick=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(bundle,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='skyshift-archive-metadata.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};const receiptItem=document.createElement('li');receiptItem.append(save);$('sky-search-matches').append(receiptItem);
    const list=document.createElement('details'),summary=document.createElement('summary');summary.textContent='Observation dates, footprints and source identities';list.append(summary);
    const pre=document.createElement('pre');pre.style.cssText='white-space:pre-wrap;overflow-wrap:anywhere;max-height:420px;overflow:auto;font-size:12px';pre.textContent=JSON.stringify(bundle.observations.slice(0,80),null,2);list.append(pre);$('sky-search-matches').append(Object.assign(document.createElement('li'),{}));$('sky-search-matches').lastChild.append(list);
  }catch(e){if(ticket===sequence)$('sky-search-status').textContent=preparation?.signal.aborted?'Metadata discovery cancelled.':e.message;}
  finally{if(ticket===sequence){$('sky-search-cancel').hidden=true;$('sky-search-prepare').disabled=false;$('sky-search-discover').disabled=false;preparation=null;}}
}
$('sky-search-discover').onclick=discoverArchive;
$('sky-search-check').onclick=()=>search();
$('sky-search-cancel').onclick=()=>{clearResult();$('sky-search-cancel').hidden=true;$('sky-search-prepare').disabled=false;$('sky-search-status').textContent='Preparation cancelled. No late result will replace your view.';};
function read() {
  return {...observationRequest({ra: $('search-ra').value, dec: $('search-dec').value, fov: $('search-fov').value, release: $('search-release').value}),detector:Number($('search-detector').value),max_frames:Number($('search-frames').value),deep:$('search-deep').checked,metadata_provider:$('search-metadata-provider').value,...selectionOptions({selection:$('search-selection').value,wavelength:$('search-wavelength').value,start:$('search-start').value,end:$('search-end').value})};
}
function fill(request) {
  const r = request.region;
  $('search-ra').value = String(r.ra_deg);
  $('search-dec').value = String(r.dec_deg);
  $('search-fov').value = String(r.size_deg * 60);
  $('search-release').value = request.release;
  $('search-detector').value=String(request.detector??2);
  $('search-frames').value=String(request.max_frames??3);
  $('search-deep').checked=request.deep??false;
  $('search-metadata-provider').value=request.metadata_provider||'sia2';
  $('search-selection').value=request.selection||'compatible';
  $('search-wavelength').value=request.wavelength_um??'';
  $('search-start').value=request.start_date||'';$('search-end').value=request.end_date||'';
}
async function search(updateURL = true) {
  clearResult();
  const ticket = sequence;
  try {
    const request = read(), r = request.region;
    active = request;
    if (updateURL) history.pushState(null, '', requestURL(request, location.href));
    $('sky-search-share').href = requestURL(request, location.href);
    $('sky-search-share').textContent = 'Open shareable search link ↗';
    $('sky-search-archive').href = archiveURL(request);
    $('sky-search-actions').hidden = false;
    $('sky-search-status').textContent = `ICRS ${r.ra_deg.toFixed(7)}°, ${r.dec_deg.toFixed(7)}° · square field width ${(r.size_deg * 60).toFixed(2)}′ · ${request.release.toUpperCase()} requested. Checking the installed collection…`;
    try {
      const catalogue = await fetchCatalogue();
      if (ticket !== sequence) return;
      const nearby = nearbyFields(request, catalogue);
      $('sky-search-status').textContent = nearby.length
        ? 'Nearby installed fields. Check their coverage before comparing.'
        : 'No nearby installed field. Load observations or try a cached example.';
      for (const {field, separation_deg} of nearby) {
        const item = document.createElement('li'), link = document.createElement('a');
        link.href = '#observations/' + field.id;
        link.textContent = `Open ${field.title} · ${(separation_deg * 60).toFixed(2)}′ from field centre`;
        item.append(link);
        const context = document.createElement('span');
        context.textContent = ` · ${field.observations.length} prepared observation(s), ${(field.size_deg * 60).toFixed(1)}′ original width. Temporal comparison: ${field.comparison_status === 'provisional_restricted' ? 'restricted M101 region only' : 'unavailable'}.`;
        item.append(context);
        $('sky-search-matches').append(item);
      }
    } catch (error) {
      if (ticket !== sequence) return;
      $('sky-search-status').textContent = 'The installed collection could not be checked. ' + error.message + ' Your search link, archive link and request download are still available.';
    }
  } catch (error) {
    $('sky-search-status').textContent = error.message;
  }
}
form.addEventListener('submit', event => { event.preventDefault(); prepare(); });
form.addEventListener('input', () => {
  clearResult();
  $('sky-search-targets').querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed','false'));
  $('sky-target-context').textContent = 'Custom ICRS search centre; no observation-epoch position is inferred.';
  $('sky-target-source').hidden = true;
  $('sky-search-status').textContent = '';
});
$('sky-search-download').addEventListener('click', () => {
  if (!active) return;
  const blob = new Blob([JSON.stringify(active, null, 2) + '\n'], {type: 'application/json'}), url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = 'skyshift-observation-request.json'; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});
async function restore() {
  clearResult();
  try {
    const request = requestFromURL(location.href);
    if (request) {fill(request); await search(false);}
    else $('sky-search-status').textContent = '';
  } catch (error) { $('sky-search-status').textContent = 'Could not open the search link: ' + error.message; }
}
window.addEventListener('popstate', restore);
async function targets() {
  try {
    const response = await fetch('./challenge-targets.json', {signal: AbortSignal.timeout(10000)});
    if (!response.ok) throw Error('Target presets unavailable.');
    const catalog = await response.json();
    const tested=await fetch('./data/target-status.json',{signal:AbortSignal.timeout(10000)}).then(r=>r.ok?r.json():null).catch(()=>null);
    for (const target of catalog.targets) {
      const button = document.createElement('button'); button.type = 'button'; button.textContent = target.name;button.setAttribute('aria-pressed','false');
      const status=tested?.targets?.find(t=>t.id===target.id);if(status)button.title=`${status.prepared_frames} genuine cached observation(s); no verified target motion or variability`;
      button.addEventListener('click', () => {
        clearResult();
        $('sky-search-targets').querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
        $('search-ra').value = target.ra; $('search-dec').value = target.dec; $('search-fov').value = String(target.fov_arcmin);
        const result=tested?.targets?.find(t=>t.id===target.id);
        $('sky-target-context').textContent = target.coordinate_context + (result?` QR2/D2 test: ${result.prepared_frames||0} prepared frame(s). ${result.interpretation}`:' SPHEREx target validation: not yet tested.');
        $('sky-target-source').href = target.source_url; $('sky-target-source').hidden = false;
        const pending=search(),expected=sequence;
        pending.then(()=>{
          if(expected===sequence&&result?.url) {
            const item=document.createElement('li'),link=document.createElement('a');
            link.href='#target-example/'+target.id;link.textContent=`Open ${target.name} · ${result.prepared_frames} cached frames ↗`;
            item.append(link);$('sky-search-matches').append(item);
          }
        });
      });
      $('sky-search-targets').append(button);
    }
  } catch { $('sky-target-context').textContent = 'Target presets could not load. Coordinate entry remains available.'; }
}
await Promise.all([restore(), targets()]);
