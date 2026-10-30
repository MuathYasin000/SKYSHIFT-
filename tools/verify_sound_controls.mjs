import {createEvidenceDirectory,evidenceFile,writeEvidenceFile,claimEvidenceFile} from './evidence-output.mjs';
const evidenceRun=await createEvidenceDirectory('verify_sound_controls',process.env.SKYSHIFT_EVIDENCE_OUTPUT);
// Real isolated browser controls + numeric Web Audio checks; no media output.
import fs from "node:fs/promises";
import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
const { chromium } = await import(
  pathToFileURL(
    process.env.SKYSHIFT_PLAYWRIGHT_MODULE ||
      "C:/Users/LOQ/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs",
  )
);
const suffix = process.env.SKYSHIFT_TEST_SUFFIX || "",
  testName = process.env.SKYSHIFT_TEST_NAME || "sound_controls",
  out = evidenceRun,
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
    acceptDownloads: true,
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
  p.setDefaultTimeout(20000);
  p.on("pageerror", (e) => errors.push(e.message));
  return { c, p };
}
async function ready(p, url = "") {
  await p.goto("http://localhost:3000/" + url);
  await p.waitForFunction(() => window.skyshiftSound && window.skyshiftWebsite);
  await p.waitForFunction(()=>!window.skyshiftArrival?.diagnostics().active);
}
async function science(p) {
  await p.waitForFunction(
    () =>
      window.skyshiftWebsite?.diagnostics().investigation.kind === "pair" &&
      !skyshiftWebsite.diagnostics().investigation.busy,
  );
}
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
async function axe(p) {
  await p.evaluate(await fs.readFile("tools/vendor/axe.min.js", "utf8"));
  return p.evaluate(async () => {
    const r = await axe.run(document, {
      runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] },
    });
    return r.violations.map((v) => ({
      id: v.id,
      targets: v.nodes.map((n) => n.target),
    }));
  });
}
try {
  await check('Reveal divider and keyboard slider emit bounded click ticks; scripted updates and saved mute stay silent',async()=>{
    const {c,p}=await context();try{
      await ready(p,'#sky-search');await p.waitForFunction(()=>window.skyshiftInfrared);
      let d=await p.evaluate(()=>skyshiftSound.diagnostics());assert.equal(d.enabled,true);assert.equal(d.context_state,'not_created');assert.deepEqual(d.recent_cues,[]);
      await p.locator('.intro-image').scrollIntoViewIfNeeded();
      const handle=await p.locator('.vela-divider span').boundingBox(),x=handle.x+handle.width/2,y=handle.y+handle.height/2;
      await p.mouse.move(x,y);await p.mouse.down();
      for(let i=1;i<=10;i++){await p.mouse.move(x+i*18,y);await p.waitForTimeout(75);}await p.mouse.up();
      d=await p.evaluate(()=>skyshiftSound.diagnostics());assert.equal(d.context_state,'running');assert.ok(d.recent_cues.filter(n=>n==='swipe_tick').length>=3);
      const before=d.recent_cues.filter(n=>n==='swipe_tick').length;
      await p.locator('#vela-reveal').focus();for(let i=0;i<8;i++){await p.keyboard.press('ArrowRight');await p.waitForTimeout(75);}
      d=await p.evaluate(()=>skyshiftSound.diagnostics());assert.ok(d.recent_cues.filter(n=>n==='swipe_tick').length>before);
      const count=d.recent_cues.length;
      await p.locator('#vela-reveal').evaluate(e=>{e.value='50';e.dispatchEvent(new Event('input',{bubbles:true}));});
      assert.equal((await p.evaluate(()=>skyshiftSound.diagnostics())).recent_cues.length,count);
      await p.evaluate(()=>scrollTo({top:0,behavior:'instant'}));await p.waitForTimeout(100);await p.locator('#site-sound').click();
      assert.equal((await p.evaluate(()=>skyshiftSound.diagnostics())).enabled,false);
      await p.locator('#vela-reveal').focus();for(let i=0;i<6;i++)await p.keyboard.press('ArrowRight');
      assert.equal((await p.evaluate(()=>skyshiftSound.diagnostics())).recent_cues.length,count);
      await p.reload();await p.waitForFunction(()=>window.skyshiftSound);d=await p.evaluate(()=>skyshiftSound.diagnostics());assert.equal(d.enabled,false);assert.equal(d.context_state,'not_created');
      return {pointer_and_keyboard_ticks:true,no_scripted_ticks:true,mute_persisted:true};
    }finally{await c.close();}
  });
  const { c, p } = await context();
  await check(
    "Default-on waits for a gesture, then ordinary controls start local audio without loading the Universe",
    async () => {
      await ready(p, "#compare");
      await science(p);
      let d = await p.evaluate(() => skyshiftSound.diagnostics());
      assert.equal(d.enabled, true);
      assert.equal(d.context_state, "not_created");
      await p.click("#instrument-zoom-in");
      assert.equal((await p.evaluate(()=>skyshiftSound.diagnostics())).enabled,true);
      await p.waitForTimeout(100);
      await p.locator("#instrument-zoom-in").focus();
      await p.keyboard.press("Enter");
      await p.waitForFunction(
        () => skyshiftSound.diagnostics().context_state === "running",
      );
      d = await p.evaluate(() => skyshiftSound.diagnostics());
      assert.equal(d.last_cue, "zoom");
      assert.equal(d.ambience_allowed, false);
      assert.equal(
        await p.evaluate(() => Boolean(window.skyshiftSpace)),
        false,
      );
      return d;
    },
  );
  await check(
    "Save cue follows successful export; comparison, date and panel actions use separate sound identities",
    async () => {
      await p.waitForTimeout(100);
      await p.click('[data-compare="wipe"]');
      assert.equal(
        (await p.evaluate(() => skyshiftSound.diagnostics())).last_cue,
        "compare",
      );
      await p.waitForTimeout(100);
      await p.locator("#instrument-dates button").nth(1).click();
      assert.equal(
        (await p.evaluate(() => skyshiftSound.diagnostics())).last_cue,
        "date",
      );
      await p.waitForTimeout(100);
      const download = p.waitForEvent("download");
      await p.click("#instrument-save");
      await (await download).saveAs(await claimEvidenceFile(evidenceFile(evidenceRun,out + "/comparison.zip")));
      assert.equal(
        (await p.evaluate(() => skyshiftSound.diagnostics())).last_cue,
        "save",
      );
      await p
        .locator("#instrument-file")
        .setInputFiles(out + "/comparison.zip");
      await science(p);
      await p.screenshot({ path: await claimEvidenceFile(evidenceFile(evidenceRun,out + "/comparison.png" ))});
    },
  );
  await check(
    "Mute works immediately, survives navigation/reload and prevents gesture-based restart",
    async () => {
      await p.click("#site-sound");
      await p.waitForFunction(
        () => skyshiftSound.diagnostics().enabled === false,
      );
      assert.equal(
        (await p.evaluate(() => skyshiftSound.diagnostics()))
          .active_voice_count,
        0,
      );
      await p.reload();
      await science(p);
      await p.click("#instrument-zoom-in");
      const d = await p.evaluate(() => skyshiftSound.diagnostics());
      assert.equal(d.enabled, false);
      assert.equal(d.context_state, "not_created");
      await p.click("#site-sound");
      await p.waitForFunction(
        () => skyshiftSound.diagnostics().context_state === "running",
      );
      await p.waitForTimeout(1100);
      assert.equal(
        (await p.evaluate(() => skyshiftSound.diagnostics()))
          .active_voice_count,
        0,
      );
      return { muted_reload_context: d.context_state, voices_after_decay: 0 };
    },
  );
  await check(
    "Sound palette offers editable volumes, distinct real playback and an accessible keyboard-dismissable dialog",
    async () => {
      await p.click("#site-more");
      await p.click("[data-open-sound]:visible");
      await p.locator("#sound-settings[open]").waitFor();
      assert.deepEqual(await axe(p), []);
      assert.equal(await p.locator("#sound-air").count(), 0);
      for (const id of ["sound-fx"]) {
        await p.locator("#" + id).fill("0.2");
        await p.locator("#" + id).dispatchEvent("input");
      }
      for (const name of [
        "ui",
        "component",
        "travel",
        "spherex",
        "webb-b",
        "hubble",
        "spectrum",
        "save",
      ]) {
        await p.waitForTimeout(75);
        await p.click(`[data-preview-sound="${name}"]`);
        await p.waitForFunction(
          (n) => skyshiftSound.diagnostics().last_cue === n,
          name,
        );
      }
      await p.screenshot({ path: await claimEvidenceFile(evidenceFile(evidenceRun,out + "/sound-palette.png" ))});
      await p.keyboard.press("Escape");
      assert.equal(
        await p.locator("#sound-settings").evaluate((e) => e.open),
        false,
      );
      const prefs = await p.evaluate(() =>
        JSON.parse(localStorage.getItem("skyshift.space.preferences.v1")),
      );
      assert.equal(prefs.effects_volume, 0.2);
      assert.equal(
        (await p.evaluate(() => skyshiftSound.diagnostics())).ambience_allowed,
        false,
      );
    },
  );
  await check(
    "One audio context follows Universe and telescope selection; muting there also mutes the main website",
    async () => {
      await p.click('.site-navigation [data-route="universe"]');
      await p.waitForFunction(
        () => window.skyshiftSpace?.diagnostics().frames > 0,
      );
      assert.equal(
        await p.locator("#site-sound").getAttribute("aria-pressed"),
        "true",
      );
      await p.click("#hangar-toggle");
      await p.waitForFunction(
        () => skyshiftSpace.diagnostics().loaded_telescopes.length === 3,
      );
      await p.waitForTimeout(100);
      await p.click('[data-telescope="hubble"]');
      assert.equal(
        (await p.evaluate(() => skyshiftSound.diagnostics())).last_cue,
        "hubble",
      );
      assert.deepEqual(
        await p.evaluate(() => skyshiftSound.diagnostics()),
        await p.evaluate(() => skyshiftSpace.audio()),
      );
      await p.screenshot({ path: await claimEvidenceFile(evidenceFile(evidenceRun,out + "/universe.png" ))});
      await p.click("#site-sound");
      await p.waitForFunction(() => !skyshiftSound.diagnostics().enabled);
      await p.click(".site-brand");
      assert.equal(
        await p.locator("#site-sound").getAttribute("aria-pressed"),
        "false",
      );
      assert.equal(
        (await p.evaluate(() => skyshiftSound.diagnostics())).context_state,
        "suspended",
      );
    },
  );
  await check(
    "Actual synthesis has nonzero, unclipped, distinct numerical signals for all 26 interaction cues",
    async () => {
      const signal = await p.evaluate(async () => {
        const { createSpaceAudio, soundCues } = await import(
            "./space-audio.js"
          ),
          out = [];
        for (const name of Object.keys(soundCues)) {
          // OfflineAudioContext produces ephemeral sample arrays only: no WAV, recording or media artifact.
          let ctx;
          const audio = createSpaceAudio(
            { sound_enabled:true, effects_volume: 0.5, ambience_volume: 0 },
            {
              Audio: class {
                constructor() {
                  ctx = new OfflineAudioContext(1, 48000 * 2, 48000);
                  ctx.resume = async () => {};
                  return ctx;
                }
              },
            },
          );
          await audio.unlock(); // Offline context is suspended by design; use the same graph with its scheduling guard.
          Object.defineProperty(ctx, "state", {
            get: () => "running",
            configurable: true,
          });
          audio.cue(name);
          const b = await ctx.startRendering(),
            data = b.getChannelData(0);
          let peak = 0,
            energy = 0,
            tail = 0,
            finite = true,
            signature = 0;
          for (let i = 0; i < data.length; i++) {
            finite &&= Number.isFinite(data[i]);
            peak = Math.max(peak, Math.abs(data[i]));
            energy += data[i] * data[i];
            if (i > data.length - 4800) tail += data[i] * data[i];
            if (i % 97 === 0) signature += data[i] * (i % 131);
          }
          out.push({
            name,
            peak,
            rms: Math.sqrt(energy / data.length),
            tail_rms: Math.sqrt(tail / 4800),
            finite,
            signature: Number(signature.toFixed(8)),
          });
        }
        return out;
      });
      assert.equal(signal.length, 26);
      for (const s of signal) {
        assert.ok(s.finite);
        assert.ok(s.peak > 0.0001 && s.peak < 0.5, JSON.stringify(s));
        assert.ok(s.rms > 0.00001);
        assert.ok(s.tail_rms < 0.00001, JSON.stringify(s));
      }
      assert.equal(new Set(signal.map((s) => s.signature)).size, 26);
      return {
        signals: signal,
        limits:
          "Numerical signal checks; no claim of human listening or subjective audio quality.",
      };
    },
  );
  await c.close();
  await check(
    "Mission-control hero action has its requested red/black surface, readable text and a direct keyboard route to real observations",
    async () => {
      const { c, p } = await context();
      try {
        await ready(p);
        await p.waitForFunction(
          () => window.skyshiftHero?.diagnostics().model?.frames > 0,
        );
        await p.evaluate(() => document.fonts.ready);
        const hero = p.locator(".mission-launch");
        assert.equal(await hero.getAttribute("href"), "#compare");
        assert.equal(await p.locator(".hero-spectrum [data-spectrum] i").count(), 102);
        const style = await hero.evaluate((e) => ({
          fill: getComputedStyle(e).backgroundColor,
          ink: getComputedStyle(e).color,
        }));
        assert.equal(style.fill, "rgb(252, 61, 33)");
        assert.ok(
          !style.fill.includes("231, 242, 247"),
          "Rejected pale-blue generic fill",
        );
        assert.equal(style.ink, "rgb(0, 0, 0)");
        assert.deepEqual(await axe(p), []);
        await p.screenshot({ path: await claimEvidenceFile(evidenceFile(evidenceRun,out + "/hero-desktop.png" ))});
        await hero.focus();
        await p.keyboard.press("Enter");
        await science(p);
        return style;
      } finally {
        await c.close();
      }
    },
  );
  await check(
    "320/390/1024 layouts show reachable sound controls and readable button states without horizontal overflow",
    async () => {
      const details = [];
      for (const width of [320, 390, 1024]) {
        const { c, p } = await context({
          viewport: { width, height: 900 },
          hasTouch: true,
          isMobile: width < 800,
          reducedMotion: "reduce",
        });
        try {
          await ready(p);
          await p.evaluate(() => document.fonts.ready);
          assert.deepEqual(await axe(p), []);
          await p.screenshot({ path: await claimEvidenceFile(evidenceFile(evidenceRun,`${out}/home-${width}.png` ))});
          assert.equal(
            await p.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth,
            ),
            true,
          );
          for (const id of ["site-sound", "site-more"]) {
            const b = await p.locator("#" + id).boundingBox();
            assert.ok(
              b.x >= 0 &&
                b.x + b.width <= width &&
                b.width >= 44 &&
                b.height >= 44,
              JSON.stringify(b),
            );
          }
          const sound = await p.locator("#site-sound").boundingBox(),
            more = await p.locator("#site-more").boundingBox();
          assert.ok(sound.x + sound.width <= more.x + 1);
          assert.ok(
            Math.abs(sound.y - more.y) < 2,
            "Sound belongs in the same header row as More",
          );
          await p.click("#site-more");
          await p.click("[data-open-sound]:visible");
          assert.deepEqual(await axe(p), []);
          await p.screenshot({ path: await claimEvidenceFile(evidenceFile(evidenceRun,`${out}/palette-${width}.png` ))});
          await p.locator("#sound-settings-close").click();
          await p.goto("http://localhost:3000/#compare");
          await science(p);
          assert.equal(
            await p.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth,
            ),
            true,
          );
          assert.deepEqual(await axe(p), []);
          const header = await p.locator("#site-header").boundingBox(),
            actions = await p
              .locator(".instrument-header > .instrument-actions")
              .boundingBox();
          assert.ok(
            actions.y >= header.y + header.height - 1,
            "Scientific actions must clear the sticky header",
          );
          await p.screenshot({ path: await claimEvidenceFile(evidenceFile(evidenceRun,`${out}/compare-${width}.png` ))});
          details.push({
            width,
            layout: "pass",
            automated_accessibility: "pass",
          });
        } finally {
          await c.close();
        }
      }
      return details;
    },
  );
  await check(
    "Unavailable audio and denied storage preserve silent scientific access and export",
    async () => {
      const { c, p } = await context();
      try {
        await p.addInitScript(() => {
          Object.defineProperty(window, "AudioContext", { value: undefined });
          Object.defineProperty(window, "webkitAudioContext", {
            value: undefined,
          });
          Object.defineProperty(window, "localStorage", {
            get() {
              throw Error("synthetic denied storage");
            },
          });
        });
        await ready(p, "#compare");
        await science(p);
        await p.click("#instrument-zoom-in");
        await p.click("#site-sound");
        await p.click("#site-more");
        await p.click("[data-open-sound]:visible");
        await p.click('[data-preview-sound="hubble"]');
        assert.match(
          await p.locator("#sound-status").innerText(),
          /unavailable|blocked/,
        );
        await p.click("#sound-settings-close");
        const download = p.waitForEvent("download");
        await p.click("#instrument-save");
        await (await download).saveAs(await claimEvidenceFile(evidenceFile(evidenceRun,out + "/audio-unavailable.zip")));
        assert.equal(
          (await p.evaluate(() => skyshiftWebsite.diagnostics())).investigation
            .kind,
          "pair",
        );
      } finally {
        await c.close();
      }
    },
  );
  await check(
    "A missing optional sound module cannot block scientific startup or exporting",
    async () => {
      const { c, p } = await context();
      try {
        await p.route("**/application-sound.js", (r) =>
          r.fulfill({ status: 404, body: "" }),
        );
        await p.goto("http://localhost:3000/#compare");
        await science(p);
        await p.waitForFunction(
          () => document.getElementById("site-sound").disabled,
        );
        await p.click("#instrument-zoom-in");
        const download = p.waitForEvent("download");
        await p.click("#instrument-save");
        await (await download).saveAs(await claimEvidenceFile(evidenceFile(evidenceRun,out + "/sound-module-unavailable.zip")));
        assert.equal(
          (await p.evaluate(() => skyshiftWebsite.diagnostics())).investigation
            .kind,
          "pair",
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
  await writeEvidenceFile(evidenceFile(evidenceRun,`docs/evidence/${testName}_tests${suffix ? "_" + suffix : ""}.json`),
    JSON.stringify(
      {
        recorded_at_utc: new Date().toISOString(),
        browser: browser.version(),
        results,
        page_errors: errors,
        external_requests: external,
        limits: [
          "Original interface sound design, not telescope recordings or scientific sonification",
          "No human listening/subjective acceptance claimed",
          "Mobile emulated; automated accessibility rules are not a manual audit",
          "Qualified scientific approval and internal human review PENDING; independent novice validation NOT CONDUCTED",
        ],
      },
      null,
      2,
    ) + "\n",
  );
  await browser.close();
}
