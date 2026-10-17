// Original dry sine-wave UI cues. No noise, pitch sweeps, reverb or ambient bed.
// Semantic IDs remain stable for existing scientific and telescope interactions.
const tone = (hz, duration = 0.055, gain = 0.075, delay = 0) => ({
  kind: "sine",
  hz,
  end: hz,
  duration,
  gain,
  delay,
});
const recipe = (label, ...layers) => ({ label, layers, wet: 0 });
export const soundCues = Object.freeze({
  ui: recipe("Tap", tone(680, 0.032, 0.055)),
  select: recipe("Select", tone(760, 0.045, 0.065)),
  navigate: recipe("Navigate", tone(554.37, 0.065, 0.06)),
  travel: recipe("Move", tone(440, 0.09, 0.06)),
  component: recipe("Inspect hardware", tone(880, 0.045, 0.055)),
  spherex: recipe("SPHEREx", tone(659.25, 0.105, 0.065)),
  "webb-b": recipe("Webb", tone(493.88, 0.115, 0.065)),
  hubble: recipe("Hubble", tone(783.99, 0.095, 0.055)),
  observe: recipe("Look through", tone(587.33, 0.075, 0.065)),
  spectrum: recipe("Spectral step", tone(740, 0.052, 0.055)),
  lens: recipe("Reveal", tone(622.25, 0.08, 0.06)),
  close: recipe("Close", tone(480, 0.045, 0.05)),
  open: recipe("Open", tone(640, 0.055, 0.055)),
  zoom: recipe("Focus in", tone(820, 0.032, 0.045)),
  zoom_out: recipe("Focus out", tone(560, 0.034, 0.045)),
  reset: recipe("Reset", tone(523.25, 0.065, 0.055)),
  date: recipe("Date", tone(920, 0.026, 0.045)),
  compare: recipe("Compare", tone(698.46, 0.06, 0.06)),
  annotate: recipe("Place note", tone(830.61, 0.07, 0.055)),
  save: recipe(
    "Saved",
    tone(659.25, 0.055, 0.06),
    tone(880, 0.075, 0.055, 0.07),
  ),
  reopen: recipe(
    "Reopen",
    tone(880, 0.045, 0.05),
    tone(659.25, 0.065, 0.055, 0.06),
  ),
  delete: recipe("Remove", tone(392, 0.055, 0.055)),
  toggle: recipe("Switch", tone(720, 0.028, 0.05)),
  preview: recipe("Preview", tone(554.37, 0.085, 0.055)),
  error: recipe(
    "Attention",
    tone(349.23, 0.065, 0.06),
    tone(349.23, 0.065, 0.055, 0.085),
  ),
});
export function sineEnvelope(gain, duration) {
  const values = new Float32Array(256),
    attack = Math.min(0.008, duration * 0.22),
    release = duration - attack;
  for (let i = 0; i < values.length; i++) {
    const t = (i / (values.length - 1)) * duration;
    values[i] =
      gain *
      (t < attack
        ? (1 - Math.cos((Math.PI * t) / attack)) / 2
        : (1 + Math.cos((Math.PI * (t - attack)) / release)) / 2);
  }
  values[0] = values[values.length - 1] = 0;
  return values;
}
export function createSpaceAudio(preferences, dependencies = {}) {
  let context = null,
    enabled = preferences.sound_enabled === true,
    suspended = false,
    disposed = false,
    surface = "home",
    master,
    fx,
    last = -Infinity,
    lastCue = null;
  const nodes = new Set(),
    history = [],
    listeners = new Set(),
    now = dependencies.now || (() => performance.now()),
    hidden = () => globalThis.document?.hidden === true;
  const emit = () => listeners.forEach((fn) => fn());
  function gains() {
    if (!context) return;
    master.gain.setTargetAtTime(
      enabled && !suspended && !hidden() ? 0.8 : 0,
      context.currentTime,
      0.012,
    );
    fx.gain.setTargetAtTime(
      Math.min(1, Math.max(0, preferences.effects_volume ?? 0.5)),
      context.currentTime,
      0.012,
    );
  }
  function build() {
    if (context) return;
    const Audio =
      dependencies.Audio ||
      globalThis.AudioContext ||
      globalThis.webkitAudioContext;
    if (!Audio)
      throw Error(
        "Audio is unavailable. The application still works silently.",
      );
    context = new Audio({ latencyHint: "interactive" });
    master = context.createGain();
    master.gain.value = 0;
    fx = context.createGain();
    fx.connect(master);
    const limiter = context.createDynamicsCompressor();
    limiter.threshold.value = -14;
    limiter.knee.value = 10;
    limiter.ratio.value = 6;
    limiter.attack.value = 0.003;
    limiter.release.value = 0.1;
    master.connect(limiter);
    limiter.connect(context.destination);
    context.onstatechange = emit;
  }
  function clearVoices() {
    for (const n of [...nodes]) {
      try {
        n.stop();
      } catch {}
      n.onended?.();
    }
  }
  async function unlock() {
    if (!enabled || suspended || hidden() || disposed) return false;
    build();
    await context.resume();
    gains();
    emit();
    return context.state === "running";
  }
  function cue(name = "ui", variant = 0) {
    if (
      !enabled ||
      !context ||
      context.state !== "running" ||
      suspended ||
      hidden() ||
      disposed
    )
      return false;
    const spec = soundCues[name];
    if (!spec) return false;
    const stamp = now();
    if (stamp - last < 55 || nodes.size + spec.layers.length > 12) return false;
    last = stamp;
    lastCue = name;
    history.push(name);
    if (history.length > 40) history.shift();
    const pitch =
      name === "spectrum"
        ? Math.pow(2, Math.min(5, Math.max(0, Number(variant) || 0)) / 12)
        : name === "select"
          ? Math.pow(2, (Math.abs(Number(variant) || 0) % 7) / 24)
          : 1;
    for (const layer of spec.layers) {
      const t = context.currentTime + 0.004 + layer.delay,
        g = context.createGain(),
        o = context.createOscillator();
      o.type = "sine";
      o.frequency.setValueAtTime(layer.hz * pitch, t);
      g.gain.setValueCurveAtTime(
        sineEnvelope(layer.gain, layer.duration),
        t,
        layer.duration,
      );
      o.connect(g);
      g.connect(fx);
      nodes.add(o);
      o.onended = () => {
        o.disconnect();
        g.disconnect();
        nodes.delete(o);
      };
      o.start(t);
      o.stop(t + layer.duration + 0.002);
    }
    return true;
  }
  async function setEnabled(value) {
    enabled = Boolean(value);
    preferences.sound_enabled = enabled;
    if (!enabled) {
      clearVoices();
      gains();
      if (context?.state === "running") await context.suspend();
    } else {
      suspended = false;
      await unlock();
    }
    emit();
    return enabled;
  }
  return {
    get enabled() {
      return enabled;
    },
    unlock,
    cue,
    update: gains,
    toggle: () => setEnabled(!enabled),
    setEnabled,
    setSurface(value) {
      surface = value;
      suspended = false;
      gains();
    },
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    async suspend() {
      suspended = true;
      clearVoices();
      gains();
      if (context?.state === "running") await context.suspend();
      emit();
    },
    async resume() {
      suspended = false;
      if (enabled && context && !hidden()) await context.resume();
      gains();
      emit();
    },
    mute: () => setEnabled(false),
    diagnostics() {
      return {
        enabled,
        awaiting_gesture: enabled && (!context || context.state !== "running"),
        last_cue: lastCue,
        recent_cues: [...history],
        active_voice_count: nodes.size,
        context_state: context?.state || "not_created",
        surface,
        ambience_allowed: false,
        recipe_count: Object.keys(soundCues).length,
        synthesis:
          "dry sine; fixed pitch; smooth zero-ended envelope; no ambience",
      };
    },
    async dispose() {
      disposed = true;
      enabled = false;
      clearVoices();
      await context?.close();
      listeners.clear();
    },
  };
}
