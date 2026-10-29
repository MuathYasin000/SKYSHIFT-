import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {chromium} from 'file:///C:/Users/LOQ/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
const out=process.env.SKYSHIFT_COMPLETION_OUTPUT||'docs/evidence/completion-20261030/browser';
await fs.mkdir(out); // Refuse to overwrite earlier evidence.
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const results=[],errors=[];
const ready=p=>p.waitForFunction(()=>window.skyshiftWebsite?.diagnostics().investigation?.sequence&&!skyshiftWebsite.diagnostics().investigation.busy,{timeout:45000});
try {
 for(const width of [1440,390]) {
  const context=await browser.newContext({viewport:{width,height:900},acceptDownloads:true});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/api/**',r=>r.fulfill({status:503,body:'Injected unavailable preparation service'}));
  await page.goto('http://localhost:3000/#target-example/comet-december');await ready(page);
  assert.equal(await page.locator('#instrument-sequence-play').isDisabled(),true);
  assert.match(await page.locator('#instrument-sequence-quality').innerText(),/Wavelengths differ/);
  const before=await page.evaluate(()=>skyshiftWebsite.diagnostics().investigation.sequence.index);
  await page.click('#instrument-sequence-next');
  assert.notEqual(await page.evaluate(()=>skyshiftWebsite.diagnostics().investigation.sequence.index),before);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  if(width===1440) {
   const download=page.waitForEvent('download');await page.click('#instrument-save');
   await (await download).saveAs(out+'/comet-investigation.zip');
   await page.goto('http://localhost:3000/#observations/m101');
   await page.waitForFunction(()=>window.skyshiftWebsite?.diagnostics().investigation?.field==='m101'&&!skyshiftWebsite.diagnostics().investigation.busy);
   await page.setInputFiles('#instrument-file',out+'/comet-investigation.zip');await ready(page);
   assert.equal(await page.locator('#instrument-sequence-play').isDisabled(),true);
  }
  await page.screenshot({path:out+`/comet-${width}.png`});
  results.push({name:`Real comet independent inspection and spectral rejection at ${width}px with API unavailable`,status:'pass'});
  await context.close();
 }
 const context=await browser.newContext();const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://localhost:3000/#sky-search');
 const started=Date.now();
 const job=await page.evaluate(async()=>{
  const response=await fetch('/api/investigations',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({schema_version:'1.0',kind:'skyshift-observation-request',release:'qr2',region:{ra_deg:210.80227,dec_deg:54.34895,size_deg:.04},max_frames:2})});
  if(!response.ok)throw Error(await response.text());return response.json();
 });
 for(let i=0;i<180;i++) {
  const state=await page.evaluate(async id=>(await fetch('/api/investigations/'+id)).json(),job.id);
  if(state.state==='complete')break;
  if(['failed','cancelled'].includes(state.state))throw Error(state.message);
  await page.waitForTimeout(500);
  if(i===179)throw Error('Preparation did not complete within the audit bound');
 }
 await page.goto('http://localhost:3000/#investigation/'+job.id);await ready(page);
 assert.equal(await page.locator('#instrument-sequence-play').isDisabled(),false);
 results.push({name:'Restarted preparation backend completes original-cache request and native viewer entry',status:'pass',elapsed_ms:Date.now()-started,scope:'Local Windows test, not external hosting verification'});
 await context.close();
 assert.deepEqual(errors,[]);
} finally {
 await browser.close();
 await fs.writeFile(out+'/results.json',JSON.stringify({results,page_errors:errors,scientific_approval:'PENDING',known_comet_motion:'NOT ESTABLISHED'},null,2));
}
console.log(JSON.stringify(results));
