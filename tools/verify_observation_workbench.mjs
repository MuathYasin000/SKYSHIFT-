import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {claimEvidenceFile,createEvidenceDirectory,evidenceFile,writeEvidenceFile} from './evidence-output.mjs';

const base=process.env.SKYSHIFT_BASE || 'http://localhost:3000';
const require=createRequire(new URL('../web/package.json',import.meta.url));
const playwright=process.env.SKYSHIFT_PLAYWRIGHT_MODULE || require.resolve('playwright');
const {chromium}=await import(pathToFileURL(playwright));
const output=await createEvidenceDirectory('verify_observation_workbench',process.env.SKYSHIFT_BROWSER_OUTPUT);
const axe=await readFile(new URL('./vendor/axe.min.js',import.meta.url),'utf8');
const targets=['barnards-star','epsilon-indi-b','wise-0855','rw-aurigae','r-draconis'];
const viewports=[{width:1440,height:1000},{width:390,height:844}];
const results=[],pageErrors=[];
const match=process.env.SKYSHIFT_VERIFY_MATCH?new RegExp(process.env.SKYSHIFT_VERIFY_MATCH,'i'):null;
const browser=await chromium.launch({
  headless:true,
  executablePath:process.env.SKYSHIFT_CHROMIUM_EXECUTABLE,
  args:['--enable-unsafe-swiftshader'],
});
async function check(name,run){
  if(match&&!match.test(name))return;
  try{
    const details=await run();
    results.push({name,status:'pass',details});
    console.log('PASS',name);
  }catch(error){
    results.push({name,status:'fail',error:error.stack});
    console.error('FAIL',name,error.message);
  }
}
async function withPage(options,run){
  const context=await browser.newContext(options);
  try{
    const page=await context.newPage();
    page.setDefaultTimeout(12000);
    page.on('pageerror',error=>pageErrors.push({url:page.url(),message:error.message}));
    return await run(page,context);
  }finally{
    await context.close();
  }
}
async function ready(page){
  await page.waitForFunction(()=>document.querySelector('#viewer-load-status').textContent.includes('ready in the viewer.'));
}
async function audit(page){
  await page.evaluate(axe);
  const issues=await page.evaluate(async()=> (await axe.run()).violations.map(violation=>({
    rule:violation.id, elements:violation.nodes.map(node=>node.target),
  })));
  assert.deepEqual(issues,[]);
}
async function fits(page){
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
  assert.ok(overflow<=1,'Horizontal overflow: '+overflow);
}
async function shot(page,name){
  const path=await claimEvidenceFile(evidenceFile(output,name+'.png'));
  await page.screenshot({path,animations:'disabled'});
}
try{
  await Promise.all(viewports.map(viewport=>withPage({viewport,reducedMotion:'reduce'},async page=>{
    for(const route of ['explore','compare']) for(const target of targets){
      await check(route+' '+target+' at '+viewport.width,async()=>{
        await page.goto(base+'/'+route+'.html?target='+target);
        await ready(page);
        await fits(page);
        await page.locator('#frame-strip canvas').first().scrollIntoViewIfNeeded();
        await page.waitForFunction(()=>Boolean(document.querySelector('#frame-strip canvas').dataset.revision));
        const view=await page.evaluate(()=>{
          const strip=document.querySelector('#frame-strip');
          return {
            buttons:strip.children.length,
            dates:[...strip.querySelectorAll('time')].map(time=>time.dateTime),
            viewerRatio:document.querySelector('#canvases').getBoundingClientRect().height/innerHeight,
            images:strip.querySelectorAll('canvas').length,
            realTile:strip.querySelector('canvas').getContext('2d').getImageData(0,0,96,96).data.some((pixel,index)=>index%4!==3&&pixel>30),
            detailFont:getComputedStyle(document.querySelector('#frame-metadata dd')).fontSize,
          };
        });
        assert.equal(view.buttons,12);
        assert.equal(view.images,view.buttons);
        assert.ok(view.realTile);
        assert.ok(view.dates.every(date=>Number.isFinite(Date.parse(date))));
        assert.ok(new Set(view.dates.map(date=>date.slice(0,10))).size>1);
        assert.ok(parseFloat(view.detailFont)>=14);
        if(viewport.width===1440)assert.ok(view.viewerRatio>=.6);
        await audit(page);
        await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));
        await shot(page,[route,viewport.width,target].join('-'));
        if(route==='compare'&&target==='wise-0855'){
          await page.locator('#timeline-title').evaluate(el=>el.scrollIntoView({block:'center'}));
          await shot(page,'timeline-'+viewport.width);
        }
        return {frames:view.buttons,first:view.dates[0],last:view.dates.at(-1),axeViolations:0};
      });
    }
    for(const route of ['index','methodology','discover','guide','challenge','classic-home']){
      await check(route+' protected page and navigation at '+viewport.width,async()=>{
        await page.goto(base+'/'+route+'.html');
        if(route==='index'){
          await page.waitForFunction(()=>window.skyshiftHero?.diagnostics().state==='ready');
          assert.equal(await page.locator('#arrival-screen').isVisible(),false);
          assert.equal(await page.locator('.intro-note a[href^="./compare.html?target="]').count(),5);
        }
        if(route==='methodology'){
          await page.waitForSelector('.audit-stat');
          assert.ok(await page.locator('#sources').isVisible());
          assert.ok(await page.locator('#audit-json').textContent());
        }
        const primary=await page.locator('#site-nav a[data-route="observations"]').getAttribute('href');
        const compare=await page.locator('#site-nav a[data-route="compare"]').getAttribute('href');
        assert.equal(primary,'./explore.html');assert.equal(compare,'./compare.html');
        await fits(page);
        await audit(page);
        if(['index','methodology'].includes(route))await shot(page,route+'-'+viewport.width);
        return {axeViolations:0};
      });
    }
  })));

  await check('Keyboard playback, frame pickers, all modes, wipe, and shared view at 390',()=>withPage({
    viewport:viewports[1],permissions:['clipboard-read','clipboard-write'],
  },async(page,context)=>{
    await page.goto(base+'/compare.html?target=epsilon-indi-b');
    await ready(page);
    const a=page.locator('#choose-frame-a');
    await a.focus();
    await page.keyboard.press('Enter');
    await page.waitForSelector('#frame-picker-dialog[open]');
    await page.keyboard.press('Home');
    await page.keyboard.press('ArrowDown');
    assert.ok(await page.locator('#frame-picker-options [tabindex="0"] canvas').count());
    await audit(page);
    await fits(page);
    await shot(page,'frame-picker-390');
    await page.keyboard.press('Enter');
    assert.equal(await page.locator('#frame-picker-dialog').isVisible(),false);
    await page.waitForFunction(()=>document.activeElement.id==='choose-frame-a');
    assert.equal(await page.locator('#frame-a').inputValue(),'1');
    await page.locator('#use-frame-b').focus();
    await page.keyboard.press('Enter');
    assert.equal(await page.locator('#frame-b').inputValue(),'1');
    await page.locator('#frame-strip button').nth(4).click({modifiers:['Shift']});
    assert.equal(await page.locator('#frame-b').inputValue(),'4');
    await page.locator('#canvas-a').focus();
    await page.keyboard.press('2');
    assert.ok(await page.locator('#canvas-b').isVisible());
    await page.keyboard.press('3');
    assert.ok(await page.locator('#wipe-position').isVisible());
    assert.ok((await page.locator('#wipe-position').boundingBox()).height>=44);
    await page.locator('#wipe-position').focus();
    await page.keyboard.press('Home');await page.keyboard.press('ArrowRight');
    assert.equal(await page.locator('#wipe-position').inputValue(),'1');
    await page.locator('#canvas-a').focus();
    await page.keyboard.press('4');
    assert.match(await page.locator('#meta-a').textContent(),/Difference A/);
    await page.keyboard.press('1');
    await page.keyboard.press('ArrowRight');
    assert.equal(await page.locator('#scrubber').inputValue(),'2');
    await page.keyboard.press('+');
    assert.equal(await page.locator('#zoom-value').textContent(),'1.3×');
    await page.keyboard.press('Home');
    await page.keyboard.press('Space');
    assert.equal(await page.locator('#play').getAttribute('aria-pressed'),'true');
    await page.keyboard.press('Space');
    assert.equal(await page.locator('#play').getAttribute('aria-pressed'),'false');
    await page.keyboard.press('3');
    await page.locator('#copy-view').focus();
    await page.keyboard.press('Enter');
    await page.waitForFunction(()=>document.querySelector('#share-note').textContent.includes('copied'));
    const share=await page.evaluate(()=>navigator.clipboard.readText());
    const second=await context.newPage();
    await second.goto(share);
    await ready(second);
    assert.equal(await second.locator('#wipe').getAttribute('aria-pressed'),'true');
    assert.equal(await second.locator('#frame-a').inputValue(),'1');
    assert.equal(await second.locator('#frame-b').inputValue(),'4');
    assert.equal(await second.locator('#wipe-position').inputValue(),'1');
  }));

  await check('Arrival uses one canvas, auto-plays once, skips and replays',()=>withPage({viewport:viewports[0]},async page=>{
    await page.goto(base+'/');
    await page.waitForFunction(()=>window.skyshiftArrival?.diagnostics().initialized);
    const focused=await page.evaluate(()=>document.activeElement.id);
    assert.equal(focused,'arrival-skip');
    await page.keyboard.press('Escape');
    await page.waitForFunction(()=>!document.documentElement.dataset.arrival);
    await page.reload();
    assert.equal(await page.locator('#arrival-screen').isVisible(),false);
    await page.locator('#site-more').click();
    await page.locator('#resources-information').click();
    await page.getByRole('link',{name:/Replay intro/}).click();
    await page.waitForFunction(()=>window.skyshiftArrival?.diagnostics().initialized);
    await page.locator('#arrival-skip').click();
    assert.equal(await page.locator('#arrival-screen').isVisible(),false);
    await page.waitForFunction(()=>window.skyshiftHero?.diagnostics().state==='ready');
    assert.equal(await page.locator('#hero-observatory canvas, .hero-observatory #hero-model-canvas').count(),1);
    await page.goto(base+'/#compare');
    await page.waitForURL('**/compare.html');
    assert.equal(await page.locator('#arrival-screen').count(),0);
  }));

  await check('Arrival completes automatically and keeps the live spacecraft canvas',()=>withPage({viewport:viewports[0]},async page=>{
    await page.goto(base+'/');
    await page.waitForFunction(()=>window.skyshiftArrival?.diagnostics().initialized);
    await page.waitForFunction(()=>window.skyshiftArrival?.diagnostics().state==='complete');
    assert.ok(await page.evaluate(()=>window.skyshiftArrival.diagnostics().same_canvas));
    assert.equal(await page.locator('#arrival-screen').isVisible(),false);
    assert.ok(await page.locator('.hero-observatory #hero-model-canvas').count());
  }));

  await check('Sound waits for gesture, gives science cues and remembers mute',()=>withPage({viewport:viewports[0]},async page=>{
    await page.goto(base+'/compare.html?target=wise-0855');
    await ready(page);
    await page.waitForFunction(()=>window.skyshiftSound);
    const diagnostics=()=>page.evaluate(()=>window.skyshiftSound.diagnostics());
    assert.equal((await diagnostics()).context_state,'not_created');
    assert.equal(await page.locator('#site-sound').getAttribute('data-audio-state'),'ready');
    await page.locator('#canvas-a').focus();
    await page.keyboard.press('ArrowRight');
    await page.waitForFunction(()=>window.skyshiftSound.diagnostics().recent_cues.includes('date'));
    // The audio service deliberately suppresses cues within a 55 ms burst.
    await page.waitForTimeout(80);
    await page.locator('#play').click();
    await page.waitForFunction(()=>window.skyshiftSound.diagnostics().recent_cues.includes('toggle'));
    await page.locator('#play').click();
    await page.locator('#choose-frame-b').click();
    await page.locator('#frame-picker-options button').nth(3).click();
    await page.waitForTimeout(80);
    await page.locator('#side').click();
    await page.waitForFunction(()=>window.skyshiftSound.diagnostics().recent_cues.includes('compare'));
    await page.waitForTimeout(80);
    await page.locator('#show-search').click();
    await page.waitForTimeout(80);
    await page.locator('#target-buttons [data-target-id="epsilon-indi-b"]').click();
    await ready(page);
    await page.waitForFunction(()=>window.skyshiftSound.diagnostics().recent_cues.includes('select'));
    await page.locator('#site-more').click();
    await page.locator('#resources-menu [data-open-sound]').click();
    await page.waitForSelector('#sound-settings[open] #sound-fx');
    await page.locator('#sound-settings [data-sound-toggle]').click();
    await page.waitForFunction(()=>window.skyshiftSound.diagnostics().enabled===false);
    await page.reload();
    await page.waitForFunction(()=>window.skyshiftSound);
    assert.equal((await diagnostics()).enabled,false);
    assert.equal(await page.locator('#site-sound').getAttribute('aria-pressed'),'false');
  }));

  await check('Optional Universe opens directly with its renderer and no arrival',()=>withPage({viewport:viewports[0]},async page=>{
    await page.goto(base+'/#universe');
    await page.waitForFunction(()=>document.body.dataset.surface==='universe');
    assert.equal(await page.locator('#arrival-screen').isVisible(),false);
    await page.waitForSelector('#universe-view canvas');
    await fits(page);
  }));

  await check('Cached Observations work without WebGL',()=>withPage({viewport:viewports[1],reducedMotion:'reduce'},async(page,context)=>{
    await context.addInitScript(()=>{
      const getContext=HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext=function(type,...args){
        return type.startsWith('webgl')?null:getContext.call(this,type,...args);
      };
    });
    await page.goto(base+'/');
    await page.waitForFunction(()=>window.skyshiftHero?.diagnostics().state==='failed');
    await page.locator('.intro-note a[href*="r-draconis"]').click();
    await ready(page);
    assert.ok(await page.locator('#canvas-a').isVisible());
    assert.equal(await page.locator('iframe').count(),0);
  }));

  await check('IRSA failure offers a retry without replacing the empty viewer with data',()=>withPage({viewport:viewports[0]},async page=>{
    let failedRequests=0;
    await page.route('**/api/observations/searches',route=>{
      failedRequests++;
      return route.abort('connectionreset');
    });
    await page.goto(base+'/explore.html');
    await page.locator('#show-search').click();
    await page.locator('#ra').fill('15');
    await page.locator('#dec').fill('2');
    await page.locator('#search-form button[type=submit]').click();
    await page.locator('#retry').waitFor();
    assert.match(await page.locator('#empty-viewer-title').textContent(),/unavailable/);
    assert.equal(await page.locator('#compare').isVisible(),false);
    await page.locator('#retry').click();
    await page.locator('#retry').waitFor();
    assert.equal(failedRequests,2);
    await audit(page);
  }));
}finally{
  const version=browser.version();
  await browser.close();
  await writeEvidenceFile(evidenceFile(output,'verification.json'),JSON.stringify({
    browser:version,base,results,pageErrors,
  },null,2)+'\n');
}
if(results.some(result=>result.status==='fail')||pageErrors.length)process.exitCode=1;
