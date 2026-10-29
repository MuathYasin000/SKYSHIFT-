import {displayPreview} from "./mask-display.js";
import {spectralScreenCopy} from './spectral-screen-copy.js';
import {isPlainLinkClick} from './navigation-links.js';
import {stories,availability,friendlyDate} from './field-guide.js';
import './workspace-bridge.js';
import {fetchCatalogue} from './catalogue.js';
import {createExplorationMemory} from './exploration-memory.js';
import {loadProvenance} from './provenance-summary.js';
export function navigation(){import("./site-chrome.js").then(m=>m.installSiteChrome()).catch(()=>{});}
export const loadCatalog=fetchCatalogue;
export function make(tag,text,cls){const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;}
export function galleries(catalog,onChoose){
  for(const gallery of document.querySelectorAll('[data-gallery]')){
    gallery.replaceChildren();
    for(const field of catalog.fields){
      const obs=field.observations[0],story=stories[field.id],status=availability(field);
      const card=make('article',undefined,'field-card'),a=make('a');
      a.href=`./explore.html?field=${field.id}#explorer`;a.dataset.field=field.id;
      const preview=make('div',undefined,'field-preview'),img=make('img');
      img.src=displayPreview(obs.preview);img.alt=`Real single-band SPHEREx exposure of ${field.title}; excluded data marked by neutral hatching`;img.loading='lazy';
      preview.append(img,make('span','REAL SPHEREx EXPOSURE','preview-label'));
      const body=make('div',undefined,'field-card-body');
      body.append(make('span',status.label,'field-status'),make('div',story?.kind||'Curated sky region','field-kind'));
      body.append(Object.assign(make('h3',story?.name||field.title),{title:story?.name||field.title}),make('p',story?.short||field.description));
      const meta=make('div',undefined,'field-meta');
      meta.append(make('span',friendlyDate(obs.time_start_utc)+' UTC'),make('span',field.observations.length+' curated '+(field.observations.length===1?'exposure':'exposures')));
      const action=make('div',status.action,'field-action');action.append(make('span','↗'));body.append(meta,action);a.append(preview,body);card.append(a);gallery.append(card);
      if(onChoose)a.addEventListener('click',event=>{if(!isPlainLinkClick(event,a))return;event.preventDefault();history.pushState(null,'',`?field=${field.id}#explorer`);onChoose(field.id);document.querySelector('#explorer').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'auto':'smooth'});});
    }
  }
}
navigation();
if(document.querySelector('.hero-actions')&&createExplorationMemory().read().record){const resume=make('a','Resume exploration ↗','quiet-link');resume.href='./explore.html?resume=1#explorer';document.querySelector('.hero-actions').append(resume);}
if(document.querySelector('[data-gallery]')&&!document.querySelector('#explorer'))loadCatalog().then(c=>galleries(c)).catch(e=>{for(const g of document.querySelectorAll('[data-gallery]'))g.textContent=e.message;});
if(document.querySelector('#audit-json')){
  fetch('./data/bundle.json').then(r=>{if(!r.ok)throw Error('Recorded wavelength screen unavailable');return r.json();}).then(b=>{
    const text=spectralScreenCopy(b.manifest.suitability.checks.find(c=>c.code==='local_spectral_screen'));
    if(!text)throw Error('Recorded wavelength-screen measurements unavailable');
    document.querySelector('#spectral-screen-detail').textContent=text;
  }).catch(e=>{document.querySelector('#spectral-screen-detail').textContent=e.message;});
  loadProvenance().then(({audit,summary:s})=>{
    document.querySelector('#audit-json').textContent=JSON.stringify(audit,null,2);
    const summary=document.querySelector('#audit-summary');summary.replaceChildren();
    for(const [number,label]of [[s.files?`${s.files.passed} / ${s.files.total}`:'UNVERIFIED','Historical scientific file hashes'],[s.arrays?`${s.arrays.passed} / ${s.arrays.total}`:'UNVERIFIED','Historical reconstructed arrays · current bytes checked'],['PENDING','Qualified scientific approval']]){const d=make('div',undefined,'audit-stat');d.append(make('strong',number),make('span',label));summary.append(d);}
    document.querySelector('#audit-traceability').textContent=`Historical audit: ${s.date}. Source release: ${s.sourceRelease||'unverified'}. ${s.reason}`;
  }).catch(e=>{document.querySelector('#audit-summary').textContent='UNVERIFIED · '+e.message;document.querySelector('#audit-traceability').textContent='Historical audit unavailable. Qualified scientific approval remains PENDING.';});
  Promise.all(['./data/release-integrity.json','./version.json'].map(async url=>{const r=await fetch(url,{cache:'no-cache',signal:AbortSignal.timeout(5000)});if(!r.ok)throw Error('Release identity unavailable');return r.json();})).then(([receipt,runtime])=>{
    const applicable=receipt.content_id===runtime.content_id;
    document.querySelector('#release-traceability').textContent=`Website: ${runtime.release_id||'unavailable'} · content ${runtime.content_id||'unavailable'}. ${applicable?'Local build integrity recorded '+receipt.verified_at_utc+'.':'UNVERIFIED: no matching build integrity receipt.'} Deployment ID: ${runtime.deployment_id||'not supplied by this host'}. Historical scientific verification does not certify this website deployment.`;
  }).catch(()=>{document.querySelector('#release-traceability').textContent='Website release identity UNAVAILABLE. The historical scientific audit does not verify this deployment.';});
  fetch('./assets/assets.json').then(r=>r.json()).then(a=>{const list=Array.isArray(a)?a:a.assets;for(const asset of list){const row=make('article',undefined,'credit-card');const file=asset.file;const path=typeof file==='string'?file.split(/[\\/]/).pop():null;if(/\.(jpe?g|webp|png)$/i.test(path||'')){const img=make('img');img.src='./assets/'+path;img.alt=asset.alt||asset.title;row.append(img);}row.append(make('h3',asset.title||asset.id),make('p',asset.category.replaceAll('_',' ')),make('p',asset.credit));if(asset.caption)row.append(make('p',asset.caption));if(asset.interpretation_limits)row.append(make('p',asset.interpretation_limits.join(' ')));const link=make('a','Read the original source ↗');link.href=asset.source_page;link.target='_blank';link.rel='noopener noreferrer';row.append(link);document.querySelector('#imagery-credits').append(row);}}).catch(()=>{document.querySelector('#imagery-credits').textContent='Download the full image source record below for exact captions and credits.';});
}
