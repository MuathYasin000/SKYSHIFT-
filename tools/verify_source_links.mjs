import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
const {chromium}=await import(pathToFileURL('C:/Users/LOQ/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs'));
const out='tmp/source-links',results=[],errors=[],failed=[],httpErrors=[];
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const c=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:'reduce',acceptDownloads:true});
const p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text());});p.on('requestfailed',r=>{if(!/ERR_ABORTED/.test(r.failure()?.errorText||''))failed.push(r.url());});p.on('response',r=>{if(r.status()>=400)httpErrors.push({url:r.url(),status:r.status()});});
const records=[['models','assets/space/manifest.json'],['fonts','assets/fonts/mission-fonts.json'],['patterns','vendor/ui-patterns/sources.json'],['libraries','vendor/scroll/manifest.json']];
const hash=b=>createHash('sha256').update(b).digest('hex');
try{
 for(const page of ['index','compare','explore','discover','methodology','guide','classic-home']){
  await p.goto('http://localhost:3000/'+page+'.html');
  for(const [id]of records){const a=p.locator('.site-footer a[href="./methodology.html#'+id+'"]');assert.equal(await a.count(),1);assert.equal(await a.getAttribute('target'),null);}
  results.push({check:page+' footer uses all four readable same-tab destinations',status:'pass'});
 }
 for(const [width,height]of [[1440,900],[390,844]]){
  await p.setViewportSize({width,height});
  for(const [id,file]of records){
   await p.goto('http://localhost:3000/');await p.waitForFunction(()=>document.body.dataset.controller==='ready');
   if(id!=='models')await p.locator('#footer-credits').evaluate(e=>e.open=true);
   await p.locator('.site-footer a[href="./methodology.html#'+id+'"]').click();
   await p.waitForURL('**/methodology.html#'+id);await p.evaluate(()=>document.fonts.ready);
   const section=p.locator('#'+id);assert.ok(await section.isVisible());assert.ok(await section.locator('h2').isVisible());
   await section.locator('details').first().locator('summary').click();
   assert.equal(await section.locator('details').first().getAttribute('open'),'');
   const metrics=await section.locator('h2').evaluate(e=>({top:e.getBoundingClientRect().top,overflow:document.documentElement.scrollWidth>innerWidth}));assert.equal(metrics.overflow,false);assert.ok(metrics.top>=0&&metrics.top<height,JSON.stringify(metrics));
   await p.screenshot({path:`${out}/${id}-${width}.png`});
   if(width===1440){const event=p.waitForEvent('download');await section.locator('a[download]').click();const d=await event,path=await d.path();assert.equal(hash(await fs.readFile(path)),hash(await fs.readFile('web/dist/'+file)));}
   results.push({check:`${id} ${width}px navigation, readable records and ${width===1440?'byte-identical JSON download':'responsive layout'}`,status:'pass',metrics});
  }
 }
 // No JavaScript is required to read or link to these records.
 const nojs=await browser.newContext({javaScriptEnabled:false}),q=await nojs.newPage();await q.goto('http://localhost:3000/methodology.html#fonts');for(const [id]of records)assert.ok(await q.locator('#'+id+' h2').isVisible());await nojs.close();results.push({check:'All four source sections exist and remain readable without JavaScript',status:'pass'});
 assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);assert.deepEqual(httpErrors,[]);
}catch(e){console.error(e.stack);process.exitCode=1;await p.screenshot({path:out+'/failure.png'}).catch(()=>{});}
finally{await fs.writeFile('docs/evidence/readable_source_links_tests.json',JSON.stringify({recorded_at_utc:new Date().toISOString(),browser:browser.version(),results,page_errors:errors,failed_requests:failed,http_errors:httpErrors,scope:'Local Chromium; mobile sizes emulated. JSON download bytes compared against the original unchanged records.'},null,2)+'\n');await browser.close();}
