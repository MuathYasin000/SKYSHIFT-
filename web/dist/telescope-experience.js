import { telescopeStories, observingColors } from "./telescope-stories.js";
import { components } from "./space-content.js";
import { createOpticsExplainer } from "./optics-explainer.js";

export function createTelescopeExperience({
  getScene,
  audio,
  openField,
  onOpen,
  onClose,
}) {
  const $ = (id) => document.getElementById(id),
    panel = $("telescope-experience");
  const optics = createOpticsExplainer($("mission-optics"));
  let mission = null,
    stage = 0,
    field = "m101",
    imageSequence = 0;
  const objectUrls = new Map(),
    images = new Map();
  const cataloguePromise = fetch("./assets/assets.json", {
    signal: AbortSignal.timeout(10000),
  }).then((r) => {
    if (!r.ok) throw Error("Image provenance unavailable");
    return r.json();
  });
  // Defer rejected promise reporting until an image is actually requested.
  cataloguePromise.catch(() => {});
  async function image(story) {
    const seq = ++imageSequence;
    $("mission-image-status").textContent = "Verifying the published image…";
    $("mission-image").hidden = true;
    $("mission-image-source").hidden = true;
    $("mission-image-source").removeAttribute("href");
    try {
      const catalogue = await cataloguePromise;
      const asset = catalogue.assets.find((a) => a.id === story.imageId);
      if (!asset || !asset.sha256) throw Error("Image identity is absent");
      if (!images.has(asset.id))
        images.set(
          asset.id,
          (async () => {
            const response = await fetch(story.image, {
              signal: AbortSignal.timeout(12000),
            });
            if (!response.ok)
              throw Error("Image request failed (" + response.status + ")");
            const bytes = await response.arrayBuffer();
            const hash = Array.from(
              new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)),
              (b) => b.toString(16).padStart(2, "0"),
            ).join("");
            if (hash !== asset.sha256)
              throw Error("Published image checksum mismatch");
            const url = URL.createObjectURL(new Blob([bytes]));
            objectUrls.set(asset.id, url);
            return { url, asset };
          })().catch((e) => {
            images.delete(asset.id);
            throw e;
          }),
        );
      const loaded = await images.get(asset.id);
      if (seq !== imageSequence) return;
      $("mission-image").src = loaded.url;
      $("mission-image").alt = story.imageLabel;
      await $("mission-image").decode();
      if (seq !== imageSequence) return;
      $("mission-image").hidden = false;
      getScene()?.setObservationImage($("mission-image"));
      $("mission-image-status").textContent =
        story.imageLabel + " · " + loaded.asset.credit;
      $("mission-image-source").href = loaded.asset.source_page;
      $("mission-image-source").hidden = false;
    } catch (error) {
      if (seq !== imageSequence) return;
      $("mission-image-status").textContent =
        error.message +
        ". Retry this published image; no substitute is displayed.";
    }
  }
  function render() {
    if (!mission) return;
    const story = telescopeStories[mission];
    getScene()?.clearObservationImage();
    panel
      .querySelectorAll("[data-channel]")
      .forEach((b) => b.setAttribute("aria-pressed", "false"));
    panel.style.setProperty("--mission-accent", story.color);
    $("mission-hardware").hidden = mission !== "spherex" || stage !== 0;
    $("mission-component-info").hidden = true;
    $("mission-name").textContent = story.short;
    $("mission-verb").textContent = story.verb;
    $("mission-band").textContent = story.band;
    $("mission-step-title").textContent = story.steps[stage][0];
    $("mission-step-copy").textContent = story.steps[stage][1];
    optics.set(mission, stage);
    $("mission-direction-note").hidden = stage === 2;
    $("mission-direction-note").textContent =
      "Arrows move from space toward the aperture, stopping on foreground hardware where present. These parallel on-axis paths show direction, not field of view or measured throughput. Speed and lengths are illustrative.";
    $("mission-source").href = story.source;
    $("mission-source").hidden = false;
    $("mission-source").textContent = "How " + story.short + " works ↗";
    panel.dataset.mission = mission;
    panel.dataset.stage = stage;
    for (const b of panel.querySelectorAll("[data-observe-stage]"))
      b.setAttribute(
        "aria-pressed",
        String(Number(b.dataset.observeStage) === stage),
      );
    $("mission-spectrum").hidden = stage !== 1;
    $("mission-published").hidden = stage !== 2;
    $("mission-fields").hidden = mission !== "spherex" || stage !== 2;
    $("mission-field-open").hidden = mission !== "spherex" || stage !== 2;
    $("mission-spectrum-hint").textContent =
      mission === "spherex"
        ? "Select an illustrative color key. These six keys explain 102 infrared colors; they are not six measured filters. The external paths remain parallel."
        : "Select a color key for the same incoming paths. It is not a filter simulation or a wavelength-dependent deflection; published pixels stay unchanged.";
    getScene()?.observe(mission, stage);
    if (stage === 2) image(story);
    else {
      imageSequence++;
      $("mission-image").hidden = true;
    }
  }
  function setStage(value) {
    stage = value;
    render();
    audio.cue(value === 1 ? "spectrum" : value === 2 ? "lens" : "observe");
  }
  const api = {
    get open() {
      return !panel.hidden;
    },
    get mission() {
      return mission;
    },
    show(id) {
      if (!telescopeStories[id]) return;
      mission = id;
      stage = 0;
      panel.hidden = false;
      document.body.classList.add("observing-open");
      onOpen?.();
      render();
      audio.cue("observe");
    },
    close(silent = false) {
      optics.close();
      panel.hidden = true;
      document.body.classList.remove("observing-open");
      imageSequence++;
      getScene()?.closeObservation();
      onClose?.();
      if (!silent) audio.cue("close");
    },
    refresh() {
      if (!panel.hidden) render();
    },
    inspectComponent(key) {
      if (!components[key]) return;
      if (mission !== "spherex" || panel.hidden) api.show("spherex");
      getScene()?.highlight(key);
      $("mission-component-info").textContent =
        components[key].name + " — " + components[key].description;
      $("mission-component-info").hidden = false;
      audio.cue("component");
    },
    diagnostics() {
      return { open: !panel.hidden, mission, stage, field };
    },
    dispose() {
      for (const url of objectUrls.values()) URL.revokeObjectURL(url);
    },
  };
  for (const b of panel.querySelectorAll("[data-observe-stage]"))
    b.onclick = () => setStage(Number(b.dataset.observeStage));
  $("mission-close").onclick = () => api.close();
  for (const [key, component] of Object.entries(components)) {
    const b = document.createElement("button");
    b.textContent = component.name;
    b.dataset.missionComponent = key;
    b.onclick = () => api.inspectComponent(key);
    $("mission-components").append(b);
  }
  $("mission-next").onclick = () => setStage((stage + 1) % 3);
  observingColors.forEach((color, i) => {
    const button = document.createElement("button");
    button.type = "button";
    button.style.setProperty("--channel", color);
    button.setAttribute(
      "aria-label",
      "Follow illustrative wavelength group " + (i + 1),
    );
    button.setAttribute("aria-pressed", "false");
    button.dataset.channel = i;
    button.onclick = () => {
      panel
        .querySelectorAll("[data-channel]")
        .forEach((b) => b.setAttribute("aria-pressed", String(b === button)));
      getScene()?.observe(mission, 1, i);
      audio.cue("spectrum", i);
    };
    $("mission-channels").append(button);
  });
  for (const b of panel.querySelectorAll("[data-mission-field]"))
    b.onclick = () => {
      field = b.dataset.missionField;
      panel
        .querySelectorAll("[data-mission-field]")
        .forEach((b) =>
          b.setAttribute(
            "aria-pressed",
            String(b.dataset.missionField === field),
          ),
        );
      audio.cue("select");
    };
  $("mission-field-open").onclick = () => {
    audio.cue("lens");
    openField(field);
  };
  $("mission-image-retry").onclick = () => image(telescopeStories[mission]);
  return api;
}
