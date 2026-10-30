import {createEvidenceDirectory,evidenceFile,writeEvidenceFile} from './evidence-output.mjs';
const evidenceRun=await createEvidenceDirectory('verify_interactions',process.env.SKYSHIFT_EVIDENCE_OUTPUT);
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {decodeArray} from '../web/dist/science.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),require=createRequire(import.meta.url);
const {chromium}=await import(pathToFileURL(process.env.SKYSHIFT_PLAYWRIGHT_MODULE||require.resolve('playwright')).href);
const browser=await chromium.launch({headless:true,executablePath:process.env.SKYSHIFT_CHROMIUM_EXECUTABLE});
const base='http://localhost:3000',results=[],errors=[],external=[];
const raw=JSON.parse(await fs.readFile(root+'/web/dist/data/explore/m101-2025W49_2A_0756_3.json','utf8')),wave=decodeArray(raw.arrays.WAVE),valid=decodeArray(raw.arrays.VALID);
const fieldCount=JSON.parse(await fs.readFile(root+'/web/dist/data/explore-catalog.json','utf8')).fields.length;
async function check(name,fn){try{const detail=await fn();results.push({name,status:'pass',...(detail?{detail}:{})});console.log('PASS '+name);}catch(e){results.push({name,status:'fail',error:e.message});throw e;}}
async function context(width=1440,touch=false){const c=await browser.newContext({viewport:{width,height:900},hasTouch:touch,acceptDownloads:true});await c.route('**/*',r=>{if(!['localhost','127.0.0.1'].includes(new URL(r.request().url()).hostname)){external.push(r.request().url());return r.abort();}return r.continue();});c.on('page',p=>p.on('pageerror',e=>errors.push(e.message)));return c;}
async function ready(p){await p.locator('#explorer[aria-busy=false]').waitFor();assert.equal(await p.locator('#context-source').isEnabled(),true);}
async function touchPinch(c,p,selector){const canvas=p.locator(selector);await canvas.scrollIntoViewIfNeeded();const b=await canvas.boundingBox(),x=b.x+b.width/2,y=b.y+b.height/2,cdp=await c.newCDPSession(p);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:1,x:x-30,y},{id:2,x:x+30,y}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{id:1,x:x-55,y},{id:2,x:x+55,y}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();}
try{
 const c=await context(),p=await c.newPage();await p.goto(base+'/explore.html');await ready(p);
 await check('Click and keyboard inspection expose actual prepared-pixel wavelength with live feedback',async()=>{
  const canvas=p.locator('#explore-canvas');await canvas.click();await p.locator('#pixel-summary').waitFor();assert.match(await p.locator('#pixel-summary-value').innerText(),new RegExp(wave[88*176+88].toFixed(4)));await canvas.focus();await p.keyboard.press('ArrowLeft');assert.match(await p.locator('#pixel-announcement').innerText(),/pixel 87, 88/);await p.keyboard.press('Enter');assert.equal(await p.locator('#pixel-summary').isVisible(),true);await p.keyboard.press('Escape');assert.equal(await p.locator('#pixel-summary').isVisible(),false);
 });
 await check('Excluded pixels are described as unusable data rather than empty sky',async()=>{
  await p.locator('#explore-reset').click();let ix,iy;for(let y=50;y<125&&!ix;y++)for(let x=50;x<125;x++)if(!valid[y*176+x]){ix=x;iy=y;break;}
  assert.ok(ix);const canvas=p.locator('#explore-canvas'),size=await canvas.evaluate(e=>({w:e.clientWidth,h:e.clientHeight})),scale=Math.min(size.w/176,size.h/176);
  await canvas.click({position:{x:size.w/2+(ix-87.5)*scale,y:size.h/2-(iy-87.5)*scale}});assert.match(await p.locator('#pixel-summary-title').innerText(),/Excluded/);assert.match(await p.locator('#pixel-announcement').innerText(),/not empty sky/);
 });
 await check('Rendering batches 60 keyboard moves into bounded repaint work',async()=>{
  await p.locator('#explore-reset').click();await p.waitForTimeout(50);const measured=await p.locator('#explore-canvas').evaluate(async canvas=>{const ctx=canvas.getContext('2d'),original=ctx.drawImage;let draws=0;ctx.drawImage=function(...args){draws++;return original.apply(this,args);};const start=performance.now();for(let i=0;i<60;i++)canvas.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}));await new Promise(requestAnimationFrame);ctx.drawImage=original;return {input_events:60,draw_image_calls:draws,elapsed_ms:performance.now()-start};});assert.ok(measured.draw_image_calls<=4&&measured.draw_image_calls>=2);return measured;
 });
 await check('Catalogue HTTP failure is recoverable without reloading the page',async()=>{
  const q=await c.newPage();await q.route('**/data/explore-catalog.json',r=>r.fulfill({status:503,body:'unavailable'}));await q.goto(base+'/explore.html');await q.locator('#catalogue-retry').waitFor();assert.equal(await q.locator('#context-source').isDisabled(),true);assert.equal(await q.locator('#explore-loading').isVisible(),false);await q.unroute('**/data/explore-catalog.json');await q.locator('#catalogue-retry').click();await ready(q);assert.equal(await q.locator('.field-card').count(),fieldCount);assert.equal(await q.locator('#sky-map circle').count(),fieldCount);await q.close();
 });
 await check('A forged or malformed catalogue fails before exposure fetching and recovers on retry',async()=>{
  const q=await c.newPage(),catalogue=JSON.parse(await fs.readFile(root+'/web/dist/data/explore-catalog.json','utf8'));catalogue.fields[0].comparison_status='approved';let exposures=0;q.on('request',r=>{if(/\/data\/explore\/.*json/.test(r.url()))exposures++;});await q.route('**/data/explore-catalog.json',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(catalogue)}));await q.goto(base+'/explore.html');await q.locator('#catalogue-retry').waitFor();assert.equal(exposures,0);await q.unroute('**/data/explore-catalog.json');await q.locator('#catalogue-retry').click();await ready(q);assert.equal(exposures,1);await q.close();
 });
 const mobile=await context(390,true),q=await mobile.newPage();await q.goto(base+'/explore.html');await ready(q);
 await check('Emulated two-finger pinch zooms the observation without firing a tap inspection',async()=>{await touchPinch(mobile,q,'#explore-canvas');assert.ok(parseFloat(await q.locator('#explore-zoom').innerText())>1.5);assert.equal(await q.locator('#pixel-summary').isVisible(),false);assert.equal(await q.locator('#explore-canvas').evaluate(e=>getComputedStyle(e).touchAction),'none');});
 await check('A real emulated touchscreen tap works after pinch and canceled gestures',async()=>{await q.locator('#explore-canvas').tap();await q.locator('#pixel-summary').waitFor();assert.match(await q.locator('#pixel-announcement').innerText(),/ICRS/);await q.locator('#dismiss-pixel').click();const canvas=q.locator('#explore-canvas'),box=await canvas.boundingBox(),cdp=await mobile.newCDPSession(q);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:1,x:box.x+box.width/2,y:box.y+box.height/2}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});await cdp.detach();await canvas.tap();await q.locator('#pixel-summary').waitFor();});
 await check('Compare pinch cannot create a spurious note; a subsequent tap can attach a valid note',async()=>{
  await q.goto(base+'/compare.html');await q.locator('#workspace').waitFor();await q.locator('#mark-mode').click();await touchPinch(mobile,q,'#canvas-a');assert.equal(await q.locator('#note-dialog').isVisible(),false);assert.ok(parseFloat(await q.locator('#zoom-label').innerText())>1.5);await q.locator('#canvas-a').tap();await q.locator('#note-dialog').waitFor();await q.locator('#note-text').fill('AUTOMATED TOUCH CONTROL; no discovery claimed.');await q.getByRole('button',{name:'Save note',exact:true}).click();assert.equal(await q.locator('#note-count').innerText(),'1');
 });
 await check('Compare keyboard zoom fires once and keyboard marking has a usable equivalent',async()=>{
  await q.locator('#reset-view').click();await q.locator('#canvas-a').focus();await q.keyboard.press('+');assert.equal(await q.locator('#zoom-label').innerText(),'1.3×');await q.locator('#mark-mode').click();await q.locator('#canvas-a').focus();await q.keyboard.press('Enter');await q.locator('#note-dialog').waitFor();await q.locator('#cancel-note').click();assert.match(await q.locator('#compare-pixel-announcement').innerText(),/ICRS/);
 });
 await check('No outside runtime requests or uncaught script errors',()=>{assert.deepEqual(external,[]);assert.deepEqual(errors,[]);});
 await c.close();await mobile.close();
}catch(e){if(!results.some(r=>r.status==='fail'))results.push({name:'Browser setup or readiness',status:'fail',error:e.message});console.error(e);process.exitCode=1;}
finally{await browser.close();await writeEvidenceFile(evidenceFile(evidenceRun,root+'/docs/evidence/interaction_foundation_tests.json'),JSON.stringify({date_utc:new Date().toISOString(),results,external,errors,touch_scope:'Chromium emulated touchscreen; not a physical-device or human study',scientific_approval:'PENDING'},null,2));console.log(JSON.stringify({passed:results.filter(r=>r.status==='pass').length,failed:results.filter(r=>r.status==='fail').length}));}
