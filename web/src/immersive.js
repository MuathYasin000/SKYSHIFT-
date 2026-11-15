import { fetchCatalogue } from "./catalogue.js";
import { stories, availability, friendlyDate } from "./field-guide.js";
import { bodies, hardware, components } from "./space-content.js";
import { savePreferences } from "./space-preferences.js";
import { createExplorationMemory } from "./exploration-memory.js";
import {
  applicationAudio,
  applicationPreferences,
} from "./application-sound.js";
import { telescopeStories } from "./telescope-stories.js";
import { createTelescopeExperience } from "./telescope-experience.js";
import { placeLabels } from "./infrared-layout.js";

export function createUniverse({ observationConsole, onOpenScience, onExit }) {
  let activeView = true;
  const $ = (id) => document.getElementById(id),
    preferences = applicationPreferences,
    audio = applicationAudio;
  // Scientific presentation mode is owned by the native console, not this legacy
  // rendering preference. Both modes use the same investigation state.
  preferences.mode = "immersive";
  let scene = null,
    catalogue = null,
    manifest = null,
    environment = "observatory",
    selected = "spherex",
    workspace = false,
    lensOrigin = null,
    sceneStarting = false,
    sceneFailure = false,
    requestedFocus = false,
    audioSuspendTimer = null,
    journey = -1,
    hangar = false;
  const telescopeExperience = createTelescopeExperience({
    getScene: () => scene,
    audio,
    openField: (field) => openScience(field),
    onOpen: () => {
      journey = -1;
      $("journey-strip").hidden = true;
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
    $("space-status").dataset.loading = String(
      !error && /loading|decoding|checking/i.test(text),
    );
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
      return Object.entries(hardware)
        .filter(([id]) => hangar || id === "spherex")
        .map(([id, h]) => ({
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
    const destinations = items();
    let count = 0;
    for (const [index, item] of destinations.entries()) {
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
      const marker = element("span", String(index + 1).padStart(2, "0")),
        copy = element("span"), indicator = element("span");
      marker.className = "destination-marker";
      marker.setAttribute("aria-hidden", "true");
      copy.className = "destination-copy";
      copy.append(element("strong", item.name), element("small", item.detail));
      indicator.className = "destination-indicator";
      indicator.setAttribute("aria-hidden", "true");
      button.append(marker, copy, indicator);
      button.onclick = () => select(item.id);
      $("destination-list").append(button);
    }
    $("destination-search-status").textContent = query
      ? count + " of " + destinations.length + " destinations"
      : count + (count === 1 ? " destination" : " destinations");
    $("destination-empty").hidden = count > 0;
    $("destination-list").hidden = count === 0;
    $("destination-clear").disabled = !$("destination-search").value;
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
      const line = element("i");
      line.className = "space-label-leader";
      line.dataset.leader = item.id;
      line.setAttribute("aria-hidden", "true");
      $("space-labels").append(line);
    }
    positionLabels();
  }
  function positionLabels() {
    if (!scene) return;
    const viewport = $("universe").getBoundingClientRect(),
      width = viewport.width,
      height = viewport.height;
    const light = scene.lightLabel(),
      lightLabel = $("optics-ray-label");
    if (lightLabel) {
      lightLabel.hidden = !light?.visible;
      if (light?.visible) {
        lightLabel.style.left = light.x * width + "px";
        lightLabel.style.top = light.y * height + "px";
      }
    }
    const obstacles = [
      ...document.querySelectorAll(
        ".destinations-toggle,.destinations-drawer:not([hidden]),.space-context,.space-actions,.space-hud,.mission-dock>span,.telescope-story:not([hidden]),.telescope-experience:not([hidden]),.journey-strip:not([hidden]),.mission-dock",
      ),
    ]
      .filter((el) => !el.hidden && el.getClientRects().length)
      .map((el) => {
        const r = el.getBoundingClientRect();
        return {
          left: r.left - viewport.left,
          right: r.right - viewport.left,
          top: r.top - viewport.top,
          bottom: r.bottom - viewport.top,
        };
      });
    const positions = scene.positions().map((p) => {
      const b = document.querySelector('[data-object="' + p.id + '"]');
      return {
        ...p,
        x: p.x * width,
        y: p.y * height,
        width: b ? Number((b.dataset.labelWidth ||= b.offsetWidth || 90)) : 90,
        height: b
          ? Number((b.dataset.labelHeight ||= b.offsetHeight || 32))
          : 32,
        selected: p.id === selected,
      };
    });
    for (const p of placeLabels(positions, obstacles, width, height)) {
      const b = document.querySelector('[data-object="' + p.id + '"]');
      if (!b) continue;
      b.hidden = p.hidden;
      const line = document.querySelector('[data-leader="' + p.id + '"]');
      if (line) {
        line.hidden = p.hidden;
        if (!p.hidden) {
          const x = p.left + p.width / 2,
            y = p.top + p.height / 2,
            dx = x - p.x,
            dy = y - p.y;
          line.style.left = p.x + "px";
          line.style.top = p.y + "px";
          line.style.width = Math.max(0, Math.hypot(dx, dy) - 14) + "px";
          line.style.transform = "rotate(" + Math.atan2(dy, dx) + "rad)";
          line.style.opacity = p.opacity * 0.45;
        }
      }
      if (!p.hidden) {
        b.style.left = p.left + "px";
        b.style.top = p.top + "px";
        b.style.opacity = p.opacity;
      }
    }
  }
  const earthStatus = document.createElement("p");
  earthStatus.className = "earth-context-status";
  earthStatus.hidden = true;
  earthStatus.setAttribute("role", "status");
  document.getElementById("universe-view").append(earthStatus);
  $("universe").addEventListener("earth-context", (e) => {
    earthStatus.hidden = e.detail.state !== "failed";
    earthStatus.textContent =
      e.detail.state === "failed"
        ? "Earth context unavailable: " +
          e.detail.reason +
          ". Telescope and observations remain available."
        : "";
  });
  $("universe").addEventListener("space-frame", positionLabels);
  function sceneCopy() {
    const text = {
      observatory: [
        hangar
          ? "OTHER OBSERVATORIES · ILLUSTRATIVE COLLECTION"
          : "SPHEREx · ILLUSTRATIVE SPACECRAFT & EARTH CONTEXT",
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
    $("scene-type").textContent = text[0] + " · ILLUSTRATIVE BACKDROP";
    $("focus-kicker").textContent = text[1];
    $("focus-title").textContent = text[2];
    $("focus-caption").textContent = text[3];
    $("destination-heading").textContent =
      environment === "observatory"
        ? hangar
          ? "OTHER OBSERVATORIES"
          : "MEET SPHEREx"
        : environment === "solar"
          ? "CHOOSE YOUR WORLD"
          : "CURATED SPHEREx FIELDS";
    $("destination-description").textContent = {
      observatory: "Start with SPHEREx, or explore the other illustrative telescope models. Select a telescope to open its info menu.",
      solar: "Explore the Sun, planets and Moon. Positions and sizes are schematic, without live tracking.",
      sky: "Choose a real SPHEREx field. Markers show sky directions, without measured 3D distances or survey coverage.",
    }[environment];
    $("destination-search").placeholder = {
      observatory: "Search telescopes", solar: "Search worlds", sky: "Search fields or constellations",
    }[environment];
    $("destination-collection").hidden = environment !== "observatory";
    $("destination-collection").setAttribute("aria-pressed", String(hangar));
    $("destination-collection").textContent = hangar ? "Show SPHEREx only" : "Show Webb & Hubble";
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
    scene?.setCollection(hangar);
    sceneCopy();
    destinationList();
    labels();
    select(selected, false);
    if (name === "solar" && matchMedia("(max-width:740px)").matches)
      scene?.focus(selected);
    audio.cue("travel");
    transition("travel");
  }
  function revealSelectionMenu() {
    if (telescopeExperience.open) telescopeExperience.close(true);
    journey = -1;
    $("journey-strip").hidden = true;
    setDestinations(false);
  }
  function select(id, focus = true) {
    if (id?.startsWith("component:")) {
      const key = id.slice(10);
      if (!components[key]) return;
      if (focus) revealSelectionMenu();
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
    if (focus) {
      revealSelectionMenu();
      contextDetails(false);
      $("space-context").scrollTop = 0;
    }
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
          ? "Illustrative spacecraft & orbit context · no live tracking"
          : "Reusable NASA model · educational context";
      const variant =
          id === "webb-b"
            ? scene
                ?.diagnostics()
                .assets_loaded.find(
                  (a) => a === "webb-b" || a === "webb-detail",
                ) || (preferences.quality !== "low" ? "webb-detail" : "webb-b")
            : id,
        asset = manifest?.assets.find((a) => a.id === variant);
      $("context-source").href = asset?.source_page || h.source;
      $("context-credit").textContent = asset?.credit || h.credit;
      $("context-limitation").textContent =
        id === "spherex"
          ? "ARTISTIC VISUALIZATION · NOT A DIGITAL TWIN"
          : "NASA MODEL · SKYSHIFT MATERIAL / APERTURE REFINEMENTS";
      scene?.showHardware(id, focus);
      $("look-through").textContent =
        "Look through " + telescopeStories[id].short + " →";
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
        "Preview: real SPHEREx single-band prepared pixels. Hatched areas are excluded data. Exact sources appear in the observation.";
      $("context-limitation").textContent = a.explanation;
      $("context-date").textContent = f.observations
        .map((o) => friendlyDate(o.time_start_utc) + " UTC")
        .join(" · ");
      $("context-preview").src = f.observations[0].preview;
      $("context-preview").alt =
        "Real single-band SPHEREx preview of " + f.title;
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
      if (!activeView) return;
      const { createSpaceScene } = await import("./space-scene.js");
      scene = createSpaceScene($("universe"), {
        assets: manifest.assets,
        fields: catalogue.fields,
        onSelect: (id) => {
          if (id?.startsWith("component:") && selected !== "spherex")
            select("spherex", false);
          select(id);
        },
        onStatus: status,
        onError: renderError,
        preferences,
      });
      sceneFailure = false;
      for (const button of document.querySelectorAll(".hud-controls button"))
        button.disabled = false;
      $("render-fallback").hidden = true;
      scene.setPaused(!activeView);
      scene.setCollection(hangar);
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
  async function openScience(field) {
    if (telescopeExperience.open) telescopeExperience.close(true);
    return onOpenScience(field);
  }
  function closeScience() {
    onExit();
  }
  $("resume-button").hidden =
    !observationConsole.engine.active &&
    !createExplorationMemory().read().record;
  $("resume-button").onclick = () => openScience();

  document
    .querySelectorAll("button[data-environment]")
    .forEach((b) => (b.onclick = () => setEnvironment(b.dataset.environment)));
  $("destination-search").oninput = destinationList;
  function clearDestinationSearch() {
    $("destination-search").value = "";
    destinationList();
    $("destination-search").focus({ preventScroll: true });
  }
  $("destination-clear").onclick = clearDestinationSearch;
  $("destination-reset").onclick = clearDestinationSearch;
  $("from-hardware-to-sky").onclick = () => {
    setEnvironment("sky");
    setDestinations(true);
  };
  document.querySelectorAll("[data-telescope]").forEach(
    (b) =>
      (b.onclick = () => {
        if (workspace) closeScience();
        hangar = b.dataset.telescope !== "spherex";
        document.body.classList.toggle("hangar-open", hangar);
        $("hangar-toggle").textContent = hangar
          ? "Return to SPHEREx"
          : "Other observatories";
        if (environment !== "observatory") setEnvironment("observatory");
        else {
          scene?.setCollection(hangar);
          sceneCopy();
          destinationList();
          labels();
        }
        select(b.dataset.telescope);
      }),
  );
  $("look-through").onclick = () => telescopeExperience.show(selected);
  $("inspect-observation").onclick = () => openScience(selected);
  $("observations-button").onclick = (event) => {
    event.preventDefault();
    openScience(environment === "sky" ? selected : undefined);
  };
  $("fallback-classic").onclick = () => openScience(undefined, "classic");
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
  $("destinations-close").onclick = () => setDestinations(false);
  $("destinations-drawer").addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      setDestinations(false);
      return;
    }
    if (!event.target.matches("[data-destination]")) return;
    const rows = [...$("destination-list").querySelectorAll("button")],
      index = rows.indexOf(event.target);
    let next;
    if (event.key === "ArrowDown") next = rows[(index + 1) % rows.length];
    if (event.key === "ArrowUp") next = rows[(index + rows.length - 1) % rows.length];
    if (event.key === "Home") next = rows[0];
    if (event.key === "End") next = rows.at(-1);
    if (next) {
      event.preventDefault();
      next.focus();
    }
  });
  function setDestinations(open) {
    const drawer = $("destinations-drawer"), restoreFocus = drawer.contains(document.activeElement);
    if (open && telescopeExperience.open) telescopeExperience.close();
    if (open) {
      journey = -1;
      $("journey-strip").hidden = true;
    }
    drawer.hidden = !open;
    $("destinations-toggle").setAttribute("aria-expanded", String(open));
    if (open) {
      drawer.scrollTop = 0;
      $("destinations-close").focus({ preventScroll: true });
    } else if (restoreFocus) $("destinations-toggle").focus({ preventScroll: true });
    positionLabels();
  }
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
      if (dialog === "settings-dialog") {
        $("effects-volume").value = preferences.effects_volume;
      }
      if (dialog === "help-dialog") {
        const d = scene?.diagnostics();
        $("runtime-status").textContent =
          "3D: " +
          (d?.webgl || "not started") +
          " · device pixel ratio " +
          devicePixelRatio +
          " · quality " +
          preferences.quality +
          ". Reading release identity…";
        fetch("./version.json", { signal: AbortSignal.timeout(3000) })
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
                "identity unavailable") +
              " · 3D " +
              (d?.webgl || "not started") +
              " · DPR " +
              devicePixelRatio +
              " · " +
              preferences.quality +
              " quality. Diagnostics stay in this browser.";
          })
          .catch((e) => {
            $("runtime-status").textContent =
              "Release identity could not be read: " + e.message;
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
    document.dispatchEvent(
      new CustomEvent("skyshift:effects", { detail: preferences.effects }),
    );
  };
  document.addEventListener("skyshift:effects", (e) => {
    preferences.effects = Boolean(e.detail);
    $("effects-toggle").checked = preferences.effects;
    scene?.setEffects(preferences.effects);
    document.body.classList.toggle("effects-disabled", !preferences.effects);
  });
  $("quality-select").value = preferences.quality;
  $("quality-select").onchange = (e) => {
    preferences.quality = e.target.value;
    persist();
    $("quality-feedback").textContent =
      "Preference saved. Reload to apply the rendering quality; save scientific work first.";
  };
  for (const [id, key] of [["effects-volume", "effects_volume"]]) {
    $(id).value = preferences[key];
    $(id).oninput = (e) => {
      preferences[key] = Number(e.target.value);
      audio.update();
      persist();
    };
  }
  // Global sound controls and visibility lifecycle are owned by application-sound.
  document.addEventListener("keydown", (e) => {
    if (!activeView) return;
    if (e.defaultPrevented || /INPUT|TEXTAREA|SELECT/.test(e.target.tagName))
      return;
    if (e.key === "Escape" && !document.querySelector("dialog[open]")) {
      if (workspace) closeScience();
      else if (telescopeExperience.open) telescopeExperience.close();
      else if (!$("destinations-drawer").hidden) setDestinations(false);
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
          link.rel = "noopener noreferrer";
          article.append(link, document.createTextNode(" · "));
        }
      if (
        a.refinement_record ===
        "assets/space/observatory-optics-references.json"
      ) {
        const link = element("a", "Refinement sources & limits");
        link.href = "./" + a.refinement_record;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        article.append(link);
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
        mode: observationConsole.diagnostics().classic
          ? "classic"
          : "immersive",
        workspace,
        audio_enabled: audio.enabled,
      }),
      audio: () => audio.diagnostics(),
      telescope: () => telescopeExperience.diagnostics(),
      investigation: () => observationConsole.diagnostics(),
    }),
  });
  sceneCopy();
  destinationList();
  select(selected, false);
  startScene();

  const compact = matchMedia("(max-width:800px)");
  function contextDetails(open) {
    $("space-context").classList.toggle("details-open", open);
    $("context-details").hidden = !open;
    $("context-toggle").setAttribute("aria-expanded", String(open));
    $("context-toggle").querySelector(".context-toggle-label").textContent =
      open ? "Close details" : compact.matches ? "More" : "About & sources";
    $("context-toggle").querySelector(".context-toggle-indicator").textContent =
      open ? "−" : "+";
  }
  compact.addEventListener("change", () =>
    contextDetails(!$("context-details").hidden),
  );
  contextDetails(false);
  setDestinations(false);
  $("context-toggle").onclick = () =>
    contextDetails($("context-details").hidden);

  $("hangar-toggle").onclick = () => {
    if (workspace) closeScience();
    hangar = !hangar;
    document.body.classList.toggle("hangar-open", hangar);
    setEnvironment("observatory");
    scene?.setCollection(hangar);
    $("hangar-toggle").textContent = hangar
      ? "Return to SPHEREx"
      : "Other observatories";
  };
  $("destination-collection").onclick = () => $("hangar-toggle").click();

  return Object.freeze({
    activate() {
      activeView = true;
      scene?.setPaused(false);
      if (!scene) startScene();
    },
    deactivate() {
      activeView = false;
      scene?.setPaused(true);
      for (const d of document.querySelectorAll("#universe-view dialog[open]"))
        d.close();
    },
    diagnostics: () => scene?.diagnostics() || { webgl: "not_started" },
  });
}
