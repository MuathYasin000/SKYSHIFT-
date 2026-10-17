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
async function page() {
  const c = await browser.newContext({
    viewport: { width: 1366, height: 900 },
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
async function ready(p) {
  await p.waitForFunction(() => window.skyshiftSpace?.diagnostics().frames > 0);
}
async function loaded(p, field) {
  await p.waitForFunction(
    (f) =>
      window.skyshiftSpace?.investigation().field === f &&
      !skyshiftSpace.investigation().busy &&
      skyshiftSpace.investigation().opened,
    field,
  );
}
async function check(name, action) {
  try {
    results.push({ name, status: "pass", detail: await action() });
    console.log("PASS " + name);
  } catch (e) {
    results.push({ name, status: "fail", error: e.message });
    throw e;
  }
}
try {
  await check(
    "Failed root dependency exposes independent scientific recovery",
    async () => {
      const { c, p } = await page();
      try {
        await p.route("**/observation-console.js", (r) => r.abort());
        await p.goto("http://localhost:3000/");
        await p.waitForFunction(
          () => document.body.dataset.controller === "failed",
        );
        assert.equal(await p.locator("#render-fallback").isVisible(), true);
        const r = await p.request.get("http://localhost:3000/explore.html");
        assert.equal(r.status(), 200);
        await p.goto("http://localhost:3000/explore.html");
        await p.locator("#explorer[aria-busy=false]").waitFor();
      } finally {
        await c.close();
      }
    },
  );
  await check(
    "Catalogue failure offers retry without displaying unverified data",
    async () => {
      const { c, p } = await page();
      try {
        await p.route("**/data/explore-catalog.json", (r) =>
          r.fulfill({
            status: 200,
            contentType: "application/json",
            body: "{}",
          }),
        );
        await p.goto("http://localhost:3000/?view=classic");
        await p.locator("#instrument-retry").waitFor({ state: "visible" });
        assert.equal(
          (await p.evaluate(() => skyshiftSpace.investigation())).kind,
          undefined,
        );
        await p.unroute("**/data/explore-catalog.json");
        await p.click("#instrument-retry");
        await loaded(p, "m101");
      } finally {
        await c.close();
      }
    },
  );
  await check(
    "Latest native field selection wins during deferred scientific data loading",
    async () => {
      const { c, p } = await page();
      let release;
      try {
        await p.goto("http://localhost:3000/?view=classic");
        await loaded(p, "m101");
        const gate = new Promise((r) => (release = r));
        await p.route("**/data/explore/m42-*.json", async (r) => {
          await gate;
          await r.continue();
        });
        await p.click('[data-instrument-field="m42"]');
        await p.click('[data-instrument-field="ngc188"]');
        await loaded(p, "ngc188");
        release();
        await p.waitForTimeout(300);
        assert.equal(
          (await p.evaluate(() => skyshiftSpace.investigation())).field,
          "ngc188",
        );
      } finally {
        release?.();
        await c.close();
      }
    },
  );
  await check(
    "Actual graphics-context loss keeps investigation, retry replaces canvas and retains science",
    async () => {
      const { c, p } = await page();
      try {
        await p.goto("http://localhost:3000/");
        await ready(p);
        await p.click("#observations-button");
        await loaded(p, "m101");
        await p.click("#instrument-zoom-in");
        const view = (await p.evaluate(() => skyshiftSpace.investigation()))
          .display;
        await p.evaluate(() => {
          window.qaOldCanvas = document.getElementById("universe");
          qaOldCanvas
            .getContext("webgl2")
            .getExtension("WEBGL_lose_context")
            .loseContext();
        });
        await p.waitForFunction(
          () => skyshiftSpace.diagnostics().webgl === "lost",
        );
        assert.deepEqual(
          (await p.evaluate(() => skyshiftSpace.investigation())).display,
          view,
        );
        await p.click("#instrument-close");
        await p.click("#retry-renderer");
        await ready(p);
        assert.equal(
          await p.evaluate(
            () => qaOldCanvas !== document.getElementById("universe"),
          ),
          true,
        );
        await p.click("#observations-button");
        await loaded(p, "m101");
        assert.deepEqual(
          (await p.evaluate(() => skyshiftSpace.investigation())).display,
          view,
        );
      } finally {
        await c.close();
      }
    },
  );
  await check(
    "Camera, solar support, repeated mode changes and idle rendering remain bounded",
    async () => {
      const { c, p } = await page();
      try {
        await p.goto("http://localhost:3000/");
        await ready(p);
        await p.click("#destinations-toggle");
        await p.click('[data-environment="solar"]');
        await p.click('[data-destination="earth"]');
        await p.waitForFunction(() =>
          skyshiftSpace.diagnostics().assets_loaded.includes("earth-natural"),
        );
        await p.click('[data-telescope="spherex"]');
        await p.click("#mission-close");
        await p.click("#from-hardware-to-sky");
        await p.click('[data-destination="m42"]');
        await p.waitForTimeout(850);
        const before = await p.evaluate(() => skyshiftSpace.diagnostics());
        await p.click("#inspect-observation");
        await loaded(p, "m42");
        await p.click("#instrument-close");
        await p.waitForTimeout(850);
        const after = await p.evaluate(() => skyshiftSpace.diagnostics());
        for (let i = 0; i < 3; i++)
          assert.ok(Math.abs(before.camera[i] - after.camera[i]) < 1e-6);
        for (let i = 0; i < 6; i++) {
          await p.click("#observations-button");
          await loaded(p, "m42");
          await p.click("#classic-toggle");
          await p.click("#classic-toggle");
          await p.click("#instrument-close");
        }
        await p.waitForTimeout(1200);
        const frames = await p.evaluate(
          () => skyshiftSpace.diagnostics().frames,
        );
        await p.waitForTimeout(600);
        assert.equal(
          await p.evaluate(() => skyshiftSpace.diagnostics().frames),
          frames,
        );
        const t = performance.now();
        await p.click("#settings-button");
        const input_ms = performance.now() - t;
        return {
          cycles: 6,
          idle_frames: 0,
          settings_response_ms: input_ms,
          render_submission_ms: (
            await p.evaluate(() => skyshiftSpace.diagnostics())
          ).render_ms.slice(-20),
          limits:
            "CPU submission timing; not GPU timing or a frame-rate guarantee",
        };
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
    "docs/evidence/unified_recovery_tests.json",
    JSON.stringify(
      {
        recorded_at_utc: new Date().toISOString(),
        browser: await browser.version(),
        profile: "isolated",
        results,
        failures_are_explicitly_injected: true,
      },
      null,
      2,
    ),
  );
  await browser.close();
}
