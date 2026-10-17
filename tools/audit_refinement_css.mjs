import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
const {chromium}=await import(pathToFileURL(process.env.SKYSHIFT_PLAYWRIGHT_MODULE||'C:/Users/LOQ/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs'));
const phase=process.argv[2]||'before',browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const p=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'reduce'});
try{
 await p.coverage.startCSSCoverage({resetOnNavigation:false});
 for(const width of [1440,390]){
  await p.setViewportSize({width,height:width===390?844:900});
  for(const route of ['/','/compare.html','/explore.html','/discover.html','/methodology.html','/guide.html','/#universe','/#compare']){
   await p.goto('http://localhost:3000'+route);await p.evaluate(()=>document.fonts.ready);
   if(route.includes('universe'))await p.waitForFunction(()=>window.skyshiftSpace?.diagnostics().frames>0);
   if(route==='/#compare')await p.waitForFunction(()=>window.skyshiftWebsite?.diagnostics().investigation.opened&&!skyshiftWebsite.diagnostics().investigation.busy&&!skyshiftWebsite.diagnostics().navigation.active);
   await p.evaluate(()=>document.querySelectorAll('details').forEach(e=>e.open=true));
   if(route==='/#compare')for(const id of ['instrument-about','instrument-display','instrument-notes','instrument-evidence']){await p.click('#'+id);if(await p.locator('#instrument-panel-close').isVisible())await p.click('#instrument-panel-close');else await p.keyboard.press('Escape');}
   if(route.includes('universe')){await p.click('#context-toggle');await p.click('#destinations-toggle');await p.click('#settings-button');await p.keyboard.press('Escape');}
   await p.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  }
 }
 const coverage=await p.coverage.stopCSSCoverage(),unique=new Map();
 for(const e of coverage){const key=e.url+createHash('sha256').update(e.text).digest('hex');if(!unique.has(key))unique.set(key,{url:e.url,bytes:Buffer.byteLength(e.text),ranges:[]});unique.get(key).ranges.push(...e.ranges);}
 const files=[...unique.values()].map(e=>{const ranges=e.ranges.sort((a,b)=>a.start-b.start),merged=[];for(const r of ranges){const last=merged.at(-1);if(last&&r.start<=last.end)last.end=Math.max(last.end,r.end);else merged.push({...r});}return {url:e.url,bytes:e.bytes,used_source_characters:merged.reduce((sum,r)=>sum+r.end-r.start,0),used_ranges:merged.length};});
 await fs.mkdir('tmp/refinement/'+phase,{recursive:true});await fs.writeFile(`tmp/refinement/${phase}/css-coverage.json`,JSON.stringify({phase,recorded_at_utc:new Date().toISOString(),scope:'Chromium CSS coverage across eight routes, both requested widths, open disclosures and representative scientific/Universe panels. Unused coverage alone does not prove a dynamic selector is safe to remove.',files},null,2)+'\n');console.log(files.filter(f=>/components|shell-/.test(f.url)));
}finally{await browser.close();}
