import {createEvidenceDirectory,evidenceFile,writeEvidenceFile,claimEvidenceFile} from './evidence-output.mjs';
const evidenceRun=await createEvidenceDirectory('verify_mission_control',process.env.SKYSHIFT_EVIDENCE_OUTPUT);
// Real browser checks; neither independent human review nor public publication.
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
  out = evidenceRun;

const browser = await chromium.launch({
  headless: true,
  executablePath:
    process.env.SKYSHIFT_CHROMIUM_EXECUTABLE ||
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
});
const c = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  reducedMotion: "reduce",
  acceptDownloads: true,
  permissions: ["clipboard-read", "clipboard-write"],
});
const external = [],
  errors = [],
  results = [],
  failed = [];
await c.route("**/*", (r) => {
  const u = new URL(r.request().url());
  if (u.origin === "http://localhost:3000" || u.protocol === "blob:")
    return r.continue();
  external.push(u.href);
  return r.abort();
});
const p = await c.newPage();
p.setDefaultTimeout(18000);
p.on("pageerror", (e) => errors.push(e.message));
const routes = [
  ["home", "/"],
  ["explore", "/explore.html"],
  ["comparison-document", "/compare.html"],
  ["discover", "/discover.html"],
  ["methodology", "/methodology.html"],
  ["guide", "/guide.html"],
  ["introduction", "/classic-home.html"],
  ["observations", "/#observations/m42"],
  ["compare", "/#compare"],
  ["mission", "/#mission"],
  ["universe", "/#universe"],
];
async function check(name, fn) {
  try {
    const detail = await fn();
    results.push({ name, status: "pass", detail });
    console.log("PASS " + name);
  } catch (e) {
    results.push({ name, status: "fail", error: e.message });
    failed.push(name);
    console.error("FAIL " + name + ": " + e.message);
  }
}
async function native() {
  await p.waitForFunction(
    () =>
      window.skyshiftWebsite?.diagnostics().investigation.opened &&
      !window.skyshiftWebsite.diagnostics().investigation.busy,
  );
}
async function axe() {
  await p.evaluate(await fs.readFile("tools/vendor/axe.min.js", "utf8"));
  return p.evaluate(async () => {
    const r = await window.axe.run(document, {
      runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] },
    });
    return r.violations.map((v) => ({
      id: v.id,
      targets: v.nodes.map((n) => n.target),
    }));
  });
}
try {
  for (const width of [390, 768, 1440]) {
    await p.setViewportSize({ width, height: 1000 });
    for (const [name, route] of routes)
      await check(`${name} / ${width}px`, async () => {
        await p.goto("http://localhost:3000" + route);
        await p.evaluate(() => document.fonts.ready);
        if (name === "home") {
          await p.waitForFunction(
            () => window.skyshiftHero?.diagnostics().model?.frames > 0,
          );
          await p.waitForSelector(".field-card");
        }
        if (name === "explore")
          await p.waitForSelector("#explore-content:not([hidden])");
        if (name === "comparison-document")
          await p.waitForSelector("#workspace:not([hidden])");
        if (["observations", "compare"].includes(name)) {
          await native();
          await p.evaluate(() => document.fonts.ready);
        }
        if (name === "universe")
          await p.waitForFunction(
            () => window.skyshiftSpace?.diagnostics().frames > 0,
          );
        if (name === "mission")
          await p.locator("#mission-heading").scrollIntoViewIfNeeded();
        const audit = await p.evaluate(() => {
          const under = [],
            legacy = [],
            clipped = [];
          for (const e of document.querySelectorAll("body *")) {
            if (
              !e.getClientRects().length ||
              getComputedStyle(e).visibility === "hidden" ||
              e.closest('[aria-hidden="true"],.sr-only,.visually-hidden')
            )
              continue;
            const s = getComputedStyle(e),
              r = e.getBoundingClientRect();
            if (
              [...e.childNodes].some(
                (n) => n.nodeType === 3 && n.textContent.trim(),
              ) &&
              Number.parseFloat(s.fontSize) < 12
            )
              under.push({
                id: e.id,
                tag: e.tagName,
                text: e.textContent.trim().slice(0, 60),
                size: s.fontSize,
              });
            if (
              /Manrope|Source Sans|Outfit|Grotesk|Segoe|Consolas/.test(
                s.fontFamily,
              )
            )
              legacy.push({ id: e.id, font: s.fontFamily });
            if (
              e.matches("button,input:not([type=file]),select,textarea") &&
              !e.disabled &&
              r.width > 1 &&
              r.height > 1 &&
              (r.width < 43 || r.height < 43)
            )
              clipped.push({ id: e.id, width: r.width, height: r.height });
          }
          const overflowNodes = [...document.querySelectorAll("body *")]
            .filter(
              (e) =>
                e.getClientRects().length &&
                e.getBoundingClientRect().right > innerWidth + 1 &&
                getComputedStyle(e).visibility !== "hidden",
            )
            .slice(0, 12)
            .map((e) => ({
              id: e.id,
              tag: e.tagName,
              classes: typeof e.className === "string" ? e.className : "svg",
              right: e.getBoundingClientRect().right,
            }));
          return {
            under,
            legacy,
            clipped,
            overflow: document.documentElement.scrollWidth > innerWidth,
            overflowNodes,
            headers: document.querySelectorAll(".site-header").length,
            footers: document.querySelectorAll(".site-footer").length,
            background: getComputedStyle(document.body).backgroundColor,
          };
        });
        await p.screenshot({ path: await claimEvidenceFile(evidenceFile(evidenceRun,`${out}/${name}-${width}.png` ))});
        assert.equal(
          audit.overflow,
          false,
          "Horizontal overflow " + JSON.stringify(audit.overflowNodes),
        );
        assert.equal(audit.headers, 1);
        assert.equal(audit.footers, 1);
        assert.equal(audit.background, "rgb(0, 0, 0)");
        assert.deepEqual(audit.under, [], "Text under 12px");
        assert.deepEqual(audit.legacy, [], "Retired font");
        assert.deepEqual(audit.clipped, [], "Controls smaller than 44px");
        const violations = await axe();
        assert.deepEqual(violations, [], "WCAG rules");
        return {
          viewport: [width, 1000],
          ...audit,
          axe_violations: violations,
        };
      });
  }
  await p.setViewportSize({ width: 1440, height: 1000 });
  await p.goto("http://localhost:3000/#compare");
  await native();
  await check(
    "New native comparison defaults to wipe/nearest, with keyboard divider and checksum copying",
    async () => {
      assert.equal(
        await p.locator("[data-compare=wipe]").getAttribute("aria-pressed"),
        "true",
      );
      assert.equal(
        (
          await p.evaluate(
            () => skyshiftWebsite.diagnostics().investigation.visual,
          )
        ).interpolation,
        "nearest",
      );
      await p.locator("#instrument-wipe-handle").focus();
      await p.keyboard.press("ArrowRight");
      assert.equal(await p.locator("#instrument-wipe").inputValue(), "51");
      await p.click("#instrument-evidence");
      const hash = await p
        .locator(".evidence-record code")
        .first()
        .textContent();
      await p.locator(".evidence-record button").first().click();
      assert.equal(
        await p.evaluate(() => navigator.clipboard.readText()),
        hash,
      );
      await p.click("#instrument-panel-close");
    },
  );
  await check(
    "Native comparison export/reopen preserves actual viewport and wipe settings",
    async () => {
      await p.click("#instrument-zoom-in");
      const before = await p.evaluate(
        () => skyshiftWebsite.diagnostics().investigation,
      );
      const pending = p.waitForEvent("download");
      await p.click("#instrument-save");
      const file = await pending;
      await file.saveAs(await claimEvidenceFile(evidenceFile(evidenceRun,out + "/comparison.zip")));
      await p.click("#instrument-fit");
      await p
        .locator("#instrument-file")
        .setInputFiles(out + "/comparison.zip");
      await native();
      const after = await p.evaluate(
        () => skyshiftWebsite.diagnostics().investigation,
      );
      assert.deepEqual(after.display, before.display);
      assert.deepEqual(after.visual, before.visual);
    },
  );
  await check(
    "Shared mobile navigation and resources remain keyboard accessible",
    async () => {
      await p.setViewportSize({ width: 390, height: 1000 });
      await p.goto("http://localhost:3000/guide.html");
      await p.click("#site-menu-toggle");
      assert.equal(
        await p.locator("#site-menu-toggle").getAttribute("aria-expanded"),
        "true",
      );
      await p.keyboard.press("Escape");
      assert.equal(
        await p.locator("#site-menu-toggle").getAttribute("aria-expanded"),
        "false",
      );
      await p.click("#site-more");
      await p.click("#resources-information");
      await p.locator("#site-information[open]").waitFor();
      assert.deepEqual(await axe(), []);
      await p.keyboard.press("Escape");
    },
  );
  await check(
    "Native science works when WebGL is unavailable and optional sound fails",
    async () => {
      const isolated = await browser.newContext({
        viewport: { width: 1440, height: 1000 },
      });
      await isolated.addInitScript(() => {
        const get = HTMLCanvasElement.prototype.getContext;
        HTMLCanvasElement.prototype.getContext = function (kind, ...rest) {
          return /webgl/.test(kind) ? null : get.call(this, kind, ...rest);
        };
      });
      await isolated.route("**/application-sound.js", (r) => r.abort());
      const q = await isolated.newPage();
      await q.goto("http://localhost:3000/#compare");
      await q.waitForFunction(
        () =>
          window.skyshiftWebsite?.diagnostics().investigation.opened &&
          !window.skyshiftWebsite.diagnostics().investigation.busy,
      );
      assert.equal(await q.locator("#instrument-canvas-a").isVisible(), true);
      await isolated.close();
    },
  );
  assert.deepEqual(errors, [], "Page errors");
  assert.deepEqual(external, [], "Runtime external requests");
} catch (e) {
  failed.push("suite");
  console.error(e.stack);
} finally {
  await writeEvidenceFile(evidenceFile(evidenceRun,"docs/evidence/mission_control_tests_" + suffix + ".json"),
    JSON.stringify(
      {
        recorded_at_utc: new Date().toISOString(),
        browser: browser.version(),
        results,
        page_errors: errors,
        external_requests: external,
        limits: [
          "Local isolated browser; emulated viewports, not physical-device certification.",
          "Qualified scientific approval and internal human review PENDING; independent novice validation NOT CONDUCTED.",
          "Public Netlify publication is not inferred from local verification.",
        ],
      },
      null,
      2,
    ) + "\n",
  );
  await browser.close();
  if (failed.length) process.exitCode = 1;
}
