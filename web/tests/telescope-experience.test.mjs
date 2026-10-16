import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import crypto from "node:crypto";
import { telescopeStories } from "../dist/telescope-stories.js";
import { createObservationEffects } from "../dist/observation-effects.js";
import {
  PerspectiveCamera,
  Vector3,
} from "../dist/vendor/three/three.module.js";
import { soundCues, createSpaceAudio } from "../dist/space-audio.js";

test("mission stories identify different published targets and never simulate measured filters", async () => {
  assert.deepEqual(Object.keys(telescopeStories), [
    "spherex",
    "webb-b",
    "hubble",
  ]);
  const manifest = JSON.parse(
    await fs.readFile(new URL("../dist/assets/assets.json", import.meta.url)),
  );
  for (const story of Object.values(telescopeStories)) {
    const asset = manifest.assets.find((a) => a.id === story.imageId);
    assert.ok(asset);
    const bytes = await fs.readFile(
      new URL("../dist/assets/" + asset.file, import.meta.url),
    );
    assert.equal(
      crypto.createHash("sha256").update(bytes).digest("hex"),
      asset.sha256,
    );
    assert.equal(asset.is_skyshift_comparison_evidence, false);
    assert.match(
      story.source,
      /^https:\/\/(www\.jpl\.nasa\.gov|science\.nasa\.gov)\//,
    );
  }
  assert.match(telescopeStories.spherex.steps[1][1], /not a prism/);
  assert.match(telescopeStories["webb-b"].steps[2][1], /not a live feed/);
  assert.match(
    telescopeStories.hubble.steps[2][1],
    /not an aligned temporal comparison/,
  );
});
test("visible light diagrams respond to channel selection and stop animating when disabled or reduced", () => {
  const effect = createObservationEffects(),
    camera = new PerspectiveCamera();
  effect.configure(new Vector3(0, 0, 0), "#8cd9db", 1, 3);
  assert.equal(effect.update(500, camera), true);
  assert.equal(effect.diagnostics().channel, 3);
  effect.setEnabled(false);
  assert.equal(effect.update(500, camera), false);
  effect.setEnabled(true);
  effect.setMotion(false);
  assert.equal(effect.update(500, camera), false);
  effect.setMotion(true);
  effect.configure(new Vector3(), "#fff", 0, -1, "webb-b");
  assert.equal(effect.diagnostics().illustrative_spread, 0.45);
  effect.setImage({
    src: "synthetic-image-fixture",
    naturalWidth: 1600,
    naturalHeight: 800,
  });
  effect.configure(new Vector3(), "#fff", 2);
  assert.equal(effect.update(500, camera), false);
  assert.equal(effect.diagnostics().published_image_visible, true);
  effect.clearImage();
  effect.update(500, camera);
  assert.equal(effect.diagnostics().published_image_visible, false);
  effect.close();
  assert.equal(effect.diagnostics().open, false);
  effect.dispose();
});
test("interaction cues have distinct envelopes and pitches instead of a single reused beep", () => {
  assert.equal(
    new Set(Object.values(soundCues).map((s) => JSON.stringify(s))).size,
    Object.keys(soundCues).length,
  );
  for (const cue of Object.values(soundCues)) {
    assert.ok(cue.gain > 0 && cue.gain <= 0.12);
    for (const [frequency, delay, duration] of cue.notes) {
      assert.ok(frequency >= 100 && frequency <= 1000);
      assert.ok(delay >= 0 && delay < 0.3);
      assert.ok(duration > 0 && duration < 0.4);
    }
  }
});
test("sound requires opt-in, throttles bursts, varies spectrum pitch and suspends when muted", async () => {
  const originalDocument = globalThis.document;
  globalThis.document = { hidden: false };
  const played = [];
  let stamp = 0;
  class Audio {
    state = "suspended";
    currentTime = 0;
    destination = {};
    createGain() {
      return {
        gain: {
          value: 0,
          setTargetAtTime() {},
          setValueAtTime() {},
          linearRampToValueAtTime() {},
          exponentialRampToValueAtTime() {},
        },
        connect() {},
        disconnect() {},
      };
    }
    createOscillator() {
      return {
        frequency: {
          value: 0,
          setValueAtTime(v) {
            played.push(v);
          },
          exponentialRampToValueAtTime() {},
        },
        connect() {},
        disconnect() {},
        start() {},
        stop() {},
      };
    }
    async resume() {
      this.state = "running";
    }
    async suspend() {
      this.state = "suspended";
    }
    async close() {
      this.state = "closed";
    }
  }
  try {
    const audio = createSpaceAudio(
      { effects_volume: 0.3, ambience_volume: 0.08 },
      { Audio, now: () => stamp },
    );
    assert.equal(audio.cue("spherex"), false);
    assert.equal(played.length, 0);
    await audio.toggle();
    assert.equal(audio.cue("spherex"), true);
    assert.equal(audio.cue("hubble"), false);
    stamp += 100;
    audio.cue("hubble");
    stamp += 100;
    audio.cue("spectrum", 0);
    const lower = played.at(-1);
    stamp += 100;
    audio.cue("spectrum", 5);
    assert.ok(played.at(-1) > lower);
    await audio.toggle();
    stamp += 100;
    assert.equal(audio.cue("webb-b"), false);
    assert.equal(audio.diagnostics().context_state, "suspended");
    await audio.dispose();
  } finally {
    globalThis.document = originalDocument;
  }
});
