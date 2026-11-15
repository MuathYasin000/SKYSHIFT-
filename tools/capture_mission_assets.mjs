// User-requested application assets: real UI and existing 3D renderers only.
// No synthetic astronomy, recording, video or external rendering service.
import fs from "node:fs/promises";
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
const p = await browser.newPage({
  viewport: { width: 1920, height: 1008 },
  reducedMotion: "reduce",
});
try {
  await p.goto("http://localhost:3000/");
  await p.waitForFunction(
    () => window.skyshiftHero?.diagnostics().model?.frames > 0,
  );
  await p.evaluate(() => document.fonts.ready);
  await p.setViewportSize({ width: 1200, height: 630 });
  // A dedicated OG layout of the same live hero, not a photographic telescope.
  await p.addStyleTag({
    content: `
 .site-header,.site-footer,.intro-actions,.intro-note,.vision-controls,.hero-model-controls,.hero-mission-link,.hero-hud,.orbit-point{display:none}
 #home-view .observatory-hero{padding:40px;min-height:630px;height:630px;gap:24px}
 .observatory-hero h1{font-size:72px;margin-block:24px}.observatory-hero .intro-lead{font-size:16px}
 #home-view .hero-observatory{height:450px;margin:0}.hero-model-canvas{inset:0 0 64px;height:calc(100% - 64px)}
 .hero-observatory::after{inset:0 0 64px}.hero-observatory figcaption{bottom:0}
 .observatory-hero>.spectrum-caption{position:absolute;bottom:14px;left:40px;margin:0}.spectrum-caption small{display:none}
 .hero-spectrum{inset:auto 40px 42px;height:48px}.observatory-lettering{font-size:140px;left:0;top:80px}
 `,
  });
  await p.evaluate(async () => {
    document.querySelector(".intro-copy>.eyebrow").textContent =
      "SKYSHIFT / SPHEREx OBSERVATION EXPLORER";
    await new Promise((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(resolve)),
    );
  });
  await p.screenshot({ path: "tmp/mission-control/og-source.png" });
  await p.setViewportSize({ width: 512, height: 384 });
  await p.goto("http://localhost:3000/");
  await p.evaluate(async () => {
    const { createSpaceScene } = await import("./space-scene.js");
    const { readPreferences } = await import("./space-preferences.js");
    const assets = (await (await fetch("./assets/space/manifest.json")).json())
      .assets;
    const canvas = document.createElement("canvas");
    canvas.id = "thumbnail-capture";
    canvas.style.cssText =
      "position:fixed;inset:0;width:512px;height:384px;z-index:9999;filter:grayscale(1)";
    document.body.append(canvas);
    window.captureScene = createSpaceScene(canvas, {
      assets,
      fields: [],
      onSelect() {},
      onStatus() {},
      onError(e) {
        throw Error(e);
      },
      preferences: { ...readPreferences(), effects: false },
    });
  });
  for (const id of ["spherex", "webb-b", "hubble"]) {
    await p.evaluate(async (id) => {
      await Promise.race([
        captureScene.showHardware(id),
        new Promise((_, reject) =>
          setTimeout(() => reject(Error("Model capture timeout")), 25000),
        ),
      ]);
      captureScene.observe(id, 0);
    }, id);
    await p.waitForFunction(
      (id) =>
        captureScene.diagnostics().active_hardware === id &&
        captureScene.diagnostics().frames > 0,
      id,
    );
    await p.evaluate(
      () =>
        new Promise((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(resolve)),
        ),
    );
    await p
      .locator("#thumbnail-capture")
      .screenshot({ path: `tmp/mission-control/${id}-source.png` });
  }
  await fs.writeFile(
    "tmp/mission-control/capture-record.json",
    JSON.stringify(
      {
        captured_at_utc: new Date().toISOString(),
        browser: browser.version(),
        og_viewport: [1200, 630],
        thumbnail_viewport: [512, 384],
        method:
          "Actual local hero in a dedicated OG CSS layout and existing createSpaceScene renderer; grayscale display; original source assets unchanged; illustrative models, no live tracking.",
      },
      null,
      2,
    ) + "\n",
  );
} finally {
  await browser.close();
}
