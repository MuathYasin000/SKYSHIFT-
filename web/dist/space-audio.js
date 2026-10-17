// Original SKYSHIFT sound design. Not recordings from space or data sonification.
// Recipes are brief, layered gestures: tuned transients + filtered air + diffusion.
const tone = (
  hz,
  duration,
  gain = 0.08,
  delay = 0,
  end = hz,
  kind = "sine",
) => ({ kind, hz, end, duration, gain, delay });
const air = (hz, end, duration, gain = 0.045, delay = 0, q = 1) => ({
  kind: "noise",
  hz,
  end,
  duration,
  gain,
  delay,
  q,
});
const recipe = (label, layers, wet = 0.12) => ({ label, layers, wet });
export const soundCues = Object.freeze({
  ui: recipe(
    "Soft ceramic contact",
    [air(1700, 900, 0.045, 0.045), tone(310, 0.045, 0.035)],
    0.015,
  ),
  select: recipe(
    "Magnetic lock",
    [tone(245, 0.12, 0.07, 0, 215), air(1100, 700, 0.07, 0.035)],
    0.06,
  ),
  navigate: recipe(
    "Navigation glide",
    [air(320, 1700, 0.24, 0.06), tone(145, 0.22, 0.06, 0, 190)],
    0.18,
  ),
  travel: recipe(
    "Orbital transfer",
    [
      air(180, 2400, 0.65, 0.08),
      tone(95, 0.55, 0.065, 0, 165),
      tone(285, 0.42, 0.025, 0.12, 330),
    ],
    0.25,
  ),
  component: recipe(
    "Precision latch",
    [
      air(2600, 1300, 0.055, 0.07),
      tone(760, 0.16, 0.055, 0.015, 725),
      tone(1183, 0.12, 0.017, 0.02),
    ],
    0.07,
  ),
  spherex: recipe(
    "SPHEREx survey shimmer",
    [
      tone(196, 0.56, 0.065),
      tone(392, 0.5, 0.032, 0.08),
      air(520, 2700, 0.44, 0.04, 0.03),
      tone(588, 0.34, 0.02, 0.18),
    ],
    0.24,
  ),
  "webb-b": recipe(
    "Webb deep resonance",
    [
      tone(98, 0.8, 0.07),
      tone(147, 0.72, 0.045, 0.045),
      tone(294, 0.58, 0.025, 0.09),
      air(650, 170, 0.65, 0.035),
    ],
    0.3,
  ),
  hubble: recipe(
    "Hubble glass harmonics",
    [
      tone(523.25, 0.42, 0.055),
      tone(1046.5, 0.3, 0.022, 0.018),
      tone(1397, 0.21, 0.013, 0.028),
      air(3400, 1400, 0.055, 0.025),
    ],
    0.18,
  ),
  observe: recipe(
    "Optical aperture",
    [air(700, 2200, 0.28, 0.055), tone(174.6, 0.29, 0.055, 0, 220)],
    0.2,
  ),
  spectrum: recipe(
    "Spectral glint",
    [
      tone(440, 0.21, 0.048),
      tone(1100, 0.12, 0.016, 0.014),
      air(2300, 1100, 0.075, 0.02),
    ],
    0.16,
  ),
  lens: recipe(
    "Image reveal",
    [
      air(300, 2100, 0.36, 0.055),
      tone(261.63, 0.42, 0.05, 0.025),
      tone(392, 0.35, 0.026, 0.075),
    ],
    0.22,
  ),
  close: recipe(
    "Panel release",
    [air(1300, 240, 0.13, 0.045), tone(230, 0.12, 0.035, 0, 170)],
    0.035,
  ),
  open: recipe(
    "Panel unfold",
    [air(460, 1650, 0.18, 0.045), tone(280, 0.13, 0.035, 0, 340)],
    0.07,
  ),
  zoom: recipe(
    "Focus in",
    [air(1500, 2100, 0.055, 0.03), tone(350, 0.09, 0.032, 0, 410)],
    0.04,
  ),
  zoom_out: recipe(
    "Focus out",
    [air(1600, 950, 0.065, 0.03), tone(330, 0.1, 0.032, 0, 270)],
    0.04,
  ),
  reset: recipe(
    "Return to reference",
    [tone(294, 0.16, 0.048, 0, 261.63), air(700, 350, 0.12, 0.025)],
    0.09,
  ),
  date: recipe(
    "Timeline detent",
    [air(2100, 1350, 0.045, 0.055), tone(480, 0.085, 0.035, 0, 460)],
    0.025,
  ),
  compare: recipe(
    "Comparison alignment",
    [
      tone(330, 0.18, 0.045),
      tone(495, 0.14, 0.025, 0.018),
      air(850, 1500, 0.13, 0.022),
    ],
    0.1,
  ),
  annotate: recipe(
    "Coordinate pin",
    [
      tone(587.33, 0.22, 0.045),
      tone(1174.66, 0.1, 0.014, 0.012),
      air(2000, 1000, 0.03, 0.035),
    ],
    0.11,
  ),
  save: recipe(
    "Evidence sealed",
    [
      tone(261.63, 0.3, 0.055),
      tone(392, 0.36, 0.035, 0.055),
      tone(523.25, 0.4, 0.025, 0.11),
      air(1500, 700, 0.07, 0.025),
    ],
    0.18,
  ),
  reopen: recipe(
    "Evidence retrieved",
    [
      air(380, 1800, 0.2, 0.035),
      tone(392, 0.23, 0.04, 0.025),
      tone(261.63, 0.29, 0.045, 0.075),
    ],
    0.14,
  ),
  delete: recipe(
    "Note released",
    [air(1750, 330, 0.14, 0.05), tone(185, 0.105, 0.025, 0, 125)],
    0.03,
  ),
  toggle: recipe(
    "Relay switch",
    [air(2400, 1200, 0.04, 0.05), tone(390, 0.06, 0.035, 0, 370)],
    0.02,
  ),
  preview: recipe(
    "Infrared reveal",
    [air(440, 2700, 0.24, 0.045), tone(349.23, 0.24, 0.035, 0, 392)],
    0.16,
  ),
  error: recipe(
    "Quiet attention",
    [
      tone(164.81, 0.2, 0.055),
      tone(174.61, 0.19, 0.025, 0.015),
      air(700, 400, 0.1, 0.018),
    ],
    0.035,
  ),
});
export function createSpaceAudio(preferences, dependencies = {}) {
  let context = null,
    enabled = preferences.sound_enabled !== false,
    suspended = false,
    disposed = false,
    surface = "home",
    master,
    fx,
    ambient,
    reverb,
    send,
    noiseBuffer,
    last = -Infinity,
    lastCue = null;
  const nodes = new Set(),
    ambientNodes = [],
    history = [],
    listeners = new Set();
  const now = dependencies.now || (() => performance.now()),
    hidden = () => globalThis.document?.hidden === true;
  const emit = () => listeners.forEach((fn) => fn());
  function noiseBufferFor(ctx, seconds, seed) {
    const b = ctx.createBuffer(
        1,
        Math.ceil(ctx.sampleRate * seconds),
        ctx.sampleRate,
      ),
      data = b.getChannelData(0);
    let state = seed;
    for (let i = 0; i < data.length; i++) {
      state = (Math.imul(1664525, state) + 1013904223) >>> 0;
      data[i] = state / 2147483648 - 1;
    }
    return b;
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
    const limiter = context.createDynamicsCompressor();
    limiter.threshold.value = -14;
    limiter.knee.value = 10;
    limiter.ratio.value = 6;
    limiter.attack.value = 0.003;
    limiter.release.value = 0.15;
    master.connect(limiter);
    limiter.connect(context.destination);
    fx = context.createGain();
    fx.connect(master);
    ambient = context.createGain();
    ambient.gain.value = 0;
    ambient.connect(master);
    reverb = context.createConvolver();
    const impulse = noiseBufferFor(context, 0.7, 0x53504845),
      v = impulse.getChannelData(0);
    for (let i = 0; i < v.length; i++)
      v[i] *= Math.pow(1 - i / v.length, 3) * 0.2;
    reverb.buffer = impulse;
    send = context.createGain();
    send.gain.value = 0.22;
    send.connect(reverb);
    reverb.connect(fx);
    noiseBuffer = noiseBufferFor(context, 1.8, 0x534b5953);
    // Low-level filtered texture, never an alleged sound of vacuum or telescope.
    for (const [hz, q, gain] of [
      [160, 0.6, 0.18],
      [620, 0.4, 0.025],
    ]) {
      const n = context.createBufferSource(),
        filter = context.createBiquadFilter(),
        g = context.createGain();
      n.buffer = noiseBuffer;
      n.loop = true;
      filter.type = "lowpass";
      filter.frequency.value = hz;
      filter.Q.value = q;
      g.gain.value = gain;
      n.connect(filter);
      filter.connect(g);
      g.connect(ambient);
      n.start();
      ambientNodes.push(n, filter, g);
    }
    context.onstatechange = emit;
  }
  function gains() {
    if (!context) return;
    const active = enabled && !suspended && !hidden();
    master.gain.setTargetAtTime(active ? 0.8 : 0, context.currentTime, 0.025);
    fx.gain.setTargetAtTime(
      Math.min(1, Math.max(0, preferences.effects_volume ?? 0.5)),
      context.currentTime,
      0.025,
    );
    ambient.gain.setTargetAtTime(
      active && surface !== "science"
        ? Math.min(1, Math.max(0, preferences.ambience_volume ?? 0.12)) * 0.09
        : 0,
      context.currentTime,
      0.4,
    );
  }
  function clearVoices() {
    for (const n of [...nodes]) {
      try {
        n.stop();
      } catch {}
      n.onended?.();
    }
    if (reverb) {
      const b = reverb.buffer;
      reverb.buffer = null;
      reverb.buffer = b;
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
    if (stamp - last < 55 || nodes.size + spec.layers.length > 32) return false;
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
        filter = context.createBiquadFilter();
      const source =
        layer.kind === "noise"
          ? context.createBufferSource()
          : context.createOscillator();
      if (layer.kind === "noise") source.buffer = noiseBuffer;
      else {
        source.type = layer.kind;
        source.frequency.setValueAtTime(layer.hz * pitch, t);
        source.frequency.exponentialRampToValueAtTime(
          layer.end * pitch,
          t + layer.duration,
        );
      }
      filter.type = layer.kind === "noise" ? "bandpass" : "lowpass";
      filter.Q.value = layer.q || 0.5;
      filter.frequency.setValueAtTime(
        layer.kind === "noise" ? layer.hz : 4200,
        t,
      );
      if (layer.kind === "noise")
        filter.frequency.exponentialRampToValueAtTime(
          layer.end,
          t + layer.duration,
        );
      const attack = Math.min(0.018, layer.duration * 0.18);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(layer.gain, t + attack);
      g.gain.exponentialRampToValueAtTime(0.00001, t + layer.duration);
      g.gain.linearRampToValueAtTime(0, t + layer.duration + 0.012);
      const wet = context.createGain();
      wet.gain.value = spec.wet;
      source.connect(filter);
      filter.connect(g);
      g.connect(fx);
      g.connect(wet);
      wet.connect(send);
      nodes.add(source);
      source.onended = () => {
        source.disconnect();
        filter.disconnect();
        g.disconnect();
        wet.disconnect();
        nodes.delete(source);
      };
      source.start(t);
      source.stop(t + layer.duration + 0.02);
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
        ambience_allowed: surface !== "science",
        recipe_count: Object.keys(soundCues).length,
      };
    },
    async dispose() {
      disposed = true;
      enabled = false;
      clearVoices();
      for (const n of ambientNodes) {
        try {
          n.stop?.();
        } catch {}
        n.disconnect();
      }
      await context?.close();
      listeners.clear();
    },
  };
}
