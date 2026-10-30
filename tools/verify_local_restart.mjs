import {createEvidenceDirectory,evidenceFile,writeEvidenceFile,claimEvidenceFile} from './evidence-output.mjs';
const evidenceRun=await createEvidenceDirectory('verify_local_restart',process.env.SKYSHIFT_EVIDENCE_OUTPUT);
// Run after an actual local_server.py stop/start. Uses fresh test profiles.
import fs from "node:fs/promises";
import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
const { chromium } = await import(
  pathToFileURL(
    process.env.SKYSHIFT_PLAYWRIGHT_MODULE ||
      "C:/Users/LOQ/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs",
  )
);
const browser = await chromium.launch({
  headless: true,
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
});
const context = await browser.newContext({ acceptDownloads: true }),
  p = await context.newPage(),
  errors = [];
await context.route("**/*", (r) =>
  new URL(r.request().url()).hostname === "localhost" ||
  r.request().url().startsWith("blob:")
    ? r.continue()
    : r.abort(),
);
p.on("pageerror", (e) => errors.push(e.message));
const result = {
  recorded_at_utc: new Date().toISOString(),
  server: await (await fetch("http://localhost:3000/healthz")).json(),
  scope:
    "Fresh browser after actual project server restart; current and previous-version exports reopen. No claim of automatic private-note persistence across closed tabs.",
};
try {
  await p.goto("http://localhost:3000/#compare");
  await p.waitForFunction(
    () =>
      window.skyshiftWebsite?.diagnostics().investigation.kind === "pair" &&
      !skyshiftWebsite.diagnostics().investigation.busy,
  );
  result.reopened = [];
  for (const [file, kind, field] of [
    ["tmp/telescope-qa/question.json", "exposure", "m42"],
    ["tmp/telescope-qa/comparison.zip", "pair", "m101"],
    ["tmp/unified-qa/orion.json", "exposure", "m42"],
    ["tmp/unified-qa/comparison.zip", "pair", "m101"],
    ["tmp/website07-qa/orion.json", "exposure", "m42"],
    ["tmp/website07-qa/comparison.zip", "pair", "m101"],
  ]) {
    await p.setInputFiles("#instrument-file", file);
    await p.waitForFunction(
      ([k, f]) => {
        const v = skyshiftWebsite.diagnostics().investigation;
        return (
          v.kind === k && v.field === f && !v.busy && v.questions.length === 1
        );
      },
      [kind, field],
    );
    result.reopened.push({ file, kind, field, questions: 1 });
  }

  const event = p.waitForEvent("download");
  await p.click("#instrument-save");
  await (await event).saveAs(await claimEvidenceFile(evidenceFile(evidenceRun,"tmp/website07-restart-qa/comparison.zip")));
  assert.ok(
    (await fs.stat(evidenceFile(evidenceRun,"comparison.zip"))).size > 1000,
  );
  assert.deepEqual(errors, []);
  result.status = "pass";
  result.export_after_restart = "pass";
  console.log(
    "PASS actual restart: old and new exposure/comparison exports reopened and exported again",
  );
} catch (e) {
  result.status = "fail";
  result.error = e.message;
  process.exitCode = 1;
  console.error(e);
} finally {
  result.errors = errors;
  await browser.close();
  await writeEvidenceFile(evidenceFile(evidenceRun,"docs/evidence/website07_local_restart_tests.json"),
    JSON.stringify(result, null, 2),
  );
}
