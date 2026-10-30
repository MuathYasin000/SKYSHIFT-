import {createEvidenceDirectory,evidenceFile,writeEvidenceFile,claimEvidenceFile} from './evidence-output.mjs';
const evidenceRun=await createEvidenceDirectory('verify_challenge_readiness',process.env.SKYSHIFT_EVIDENCE_OUTPUT);
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {chromium} from 'file:///C:/Users/LOQ/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';

const base=process.env.SKYSHIFT_BASE||'http://localhost:3000', out=evidenceRun;

const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const results=[], errors=[];
async function check(name,fn){try{const detail=await fn();results.push({name,status:'pass',detail});console.log('PASS '+name);}catch(e){results.push({name,status:'fail',error:e.stack});console.log('FAIL '+name+': '+e.message);}}
async function context(options={}){
 const c=await browser.newContext({viewport:{width:1440,height:900},acceptDownloads:true,reducedMotion:'reduce',...options});
 c.on('page',p=>{p.setDefaultTimeout(15000);p.on('pageerror',e=>errors.push(e.message));});return c;
}
const ready=async p=>{await p.goto(base+'/#sky-search');await p.locator('#sky-search-targets button').last().waitFor();};
const submit=async(p,ra,dec)=>{await p.locator('#search-ra').fill(ra);await p.locator('#search-dec').fill(dec);await p.locator('#sky-search-options').evaluate(e=>e.open=true);await p.locator('#sky-search-check').click();};
try{
 await check('All five target requests preserve coordinates and expose verified field examples without detection claims',async()=>{
  const c=await context(),p=await c.newPage();await ready(p);
  const targets=JSON.parse(await fs.readFile('config/challenge_targets.json','utf8')).targets;
  for(const t of targets){
   await p.getByRole('button',{name:t.name,exact:true}).click();
   await p.waitForFunction(()=>document.querySelector('#sky-search-matches a')?.getAttribute('href')?.startsWith('#target-example/'));
   assert.equal(await p.locator('#sky-search-matches a').count(),1);
   assert.match(await p.locator('#sky-target-context').textContent(),/not established/);
   const download=p.waitForEvent('download');await p.locator('#sky-search-download').click();
   const file=await download;await file.saveAs(await claimEvidenceFile(evidenceFile(evidenceRun,out+'/'+t.id+'-request.json')));
   const r=JSON.parse(await fs.readFile(out+'/'+t.id+'-request.json','utf8'));
   assert.equal(r.kind,'skyshift-observation-request');assert.equal(r.release,'qr2');assert.equal(r.detector,2);assert.equal(r.region.size_deg,.2);
   assert.equal(new URL(await p.locator('#sky-search-share').getAttribute('href')).searchParams.get('ra'),String(r.region.ra_deg));
  }
  await c.close();return {targets:5,scientific_interpretation:'NOT_ESTABLISHED'};
 });
 await check('RA/Dec URL restores, validates malformed links, and opens the native no-WebGL viewer',async()=>{
  const c=await context(),p=await c.newPage();await ready(p);
  await submit(p,'210.80227','54.34895');
  await p.locator('#sky-search-matches a').waitFor();const url=p.url();await p.reload();
  await p.locator('#sky-search-matches a').waitFor();assert.equal(p.url(),url);assert.equal(await p.locator('#search-ra').inputValue(),'210.80227');
  await p.locator('#sky-search-matches a').click();
  await p.waitForFunction(()=>window.skyshiftWebsite?.diagnostics().investigation?.kind==='exposure'&&!skyshiftWebsite.diagnostics().investigation.busy);
  assert.equal(await p.locator('#instrument-save').isEnabled(),true);
  await p.goto(base+'/?ra=360&dec=0#sky-search');await p.waitForFunction(()=>document.querySelector('#sky-search-status').textContent.includes('Could not open'));
  assert.equal(await p.locator('#sky-search-actions').isVisible(),false);await c.close();
 });
 await check('Editing settings invalidates old results and Back restores the previous search',async()=>{
  const c=await context(),p=await c.newPage();await ready(p);
  await submit(p,'210.80227','54.34895');await p.locator('#sky-search-matches a').waitFor();
  await p.locator('#search-ra').fill('133');assert.equal(await p.locator('#sky-search-actions').isVisible(),false);assert.equal(await p.locator('#sky-search-matches a').count(),0);
  await submit(p,'133','-7');await p.waitForFunction(()=>document.querySelector('#sky-search-status').textContent.includes('No nearby'));
  await p.goBack();await p.locator('#sky-search-matches a').waitFor();assert.equal(await p.locator('#search-ra').inputValue(),'210.80227');await c.close();
 });
 await check('Catalogue failure retains search sharing and download; stale requests never overwrite edited inputs',async()=>{
  const c=await context(),p=await c.newPage();await c.route('**/data/explore-catalog.json',r=>r.fulfill({status:503,body:'injected failure'}));await ready(p);
  await submit(p,'1','2');await p.waitForFunction(()=>document.querySelector('#sky-search-status').textContent.includes('could not be checked'));
  assert.equal(await p.locator('#sky-search-download').isVisible(),true);assert.ok(await p.locator('#sky-search-archive').getAttribute('href'));await c.close();
  const d=await context(),q=await d.newPage();await ready(q);
  let release;const gate=new Promise(r=>release=r);
  await d.route('**/data/explore-catalog.json',async r=>{await gate;await r.continue();});
  await submit(q,'210.80227','54.34895');await q.locator('#search-ra').fill('999');release();
  await q.waitForTimeout(200);assert.equal(await q.locator('#sky-search-matches a').count(),0);assert.equal(await q.locator('#sky-search-actions').isVisible(),false);await d.close();
 });
 await check('Search works with WebGL disabled, keyboard controls, responsive layouts and accessibility',async()=>{
  const c=await context(),p=await c.newPage();await c.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return /webgl/i.test(type)?null:original.call(this,type,...args);};});
  await ready(p);await p.locator('#search-ra').fill('210.80227');await p.locator('#search-dec').fill('54.34895');await p.locator('#sky-search-options summary').click();await p.locator('#sky-search-check').press('Enter');await p.locator('#sky-search-matches a').waitFor();
  const widths=[320,390,768,1440];for(const width of widths){await p.setViewportSize({width,height:900});await p.locator('#sky-search').scrollIntoViewIfNeeded();
   assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Overflow at '+width);
   const bounds=await p.locator('#sky-search-form').boundingBox();assert.ok(bounds.width<=width);}
  await p.evaluate(await fs.readFile('tools/vendor/axe.min.js','utf8'));
  const a=await p.evaluate(async()=>{const r=await axe.run(document.querySelector('#sky-search'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}});return r.violations.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)}));});assert.deepEqual(a,[]);
  await p.setViewportSize({width:1440,height:1100});await p.locator('#sky-search').screenshot({path:await claimEvidenceFile(evidenceFile(evidenceRun,out+'/coordinate-search.png'))});await c.close();return {widths,accessibility_violations:a.length};
 });
}finally{await browser.close();await writeEvidenceFile(evidenceFile(evidenceRun,out+'/browser.json'),JSON.stringify({scope:'Automated engineering verification; no independent novice or qualified scientific review',results,page_errors:errors},null,2)+'\n');}
assert.deepEqual(errors,[]);assert.ok(results.every(r=>r.status==='pass'));
