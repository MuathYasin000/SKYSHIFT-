import {stories,availability,friendlyDate} from './field-guide.js';
import './workspace-bridge.js';
import {fetchCatalogue} from './catalogue.js';
import {createExplorationMemory} from './exploration-memory.js';
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
      img.src=obs.preview;img.alt=`Real single-band SPHEREx exposure of ${field.title}; excluded data shown in blue`;img.loading='lazy';
      preview.append(img,make('span','REAL SPHEREx EXPOSURE','preview-label'));
      const body=make('div',undefined,'field-card-body');
      body.append(make('span',status.label,'field-status'),make('div',story?.kind||'Curated sky region','field-kind'));
      body.append(make('h3',story?.name||field.title),make('p',story?.short||field.description));
      const meta=make('div',undefined,'field-meta');
      meta.append(make('span',friendlyDate(obs.time_start_utc)+' UTC'),make('span',field.observations.length+' curated '+(field.observations.length===1?'exposure':'exposures')));
      const action=make('div',status.action,'field-action');action.append(make('span','↗'));body.append(meta,action);a.append(preview,body);card.append(a);gallery.append(card);
      if(onChoose)a.addEventListener('click',event=>{event.preventDefault();history.pushState(null,'',`?field=${field.id}#explorer`);onChoose(field.id);document.querySelector('#explorer').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'auto':'smooth'});});
    }
  }
}
navigation();
if(document.querySelector('.hero-actions')&&createExplorationMemory().read().record){const resume=make('a','Resume exploration ↗','quiet-link');resume.href='./explore.html?resume=1#explorer';document.querySelector('.hero-actions').append(resume);}
if(document.querySelector('[data-gallery]')&&!document.querySelector('#explorer'))loadCatalog().then(c=>galleries(c)).catch(e=>{for(const g of document.querySelectorAll('[data-gallery]'))g.textContent=e.message;});
if(document.querySelector('#audit-json')){
  fetch('./data/provenance-audit.json').then(r=>{if(!r.ok)throw Error('Recorded audit unavailable');return r.json();}).then(a=>{document.querySelector('#audit-json').textContent=JSON.stringify(a,null,2);const summary=document.querySelector('#audit-summary');summary.replaceChildren();for(const [number,text]of [['4 / 4','Original cutout & calibration SHA-256 matches'],['10 / 10','Prepared browser arrays reproduced exactly'],['PENDING','Qualified scientific approval']]){const d=make('div',undefined,'audit-stat');d.append(make('strong',number),make('span',text));summary.append(d);}}).catch(e=>document.querySelector('#audit-summary').textContent=e.message);
  fetch('./assets/assets.json').then(r=>r.json()).then(a=>{const list=Array.isArray(a)?a:a.assets;for(const asset of list){const row=make('article',undefined,'credit-card');const file=asset.file;const path=typeof file==='string'?file.split(/[\\/]/).pop():null;if(path?.endsWith('.jpg')){const img=make('img');img.src='./assets/'+path;img.alt=asset.alt||asset.title;row.append(img);}row.append(make('h3',asset.title||asset.id),make('p',asset.category.replaceAll('_',' ')),make('p',asset.credit));if(asset.caption)row.append(make('p',asset.caption));if(asset.interpretation_limits)row.append(make('p',asset.interpretation_limits.join(' ')));const link=make('a','Read the original source ↗');link.href=asset.source_page;link.target='_blank';link.rel='noreferrer';row.append(link);document.querySelector('#imagery-credits').append(row);}}).catch(()=>{document.querySelector('#imagery-credits').textContent='Download the full image source record below for exact captions and credits.';});
}
