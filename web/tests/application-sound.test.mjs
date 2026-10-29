import test from "node:test";
import assert from "node:assert/strict";
import {
  soundCues,
  createSpaceAudio,
  sineEnvelope,
} from "../dist/space-audio.js";
import { soundForControl } from "../dist/application-sound.js";
class Param {
  value = 0;
  values = [];
  setValueAtTime(v) {
    this.values.push(v);
  }
  setTargetAtTime(v) {
    this.values.push(v);
  }
  linearRampToValueAtTime(v) {
    this.values.push(v);
  }
  exponentialRampToValueAtTime(v) {
    this.values.push(v);
  }
  setValueCurveAtTime(v) {
    this.values.push(v);
  }
}
class Audio {
  state = "suspended";
  currentTime = 0;
  sampleRate = 8000;
  destination = {};
  osc = [];
  sources = [];
  node() {
    return { connect() {}, disconnect() {}, start() {}, stop() {} };
  }
  createGain() {
    return { ...this.node(), gain: new Param() };
  }
  createDynamicsCompressor() {
    return {
      ...this.node(),
      ...Object.fromEntries(
        ["threshold", "knee", "ratio", "attack", "release"].map((k) => [
          k,
          new Param(),
        ]),
      ),
    };
  }
  createBiquadFilter() {
    return { ...this.node(), frequency: new Param(), Q: new Param() };
  }
  createConvolver() {
    return this.node();
  }
  createBuffer(channels, length) {
    const data = new Float32Array(length);
    return { getChannelData: () => data };
  }
  createBufferSource() {
    const n = this.node();
    this.sources.push(n);
    return n;
  }
  createOscillator() {
    const n = { ...this.node(), frequency: new Param() };
    this.osc.push(n);
    return n;
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
test("the tonal palette uses bounded sine/triangle layers, quiet harmonics and distinct short cues", () => {
  assert.equal(Object.keys(soundCues).length, 26);
  assert.equal(
    new Set(Object.values(soundCues).map((s) => JSON.stringify(s.layers))).size,
    26,
  );
  for (const s of Object.values(soundCues)) {
    assert.equal(s.wet, 0);
    assert.ok(s.layers.length <= 3);
    assert.ok(s.layers.reduce((sum,l)=>sum+l.gain,0)<=.1);
    for (const l of s.layers) {
      assert.ok(['sine','triangle'].includes(l.kind));
      assert.equal(l.end, l.hz);
      assert.ok(l.hz >= 120 && l.hz <= 1800);
      assert.ok(l.duration > 0 && l.duration <= 0.75);
      assert.ok(l.gain > 0 && l.gain <= 0.045);
      assert.ok(l.delay >= 0 && l.delay <= 0.18);
    }
  }
});
test("rounded tonal envelopes have zero endpoints, bounded amplitudes and a smooth attack/release", () => {
  for (const cue of Object.values(soundCues))
    for (const layer of cue.layers) {
      const env = sineEnvelope(layer.gain, layer.duration);
      assert.equal(env[0], 0);
      assert.equal(env.at(-1), 0);
      assert.ok(
        [...env].every(
          (v) => Number.isFinite(v) && v >= 0 && v <= layer.gain + 1e-8,
        ),
      );
      assert.ok(Math.max(...env) > 0.9 * layer.gain);
      assert.ok(env[1] < layer.gain * 0.03);
    }
});

test('the loading screen has no sound recipes or interaction cues',async()=>{
 let stamp=0;const a=createSpaceAudio({sound_enabled:true},{Audio,now:()=>stamp});await a.unlock();
 assert.equal(Object.keys(soundCues).some(n=>n.startsWith('arrival_')),false);
 assert.equal(a.cue('arrival_reveal'),false);assert.equal(a.diagnostics().active_voice_count,0);
 assert.equal(soundForControl({id:'arrival-skip',closest:s=>s==='#arrival-screen',dataset:{}}),null);
 stamp+=100;assert.equal(a.cue('swipe_tick'),true);
 await a.mute();assert.equal(a.diagnostics().active_voice_count,0);await a.dispose();
});
test("enabled sound creates no context before unlock; persistent mute stops voices and cannot be rearmed by resume", async () => {
  const p = { sound_enabled: true, effects_volume: 0.5, ambience_volume: 0.12 };
  let stamp = 0,
    ctx;
  const a = createSpaceAudio(p, {
    Audio: class extends Audio {
      constructor() {
        super();
        ctx = this;
      }
    },
    now: () => stamp,
  });
  assert.equal(a.enabled, true);
  assert.equal(a.diagnostics().context_state, "not_created");
  assert.equal(a.cue("ui"), false);
  await a.unlock();
  assert.equal(a.cue("component"), true);
  assert.ok(a.diagnostics().active_voice_count > 0);
  assert.equal(a.cue("select"), false);
  stamp += 100;
  a.cue("spectrum", 0);
  const low = ctx.osc.at(-1).frequency.values[0];
  stamp += 100;
  a.cue("spectrum", 5);
  assert.ok(ctx.osc.at(-1).frequency.values[0] > low);
  await a.mute();
  assert.equal(p.sound_enabled, false);
  assert.equal(a.diagnostics().active_voice_count, 0);
  assert.equal(ctx.state, "suspended");
  await a.resume();
  await a.unlock();
  stamp += 100;
  assert.equal(a.cue("ui"), false);
  assert.equal(ctx.state, "suspended");
  await a.toggle();
  assert.equal(p.sound_enabled, true);
  assert.equal(ctx.state, "running");
  await a.suspend();
  assert.equal(a.cue("ui"), false);
  await a.resume();
  assert.equal(a.cue("ui"), true);
  a.setSurface("science");
  assert.equal(a.diagnostics().ambience_allowed, false);
  await a.dispose();
  assert.equal(a.diagnostics().context_state, "closed");
});
test("voice budget, history and burst suppression bound rapid interactions; missing audio remains recoverable", async () => {
  let stamp = 0;
  const a = createSpaceAudio(
    { effects_volume: 0.5, ambience_volume: 0 },
    { Audio, now: () => stamp },
  );
  await a.unlock();
  for (let i = 0; i < 50; i++) {
    stamp += 60;
    a.cue("spherex");
  }
  assert.ok(a.diagnostics().active_voice_count <= 12);
  assert.ok(a.diagnostics().recent_cues.length <= 40);
  await a.dispose();
  const absent = createSpaceAudio({ sound_enabled: false }, { Audio });
  await absent.unlock();
  assert.equal(absent.diagnostics().context_state, "not_created");
  await absent.dispose();
});
test("controls have meaningful cue families and scientific save waits for actual success", () => {
  const control = (id, dataset = {}, textContent = "", tagName = "BUTTON") => ({
    id,
    dataset,
    textContent,
    tagName,
    hasAttribute: () => false,
  });
  assert.deepEqual(soundForControl(control("instrument-zoom-out")), [
    "zoom_out",
    0,
  ]);
  assert.deepEqual(soundForControl(control("", { telescope: "hubble" })), [
    "hubble",
    0,
  ]);
  assert.deepEqual(soundForControl(control("", { channel: "4" })), [
    "spectrum",
    4,
  ]);
  assert.deepEqual(soundForControl(control("", {}, "Delete")), ["delete", 0]);
  assert.deepEqual(soundForControl(control("", { compare: "wipe" })), [
    "compare",
    0,
  ]);
  assert.equal(soundForControl(control("instrument-save")), null);
  assert.equal(soundForControl(control("instrument-question-save")), null);
});
test("hidden-document guard suppresses all voices and suspension clears pending cue tails", async () => {
  const prior = globalThis.document;
  let stamp = 0;
  try {
    globalThis.document = { hidden: false };
    const a = createSpaceAudio(
      { sound_enabled: true, effects_volume: 0.5, ambience_volume: 0.12 },
      { Audio, now: () => stamp },
    );
    await a.unlock();
    assert.equal(a.cue("travel"), true);
    globalThis.document.hidden = true;
    stamp += 100;
    assert.equal(a.cue("hubble"), false);
    await a.suspend();
    assert.equal(a.diagnostics().active_voice_count, 0);
    assert.equal(await a.unlock(), false);
    globalThis.document.hidden = false;
    await a.resume();
    stamp += 100;
    assert.equal(a.cue("hubble"), true);
    await a.dispose();
  } finally {
    if (prior === undefined) delete globalThis.document;
    else globalThis.document = prior;
  }
});

test("new visitors start sound-enabled but wait for gesture unlock; explicit mute remains respected",async()=>{
 const a=createSpaceAudio({}, {Audio});assert.equal(a.enabled,true);assert.equal(a.diagnostics().context_state,'not_created');assert.equal(a.cue('swipe_tick'),false);await a.unlock();assert.equal(a.cue('swipe_tick'),true);await a.dispose();
 const muted=createSpaceAudio({sound_enabled:false}, {Audio});await muted.unlock();assert.equal(muted.enabled,false);assert.equal(muted.diagnostics().context_state,'not_created');assert.equal(muted.cue('swipe_tick'),false);await muted.dispose();
});
