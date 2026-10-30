// Read-only official viewer comparison of the exact public cube requested by the user.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {chromium} from 'file:///C:/Users/LOQ/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import {createEvidenceDirectory,claimEvidenceFile,writeEvidenceFile} from './evidence-output.mjs';
const out=await createEvidenceDirectory('irsa-official-mosaic');
const original=path.resolve('data/mosaics/originals/M101_irsa.fits');
assert.equal(createHash('sha256').update(await fs.readFile(original)).digest('hex'),'44e89f460c55f46f7e384ba7dfe8927fa8e56163875aba3766499a5646813447');
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const p=await browser.newPage({viewport:{width:1440,height:1000}});p.setDefaultTimeout(60000);
let result={source_sha256:'44e89f460c55f46f7e384ba7dfe8927fa8e56163875aba3766499a5646813447',viewer:'https://irsa.ipac.caltech.edu/irsaviewer/',input:'Exact public IRSA M101 tutorial cube; no private observations uploaded'};
try {
 await p.goto(result.viewer,{waitUntil:'domcontentloaded',timeout:60000});
 await p.getByText('Images',{exact:true}).first().waitFor();await p.getByText('Got it',{exact:true}).click({timeout:2500}).catch(()=>{});
 await p.getByText('Upload',{exact:true}).first().click();await p.locator('input[type=file]').setInputFiles(original);
 await p.getByRole('button',{name:'Load',exact:true}).click();
 await p.getByRole('button',{name:'Stretch drop down: change the background image stretch',exact:true}).waitFor({timeout:90000});
 await p.getByRole('button',{name:'Zoom the image to fit entirely within its frame',exact:true}).click();
 const plane=Number(process.env.SKYSHIFT_IRSA_PLANE||1);
 if(!Number.isInteger(plane)||plane<1||plane>102)throw Error('Choose an official cube plane from 1 to 102');
 if(plane!==1){await p.locator('input[type=number]').first().fill(String(plane));await p.locator('input[type=number]').first().press('Tab');await p.waitForTimeout(2000);}
 await p.screenshot({path:await claimEvidenceFile(path.join(out,'official-initial.png'))});
 result.body=await p.locator('body').innerText();result.inputs=await p.locator('input').evaluateAll(es=>es.map(e=>({type:e.type,value:e.value,label:e.getAttribute('aria-label'),title:e.title})));
 result.status='rendered_selected_plane';result.plane=plane;result.display='Official default color table/stretch; IRSA raw IMAGE mask policy differs from SKYSHIFT conservative mask; no bitmap equality is claimed';console.log(result.body.slice(-6000));console.log(JSON.stringify(result.inputs));
}catch(e){result.status='unavailable';result.error=e.message;console.log(JSON.stringify({status:result.status,error:result.error}));}
finally{await writeEvidenceFile(path.join(out,'result.json'),JSON.stringify(result,null,2));await browser.close();}
