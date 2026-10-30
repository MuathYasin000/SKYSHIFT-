import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {chromium} from 'file:///C:/Users/LOQ/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import {createEvidenceDirectory,claimEvidenceFile,writeEvidenceFile} from './evidence-output.mjs';
const out=await createEvidenceDirectory('irsa-upgrade-browser',process.env.SKYSHIFT_EVIDENCE_OUTPUT);
const reference=JSON.parse(await fs.readFile(process.env.SKYSHIFT_MOSAIC_REFERENCE,'utf8'));
const metadataProvider=process.env.SKYSHIFT_METADATA_PROVIDER||'sia2';
assert.ok(['sia2','tap'].includes(metadataProvider));
const browser=await chromium.launch({headless:true,executablePath:process.env.SKYSHIFT_CHROMIUM_EXECUTABLE||'C:/Program Files/Google/Chrome/Application/chrome.exe'}),results=[],errors=[];
try{
 for(const width of [1440,390]){
  const context=await browser.newContext({viewport:{width,height:1000},acceptDownloads:true,reducedMotion:'reduce'});
  await context.addInitScript(()=>{const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return /webgl/i.test(type)?null:get.call(this,type,...args);};});
  const p=await context.newPage();p.setDefaultTimeout(25000);p.on('pageerror',e=>errors.push(e.message));
  await p.goto('http://localhost:3000/#sky-map/m101');await p.waitForFunction(()=>window.skyshiftWebsite?.diagnostics().sky_map?.loaded);
  assert.equal(await p.locator('#map-plane').inputValue(),'63');assert.match(await p.locator('#map-status').innerText(),/not a time sequence/);
  const pixels=await p.evaluate(()=>skyshiftWebsite.skyMapPixels()),hash=createHash('sha256').update(new Uint8Array(pixels)).digest('hex');assert.equal(hash,reference.rgba_sha256);
  const sky=await p.evaluate(async samples=>{const {pixelToSky}=await import('./science.js');const m=await fetch('./data/mosaics/m101-v1/manifest.json').then(r=>r.json());return samples.map(s=>pixelToSky(s.x,s.y,m.wcs));},reference.wcs_samples);
  sky.forEach((s,i)=>{assert.ok(Math.abs(s.ra_deg-reference.wcs_samples[i].ra_deg)<1e-9);assert.ok(Math.abs(s.dec_deg-reference.wcs_samples[i].dec_deg)<1e-9);});
  await p.locator('#map-canvas').focus();await p.keyboard.press('Enter');const selected=await p.evaluate(()=>skyshiftWebsite.diagnostics().sky_map.selected);
  const handoff=new URL(await p.locator('#map-dates').getAttribute('href'));assert.equal(Number(handoff.searchParams.get('ra')),selected.ra_deg);assert.equal(Number(handoff.searchParams.get('dec')),selected.dec_deg);
  for(const plane of [1,102,63]){await p.locator('#map-plane').fill(String(plane));await p.waitForFunction(n=>skyshiftWebsite.diagnostics().sky_map?.loaded&&skyshiftWebsite.diagnostics().sky_map.plane===n,plane);}
  await p.locator('#map-limits').selectOption('zscale');await p.locator('#map-palette').selectOption('grayscale');await p.locator('#map-one').click();await p.locator('#map-fit').click();
  await p.locator('#map-limits').selectOption('percentile');await p.locator('#map-palette').selectOption('ember');await p.evaluate(()=>{document.activeElement?.blur();window.scrollTo(0,0);});
  await p.screenshot({path:await claimEvidenceFile(path.join(out,`m101-${width}.png`)),fullPage:true});
  await p.evaluate(await fs.readFile('tools/vendor/axe.min.js','utf8'));assert.deepEqual(await p.evaluate(async()=>{const r=await axe.run(document.querySelector('#sky-map-workspace'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}});return r.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}));}),[]);
  for(const [id,label] of [['cygnus','Cygnus · stars & dust'],['ngc1760','NGC 1760 · star-forming nebula']]){await p.getByRole('button',{name:label,exact:true}).click();await p.waitForFunction(id=>skyshiftWebsite.diagnostics().sky_map?.id===id&&skyshiftWebsite.diagnostics().sky_map.loaded,id);assert.equal(await p.locator('#map-controls').isVisible(),false);assert.match(await p.locator('#map-pixel').innerText(),/no independently validated pixel WCS/);await p.screenshot({path:await claimEvidenceFile(path.join(out,`${id}-${width}.png`)),fullPage:true});}
  assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await p.goto('http://localhost:3000/#target-example/m101-time-explorer');await p.waitForFunction(()=>window.skyshiftWebsite?.diagnostics().investigation?.sequence&&!skyshiftWebsite.diagnostics().investigation.busy);assert.equal(await p.locator('#instrument-mosaic').isVisible(),true);const navigationStart=await p.evaluate(()=>performance.timeOrigin);await p.locator('#instrument-mosaic').click();await p.waitForFunction(()=>window.skyshiftWebsite?.diagnostics().sky_map?.loaded);assert.match(p.url(),/ra=.*#sky-map\/m101/);assert.equal(await p.evaluate(()=>performance.timeOrigin),navigationStart);await p.locator('#map-dates').click();await p.waitForFunction(()=>skyshiftWebsite.diagnostics().surface==='home');assert.equal(await p.evaluate(()=>performance.timeOrigin),navigationStart);assert.equal(Number(await p.locator('#search-ra').inputValue()),210.80227);
  if(width===1440){await p.locator('#search-ra').fill('210.8022671');await p.locator('#sky-search-options').evaluate(e=>e.open=true);await p.locator('#search-metadata-provider').selectOption(metadataProvider);await p.locator('#sky-search-discover').click();await p.waitForFunction(()=>document.querySelector('#sky-search-status').textContent.includes('metadata rows across supported collections'),null,{timeout:180000});assert.match(await p.locator('#sky-search-status').innerText(),/\d+ metadata rows/);const download=p.waitForEvent('download');await p.getByRole('button',{name:'Save archive metadata receipt'}).click();await(await download).saveAs(await claimEvidenceFile(path.join(out,'metadata-receipt.json')));const metadata=JSON.parse(await fs.readFile(path.join(out,'metadata-receipt.json'),'utf8'));assert.equal(metadata.kind,'spherex_archive_discovery');assert.equal(metadata.metadata_provider,metadataProvider);assert.equal(metadata.collections.length,4);assert.ok(metadata.metadata_rows>0);assert.equal(metadata.status,'complete');}
  results.push({width,status:'pass',source_reference_rgba_sha256:hash,wcs_samples:5,diagnostics:await p.evaluate(()=>skyshiftWebsite.diagnostics().sky_map)});await context.close();
 }
 assert.deepEqual(errors,[]);
 await writeEvidenceFile(path.join(out,'results.json'),JSON.stringify({browser:await browser.version(),metadataProvider,results,errors,scope:'Installed isolated browser; mobile emulation, not human or physical-device review'},null,2));console.log(JSON.stringify({status:'pass',out}));
}finally{await browser.close();}
