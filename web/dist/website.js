import { createObservationConsole } from "./observation-console.js";
import { fetchCatalogue } from "./catalogue.js";
import { stories, friendlyDate } from "./field-guide.js";
import { components } from "./space-content.js";
import { createExplorationMemory } from "./exploration-memory.js";

const $ = (id) => document.getElementById(id),
  memory = createExplorationMemory();
let surface = "home",
  routeSequence = 0,
  catalogue = null,
  universe = null,
  universeFactory = null,
  model = null,
  modelStarting = false,
  modelFailed = false,
  missionVisible = false;
let sound = null;
let routeStarted = false;
// Missing animation support/module keeps the existing immediate navigation.
let routeTransitions = {
  async run({ commit, isCurrent }) {
    if (!isCurrent()) return false;
    await commit();
    return true;
  },
  cancel() {},
  diagnostics: () => ({ active: false, available: false }),
};
import("./route-transitions.js")
  .then(({ createRouteTransitions }) => {
    routeTransitions = createRouteTransitions();
  })
  .catch(() => {});
// Optional sound loads independently; a missing audio module must never gate science.
import("./application-sound.js")
  .then(({ installApplicationSound }) => {
    sound = installApplicationSound();
    sound.setSurface(surface);
  })
  .catch(() => {
    const button = $("site-sound");
    button.disabled = true;
    button.setAttribute(
      "aria-label",
      "Sound unavailable; observations remain available",
    );
    button.title = "Sound unavailable; observations remain available";
  });
const consoleView = createObservationConsole({
  root: $("space-workspace"),
  onClose: () => navigate("home"),
  onField: () => {
    if (surface !== "science") return;
    const v = consoleView.engine.active,
      route = v.kind === "pair" ? "compare" : "observations/" + v.field.id;
    history.replaceState(null, "", "#" + route);
    document.querySelectorAll("[data-route]").forEach((a) => {
      if (a.dataset.route === (v.kind === "pair" ? "compare" : "observations"))
        a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    });
  },
  onMode: () => {},
  cue: (name) => sound?.cue(name),
});
function node(tag, text, cls) {
  const e = document.createElement(tag);
  if (text !== undefined) e.textContent = text;
  if (cls) e.className = cls;
  return e;
}
function navigate(route) {
  if (location.hash === "#" + route) routeChanged();
  else location.hash = route;
}
function error(text) {
  $("site-error").hidden = !text;
  $("site-error").textContent = text;
}
function setSurface(next) {
  if (surface === next) return;
  if (surface === "science") consoleView.close();
  universe?.deactivate();
  model?.setVisible(false);
  surface = next;
  sound?.setSurface(next);
  document.body.dataset.surface = next;
  document.body.classList.toggle("science-page", next === "science");
  document.body.classList.toggle("science-open", next === "science");
  document.body.classList.toggle("universe-active", next === "universe");
  $("home-view").hidden = next !== "home";
  $("space-workspace").hidden = next !== "science";
  $("universe-view").hidden = next !== "universe";
  $("site-header").hidden = false;
  $("universe-loading").hidden = true;
  $("site-information").close();
  if (next === "home") model?.setVisible(missionVisible);
  // Surface changes must not retain the previous long document’s footer offset.
  window.scrollTo({ top: 0, left: 0, behavior: "instant" });
}
async function ensureUniverse() {
  if (!universeFactory)
    universeFactory = (async () => {
      const response = await fetch("./universe-shell.html", {
        signal: AbortSignal.timeout(12000),
      });
      if (!response.ok) throw Error("The 3D interface could not load.");
      const doc = new DOMParser().parseFromString(
        await response.text(),
        "text/html",
      );
      $("universe-view").replaceChildren(...doc.body.childNodes);
      return (await import("./immersive.js")).createUniverse;
    })().catch((e) => {
      universeFactory = null;
      throw e;
    });
  return universeFactory;
}
async function routeChanged() {
  const ticket = ++routeSequence,
    animate = routeStarted,
    raw =
      location.hash.slice(1) ||
      new URLSearchParams(location.search).get("view") ||
      "home",
    parts = raw.split("/"),
    route = parts[0],
    field = parts[1];
  routeStarted = true;
  error("");
  document.querySelectorAll("[data-route]").forEach((a) => {
    if (a.dataset.route === route) a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
  });
  if (["observations", "compare", "classic"].includes(route)) {
    const applied = await routeTransitions.run({
      outgoing: $(
        surface === "home"
          ? "home-view"
          : surface === "science"
            ? "space-workspace"
            : "universe-view",
      ),
      incoming: $("space-workspace"),
      animate: animate && surface !== "universe",
      isCurrent: () => ticket === routeSequence,
      commit: () => {
        setSurface("science");
        document.title =
          "SKYSHIFT — " +
          (route === "compare"
            ? "Compare observations"
            : "SPHEREx observations");
        return consoleView.open(field, {
          mode: "classic",
          comparison: route === "compare",
        });
      },
    });
    if (
      applied &&
      ticket === routeSequence &&
      !$("space-workspace").contains(document.activeElement)
    ) {
      $("instrument-title").tabIndex = -1;
      $("instrument-title").focus({ preventScroll: true });
    }
    return;
  }
  if (route === "universe") {
    routeTransitions.cancel();
    setSurface("universe");
    $("universe-loading").hidden = Boolean(universe);
    document.title = "SKYSHIFT — Optional 3D Universe";
    try {
      const create = await ensureUniverse();
      if (ticket !== routeSequence) return;
      if (!universe)
        universe = create({
          observationConsole: consoleView,
          onOpenScience: (id) =>
            navigate("observations" + (id ? "/" + id : "")),
          onExit: () => navigate("home"),
        });
      universe.activate();
      sound?.sync();
      $("universe-loading").hidden = true;
    } catch (e) {
      if (ticket === routeSequence) {
        console.error("Optional Universe initialization:", e);
        setSurface("home");
        error(e.message + " The observation tools remain available.");
        const retry = node("button", "Reload to retry 3D Universe");
        retry.onclick = () => location.reload();
        $("site-error").append(retry);
      }
    }
    return;
  }
  await routeTransitions.run({
    outgoing: $(
      surface === "science"
        ? "space-workspace"
        : surface === "home"
          ? "home-view"
          : "universe-view",
    ),
    incoming: $("home-view"),
    animate: animate && surface === "science",
    isCurrent: () => ticket === routeSequence,
    commit: () => {
      setSurface("home");
      document.title = "SKYSHIFT — Explore & compare SPHEREx observations";
    },
  });
  if (ticket !== routeSequence) return;
  if (route === "mission") {
    // The real field cards precede this anchor. Let their first layout settle
    // so direct mission links do not slide offscreen as the catalogue arrives.
    await initialCatalogue;
    if (ticket !== routeSequence) return;
    requestAnimationFrame(() =>
      $("mission-section").scrollIntoView({
        behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "instant"
          : "smooth",
      }),
    );
  }
}
async function fields() {
  $("home-catalogue-retry").hidden = true;
  try {
    catalogue = await fetchCatalogue();
    renderFields();
    $("home-fields-status").textContent =
      "4 curated fields · 5 individual observations · 1 restricted comparison · scientific approval PENDING";
  } catch (e) {
    $("home-fields-status").textContent = e.message;
    $("home-catalogue-retry").hidden = false;
  }
}
function renderFields() {
  const query = $("home-field-search").value.trim().toLowerCase();
  $("home-fields").replaceChildren();
  let count = 0;
  for (const field of catalogue?.fields || []) {
    const story = stories[field.id];
    if (
      ![field.title, story?.name, story?.kind, story?.constellation]
        .join(" ")
        .toLowerCase()
        .includes(query)
    )
      continue;
    count++;
    const card = node("article", undefined, "field-card"),
      link = node("a");
    link.href = "#observations/" + field.id;
    link.dataset.field = field.id;
    const image = node("img");
    image.src = field.observations[0].preview;
    image.alt =
      "Real prepared single-band SPHEREx observation of " +
      (story?.name || field.title);
    image.width = 260;
    image.height = 160;
    const wrap = node("div", undefined, "field-image");
    const revealImage = image.cloneNode();
    revealImage.alt = "";
    revealImage.setAttribute("aria-hidden", "true");
    revealImage.className = "field-reveal-image";
    const reticle = node("i", undefined, "field-reticle");
    reticle.setAttribute("aria-hidden", "true");
    wrap.append(
      image,
      revealImage,
      reticle,
      node("span", "REAL SPHEREx EXPOSURE"),
    );
    const coordinates = node(
      "small",
      `RA ${field.ra_deg.toFixed(3)}° / Dec ${field.dec_deg >= 0 ? "+" : ""}${field.dec_deg.toFixed(3)}°`,
      "field-coordinates",
    );
    wrap.append(coordinates);
    const content = node("div", undefined, "field-card-copy");
    content.append(
      node("p", story?.kind || "SPHEREx field", "eyebrow"),
      node("h3", story?.name || field.title),
      node("p", story?.short || field.description),
    );
    const dates = node(
      "p",
      field.observations.map((o) => friendlyDate(o.time_start_utc)).join(" / "),
      "field-date",
    );
    content.append(
      dates,
      node(
        "p",
        field.observations.map((o) => o.observation_id).join(" / "),
        "field-source-id",
      ),
      node("strong", "Open observation →", "field-action"),
    );
    link.append(wrap, content);
    card.append(link);
    const reveal = node("button", "◉ Reveal preview", "field-reveal-toggle");
    reveal.setAttribute("aria-pressed", "false");
    reveal.setAttribute(
      "aria-label",
      "◉ Reveal preview — original infrared view of " +
        (story?.name || field.title),
    );
    reveal.onclick = () => {
      const active = card.classList.toggle("preview-revealed");
      reveal.setAttribute("aria-pressed", String(active));
      reveal.textContent = active
        ? "◉ Original preview · on"
        : "◉ Reveal preview";
      reveal.setAttribute(
        "aria-label",
        reveal.textContent + " — " + (story?.name || field.title),
      );
    };
    card.append(reveal);
    if (field.comparison_status === "provisional_restricted") {
      const compare = node("a", "Compare two dates →", "field-compare");
      compare.href = "#compare";
      compare.append(node("small", "Restricted small area · review pending"));
      card.append(compare);
    } else
      card.append(
        node(
          "p",
          field.comparison_status === "incompatible_tested_pairs"
            ? "Single observation · tested pairs incompatible"
            : "Single observation · no suitable pair installed",
          "field-availability",
        ),
      );
    $("home-fields").append(card);
  }
  if (!count)
    $("home-fields").append(
      node(
        "p",
        "No matching sky region. Clear search to see the four curated fields.",
        "empty-fields",
      ),
    );
}
$("home-field-search").oninput = () => {
  renderFields();
  $("home-fields-status").textContent =
    "Search applies to the four supplied fields; this is not an all-sky archive search.";
};
$("home-catalogue-retry").onclick = fields;
document.querySelector(".skip-link").onclick = (e) => {
  e.preventDefault();
  $("main").focus({ preventScroll: true });
};
$("home-resume").hidden = !memory.read().record;
$("home-resume").onclick = () => navigate("observations");
function information() {
  $("site-information").showModal();
}
$("footer-sources").onclick = information;
$("site-information-close").onclick = () => $("site-information").close();
$("infrared-legend-button").onclick = () => {
  const expanded = $("infrared-legend").hidden;
  $("infrared-legend").hidden = !expanded;
  $("infrared-legend-button").setAttribute("aria-expanded", String(expanded));
};
for (const [key, component] of Object.entries(components)) {
  const b = node("button", component.name);
  b.dataset.websiteComponent = key;
  b.onclick = () => {
    model?.focusComponent(key);
    $("website-component-description").textContent = component.description;
    document
      .querySelectorAll("[data-website-component]")
      .forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
  };
  $("website-components").append(b);
}
async function activateModel() {
  if (modelStarting) return;
  modelStarting = true;
  $("activate-mission-model").disabled = true;
  $("activate-mission-model").textContent = "Opening interactive model…";
  $("mission-model-start").classList.add("model-opening");
  $("mission-model-start").setAttribute("aria-busy", "true");
  try {
    const { createMissionModel } = await import("./mission-model.js");
    if (modelFailed) {
      const previous = $("mission-model-canvas"),
        fresh = previous.cloneNode(false);
      previous.replaceWith(fresh);
      modelFailed = false;
    }
    model = createMissionModel($("mission-model-canvas"), {
      onAnchors: (anchors) => {
        const used = [];
        for (const anchor of anchors) {
          const button = document.querySelector(
            '[data-model-hotspot="' + anchor.id + '"]',
          );
          if (!button) continue;
          const r = $("mission-model-canvas").getBoundingClientRect(),
            x = anchor.x * r.width,
            y = anchor.y * r.height;
          const visible =
            anchor.visible &&
            !used.some((p) => Math.hypot(p.x - x, p.y - y) < 48);
          button.hidden = !visible;
          if (visible) {
            used.push({ x, y });
            button.style.left = x + "px";
            button.style.top = y + "px";
          }
        }
      },
      onComponent: (key) =>
        document
          .querySelector('[data-website-component="' + key + '"]')
          ?.click(),
      onError: (text) => {
        $("mission-model-status").textContent = text;
        $("mission-model-start").hidden = false;
        $("mission-model-tools").hidden = true;
        model?.dispose();
        model = null;
        modelFailed = true;
        $("activate-mission-model").textContent = "Retry interactive model";
      },
    });
    $("mission-model-start").hidden = true;
    $("mission-model-tools").hidden = false;
    document
      .querySelector(".mission-section")
      .classList.add("walkthrough-enabled");
    $("mission-model-status").textContent =
      "Illustrative SPHEREx model · drag to rotate, scroll/pinch to zoom. Arrow keys rotate; + / − zoom; Home resets.";
    model.setVisible(surface === "home" && missionVisible);
  } catch (e) {
    modelFailed = true;
    $("mission-model-status").textContent =
      "3D is unavailable: " +
      e.message +
      ". Component descriptions and observations still work.";
  } finally {
    $("mission-model-start").classList.remove("model-opening");
    $("mission-model-start").removeAttribute("aria-busy");
    modelStarting = false;
    $("activate-mission-model").disabled = false;
    $("activate-mission-model").textContent = model
      ? "Interactive model ready"
      : "Retry interactive model";
  }
}
$("activate-mission-model").onclick = activateModel;
$("mission-model-reset").onclick = () => model?.reset();
$("mission-model-zoom-in").onclick = () => model?.zoom(0.8);
$("mission-model-zoom-out").onclick = () => model?.zoom(1.25);
new IntersectionObserver(
  (entries) => {
    missionVisible = entries[0].isIntersecting;
    model?.setVisible(surface === "home" && missionVisible);
  },
  { threshold: 0.1 },
).observe($("mission-section"));
window.addEventListener("hashchange", () =>
  routeChanged().catch((e) => error(e.message)),
);
document.addEventListener("visibilitychange", () => {
  model?.setVisible(!document.hidden && surface === "home" && missionVisible);
});
Object.defineProperty(window, "skyshiftWebsite", {
  value: Object.freeze({
    diagnostics: () => ({
      surface,
      universe_loaded: Boolean(universe),
      model: model?.diagnostics() || null,
      navigation: routeTransitions.diagnostics(),
      investigation: consoleView.diagnostics(),
    }),
  }),
});
const initialCatalogue = fields();
await routeChanged();
