// Reproducible official-viewer comparison using exact, hash-checked originals.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
const {chromium}=await import(pathToFileURL('C:/Users/LOQ/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs'));
const root=path.resolve(import.meta.dirname,'..'),out=process.env.SKYSHIFT_EVIDENCE_OUTPUT||path.join(root,'docs/evidence','irsa-native-'+new Date().toISOString().replace(/[:.]/g,'-'));
await fs.mkdir(out,{recursive:false});
const catalog=JSON.parse(await fs.readFile(path.join(root,'web/dist/data/native/catalog.json'))),temporal=JSON.parse(await fs.readFile(path.join(root,'config/temporal_example.json')));
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'}),results=[];
try{
 for(const [index,e] of catalog.entries.entries()){
  const original=index<2?path.join(root,'data/prepared/m101-review-v6/sources','AB'[index]+'.fits'):path.join(root,'data/cache/cutouts',temporal.sources[index-2].path);
  assert.equal(createHash('sha256').update(await fs.readFile(original)).digest('hex'),e.source_sha256);
  const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage();
  await page.goto('https://irsa.ipac.caltech.edu/irsaviewer/',{waitUntil:'domcontentloaded',timeout:60000});
  await page.getByText('Images',{exact:true}).first().waitFor({timeout:45000});
  await page.getByText('Got it',{exact:true}).click({timeout:2500}).catch(()=>{});
  await page.getByText('Upload',{exact:true}).first().click();
  await page.locator('input[type=file]').setInputFiles(original);
  await page.getByRole('button',{name:'Load',exact:true}).click();
  const stretch=page.getByRole('button',{name:'Stretch drop down: change the background image stretch',exact:true});
  await stretch.waitFor({timeout:45000});
  await page.getByRole('button',{name:'Zoom the image to fit entirely within its frame',exact:true}).click();
  await page.waitForTimeout(1200);
  await stretch.click();await page.getByText('Z Scale Asinh Stretch',{exact:true}).click();
  await page.waitForTimeout(1200);
  await page.screenshot({path:path.join(out,e.id+'-irsa.png')});
  const renderedText=await page.locator('body').innerText();assert.match(renderedText,/\(IMAGE\)/);
  await stretch.click();await page.getByText('Color stretch...',{exact:true}).click();
  await page.getByText('Modify Color Stretch',{exact:true}).waitFor();
  const fields=await page.locator('input').evaluateAll(es=>es.map(e=>({type:e.type,value:e.value,checked:e.checked})));
  const text=(await page.locator('body').innerText()).split('Modify Color Stretch')[1];
  await page.screenshot({path:path.join(out,e.id+'-irsa-stretch.png')});
  results.push({id:e.id,viewer:'https://irsa.ipac.caltech.edu/irsaviewer/',input_mode:'Exact original FITS uploaded to official IRSA Viewer',source_sha256:e.source_sha256,
    preset:'Z Scale Asinh Stretch',mask:'IRSA raw IMAGE visualization; SKYSHIFT conservative mask not applied by IRSA',dialog_text:text,fields,status:'pass'});
  console.log(JSON.stringify(results.at(-1)));await context.close();
 }
}finally{await browser.close();await fs.writeFile(path.join(out,'irsa-results.json'),JSON.stringify(results,null,2));}
