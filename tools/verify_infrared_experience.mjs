import {createEvidenceDirectory,evidenceFile,writeEvidenceFile,claimEvidenceFile} from './evidence-output.mjs';
const evidenceRun=await createEvidenceDirectory('verify_infrared_experience',process.env.SKYSHIFT_EVIDENCE_OUTPUT);
// Isolated localhost browser verification. No human UX or science approval inferred.
import fs from "node:fs/promises";
import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import { createHash } from "node:crypto";
const { chromium } = await import(
  pathToFileURL(
    process.env.SKYSHIFT_PLAYWRIGHT_MODULE ||
      "C:/Users/LOQ/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs",
  )
);
const browser = await chromium.launch({
  headless: true,
  executablePath:
    process.env.SKYSHIFT_CHROMIUM_EXECUTABLE ||
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
});
const suffix = process.env.SKYSHIFT_TEST_SUFFIX || "",
  out = evidenceRun,
  results = [],
  errors = [],
  external = [];

async function context(options = {}) {
  const c = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    ...options,
  });
  await c.route("**/*", (r) => {
    const url = r.request().url();
    if (new URL(url).hostname === "localhost" || url.startsWith("blob:"))
      return r.continue();
    external.push(url);
    return r.abort();
  });
  const p = await c.newPage();
  p.setDefaultTimeout(20000);
  p.on("pageerror", (e) => errors.push(e.message));
  p.on("console", (m) => {
    if (
      m.type() === "error" &&
      /shader|VALIDATE_STATUS|program not valid/i.test(m.text())
    )
      errors.push(m.text());
  });
  return { c, p };
}
async function home(p) {
  await p.goto("http://localhost:3000/");
  await p.waitForFunction(
    () =>
      window.skyshiftInfrared &&
      window.skyshiftHero?.diagnostics().model?.frames > 0,
  );
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(1700);
}
async function science(p) {
  await p.waitForFunction(
    () =>
      window.skyshiftWebsite?.diagnostics().investigation.kind === "pair" &&
      !window.skyshiftWebsite.diagnostics().investigation.busy,
  );
}
async function check(name, run) {
  try {
    results.push({ name, status: "pass", detail: await run() });
    console.log("PASS " + name);
  } catch (e) {
    results.push({ name, status: "fail", error: e.message });
    throw e;
  }
}
try {
  const { c, p } = await context();
  await check(
    "New outlined logo is the original user file; spectrum strips contain exactly 102 decorative bars",
    async () => {
      await home(p);
      const file = await fs.readFile("web/dist/assets/LOGO2.PNG"),
        manifest = JSON.parse(
          await fs.readFile("web/dist/assets/space/manifest.json", "utf8"),
        ),
        original = manifest.assets.find((a) => a.id === "logo-outlined");
      assert.equal(
        createHash("sha256").update(file).digest("hex"),
        original.sha256,
      );
      assert.equal(file.length, original.bytes);
      assert.match(
        await p.locator(".site-brand img").getAttribute("src"),
        /LOGO2/,
      );
      assert.equal(
        await p
          .locator("[data-spectrum]")
          .evaluateAll((els) =>
            els.every(
              (e) =>
                e.children.length === 102 &&
                e.getAttribute("aria-hidden") === "true",
            ),
          ),
        true,
      );
      await p.screenshot({ path: await claimEvidenceFile(evidenceFile(evidenceRun,out + "/home-1440.png" ))});
      return { logo_sha256: createHash("sha256").update(file).digest("hex") };
    },
  );
  await check(
    "The fine-pointer spotlight stays on the spacecraft canvas",
    async () => {
      const coordinates = await p.locator("#hero-field-coordinates").textContent();
      await p.locator('.hero-observatory[data-model-state="ready"]').waitFor();
      await p.locator("#hero-model-canvas").hover();
      await p.waitForFunction(() => skyshiftInfrared.diagnostics().lens_active);
      const lens = p.locator("#infrared-lens");
      assert.equal(await lens.textContent(), "");
      assert.equal(await lens.evaluate((e) => getComputedStyle(e).pointerEvents), "none");
      await p.screenshot({ path: await claimEvidenceFile(evidenceFile(evidenceRun,out + "/spacecraft-spotlight.png" ))});
      await p.locator(".field-image").first().hover();
      await p.waitForFunction(() => !skyshiftInfrared.diagnostics().lens_active);
      assert.equal(await p.locator("#hero-field-coordinates").textContent(), coordinates);
    },
  );
  await check(
    "Explicit preview reveal toggles on and off and card navigation retains the real exposure route",
    async () => {
      const b = p.locator(".field-reveal-toggle").first();
      await b.click();
      assert.equal(await b.getAttribute("aria-pressed"), "true");
      await b.click();
      assert.equal(await b.getAttribute("aria-pressed"), "false");
      await p.locator(".field-card>a").first().click();
      await p.waitForFunction(
        () =>
          window.skyshiftWebsite?.diagnostics().investigation.kind ===
            "exposure" &&
          !window.skyshiftWebsite.diagnostics().investigation.busy,
      );
      assert.match(p.url(), /#observations\/m101/);
      assert.equal(
        await p
          .locator("#infrared-lens")
          .evaluate((e) => e.classList.contains("active")),
        false,
      );
      assert.equal(
        await p
          .locator("#instrument-canvas-a")
          .evaluate((e) => getComputedStyle(e).filter),
        "none",
      );
    },
  );
  await check(
    "Vela slider supports keyboard and actual dragging, with an accurate same-image explanation and spectrum legend",
    async () => {
      await p.goto("http://localhost:3000/");
      await p.waitForFunction(() => window.skyshiftInfrared);
      const slider = p.locator("#vela-reveal");
      await slider.scrollIntoViewIfNeeded();
      await slider.focus();
      await p.keyboard.press("End");
      assert.equal(await slider.inputValue(), "100");
      await p.keyboard.press("Home");
      assert.equal(await slider.inputValue(), "0");
      await p.keyboard.press("ArrowRight");
      assert.equal(await slider.inputValue(), "1");
      await slider.evaluate((e) => {
        e.value = "55";
        e.dispatchEvent(new Event("input", { bubbles: true }));
      });
      const divider = p.locator(".vela-divider>span");
      await divider.scrollIntoViewIfNeeded();
      const r = await divider.boundingBox();
      await p.mouse.move(r.x + r.width / 2, r.y + r.height / 2);
      await p.mouse.down();
      await p.mouse.move(r.x + r.width / 2 + 100, r.y + r.height / 2, {
        steps: 4,
      });
      await p.mouse.up();
      assert.ok(Number(await slider.inputValue()) < 55);
      assert.match(
        await p.locator(".vela-control small").textContent(),
        /not a\s+visible-light observation/,
      );
      await p.locator("#infrared-legend-button").click();
      assert.equal(await p.locator("#infrared-legend").isVisible(), true);
      assert.match(
        await p.locator("#infrared-legend").textContent(),
        /4\.54–4\.65/,
      );
      await p.screenshot({ path: await claimEvidenceFile(evidenceFile(evidenceRun,out + "/vela-legend.png" ))});
    },
  );
  await check(
    "Optional smooth scrolling moves and settles without a permanent animation frame; effects toggle restores native presentation",
    async () => {
      await home(p);
      await p.waitForFunction(
        () => skyshiftInfrared.diagnostics().smooth_scroll,
      );
      await p.mouse.move(600, 500);
      await p.mouse.wheel(0, 380);
      await p.waitForFunction(() => scrollY > 250);
      await p.waitForTimeout(1500);
      assert.equal(
        await p.evaluate(
          () => skyshiftInfrared.diagnostics().smooth_frame_pending,
        ),
        false,
      );
      await p.locator("#vision-effects").click();
      assert.equal(
        await p.locator("#vision-effects").getAttribute("aria-pressed"),
        "false",
      );
      assert.equal(
        await p.evaluate(() => skyshiftInfrared.diagnostics().smooth_scroll),
        false,
      );
    },
  );
  await check(
    "Real comparison retains restricted status, unfiltered scientific pixels and usable glowing wipe; date crossfade is transient display only",
    async () => {
      await p.locator('.site-navigation [href="#compare"]').click();
      await science(p);
      assert.match(
        await p.locator("#instrument-compatibility").textContent(),
        /RESTRICTED.*pending/,
      );
      assert.match(
        await p.locator("#instrument-suitability").textContent(),
        /PENDING/,
      );
      assert.equal(
        await p.evaluate(() => skyshiftInfrared.diagnostics().smooth_scroll),
        false,
      );
      await p.locator("[data-compare=wipe]").click();
      await p.locator("#instrument-wipe").fill("70");
      await p.locator("#instrument-wipe").dispatchEvent("input");
      assert.equal(
        await p.locator("#instrument-wipe-value").textContent(),
        "70%",
      );
      await p.screenshot({ path: await claimEvidenceFile(evidenceFile(evidenceRun,out + "/compare-wipe.png" ))});
      await p.locator("[data-compare=single]").click();
      await p.evaluate(() => {
        const selected =
          skyshiftWebsite.diagnostics().investigation.display.selected_epoch;
        document
          .querySelectorAll("#instrument-dates button")
          [selected === "A" ? 1 : 0].click();
      });
      assert.equal(await p.locator(".date-transition-wrap").count(), 1);
      await p.waitForTimeout(250);
      assert.equal(await p.locator(".date-transition-wrap").count(), 0);
      assert.equal(
        await p
          .locator("#instrument-canvas-a")
          .evaluate((e) => getComputedStyle(e).filter),
        "none",
      );
    },
  );
  await check(
    "Universe shaders compile, labels avoid each other, and every destination remains available in the drawer",
    async () => {
      await p.goto("http://localhost:3000/#universe");
      await p.waitForFunction(
        () => window.skyshiftSpace?.diagnostics().frames > 0,
      );
      await p.locator("#destinations-toggle").click();
      await p.locator("[data-environment=solar]").click();
      await p.waitForFunction(() =>
        [
          "sun",
          "mercury",
          "venus",
          "earth",
          "mars",
          "jupiter",
          "saturn",
          "uranus",
          "neptune",
          "moon",
        ].every((id) => document.querySelector('[data-object="' + id + '"]')),
      );
      await p.waitForFunction(() =>
        /loaded.*schematic/.test(
          document.querySelector("#space-status").textContent,
        ),
      );
      await p.waitForTimeout(1200);
      await p.locator("#destinations-toggle").click();
      const rects = await p
        .locator(".space-object-label:not([hidden])")
        .evaluateAll((es) =>
          es.map((e) => ({
            text: e.textContent,
            ...Object.fromEntries(
              ["left", "right", "top", "bottom"].map((k) => [
                k,
                e.getBoundingClientRect()[k],
              ]),
            ),
          })),
        );
      for (let i = 0; i < rects.length; i++)
        for (let j = i + 1; j < rects.length; j++) {
          const a = rects[i],
            b = rects[j];
          assert.equal(
            a.left < b.right &&
              a.right > b.left &&
              a.top < b.bottom &&
              a.bottom > b.top,
            false,
            a.text + "/" + b.text,
          );
        }
      assert.ok(rects.length > 0, "some unobstructed solar labels must remain");
      assert.ok((await p.locator("#destination-list button").count()) >= 10);
      assert.match(
        await p.locator("#scene-type").textContent(),
        /ILLUSTRATIVE BACKDROP/,
      );
      await p.screenshot({ path: await claimEvidenceFile(evidenceFile(evidenceRun,out + "/solar-labels.png" ))});
      return { visible_labels: rects.map((r) => r.text) };
    },
  );
  await c.close();
  for (const width of [1024, 390, 320])
    await check(
      `Touch and responsive presentation at ${width}px preserves CTA, reveal and comparison`,
      async () => {
        const { c, p } = await context({
          viewport: { width, height: width === 320 ? 667 : 844 },
          hasTouch: true,
          isMobile: width < 800,
        });
        try {
          await home(p);
          assert.equal(
            await p.evaluate(
              () => document.documentElement.scrollWidth - innerWidth,
            ),
            0,
          );
          const a = await p
            .locator(".intro-actions .primary-link")
            .boundingBox();
          assert.ok(
            a.y + a.height <= (width === 320 ? 667 : 844),
            "main CTA must fit the initial viewport",
          );
          const b = p.locator(".field-reveal-toggle").first();
          await b.tap();
          assert.equal(await b.getAttribute("aria-pressed"), "true");
          assert.equal(
            await p.evaluate(() => skyshiftInfrared.diagnostics().lens_active),
            false,
          );
          await p.evaluate(() => scrollTo(0, 0));
          await p.screenshot({ path: await claimEvidenceFile(evidenceFile(evidenceRun,out + `/home-${width}.png` ))});
          await p.locator('.site-navigation [href="#compare"]').click();
          await science(p);
          const selector = await p
            .locator("#instrument-field-select")
            .boundingBox();
          assert.ok(
            selector.width >= 200,
            "sky-region names must remain readable beside the status badge",
          );
          assert.equal(
            await p.evaluate(
              () => document.documentElement.scrollWidth - innerWidth,
            ),
            0,
          );
          await p.screenshot({ path: await claimEvidenceFile(evidenceFile(evidenceRun,out + `/science-${width}.png` ))});
        } finally {
          await c.close();
        }
      },
    );
  await check(
    "Reduced motion disables lens, parallax, entrance/orbit animations, smoothing and date blending while preserving preview controls",
    async () => {
      const { c, p } = await context({ reducedMotion: "reduce" });
      try {
        await home(p);
        await p.mouse.move(810, 300);
        assert.equal(
          await p.evaluate(() => skyshiftInfrared.diagnostics().lens_active),
          false,
        );
        assert.equal(
          await p.evaluate(() => skyshiftInfrared.diagnostics().smooth_scroll),
          false,
        );
        assert.equal(
          await p
            .locator(".observatory-rings")
            .evaluate((e) => getComputedStyle(e).animationName),
          "none",
        );
        await p.locator(".field-reveal-toggle").first().click();
        assert.equal(
          await p
            .locator(".field-reveal-toggle")
            .first()
            .getAttribute("aria-pressed"),
          "true",
        );
        await p.locator('.site-navigation [href="#compare"]').click();
        await science(p);
        await p.locator("[data-compare=single]").click();
        await p.locator("#instrument-dates button").nth(1).click();
        assert.equal(await p.locator(".date-transition-wrap").count(), 0);
      } finally {
        await c.close();
      }
    },
  );
  await check(
    "Missing animation library leaves the 3D hero, observations, preview buttons and native scrolling usable",
    async () => {
      const { c, p } = await context();
      try {
        await p.route("**/vendor/scroll/gsap.min.js", (r) =>
          r.fulfill({ status: 404, body: "" }),
        );
        await home(p);
        await p.locator(".field-reveal-toggle").first().click();
        await p.locator('.site-navigation [href="#compare"]').click();
        await science(p);
        assert.match(
          await p.locator("#instrument-suitability").textContent(),
          /PENDING/,
        );
      } finally {
        await c.close();
      }
    },
  );
  await check(
    "Direct scientific route requests neither optional 3D nor animation libraries",
    async () => {
      const { c, p } = await context();
      try {
        const urls = [];
        p.on("request", (r) => urls.push(r.url()));
        await p.goto("http://localhost:3000/#compare");
        await science(p);
        await p.waitForFunction(() => window.skyshiftInfrared);
        assert.deepEqual(
          urls.filter((u) =>
            /three|space-scene|gsap|ScrollTrigger|lenis/.test(u),
          ),
          [],
        );
      } finally {
        await c.close();
      }
    },
  );
  assert.deepEqual(errors, []);
  assert.deepEqual(external, []);
} catch (e) {
  console.error(e.stack);
  process.exitCode = 1;
} finally {
  await writeEvidenceFile(evidenceFile(evidenceRun,`docs/evidence/infrared_experience_tests${suffix ? "_" + suffix : ""}.json`),
    JSON.stringify(
      {
        recorded_at_utc: new Date().toISOString(),
        browser: browser.version(),
        results,
        page_errors: errors,
        external_requests: external,
        limits: [
          "Display effects are not measured infrared calibration or visible-light comparisons",
          "Mobile tests are emulated",
          "User visual acceptance unclaimed",
          "Qualified scientific approval and internal human review PENDING",
          "Independent novice validation NOT CONDUCTED",
        ],
      },
      null,
      2,
    ) + "\n",
  );
  await browser.close();
}
