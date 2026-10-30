import {createEvidenceDirectory,evidenceFile,writeEvidenceFile,claimEvidenceFile} from './evidence-output.mjs';
const evidenceRun=await createEvidenceDirectory('verify_destinations_menu',process.env.SKYSHIFT_EVIDENCE_OUTPUT);
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { pathToFileURL } from "node:url";
const { chromium } = await import(pathToFileURL(process.env.SKYSHIFT_PLAYWRIGHT_MODULE ||
  "C:/Users/LOQ/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs"));
const browser = await chromium.launch({ headless: true, executablePath:
  process.env.SKYSHIFT_CHROMIUM_EXECUTABLE || "C:/Program Files/Google/Chrome/Application/chrome.exe" });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
page.setDefaultTimeout(18000);
const results = [], errors = [], out = evidenceRun;
page.on("pageerror", error => errors.push(error.message));

async function open() {
  if (await page.locator("#destinations-drawer").isHidden())
    await page.locator("#destinations-toggle").click();
}
async function geometry(label) {
  const data = await page.locator("#destinations-drawer").evaluate(el => {
    const r = el.getBoundingClientRect(), tabs = [...el.querySelectorAll("[data-environment]")].map(b => b.getBoundingClientRect().toJSON());
    const collisions = [...document.querySelectorAll(".space-context,.mission-dock,.space-hud,.space-actions")]
      .filter(e => e.getClientRects().length).some(e => {
        const q = e.getBoundingClientRect();
        return Math.min(r.right,q.right)-Math.max(r.left,q.left)>1 && Math.min(r.bottom,q.bottom)-Math.max(r.top,q.top)>1;
      });
    return { width: innerWidth, height: innerHeight, rect: r.toJSON(), tabs, overflow: el.scrollWidth-el.clientWidth,
      pageOverflow: document.documentElement.scrollHeight-innerHeight, collisions };
  });
  assert.ok(data.overflow <= 1 && data.pageOverflow <= 1, `${label}: overflow ${JSON.stringify(data)}`);
  assert.ok(data.rect.y >= 72 && data.rect.bottom <= data.height + 1, `${label}: menu outside viewport`);
  assert.equal(data.collisions, false, `${label}: menu overlaps another panel`);
  assert.ok(data.tabs.every(t => Math.abs(t.top-data.tabs[0].top)<1 && t.height>=44), `${label}: uneven categories`);
  results.push({ label, ...data });
}
try {
  await page.goto("http://localhost:3000/#universe");
  await page.waitForFunction(() => window.skyshiftSpace && !document.querySelector("#camera-plus").disabled);
  for (const [width,height] of [[1440,900],[1024,768],[800,600],[390,844],[320,568],[844,390]]) {
    await page.setViewportSize({width,height});
    await open();
    assert.equal(await page.locator("#destinations-close").evaluate(e => e===document.activeElement), true);
    await page.locator('button[data-environment="observatory"]').click();
    assert.equal(await page.locator("#destination-list button").count(),1);
    await page.locator("#destination-collection").click();
    assert.equal(await page.locator("#destination-list button").count(),3);
    await geometry(`${width} telescopes`);
    await page.locator("#destination-search").fill("hubble");
    assert.equal(await page.locator("#destination-list button").count(),1);
    assert.equal(await page.locator("#destination-search-status").innerText(),"1 of 3 destinations");
    await page.locator('[data-destination="hubble"]').click();
    assert.equal(await page.locator("#destinations-drawer").isVisible(),false);
    assert.equal(await page.locator("#telescope-experience").isVisible(),false);
    assert.equal(await page.locator("#context-name").innerText(),"Hubble");
    await open();
    assert.equal(await page.locator('[data-destination="hubble"]').getAttribute("aria-pressed"),"true");
    await page.locator("#destination-clear").click();
    assert.equal(await page.locator("#destination-list button").count(),3);
    await page.locator("#destination-collection").click();
    for (const [environment,count,query,id] of [["solar",10,"earth","earth"],["sky",4,"Orion","m42"]]) {
      await page.locator(`button[data-environment="${environment}"]`).click();
      assert.equal(await page.locator("#destination-list button").count(),count);
      await geometry(`${width} ${environment}`);
      await page.locator("#destination-search").fill("no-such-destination");
      assert.equal(await page.locator("#destination-empty").isVisible(),true);
      await page.locator("#destination-reset").click();
      assert.equal(await page.locator("#destination-list button").count(),count);
      assert.equal(await page.locator("#destination-search").evaluate(e => e===document.activeElement),true);
      await page.locator("#destination-search").fill(query);
      assert.equal(await page.locator(`#destination-list [data-destination="${id}"]`).count(),1);
      await page.keyboard.press("Escape");
      assert.equal(await page.locator("#destinations-drawer").isVisible(),false);
      assert.equal(await page.locator("#destinations-toggle").evaluate(e => e===document.activeElement),true);
      await open();
      await page.locator("#destination-clear").click();
    }
    await page.locator('button[data-environment="solar"]').click();
    await page.locator('#destination-list button').first().focus();
    await page.keyboard.press("End");
    assert.equal(await page.evaluate(() => document.activeElement.dataset.destination),"moon");
    await page.keyboard.press("ArrowDown");
    assert.equal(await page.evaluate(() => document.activeElement.dataset.destination),"sun");
    await page.keyboard.press("ArrowUp");
    assert.equal(await page.evaluate(() => document.activeElement.dataset.destination),"moon");
    await page.keyboard.press("Enter");
    assert.equal(await page.locator("#context-name").innerText(),"Moon");
    await open();
    if(width===1440 || width===390) {
      await page.locator("#destinations-drawer").evaluate(el => {el.scrollTop=0;});
      await page.screenshot({path:await claimEvidenceFile(evidenceFile(evidenceRun,`${out}/${width}.png`))});
    }
    await page.locator('button[data-environment="observatory"]').click();
    await page.locator("#destinations-close").click();
    console.log(`PASS ${width}x${height}: search, collections, empty state, selection, keyboard and layout`);
  }
  assert.deepEqual(errors,[]);
  await writeEvidenceFile(evidenceFile(evidenceRun,`${out}/results.json`),JSON.stringify({results,errors},null,2));
} catch(error) {
  await page.screenshot({path:await claimEvidenceFile(evidenceFile(evidenceRun,`${out}/failure.png`))}).catch(()=>{});
  throw error;
} finally { await browser.close(); }
