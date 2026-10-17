// Targeted interaction/visual checks. Isolated profiles, never the user's session.
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
    executablePath:
      process.env.SKYSHIFT_CHROMIUM_EXECUTABLE ||
      "C:/Program Files/Google/Chrome/Application/chrome.exe",
  }),
  results = [];
await fs.mkdir("tmp/orbital-details-qa", { recursive: true });
async function page(options = {}) {
  const c = await b.newContext({
    viewport: { width: 1440, height: 900 },
    ...options,
  });
  await c.route("**/*", (r) =>
    new URL(r.request().url()).hostname === "localhost" ||
    r.request().url().startsWith("blob:")
      ? r.continue()
      : r.abort(),
  );
  const p = await c.newPage();
  p.setDefaultTimeout(15000);
  return { c, p };
}
async function ready(p) {
  await p.goto("http://localhost:3000/");
  await p.waitForFunction(
    () =>
      document.body.dataset.controller === "ready" && window.skyshiftOrbital,
  );
  await p.evaluate(() => document.fonts.ready);
}
async function check(name, fn) {
  try {
    const detail = await fn();
    results.push({ name, status: "pass", detail });
    console.log("PASS " + name);
  } catch (e) {
    results.push({ name, status: "fail", error: e.message });
    throw e;
  }
}
try {
  for (const [width, height] of [
    [1440, 900],
    [1024, 768],
    [390, 844],
    [320, 667],
    [844, 390],
  ]) {
    await check(
      `Visible science navigation, bounded layout and original illustration at ${width}x${height}`,
      async () => {
        const { c, p } = await page({ viewport: { width, height } });
        try {
          await ready(p);
          assert.equal(
            await p.evaluate(
              () => document.documentElement.scrollWidth - innerWidth,
            ),
            0,
          );
          const nav = await p
            .locator(".site-navigation a[data-route=compare]")
            .boundingBox();
          assert.ok(nav.y >= 0 && nav.y + nav.height <= height);
          if (height > 500) {
            const a = await p
              .locator(".intro-actions .primary-link")
              .boundingBox();
            assert.ok(
              a.y + a.height <= height,
              "primary action should fit initial screen",
            );
          }
          assert.equal(
            await p.locator(".hero-spacecraft image").getAttribute("href"),
            "./assets/spherex-spacecraft-concept.jpg",
          );
          assert.match(
            await p.locator(".hero-observatory figcaption").innerText(),
            /Artist’s concept/,
          );
          assert.equal(await p.locator("#universe-view canvas").count(), 0);
          const firstCard = await p
              .locator(".field-card")
              .first()
              .boundingBox(),
            context = await p.locator(".infrared-story").boundingBox();
          assert.ok(
            firstCard.y < context.y,
            "real observations precede additional mission imagery",
          );
          await p.screenshot({
            path: `tmp/orbital-details-qa/home-${width}-${height}.png`,
          });
          await p.locator(".site-navigation a[data-route=compare]").click();
          await p.waitForFunction(
            () =>
              skyshiftWebsite.diagnostics().investigation.kind === "pair" &&
              !skyshiftWebsite.diagnostics().investigation.busy,
          );
          assert.equal(
            await p.evaluate(
              () => document.documentElement.scrollWidth - innerWidth,
            ),
            0,
          );
          assert.match(
            await p.locator("#instrument-suitability").textContent(),
            /PENDING/,
          );
          await p.screenshot({
            path: `tmp/orbital-details-qa/compare-${width}-${height}.png`,
          });
        } finally {
          await c.close();
        }
      },
    );
  }
  await check(
    "Pointer lighting and keyboard focus reach the same real navigation targets",
    async () => {
      const { c, p } = await page();
      try {
        await ready(p);
        const nav = p.locator(".site-navigation"),
          r = await nav.boundingBox();
        await p.mouse.move(r.x + 30, r.y + 20);
        assert.notEqual(
          await nav.evaluate((e) => e.style.getPropertyValue("--spotlight-x")),
          "",
        );
        await p.locator(".site-navigation a[data-route=compare]").focus();
        const focus = await nav.evaluate((e) =>
          e.style.getPropertyValue("--spotlight-x"),
        );
        await p.keyboard.press("Enter");
        await p.waitForFunction(
          () =>
            skyshiftWebsite.diagnostics().investigation.kind === "pair" &&
            !skyshiftWebsite.diagnostics().investigation.busy,
        );
        const active = await nav.evaluate((e) =>
          e.style.getPropertyValue("--ambience-x"),
        );
        assert.equal(focus, active);
      } finally {
        await c.close();
      }
    },
  );
  await check(
    "Spacecraft movement is bounded, demand-driven and stops on pointer exit",
    async () => {
      const { c, p } = await page();
      try {
        await ready(p);
        const r = await p.locator(".hero-observatory").boundingBox();
        await p.mouse.move(r.x + r.width * 0.7, r.y + r.height * 0.7);
        await p.waitForFunction(
          () => skyshiftOrbital.diagnostics().pointer_updates > 0,
        );
        const before = await p.evaluate(() => skyshiftOrbital.diagnostics());
        await p.waitForTimeout(200);
        assert.deepEqual(
          await p.evaluate(() => skyshiftOrbital.diagnostics()),
          before,
        );
        const x = await p
          .locator(".hero-observatory")
          .evaluate((e) => parseFloat(e.style.getPropertyValue("--craft-x")));
        assert.ok(Math.abs(x) <= 7);
        await p.mouse.move(4, 4);
        assert.equal(
          await p
            .locator(".hero-observatory")
            .evaluate((e) => e.style.getPropertyValue("--craft-x")),
          "",
        );
      } finally {
        await c.close();
      }
    },
  );
  await check(
    "Reduced motion disables decorative movement and leaves the main action usable",
    async () => {
      const { c, p } = await page({ reducedMotion: "reduce" });
      try {
        await ready(p);
        const r = await p.locator(".hero-observatory").boundingBox();
        await p.mouse.move(r.x + r.width * 0.7, r.y + r.height * 0.7);
        await p.waitForTimeout(150);
        assert.equal(
          (await p.evaluate(() => skyshiftOrbital.diagnostics()))
            .pointer_updates,
          0,
        );
        assert.equal(
          await p
            .locator(".hero-spacecraft")
            .evaluate((e) => getComputedStyle(e).transitionDuration),
          "0s",
        );
        await p.locator(".intro-actions .primary-link").click();
        await p.waitForFunction(
          () =>
            skyshiftWebsite.diagnostics().investigation.kind === "pair" &&
            !skyshiftWebsite.diagnostics().investigation.busy,
        );
      } finally {
        await c.close();
      }
    },
  );
  await check(
    "Missing cosmetic module never blocks scientific viewing or export",
    async () => {
      const { c, p } = await page();
      try {
        await p.route("**/orbital-interactions.js", (r) => r.abort());
        await p.goto("http://localhost:3000/#compare");
        await p.waitForFunction(
          () =>
            document.body.dataset.controller === "ready" &&
            skyshiftWebsite.diagnostics().investigation.kind === "pair" &&
            !skyshiftWebsite.diagnostics().investigation.busy,
        );
        const download = p.waitForEvent("download");
        await p.click("#instrument-save");
        assert.ok((await fs.stat(await (await download).path())).size > 1000);
      } finally {
        await c.close();
      }
    },
  );
  await check(
    "Sources expose attribution, original licenses and local interface provenance",
    async () => {
      const { c, p } = await page();
      try {
        await ready(p);
        await p.locator(".interface-credits").scrollIntoViewIfNeeded();
        assert.equal(await p.locator(".interface-credits a").count(), 3);
        await p.locator("#site-more").click();
        const a = p.locator(
          '#site-information a[href="./vendor/ui-patterns/sources.json"]',
        );
        assert.equal(await a.isVisible(), true);
        const j = await (
          await p.request.get(
            "http://localhost:3000/vendor/ui-patterns/sources.json",
          )
        ).json();
        assert.equal(j.adaptations.length, 2);
        assert.equal(j.hero_image_treatment.scientific_pixels_modified, false);
        assert.match(
          await (
            await p.request.get(
              "http://localhost:3000/vendor/ui-patterns/Vengeance-LICENSE.txt",
            )
          ).text(),
          /Copyright \(c\) 2025-2026 Ashutoshx7/,
        );
      } finally {
        await c.close();
      }
    },
  );
} catch (e) {
  console.error(e);
  process.exitCode = 1;
} finally {
  await fs.writeFile(
    "docs/evidence/orbital_design_tests.json",
    JSON.stringify(
      {
        recorded_at_utc: new Date().toISOString(),
        browser: await b.version(),
        profile: "isolated",
        results,
        limitations: [
          "Automated checks and screenshot inspection do not establish human usability",
          "Physical mobile device validation NOT CONDUCTED",
          "Qualified scientific approval PENDING",
          "Internal human review PENDING",
        ],
      },
      null,
      2,
    ) + "\n",
  );
  await b.close();
}
