import {createEvidenceDirectory,evidenceFile,writeEvidenceFile,claimEvidenceFile} from './evidence-output.mjs';
const evidenceRun=await createEvidenceDirectory('verify_kinetic_loader',process.env.SKYSHIFT_EVIDENCE_OUTPUT);
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium} from 'file:///C:/Users/LOQ/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';

const browser = await chromium.launch({headless:true, executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const base = 'http://localhost:3000', results = [], errors = [];
const out = evidenceRun;

async function context(options = {}) {
  const c = await browser.newContext({viewport:{width:1440,height:900}, ...options});
  c.on('page', p => { p.setDefaultTimeout(15000); p.on('pageerror', e => errors.push(e.message)); });
  return c;
}
async function check(name, run) {
  try { await run(); results.push({name, status:'pass'}); console.log('PASS '+name); }
  catch(e) { results.push({name, status:'fail', error:e.stack}); console.error('FAIL '+name+': '+e.message); }
}
function delay(c, pattern) {
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  c.route(pattern, async route => { await gate; await route.continue().catch(()=>{}); });
  return release;
}
try {
  await check('hero: delayed model shows kinetic text; animation changes; readiness clears it', async () => {
    const c=await context(), release=delay(c,'**/mission-model.js'), p=await c.newPage();
    try {
      await p.goto(base);
      await p.locator('#hero-model-message .kinetic-text-loader').waitFor();
      assert.equal(await p.locator('#hero-model-message').textContent().then(t=>t.trim()), 'Loading the SPHEREx model…');
      const dot=p.locator('#hero-model-message .ktl-dot');
      const a=await dot.evaluate(e=>getComputedStyle(e).transform);
      await p.waitForTimeout(240);
      const b=await dot.evaluate(e=>getComputedStyle(e).transform);
      assert.notEqual(a,b);
      assert.equal(await dot.evaluate(e=>getComputedStyle(e).animationName),'ktl-dotMove');
      await p.screenshot({path:await claimEvidenceFile(evidenceFile(evidenceRun,out+'/hero-loading.png'))});
      release();
      await p.waitForFunction(()=>window.skyshiftHero?.diagnostics().model?.frames>0);
      await p.locator('#hero-model-message').waitFor({state:'hidden'});
      assert.equal(await p.locator('#hero-readiness .kinetic-text-loader').count(),0);
    } finally { release(); await c.close(); }
  });
  for (const [path,selector] of [['/#compare','#instrument-loading'],['/compare.html','#loading'],['/explore.html','#explore-loading'],['/methodology.html','#audit-summary']]) {
    await check(path+': delayed scientific data displays loader and recovers', async () => {
      const c=await context(), release=delay(c,'**/data/**'), p=await c.newPage();
      try {
        await p.goto(base+path);
        await p.locator(selector+' .kinetic-text-loader').waitFor();
        if(path==='/compare.html') await p.screenshot({path:await claimEvidenceFile(evidenceFile(evidenceRun,out+'/comparison-loading.png'))});
        release();
        if(path==='/#compare') await p.waitForFunction(()=>window.skyshiftWebsite?.diagnostics().investigation?.kind==='pair'&&!skyshiftWebsite.diagnostics().investigation.busy);
        else if(path==='/compare.html') await p.locator('#workspace:not([hidden])').waitFor();
        else if(path==='/explore.html') await p.locator('#explorer[aria-busy="false"]').waitFor();
        else await p.waitForFunction(()=>!document.querySelector('#audit-summary .kinetic-text-loader'));
      } finally { release(); await c.close(); }
    });
  }
  await check('optional Universe: kinetic loader during entry, return to observations while pending', async()=>{
    const c=await context(), release=delay(c,'**/universe-shell.html'), p=await c.newPage();
    try {
      await p.goto(base+'/#universe');
      await p.locator('#universe-loading .kinetic-text-loader').waitFor();
      await p.locator('#universe-loading a').click();
      release();
      await p.waitForFunction(()=>window.skyshiftWebsite?.diagnostics().investigation?.kind&&!skyshiftWebsite.diagnostics().investigation.busy);
      await p.locator('#universe-loading').waitFor({state:'hidden'});
    } finally { release(); await c.close(); }
  });
  await check('dynamic status updates preserve labels and clear on ready/error; non-status content and links stay usable', async()=>{
    const c=await context(), p=await c.newPage();
    try {
      await p.goto(base+'/guide.html');
      await p.waitForFunction(()=>performance.getEntriesByType('resource').some(r=>r.name.endsWith('/kinetic-loader.js')));
      await p.evaluate(()=>{const s=document.createElement('p');s.id='loader-check';s.setAttribute('role','status');s.textContent='Loading NASA worlds · 45%';document.body.append(s);});
      await p.locator('#loader-check .kinetic-text-loader').waitFor();
      assert.equal(await p.locator('#loader-check').textContent(),'Loading NASA worlds · 45%');
      await p.evaluate(()=>document.getElementById('loader-check').textContent='Checking source identity…');
      await p.locator('#loader-check .kinetic-text-loader').waitFor();
      assert.equal(await p.locator('#loader-check .kinetic-text-loader').count(),1);
      await p.evaluate(()=>document.getElementById('loader-check').textContent='3D unavailable. Open observations.');
      await p.waitForFunction(()=>!document.querySelector('#loader-check .kinetic-text-loader'));
      await p.evaluate(()=>document.getElementById('loader-check').textContent='Interactive model ready');
      assert.equal(await p.locator('#loader-check .kinetic-text-loader').count(),0);
      assert.ok(await p.locator('a[href*="compare"]').count());
    } finally { await c.close(); }
  });
  await check('mobile reduced motion: static readable Loading, no animation or page overflow', async()=>{
    const c=await context({viewport:{width:390,height:844},reducedMotion:'reduce'}), release=delay(c,'**/mission-model.js'), p=await c.newPage();
    try {
      await p.goto(base);
      await p.locator('#hero-model-message .kinetic-text-loader').waitFor();
      assert.equal(await p.locator('#hero-model-message .ktl-dot').evaluate(e=>getComputedStyle(e).animationName),'none');
      assert.equal(await p.locator('#hero-model-message .ktl-stretch').evaluate(e=>getComputedStyle(e,'::before').content),'"i"');
      await p.locator('#hero-model-message').scrollIntoViewIfNeeded();
      assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
      await p.screenshot({path:await claimEvidenceFile(evidenceFile(evidenceRun,out+'/mobile-reduced-motion.png'))});
    } finally { release(); await c.close(); }
  });
  await check('failed WebGL/model import removes loading and preserves direct science',async()=>{
    const c=await context(),p=await c.newPage();
    try{
      await c.route('**/mission-model.js',r=>r.abort());
      await p.goto(base);
      await p.locator('.hero-observatory[data-model-state="failed"]').waitFor();
      await p.waitForFunction(()=>!document.querySelector('#hero-model-message .kinetic-text-loader'));
      await p.goto(base+'/#compare');
      await p.waitForFunction(()=>window.skyshiftWebsite?.diagnostics().investigation?.kind==='pair'&&!skyshiftWebsite.diagnostics().investigation.busy);
    }finally{await c.close();}
  });
  assert.deepEqual(errors,[]);
} finally {
  await browser.close();
  await writeEvidenceFile(evidenceFile(evidenceRun,out+'/results.json'),JSON.stringify({results,errors},null,2)+'\n');
}
if(results.some(r=>r.status!=='pass')||errors.length)process.exitCode=1;
