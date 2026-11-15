import {createEvidenceDirectory,evidenceFile,writeEvidenceFile,claimEvidenceFile} from './evidence-output.mjs';
const evidenceRun=await createEvidenceDirectory('measure_repair_baseline',process.env.SKYSHIFT_EVIDENCE_OUTPUT);
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {chromium} from 'file:///C:/Users/LOQ/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
const phase=process.argv[2]||'before',out=evidenceRun;

const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'}),results=[];
try{
  for(const scenario of ['automatic','poster-control','mobile-low']){
    const c=await browser.newContext({viewport:scenario==='mobile-low'?{width:390,height:844}:{width:1440,height:900},reducedMotion:'reduce'});
    // Replay the repository baseline for a repeatable before measurement even
    // after repairs are built. Pre-existing Universe edits are not involved.
    await c.route('**/*.js',r=>{
      const name=new URL(r.request().url()).pathname.slice(1);
      if(phase==='before'&&!name.includes('/')){try{return r.fulfill({contentType:'text/javascript',body:execFileSync('git',['show','HEAD:web/dist/'+name])});}catch{}}
      return r.continue();
    });
    if(scenario==='poster-control')await c.route('**/hero-model.js',r=>r.fulfill({contentType:'text/javascript',body:`export function installHeroModel(){const c=document.querySelector('#hero-model-canvas'),i=document.createElement('img');i.src='./assets/spherex-spacecraft-concept.jpg';i.alt='NASA/JPL-Caltech SPHEREx spacecraft concept';i.className=c.className;c.replaceWith(i);document.querySelector('#hero-model-message').textContent='NASA/JPL-Caltech · static measurement control';}`}));
    const p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
    if(scenario==='mobile-low')await p.addInitScript(()=>{Object.defineProperty(navigator,'deviceMemory',{value:2});Object.defineProperty(navigator,'hardwareConcurrency',{value:2});localStorage.setItem('skyshift.space.preferences.v1',JSON.stringify({quality:'auto',effects:false}));});
    const session=await c.newCDPSession(p);await session.send('Performance.enable');
    await p.goto('http://localhost:3000');await p.waitForFunction(()=>document.body.dataset.controller==='ready');
    if(scenario==='mobile-low')await p.locator('.hero-observatory').scrollIntoViewIfNeeded();
    if(scenario!=='poster-control')await p.waitForFunction(()=>['ready','failed'].includes(window.skyshiftHero?.diagnostics().state));
    await p.screenshot({path:await claimEvidenceFile(evidenceFile(evidenceRun,`${out}/${phase}-${scenario}.png`))});
    const metrics=await session.send('Performance.getMetrics');
    results.push({scenario,errors,metrics:Object.fromEntries(metrics.metrics.filter(x=>['TaskDuration','ScriptDuration','JSHeapUsedSize','Nodes'].includes(x.name)).map(x=>[x.name,x.value])),timing:await p.evaluate(()=>({navigation:performance.getEntriesByType('navigation')[0].toJSON(),resources:performance.getEntriesByType('resource').map(x=>({name:x.name.split('/').pop(),bytes:x.transferSize,duration:x.duration})),hero:window.skyshiftHero?.diagnostics()}))});
    await c.close();
  }
  const hashes={};for(const dir of ['data','assets']){async function walk(d){for(const e of await fs.readdir(d,{withFileTypes:true})){const path=d+'/'+e.name;if(e.isDirectory())await walk(path);else if(e.name!=='release-integrity.json')hashes[path]=createHash('sha256').update(await fs.readFile(path)).digest('hex');}}await walk('web/dist/'+dir);}
  await writeEvidenceFile(evidenceFile(evidenceRun,`${out}/${phase}-baseline.json`),JSON.stringify({scope:'Emulated Chrome, reduced motion; one fresh-context sample per condition in a shared browser process, no statistical speed claim. Before replays repository-baseline JavaScript in the current presentation shell. Poster is an isolated measurement control only.',results,hashes},null,2));
}finally{await browser.close();}
