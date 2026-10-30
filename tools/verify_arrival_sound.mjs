import {createEvidenceDirectory,evidenceFile,writeEvidenceFile} from './evidence-output.mjs';
const evidenceRun=await createEvidenceDirectory('verify_arrival_sound',process.env.SKYSHIFT_EVIDENCE_OUTPUT);
// The arrival is intentionally silent; verify normal interface audio separately.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {chromium} from 'file:///C:/Users/LOQ/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
const out=evidenceRun;
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--autoplay-policy=no-user-gesture-required']});
const results=[],errors=[];
async function page(options={}){const c=await browser.newContext({viewport:{width:1440,height:1000},...options}),p=await c.newPage();p.setDefaultTimeout(15000);p.on('pageerror',e=>errors.push(e.message));return {c,p};}
const ready=p=>p.waitForFunction(()=>window.skyshiftSound&&window.skyshiftArrival?.diagnostics().initialized);
const complete=p=>p.waitForFunction(()=>window.skyshiftArrival&&!skyshiftArrival.diagnostics().active);
async function hold(c){let release;const gate=new Promise(r=>release=r);await c.route('**/mission-model.js',async r=>{await gate;await r.continue().catch(()=>{});});return release;}
async function silent(p){const d=await p.evaluate(()=>skyshiftSound.diagnostics());assert.deepEqual(d.recent_cues,[]);assert.equal(d.context_state,'not_created');assert.equal(d.active_voice_count,0);assert.equal(await p.locator('#arrival-sound').count(),0);}
async function check(name,f){try{await f();results.push({name,status:'pass'});console.log('PASS '+name);}catch(e){results.push({name,status:'fail',error:e.stack});console.log('FAIL '+name+': '+e.message);}}
try{
 await check('Loading, background clicks, model reveal and landing stay silent even with autoplay allowed',async()=>{
  const {c,p}=await page(),release=await hold(c);try{
   await p.goto('http://localhost:3000/');await ready(p);await silent(p);
   const title=await p.locator('#arrival-title').boundingBox();await p.mouse.click(title.x+title.width/2,title.y+title.height/2);await silent(p);release();await complete(p);await silent(p);
   await p.locator('#vela-reveal').focus();for(let i=0;i<8;i++){await p.keyboard.press('ArrowRight');await p.waitForTimeout(80);}
   const d=await p.evaluate(()=>skyshiftSound.diagnostics());assert.equal(d.enabled,true);assert.equal(d.context_state,'running');assert.ok(d.recent_cues.includes('swipe_tick'));
   assert.equal(d.recent_cues.some(n=>n.startsWith('arrival_')),false);
  }finally{release();await c.close();}
 });
 await check('Skipping a loading model is silent and still releases the homepage',async()=>{
  const {c,p}=await page(),release=await hold(c);try{
   await p.goto('http://localhost:3000/');await ready(p);await p.locator('#arrival-skip').click();await complete(p);release();await silent(p);
   assert.equal(await p.locator('#main').evaluate(e=>e.inert),false);
  }finally{release();await c.close();}
 });
 await check('No-WebGL recovery remains silent and mobile layouts retain their visual arrival',async()=>{
  const {c,p}=await page();try{
   await c.addInitScript(()=>{const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(t,...a){return /webgl/i.test(t)?null:get.call(this,t,...a);};});
   await p.goto('http://localhost:3000/');await ready(p);await p.locator('#arrival-retry').waitFor();await silent(p);await p.locator('#arrival-skip').click();await silent(p);
  }finally{await c.close();}
  const m=await page({viewport:{width:320,height:667},isMobile:true,hasTouch:true});try{
   await m.p.goto('http://localhost:3000/');await complete(m.p);await m.p.waitForFunction(()=>window.skyshiftSound);await silent(m.p);
   assert.ok(await m.p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));assert.equal(await m.p.locator('.hero-observatory canvas').count(),1);
  }finally{await m.c.close();}
 });
}finally{await browser.close();await writeEvidenceFile(evidenceFile(evidenceRun,out+'/browser.json'),JSON.stringify({scope:'Silent intro verified under an explicitly allowed autoplay policy; ordinary interface audio remains enabled',results,page_errors:errors},null,2)+'\n');}
assert.deepEqual(errors,[]);assert.ok(results.every(r=>r.status==='pass'));
