// Offline asset preparation only. Install @gltf-transform/{core,extensions,functions}
// 4.5.1 and draco3dgltf 1.5.9 in a tooling directory, then pass its node_modules
// as argv[2]. No npm modules are required to serve or use SKYSHIFT.
// Bake complete world matrices BEFORE batching: flattening this source's nested
// non-uniform transforms through TRS decomposition changes its hardware shape.
import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import { createHash } from "node:crypto";
const modules = process.argv[2];
if (!modules) throw Error("Pass an absolute node_modules tooling directory");
const imp = (p) => import(pathToFileURL(path.resolve(modules, p)));
const { NodeIO } = await imp("@gltf-transform/core/dist/index.js");
const { ALL_EXTENSIONS, KHRDracoMeshCompression } = await imp(
  "@gltf-transform/extensions/dist/index.js",
);
const { transformPrimitive, joinPrimitives, prune } = await imp(
  "@gltf-transform/functions/dist/index.js",
);
const { default: draco } = await imp("draco3dgltf/draco3dgltf.js");
for (const name of ["core", "extensions", "functions"]) {
  const pkg = JSON.parse(
    await fs.readFile(
      path.resolve(modules, "@gltf-transform", name, "package.json"),
    ),
  );
  assert.equal(pkg.version, "4.5.1");
}
assert.equal(
  JSON.parse(
    await fs.readFile(path.resolve(modules, "draco3dgltf/package.json")),
  ).version,
  "1.5.9",
);
const input = "data/raw/context-assets/webb-a.glb",
  output = "web/dist/assets/space/webb-detail.glb";
const raw = await fs.readFile(input);
assert.equal(
  createHash("sha256").update(raw).digest("hex"),
  "ea4a53f71f1e7477d8b90e30d1299b2cb33faea18acdcaf831dc9d3ebf1b7750",
);
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({
    "draco3d.decoder": await draco.createDecoderModule(),
    "draco3d.encoder": await draco.createEncoderModule(),
  });
const doc = await io.read(input),
  root = doc.getRoot(),
  groups = new Map(),
  materials = root.listMaterials();
assert.equal(root.listAnimations().length, 0);
assert.equal(root.listSkins().length, 0);
for (const node of root.listNodes()) {
  const mesh = node.getMesh();
  if (!mesh) continue;
  for (const prim of mesh.listPrimitives()) {
    assert.equal(prim.listTargets().length, 0);
    const p = prim.clone();
    for (const semantic of p.listSemantics()) {
      const a = p.getAttribute(semantic);
      p.setAttribute(semantic, a.clone().setArray(a.getArray().slice()));
    }
    if (p.getIndices()) {
      const a = p.getIndices();
      p.setIndices(a.clone().setArray(a.getArray().slice()));
    }
    transformPrimitive(p, node.getWorldMatrix());
    const key = JSON.stringify([
      materials.indexOf(p.getMaterial()),
      p.getMode(),
      p
        .listSemantics()
        .sort()
        .map((s) => {
          const a = p.getAttribute(s);
          return [s, a.getType(), a.getComponentType(), a.getNormalized()];
        }),
    ]);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(p);
  }
}
for (const node of root.listNodes()) node.dispose();
const scene = root.getDefaultScene();
for (const prims of groups.values()) {
  const merged = prims.length > 1 ? joinPrimitives(prims) : prims[0];
  const mesh = doc
    .createMesh(merged.getMaterial()?.getName() || "source hardware")
    .addPrimitive(merged);
  scene.addChild(doc.createNode(mesh.getName()).setMesh(mesh));
}
await doc.transform(prune({ keepAttributes: true, keepIndices: true }));
// Sequential encoding preserves source degenerates/index counts. EdgeBreaker
// silently removes some triangles; no geometric simplification is authorized.
doc
  .createExtension(KHRDracoMeshCompression)
  .setRequired(true)
  .setEncoderOptions({
    method: KHRDracoMeshCompression.EncoderMethod.SEQUENTIAL,
    encodeSpeed: 5,
    decodeSpeed: 5,
    quantizationBits: {
      POSITION: 16,
      NORMAL: 12,
      TEXCOORD: 12,
      COLOR: 12,
      GENERIC: 12,
    },
    quantizationVolume: "scene",
  });
await io.write(output, doc);
const bytes = await fs.readFile(output);
console.log(
  JSON.stringify(
    {
      file: output,
      bytes: bytes.length,
      sha256: createHash("sha256").update(bytes).digest("hex"),
      groups: groups.size,
      method:
        "baked world matrices; material/attribute batching; sequential Draco 16-bit position, 12-bit normals",
    },
    null,
    2,
  ),
);
