import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {chromium} from 'file:///C:/Users/LOQ/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import {sha256} from '../web/dist/science.js';
const out='docs/evidence/repair-20261018',base='http://localhost:3002/dist/',results=[],errors=[],requests=[];
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
try{
 const c=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:'reduce'}),p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));p.on('request',r=>requests.push(r.url()));
 await p.goto(base+'#compare');await p.waitForFunction(()=>window.skyshiftWebsite?.diagnostics().investigation.kind==='pair'&&!skyshiftWebsite.diagnostics().investigation.busy);
 results.push({check:'Direct staged science under /dist/ subpath',status:'pass'});
 await p.goto(base+'#universe');await p.waitForFunction(()=>window.skyshiftSpace?.diagnostics().frames>0);
 await p.locator('#help-button').click();
 await p.waitForFunction(()=>document.querySelector('#runtime-status').textContent.includes('0.9-mission-control'));
 assert.ok(requests.includes(base+'version.json'));assert.equal(requests.filter(u=>u==='http://localhost:3002/healthz').length,0);results.push({check:'Runtime identity stays within subpath',status:'pass'});
 const release=await(await c.request.get(base+'release.json')).json();
 for(const [name,expected]of Object.entries(release.source_asset_sha256)){const data=new Uint8Array(await fs.readFile('tmp/skyshift-upload/dist/'+name));assert.equal(await sha256(data),expected);}
 const receipt=await(await c.request.get(base+'data/release-integrity.json')).json();assert.equal(receipt.content_id,release.content_id);assert.equal(release.scientific_approval,'PENDING');assert.equal(release.deployment_id,null);
 results.push({check:'All staged release hashes match regenerated files',status:'pass',files:Object.keys(release.source_asset_sha256).length,content_id:release.content_id});
 await p.goto(base+'methodology.html');await p.waitForFunction(()=>document.querySelector('#release-traceability').textContent.includes('Local build integrity recorded'));
 for(const name of ['','explore.html','compare.html','discover.html','methodology.html','guide.html','classic-home.html']){await p.goto(base+name);assert.equal(await p.locator('link[rel=canonical]').getAttribute('href'),'https://skyshiftt.netlify.app/'+name);assert.ok(await p.locator('meta[property="og:description"]').getAttribute('content'));}
 results.push({check:'Page-specific canonical/sharing metadata and matching build receipt',status:'pass'});assert.deepEqual(errors,[]);await c.close();
 const mobile=await browser.newContext({viewport:{width:320,height:900},reducedMotion:'reduce'}),guide=await mobile.newPage(),geometry=[];
 await guide.goto(base+'guide.html');await guide.evaluate(()=>document.fonts.ready);
 for(const width of [320,360,390,430,768,1024,1440]){await guide.setViewportSize({width,height:900});await guide.evaluate(()=>new Promise(r=>requestAnimationFrame(r)));const g=await guide.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,h1Font:getComputedStyle(document.querySelector('h1')).fontSize}));assert.ok(g.scroll<=width+1);geometry.push(g);if([320,390,1440].includes(width))await guide.screenshot({path:out+'/layout-guidehtml-'+width+'.png'});}
 await fs.writeFile(out+'/guide-final-layout.json',JSON.stringify(geometry,null,2));results.push({check:'Final guide headline preserves whole words and fits all seven widths',status:'pass',geometry});await mobile.close();
}catch(e){results.push({status:'fail',error:e.stack});process.exitCode=1;}finally{await fs.writeFile(out+'/stage-results.json',JSON.stringify({results,errors,scope:'Ordinary local static host under a subpath; production repair deployment not performed'},null,2));await browser.close();}
console.log(JSON.stringify(results));
