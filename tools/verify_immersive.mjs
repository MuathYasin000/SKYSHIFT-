import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import assert from "node:assert/strict";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."),
  suffix = process.env.SKYSHIFT_TEST_SUFFIX || "",
  out = root + "/tmp/immersive-qa" + (suffix ? "-" + suffix : "");
await fs.mkdir(out, { recursive: true });
const { chromium } = await import(
  pathToFileURL(
    process.env.SKYSHIFT_PLAYWRIGHT_MODULE ||
      "C:/Users/LOQ/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs",
  ).href
);
const browser = await chromium.launch({
    headless: true,
    executablePath:
      process.env.SKYSHIFT_CHROMIUM_EXECUTABLE ||
      "C:/Users/LOQ/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe",
  }),
  version = browser.version(),
  results = [],
  errors = [],
  consoleErrors = [],
  external = [],
  base = "http://localhost:3000";
async function check(name, fn) {
  try {
    const detail = await fn();
    results.push({ name, status: "pass", ...(detail ? { detail } : {}) });
    console.log("PASS " + name);
  } catch (e) {
    results.push({ name, status: "fail", error: e.message });
    throw e;
  }
}
async function context(width = 1440, height = 1000, extra = {}) {
  const c = await browser.newContext({
    viewport: { width, height },
    acceptDownloads: true,
    ...extra,
  });
  c.setDefaultTimeout(15000);
  await c.route("**/*", (r) => {
    const u = new URL(r.request().url());
    if (
      u.protocol === "blob:" ||
      ["localhost", "127.0.0.1"].includes(u.hostname)
    )
      return r.continue();
    external.push(u.href);
    return r.abort();
  });
  c.on("page", (p) => {
    p.on("pageerror", (e) => errors.push(e.message));
    p.on("console", (m) => {
      if (m.type() === "error") consoleErrors.push(m.text());
    });
  });
  return c;
}
async function ready(p) {
  await p.waitForFunction(
    () =>
      window.skyshiftSpace?.diagnostics().webgl === "ready" ||
      !document.querySelector("#render-fallback").hidden,
  );
  assert.equal(
    await p.locator("#render-fallback").isVisible(),
    false,
    await p.locator("#render-error").textContent(),
  );
}
async function scientific(p) {
  const f = p.frameLocator("#science-frame");
  await f.locator("#explorer[aria-busy=false]").waitFor();
  await f.locator("#context-source:not([disabled])").waitFor();
  return f;
}
async function save(p, f, name) {
  const event = p.waitForEvent("download");
  await f.locator("#export-context").click();
  await (await event).saveAs(out + "/" + name);
  return JSON.parse(await fs.readFile(out + "/" + name, "utf8"));
}
try {
  const c = await context(),
    p = await c.newPage();
  await p.goto(base);
  await ready(p);
  await check(
    "Real WebGL environment starts with official branding and muted audio",
    async () => {
      assert.equal(
        await p.locator(".space-brand img").getAttribute("src"),
        "./assets/SKYSHIFT_ICON.PNG",
      );
      assert.equal(
        await p.locator("#sound-toggle").getAttribute("aria-pressed"),
        "false",
      );
      assert.match(
        await p.locator("#context-limitation").innerText(),
        /NOT A DIGITAL TWIN/,
      );
      assert.ok(
        (await p.evaluate(() => window.skyshiftSpace.diagnostics())).triangles >
          1000,
      );
      await p.screenshot({ path: out + "/observatory-desktop.png" });
    },
  );
  await check(
    "Component inspection and keyboard camera controls have immediate feedback",
    async () => {
      await p.locator("[data-component=panel]").click();
      assert.match(
        await p.locator("#component-description").innerText(),
        /2.67/,
      );
      const before = await p.evaluate(
        () => window.skyshiftSpace.diagnostics().camera,
      );
      await p.locator("#universe").focus();
      await p.keyboard.press("ArrowLeft");
      await p.keyboard.press("+");
      await p.waitForTimeout(150);
      assert.notDeepEqual(
        await p.evaluate(() => window.skyshiftSpace.diagnostics().camera),
        before,
      );
      await p.keyboard.press("Home");
    },
  );
  await check(
    "Official Hubble and Webb GLBs decode with local Draco, materials and textures",
    async () => {
      for (const id of ["hubble", "webb-b"]) {
        await p.locator("[data-destination=" + id + "]").click();
        await p.waitForFunction(
          (id) => window.skyshiftSpace.diagnostics().assets_loaded.includes(id),
          id,
        );
        await p.waitForFunction(
          () =>
            document.querySelector("#space-status").textContent ===
            "Interactive model ready",
        );
        await p.waitForTimeout(1000);
        assert.match(
          await p.locator("#context-limitation").innerText(),
          /NASA MODEL/,
        );
        await p.screenshot({ path: out + "/" + id + ".png" });
      }
      assert.deepEqual(consoleErrors, []);
    },
  );
  await check(
    "All eight planets, Sun and Moon load from local authentic contextual assets",
    async () => {
      await p.locator("[data-environment=solar]").click();
      await p.waitForFunction(
        () => window.skyshiftSpace.diagnostics().assets_loaded.length === 12,
      );
      assert.match(
        await p.locator("#scene-type").innerText(),
        /NO LIVE EPHEMERIDES/,
      );
      assert.equal(await p.locator("[data-destination]").count(), 10);
      await p.screenshot({ path: out + "/solar-overview.png" });
      await p.locator("[data-destination=saturn]").click();
      await p.waitForTimeout(1200);
      await p.screenshot({ path: out + "/saturn.png" });
      assert.deepEqual(consoleErrors, []);
    },
  );
  await check(
    "Destination search has clear results and accessible selection independent of 3D picking",
    async () => {
      await p.locator("#destination-search").fill("Neptune");
      assert.equal(await p.locator("[data-destination]").count(), 1);
      await p.locator("[data-destination=neptune]").click();
      assert.equal(await p.locator("#context-name").innerText(), "Neptune");
      await p.locator("#destination-search").fill("SYNTHETIC NO MATCH");
      assert.match(
        await p.locator("#destination-search-status").innerText(),
        /No available destination/,
      );
      await p.locator("#destination-search").fill("");
    },
  );
  await check(
    "Celestial navigation preserves genuine fields, dates and comparison restrictions",
    async () => {
      await p.locator("[data-environment=sky]").click();
      assert.equal(await p.locator("[data-destination]").count(), 4);
      await p.locator("[data-destination=m42]").click();
      assert.match(
        await p.locator("#context-date").innerText(),
        /11 Sept? 2025/,
      );
      assert.match(
        await p.locator("#context-limitation").innerText(),
        /No time comparison/,
      );
      assert.match(await p.locator("#scene-type").innerText(), /ICRS/);
      await p.waitForTimeout(1000);
      await p.screenshot({ path: out + "/sky-fields.png" });
    },
  );
  let f, record;
  await check(
    "Entering real data pauses the contextual renderer and uses the original verified viewer",
    async () => {
      await p.locator("#inspect-observation").click();
      f = await scientific(p);
      assert.match(await f.locator("#object-story").innerText(), /Orion/);
      assert.equal(await f.locator("#compare-link").isVisible(), false);
      record = await save(p, f, "orion.json");
      assert.equal(
        record.observation.source.sha256,
        "334b591a00814270d53577bce832cc9dd402aa9f607c2744d5895c0728072f27",
      );
      assert.equal(record.scientific_approval, "PENDING");
      const before = await p.evaluate(
        () => window.skyshiftSpace.diagnostics().frames,
      );
      await p.waitForTimeout(300);
      assert.equal(
        await p.evaluate(() => window.skyshiftSpace.diagnostics().frames),
        before,
      );
    },
  );
  await check(
    "Classic/Immersive toggles preserve the same live document, viewport and science identity",
    async () => {
      await f.locator("#explore-plus").click();
      await f.locator("#explore-canvas").focus();
      await f.locator("#explore-canvas").press("ArrowLeft");
      const before = await save(p, f, "before-mode.json");
      await f
        .locator("body")
        .evaluate((e) => (e.dataset.testIdentity = "same-live-document"));
      await p.locator("#mode-toggle").click();
      assert.match(await p.locator("#mode-toggle").innerText(), /Immersive/);
      assert.equal(
        await f
          .locator("body")
          .evaluate((e) => e.classList.contains("immersive-embedded")),
        false,
      );
      assert.equal(
        await f.locator("body").getAttribute("data-test-identity"),
        "same-live-document",
      );
      assert.deepEqual(await save(p, f, "classic.json"), before);
      await p.locator("#mode-toggle").click();
      assert.equal(
        await f
          .locator("body")
          .evaluate((e) => e.classList.contains("immersive-embedded")),
        true,
      );
      assert.deepEqual(await save(p, f, "immersive.json"), before);
    },
  );
  await check(
    "Coordinate questions export and reconstruct through the immersive scientific workspace",
    async () => {
      await f.locator("#explore-reset").click();
      await f.locator("#explore-canvas").focus();
      for (let i = 0; i < 15; i++) {
        await f.locator("#explore-canvas").press("ArrowLeft");
        if (await f.locator("#ask-exposure-question").isVisible()) break;
      }
      await f.locator("#ask-exposure-question").click();
      await f
        .locator("#exposure-question-text")
        .fill("SYNTHETIC immersive test question; no discovery claimed.");
      await f
        .getByRole("button", { name: "Keep question", exact: true })
        .click();
      const saved = await save(p, f, "question.json");
      assert.equal(saved.schema_version, "1.1");
      await p.locator("#mode-toggle").click();
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
        (await save(p, f, "question-restored.json")).questions,
        saved.questions,
      );
      await p.locator("#mode-toggle").click();
    },
  );
  await check(
    "Return and Resume preserve science work and the spatial camera",
    async () => {
      const camera = await p.evaluate(
        () => window.skyshiftSpace.diagnostics().camera,
      );
      await p.locator("#back-to-universe").click();
      assert.equal(await p.locator("#space-workspace").isVisible(), false);
      await p.locator("#resume-button").click();
      f = await scientific(p);
      assert.equal(
        await f.locator("#exposure-question-count").innerText(),
        "1",
      );
      assert.deepEqual(
        await p.evaluate(() => window.skyshiftSpace.diagnostics().camera),
        camera,
      );
      await p.locator("#back-to-universe").click();
    },
  );
  await check(
    "Restricted comparison, coordinate annotations and ZIP exports work inside both modes",
    async () => {
      await p.locator("[data-destination=m101]").click();
      await p.locator("#inspect-observation").click();
      f = await scientific(p);
      await f.locator("#compare-link").click();
      await f.locator("#workspace").waitFor();
      assert.match(
        await f.locator(".review-tag").first().innerText(),
        /PENDING/,
      );
      await f.locator("#mark-mode").click();
      await f.locator("#canvas-a").click();
      await f.locator("#note-text").fill("SYNTHETIC comparison question.");
      await f.getByRole("button", { name: "Save note", exact: true }).click();
      await p.locator("#mode-toggle").click();
      assert.equal(await f.locator("#note-count").innerText(), "1");
      const event = p.waitForEvent("download");
      await f.locator("#export").click();
      await (await event).saveAs(out + "/comparison.zip");
      await f
        .locator("#notes")
        .getByRole("button", { name: "Delete", exact: true })
        .click();
      await f.locator("#import-file").setInputFiles(out + "/comparison.zip");
      await f.locator("#note-count").filter({ hasText: "1" }).waitFor();
      await p.locator("#mode-toggle").click();
      assert.equal(await f.locator("#note-count").innerText(), "1");
      await p.locator("#back-to-universe").click();
    },
  );
  await check(
    "Optional audio needs a deliberate click and Classic mode returns it to silence",
    async () => {
      assert.equal(
        await p.locator("#sound-toggle").getAttribute("aria-pressed"),
        "false",
      );
      await p.locator("#sound-toggle").click();
      assert.equal(
        await p.locator("#sound-toggle").getAttribute("aria-pressed"),
        "true",
      );
      await p.locator("#mode-toggle").click();
      assert.equal(
        await p.locator("#sound-toggle").getAttribute("aria-pressed"),
        "false",
      );
      await p.locator("#back-to-universe").click();
    },
  );
  await check(
    "Quality and decorative effects preferences persist without altering science",
    async () => {
      await p.locator("#settings-button").click();
      await p.locator("#effects-toggle").uncheck();
      await p.locator("#quality-select").selectOption("low");
      await p.locator("#effects-volume").fill("0.15");
      await p.locator("#settings-dialog [data-close-dialog]").click();
      const saved = await p.evaluate(() =>
        JSON.parse(localStorage.getItem("skyshift.space.preferences.v1")),
      );
      assert.equal(saved.effects, false);
      assert.equal(saved.quality, "low");
      assert.equal(Object.hasOwn(saved, "sound_enabled"), false);
    },
  );
  await check(
    "Measured render work is recorded and demand rendering becomes idle",
    async () => {
      await p.locator("[data-environment=observatory]").click();
      await p.waitForTimeout(2200);
      const a = await p.evaluate(() => window.skyshiftSpace.diagnostics());
      await p.waitForTimeout(450);
      const b = await p.evaluate(() => window.skyshiftSpace.diagnostics());
      assert.ok(b.frames - a.frames < 4);
      const ordered = [...b.render_ms].sort((a, b) => a - b);
      return {
        draw_calls: b.draw_calls,
        triangles: b.triangles,
        render_cpu_median_ms: ordered[Math.floor(ordered.length / 2)],
        render_cpu_p95_ms: ordered[Math.floor(ordered.length * 0.95)],
        idle_frames_in_450ms: b.frames - a.frames,
        scope:
          "Headless browser on this computer; CPU render submission timing, not GPU completion or a 60 FPS guarantee",
      };
    },
  );
  await check(
    "Asset credits expose original sources, hashes, terms and illustrative limitations",
    async () => {
      await p.locator("#credits-button").click();
      assert.ok((await p.locator(".asset-credit").count()) > 10);
      assert.match(
        await p.locator("#credits-dialog").innerText(),
        /No NASA Eyes application assets were extracted/,
      );
      await p.locator("#credits-dialog [data-close-dialog]").click();
    },
  );
  await check(
    "Guided journey is visitor-controlled and can be abandoned",
    async () => {
      await p.locator("#journey-button").click();
      assert.match(await p.locator("#journey-copy").innerText(), /1 \/ 3/);
      await p.locator("#journey-next").click();
      assert.equal(
        await p.locator("[data-environment=sky]").getAttribute("aria-pressed"),
        "true",
      );
      await p.locator("#journey-exit").click();
      assert.equal(await p.locator("#journey-strip").isVisible(), false);
    },
  );
  await check(
    "Remembered Classic mode starts without loading the 3D runtime",
    async () => {
      const isolated = await context(),
        q = await isolated.newPage();
      await q.addInitScript(() =>
        localStorage.setItem(
          "skyshift.space.preferences.v1",
          JSON.stringify({ mode: "classic" }),
        ),
      );
      await q.goto(base);
      await scientific(q);
      assert.equal(
        await q.evaluate(() => window.skyshiftSpace.diagnostics().webgl),
        "not_started",
      );
      assert.equal(
        await q.locator("#mode-toggle").innerText(),
        "Immersive View",
      );
      assert.equal(
        await q.locator("#sound-toggle").getAttribute("aria-pressed"),
        "false",
      );
      await isolated.close();
    },
  );
  await check("Early destination selection and search survive 3D startup", async () => {
    const isolated = await context(), q = await isolated.newPage();
    let release;
    const gate = new Promise(resolve => release = resolve);
    await q.route("**/assets/space/manifest.json", async route => { await gate; await route.continue(); });
    await q.goto(base);
    await q.locator("[data-destination=hubble]").click();
    await q.locator("#destination-search").fill("Hubble");
    release();
    await ready(q);
    await q.waitForFunction(() => window.skyshiftSpace.diagnostics().assets_loaded.includes("hubble"));
    assert.equal(await q.locator("#context-name").innerText(), "Hubble Space Telescope");
    assert.equal(await q.locator("#destination-search").inputValue(), "Hubble");
    assert.equal(await q.locator("[data-destination]").count(), 1);
    await isolated.close();
  });
  await check(
    "Corrupted contextual model bytes are rejected and a clean retry recovers",
    async () => {
      const isolated = await context(),
        q = await isolated.newPage();
      await q.goto(base);
      await ready(q);
      await q.route("**/assets/space/hubble.glb", (r) =>
        r.fulfill({ status: 200, body: "SYNTHETIC CORRUPTED GLB" }),
      );
      await q.locator("[data-destination=hubble]").click();
      await q.waitForFunction(() =>
        document
          .querySelector("#space-status")
          .textContent.includes("checksum mismatch"),
      );
      assert.equal(
        (
          await q.evaluate(
            () => window.skyshiftSpace.diagnostics().assets_loaded,
          )
        ).includes("hubble"),
        false,
      );
      await q.unroute("**/assets/space/hubble.glb");
      await q.locator("[data-destination=hubble]").click();
      await q.waitForFunction(() =>
        window.skyshiftSpace.diagnostics().assets_loaded.includes("hubble"),
      );
      await isolated.close();
    },
  );
  await check(
    "A WebGL context loss keeps the scientific fallback available",
    async () => {
      const isolated = await context(),
        q = await isolated.newPage();
      await q.goto(base);
      await ready(q);
      const supported = await q.locator("#universe").evaluate((canvas) => {
        const gl = canvas.getContext("webgl2"),
          extension = gl.getExtension("WEBGL_lose_context");
        if (!extension) return false;
        extension.loseContext();
        return true;
      });
      assert.equal(supported, true);
      await q.locator("#render-fallback").waitFor();
      assert.match(await q.locator("#render-error").innerText(), /interrupted/);
      await q.locator("#fallback-classic").click();
      const frame = await scientific(q);
      assert.equal(await frame.locator("#export-context").isEnabled(), true);
      await q.locator("#back-to-universe").click();
      await q.locator("#retry-renderer").click();
      await q.waitForFunction(() => window.skyshiftSpace?.diagnostics().webgl === "ready" && document.querySelector("#render-fallback").hidden);
      await ready(q);
      assert.equal(await q.evaluate(() => window.skyshiftSpace.diagnostics().webgl), "ready");
      await isolated.close();
    },
  );
  await check(
    "Unavailable WebGL offers functional Classic scientific access",
    async () => {
      const isolated = await context(),
        q = await isolated.newPage();
      await q.addInitScript(() => {
        const original = HTMLCanvasElement.prototype.getContext;
        HTMLCanvasElement.prototype.getContext = function (type, ...args) {
          return type.startsWith("webgl")
            ? null
            : original.call(this, type, ...args);
        };
      });
      await q.goto(base);
      await q.locator("#render-fallback").waitFor();
      await q.locator("#fallback-classic").click();
      await scientific(q);
      await isolated.close();
    },
  );
  for (const width of [390, 320])
    await check(
      width +
        "px touch layout, camera gestures and Classic switching remain usable",
      async () => {
        const mobile = await context(width, 844, {
            hasTouch: true,
            reducedMotion: "reduce",
          }),
          q = await mobile.newPage();
        await q.goto(base);
        await ready(q);
        assert.ok(
          await q.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth + 1,
          ),
        );
        await q.screenshot({ path: out + "/mobile-" + width + ".png" });
        await q.locator("#context-toggle").tap();
        await q.locator("#from-hardware-to-sky").scrollIntoViewIfNeeded();
        await q.locator("#from-hardware-to-sky").tap();
        assert.equal(
          await q
            .locator("[data-environment=sky]")
            .getAttribute("aria-pressed"),
          "true",
        );
        await q.locator("[data-environment=observatory]").tap();
        await q.locator("#context-toggle").tap();
        const before = await q.evaluate(
            () => window.skyshiftSpace.diagnostics().camera,
          ),
          cdp = await mobile.newCDPSession(q);
        await cdp.send("Input.dispatchTouchEvent", {
          type: "touchStart",
          touchPoints: [
            { id: 1, x: width / 2 - 25, y: 330 },
            { id: 2, x: width / 2 + 25, y: 330 },
          ],
        });
        await cdp.send("Input.dispatchTouchEvent", {
          type: "touchMove",
          touchPoints: [
            { id: 1, x: width / 2 - 55, y: 330 },
            { id: 2, x: width / 2 + 55, y: 330 },
          ],
        });
        await cdp.send("Input.dispatchTouchEvent", {
          type: "touchEnd",
          touchPoints: [],
        });
        await cdp.detach();
        assert.notDeepEqual(
          await q.evaluate(() => window.skyshiftSpace.diagnostics().camera),
          before,
        );
        await q.locator("#mode-toggle").tap();
        const frame = await scientific(q);
        assert.equal(await frame.locator("#export-context").isEnabled(), true);
        assert.ok(
          await q.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth + 1,
          ),
        );
        await mobile.close();
      },
    );
  await check(
    "Immersive controls pass automated accessibility rules and all runtime requests stay local",
    async () => {
      await p.evaluate(
        await fs.readFile(root + "/tools/vendor/axe.min.js", "utf8"),
      );
      const r = await p.evaluate(async () => {
        const result = await axe.run(document, {
          runOnly: {
            type: "tag",
            values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"],
          },
        });
        return {
          violations: result.violations.map((v) => ({
            id: v.id,
            nodes: v.nodes.map((n) => n.target),
          })),
          manual_review: result.incomplete.map((v) => v.id),
        };
      });
      assert.deepEqual(r.violations, []);
      assert.deepEqual(errors, []);
      assert.deepEqual(external, []);
      const unexpected = consoleErrors.filter(
        (s) => !s.includes("Error creating WebGL context"),
      );
      assert.deepEqual(unexpected, []);
      return r;
    },
  );
  await c.close();
} catch (e) {
  if (!results.some((r) => r.status === "fail"))
    results.push({
      name: "Browser setup/readiness",
      status: "fail",
      error: e.message,
    });
  console.error(e);
  process.exitCode = 1;
} finally {
  await browser.close();
  await fs.writeFile(
    root +
      "/docs/evidence/immersive_workspace_tests" +
      (suffix ? "_" + suffix : "") +
      ".json",
    JSON.stringify(
      {
        date_utc: new Date().toISOString(),
        browser: process.env.SKYSHIFT_BROWSER_NAME || "Chromium",
        browser_version: version,
        results,
        errors,
        console_errors: consoleErrors,
        external,
        touch_scope:
          "Chromium touch emulation; no physical-device or independent novice validation",
        scientific_approval: "PENDING",
        independent_novice_validation: "NOT CONDUCTED",
      },
      null,
      2,
    ),
  );
  console.log(
    JSON.stringify({
      passed: results.filter((r) => r.status === "pass").length,
      failed: results.filter((r) => r.status === "fail").length,
    }),
  );
}
