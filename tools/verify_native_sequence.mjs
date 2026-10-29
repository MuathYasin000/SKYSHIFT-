import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {chromium} from 'file:///C:/Users/LOQ/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
const out='docs/evidence/native-sequence-20261029';await fs.mkdir(out,{recursive:true});
const base='http://localhost:3000',results=[],errors=[];
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
async function page(options={}){const c=await browser.newContext({viewport:{width:1440,height:1000},acceptDownloads:true,...options});const p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));p.setDefaultTimeout(25000);return {c,p};}
const ready=p=>p.waitForFunction(()=>window.skyshiftWebsite?.diagnostics().investigation?.sequence&&!skyshiftWebsite.diagnostics().investigation.busy);
async function check(name,fn){try{const detail=await fn();results.push({name,status:'pass',detail});console.log('PASS '+name);}catch(e){results.push({name,status:'fail',error:e.stack});console.log('FAIL '+name+': '+e.message);}}
try {
 await check('Coordinate request prepares real images at requested width in the existing native viewer',async()=>{
  const {c,p}=await page();try {
   await p.goto(base+'/');await p.locator('.intro-actions a[href="#sky-search"]').click();
   await p.locator('#search-ra').fill('210.80227');await p.locator('#search-dec').fill('54.34895');await p.locator('#search-fov').fill('2.4');
   const start=Date.now();await p.locator('#sky-search-prepare').click();await ready(p);const elapsed=Date.now()-start;
   const d=await p.evaluate(()=>skyshiftWebsite.diagnostics());assert.equal(d.universe_loaded,false);assert.equal(d.investigation.sequence.frames,2);assert.equal(d.investigation.sequence.playback_eligible,true);
   assert.match(await p.locator('#instrument-subtitle').innerText(),/2.40′/);
   await p.locator('#instrument-sequence-next').click();assert.equal(await p.evaluate(()=>skyshiftWebsite.diagnostics().investigation.sequence.index),1);
   await p.locator('[data-sequence-mode=side_by_side]').click();assert.equal(await p.locator('#instrument-figure-b').isVisible(),true);
   await p.locator('[data-sequence-mode=wipe]').click();assert.equal(await p.locator('#instrument-wipe-handle').isVisible(),true);
   await p.locator('#instrument-wipe-handle').focus();await p.keyboard.press('ArrowRight');
   const url=p.url();await p.reload();await ready(p);assert.equal(p.url(),url);
   await p.locator('#instrument-sequence-play').click();await p.waitForFunction(()=>skyshiftWebsite.diagnostics().investigation.sequence_playing);await p.waitForTimeout(1700);await p.locator('#instrument-sequence-play').click();
   await p.locator('#instrument-about').click();assert.match(await p.locator('#instrument-information-body').innerText(),/Stationary-reference registration: pass/);await p.locator('#instrument-information-close').click();
   await p.screenshot({path:out+'/sequence.png'});return {url,frames:2,requested_width_arcmin:2.4,observed_load_ms:elapsed,conditions:'Isolated installed Chrome on this Windows machine; verified-original cache or a recent receipt; not an internet performance guarantee',prepared_response_bytes:await p.evaluate(()=>performance.getEntriesByType('resource').filter(e=>/\/api\/investigations\/.*\/result/.test(e.name)).map(e=>e.decodedBodySize))};
  }finally{await c.close();}
 });
 await check('Sequence note, viewport, epoch and display survive self-contained ZIP export/reopen',async()=>{
  const {c,p}=await page({reducedMotion:'reduce'});try {
   await p.goto(base+'/#sequence-example');await ready(p);
   await p.locator('#instrument-sequence-next').click();await p.locator('#instrument-zoom-in').click();
   const canvas=p.locator('#instrument-canvas-a');await canvas.focus();await p.keyboard.press('ArrowRight');await p.keyboard.press('Enter');
   await p.locator('#instrument-add').click();await p.locator('#instrument-question-text').fill('Possible positional change? Automated engineering note; not a discovery.');await p.locator('#instrument-question-save').click();
   const before=await p.evaluate(()=>skyshiftWebsite.diagnostics().investigation);
   await p.reload();await ready(p);const restored=await p.evaluate(()=>skyshiftWebsite.diagnostics().investigation);assert.deepEqual(restored.questions,before.questions);assert.deepEqual(restored.display,before.display);
   const d=p.waitForEvent('download');await p.locator('#instrument-save').click();await (await d).saveAs(out+'/investigation.zip');
   await p.goto(base+'/#observations/m101');await p.waitForFunction(()=>window.skyshiftWebsite?.diagnostics().investigation?.field==='m101'&&!skyshiftWebsite.diagnostics().investigation.busy);
   await p.setInputFiles('#instrument-file',out+'/investigation.zip');await ready(p);
   const after=await p.evaluate(()=>skyshiftWebsite.diagnostics().investigation);
   assert.deepEqual(after.questions,before.questions);assert.deepEqual(after.display,before.display);assert.deepEqual(after.visual,before.visual);assert.deepEqual(after.sequence,before.sequence);
  }finally{await c.close();}
 });
 await check('Verified cached sequence works without the preparation API or WebGL and respects reduced motion',async()=>{
  const {c,p}=await page({reducedMotion:'reduce'});try {
   await c.route('**/api/**',r=>r.fulfill({status:503,body:'injected unavailable API'}));
   await c.addInitScript(()=>{const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(t,...a){return /webgl/i.test(t)?null:get.call(this,t,...a);};});
   await p.goto(base+'/#sequence-example');await ready(p);assert.equal(await p.locator('#instrument-sequence-play').isEnabled(),false);await p.locator('#instrument-sequence-next').click();assert.equal(await p.evaluate(()=>skyshiftWebsite.diagnostics().investigation.sequence.index),1);
  }finally{await c.close();}
 });
 await check('Sequence and homepage exploration action remain usable at narrow widths',async()=>{
  const {c,p}=await page({reducedMotion:'reduce'});try {
   for(const width of [320,390,768,1440]) {
    await p.setViewportSize({width,height:900});await p.goto(base+'/');await p.waitForFunction(()=>document.body.dataset.controller==='ready');
    assert.equal(await p.locator('#hero-sky-form').count(),0);
    const b=await p.locator('.intro-actions .primary-link').boundingBox();assert.ok(b.y>=0&&b.y+b.height<=900,'Primary exploration action offscreen at '+width);
    assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    await p.goto(base+'/#sequence-example');await ready(p);assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Sequence overflow at '+width);
   }
   await p.evaluate(await fs.readFile('tools/vendor/axe.min.js','utf8'));
   const violations=await p.evaluate(async()=>{const r=await axe.run(document.querySelector('#space-workspace'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}});return r.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}));});assert.deepEqual(violations,[]);
  }finally{await c.close();}
 });
 await check('All five required target fields open real cached frames and retain disabled playback',async()=>{
  const {c,p}=await page({reducedMotion:'reduce'});try {
   const status=JSON.parse(await fs.readFile('web/dist/data/target-status.json','utf8'));
   for(const t of status.targets){const bundle=JSON.parse(await fs.readFile('web/dist/'+t.url.slice(2),'utf8'));await p.goto(base+'/#target-example/'+t.id);await p.waitForFunction(id=>window.skyshiftWebsite?.diagnostics().investigation?.sequence?.id===id&&!skyshiftWebsite.diagnostics().investigation.busy,bundle.sequence_id);const d=await p.evaluate(()=>skyshiftWebsite.diagnostics().investigation);assert.equal(d.sequence.frames,t.prepared_frames);assert.equal(d.sequence.playback_eligible,false);assert.equal(await p.locator('#instrument-sequence-play').isEnabled(),false);assert.match(await p.locator('#instrument-subtitle').innerText(),/12.00′/);}
   return {prepared_frame_counts:status.targets.map(t=>({id:t.id,count:t.prepared_frames})),target_detection:'NOT_ESTABLISHED'};
  }finally{await c.close();}
 });
 await check('Cancelled preparation cannot replace the current view with a late response',async()=>{
  const {c,p}=await page({reducedMotion:'reduce'});let release;const gate=new Promise(r=>release=r);let cancelled=0;const id='a'.repeat(32);try {
   await c.route('**/api/capabilities',r=>r.fulfill({json:{preparation:true}}));
   await c.route('**/api/investigations',r=>r.fulfill({status:202,json:{id,state:'running',message:'Waiting injected archive response'}}));
   await c.route('**/api/investigations/'+id,async r=>{await gate;await r.fulfill({json:{id,state:'failed',message:'Injected late response'}}).catch(()=>{});});
   await c.route('**/api/investigations/'+id+'/cancel',r=>{cancelled++;return r.fulfill({json:{id,state:'cancelled'}});});
   await p.goto(base+'/#sky-search');await p.locator('#search-ra').fill('1');await p.locator('#search-dec').fill('2');await p.locator('#sky-search-prepare').click();
   await p.waitForFunction(()=>document.querySelector('#sky-search-status').textContent.includes('Waiting injected'));
   await p.locator('#sky-search-cancel').click();release();await p.waitForTimeout(200);assert.equal(cancelled,1);assert.match(await p.locator('#sky-search-status').innerText(),/cancelled/);assert.equal(await p.locator('#home-view').isVisible(),true);
  }finally{release();await c.close();}
 });
 await check('Changing the requested width prepares a different real grid and exposes predicted Gaia references',async()=>{
  const {c,p}=await page({reducedMotion:'reduce'});try {
   await p.goto(base+'/#sky-search');await p.locator('#search-ra').fill('210.80227');await p.locator('#search-dec').fill('54.34895');await p.locator('#search-fov').fill('1.8');await p.locator('#sky-search-prepare').click();await ready(p);
   assert.match(await p.locator('#instrument-subtitle').innerText(),/1.80′ · 18 × 18/);
   const button=p.locator('#instrument-reference-overlay');assert.equal(await button.isVisible(),true);await button.click();assert.equal(await button.getAttribute('aria-pressed'),'true');assert.match(await button.getAttribute('title'),/predictions, not SPHEREx detections/);
  }finally{await c.close();}
 });
}finally{await browser.close();await fs.writeFile(out+'/browser.json',JSON.stringify({results,page_errors:errors,scientific_approval:'PENDING'},null,2)+'\n');}
assert.deepEqual(errors,[]);assert.ok(results.every(r=>r.status==='pass'));
