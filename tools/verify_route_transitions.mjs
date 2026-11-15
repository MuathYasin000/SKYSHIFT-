import {createEvidenceDirectory,evidenceFile,writeEvidenceFile,claimEvidenceFile} from './evidence-output.mjs';
const evidenceRun=await createEvidenceDirectory('verify_route_transitions',process.env.SKYSHIFT_EVIDENCE_OUTPUT);
// Exercise actual composited opacity frames and navigation failure recovery.
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
  out = evidenceRun,
  results = [],
  errors = [];

const browser = await chromium.launch({
  headless: true,
  executablePath:
    process.env.SKYSHIFT_CHROMIUM_EXECUTABLE ||
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
});
async function context(options = {}) {
  const c = await browser.newContext({
    viewport: { width: 1366, height: 768 },
    reducedMotion: "no-preference",
    ...options,
  });
  c.setDefaultTimeout(20000);
  c.on("page", (p) => p.on("pageerror", (e) => errors.push(e.message)));
  await c.addInitScript(() => {
    window.__routeFrames = [];
    const animate = Element.prototype.animate;
    if (!animate) return;
    Element.prototype.animate = function (frames, options) {
      const a = animate.call(this, frames, options);
      if (["home-view", "space-workspace"].includes(this.id)) {
        const record = {
          target: this.id,
          duration: options.duration,
          frames,
          samples: [],
        };
        window.__routeFrames.push(record);
        const sample = () => {
          record.samples.push(Number(getComputedStyle(this).opacity));
          if (a.playState === "running") requestAnimationFrame(sample);
        };
        requestAnimationFrame(sample);
      }
      return a;
    };
  });
  return c;
}
async function boot(p, hash = "") {
  await p.goto("http://localhost:3000/" + hash);
  await p.waitForFunction(
    () =>
      window.skyshiftWebsite &&
      typeof skyshiftWebsite.diagnostics().navigation.completed === "number",
  );
}
async function ready(p, field = "m101", kind = "pair") {
  await p.waitForFunction(
    ([f, k]) => {
      const d = skyshiftWebsite.diagnostics();
      return (
        d.surface === "science" &&
        d.investigation.field === f &&
        d.investigation.kind === k &&
        !d.investigation.busy &&
        !d.navigation.active
      );
    },
    [field, kind],
  );
}
async function visible(p, id) {
  assert.equal(
    await p.locator(id).evaluate((e) => Number(getComputedStyle(e).opacity)),
    1,
  );
  assert.equal(
    await p.locator(id).evaluate((e) => e.getAnimations().length),
    0,
  );
}
async function check(name, fn) {
  try {
    const detail = await fn();
    results.push({ name, status: "pass", detail });
    console.log("PASS " + name);
  } catch (e) {
    results.push({ name, status: "fail", error: e.message });
    throw e;
  }
}
let c, p;
try {
  await check(
    "Home to Compare has measured outgoing and incoming opacity frames; data load and viewport remain native",
    async () => {
      c = await context();
      p = await c.newPage();
      await boot(p);
      await p.evaluate(() => document.fonts.ready);
      await p.waitForFunction(
        () => window.skyshiftHero?.diagnostics().model?.frames > 0,
      );
      assert.deepEqual(await p.evaluate(() => window.__routeFrames), []);
      await p.locator(".mission-launch").click();
      await ready(p);
      await visible(p, "#space-workspace");
      const frames = await p.evaluate(() => window.__routeFrames);
      assert.deepEqual(
        frames.map((f) => [f.target, f.duration]),
        [
          ["home-view", 110],
          ["space-workspace", 240],
        ],
      );
      assert.ok(
        frames.every((f) => f.samples.some((o) => o > 0.02 && o < 0.98)),
        JSON.stringify(frames),
      );
      await p.screenshot({ path: await claimEvidenceFile(evidenceFile(evidenceRun,out + "/comparison-after.png" ))});
      return { frames, initial_route_animated: false };
    },
  );
  await check(
    "Home return, browser Back and saved viewport survive repeated animated navigation",
    async () => {
      await p.click("#instrument-zoom-in");
      const zoom = await p.evaluate(
        () => skyshiftWebsite.diagnostics().investigation.display.zoom,
      );
      await p.locator(".site-brand").click();
      await p.waitForFunction(
        () =>
          skyshiftWebsite.diagnostics().surface === "home" &&
          !skyshiftWebsite.diagnostics().navigation.active,
      );
      await visible(p, "#home-view");
      await p.goBack();
      await ready(p);
      assert.equal(
        await p.evaluate(
          () => skyshiftWebsite.diagnostics().investigation.display.zoom,
        ),
        zoom,
      );
      const download = p.waitForEvent("download");
      await p.click("#instrument-save");
      await (await download).saveAs(await claimEvidenceFile(evidenceFile(evidenceRun,out + "/comparison.zip")));
      await p.click("#instrument-fit");
      await p.setInputFiles("#instrument-file", out + "/comparison.zip");
      await ready(p);
      assert.equal(
        await p.evaluate(
          () => skyshiftWebsite.diagnostics().investigation.display.zoom,
        ),
        zoom,
      );
      return { restored_zoom: zoom };
    },
  );
  await check(
    "Rapid Compare, Observations and Home clicks leave only the latest route visible and interactive",
    async () => {
      await p.locator(".site-brand").click();
      await p.waitForFunction(
        () =>
          skyshiftWebsite.diagnostics().surface === "home" &&
          !skyshiftWebsite.diagnostics().navigation.active,
      );
      for (let i = 0; i < 3; i++) {
        await p.locator(".site-navigation [data-route=compare]").click();
        await p.locator(".site-navigation [data-route=observations]").click();
        await p.locator(".site-brand").click();
        await p.waitForFunction(
          () =>
            location.hash === "#home" &&
            skyshiftWebsite.diagnostics().surface === "home" &&
            !skyshiftWebsite.diagnostics().navigation.active,
        );
        await visible(p, "#home-view");
      }
      await p.locator(".mission-launch").click();
      await ready(p);
      return { rounds: 3, final_route: "compare" };
    },
  );
  await check(
    "Single observations and same-surface changes fade without changing science availability",
    async () => {
      await p.goto("http://localhost:3000/#observations/m42");
      await ready(p, "m42", "exposure");
      await visible(p, "#space-workspace");
      assert.equal(await p.locator("#instrument-compare").isVisible(), false);
      await p.locator(".site-brand").click();
      await p.waitForFunction(
        () =>
          skyshiftWebsite.diagnostics().surface === "home" &&
          !skyshiftWebsite.diagnostics().navigation.active,
      );
      await p.locator(".site-navigation [data-route=observations]").click();
      await ready(p, "m42", "exposure");
      const f = await p.evaluate(() => window.__routeFrames);
      assert.ok(
        f.some((a) => a.target === "space-workspace" && a.duration === 240),
      );
      await c.close();
    },
  );
  await check(
    "Reduced motion disables transitions on desktop and mobile; direct comparison links never animate startup",
    async () => {
      for (const width of [1366, 390]) {
        c = await context({
          viewport: { width, height: 900 },
          reducedMotion: "reduce",
        });
        p = await c.newPage();
        await boot(p, "#compare");
        await ready(p);
        assert.deepEqual(await p.evaluate(() => window.__routeFrames), []);
        await p.locator(".site-brand").click();
        await p.waitForFunction(
          () => skyshiftWebsite.diagnostics().surface === "home",
        );
        await p.locator(".mission-launch").click();
        await ready(p);
        assert.deepEqual(await p.evaluate(() => window.__routeFrames), []);
        await visible(p, "#space-workspace");
        await c.close();
      }
    },
  );
  await check(
    "Changing motion preferences during a transition completes navigation with no invisible surface",
    async () => {
      c = await context();
      p = await c.newPage();
      await boot(p);
      await p.locator(".mission-launch").click();
      await p.emulateMedia({ reducedMotion: "reduce" });
      await ready(p);
      await visible(p, "#space-workspace");
      await c.close();
    },
  );
  await check(
    "Missing transition module preserves scientific navigation and saving",
    async () => {
      c = await context();
      await c.route("**/route-transitions.js", (r) =>
        r.fulfill({ status: 404, body: "unavailable" }),
      );
      p = await c.newPage();
      await p.goto("http://localhost:3000/");
      await p.waitForFunction(() => window.skyshiftWebsite);
      await p.locator(".mission-launch").click();
      await ready(p);
      await visible(p, "#space-workspace");
      assert.equal(await p.locator("#instrument-save").isEnabled(), true);
      await c.close();
    },
  );
  await check(
    "Unavailable Web Animations support cannot block scientific navigation",
    async () => {
      c = await context();
      await c.addInitScript(() => {
        Element.prototype.animate = undefined;
      });
      p = await c.newPage();
      await boot(p);
      await p.locator(".mission-launch").click();
      await ready(p);
      await visible(p, "#space-workspace");
      await c.close();
    },
  );
  assert.deepEqual(errors, []);
} catch (e) {
  console.error(e.stack);
  process.exitCode = 1;
  await p?.screenshot({ path: await claimEvidenceFile(evidenceFile(evidenceRun,out + "/failure.png" ))}).catch(() => {});
} finally {
  await writeEvidenceFile(evidenceFile(evidenceRun,"docs/evidence/route_transitions_tests_" + suffix + ".json"),
    JSON.stringify(
      {
        recorded_at_utc: new Date().toISOString(),
        browser: browser.version(),
        results,
        page_errors: errors,
        limits: [
          "Opacity samples are from actual requestAnimationFrame/computed styles, not a recording",
          "Fresh isolated profiles; mobile is emulated",
          "No scientific pixels or saved settings are animated or modified; review gates remain PENDING",
        ],
      },
      null,
      2,
    ) + "\n",
  );
  await browser.close();
}
