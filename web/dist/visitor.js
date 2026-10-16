import {help} from './field-guide.js';
import './workspace-bridge.js';

function el(tag,text,cls){const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;}
let dialog, heading, body, origin;
function ensureDialog(){
  if(dialog)return;
  dialog=el('dialog',undefined,'context-dialog');dialog.id='context-dialog';dialog.setAttribute('aria-labelledby','context-dialog-title');
  const top=el('div',undefined,'dialog-heading');heading=el('h2');heading.id='context-dialog-title';
  const close=el('button','×','icon-button');close.type='button';close.setAttribute('aria-label','Close information');close.onclick=()=>dialog.close();
  body=el('div',undefined,'context-dialog-body');top.append(heading,close);dialog.append(top,body);document.body.append(dialog);
  dialog.addEventListener('close',()=>origin?.focus());
}
export function explain(key,trigger){ensureDialog();const content=help[key];if(!content)return;origin=trigger;heading.textContent=content[0];body.replaceChildren(el('p',content[1]));dialog.showModal();}
export function showSources(observations,processing,trigger){
  ensureDialog();origin=trigger;heading.textContent='From the archive to this view';body.replaceChildren();
  body.append(el('p','These are calibrated SPHEREx observations from NASA/IPAC IRSA. The app verifies the supplied file identity before displaying it. A matching checksum establishes integrity, not scientific approval.'));
  const steps=el('ol',undefined,'source-journey');for(const t of ['NASA/IPAC archive: original calibrated exposure','Preparation: declared grid, quality masks and spectral calibration','Your browser: unchanged prepared values, shared display settings'])steps.append(el('li',t));body.append(steps);
  for(const o of observations){const section=el('section',undefined,'source-observation');section.append(el('h3',o.observation_id),el('p',o.time_start_utc+' UTC · '+o.release.toUpperCase()+' · detector '+o.detector));
    for(const [label,f]of [['Original calibrated FITS',o.source],['Spectral calibration',o.spectral_calibration]]){if(!f)continue;const link=el('a',label+' ↗');const url=new URL(f.source_url);if(url.protocol!=='https:')throw Error('Source links require HTTPS');link.href=url.href;link.target='_blank';link.rel='noreferrer';section.append(link);const detail=el('details'),summary=el('summary','File identity and SHA-256');detail.append(summary,el('code',f.path),el('code',f.sha256));section.append(detail);}body.append(section);}
  const detail=el('details'),summary=el('summary','Processing record');detail.append(summary,el('pre',JSON.stringify(processing,null,2)));body.append(detail);
  const a=el('a','Read the full provenance audit ↗');a.href='./methodology.html#audit';body.append(a);dialog.showModal();
}
document.addEventListener('click',event=>{const button=event.target.closest('[data-help]');if(button)explain(button.dataset.help,button);});

export function markStep(step){for(const e of document.querySelectorAll('[data-journey-step]')){const active=Number(e.dataset.journeyStep)===step;e.classList.toggle('current',active);if(active)e.setAttribute('aria-current','step');else e.removeAttribute('aria-current');}}
