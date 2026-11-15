/** @provenance OpenAI Codex assisted implementation of the browser-synthesized interface cues. No recorded audio. */
// Original tonal UI palette: rounded sine fundamentals and quiet triangle overtones.
// Semantic IDs remain stable for existing scientific and telescope interactions.
const tone = (hz, duration = 0.09, gain = 0.04, delay = 0, kind = "sine") => ({
  kind,
  hz,
  end: hz,
  duration,
  gain,
  delay,
});
const recipe = (label, ...layers) => ({ label, layers, wet: 0 });
const soft = (label,hz,duration=.09,gain=.035) => recipe(label,
  tone(hz,duration,gain),tone(hz*2,duration*.7,gain*.18,.006,'triangle'));
export const soundCues = Object.freeze({
  ui: soft("Soft tap",440,.045,.032),
  select: soft("Select",659.25,.075),
  navigate: recipe("Navigate",tone(440,.12,.031),tone(659.25,.11,.014,.035)),
  travel: soft("Glide",293.66,.18,.033),
  component: soft("Inspect hardware",587.33,.085,.031),
  spherex: recipe("SPHEREx",tone(329.63,.2,.032),tone(659.25,.16,.013,.04)),
  "webb-b": soft("Webb",493.88,.19,.031),
  hubble: soft("Hubble",392,.17,.032),
  observe: recipe("Look through",tone(392,.16,.03),tone(587.33,.12,.014,.045)),
  spectrum: soft("Spectral step",698.46,.055,.027),
  lens: soft("Reveal",523.25,.17,.031),
  close: soft("Close",349.23,.07,.028),
  open: recipe("Open",tone(523.25,.09,.029),tone(783.99,.1,.012,.025)),
  zoom: soft("Focus in",739.99,.045,.024),
  zoom_out: soft("Focus out",493.88,.05,.024),
  reset: recipe("Recenter",tone(392,.11,.028),tone(523.25,.12,.013,.05)),
  date: soft("Date step",783.99,.035,.025),
  compare: soft("Compare",554.37,.13,.032),
  annotate: soft("Place note",622.25,.14,.031),
  save: recipe(
    "Saved",
    tone(523.25,.16,.032),tone(659.25,.16,.024,.07),tone(783.99,.22,.018,.14),
  ),
  reopen: recipe(
    "Reopen",
    tone(783.99,.14,.026),tone(523.25,.18,.03,.08),
  ),
  delete: soft("Remove",261.63,.11,.028),
  toggle: soft("Switch",587.33,.04,.026),
  preview: soft("Preview",493.88,.15,.03),
  swipe_tick: soft("Reveal detent",880,.019,.026),
  error: recipe(
    "Attention",
    tone(293.66,.12,.029),tone(261.63,.15,.024,.14),
  ),
});
export function sineEnvelope(gain, duration) {
  const values = new Float32Array(256),
    attack = Math.min(0.035, duration * 0.22),
    release = duration - attack;
  for (let i = 0; i < values.length; i++) {
    const t = (i / (values.length - 1)) * duration;
    values[i] =
      gain *
      (t < attack
        ? (1 - Math.cos((Math.PI * t) / attack)) / 2
        : ((1 + Math.cos((Math.PI * (t - attack)) / release)) / 2) ** 2);
  }
  values[0] = values[values.length - 1] = 0;
  return values;
}
export function createSpaceAudio(preferences, dependencies = {}) {
  let context = null,
    enabled = preferences.sound_enabled !== false,
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
      o.type = layer.kind;
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
          "layered sine and quiet triangle overtones; rounded decays; no continuous ambience",
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
