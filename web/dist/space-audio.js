// Original interaction cues. These are not recorded space sounds or data sonification.
export const soundCues = Object.freeze({
  select: {
    wave: "sine",
    notes: [
      [420, 0, 0.07],
      [560, 0.045, 0.09],
    ],
    gain: 0.12,
  },
  travel: {
    wave: "sine",
    notes: [
      [130, 0, 0.28],
      [195, 0.08, 0.3],
      [260, 0.16, 0.32],
    ],
    gain: 0.08,
    sweep: 1.7,
  },
  component: {
    wave: "triangle",
    notes: [
      [740, 0, 0.055],
      [980, 0.07, 0.08],
    ],
    gain: 0.08,
  },
  spherex: {
    wave: "sine",
    notes: [
      [330, 0, 0.17],
      [440, 0.07, 0.18],
      [660, 0.16, 0.24],
    ],
    gain: 0.09,
  },
  "webb-b": {
    wave: "sine",
    notes: [
      [174.61, 0, 0.28],
      [261.63, 0.08, 0.32],
      [349.23, 0.19, 0.37],
    ],
    gain: 0.1,
  },
  hubble: {
    wave: "triangle",
    notes: [
      [523.25, 0, 0.12],
      [659.25, 0.08, 0.15],
      [783.99, 0.18, 0.2],
    ],
    gain: 0.07,
  },
  observe: {
    wave: "sine",
    notes: [
      [220, 0, 0.18],
      [440, 0.08, 0.2],
      [880, 0.17, 0.24],
    ],
    gain: 0.08,
    sweep: 1.12,
  },
  spectrum: {
    wave: "sine",
    notes: [
      [390, 0, 0.08],
      [520, 0.055, 0.08],
      [650, 0.11, 0.09],
      [780, 0.165, 0.11],
    ],
    gain: 0.06,
  },
  lens: {
    wave: "sine",
    notes: [
      [196, 0, 0.2],
      [293.66, 0.09, 0.25],
    ],
    gain: 0.09,
    sweep: 1.3,
  },
  close: {
    wave: "sine",
    notes: [
      [520, 0, 0.08],
      [350, 0.05, 0.12],
    ],
    gain: 0.08,
  },
  ui: { wave: "triangle", notes: [[620, 0, 0.035]], gain: 0.04 },
  zoom: { wave: "sine", notes: [[280, 0, 0.07]], gain: 0.04, sweep: 1.15 },
  error: {
    wave: "sine",
    notes: [
      [190, 0, 0.12],
      [160, 0.15, 0.15],
    ],
    gain: 0.07,
  },
});
export function createSpaceAudio(preferences, dependencies = {}) {
  let context = null,
    enabled = false,
    ambience = null,
    suspended = false,
    last = -Infinity,
    lastCue = null;
  const history = [],
    nodes = new Set(),
    ambientNodes = [];
  const now = dependencies.now || (() => performance.now());
  function gains() {
    if (ambience && context)
      ambience.gain.setTargetAtTime(
        enabled && !suspended && !document.hidden
          ? preferences.ambience_volume * 0.035
          : 0,
        context.currentTime,
        0.2,
      );
  }
  function cue(name = "ui", variant = 0) {
    if (!enabled || !context || suspended || document.hidden) return false;
    const spec = soundCues[name];
    if (!spec) return false;
    const stamp = now();
    if (stamp - last < 45) return false;
    last = stamp;
    lastCue = name;
    history.push(name);
    if (history.length > 32) history.shift();
    for (const [frequency, delay, duration] of spec.notes) {
      const o = context.createOscillator(),
        g = context.createGain(),
        t = context.currentTime + delay;
      o.type = spec.wave;
      const pitch =
        name === "spectrum"
          ? 0.85 + Math.min(5, Math.max(0, Number(variant) || 0)) * 0.06
          : 1;
      o.frequency.setValueAtTime(frequency * pitch, t);
      if (spec.sweep)
        o.frequency.exponentialRampToValueAtTime(
          frequency * pitch * spec.sweep,
          t + duration,
        );
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(
        preferences.effects_volume * spec.gain,
        t + 0.012,
      );
      g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
      o.connect(g);
      g.connect(context.destination);
      o.start(t);
      o.stop(t + duration + 0.02);
      nodes.add(o);
      o.onended = () => {
        o.disconnect();
        g.disconnect();
        nodes.delete(o);
      };
    }
    return true;
  }
  return {
    get enabled() {
      return enabled;
    },
    async toggle() {
      if (!context) {
        const Audio =
          dependencies.Audio ||
          globalThis.AudioContext ||
          globalThis.webkitAudioContext;
        if (!Audio) throw Error("Audio is unavailable in this browser.");
        context = new Audio();
        ambience = context.createGain();
        ambience.gain.value = 0;
        ambience.connect(context.destination);
        for (const f of [55, 82.4]) {
          const o = context.createOscillator();
          o.frequency.value = f;
          o.type = "sine";
          o.connect(ambience);
          o.start();
          ambientNodes.push(o);
        }
      }
      enabled = !enabled;
      if (enabled) {
        suspended = false;
        await context.resume();
      } else if (context.state === "running") await context.suspend();
      gains();
      return enabled;
    },
    cue,
    update: gains,
    async suspend() {
      suspended = true;
      gains();
      if (context?.state === "running") await context.suspend();
    },
    async resume() {
      suspended = false;
      if (enabled && context) await context.resume();
      gains();
    },
    mute() {
      enabled = false;
      gains();
      context?.suspend();
    },
    diagnostics() {
      return {
        enabled,
        last_cue: lastCue,
        recent_cues: [...history],
        active_voice_count: nodes.size,
        context_state: context?.state || "not_created",
      };
    },
    async dispose() {
      enabled = false;
      for (const o of nodes) o.stop();
      for (const o of ambientNodes) o.stop();
      await context?.close();
    },
  };
}
