// Targeted localhost QA for saved single-exposure views. No recording or media generation.
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),require=createRequire(import.meta.url);
const {chromium}=await import(pathToFileURL(process.env.SKYSHIFT_PLAYWRIGHT_MODULE||require.resolve('playwright')).href);
const out=root+'/tmp/exposure-workflow';await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,...(process.env.SKYSHIFT_CHROMIUM_EXECUTABLE?{executablePath:process.env.SKYSHIFT_CHROMIUM_EXECUTABLE}:{})});
const base=process.argv[2]||'http://localhost:3000',results=[],external=[],errors=[];
const catalog=JSON.parse(await fs.readFile(root+'/web/dist/data/explore-catalog.json','utf8'));
const file=(name,value)=>({name,mimeType:'application/json',buffer:Buffer.from(JSON.stringify(value))});
async function check(name,fn){try{const detail=await fn();results.push({name,status:'pass',...(detail?{detail}:{})});console.log('PASS '+name);}catch(e){results.push({name,status:'fail',error:e.message});throw e;}}
async function context(width=1440,height=1000){const c=await browser.newContext({viewport:{width,height},acceptDownloads:true});await c.route('**/*',r=>{if(!['localhost','127.0.0.1'].includes(new URL(r.request().url()).hostname)){external.push(r.request().url());return r.abort();}return r.continue();});c.on('page',p=>p.on('pageerror',e=>errors.push(e.message)));return c;}
async function ready(p){await p.locator('#explorer[aria-busy=false]').waitFor();assert.equal(await p.locator('#context-source').isEnabled(),true);}
async function save(p,name){const d=p.waitForEvent('download');await p.locator('#export-context').click();const download=await d;const target=out+'/'+name;await download.saveAs(target);return JSON.parse(await fs.readFile(target,'utf8'));}
async function importView(p,value,name='saved-view.json'){await p.locator('#import-context-file').setInputFiles(file(name,value));await p.waitForFunction(()=>!document.querySelector('#open-context').disabled);}
let c,p,saved;
try{
  c=await context();p=await c.newPage();const requests=[];p.on('request',r=>{if(r.url().includes('/data/explore/')&&r.url().endsWith('.json'))requests.push(r.url());});
  await check('Existing Explore view saves and reopens its selected date, sky position and appearance',async()=>{
    await p.goto(base+'/explore.html');await ready(p);const date=p.getByRole('button',{name:'View single exposure 11 Dec 2025',exact:true});await date.click();await ready(p);
    assert.equal(await date.evaluate(e=>document.activeElement===e),true,'Date-button focus was lost during loading');
    await p.locator('#explore-options summary').click();await p.locator('#explore-palette').selectOption('ember');await p.locator('#explore-stretch').selectOption('log');await p.locator('#explore-interpolation').selectOption('nearest');await p.locator('#explore-contrast').fill('1.35');await p.locator('#explore-plus').click();await p.locator('#explore-canvas').focus();await p.keyboard.press('ArrowLeft');await p.keyboard.press('ArrowUp');
    saved=await save(p,'saved.json');await p.locator('[data-field=m67]').click();await ready(p);await importView(p,saved);await ready(p);
    assert.match(await p.locator('#view-record-feedback').innerText(),/restored/);assert.match(await p.locator('#exposure-summary').innerText(),/11 Dec 2025/);
    const restored=await save(p,'restored.json');assert.deepEqual(restored.viewport,saved.viewport);assert.deepEqual(restored.visualization,saved.visualization);assert.ok(Math.abs(restored.display.vmax-saved.display.vmax)<1e-12);assert.deepEqual(restored.array_hashes,saved.array_hashes);assert.equal(restored.product_sha256,saved.product_sha256);assert.equal(restored.field,'m101');
  });
  await check('Repeated dates and saved views reuse the bounded verified exposure cache',async()=>{
    const count=requests.length;await p.getByRole('button',{name:'View single exposure 7 Dec 2025',exact:true}).click();await ready(p);await p.getByRole('button',{name:'View single exposure 11 Dec 2025',exact:true}).click();await ready(p);await importView(p,saved);assert.equal(requests.length,count);assert.equal(new Set(requests).size,3);
  });
  await check('Forged metadata, remote source, approval and malformed imports preserve the current view',async()=>{
    const before=await save(p,'before-bad.json'),count=requests.length;
    for(const bad of [{...saved,product_url:'https://example.com/payload'},{...saved,scientific_approval:'APPROVED'},{...saved,observation:{...saved.observation,pipeline_version:'forged'}},{...saved,viewport:{...saved.viewport,zoom:99}},{...saved,visualization:{...saved.visualization,wipe:true}}]){
      await importView(p,bad);assert.match(await p.locator('#view-record-feedback').innerText(),/Could not open/);assert.deepEqual(await save(p,'after-bad.json'),before);
    }
    await p.locator('#import-context-file').setInputFiles({name:'broken.json',mimeType:'application/json',buffer:Buffer.from('{broken')});await p.waitForFunction(()=>!document.querySelector('#open-context').disabled);assert.match(await p.locator('#view-record-feedback').innerText(),/valid saved exposure/);
    await p.locator('#import-context-file').setInputFiles({name:'large.json',mimeType:'application/json',buffer:Buffer.alloc(131073)});await p.waitForFunction(()=>!document.querySelector('#open-context').disabled);assert.match(await p.locator('#view-record-feedback').innerText(),/128 KB/);assert.equal(requests.length,count);assert.deepEqual(await save(p,'after-errors.json'),before);
  });
  await check('Actual 0.4 exported record remains compatible',async()=>{
    const legacy=JSON.parse(await fs.readFile(root+'/web/tests/fixtures/single-view-0.4.json','utf8'));await importView(p,legacy);assert.match(await p.locator('#view-record-feedback').innerText(),/restored/);const reopened=await save(p,'legacy-restored.json');assert.deepEqual(reopened.viewport,legacy.viewport);assert.deepEqual(reopened.visualization,legacy.visualization);assert.equal(reopened.product_sha256,legacy.product_sha256);
  });
  await check('Selected observation survives reload, bookmarks and Back/Forward navigation',async()=>{
    await p.getByRole('button',{name:'View single exposure 7 Dec 2025',exact:true}).click();await ready(p);assert.equal(new URL(p.url()).searchParams.get('observation'),catalog.fields[0].observations[0].observation_id);
    await p.getByRole('button',{name:'View single exposure 11 Dec 2025',exact:true}).click();await ready(p);await p.reload();await ready(p);assert.match(await p.locator('#exposure-summary').innerText(),/11 Dec 2025/);
    await p.goBack();await ready(p);assert.match(await p.locator('#exposure-summary').innerText(),/7 Dec 2025/);await p.goForward();await ready(p);assert.match(await p.locator('#exposure-summary').innerText(),/11 Dec 2025/);
  });
  await check('Unavailable observation links explain their fallback rather than silently mislabel data',async()=>{
    const q=await c.newPage();await q.goto(base+'/explore.html?field=m67&observation=unavailable');await ready(q);assert.match(await q.locator('#view-record-feedback').innerText(),/observation is unavailable/);assert.equal((await save(q,'fallback.json')).field,'m67');await q.close();
  });
  await check('Slower field selection cannot replace a newer selected exposure',async()=>{
    const q=await c.newPage();let release;const gate=new Promise(r=>release=r);await q.route('**/data/explore/m67-*.json',async r=>{await gate;await r.continue();});await q.goto(base+'/explore.html');await ready(q);await q.locator('[data-field=m67]').click();await q.locator('#explore-loading').waitFor();await q.locator('[data-field=ngc188]').click();await ready(q);release();await q.waitForResponse('**/data/explore/m67-*.json');await q.waitForTimeout(100);assert.equal((await save(q,'race-selection.json')).field,'ngc188');await q.close();
  });
  await check('A pending imported view cannot override a newer manual selection',async()=>{
    const q=await c.newPage();let release;const gate=new Promise(r=>release=r);await q.route('**/data/explore/m101-2025W50*.json',async r=>{await gate;await r.continue();});await q.goto(base+'/explore.html?field=m67');await ready(q);await q.locator('#import-context-file').setInputFiles(file('pending.json',saved));await q.waitForRequest('**/data/explore/m101-2025W50*.json');await q.locator('[data-field=ngc188]').click();await ready(q);release();await q.waitForFunction(()=>!document.querySelector('#open-context').disabled);assert.match(await q.locator('#view-record-feedback').innerText(),/canceled/);assert.equal((await save(q,'race-import.json')).field,'ngc188');await q.close();
  });
  await check('Import failure during initial data loading does not strand the loading state',async()=>{
    const q=await c.newPage();let release;const gate=new Promise(r=>release=r);await q.route('**/data/explore/m101-2025W49*.json',async r=>{await gate;await r.continue();});await q.goto(base+'/explore.html');await q.locator('#open-context:not([disabled])').waitFor();await importView(q,{bad:true});release();await ready(q);assert.equal((await save(q,'initial-recovery.json')).field,'m101');await q.close();
  });
  for(const width of [390,320])await check(width+'px keyboard import and date selection remain usable without horizontal overflow',async()=>{
    const narrow=await context(width,844),q=await narrow.newPage();await q.goto(base+'/explore.html');await ready(q);const chooser=q.waitForEvent('filechooser');await q.locator('#open-context').focus();await q.keyboard.press('Enter');await(await chooser).setFiles(out+'/saved.json');await q.waitForFunction(()=>document.querySelector('#view-record-feedback').textContent.includes('restored'));assert.equal(await q.locator('#explore-canvas').evaluate(e=>document.activeElement===e),true);assert.ok(await q.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));assert.equal((await save(q,'mobile-'+width+'.json')).product_sha256,saved.product_sha256);if(width===390){await q.locator('#open-context').scrollIntoViewIfNeeded();await q.screenshot({path:out+'/mobile-debug.png'});}await narrow.close();
  });
  await check('Compare annotations, integrity validation and ZIP reopening survive the shared-helper refactor',async()=>{
    const q=await c.newPage();await q.goto(base+'/compare.html');await q.locator('#workspace').waitFor();assert.match(await q.locator('.review-tag').first().innerText(),/PENDING/);await q.locator('#mark-mode').click();const canvas=q.locator('#canvas-a'),size=await canvas.evaluate(e=>({w:e.clientWidth,h:e.clientHeight}));await canvas.click({position:{x:size.w/2,y:size.h/2}});await q.locator('#note-text').fill('AUTOMATED REGRESSION QUESTION; no discovery claimed.');await q.getByRole('button',{name:'Save note',exact:true}).click();const download=q.waitForEvent('download');await q.locator('#export').click();await(await download).saveAs(out+'/comparison.zip');await q.locator('#notes').getByRole('button',{name:'Delete',exact:true}).click();await q.locator('#import-file').setInputFiles(out+'/comparison.zip');await q.waitForFunction(()=>document.querySelector('#note-count').textContent==='1');assert.match(await q.locator('#notes').innerText(),/AUTOMATED REGRESSION QUESTION/);await q.close();
  });
  await check('All main local pages still load without uncaught module errors',async()=>{
    const q=await c.newPage();for(const page of ['index','discover','methodology','guide']){await q.goto(base+'/'+page+'.html');await q.locator('h1').waitFor();assert.equal(await q.locator('h1').count(),1);}await q.close();
  });
  await check('New controls pass automated accessibility checks without external runtime requests',async()=>{
    await p.evaluate(await fs.readFile(root+'/tools/vendor/axe.min.js','utf8'));const report=await p.evaluate(async()=>{const r=await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa']}});return {violations:r.violations.map(v=>({id:v.id,impact:v.impact})),manual_review:r.incomplete.map(v=>v.id)};});assert.deepEqual(report.violations,[]);assert.deepEqual(external,[]);assert.deepEqual(errors,[]);return report;
  });
}catch(e){console.error(e);process.exitCode=1;}
finally{const version=browser.version();await browser.close();await fs.writeFile(root+'/docs/evidence/exposure_workflow_tests.json',JSON.stringify({date_utc:new Date().toISOString(),browser_version:version,base,results,external,page_errors:errors,scientific_approval:'PENDING',independent_novice_validation:'NOT CONDUCTED'},null,2));console.log(JSON.stringify({passed:results.filter(r=>r.status==='pass').length,failed:results.filter(r=>r.status==='fail').length}));}
