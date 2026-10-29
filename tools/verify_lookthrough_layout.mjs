import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { pathToFileURL } from "node:url";
const { chromium } = await import(pathToFileURL(process.env.SKYSHIFT_PLAYWRIGHT_MODULE ||
  "C:/Users/LOQ/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs"));
const browser = await chromium.launch({ headless: true, executablePath:
  process.env.SKYSHIFT_CHROMIUM_EXECUTABLE || "C:/Program Files/Google/Chrome/Application/chrome.exe" });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
page.setDefaultTimeout(18000);
const errors = [], results = [], out = "tmp/lookthrough-layout";
page.on("pageerror", error => errors.push(error.message));
await fs.mkdir(out, { recursive: true });
async function inspect(id, stage, width) {
  const geometry = await page.locator("#telescope-experience").evaluate(panel => {
    const bounds = el => {
      const r = el.getBoundingClientRect();
      return { id: el.id || el.className, left: r.left, right: r.right, top: r.top, bottom: r.bottom };
    };
    const footer = panel.querySelector(".mission-bottom"), disclaimer = panel.querySelector(".mission-disclaimer");
    const previous = [...panel.children].slice(0, [...panel.children].indexOf(footer))
      .filter(el => el.getClientRects().length && getComputedStyle(el).display !== "none").at(-1);
    return { panel: bounds(panel), horizontalOverflow: panel.scrollWidth - panel.clientWidth,
      footer: bounds(footer), disclaimer: bounds(disclaimer), previous: bounds(previous),
      controls: [...panel.querySelectorAll(".mission-bottom > *, .mission-image-actions > *, .mission-fields > button, #mission-field-open")]
        .filter(el => el.getClientRects().length).map(bounds),
      documentOverflow: document.documentElement.scrollHeight - innerHeight };
  });
  const name = `${id} stage ${stage} at ${width}`;
  assert.ok(geometry.horizontalOverflow <= 1, `${name}: panel scrolls horizontally`);
  assert.ok(geometry.documentOverflow <= 1, `${name}: document scrolls`);
  assert.ok(geometry.footer.top - geometry.previous.bottom >= 23, `${name}: no separation before Continue`);
  assert.ok(geometry.disclaimer.top - geometry.footer.bottom >= 19, `${name}: disclaimer crowds controls`);
  for (const control of geometry.controls) {
    assert.ok(control.left >= geometry.panel.left && control.right <= geometry.panel.right, `${name}: control extends past panel`);
    assert.ok(control.bottom - control.top >= 44, `${name}: control too small`);
    for (const other of geometry.controls) {
      if (other === control) continue;
      const dx = Math.min(control.right, other.right) - Math.max(control.left, other.left);
      const dy = Math.min(control.bottom, other.bottom) - Math.max(control.top, other.top);
      assert.ok(dx <= 0 || dy <= 0, `${name}: ${control.id} overlaps ${other.id}`);
    }
  }
  await page.locator("#telescope-experience").evaluate(el => { el.scrollTop = el.scrollHeight; });
  assert.ok(await page.locator(".mission-disclaimer").evaluate(el => {
    const r = el.getBoundingClientRect(), p = el.closest("section").getBoundingClientRect();
    return r.bottom <= p.bottom + 1;
  }), `${name}: bottom text is unreachable`);
  results.push({ id, stage, width, geometry });
}
try {
  await page.goto("http://localhost:3000/#universe");
  await page.waitForFunction(() => window.skyshiftSpace && !document.querySelector("#camera-plus").disabled);
  for (const [width, height] of [[1440,900],[1024,768],[800,600],[390,844],[320,568],[844,390]]) {
    await page.setViewportSize({ width, height });
    for (const id of ["webb-b", "hubble", "spherex"]) {
      if (id === "webb-b") await page.locator("#hangar-toggle").click();
      await page.locator(`#mission-dock [data-telescope="${id}"]`).click();
      assert.equal(await page.locator("#telescope-experience").isVisible(), false);
      await page.locator("#look-through").click();
      assert.equal(await page.locator("#telescope-experience").evaluate(el => el.scrollTop), 0);
      for (const stage of [0, 1, 2]) {
        assert.equal(await page.locator("#telescope-experience").getAttribute("data-stage"), String(stage));
        if (stage === 0 && id === "spherex") {
          if (!(await page.locator("#mission-hardware").evaluate(el => el.open)))
            await page.locator("#mission-hardware > summary").click();
          await page.locator("[data-mission-component=panel]").click();
        }
        if (stage === 1) {
          if (!(await page.locator(".optics-details").evaluate(el => el.open)))
            await page.locator(".optics-details > summary").click();
          await page.locator("[data-channel='4']").click();
        }
        if (stage === 2) await page.locator("#mission-image:not([hidden])").waitFor();
        await inspect(id, stage, width);
        if ((width === 1440 || width === 390) && stage === 2)
          await page.screenshot({ path: `${out}/after-${width}-${id}.png` });
        await page.locator("#mission-next").click();
        assert.equal(await page.locator("#telescope-experience").getAttribute("data-stage"), String((stage + 1) % 3));
        assert.equal(await page.locator("#telescope-experience").evaluate(el => el.scrollTop), 0, "Continue must begin the next step at the top");
      }
      await page.locator("#mission-close").click();
    }
    console.log(`PASS ${width}x${height}: all telescopes and stages`);
  }
  assert.deepEqual(errors, []);
  await fs.writeFile(`${out}/results.json`, JSON.stringify({ results, errors }, null, 2));
  console.log(`PASS: ${results.length} telescope/stage layouts, footer spacing, source links, images, Continue and scroll containment.`);
} catch (error) {
  await page.screenshot({ path: `${out}/failure.png` }).catch(() => {});
  throw error;
} finally {
  await browser.close();
}
