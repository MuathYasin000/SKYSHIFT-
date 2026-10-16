// Records a real, fresh-profile localhost browser. Scripted demonstration, not human testing.
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const require=createRequire(import.meta.url);
const {chromium}=await import(pathToFileURL(process.env.SKYSHIFT_PLAYWRIGHT_MODULE||require.resolve('playwright')).href);
const scenes=JSON.parse(await fs.readFile(root+'/tools/visitor_demo_scenes.json','utf8'));
const out=root+'/output/video/visitor-0.4-raw';await fs.mkdir(out,{recursive:true});
// Preserve prior captures rather than silently overwriting evidence.
try{await fs.access(out+'/recording.json');throw Error('Prior recording exists; select a new capture directory.');}catch(e){if(e.code!=='ENOENT')throw e;}
const browser=await chromium.launch({headless:true,executablePath:process.env.SKYSHIFT_CHROMIUM_EXECUTABLE});
const context=await browser.newContext({viewport:{width:1280,height:720},acceptDownloads:true,recordVideo:{dir:out,size:{width:1280,height:720}}});
const external=[],errors=[],events=[];
await context.route('**/*',r=>{const u=new URL(r.request().url());if(!['localhost','127.0.0.1'].includes(u.hostname)){external.push(u.href);return r.abort();}return r.continue();});
const p=await context.newPage(),video=p.video();p.on('pageerror',e=>errors.push(e.message));
const base=process.argv[2]||'http://localhost:3000';
// A visible pointer is added only to the captured browser, never to science arrays or release assets.
await p.addInitScript(()=>document.addEventListener('DOMContentLoaded',()=>{
  const pointer=document.createElement('div');pointer.setAttribute('aria-hidden','true');
  pointer.style.cssText='position:fixed;left:-30px;top:-30px;width:15px;height:15px;border:2px solid #9ee5f5;border-radius:50%;background:#71d4e333;pointer-events:none;z-index:2147483647;transform:translate(-50%,-50%);box-shadow:0 0 6px #000';
  document.body.append(pointer);document.addEventListener('mousemove',e=>{pointer.style.left=e.clientX+'px';pointer.style.top=e.clientY+'px';});
}));
let start=performance.now(),sceneStart=0,captureFailure=null;
const pause=ms=>p.waitForTimeout(ms);
async function click(selector){const l=p.locator(selector);await l.scrollIntoViewIfNeeded();await l.hover();await pause(350);await l.click();await pause(650);}
async function top(selector,offset=28){await p.locator(selector).evaluate((e,o)=>window.scrollTo({top:e.getBoundingClientRect().top+scrollY-o,behavior:'smooth'}),offset);await pause(1000);}
async function exploreReady(){await p.locator('#explorer[aria-busy=false]').waitFor();}
async function scene(index,action){const s=scenes[index];events.push({scene:s.id,title:s.title,planned_start_seconds:sceneStart,actual_start_seconds:(performance.now()-start)/1000});console.log('Recording '+s.title);await action();sceneStart+=s.seconds;const remaining=sceneStart*1000-(performance.now()-start);if(remaining<0)throw Error('Actions overran scene '+s.id+' by '+(-remaining/1000).toFixed(1)+' seconds');await pause(remaining);}
try{
  start=performance.now();
  await scene(0,async()=>{await p.goto(base);await pause(3000);await p.mouse.move(270,280,{steps:18});await pause(1500);});
  await scene(1,async()=>{await p.goto(base+'/explore.html');await exploreReady();await top('.visitor-gallery',22);await pause(2300);await click('[data-field=m67]');await exploreReady();await top('#explorer');await pause(2500);await p.goto(base+'/explore.html?field=ngc188#explorer');await exploreReady();await top('#explorer');});
  await scene(2,async()=>{await p.goto(base+'/explore.html?field=m101#explorer');await exploreReady();await top('#explorer');await pause(1500);await click('#context-source');await pause(2800);await p.keyboard.press('Escape');await click('[data-help=infrared]');await pause(2500);await p.keyboard.press('Escape');});
  await scene(3,async()=>{await p.goto(base+'/compare.html');await p.locator('#workspace').waitFor();await pause(4000);await click('[data-help=wavelength]');await pause(3500);await p.keyboard.press('Escape');await top('#workspace');await pause(2400);await top('#images');});
  await scene(4,async()=>{await click('#single-mode');await click('#epoch-b');await pause(1500);await click('#epoch-a');await click('#side-mode');await click('#zoom-in');await top('#images');const b=await p.locator('#canvas-a').boundingBox();await p.mouse.move(b.x+b.width*.53,b.y+b.height*.45,{steps:15});await p.mouse.down();await p.mouse.move(b.x+b.width*.58,b.y+b.height*.49,{steps:22});await p.mouse.up();await pause(800);await click('#reset-view');await click('#compare-options summary');await p.locator('#visual-interpolation').selectOption('nearest');await p.locator('#visual-palette').selectOption('ice');await top('#images');});
  await scene(5,async()=>{await click('#mark-mode');await top('#images');const b=await p.locator('#canvas-a').boundingBox();await p.mouse.click(b.x+b.width/2,b.y+b.height/2);await p.getByRole('dialog',{name:'What caught your eye?'}).waitFor();await p.locator('#note-text').pressSequentially('DEMO QUESTION: What contributes to this central glow? No change or discovery is claimed.',{delay:40});await pause(1200);await p.getByRole('button',{name:'Save note',exact:true}).click();await top('#notes',130);await pause(1000);const download=p.waitForEvent('download');await click('#export');await(await download).saveAs(out+'/walkthrough-comparison.zip');await pause(1800);});
  await scene(6,async()=>{await p.reload();await p.locator('#workspace').waitFor();await top('.notebook',60);await pause(1000);const chooser=p.waitForEvent('filechooser');await click('#import');await(await chooser).setFiles(out+'/walkthrough-comparison.zip');await p.waitForFunction(()=>document.querySelector('#note-count').textContent==='1');await top('#notes',130);await pause(1500);await top('#images');await p.screenshot({path:out+'/reopened.png'});});
  await scene(7,async()=>{await top('.visitor-compare-intro');await p.mouse.move(1000,230,{steps:18});await p.screenshot({path:out+'/closing.png'});});
  if(errors.length||external.length)throw Error(JSON.stringify({errors,external}));
}catch(e){captureFailure=e.message;throw e;}finally{
  const browserVersion=browser.version();await context.close();await browser.close();
  const raw=await video.path();const metadata={recorded_at_utc:new Date().toISOString(),capture_status:captureFailure?'failed':'completed',capture_failure:captureFailure,raw_video:path.relative(root,raw).replaceAll('\\','/'),browser_version:browserVersion,viewport:{width:1280,height:720},planned_seconds:sceneStart,live_application_capture:true,interaction_operator:'automated Playwright script; not a human usability participant',visible_pointer:'capture-only overlay',human_presenter:false,scientific_approval:'PENDING',independent_novice_validation:'NOT CONDUCTED',external_requests:external,page_errors:errors,events};
  try{metadata.export_sha256=createHash('sha256').update(await fs.readFile(out+'/walkthrough-comparison.zip')).digest('hex');}catch{}
  await fs.writeFile(out+'/recording.json',JSON.stringify(metadata,null,2));console.log(JSON.stringify(metadata,null,2));
}
