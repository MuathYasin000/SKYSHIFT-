import {createEvidenceDirectory,evidenceFile,writeEvidenceFile,claimEvidenceFile} from './evidence-output.mjs';
const evidenceRun=await createEvidenceDirectory('verify_runtime_recovery',process.env.SKYSHIFT_EVIDENCE_OUTPUT);
// Failure injection is labelled explicitly. Fresh test profiles never access
// the user's browser profile or represent verification of their open session.
import { pathToFileURL } from "node:url";
import fs from "node:fs/promises";
import assert from "node:assert/strict";
const { chromium } = await import(
  pathToFileURL(
    process.env.SKYSHIFT_PLAYWRIGHT_MODULE ||
      "C:/Users/LOQ/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs",
  ).href
);
const executablePath =
  process.env.SKYSHIFT_CHROMIUM_EXECUTABLE ||
  "C:/Program Files/Google/Chrome/Application/chrome.exe";
const base = "http://localhost:3000",
  results = [];
const browser = await chromium.launch({ executablePath, headless: true });
const errors = [];
async function page(options = {}) {
  const context = await browser.newContext({
    viewport: { width: 1366, height: 768 },
    ...options,
  });
  const page = await context.newPage();
  page.setDefaultTimeout(18000);
  await context.route("**/*", (route) =>
    new URL(route.request().url()).hostname === "localhost" ||
    route.request().url().startsWith("blob:")
      ? route.continue()
      : route.abort(),
  );
  return { context, page };
}
async function ready(page) {
  await page.waitForFunction(
    () => window.skyshiftSpace?.diagnostics().frames > 0,
  );
}
async function destinations(page) {
  if (!(await page.locator("#destinations-drawer").isVisible()))
    await page.locator("#destinations-toggle").click();
}
async function check(name, run) {
  try {
    const detail = await run();
    results.push({ name, status: "pass", detail });
    console.log("PASS " + name);
  } catch (e) {
    results.push({ name, status: "fail", error: e.message });
    throw e;
  }
}
try {
  await check(
    "A failed controller dependency displays recovery and the independent observation link works",
    async () => {
      const { context, page: p } = await page();
      const injected = [];
      p.on("console", (m) => {
        if (m.type() === "error") injected.push(m.text());
      });
      await p.route("**/space-audio.js", (r) => r.abort("failed"));
      await p.goto(base);
      await p
        .locator("body[data-controller=failed]")
        .waitFor({ state: "attached" });
      assert.ok(await p.locator("#render-fallback").isVisible());
      assert.equal(
        await p.locator("#observations-button").getAttribute("href"),
        "./explore.html",
      );
      await p.locator("#observations-button").click();
      await p.locator("#explorer[aria-busy=false]").waitFor();
      assert.ok(await p.locator("#export-context").isEnabled());
      await context.close();
      return {
        fixture: "Intentionally aborted space-audio.js import",
        expected_console: injected,
      };
    },
  );
  await check(
    "A delayed renderer startup preserves an explicit early travel request",
    async () => {
      const { context, page: p } = await page();
      let release;
      const gate = new Promise((resolve) => (release = resolve));
      await p.route("**/assets/space/manifest.json", async (r) => {
        await gate;
        await r.continue();
      });
      await p.goto(base);
      await p
        .locator("body[data-controller=ready]")
        .waitFor({ state: "attached" });
      await destinations(p);
      await p.locator("button[data-environment=solar]").click();
      await p.locator("[data-destination=mars]").click();
      release();
      await ready(p);
      await p.waitForFunction(() =>
        skyshiftSpace.diagnostics().assets_loaded.includes("mars"),
      );
      await p.waitForTimeout(1200);
      assert.equal(await p.locator("#context-name").innerText(), "Mars");
      assert.notDeepEqual(
        await p.evaluate(() => skyshiftSpace.diagnostics().target),
        [0, 0, 0],
      );
      await context.close();
    },
  );
  await check(
    "A failed scientific controller is explained and Reload viewer recovers",
    async () => {
      const { context, page: p } = await page();
      const expected = [];
      p.on("console", (m) => {
        if (m.type() === "error") expected.push(m.text());
      });
      await p.route("**/explore.js", (r) => r.abort("failed"));
      await p.goto(base);
      await ready(p);
      await p.locator("#observations-button").click();
      await p.locator("#workspace-error").waitFor();
      assert.match(
        await p.locator("#workspace-error").innerText(),
        /controls have not responded/,
      );
      await p.unroute("**/explore.js");
      await p.locator("#reload-workspace").click();
      await p
        .frameLocator("#science-frame")
        .locator("#explorer[aria-busy=false]")
        .waitFor();
      await p.locator("#workspace-error").waitFor({ state: "hidden" });
      await context.close();
      return {
        fixture: "Intentionally aborted explore.js",
        expected_console: expected,
      };
    },
  );
  await check(
    "Selecting a destination during loading travels to the latest selection only",
    async () => {
      const { context, page: p } = await page();
      let releaseEarth, releaseMars;
      const earthGate = new Promise((r) => (releaseEarth = r)),
        marsGate = new Promise((r) => (releaseMars = r));
      await p.route("**/earth-natural.glb", async (r) => {
        await earthGate;
        await r.continue();
      });
      await p.route("**/mars.webp", async (r) => {
        await marsGate;
        await r.continue();
      });
      await p.goto(base);
      await ready(p);
      await destinations(p);
      await destinations(p);
      await p.locator("button[data-environment=solar]").click();
      await p.locator("[data-destination=earth]").click();
      await p.waitForTimeout(1000);
      await p.locator("[data-destination=mars]").click();
      releaseEarth();
      await p.waitForTimeout(400);
      assert.deepEqual(
        await p.evaluate(() => skyshiftSpace.diagnostics().target),
        [0, 0, 0],
      );
      releaseMars();
      await p.waitForFunction(() =>
        skyshiftSpace.diagnostics().assets_loaded.includes("mars"),
      );
      await p.waitForTimeout(1300);
      const d = await p.evaluate(() => skyshiftSpace.diagnostics());
      assert.notDeepEqual(d.target, [0, 0, 0]);
      assert.equal(await p.locator("#context-name").innerText(), "Mars");
      await context.close();
      return { target: d.target };
    },
  );
  await check(
    "Rapid field changes while the scientific catalogue loads preserve the latest requested field",
    async () => {
      const { context, page: p } = await page();
      await p.goto(base);
      await ready(p);
      let release;
      const gate = new Promise((r) => (release = r));
      await p.route("**/data/explore-catalog.json", async (r) => {
        if (r.request().frame().parentFrame()) await gate;
        await r.continue();
      });
      await destinations(p);
      await p.locator("button[data-environment=sky]").click();
      await p.locator("#inspect-observation").click();
      await p.locator("#back-to-universe").click();
      await p.locator("[data-destination=m42]").click();
      await p.locator("#inspect-observation").click();
      release();
      const f = p.frameLocator("#science-frame");
      await f.locator("#explorer[aria-busy=false]").waitFor();
      await f.locator("#object-story").filter({ hasText: "Orion" }).waitFor();
      assert.equal(await f.locator("#compare-link").isVisible(), false);
      await context.close();
    },
  );
  await check(
    "A fresh browser page reopens the saved real-data investigation and comparison ZIP",
    async () => {
      const { context, page: p } = await page();
      await p.goto(base);
      await ready(p);
      await destinations(p);
      await p.locator("button[data-environment=sky]").click();
      await p.locator("#inspect-observation").click();
      const f = p.frameLocator("#science-frame");
      await f.locator("#explorer[aria-busy=false]").waitFor();
      await f.locator("#compare-link").click();
      await f.locator("#workspace").waitFor();
      await f.locator("#mark-mode").click();
      await f.locator("#canvas-a").click();
      await f
        .locator("#note-text")
        .fill("SYNTHETIC restart regression note, no astronomical finding.");
      await f.getByRole("button", { name: "Save note", exact: true }).click();
      await f
        .locator("#notes")
        .getByRole("button", { name: "Edit", exact: true })
        .click();
      await f
        .locator("#note-text")
        .fill("SYNTHETIC edited restart regression note.");
      await f.getByRole("button", { name: "Save note", exact: true }).click();
      await f.locator("#compare-extras > summary").click();
      await f.locator("#blink").click();
      await p.locator("#back-to-universe").click();
      assert.equal(
        await f.locator("#blink").getAttribute("aria-pressed"),
        "false",
      );
      await p.locator("#resume-button").click();
      assert.equal(await f.locator("#note-count").innerText(), "1");
      const event = p.waitForEvent("download");
      await f.locator("#export").click();

      await (await event).saveAs(await claimEvidenceFile(evidenceFile(evidenceRun,"tmp/runtime-qa/comparison.zip")));
      await context.close();
      const fresh = await page();
      await fresh.page.goto(base + "/compare.html");
      await fresh.page.locator("#workspace").waitFor();
      await fresh.page
        .locator("#import-file")
        .setInputFiles(evidenceFile(evidenceRun,"comparison.zip"));
      await fresh.page
        .locator("#note-count")
        .filter({ hasText: "1" })
        .waitFor();
      assert.match(
        await fresh.page.locator("#notes").innerText(),
        /edited restart regression/,
      );
      await fresh.page
        .locator("#notes")
        .getByRole("button", { name: "Delete", exact: true })
        .click();
      assert.equal(await fresh.page.locator("#note-count").innerText(), "0");
      await fresh.context.close();
      return {
        scope:
          "Fresh contexts on the running server; separate process restart exercised by HTTP tests, no browser-profile persistence claim",
      };
    },
  );
  await check(
    "Installed Chrome remains responsive through repeated scene and workspace changes",
    async () => {
      const { context, page: p } = await page({ deviceScaleFactor: 2 });
      p.on("pageerror", (e) => errors.push(e.message));
      p.on("console", (m) => {
        if (m.type() === "error") errors.push(m.text());
      });
      await p.goto(base);
      await ready(p);
      const lags = [];
      for (let i = 0; i < 8; i++) {
        await destinations(p);
        await p.locator("button[data-environment=observatory]").click();
        await p.locator("[data-destination=hubble]").click();
        await destinations(p);
        await p.locator("button[data-environment=solar]").click();
        await p.locator("[data-destination=earth]").click();
        await p.locator("#observations-button").click();
        await p
          .frameLocator("#science-frame")
          .locator("#explorer[aria-busy=false]")
          .waitFor();
        await p.locator("#back-to-universe").click();
        const start = performance.now();
        await p.locator("#settings-button").click();
        await p.locator("#settings-dialog [data-close-dialog]").click();
        lags.push(performance.now() - start);
      }
      await p.waitForTimeout(1600);
      await p.evaluate(() => {
        window.__frameSample = { values: [], active: true, last: null };
        function sample(t) {
          const s = window.__frameSample;
          if (!s.active) return;
          if (s.last !== null) s.values.push(t - s.last);
          s.last = t;
          requestAnimationFrame(sample);
        }
        requestAnimationFrame(sample);
      });
      await p.mouse.move(620, 300);
      await p.mouse.down();
      await p.mouse.move(880, 390, { steps: 30 });
      await p.mouse.up();
      await p.waitForTimeout(1000);
      const pacing = await p.evaluate(() => {
        const s = window.__frameSample;
        s.active = false;
        const a = s.values.sort((a, b) => a - b);
        return {
          samples: a.length,
          median_ms: a[Math.floor(a.length * 0.5)],
          p95_ms: a[Math.floor(a.length * 0.95)],
          max_ms: a.at(-1),
        };
      });
      await p.waitForTimeout(1000);
      const before = await p.evaluate(() => skyshiftSpace.diagnostics());
      await p.waitForTimeout(600);
      const after = await p.evaluate(() => skyshiftSpace.diagnostics());
      assert.ok(after.frames - before.frames < 4);
      assert.deepEqual(errors, []);
      const gpu = await p.locator("#universe").evaluate((c) => {
        const gl = c.getContext("webgl2"),
          e = gl.getExtension("WEBGL_debug_renderer_info");
        return {
          renderer: e
            ? gl.getParameter(e.UNMASKED_RENDERER_WEBGL)
            : gl.getParameter(gl.RENDERER),
          drawing_buffer: [gl.drawingBufferWidth, gl.drawingBufferHeight],
        };
      });
      await p.screenshot({ path: await claimEvidenceFile(evidenceFile(evidenceRun,"tmp/runtime-qa/installed-chrome.png" ))});
      await context.close();
      return {
        rounds: 8,
        settings_roundtrip_ms: lags,
        idle_frames: after.frames - before.frames,
        gpu,
        raf_intervals_during_camera_input: pacing,
        scope:
          "Browser automation timings include input dispatch; not frame-rate or GPU timing measurements",
      };
    },
  );
} catch (e) {
  console.error(e);
  process.exitCode = 1;
} finally {
  const version = browser.version();
  await browser.close();
  await writeEvidenceFile(evidenceFile(evidenceRun,"docs/evidence/runtime_recovery_tests.json"),
    JSON.stringify(
      {
        date_utc: new Date().toISOString(),
        browser: "Installed Chrome, fresh test profiles",
        version,
        results,
        errors,
        user_session_verified: false,
        scientific_approval: "PENDING",
      },
      null,
      2,
    ) + "\n",
  );
}
