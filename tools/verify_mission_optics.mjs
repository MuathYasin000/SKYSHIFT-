import {createEvidenceDirectory,evidenceFile,writeEvidenceFile,claimEvidenceFile} from './evidence-output.mjs';
const evidenceRun=await createEvidenceDirectory('verify_mission_optics',process.env.SKYSHIFT_EVIDENCE_OUTPUT);
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
const {chromium}=await import(pathToFileURL(process.env.SKYSHIFT_PLAYWRIGHT_MODULE||'C:/Users/LOQ/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs'));
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const p=await browser.newPage({viewport:{width:390,height:1000},reducedMotion:'reduce'}),results=[],errors=[];
p.on('pageerror',e=>errors.push(e.message));
try{
 await p.goto('http://localhost:3000/#universe');
 await p.waitForFunction(()=>window.skyshiftSpace?.diagnostics().frames>0);
 await p.click('#hangar-toggle');
 await p.waitForFunction(()=>skyshiftSpace.diagnostics().loaded_telescopes.length===3);
 for(const width of [390,1440]){
  await p.setViewportSize({width,height:1000});
  for(const id of ['spherex','webb-b','hubble']){
   if(id!=='spherex'&&!(await p.locator(`[data-telescope="${id}"]`).isVisible()))await p.click('#hangar-toggle');
   await p.click(`[data-telescope="${id}"]`);
   await p.click('[data-observe-stage="1"]');
   await p.click('#optics-expand');
   await p.locator('#optics-dialog[open]').waitFor();
   const appearance=await p.locator('#optics-expanded svg').evaluate(e=>{
    const s=getComputedStyle(e.querySelector('text'));
    return {width:e.getBoundingClientRect().width,viewbox:e.viewBox.baseVal.width,font:parseFloat(s.fontSize),fill:s.fill,stroke:getComputedStyle(e.querySelector('.optics-path.current')).stroke};
   });
   assert.ok(appearance.font*appearance.width/appearance.viewbox>=12);
   assert.equal(appearance.fill,'rgb(255, 255, 255)');
   assert.equal(appearance.stroke,'rgb(252, 61, 33)');
   await p.screenshot({path:await claimEvidenceFile(evidenceFile(evidenceRun,`tmp/mission-control/optics-${id}-${width}.png`))});
   await p.evaluate(await fs.readFile('tools/vendor/axe.min.js','utf8'));
   const violations=await p.evaluate(async()=> (await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})).violations.map(v=>v.id));
   assert.deepEqual(violations,[]);
   await p.keyboard.press('Escape');await p.click('#mission-close');
   results.push({mission:id,width,status:'pass',appearance});console.log(`PASS ${id} / ${width}px`);
  }
 }
 assert.deepEqual(errors,[]);
}catch(e){console.error(e.stack);process.exitCode=1;}
finally{await writeEvidenceFile(evidenceFile(evidenceRun,'docs/evidence/mission_control_optics_tests.json'),JSON.stringify({recorded_at_utc:new Date().toISOString(),results,page_errors:errors,limits:['Original explanatory schematics, not measured optical ray traces.','Local automated browser and emulated widths; no qualified scientific approval inferred.']},null,2)+'\n');await browser.close();}
