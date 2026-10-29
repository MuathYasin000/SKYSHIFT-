import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { bodies, hardware, fieldVector } from "../dist/space-content.js";
import { readPreferences, savePreferences } from "../dist/space-preferences.js";
import { createSPHEREx } from "../dist/spherex-model.js";
import { Box3 } from "../dist/vendor/three/three.module.js";

test("planetary context includes all major planets and does not masquerade as an ephemeris", () => {
  assert.deepEqual(
    bodies.map((b) => b.id),
    [
      "sun",
      "mercury",
      "venus",
      "earth",
      "mars",
      "jupiter",
      "saturn",
      "uranus",
      "neptune",
      "moon",
    ],
  );
  for (const b of bodies) {
    assert.match(b.source, /^https:\/\/science\.nasa\.gov\//);
    assert.ok(b.model || b.texture);
    assert.ok(Number.isFinite(b.radius) && b.radius > 0);
  }
  assert.equal(Object.hasOwn(hardware, "spherex"), true);
});
test("celestial context uses correct ICRS directions without inferred distances", () => {
  for (const [ra, dec, expected] of [
    [0, 0, [25, 0, 0]],
    [90, 0, [0, 0, -25]],
    [0, 90, [0, 25, 0]],
    [180, 0, [-25, 0, 0]],
  ]) {
    const result = fieldVector(ra, dec);
    result.forEach((n, i) => assert.ok(Math.abs(n - expected[i]) < 1e-12));
  }
  const a = fieldVector(359, 54),
    b = fieldVector(-1, 54);
  a.forEach((n, i) => assert.ok(Math.abs(n - b[i]) < 1e-12));
  assert.ok(Math.abs(Math.hypot(...a) - 25) < 1e-12);
});
test("mode preferences are bounded and storage failures never block scientific access", () => {
  const malformed = { getItem: () => "{" };
  assert.equal(readPreferences(malformed).mode, "immersive");
  const p = readPreferences({
    getItem: () =>
      JSON.stringify({
        mode: "classic",
        quality: "ultra",
        effects_volume: 25,
        ambience_volume: -1,
        sound_enabled: true,
      }),
  });
  assert.equal(p.mode, "classic");
  assert.equal(p.quality, "auto");
  assert.equal(p.effects_volume, 1);
  assert.equal(p.ambience_volume, 0);
  assert.equal(p.sound_enabled, true);
  assert.equal(readPreferences({ getItem: () => null }).sound_enabled, true);
  assert.equal(readPreferences(malformed).sound_enabled, true);
  assert.equal(
    readPreferences({ getItem: () => '{"sound_enabled":false}' }).sound_enabled,
    false,
  );
  assert.equal(
    savePreferences(p, {
      setItem: () => {
        throw Error("synthetic denied storage");
      },
    }),
    false,
  );
});
test("original SPHEREx geometry contains separately selectable educational components", () => {
  const root = createSPHEREx(),
    components = new Set();
  root.traverse((o) => {
    if (o.isMesh) {
      components.add(o.userData.component);
      assert.ok(o.geometry.attributes.position.count > 0);
    }
  });
  assert.deepEqual([...components].sort(), [
    "bus",
    "panel",
    "radiators",
    "shields",
    "telescope",
  ]);
  const box = new Box3().setFromObject(root);
  assert.ok(box.max.y - box.min.y > 2.5);
  assert.match(root.name, /artistic/);
});
test("context assets match recorded identities and GLBs contain no remote dependencies", async () => {
  const manifest = JSON.parse(
    await readFile(
      new URL("../dist/assets/space/manifest.json", import.meta.url),
    ),
  );
  for (const a of manifest.assets.filter(
    (a) => a.status !== "not_integrated",
  )) {
    assert.match(a.file, /^[a-zA-Z0-9_./-]+$/);
    assert.ok(!a.file.includes(".."));
    assert.ok(a.credit && a.terms && a.modifications);
    const bytes = await readFile(new URL("../dist/" + a.file, import.meta.url));
    assert.equal(
      createHash("sha256").update(bytes).digest("hex"),
      a.sha256,
      a.id,
    );
    if (a.file.endsWith(".glb")) {
      assert.equal(bytes.readUInt32LE(0), 0x46546c67);
      assert.equal(bytes.readUInt32LE(8), bytes.length);
      const n = bytes.readUInt32LE(12),
        j = JSON.parse(bytes.subarray(20, 20 + n));
      for (const item of [...j.buffers, ...(j.images || [])])
        assert.ok(!item.uri, a.id + " remote dependency");
      assert.ok(j.meshes.length > 0);
    }
  }
  for (const library of manifest.libraries) {
    const license = await readFile(
      new URL("../dist/" + library.local_license, import.meta.url),
      "utf8",
    );
    assert.ok(license.length > 100);
  }
});
