// Run after restarting tools/local_server.py. Reopens files exported by the
// telescope journey suite from a completely new browser context.
import fs from "node:fs/promises";
import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
const { chromium } = await import(
  pathToFileURL(
    process.env.SKYSHIFT_PLAYWRIGHT_MODULE ||
      "C:/Users/LOQ/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs",
  ).href
);
const b = await chromium.launch({
  headless: true,
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
});
const c = await b.newContext({ acceptDownloads: true }),
  p = await c.newPage(),
  errors = [];
await c.route("**/*", (r) => {
  const u = new URL(r.request().url());
  return u.hostname === "localhost" || u.protocol === "blob:"
    ? r.continue()
    : r.abort();
});
p.on("pageerror", (e) => errors.push(e.message));
const result = {
  date_utc: new Date().toISOString(),
  server: await (await fetch("http://localhost:3000/healthz")).json(),
  scope:
    "Fresh browser after actual project server stop/start; imported existing exported records, no claim of automatic private-note persistence across closed tabs",
};
try {
  await p.goto("http://localhost:3000");
  await p.waitForFunction(
    () => window.skyshiftSpace?.diagnostics().loaded_telescopes?.length === 3,
  );
  await p.locator("#observations-button").click();
  const f = p.frameLocator("#science-frame");
  await f.locator("#explorer[aria-busy=false]").waitFor();
  await f
    .locator("#import-context-file")
    .setInputFiles("tmp/telescope-qa/question.json");
  await f
    .locator("#view-record-feedback")
    .filter({ hasText: "restored" })
    .waitFor();
  assert.equal(await f.locator("#exposure-question-count").innerText(), "1");
  await p.locator("#back-to-universe").click();
  await p.locator("[data-telescope=spherex]").click();
  await p.locator('[data-observe-stage="2"]').click();
  await p.locator("[data-mission-field=m101]").click();
  await p.locator("#mission-field-open").click();
  await f.locator("#explorer[aria-busy=false]").waitFor();
  await f.locator("#compare-link").click();
  await f.locator("#workspace").waitFor();
  await f
    .locator("#import-file")
    .setInputFiles("tmp/telescope-qa/comparison.zip");
  await f.locator("#note-count").filter({ hasText: "1" }).waitFor();
  assert.match(await f.locator("#notes").innerText(), /edited lens note/);
  await fs.mkdir("tmp/restart-qa", { recursive: true });
  const event = p.waitForEvent("download");
  await f.locator("#export").click();
  await (await event).saveAs("tmp/restart-qa/comparison.zip");
  assert.ok((await fs.stat("tmp/restart-qa/comparison.zip")).size > 1000);
  assert.deepEqual(errors, []);
  result.status = "pass";
  result.verified = [
    "all three telescope models loaded",
    "saved exposure question reconstructed",
    "saved comparison note reconstructed",
    "comparison evidence exported again",
  ];
  console.log(
    "PASS restarted local application: models, saved records, comparison evidence",
  );
} catch (e) {
  result.status = "fail";
  result.error = e.message;
  process.exitCode = 1;
  console.error(e);
} finally {
  result.errors = errors;
  await b.close();
  await fs.writeFile(
    "docs/evidence/local_restart_tests.json",
    JSON.stringify(result, null, 2) + "\n",
  );
}
