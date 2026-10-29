import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
const { chromium } = await import(pathToFileURL(process.env.SKYSHIFT_PLAYWRIGHT_MODULE ||
  'C:/Users/LOQ/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs'));
const browser = await chromium.launch({ headless: true, executablePath:
  process.env.SKYSHIFT_CHROMIUM_EXECUTABLE || 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
page.setDefaultTimeout(20000);
const errors = [], results = [];
page.on('pageerror', error => errors.push(error.message));
await fs.mkdir('tmp/universe-layout', { recursive: true });
async function inspect(state) {
  const result = await page.evaluate(() => {
    const rect = el => {
      const r = el.getBoundingClientRect();
      return { id: el.id || el.className, x: r.x, y: r.y, right: r.right, bottom: r.bottom, width: r.width, height: r.height };
    };
    const panels = [...document.querySelectorAll('#destinations-toggle,.space-actions,#destinations-drawer,#space-context,#telescope-experience,.mission-dock,.space-hud,#journey-strip')]
      .filter(el => el.getClientRects().length && !el.hidden).map(rect);
    return { viewport: { width: innerWidth, height: innerHeight }, scrollHeight: document.documentElement.scrollHeight,
      scrollWidth: document.documentElement.scrollWidth, scrollY, panels, canvas: rect(document.querySelector('#universe')) };
  });
  assert.ok(result.scrollHeight <= result.viewport.height + 1, `${state}: document scrolls ${JSON.stringify(result)}`);
  assert.ok(result.scrollWidth <= result.viewport.width + 1, `${state}: horizontal overflow`);
  assert.equal(result.scrollY, 0, `${state}: page moved`);
  assert.ok(result.canvas.height > 0);
  for (const panel of result.panels) {
    assert.ok(panel.x >= -1 && panel.y >= 71 && panel.right <= result.viewport.width + 1 && panel.bottom <= result.viewport.height + 1,
      `${state}: panel outside viewport ${JSON.stringify(panel)}`);
    for (const other of result.panels) {
      if (other === panel) continue;
      const overlap = Math.min(panel.right, other.right) - Math.max(panel.x, other.x) > 1 &&
        Math.min(panel.bottom, other.bottom) - Math.max(panel.y, other.y) > 1;
      assert.ok(!overlap, `${state}: ${panel.id} collides with ${other.id}: ${JSON.stringify(result)}`);
    }
  }
  results.push({ state, ...result });
}
try {
  await page.goto('http://localhost:3000/#universe');
  await page.waitForFunction(() => window.skyshiftSpace);
  await page.waitForFunction(() => !document.querySelector('#camera-plus').disabled);
  // Pick the actual SPHEREx mesh, then exercise the label and menu while an
  // explanation is open. Every selection path must return to the first menu.
  const canvas = await page.locator('#universe').boundingBox();
  await page.mouse.move(canvas.x + canvas.width / 2, canvas.y + canvas.height / 2);
  await page.waitForFunction(() => window.skyshiftSpace.diagnostics().hover_id === 'spherex');
  await page.mouse.down();
  await page.mouse.up();
  await page.waitForFunction(() => document.querySelector('#component-description').textContent.length > 0);
  assert.equal(await page.locator('#telescope-experience').isVisible(), false, 'Model picking must show component info without launching Look through');
  await page.locator('[data-object="spherex"]').click();
  assert.equal(await page.locator('#context-toggle').getAttribute('aria-expanded'), 'false');
  assert.equal(await page.locator('#telescope-experience').isVisible(), false);
  await page.locator('#look-through').click();
  assert.equal(await page.locator('#telescope-experience').isVisible(), true);
  await page.locator('#mission-dock [data-telescope="spherex"]').click();
  assert.equal(await page.locator('#telescope-experience').isVisible(), false, 'Selecting again must return to the first menu');
  await page.locator('#destinations-toggle').click();
  await page.locator('[data-destination="spherex"]').click();
  assert.equal(await page.locator('#destinations-drawer').isVisible(), false);
  assert.equal(await page.locator('#space-context').isVisible(), true);
  assert.equal(await page.locator('#telescope-experience').isVisible(), false);
  console.log('Verified mesh, component, label, destination and dock selection');
  for (const [width, height] of [[1440,900],[1280,720],[1024,768],[820,600],[800,600],[390,844],[320,568],[844,390]]) {
    await page.setViewportSize({ width, height });
    await inspect(`${width}x${height} initial`);
    await page.locator('#context-toggle').click();
    await inspect(`${width}x${height} expanded`);
    // Scrolling long source details must stay inside their card.
    await page.locator('#space-context').hover();
    await page.mouse.wheel(0, 1600);
    await page.waitForTimeout(100);
    assert.ok(await page.locator('#space-context').evaluate(el => el.scrollTop > 0), 'Long details should scroll inside the panel');
    await inspect(`${width}x${height} panel scroll`);
    await page.locator('#space-context').evaluate(el => { el.scrollTop = 0; });
    await page.locator('#context-toggle').click();
    await page.locator('#destinations-toggle').click();
    await inspect(`${width}x${height} destinations`);
    for (const environment of ['solar', 'sky', 'observatory']) {
      await page.locator(`button[data-environment="${environment}"]`).click();
      await inspect(`${width}x${height} ${environment} destinations`);
    }
    await page.locator('#destinations-toggle').click();
    await page.locator('#journey-button').click();
    await inspect(`${width}x${height} tour`);
    await page.locator('#journey-exit').click();
    await page.locator('#hangar-toggle').click();
    for (const id of ['webb-b', 'hubble', 'spherex']) {
      await page.locator(`#mission-dock [data-telescope="${id}"]`).click();
      assert.equal(await page.locator('#telescope-experience').isVisible(), false, 'Selection must open the compact menu first');
      assert.equal(await page.locator('#space-context').isVisible(), true);
      assert.equal(await page.locator('#context-toggle').getAttribute('aria-expanded'), 'false');
      await inspect(`${width}x${height} ${id} selection menu`);
      await page.locator('#look-through').click();
      await inspect(`${width}x${height} ${id} explanation`);
      assert.equal(await page.locator('#space-context').isVisible(), false);
      await page.locator('#telescope-experience').evaluate(el => { el.scrollTop = 0; });
      await page.locator('#mission-close').click();
      await inspect(`${width}x${height} ${id} info`);
    }
    // Wheel and keyboard over the scene must not scroll the document.
    await page.locator('#universe').focus();
    await page.keyboard.press('PageDown');
    await page.mouse.move(20, height / 2);
    await page.mouse.wheel(0, 600);
    await page.waitForTimeout(100);
    await inspect(`${width}x${height} scene scroll`);
    if (width === 1440 || width === 390)
      await page.screenshot({ path: `tmp/universe-layout/${width}.png` });
    console.log(`Verified ${width}x${height}`);
  }
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.locator('[data-route="observations"]').click();
  await page.waitForFunction(() => document.body.dataset.surface === 'science');
  await page.locator('[data-route="universe"]').click();
  await page.waitForFunction(() => document.body.dataset.surface === 'universe');
  await inspect('return from science');
  await page.locator('.site-brand').click();
  await page.waitForFunction(() => document.body.dataset.surface === 'home');
  assert.ok(await page.evaluate(() => document.documentElement.scrollHeight > innerHeight), 'Homepage must retain scrolling');
  assert.ok(await page.locator('.site-footer').isVisible(), 'Homepage footer must return');
  assert.deepEqual(errors, []);
  const fallbackBrowser = await chromium.launch({ headless: true, executablePath:
    process.env.SKYSHIFT_CHROMIUM_EXECUTABLE || 'C:/Program Files/Google/Chrome/Application/chrome.exe', args: ['--disable-webgl'] });
  try {
    const fallback = await fallbackBrowser.newPage({ viewport: { width: 390, height: 600 }, reducedMotion: 'reduce' });
    await fallback.goto('http://localhost:3000/#universe');
    await fallback.locator('#render-fallback').waitFor({ state: 'visible' });
    const geometry = await fallback.locator('#render-fallback').boundingBox();
    assert.ok(geometry.y >= 72 && geometry.y + geometry.height <= 600);
    await fallback.locator('#fallback-classic').click();
    await fallback.waitForFunction(() => document.body.dataset.surface === 'science');
  } finally {
    await fallbackBrowser.close();
  }
  await fs.writeFile('tmp/universe-layout/results.json', JSON.stringify({ results, errors }, null, 2));
  console.log(`PASS: ${results.length} layout states; source scrolling, scene scroll lock, science navigation, homepage scrolling and no-WebGL recovery.`);
} finally {
  await browser.close();
}
