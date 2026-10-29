// Real browser/model checks in isolated profiles. No human evaluation inferred.
import fs from "node:fs/promises";
import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
const { chromium } = await import(
  pathToFileURL(
    process.env.SKYSHIFT_PLAYWRIGHT_MODULE ||
      "C:/Users/LOQ/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs",
  )
);
const browser = await chromium.launch({
    headless: true,
    executablePath:
      process.env.SKYSHIFT_CHROMIUM_EXECUTABLE ||
      "C:/Program Files/Google/Chrome/Application/chrome.exe",
  }),
  results = [];
const testName = process.env.SKYSHIFT_TEST_NAME || "hero3d",
  out = "tmp/" + testName + "-details-qa";
await fs.mkdir(out, { recursive: true });
async function page(options = {}) {
  const c = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    acceptDownloads: true,
    ...options,
  });
  await c.route("**/*", (r) =>
    new URL(r.request().url()).hostname === "localhost" ||
    r.request().url().startsWith("blob:")
      ? r.continue()
      : r.abort(),
  );
  const p = await c.newPage();
  p.setDefaultTimeout(18000);
  return { c, p };
}
async function ready(p, reveal = false) {
  await p.goto("http://localhost:3000/");
  await p.waitForFunction(() => window.skyshiftHero && document.body.dataset.controller === 'ready');
  await p.evaluate(() => document.fonts.ready);
  const initial = {
    scroll_y: await p.evaluate(() => scrollY),
    action: await p.locator('.intro-actions .primary-link').boundingBox(),
  };
  // On phones the hero follows the introduction. Its renderer deliberately
  // starts on visibility; do not wait for offscreen GPU work before revealing it.
  if (reveal) await p.locator('.hero-observatory').scrollIntoViewIfNeeded();
  await p.waitForFunction(
    () => window.skyshiftHero?.diagnostics().model?.frames > 0,
  );
  return initial;
}
async function science(p) {
  await p.waitForFunction(
    () =>
      window.skyshiftWebsite?.diagnostics().investigation.kind === "pair" &&
      !window.skyshiftWebsite.diagnostics().investigation.busy,
  );
}
async function check(name, fn) {
  if (process.env.SKYSHIFT_TEST_FILTER && !new RegExp(process.env.SKYSHIFT_TEST_FILTER).test(name)) return;
  try {
    results.push({ name, status: "pass", detail: await fn() });
    console.log("PASS " + name);
  } catch (e) {
    results.push({ name, status: "fail", error: e.message });
    throw e;
  }
}
try {
  for (const [width, height] of [
    [1440, 900],
    [1024, 768],
    [390, 844],
    [320, 667],
  ])
    await check(
      `Real hero geometry renders with visible comparison access at ${width}x${height}`,
      async () => {
        const { c, p } = await page({ viewport: { width, height } });
        try {
          const initial = await ready(p, true);
          assert.equal(
            await p
              .locator(
                ".hero-observatory svg,.hero-observatory img,.hero-observatory image",
              )
              .count(),
            0,
          );
          assert.equal(
            await p.evaluate(
              () => document.documentElement.scrollWidth - innerWidth,
            ),
            0,
          );
          assert.equal(initial.scroll_y, 0);
          assert.ok(initial.action.y >= 0 && initial.action.y + initial.action.height <= height);
          await p.screenshot({
            path: out + `/home-${width}.png`,
          });
          const d = await p.evaluate(() => skyshiftHero.diagnostics());
          assert.equal(d.model.presentation, "hero");
          assert.ok(d.model.triangles > 1000 && d.model.draw_calls < 150);
          await p.waitForTimeout(150);
          assert.equal(
            (await p.evaluate(() => skyshiftHero.diagnostics())).model.frames,
            d.model.frames,
          );
          return {
            draw_calls: d.model.draw_calls,
            triangles: d.model.triangles,
            idle_frame_delta: 0,
          };
        } finally {
          await c.close();
        }
      },
    );
  await check(
    "Drag, keyboard rotation, zoom, reset and actual mesh selection work",
    async () => {
      const { c, p } = await page();
      try {
        await ready(p);
        const canvas = p.locator("#hero-model-canvas"),
          r = await canvas.boundingBox(),
          initial = await p.evaluate(
            () => skyshiftHero.diagnostics().model.camera,
          );
        await p.mouse.move(r.x + r.width * 0.5, r.y + r.height * 0.45);
        await p.mouse.down();
        await p.mouse.move(r.x + r.width * 0.65, r.y + r.height * 0.48, {
          steps: 8,
        });
        await p.mouse.up();
        assert.notDeepEqual(
          await p.evaluate(() => skyshiftHero.diagnostics().model.camera),
          initial,
        );
        await p.click("#hero-model-reset");
        assert.deepEqual(
          await p.evaluate(() => skyshiftHero.diagnostics().model.camera),
          initial,
        );
        await canvas.focus();
        await p.keyboard.press("ArrowRight");
        assert.notDeepEqual(
          await p.evaluate(() => skyshiftHero.diagnostics().model.camera),
          initial,
        );
        await p.click("#hero-model-reset");
        await p.click("#hero-model-zoom-in");
        assert.notDeepEqual(
          await p.evaluate(() => skyshiftHero.diagnostics().model.camera),
          initial,
        );
        await p.click("#hero-model-reset");
        let selected;
        for (const [x, y] of [
          [0.5, 0.4],
          [0.5, 0.5],
          [0.55, 0.35],
          [0.6, 0.4],
        ]) {
          await p.mouse.click(r.x + r.width * x, r.y + r.height * y);
          selected = await p.evaluate(
            () => skyshiftHero.diagnostics().model.selected,
          );
          if (selected) break;
        }
        assert.ok(selected, "ray casting should select a real mesh");
        assert.match(
          await p.locator("#hero-model-description").innerText(),
          /Illustrative model/,
        );
        return { selected };
      } finally {
        await c.close();
      }
    },
  );
  await check(
    "Wheel scrolls the website and offscreen rendering stops",
    async () => {
      const { c, p } = await page();
      try {
        await ready(p);
        const r = await p.locator("#hero-model-canvas").boundingBox(),
          before = await p.evaluate(
            () => skyshiftHero.diagnostics().model.camera,
          );
        await p.mouse.move(r.x + r.width * 0.5, r.y + r.height * 0.5);
        await p.mouse.wheel(0, 700);
        await p.waitForFunction(() => scrollY > 200);
        // A fixed wheel delta need not hide the whole responsive hero. Reveal
        // the offscreen condition explicitly before asserting GPU inactivity.
        await p.evaluate(() => scrollTo({
          top: document.querySelector('.hero-observatory').getBoundingClientRect().bottom + scrollY + 1,
          behavior: 'instant',
        }));
        await p.waitForFunction(
          () => scrollY > 200 && !skyshiftHero.diagnostics().visible,
        );
        assert.deepEqual(
          await p.evaluate(() => skyshiftHero.diagnostics().model.camera),
          before,
        );
        const frames = await p.evaluate(
          () => skyshiftHero.diagnostics().model.frames,
        );
        await p.waitForTimeout(150);
        assert.equal(
          await p.evaluate(() => skyshiftHero.diagnostics().model.frames),
          frames,
        );
      } finally {
        await c.close();
      }
    },
  );
  await check(
    "Direct comparison downloads no 3D modules; leaving the hero pauses it",
    async () => {
      const { c, p } = await page();
      try {
        const requests = [];
        p.on("request", (r) => requests.push(r.url()));
        await p.goto("http://localhost:3000/#compare");
        await science(p);
        assert.deepEqual(
          requests.filter((u) =>
            /vendor\/three|mission-model\.js|spherex-model\.js|\.glb/.test(u),
          ),
          [],
        );
        await p.click(".site-brand");
        await p.waitForFunction(
          () => skyshiftHero.diagnostics().model?.frames > 0,
        );
        await p.click(".site-navigation a[data-route=compare]");
        await science(p);
        assert.equal(
          await p.evaluate(() => skyshiftHero.diagnostics().model.visible),
          false,
        );
        const frames = await p.evaluate(
          () => skyshiftHero.diagnostics().model.frames,
        );
        await p.waitForTimeout(150);
        assert.equal(
          await p.evaluate(() => skyshiftHero.diagnostics().model.frames),
          frames,
        );
      } finally {
        await c.close();
      }
    },
  );
  await check(
    "Actual WebGL loss retries with a fresh canvas and science remains usable",
    async () => {
      const { c, p } = await page();
      try {
        await ready(p);
        await p.evaluate(() => {
          window.oldHero = document.querySelector("#hero-model-canvas");
          oldHero
            .getContext("webgl2")
            .getExtension("WEBGL_lose_context")
            .loseContext();
        });
        await p.locator("#hero-model-retry").waitFor({ state: "visible" });
        await p.click("#hero-model-retry");
        await p.waitForFunction(
          () => skyshiftHero.diagnostics().model?.frames > 0,
        );
        assert.equal(
          await p.evaluate(
            () => oldHero !== document.querySelector("#hero-model-canvas"),
          ),
          true,
        );
        await p.click(".site-navigation a[data-route=compare]");
        await science(p);
      } finally {
        await c.close();
      }
    },
  );
  await check(
    "Unavailable WebGL offers a clear fallback without blocking comparison or export",
    async () => {
      const { c, p } = await page();
      try {
        await c.addInitScript(() => {
          const original = HTMLCanvasElement.prototype.getContext;
          HTMLCanvasElement.prototype.getContext = function (type, ...args) {
            return /webgl/.test(type)
              ? null
              : original.call(this, type, ...args);
          };
        });
        await p.goto("http://localhost:3000/");
        await p.waitForFunction(
          () => window.skyshiftHero?.diagnostics().state === "failed",
        );
        assert.match(
          await p.locator("#hero-model-message").innerText(),
          /observations still work/,
        );
        await p.click(".intro-actions .primary-link");
        await science(p);
        const event = p.waitForEvent("download");
        await p.click("#instrument-save");
        assert.ok((await fs.stat(await (await event).path())).size > 1000);
      } finally {
        await c.close();
      }
    },
  );
  await check(
    "A missing hero controller leaves the scientific application ready",
    async () => {
      const { c, p } = await page();
      try {
        await p.route("**/hero-model.js", (r) => r.abort());
        await p.goto("http://localhost:3000/");
        await p.waitForFunction(
          () => document.body.dataset.controller === "ready",
        );
        await p.locator("#hero-model-retry").waitFor({ state: "visible" });
        await p.click(".intro-actions .primary-link");
        await science(p);
      } finally {
        await c.close();
      }
    },
  );
  await check(
    "Delayed model loading cannot initialize hidden graphics after entering science",
    async () => {
      const { c, p } = await page();
      let release;
      try {
        const gate = new Promise((r) => (release = r));
        await p.route("**/mission-model.js", async (r) => {
          await gate;
          await r.continue();
        });
        await p.goto("http://localhost:3000/");
        await p.waitForFunction(
          () => window.skyshiftHero?.diagnostics().state === "loading",
        );
        await p.click(".site-navigation a[data-route=compare]");
        await science(p);
        release();
        await p.waitForTimeout(150);
        assert.equal(
          await p.evaluate(() => skyshiftHero.diagnostics().model),
          null,
        );
        await p.click(".site-brand");
        await p.waitForFunction(
          () => skyshiftHero.diagnostics().model?.frames > 0,
        );
      } finally {
        release?.();
        await c.close();
      }
    },
  );
  await check(
    "Touch rotation preserves ordinary vertical page scrolling",
    async () => {
      const { c, p } = await page({
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
      });
      try {
        await ready(p, true);
        const cdp = await c.newCDPSession(p),
          r = await p.locator("#hero-model-canvas").boundingBox();
        const x = r.x + r.width * 0.45,
          y = r.y + r.height * 0.45;
        const before = await p.evaluate(
          () => skyshiftHero.diagnostics().model.camera,
        );
        async function gesture(dx, dy) {
          await cdp.send("Input.dispatchTouchEvent", {
            type: "touchStart",
            touchPoints: [{ x, y }],
          });
          for (let i = 1; i <= 8; i++)
            await cdp.send("Input.dispatchTouchEvent", {
              type: "touchMove",
              touchPoints: [{ x: x + (dx * i) / 8, y: y + (dy * i) / 8 }],
            });
          await cdp.send("Input.dispatchTouchEvent", {
            type: "touchEnd",
            touchPoints: [],
          });
        }
        await gesture(90, 0);
        assert.notDeepEqual(
          await p.evaluate(() => skyshiftHero.diagnostics().model.camera),
          before,
        );
        const scrollBefore = await p.evaluate(() => scrollY);
        await gesture(0, -130);
        await p.waitForFunction(before => scrollY > before + 20, scrollBefore);
      } finally {
        await c.close();
      }
    },
  );
  await check(
    "Reduced motion renders a static interactive model without an idle animation loop",
    async () => {
      const { c, p } = await page({ reducedMotion: "reduce" });
      try {
        await ready(p);
        const frames = await p.evaluate(
          () => skyshiftHero.diagnostics().model.frames,
        );
        await p.waitForTimeout(250);
        assert.equal(
          await p.evaluate(() => skyshiftHero.diagnostics().model.frames),
          frames,
        );
        await p.locator("#hero-model-canvas").focus();
        await p.keyboard.press("ArrowRight");
        await p.waitForFunction(
          (n) => skyshiftHero.diagnostics().model.frames > n,
          frames,
        );
      } finally {
        await c.close();
      }
    },
  );
} catch (e) {
  console.error(e);
  process.exitCode = 1;
} finally {
  await fs.writeFile(
    "docs/evidence/" + testName + "_model_tests.json",
    JSON.stringify(
      {
        recorded_at_utc: new Date().toISOString(),
        browser: await browser.version(),
        profile: "isolated",
        results,
        limits: [
          "Model fittings and materials are illustrative, not certified CAD",
          "Scientific approval and internal human review PENDING",
          "Mobile devices emulated; no independent human UX study",
        ],
      },
      null,
      2,
    ) + "\n",
  );
  await browser.close();
}
