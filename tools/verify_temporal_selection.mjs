import {createEvidenceDirectory,evidenceFile,writeEvidenceFile,claimEvidenceFile} from './evidence-output.mjs';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
const out=await createEvidenceDirectory('temporal-selection',process.env.SKYSHIFT_EVIDENCE_OUTPUT);
const {chromium}=await import(pathToFileURL(process.env.SKYSHIFT_PLAYWRIGHT_MODULE||'C:/Users/LOQ/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs'));
const browser=await chromium.launch({headless:true,executablePath:process.env.SKYSHIFT_CHROMIUM_EXECUTABLE||'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const results=[],errors=[],base=process.env.SKYSHIFT_BASE||'http://localhost:3000';
const ready=p=>p.waitForFunction(()=>window.skyshiftWebsite?.diagnostics().investigation?.sequence&&!skyshiftWebsite.diagnostics().investigation.busy);
try {
  for(const width of [1440,390]) {
    const context=await browser.newContext({viewport:{width,height:900},acceptDownloads:true});
    await context.addInitScript(()=>{
      const original=HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext=function(type,...args){return /webgl/i.test(type)?null:original.call(this,type,...args);};
    });
    await context.route('**/api/**',r=>r.fulfill({status:503,body:'Injected archive service outage'}));
    const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
    await page.goto(base+'/#target-example/r-draconis-temporal');await ready(page);
    assert.equal(await page.locator('#instrument-sequence-play').isEnabled(),true);
    assert.match(await page.locator('#instrument-sequence-quality').innerText(),/checks passed; scientific review PENDING/);
    const first=await page.locator('#instrument-label-a').innerText();
    await page.click('#instrument-sequence-next');assert.notEqual(await page.locator('#instrument-label-a').innerText(),first);
    await page.click('[data-sequence-mode="wipe"]');assert.equal(await page.locator('#instrument-wipe-handle').isVisible(),true);
    await page.click('#instrument-about');assert.match(await page.locator('#instrument-information-body').innerText(),/Observation selection & bounded preflight/);
    await page.click('#instrument-information-close');
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    if(width===1440) {
      const event=page.waitForEvent('download');await page.click('#instrument-save');
      const file=evidenceFile(out,'r-draconis-investigation.zip');await(await event).saveAs(await claimEvidenceFile(file));
      await page.goto(base+'/#sequence-example');await ready(page);
      await page.setInputFiles('#instrument-file',file);await ready(page);
      assert.equal(await page.locator('#instrument-sequence-play').isEnabled(),true);
      assert.match(await page.locator('#instrument-title').innerText(),/R Draconis/);
    }
    await page.screenshot({path:await claimEvidenceFile(evidenceFile(out,`r-draconis-${width}.png`))});
    results.push({name:`Real compatible epochs, manual dates, wipe, source receipt and no-WebGL recovery at ${width}px`,status:'pass'});
    await context.close();
  }
  const context=await browser.newContext(),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  let sent;
  await context.route('**/api/capabilities',r=>r.fulfill({json:{preparation:true}}));
  await context.route('**/api/investigations',r=>{sent=r.request().postDataJSON();return r.fulfill({status:503,body:'Injected unavailable archive'});});
  await page.goto(base+'/?ra=248.16761083294998&dec=66.75497941722&fov=2.4&release=qr2&detector=2&selection=chronological&wavelength=1.217&start=2025-12-01&end=2025-12-31#sky-search');
  await page.waitForFunction(()=>document.querySelector('#search-start').value==='2025-12-01');
  await page.locator('#sky-search-options').evaluate(e=>e.open=true);
  assert.equal(await page.locator('#search-selection').inputValue(),'chronological');
  await page.click('#sky-search-prepare');
  await page.waitForFunction(()=>!document.querySelector('#sky-search-prepare').disabled);
  assert.equal(sent.selection,'chronological');assert.equal(sent.wavelength_um,1.217);
  assert.equal(sent.start_date,'2025-12-01');assert.equal(sent.end_date,'2025-12-31');
  results.push({name:'Shareable date/wavelength/mode filters reach the actual preparation request; service failure remains recoverable',status:'pass'});
  await context.close();assert.deepEqual(errors,[]);
} finally {
  await browser.close();
  await writeEvidenceFile(evidenceFile(out,'results.json'),JSON.stringify({results,page_errors:errors,scientific_approval:'PENDING',detected_physical_change:'NOT_ESTABLISHED'},null,2));
}
console.log(JSON.stringify(results));
