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
import {createReviewDownloader} from './review-download.js';
import {validateSequence,saveSequence,isSequencePacket,openSequencePacket} from './sequence-records.js';
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
  const downloadReview=createReviewDownloader(fetcher);
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
          display: validateDisplay({...m.display,view_mode:"single"}, m),
          visual: { ...defaultVisualization, interpolation: "nearest",wipe:true },
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
    if (active?.sequence && active.field.id===fieldId) return sequenceFrame(index);
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
    if(v.sequence) {
      syncSequenceQuestions(v);
      return saveSequence(v.sequence.bundle,{schema_version:'1.0',frame_index:v.sequence.index,
        viewport:{zoom:v.display.zoom,center_x:v.display.center_x,center_y:v.display.center_y},
        display:{...v.display},visual:{...v.visual},questions:v.sequence.questions,reference_overlay:Boolean(v.sequence.overlay),
        presentation:v.sequence.presentation,reference_index:v.sequence.reference,field_label:v.sequence.label});
    }
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
      if(isSequencePacket(bytes)) {
        const value=await openSequencePacket(bytes);
        if(ticket!==sequence)return null;
        return installSequence(value,value.session);
      }
      const v = await pair(),
        saved = await openComparison(bytes, v.manifest, v.arrays.COMMON,v.bundle);
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
      if(v.sequence) {
        syncSequenceQuestions(v);
        storage().setItem('skyshift.sequence:'+v.sequence.bundle.sequence_id,JSON.stringify({schema_version:'1.0',frame_index:v.sequence.index,
          display:{...v.display},visual:{...v.visual},questions:v.sequence.questions,reference_overlay:Boolean(v.sequence.overlay),
          presentation:v.sequence.presentation,reference_index:v.sequence.reference,field_label:v.sequence.label}));
        // Only the small private session goes into tab storage. Prepared arrays
        // remain in the immutable receipt/export, never in public last-view history.
        return;
      }
      storage().setItem("skyshift.native:" + v.key, JSON.stringify(payload));
      storage().setItem(
        "skyshift.native.last",
        JSON.stringify({ kind: v.kind, key: v.key, field: v.field.id }),
      );
    } catch {
      /* Tab storage is optional; explicit export remains authoritative. */
    }
  }
  async function reviewPacket(options) {
    const c = JSON.parse(
        strFromU8(await verifiedBytes("./data/catalog.json", null, fetcher)),
      ),
      result = await downloadReview(c.review_packet,options);
    return result;
  }
  function syncSequenceQuestions(v) {
    if(v?.sequence)v.sequence.questions[v.sequence.index]=validateQuestions(v,v.questions).map(q=>({...q}));
  }
  function sequenceFrame(index) {
    const v=active,s=v?.sequence;
    if(!s||!Number.isInteger(index)||index<0||index>=s.loaded.length)throw Error('Unknown sequence frame.');
    syncSequenceQuestions(v);
    const {product,arrays}=s.loaded[index],entry=v.field.observations[index];
    Object.assign(v,{key:entry.sha256,product,arrays,entry,questions:s.questions[index]||[],inspection:null});
    s.index=index;
    if(s.reference===index&&s.loaded.length>1)s.reference=index===0?1:0;
    return v;
  }
  function installSequence(value,session={}) {
    if(session.reference_overlay!==undefined&&typeof session.reference_overlay!=='boolean')throw Error('Invalid saved reference overlay preference.');
    const s={...value,index:0,questions:{},overlay:session.reference_overlay??false,sourceRef:value.sourceRef||{type:'import'}};
    s.label=session.field_label??value.sourceRef?.label??'';
    if(typeof s.label!=='string'||s.label.length>160)throw Error('Invalid saved search-field label.');
    const entries=s.loaded.map(({product})=>({observation_id:product.observation.observation_id,time_start_utc:product.observation.time_start_utc,
      sha256:product.observation.source.sha256,shape:product.shape,native_shape:product.native_shape}));
    for(const [key,questions] of Object.entries(session.questions||{})) {
      const i=Number(key);
      if(!Number.isInteger(i)||!s.loaded[i])throw Error('Saved sequence questions reference an unknown epoch.');
      s.questions[i]=validateExposureQuestions(questions,s.loaded[i].product,entries[i].sha256,s.loaded[i].arrays.VALID);
    }
    const index=session.frame_index??0;
    if(!Number.isInteger(index)||!s.loaded[index])throw Error('Invalid saved sequence epoch.');
    s.presentation=session.presentation??'single';s.reference=session.reference_index??(index===0&&s.loaded.length>1?1:0);
    if(!['single','wipe','side_by_side'].includes(s.presentation)||!Number.isInteger(s.reference)||!s.loaded[s.reference]||
      (s.presentation!=='single'&&(!s.bundle.playback_eligible||s.reference===index)))throw Error('Unsupported saved sequence comparison.');
    const {product,arrays}=s.loaded[index],[h,w]=product.shape;
    const field={id:s.bundle.sequence_id,title:'Requested SPHEREx field',description:'Fixed ICRS field; source identification and change claims remain pending.',
      ...s.bundle.request.region,comparison_status:'unavailable',observations:entries};
    let display={...s.bundle.display,zoom:1,center_x:(w-1)/2,center_y:(h-1)/2,view_mode:'single',selected_epoch:'A'};
    if(session.display) {
      const d=session.display;
      if(![d.vmin,d.vmax,d.zoom,d.center_x,d.center_y].every(Number.isFinite)||d.vmax<=d.vmin||d.zoom<1||d.zoom>20||d.center_x<0||d.center_x>w-1||d.center_y<0||d.center_y>h-1)throw Error('Invalid saved sequence display or viewport.');
      display={...display,...d};
    }
    const visual=validateVisualization(session.visual||{...defaultVisualization,interpolation:'nearest'});
    if(visual.wipe!==(s.presentation==='wipe'))throw Error('Saved sequence presentation differs from its visualization.');
    s.index=index;
    const view={kind:'exposure',key:entries[index].sha256,field,entry:entries[index],product,arrays,wcs:product.wcs,shape:product.shape,
      display,visual,contrast:1,questions:s.questions[index]||[],inspection:null,sequence:s};
    active=view;
    return view;
  }
  async function openSequence(value,sourceRef) {
    const ticket=++sequence,validated=await validateSequence(value);
    let saved={};
    try{saved=JSON.parse(storage().getItem('skyshift.sequence:'+value.sequence_id))||{};}catch{}
    if(ticket!==sequence)return null;
    try{return installSequence({...validated,sourceRef},saved);}catch{return installSequence({...validated,sourceRef});}
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
    openSequence,
    sequenceFrame,
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
            sequence:active.sequence?{id:active.sequence.bundle.sequence_id,index:active.sequence.index,frames:active.sequence.loaded.length,
              playback_eligible:active.sequence.bundle.playback_eligible}:null,
          }
        : null;
    },
  };
}
