import {createEvidenceDirectory,evidenceFile,writeEvidenceFile,claimEvidenceFile} from './evidence-output.mjs';
const evidenceRun=await createEvidenceDirectory('verify_arrival',process.env.SKYSHIFT_ARRIVAL_OUTPUT);
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {chromium} from 'file:///C:/Users/LOQ/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
const out=evidenceRun;
const b=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const results=[],errors=[],base='http://localhost:3000/';
async function page(options={}){const c=await b.newContext({viewport:{width:1440,height:1000},...options});const p=await c.newPage();p.setDefaultTimeout(15000);p.on('pageerror',e=>errors.push(e.message));return {c,p};}
const initialized=p=>p.waitForFunction(()=>window.skyshiftArrival?.diagnostics().initialized);
const complete=p=>p.waitForFunction(()=>window.skyshiftArrival&&!skyshiftArrival.diagnostics().active);
async function hold(c){let release;const gate=new Promise(r=>release=r);await c.route('**/mission-model.js',async r=>{await gate;await r.continue().catch(()=>{});});return release;}
async function check(name,fn){try{const detail=await fn();results.push({name,status:'pass',detail});console.log('PASS '+name);}catch(e){results.push({name,status:'fail',error:e.stack});console.log('FAIL '+name+': '+e.message);}}
try{
 await check('Slow loading keeps the page gated; first frame reveals and lands the same canvas',async()=>{
  const {c,p}=await page();const release=await hold(c);try{
   await p.goto(base);await initialized(p);await p.waitForFunction(()=>window.skyshiftHero);
   await p.evaluate(()=>window.originalArrivalCanvas=document.getElementById('hero-model-canvas'));
   assert.equal(await p.locator('#main').evaluate(e=>e.inert),true);assert.equal(await p.locator('#arrival-screen').isVisible(),true);
   assert.equal(await p.locator('#arrival-model-stage canvas').count(),1);assert.equal(await p.locator('#hero-model-canvas').count(),1);
   assert.equal(await p.evaluate(()=>skyshiftHero.diagnostics().model),null);
   await p.screenshot({path:await claimEvidenceFile(evidenceFile(evidenceRun,out+'/loading.png'))});
   await p.keyboard.press('Tab');assert.equal(await p.evaluate(()=>document.activeElement.id),'arrival-skip');
   await p.keyboard.press('Shift+Tab');assert.equal(await p.evaluate(()=>document.activeElement.getAttribute('href')),'./compare.html');
   await p.evaluate(await fs.readFile('tools/vendor/axe.min.js','utf8'));
   const violations=await p.evaluate(async()=>{const r=await axe.run(document.getElementById('arrival-screen'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}});return r.violations.map(x=>({id:x.id,nodes:x.nodes.map(n=>n.target)}));});assert.deepEqual(violations,[]);
   release();await p.waitForFunction(()=>document.documentElement.dataset.arrival==='reveal');await p.waitForTimeout(250);
   assert.ok(await p.evaluate(()=>skyshiftHero.diagnostics().model.frames>0));assert.equal(await p.evaluate(()=>skyshiftHero.diagnostics().model.arrival_orbit),true);
   const lit=await p.evaluate(()=>skyshiftHero.diagnostics().model.arrival_light);
   assert.equal(lit.visible,true);assert.equal(lit.diagram_visible,true);assert.equal(lit.rays.length,8);
   assert.ok(await p.locator('.arrival-scan').evaluate(e=>Number(getComputedStyle(e).opacity)>.8));
   const turn=await p.evaluate(()=>skyshiftHero.diagnostics().model.model_rotation[1]);
   await p.screenshot({path:await claimEvidenceFile(evidenceFile(evidenceRun,out+'/reveal.png'))});
   await p.waitForTimeout(900);
   assert.ok(await p.evaluate(y=>skyshiftHero.diagnostics().model.model_rotation[1]-y>1.5,turn),'Spacecraft does not visibly rotate');
   await p.waitForFunction(()=>document.documentElement.dataset.arrival==='settling');await p.waitForTimeout(450);await p.screenshot({path:await claimEvidenceFile(evidenceFile(evidenceRun,out+'/settling.png'))});
   await complete(p);assert.equal(await p.evaluate(()=>skyshiftArrival.diagnostics().state),'complete');
   assert.equal(await p.evaluate(()=>originalArrivalCanvas===document.querySelector('.hero-observatory canvas')),true);
   assert.equal(await p.locator('#main').evaluate(e=>e.inert),false);assert.equal(await p.locator('#arrival-screen').isVisible(),false);
   assert.equal(await p.locator('#hero-model-canvas').evaluate(e=>getComputedStyle(e).animationName),'none');
   assert.equal(await p.evaluate(()=>skyshiftHero.diagnostics().model.arrival_light.visible),false);
   assert.equal(await p.evaluate(()=>skyshiftHero.diagnostics().model.arrival_orbit),false);
   assert.equal(await p.evaluate(()=>scrollY),0);await p.screenshot({path:await claimEvidenceFile(evidenceFile(evidenceRun,out+'/landed.png'))});
   await p.locator('#hero-model-canvas').focus();const before=await p.evaluate(()=>skyshiftHero.diagnostics().model.camera);await p.keyboard.press('ArrowRight');assert.notDeepEqual(await p.evaluate(()=>skyshiftHero.diagnostics().model.camera),before);
   return {same_canvas:true,first_render_gated:true,accessibility_violations:0};
  }finally{release();await c.close();}
 });
 await check('Mobile arrivals land without overflow, scroll restoration or orphaned canvases',async()=>{
  for(const [width,height] of [[320,667],[390,844],[844,390]]){const {c,p}=await page({viewport:{width,height},isMobile:true,hasTouch:true});try{
   await p.goto(base);await complete(p);
   assert.equal(await p.evaluate(()=>scrollY),0);assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   assert.equal(await p.locator('.hero-observatory canvas').count(),1);assert.equal(await p.locator('#arrival-model-stage canvas').count(),0);
   assert.equal(await p.evaluate(()=>skyshiftHero.diagnostics().model.arrival_orbit),false);
   await p.locator('.hero-observatory').scrollIntoViewIfNeeded();await p.waitForFunction(()=>skyshiftHero.diagnostics().visible);
   if(width===390)await p.screenshot({path:await claimEvidenceFile(evidenceFile(evidenceRun,out+'/mobile-landed.png'))});
  }finally{await c.close();}}
 });
 await check('Reduced motion waits for real rendering and bypasses all reveal flights',async()=>{
  const {c,p}=await page({reducedMotion:'reduce'}),release=await hold(c);try{
   await p.goto(base);await initialized(p);assert.equal(await p.locator('#main').evaluate(e=>e.inert),true);release();await complete(p);
   assert.ok(await p.evaluate(()=>skyshiftHero.diagnostics().model.frames>0));assert.equal(await p.evaluate(()=>skyshiftHero.diagnostics().model.arrival_orbit),false);
   assert.equal(await p.evaluate(()=>document.getAnimations().filter(a=>a.effect?.target?.closest?.('#arrival-screen,#arrival-model-stage')).some(a=>a.playState==='running')),false);
  }finally{release();await c.close();}
 });
 await check('No WebGL offers retry and escape; direct scientific access remains functional',async()=>{
  const {c,p}=await page();try{
   await c.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(t,...a){return /webgl/i.test(t)?null:original.call(this,t,...a);};});
   await p.goto(base);await p.locator('#arrival-retry').waitFor();assert.equal(await p.evaluate(()=>skyshiftArrival.diagnostics().state),'failed');
   await p.locator('#arrival-skip').click();assert.equal(await p.locator('#main').evaluate(e=>e.inert),false);
   await p.evaluate(()=>location.hash='compare');await p.waitForFunction(()=>window.skyshiftWebsite?.diagnostics().investigation?.kind==='pair'&&!skyshiftWebsite.diagnostics().investigation.busy);
   assert.equal(await p.locator('#instrument-save').isEnabled(),true);
  }finally{await c.close();}
 });
 await check('A stalled import exposes recovery instead of pretending the model is ready',async()=>{
  const {c,p}=await page(),release=await hold(c);try{
   await p.goto(base);await p.locator('#arrival-retry').waitFor({timeout:16500});
   assert.equal(await p.evaluate(()=>skyshiftArrival.diagnostics().state),'failed');assert.equal(await p.locator('#main').evaluate(e=>e.inert),true);
   await p.locator('#arrival-skip').click();await complete(p);release();
   assert.equal(await p.locator('.hero-observatory canvas').count(),1);assert.equal(await p.locator('#main').evaluate(e=>e.inert),false);
  }finally{release();await c.close();}
 });
 await check('Direct science and search anchors bypass the arrival; route changes cancel an active flight',async()=>{
  const {c,p}=await page();try{
   const imports=[];p.on('request',r=>{if(/\/mission-model.js$/.test(r.url()))imports.push(r.url());});
   await p.goto(base+'#compare');await p.waitForFunction(()=>window.skyshiftWebsite?.diagnostics().investigation?.kind==='pair'&&!skyshiftWebsite.diagnostics().investigation.busy);
   assert.equal(await p.locator('#arrival-screen').isVisible(),false);assert.equal(await p.locator('#main').evaluate(e=>e.inert),false);assert.deepEqual(imports,[]);
   await p.goto(base+'#sky-search');await p.locator('#sky-search-prepare').waitFor();assert.equal(await p.locator('#arrival-screen').isVisible(),false);
   await p.goto(base);await p.waitForFunction(()=>document.documentElement.dataset.arrival==='reveal');
   await p.evaluate(()=>location.hash='compare');await complete(p);assert.equal(await p.evaluate(()=>skyshiftArrival.diagnostics().state),'navigation');
   await p.waitForTimeout(1500);assert.equal(await p.locator('.hero-observatory canvas').count(),1);assert.equal(await p.locator('#main').evaluate(e=>e.inert),false);
  }finally{await c.close();}
 });
 await check('Context loss during reveal cannot finish a stale arrival or strand the visitor',async()=>{
  const {c,p}=await page();try{
   await p.goto(base);await p.waitForFunction(()=>document.documentElement.dataset.arrival==='reveal');
   await p.evaluate(()=>document.getElementById('hero-model-canvas').getContext('webgl2').getExtension('WEBGL_lose_context').loseContext());
   await p.waitForFunction(()=>skyshiftArrival.diagnostics().state==='failed');await p.waitForTimeout(1800);
   assert.equal(await p.evaluate(()=>skyshiftArrival.diagnostics().state),'failed');
   await p.keyboard.press('Escape');await complete(p);assert.equal(await p.locator('#main').evaluate(e=>e.inert),false);
  }finally{await c.close();}
 });
 await check('Resizing during reveal restores the hero canvas and releases page controls',async()=>{
  const {c,p}=await page();try{
   await p.goto(base);await p.waitForFunction(()=>document.documentElement.dataset.arrival==='reveal');
   await p.setViewportSize({width:1024,height:768});await complete(p);
   assert.equal(await p.evaluate(()=>skyshiftArrival.diagnostics().state),'resized');
   assert.equal(await p.locator('.hero-observatory canvas').count(),1);assert.equal(await p.locator('#main').evaluate(e=>e.inert),false);
   assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  }finally{await c.close();}
 });
 await check('The saved reduce-effects preference retains first-frame readiness without an orbital flight',async()=>{
  const {c,p}=await page();try{
   await c.addInitScript(()=>localStorage.setItem('skyshift.space.preferences.v1',JSON.stringify({effects:false})));
   await p.goto(base);await complete(p);
   assert.equal(await p.evaluate(()=>skyshiftHero.diagnostics().model.arrival_orbit),false);
   assert.equal(await p.locator('#main').evaluate(e=>e.inert),false);
   assert.ok(await p.evaluate(()=>skyshiftHero.diagnostics().model.frames>0));
  }finally{await c.close();}
 });
}finally{await b.close();await writeEvidenceFile(evidenceFile(evidenceRun,out+'/browser.json'),JSON.stringify({scope:'Local automated browser checks; illustrative arrival artwork, no scientific data changes',results,page_errors:errors},null,2)+'\n');}
assert.deepEqual(errors,[]);assert.ok(results.every(r=>r.status==='pass'));
