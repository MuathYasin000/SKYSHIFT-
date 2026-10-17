// Fresh installed-browser profiles; never claim this represents the user's session.
import fs from "node:fs/promises";
import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
const { chromium } = await import(
  pathToFileURL(
    process.env.SKYSHIFT_PLAYWRIGHT_MODULE ||
      "C:/Users/LOQ/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs",
  )
);
const suffix = process.env.SKYSHIFT_TEST_SUFFIX || "",
  out = "tmp/unified-qa" + (suffix ? "-" + suffix : "");
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  executablePath:
    process.env.SKYSHIFT_CHROMIUM_EXECUTABLE ||
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
});
const results = [],
  errors = [],
  external = [];
let current;
async function context(options = {}) {
  const c = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    acceptDownloads: true,
    ...options,
  });
  c.setDefaultTimeout(20000);
  await c.route("**/*", (r) => {
    const u = new URL(r.request().url());
    if (u.hostname === "localhost" || u.protocol === "blob:")
      return r.continue();
    external.push(u.href);
    return r.abort();
  });
  c.on("page", (p) => p.on("pageerror", (e) => errors.push(e.message)));
  return c;
}
async function ready(p) {
  await p.waitForFunction(
    () =>
      document.body.dataset.controller === "ready" &&
      window.skyshiftSpace?.diagnostics().frames > 0,
  );
}
async function loaded(p, field, kind = "exposure") {
  await p.waitForFunction(
    ([f, k]) => {
      const v = window.skyshiftSpace?.investigation();
      return v?.field === f && v.kind === k && !v.busy && v.opened;
    },
    [field, kind],
  );
}
async function check(name, action) {
  current = name;
  try {
    const detail = await action();
    results.push({ name, status: "pass", detail });
    console.log("PASS " + name);
  } catch (e) {
    results.push({ name, status: "fail", error: e.message });
    throw e;
  }
}
async function snap(p, name) {
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(250);
  await p.screenshot({ path: out + "/" + name + ".png" });
}
async function save(p, name) {
  const download = p.waitForEvent("download");
  await p.click("#instrument-save");
  await (await download).saveAs(out + "/" + name);
}
async function point(p, kind = "exposure") {
  return p.evaluate(async (kind) => {
    const v = skyshiftSpace.investigation();
    let a, shape;
    if (kind === "pair") {
      const b = await (await fetch("./data/bundle.json")).json();
      a = b.arrays.COMMON;
      shape = b.manifest.processing.shape;
    } else {
      const c = await (await fetch("./data/explore-catalog.json")).json(),
        f = c.fields.find((f) => f.id === v.field),
        entry = f.observations.find((e) => e.sha256 === v.key),
        b = await (await fetch(entry.url)).json();
      a = b.arrays.VALID;
      shape = b.shape;
    }
    const data = Uint8Array.from(atob(a.data), (c) => c.charCodeAt(0)),
      [h, w] = shape;
    let best = null,
      d = Infinity;
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++)
        if (data[y * w + x]) {
          const n = Math.hypot(x - v.display.center_x, y - v.display.center_y);
          if (n < d) {
            d = n;
            best = { x, y };
          }
        }
    const r = document
        .getElementById("instrument-canvas-a")
        .getBoundingClientRect(),
      scale = Math.min(r.width / w, r.height / h) * v.display.zoom;
    return {
      x: r.x + r.width / 2 + (best.x - v.display.center_x) * scale,
      y: r.y + r.height / 2 - (best.y - v.display.center_y) * scale,
    };
  }, kind);
}
async function question(p, text, kind) {
  const q = await point(p, kind);
  await p.mouse.click(q.x, q.y);
  await p.click("#instrument-add");
  await p.fill("#instrument-question-text", text);
  await p.click("#instrument-question-save");
}
let c, p;
try {
  c = await context();
  p = await c.newPage();
  await p.goto("http://localhost:3000/");
  await ready(p);
  await check(
    "SPHEREx alone leads launch; official Earth context loads; no scientific iframe",
    async () => {
      await p.waitForFunction(() =>
        skyshiftSpace.diagnostics().assets_loaded.includes("earth-natural"),
      );
      const d = await p.evaluate(() => skyshiftSpace.diagnostics());
      assert.deepEqual(d.loaded_telescopes, ["spherex"]);
      assert.equal(await p.locator("iframe").count(), 0);
      assert.equal(
        await p.locator('[data-telescope="webb-b"]').isVisible(),
        false,
      );
      await snap(p, "launch");
      return { telescopes: d.loaded_telescopes, assets: d.assets_loaded };
    },
  );
  await check(
    "Spacecraft component and wavelength explanations are interactive",
    async () => {
      await p.click("#look-through");
      await p.click("#mission-hardware summary");
      const component = p.locator("[data-mission-component]").first();
      await component.click();
      assert.ok(
        (await p.locator("#mission-component-info").textContent()).length > 30,
      );
      await p.click('[data-observe-stage="1"]');
      await p.locator("[data-channel]").nth(2).click();
      assert.equal(
        (await p.evaluate(() => skyshiftSpace.diagnostics())).observing.channel,
        2,
      );
      await snap(p, "instrument");
      await p.click("#mission-close");
    },
  );
  await check(
    "Sourced optional observatory collection is secondary and returnable",
    async () => {
      await p.click("#hangar-toggle");
      await p.waitForFunction(
        () => skyshiftSpace.diagnostics().loaded_telescopes.length === 3,
      );
      assert.equal(
        await p.locator('[data-telescope="webb-b"]').isVisible(),
        true,
      );
      await p.click('[data-telescope="webb-b"]');
      await p.click('[data-observe-stage="2"]');
      await p.waitForFunction(
        () => !document.getElementById("mission-image").hidden,
      );
      await p.click("#mission-close");
      await p.click("#hangar-toggle");
      assert.equal(
        await p.locator('[data-telescope="webb-b"]').isVisible(),
        false,
      );
    },
  );
  await check(
    "Actual sky selection enters the native instrument in one document",
    async () => {
      await p.click("#from-hardware-to-sky");
      await p.click('[data-destination="m42"]');
      await p.click("#inspect-observation");
      await loaded(p, "m42");
      assert.equal(await p.locator("iframe").count(), 0);
      assert.match(
        await p.locator("#instrument-label-a").textContent(),
        /2025-09-11/,
      );
      assert.equal(await p.locator("#instrument-compare").isDisabled(), true);
      await snap(p, "orion");
    },
  );
  await check(
    "Coordinates, questions, edit, locate, JSON save and Classic mode share exact state",
    async () => {
      await p.click("#instrument-zoom-in");
      await question(p, "What contributes the infrared light here?");
      const before = await p.evaluate(() => skyshiftSpace.investigation());
      assert.equal(before.questions.length, 1);
      await p.click("#classic-toggle");
      assert.equal(
        (await p.evaluate(() => skyshiftSpace.investigation())).classic,
        true,
      );
      assert.deepEqual(
        (await p.evaluate(() => skyshiftSpace.investigation())).questions,
        before.questions,
      );
      assert.deepEqual(
        (await p.evaluate(() => skyshiftSpace.investigation())).display,
        before.display,
      );
      await p.click("#instrument-notes");
      await p.getByRole("button", { name: "Edit", exact: true }).click();
      await p.fill(
        "#instrument-question-text",
        "Revised question: what contributes this light?",
      );
      await p.click("#instrument-question-save");
      await p.getByRole("button", { name: "Locate", exact: true }).click();
      await save(p, "orion.json");
      await snap(p, "classic");
      await p.click("#classic-toggle");
      assert.equal(
        (await p.evaluate(() => skyshiftSpace.investigation())).classic,
        false,
      );
    },
  );
  await check(
    "Provenance is clickable and explicitly pending, with exact archive identity",
    async () => {
      await p.click("#instrument-about");
      assert.match(
        await p.locator("#instrument-information-body").textContent(),
        /Scientific approval PENDING/,
      );
      assert.ok(
        await p
          .locator('#instrument-information-body a[href^="https://irsa"]')
          .count(),
      );
      await snap(p, "sources");
      await p.click("#instrument-information-close");
    },
  );
  await check(
    "Return to sky and resume retain region, questions, viewport and canvas identity",
    async () => {
      await p.evaluate(
        () =>
          (window.qaCanvas = document.getElementById("instrument-canvas-a")),
      );
      const before = await p.evaluate(() => skyshiftSpace.investigation());
      await p.click("#instrument-close");
      assert.equal(
        (await p.evaluate(() => skyshiftSpace.workspace())).selected,
        "m42",
      );
      await p.click("#observations-button");
      await loaded(p, "m42");
      const after = await p.evaluate(() => skyshiftSpace.investigation());
      assert.deepEqual(after.questions, before.questions);
      assert.deepEqual(after.display, before.display);
      assert.equal(
        await p.evaluate(
          () => qaCanvas === document.getElementById("instrument-canvas-a"),
        ),
        true,
      );
    },
  );
  await check(
    "M101 UTC timeline and restricted comparison preserve scientific gates",
    async () => {
      await p.click('[data-instrument-field="m101"]');
      await loaded(p, "m101");
      await p.locator("#instrument-dates button").nth(1).click();
      await p.waitForFunction(() =>
        skyshiftSpace.investigation().key.startsWith("3805"),
      );
      await p.click("#instrument-compare");
      await loaded(p, "m101", "pair");
      assert.match(
        await p.locator("#instrument-suitability").textContent(),
        /PENDING/,
      );
      assert.match(
        await p.locator("#instrument-subtitle").textContent(),
        /24 × 24/,
      );
      await snap(p, "comparison");
    },
  );
  await check(
    "Linked canvases, actual draggable wipe, A/B and blink preserve coordinate viewport",
    async () => {
      await p.click('[data-compare="side_by_side"]');
      await p.click("#instrument-zoom-in");
      const a = await p.locator("#instrument-canvas-a").boundingBox();
      await p.mouse.move(a.x + a.width * 0.5, a.y + a.height * 0.5);
      await p.mouse.down();
      await p.mouse.move(a.x + a.width * 0.54, a.y + a.height * 0.54, {
        steps: 6,
      });
      await p.mouse.up();
      const view = (await p.evaluate(() => skyshiftSpace.investigation()))
        .display;
      await p.click('[data-compare="wipe"]');
      const r = await p.locator("#instrument-wipe-handle").boundingBox();
      await p.mouse.move(r.x + r.width / 2, r.y + r.height / 2);
      await p.mouse.down();
      await p.mouse.move(r.x + 100, r.y + 10, { steps: 7 });
      await p.mouse.up();
      assert.ok(
        (await p.evaluate(() => skyshiftSpace.investigation())).visual
          .wipe_position > 50,
      );
      await snap(p, "wipe");
      await p.click('[data-compare="single"]');
      await p.locator("#instrument-dates button").nth(1).click();
      const v = await p.evaluate(() => skyshiftSpace.investigation());
      assert.equal(v.display.selected_epoch, "B");
      for (const k of ["zoom", "center_x", "center_y"])
        assert.equal(v.display[k], view[k]);
      await p.click("#instrument-blink");
      await p.waitForTimeout(1600);
      assert.equal(
        (await p.evaluate(() => skyshiftSpace.investigation())).display
          .selected_epoch,
        "A",
      );
      await p.click("#instrument-blink");
    },
  );
  await check(
    "Comparison question, source diagnostics, ZIP export and exact reopen",
    async () => {
      await question(
        p,
        "Could the response or background explain this difference?",
        "pair",
      );
      await p.click("#instrument-panel-close");
      await p.click("#instrument-about");
      assert.equal(
        await p.locator("#instrument-review-download").isVisible(),
        true,
      );
      assert.match(
        await p.locator("#instrument-information-body").textContent(),
        /13 measured reference/,
      );
      await p.click("#instrument-information-close");
      await save(p, "comparison.zip");
      await p.click("#instrument-notes");
      await p.getByRole("button", { name: "Delete", exact: true }).click();
      assert.equal(
        (await p.evaluate(() => skyshiftSpace.investigation())).questions
          .length,
        0,
      );
      await p.setInputFiles("#instrument-file", out + "/comparison.zip");
      await loaded(p, "m101", "pair");
      await p.waitForFunction(
        () => skyshiftSpace.investigation().questions.length === 1,
      );
    },
  );
  await check(
    "Classic pauses the decorative renderer and supports full investigation",
    async () => {
      await p.click("#classic-toggle");
      await p.waitForTimeout(500);
      const frames = await p.evaluate(() => skyshiftSpace.diagnostics().frames);
      await p.waitForTimeout(600);
      assert.equal(
        await p.evaluate(() => skyshiftSpace.diagnostics().frames),
        frames,
      );
      await p.click("#instrument-zoom-out");
      await p.click("#classic-toggle");
      await p.click("#instrument-close");
    },
  );
  await check(
    "Original audio starts muted, distinct cues and separate volumes remain usable",
    async () => {
      assert.equal(
        (await p.evaluate(() => skyshiftSpace.audio())).enabled,
        false,
      );
      await p.click("#sound-toggle");
      await p.waitForTimeout(80);
      await p.click("#settings-button");
      await p.locator("#effects-volume").fill("0.35");
      await p.locator("#ambience-volume").fill("0.02");
      await p.locator("#settings-dialog [data-close-dialog]").click();
      await p.click("#hangar-toggle");
      await p.click('[data-telescope="spherex"]');
      const audio = await p.evaluate(() => skyshiftSpace.audio());
      assert.ok(audio.enabled);
      assert.ok(new Set(audio.recent_cues).size > 1);
      await p.click("#sound-toggle");
    },
  );
  await check(
    "Fresh browser reconstructs both native exports with questions and strict identity",
    async () => {
      const cc = await context(),
        pp = await cc.newPage();
      await pp.goto("http://localhost:3000/?view=classic");
      await loaded(pp, "m101");
      await pp.setInputFiles("#instrument-file", out + "/orion.json");
      await loaded(pp, "m42");
      assert.equal(
        (await pp.evaluate(() => skyshiftSpace.investigation())).questions[0]
          .question,
        "Revised question: what contributes this light?",
      );
      await pp.setInputFiles("#instrument-file", out + "/comparison.zip");
      await loaded(pp, "m101", "pair");
      assert.equal(
        (await pp.evaluate(() => skyshiftSpace.investigation())).questions
          .length,
        1,
      );
      await cc.close();
    },
  );
  for (const width of [1024, 390, 320])
    await check(
      "Responsive native inspection and comparison at " + width + "px",
      async () => {
        const cc = await context({
            viewport: { width, height: width < 740 ? 844 : 768 },
            hasTouch: width < 740,
            isMobile: width < 740,
          }),
          pp = await cc.newPage();
        await pp.goto("http://localhost:3000/");
        await ready(pp);
        await snap(pp, "launch-" + width);
        await pp.click("#observations-button");
        await loaded(pp, "m101");
        await snap(pp, "observation-" + width);
        await pp.click("#instrument-compare");
        await loaded(pp, "m101", "pair");
        await pp.click('[data-compare="wipe"]');
        await snap(pp, "comparison-" + width);
        assert.equal(
          await pp.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
          true,
        );
        for (const id of [
          "instrument-save",
          "instrument-close",
          "instrument-add",
          "instrument-canvas-a",
        ]) {
          const r = await pp.locator("#" + id).boundingBox();
          assert.ok(
            r.x >= 0 &&
              r.y >= 0 &&
              r.x + r.width <= width + 1 &&
              r.y + r.height <= (width < 740 ? 844 : 768) + 1,
            id + " clipped",
          );
        }
        if (width === 390) {
          const r = await pp.locator("#instrument-canvas-a").boundingBox(),
            cdp = await cc.newCDPSession(pp),
            cx = r.x + r.width / 2,
            cy = r.y + r.height / 2;
          await cdp.send("Input.dispatchTouchEvent", {
            type: "touchStart",
            touchPoints: [
              { x: cx - 20, y: cy },
              { x: cx + 20, y: cy },
            ],
          });
          await cdp.send("Input.dispatchTouchEvent", {
            type: "touchMove",
            touchPoints: [
              { x: cx - 50, y: cy },
              { x: cx + 50, y: cy },
            ],
          });
          await cdp.send("Input.dispatchTouchEvent", {
            type: "touchEnd",
            touchPoints: [],
          });
          assert.ok(
            (await pp.evaluate(() => skyshiftSpace.investigation())).display
              .zoom > 1,
          );
          await cdp.detach();
        }
        await cc.close();
      },
    );
  await check(
    "Reload in the same tab restores the pending investigation and private notes",
    async () => {
      await p.click("#classic-toggle");
      await p.waitForFunction(() => skyshiftSpace.investigation().opened);
      await p.setInputFiles("#instrument-file", out + "/comparison.zip");
      await loaded(p, "m101", "pair");
      await p.waitForFunction(
        () => skyshiftSpace.investigation().questions.length === 1,
      );
      await p.reload();
      await ready(p);
      await p.click("#resume-button");
      await loaded(p, "m101", "pair");
      assert.equal(
        (await p.evaluate(() => skyshiftSpace.investigation())).questions
          .length,
        1,
      );
      await p.click("#instrument-close");
    },
  );
  await check(
    "Reduced motion keeps manual epochs and scientific viewing available",
    async () => {
      const cc = await context({ reducedMotion: "reduce" }),
        pp = await cc.newPage();
      await pp.goto("http://localhost:3000/?view=classic");
      await loaded(pp, "m101");
      await pp.click("#instrument-compare");
      await loaded(pp, "m101", "pair");
      assert.equal(await pp.locator("#instrument-blink").isDisabled(), true);
      await pp.locator("#instrument-dates button").nth(1).click();
      assert.equal(
        (await pp.evaluate(() => skyshiftSpace.investigation())).display
          .selected_epoch,
        "B",
      );
      await cc.close();
    },
  );
  await check(
    "No WebGL still opens native Classic science, not an embedded page",
    async () => {
      const cc = await context();
      await cc.addInitScript(() => {
        const original = HTMLCanvasElement.prototype.getContext;
        HTMLCanvasElement.prototype.getContext = function (type, ...args) {
          return /webgl/.test(type) ? null : original.call(this, type, ...args);
        };
      });
      const pp = await cc.newPage();
      await pp.goto("http://localhost:3000/");
      await pp.locator("#render-fallback").waitFor({ state: "visible" });
      await pp.click("#fallback-classic");
      await loaded(pp, "m101");
      assert.equal(
        (await pp.evaluate(() => skyshiftSpace.investigation())).classic,
        true,
      );
      assert.equal(await pp.locator("iframe").count(), 0);
      await cc.close();
    },
  );
  await check(
    "Corrupted exposure is refused, previous view survives and retry loads exact data",
    async () => {
      const cc = await context(),
        pp = await cc.newPage();
      await pp.goto("http://localhost:3000/?view=classic");
      await loaded(pp, "m101");
      await pp.route("**/data/explore/m42-*.json", (r) =>
        r.fulfill({ status: 200, contentType: "application/json", body: "{}" }),
      );
      await pp.click('[data-instrument-field="m42"]');
      await pp.waitForFunction(() =>
        document
          .getElementById("instrument-status")
          .textContent.includes("checksum"),
      );
      assert.equal(
        (await pp.evaluate(() => skyshiftSpace.investigation())).field,
        "m101",
      );
      await pp.unroute("**/data/explore/m42-*.json");
      await pp.click("#instrument-retry");
      await loaded(pp, "m42");
      await cc.close();
    },
  );
  await check(
    "Keyboard pixel inspection and automated accessibility checks",
    async () => {
      await p.click("#classic-toggle");
      await p.waitForFunction(() => skyshiftSpace.investigation().opened);
      await p.locator("#instrument-canvas-a").focus();
      await p.keyboard.press("Home");
      await p.keyboard.press("Enter");
      await p.evaluate(await fs.readFile("tools/vendor/axe.min.js", "utf8"));
      const report = await p.evaluate(async () => {
        const r = await axe.run(document, {
          runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] },
        });
        return {
          violations: r.violations.map((v) => ({
            id: v.id,
            nodes: v.nodes.map((n) => n.target),
          })),
          incomplete: r.incomplete.length,
        };
      });
      assert.deepEqual(report.violations, []);
      return report;
    },
  );
  assert.deepEqual(errors, []);
  assert.deepEqual(external, []);
} catch (e) {
  console.error("FAILED " + current + "\n" + e.stack);
  if (p) await snap(p, "failure").catch(() => {});
  process.exitCode = 1;
} finally {
  await fs.writeFile(
    "docs/evidence/unified_product_tests" +
      (suffix ? "_" + suffix : "") +
      ".json",
    JSON.stringify(
      {
        recorded_at_utc: new Date().toISOString(),
        browser: await browser.version(),
        profile: "isolated; not the user session",
        results,
        page_errors: errors,
        external_requests: external,
        limits: [
          "Qualified scientific approval PENDING",
          "Internal human review PENDING",
          "Independent novice usability validation NOT CONDUCTED",
          "Mobile tests are emulation, not physical-device tests",
          "User visual and audio evaluation remains outstanding",
        ],
      },
      null,
      2,
    ),
  );
  await browser.close();
}
