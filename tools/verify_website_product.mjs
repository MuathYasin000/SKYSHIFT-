import {createEvidenceDirectory,evidenceFile,writeEvidenceFile,claimEvidenceFile} from './evidence-output.mjs';
const evidenceRun=await createEvidenceDirectory('verify_website_product',process.env.SKYSHIFT_EVIDENCE_OUTPUT);
// The science-first 0.7 journeys use isolated installed-browser profiles.
// They are software/visual checks, not a human usability study.
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
  testName = process.env.SKYSHIFT_TEST_NAME || "website07",
  out = evidenceRun;

const browser = await chromium.launch({
    headless: true,
    executablePath:
      process.env.SKYSHIFT_CHROMIUM_EXECUTABLE ||
      "C:/Program Files/Google/Chrome/Application/chrome.exe",
  }),
  results = [],
  errors = [],
  external = [];
let p, current;
async function context(options = {}) {
  const c = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    acceptDownloads: true,
    ...options,
  });
  c.setDefaultTimeout(18000);
  await c.route("**/*", (r) => {
    const u = new URL(r.request().url());
    if (u.hostname === "localhost" || u.protocol === "blob:")
      return r.continue();
    external.push(u.href);
    return r.abort();
  });
  c.on("page", (page) => page.on("pageerror", (e) => errors.push(e.message)));
  return c;
}
async function loaded(page, field = "m101", kind = "pair") {
  await page.waitForFunction(
    ([f, k]) => {
      const v = window.skyshiftWebsite?.diagnostics();
      return (
        v?.surface === "science" &&
        v.investigation.field === f &&
        v.investigation.kind === k &&
        !v.investigation.busy &&
        v.investigation.opened
      );
    },
    [field, kind],
  );
}
async function snap(page, name) {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(180);
  await page.screenshot({ path: await claimEvidenceFile(evidenceFile(evidenceRun,out + "/" + name + ".png")), fullPage: false });
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
async function save(page, name) {
  const event = page.waitForEvent("download");
  await page.click("#instrument-save");
  await (await event).saveAs(await claimEvidenceFile(evidenceFile(evidenceRun,out + "/" + name)));
}
async function point(page, kind = "pair") {
  return page.evaluate(async (kind) => {
    const v = skyshiftWebsite.diagnostics().investigation;
    let a, shape;
    if (kind === "pair") {
      const b = await (await fetch("./data/bundle.json")).json();
      a = b.arrays.COMMON;
      shape = b.manifest.processing.shape;
    } else {
      const cat = await (await fetch("./data/explore-catalog.json")).json(),
        f = cat.fields.find((f) => f.id === v.field),
        entry = f.observations.find((e) => e.sha256 === v.key),
        b = await (await fetch(entry.url)).json();
      a = b.arrays.VALID;
      shape = b.shape;
    }
    const m = Uint8Array.from(atob(a.data), (c) => c.charCodeAt(0)),
      [h, w] = shape,
      r = document
        .getElementById("instrument-canvas-a")
        .getBoundingClientRect(),
      handle = document
        .getElementById("instrument-wipe-handle")
        .getBoundingClientRect(),
      s = Math.min(r.width / w, r.height / h) * v.display.zoom;
    let best,
      d = Infinity;
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++)
        if (m[y * w + x]) {
          const screenX = r.width / 2 + (x - v.display.center_x) * s;
          const clientX = r.x + screenX,
            clientY = r.y + r.height / 2 - (y - v.display.center_y) * s;
          // Use the actual interactive handle bounds, including its border and
          // touch footprint, instead of a hardcoded 24px half-width.
          if (
            v.visual.wipe &&
            clientX >= handle.left - 3 &&
            clientX <= handle.right + 3 &&
            clientY >= handle.top - 3 &&
            clientY <= handle.bottom + 3
          )
            continue;
          const n = Math.hypot(x - v.display.center_x, y - v.display.center_y);
          if (n < d) {
            d = n;
            best = { x, y };
          }
        }
    return {
      x: r.x + r.width / 2 + (best.x - v.display.center_x) * s,
      y: r.y + r.height / 2 - (best.y - v.display.center_y) * s,
    };
  }, kind);
}
async function question(page, text, kind = "pair", touch = false) {
  await page.locator("#instrument-canvas-a").scrollIntoViewIfNeeded();
  // Read coordinates after the scroll and responsive font/layout have settled.
  await page.evaluate(async()=>{const r=document.getElementById('instrument-canvas-a').getBoundingClientRect();window.scrollTo({top:scrollY+r.top+r.height/2-innerHeight/2,behavior:'instant'});await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));});
  const pos = await point(page, kind);
  if (touch) await page.touchscreen.tap(pos.x, pos.y);
  else await page.mouse.click(pos.x, pos.y);
  await page.click("#instrument-add");
  await page.fill("#instrument-question-text", text);
  await page.click("#instrument-question-save");
}
async function axe(page) {
  await page.waitForFunction(()=>!window.skyshiftWebsite?.diagnostics().navigation.active);
  await page.evaluate(await fs.readFile("tools/vendor/axe.min.js", "utf8"));
  return page.evaluate(async () => {
    const r = await axe.run(document, {
      runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] },
    });
    return {
      violations: r.violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => ({
          target: n.target,
          summary: n.failureSummary,
        })),
      })),
      incomplete: r.incomplete.length,
    };
  });
}
try {
  const c = await context();
  p = await c.newPage();
  const requests = [];
  p.on("request", (r) => requests.push(r.url()));
  await check(
    "Homepage shows the requested real 3D SPHEREx model without loading the optional Universe",
    async () => {
      await p.goto("http://localhost:3000/");
      await p.waitForFunction(
        () => document.body.dataset.controller === "ready",
      );
      await p.locator(".field-card").nth(3).waitFor();
      await p.evaluate(() => document.fonts.ready);
      assert.equal(await p.locator("#home-view").isVisible(), true);
      assert.match(
        await p.locator("h1").first().textContent(),
        /Watch the[\s\S]*infrared sky/,
      );
      assert.equal(await p.locator("#universe-view canvas").count(), 0);
      await p.waitForFunction(
        () => window.skyshiftHero?.diagnostics().model?.frames > 0,
      );
      assert.equal(await p.locator(".hero-observatory image").count(), 0);
      assert.deepEqual(
        requests.filter((x) => /\.glb|space-scene\.js|immersive\.js/.test(x)),
        [],
      );
      assert.equal(await p.locator("iframe").count(), 0);
      assert.ok(
        await p.evaluate(
          () =>
            document.fonts.check("16px Inter") &&
            document.fonts.check('16px "IBM Plex Mono"'),
        ),
      );
      await snap(p, "home");
      return {
        hero_model_rendered: true,
        universe_downloads: 0,
        preview_cards: 4,
      };
    },
  );
  await check(
    "Cached restricted comparison remains available in one action",
    async () => {
      await p.click(".intro-actions .primary-link");
      await loaded(p);
      assert.match(
        await p.locator(".instrument-selection .status-pending").textContent(),
        /PENDING/,
      );
      assert.equal(await p.locator("[data-compare=wipe]").getAttribute("aria-pressed"), "true");
      await p.click("[data-compare=side_by_side]");
      assert.equal(await p.locator("#instrument-figure-b").isVisible(), true);
      assert.equal(
        await p.locator("#instrument-canvas-a").evaluate((c) => c.height > 200),
        true,
      );
      assert.deepEqual(
        requests.filter((x) => /\.glb|space-scene\.js/.test(x)),
        [],
      );
      const frames = await p.evaluate(
        () => skyshiftHero.diagnostics().model.frames,
      );
      await p.waitForTimeout(150);
      assert.equal(
        await p.evaluate(() => skyshiftHero.diagnostics().model.frames),
        frames,
      );
      await snap(p, "compare");
    },
  );
  await check(
    "Simple date controls, linked viewport, draggable wipe and blinking work",
    async () => {
      await p.click("#instrument-zoom-in");
      const a = await p.locator("#instrument-canvas-a").boundingBox();
      await p.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
      await p.mouse.down();
      await p.mouse.move(a.x + a.width * 0.53, a.y + a.height * 0.52, {
        steps: 4,
      });
      await p.mouse.up();
      const v = (await p.evaluate(() => skyshiftWebsite.diagnostics()))
        .investigation.display;
      await p.click("[data-compare=wipe]");
      await p.locator("#instrument-wipe-handle").scrollIntoViewIfNeeded();
      const r = await p.locator("#instrument-wipe-handle").boundingBox();
      await p.mouse.move(r.x + r.width / 2, r.y + r.height / 2);
      await p.mouse.down();
      await p.mouse.move(r.x + 90, r.y + 10, { steps: 5 });
      await p.mouse.up();
      assert.ok(
        (await p.evaluate(() => skyshiftWebsite.diagnostics())).investigation
          .visual.wipe_position > 50,
      );
      await snap(p, "wipe");
      await p.click("[data-compare=single]");
      await p.locator("#instrument-dates button").nth(1).click();
      const after = (await p.evaluate(() => skyshiftWebsite.diagnostics()))
        .investigation.display;
      for (const k of ["zoom", "center_x", "center_y"])
        assert.equal(after[k], v[k]);
      await p.click("#instrument-blink");
      await p.waitForTimeout(1550);
      assert.equal(
        (await p.evaluate(() => skyshiftWebsite.diagnostics())).investigation
          .display.selected_epoch,
        "A",
      );
      await p.click("#instrument-blink");
    },
  );
  await check(
    "Pixel inspection and question add, edit, locate, ZIP save and reopening",
    async () => {
      await question(p, "Could instrument response explain this appearance?");
      await p.getByRole("button", { name: "Edit", exact: true }).click();
      await p.fill(
        "#instrument-question-text",
        "Question for review: could response explain this appearance?",
      );
      await p.click("#instrument-question-save");
      await p.getByRole("button", { name: "Locate", exact: true }).click();
      await save(p, "comparison.zip");
      await p.getByRole("button", { name: "Delete", exact: true }).click();
      await p.setInputFiles("#instrument-file", out + "/comparison.zip");
      await loaded(p);
      await p.waitForFunction(
        () =>
          skyshiftWebsite.diagnostics().investigation.questions.length === 1,
      );
    },
  );
  await check(
    "Sources and diagnostics stay optional and preserve exact archive identities",
    async () => {
      await p.click("#instrument-about");
      assert.match(
        await p.locator("#instrument-information-body").textContent(),
        /13 measured reference/,
      );
      assert.match(
        await p.locator("#instrument-information-body").textContent(),
        /Scientific approval PENDING/,
      );
      assert.ok(
        await p
          .locator('#instrument-information-body a[href^="https://irsa"]')
          .count(),
      );
      assert.equal(
        await p.locator("#instrument-review-download").isVisible(),
        true,
      );
      await snap(p, "sources");
      await p.click("#instrument-information-close");
    },
  );
  await check(
    "Home and direct navigation preserve the same scientific state and canvas",
    async () => {
      const before = await p.evaluate(() => {
        window.qaCanvas = document.getElementById("instrument-canvas-a");
        return skyshiftWebsite.diagnostics().investigation;
      });
      await p.click(".site-brand");
      await p.waitForFunction(
        () => skyshiftWebsite.diagnostics().surface === "home",
      );
      await p.click(".site-navigation a[data-route=compare]");
      await loaded(p);
      assert.equal(
        await p.evaluate(
          () => qaCanvas === document.getElementById("instrument-canvas-a"),
        ),
        true,
      );
      const after = (await p.evaluate(() => skyshiftWebsite.diagnostics()))
        .investigation;
      assert.deepEqual(after.questions, before.questions);
      assert.deepEqual(after.display, before.display);
      assert.deepEqual(after.visual, before.visual);
    },
  );
  await check(
    "Single observations have clear availability and no nonfunctional comparison control",
    async () => {
      await p.selectOption("#instrument-field-select", "m42");
      await loaded(p, "m42", "exposure");
      assert.equal(await p.locator("#instrument-compare").isVisible(), false);
      assert.match(
        await p.locator("#instrument-label-a").textContent(),
        /2025-09-11/,
      );
      assert.match(p.url(), /#observations\/m42$/);
      await question(
        p,
        "What contributes the infrared light at this position?",
        "exposure",
      );
      await save(p, "orion.json");
      await p.click("#instrument-panel-close");
      await snap(p, "single-observation");
    },
  );
  await check(
    "Field search and contextual NASA composite legend are functional",
    async () => {
      await p.click(".site-brand");
      await p.fill("#home-field-search", "WISE");
      assert.equal(await p.locator("#home-fields .field-card:visible").count(), 1);
      await p.fill("#home-field-search", "");
      await p.click("#infrared-legend-button");
      assert.match(
        await p.locator("#infrared-legend").textContent(),
        /not an installed temporal comparison/,
      );
      await p.click("#infrared-legend-button");
    },
  );
  await check(
    "Website spacecraft viewer is opt-in, selectable and pauses offscreen",
    async () => {
      await p.click(".hero-mission-link");
      await p.click("#activate-mission-model");
      await p.waitForFunction(
        () => skyshiftWebsite.diagnostics().model?.frames > 0,
      );
      await p.locator("[data-website-component=panel]").click();
      assert.equal(
        (await p.evaluate(() => skyshiftWebsite.diagnostics())).model.selected,
        "panel",
      );
      assert.match(
        await p.locator("#website-component-description").textContent(),
        /solar panel/i,
      );
      await p.click("#mission-model-reset");
      await snap(p, "mission-model");
      await p.click(".site-navigation a[data-route=observations]");
      await loaded(p, "m42", "exposure");
      await p.waitForTimeout(250);
      const frames = (await p.evaluate(() => skyshiftWebsite.diagnostics()))
        .model.frames;
      await p.waitForTimeout(300);
      assert.equal(
        (await p.evaluate(() => skyshiftWebsite.diagnostics())).model.frames,
        frames,
      );
    },
  );
  await check(
    "Optional universe loads only on entry and returns without losing scientific work",
    async () => {
      const before = (await p.evaluate(() => skyshiftWebsite.diagnostics()))
        .investigation;
      await p.click(".site-navigation a[data-route=universe]");
      await p.waitForFunction(
        () => window.skyshiftSpace?.diagnostics().frames > 0,
      );
      assert.equal(
        (await p.evaluate(() => skyshiftWebsite.diagnostics())).universe_loaded,
        true,
      );
      assert.equal(
        await p.locator("#classic-toggle").count(),
        0,
      );
      await p.click("#from-hardware-to-sky");
      await p.click("[data-destination=m42]");
      await p.click("#inspect-observation");
      await loaded(p, "m42", "exposure");
      const after = (await p.evaluate(() => skyshiftWebsite.diagnostics()))
        .investigation;
      assert.deepEqual(after.questions, before.questions);
      assert.deepEqual(after.display, before.display);
      assert.equal(
        (await p.evaluate(() => skyshiftSpace.audio())).enabled,
        true,
      );
    },
  );
  await check(
    "Universe spacecraft, secondary observatories, solar system and persistent sound controls remain usable",
    async () => {
      await p.click(".site-navigation a[data-route=universe]");
      await p.click("[data-telescope=spherex]");
      await p.click("#look-through");
      await p.click('[data-observe-stage="1"]');
      await p.locator("[data-channel]").nth(2).click();
      await snap(p, "universe");
      await p.click("#mission-close");
      await p.click("#hangar-toggle");
      await p.waitForFunction(
        () => skyshiftSpace.diagnostics().loaded_telescopes.length === 3,
      );
      await p.click("[data-telescope=hubble]");
      await p.click("#look-through");
      await p.click('[data-observe-stage="2"]');
      await p.waitForFunction(
        () => !document.getElementById("mission-image").hidden,
      );
      await p.click("#mission-close");
      await p.click("#destinations-toggle");
      await p.click("[data-environment=solar]");
      await p.click("[data-destination=earth]");
      await p.waitForFunction(
        () => skyshiftSpace.diagnostics().scene === "solar",
      );
      if(!(await p.evaluate(()=>skyshiftSpace.audio())).enabled) await p.click("#site-sound");
      await p.click("#site-sound");
      assert.equal(
        (await p.evaluate(() => skyshiftSpace.audio())).enabled,
        false,
      );
      await p.click(".site-brand");
      await p.waitForFunction(
        () => skyshiftWebsite.diagnostics().surface === "home",
      );
      await p.waitForTimeout(100);
      assert.equal(
        (await p.evaluate(() => skyshiftSpace.audio())).context_state,
        "suspended",
      );
    },
  );
  await check(
    "Fresh profiles reopen current and previous-version JSON/ZIP investigations",
    async () => {
      const cc = await context(),
        pp = await cc.newPage();
      await pp.goto("http://localhost:3000/#compare");
      await loaded(pp);
      for (const [file, field, kind] of [
        [out + "/orion.json", "m42", "exposure"],
        [out + "/comparison.zip", "m101", "pair"],
        ["tmp/telescope-qa/question.json", "m42", "exposure"],
        ["tmp/telescope-qa/comparison.zip", "m101", "pair"],
      ]) {
        await pp.setInputFiles("#instrument-file", file);
        await loaded(pp, field, kind);
        await pp.waitForFunction(
          () =>
            skyshiftWebsite.diagnostics().investigation.questions.length === 1,
        );
      }
      await cc.close();
    },
  );
  for (const width of [1024, 390, 320])
    await check(
      "Readable responsive home, comparison and touch questions at " +
        width +
        "px",
      async () => {
        const cc = await context({
            viewport: { width, height: width < 800 ? 844 : 768 },
            hasTouch: width < 800,
            isMobile: width < 800,
          }),
          pp = await cc.newPage();
        await pp.goto("http://localhost:3000/");
        await pp.waitForFunction(
          () => document.body.dataset.controller === "ready",
        );
        await snap(pp, "home-" + width);
        assert.equal(
          await pp.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
          true,
        );
        if(await pp.locator("#site-menu-toggle").isVisible()) await pp.click("#site-menu-toggle");
        await pp.click(".site-navigation a[data-route=compare]");
        await loaded(pp);
        await pp.click("[data-compare=wipe]");
        await snap(pp, "compare-" + width);
        assert.equal(
          await pp.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
          true,
        );
        const cr = await pp.locator("#instrument-canvas-a").boundingBox();
        assert.ok(cr.height >= 130 && cr.width > 0);
        if (width < 800) {
          await question(pp, "A question from touch inspection", "pair", true);
          await pp.getByRole("button", { name: "Edit", exact: true }).click();
          await pp.fill("#instrument-question-text", "Revised touch question");
          await pp.click("#instrument-question-save");
          await snap(pp, "question-" + width);
          await pp.getByRole("button", { name: "Delete", exact: true }).click();
          assert.equal(
            (await pp.evaluate(() => skyshiftWebsite.diagnostics()))
              .investigation.questions.length,
            0,
          );
        }
        await cc.close();
      },
    );
  await check(
    "Science works with WebGL disabled; optional 3D failure has a website exit",
    async () => {
      const cc = await context();
      await cc.addInitScript(() => {
        const original = HTMLCanvasElement.prototype.getContext;
        HTMLCanvasElement.prototype.getContext = function (type, ...args) {
          return /webgl/.test(type) ? null : original.call(this, type, ...args);
        };
      });
      const pp = await cc.newPage();
      await pp.goto("http://localhost:3000/#compare");
      await loaded(pp);
      await pp.click("#instrument-zoom-in");
      await question(pp, "No WebGL is needed for this question");
      await pp.click("#instrument-panel-close");
      if(await pp.locator("#site-menu-toggle").isVisible()) await pp.click("#site-menu-toggle");
      await pp.click(".site-navigation a[data-route=universe]");
      await pp.locator("#render-fallback").waitFor({ state: "visible" });
      await pp.click(".site-brand");
      if(await pp.locator("#site-menu-toggle").isVisible()) await pp.click("#site-menu-toggle");
        await pp.click(".site-navigation a[data-route=compare]");
      await loaded(pp);
      assert.equal(
        (await pp.evaluate(() => skyshiftWebsite.diagnostics())).investigation
          .questions.length,
        1,
      );
      await cc.close();
    },
  );
  await check(
    "Reduced motion keeps manual comparison accessible and disables blinking",
    async () => {
      const cc = await context({ reducedMotion: "reduce" }),
        pp = await cc.newPage();
      await pp.goto("http://localhost:3000/#compare");
      await loaded(pp);
      assert.equal(await pp.locator("#instrument-blink").isDisabled(), true);
      await pp.locator("#instrument-dates button").nth(1).click();
      assert.equal(
        (await pp.evaluate(() => skyshiftWebsite.diagnostics())).investigation
          .display.selected_epoch,
        "B",
      );
      await cc.close();
    },
  );
  await check(
    "Corrupted single data are refused and retry preserves source checks",
    async () => {
      const cc = await context(),
        pp = await cc.newPage();
      await pp.goto("http://localhost:3000/#compare");
      await loaded(pp);
      await pp.route("**/data/explore/m42-*.json", (r) =>
        r.fulfill({ status: 200, contentType: "application/json", body: "{}" }),
      );
      await pp.selectOption("#instrument-field-select", "m42");
      await pp
        .locator("#instrument-status")
        .filter({ hasText: "checksum" })
        .waitFor();
      assert.equal(
        (await pp.evaluate(() => skyshiftWebsite.diagnostics())).investigation
          .kind,
        "pair",
      );
      await pp.unroute("**/data/explore/m42-*.json");
      await pp.click("#instrument-retry");
      await loaded(pp, "m42", "exposure");
      await cc.close();
    },
  );
  await check(
    "Keyboard inspection and automated accessibility rules on home and science",
    async () => {
      await p.click(".site-navigation a[data-route=compare]");
      await loaded(p);
      await p.locator("#instrument-canvas-a").focus();
      await p.keyboard.press("Home");
      await p.keyboard.press("Enter");
      const science = await axe(p);
      assert.deepEqual(science.violations, []);
      await p.click(".site-brand");
      const home = await axe(p);
      assert.deepEqual(home.violations, []);
      return { science, home };
    },
  );
  assert.deepEqual(errors, []);
  assert.deepEqual(external, []);
} catch (e) {
  console.error("FAILED " + current + "\n" + e.stack);
  process.exitCode = 1;
  if (p) await snap(p, "failure").catch(() => {});
} finally {
  await writeEvidenceFile(evidenceFile(evidenceRun,"docs/evidence/" +
      testName +
      "_product_tests" +
      (suffix ? "_" + suffix : "") +
      ".json"),
    JSON.stringify(
      {
        recorded_at_utc: new Date().toISOString(),
        browser: await browser.version(),
        profile: "isolated, not the user session",
        results,
        page_errors: errors,
        external_requests: external,
        limits: [
          "Qualified scientific approval PENDING",
          "Internal human review PENDING",
          "Independent novice usability validation NOT CONDUCTED",
          "Mobile testing is emulation, not physical-device validation",
          "Automated rules do not establish human usability or manual accessibility certification",
        ],
      },
      null,
      2,
    ),
  );
  await browser.close();
}
