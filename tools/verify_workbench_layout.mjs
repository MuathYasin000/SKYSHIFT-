import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {claimEvidenceFile,createEvidenceDirectory,evidenceFile,writeEvidenceFile} from './evidence-output.mjs';

const base=process.env.SKYSHIFT_BASE || 'http://localhost:3000';
const require=createRequire(new URL('../web/package.json',import.meta.url));
const {chromium}=await import(pathToFileURL(process.env.SKYSHIFT_PLAYWRIGHT_MODULE||require.resolve('playwright')));
const output=await createEvidenceDirectory('verify_workbench_layout',process.env.SKYSHIFT_BROWSER_OUTPUT);
const axe=await readFile(new URL('./vendor/axe.min.js',import.meta.url),'utf8');
const browser=await chromium.launch({
  headless:true,executablePath:process.env.SKYSHIFT_CHROMIUM_EXECUTABLE,
  args:['--enable-unsafe-swiftshader'],
});
const widths=[1920,1440,1280,1024,768,390];
const targets=['rw-aurigae','wise-0855'];
const tabs=['details','image','overlays','spectrum'];
const results=[],errors=[];
const routeFilter=process.env.SKYSHIFT_LAYOUT_MATCH?new RegExp(process.env.SKYSHIFT_LAYOUT_MATCH):null;

async function check(name,run){
  if(routeFilter&&!routeFilter.test(name))return;
  try{
    results.push({name,status:'pass',details:await run()});
    console.log('PASS',name);
  }catch(error){
    results.push({name,status:'fail',error:error.stack});
    console.error('FAIL',name,error.message);
  }
}

async function fresh(viewport,run){
  const context=await browser.newContext({viewport,reducedMotion:'reduce'});
  try{
    const page=await context.newPage();
    page.setDefaultTimeout(15000);
    page.on('pageerror',error=>errors.push({url:page.url(),message:error.message}));
    return await run(page);
  }finally{await context.close();}
}

async function ready(page,route,target){
  const response=await page.goto(base+'/'+route+'.html?target='+target);
  assert.ok(response.ok(),`${route} returned HTTP ${response.status()}`);
  await page.waitForFunction(()=>document.querySelector('#viewer-load-status')?.textContent.includes('ready in the viewer.'));
  assert.equal(await page.locator('#frame-strip button').count(),12);
  await page.evaluate(axe);
}

async function audit(page){
  const issues=await page.evaluate(async()=> (await axe.run()).violations.map(v=>({
    rule:v.id,targets:v.nodes.map(node=>node.target.join(' ')),
  })));
  assert.deepEqual(issues,[]);
}

async function photo(target,name){
  const path=await claimEvidenceFile(evidenceFile(output,name+'.jpg'));
  await target.screenshot({path,type:'jpeg',quality:87,animations:'disabled'});
}
async function pageScroll(page,ratio){
  await page.evaluate(fraction=>scrollTo({
    top:Math.round((document.documentElement.scrollHeight-innerHeight)*fraction),behavior:'instant',
  }),ratio);
}

async function bounds(page,selector){
  return page.locator(selector).evaluate(panel=>{
    const limit=panel.getBoundingClientRect();
    const outside=[];
    for(const node of panel.querySelectorAll('*')){
      const chart=node.getBoundingClientRect();
      if(!chart.width||!chart.height||getComputedStyle(node).visibility==='hidden')continue;
      let left=chart.left,right=chart.right;
      // Filmstrip and scientific table intentionally scroll within their own bounds.
      const scroller=node.parentElement?.closest('.frame-strip, .table-wrap');
      if(scroller&&panel.contains(scroller)){
        const clip=scroller.getBoundingClientRect();
        left=Math.max(left,clip.left);right=Math.min(right,clip.right);
        if(right<=left)continue;
      }
      if(left<limit.left-1||right>limit.right+1){
        outside.push({element:node.id||node.getAttribute('class')||node.tagName,left:Math.round(left),right:Math.round(right)});
      }
    }
    return {outside,left:limit.left,right:limit.right,height:limit.height,top:limit.top,bottom:limit.bottom,viewport:innerHeight,width:innerWidth,
      overflow:document.documentElement.scrollWidth-innerWidth};
  });
}

async function inside(page,selector){
  const metrics=await bounds(page,selector);
  assert.deepEqual(metrics.outside,[],selector+' horizontal overflow');
  assert.ok(metrics.overflow<=1,'Page horizontal overflow');
  return metrics;
}

try{
  for(const group of [widths.filter((_,i)=>i%2===0),widths.filter((_,i)=>i%2===1)]){
    await Promise.all(group.map(width=>fresh({width,height:width<700?844:width===1280?800:900},async page=>{
      for(const route of ['compare','explore'])for(const target of targets){
        await check(`${route} ${target} ${width}px`,async()=>{
          await ready(page,route,target);
          assert.equal(await page.locator('#open-compare').isVisible(),route==='explore');
          await page.locator('#frame-strip canvas').first().scrollIntoViewIfNeeded();
          await page.waitForFunction(()=>Boolean(document.querySelector('#frame-strip canvas').dataset.revision));
          const label=`${route}-${target}-${width}`;
          const geometry=await inside(page,'#workbench');
          assert.ok(Math.abs(geometry.left-(width-geometry.right))<2,'Workbench is not centered');
          for(const [position,ratio] of [['top',0],['middle',.5],['bottom',1]]){
            await pageScroll(page,ratio);
            await photo(page,label+'-'+position);
          }
          if(width<700){
            const controls=await page.locator('#viewer-column button:visible, #tools-tabs button:visible').evaluateAll(nodes=>nodes.map(node=>node.getBoundingClientRect().height));
            assert.ok(controls.every(height=>height>=44),'A viewer or tab control is shorter than 44 px');
          }
          const ratios={};
          for(const tab of tabs){
            await pageScroll(page,0);
            await page.locator('#tools-tab-'+tab).click();
            await inside(page,'#workbench-tools');
            if(width>=1100){
              const stage=await inside(page,'#viewer-stage');
              const visible=Math.min(stage.viewport,stage.bottom)-Math.max(0,stage.top);
              ratios[tab]=visible/stage.viewport;
              assert.ok(ratios[tab]>=.6,`${tab} shows only ${Math.round(ratios[tab]*100)}% of the viewport`);
            }
            await audit(page);
            if(route==='compare')await photo(page.locator('#workbench-tools'),label+'-tab-'+tab);
          }
          return {heading:await page.locator('h1').innerText(),stageRatios:ratios,axeViolations:0};
        });
      }
    })));
  }

  await check('Keyboard tabs, centered 1100 px boundary and independent scrolling',()=>fresh({width:1100,height:720},async page=>{
    await ready(page,'compare','wise-0855');
    await page.locator('#tools-tab-details').focus();
    await page.keyboard.press('ArrowRight');
    assert.equal(await page.locator('#tools-tab-image').getAttribute('aria-selected'),'true');
    await page.keyboard.press('End');
    assert.equal(await page.locator('#tools-tab-spectrum').getAttribute('aria-selected'),'true');
    await page.keyboard.press('Home');
    assert.equal(await page.locator('#tools-tab-details').getAttribute('aria-selected'),'true');
    await page.locator('.frame-technical summary').click();
    await pageScroll(page,0);
    const stage=await inside(page,'#viewer-stage');
    assert.ok((Math.min(stage.viewport,stage.bottom)-Math.max(0,stage.top))/stage.viewport>=.6,
      'Short desktop does not leave 60% for the stage');
    const before=await page.locator('#tools-tabs').boundingBox();
    const scroll=await page.locator('#tools-scroll').evaluate(host=>{
      host.scrollTop=host.scrollHeight;
      return {tools:host.scrollTop,page:scrollY};
    });
    assert.ok(scroll.tools>0);
    assert.equal(scroll.page,0);
    assert.deepEqual(await page.locator('#tools-tabs').boundingBox(),before);
    assert.deepEqual(await inside(page,'#viewer-stage'),stage);
    await audit(page);
  }));

  await check('AllWISE times out in ten seconds and offers Retry',()=>fresh({width:1280,height:800},async page=>{
    let requests=0;
    await page.route('**/api/observations/reference/wise',async route=>{
      requests++;
      if(requests===1)await new Promise(resolve=>setTimeout(resolve,11200));
      await route.abort('failed').catch(()=>{});
    });
    await ready(page,'compare','wise-0855');
    await page.locator('#tools-tab-overlays').click();
    assert.equal(await page.locator('#overlay-gaia').isChecked(),false);
    assert.equal(await page.locator('#overlay-wise').isChecked(),false);
    await page.locator('#overlay-wise').check();
    await page.waitForSelector('#overlay-wise-status[data-state=loading]');
    await page.waitForSelector('#overlay-wise-status[data-state=error]',{timeout:12000});
    assert.match(await page.locator('#overlay-wise-status').innerText(),/timed out after 10 seconds/);
    await page.locator('#retry-wise').click();
    await page.waitForSelector('#overlay-wise-status[data-state=error]');
    assert.equal(requests,2);
    await audit(page);
  }));

  for(const width of [1920,390]){
    await check(`DSS modal, logo, bounds and focus at ${width}px`,()=>fresh({width,height:width===390?844:900},async page=>{
      await ready(page,'compare','wise-0855');
      await page.locator('#tools-tab-overlays').click();
      const trigger=page.locator('#open-sky-background');
      await trigger.click();
      await page.waitForSelector('#sky-background[open]');
      await page.waitForSelector('#dss-status[data-state=ready]');
      const dialog=await page.locator('#sky-background').boundingBox();
      if(width>=1100)assert.ok(dialog.width>=640);
      await inside(page,'#sky-background');
      await inside(page,'#dss-view');
      const logo=page.locator('#dss-view a[href*="aladin.cds.unistra.fr"]:visible');
      assert.ok((await logo.boundingBox()).height>=44);
      assert.equal(await page.locator('#dss-view :is(button,input,select):visible').count(),0);
      assert.equal(await page.locator('#dss-opacity-value').innerText(),'65%');
      await page.locator('#dss-opacity').focus();
      await page.keyboard.press('ArrowLeft');
      assert.equal(await page.locator('#dss-opacity-value').innerText(),'64%');
      await audit(page);
      await photo(page,'dss-dialog-'+width);
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('#sky-background').isVisible(),false);
      assert.ok(await trigger.evaluate(el=>el===document.activeElement));
      return {dialogWidth:dialog.width,logo:true,axeViolations:0};
    }));
  }
}finally{
  const version=browser.version();
  await browser.close();
  await writeEvidenceFile(evidenceFile(output,'verification.json'),JSON.stringify({browser:version,base,results,errors},null,2)+'\n');
}
if(results.some(result=>result.status==='fail')||errors.length)process.exitCode=1;
