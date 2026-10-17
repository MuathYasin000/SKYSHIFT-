import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { createInvestigation } from "../dist/investigation.js";
import { pixelToSky, sha256 } from "../dist/science.js";
import {
  unzipSync,
  zipSync,
  strToU8,
  strFromU8,
} from "../dist/vendor/fflate.js";
const root = new URL("../dist/", import.meta.url);
const local = async (url) =>
  new Response(await fs.readFile(new URL(url, root)));

test("changing wider exposure keeps the same ICRS viewport without claiming a supported temporal pair", async () => {
  const e = createInvestigation({ fetcher: local }),
    a = await e.select("m101", 0);
  a.display.zoom = 2.5;
  const before = pixelToSky(a.display.center_x, a.display.center_y, a.wcs),
    b = await e.select("m101", 1),
    after = pixelToSky(b.display.center_x, b.display.center_y, b.wcs);
  assert.equal(b.kind, "exposure");
  assert.equal(b.display.zoom, 2.5);
  assert.ok(Math.abs(before.ra_deg - after.ra_deg) < 1e-9);
  assert.ok(Math.abs(before.dec_deg - after.dec_deg) < 1e-9);
});

test("native investigation preserves per-exposure viewport, typed questions and scientific identity across field changes", async () => {
  const e = createInvestigation({ fetcher: local }),
    v = await e.select("m42");
  const i = v.arrays.VALID.findIndex((x) => x),
    x = i % v.shape[1],
    y = Math.floor(i / v.shape[1]),
    sky = pixelToSky(x, y, v.wcs);
  v.display.zoom = 3;
  v.display.center_x = x;
  v.display.center_y = y;
  e.updateQuestions([
    {
      id: crypto.randomUUID(),
      product_sha256: v.entry.sha256,
      frame: "icrs",
      ...sky,
      question: "What contributes this infrared light?",
      created_at: new Date().toISOString(),
    },
  ]);
  const record = await e.save();
  await e.select("m67");
  const restored = await e.select("m42");
  assert.equal(restored, v);
  assert.equal(restored.display.zoom, 3);
  assert.equal(restored.questions.length, 1);
  const fresh = createInvestigation({ fetcher: local });
  await fresh.reopen(record.bytes);
  assert.deepEqual(fresh.diagnostics(), e.diagnostics());
  const forged = JSON.parse(strFromU8(record.bytes));
  forged.observation.source.source_url = "https://attacker.invalid/data";
  await assert.rejects(
    fresh.reopen(strToU8(JSON.stringify(forged))),
    /metadata differ/,
  );
  assert.equal(fresh.active.key, v.key);
});

test("native comparison ZIP reopens in the shared validator and refuses forged prepared data", async () => {
  const e = createInvestigation({ fetcher: local }),
    v = await e.compare();
  const i = v.arrays.COMMON.findIndex(Boolean),
    sky = pixelToSky(i % v.shape[1], Math.floor(i / v.shape[1]), v.wcs);
  e.updateQuestions([
    {
      annotation_id: crypto.randomUUID(),
      pair_id: v.manifest.pair_id,
      frame: "icrs",
      ...sky,
      category: "uncertain",
      note: "Could this be a response difference?",
      created_at: new Date().toISOString(),
    },
  ]);
  v.display.zoom = 4;
  v.visual.wipe = true;
  v.visual.wipe_position = 62;
  const file = await e.save(),
    other = createInvestigation({ fetcher: local });
  await other.reopen(file.bytes);
  assert.deepEqual(other.diagnostics(), e.diagnostics());
  const files = unzipSync(file.bytes),
    hashes = JSON.parse(strFromU8(files["hashes.json"]));
  files["prepared/pair.fits"][100] ^= 1;
  hashes["prepared/pair.fits"] = await sha256(files["prepared/pair.fits"]);
  files["hashes.json"] = strToU8(JSON.stringify(hashes));
  await assert.rejects(
    other.reopen(zipSync(files)),
    /Prepared scientific product differs/,
  );
  assert.equal(other.active.questions.length, 1);
});

test("latest scientific selection wins and failed bytes never become active evidence", async () => {
  let release;
  const gate = new Promise((r) => (release = r));
  const delayed = async (url) => {
    if (url.includes("/m42-")) await gate;
    return local(url);
  };
  const e = createInvestigation({ fetcher: delayed });
  await e.catalogue();
  const early = e.select("m42"),
    late = e.select("m101");
  await late;
  release();
  assert.equal(await early, null);
  assert.equal(e.active.field.id, "m101");
  const corrupt = createInvestigation({
    fetcher: async (url) =>
      url.includes("/m42-") ? new Response("{}") : local(url),
  });
  await assert.rejects(corrupt.select("m42"), /checksum/);
  assert.equal(corrupt.active, null);
});

test("questions cannot be promoted from excluded pixels or unsupported review claims", async () => {
  const e = createInvestigation({ fetcher: local }),
    v = await e.select("m42"),
    i = v.arrays.VALID.findIndex((x) => !x),
    sky = pixelToSky(i % v.shape[1], Math.floor(i / v.shape[1]), v.wcs);
  assert.throws(
    () =>
      e.updateQuestions([
        {
          id: crypto.randomUUID(),
          product_sha256: v.key,
          frame: "icrs",
          ...sky,
          question: "masked?",
          created_at: new Date().toISOString(),
        },
      ]),
    /usable pixel/,
  );
  const saved = JSON.parse(strFromU8((await e.save()).bytes));
  saved.scientific_approval = "APPROVED";
  await assert.rejects(
    e.reopen(strToU8(JSON.stringify(saved))),
    /approval claim/,
  );
});

test("tab-session questions and viewport restore only through current scientific validation", async () => {
  const data = new Map(),
    storage = () => ({
      getItem: (k) => data.get(k),
      setItem: (k, v) => data.set(k, v),
    }),
    e = createInvestigation({ fetcher: local, storage }),
    v = await e.select("m42");
  const i = v.arrays.VALID.findIndex(Boolean),
    sky = pixelToSky(i % v.shape[1], Math.floor(i / v.shape[1]), v.wcs);
  e.updateQuestions([
    {
      id: crypto.randomUUID(),
      product_sha256: v.key,
      frame: "icrs",
      ...sky,
      question: "A tab-session question",
      created_at: new Date().toISOString(),
    },
  ]);
  v.display.zoom = 2;
  e.persist();
  const other = createInvestigation({ fetcher: local, storage });
  await other.select("m42");
  assert.deepEqual(other.diagnostics(), e.diagnostics());
  assert.equal(other.lastSession().field, "m42");
  data.set(
    "skyshift.native:" + v.key,
    JSON.stringify({ ...e.exposureRecord(), scientific_approval: "APPROVED" }),
  );
  const rejected = createInvestigation({ fetcher: local, storage });
  await rejected.select("m42");
  assert.equal(rejected.active.questions.length, 0);
  assert.equal(rejected.active.display.zoom, 1);
});
