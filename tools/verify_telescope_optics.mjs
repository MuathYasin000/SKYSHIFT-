import {createEvidenceDirectory,evidenceFile,writeEvidenceFile,claimEvidenceFile} from './evidence-output.mjs';
const evidenceRun=await createEvidenceDirectory('verify_telescope_optics',process.env.SKYSHIFT_EVIDENCE_OUTPUT);
// Isolated localhost checks. Geometry agreement is not an optical calibration.
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
const out = evidenceRun,
  results = [],
  errors = [],
  external = [];

const browser = await chromium.launch({
  headless: true,
  executablePath:
    process.env.SKYSHIFT_CHROMIUM_EXECUTABLE ||
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
});
async function context(options = {}) {
  const c = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    ...options,
  });
  await c.route("**/*", (r) => {
    const u = new URL(r.request().url());
    if (u.hostname === "localhost" || u.protocol === "blob:")
      return r.continue();
    external.push(u.href);
    return r.abort();
  });
  const p = await c.newPage();
  p.setDefaultTimeout(25000);
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
async function universe(p) {
  await p.goto("http://localhost:3000/#universe");
  await p.waitForFunction(() => window.skyshiftSpace?.diagnostics().frames > 0);
  await p.locator("#hangar-toggle").click();
  await p.waitForFunction(
    () => skyshiftSpace.diagnostics().loaded_telescopes.length === 3,
  );
}
async function check(name, action) {
  try {
    const detail = await action();
    results.push({ name, status: "pass", detail });
    console.log("PASS " + name);
  } catch (e) {
    results.push({ name, status: "fail", error: e.message });
    throw e;
  }
}
try {
  const { c, p } = await context();
  await universe(p);
  await check(
    "Decoded detailed Webb retains source triangle topology and world bounds within Draco quantization tolerance; Hubble opening is clear",
    async () => {
      const raw = await fs.readFile("data/raw/context-assets/webb-a.glb");
      const audit = await p.evaluate(async (original) => {
        const T = await import("./vendor/three/three.module.js"),
          { GLTFLoader } = await import("./vendor/three/GLTFLoader.js"),
          { DRACOLoader } = await import("./vendor/three/DRACOLoader.js"),
          { refineObservatory } = await import("./observatory-hardware.js");
        const draco = new DRACOLoader().setDecoderPath("./vendor/three/draco/");
        const loader = new GLTFLoader().setDRACOLoader(draco);
        const load = async (b) => (await loader.parseAsync(b, "")).scene;
        const stats = (root) => {
          root.updateMatrixWorld(true);
          let meshes = 0,
            triangles = 0,
            uv = 0;
          root.traverse((o) => {
            if (o.isMesh) {
              meshes++;
              triangles +=
                (o.geometry.index?.count ||
                  o.geometry.attributes.position.count) / 3;
              if (o.geometry.attributes.uv) uv++;
            }
          });
          const b = new T.Box3().setFromObject(root, true);
          return {
            meshes,
            triangles,
            uv,
            min: b.min.toArray(),
            max: b.max.toArray(),
          };
        };
        const a = await load(
            Uint8Array.from(atob(original), (x) => x.charCodeAt(0)).buffer,
          ),
          b = await load(
            await (await fetch("./assets/space/webb-detail.glb")).arrayBuffer(),
          );
        const h = await load(
          await (await fetch("./assets/space/hubble.glb")).arrayBuffer(),
        );
        const hubbleRefinement = refineObservatory(h, "hubble");
        h.updateMatrixWorld(true);
        const hits = [];
        for (let i = 0; i < 9; i++) {
          const angle = (i * Math.PI) / 4,
            r = i === 8 ? 0 : 45 * 0.72,
            x = Math.cos(angle) * r,
            z = Math.sin(angle) * r;
          const ray = new T.Raycaster(
            new T.Vector3(x, 400, z),
            new T.Vector3(0, -1, 0),
          );
          const hit = ray.intersectObject(h, true)[0];
          hits.push({
            x,
            z,
            y: hit?.point.y ?? null,
            name: hit?.object.name ?? null,
          });
        }
        b.updateMatrixWorld(true);
        b.traverse((o) => {
          if (o.material) o.material.side = T.DoubleSide;
        });
        const webbHits = [];
        for (let i = 0; i < 8; i++) {
          const angle = (i * Math.PI) / 4,
            r = 2.95 * 0.72,
            y = 6.2746 + Math.cos(angle) * r,
            z = Math.sin(angle) * r;
          const ray = new T.Raycaster(
            new T.Vector3(12, y, z),
            new T.Vector3(-1, 0, 0),
          );
          const hit = ray.intersectObject(b, true)[0];
          webbHits.push({
            x: hit?.point.x ?? null,
            material: hit?.object.material.name ?? null,
          });
        }
        const result = {
          original: stats(a),
          optimized: stats(b),
          hubbleRefinement,
          hubble_ray_hits: hits,
          webb_ray_hits: webbHits,
        };
        const dispose = (root) =>
          root.traverse((o) => {
            o.geometry?.dispose();
            const ms = Array.isArray(o.material) ? o.material : [o.material];
            for (const m of ms)
              if (m) {
                for (const v of Object.values(m)) if (v?.isTexture) v.dispose();
                m.dispose();
              }
          });
        dispose(a);
        dispose(b);
        dispose(h);
        draco.dispose();
        return result;
      }, raw.toString("base64"));
      await writeEvidenceFile(evidenceFile(evidenceRun,out + "/geometry-audit.json"),
        JSON.stringify(audit, null, 2),
      );
      assert.equal(audit.original.triangles, 493785);
      assert.equal(audit.optimized.triangles, 493785);
      assert.equal(audit.optimized.meshes, 54);
      for (const key of ["min", "max"])
        for (let i = 0; i < 3; i++)
          assert.ok(
            Math.abs(audit.original[key][i] - audit.optimized[key][i]) < 0.002,
            JSON.stringify(audit),
          );
      assert.equal(audit.hubbleRefinement.removed_cover_triangles, 96);
      for (const h of audit.hubble_ray_hits)
        assert.ok(h.y !== null && h.y < 258, JSON.stringify(h));
      assert.equal(
        audit.webb_ray_hits.filter((h) => /mirror_blinn$/.test(h.material))
          .length,
        7,
      );
      assert.match(audit.webb_ray_hits[0].material, /carbonfiber$/);
      for (const h of audit.webb_ray_hits.slice(1))
        assert.ok(Math.abs(h.x - 1.055) < 0.4);
      return audit;
    },
  );
  await check(
    "All three telescope beams enter their own aperture; colours and camera orbit cannot change the model direction",
    async () => {
      const detail = [];
      for (const id of ["webb-b", "hubble", "spherex"]) {
        await p.locator(`[data-telescope="${id}"]`).click();
        await p.waitForTimeout(1100);
        let d = await p.evaluate(() => skyshiftSpace.diagnostics());
        assert.deepEqual(d.visible_hardware, [id]);
        const e = d.observing,
          f = d.optical_frames[id];
        assert.ok(e.diagram_visible);
        assert.equal(e.rays.length, 8);
        assert.deepEqual(e.origin, f.origin);
        assert.deepEqual(e.outward, f.outward);
        for (const ray of e.rays) {
          const delta = ray.end.map((n, i) => n - ray.start[i]),
            length = Math.hypot(...delta);
          assert.ok(
            delta.reduce((v, n, i) => v + (n / length) * f.outward[i], 0) <
              -0.999999,
          );
        }
        if (id === "webb-b") assert.ok(f.outward[2] > 0.999999);
        if (id === "webb-b")
          assert.equal(e.rays.filter((r) => r.blocked).length, 1);
        if (id === "hubble") assert.deepEqual(f.outward, [0, 1, 0]);
        if (id === "spherex") {
          assert.ok(f.outward[0] < 0);
          assert.ok(Math.abs(f.outward[1] - Math.cos(0.1)) < 1e-8);
        }
        await p.locator("#universe").focus();
        await p.keyboard.press("ArrowRight");
        await p.keyboard.press("ArrowUp");
        assert.deepEqual(
          (await p.evaluate(() => skyshiftSpace.diagnostics())).optical_frames[
            id
          ],
          f,
        );
        await p.locator('[data-observe-stage="1"]').click();
        const before = (await p.evaluate(() => skyshiftSpace.diagnostics()))
          .observing.rays;
        await p.locator("[data-channel]").last().click();
        assert.deepEqual(
          (await p.evaluate(() => skyshiftSpace.diagnostics())).observing.rays,
          before,
        );
        detail.push({ id, frame: f, refinement: d.hardware_refinements });
        await p.screenshot({ path: await claimEvidenceFile(evidenceFile(evidenceRun,`${out}/${id}-verified.png` ))});
      }
      return detail;
    },
  );
  await check(
    "Each internal schematic has four distinct explanations, an accessible expanded dialog and original credited published pixels",
    async () => {
      for (const id of ["webb-b", "hubble", "spherex"]) {
        if (!(await p.locator(`[data-telescope="${id}"]`).isVisible()))
          await p.locator("#hangar-toggle").click();
        await p.locator(`[data-telescope="${id}"]`).click();
        await p.locator('[data-observe-stage="1"]').click();
        for (let step = 1; step <= 4; step++) {
          assert.match(
            await p.locator("#optics-step-description").innerText(),
            new RegExp("^" + step + " / 4"),
          );
          await p.locator("#optics-next").click();
        }
        await p.locator("#optics-expand").click();
        assert.equal(
          await p.locator("#optics-dialog").evaluate((e) => e.open),
          true,
        );
        await p.locator("#optics-dialog-next").click();
        assert.match(
          await p.locator("#optics-expanded-description").innerText(),
          /^2 \/ 4/,
        );
        await p.evaluate(await fs.readFile("tools/vendor/axe.min.js", "utf8"));
        const accessibility = await p.evaluate(async () => {
          const r = await axe.run(document, {
            runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] },
          });
          return r.violations.map((v) => ({
            id: v.id,
            targets: v.nodes.map((n) => n.target),
          }));
        });
        assert.deepEqual(accessibility, []);
        await p.screenshot({ path: await claimEvidenceFile(evidenceFile(evidenceRun,`${out}/${id}-optics-expanded.png` ))});
        await p.keyboard.press("Escape");
        assert.equal(
          await p.locator("#optics-dialog").evaluate((e) => e.open),
          false,
        );
        await p.locator('[data-observe-stage="2"]').click();
        await p.locator("#mission-image:not([hidden])").waitFor();
        const d = await p.evaluate(() => skyshiftSpace.diagnostics());
        assert.equal(d.observing.diagram_visible, false);
        assert.equal(d.observing.published_image_visible, false);
        assert.equal(await p.locator("#mission-optics").isVisible(), false);
        assert.ok(
          (
            await p.locator("#mission-image-source").getAttribute("href")
          ).startsWith("https://"),
        );
        const published = await p
          .locator("#mission-image")
          .evaluate(async (e) => {
            const b = await (await fetch(e.src)).arrayBuffer();
            return {
              bytes: b.byteLength,
              hash: Array.from(
                new Uint8Array(await crypto.subtle.digest("SHA-256", b)),
                (x) => x.toString(16).padStart(2, "0"),
              ).join(""),
            };
          });
        const cat = JSON.parse(
          await fs.readFile("web/dist/assets/assets.json", "utf8"),
        );
        assert.ok(cat.assets.some((a) => a.sha256 === published.hash));
      }
    },
  );
  await c.close();
  await check(
    "Low quality uses original NASA B with its correct aperture; reduced motion and effects-off stop animation",
    async () => {
      const { c, p } = await context({ reducedMotion: "reduce" });
      try {
        await c.addInitScript(() =>
          localStorage.setItem(
            "skyshift.space.preferences.v1",
            JSON.stringify({ quality: "low", effects: true }),
          ),
        );
        await universe(p);
        await p.locator('[data-telescope="webb-b"]').click();
        await p.waitForTimeout(300);
        const d = await p.evaluate(() => skyshiftSpace.diagnostics());
        assert.ok(d.assets_loaded.includes("webb-b"));
        assert.ok(!d.assets_loaded.includes("webb-detail"));
        assert.equal(d.observing.motion, false);
        assert.ok(d.optical_frames["webb-b"].outward[2] > 0.99999);
        const before = d.frames;
        await p.waitForTimeout(300);
        assert.equal(
          (await p.evaluate(() => skyshiftSpace.diagnostics())).frames,
          before,
        );
        await p.locator("#settings-button").click();
        await p.locator("#effects-toggle").uncheck();
        await p.locator("#quality-select").selectOption("auto");
        await p.locator("#settings-dialog [data-close-dialog]").click();
        assert.equal(
          (await p.evaluate(() => skyshiftSpace.diagnostics())).observing
            .diagram_visible,
          false,
        );
        await p.locator('[data-telescope="webb-b"]').click();
        assert.match(
          await p.locator("#context-source").getAttribute("href"),
          /james-webb-space-telescope-b/,
        );
        return { quality: "low", model: "NASA B", stationary_frames: before };
      } finally {
        await c.close();
      }
    },
  );
  await check(
    "Delayed or failed detailed Webb never substitutes an unaligned beam and does not block direct scientific access",
    async () => {
      const { c, p } = await context();
      let release;
      const hold = new Promise((r) => (release = r));
      try {
        await p.route("**/assets/space/webb-detail.glb", async (r) => {
          await hold;
          await r.fulfill({ status: 404, body: "" });
        });
        await p.goto("http://localhost:3000/#universe");
        await p.waitForFunction(
          () => window.skyshiftSpace?.diagnostics().frames > 0,
        );
        await p.locator("#hangar-toggle").click();
        await p.locator('[data-telescope="webb-b"]').click();
        assert.equal(
          (await p.evaluate(() => skyshiftSpace.diagnostics())).observing
            .diagram_visible,
          false,
        );
        release();
        await p.waitForFunction(() =>
          /could not load|unavailable|could not open|failed|retry/i.test(
            document.querySelector("#space-status").textContent,
          ),
        );
        assert.equal(
          (await p.evaluate(() => skyshiftSpace.diagnostics())).observing
            .diagram_visible,
          false,
        );
        await p.goto("http://localhost:3000/#compare");
        await p.waitForFunction(
          () =>
            window.skyshiftWebsite?.diagnostics().investigation.kind ===
              "pair" && !skyshiftWebsite.diagnostics().investigation.busy,
        );
      } finally {
        release();
        await c.close();
      }
    },
  );
  await check(
    "390 and 320 mobile layouts keep mission controls, enlarged diagrams and keyboard exit reachable",
    async () => {
      for (const width of [390, 320]) {
        const { c, p } = await context({
          viewport: { width, height: 844 },
          isMobile: true,
          hasTouch: true,
          reducedMotion: "reduce",
        });
        try {
          await universe(p);
          await p.locator('[data-telescope="hubble"]').tap();
          await p.locator('[data-observe-stage="1"]').tap();
          await p.locator("#optics-expand").tap();
          assert.equal(
            await p.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth,
            ),
            true,
          );
          const b = await p.locator("#optics-dialog").boundingBox();
          assert.ok(b.x >= 0 && b.x + b.width <= width + 1);
          await p.locator("#optics-dialog-next").tap();
          assert.match(
            await p.locator("#optics-expanded-description").innerText(),
            /^2 \/ 4/,
          );
          await p.screenshot({ path: await claimEvidenceFile(evidenceFile(evidenceRun,`${out}/hubble-optics-${width}.png` ))});
          await p.locator("#optics-dialog-close").tap();
          await p.locator("#mission-close").tap();
        } finally {
          await c.close();
        }
      }
    },
  );
  assert.deepEqual(errors, []);
  assert.deepEqual(external, []);
} catch (e) {
  console.error(e.stack);
  process.exitCode = 1;
} finally {
  await writeEvidenceFile(evidenceFile(evidenceRun,"docs/evidence/telescope_optics_tests.json"),
    JSON.stringify(
      {
        recorded_at_utc: new Date().toISOString(),
        browser: browser.version(),
        results,
        page_errors: errors,
        external_requests: external,
        limits: [
          "Illustrative optical paths; no flight pointing, field-of-view or focal prescriptions simulated",
          "PBR materials are appearance estimates, not measured BRDF",
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
