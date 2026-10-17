// Desktop route alignment, responsive science controls, and native navigation.
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
  out = "tmp/science-width/" + suffix;
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  executablePath:
    process.env.SKYSHIFT_CHROMIUM_EXECUTABLE ||
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
});
const context = await browser.newContext({ reducedMotion: "reduce" }),
  page = await context.newPage(),
  results = [],
  errors = [],
  external = [];
context.setDefaultTimeout(18000);
page.on("pageerror", (e) => errors.push(e.message));
await context.route("**/*", (r) => {
  const u = new URL(r.request().url());
  if (
    ["http:", "https:"].includes(u.protocol) &&
    u.origin !== "http://localhost:3000"
  ) {
    external.push(u.href);
    return r.abort();
  }
  return r.continue();
});
async function ready(field, kind) {
  await page.waitForFunction(
    ([f, k]) => {
      const d = window.skyshiftWebsite?.diagnostics();
      return (
        d?.surface === "science" &&
        d.investigation.opened &&
        !d.investigation.busy &&
        d.investigation.field === f &&
        d.investigation.kind === k
      );
    },
    [field, kind],
  );
  await page.evaluate(() => document.fonts.ready);
}
async function geometry() {
  return page.evaluate(() => {
    const root = document.documentElement,
      vw = root.clientWidth;
    const bounds = (e) => {
      const r = e.getBoundingClientRect();
      return {
        left: r.left,
        right: r.right,
        width: r.width,
        top: r.top,
        bottom: r.bottom,
      };
    };
    return {
      vw,
      scroll_width: root.scrollWidth,
      brand: bounds(document.querySelector(".site-brand")),
      workspace: bounds(document.querySelector(".observation-console")),
      controls: [
        ...document.querySelectorAll(
          ".site-navigation a,#site-more,#site-sound,.instrument-header,.instrument-selection,.instrument-toolbar button,.instrument-epoch-tools,.instrument-canvases,.instrument-viewtools,.instrument-footer,#instrument-panel,#instrument-information[open]",
        ),
      ]
        .filter((e) => e.checkVisibility())
        .map((e) => ({ name: e.id || e.className, ...bounds(e) })),
    };
  });
}
function assertBounds(g) {
  assert.ok(
    g.scroll_width <= g.vw + 1,
    "Document must not scroll horizontally",
  );
  for (const c of g.controls)
    assert.ok(c.left >= -1 && c.right <= g.vw + 1, JSON.stringify(c));
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
const routes = [
  { hash: "compare", field: "m101", kind: "pair" },
  { hash: "observations/m42", field: "m42", kind: "exposure" },
];
try {
  for (const [width, height] of [
    [390, 844],
    [768, 1024],
    [1000, 900],
    [1001, 900],
    [1366, 768],
    [1920, 1080],
    [2560, 1440],
    [1366, 700],
  ]) {
    await page.setViewportSize({ width, height });
    for (const r of routes)
      await check(r.hash + " at " + width + "x" + height, async () => {
        await page.goto("http://localhost:3000/#" + r.hash);
        await ready(r.field, r.kind);
        const g = await geometry();
        assertBounds(g);
        if (width > 1000) {
          assert.ok(
            g.brand.left >= 20 && g.brand.left <= 49,
            "Shared header must remain near the desktop edge",
          );
          assert.ok(
            Math.abs(g.brand.left - g.workspace.left) < 1,
            "Science workspace must align with the shared header",
          );
          assert.ok(
            g.workspace.width >= g.vw - 98,
            "Scientific workspace must use the available desktop width",
          );
        }
        if (width >= 1280)
          await page.screenshot({
            path: out + "/" + r.field + "-" + width + "x" + height + ".png",
          });
        return {
          width,
          height,
          field: r.field,
          kind: r.kind,
          logo_left: g.brand.left,
          workspace: g.workspace,
          horizontal_bounds: "pass",
        };
      });
  }
  await page.setViewportSize({ width: 1920, height: 1080 });
  for (const r of routes)
    await check(
      r.hash + " information, appearance and questions panels remain usable",
      async () => {
        await page.goto("http://localhost:3000/#" + r.hash);
        await ready(r.field, r.kind);
        for (const id of [
          "instrument-about",
          "instrument-display",
          "instrument-notes",
        ]) {
          await page.click("#" + id);
          const target =
            id === "instrument-about"
              ? "#instrument-information"
              : "#instrument-panel";
          await page.locator(target).waitFor({ state: "visible" });
          assertBounds(await geometry());
          const p = await page.locator(target).boundingBox();
          assert.ok(p.width >= 250 && p.height > 100);
          await page.click(
            id === "instrument-about"
              ? "#instrument-information-close"
              : "#instrument-panel-close",
          );
        }
        return {
          field: r.field,
          panels: ["Sources & suitability", "Appearance", "Questions"],
        };
      },
    );
  await check(
    "Logo stays aligned while navigating Home, Compare, Observations and Mission",
    async () => {
      const lefts = [];
      await page.goto("http://localhost:3000/");
      await page.waitForFunction(() => window.skyshiftWebsite);
      for (const route of ["home", "compare", "observations", "mission"]) {
        if (route === "home") await page.locator(".site-brand").click();
        else
          await page
            .locator('.site-navigation [data-route="' + route + '"]')
            .click();
        await page.waitForFunction(
          (r) =>
            r === "mission" || r === "home"
              ? document.body.dataset.surface === "home"
              : document.body.dataset.surface === "science",
          ["mission", "home"].includes(route) ? route : "science",
        );
        const x = await page
          .locator(".site-brand")
          .evaluate((e) => e.getBoundingClientRect().left);
        lefts.push({ route, left: x });
      }
      assert.ok(lefts.every((x) => Math.abs(x.left - lefts[0].left) < 1));
      return { lefts };
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
    "docs/evidence/science_width_tests_" + suffix + ".json",
    JSON.stringify(
      {
        recorded_at_utc: new Date().toISOString(),
        browser: browser.version(),
        results,
        page_errors: errors,
        external_requests: external,
        limits: [
          "Fresh installed-browser profiles; viewport dimensions are emulated",
          "No change to scientific pixels, image aspect ratio, calibration or review gates",
          "Qualified scientific approval and internal human review PENDING; independent novice validation NOT CONDUCTED",
        ],
      },
      null,
      2,
    ) + "\n",
  );
  await browser.close();
}
