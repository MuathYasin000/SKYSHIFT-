import {createEvidenceDirectory,evidenceFile,writeEvidenceFile,claimEvidenceFile} from './evidence-output.mjs';
const evidenceRun=await createEvidenceDirectory('verify_refinement',process.env.SKYSHIFT_EVIDENCE_OUTPUT);
// Browser acceptance for the defect-fix brief; no human or hardware certification.
import fs from "node:fs/promises";
import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
const { chromium } = await import(
  pathToFileURL(
    process.env.SKYSHIFT_PLAYWRIGHT_MODULE ||
      "C:/Users/LOQ/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs",
  )
);
const out = evidenceRun,
  results = [],
  errors = [],
  consoleErrors = [],
  gpuWarnings = [],
  failed = [],
  httpErrors = [],
  requests = [],
  selectors = new Map();

const browser = await chromium.launch({
  headless: true,
  executablePath:
    process.env.SKYSHIFT_CHROMIUM_EXECUTABLE ||
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
});
let page;
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
async function inspectSelectors(p) {
  const records = await p.evaluate(() => {
    const found = [];
    function walk(rules, url) {
      for (const r of rules) {
        if (r.selectorText) {
          for (const original of r.selectorText.split(/,(?![^()]*\))/)) {
            const selector = original
              .trim()
              .replace(
                /::(?:before|after|marker|first-letter|first-line|selection|placeholder|backdrop)/g,
                "",
              )
              .replace(
                /:(?:hover|active|focus-visible|focus-within|focus)(?![\w-])/g,
                "",
              );
            try {
              found.push({
                url,
                selector: original.trim(),
                matched: !!document.querySelector(selector),
              });
            } catch {
              found.push({ url, selector: original.trim(), unsupported: true });
            }
          }
        } else if (r.cssRules && !r.name?.includes("arrival"))
          walk(r.cssRules, url);
      }
    }
    for (const s of document.styleSheets)
      if (/\/(components|shell-app|shell-document)\.css$/.test(s.href || ""))
        walk(s.cssRules, s.href.split("/").at(-1));
    return found;
  });
  for (const r of records) {
    const key = r.url + "|" + r.selector,
      old = selectors.get(key);
    selectors.set(key, { ...r, matched: r.matched || old?.matched || false });
  }
}
async function loaded(p, route) {
  if (route === "/compare.html")
    await p.locator("#workspace:not([hidden])").waitFor();
  if (route === "/explore.html")
    await p.locator("#explore-content:not([hidden])").waitFor();
  if (route === "/#compare")
    await p.waitForFunction(
      () =>
        window.skyshiftWebsite?.diagnostics().investigation.opened &&
        !skyshiftWebsite.diagnostics().investigation.busy &&
        !skyshiftWebsite.diagnostics().navigation.active,
    );
  if (route === "/#universe")
    await p.waitForFunction(
      () =>
        window.skyshiftSpace?.diagnostics().earth_context?.state === "ready",
    );
  if (route === "/")
    await p.waitForFunction(() => document.body.dataset.controller === "ready");
  await p.evaluate(() => document.fonts.ready);
}
try {
  for (const [width, height] of [
    [1440, 900],
    [390, 844],
  ]) {
    const context = await browser.newContext({
      viewport: { width, height },
      reducedMotion: "reduce",
    });
    await context.addInitScript(() => {
      window.__gpuReadbacks = 0;
      for(const name of ['WebGLRenderingContext','WebGL2RenderingContext']){
        const prototype=window[name]?.prototype, original=prototype?.readPixels;
        if(original)prototype.readPixels=function(...args){window.__gpuReadbacks++;return original.apply(this,args);};
      }
    });
    page = await context.newPage();
    page.on("pageerror", (e) => errors.push(e.message));
    page.on('console',m=>{if(m.type()==='error')consoleErrors.push(m.text());if(/GPU stall|ReadPixels/i.test(m.text()))gpuWarnings.push(m.text());});
    page.on("request", (r) => requests.push(r.url()));
    page.on("requestfailed", (r) => {
      if (!/ERR_ABORTED/.test(r.failure()?.errorText || ""))
        failed.push({ url: r.url(), error: r.failure()?.errorText });
    });
    page.on("response", (r) => {
      if (r.status() >= 400)
        httpErrors.push({ url: r.url(), status: r.status() });
    });
    for (const [name, route] of [
      ["home", "/"],
      ["compare", "/compare.html"],
      ["explore", "/explore.html"],
      ["discover", "/discover.html"],
      ["methodology", "/methodology.html"],
      ["guide", "/guide.html"],
      ["universe", "/#universe"],
      ["native-compare", "/#compare"],
    ]) {
      const requestStart=requests.length;
      await page.goto("http://localhost:3000" + route);
      await loaded(page, route);
      if(!['home','universe'].includes(name))assert.deepEqual(requests.slice(requestStart).filter(u=>/three\.(?:core|module)\.js|\.glb(?:$|\?)|review-part-.*\.bin/.test(u)),[], 'Heavy 3D/review downloads must remain on demand');
      await check(
        `${name} ${width}: typography, links, viewport, primary action`,
        async () => {
          const m = await page.evaluate(() => {
            const under = [],
              links = [],
              red = [];
            for (const e of document.querySelectorAll("body *")) {
              const s = getComputedStyle(e),
                r = e.getBoundingClientRect();
              if (
                !r.width ||
                !r.height ||
                s.visibility === "hidden" ||
                s.display === "none" ||
                e.closest("[hidden],dialog:not([open])")
              )
                continue;
              if (
                [...e.childNodes].some(
                  (n) => n.nodeType === 3 && n.textContent.trim(),
                ) &&
                parseFloat(s.fontSize) < 12
              )
                under.push({ tag: e.tagName, id: e.id, font: s.fontSize });
              if (e.matches("p a") && s.display !== "inline")
                links.push({ text: e.textContent, display: s.display });
              if (
                e.matches("a,button,input[type=submit]") &&
                s.backgroundColor === "rgb(252, 61, 33)" &&
                r.top < innerHeight &&
                r.bottom > 0 &&
                r.right > 0 &&
                r.left < innerWidth
              )
                red.push(e.id || e.textContent.trim());
            }
            return {
              under,
              links,
              red,
              overflow: document.documentElement.scrollWidth > innerWidth,
            };
          });
          assert.deepEqual(m.under, []);
          assert.deepEqual(m.links, []);
          assert.equal(m.overflow, false);
          assert.ok(m.red.length <= 1, JSON.stringify(m.red));
          return m;
        },
      );
      await inspectSelectors(page);
      if (name === "home") {
        await check(
          `Home ${width}: one icon and numeral, readable word, ruler spacing`,
          async () => {
            const m = await page.evaluate(() => {
              const r = (e) => e.getBoundingClientRect(),
                h = document.querySelector("h1 em"),
                s = getComputedStyle(h),
                ruler = document.querySelector(".hero-spectrum"),
                caption = r(ruler.querySelector(".spectrum-caption")),
                ticks = r(ruler.querySelector("[data-spectrum]")),
                endpoints = r(ruler.querySelector(".wavelength-endpoints"));
              return {
                cards: [
                  ...document.querySelectorAll(".trust-section article"),
                ].map((e) => ({
                  icons: e.querySelectorAll("svg").length,
                  numerals: e.querySelectorAll(".principle-number").length,
                })),
                word: {
                  color: s.color,
                  stroke: s.webkitTextStrokeWidth,
                  strokeColor: s.webkitTextStrokeColor,
                },
                caption_to_ticks: ticks.top - caption.bottom,
                ticks_to_labels: endpoints.top - ticks.bottom,
                rulers: document.querySelectorAll(
                  ".observatory-hero [data-spectrum]",
                ).length,
              };
            });
            for (const c of m.cards) {
              assert.equal(c.icons, 1);
              assert.equal(c.numerals, 1);
            }
            assert.ok(
              m.word.color === "rgb(255, 255, 255)" ||
                parseFloat(m.word.stroke) >= 1.5,
            );
            assert.ok(m.caption_to_ticks >= 12);
            assert.ok(m.ticks_to_labels >= 12);
            assert.equal(m.rulers, 1);
            return m;
          },
        );
        await page.locator(".trust-section").scrollIntoViewIfNeeded();
        await inspectSelectors(page);
        await page.locator("#mission-heading").scrollIntoViewIfNeeded();
        await page.click("#activate-mission-model");
        await page.waitForFunction(
          () => skyshiftWebsite.diagnostics().model?.frames > 0,
        );
        await inspectSelectors(page);
      }
      if (name === "compare") {
        await check(
          `Compare ${width}: first image, divider keyboard and both labels`,
          async () => {
            if (
              (await page
                .locator("#overlay-mode")
                .getAttribute("aria-pressed")) !== "true"
            )
              await page.click("#overlay-mode");
            await page.evaluate(() => scrollTo(0, 0));
            const canvasY = await page
              .locator("#canvas-a")
              .evaluate((e) => e.getBoundingClientRect().top + scrollY);
            if (width === 1440) assert.ok(canvasY <= 600, String(canvasY));
            if (width === 390) assert.ok(canvasY <= 650, 'Mobile image must follow the title and compact controls: '+canvasY);
            const handle = page.locator("#legacy-wipe-handle");
            await handle.focus();
            await page.keyboard.press("Home");
            await page.keyboard.press("ArrowRight");
            await page.waitForFunction(
              () =>
                document
                  .getElementById("legacy-wipe-handle")
                  .getAttribute("aria-valuenow") === "1",
            );
            await page.keyboard.press("End");
            await page.click("#side-mode");
            const stamps = await page
              .locator(".canvas-stamp")
              .evaluateAll((es) =>
                es.map((e) => {
                  const r = e.getBoundingClientRect(),
                    p = e.parentElement.getBoundingClientRect(),
                    s = getComputedStyle(e);
                  return {
                    width: r.width,
                    height: r.height,
                    left: r.left - p.left,
                    bottom: p.bottom - r.bottom,
                    pointer: s.pointerEvents,
                  };
                }),
              );
            for (const r of stamps) {
              assert.ok(
                r.width > 0 && r.width < 200 && r.height > 0 && r.height <= 28,
              );
              assert.equal(r.pointer, "none");
              assert.equal(r.left, 12);
              assert.equal(r.bottom, 12);
            }
            await inspectSelectors(page);
            return { canvasY, stamps };
          },
        );
      }
      if (name === "universe") {
        await check(
          `Universe ${width}: source-backed Earth and single toolbar`,
          async () => {
            const d = await page.evaluate(() => skyshiftSpace.diagnostics());
            assert.equal(d.earth_context.state, "ready");
            assert.equal(d.earth_context.atmosphere, true);
            assert.equal(
              await page.locator("#classic-toggle,#sound-toggle").count(),
              0,
            );
            const icons = await page
              .locator(".space-actions .toolbar-icon")
              .evaluateAll((es) =>
                es.map((e) => ({
                  w: e.getBoundingClientRect().width,
                  h: e.getBoundingClientRect().height,
                })),
              );
            for (const i of icons) {
              assert.equal(i.w, 20);
              assert.equal(i.h, 20);
            }
            const gpu=await page.evaluate(()=>{
              const gl=document.getElementById('universe').getContext('webgl2'),ext=gl.getExtension('WEBGL_debug_renderer_info');
              return {vendor:ext?gl.getParameter(ext.UNMASKED_VENDOR_WEBGL):'unavailable',renderer:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):'unavailable',javascript_readPixels_calls:window.__gpuReadbacks};
            });
            assert.equal(gpu.javascript_readPixels_calls,0);
            return { earth: d.earth_context, icons, gpu };
          },
        );
        await page.click("#context-toggle");
        await inspectSelectors(page);
        await page.click("#context-toggle");
      }
      await page.evaluate(() =>
        document.querySelectorAll("details").forEach((e) => (e.open = true)),
      );
      await inspectSelectors(page);
      if (name === "native-compare")
        for (const id of [
          "instrument-about",
          "instrument-display",
          "instrument-notes",
          "instrument-evidence",
        ]) {
          await page.click("#" + id);
          await inspectSelectors(page);
          if (await page.locator("#instrument-panel-close").isVisible())
            await page.click("#instrument-panel-close");
          else await page.keyboard.press("Escape");
        }
    }
    await context.close();
  }
  await check(
    "Hero word remains readable through the animated intro",
    async () => {
      const c = await browser.newContext({
        viewport: { width: 1440, height: 900 },
      });
      page = await c.newPage();
      await page.addInitScript(() => {
        window.__headlineSamples = [];
        function sample() {
          const e = document.querySelector("h1 em");
          if (e) {
            const s = getComputedStyle(e),
              p = getComputedStyle(e.closest(".headline-line") || e);
            window.__headlineSamples.push({
              color: s.color,
              stroke: parseFloat(s.webkitTextStrokeWidth),
              strokeColor: s.webkitTextStrokeColor,
              opacity: p.opacity,
            });
          }
          if (window.__headlineSamples.length < 120)
            requestAnimationFrame(sample);
        }
        requestAnimationFrame(sample);
      });
      await page.goto("http://localhost:3000/");
      await page.waitForFunction(() => window.__headlineSamples.length >= 100);
      const samples = await page.evaluate(() => window.__headlineSamples);
      assert.ok(
        samples.every(
          (s) =>
            (s.color === "rgb(255, 255, 255)" ||
              (s.stroke >= 1.5 && s.strokeColor === "rgb(255, 255, 255)")) &&
            Number(s.opacity) >= 1,
        ),
        JSON.stringify(samples.filter((s) => Number(s.opacity) < 1)),
      );
      await c.close();
      return { frames: samples.length };
    },
  );
  await check(
    "Earth checksum failure is explained without disabling the telescope",
    async () => {
      const c = await browser.newContext({
        viewport: { width: 1440, height: 900 },
        reducedMotion: "reduce",
      });
      page = await c.newPage();
      await page.route("**/earth-natural.glb", (r) =>
        r.fulfill({
          status: 200,
          body: "deliberately invalid asset for fault injection",
        }),
      );
      await page.goto("http://localhost:3000/#universe");
      await page.waitForFunction(
        () =>
          window.skyshiftSpace?.diagnostics().earth_context?.state === "failed",
      );
      const reason = await page.locator(".earth-context-status").innerText();
      assert.match(reason, /checksum/i);
      assert.ok(
        (await page.evaluate(() => skyshiftSpace.diagnostics())).frames > 0,
      );
      await c.close();
      return {
        reason,
        scope:
          "Intentional fault injection is separate from zero-failure normal journeys",
      };
    },
  );
  assert.deepEqual(errors, []);
  assert.deepEqual(consoleErrors, []);
  assert.deepEqual(failed, []);
  assert.deepEqual(httpErrors, []);
  assert.ok((await fs.stat("web/dist/components.css")).size < 40000);
} catch (e) {
  console.error(e.stack);
  process.exitCode = 1;
  await page
    ?.screenshot({ path: await claimEvidenceFile(evidenceFile(evidenceRun,out + "/acceptance-failure.png" ))})
    .catch(() => {});
} finally {
  await writeEvidenceFile(evidenceFile(evidenceRun,out + "/acceptance.json"),
    JSON.stringify(
      {
        recorded_at_utc: new Date().toISOString(),
        browser: browser.version(),
        results,
        page_errors: errors,
        console_errors: consoleErrors,
        gpu_warnings: gpuWarnings,
        failed_requests: failed,
        http_errors: httpErrors,
        limits: [
          "Chromium reports its renderer in each Universe result. Mobile sizes and touch are emulated; Safari, driver profiling and subjective sound acceptance are not certified.",
          "Qualified scientific approval/internal human review PENDING; independent novice validation NOT CONDUCTED.",
        ],
      },
      null,
      2,
    ) + "\n",
  );
  await writeEvidenceFile(evidenceFile(evidenceRun,out + "/selector-coverage.json"),
    JSON.stringify(
      {
        scope:
          "Union of DOM selector matching across eight routes, two widths and opened controls. Transient pseudo states normalized; no blanket removal of unseen dynamic selectors.",
        selectors: [...selectors.values()],
      },
      null,
      2,
    ) + "\n",
  );
  await browser.close();
}
