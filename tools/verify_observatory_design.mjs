import {createEvidenceDirectory,evidenceFile,writeEvidenceFile,claimEvidenceFile} from './evidence-output.mjs';
const evidenceRun=await createEvidenceDirectory('verify_observatory_design',process.env.SKYSHIFT_EVIDENCE_OUTPUT);
// Read-only scientific checks plus actual browser interactions. No human review inferred.
import fs from "node:fs/promises";
import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
const { chromium } = await import(
  pathToFileURL(
    process.env.SKYSHIFT_PLAYWRIGHT_MODULE ||
      "C:/Users/LOQ/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs",
  )
);
const suffix = process.env.SKYSHIFT_TEST_SUFFIX || "chrome";
const out = evidenceRun,
  results = [],
  errors = [],
  external = [];

const browser = await chromium.launch({
  headless: true,
  executablePath:
    process.env.SKYSHIFT_CHROMIUM_EXECUTABLE ||
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
});
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  permissions: ["clipboard-read", "clipboard-write"],
});
await context.route("**/*", (r) => {
  const u = new URL(r.request().url());
  if (u.origin === "http://localhost:3000" || u.protocol === "blob:")
    return r.continue();
  external.push(u.href);
  return r.abort();
});
const p = await context.newPage();
p.on("pageerror", (e) => errors.push(e.message));
async function test(name, fn) {
  try {
    await fn();
    results.push({ name, status: "pass" });
    console.log("PASS " + name);
  } catch (e) {
    results.push({ name, status: "fail", error: e.message });
    throw e;
  }
}
async function science() {
  await p.waitForFunction(
    () =>
      window.skyshiftWebsite?.diagnostics().investigation.opened &&
      !window.skyshiftWebsite.diagnostics().investigation.busy,
  );
}
async function axe() {
  await p.evaluate(await fs.readFile("tools/vendor/axe.min.js", "utf8"));
  const violations = await p.evaluate(async () => {
    const r = await window.axe.run(document, {
      runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] },
    });
    return r.violations.map((v) => ({
      id: v.id,
      targets: v.nodes.map((n) => n.target),
    }));
  });
  assert.deepEqual(violations, []);
}
try {
  await p.goto("http://localhost:3000/");
  await p.waitForSelector(".field-card");
  await p.waitForFunction(
    () => window.skyshiftInfrared && document.getElementById("reduce-effects"),
  );
  await test("102 bars, silent first visit, keyboard resources and bounded boot", async () => {
    assert.equal(await p.locator(".hero-spectrum i").count(), 102);
    assert.equal(
      await p.locator(".header-launch").textContent(),
      "Compare dates",
    );
    assert.equal(
      await p.evaluate(() => skyshiftSound.diagnostics().enabled),
      false,
    );
    await p.waitForFunction(() => !document.querySelector(".boot-readout"));
    await p.locator("#site-more").focus();
    await p.keyboard.press("Enter");
    assert.equal(await p.locator("#resources-menu").isVisible(), true);
    await p.keyboard.press("Escape");
    assert.equal(
      await p
        .locator("#site-more")
        .evaluate((e) => e === document.activeElement),
      true,
    );
  });
  await test("Lens and effects preferences stay synchronized, including explicit sound opt-in", async () => {
    await p.click("#site-more");
    await p.locator("#reduce-effects").click();
    assert.equal(
      await p.evaluate(() => skyshiftInfrared.diagnostics().enabled),
      false,
    );
    await p.click("#site-sound");
    assert.equal(
      await p.evaluate(
        () =>
          JSON.parse(localStorage.getItem("skyshift.space.preferences.v1"))
            .effects,
      ),
      false,
    );
    await p.locator("#reduce-effects").focus();
    await p.keyboard.press("l");
    assert.equal(
      await p.locator("#reduce-effects").getAttribute("aria-pressed"),
      "false",
    );
    await p.mouse.move(600, 350);
    await p.waitForFunction(() => skyshiftInfrared.diagnostics().lens_active);
    await p.click("#site-sound");
  });
  await test("Search shortcut, source IDs and tap reveal retain original exposures", async () => {
    await p.keyboard.press("Control+k");
    assert.equal(
      await p
        .locator("#home-field-search")
        .evaluate((e) => e === document.activeElement),
      true,
    );
    await p.locator("#home-field-search").fill("M101");
    assert.equal(await p.locator(".field-card").count(), 1);
    assert.ok((await p.locator(".field-source-id").textContent()).length > 20);
    await p.locator(".field-reveal-toggle").click();
    assert.equal(
      await p.locator(".field-reveal-toggle").getAttribute("aria-pressed"),
      "true",
    );
    await p.locator("#home-field-search").fill("");
  });
  await test("Vela original-image reveal, published color ranges and accessible legend", async () => {
    await p.locator("#infrared-story-heading").scrollIntoViewIfNeeded();
    await p.locator("#vela-reveal").fill("75");
    assert.equal(await p.locator("#vela-reveal-value").textContent(), "75%");
    await p.locator("#vela-reveal").focus();
    await p.keyboard.press("ArrowRight");
    assert.equal(await p.locator("#vela-reveal-value").textContent(), "76%");
    await p.click("#infrared-legend-button");
    assert.equal(await p.locator("#infrared-legend").isVisible(), true);
    assert.equal(await p.locator(".spectral-swatches>span").count(), 3);
    await p.screenshot({ path: await claimEvidenceFile(evidenceFile(evidenceRun,out + "/vela.png" ))});
    await axe();
  });
  await test("Lazy model exposes actual projected component hotspots", async () => {
    assert.equal(
      (await p.evaluate(() => skyshiftWebsite.diagnostics())).model,
      null,
    );
    await p.click("#activate-mission-model");
    await p.waitForFunction(
      () => skyshiftWebsite.diagnostics().model?.frames > 0,
    );
    assert.equal(await p.locator("[data-model-hotspot]").count(), 5);
    const chip = p.locator("[data-website-component]").nth(2);
    await chip.click();
    assert.equal(await chip.getAttribute("aria-pressed"), "true");
    const before = await p.evaluate(
      () => skyshiftWebsite.diagnostics().model.camera,
    );
    await p.waitForTimeout(850);
    assert.notDeepEqual(
      await p.evaluate(() => skyshiftWebsite.diagnostics().model.camera),
      before,
    );
    const stopped = await p.evaluate(
      () => skyshiftWebsite.diagnostics().model.frames,
    );
    await p.waitForTimeout(200);
    assert.equal(
      await p.evaluate(() => skyshiftWebsite.diagnostics().model.frames),
      stopped,
      "Component flight must return to demand rendering",
    );
    await p.waitForTimeout(1250);
    await p.evaluate(() => {
      const r = document
        .getElementById("mission-section")
        .getBoundingClientRect();
      window.scrollTo({
        top: scrollY + r.top + r.height * 0.3,
        behavior: "instant",
      });
    });
    await p.waitForFunction(
      (previous) => skyshiftWebsite.diagnostics().model.selected !== previous,
      await chip.getAttribute("data-website-component"),
    );
    await p.screenshot({ path: await claimEvidenceFile(evidenceFile(evidenceRun,out + "/spacecraft.png" ))});
  });
  await test("Exact evidence checksum copy and keyboard comparison wipe", async () => {
    await p.goto("http://localhost:3000/#compare");
    await science();
    await p.click("#instrument-evidence");
    assert.equal(await p.locator(".evidence-record").count(), 2);
    const hash = await p.locator(".evidence-record code").first().textContent();
    assert.match(hash, /^[a-f0-9]{64}$/);
    await p.locator(".evidence-record button").first().click();
    assert.equal(await p.evaluate(() => navigator.clipboard.readText()), hash);
    await axe();
    await p.screenshot({ path: await claimEvidenceFile(evidenceFile(evidenceRun,out + "/evidence.png" ))});
    await p.click("#instrument-panel-close");
    await p.click('[data-compare="wipe"]');
    await p.locator("#instrument-wipe").focus();
    await p.keyboard.press("ArrowRight");
    assert.equal(await p.locator("#instrument-wipe").inputValue(), "51");
  });
  await test("Responsive home font floor, navigation, no horizontal overflow and reduced-motion recovery", async () => {
    await p.emulateMedia({ reducedMotion: "reduce" });
    for (const width of [320, 390, 768, 1024, 1440, 1920]) {
      await p.setViewportSize({ width, height: 1000 });
      await p.goto("http://localhost:3000/");
      await p.waitForSelector(".field-card");
      await p.evaluate(() => document.fonts.ready);
      assert.equal(
        await p.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        true,
      );
      const tooSmall = await p.evaluate(() =>
        [...document.querySelectorAll("body *")]
          .filter(
            (e) =>
              [...e.childNodes].some(
                (n) => n.nodeType === 3 && n.textContent.trim(),
              ) &&
              e.getClientRects().length &&
              getComputedStyle(e).visibility !== "hidden" &&
              parseFloat(getComputedStyle(e).fontSize) < 12,
          )
          .map((e) => ({
            text: e.textContent.trim().slice(0, 60),
            size: getComputedStyle(e).fontSize,
          })),
      );
      assert.deepEqual(tooSmall, [], String(width));
      assert.equal(await p.locator("#infrared-lens").isVisible(), false);
      await axe();
      if ([390, 1440, 1920].includes(width)) {
        await p.waitForFunction(
          () => skyshiftHero.diagnostics().model?.frames > 0,
        );
        await p.screenshot({ path: await claimEvidenceFile(evidenceFile(evidenceRun,out + "/home-" + width + ".png" ))});
      }
    }
  });
  assert.deepEqual(errors, []);
  assert.deepEqual(external, []);
} catch (e) {
  console.error(e.stack);
  process.exitCode = 1;
  await p.screenshot({ path: await claimEvidenceFile(evidenceFile(evidenceRun,out + "/failure.png" ))}).catch(() => {});
} finally {
  await writeEvidenceFile(evidenceFile(evidenceRun,"docs/evidence/observatory_design_tests_" + suffix + ".json"),
    JSON.stringify(
      {
        recorded_at_utc: new Date().toISOString(),
        browser: browser.version(),
        results,
        page_errors: errors,
        external_requests: external,
        limits: [
          "Automated browser evaluation only; user remains sole human UX evaluator.",
          "Qualified scientific approval and internal human review PENDING. Independent novice validation NOT CONDUCTED.",
          "Emulated viewport sizes do not certify physical-device performance.",
        ],
      },
      null,
      2,
    ) + "\n",
  );
  await browser.close();
}
