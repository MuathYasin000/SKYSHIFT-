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
  if(!baseline)await context.addInitScript(()=>{const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return /webgl/i.test(type)?null:get.call(this,type,...args);};});
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
   await context.route('**/api/**',r=>r.fulfill({status:503,body:'Injected API outage'}));
   await context.route('**/data/native/catalog.json',r=>r.fulfill({status:503,body:'No installed native catalog; the live-sequence payload must supply its own original'}));
   await page.goto('http://localhost:3000/#target-example/m101-time-explorer');
   await page.waitForFunction(()=>window.skyshiftWebsite?.diagnostics().investigation?.sequence&&!skyshiftWebsite.diagnostics().investigation.busy);
   assert.equal(await page.locator('#instrument-sequence-mode').inputValue(),'matched');
   await page.locator('#instrument-native-toggle').click();await page.waitForFunction(()=>skyshiftWebsite.diagnostics().investigation.native?.loaded);
   const original=await page.evaluate(()=>skyshiftWebsite.diagnostics().investigation.native);
   assert.ok(original.shape[0]*original.shape[1]>20000);
   await page.locator('.inline-native canvas').focus();await page.keyboard.press('Home');await page.keyboard.press('Enter');
   await page.evaluate(await fs.readFile('tools/vendor/axe.min.js','utf8'));
   const violations=await page.evaluate(async()=>{const r=await axe.run(document.querySelector('#space-workspace'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}});return r.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}));});assert.deepEqual(violations,[]);
   await page.screenshot({path:await claimEvidenceFile(path.join(out,`m101-native-${width}.png`)),fullPage:true});
   await page.locator('#instrument-native-toggle').click();
   const timings=[];
   for(let i=0;i<8;i++){const began=Date.now();await page.locator('#instrument-sequence-next').click();timings.push(Date.now()-began);}
   results.push({width,case:'M101 live-discovered cached example',native:original,cached_step_roundtrip_ms:timings,conditions:'Local isolated installed browser; includes Playwright click scheduling, no FPS or internet performance claim.'});
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
