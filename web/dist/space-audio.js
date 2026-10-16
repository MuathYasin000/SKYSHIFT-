// Original synthesized interface cues. Never microphone audio or sounds of actual space.
export function createSpaceAudio(preferences) {
  let context = null,
    enabled = false,
    ambience = null;
  const oscillators = [];
  function gains() {
    if (ambience && context)
      ambience.gain.setTargetAtTime(
        enabled && !document.hidden ? preferences.ambience_volume * 0.06 : 0,
        context.currentTime,
        0.2,
      );
  }
  return {
    get enabled() {
      return enabled;
    },
    async toggle() {
      if (!context) {
        const Audio = globalThis.AudioContext || globalThis.webkitAudioContext;
        if (!Audio) throw Error("Audio is unavailable in this browser.");
        context = new Audio();
        ambience = context.createGain();
        ambience.gain.value = 0;
        ambience.connect(context.destination);
        for (const frequency of [55, 82.4]) {
          const o = context.createOscillator();
          o.frequency.value = frequency;
          o.type = "sine";
          o.connect(ambience);
          o.start();
          oscillators.push(o);
        }
      }
      enabled = !enabled;
      if (enabled) await context.resume();
      gains();
      return enabled;
    },
    cue() {
      if (!enabled || !context || document.hidden) return;
      const o = context.createOscillator(),
        g = context.createGain(),
        t = context.currentTime;
      o.type = "sine";
      o.frequency.setValueAtTime(540, t);
      o.frequency.exponentialRampToValueAtTime(810, t + 0.11);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(
        preferences.effects_volume * 0.06,
        t + 0.015,
      );
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
      o.connect(g);
      g.connect(context.destination);
      o.start(t);
      o.stop(t + 0.19);
      o.onended = () => {
        o.disconnect();
        g.disconnect();
      };
    },
    update: gains,
    async suspend() {
      if (context && context.state === "running") await context.suspend();
    },
    async resume() {
      if (enabled && context) await context.resume();
      gains();
    },
    mute() {
      enabled = false;
      gains();
    },
  };
}
