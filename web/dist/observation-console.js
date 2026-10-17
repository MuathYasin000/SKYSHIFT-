import { createInvestigation } from "./investigation.js";
import { pixelToSky, skyToPixel } from "./science.js";
import { displayLevel, paletteRGB } from "./visualization.js";
import { attachViewportInput } from "./viewport-input.js";
import { stories, availability, friendlyDate } from "./field-guide.js";
import { createExplorationMemory } from "./exploration-memory.js";

// Native UI: no iframe, secondary document or second controller. Both presentations
// operate on one investigation object and the same scientific Canvas2D viewports.
export function createObservationConsole({
  root,
  onField = () => {},
  onClose = () => {},
  onMode = () => {},
  cue = () => {},
}) {
  const engine = createInvestigation(),
    memory = createExplorationMemory();
  let catalog = null,
    opened = false,
    classic = false,
    busy = false,
    blink = null,
    raf = 0,
    editing = null,
    uiSequence = 0,
    retry = () => select("m101");
  const sources = new Map(),
    $ = (id) => root.querySelector("#" + id);
  root.innerHTML = `
    <header class="instrument-header">
      <div><p class="space-eyebrow">SPHEREx / SCIENCE INSTRUMENT</p><h2 id="instrument-title">Choose a window into the infrared</h2><p id="instrument-subtitle"></p></div>
      <div class="instrument-actions"><button id="instrument-mode">Classic View</button><button id="instrument-save">Save investigation ↓</button><button id="instrument-open">Reopen ↑</button><button id="instrument-close" aria-label="Return to sky exploration">Back to sky ↗</button><input id="instrument-file" type="file" accept=".json,.zip" hidden></div>
    </header>
    <nav id="instrument-fields" class="instrument-fields" aria-label="Available SPHEREx regions"></nav>
    <div class="instrument-main">
      <section class="instrument-view" aria-label="Observation inspection">
        <div class="instrument-viewbar"><span id="instrument-identity">Real SPHEREx pixels</span><div><button id="instrument-about">Sources & suitability</button><button id="instrument-display">Appearance</button><button id="instrument-notes">Questions <span id="instrument-note-count">0</span></button></div></div>
        <div id="instrument-dates" class="instrument-dates" role="group" aria-label="Observation timeline"></div>
        <div id="instrument-comparison" class="instrument-comparison" role="group" aria-label="Comparison presentation" hidden><button data-compare="side_by_side">Side by side</button><button data-compare="wipe">Wipe</button><button data-compare="single">A / B</button><button id="instrument-blink" aria-pressed="false">Blink</button></div>
        <div id="instrument-canvases" class="instrument-canvases">
          <figure id="instrument-figure-a"><figcaption id="instrument-label-a"></figcaption><canvas id="instrument-canvas-a" tabindex="0" aria-label="Observation A, pan and zoom; click or Enter to inspect a pixel"></canvas></figure>
          <figure id="instrument-figure-b" hidden><figcaption id="instrument-label-b"></figcaption><canvas id="instrument-canvas-b" tabindex="0" aria-label="Observation B, synchronized pan and zoom; click or Enter to inspect a pixel"></canvas></figure>
          <button id="instrument-wipe-handle" aria-label="Drag to reveal the second observation; use the Reveal observation B slider for keyboard control" hidden>↔</button>
          <div id="instrument-loading" class="instrument-loading" role="status" hidden><span></span><strong>Checking scientific data & source identity…</strong></div>
        </div>
        <label id="instrument-wipe-row" class="instrument-wipe-row" hidden>Reveal observation B <input id="instrument-wipe" type="range" min="0" max="100" value="50"><output id="instrument-wipe-value">50%</output></label>
        <div class="instrument-viewtools"><div><button id="instrument-zoom-out" aria-label="Zoom observation out">−</button><output id="instrument-zoom">1.0×</output><button id="instrument-zoom-in" aria-label="Zoom observation in">+</button><button id="instrument-fit">Fit field</button></div><span>N ↑ · E ← · ICRS · Drag to pan, scroll / pinch to zoom</span></div>
        <div id="instrument-inspection" class="instrument-inspection"><p id="instrument-pixel">Select a measured pixel to inspect its sky position and wavelength.</p><button id="instrument-add" disabled>Add a question +</button></div>
      </section>
      <aside id="instrument-panel" class="instrument-panel" hidden><div class="instrument-panel-heading"><h3 id="instrument-panel-title">Field information</h3><button id="instrument-panel-close" aria-label="Close information panel">×</button></div><div id="instrument-panel-body"></div></aside>
    </div>
    <footer class="instrument-footer"><p id="instrument-suitability">Scientific approval PENDING · Questions are hypotheses, not discoveries.</p><div><button id="instrument-compare">Compare observations →</button><button id="instrument-exposure" hidden>← Wider observation</button></div></footer>
    <p id="instrument-status" class="instrument-status" role="status"></p><button id="instrument-retry" hidden>Retry observation</button>
    <dialog id="instrument-question" class="space-dialog"><form method="dialog"><div class="dialog-top"><h2>Your question about this position</h2><button value="cancel" formnovalidate aria-label="Cancel question">×</button></div><p id="instrument-question-position"></p><label for="instrument-question-text">Question or note</label><textarea id="instrument-question-text" maxlength="1500" rows="4" required></textarea><p>User hypothesis only. No measured motion or confirmed variability.</p><div class="instrument-actions"><button value="cancel" formnovalidate>Cancel</button><button id="instrument-question-save" type="button">Save question</button></div><p id="instrument-question-error" role="alert"></p></form></dialog>
    <dialog id="instrument-information" class="space-dialog"><div class="dialog-top"><h2>Source identities & scientific limits</h2><button id="instrument-information-close" aria-label="Close scientific information">×</button></div><div id="instrument-information-body"></div></dialog>`;
  function node(tag, text, cls) {
    const e = document.createElement(tag);
    if (text !== undefined) e.textContent = text;
    if (cls) e.className = cls;
    return e;
  }
  function tell(text, error = false) {
    $("instrument-status").textContent = text;
    $("instrument-status").classList.toggle("status-error", error);
  }
  function stopBlink() {
    clearInterval(blink);
    blink = null;
    $("instrument-blink").textContent = "Blink";
    $("instrument-blink").setAttribute("aria-pressed", "false");
  }
  function setBusy(value) {
    busy = value;
    root.setAttribute("aria-busy", String(value));
    $("instrument-loading").hidden = !value;
    for (const id of [
      "instrument-save",
      "instrument-add",
      "instrument-compare",
      "instrument-exposure",
      "instrument-zoom-in",
      "instrument-zoom-out",
      "instrument-fit",
      "instrument-about",
      "instrument-display",
      "instrument-notes",
    ])
      $(id).disabled = value || !engine.active;
    if (!value && engine.active)
      $("instrument-compare").disabled =
        engine.active.field.comparison_status !== "provisional_restricted";
    $("instrument-retry").hidden = true;
  }
  function remember() {
    const v = engine.active;
    engine.persist();
    if (v?.kind === "exposure") {
      const publicView = engine.exposureRecord(v);
      delete publicView.questions;
      publicView.schema_version = "1.0";
      memory.write(publicView);
    }
  }
  async function run(action) {
    const ticket = ++uiSequence;
    stopBlink();
    setBusy(true);
    tell("");
    $("instrument-panel").hidden = true;
    try {
      const v = await action();
      if (ticket !== uiSequence || !v) return;
      await ensureCatalog();
      onField(v.field.id);
      sources.clear();
      render();
      remember();
      cue("lens");
    } catch (e) {
      if (ticket === uiSequence) {
        tell(
          e.message +
            (engine.active
              ? " The previous verified view is still shown."
              : ""),
          true,
        );
      }
    } finally {
      if (ticket === uiSequence) {
        setBusy(false);
        $("instrument-retry").hidden =
          !$("instrument-status").classList.contains("status-error");
        if (engine.active) {
          $("instrument-add").disabled = !engine.active.inspection?.valid;
          if (engine.active.inspection) inspect(engine.active.inspection);
          draw();
        }
      }
    }
  }
  async function ensureCatalog() {
    if (catalog) return catalog;
    catalog = await engine.catalogue();
    for (const f of catalog.fields) {
      const b = node("button");
      b.dataset.instrumentField = f.id;
      b.append(
        node("strong", stories[f.id]?.name || f.title),
        node(
          "small",
          `${f.observations.length} observation${f.observations.length === 1 ? "" : "s"} · ${f.comparison_status === "provisional_restricted" ? "restricted comparison" : "single exposure"}`,
        ),
      );
      b.onclick = () => select(f.id);
      $("instrument-fields").append(b);
    }
    return catalog;
  }
  function select(field, index = 0) {
    retry = () => select(field, index);
    return run(() => engine.select(field, index));
  }
  function compare() {
    const v = engine.active;
    if (!v || v.field.comparison_status !== "provisional_restricted") return;
    const from = v.inspection?.sky;
    retry = compare;
    return run(async () => {
      const p = await engine.compare();
      if (p && from) {
        const point = skyToPixel(from.ra_deg, from.dec_deg, p.wcs),
          [h, w] = p.shape;
        if (point.x >= 0 && point.x < w && point.y >= 0 && point.y < h) {
          p.display.center_x = Math.min(w - 1, point.x);
          p.display.center_y = Math.min(h - 1, point.y);
        }
      }
      return p;
    });
  }
  function render() {
    const v = engine.active;
    if (!v) return;
    const pair = v.kind === "pair",
      s = stories[v.field.id];
    $("instrument-title").textContent = s?.name || v.field.title;
    $("instrument-subtitle").textContent = pair
      ? "Restricted common-grid comparison · 24 × 24 prepared pixels · 6.15 arcsec/pixel"
      : s?.short || v.field.description;
    $("instrument-identity").textContent = pair
      ? "REAL SPHEREx DATA / TWO EPOCHS / RESTRICTED AREA"
      : "REAL SPHEREx DATA / SINGLE EXPOSURE";
    root
      .querySelectorAll("[data-instrument-field]")
      .forEach((b) =>
        b.setAttribute(
          "aria-pressed",
          String(b.dataset.instrumentField === v.field.id),
        ),
      );
    $("instrument-dates").replaceChildren();
    const observations = pair ? v.manifest.observations : v.field.observations;
    observations.forEach((o, index) => {
      const b = node("button"),
        time = node("time", friendlyDate(o.time_start_utc, true));
      time.dateTime = o.time_start_utc;
      b.append(
        node("small", pair ? "AB"[index] + " · UTC" : "EXPOSURE · UTC"),
        time,
      );
      b.dataset.epoch = String(index);
      b.setAttribute(
        "aria-pressed",
        String(
          pair
            ? v.display.selected_epoch === "AB"[index]
            : o.observation_id === v.entry.observation_id,
        ),
      );
      b.onclick = () => {
        if (pair) {
          stopBlink();
          v.display.selected_epoch = "AB"[index];
          v.display.view_mode = "single";
          v.visual.wipe = false;
          render();
        } else select(v.field.id, index);
      };
      $("instrument-dates").append(b);
    });
    $("instrument-comparison").hidden = !pair;
    $("instrument-compare").hidden = pair;
    $("instrument-exposure").hidden = !pair;
    $("instrument-compare").disabled =
      v.field.comparison_status !== "provisional_restricted";
    $("instrument-compare").textContent =
      v.field.comparison_status === "provisional_restricted"
        ? "Compare restricted M101 area →"
        : "No suitable second date installed";
    $("instrument-suitability").textContent = pair
      ? "Scientific approval PENDING · Wavelength-screened small area; PSF/background equivalence not established. Visual differences are not discoveries."
      : availability(v.field).explanation + " Scientific approval PENDING.";
    $("instrument-note-count").textContent = String(v.questions.length);
    $("instrument-add").disabled = !v.inspection?.valid;
    root
      .querySelectorAll("[data-compare]")
      .forEach((b) =>
        b.setAttribute(
          "aria-pressed",
          String(
            b.dataset.compare ===
              (v.visual.wipe ? "wipe" : v.display.view_mode),
          ),
        ),
      );
    $("instrument-blink").disabled = matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    $("instrument-blink").title = $("instrument-blink").disabled
      ? "Reduced-motion preference: use A / B switching instead."
      : "Alternate the two actual UTC dates every 1.5 seconds";
    const side =
      pair && !v.visual.wipe && v.display.view_mode === "side_by_side";
    $("instrument-canvases").classList.toggle("is-pair", side);
    $("instrument-figure-b").hidden = !side;
    $("instrument-wipe-row").hidden = !pair || !v.visual.wipe;
    $("instrument-wipe-handle").hidden = !pair || !v.visual.wipe;
    $("instrument-wipe").value = v.visual.wipe_position;
    $("instrument-wipe-value").textContent = v.visual.wipe_position + "%";
    $("instrument-wipe-handle").style.left = v.visual.wipe_position + "%";
    $("instrument-label-a").textContent = pair
      ? v.visual.wipe
        ? "A ← WIPE → B"
        : (side ? "A" : v.display.selected_epoch) +
          " · " +
          v.manifest.observations[
            side || v.display.selected_epoch === "A" ? 0 : 1
          ].time_start_utc
      : v.product.observation.time_start_utc +
        " · " +
        v.product.observation.center_wavelength_um.toFixed(4) +
        " μm at field centre";
    $("instrument-label-b").textContent = pair
      ? "B · " + v.manifest.observations[1].time_start_utc
      : "";
    if (v.inspection) inspect(v.inspection);
    else
      $("instrument-pixel").textContent =
        "Select a measured pixel to inspect its sky position and wavelength.";
    renderPixels();
    draw();
  }
  function mask() {
    const v = engine.active;
    return v.kind === "pair" ? v.arrays.COMMON : v.arrays.VALID;
  }
  function renderPixels() {
    const v = engine.active,
      [h, w] = v.shape;
    for (const epoch of v.kind === "pair" ? ["A", "B"] : ["A"]) {
      const data = v.kind === "pair" ? v.arrays["SCI_" + epoch] : v.arrays.SCI,
        c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      const ctx = c.getContext("2d"),
        im = ctx.createImageData(w, h),
        mctx = document.createElement("canvas");
      mctx.width = w;
      mctx.height = h;
      const mc = mctx.getContext("2d"),
        mi = mc.createImageData(w, h);
      for (let i = 0; i < w * h; i++) {
        const valid = mask()[i] && Number.isFinite(data[i]);
        im.data.set(
          [
            ...(valid
              ? paletteRGB(
                  displayLevel(data[i], v.display, v.visual),
                  v.visual.palette,
                )
              : [20, 33, 51]),
            255,
          ],
          i * 4,
        );
        if (!valid) mi.data.set([20, 33, 51, 255], i * 4);
      }
      ctx.putImageData(im, 0, 0);
      mc.putImageData(mi, 0, 0);
      sources.set(epoch, { c, mask: mctx });
    }
  }
  function geometry(c) {
    const r = c.getBoundingClientRect(),
      [h, w] = engine.active.shape;
    return {
      width: r.width,
      height: r.height,
      scale: Math.min(r.width / w, r.height / h) * engine.active.display.zoom,
    };
  }
  let persistTimer;
  function draw() {
    clearTimeout(persistTimer);
    persistTimer = setTimeout(() => engine.persist(), 200);
    if (!raf)
      raf = requestAnimationFrame(() => {
        raf = 0;
        if (!opened || !engine.active) return;
        const v = engine.active,
          side =
            v.kind === "pair" &&
            !v.visual.wipe &&
            v.display.view_mode === "side_by_side";
        drawCanvas(
          $("instrument-canvas-a"),
          side ? "A" : v.display.selected_epoch || "A",
        );
        if (side) drawCanvas($("instrument-canvas-b"), "B");
        $("instrument-zoom").textContent = v.display.zoom.toFixed(1) + "×";
      });
  }
  function drawCanvas(c, epoch) {
    const v = engine.active,
      g = geometry(c);
    if (!g.width || !g.height || !sources.get(epoch)) return;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    c.width = Math.round(g.width * dpr);
    c.height = Math.round(g.height * dpr);
    const ctx = c.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, g.width, g.height);
    function image(key, left = 0, right = g.width) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(left, 0, right - left, g.height);
      ctx.clip();
      ctx.translate(g.width / 2, g.height / 2);
      ctx.scale(g.scale, -g.scale);
      ctx.imageSmoothingEnabled = v.visual.interpolation === "smooth";
      ctx.drawImage(
        sources.get(key).c,
        -v.display.center_x - 0.5,
        -v.display.center_y - 0.5,
      );
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(
        sources.get(key).mask,
        -v.display.center_x - 0.5,
        -v.display.center_y - 0.5,
      );
      ctx.restore();
    }
    if (v.kind === "pair" && v.visual.wipe) {
      const x = (g.width * v.visual.wipe_position) / 100;
      image("A", 0, x);
      image("B", x, g.width);
      ctx.strokeStyle = "#e7bb69";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, g.height);
      ctx.stroke();
    } else image(epoch);
    function marker(point, label) {
      const x = g.width / 2 + (point.x - v.display.center_x) * g.scale,
        y = g.height / 2 - (point.y - v.display.center_y) * g.scale;
      ctx.strokeStyle = "#e7bb69";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(x, y, 10, 0, Math.PI * 2);
      ctx.stroke();
      if (label) {
        ctx.font = "12px Outfit";
        ctx.fillStyle = "#f1eee5";
        ctx.fillText(label, x + 13, y - 8);
      }
    }
    v.questions.forEach((q, i) =>
      marker(skyToPixel(q.ra_deg, q.dec_deg, v.wcs), String(i + 1)),
    );
    if (v.inspection?.valid) marker(v.inspection, "Selected");
  }
  function inspect(point) {
    const v = engine.active;
    if (!v || busy) return;
    if (!point) {
      v.inspection = null;
      $("instrument-add").disabled = true;
      draw();
      return;
    }
    const x = Math.round(point.x),
      y = Math.round(point.y),
      [h, w] = v.shape,
      valid = x >= 0 && x < w && y >= 0 && y < h && Boolean(mask()[y * w + x]);
    v.inspection = { x, y, valid, sky: pixelToSky(x, y, v.wcs) };
    $("instrument-add").disabled = !valid;
    if (!valid)
      $("instrument-pixel").textContent =
        "No usable measurement here. Blue areas are excluded data, not empty space. Select an unmasked pixel.";
    else {
      const sky = v.inspection.sky,
        i = y * w + x,
        values =
          v.kind === "pair"
            ? ["A", "B"]
                .map(
                  (k) =>
                    k +
                    " " +
                    v.arrays["SCI_" + k][i].toFixed(4) +
                    " MJy/sr · λ " +
                    v.arrays["WAVE_" + k][i].toFixed(4) +
                    " μm · Δλ " +
                    v.arrays["BAND_" + k][i].toFixed(4) +
                    " μm",
                )
                .join(" / ")
            : v.arrays.SCI[i].toFixed(4) +
              " MJy/sr · λ " +
              v.arrays.WAVE[i].toFixed(4) +
              " μm · bandwidth " +
              v.arrays.BAND[i].toFixed(4) +
              " μm";
      $("instrument-pixel").textContent =
        `ICRS ${sky.ra_deg.toFixed(6)}°, ${sky.dec_deg.toFixed(6)}° · ${values}`;
    }
    cue("select");
    draw();
  }
  for (const id of ["instrument-canvas-a", "instrument-canvas-b"])
    attachViewportInput($(id), {
      getView: () => !busy && opened && engine.active?.display,
      getGeometry: () => geometry($(id)),
      getBounds: () => ({
        width: engine.active.shape[1],
        height: engine.active.shape[0],
      }),
      onView: (next) => {
        Object.assign(engine.active.display, next);
        draw();
        remember();
      },
      onTap: inspect,
    });
  new ResizeObserver(draw).observe($("instrument-canvases"));
  function zoom(factor) {
    const v = engine.active;
    if (!v) return;
    v.display.zoom = Math.max(1, Math.min(20, v.display.zoom * factor));
    draw();
    remember();
  }
  $("instrument-zoom-in").onclick = () => zoom(1.25);
  $("instrument-zoom-out").onclick = () => zoom(1 / 1.25);
  $("instrument-fit").onclick = () => {
    const v = engine.active;
    v.display.zoom = 1;
    v.display.center_x = (v.shape[1] - 1) / 2;
    v.display.center_y = (v.shape[0] - 1) / 2;
    draw();
    remember();
  };
  $("instrument-compare").onclick = compare;
  $("instrument-exposure").onclick = () => select(engine.active.field.id);
  root.querySelectorAll("[data-compare]").forEach(
    (b) =>
      (b.onclick = () => {
        stopBlink();
        const v = engine.active;
        v.visual.wipe = b.dataset.compare === "wipe";
        v.display.view_mode =
          b.dataset.compare === "side_by_side" ? "side_by_side" : "single";
        render();
      }),
  );
  $("instrument-blink").onclick = () => {
    if (blink) {
      stopBlink();
      return;
    }
    const v = engine.active;
    if (
      v?.kind !== "pair" ||
      matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;
    v.visual.wipe = false;
    v.display.view_mode = "single";
    render();
    $("instrument-blink").textContent = "Stop blink";
    $("instrument-blink").setAttribute("aria-pressed", "true");
    blink = setInterval(() => {
      v.display.selected_epoch = v.display.selected_epoch === "A" ? "B" : "A";
      $("instrument-label-a").textContent =
        v.display.selected_epoch +
        " · " +
        v.manifest.observations[v.display.selected_epoch === "A" ? 0 : 1]
          .time_start_utc;
      $("instrument-dates")
        .querySelectorAll("button")
        .forEach((b, i) =>
          b.setAttribute(
            "aria-pressed",
            String(v.display.selected_epoch === "AB"[i]),
          ),
        );
      draw();
    }, 1500);
  };
  function wipe(value) {
    engine.active.visual.wipe_position = Math.max(
      0,
      Math.min(100, Number(value)),
    );
    $("instrument-wipe").value = engine.active.visual.wipe_position;
    $("instrument-wipe-value").textContent =
      Math.round(engine.active.visual.wipe_position) + "%";
    $("instrument-wipe-handle").style.left =
      engine.active.visual.wipe_position + "%";
    draw();
  }
  $("instrument-wipe").oninput = (e) => wipe(e.target.value);
  const handle = $("instrument-wipe-handle");
  let dragging = false;
  handle.onpointerdown = (e) => {
    dragging = true;
    handle.setPointerCapture(e.pointerId);
  };
  handle.onpointermove = (e) => {
    if (!dragging) return;
    const r = $("instrument-canvases").getBoundingClientRect();
    wipe(((e.clientX - r.left) / r.width) * 100);
  };
  handle.onpointerup = handle.onpointercancel = () => {
    dragging = false;
  };
  handle.onkeydown = (e) => {
    if (["ArrowLeft", "ArrowRight"].includes(e.key)) {
      e.preventDefault();
      wipe(
        engine.active.visual.wipe_position + (e.key === "ArrowLeft" ? -1 : 1),
      );
    }
  };
  function panel(title) {
    $("instrument-panel").hidden = false;
    $("instrument-panel-title").textContent = title;
    $("instrument-panel-body").replaceChildren();
    return $("instrument-panel-body");
  }
  $("instrument-panel-close").onclick = () => {
    $("instrument-panel").hidden = true;
    draw();
  };
  $("instrument-display").onclick = () => {
    const v = engine.active,
      body = panel("Display, not new measurements");
    body.append(
      node(
        "p",
        "These controls change appearance only. The measured arrays and quality masks remain unchanged. Nearest-pixel display reveals the actual prepared resolution.",
      ),
    );
    for (const [key, label, options] of [
      ["stretch", "Brightness stretch", ["linear", "asinh", "log"]],
      ["palette", "Colour map", ["grayscale", "ember", "ice"]],
      ["interpolation", "Pixel rendering", ["nearest", "smooth"]],
    ]) {
      const l = node("label", label),
        s = node("select");
      s.id = "instrument-visual-" + key;
      for (const value of options) {
        const o = node("option", value);
        o.value = value;
        s.append(o);
      }
      s.value = v.visual[key];
      s.onchange = () => {
        v.visual[key] = s.value;
        if (v.kind === "pair" && key === "stretch" && s.value !== "log")
          v.display.stretch = s.value;
        renderPixels();
        draw();
        remember();
      };
      l.append(s);
      body.append(l);
    }
    const l = node("label", "Brightness limits (MJy/sr)"),
      min = node("input"),
      max = node("input"),
      apply = node("button", "Apply limits");
    min.type = max.type = "number";
    min.step = max.step = "any";
    min.setAttribute("aria-label", "Minimum brightness");
    max.setAttribute("aria-label", "Maximum brightness");
    min.value = v.display.vmin;
    max.value = v.display.vmax;
    if (v.kind === "pair") {
      apply.onclick = () => {
        const lo = Number(min.value),
          hi = Number(max.value);
        if (
          !min.value ||
          !max.value ||
          !Number.isFinite(lo) ||
          !Number.isFinite(hi) ||
          hi <= lo
        ) {
          tell("Choose finite limits with maximum greater than minimum.", true);
          return;
        }
        v.display.vmin = lo;
        v.display.vmax = hi;
        renderPixels();
        draw();
      };
      l.append(min, max, apply);
      body.append(l);
    } else {
      const contrast = node("input");
      contrast.type = "range";
      contrast.min = ".5";
      contrast.max = "2";
      contrast.step = ".05";
      contrast.value = v.contrast;
      const cl = node("label", "Contrast");
      contrast.oninput = () => {
        v.contrast = Number(contrast.value);
        v.display.vmax =
          v.product.display.vmin +
          (v.product.display.vmax - v.product.display.vmin) / v.contrast;
        renderPixels();
        draw();
        remember();
      };
      cl.append(contrast);
      body.append(cl);
    }
  };
  function notes() {
    const body = panel("Questions about measured positions"),
      v = engine.active;
    $("instrument-note-count").textContent = v.questions.length;
    body.append(
      node(
        "p",
        "Select a usable pixel, then add a question. Notes stay in this open application; save an investigation to keep or share them.",
      ),
    );
    v.questions.forEach((q, i) => {
      const row = node("article", undefined, "instrument-note");
      row.append(
        node("strong", `${i + 1}. ${q.question ?? q.note}`),
        node("small", `ICRS ${q.ra_deg.toFixed(6)}°, ${q.dec_deg.toFixed(6)}°`),
      );
      for (const [label, action] of [
        [
          "Locate",
          () => {
            const p = skyToPixel(q.ra_deg, q.dec_deg, v.wcs);
            Object.assign(v.display, {
              center_x: Math.max(0, Math.min(v.shape[1] - 1, p.x)),
              center_y: Math.max(0, Math.min(v.shape[0] - 1, p.y)),
            });
            inspect(p);
            draw();
          },
        ],
        ["Edit", () => question(q)],
        [
          "Delete",
          () => {
            engine.updateQuestions(v.questions.filter((n) => n !== q));
            notes();
            draw();
          },
        ],
      ]) {
        const b = node("button", label);
        b.onclick = action;
        row.append(b);
      }
      body.append(row);
    });
    if (!v.questions.length)
      body.append(node("p", "No questions recorded yet."));
  }
  $("instrument-notes").onclick = notes;
  function question(q = null) {
    const v = engine.active;
    if (!q && !v.inspection?.valid) return;
    editing = q;
    const sky = q || v.inspection.sky;
    $("instrument-question-position").textContent =
      `ICRS ${sky.ra_deg.toFixed(6)}°, ${sky.dec_deg.toFixed(6)}°`;
    $("instrument-question-text").value = q?.question ?? q?.note ?? "";
    $("instrument-question-error").textContent = "";
    stopBlink();
    $("instrument-question").showModal();
    $("instrument-question-text").focus();
  }
  $("instrument-add").onclick = () => question();
  $("instrument-question-save").onclick = () => {
    const v = engine.active,
      text = $("instrument-question-text").value.trim();
    if (!text) {
      $("instrument-question-error").textContent =
        "Write a question or note first.";
      return;
    }
    try {
      const sky = editing || v.inspection.sky,
        q = editing
          ? { ...editing }
          : v.kind === "pair"
            ? {
                annotation_id: crypto.randomUUID(),
                pair_id: v.manifest.pair_id,
                frame: "icrs",
                ra_deg: sky.ra_deg,
                dec_deg: sky.dec_deg,
                category: "uncertain",
                created_at: new Date().toISOString(),
              }
            : {
                id: crypto.randomUUID(),
                product_sha256: v.entry.sha256,
                frame: "icrs",
                ra_deg: sky.ra_deg,
                dec_deg: sky.dec_deg,
                created_at: new Date().toISOString(),
              };
      q[v.kind === "pair" ? "note" : "question"] = text;
      engine.updateQuestions(
        editing
          ? v.questions.map((n) => (n === editing ? q : n))
          : [...v.questions, q],
      );
      $("instrument-question").close();
      notes();
      draw();
      cue("component");
    } catch (e) {
      $("instrument-question-error").textContent = e.message;
    }
  };
  $("instrument-about").onclick = () => {
    const v = engine.active,
      body = $("instrument-information-body");
    body.replaceChildren(
      node("p", stories[v.field.id]?.story),
      node(
        "p",
        "Scientific approval PENDING. Internal human review PENDING. No Planet X detection, measured motion or confirmed variability is established.",
      ),
    );
    body.append(
      node("h3", "Why can these images be compared?"),
      node(
        "p",
        v.kind === "pair"
          ? "Only this small common-grid M101 area passed the engineering wavelength and registration screens. Qualified scientific assessment is still pending. The two wider contexts are not approved for unrestricted temporal comparison."
          : availability(v.field).explanation,
      ),
    );
    if (v.kind === "pair") {
      const r = v.bundle.registration;
      body.append(
        node(
          "p",
          `${r.reference_count} measured reference sources · median residual ${r.median_residual_arcsec.toFixed(4)} arcsec · 95th percentile ${r.p95_residual_arcsec.toFixed(4)} arcsec. These are inter-epoch residuals, not absolute astrometric precision.`,
        ),
      );
      for (const limitation of v.bundle.response.restrictions)
        body.append(node("p", limitation));
    }
    const obs =
      v.kind === "pair" ? v.manifest.observations : [v.product.observation];
    for (const o of obs) {
      body.append(
        node("h3", o.observation_id),
        node("p", o.time_start_utc + " UTC"),
      );
      for (const [name, f] of [
        ["Original archive FITS", o.source],
        ["Spectral calibration", o.spectral_calibration],
      ]) {
        body.append(node("strong", name), node("code", "SHA-256 " + f.sha256));
        const a = node("a", "Open NASA/IPAC archive source ↗");
        a.href = f.source_url;
        a.target = "_blank";
        a.rel = "noreferrer";
        body.append(a);
      }
    }
    const processing = node("details"),
      summary = node("summary", "Processing, quality masks & exact geometry");
    processing.append(
      summary,
      node(
        "pre",
        JSON.stringify(
          v.kind === "pair"
            ? v.manifest.processing
            : {
                ...v.product.processing,
                wcs: v.wcs,
                native_shape: v.product.native_shape,
                prepared_shape: v.shape,
                wavelength_range_um: v.product.wavelength_range_um,
                limitations: v.product.limitations,
              },
          null,
          2,
        ),
      ),
    );
    body.append(processing);
    if (v.kind === "pair") {
      const review = node(
        "button",
        "Download full reproducible review packet (40.7 MB)",
      );
      review.id = "instrument-review-download";
      review.onclick = async () => {
        review.disabled = true;
        review.textContent = "Verifying original-data packet…";
        try {
          download(await engine.reviewPacket());
          review.textContent = "Review packet downloaded; hashes verified.";
        } catch (e) {
          review.textContent = "Retry full review packet";
          tell(e.message, true);
        } finally {
          review.disabled = false;
        }
      };
      body.append(
        review,
        node(
          "p",
          "Includes original FITS and calibrations. Downloading a review packet does not constitute human scientific approval.",
        ),
      );
    }
    stopBlink();
    $("instrument-information").showModal();
  };
  $("instrument-information-close").onclick = () =>
    $("instrument-information").close();
  function download(file) {
    const url = URL.createObjectURL(
        new Blob([file.bytes], { type: file.type }),
      ),
      a = node("a");
    a.href = url;
    a.download = file.name;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  }
  $("instrument-save").onclick = async () => {
    stopBlink();
    $("instrument-save").disabled = true;
    try {
      download(await engine.save());
      tell(
        "Investigation saved with source identities, coordinates, display settings and questions. Comparison ZIPs include prepared FITS, masks and hashes.",
      );
    } catch (e) {
      tell(e.message, true);
    } finally {
      $("instrument-save").disabled = false;
    }
  };
  $("instrument-open").onclick = () => $("instrument-file").click();
  $("instrument-file").onchange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 100000000) {
      tell("Saved investigation exceeds the supported file size.", true);
      return;
    }
    await run(async () =>
      engine.reopen(new Uint8Array(await file.arrayBuffer())),
    );
  };
  $("instrument-retry").onclick = () => retry();
  function setMode(value) {
    classic = Boolean(value);
    document.body.classList.toggle("classic-science", classic);
    $("instrument-mode").textContent = classic
      ? "Immersive Explorer"
      : "Classic View";
    $("instrument-mode").setAttribute("aria-pressed", String(classic));
    onMode(classic);
    stopBlink();
    draw();
  }
  $("instrument-mode").onclick = () => setMode(!classic);
  $("instrument-close").onclick = () => onClose();
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stopBlink();
  });
  window.addEventListener("pagehide", () => engine.persist());
  matchMedia("(prefers-reduced-motion: reduce)").addEventListener(
    "change",
    () => {
      stopBlink();
      if (engine.active) render();
    },
  );
  async function resume() {
    const c = await engine.catalogue(),
      last = engine.lastSession();
    if (last) {
      if (
        last.kind === "pair" &&
        last.field === "m101" &&
        last.key === "pair-52ad675d929b0740c23b"
      )
        return run(() => engine.compare());
      const f = c.fields.find((f) => f.id === last.field),
        index = f?.observations.findIndex((o) => o.sha256 === last.key);
      if (index >= 0) return select(f.id, index);
    }
    const saved = memory.read().record;
    if (saved)
      return run(() =>
        engine.reopen(new TextEncoder().encode(JSON.stringify(saved))),
      );
    return select("m101");
  }
  return {
    async open(field, { mode } = {}) {
      opened = true;
      root.hidden = false;
      setMode(mode === "classic" || (mode === undefined && classic));
      if (field && field !== engine.active?.field.id) await select(field);
      else if (!engine.active) {
        if (field) await select(field);
        else
          try {
            await resume();
          } catch (e) {
            tell(e.message, true);
            $("instrument-retry").hidden = false;
          }
      } else {
        render();
        draw();
      }
    },
    close() {
      engine.persist();
      opened = false;
      uiSequence++;
      engine.cancel();
      setBusy(false);
      stopBlink();
      root.hidden = true;
      document.body.classList.remove("classic-science");
    },
    setMode,
    diagnostics: () => ({
      ...engine.diagnostics(),
      opened,
      classic,
      busy,
      blinking: Boolean(blink),
    }),
    engine,
  };
}
