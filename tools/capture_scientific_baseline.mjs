import fs from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {createEvidenceDirectory} from './evidence-output.mjs';
const {chromium}=await import(pathToFileURL('C:/Users/LOQ/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs'));
const out=pathToFileURL((await createEvidenceDirectory('scientific-baseline',process.env.SKYSHIFT_EVIDENCE_OUTPUT))+'/');
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const results=[];
try {
 for(const [target,route] of [['m101','#compare'],['r-draconis','#target-example/r-draconis-temporal']]) {
  const page=await browser.newPage({viewport:{width:1440,height:1080}});
  await page.goto('http://localhost:3000/'+route);
  await page.waitForFunction(()=>window.skyshiftWebsite?.diagnostics().investigation?.kind&&!skyshiftWebsite.diagnostics().investigation.busy);
  await page.locator('#instrument-canvas-a').screenshot({path:new URL(`before-${target}-canvas.png`,out).pathname.replace(/^\/(\w:)/,'$1')});
  await page.screenshot({path:new URL(`before-${target}.png`,out).pathname.replace(/^\/(\w:)/,'$1'),fullPage:true});
  results.push({target,diagnostics:await page.evaluate(()=>skyshiftWebsite.diagnostics()),canvas:await page.locator('#instrument-canvas-a').boundingBox()});
  await page.close();
 }
 await fs.writeFile(new URL('before.json',out),JSON.stringify(results,null,2),{flag:'wx'});
}finally{await browser.close();}
