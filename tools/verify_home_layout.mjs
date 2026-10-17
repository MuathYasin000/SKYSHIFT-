// Regression for the reported cropped homepage. Uses a fresh installed browser.
import fs from "node:fs/promises";
import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
const { chromium } = await import(
  pathToFileURL(
    process.env.SKYSHIFT_PLAYWRIGHT_MODULE ||
      "C:/Users/LOQ/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs",
  )
);
const base = process.env.SKYSHIFT_BASE_URL || "http://localhost:3000";
const suffix = process.env.SKYSHIFT_TEST_SUFFIX || "chrome";
const recordPrefix = process.env.SKYSHIFT_TEST_NAME || "home_layout";
const out = "tmp/" + recordPrefix + "/" + suffix;
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  executablePath:
    process.env.SKYSHIFT_CHROMIUM_EXECUTABLE ||
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
});
const context = await browser.newContext({
  reducedMotion: "reduce",
  acceptDownloads: true,
});
const page = await context.newPage(),
  results = [],
  errors = [],
  external = [];
page.on("pageerror", (e) => errors.push(e.message));
await context.route("**/*", (r) => {
  const u = new URL(r.request().url());
  if (
    ["http:", "https:"].includes(u.protocol) &&
    u.origin !== new URL(base).origin
  ) {
    external.push(u.href);
    return r.abort();
  }
  return r.continue();
});
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
  for (const width of [
    320, 390, 560, 768, 820, 900, 1000, 1001, 1024, 1101, 1150, 1151, 1280,
    1366, 1440, 1920, 2560,
  ]) {
    await check("Homepage viewport " + width, async () => {
      const height =
        width === 1366
          ? 768
          : width === 1920
            ? 1080
            : width === 2560
              ? 1440
              : 1000;
      await page.setViewportSize({ width, height });
      await page.goto(base + "/");
      await page.waitForFunction(
        () =>
          window.skyshiftWebsite &&
          document.querySelectorAll(".field-card").length === 4,
      );
      await page.evaluate(() => document.fonts.ready);
      const geometry = await page.evaluate(() => {
        const vw = document.documentElement.clientWidth,
          background = document
            .querySelector(".hero-grid")
            .getBoundingClientRect();
        const selectors = [
          ".site-brand",
          ".site-navigation",
          "#site-sound",
          "#site-more",
          ".intro-copy h1",
          ".intro-lead",
          ".mission-launch",
          ".hero-observatory",
          ".hero-hud",
          ".hero-model-controls",
          ".hero-observatory figcaption",
          ".hero-mission-link",
          ".field-card",
          ".section-heading",
          ".story-rail",
        ];
        const controls = [...document.querySelectorAll(selectors.join(","))]
          .filter((e) => e.checkVisibility())
          .map((e) => {
            const r = e.getBoundingClientRect();
            return {
              selector: e.id || e.className,
              left: r.left,
              right: r.right,
              scroll: e.scrollWidth,
              client: e.clientWidth,
            };
          });
        // Inspect actual rendered text rectangles too; root overflow checks alone
        // missed content concealed by overflow:clip in the previous layout.
        const text = [];
        for (const e of document.querySelectorAll(
          ".intro-copy h1,.intro-lead,.mission-launch,.hero-hud,.hero-observatory figcaption",
        )) {
          if (!e.checkVisibility()) continue;
          const range = document.createRange();
          range.selectNodeContents(e);
          for (const r of range.getClientRects())
            if (r.width > 0) text.push({ left: r.left, right: r.right });
        }
        return {
          vw,
          scroll: document.documentElement.scrollWidth,
          background: { left: background.left, right: background.right },
          controls,
          text,
        };
      });
      assert.ok(geometry.scroll <= geometry.vw + 1, JSON.stringify(geometry));
      assert.ok(
        Math.abs(geometry.background.left) < 1 &&
          Math.abs(geometry.background.right - geometry.vw) < 1,
        "Hero scenery must reach both viewport edges",
      );
      for (const e of geometry.controls) {
        assert.ok(
          e.left >= -1 && e.right <= geometry.vw + 1,
          JSON.stringify(e),
        );
        assert.ok(e.scroll <= e.client + 1, JSON.stringify(e));
      }
      for (const r of geometry.text)
        assert.ok(
          r.left >= -1 && r.right <= geometry.vw + 1,
          JSON.stringify(r),
        );
      if (width > 1000) {
        const brand = geometry.controls.find(
          (e) => e.selector === "site-brand",
        );
        const left = await page.locator(".intro-copy").boundingBox();
        assert.ok(
          brand.left >= 20 && brand.left <= 49,
          "Desktop logo must remain near the left edge, not in a centred narrow container",
        );
        assert.ok(
          Math.abs(brand.left - left.x) < 1,
          "Desktop logo and hero copy must share the same gutter",
        );
        const fields = await page.locator(".field-section").boundingBox();
        assert.ok(
          fields.width >= geometry.vw - 98,
          "Desktop homepage sections must use the available screen width",
        );
      }
      const figure = await page.locator(".hero-observatory").boundingBox(),
        copy = await page.locator(".intro-copy").boundingBox();
      assert.ok(
        figure.x >= copy.x + copy.width - 1 ||
          copy.x >= figure.x + figure.width - 1 ||
          figure.y >= copy.y + copy.height - 1 ||
          copy.y >= figure.y + figure.height - 1,
        "Hero copy and model must not overlap",
      );
      if ([320, 390, 900, 1366, 1920, 2560].includes(width)) {
        await page.waitForFunction(
          () => window.skyshiftHero?.diagnostics().model?.frames > 0,
        );
        await page.screenshot({ path: out + "/home-" + width + ".png" });
      }
      return {
        width,
        height,
        document_scroll_width: geometry.scroll,
        background: geometry.background,
        visible_content_bounds: "pass",
        stacked: width <= 1000,
      };
    });
  }
  await check(
    "Direct hero comparison, evidence export and reopening after layout repair",
    async () => {
      await page.setViewportSize({ width: 1280, height: 900 });
      await page.goto(base + "/");
      await page.waitForFunction(() => window.skyshiftWebsite);
      await page.locator(".mission-launch").focus();
      await page.keyboard.press("Enter");
      await page.waitForFunction(
        () =>
          skyshiftWebsite.diagnostics().investigation.kind === "pair" &&
          !skyshiftWebsite.diagnostics().investigation.busy,
      );
      assert.match(
        await page.locator("#instrument-suitability").innerText(),
        /PENDING/,
      );
      await page.click("#instrument-zoom-in");
      const zoom = await page.evaluate(
        () => skyshiftWebsite.diagnostics().investigation.display.zoom,
      );
      const download = page.waitForEvent("download");
      await page.click("#instrument-save");
      await (await download).saveAs(out + "/comparison.zip");
      await page.click("#instrument-fit");
      await page.setInputFiles("#instrument-file", out + "/comparison.zip");
      await page.waitForFunction(
        (z) =>
          !skyshiftWebsite.diagnostics().investigation.busy &&
          skyshiftWebsite.diagnostics().investigation.display.zoom === z,
        zoom,
      );
      return { restored_zoom: zoom, scientific_approval: "PENDING" };
    },
  );
  assert.deepEqual(errors, []);
  assert.deepEqual(external, []);
} catch (e) {
  console.error(e.stack);
  process.exitCode = 1;
  await page.screenshot({ path: out + "/failure.png" }).catch(() => {});
} finally {
  await fs.writeFile(
    "docs/evidence/" + recordPrefix + "_tests_" + suffix + ".json",
    JSON.stringify(
      {
        recorded_at_utc: new Date().toISOString(),
        base_url: base,
        browser: browser.version(),
        results,
        page_errors: errors,
        external_requests: external,
        limits: [
          "Fresh browser with reduced motion; viewport sizes are emulated",
          "No subjective design acceptance or physical-device certification inferred",
          "Qualified scientific approval/internal review PENDING; independent novice validation NOT CONDUCTED",
        ],
      },
      null,
      2,
    ) + "\n",
  );
  await browser.close();
}
