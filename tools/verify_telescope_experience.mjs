import fs from "node:fs/promises";
import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
const { chromium } = await import(
  pathToFileURL(
    process.env.SKYSHIFT_PLAYWRIGHT_MODULE ||
      "C:/Users/LOQ/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs",
  ).href
);
const suffix = process.env.SKYSHIFT_TEST_SUFFIX || "",
  out = "tmp/telescope-qa" + (suffix ? "-" + suffix : "");
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  executablePath:
    process.env.SKYSHIFT_CHROMIUM_EXECUTABLE ||
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
});
const results = [],
  errors = [],
  consoleErrors = [],
  failed = [],
  external = [];
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
  c.on("page", (p) => {
    p.on("pageerror", (e) => errors.push(e.message));
    p.on("console", (m) => {
      if (m.type() === "error") consoleErrors.push(m.text());
    });
    p.on("requestfailed", (r) =>
      failed.push({ url: r.url(), failure: r.failure() }),
    );
  });
  return c;
}
async function ready(p) {
  await p.waitForFunction(
    () =>
      window.skyshiftSpace?.diagnostics().loaded_telescopes?.length === 3 &&
      skyshiftSpace.diagnostics().frames > 0,
  );
}
async function check(name, action) {
  try {
    const detail = await action();
    results.push({ name, status: "pass", detail });
    console.log("PASS " + name);
  } catch (e) {
    results.push({ name, status: "fail", error: e.message });
    throw e;
  }
}
async function science(p) {
  const f = p.frameLocator("#science-frame");
  await f.locator("#explorer[aria-busy=false]").waitFor();
  return f;
}
async function save(p, f, name) {
  const download = p.waitForEvent("download");
  await f.locator("#export-context").click();
  await (await download).saveAs(out + "/" + name);
  return JSON.parse(await fs.readFile(out + "/" + name, "utf8"));
}
try {
  const c = await context(),
    p = await c.newPage();
  await p.goto("http://localhost:3000");
  await ready(p);
  await p.waitForTimeout(1100);
  await check(
    "Telescope-led entry renders all three models together and no separate mode switch",
    async () => {
      assert.equal(await p.locator("#mode-toggle").count(), 0);
      assert.equal(await p.locator("[data-telescope]").count(), 3);
      assert.deepEqual(
        (
          await p.evaluate(() => skyshiftSpace.diagnostics())
        ).loaded_telescopes.sort(),
        ["hubble", "spherex", "webb-b"],
      );
      assert.equal(await p.locator("#destinations-drawer").isVisible(), false);
      assert.equal(
        await p.locator("#sound-toggle").getAttribute("aria-pressed"),
        "false",
      );
      await p.screenshot({ path: out + "/entry.png" });
    },
  );
  await check(
    "Mouse and keyboard camera movement works before mission selection",
    async () => {
      const before = await p.evaluate(() => skyshiftSpace.diagnostics().camera);
      await p.mouse.move(610, 350);
      await p.mouse.down();
      await p.mouse.move(690, 390, { steps: 10 });
      await p.mouse.up();
      await p.locator("#universe").focus();
      await p.keyboard.press("ArrowRight");
      await p.keyboard.press("+");
      assert.notDeepEqual(
        await p.evaluate(() => skyshiftSpace.diagnostics().camera),
        before,
      );
      await p.locator("#camera-reset").click();
      await p.waitForTimeout(1100);
    },
  );
  await check(
    "Actual 3D picking selects Hubble and opens its observation explanation",
    async () => {
      const point = await p.locator("[data-object=hubble]").evaluate((e) => ({
        x: parseFloat(e.style.left),
        y: parseFloat(e.style.top) - 75,
      }));
      await p.mouse.click(point.x, point.y);
      await p.locator("#telescope-experience[data-mission=hubble]").waitFor();
      assert.equal(
        await p.evaluate(() => skyshiftSpace.telescope().mission),
        "hubble",
      );
      await p.locator("#mission-close").click();
    },
  );
  await check(
    "Each telescope has a working animated light path, instrument stage and sourced image",
    async () => {
      for (const id of ["spherex", "webb-b", "hubble"]) {
        await p.locator('[data-telescope="' + id + '"]').click();
        await p.waitForTimeout(1100);
        assert.equal(
          await p.locator("#telescope-experience").getAttribute("data-mission"),
          id,
        );
        const d = await p.evaluate(() => skyshiftSpace.diagnostics());
        assert.equal(d.observing.open, true);
        assert.equal(d.observing.stage, 0);
        if (id === "spherex") {
          await p.locator("#mission-hardware > summary").click();
          await p.locator("[data-mission-component=panel]").click();
          assert.match(
            await p.locator("#mission-component-info").innerText(),
            /2.67/,
          );
        }
        const frames = d.frames;
        await p.waitForTimeout(250);
        assert.ok(
          (await p.evaluate(() => skyshiftSpace.diagnostics().frames)) > frames,
        );
        await p.screenshot({ path: out + "/" + id + "-light.png" });
        await p.locator('[data-observe-stage="1"]').click();
        await p.locator('[data-channel="4"]').click();
        assert.equal(
          (await p.evaluate(() => skyshiftSpace.diagnostics())).observing
            .channel,
          4,
        );
        assert.match(
          await p.locator(".mission-disclaimer").innerText(),
          /no live pointing/,
        );
        await p.screenshot({ path: out + "/" + id + "-instrument.png" });
        await p.locator('[data-observe-stage="2"]').click();
        await p.locator("#mission-image:not([hidden])").waitFor();
        await p.waitForFunction(
          () => skyshiftSpace.diagnostics().observing.published_image_visible,
        );
        assert.ok(
          await p.locator("#mission-image").evaluate((e) => e.naturalWidth > 0),
        );
        assert.equal(
          await p.locator("#mission-fields").isVisible(),
          id === "spherex",
        );
        await p.screenshot({ path: out + "/" + id + "-image.png" });
        await p.locator("#mission-close").click();
      }
    },
  );
  await check(
    "Opt-in audio has distinct mission, instrument, travel and zoom cues",
    async () => {
      await p.locator("#sound-toggle").click();
      await p.waitForTimeout(80);
      for (const id of ["spherex", "webb-b", "hubble"]) {
        await p.locator('[data-telescope="' + id + '"]').click();
        await p.waitForTimeout(100);
        await p.locator('[data-observe-stage="1"]').click();
        await p.waitForTimeout(100);
        await p.locator("#mission-close").click();
        await p.waitForTimeout(100);
      }
      await p.locator("#camera-plus").click();
      await p.waitForTimeout(100);
      await p.locator("#focus-object").click();
      const audio = await p.evaluate(() => skyshiftSpace.audio());
      for (const cue of [
        "spherex",
        "webb-b",
        "hubble",
        "spectrum",
        "zoom",
        "travel",
      ])
        assert.ok(audio.recent_cues.includes(cue), cue + " absent");
      await p.locator("#sound-toggle").click();
      assert.equal(
        (await p.evaluate(() => skyshiftSpace.audio())).context_state,
        "suspended",
      );
      return audio;
    },
  );
  await check(
    "Visible interaction effects respond and can be disabled without disabling explanations",
    async () => {
      const before = (await p.evaluate(() => skyshiftSpace.diagnostics()))
        .observing.pulse_serial;
      await p.locator("[data-telescope=spherex]").click();
      assert.ok(
        (await p.evaluate(() => skyshiftSpace.diagnostics())).observing
          .pulse_serial > before,
      );
      assert.equal(
        await p.locator("body").getAttribute("data-feedback"),
        "observe",
      );
      await p.locator("#settings-button").click();
      await p.locator("#effects-toggle").uncheck();
      await p.locator("#settings-dialog [data-close-dialog]").click();
      assert.equal(
        (await p.evaluate(() => skyshiftSpace.diagnostics())).observing.effects,
        false,
      );
      await p.waitForTimeout(1400);
      const a = await p.evaluate(() => skyshiftSpace.diagnostics().frames);
      await p.waitForTimeout(350);
      assert.ok(
        (await p.evaluate(() => skyshiftSpace.diagnostics().frames)) - a < 4,
      );
      await p.locator("#settings-button").click();
      await p.locator("#effects-toggle").check();
      await p.locator("#settings-dialog [data-close-dialog]").click();
    },
  );
  let f, record;
  await check(
    "SPHEREx mission opens Orion real data inside the same exploration world",
    async () => {
      await p.locator('[data-observe-stage="2"]').click();
      await p.locator("[data-mission-field=m42]").click();
      await p.locator("#mission-field-open").click();
      f = await science(p);
      assert.match(await f.locator("#object-story").innerText(), /Orion/);
      assert.equal(await f.locator("#compare-link").isVisible(), false);
      record = await save(p, f, "orion.json");
      assert.equal(
        record.observation.source.sha256,
        "334b591a00814270d53577bce832cc9dd402aa9f607c2744d5895c0728072f27",
      );
      assert.equal(record.scientific_approval, "PENDING");
      assert.ok(await p.locator("#universe").isVisible());
      await p.screenshot({ path: out + "/observation-lens.png" });
      await f.locator("#context-source").click();
      assert.match(
        await f.locator("dialog[open]").innerText(),
        /Original calibrated FITS/,
      );
      await f.locator("dialog[open] .icon-button").click();
    },
  );
  await check(
    "Pixel questions save and reopen and survive leaving the lens for another telescope",
    async () => {
      await f.locator("#explore-canvas").focus();
      for (let i = 0; i < 30; i++) {
        await f.locator("#explore-canvas").press("ArrowLeft");
        if (await f.locator("#ask-exposure-question").isVisible()) break;
      }
      await f.locator("#ask-exposure-question").click();
      await f
        .locator("#exposure-question-text")
        .fill("SYNTHETIC telescope journey question. No discovery.");
      await f
        .getByRole("button", { name: "Keep question", exact: true })
        .click();
      const saved = await save(p, f, "question.json");
      assert.equal(saved.questions.length, 1);
      await f
        .locator("body")
        .evaluate((e) => (e.dataset.identity = "retained-lens-document"));
      await p.locator("#back-to-universe").click();
      await p.locator("[data-telescope=webb-b]").click();
      await p.locator("#mission-close").click();
      await p.locator("#observations-button").click();
      f = await science(p);
      assert.equal(
        await f.locator("body").getAttribute("data-identity"),
        "retained-lens-document",
      );
      assert.equal(
        await f.locator("#exposure-question-count").innerText(),
        "1",
      );
      await f
        .getByRole("button", { name: "Delete question 1", exact: true })
        .click();
      await f
        .locator("#import-context-file")
        .setInputFiles(out + "/question.json");
      await f
        .locator("#view-record-feedback")
        .filter({ hasText: "restored" })
        .waitFor();
      assert.deepEqual(
        (await save(p, f, "restored-question.json")).questions,
        saved.questions,
      );
      await p.locator("#back-to-universe").click();
    },
  );
  await check(
    "Restricted comparison supports edit, export, reopen and deletion within the lens",
    async () => {
      await p.locator("[data-telescope=spherex]").click();
      await p.locator('[data-observe-stage="2"]').click();
      await p.locator("[data-mission-field=m101]").click();
      await p.locator("#mission-field-open").click();
      f = await science(p);
      await f.locator("#compare-link").click();
      await f.locator("#workspace").waitFor();
      assert.match(
        await f.locator(".review-tag").first().innerText(),
        /PENDING/,
      );
      await f.locator("#mark-mode").click();
      await f.locator("#canvas-a").click();
      await f.locator("#note-text").fill("SYNTHETIC lens note");
      await f.getByRole("button", { name: "Save note", exact: true }).click();
      await f
        .locator("#notes")
        .getByRole("button", { name: "Edit", exact: true })
        .click();
      await f.locator("#note-text").fill("SYNTHETIC edited lens note");
      await f.getByRole("button", { name: "Save note", exact: true }).click();
      const event = p.waitForEvent("download");
      await f.locator("#export").click();
      await (await event).saveAs(out + "/comparison.zip");
      await p.locator("#back-to-universe").click();
      await p.locator("#resume-button").click();
      assert.equal(await f.locator("#note-count").innerText(), "1");
      await f
        .locator("#notes")
        .getByRole("button", { name: "Delete", exact: true })
        .click();
      await f.locator("#import-file").setInputFiles(out + "/comparison.zip");
      await f.locator("#note-count").filter({ hasText: "1" }).waitFor();
      assert.match(await f.locator("#notes").innerText(), /edited lens note/);
      await f
        .locator("#notes")
        .getByRole("button", { name: "Delete", exact: true })
        .click();
      assert.equal(await f.locator("#note-count").innerText(), "0");
      await p.locator("#back-to-universe").click();
    },
  );
  await check(
    "Solar system and real-field navigation still work beside telescope access",
    async () => {
      await p.locator("#destinations-toggle").click();
      await p.locator("[data-environment=solar]").click();
      await p.waitForFunction(
        () => skyshiftSpace.diagnostics().assets_loaded.length >= 12,
      );
      await p.locator("[data-destination=saturn]").click();
      await p.waitForTimeout(1100);
      assert.equal(await p.locator("#context-name").innerText(), "Saturn");
      await p.locator("[data-environment=sky]").click();
      assert.equal(await p.locator("[data-destination]").count(), 4);
      await p.locator("[data-destination=m67]").click();
      assert.match(
        await p.locator("#context-state").innerText(),
        /single-exposure/i,
      );
      await p.locator("[data-telescope=hubble]").click();
      assert.equal(
        await p.evaluate(() => skyshiftSpace.workspace().environment),
        "observatory",
      );
      await p.locator("#mission-close").click();
    },
  );
  await check(
    "Reduced motion keeps explanatory diagrams static and legacy mode preferences cannot restore a split UI",
    async () => {
      const rc = await context({ reducedMotion: "reduce" }),
        q = await rc.newPage();
      await q.addInitScript(() =>
        localStorage.setItem(
          "skyshift.space.preferences.v1",
          JSON.stringify({ mode: "classic" }),
        ),
      );
      await q.goto("http://localhost:3000");
      await ready(q);
      await q.locator("[data-telescope=spherex]").click();
      assert.equal(
        (await q.evaluate(() => skyshiftSpace.diagnostics())).observing.motion,
        false,
      );
      await q.waitForTimeout(250);
      const before = await q.evaluate(() => skyshiftSpace.diagnostics().frames);
      await q.waitForTimeout(300);
      assert.ok(
        (await q.evaluate(() => skyshiftSpace.diagnostics().frames)) - before <
          4,
      );
      await rc.close();
    },
  );
  for (const width of [1024, 390, 320])
    await check(
      width +
        "px layout offers telescope explanations and real observations with no overflow",
      async () => {
        const mc = await context({
            viewport: { width, height: 844 },
            hasTouch: width < 740,
            reducedMotion: "reduce",
          }),
          q = await mc.newPage();
        await q.goto("http://localhost:3000");
        await ready(q);
        assert.ok(
          await q.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth + 1,
          ),
        );
        await q.screenshot({ path: out + "/entry-" + width + ".png" });
        if (width < 740) {
          const before = await q.evaluate(
              () => skyshiftSpace.diagnostics().camera,
            ),
            cdp = await mc.newCDPSession(q);
          await cdp.send("Input.dispatchTouchEvent", {
            type: "touchStart",
            touchPoints: [
              { id: 1, x: width / 2 - 25, y: 230 },
              { id: 2, x: width / 2 + 25, y: 230 },
            ],
          });
          await cdp.send("Input.dispatchTouchEvent", {
            type: "touchMove",
            touchPoints: [
              { id: 1, x: width / 2 - 55, y: 230 },
              { id: 2, x: width / 2 + 55, y: 230 },
            ],
          });
          await cdp.send("Input.dispatchTouchEvent", {
            type: "touchEnd",
            touchPoints: [],
          });
          await cdp.detach();
          assert.notDeepEqual(
            await q.evaluate(() => skyshiftSpace.diagnostics().camera),
            before,
          );
        }
        if (width < 740) await q.locator("[data-telescope=spherex]").tap();
        else await q.locator("[data-telescope=spherex]").click();
        await q.screenshot({ path: out + "/light-" + width + ".png" });
        await q.locator('[data-observe-stage="2"]').click();
        await q.locator("[data-mission-field=m42]").click();
        await q.locator("#mission-field-open").click();
        const frame = await science(q);
        assert.equal(await frame.locator("#export-context").isEnabled(), true);
        await q.screenshot({ path: out + "/data-" + width + ".png" });
        await q.locator("#back-to-universe").click();
        await mc.close();
      },
    );
  await check(
    "Opening a new browser page can reconstruct the downloaded exposure and comparison",
    async () => {
      const nc = await context(),
        q = await nc.newPage();
      await q.goto("http://localhost:3000");
      await ready(q);
      await q.locator("#observations-button").click();
      const frame = await science(q);
      await frame
        .locator("#import-context-file")
        .setInputFiles(out + "/question.json");
      await frame
        .locator("#view-record-feedback")
        .filter({ hasText: "restored" })
        .waitFor();
      assert.equal(
        await frame.locator("#exposure-question-count").innerText(),
        "1",
      );
      await q.goto("http://localhost:3000/compare.html");
      await q.locator("#workspace").waitFor();
      await q.locator("#import-file").setInputFiles(out + "/comparison.zip");
      await q.locator("#note-count").filter({ hasText: "1" }).waitFor();
      assert.match(await q.locator("#notes").innerText(), /edited lens note/);
      await nc.close();
    },
  );
  await check(
    "Unsupported WebGL leaves the integrated observation lens usable",
    async () => {
      const nc = await context(),
        q = await nc.newPage();
      await q.addInitScript(() => {
        const get = HTMLCanvasElement.prototype.getContext;
        HTMLCanvasElement.prototype.getContext = function (t, ...args) {
          return t.startsWith("webgl") ? null : get.call(this, t, ...args);
        };
      });
      await q.goto("http://localhost:3000");
      await q.locator("#render-fallback").waitFor();
      await q.locator("#fallback-classic").click();
      await science(q);
      await nc.close();
    },
  );
  await check(
    "A corrupt telescope asset is not substituted and selection retries the verified model",
    async () => {
      const nc = await context(),
        q = await nc.newPage();
      await q.route("**/hubble.glb", (r) =>
        r.fulfill({ body: "SYNTHETIC corrupt model", status: 200 }),
      );
      await q.goto("http://localhost:3000");
      await q.waitForFunction(
        () => window.skyshiftSpace?.diagnostics().frames > 0,
      );
      await q.locator("[data-telescope=hubble]").click();
      await q.waitForFunction(() =>
        document
          .querySelector("#space-status")
          .textContent.includes("checksum mismatch"),
      );
      assert.ok(
        !(
          await q.evaluate(() => skyshiftSpace.diagnostics().loaded_telescopes)
        ).includes("hubble"),
      );
      await q.unroute("**/hubble.glb");
      await q.locator("[data-telescope=hubble]").click();
      await ready(q);
      await nc.close();
    },
  );
  await check(
    "Corrupted mission imagery is rejected and image reload verifies fresh bytes",
    async () => {
      const nc = await context(),
        q = await nc.newPage();
      await q.route("**/webb-deep-field.webp", (r) =>
        r.fulfill({ status: 200, body: "SYNTHETIC wrong image bytes" }),
      );
      await q.goto("http://localhost:3000");
      await ready(q);
      await q.locator("[data-telescope=webb-b]").click();
      await q.locator('[data-observe-stage="2"]').click();
      await q
        .locator("#mission-image-status")
        .filter({ hasText: "checksum mismatch" })
        .waitFor();
      assert.equal(await q.locator("#mission-image").isVisible(), false);
      assert.equal(
        (await q.evaluate(() => skyshiftSpace.diagnostics())).observing
          .published_image_visible,
        false,
      );
      await q.unroute("**/webb-deep-field.webp");
      await q.locator("#mission-image-retry").click();
      await q.locator("#mission-image:not([hidden])").waitFor();
      await nc.close();
    },
  );
  await check(
    "A lost WebGL context preserves observation access and a fresh renderer recovers",
    async () => {
      const nc = await context(),
        q = await nc.newPage();
      await q.goto("http://localhost:3000");
      await ready(q);
      await q
        .locator("#universe")
        .evaluate((canvas) =>
          canvas
            .getContext("webgl2")
            .getExtension("WEBGL_lose_context")
            .loseContext(),
        );
      await q.locator("#render-fallback").waitFor();
      await q.locator("#fallback-classic").click();
      await science(q);
      await q.locator("#back-to-universe").click();
      await q.locator("#retry-renderer").click();
      await ready(q);
      assert.equal(await q.locator("#render-fallback").isVisible(), false);
      await nc.close();
    },
  );
  await check(
    "Explanations have automated accessibility checks and runtime stays local",
    async () => {
      await p.locator("[data-telescope=spherex]").click();
      await p.evaluate(await fs.readFile("tools/vendor/axe.min.js", "utf8"));
      const result = await p.evaluate(async () => {
        const r = await axe.run(document, {
          runOnly: {
            type: "tag",
            values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"],
          },
        });
        return {
          violations: r.violations.map((v) => ({
            id: v.id,
            nodes: v.nodes.map((n) => ({
              target: n.target,
              html: n.html.slice(0, 350),
              failure: n.failureSummary,
            })),
          })),
          manual: r.incomplete.map((v) => v.id),
        };
      });
      assert.deepEqual(result.violations, []);
      assert.deepEqual(errors, []);
      assert.deepEqual(external, []);
      assert.deepEqual(
        consoleErrors.filter(
          (s) => !s.includes("Error creating WebGL context"),
        ),
        [],
      );
      return result;
    },
  );
  await c.close();
} catch (e) {
  console.error(e);
  process.exitCode = 1;
} finally {
  const version = browser.version();
  await browser.close();
  await fs.writeFile(
    "docs/evidence/telescope_experience_tests" +
      (suffix ? "_" + suffix : "") +
      ".json",
    JSON.stringify(
      {
        date_utc: new Date().toISOString(),
        browser: process.env.SKYSHIFT_BROWSER_NAME || "Installed Chrome",
        version,
        results,
        errors,
        console_errors: consoleErrors,
        failed_requests: failed,
        external,
        user_journey_verified: false,
        user_freeze_feedback:
          "User confirmed the prior repaired application now responds; new telescope experience awaits user evaluation",
        scientific_approval: "PENDING",
        independent_novice_validation: "NOT CONDUCTED",
      },
      null,
      2,
    ) + "\n",
  );
}
