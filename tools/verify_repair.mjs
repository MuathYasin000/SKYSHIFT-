import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {chromium} from 'file:///C:/Users/LOQ/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import {createInvestigation} from '../web/dist/investigation.js';
import {pixelToSky,sha256} from '../web/dist/science.js';
import {REVIEW_ARCHIVE_SHA256} from '../web/dist/review-download.js';
import {unzipSync,strFromU8,zipSync,strToU8} from '../web/dist/vendor/fflate.js';
const out='docs/evidence/repair-20261018',base=process.env.SKYSHIFT_BASE||'http://localhost:3000',results=[],errors=[];
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
async function context(options={}){const c=await browser.newContext({viewport:{width:1440,height:900},acceptDownloads:true,reducedMotion:'reduce',...options});c.on('page',p=>{p.setDefaultTimeout(12000);p.on('pageerror',e=>errors.push({url:p.url(),error:e.message}));});return c;}
async function check(name,fn){try{const detail=await fn();results.push({name,status:'pass',detail});console.log('PASS '+name);}catch(e){results.push({name,status:'fail',error:e.stack});console.log('FAIL '+name+': '+e.message);}}
const native=p=>p.waitForFunction(()=>window.skyshiftWebsite?.diagnostics().investigation?.kind&&!skyshiftWebsite.diagnostics().investigation.busy);
const standalone=p=>p.locator('#workspace:not([hidden])').waitFor();
const exposure=p=>p.locator('#explorer[aria-busy=false]').waitFor();
async function save(p,selector,name){const d=p.waitForEvent('download');await p.locator(selector).click();const file=out+'/'+name;await(await d).saveAs(file);return new Uint8Array(await fs.readFile(file));}
const unpack=bytes=>Object.fromEntries(Object.entries(unzipSync(bytes)).filter(([k])=>['manifest.json','visualization.json','annotations.json','prepared/pair.fits'].includes(k)).map(([k,v])=>[k,k.endsWith('.json')?JSON.parse(strFromU8(v)):Buffer.from(v).toString('base64')]));
const local=async url=>new Response(await fs.readFile(new URL(url,new URL('../web/dist/',import.meta.url))));
const engine=createInvestigation({fetcher:local}),pair=await engine.compare();
Object.assign(pair.display,{zoom:3,center_x:10.25,center_y:12.75,selected_epoch:'B',vmin:.5,vmax:11,stretch:'linear',view_mode:'single'});
Object.assign(pair.visual,{palette:'ember',interpolation:'smooth',stretch:'log',wipe:true,wipe_position:67});
let i=pair.arrays.COMMON.findIndex(Boolean),sky=pixelToSky(i%pair.shape[1],Math.floor(i/pair.shape[1]),pair.wcs);
engine.updateQuestions([{annotation_id:'repair-test-question',pair_id:pair.key,frame:'icrs',...sky,category:'uncertain',note:'Automated round-trip question. No discovery claimed.',created_at:'2026-10-18T00:00:00.000Z'}]);
const pairSeed=await engine.save();await fs.writeFile(out+'/pair-seed.zip',pairSeed.bytes);
const ex=await engine.select('m101',1);i=ex.arrays.VALID.findIndex(Boolean);sky=pixelToSky(i%ex.shape[1],Math.floor(i/ex.shape[1]),ex.wcs);
Object.assign(ex.display,{zoom:2.5,center_x:83.25,center_y:97.75});Object.assign(ex.visual,{palette:'ember',interpolation:'smooth',stretch:'log'});ex.contrast=1.3;
engine.updateQuestions([{id:'22222222-2222-4222-8222-222222222222',product_sha256:ex.key,frame:'icrs',...sky,question:'Automated exposure question. No variability claimed.',created_at:'2026-10-18T00:00:00.000Z'}]);
const exSeed=await engine.save();await fs.writeFile(out+'/exposure-seed.json',exSeed.bytes);
try{
 await check('ZIP: standalone export → integrated import/reload/export → standalone import, preserving all scientific identities and settings',async()=>{
  const c=await context(),p=await c.newPage();await p.goto(base+'/compare.html');await standalone(p);
  await p.setInputFiles('#import-file',out+'/pair-seed.zip');await p.waitForFunction(()=>document.querySelector('#note-count').textContent==='1');
  const a=await save(p,'#export','standalone-pair.zip');assert.deepEqual(unpack(a),unpack(pairSeed.bytes));
  await p.goto(base+'/#compare');await native(p);await p.setInputFiles('#instrument-file',out+'/standalone-pair.zip');await p.waitForFunction(()=>skyshiftWebsite.diagnostics().investigation.questions.length===1);
  const before=await p.evaluate(()=>skyshiftWebsite.diagnostics().investigation);await p.reload();await native(p);const after=await p.evaluate(()=>skyshiftWebsite.diagnostics().investigation);
  for(const key of ['display','visual','questions','key'])assert.deepEqual(after[key],before[key]);
  const b=await save(p,'#instrument-save','integrated-pair.zip');assert.deepEqual(unpack(b),unpack(a));
  await p.goto(base+'/compare.html');await standalone(p);await p.setInputFiles('#import-file',out+'/integrated-pair.zip');await p.waitForFunction(()=>document.querySelector('#note-count').textContent==='1');await p.reload();await standalone(p);
  const d=await save(p,'#export','reloaded-standalone-pair.zip');assert.deepEqual(unpack(d),unpack(b));
  await p.screenshot({path:out+'/after-standalone-comparison.png'});await c.close();return {directions:2,reloads:2,fields:['FITS/masks','observations/dates','source hashes','WCS/region','display/zoom/pan','visualization/wipe','questions','attribution']};
 });
 await check('JSON: integrated ↔ standalone exposure with nondefault visualization, date, viewport, questions and reload',async()=>{
  const c=await context(),p=await c.newPage();await p.goto(base+'/#observations/m101');await native(p);await p.setInputFiles('#instrument-file',out+'/exposure-seed.json');await p.waitForFunction(()=>skyshiftWebsite.diagnostics().investigation.questions.length===1);
  const a=await save(p,'#instrument-save','integrated-exposure.json');assert.deepEqual(JSON.parse(strFromU8(a)),JSON.parse(strFromU8(exSeed.bytes)));
  await p.goto(base+'/explore.html');await exposure(p);await p.setInputFiles('#import-context-file',out+'/integrated-exposure.json');await p.waitForFunction(()=>document.querySelector('#exposure-question-count').textContent==='1');
  const b=await save(p,'#export-context','standalone-exposure.json');assert.deepEqual(JSON.parse(strFromU8(b)),JSON.parse(strFromU8(a)));
  await p.reload();await exposure(p);const d=await save(p,'#export-context','reloaded-exposure.json');assert.deepEqual(JSON.parse(strFromU8(d)),JSON.parse(strFromU8(a)));
  await p.goto(base+'/#observations/m101');await native(p);await p.setInputFiles('#instrument-file',out+'/standalone-exposure.json');await p.waitForFunction(()=>skyshiftWebsite.diagnostics().investigation.questions.length===1);const final=await save(p,'#instrument-save','roundtrip-exposure.json');assert.deepEqual(JSON.parse(strFromU8(final)),JSON.parse(strFromU8(a)));
  await c.close();return {directions:2,reloads:1};
 });
 await check('Malformed and mismatched imports preserve the active investigation in both viewers',async()=>{
  const c=await context(),p=await c.newPage();await p.goto(base+'/#compare');await native(p);await p.setInputFiles('#instrument-file',out+'/pair-seed.zip');await p.waitForFunction(()=>skyshiftWebsite.diagnostics().investigation.questions.length===1);
  const before=await p.evaluate(()=>skyshiftWebsite.diagnostics().investigation);await p.setInputFiles('#instrument-file',{name:'broken.zip',mimeType:'application/zip',buffer:Buffer.from('bad')});await p.locator('#instrument-status.status-error').waitFor();assert.deepEqual((await p.evaluate(()=>skyshiftWebsite.diagnostics().investigation)).display,before.display);
  await p.goto(base+'/compare.html');await standalone(p);await p.setInputFiles('#import-file',out+'/pair-seed.zip');await p.waitForFunction(()=>document.querySelector('#note-count').textContent==='1');
  const bad=unzipSync(pairSeed.bytes);bad['prepared/pair.fits'][100]^=1;await p.setInputFiles('#import-file',{name:'wrong.zip',mimeType:'application/zip',buffer:Buffer.from(zipSync(bad))});await p.waitForFunction(()=>document.querySelector('#toast').textContent.includes('checksum'));
  const kept=await save(p,'#export','after-rejected-pair.zip');assert.deepEqual(unpack(kept),unpack(pairSeed.bytes));
  await p.goto(base+'/explore.html');await exposure(p);await p.setInputFiles('#import-context-file',out+'/exposure-seed.json');await p.waitForFunction(()=>document.querySelector('#exposure-question-count').textContent==='1');
  const forged=JSON.parse(strFromU8(exSeed.bytes));forged.observation.source.sha256='0'.repeat(64);await p.setInputFiles('#import-context-file',{name:'forged.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(forged))});await p.waitForFunction(()=>document.querySelector('#view-record-feedback').textContent.includes('Could not open'));
  assert.deepEqual(JSON.parse(strFromU8(await save(p,'#export-context','after-rejected-exposure.json'))),JSON.parse(strFromU8(exSeed.bytes)));await c.close();
 });
 await check('Methodology renders applicable historical counts and separate current-build identity; missing evidence fails honestly',async()=>{
  const c=await context(),p=await c.newPage();await p.goto(base+'/methodology.html');await p.waitForFunction(()=>document.querySelector('#audit-summary').textContent.includes('10 / 10'));
  assert.match(await p.locator('#audit-traceability').innerText(),/2026-10-16/);await p.waitForFunction(()=>document.querySelector('#release-traceability').textContent.includes('content'));await p.screenshot({path:out+'/after-methodology.png',fullPage:true});
  await c.route('**/provenance-audit.json',r=>r.fulfill({status:404,body:'missing'}));await p.reload();await p.waitForFunction(()=>document.querySelector('#audit-summary').textContent.includes('UNVERIFIED'));assert.doesNotMatch(await p.locator('#audit-summary').innerText(),/4 \/ 4|10 \/ 10/);await c.close();
 });
 await check('Review download UI: cancel, recover a 503 without re-fetching verified parts, and verify the complete archive',async()=>{
  const c=await context(),p=await c.newPage(),counts={};let fail=true,paused=true;
  await c.route('**/review-part-*.bin',async r=>{const name=new URL(r.request().url()).pathname.split('/').pop();counts[name]=(counts[name]||0)+1;if(name==='review-part-1.bin'&&paused){paused=false;await new Promise(resolve=>setTimeout(resolve,500));}if(name==='review-part-2.bin'&&fail){fail=false;return r.fulfill({status:503,body:'injected retry'});}return r.continue();});
  await p.goto(base+'/#compare');await native(p);await p.locator('#instrument-about').click();await p.locator('#instrument-review-download').click();await p.locator('#instrument-information').getByRole('button',{name:'Cancel download'}).click();await p.waitForFunction(()=>document.querySelector('#instrument-information-body').textContent.includes('canceled'));
  await p.locator('#instrument-review-download').click();await p.waitForFunction(()=>document.querySelector('#instrument-information-body').textContent.includes('(503)'));
  const completed0=counts['review-part-0.bin'],completed1=counts['review-part-1.bin'];const d=p.waitForEvent('download');await p.locator('#instrument-review-download').click();const file=await d;assert.equal(await sha256(new Uint8Array(await fs.readFile(await file.path()))),REVIEW_ARCHIVE_SHA256);assert.equal(counts['review-part-0.bin'],completed0);assert.equal(counts['review-part-1.bin'],completed1);
  assert.match(await p.locator('#instrument-information-body').innerText(),/final archive SHA-256 verified/);
  await p.locator('#instrument-information-close').click();await p.locator('#instrument-about').click();const reopened=p.waitForEvent('download');await p.locator('#instrument-review-download').click();await reopened;assert.equal(counts['review-part-0.bin'],completed0);
  await c.close();return {counts,archive_sha256:REVIEW_ARCHIVE_SHA256,temporary_downloads_removed_on_context_close:true};
 });
 await check('Standalone review control, slow-network scientific access, and timeout recovery',async()=>{
  const c=await context(),p=await c.newPage();await p.goto(base+'/compare.html');await standalone(p);const d=p.waitForEvent('download');await p.locator('#review-download').click();const file=await d;assert.equal(await sha256(new Uint8Array(await fs.readFile(await file.path()))),REVIEW_ARCHIVE_SHA256);await c.close();
  const slow=await context(),q=await slow.newPage(),cdp=await slow.newCDPSession(q);await cdp.send('Network.enable');await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:120,downloadThroughput:192000,uploadThroughput:32000});await q.goto(base+'/#compare');await native(q);assert.ok(await q.locator('#instrument-save').isEnabled());assert.equal(await q.locator('#universe-view canvas').count(),0);await slow.close();
  const timeout=await context(),r=await timeout.newPage();await timeout.route('**/data/explore/m42-*.json',()=>{});await r.goto(base+'/#observations/m42');await r.locator('#instrument-status.status-error').waitFor({timeout:16000});assert.equal(await r.locator('#instrument-save').isEnabled(),false);assert.ok(await r.locator('#instrument-retry').isVisible());await timeout.close();
 });
 const routes=['/','/#observations/m101','/#compare','/#universe','/discover.html','/explore.html','/compare.html','/methodology.html','/guide.html','/classic-home.html'];
 await check('All primary routes at 320, 360, 390, 430, 768, 1024 and 1440 CSS pixels',async()=>{
  const c=await context(),p=await c.newPage(),geometry=[];
  for(const route of routes){await p.goto(base+route);if(route.includes('#compare')||route.includes('#observations'))await native(p);else if(route.includes('#universe'))await p.waitForFunction(()=>window.skyshiftSpace?.diagnostics().frames>0);else if(route==='/explore.html')await exposure(p);else if(route==='/compare.html')await standalone(p);else if(route==='/')await p.waitForFunction(()=>document.body.dataset.controller==='ready');
   await p.evaluate(()=>document.fonts.ready);
   for(const width of [320,360,390,430,768,1024,1440]){await p.setViewportSize({width,height:900});await p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
    const g=await p.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,offenders:[...document.querySelectorAll('body *')].filter(e=>e.getClientRects().length&&e.getBoundingClientRect().right>innerWidth+1).slice(0,8).map(e=>({tag:e.tagName,id:e.id,cls:e.className,right:e.getBoundingClientRect().right}))}));geometry.push({route,...g});
    if(g.scroll>width+1)await p.screenshot({path:out+'/overflow-'+route.replace(/[^a-z]/gi,'')+'-'+width+'.png'});
    if([320,390,1440].includes(width))await p.screenshot({path:out+'/layout-'+route.replace(/[^a-z]/gi,'')+'-'+width+'.png'});
   }
  }
  await fs.writeFile(out+'/responsive.json',JSON.stringify(geometry,null,2));await c.close();assert.deepEqual(geometry.filter(g=>g.scroll>g.width+1),[]);return {routes:routes.length,widths:7,checks:geometry.length};
 });
 await check('Browser accessibility scans on rendered primary routes and keyboard menus/dialogs',async()=>{
  const c=await context(),p=await c.newPage(),reports=[];
  for(const route of routes){await p.goto(base+route);if(route==='/')await p.waitForFunction(()=>document.body.dataset.controller==='ready');if(route.includes('#compare')||route.includes('#observations'))await native(p);if(route.includes('#universe'))await p.waitForFunction(()=>window.skyshiftSpace?.diagnostics().frames>0);
   await p.evaluate(await fs.readFile('tools/vendor/axe.min.js','utf8'));const report=await p.evaluate(async()=>{const r=await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}});return {violations:r.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))})),incomplete:r.incomplete.length};});reports.push({route,...report});
  }
  await fs.writeFile(out+'/accessibility.json',JSON.stringify(reports,null,2));
  await p.goto(base+'/');await p.setViewportSize({width:390,height:844});await p.waitForFunction(()=>document.body.dataset.controller==='ready');await p.locator('#site-menu-toggle').focus();await p.keyboard.press('Enter');assert.equal(await p.locator('#site-menu-toggle').getAttribute('aria-expanded'),'true');await p.keyboard.press('Escape');assert.equal(await p.locator('#site-menu-toggle').evaluate(e=>e===document.activeElement),true);
  await p.goto(base+'/compare.html');await standalone(p);await p.locator('#comparison-source').click();await p.keyboard.press('Escape');assert.equal(await p.locator('#comparison-source').evaluate(e=>e===document.activeElement),true);
  await c.close();assert.deepEqual(reports.filter(r=>r.violations.length),[]);return {scans:reports.length,keyboard:'mobile menu enter/escape and dialog focus return'};
 });
 await check('200%/400% desktop zoom equivalent reflow and touch pinch keep scientific controls usable',async()=>{
  const c=await context({viewport:{width:360,height:800},isMobile:true,hasTouch:true}),p=await c.newPage();await p.goto(base+'/#compare');await native(p);
  for(const width of [720,360]){await p.setViewportSize({width,height:900});assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await p.locator('#instrument-zoom-in').click();await p.locator('#instrument-save').scrollIntoViewIfNeeded();assert.ok(await p.locator('#instrument-save').isVisible());}
  await p.locator('[data-compare=single]').click();const cdp=await c.newCDPSession(p);await p.locator('#instrument-canvas-a').scrollIntoViewIfNeeded();const r=await p.locator('#instrument-canvas-a').boundingBox(),before=await p.evaluate(()=>skyshiftWebsite.diagnostics().investigation.display.zoom);
  const x=r.x+r.width/2,y=Math.max(100,Math.min(700,r.y+r.height/2));await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:x-20,y,id:1},{x:x+20,y,id:2}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x-40,y,id:1},{x:x+40,y,id:2}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await p.evaluate(()=>new Promise(r=>requestAnimationFrame(r)));const after=await p.evaluate(()=>skyshiftWebsite.diagnostics().investigation.display.zoom);assert.ok(after>before);await c.close();return {zoomReflow:'Equivalent 1440px desktop at 200%/400% (720/360 CSS px); no physical browser toolbar zoom certification',touchZoomBefore:before,touchZoomAfter:after};
 });
 await check('Hero starts while scientific controller is delayed; direct science remains WebGL independent',async()=>{
  const c=await context(),p=await c.newPage();let release;const gate=new Promise(r=>release=r);await c.route('**/website.js',async r=>{await gate;await r.continue();});await p.goto(base+'/',{waitUntil:'domcontentloaded'});await p.waitForFunction(()=>window.skyshiftHero?.diagnostics().model?.frames>0);assert.equal(await p.locator('body').getAttribute('data-controller'),'starting');release();await p.waitForFunction(()=>document.body.dataset.controller==='ready');await c.close();
  const no=await context();await no.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return type.startsWith('webgl')?null:original.call(this,type,...args);};});const q=await no.newPage();await q.goto(base+'/#compare');await native(q);assert.ok(await q.locator('#instrument-save').isEnabled());await save(q,'#instrument-save','no-webgl.zip');await no.close();
 });
 await check('Repeated Universe visits reuse bounded graphics resources and preserve the scientific canvas',async()=>{
  const c=await context(),p=await c.newPage();await p.goto(base+'/#compare');await native(p);await p.evaluate(()=>window.originalScienceCanvas=document.querySelector('#instrument-canvas-a'));const memory=[];
  for(let visit=0;visit<5;visit++){await p.evaluate(()=>location.hash='universe');await p.waitForFunction(()=>skyshiftWebsite.diagnostics().surface==='universe'&&window.skyshiftSpace?.diagnostics().frames>0);memory.push(await p.evaluate(()=>skyshiftSpace.diagnostics().memory));await p.evaluate(()=>location.hash='compare');await native(p);assert.ok(await p.evaluate(()=>document.querySelector('#instrument-canvas-a')===originalScienceCanvas));}
  assert.deepEqual(memory.at(-1),memory[1]);await c.close();return {visits:5,gpuResources:memory,scope:'Renderer resource counters; not a proof of absence of all browser/GPU leaks'};
 });
 assert.deepEqual(errors,[]);
}finally{await fs.writeFile(out+'/browser-results.json',JSON.stringify({results,errors,scientific_approval:'PENDING',independent_novice_validation:'NOT CONDUCTED'},null,2));await browser.close();}
if(results.some(r=>r.status==='fail')||errors.length)process.exitCode=1;
