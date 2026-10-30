import {createEvidenceDirectory,evidenceFile,writeEvidenceFile,claimEvidenceFile} from './evidence-output.mjs';
const evidenceRun=await createEvidenceDirectory('verify_website_recovery',process.env.SKYSHIFT_EVIDENCE_OUTPUT);
import fs from "node:fs/promises";
import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
const { chromium } = await import(
  pathToFileURL(
    process.env.SKYSHIFT_PLAYWRIGHT_MODULE ||
      "C:/Users/LOQ/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs",
  )
);
const b = await chromium.launch({
    headless: true,
    executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  }),
  results = [];
async function page() {
  const c = await b.newContext({
    viewport: { width: 1366, height: 900 },
    acceptDownloads: true,
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
async function loaded(p) {
  await p.waitForFunction(
    () =>
      window.skyshiftWebsite?.diagnostics().investigation.kind === "pair" &&
      !skyshiftWebsite.diagnostics().investigation.busy,
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
    "Missing website controller exposes independent scientific tools",
    async () => {
      const { c, p } = await page();
      try {
        await p.route("**/website.js", (r) => r.abort());
        await p.goto("http://localhost:3000/");
        await p.waitForFunction(
          () => document.body.dataset.controller === "failed",
        );
        assert.equal(await p.locator("#site-error a").count(), 2);
        await p.locator("#site-error a").first().click();
        await p.locator("#explorer[aria-busy=false]").waitFor();
      } finally {
        await c.close();
      }
    },
  );
  await check(
    "Leaving delayed 3D entry never initializes hidden rendering or steals the science view",
    async () => {
      const { c, p } = await page();
      let release;
      try {
        const gate = new Promise((r) => (release = r));
        await p.route("**/universe-shell.html", async (r) => {
          await gate;
          r.continue();
        });
        await p.goto("http://localhost:3000/");
        await p.click(".site-navigation a[data-route=universe]");
        await p.locator("#universe-loading").waitFor({ state: "visible" });
        await p.locator("#universe-loading a").click();
        await p.waitForFunction(
          () =>
            skyshiftWebsite.diagnostics().investigation.opened &&
            !skyshiftWebsite.diagnostics().investigation.busy,
        );
        release();
        await p.waitForTimeout(300);
        assert.equal(
          (await p.evaluate(() => skyshiftWebsite.diagnostics()))
            .universe_loaded,
          false,
        );
        assert.equal(
          (await p.evaluate(() => skyshiftWebsite.diagnostics())).surface,
          "science",
        );
        await p.click(".site-navigation a[data-route=universe]");
        await p.waitForFunction(
          () => window.skyshiftSpace?.diagnostics().frames > 0,
        );
      } finally {
        release?.();
        await c.close();
      }
    },
  );
  await check(
    "A missing optional universe module leaves direct comparison fully usable",
    async () => {
      const { c, p } = await page();
      try {
        await p.route("**/immersive.js", (r) => r.abort());
        await p.goto("http://localhost:3000/#universe");
        await p
          .locator("#site-error")
          .filter({ hasText: "observation tools remain available" })
          .waitFor();
        await p.click(".site-navigation a[data-route=compare]");
        await loaded(p);
        await p.click("#instrument-zoom-in");
        assert.equal(
          (await p.evaluate(() => skyshiftWebsite.diagnostics())).investigation
            .display.zoom,
          1.25,
        );
      } finally {
        await c.close();
      }
    },
  );
  await check(
    "Actual small-model graphics-context loss recovers using a fresh canvas",
    async () => {
      const { c, p } = await page();
      try {
        await p.goto("http://localhost:3000/#mission");
        await p.waitForFunction(
          () => document.body.dataset.controller === "ready",
        );
        await p.click("#activate-mission-model");
        await p
          .waitForFunction(
            () => skyshiftWebsite.diagnostics().model?.frames > 0,
          )
          .catch(async (error) => {
            console.error(
              await p.evaluate(() => ({
                diagnostics: skyshiftWebsite.diagnostics(),
                status: document.getElementById("mission-model-status")
                  .textContent,
                hidden: document.hidden,
                rect: document
                  .getElementById("mission-section")
                  .getBoundingClientRect()
                  .toJSON(),
              })),
            );
            await p.screenshot({
              path: await claimEvidenceFile(evidenceFile(evidenceRun,"tmp/website07-qa/recovery-model-failure.png")),
            });
            throw error;
          });
        await p.evaluate(() => {
          window.qaModelCanvas = document.getElementById(
            "mission-model-canvas",
          );
          qaModelCanvas
            .getContext("webgl2")
            .getExtension("WEBGL_lose_context")
            .loseContext();
        });
        await p.locator("#mission-model-start").waitFor({ state: "visible" });
        await p.click("#activate-mission-model");
        await p.waitForFunction(
          () => skyshiftWebsite.diagnostics().model?.frames > 0,
        );
        assert.equal(
          await p.evaluate(
            () =>
              qaModelCanvas !== document.getElementById("mission-model-canvas"),
          ),
          true,
        );
        await p.click(".site-navigation a[data-route=compare]");
        await loaded(p);
      } finally {
        await c.close();
      }
    },
  );
  await check(
    "Universe context loss and renderer retry preserve the existing scientific canvas and viewport",
    async () => {
      const { c, p } = await page();
      try {
        await p.goto("http://localhost:3000/#compare");
        await loaded(p);
        await p.click("#instrument-zoom-in");
        const before = await p.evaluate(() => {
          window.qaScience = document.getElementById("instrument-canvas-a");
          return skyshiftWebsite.diagnostics().investigation.display;
        });
        await p.click(".site-navigation a[data-route=universe]");
        await p.waitForFunction(
          () => window.skyshiftSpace?.diagnostics().frames > 0,
        );
        await p.evaluate(() =>
          document
            .getElementById("universe")
            .getContext("webgl2")
            .getExtension("WEBGL_lose_context")
            .loseContext(),
        );
        await p.waitForFunction(
          () => skyshiftSpace.diagnostics().webgl === "lost",
        );
        await p.click("#retry-renderer");
        await p.waitForFunction(
          () =>
            skyshiftSpace.diagnostics().webgl === "ready" &&
            skyshiftSpace.diagnostics().frames > 0,
        );
        await p.click(".site-navigation a[data-route=compare]");
        await loaded(p);
        assert.deepEqual(
          (await p.evaluate(() => skyshiftWebsite.diagnostics())).investigation
            .display,
          before,
        );
        assert.equal(
          await p.evaluate(
            () => qaScience === document.getElementById("instrument-canvas-a"),
          ),
          true,
        );
      } finally {
        await c.close();
      }
    },
  );
  await check(
    "Unavailable browser storage does not block science or evidence downloads",
    async () => {
      const { c, p } = await page();
      try {
        await c.addInitScript(() => {
          Storage.prototype.getItem = () => {
            throw Error("storage denied");
          };
          Storage.prototype.setItem = () => {
            throw Error("storage denied");
          };
        });
        await p.goto("http://localhost:3000/#compare");
        await loaded(p);
        const event = p.waitForEvent("download");
        await p.click("#instrument-save");
        const download = await event;
        assert.ok((await fs.stat(await download.path())).size > 1000);
      } finally {
        await c.close();
      }
    },
  );
  await check(
    "Corrupt local catalogue accepts no data and offers a working comparison retry",
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
        await p.goto("http://localhost:3000/#compare");
        await p.locator("#instrument-retry").waitFor({ state: "visible" });
        assert.equal(
          (await p.evaluate(() => skyshiftWebsite.diagnostics())).investigation
            .kind,
          undefined,
        );
        await p.unroute("**/data/explore-catalog.json");
        await p.click("#instrument-retry");
        await loaded(p);
      } finally {
        await c.close();
      }
    },
  );
} catch (e) {
  console.error(e);
  process.exitCode = 1;
} finally {
  await writeEvidenceFile(evidenceFile(evidenceRun,"docs/evidence/"+(process.env.SKYSHIFT_TEST_NAME||"website07")+"_recovery_tests.json"),
    JSON.stringify(
      {
        recorded_at_utc: new Date().toISOString(),
        browser: await b.version(),
        profile: "isolated",
        failures_are_explicitly_injected: true,
        results,
      },
      null,
      2,
    ),
  );
  await b.close();
}
