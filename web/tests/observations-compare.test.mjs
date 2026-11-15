import assert from 'node:assert/strict';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {after, before, test} from 'node:test';

const base=process.env.SKYSHIFT_BROWSER_URL;
const evidence=process.env.SKYSHIFT_OBSERVATIONS_EVIDENCE;
const dist=fileURLToPath(new URL('../dist/',import.meta.url));
const targets=JSON.parse(await readFile(path.join(dist,'observations-targets.json'),'utf8')).targets;
const results=[];
let browser;

before(async()=>{
  if(!base)return;
  const override=process.env.SKYSHIFT_PLAYWRIGHT_MODULE;
  const {chromium}=await import(override?pathToFileURL(override).href:'playwright');
  browser=await chromium.launch({headless:true,executablePath:process.env.SKYSHIFT_CHROMIUM_EXECUTABLE});
  if(evidence)await mkdir(evidence,{recursive:true});
});

after(async()=>{
  await browser?.close();
  if(base&&evidence&&results.length){
    const lines=['| Target | Frames | Observation list | Flipbook and keyboard | Side-by-side and wipe | Mask label | Result |',
      '|---|---:|---|---|---|---|---|',
      ...results.map(r=>`| ${r.target} | ${r.frames} | ${r.list} | ${r.flipbook} | ${r.compare} | ${r.mask} | ${r.result} |`)];
    await writeFile(path.join(evidence,'viewer-results.md'),lines.join('\n')+'\n');
    await writeFile(path.join(evidence,'viewer-results.json'),JSON.stringify(results,null,2)+'\n');
  }
});

for(const target of targets){
  test(`${target.name} loads cached observations and comparison controls`,{skip:!base,timeout:120000},async()=>{
    const rows=JSON.parse(await readFile(path.join(dist,'data','observation-targets',target.id,'manifest.json'),'utf8')).observations;
    const report={target:target.name,frames:rows.length,list:'Not run',flipbook:'Not run',compare:'Not run',mask:'Not run',result:'Fail'};
    results.push(report);
    const context=await browser.newContext({baseURL:base,viewport:{width:1440,height:1200}});
    const page=await context.newPage();
    page.setDefaultTimeout(12000);
    const errors=[],live=[];
    page.on('pageerror',error=>errors.push(error.message));
    await context.route('**/api/observations/**',route=>{if(!route.request().url().endsWith('/releases'))live.push(route.request().url());return route.abort();});
    const locator=id=>page.locator('#'+id);
    try{
      await page.goto('/index.html#observations');
      await page.waitForURL('**/explore.html');
      await locator('field').fill('1');
      await page.getByRole('button',{name:target.name,exact:true}).click();
      await locator('results').waitFor();
      assert.equal(await page.locator('#observation-rows tr').count(),rows.length);
      const dates=await page.locator('#observation-rows tr td:nth-child(2)').allTextContents();
      assert.deepEqual(dates,dates.toSorted());
      if(evidence){
        await page.waitForFunction(n=>document.querySelectorAll('#observation-rows tr canvas').length===n,rows.length);
        await locator('results').evaluate(section=>window.scrollBy(0,section.getBoundingClientRect().top-95));
        await page.screenshot({path:path.join(evidence,`${target.id}-observations.png`)});
      }
      report.list='Pass';
      await locator('open-compare').click();
      await page.waitForURL(url=>url.pathname.endsWith('/compare.html')&&url.searchParams.get('target')===target.id);
      await locator('compare').waitFor();
      await page.waitForFunction(n=>document.querySelectorAll('#frame-b option[value]:not([value=""])').length===n,rows.length);
      assert.equal(await page.locator('#observation-rows tr canvas').count(),rows.length);
      assert.match(await locator('epoch-note').textContent(),/J2000\.0/);
      const slider=locator('scrubber');
      assert.equal(await slider.inputValue(),'0');
      await locator('next').click();
      assert.equal(await slider.inputValue(),'1');
      await locator('prev').click();
      assert.equal(await slider.inputValue(),'0');
      await slider.fill('2');
      assert.equal(await slider.inputValue(),'2');
      await locator('canvas-a').focus();
      await page.keyboard.press('ArrowRight');
      assert.equal(await slider.inputValue(),'3');
      await locator('speed').fill('350');
      await locator('canvas-a').focus();
      await page.keyboard.press('Space');
      await page.waitForFunction(()=>document.querySelector('#scrubber').value!=='3');
      await locator('play').click();
      assert.equal(await locator('play').getAttribute('aria-pressed'),'false');
      report.flipbook='Pass';

      const readFrame=async row=>JSON.parse(await readFile(path.join(dist,row.frame_url),'utf8'));
      const frames=await Promise.all(rows.map(readFrame));
      const masked=frames.findIndex(frame=>frame.target.valid===false&&Number.isFinite(frame.wavelength_center_um));
      const first=masked===-1?frames.findIndex(frame=>Number.isFinite(frame.wavelength_center_um)):masked;
      const second=frames.findIndex(frame=>Number.isFinite(frame.wavelength_center_um)&&Math.abs(frame.wavelength_center_um-frames[first].wavelength_center_um)>1e-5);
      assert.ok(first>=0&&second>=0,'A real pair with differing wavelengths is needed');
      await locator('frame-a').selectOption(String(first));
      await locator('frame-b').selectOption(String(second));
      for(const mode of ['side','wipe']){
        await locator(mode).click();
        assert.equal(await locator(mode).getAttribute('aria-pressed'),'true');
        assert.equal(await locator('wavelength-note').isVisible(),true);
        assert.match(await locator('wavelength-note').textContent(),/brightness may differ because of wavelength/);
        for(const id of ['play','side','wipe'])assert.equal(await locator(id).isEnabled(),true);
        if(mode==='wipe')await locator('wipe-position').fill('72');
        if(masked!==-1)assert.match(await locator('mask-a').textContent(),/masked or invalid/);
        if(evidence){
          await locator('compare').evaluate(section=>window.scrollBy(0,section.getBoundingClientRect().top-95));
          await page.screenshot({path:path.join(evidence,`${target.id}-${mode}.png`)});
        }
      }
      report.compare='Pass';
      report.mask=masked===-1?'No masked target pixel in cache':'Pass';
      assert.deepEqual(errors,[]);
      assert.deepEqual(live,[]);
      report.result='Pass';
    }catch(error){
      report.error=error.message;
      if(evidence)await page.screenshot({path:path.join(evidence,`${target.id}-failure.png`)}).catch(()=>{});
      throw error;
    }finally{await context.close();}
  });
}

test('Compare retries a failed live metadata request and reports an empty archive result',{skip:!base,timeout:30000},async()=>{
  const context=await browser.newContext({baseURL:base});
  const page=await context.newPage();
  let requests=0;
  const id='0'.repeat(32);
  try{
    await page.route('**/api/observations/searches**',async route=>{
      if(route.request().method()==='POST'){
        requests++;
        assert.deepEqual(route.request().postDataJSON().detectors,[1,2,3,4,5,6]);
        await route.fulfill(requests===1?{status:502,json:{error:'HTTP 502 Proxy Error'}}:{status:202,json:{id}});
      }else await route.fulfill({json:{state:'complete',result:{status:'complete',observations:[]}}});
    });
    await page.goto('/index.html#compare');
    await page.waitForURL('**/compare.html');
    await page.locator('#ra').fill('17h57m48.5s');
    await page.locator('#dec').fill('+4d41m36s');
    await page.getByRole('button',{name:'Find observations'}).click();
    await page.getByText('HTTP 502 Proxy Error',{exact:true}).waitFor();
    await page.getByRole('button',{name:'Retry archive search'}).click();
    await page.getByText('IRSA returned no observations for this field.').waitFor();
    assert.equal(await page.locator('#compare').isHidden(),true);
    assert.equal(requests,2);
  }finally{await context.close();}
});

test('Saved field and range reopen with analysis, metadata and a narrow-screen layout',{skip:!base,timeout:90000},async()=>{
  const context=await browser.newContext({baseURL:base,viewport:{width:390,height:844},reducedMotion:'reduce',permissions:['clipboard-read','clipboard-write']});
  const page=await context.newPage(),id=name=>page.locator('#'+name);
  const target=targets.find(item=>item.id==='barnards-star');
  const view=new URLSearchParams({target:target.id,ra:target.ra_deg,dec:target.dec_deg,fov:1,release:'dr1',from:1,to:12});
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  try{
    await page.route('**/api/observations/**',route=>route.abort());
    await page.goto('/compare.html?'+view);
    await page.waitForFunction(()=>document.querySelector('#frame-a').options.length===12);
    const manifest=JSON.parse(await readFile(path.join(dist,'data','observation-targets',target.id,'manifest.json'),'utf8'));
    const releaseCount=manifest.observations.filter(row=>row.release==='dr1').length;
    assert.equal(await id('result-count').textContent(),'12 of '+releaseCount+' cached frames selected');
    assert.deepEqual(new Set(await page.locator('#observation-rows tr td:nth-child(5)').allTextContents()),new Set(['DR1']));
    await id('copy-view').click();
    const copied=new URL(await page.evaluate(()=>navigator.clipboard.readText()));
    assert.deepEqual([...copied.searchParams].sort(),[...view].sort());
    await page.evaluate(url=>{
      const frame=document.createElement('iframe');frame.title='Same-origin shared comparison';frame.src=url;document.body.append(frame);
    },copied.href);
    await page.frameLocator('iframe[title="Same-origin shared comparison"]').locator('#frame-strip button').first().waitFor();
    await page.locator('iframe[title="Same-origin shared comparison"]').evaluate(el=>el.remove());
    await id('sky-context').locator('summary').click();
    assert.equal(await page.locator('#context-map .map-field').count(),1);
    assert.match(await id('neossat-reference').textContent(),/CADC/);
    assert.equal(await id('neossat-reference').isVisible(),true);
    assert.equal(await id('overlay-gaia').isChecked(),false);
    await id('overlay-gaia').check().catch(()=>{});
    await page.getByText(/Gaia DR3 unavailable/).waitFor();
    assert.equal(await id('overlay-gaia').isChecked(),false);
    await id('sky-context').locator('summary').click();
    await id('frame-strip').getByRole('button').nth(2).click();
    assert.equal(await id('scrubber').inputValue(),'2');
    assert.equal(await id('frame-b').inputValue(),'');
    assert.match(await id('pair-note').textContent(),/No default pair/);
    await id('frame-b').selectOption('1');
    await id('side').click();
    await id('zoom-in').click();
    assert.notEqual(await id('zoom-value').textContent(),'1.0×');
    const snapshot=()=>page.locator('#canvas-a, #canvas-b').evaluateAll(canvases=>canvases.map(canvas=>canvas.toDataURL()));
    const beforePan=await snapshot();
    await id('canvas-a').scrollIntoViewIfNeeded();
    const pan=await id('canvas-a').boundingBox();
    await page.mouse.move(pan.x+pan.width/2,pan.y+pan.height/2);
    await page.mouse.down();await page.mouse.move(pan.x+pan.width/2+30,pan.y+pan.height/2, {steps:3});await page.mouse.up();
    const afterPan=await snapshot();
    assert.notEqual(afterPan[0],beforePan[0]);assert.notEqual(afterPan[1],beforePan[1]);
    await id('fit').click();
    const canvas=id('canvas-a');
    const box=await canvas.boundingBox();
    assert.ok(box.width<=390);
    await canvas.click({position:{x:box.width/2,y:box.height/2}});
    await id('spectrum').waitFor();
    assert.match(await id('spectrum-status').textContent(),/usable, \d+ masked/);
    assert.ok(await id('spectrum').locator('.spectrum-sample, .spectrum-masked').count());
    await id('add-frames').click();
    await id('derived-result').waitFor();
    assert.match(await id('derived-caption').textContent(),/Mean coadd · 2 exposures/);
    await id('subtract-frames').click();
    assert.match(await id('derived-caption').textContent(),/A − B/);
    await id('frame-details').locator('summary').click();
    assert.match(await id('frame-metadata').textContent(),/Archive ID.*Wavelength range.*Target epochs.*Native pixel flags/s);
    assert.ok(await id('frame-metadata').getByRole('link').count()>=2);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    if(evidence){
      await id('compare').evaluate(section=>section.scrollIntoView());
      await page.screenshot({path:path.join(evidence,'compare-phone.png')});
      await id('frame-strip').evaluate(section=>window.scrollBy(0,section.getBoundingClientRect().top-85));
      await page.screenshot({path:path.join(evidence,'compare-phone-frames.png')});
      await page.setViewportSize({width:1440,height:1100});
      await id('derived-result').evaluate(section=>section.scrollIntoView());
      await page.screenshot({path:path.join(evidence,'analysis-desktop.png')});
    }
    assert.deepEqual(errors,[]);
  }finally{await context.close();}
});

test('An unavailable live retry returns to a real offline preset',{skip:!base,timeout:30000},async()=>{
  const context=await browser.newContext({baseURL:base});
  try{
    const page=await context.newPage();
    await page.route('**/api/observations/searches',route=>route.fulfill({status:502,json:{error:'HTTP 502 Proxy Error'}}));
    await page.goto('/compare.html?target=barnards-star&fov=1&to=3');
    await page.locator('#compare').waitFor();
    await page.locator('#retry').click();
    await page.getByText('HTTP 502 Proxy Error Showing 3 real cutouts from the offline cache.').waitFor();
    assert.equal(await page.locator('#play').isEnabled(),true);
    assert.equal(await page.locator('#retry').isVisible(),true);
  }finally{await context.close();}
});

test('Detector stacks work from cached real exposures for D1 through D6',{skip:!base,timeout:40000},async()=>{
  const context=await browser.newContext({baseURL:base});
  try{
    const page=await context.newPage();
    await page.goto('/compare.html?target=epsilon-indi-b&fov=1');
    await page.waitForFunction(()=>{
      const progress=document.querySelector('#progress');return progress.max>1&&progress.value===progress.max;
    });
    await page.locator('#analysis-tools summary').click();
    for(const detector of [1,2,3,4,5,6]){
      await page.locator('#coadd-detector').selectOption(String(detector));
      await page.locator('#coadd-frames').click();
      assert.match(await page.locator('#derived-caption').textContent(),new RegExp(`Mean coadd · \\d+ exposures · D${detector}`));
    }
  }finally{await context.close();}
});

test('Live Gaia and AllWISE toggles draw reference marks and show the Gaia frame epoch',{skip:!base||!process.env.SKYSHIFT_LIVE_REFERENCES,timeout:75000},async()=>{
  const context=await browser.newContext({baseURL:base,viewport:{width:1440,height:1100}});
  try{
    const page=await context.newPage();
    await page.goto('/compare.html?target=barnards-star&fov=1&from=2&to=12');
    await page.locator('#compare').waitFor();
    await page.locator('#sky-context summary').click();
    for(const kind of ['gaia','wise']){
      const reply=page.waitForResponse(response=>response.url().endsWith('/reference/'+kind));
      await page.locator('#overlay-'+kind).check();
      const response=await reply;
      const payload=await response.json();
      assert.equal(response.status(),200,`Live ${kind} status: ${payload.error??''}`);
      assert.ok(payload.sources.length>0,`Live ${kind} cone returned no sources`);
      await page.locator('.map-'+kind).first().waitFor({state:'attached'});
      console.log(`${kind}: HTTP ${response.status()}, ${payload.sources.length} sources, ${payload.radius_deg.toFixed(6)}° cone, ${payload.source_url}`);
    }
    assert.match(await page.locator('#context-coordinate').textContent(),/Gaia positions at \d{4}/);
    if(evidence){await page.locator('#sky-context').evaluate(el=>el.scrollIntoView());await page.screenshot({path:path.join(evidence,'context-desktop.png')});}
    await page.locator('#overlay-gaia').uncheck();
    assert.equal(await page.locator('.map-gaia').count(),0);
  }finally{await context.close();}
});

test('Eight-arcminute presets use single frames and truthful selected-cache labels',{skip:!base,timeout:60000},async()=>{
  const context=await browser.newContext({baseURL:base,viewport:{width:390,height:844},reducedMotion:'reduce'});
  try{
    const page=await context.newPage();
    for(const target of targets){
      const manifest=JSON.parse(await readFile(path.join(dist,'data','observation-targets',target.id,'preview-8.json'),'utf8'));
      const expected=manifest.preview_frame_urls.length;
      await page.goto('/explore.html?target='+target.id+'&fov=8');
      await page.waitForFunction(n=>{
        const progress=document.querySelector('#progress');
        return progress.max===n&&progress.value===n&&document.querySelector('#frame-a').options.length===n;
      },expected);
      assert.equal(await page.locator('#window-size').inputValue(),'1');
      assert.equal(await page.locator('#flipbook-view').inputValue(),'single');
      assert.equal(await page.locator('#play').getAttribute('aria-pressed'),'false');
      assert.match(await page.locator('#coadd-note').innerText(),/dates and wavelengths and smear/);
      assert.match(await page.locator('#search-message').innerText(),new RegExp(expected+' (?:of '+manifest.observations.length+' )?cached cutouts selected for the 8′ preview'));
      assert.equal(await page.locator('#progress-caption').innerText(),'Selected frames loaded');
      assert.equal(await page.locator('#progress-label').innerText(),expected+' / '+expected);
      assert.equal(await page.locator('#observation-rows tr').count(),expected);
      const labelsFit=await page.locator('#frame-a,#frame-b').evaluateAll(selects=>selects.every(select=>{
        const style=getComputedStyle(select);
        const context=document.createElement('canvas').getContext('2d');
        context.font=style.font;
        const padding=parseFloat(style.paddingLeft)+parseFloat(style.paddingRight);
        const available=select.clientWidth-padding-22; // Allow for the native dropdown arrow.
        return [...select.options].every(option=>context.measureText(option.textContent).width<=available);
      }));
      assert.ok(labelsFit,'Every frame label should fit at 390 px.');
      const [a,b]=await page.locator('#frame-a,#frame-b').evaluateAll(e=>e.map(s=>s.selectedOptions[0].textContent));
      if(b==='Choose a second date'){
        assert.match(await page.locator('#pair-note').innerText(),/No default pair/);
      }else{
        assert.notEqual(a.match(/\d{4}-\d{2}-\d{2}/)[0],b.match(/\d{4}-\d{2}-\d{2}/)[0]);
        assert.equal(a.match(/D\d/)[0],b.match(/D\d/)[0]);
        await page.locator('#side').click();
        for(const id of ['mask-a','mask-b'])assert.match(await page.locator('#'+id).innerText(),/usable measured pixel/);
      }
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    }
  }finally{await context.close();}
});

test('A cross-release pair keeps Wipe and Difference available and reopens from a copied URL',{skip:!base,timeout:30000},async()=>{
  const [context,second]=await Promise.all([browser.newContext({baseURL:base,permissions:['clipboard-read','clipboard-write']}),browser.newContext({baseURL:base})]);
  const target=targets.find(t=>t.id==='rw-aurigae');
  try{
    const page=await context.newPage();
    const params=new URLSearchParams({target:target.id,ra:target.ra_deg,dec:target.dec_deg,fov:8,release:'all',from:1,to:21});
    await page.goto('/compare.html?'+params);
    await page.waitForFunction(()=>document.querySelector('#frame-a').options.length===21);
    const [a,b]=await page.locator('#frame-a').evaluate(s=>{
      const option=release=>[...s.options].find(o=>o.textContent.endsWith(release)).value;
      return [option('DR1'),option('QR3')];
    });
    await page.locator('#frame-a').selectOption(a);
    await page.locator('#frame-b').selectOption(b);
    assert.equal(await page.locator('#release-note').innerText(),'Different data releases; processing may differ.');
    for(const mode of ['difference-mode','wipe']){
      await page.locator('#'+mode).click();
      assert.equal(await page.locator('#'+mode).getAttribute('aria-pressed'),'true');
      assert.equal(await page.locator('#release-note').isVisible(),true);
    }
    await page.locator('#wipe-position').fill('72');
    await page.locator('#copy-view').click();
    const url=new URL(await page.evaluate(()=>navigator.clipboard.readText()));
    for(const [key,value] of params){
      if(key==='ra'||key==='dec')assert.ok(Math.abs(Number(url.searchParams.get(key))-Number(value))<1e-8);
      else assert.equal(url.searchParams.get(key),value);
    }
    const reopened=await second.newPage();
    await reopened.goto(url.href);
    await reopened.waitForFunction(()=>document.querySelector('#wipe').getAttribute('aria-pressed')==='true');
    assert.equal(await reopened.locator('#frame-a').inputValue(),a);
    assert.equal(await reopened.locator('#frame-b').inputValue(),b);
    assert.equal(await reopened.locator('#wipe-position').inputValue(),'72');
    assert.equal(await reopened.locator('#release-note').isVisible(),true);
  }finally{await context.close();await second.close();}
});
