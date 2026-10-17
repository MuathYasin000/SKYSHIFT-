import test from "node:test";
import assert from "node:assert/strict";
import { createSPHEREx } from "../dist/spherex-model.js";
import { Box3, Group } from "../dist/vendor/three/three.module.js";

test("photo-assisted spacecraft retains finite pickable geometry within web budgets and reference envelope", () => {
  const model = createSPHEREx(),
    components = new Set();
  let triangles = 0,
    meshes = 0;
  model.traverse((o) => {
    if (!o.isMesh) return;
    meshes++;
    components.add(o.userData.component);
    for (const attribute of ["position", "normal", "uv"]) {
      assert.ok(o.geometry.attributes[attribute], attribute);
      assert.ok(
        o.geometry.attributes[attribute].array.every(Number.isFinite),
        o.name + " nonfinite " + attribute,
      );
    }
    triangles +=
      ((o.geometry.index?.count ?? o.geometry.attributes.position.count) / 3) *
      (o.isInstancedMesh ? o.count : 1);
  });
  assert.ok(meshes < 80, "hardware details must remain batched");
  assert.ok(
    triangles < 250000,
    "geometry must remain suitable for the local viewer",
  );
  assert.deepEqual([...components].sort(), [
    "bus",
    "panel",
    "radiators",
    "shields",
    "telescope",
  ]);
  const shields = new Group();
  model.children
    .filter((o) => o.userData.component === "shields")
    .forEach((o) => shields.add(o.clone()));
  const b = new Box3().setFromObject(shields);
  assert.ok(Math.abs(b.max.x - b.min.x - 3.2) < 0.025);
  const whole = new Box3().setFromObject(model);
  assert.ok(
    whole.max.y - whole.min.y > 2.5 && whole.max.y - whole.min.y < 2.75,
  );
  assert.match(model.userData.fidelity, /inferred/);
});

test("paint, reflective metal, foil and solar coverglass use distinct physical materials with bounded texture memory", () => {
  const model = createSPHEREx(),
    materials = new Map(),
    textures = new Set();
  model.traverse((o) => {
    if (o.isMesh) {
      materials.set(o.material.name, o.material);
      for (const v of Object.values(o.material))
        if (v?.isTexture) textures.add(v);
    }
  });
  assert.equal(materials.get("SPHEREx / paint").metalness, 0);
  assert.ok(materials.get("SPHEREx / mirror").metalness > 0.9);
  assert.ok(materials.get("SPHEREx / cells").clearcoat > 0.5);
  assert.ok(
    materials.get("SPHEREx / cells").metalness < 0.2,
    "coverglass is dielectric, not polished aluminum",
  );
  assert.ok(materials.get("SPHEREx / foil").normalMap);
  const bytes = [...textures].reduce(
    (n, t) => n + (t.image?.data?.byteLength || 0),
    0,
  );
  assert.ok(bytes <= 2 * 1024 * 1024, "procedural fields must stay bounded");
});
