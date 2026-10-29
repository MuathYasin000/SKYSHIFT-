import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {chromium} from 'file:///C:/Users/LOQ/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';

const out='docs/evidence/home-startup-20261029',base='http://localhost:3000';
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const results=[],errors=[];
async function context(options={}) {
  const c=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:'reduce',...options});
  c.on('page',p=>{p.setDefaultTimeout(10000);p.on('pageerror',e=>errors.push(e.message));});return c;
}
const ready=p=>p.waitForFunction(()=>document.body?.dataset.controller==='ready');
const rendered=p=>p.waitForFunction(()=>window.skyshiftHero?.diagnostics().model?.frames>0);
async function check(name,fn){try{const detail=await fn();results.push({name,status:'pass',detail});console.log('PASS '+name);}catch(e){results.push({name,status:'fail',error:e.message});console.log('FAIL '+name+': '+e.message);}}
try {
 await check('Search anchor remains accessible and scrolling back to the hero starts its model',async()=>{
  const c=await context(),p=await c.newPage();try {
   await p.goto(base+'/#sky-search');await ready(p);await p.waitForFunction(()=>scrollY>300);
   await p.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));await rendered(p);
   assert.equal(await p.locator('#hero-model-message').isVisible(),false);
   assert.equal(await p.locator('.hero-model-controls').isVisible(),true);
   await p.screenshot({path:out+'/hero-after-search.png'});
  }finally{await c.close();}
 });
 await check('Homepage reload starts at the top after scrolling down',async()=>{
  const c=await context({reducedMotion:'no-preference'}),p=await c.newPage();try {
   await p.goto(base+'/');await ready(p);await rendered(p);
   await p.evaluate(()=>scrollTo({top:1500,behavior:'instant'}));await p.waitForFunction(()=>scrollY>1000);
   await p.reload();await ready(p);await p.waitForTimeout(250);
   assert.ok(await p.evaluate(()=>scrollY<=1),'Homepage restored a middle-of-page position');await rendered(p);
  }finally{await c.close();}
 });
 await check('Mobile home remains at the top with its model prepared by the arrival',async()=>{
  for (const width of [320,390]) {
   const c=await context({viewport:{width,height:844}}),p=await c.newPage();try {
    await p.goto(base+'/');await ready(p);await p.waitForFunction(()=>window.skyshiftArrival&&!skyshiftArrival.diagnostics().active);assert.equal(await p.evaluate(()=>scrollY),0);
    assert.ok(await p.evaluate(()=>skyshiftHero.diagnostics().model.frames>0));
    await p.locator('.hero-observatory').scrollIntoViewIfNeeded();await rendered(p);
    assert.equal(await p.locator('#hero-model-message').isVisible(),false);
   }finally{await c.close();}
  }
 });
 await check('Home navigation from the search section resets scroll and resumes rendering',async()=>{
  const c=await context(),p=await c.newPage();try {
   await p.goto(base+'/#sky-search');await ready(p);await p.waitForFunction(()=>scrollY>300);
   await p.locator('.site-brand').click();await p.waitForFunction(()=>location.hash==='#home'&&scrollY<=1);await rendered(p);
   assert.equal(await p.locator('#hero-model-message').isVisible(),false);
  }finally{await c.close();}
 });
 await check('Hero pauses offscreen and in science, and resumes when visible',async()=>{
  const c=await context(),p=await c.newPage();try {
   await p.goto(base+'/');await ready(p);await rendered(p);
   await p.evaluate(()=>scrollTo({top:1800,behavior:'instant'}));await p.waitForFunction(()=>!skyshiftHero.diagnostics().visible);
   await p.waitForTimeout(100);const before=await p.evaluate(()=>skyshiftHero.diagnostics().model.frames);await p.waitForTimeout(200);
   assert.equal(await p.evaluate(()=>skyshiftHero.diagnostics().model.frames),before);
   await p.evaluate(()=>{location.hash='compare';});await p.waitForFunction(()=>skyshiftWebsite.diagnostics().surface==='science'&&!skyshiftWebsite.diagnostics().investigation.busy);
   assert.equal(await p.evaluate(()=>skyshiftHero.diagnostics().visible),false);
   await p.locator('.site-brand').click();await p.waitForFunction(()=>scrollY<=1&&skyshiftHero.diagnostics().visible);await rendered(p);
  }finally{await c.close();}
 });
 await check('No-WebGL home stops loading and exposes recovery while comparison remains available',async()=>{
  const c=await context();await c.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return /webgl/i.test(type)?null:original.call(this,type,...args);};});const p=await c.newPage();try {
   await p.goto(base+'/');await ready(p);await p.locator('#hero-model-retry').waitFor();
   assert.match(await p.locator('#hero-model-message').innerText(),/unavailable/);
   assert.equal(await p.locator('#hero-model-message .kinetic-text-loader').count(),0);
   await p.evaluate(()=>{location.hash='compare';});await p.waitForFunction(()=>skyshiftWebsite.diagnostics().investigation.kind==='pair'&&!skyshiftWebsite.diagnostics().investigation.busy);
   assert.equal(await p.locator('#instrument-save').isEnabled(),true);
  }finally{await c.close();}
 });
 await check('Direct science entry does not import the hero renderer during delayed scientific startup',async()=>{
  const c=await context(),p=await c.newPage(),graphics=[];try {
   p.on('request',r=>{if(/\/(mission-model|space-scene)\.js$|\/three[^/]*\.js$/.test(new URL(r.url()).pathname))graphics.push(r.url());});
   await c.route('**/website.js',async r=>{await new Promise(resolve=>setTimeout(resolve,400));await r.continue();});
   await p.goto(base+'/#compare');await ready(p);
   await p.waitForFunction(()=>skyshiftWebsite.diagnostics().investigation.kind==='pair'&&!skyshiftWebsite.diagnostics().investigation.busy);
   assert.deepEqual(graphics,[]);assert.equal(await p.evaluate(()=>skyshiftHero.diagnostics().model),null);
  }finally{await c.close();}
 });
 await check('A stalled model import ends loading, and Retry recovers after the files become available',async()=>{
  const c=await context(),p=await c.newPage();let release;const gate=new Promise(resolve=>release=resolve);try {
   await c.route('**/mission-model.js',async r=>{await gate;await r.continue();});
   await p.goto(base+'/');await ready(p);
   await p.locator('#hero-model-retry').waitFor({timeout:16000});
   assert.equal(await p.locator('#hero-model-message .kinetic-text-loader').count(),0);
   assert.equal(await p.evaluate(()=>skyshiftHero.diagnostics().state),'failed');
   release();await Promise.all([p.waitForNavigation({waitUntil:'domcontentloaded'}),p.locator('#arrival-retry').click()]);await ready(p);await rendered(p);
   assert.equal(await p.locator('#hero-model-message').isVisible(),false);
  }finally{release();await c.close();}
 });
}finally{await browser.close();await fs.writeFile(out+'/browser.json',JSON.stringify({results,page_errors:errors},null,2)+'\n');}
assert.deepEqual(errors,[]);assert.ok(results.every(r=>r.status==='pass'));
