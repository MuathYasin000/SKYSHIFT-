// Verify static SKYSHIFT on HTTPS or a loopback staging server; no auth bypass.
import fs from "node:fs/promises";
import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import { createHash } from "node:crypto";
const base = process.argv[2];
if (!base)
  throw Error("Provide the deployed HTTPS URL or loopback staging URL");
const address = new URL(base);
if (
  address.protocol !== "https:" &&
  !(
    address.protocol === "http:" &&
    ["localhost", "127.0.0.1"].includes(address.hostname)
  )
)
  throw Error("Remote verification requires HTTPS");
const recordName = process.env.SKYSHIFT_TEST_NAME || "public_workspace";
const origin = new URL(base).origin,
  out = "tmp/" + recordName + "-qa",
  results = [],
  errors = [],
  requests = [];
const { chromium } = await import(
  pathToFileURL(
    "C:/Users/LOQ/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs",
  )
);
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({
    headless: true,
    executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  }),
  context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    acceptDownloads: true,
  }),
  page = await context.newPage();
page.setDefaultTimeout(45000);
page.on("pageerror", (e) => errors.push(e.message));
page.on("request", (r) => requests.push({ method: r.method(), url: r.url() }));
async function check(name, f) {
  try {
    const detail = await f();
    results.push({ name, status: "pass", detail });
    console.log("PASS " + name);
  } catch (e) {
    results.push({ name, status: "fail", error: e.message });
    throw e;
  }
}
async function science() {
  await page.waitForFunction(
    () =>
      window.skyshiftWebsite?.diagnostics().investigation.kind === "pair" &&
      !skyshiftWebsite.diagnostics().investigation.busy,
  );
}
try {
  await check(
    "Static visitor reaches the current orbital hero and real 3D spacecraft without a login",
    async () => {
      const response = await page.goto(origin + "/");
      assert.equal(response.status(), 200);
      await page.waitForFunction(
        () =>
          window.skyshiftSound &&
          window.skyshiftHero?.diagnostics().model?.frames > 0,
      );
      assert.equal(await page.locator(".mission-launch").count(), 1);
      assert.equal(
        (await page.evaluate(() => skyshiftSound.diagnostics())).enabled,
        false,
      );
      const r = await page.request.get(origin + "/release.json");
      assert.equal(r.status(), 200);
      const release = await r.json();
      assert.equal(
        release.release_id,
        process.env.SKYSHIFT_EXPECTED_RELEASE || "skyshift-0.8-seeing-invisible",
      );
      await page.screenshot({ path: out + "/public-home.png" });
      return {
        release_id: release.release_id,
        content_id: release.content_id,
        requires_login: false,
      };
    },
  );
  await check(
    "Static scientific bundle, FITS and complete review parts match the exact local source hashes",
    async () => {
      const catalogue = JSON.parse(
        await fs.readFile("web/dist/data/catalog.json", "utf8"),
      );
      const bundleResponse = await page.request.get(
        new URL(catalogue.bundle_url, origin + "/").href,
      );
      assert.equal(bundleResponse.status(), 200);
      const bytes = await bundleResponse.body();
      assert.equal(
        createHash("sha256").update(bytes).digest("hex"),
        catalogue.bundle_sha256,
      );
      const bundle = JSON.parse(bytes.toString("utf8")),
        targets = [
          {
            url: bundle.prepared_fits_url,
            sha256: bundle.manifest.prepared_files[0].sha256,
          },
          ...catalogue.review_packet.parts,
        ];
      const checks = [];
      for (const t of targets) {
        const r = await page.request.get(new URL(t.url, origin + "/").href);
        assert.equal(r.status(), 200);
        const bytes = await r.body();
        const hash = createHash("sha256").update(bytes).digest("hex");
        assert.equal(hash, t.sha256);
        checks.push({ url: t.url, sha256: hash, bytes: bytes.length });
      }
      return {
        bundle_sha256: catalogue.bundle_sha256,
        files: checks,
        scientific_approval: bundle.manifest.processing.scientific_approval,
      };
    },
  );
  await check(
    "Hero launches real comparison; static export and reopening preserve a changed viewport",
    async () => {
      await page.locator(".mission-launch").click();
      await science();
      assert.match(
        await page.locator("#instrument-suitability").innerText(),
        /PENDING/,
      );
      await page.click("#instrument-zoom-in");
      const zoom = await page.evaluate(
        () => skyshiftWebsite.diagnostics().investigation.display.zoom,
      );
      const event = page.waitForEvent("download");
      await page.click("#instrument-save");
      await (await event).saveAs(out + "/public-comparison.zip");
      await page.click("#instrument-fit");
      assert.notEqual(
        await page.evaluate(
          () => skyshiftWebsite.diagnostics().investigation.display.zoom,
        ),
        zoom,
      );
      await page.setInputFiles(
        "#instrument-file",
        out + "/public-comparison.zip",
      );
      await page.waitForFunction(
        (z) =>
          !skyshiftWebsite.diagnostics().investigation.busy &&
          skyshiftWebsite.diagnostics().investigation.display.zoom === z,
        zoom,
      );
      const file = await fs.readFile(out + "/public-comparison.zip");
      return {
        bytes: file.length,
        sha256: createHash("sha256").update(file).digest("hex"),
        restored_zoom: zoom,
      };
    },
  );
  await check(
    "Static sine playback, mute and all three telescope models work",
    async () => {
      await page.click("#site-more");
      await page.click("[data-open-sound]:visible");
      await page.click('[data-preview-sound="spherex"]');
      assert.equal(
        (await page.evaluate(() => skyshiftSound.diagnostics())).context_state,
        "running",
      );
      assert.match(
        (await page.evaluate(() => skyshiftSound.diagnostics())).synthesis,
        /dry sine/,
      );
      await page.keyboard.press("Escape");
      await page.click(".site-navigation [data-route=universe]");
      await page.waitForFunction(
        () => window.skyshiftSpace?.diagnostics().frames > 0,
      );
      await page.click("#hangar-toggle");
      await page.waitForFunction(
        () => skyshiftSpace.diagnostics().loaded_telescopes.length === 3,
      );
      await page.click('[data-telescope="webb-b"]');
      await page.waitForTimeout(1000);
      const d = await page.evaluate(() => skyshiftSpace.diagnostics());
      assert.ok(d.assets_loaded.includes("webb-detail"));
      assert.ok(d.observing.diagram_visible);
      await page.click('[data-observe-stage="1"]');
      await page.click("#optics-expand");
      await page.locator("#optics-dialog[open]").waitFor();
      await page.keyboard.press("Escape");
      await page.click("#sound-toggle");
      await page.waitForFunction(
        () => skyshiftSound.diagnostics().enabled === false,
      );
      await page.click("#classic-toggle");
      assert.equal(
        await page.locator("#site-sound").getAttribute("aria-pressed"),
        "false",
      );
      return {
        models: d.loaded_telescopes,
        audio: "dry sine",
        mute_shared: true,
      };
    },
  );
  assert.deepEqual(errors, []);
} catch (e) {
  console.error(e.stack);
  process.exitCode = 1;
  await page.screenshot({ path: out + "/failure.png" }).catch(() => {});
} finally {
  await fs.writeFile(
    "docs/evidence/" + recordName + "_tests.json",
    JSON.stringify(
      {
        recorded_at_utc: new Date().toISOString(),
        base_url: origin,
        deployment_scope:
          address.protocol === "http:"
            ? "local static staging, not a public deployment"
            : "public HTTPS",
        browser: browser.version(),
        profile:
          "fresh; no login, cookies, publishing credential or auth bypass",
        results,
        page_errors: errors,
        non_get_application_requests: requests.filter(
          (r) =>
            r.method !== "GET" &&
            r.method !== "HEAD" &&
            new URL(r.url).origin === origin,
        ),
        limits: [
          "Static smoke and integrity tests; scope is recorded above; local regression receipts are separate",
          "No subjective sound/visual approval or qualified scientific review inferred",
          "Qualified scientific approval and internal human review PENDING; independent novice validation NOT CONDUCTED",
        ],
      },
      null,
      2,
    ) + "\n",
  );
  await browser.close();
}
