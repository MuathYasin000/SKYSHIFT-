import {createEvidenceDirectory,evidenceFile,writeEvidenceFile,claimEvidenceFile} from './evidence-output.mjs';
const evidenceRun=await createEvidenceDirectory('verify_link_audit',process.env.SKYSHIFT_EVIDENCE_OUTPUT);
// Installed Chromium, actual static package and its unchanged production CSP.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
const {chromium}=await import(pathToFileURL('C:/Users/LOQ/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs'));
const origin='http://localhost:3001',out=evidenceRun,results=[],errors=[],failed=[],csp=[],consoleErrors=[],httpErrors=[];

const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const context=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:'reduce',acceptDownloads:true});
let p=await context.newPage();
p.on('pageerror',e=>errors.push(e.message));
p.on('console',m=>{if(m.type()==='error')consoleErrors.push(m.text());});
p.on('requestfailed',r=>{if(!/ERR_ABORTED/.test(r.failure()?.errorText||''))failed.push({url:r.url(),error:r.failure()?.errorText});});
p.on('response',r=>{if(r.status()>=400)httpErrors.push({url:r.url(),status:r.status()});});
await context.addInitScript(()=>{window.__csp=[];document.addEventListener('securitypolicyviolation',e=>window.__csp.push({directive:e.effectiveDirective,blocked:e.blockedURI}));});
async function check(name,fn){try{const detail=await fn();results.push({name,status:'pass',detail});console.log('PASS '+name);}catch(e){results.push({name,status:'fail',error:e.message});throw e;}}
async function ready(route){
 if(/#(?:compare|observations)/.test(route))await p.waitForFunction(()=>window.skyshiftWebsite?.diagnostics().investigation.opened&&!skyshiftWebsite.diagnostics().investigation.busy&&!skyshiftWebsite.diagnostics().navigation.active);
 else if(route.includes('#universe'))await p.waitForFunction(()=>window.skyshiftSpace?.diagnostics().frames>0);
 else if(/explore/.test(route))await p.locator('#explore-content:not([hidden])').waitFor();
 else if(/compare\.html/.test(route))await p.locator('#workspace:not([hidden])').waitFor();
 else if(/index|\/$/.test(route))await p.waitForFunction(()=>document.body.dataset.controller==='ready');
 if(/methodology/.test(route))await p.locator('#imagery-credits img').nth(4).waitFor();
 await p.evaluate(()=>document.fonts.ready);
}
try{
 const policy=(await fs.readFile('tmp/skyshift-upload/dist/_headers','utf8')).match(/Content-Security-Policy: (.*)/)[1].trim();
 for(const route of ['/index.html','/compare.html','/explore.html','/discover.html','/methodology.html','/guide.html','/classic-home.html','/index.html#observations','/index.html#compare','/index.html#universe','/index.html#mission','/explore.html?field=m101#explorer']){
  await check('CSP page '+route,async()=>{
   await p.goto('about:blank');
   const response=await p.goto(origin+route);assert.equal(response.status(),200);assert.equal(response.headers()['content-security-policy'],policy);await ready(route);
   const violations=await p.evaluate(()=>window.__csp);csp.push(...violations);assert.deepEqual(violations,[]);
   if(route==='/methodology.html'){assert.match(await p.locator('#spectral-screen-detail').innerText(),/0\.247.*0\.25.*not a NASA standard/);assert.equal(await p.locator('#imagery-credits img[src$=".webp"]').count(),1);}
   if(route==='/compare.html'){await p.locator('#checks').evaluate(e=>e.closest('details').open=true);assert.match(await p.locator('#checks').innerText(),/0\.247.*0\.25.*not a NASA standard/);}
   return {status:response.status(),csp_violations:violations.length};
  });
 }
 await check('Source links are hidden until assigned; telescope image sources wait for verification',async()=>{
  await p.goto(origin+'/explore.html');await ready('/explore.html');assert.equal(await p.locator('#object-source').isVisible(),true);assert.match(await p.locator('#object-source').getAttribute('href'),/^https:/);
  await p.goto(origin+'/index.html#universe');await ready('#universe');assert.equal(await p.locator('#mission-image-source').getAttribute('hidden'),'');
  await p.click('[data-telescope="spherex"]');assert.equal(await p.locator('#mission-source').isVisible(),true);
  await p.click('[data-observe-stage="2"]');await p.waitForFunction(()=>!document.getElementById('mission-image-source').hidden);assert.equal(await p.locator('#mission-image-source').getAttribute('href'),'https://www.jpl.nasa.gov/images/pia26600-spherexs-first-all-sky-map/');
  return {published_source:'Shown only after image SHA-256 validation and decode'};
 });
 await check('Repeated current route returns to top and re-enters the route',async()=>{
  await p.goto(origin+'/index.html#compare');await ready('#compare');await p.evaluate(()=>scrollTo(0,400));await p.click('.site-navigation [data-route="compare"]');await p.waitForFunction(()=>scrollY===0&&!skyshiftWebsite.diagnostics().navigation.active);assert.equal(await p.evaluate(()=>skyshiftWebsite.diagnostics().surface),'science');
 });
 await check('Root-URL home links preserve the live scientific controller',async()=>{
  await p.goto(origin+'/#compare');await ready('#compare');await p.evaluate(()=>window.__sameController=skyshiftWebsite);
  await p.click('.site-brand');await p.waitForFunction(()=>window.skyshiftWebsite?.diagnostics().surface==='home');
  assert.equal(await p.evaluate(()=>window.__sameController===skyshiftWebsite),true);
  await p.click('.site-navigation [data-route="compare"]');await ready('#compare');assert.equal(await p.evaluate(()=>window.__sameController===skyshiftWebsite),true);
 });
 await check('Modified, middle-button, target and download clicks are not intercepted',async()=>{
  await p.goto(origin+'/index.html');await ready('/index.html');
  const changes=await p.evaluate(()=>{
   const a=document.querySelector('.site-navigation [data-route="compare"]'),records=[];
   // Observe after the real bubbling interceptor, then suppress native navigation
   // in this one synthetic-event check so no unwanted browser windows persist.
   for(const props of [{ctrlKey:true},{metaKey:true},{shiftKey:true},{altKey:true},{button:1},{target:true},{download:true}]){
    if(props.target)a.setAttribute('target','_blank');if(props.download)a.setAttribute('download','');
    let cancelled;const listener=e=>{cancelled=e.defaultPrevented;e.preventDefault();};window.addEventListener('click',listener,{once:true});
    a.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,button:0,...props}));records.push({props,intercepted:cancelled});a.removeAttribute('target');a.removeAttribute('download');
   }return records;
  });for(const r of changes)assert.equal(r.intercepted,false);return changes;
 });
 await check('Pretty URLs highlight the same navigation routes',async()=>{
  const records=[];
  for(const [path,route]of [['compare','compare'],['explore','observations'],['discover','discover'],['methodology','methodology']]){
   await p.route(origin+'/'+path,async r=>{const response=await r.fetch({url:origin+'/'+path+'.html'});await r.fulfill({response});});
   await p.goto(origin+'/'+path);await p.waitForFunction(()=>!!document.body.dataset.route);assert.equal(await p.locator('body').getAttribute('data-route'),route);assert.equal(await p.locator('.site-navigation [aria-current="page"]').getAttribute('data-route'),route);await p.unroute(origin+'/'+path);records.push({path,route});
  }return {records,note:'HTML served at extensionless URL with a test rewrite; provider-specific rewrites are not assumed.'};
 });
 await p.goto(origin+'/index.html');await ready('/index.html');await p.locator('.field-card').first().waitFor();
 const links=await p.locator('header.site-header a, main a, footer.site-footer a').evaluateAll(es=>es.filter(e=>!e.closest('main')||e.checkVisibility()).map((e,i)=>({href:e.getAttribute('href'),text:e.textContent.trim().replace(/\s+/g,' '),target:e.getAttribute('target'),download:e.hasAttribute('download'),resource:!!e.closest('#resources-menu'),footer:!!e.closest('.site-footer'),details:!!e.closest('details'),main:!!e.closest('main')})).filter(x=>x.href));
 for(const [i,link]of links.entries())await check(`Home link ${i+1}: ${link.text||link.href}`,async()=>{
  await p.goto(origin+'/index.html');await ready('/index.html');await p.locator('.field-card').first().waitFor();
  if(link.resource)await p.click('#site-more');
  if(link.details)await p.locator('#footer-credits').evaluate(e=>e.open=true);
  const a=p.locator('header.site-header a, main a, footer.site-footer a').filter({hasText:link.text}).filter({visible:true});
  // Locate by exact original href and text, avoiding duplicate footer/hero routes.
  const candidates=p.locator('a').filter({hasText:link.text});let chosen;
  for(const candidate of await candidates.all())if(await candidate.getAttribute('href')===link.href&&await candidate.isVisible()){chosen=candidate;break;}
  assert.ok(chosen,'Visible anchor missing: '+JSON.stringify(link));
  const target=new URL(link.href,origin+'/index.html');
  if(link.download){const wait=p.waitForEvent('download');await chosen.click();const d=await wait;assert.ok(d.suggestedFilename());return {effect:'download',name:d.suggestedFilename()};}
  if(link.target){
   // Navigation intent only for external links; curl tests real remote responses.
   const isolated=target.origin!==origin;
   if(isolated)await context.route(target.origin+'/**',r=>r.fulfill({contentType:'text/plain',body:'External navigation intent test; network availability tested separately by curl.'}));
   const wait=p.waitForEvent('popup');await chosen.click();const popup=await wait;await popup.waitForURL(u=>u.href===target.href);const url=popup.url();await popup.close();if(isolated)await context.unroute(target.origin+'/**');return {effect:'new tab',url,external_availability:isolated?'See curl results':'local'};
  }
  const before=p.url();await chosen.click();await p.waitForFunction(([before,target])=>location.href!==before||location.href===target,[before,target.href]);
  if(target.hash.startsWith('#'))await ready(target.href);
  return {effect:'location / application surface',url:p.url()};
 });
 await check('Resources buttons open their intended panels',async()=>{
  await p.goto(origin+'/index.html');await ready('/index.html');await p.click('#site-more');await p.click('#resources-information');await p.locator('#site-information[open]').waitFor();await p.keyboard.press('Escape');
  await p.click('#site-more');await p.click('#resources-menu [data-open-sound]');await p.locator('#sound-settings[open]').waitFor();await p.keyboard.press('Escape');
  await p.click('#site-more');const before=await p.locator('body').evaluate(e=>e.classList.contains('reduced-effects'));await p.click('#reduce-effects');assert.notEqual(await p.locator('body').evaluate(e=>e.classList.contains('reduced-effects')),before);
 });
 assert.deepEqual(errors,[]);assert.deepEqual(consoleErrors,[]);assert.deepEqual(failed,[]);assert.deepEqual(httpErrors,[]);assert.deepEqual(csp,[]);
}catch(e){console.error(e.stack);process.exitCode=1;await p.screenshot({path:await claimEvidenceFile(evidenceFile(evidenceRun,out+'/browser-failure.png'))}).catch(()=>{});}
finally{await writeEvidenceFile(evidenceFile(evidenceRun,out+'/browser-verification.json'),JSON.stringify({recorded_at_utc:new Date().toISOString(),browser:browser.version(),results,page_errors:errors,console_errors:consoleErrors,failed_requests:failed,http_errors:httpErrors,csp_violations:csp,scope:'Built static package served with production _headers CSP. External-click intent uses isolated response fixtures; real external HEAD availability is reported separately. Pretty-URL test supplies explicit fixture rewrites.'},null,2)+'\n');await browser.close();}
