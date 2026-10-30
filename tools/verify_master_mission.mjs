import {createEvidenceDirectory,claimEvidenceFile,writeEvidenceFile} from './evidence-output.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {chromium} from 'file:///C:/Users/LOQ/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
const out=await createEvidenceDirectory('master-mission',process.env.SKYSHIFT_EVIDENCE_OUTPUT);
const baseline=process.argv.includes('--baseline');
const browser=await chromium.launch({headless:true,executablePath:process.env.SKYSHIFT_CHROMIUM_EXECUTABLE||'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const results=[],errors=[];
try {
 for(const width of [1440,390]) {
  const context=await browser.newContext({viewport:{width,height:1000},acceptDownloads:true});
  const page=await context.newPage();page.setDefaultTimeout(30000);page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://localhost:3000/#target-example/wise-0855');
  await page.waitForFunction(()=>window.skyshiftWebsite?.diagnostics().investigation?.sequence&&!skyshiftWebsite.diagnostics().investigation.busy);
  await page.screenshot({path:await claimEvidenceFile(path.join(out,`${baseline?'before':'after'}-${width}.png`)),fullPage:true});
  results.push({width,diagnostics:await page.evaluate(()=>skyshiftWebsite.diagnostics())});
  if(!baseline) {
   assert.equal(await page.locator('#instrument-sequence-mode').inputValue(),'survey');
   assert.equal(await page.locator('#instrument-sequence-play').isEnabled(),true);
   const start=await page.locator('#instrument-label-a').innerText();
   await page.locator('#instrument-sequence-speed').selectOption('1500');
   await page.locator('#instrument-sequence-play').click();
   await page.waitForFunction(()=>skyshiftWebsite.diagnostics().investigation.sequence.index===1);
   await page.locator('#instrument-sequence-play').click();
   assert.notEqual(await page.locator('#instrument-label-a').innerText(),start);
   assert.match(await page.locator('#instrument-sequence-quality').innerText(),/Survey Timeline/);
   await page.locator('#instrument-sequence-mode').selectOption('matched');
   assert.equal(await page.locator('#instrument-sequence-play').isEnabled(),false);
   await page.locator('#instrument-sequence-mode').selectOption('survey');
   await page.locator('#instrument-sequence-scrub').fill('0');
   assert.equal(await page.evaluate(()=>skyshiftWebsite.diagnostics().investigation.sequence.index),0);
   const saved=page.waitForEvent('download');await page.locator('#instrument-save').click();
   const zip=path.join(out,`survey-${width}.zip`);await(await saved).saveAs(await claimEvidenceFile(zip));
   await page.setInputFiles('#instrument-file',zip);
   await page.waitForFunction(()=>skyshiftWebsite.diagnostics().investigation.sequence?.index===0&&!skyshiftWebsite.diagnostics().investigation.busy);
   assert.equal(await page.locator('#instrument-sequence-mode').inputValue(),'survey');
   await page.goto('http://localhost:3000/#target-example/r-draconis-temporal');
   await page.waitForFunction(()=>skyshiftWebsite.diagnostics().investigation.sequence?.frames===2&&!skyshiftWebsite.diagnostics().investigation.busy);
   await page.locator('#instrument-native-toggle').click();
   await page.waitForFunction(()=>skyshiftWebsite.diagnostics().investigation.native?.loaded);
   assert.ok(await page.locator('.inline-native canvas').isVisible());
   assert.match(await page.locator('.inline-native').innerText(),/single observation/i);
   await page.screenshot({path:await claimEvidenceFile(path.join(out,`native-${width}.png`)),fullPage:true});
   await page.locator('#instrument-native-toggle').click();
   await page.locator('#instrument-sequence-mode').selectOption('matched');
   assert.equal(await page.locator('#instrument-sequence-play').isEnabled(),true);
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   await page.emulateMedia({reducedMotion:'reduce'});
   await page.reload();await page.waitForFunction(()=>window.skyshiftWebsite?.diagnostics().investigation?.sequence&&!skyshiftWebsite.diagnostics().investigation.busy);
   assert.equal(await page.locator('#instrument-sequence-play').isEnabled(),false);
  }
  await context.close();
 }
 assert.deepEqual(errors,[]);
 await writeEvidenceFile(path.join(out,'results.json'),JSON.stringify({baseline,results,errors},null,2));
 console.log(JSON.stringify({status:'pass',out,baseline}));
} finally {await browser.close();}
