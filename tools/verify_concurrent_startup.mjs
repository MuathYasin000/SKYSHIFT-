import { pathToFileURL } from "node:url";
import fs from "node:fs/promises";
import assert from "node:assert/strict";
const { chromium } = await import(
  pathToFileURL(
    process.env.SKYSHIFT_PLAYWRIGHT_MODULE ||
      "C:/Users/LOQ/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs",
  ).href
);
const executables = [
  ["Installed Chrome", "C:/Program Files/Google/Chrome/Application/chrome.exe"],
  [
    "Microsoft Edge",
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  ],
];
const results = [];
async function startup([name, executablePath], trial) {
  const browser = await chromium.launch({ executablePath, headless: true });
  const context = await browser.newContext({
    viewport: { width: 1366, height: 768 },
  });
  const page = await context.newPage(),
    errors = [],
    failed = [];
  const start = performance.now();
  try {
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => {
      if (m.type() === "error") errors.push(m.text());
    });
    page.on("requestfailed", (r) =>
      failed.push({ url: r.url(), failure: r.failure() }),
    );
    await context.route("**/*", (route) => {
      const url = new URL(route.request().url());
      return url.hostname === "localhost" || url.protocol === "blob:"
        ? route.continue()
        : route.abort();
    });
    await page.goto("http://localhost:3000");
    await page.waitForFunction(
      () =>
        window.skyshiftSpace
          ?.diagnostics()
          .loaded_telescopes?.includes("spherex") &&
        skyshiftSpace.diagnostics().frames > 2,
      null,
      { timeout: 20000 },
    );
    await page.locator("#observations-button").click();
    await page.waitForFunction(
      () =>
        window.skyshiftSpace?.investigation().kind === "exposure" &&
        !skyshiftSpace.investigation().busy,
    );
    await page.locator("#settings-button").click();
    await page.locator("#settings-dialog [data-close-dialog]").click();
    assert.deepEqual(errors, []);
    assert.deepEqual(failed, []);
    return {
      name,
      version: browser.version(),
      trial,
      status: "pass",
      spherex_science_and_input_ready_ms: performance.now() - start,
      errors,
      failed,
    };
  } catch (e) {
    return {
      name,
      version: browser.version(),
      trial,
      status: "fail",
      error: e.message,
      errors,
      failed,
    };
  } finally {
    await browser.close();
  }
}
for (let trial = 0; trial < 3; trial++) {
  const round = await Promise.all(executables.map((b) => startup(b, trial)));
  results.push(...round);
  for (const r of round)
    console.log(r.status.toUpperCase() + " " + r.name + " trial " + trial);
}
await fs.writeFile(
  "docs/evidence/unified_concurrent_startup_tests.json",
  JSON.stringify(
    {
      date_utc: new Date().toISOString(),
      server: await (await fetch("http://localhost:3000/healthz")).json(),
      results,
      user_session:
        "Fresh-profile checks of 0.6; no claim of verification in the user session",
      scope:
        "Two browsers concurrently per trial, three trials; SPHEREx rendered, native science loaded and settings opened, no external requests required",
    },
    null,
    2,
  ) + "\n",
);
if (results.some((r) => r.status !== "pass")) process.exitCode = 1;
