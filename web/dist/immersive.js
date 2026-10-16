import { fetchCatalogue } from "./catalogue.js";
import { stories, availability, friendlyDate } from "./field-guide.js";
import { bodies, hardware, components } from "./space-content.js";
import { readPreferences, savePreferences } from "./space-preferences.js";
import { createExplorationMemory } from "./exploration-memory.js";
import { createSpaceAudio } from "./space-audio.js";

const $ = (id) => document.getElementById(id),
  preferences = readPreferences(),
  audio = createSpaceAudio(preferences);
let scene = null,
  catalogue = null,
  manifest = null,
  environment = "observatory",
  selected = "spherex",
  workspace = false,
  frameLoaded = false,
  sceneStarting = false,
  sceneFailure = false,
  journey = -1;
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
  if (environment === "observatory") return;
  for (const item of items()) {
    const b = element("button", item.name);
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
    b.hidden =
      !p.visible ||
      y < 140 ||
      y > height - 140 ||
      (width > 740 && (x < 280 || x > width - 340)) ||
      (width <= 740 && (y < 265 || y > height * 0.58));
  }
}
$("universe").addEventListener("space-frame", positionLabels);
function sceneCopy() {
  const text = {
    observatory: [
      "CONTEXTUAL 3D · SPACECRAFT VISUALIZATION",
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
  selected =
    name === "observatory" ? "spherex" : name === "solar" ? "earth" : "m101";
  $("destination-search").value = "";
  document
    .querySelectorAll("[data-environment]")
    .forEach((b) =>
      b.setAttribute("aria-pressed", String(b.dataset.environment === name)),
    );
  scene?.setScene(name);
  sceneCopy();
  destinationList();
  labels();
  select(selected, false);
  audio.cue();
}
function select(id, focus = true) {
  if (id?.startsWith("component:")) {
    const key = id.slice(10);
    if (!components[key]) return;
    scene?.highlight(key);
    $("component-description").textContent = components[key].description;
    $("component-list")
      .querySelectorAll("button")
      .forEach((b) =>
        b.setAttribute("aria-pressed", String(b.dataset.component === key)),
      );
    audio.cue();
    return;
  }
  if (!items().some((i) => i.id === id)) return;
  selected = id;
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
  $("component-list").replaceChildren();
  $("component-description").textContent = "";
  $("context-date").textContent = "";
  if (environment === "observatory") {
    const h = hardware[id];
    $("context-name").textContent = h.name;
    $("context-kind").textContent = h.kind;
    $("context-description").textContent = h.description;
    $("context-source").href = h.source;
    $("context-credit").textContent = h.credit;
    $("context-limitation").textContent =
      id === "spherex"
        ? "ARTISTIC VISUALIZATION · NOT A DIGITAL TWIN"
        : "OFFICIAL DOWNLOADABLE NASA MODEL";
    scene?.showHardware(id);
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
    $("context-source").href = b.source;
    $("context-credit").textContent =
      "NASA reusable model or published planetary texture. Lighting and orientation are illustrative.";
    $("context-limitation").textContent =
      "SCHEMATIC PLACEMENT · NOT A LIVE POSITION";
    if (focus) scene?.focus(id);
  } else {
    const f = catalogue?.fields.find((f) => f.id === id);
    if (!f) return;
    const story = stories[id],
      a = availability(f);
    $("context-name").textContent = story?.name || f.title;
    $("context-kind").textContent = story?.kind || "CURATED FIELD";
    $("context-description").textContent = story?.short || f.description;
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
  audio.cue();
}
async function startScene() {
  if (sceneStarting || scene) return;
  sceneStarting = true;
  $("retry-renderer").disabled = true;
  try {
    if (!manifest) {
      const r = await fetch("./assets/space/manifest.json");
      if (!r.ok) throw Error("Context asset catalogue unavailable");
      manifest = await r.json();
    }
    if (!catalogue) catalogue = await fetchCatalogue();
    const { createSpaceScene } = await import("./space-scene.js");
    scene = createSpaceScene($("universe"), {
      assets: manifest.assets,
      fields: catalogue.fields,
      onSelect: select,
      onStatus: status,
      onError: renderError,
      preferences,
    });
    sceneFailure = false;
    $("render-fallback").hidden = true;
    scene.setPaused(workspace);
    const requestedSelection = selected, requestedSearch = $("destination-search").value;
    setEnvironment(environment);
    if (requestedSelection !== selected && items().some(item => item.id === requestedSelection)) select(requestedSelection, false);
    $("destination-search").value = requestedSearch;
    destinationList();
    status(
      "Local assets ready · select a destination or orbit the observatory",
    );
    credits();
  } catch (e) {
    renderError(
      "The 3D environment could not start: " +
        e.message +
        ". Classic View does not require WebGL.",
    );
  } finally {
    sceneStarting = false;
    $("retry-renderer").disabled = false;
  }
}
function setMode(mode) {
  preferences.mode = mode;
  persist();
  $("mode-toggle").textContent =
    mode === "classic" ? "Immersive View" : "Classic View";
  $("space-workspace").classList.toggle("classic", mode === "classic");
  if (mode === "classic") {
    audio.mute();
    $("sound-toggle").setAttribute("aria-pressed", "false");
    $("sound-toggle").textContent = "Sound off";
    openScience(!workspace && environment === "sky" ? selected : undefined);
  } else {
    if (frameLoaded) applyFrameMode();
    if (!scene) startScene();
    if (!workspace) $("universe").focus();
  }
  applyFrameMode();
}
function applyFrameMode() {
  if (!frameLoaded) return;
  try {
    const doc = $("science-frame").contentDocument;
    doc.body.classList.toggle(
      "immersive-embedded",
      preferences.mode !== "classic",
    );
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
  workspace = true;
  document.body.classList.add("science-open");
  $("space-workspace").hidden = false;
  $("render-fallback").hidden = true;
  scene?.setPaused(true);
  audio.suspend();
  const iframe = $("science-frame");
  if (!iframe.getAttribute("src"))
    iframe.src =
      "./explore.html?" +
      (field ? "field=" + encodeURIComponent(field) : "resume=1");
  else if (field && frameLoaded) {
    const u = new URL(iframe.contentWindow.location.href);
    if (u.pathname.endsWith("/explore.html"))
      iframe.contentWindow.postMessage(
        { type: "skyshift:select-field", field },
        location.origin,
      );
    else iframe.src = "./explore.html?field=" + encodeURIComponent(field);
  }
  applyFrameMode();
}
function closeScience() {
  workspace = false;
  document.body.classList.remove("science-open");
  $("space-workspace").hidden = true;
  scene?.setPaused(false);
  if (sceneFailure) $("render-fallback").hidden = false;
  if (preferences.mode === "classic") setMode("immersive");
  audio.resume();
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
});
document
  .querySelectorAll("[data-environment]")
  .forEach((b) => (b.onclick = () => setEnvironment(b.dataset.environment)));
$("destination-search").oninput = destinationList;
$("from-hardware-to-sky").onclick = () => setEnvironment("sky");
$("inspect-observation").onclick = () => openScience(selected);
$("back-to-universe").onclick = closeScience;
$("mode-toggle").onclick = () =>
  setMode(preferences.mode === "classic" ? "immersive" : "classic");
$("fallback-classic").onclick = () => setMode("classic");
$("retry-renderer").onclick = () => {
  scene?.dispose();
  scene = null;
  const previous = $("universe"), fresh = previous.cloneNode(false);
  previous.replaceWith(fresh);
  fresh.addEventListener("space-frame", positionLabels);
  startScene();
};
$("camera-reset").onclick = () => scene?.reset();
$("camera-plus").onclick = () => scene?.zoom(1 / 1.25);
$("camera-minus").onclick = () => scene?.zoom(1.25);
$("focus-object").onclick = () => scene?.focus(selected);
function openDialog(id, trigger) {
  const d = $(id);
  d.showModal();
  d.addEventListener("close", () => trigger?.focus(), { once: true });
}
for (const [button, dialog] of [
  ["settings-button", "settings-dialog"],
  ["help-button", "help-dialog"],
  ["credits-button", "credits-dialog"],
])
  $(button).onclick = () => openDialog(dialog, $(button));
document
  .querySelectorAll("[data-close-dialog]")
  .forEach((b) => (b.onclick = () => b.closest("dialog").close()));
$("open-science-settings").onclick = () => {
  $("settings-dialog").close();
  openScience();
};
$("effects-toggle").checked = preferences.effects;
$("effects-toggle").onchange = (e) => {
  preferences.effects = e.target.checked;
  scene?.setEffects(preferences.effects);
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
  if (preferences.mode === "classic" || workspace) {
    status(
      "Classic and scientific workspaces remain silent. Return to space for optional audio.",
    );
    return;
  }
  try {
    const enabled = await audio.toggle();
    $("sound-toggle").textContent = enabled ? "Sound on" : "Sound off";
    $("sound-toggle").setAttribute("aria-pressed", String(enabled));
    audio.cue();
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
  }),
});
sceneCopy();
destinationList();
select("spherex", false);
if (preferences.mode === "classic") setMode("classic");
else startScene();

const compact = matchMedia("(max-width:740px)");
function contextDetails(open) {
  $("context-details").hidden = !open;
  $("context-toggle").setAttribute("aria-expanded", String(open));
  $("context-toggle").textContent = open ? "Hide details" : "Show details";
}
contextDetails(!compact.matches);
$("context-toggle").onclick = () => contextDetails($("context-details").hidden);
