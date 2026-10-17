// One renderer-independent sound service across home, science and Universe.
import { createSpaceAudio } from "./space-audio.js";
import { readPreferences, savePreferences } from "./space-preferences.js";
export const applicationPreferences = readPreferences();
export const applicationAudio = createSpaceAudio(applicationPreferences);
if (typeof document !== "undefined")
  document.addEventListener("skyshift:effects", (e) => {
    applicationPreferences.effects = Boolean(e.detail);
  });
export function soundForControl(e) {
  const id = e.id || "",
    d = e.dataset || {},
    text = (e.textContent || "").trim().toLowerCase();
  if (
    e.disabled ||
    e.closest?.("[data-sound-controls]") ||
    e.matches?.("[data-sound-toggle]")
  )
    return null;
  if (id === "instrument-save" || id === "instrument-question-save")
    return null; // confirmation comes from actual success
  if (d.sound) return [d.sound, 0];
  if (d.telescope) return [d.telescope, 0];
  if (d.channel !== undefined) return ["spectrum", Number(d.channel)];
  if (
    d.missionComponent ||
    d.websiteComponent ||
    d.heroComponent ||
    d.component
  )
    return ["component", 0];
  if (d.observeStage !== undefined)
    return [["observe", "spectrum", "lens"][Number(d.observeStage)], 0];
  if (
    d.opticsStep !== undefined ||
    (id.includes("optics") && id.includes("next"))
  )
    return ["observe", 0];
  if (d.compare) return ["compare", 0];
  if (d.instrumentDate !== undefined || e.closest?.("#instrument-dates"))
    return ["date", 0];
  if (d.environment) return ["travel", 0];
  if (d.destination) {
    let seed = 0;
    for (const c of d.destination) seed += c.charCodeAt(0);
    return [
      ["spherex", "webb-b", "hubble"].includes(d.destination)
        ? d.destination
        : "select",
      seed,
    ];
  }
  if (/save|export|download/.test(id) || /^save|^download/.test(text))
    return ["save", 0];
  if (/reopen|instrument-open/.test(id)) return ["reopen", 0];
  if (/zoom.*out/.test(id)) return ["zoom_out", 0];
  if (/zoom/.test(id)) return ["zoom", 0];
  if (/reset|fit/.test(id)) return ["reset", 0];
  if (
    /close|exit|cancel/.test(id) ||
    /^(cancel|×)$/.test(text) ||
    e.hasAttribute?.("data-close-dialog")
  )
    return ["close", 0];
  if (text === "delete") return ["delete", 0];
  if (/question|note|instrument-add/.test(id) || text === "edit")
    return ["annotate", 0];
  if (/reveal|preview/.test(id + " " + e.className)) return ["preview", 0];
  if (/blink|toggle/.test(id) || e.hasAttribute?.("aria-pressed"))
    return ["toggle", 0];
  if (
    e.tagName === "SUMMARY" ||
    /about|source|display|settings|help|more|expand|legend/.test(id)
  )
    return ["open", 0];
  if (e.tagName === "A" && e.getAttribute?.("href")?.startsWith("#"))
    return ["navigate", 0];
  return ["ui", 0];
}
let installedService;
export function installApplicationSound() {
  if (installedService) return installedService;
  const audio = applicationAudio,
    p = applicationPreferences;
  const host = document.createElement("dialog");
  host.id = "sound-settings";
  host.className = "space-dialog";
  host.setAttribute("aria-labelledby", "sound-settings-title");
  host.dataset.soundControls = "";
  host.innerHTML =
    '<div class="dialog-top"><div><p class="space-eyebrow">SKYSHIFT / SOUND DESIGN</p><h2 id="sound-settings-title">Small sounds. Clear signals.</h2></div><button aria-label="Close sound settings" id="sound-settings-close">×</button></div><p>Short, clean sine-wave cues for the interface. Preview the sounds and set a comfortable level.</p><button data-sound-toggle aria-pressed="true">Sound on</button><p id="sound-status" role="status"></p><label class="sound-level">Interaction volume <output id="sound-fx-value"></output><input id="sound-fx" type="range" min="0" max="1" step="0.01" /></label><p class="sound-fine">Dry sine tones · no noise layers, reverb or continuous background sound. Mute is remembered. Browser playback starts after a click or keypress.</p><h3>Preview the cues</h3><div class="sound-palette"></div>';
  document.body.append(host);
  for (const [name, label] of [
    ["ui", "Control"],
    ["component", "Hardware"],
    ["travel", "Navigate"],
    ["spherex", "SPHEREx"],
    ["webb-b", "Webb"],
    ["hubble", "Hubble"],
    ["spectrum", "Spectrum"],
    ["save", "Evidence"],
  ]) {
    const b = document.createElement("button");
    b.textContent = label;
    b.dataset.previewSound = name;
    b.onclick = async () => {
      try {
        if (!audio.enabled) await audio.setEnabled(true);
        await audio.unlock();
        audio.cue(name);
        persist();
      } catch {
        onError();
      }
    };
    host.querySelector(".sound-palette").append(b);
  }
  const persist = () => savePreferences(p);
  function sync() {
    const d = audio.diagnostics();
    document
      .querySelectorAll("[data-sound-toggle],#sound-toggle")
      .forEach((b) => {
        b.setAttribute("aria-pressed", String(d.enabled));
        b.dataset.audioState = d.enabled ? "on" : "off";
        b.title = d.enabled
          ? "Mute all SKYSHIFT sound"
          : "Turn SKYSHIFT sound on";
        b.innerHTML = `<svg class="sound-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z"/><path d="${d.enabled ? "M17 8q5 4 0 8" : "M17 9l5 6m0-6-5 6"}"/></svg><span class="sound-word">Sound ${d.enabled ? "on" : "off"}</span>`;
        b.setAttribute(
          "aria-label",
          d.enabled
            ? "Sound on — mute SKYSHIFT sound"
            : "Sound off — turn SKYSHIFT sound on",
        );
      });
    document.getElementById("sound-status").textContent = d.enabled
      ? d.awaiting_gesture
        ? "Sound is ready. Interact with the page to start playback."
        : "Sound is on. You can mute it at any time."
      : "All sound is muted.";
    for (const [id, key] of [["sound-fx", "effects_volume"]]) {
      document.getElementById(id).value = p[key];
      document.getElementById("sound-fx-value").value =
        Math.round(p[key] * 100) + "%";
    }
  }
  audio.subscribe(sync);
  sync();
  document.getElementById("sound-settings-close").onclick = () => host.close();
  for (const [id, key] of [["sound-fx", "effects_volume"]])
    document.getElementById(id).oninput = (e) => {
      p[key] = Number(e.target.value);
      audio.update();
      persist();
      sync();
    };
  const onError = () => {
    document.getElementById("sound-status").textContent =
      "Playback is unavailable or blocked by your browser. All exploration tools remain available.";
  };
  async function unlock(e) {
    if (
      e.isTrusted &&
      !e.target.closest?.("[data-sound-toggle],#sound-toggle") &&
      !(e.type === "keydown" && e.repeat)
    )
      try {
        await audio.unlock();
      } catch {
        onError();
      }
  }
  document.addEventListener("pointerdown", unlock, {
    capture: true,
    passive: true,
  });
  document.addEventListener("keydown", unlock, { capture: true });
  document.addEventListener(
    "click",
    async (e) => {
      const toggle = e.target.closest?.("[data-sound-toggle],#sound-toggle");
      if (toggle) {
        try {
          await audio.toggle();
          persist();
          sync();
          if (audio.enabled) audio.cue("spherex");
        } catch {
          onError();
        }
        return;
      }
      if (e.target.closest?.("[data-open-sound]")) {
        document.querySelectorAll("dialog[open]").forEach((d) => d.close());
        sync();
        host.showModal();
        return;
      }
      if (!e.isTrusted) return;
      const control = e.target.closest?.("button,a,summary");
      if (!control) return;
      const cue = soundForControl(control);
      if (!cue) return;
      try {
        if (!audio.cue(...cue)) {
          await audio.unlock();
          audio.cue(...cue);
        }
      } catch {
        onError();
      }
    },
    true,
  );
  document.addEventListener("visibilitychange", () => {
    (document.hidden ? audio.suspend() : audio.resume()).catch(onError);
  });
  window.addEventListener("pagehide", () => audio.suspend().catch(onError));
  document.addEventListener("skyshift-sound", (e) => audio.cue(e.detail));
  window.addEventListener("storage", (e) => {
    if (e.key === "skyshift.space.preferences.v1") {
      const next = readPreferences();
      Object.assign(p, next);
      audio.setEnabled(next.sound_enabled).catch(onError);
      sync();
    }
  });
  Object.defineProperty(window, "skyshiftSound", {
    value: Object.freeze({ diagnostics: () => audio.diagnostics() }),
  });
  return (installedService = {
    setSurface: (surface) => audio.setSurface(surface),
    cue: (name) => audio.cue(name),
    sync,
  });
}
