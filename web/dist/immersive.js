import { fetchCatalogue } from "./catalogue.js";
import { stories, availability, friendlyDate } from "./field-guide.js";
import { bodies, hardware, components } from "./space-content.js";
import { readPreferences, savePreferences } from "./space-preferences.js";
import { createExplorationMemory } from "./exploration-memory.js";
import { createSpaceAudio } from "./space-audio.js";
import { telescopeStories } from "./telescope-stories.js";
import { createTelescopeExperience } from "./telescope-experience.js";

const $ = (id) => document.getElementById(id),
  preferences = readPreferences(),
  audio = createSpaceAudio(preferences);
// Legacy mode preference must not split the new unified experience.
preferences.mode = "immersive";
let scene = null,
  catalogue = null,
  manifest = null,
  environment = "observatory",
  selected = "spherex",
  workspace = false,
  lensOrigin = null,
  frameLoaded = false,
  sceneStarting = false,
  sceneFailure = false,
  pendingField = null,
  requestedFocus = false,
  workspaceTimer = null,
  audioSuspendTimer = null,
  journey = -1;
const telescopeExperience = createTelescopeExperience({
  getScene: () => scene,
  audio,
  openField: (field) => openScience(field),
  onOpen: () => {
    setDestinations(false);
    scene?.setPresentation("explanation");
    transition("observe");
  },
  onClose: () => {
    scene?.setPresentation("overview");
    scene?.focus(selected);
  },
});
let transitionTimer;
function transition(kind = "select") {
  document.body.dataset.feedback = kind;
  clearTimeout(transitionTimer);
  transitionTimer = setTimeout(
    () => delete document.body.dataset.feedback,
    850,
  );
}
const element = (tag, text) => {
  const e = document.createElement(tag);
  if (text !== undefined) e.textContent = text;
  return e;
};
function status(text, error = false) {
  $("space-status").textContent = text;
  $("space-status").classList.toggle("status-error", Boolean(error));
}
function persist() {
  if (!savePreferences(preferences))
    status(
      "Preferences cannot be saved on this device. Your current workspace still works.",
    );
}
function renderError(text) {
  sceneFailure = true;
  status(text, true);
  $("render-error").textContent = text;
  $("render-fallback").hidden = workspace;
  audio.cue("error");
}
function items() {
  if (environment === "observatory")
    return Object.entries(hardware).map(([id, h]) => ({
      id,
      name: h.name,
      detail: h.kind,
    }));
  if (environment === "solar")
    return bodies.map((b) => ({ id: b.id, name: b.name, detail: b.kind }));
  return (catalogue?.fields || []).map((f) => ({
    id: f.id,
    name: stories[f.id]?.name || f.title,
    detail: availability(f).label,
  }));
}
function destinationList() {
  const query = $("destination-search").value.trim().toLowerCase();
  $("destination-list").replaceChildren();
  let count = 0;
  for (const item of items()) {
    const field = catalogue?.fields.find((f) => f.id === item.id),
      story = stories[item.id];
    if (
      ![
        item.name,
        item.id,
        item.detail,
        story?.constellation,
        field?.description,
      ]
        .join(" ")
        .toLowerCase()
        .includes(query)
    )
      continue;
    count++;
    const button = element("button");
    button.className = "destination-item";
    button.dataset.destination = item.id;
    button.setAttribute("aria-pressed", String(selected === item.id));
    button.append(element("strong", item.name), element("small", item.detail));
    button.onclick = () => select(item.id);
    $("destination-list").append(button);
  }
  $("destination-search-status").textContent = count
    ? count + " destinations available."
    : "No available destination matches. Clear search to see this environment.";
}
function labels() {
  $("space-labels").replaceChildren();
  for (const item of items()) {
    const label =
      environment === "observatory"
        ? telescopeStories[item.id].short
        : item.name;
    const b = element("button", label);
    b.className = "space-object-label";
    b.dataset.object = item.id;
    b.setAttribute("aria-label", "Focus " + item.name);
    b.setAttribute("aria-pressed", String(item.id === selected));
    b.onclick = () => select(item.id);
    $("space-labels").append(b);
  }
  positionLabels();
}
function positionLabels() {
  if (!scene) return;
  const width = innerWidth,
    height = innerHeight;
  for (const p of scene.positions()) {
    const b = document.querySelector('[data-object="' + p.id + '"]');
    if (!b) continue;
    const x = p.x * width,
      y = p.y * height;
    b.style.left = x + "px";
    b.style.top = y + "px";
    const occluded = [
      ...document.querySelectorAll(
        ".destinations-drawer:not([hidden]),.space-context,.space-header,.space-hud",
      ),
    ].some((el) => {
      const r = el.getBoundingClientRect();
      return (
        x > r.left - 45 &&
        x < r.right + 45 &&
        y > r.top - 20 &&
        y < r.bottom + 20
      );
    });
    b.hidden = !p.visible || y < 85 || y > height - 75 || occluded;
  }
}
$("universe").addEventListener("space-frame", positionLabels);
function sceneCopy() {
  const text = {
    observatory: [
      "TELESCOPE GALLERY · ILLUSTRATIVE ARRANGEMENT",
      "MEET THE OBSERVATORY",
      "A different way to see.",
      "Orbit the spacecraft. Discover its instruments. Step into real infrared light.",
    ],
    solar: [
      "SCHEMATIC SOLAR SYSTEM · NO LIVE EPHEMERIDES",
      "OUR COSMIC NEIGHBOURHOOD",
      "A sense of scale.",
      "Positions and orbital circles are illustrative. Sizes and distances are separately compressed.",
    ],
    sky: [
      "ICRS FIELD DIRECTIONS · NO DISTANCE OR COVERAGE CLAIM",
      "FOUR WINDOWS INTO THE INFRARED",
      "Beyond familiar light.",
      "Field centres occupy their real directions on a celestial sphere. No measured 3D depth is implied.",
    ],
  }[environment];
  $("scene-type").textContent = text[0];
  $("focus-kicker").textContent = text[1];
  $("focus-title").textContent = text[2];
  $("focus-caption").textContent = text[3];
  $("destination-heading").textContent =
    environment === "observatory"
      ? "CHOOSE YOUR OBSERVATORY"
      : environment === "solar"
        ? "CHOOSE YOUR WORLD"
        : "CURATED SPHEREx FIELDS";
}
function setEnvironment(name) {
  if (!["observatory", "solar", "sky"].includes(name)) return;
  environment = name;
  if (telescopeExperience.open) telescopeExperience.close();
  document.body.dataset.environment = name;
  requestedFocus = false;
  selected =
    name === "observatory" ? "spherex" : name === "solar" ? "earth" : "m101";
  $("destination-search").value = "";
  document
    .querySelectorAll("button[data-environment]")
    .forEach((b) =>
      b.setAttribute("aria-pressed", String(b.dataset.environment === name)),
    );
  status(
    scene
      ? "Choose a destination, or drag the scene to orbit."
      : "Starting the local renderer…",
  );
  scene?.setScene(name);
  sceneCopy();
  destinationList();
  labels();
  select(selected, false);
  if (name === "solar" && matchMedia("(max-width:740px)").matches)
    scene?.focus(selected);
  audio.cue("travel");
  transition("travel");
}
function select(id, focus = true) {
  if (id?.startsWith("component:")) {
    const key = id.slice(10);
    if (!components[key]) return;
    scene?.highlight(key);
    if ($("context-details").hidden) contextDetails(true);
    $("component-description").textContent = components[key].description;
    $("component-list")
      .querySelectorAll("button")
      .forEach((b) =>
        b.setAttribute("aria-pressed", String(b.dataset.component === key)),
      );
    audio.cue("component");
    transition("component");
    return;
  }
  if (!items().some((i) => i.id === id)) return;
  selected = id;
  document
    .querySelectorAll("[data-telescope]")
    .forEach((b) =>
      b.setAttribute("aria-pressed", String(b.dataset.telescope === id)),
    );
  if (focus && !scene) requestedFocus = true;
  if (focus && matchMedia("(max-width:740px)").matches) setDestinations(false);
  document
    .querySelectorAll("[data-destination],[data-object]")
    .forEach((b) =>
      b.setAttribute(
        "aria-pressed",
        String((b.dataset.destination || b.dataset.object) === id),
      ),
    );
  $("context-preview").hidden = true;
  $("inspect-observation").hidden = true;
  $("from-hardware-to-sky").hidden = true;
  $("look-through").hidden = environment !== "observatory";
  $("component-list").replaceChildren();
  $("component-description").textContent = "";
  $("context-date").textContent = "";
  if (environment === "observatory") {
    const h = hardware[id];
    $("context-name").textContent = h.name;
    $("context-kind").textContent = h.kind;
    $("context-description").textContent = h.description;
    $("context-summary").textContent = h.description;
    $("context-state").textContent =
      id === "spherex"
        ? "Illustrative model · source-based proportions"
        : "Reusable NASA model · educational context";
    $("context-source").href = h.source;
    $("context-credit").textContent = h.credit;
    $("context-limitation").textContent =
      id === "spherex"
        ? "ARTISTIC VISUALIZATION · NOT A DIGITAL TWIN"
        : "OFFICIAL DOWNLOADABLE NASA MODEL";
    scene?.showHardware(id, focus);
    $("look-through").textContent =
      "Look through " + telescopeStories[id].short + " →";
    if (focus && telescopeExperience.open) telescopeExperience.show(id);
    if (id === "spherex") {
      for (const [key, component] of Object.entries(components)) {
        const b = element("button", component.name);
        b.dataset.component = key;
        b.setAttribute("aria-pressed", "false");
        b.onclick = () => select("component:" + key);
        $("component-list").append(b);
      }
      $("from-hardware-to-sky").hidden = false;
    }
  } else if (environment === "solar") {
    const b = bodies.find((b) => b.id === id);
    $("context-name").textContent = b.name;
    $("context-kind").textContent = b.kind;
    $("context-description").textContent = b.description;
    $("context-summary").textContent = b.description;
    $("context-state").textContent =
      "NASA visual context · positions & sizes schematic";
    $("context-source").href = b.source;
    $("context-credit").textContent =
      "NASA reusable model or published planetary texture. Lighting and orientation are illustrative.";
    $("context-limitation").textContent =
      "SCHEMATIC PLACEMENT · NOT A LIVE POSITION";
    $("from-hardware-to-sky").hidden = false;
    if (focus) scene?.focus(id);
  } else {
    const f = catalogue?.fields.find((f) => f.id === id);
    if (!f) return;
    const story = stories[id],
      a = availability(f);
    $("context-name").textContent = story?.name || f.title;
    $("context-kind").textContent = story?.kind || "CURATED FIELD";
    $("context-description").textContent = story?.short || f.description;
    $("context-summary").textContent = story?.short || f.description;
    $("context-state").textContent =
      a.label +
      (id === "m101"
        ? " · scientific approval PENDING"
        : " · single-exposure viewing");
    $("context-source").href =
      story?.source || "https://science.nasa.gov/mission/spherex/";
    $("context-credit").textContent =
      "Preview: real SPHEREx single-band prepared pixels. Blue gaps are excluded data. Exact sources appear in the observation.";
    $("context-limitation").textContent = a.explanation;
    $("context-date").textContent = f.observations
      .map((o) => friendlyDate(o.time_start_utc) + " UTC")
      .join(" · ");
    $("context-preview").src = f.observations[0].preview;
    $("context-preview").alt = "Real single-band SPHEREx preview of " + f.title;
    $("context-preview").hidden = false;
    $("inspect-observation").hidden = false;
    if (focus) scene?.focus(id);
  }
  audio.cue(hardware[id] ? id : "select");
  transition("select");
}
async function startScene() {
  if (sceneStarting || scene) return;
  sceneStarting = true;
  $("retry-renderer").disabled = true;
  try {
    if (!manifest) {
      const r = await fetch("./assets/space/manifest.json", {
        signal: AbortSignal.timeout(12000),
      });
      if (!r.ok) throw Error("Context asset catalogue unavailable");
      manifest = await r.json();
    }
    if (!catalogue) catalogue = await fetchCatalogue();
    const { createSpaceScene } = await import("./space-scene.js");
    scene = createSpaceScene($("universe"), {
      assets: manifest.assets,
      fields: catalogue.fields,
      onSelect: (id) => {
        if (id?.startsWith("component:")) {
          if (selected !== "spherex") select("spherex", false);
          telescopeExperience.inspectComponent(id.slice(10));
          transition("component");
          return;
        }
        select(id);
        if (hardware[id]) telescopeExperience.show(id);
      },
      onStatus: status,
      onError: renderError,
      preferences,
    });
    sceneFailure = false;
    for (const button of document.querySelectorAll(".hud-controls button"))
      button.disabled = false;
    $("render-fallback").hidden = true;
    scene.setPaused(false);
    const requestedMission = telescopeExperience.diagnostics(),
      requestedSelection = selected,
      startupFocus = requestedFocus,
      requestedSearch = $("destination-search").value;
    setEnvironment(environment);
    if (
      (requestedSelection !== selected || startupFocus) &&
      items().some((item) => item.id === requestedSelection)
    )
      select(requestedSelection, startupFocus);
    $("destination-search").value = requestedSearch;
    destinationList();
    credits();
    if (requestedMission.open)
      telescopeExperience.show(requestedMission.mission);
    telescopeExperience.refresh();
  } catch (e) {
    renderError(
      "The 3D environment could not start: " +
        e.message +
        ". Observations remain available without WebGL.",
    );
  } finally {
    sceneStarting = false;
    $("retry-renderer").disabled = false;
  }
}
function applyFrameMode() {
  if (!frameLoaded) return;
  try {
    const doc = $("science-frame").contentDocument;
    doc.body.classList.add("immersive-embedded");
    if (!doc.querySelector("[data-immersive-style]")) {
      const style = doc.createElement("link");
      style.rel = "stylesheet";
      style.href = "./immersive-science.css";
      style.dataset.immersiveStyle = "true";
      doc.head.append(style);
    }
    const url = new URL($("science-frame").contentWindow.location.href);
    if (url.origin === location.origin) $("standalone-science").href = url.href;
  } catch {
    status(
      "This workspace can be opened using its standalone scientific link.",
      true,
    );
  }
}
function openScience(field) {
  if (!workspace) lensOrigin = { environment, selected };
  if (telescopeExperience.open) telescopeExperience.close(true);
  if (environment !== "observatory") setEnvironment("observatory");
  if (selected !== "spherex") select("spherex", false);
  workspace = true;
  document.body.classList.add("science-open");
  $("space-workspace").hidden = false;
  $("render-fallback").hidden = true;
  scene?.setPresentation("lens");
  if (environment === "observatory") scene?.focus("spherex");
  transition("lens");
  audio.cue("lens");
  clearTimeout(audioSuspendTimer);
  audioSuspendTimer = setTimeout(() => {
    if (workspace) audio.suspend();
  }, 450);
  $("sound-toggle").disabled = true;
  $("sound-toggle").title = "Return to space to use optional sound.";
  $("journey-button").disabled = true;
  const iframe = $("science-frame");
  if (field) pendingField = field;
  if (!iframe.getAttribute("src")) {
    frameLoaded = false;
    iframe.src =
      "./explore.html?" +
      (field ? "field=" + encodeURIComponent(field) : "resume=1");
  } else if (field && frameLoaded) {
    const u = new URL(iframe.contentWindow.location.href);
    if (u.pathname.endsWith("/explore.html"))
      iframe.contentWindow.postMessage(
        { type: "skyshift:select-field", field },
        location.origin,
      );
    else {
      frameLoaded = false;
      iframe.src = "./explore.html?field=" + encodeURIComponent(field);
    }
  }
  applyFrameMode();
}
function closeScience() {
  workspace = false;
  document.body.classList.remove("science-open");
  $("space-workspace").hidden = true;
  $("sound-toggle").disabled = false;
  $("sound-toggle").title = "Optional synthesized sound";
  $("journey-button").disabled = false;
  $("science-frame").contentWindow?.postMessage(
    { type: "skyshift:workspace-visibility", visible: false },
    location.origin,
  );
  scene?.setPaused(false);
  scene?.setPresentation("overview");
  if (lensOrigin) {
    const origin = lensOrigin;
    lensOrigin = null;
    if (origin.environment !== environment) setEnvironment(origin.environment);
    if (origin.selected !== selected) select(origin.selected, false);
  }
  if (sceneFailure) $("render-fallback").hidden = false;

  clearTimeout(audioSuspendTimer);
  audio.resume();
  audio.cue("close");
  transition("close");
  $("universe").focus();
  if (journey === 2) {
    journey = -1;
    $("journey-strip").hidden = true;
  }
}
$("resume-button").hidden = !createExplorationMemory().read().record;
$("resume-button").onclick = () => openScience();
$("science-frame").addEventListener("load", () => {
  frameLoaded = true;
  $("resume-button").hidden = false;
  applyFrameMode();
  clearTimeout(workspaceTimer);
  $("workspace-error").hidden = true;
  workspaceTimer = setTimeout(() => {
    $("workspace-error").textContent =
      "The scientific controls have not responded. Reload the viewer, or use the standalone scientific link. Saved files remain unchanged.";
    $("workspace-error").hidden = false;
  }, 10000);
  $("science-frame").contentWindow.postMessage(
    { type: "skyshift:request-controller-status" },
    location.origin,
  );
  if (
    pendingField &&
    $("science-frame").contentWindow.location.pathname.endsWith("/explore.html")
  ) {
    $("science-frame").contentWindow.postMessage(
      { type: "skyshift:select-field", field: pendingField },
      location.origin,
    );
    pendingField = null;
  }
  const doc = $("science-frame").contentDocument;
  doc.addEventListener("keydown", (e) => {
    if (
      e.key === "Escape" &&
      !doc.querySelector("dialog[open]") &&
      !e.defaultPrevented
    )
      closeScience();
  });
});
window.addEventListener("message", (e) => {
  if (
    e.origin !== location.origin ||
    e.source !== $("science-frame").contentWindow
  )
    return;
  if (e.data?.type === "skyshift:return-to-space") closeScience();
  if (e.data?.type === "skyshift:viewer-ready") {
    clearTimeout(workspaceTimer);
    $("workspace-error").hidden = true;
  }
});
document
  .querySelectorAll("button[data-environment]")
  .forEach((b) => (b.onclick = () => setEnvironment(b.dataset.environment)));
$("destination-search").oninput = destinationList;
$("from-hardware-to-sky").onclick = () => setEnvironment("sky");
document.querySelectorAll("[data-telescope]").forEach(
  (b) =>
    (b.onclick = () => {
      if (workspace) closeScience();
      if (environment !== "observatory") setEnvironment("observatory");
      if (telescopeExperience.open) telescopeExperience.close(true);
      select(b.dataset.telescope);
      telescopeExperience.show(b.dataset.telescope);
    }),
);
$("look-through").onclick = () => telescopeExperience.show(selected);
$("inspect-observation").onclick = () => openScience(selected);
$("back-to-universe").onclick = closeScience;
$("reload-workspace").onclick = () => {
  const iframe = $("science-frame");
  try {
    iframe.contentWindow.location.reload();
  } catch {
    iframe.src = "./explore.html?resume=1";
  }
};
$("observations-button").onclick = (event) => {
  event.preventDefault();
  openScience(environment === "sky" ? selected : undefined);
};
$("fallback-classic").onclick = () => openScience();
$("retry-renderer").onclick = () => {
  scene?.dispose();
  scene = null;
  const previous = $("universe"),
    fresh = previous.cloneNode(false);
  previous.replaceWith(fresh);
  fresh.addEventListener("space-frame", positionLabels);
  startScene();
};
$("camera-reset").onclick = () => {
  scene?.reset();
  audio.cue("travel");
  transition("travel");
};
$("camera-plus").onclick = () => {
  scene?.zoom(1 / 1.25);
  audio.cue("zoom");
};
$("camera-minus").onclick = () => {
  scene?.zoom(1.25);
  audio.cue("zoom");
};
$("focus-object").onclick = () => {
  scene?.focus(selected);
  audio.cue("travel");
  transition("travel");
};
$("destinations-toggle").onclick = () =>
  setDestinations($("destinations-drawer").hidden);
function setDestinations(open) {
  $("destinations-drawer").hidden = !open;
  $("destinations-toggle").setAttribute("aria-expanded", String(open));
  positionLabels();
}
document.querySelector(".space-brand").onclick = (event) => {
  event.preventDefault();
  if (workspace) closeScience();
  else scene?.reset();
};
function openDialog(id, trigger) {
  audio.cue("ui");
  const d = $(id);
  d.showModal();
  d.addEventListener("close", () => trigger?.focus(), { once: true });
}
for (const [button, dialog] of [
  ["settings-button", "settings-dialog"],
  ["help-button", "help-dialog"],
  ["credits-button", "credits-dialog"],
])
  $(button).onclick = () => {
    openDialog(dialog, $(button));
    if (dialog === "help-dialog") {
      const d = scene?.diagnostics();
      $("runtime-status").textContent =
        "3D: " +
        (d?.webgl || "not started") +
        " · device pixel ratio " +
        devicePixelRatio +
        " · quality " +
        preferences.quality +
        ". Reading local server identity…";
      fetch("/healthz", { signal: AbortSignal.timeout(3000) })
        .then((r) => {
          if (!r.ok) throw Error("HTTP " + r.status);
          return r.json();
        })
        .then((r) => {
          $("runtime-status").textContent =
            "Server " +
            r.server_version +
            " · " +
            r.app_version +
            " · UI " +
            (r.content_id?.slice(0, 12) ||
              "identity unavailable; restart server") +
            " · 3D " +
            (d?.webgl || "not started") +
            " · DPR " +
            devicePixelRatio +
            " · " +
            preferences.quality +
            " quality. Diagnostics stay on this computer.";
        })
        .catch((e) => {
          $("runtime-status").textContent =
            "Server status could not be read: " + e.message;
        });
    }
  };
document
  .querySelectorAll("[data-close-dialog]")
  .forEach((b) => (b.onclick = () => b.closest("dialog").close()));
$("open-science-settings").onclick = () => {
  $("settings-dialog").close();
  openScience();
};
$("effects-toggle").checked = preferences.effects;
document.body.classList.toggle("effects-disabled", !preferences.effects);
$("effects-toggle").onchange = (e) => {
  preferences.effects = e.target.checked;
  scene?.setEffects(preferences.effects);
  document.body.classList.toggle("effects-disabled", !preferences.effects);
  persist();
};
$("quality-select").value = preferences.quality;
$("quality-select").onchange = (e) => {
  preferences.quality = e.target.value;
  persist();
  $("quality-feedback").textContent =
    "Preference saved. Reload to apply the rendering quality; save scientific work first.";
};
for (const [id, key] of [
  ["effects-volume", "effects_volume"],
  ["ambience-volume", "ambience_volume"],
]) {
  $(id).value = preferences[key];
  $(id).oninput = (e) => {
    preferences[key] = Number(e.target.value);
    audio.update();
    persist();
  };
}
$("sound-toggle").onclick = async () => {
  if (workspace) {
    status("Close the observation lens to use optional sound.");
    return;
  }
  try {
    const enabled = await audio.toggle();
    $("sound-toggle").textContent = enabled ? "Sound on" : "Sound off";
    $("sound-toggle").setAttribute("aria-pressed", String(enabled));
    audio.cue("spherex");
  } catch (e) {
    status(e.message, true);
  }
};
document.addEventListener("visibilitychange", () =>
  document.hidden ? audio.suspend() : !workspace && audio.resume(),
);
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !document.querySelector("dialog[open]")) {
    if (workspace) closeScience();
    else if (telescopeExperience.open) telescopeExperience.close();
    else if (journey >= 0) {
      journey = -1;
      $("journey-strip").hidden = true;
    } else scene?.reset();
  }
});
function credits() {
  if (!manifest) return;
  $("model-credits").replaceChildren();
  for (const a of manifest.assets.filter(
    (a) => a.status !== "not_integrated",
  )) {
    const article = element("article");
    article.className = "asset-credit";
    article.append(
      element("strong", a.id.toUpperCase()),
      element("p", a.credit || "NASA 3D Resources"),
      element("p", a.modifications || "Original model retained"),
      element("code", "SHA-256 " + a.sha256),
    );
    for (const [label, url] of [
      ["Original source", a.source_page],
      ["Usage terms", a.terms],
    ])
      if (url?.startsWith("https://")) {
        const link = element("a", label + " ↗");
        link.href = url;
        link.target = "_blank";
        link.rel = "noreferrer";
        article.append(link, document.createTextNode(" · "));
      }
    $("model-credits").append(article);
  }
}
function journeyStep() {
  const steps = [
    [
      "Meet the observatory. Orbit SPHEREx and select a component to see how it supports infrared observations.",
      () => setEnvironment("observatory"),
    ],
    [
      "Choose a real sky field. Its marker is a direction on the sky, not a measured distance or available survey footprint.",
      () => setEnvironment("sky"),
    ],
    [
      "Enter M101’s real exposure. Inspect a usable pixel, save a question, or open the restricted comparison. Scientific approval remains pending.",
      () => openScience("m101"),
    ],
  ];
  if (journey >= steps.length) {
    journey = -1;
    $("journey-strip").hidden = true;
    return;
  }
  const [text, action] = steps[journey];
  $("journey-copy").textContent = journey + 1 + " / 3 · " + text;
  $("journey-strip").hidden = journey === 2;
  $("journey-next").textContent = journey === 1 ? "Enter M101" : "Continue";
  action();
}
$("journey-button").onclick = () => {
  journey = 0;
  journeyStep();
};
$("journey-next").onclick = () => {
  journey++;
  journeyStep();
};
$("journey-exit").onclick = () => {
  journey = -1;
  $("journey-strip").hidden = true;
};
Object.defineProperty(window, "skyshiftSpace", {
  value: Object.freeze({
    diagnostics: () => scene?.diagnostics() || { webgl: "not_started" },
    workspace: () => ({
      environment,
      selected,
      mode: preferences.mode,
      workspace,
      audio_enabled: audio.enabled,
    }),
    audio: () => audio.diagnostics(),
    telescope: () => telescopeExperience.diagnostics(),
  }),
});
sceneCopy();
destinationList();
select(selected, false);
startScene();

const compact = matchMedia("(max-width:740px)");
function contextDetails(open) {
  $("context-details").hidden = !open;
  $("context-toggle").setAttribute("aria-expanded", String(open));
  $("context-toggle").textContent = open
    ? "Close details −"
    : "About & sources +";
}
contextDetails(false);
setDestinations(false);
$("context-toggle").onclick = () => contextDetails($("context-details").hidden);
