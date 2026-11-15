import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
const {chromium}=await import(pathToFileURL('C:/Users/LOQ/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs'));
const root=path.resolve(import.meta.dirname,'..'),out=process.env.SKYSHIFT_EVIDENCE_OUTPUT||path.join(root,'docs/evidence','native-display-'+new Date().toISOString().replace(/[:.]/g,'-'));
await fs.mkdir(out,{recursive:false});
const catalog=JSON.parse(await fs.readFile(path.join(root,'web/dist/data/native/catalog.json')));
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'}),errors=[],results=[];
try{
 for(const width of [1440,390]){
  const context=await browser.newContext({viewport:{width,height:1100},acceptDownloads:true});
  await context.route('**/api/**',r=>r.fulfill({status:503,body:'Injected archive outage; native viewer must use its verified local assets'}));
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  for(const entry of width===1440?catalog.entries:[catalog.entries[0],catalog.entries[2]]){
   await page.goto('http://localhost:3000/native.html?source='+entry.source_sha256);
   await page.waitForFunction(id=>window.skyshiftNative?.diagnostics().id===id&&skyshiftNative.diagnostics().shape,entry.id);
   await page.waitForFunction(()=>skyshiftNative.diagnostics().reference);
   assert.equal(await page.locator('#native-title').innerText(),(entry.field==='m101'?'M101':'R Draconis')+' / '+entry.observation_id);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);
   const diagnostics=await page.evaluate(()=>skyshiftNative.diagnostics());
   if(width===1440){
    const pixels=await page.evaluate(()=>skyshiftNative.renderPixels());
    await fs.writeFile(path.join(out,entry.id+'-browser.rgba'),Buffer.from(pixels));
    const a=await page.locator('#native-canvas').screenshot(),b=await page.locator('#native-canvas').screenshot();assert.deepEqual(a,b,'Stable visual regression');
    await fs.writeFile(path.join(out,entry.id+'-canvas.png'),a);
    await page.locator('#native-1x').click();assert.equal((await page.evaluate(()=>skyshiftNative.diagnostics())).scale,1);
    await page.locator('#native-plus').click();assert.equal((await page.evaluate(()=>skyshiftNative.diagnostics())).scale,2);
    await page.locator('#native-limits').selectOption('zscale');
    await page.locator('#native-stretch').selectOption('linear');
    await page.locator('#native-palette').selectOption('ice');
    await page.locator('#native-mask').selectOption('excluded');
    await page.locator('#native-contrast').fill('2');await page.locator('#native-contrast').dispatchEvent('input');
    assert.equal((await page.evaluate(()=>skyshiftNative.diagnostics())).settings.contrast,2);
    const download=page.waitForEvent('download');await page.locator('#native-save').click();
    const file=path.join(out,entry.id+'-display.json');await(await download).saveAs(file);
    const receipt=JSON.parse(await fs.readFile(file));assert.equal(receipt.source.sha256,entry.source_sha256);assert.equal(receipt.settings.mask,'excluded');assert.equal(receipt.physical_change,'NOT_ESTABLISHED');
    await page.locator('#native-reset').click();
   }
   await page.evaluate(()=>{document.activeElement?.blur();window.scrollTo({top:0,behavior:'instant'});});
   await page.screenshot({path:path.join(out,`after-${entry.id}-${width}.png`),fullPage:true});
   results.push({test:'Native identity, diagnostics, reference, controls, no horizontal overflow',id:entry.id,width,diagnostics,status:'pass'});
  }
  await context.close();
 }
 const context=await browser.newContext(),page=await context.newPage();
 await context.route('**/data/native/m101-*.json',async r=>{
  if(r.request().url().endsWith('-reference.json'))return r.continue();
  const response=await r.fetch(),p=await response.json();p.arrays.SCI.data=p.arrays.SCI.data.replace(/^./,p.arrays.SCI.data[0]==='A'?'B':'A');return r.fulfill({json:p});
 });
 await page.goto('http://localhost:3000/native.html');await page.waitForFunction(()=>document.querySelector('#native-status').textContent.includes('checksum mismatch'));
 assert.equal(await page.evaluate(()=>skyshiftNative.renderPixels()),null);results.push({test:'Tampered native payload never rendered',status:'pass'});await context.close();
 const gates=await browser.newPage({viewport:{width:1440,height:1100}});gates.on('pageerror',e=>errors.push(e.message));
 await gates.goto('http://localhost:3000/#compare');await gates.waitForSelector('#instrument-native');
 await gates.waitForFunction(()=>window.skyshiftWebsite?.diagnostics().investigation?.kind==='pair'&&!skyshiftWebsite.diagnostics().investigation.busy);
 assert.match(await gates.locator('#instrument-native').getAttribute('href'),/native.html\?source=48acaf/);
 await gates.screenshot({path:path.join(out,'after-comparison-link.png'),fullPage:true});await gates.close();
 assert.deepEqual(errors,[]);
}finally{
 await browser.close();await fs.writeFile(path.join(out,'browser-results.json'),JSON.stringify({results,errors,scientific_approval:'PENDING'},null,2));
}
console.log(JSON.stringify(results.map(({test,id,width,status})=>({test,id,width,status}))));
