const KEY = "skyshift.space.preferences.v1";
export function readPreferences(storage) {
  try {
    storage ??= globalThis.localStorage;
    const p = JSON.parse(storage.getItem(KEY) || "{}");
    return {
      mode: p.mode === "classic" ? "classic" : "immersive",
      effects: p.effects !== false,
      quality: p.quality === "low" ? "low" : "auto",
      sound_enabled: p.sound_enabled !== false,
      effects_volume: Number.isFinite(p.effects_volume)
        ? Math.min(1, Math.max(0, p.effects_volume))
        : 0.5,
      ambience_volume: Number.isFinite(p.ambience_volume)
        ? Math.min(1, Math.max(0, p.ambience_volume))
        : 0.12,
    };
  } catch {
    return {
      mode: "immersive",
      effects: true,
      quality: "auto",
      sound_enabled: true,
      effects_volume: 0.5,
      ambience_volume: 0.12,
    };
  }
}
export function savePreferences(preferences, storage) {
  try {
    (storage ?? globalThis.localStorage).setItem(
      KEY,
      JSON.stringify(preferences),
    );
    return true;
  } catch {
    return false;
  }
}
