// Renderer-independent scientific state. Only trusted local catalogue identities
// can supply data. Immersive and Classic presentations share these exact objects.
import { fetchCatalogue } from "./catalogue.js";
import { createExposureLoader } from "./exposure-loader.js";
import {
  decodeArray,
  sha256,
  validateAnnotation,
  validateDisplay,
  pixelToSky,
  skyToPixel,
} from "./science.js";
import {
  defaultVisualization,
  validateVisualization,
} from "./visualization.js";
import { validateExposureQuestions } from "./exposure-questions.js";
import {
  createExposureRecord,
  parseExposureRecord,
  resolveExposureRecord,
  validateExposureRecord,
} from "./exposure-records.js";
import { openComparison } from "./packets.js";
import { zipSync, strToU8, strFromU8 } from "./vendor/fflate.js";

export async function verifiedBytes(url, hash, fetcher = globalThis.fetch) {
  const response = await fetcher(url, { signal: AbortSignal.timeout(12000) });
  if (!response.ok)
    throw Error(
      "Local scientific data could not be loaded. Check the server and retry.",
    );
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (hash && (await sha256(bytes)) !== hash)
    throw Error(
      "Scientific checksum mismatch. These data have not been displayed.",
    );
  return bytes;
}
export function createInvestigation({
  fetcher = globalThis.fetch,
  storage = () => globalThis.sessionStorage,
} = {}) {
  const loadExposure = createExposureLoader(fetcher),
    views = new Map();
  let catalog = null,
    pairPromise = null,
    active = null,
    sequence = 0;
  async function catalogue() {
    return catalog ?? (catalog = await fetchCatalogue(fetcher));
  }
  async function pair() {
    if (!pairPromise)
      pairPromise = (async () => {
        const c = JSON.parse(
          strFromU8(await verifiedBytes("./data/catalog.json", null, fetcher)),
        );
        if (
          c.bundle_url !== "./data/bundle.json" ||
          !/^[a-f0-9]{64}$/.test(c.bundle_sha256)
        )
          throw Error("Unsupported comparison catalogue.");
        const bundle = JSON.parse(
            strFromU8(
              await verifiedBytes(c.bundle_url, c.bundle_sha256, fetcher),
            ),
          ),
          m = bundle.manifest;
        if (
          m.dataset_kind !== "real" ||
          m.processing.scientific_approval !== "PENDING" ||
          m.suitability.status !== "pending"
        )
          throw Error("Comparison review identity is unsupported.");
        const arrays = Object.fromEntries(
          Object.entries(bundle.arrays).map(([k, v]) => [k, decodeArray(v)]),
        );
        if (
          Object.values(arrays).some(
            (a) => a.length !== m.processing.shape[0] * m.processing.shape[1],
          )
        )
          throw Error("Comparison geometry mismatch.");
        const view = {
          key: m.pair_id,
          kind: "pair",
          field: (await catalogue()).fields.find((f) => f.id === "m101"),
          bundle,
          manifest: m,
          arrays,
          shape: m.processing.shape,
          wcs: m.processing.output_wcs,
          display: validateDisplay(m.display, m),
          visual: { ...defaultVisualization, interpolation: "nearest" },
          questions: [],
          inspection: null,
        };
        try {
          const saved = JSON.parse(
            storage().getItem("skyshift.native:" + view.key),
          );
          if (saved) {
            const display = validateDisplay(saved.display, m),
              visual = validateVisualization(saved.visual),
              questions = validateQuestions(view, saved.questions);
            view.display = display;
            view.visual = visual;
            view.questions = questions;
          }
        } catch {
          /* Invalid or unavailable tab storage is never accepted as evidence. */
        }
        views.set(view.key, view);
        return view;
      })().catch((e) => {
        pairPromise = null;
        throw e;
      });
    return pairPromise;
  }
  async function select(fieldId, index = 0) {
    const previous = active;
    const ticket = ++sequence,
      c = await catalogue(),
      field = c.fields.find((f) => f.id === fieldId),
      entry = field?.observations[index];
    if (!entry)
      throw Error("That observation is not in the verified catalogue.");
    let view = views.get(entry.sha256);
    if (!view) {
      const { product, arrays } = await loadExposure(entry),
        [h, w] = product.shape;
      view = {
        key: entry.sha256,
        kind: "exposure",
        field,
        entry,
        product,
        arrays,
        shape: product.shape,
        wcs: product.wcs,
        display: {
          ...product.display,
          zoom: 1,
          center_x: (w - 1) / 2,
          center_y: (h - 1) / 2,
          view_mode: "single",
          selected_epoch: "A",
        },
        contrast: 1,
        visual: { ...defaultVisualization, interpolation: "nearest" },
        questions: [],
        inspection: null,
      };
      if (previous?.kind === "exposure" && previous.field.id === fieldId) {
        const sky = pixelToSky(
            previous.display.center_x,
            previous.display.center_y,
            previous.wcs,
          ),
          point = skyToPixel(sky.ra_deg, sky.dec_deg, view.wcs);
        if (
          point.x >= 0 &&
          point.x <= w - 1 &&
          point.y >= 0 &&
          point.y <= h - 1
        )
          Object.assign(view.display, {
            center_x: point.x,
            center_y: point.y,
            zoom: previous.display.zoom,
          });
      }
      try {
        const saved = JSON.parse(
          storage().getItem("skyshift.native:" + view.key),
        );
        if (saved) {
          const restored = validateExposureRecord(
            saved,
            field,
            entry,
            product,
            arrays,
          );
          view.visual = restored.visualization;
          view.contrast = restored.contrast;
          Object.assign(view.display, restored.viewport, {
            vmax: saved.display.vmax,
          });
          view.questions = restored.questions;
        }
      } catch {
        /* Save files remain available when browser storage is disabled or invalid. */
      }
      views.set(view.key, view);
    }
    if (ticket === sequence) active = view;
    return ticket === sequence ? view : null;
  }
  async function compare() {
    const ticket = ++sequence,
      view = await pair();
    if (ticket === sequence) active = view;
    return ticket === sequence ? view : null;
  }
  function validateQuestions(view, questions) {
    if (view.kind === "pair") {
      if (questions.length > 500) throw Error("Keep at most 500 questions.");
      const ids = new Set();
      for (const q of questions) {
        validateAnnotation(q, view.manifest, view.arrays.COMMON);
        if (ids.has(q.annotation_id))
          throw Error("Duplicate question identity.");
        ids.add(q.annotation_id);
      }
      return questions;
    }
    return validateExposureQuestions(
      questions,
      view.product,
      view.entry.sha256,
      view.arrays.VALID,
    );
  }
  function updateQuestions(questions) {
    active.questions = validateQuestions(active, questions);
  }
  function exposureRecord(v = active) {
    return createExposureRecord(v.field, v.entry, v.product, {
      visualization: v.visual,
      contrast: v.contrast,
      viewport: {
        zoom: v.display.zoom,
        center_x: v.display.center_x,
        center_y: v.display.center_y,
      },
      questions: validateQuestions(v, v.questions),
    });
  }
  async function save() {
    const v = active;
    if (!v) throw Error("Open an observation first.");
    if (v.kind === "exposure")
      return {
        bytes: strToU8(JSON.stringify(exposureRecord(v), null, 2)),
        name: `SKYSHIFT-${v.field.id}-investigation.json`,
        type: "application/json",
      };
    const manifest = structuredClone(v.manifest);
    manifest.display = validateDisplay(v.display, v.manifest);
    manifest.annotations = structuredClone(validateQuestions(v, v.questions));
    const payload = {
      "manifest.json": strToU8(JSON.stringify(manifest, null, 2)),
      "visualization.json": strToU8(
        JSON.stringify(validateVisualization(v.visual), null, 2),
      ),
      "annotations.json": strToU8(
        JSON.stringify(manifest.annotations, null, 2),
      ),
      "packet.json": strToU8(
        JSON.stringify({ mode: "references", scientific_approval: "PENDING" }),
      ),
      "prepared/pair.fits": await verifiedBytes(
        v.bundle.prepared_fits_url,
        manifest.prepared_files[0].sha256,
        fetcher,
      ),
      "diagnostics/registration.json": strToU8(
        JSON.stringify(v.bundle.registration, null, 2),
      ),
      "diagnostics/response.json": strToU8(
        JSON.stringify(v.bundle.response, null, 2),
      ),
      "citations.txt": strToU8(manifest.citations.join("\n\n")),
      "README.txt": strToU8(
        "SKYSHIFT comparison investigation. Scientific approval PENDING.\nOriginal FITS and calibration references and hashes are in manifest.json. Prepared common-grid FITS, masks, diagnostics, notes and display settings are included.\nReconstruct: skyshift reconstruct comparison.zip --output new-folder\nOriginal inputs require archive access if absent locally. This is a reference packet, not a self-contained original-data review packet. Display extensions are in visualization.json. Questions are hypotheses, not discoveries.\n",
      ),
    };
    const hashes = {};
    for (const [name, data] of Object.entries(payload))
      hashes[name] = await sha256(data);
    payload["hashes.json"] = strToU8(JSON.stringify(hashes, null, 2));
    return {
      bytes: zipSync(payload, { level: 6 }),
      name: `SKYSHIFT-${manifest.pair_id}-comparison.zip`,
      type: "application/zip",
    };
  }
  async function reopen(bytes) {
    // Validate everything before committing a saved view. Imported URLs never drive fetches.
    const ticket = ++sequence;
    if (bytes[0] === 0x50 && bytes[1] === 0x4b) {
      const v = await pair(),
        saved = await openComparison(bytes, v.manifest, v.arrays.COMMON);
      if (ticket !== sequence) return null;
      v.display = saved.display;
      v.visual = validateVisualization(
        saved.visualization ?? defaultVisualization,
      );
      v.questions = saved.annotations;
      v.inspection = null;
      active = v;
      return v;
    }
    const record = parseExposureRecord(bytes),
      { field, entry } = resolveExposureRecord(record, await catalogue());
    const { product, arrays } = await loadExposure(entry),
      saved = validateExposureRecord(record, field, entry, product, arrays);
    if (ticket !== sequence) return null;
    const v = {
      key: entry.sha256,
      kind: "exposure",
      field,
      entry,
      product,
      arrays,
      shape: product.shape,
      wcs: product.wcs,
      display: {
        ...product.display,
        ...saved.viewport,
        vmax: record.display.vmax,
        view_mode: "single",
        selected_epoch: "A",
      },
      contrast: saved.contrast,
      visual: saved.visualization,
      questions: saved.questions,
      inspection: null,
    };
    views.set(v.key, v);
    active = v;
    return v;
  }
  function lastSession() {
    try {
      const last = JSON.parse(storage().getItem("skyshift.native.last"));
      if (
        last &&
        ["pair", "exposure"].includes(last.kind) &&
        typeof last.field === "string" &&
        typeof last.key === "string"
      )
        return last;
    } catch {}
    return null;
  }
  function persist() {
    if (!active) return;
    try {
      const v = active,
        payload =
          v.kind === "exposure"
            ? exposureRecord(v)
            : {
                display: validateDisplay(v.display, v.manifest),
                visual: validateVisualization(v.visual),
                questions: validateQuestions(v, v.questions),
              };
      storage().setItem("skyshift.native:" + v.key, JSON.stringify(payload));
      storage().setItem(
        "skyshift.native.last",
        JSON.stringify({ kind: v.kind, key: v.key, field: v.field.id }),
      );
    } catch {
      /* Tab storage is optional; explicit export remains authoritative. */
    }
  }
  async function reviewPacket() {
    const c = JSON.parse(
        strFromU8(await verifiedBytes("./data/catalog.json", null, fetcher)),
      ),
      chunks = [];
    for (const part of c.review_packet.parts) {
      if (
        !/^\.\/data\/review-part-\d+\.bin$/.test(part.url) ||
        !/^[a-f0-9]{64}$/.test(part.sha256)
      )
        throw Error("Unsupported review packet identity.");
      const bytes = await verifiedBytes(part.url, part.sha256, fetcher);
      if (bytes.length !== part.size_bytes)
        throw Error("Review packet size mismatch.");
      chunks.push(bytes);
    }
    const size = chunks.reduce((n, b) => n + b.length, 0);
    if (size !== c.review_packet.size_bytes)
      throw Error("Review packet is incomplete.");
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.length;
    }
    return { bytes, name: c.review_packet.name, type: "application/zip" };
  }
  return {
    catalogue,
    select,
    compare,
    save,
    reopen,
    updateQuestions,
    exposureRecord,
    persist,
    lastSession,
    reviewPacket,
    get active() {
      return active;
    },
    cancel() {
      sequence++;
    },
    diagnostics() {
      return active
        ? {
            kind: active.kind,
            field: active.field.id,
            key: active.key,
            display: { ...active.display },
            visual: { ...active.visual },
            questions: structuredClone(active.questions),
            inspection: active.inspection ? { ...active.inspection } : null,
          }
        : null;
    },
  };
}
