import {createEvidenceDirectory,evidenceFile,writeEvidenceFile} from './evidence-output.mjs';
const evidenceRun=await createEvidenceDirectory('verify_mission_accessibility',process.env.SKYSHIFT_EVIDENCE_OUTPUT);
// Lighthouse is a development dependency, never shipped to the visitor.
// Supply the installed Lighthouse package directory as the first argument.
import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
const root = process.argv[2];
if (!root) throw Error("Provide an installed Lighthouse package directory.");
const { default: lighthouse } = await import(
  pathToFileURL(path.join(root, "core/index.js"))
);
const { launch } = await import(
  pathToFileURL(path.join(root, "../chrome-launcher/dist/index.js"))
);
const chrome = await launch({
  chromePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  chromeFlags: ["--headless=new"],
});
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
const results = [];
try {
  for (const [name, route] of routes) {
    const { lhr } = await lighthouse("http://localhost:3000" + route, {
      port: chrome.port,
      onlyCategories: ["accessibility"],
      logLevel: "error",
    });
    const failures = Object.entries(lhr.audits)
      .filter(([, a]) => a.score === 0)
      .map(([id, a]) => ({ id, title: a.title, details: a.details }));
    const score = lhr.categories.accessibility.score * 100;
    results.push({
      page: name,
      route,
      score,
      unresolved_automated_audits: failures,
      lighthouse_version: lhr.lighthouseVersion,
    });
    await writeEvidenceFile(evidenceFile(evidenceRun,`tmp/mission-control/lighthouse-${name}.json`),
      JSON.stringify(lhr) + "\n",
    );
    console.log(
      `${name}: ${score}/100; ${failures.length} failing automated audits`,
    );
  }
  await writeEvidenceFile(evidenceFile(evidenceRun,"docs/evidence/mission_control_lighthouse.json"),
    JSON.stringify(
      {
        recorded_at_utc: new Date().toISOString(),
        scope:
          "Actual local Chrome, Lighthouse mobile accessibility category; no physical-device or manual accessibility certification inferred.",
        results,
      },
      null,
      2,
    ) + "\n",
  );
  assert.ok(
    results.every((r) => r.score >= 95),
    "Every requested page must score at least 95.",
  );
} finally {
  await chrome.kill();
}
