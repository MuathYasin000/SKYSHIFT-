const theme = uiTheme();
import { uiTheme } from "./ui-theme.js";
import { loadCatalog, galleries, make } from "./site.js";
import { pixelToSky, skyToPixel } from "./science.js";
import {
  defaultVisualization,
  displayLevel,
  paletteRGB,
  validateVisualization,
} from "./visualization.js";
import { stories, availability, friendlyDate } from "./field-guide.js";
import { showSources } from "./visitor.js";
import { attachViewportInput } from "./viewport-input.js";
import { createExplorationMemory } from "./exploration-memory.js";
import { createSkyAtlas } from "./sky-atlas.js";
import { createExposureLoader } from "./exposure-loader.js";
import { createExposureNotebook } from "./exposure-notebook.js";
import {
  MAX_VIEW_RECORD_BYTES,
  createExposureRecord,
  parseExposureRecord,
  resolveExposureRecord,
  validateExposureRecord,
} from "./exposure-records.js";

const $ = (id) => document.getElementById(id);
const state = {
  catalog: null,
  field: null,
  product: null,
  arrays: null,
  entry: null,
  visual: { ...defaultVisualization },
  zoom: 1,
  cx: 0,
  cy: 0,
  contrast: 1,
  request: 0,
  importRequest: 0,
};
const loadExposure = createExposureLoader();
let source = null,
  sourceMask = null,
  inspection = null,
  drawFrame = 0,
  atlas = null;
const memory = createExplorationMemory();
let resumeRecord = null,
  saveTimer = 0;
function currentRecord() {
  return state.product
    ? createExposureRecord(state.field, state.entry, state.product, {
        visualization: state.visual,
        contrast: state.contrast,
        viewport: { zoom: state.zoom, center_x: state.cx, center_y: state.cy },
      })
    : null;
}
function saveExploration() {
  clearTimeout(saveTimer);
  saveTimer = 0;
  const record = currentRecord();
  if (!record) return;
  if (memory.write(record)) {
    resumeRecord = record;
    $("resume-exploration").hidden = false;
    $("resume-feedback").textContent = "Last view saved on this device.";
  } else
    $("resume-feedback").textContent =
      "Local history is unavailable. Use Save exposure view to keep this view.";
}
function queueSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveExploration, 200);
}
window.addEventListener("pagehide", () => {
  if (saveTimer) saveExploration();
});

function busy(value) {
  $("explorer").setAttribute("aria-busy", String(value));
  $("explore-loading").hidden = !value;
  $("explore-content").hidden = value || !state.product;
  $("context-source").disabled = value || !state.product;
  $("export-context").disabled = value || !state.product;
}
function facts() {
  const p = state.product,
    o = p.observation;
  $("exposure-summary").textContent =
    "Viewing one exposure · " + friendlyDate(o.time_start_utc, true);
  const items = [
    ["Exposure start (UTC)", o.time_start_utc],
    ["Exposure end (UTC)", o.time_end_utc],
    [
      "Wavelength range",
      p.wavelength_range_um.map((x) => x.toFixed(4)).join("–") + " μm",
    ],
    [
      "At the field center",
      `λ ${o.center_wavelength_um.toFixed(4)} μm · bandwidth ${o.center_bandwidth_um.toFixed(4)} μm`,
    ],
    [
      "Release / detector / pipeline",
      `${o.release.toUpperCase()} / D${o.detector} / ${o.pipeline_version}`,
    ],
    ["Original cutout", `${p.native_shape[1]} × ${p.native_shape[0]} pixels`],
    [
      "Prepared context",
      `${p.shape[1]} × ${p.shape[0]} pixels · ${p.pixel_scale_arcsec} arcsec/pixel`,
    ],
    [
      "Usable context pixels",
      (
        (100 * state.arrays.VALID.reduce((a, b) => a + b, 0)) /
        state.arrays.VALID.length
      ).toFixed(1) + "%",
    ],
    [
      "Center (ICRS sky coordinates)",
      `${state.field.ra_deg.toFixed(5)}°, ${state.field.dec_deg.toFixed(5)}°`,
    ],
  ];
  $("explore-facts").replaceChildren();
  for (const [k, v] of items) {
    const row = make("div");
    row.append(make("dt", k), make("dd", v));
    $("explore-facts").append(row);
  }
  $("explore-source").replaceChildren();
  for (const [label, f] of [
    ["Original FITS", o.source],
    ["Full spectral calibration", o.spectral_calibration],
  ]) {
    const row = make("div", undefined, "source-row");
    row.append(
      make("strong", label),
      make("code", f.path),
      make("code", "SHA-256 " + f.sha256),
    );
    const a = make("a", "Open original NASA/IPAC source ↗");
    a.href = f.source_url;
    a.target = "_blank";
    a.rel = "noreferrer";
    row.append(a);
    $("explore-source").append(row);
  }
  $("explore-source").append(
    make(
      "p",
      "Conservative mask: only the SOURCE flag is retained. Other declared and unknown flags are masked, and every bilinear contributor must be usable.",
    ),
  );
}
function render() {
  if (!state.product) return;
  const [h, w] = state.product.shape,
    p = state.product,
    canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d"),
    im = ctx.createImageData(w, h),
    display = {
      ...p.display,
      vmax: p.display.vmin + (p.display.vmax - p.display.vmin) / state.contrast,
    };
  for (let i = 0; i < w * h; i++) {
    const rgb = state.arrays.VALID[i]
      ? paletteRGB(
          displayLevel(state.arrays.SCI[i], display, state.visual),
          state.visual.palette,
        )
      : [20, 33, 51];
    im.data.set([...rgb, 255], i * 4);
  }
  ctx.putImageData(im, 0, 0);
  source = canvas;
  sourceMask = document.createElement("canvas");
  sourceMask.width = w;
  sourceMask.height = h;
  const maskContext = sourceMask.getContext("2d"),
    mask = maskContext.createImageData(w, h);
  for (let i = 0; i < w * h; i++)
    if (!state.arrays.VALID[i]) mask.data.set([20, 33, 51, 255], i * 4);
  maskContext.putImageData(mask, 0, 0);
  draw();
}
function geometry() {
  const rect = $("explore-canvas").getBoundingClientRect(),
    [h, w] = state.product.shape;
  return {
    width: rect.width,
    height: rect.height,
    scale: Math.min(rect.width / w, rect.height / h) * state.zoom,
  };
}
function draw() {
  if (!drawFrame)
    drawFrame = requestAnimationFrame(() => {
      drawFrame = 0;
      drawNow();
    });
}
function drawNow() {
  if (!source || !state.product || $("explore-content").hidden) return;
  const c = $("explore-canvas"),
    g = geometry(),
    dpr = Math.min(devicePixelRatio || 1, 2);
  if (!g.width || !g.height) return;
  c.width = Math.round(g.width * dpr);
  c.height = Math.round(g.height * dpr);
  const ctx = c.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = theme.black;
  ctx.fillRect(0, 0, g.width, g.height);
  ctx.save();
  ctx.translate(g.width / 2, g.height / 2);
  ctx.scale(g.scale, -g.scale);
  ctx.imageSmoothingEnabled = state.visual.interpolation === "smooth";
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(source, -state.cx - 0.5, -state.cy - 0.5);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(sourceMask, -state.cx - 0.5, -state.cy - 0.5);
  ctx.restore();
  ctx.font = '12px "IBM Plex Mono",monospace';
  ctx.fillStyle = theme.white;
  ctx.fillText("N ↑", g.width - 45, 26);
  ctx.fillText("E ←", g.width - 45, 44);
  if (inspection) {
    const x = g.width / 2 + (inspection.x - state.cx) * g.scale,
      y = g.height / 2 - (inspection.y - state.cy) * g.scale;
    ctx.strokeStyle = theme.white;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x - g.scale / 2, y - g.scale / 2, g.scale, g.scale);
  }
  for (const [i, q] of notebook.current().entries()) {
    const point = skyToPixel(q.ra_deg, q.dec_deg, state.product.wcs),
      x = g.width / 2 + (point.x - state.cx) * g.scale,
      y = g.height / 2 - (point.y - state.cy) * g.scale;
    ctx.beginPath();
    ctx.arc(x, y, 11, 0, Math.PI * 2);
    ctx.fillStyle = theme.black;
    ctx.fill();
    ctx.strokeStyle = theme.white;
    ctx.stroke();
    ctx.fillStyle = theme.white;
    ctx.textAlign = "center";
    ctx.fillText(String(i + 1), x, y + 4);
    ctx.textAlign = "start";
  }
  $("explore-zoom").textContent = state.zoom.toFixed(1) + "×";
}
function setZoom(z) {
  if (!state.product) return;
  state.zoom = Math.max(1, Math.min(20, z));
  $("explore-zoom").textContent = state.zoom.toFixed(1) + "×";
  draw();
  queueSave();
}

async function selectObservation(entry, index, remember = false) {
  const seq = ++state.request;
  const button = $("observation-timeline").children[index],
    returnFocus = document.activeElement === button;
  if (!$("open-context").disabled)
    fileFeedback(
      "Use an Explore JSON record. Comparison ZIPs reopen in Compare.",
    );
  state.entry = entry;
  state.product = null;
  state.arrays = null;
  source = null;
  sourceMask = null;
  inspection = null;
  $("pixel-summary").hidden = true;
  input.reset();
  notebook.changed();
  $("explore-loading").querySelector("strong").textContent =
    "Opening a real SPHEREx exposure";
  $("explore-error").hidden = true;
  $("explore-retry").hidden = true;
  $("exposure-summary").textContent = "Checking the selected exposure…";
  busy(true);
  try {
    const loaded = await loadExposure(entry);
    if (seq !== state.request) return;
    state.product = loaded.product;
    state.arrays = loaded.arrays;
    const [h, w] = state.product.shape;
    state.zoom = 1;
    state.cx = (w - 1) / 2;
    state.cy = (h - 1) / 2;
    state.contrast = 1;
    $("explore-contrast").value = 1;
    for (const [i, b] of [...$("observation-timeline").children].entries()) {
      b.classList.toggle("selected", i === index);
      b.setAttribute("aria-pressed", String(i === index));
    }
    facts();
    busy(false);
    notebook.changed();
    render();
    $("explore-coordinate").textContent =
      "Move over the image to read a prepared pixel.";
    if (remember) {
      rememberExposure(state.field, entry);
      queueSave();
    }
    if (returnFocus) button.focus({ preventScroll: true });
  } catch (e) {
    if (seq !== state.request) return;
    state.product = null;
    state.arrays = null;
    source = null;
    busy(false);
    $("explore-loading").hidden = true;
    $("exposure-summary").textContent =
      "Exposure unavailable · nothing has been displayed";
    $("explore-error").hidden = false;
    $("explore-error").textContent = e.message;
    $("explore-retry").hidden = false;
  }
}

function describeField(f) {
  const story = stories[f.id],
    status = availability(f);
  state.field = f;
  atlas?.select(f.id, false);
  $("explore-title").textContent = f.title;
  $("explore-description").textContent =
    "Explore a single real infrared exposure. This larger view is not a time comparison.";
  $("compare-link").hidden = !status.limited;
  $("explore-status").textContent = status.explanation;
  $("object-kind").textContent = story?.kind || "CURATED SKY REGION";
  $("object-name").textContent = story?.name || f.title;
  $("object-story").textContent = story?.story || f.description;
  $("look-prompt").textContent =
    story?.look || "Explore the measured light and its quality mask.";
  $("object-caution").textContent = story?.caution || "";
  $("object-source").href =
    story?.source || "https://science.nasa.gov/mission/spherex/";
  for (const a of document.querySelectorAll("[data-field]")) {
    if (a.dataset.field === f.id) a.setAttribute("aria-current", "true");
    else a.removeAttribute("aria-current");
  }
  $("observation-timeline").replaceChildren();
  for (const [i, o] of f.observations.entries()) {
    const b = make("button", friendlyDate(o.time_start_utc));
    b.title = "Individual exposure · " + friendlyDate(o.time_start_utc, true);
    b.setAttribute(
      "aria-label",
      "View single exposure " + friendlyDate(o.time_start_utc),
    );
    b.addEventListener("click", () => selectObservation(o, i, true));
    $("observation-timeline").append(b);
  }
}
function rememberExposure(field, entry) {
  const url = new URL(location.href);
  url.searchParams.set("field", field.id);
  url.searchParams.set("observation", entry.observation_id);
  url.hash = "explorer";
  url.searchParams.delete("resume");
  if (url.href !== location.href) history.pushState(null, "", url);
}
function choose(id, observationId) {
  const known = state.catalog.fields.find((f) => f.id === id),
    f = known || state.catalog.fields[0];
  const requested = f.observations.findIndex(
      (o) => o.observation_id === observationId,
    ),
    index = requested >= 0 ? requested : 0;
  describeField(f);
  const pending = selectObservation(f.observations[index], index);
  if (id && !known)
    fileFeedback(
      "Requested sky region is unavailable. Showing " + f.title + " instead.",
      true,
    );
  else if (observationId && requested < 0)
    fileFeedback(
      "Requested observation is unavailable. Showing this field’s first verified exposure instead.",
      true,
    );
  return pending;
}
function openLocation() {
  const query = new URLSearchParams(location.search);
  return choose(query.get("field") || "m101", query.get("observation"));
}

const canvas = $("explore-canvas");
function inspectPixel(point, { announce = false, pin = false } = {}) {
  if (!point) {
    inspection = null;
    $("pixel-summary").hidden = true;
    $("pixel-announcement").textContent = "Pixel inspection closed.";
    draw();
    return;
  }
  if (!state.product) return;
  const [h, w] = state.product.shape,
    x = Math.round(point.x),
    y = Math.round(point.y);
  if (x < 0 || y < 0 || x >= w || y >= h) {
    $("explore-coordinate").textContent = "Outside the prepared image.";
    return;
  }
  const i = y * w + x,
    sky = pixelToSky(x, y, state.product.wcs),
    valid = state.arrays.VALID[i];
  const measurement = valid
    ? state.arrays.SCI[i].toPrecision(6) +
      " MJy/sr · wavelength " +
      state.arrays.WAVE[i].toFixed(4) +
      " μm · bandwidth " +
      state.arrays.BAND[i].toFixed(4) +
      " μm"
    : "Excluded / no usable data. This is not empty sky.";
  const text = `ICRS ${sky.ra_deg.toFixed(6)}°, ${sky.dec_deg.toFixed(6)}° · pixel ${x}, ${y} · ${measurement}`;
  $("explore-coordinate").textContent = text;
  if (pin) {
    inspection = { x, y };
    $("pixel-summary").hidden = false;
    $("pixel-summary-title").textContent = valid
      ? "Recorded infrared light"
      : "Excluded pixel";
    $("pixel-summary-value").textContent = valid
      ? `Wavelength ${state.arrays.WAVE[i].toFixed(4)} μm · pixel ${x}, ${y}`
      : "No usable measurement here.";
    $("ask-exposure-question").hidden = !valid;
    draw();
  }
  if (announce) $("pixel-announcement").textContent = text;
}
const input = attachViewportInput(canvas, {
  getView: () =>
    state.product
      ? { zoom: state.zoom, center_x: state.cx, center_y: state.cy }
      : null,
  getGeometry: geometry,
  getBounds: () => ({
    width: state.product.shape[1],
    height: state.product.shape[0],
  }),
  onView: (view) => {
    state.zoom = view.zoom;
    state.cx = view.center_x;
    state.cy = view.center_y;
    $("explore-zoom").textContent = state.zoom.toFixed(1) + "×";
    draw();
    queueSave();
  },
  onInspect: inspectPixel,
});
const notebook = createExposureNotebook({
  getExposure: () =>
    state.product
      ? { product: state.product, entry: state.entry, arrays: state.arrays }
      : null,
  onLocate: (point) => {
    state.cx = Math.max(0, Math.min(state.product.shape[1] - 1, point.x));
    state.cy = Math.max(0, Math.min(state.product.shape[0] - 1, point.y));
    inspectPixel(point, { announce: true, pin: true });
    draw();
    queueSave();
    canvas.scrollIntoView({
      block: "center",
      behavior: matchMedia("(prefers-reduced-motion:reduce)").matches
        ? "auto"
        : "smooth",
    });
    canvas.focus({ preventScroll: true });
  },
  onChange: draw,
});
$("ask-exposure-question").onclick = () => notebook.ask(inspection);
$("back-to-sky").onclick = () => {
  $("sky-locator").scrollIntoView({
    behavior: matchMedia("(prefers-reduced-motion:reduce)").matches
      ? "auto"
      : "smooth",
  });
  $("atlas-canvas").focus({ preventScroll: true });
};
$("dismiss-pixel").onclick = () => {
  inspectPixel(null);
  canvas.focus({ preventScroll: true });
};
$("explore-plus").onclick = () => setZoom(state.zoom * 1.25);
$("explore-minus").onclick = () => setZoom(state.zoom / 1.25);
$("explore-reset").onclick = () => {
  if (!state.product) return;
  state.cx = (state.product.shape[1] - 1) / 2;
  state.cy = (state.product.shape[0] - 1) / 2;
  setZoom(1);
  inspectPixel(null);
};
new ResizeObserver(draw).observe(canvas);
for (const key of ["stretch", "palette", "interpolation"])
  $("explore-" + key).addEventListener("change", (e) => {
    state.visual = validateVisualization({
      ...state.visual,
      [key]: e.target.value,
    });
    render();
    queueSave();
  });
$("explore-contrast").addEventListener("input", (e) => {
  state.contrast = Number(e.target.value);
  render();
  queueSave();
});
$("context-source").onclick = (e) => {
  if (state.product)
    showSources(
      [state.product.observation],
      state.product.processing,
      e.currentTarget,
    );
};
$("explore-retry").onclick = () => {
  const i = state.field.observations.indexOf(state.entry);
  selectObservation(state.entry, i);
};
$("export-context").onclick = () => {
  if (!state.product) return;
  const p = state.product,
    record = createExposureRecord(state.field, state.entry, p, {
      visualization: state.visual,
      contrast: state.contrast,
      viewport: { zoom: state.zoom, center_x: state.cx, center_y: state.cy },
      questions: notebook.current(),
    });
  const a = make("a");
  a.href = URL.createObjectURL(
    new Blob([JSON.stringify(record, null, 2)], { type: "application/json" }),
  );
  a.download = "SKYSHIFT-" + p.observation.observation_id + "-single-view.json";
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 10000);
};
function fileFeedback(message, error = false) {
  $("view-record-feedback").textContent = message;
  $("view-record-feedback").classList.toggle("is-error", error);
}
async function restoreRecord(
  record,
  selectionSeq,
  importSeq,
  restoreQuestions = true,
) {
  const { field, entry, index } = resolveExposureRecord(record, state.catalog),
    loaded = await loadExposure(entry),
    view = validateExposureRecord(
      record,
      field,
      entry,
      loaded.product,
      loaded.arrays,
    );
  if (importSeq !== state.importRequest) return false;
  if (selectionSeq !== state.request) {
    fileFeedback("Opening canceled because you selected another exposure.");
    return false;
  }
  state.request++;
  describeField(field);
  input.reset();
  inspection = null;
  $("pixel-summary").hidden = true;
  state.product = loaded.product;
  state.arrays = loaded.arrays;
  state.entry = entry;
  state.visual = view.visualization;
  state.contrast = view.contrast;
  state.zoom = view.viewport.zoom;
  state.cx = view.viewport.center_x;
  state.cy = view.viewport.center_y;
  for (const key of ["stretch", "palette", "interpolation"])
    $("explore-" + key).value = state.visual[key];
  $("explore-contrast").value = state.contrast;
  for (const [i, button] of [...$("observation-timeline").children].entries()) {
    button.classList.toggle("selected", i === index);
    button.setAttribute("aria-pressed", String(i === index));
  }
  $("explore-error").hidden = true;
  $("explore-retry").hidden = true;
  notebook.changed();
  if (restoreQuestions) notebook.restore(view.questions);
  facts();
  busy(false);
  render();
  $("explore-coordinate").textContent =
    "Move over the image to read a prepared pixel.";
  rememberExposure(field, entry);
  fileFeedback(
    "Saved exposure view restored. Scientific data and restrictions are unchanged.",
  );
  queueSave();
  return true;
}
$("resume-exploration").onclick = async () => {
  if (!resumeRecord || !state.catalog) return;
  const selectionSeq = state.request,
    importSeq = ++state.importRequest;
  $("resume-exploration").disabled = true;
  $("open-context").disabled = true;
  try {
    if (await restoreRecord(resumeRecord, selectionSeq, importSeq, false))
      $("explorer").scrollIntoView({
        behavior: matchMedia("(prefers-reduced-motion:reduce)").matches
          ? "auto"
          : "smooth",
      });
  } catch (e) {
    fileFeedback("Could not resume this view: " + e.message, true);
  } finally {
    $("resume-exploration").disabled = false;
    if (importSeq === state.importRequest) $("open-context").disabled = false;
  }
};
$("open-context").onclick = () => $("import-context-file").click();
$("import-context-file").onchange = async (event) => {
  const file = event.currentTarget.files?.[0];
  event.currentTarget.value = "";
  if (!file || !state.catalog) return;
  const importSeq = ++state.importRequest,
    selectionSeq = state.request;
  $("open-context").disabled = true;
  fileFeedback("Checking your saved exposure view…");
  try {
    if (file.size > MAX_VIEW_RECORD_BYTES)
      throw Error(
        "Saved exposure view must be a JSON file no larger than 128 KB.",
      );
    const record = parseExposureRecord(
      new Uint8Array(await file.arrayBuffer()),
    );
    if (await restoreRecord(record, selectionSeq, importSeq))
      $("explore-canvas").focus({ preventScroll: true });
  } catch (e) {
    if (importSeq === state.importRequest)
      fileFeedback("Could not open this view: " + e.message, true);
  } finally {
    if (importSeq === state.importRequest) $("open-context").disabled = false;
  }
};
function skyMap(catalog) {
  const svg = $("sky-map"),
    NS = "http://www.w3.org/2000/svg";
  svg.replaceChildren();
  function add(tag, attrs, text) {
    const e = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
    if (text) e.textContent = text;
    svg.append(e);
  }
  for (let dec = -60; dec <= 60; dec += 30) {
    const y = 25 + ((90 - dec) / 180) * 200;
    add("line", { x1: 45, y1: y, x2: 690, y2: y, stroke: theme.white });
    add(
      "text",
      { x: 7, y: y + 4, fill: theme.white, "font-size": 10 },
      dec + "°",
    );
  }
  for (let ra = 0; ra <= 360; ra += 60) {
    const x = 45 + ((360 - ra) / 360) * 645;
    add("line", { x1: x, y1: 25, x2: x, y2: 225, stroke: theme.white });
    add(
      "text",
      { x: x - 10, y: 245, fill: theme.white, "font-size": 10 },
      ra + "°",
    );
  }
  for (const f of catalog.fields) {
    const x = 45 + ((360 - f.ra_deg) / 360) * 645,
      y = 25 + ((90 - f.dec_deg) / 180) * 200;
    add("circle", { cx: x, cy: y, r: 4, fill: theme.white });
    add(
      "text",
      {
        x: x > 620 ? x - 13 : x + 10,
        y: y < 40 ? y + 19 : y - 9,
        "text-anchor": x > 620 ? "end" : "start",
        fill: theme.white,
        "font-size": 12,
      },
      f.id === "ngc188" ? "NGC 188" : f.id.toUpperCase(),
    );
  }
}
let pendingShellField = null;
function chooseFromSky(id) {
  if (!state.catalog) return;
  atlas?.select(id);
  const url = new URL(location.href);
  url.search = "";
  url.searchParams.set("field", id);
  url.hash = "explorer";
  if (url.href !== location.href) history.pushState(null, "", url);
  return choose(id).then(() => {
    queueSave();
    $("explorer").scrollIntoView({
      behavior: matchMedia("(prefers-reduced-motion:reduce)").matches
        ? "auto"
        : "smooth",
    });
  });
}
async function loadAvailableFields() {
  $("catalogue-retry").disabled = true;
  state.request++;
  state.catalog = null;
  state.product = null;
  state.arrays = null;
  source = null;
  sourceMask = null;
  busy(true);
  $("open-context").disabled = true;
  $("explore-error").hidden = true;
  $("explore-loading").querySelector("strong").textContent =
    "Reading the local field catalogue";
  try {
    state.catalog = await loadCatalog();
    galleries(state.catalog, chooseFromSky);
    skyMap(state.catalog);
    atlas?.destroy();
    atlas = createSkyAtlas(state.catalog, chooseFromSky);
    $("open-context").disabled = false;
    const saved = memory.read();
    resumeRecord = saved.record;
    $("resume-feedback").textContent = saved.error || "";
    if (resumeRecord)
      try {
        resolveExposureRecord(resumeRecord, state.catalog);
        $("resume-exploration").hidden = false;
      } catch {
        resumeRecord = null;
        $("resume-exploration").hidden = true;
      }
    $("catalogue-retry").hidden = true;
    const query = new URLSearchParams(location.search);
    if (
      pendingShellField &&
      state.catalog.fields.some((f) => f.id === pendingShellField)
    ) {
      const target = pendingShellField;
      pendingShellField = null;
      await chooseFromSky(target);
      return;
    }
    async function resumeSafely(selectionSeq) {
      try {
        await restoreRecord(
          resumeRecord,
          selectionSeq,
          ++state.importRequest,
          false,
        );
      } catch (e) {
        if (selectionSeq !== state.request) return;
        resumeRecord = null;
        $("resume-exploration").hidden = true;
        await openLocation();
        fileFeedback(
          "Saved settings could not be restored. Showing the verified exposure with default settings. " +
            e.message,
          true,
        );
      }
    }
    if (query.get("resume") === "1" && resumeRecord)
      await resumeSafely(state.request);
    else {
      const opening = openLocation(),
        selectionSeq = state.request;
      await opening;
      if (
        state.request === selectionSeq &&
        resumeRecord &&
        query.get("field") === resumeRecord.field &&
        query.get("observation") === resumeRecord.observation.observation_id
      )
        await resumeSafely(selectionSeq);
    }
  } catch (e) {
    state.catalog = null;
    state.request++;
    state.product = null;
    state.arrays = null;
    source = null;
    busy(false);
    $("explore-title").textContent = "Available fields could not be loaded.";
    $("explore-error").hidden = false;
    $("explore-error").textContent = e.message;
    $("open-context").disabled = true;
    $("catalogue-retry").hidden = false;
    for (const gallery of document.querySelectorAll("[data-gallery]"))
      gallery.replaceChildren(
        make(
          "p",
          "Your local catalogue is unavailable. Use Reload available fields to try again.",
          "gallery-loading",
        ),
      );
  } finally {
    $("catalogue-retry").disabled = false;
  }
}
$("catalogue-retry").onclick = () => loadAvailableFields();
window.addEventListener("popstate", () => {
  if (state.catalog) openLocation();
});
loadAvailableFields();
// The same verified viewer is embedded in the immersive shell. Commands never supply data or URLs.
window.addEventListener("message", (event) => {
  if (
    event.source !== window.parent ||
    event.origin !== location.origin ||
    window.parent === window
  )
    return;
  if (event.data?.type === "skyshift:request-controller-status")
    window.parent.postMessage(
      { type: "skyshift:viewer-ready" },
      location.origin,
    );
  if (
    event.data?.type === "skyshift:select-field" &&
    typeof event.data.field === "string"
  ) {
    if (!state.catalog) pendingShellField = event.data.field;
    else if (
      state.catalog.fields.some((f) => f.id === event.data.field) &&
      state.field?.id !== event.data.field
    )
      chooseFromSky(event.data.field);
  }
});
