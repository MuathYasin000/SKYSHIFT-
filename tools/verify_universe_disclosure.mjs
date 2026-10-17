// Check the label itself, independently of its disclosure indicator, everywhere
// the shared Universe control is used. No scene/data/rendering changes.
import fs from "node:fs/promises";
import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
const { chromium } = await import(
  pathToFileURL(
    process.env.SKYSHIFT_PLAYWRIGHT_MODULE ||
      "C:/Users/LOQ/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs",
  )
);
const suffix = process.env.SKYSHIFT_TEST_SUFFIX || "chrome",
  out = "tmp/universe-disclosure/" + suffix,
  results = [],
  errors = [];
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  executablePath:
    process.env.SKYSHIFT_CHROMIUM_EXECUTABLE ||
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
});
const page = await browser.newPage({
  viewport: { width: 1440, height: 900 },
  reducedMotion: "reduce",
});
page.setDefaultTimeout(18000);
page.on("pageerror", (e) => errors.push(e.message));
async function drawer(open) {
  const b = page.locator("#destinations-toggle");
  if (((await b.getAttribute("aria-expanded")) === "true") !== open)
    await b.click();
}
async function inspect(environment, id, width) {
  const states = [];
  for (const open of [false, true]) {
    const b = page.locator("#context-toggle");
    if (((await b.getAttribute("aria-expanded")) === "true") !== open) {
      await b.focus();
      await page.keyboard.press("Enter");
    }
    const g = await b.evaluate((e) => {
      const bounds = (n) => {
        const r = n.getBoundingClientRect();
        return {
          left: r.left,
          right: r.right,
          top: r.top,
          bottom: r.bottom,
          width: r.width,
          height: r.height,
        };
      };
      const button = bounds(e),
        label = bounds(e.querySelector(".context-toggle-label")),
        icon = bounds(e.querySelector(".context-toggle-indicator"));
      const range = document.createRange();
      range.selectNodeContents(e.querySelector(".context-toggle-label"));
      const text = range.getBoundingClientRect();
      return {
        button,
        label,
        icon,
        label_text: e.querySelector(".context-toggle-label").textContent,
        indicator: e.querySelector(".context-toggle-indicator").textContent,
        center_dx: (text.left + text.right - button.left - button.right) / 2,
        center_dy: (text.top + text.bottom - button.top - button.bottom) / 2,
        text_right: text.right,
        text_left: text.left,
        overflow: e.scrollWidth - e.clientWidth,
      };
    });
    assert.equal(g.label_text, open ? "Close details" : "About & sources");
    assert.equal(g.indicator, open ? "−" : "+");
    assert.ok(
      Math.abs(g.center_dx) < 1 && Math.abs(g.center_dy) < 2,
      JSON.stringify(g),
    );
    assert.ok(g.overflow <= 1);
    assert.ok(
      g.text_left > g.button.left && g.text_right < g.icon.left,
      JSON.stringify(g),
    );
    assert.equal(
      await page.locator("#context-details").evaluate((e) => !e.hidden),
      open,
    );
    assert.equal(await b.getAttribute("aria-controls"), "context-details");
    states.push({
      expanded: open,
      label_center_dx: g.center_dx,
      label_center_dy: g.center_dy,
      label_clear_of_indicator: true,
    });
  }
  // Leave the details closed so it cannot affect the next destination's layout.
  await page.locator("#context-toggle").click();
  results.push({ environment, destination: id, width, status: "pass", states });
}
try {
  await page.goto("http://localhost:3000/#universe");
  await page.waitForFunction(
    () => window.skyshiftSpace?.diagnostics().frames > 0,
  );
  await page.evaluate(() => document.fonts.ready);
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const environment of ["observatory", "solar", "sky"]) {
      await drawer(true);
      await page.locator('button[data-environment="' + environment + '"]').click();
      if (
        environment === "observatory" &&
        (await page.locator('[data-destination="webb-b"]').count()) === 0
      )
        await page.locator("#hangar-toggle").click();
      await drawer(true);
      const ids = await page
        .locator("#destination-list [data-destination]")
        .evaluateAll((es) => es.map((e) => e.dataset.destination));
      assert.ok(ids.length > 0);
      for (const id of ids) {
        await drawer(true);
        await page
          .locator('#destination-list [data-destination="' + id + '"]')
          .click();
        await drawer(false);
        await inspect(environment, id, width);
      }
      console.log(
        "PASS " +
          environment +
          " at " +
          width +
          ": " +
          ids.length +
          " destinations, both disclosure states",
      );
    }
  }
  for (const width of [320, 768, 1024, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    await drawer(true);
    await page.locator('button[data-environment="observatory"]').click();
    await drawer(false);
    await inspect("observatory", "spherex", width);
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  await page
    .locator("#space-context")
    .screenshot({ path: out + "/desktop.png" });
  await page.setViewportSize({ width: 390, height: 900 });
  await page
    .locator("#space-context")
    .screenshot({ path: out + "/mobile.png" });
  assert.deepEqual(errors, []);
} catch (e) {
  console.error(e.stack);
  process.exitCode = 1;
  await page.screenshot({ path: out + "/failure.png" }).catch(() => {});
} finally {
  await fs.writeFile(
    "docs/evidence/universe_disclosure_tests_" + suffix + ".json",
    JSON.stringify(
      {
        recorded_at_utc: new Date().toISOString(),
        browser: browser.version(),
        results,
        page_errors: errors,
        limits: [
          "Actual label text bounds, distinct icon, keyboard toggle and aria state; mobile widths emulated",
          "All local destination options exercised; no subjective design certification inferred",
          "Scientific data/review status unchanged",
        ],
      },
      null,
      2,
    ) + "\n",
  );
  await browser.close();
}
