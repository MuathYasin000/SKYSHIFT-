import fs from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
const {chromium}=await import(pathToFileURL(process.env.SKYSHIFT_PLAYWRIGHT_MODULE||'C:/Users/LOQ/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs'));
const phase=process.argv[2]||'before',out=`tmp/refinement/${phase}`;
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const p=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'reduce'}),results=[],errors=[],failed=[];
p.on('pageerror',e=>errors.push(e.message));p.on('requestfailed',r=>{if(!/ERR_ABORTED/.test(r.failure()?.errorText||''))failed.push({url:r.url(),error:r.failure()?.errorText});});
const routes=[['home','/'],['compare','/compare.html'],['explore','/explore.html'],['discover','/discover.html'],['methodology','/methodology.html'],['guide','/guide.html'],['universe','/#universe'],['native-compare','/#compare']];
try{
 for(const [width,height]of [[1440,900],[390,844]]){
  await p.setViewportSize({width,height});
  for(const [name,route]of routes){
   await p.goto('http://localhost:3000'+route);
   if(name==='compare'){await p.locator('#workspace:not([hidden])').waitFor();if(await p.locator('#overlay-mode').getAttribute('aria-pressed')!=='true')await p.click('#overlay-mode');}
   if(name==='home'){if(width>800)await p.waitForFunction(()=>window.skyshiftHero?.diagnostics().model?.frames>0);await p.waitForFunction(()=>document.body.dataset.controller==='ready');await p.locator('.field-card').first().waitFor();}
   if(name==='compare')await p.locator('#workspace:not([hidden])').waitFor();
   if(name==='native-compare')await p.waitForFunction(()=>window.skyshiftWebsite?.diagnostics().investigation.opened&&!skyshiftWebsite.diagnostics().investigation.busy);
   if(name==='explore')await p.locator('#explore-content:not([hidden])').waitFor();
   if(name==='universe'){await p.waitForFunction(()=>window.skyshiftSpace?.diagnostics().earth_context?.state==='ready');await p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));}
   await p.evaluate(()=>document.fonts.ready);
   await p.screenshot({path:`${out}/${name}-${width}.png`});
   const metrics=await p.evaluate(()=>{const rect=e=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height}};return {overflow:document.documentElement.scrollWidth>innerWidth,workspace:document.querySelector('#workspace')?rect(document.querySelector('#workspace')):null,stamps:[...document.querySelectorAll('.canvas-stamp')].map(rect),principles:[...document.querySelectorAll('.trust-section article')].map(e=>({icons:e.querySelectorAll('svg').length,numerals:e.querySelectorAll('.principle-number').length})),hero:document.querySelector('h1 em')?{color:getComputedStyle(document.querySelector('h1 em')).color,stroke:getComputedStyle(document.querySelector('h1 em')).webkitTextStrokeWidth}:null};});
   results.push({page:name,viewport:[width,height],metrics});
   if(name==='home'){
    await p.screenshot({path:`${out}/home-full-${width}.png`,fullPage:true});
    await p.locator('.trust-section').screenshot({path:`${out}/principles-${width}.png`});
    await p.locator('.hero-spectrum').scrollIntoViewIfNeeded();await p.screenshot({path:`${out}/ruler-${width}.png`});
   }
   if(name==='compare'){
    await p.locator('#workspace').scrollIntoViewIfNeeded();await p.screenshot({path:`${out}/viewer-${width}.png`});
    await p.locator('#side-mode').click();await p.screenshot({path:`${out}/both-panels-${width}.png`});
   }
   console.log(`${phase}: ${name} ${width}`);
  }
 }
 await fs.writeFile(`${out}/metrics.json`,JSON.stringify({phase,recorded_at_utc:new Date().toISOString(),browser:browser.version(),results,page_errors:errors,failed_requests:failed},null,2)+'\n');
}finally{await browser.close();}

