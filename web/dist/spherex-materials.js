import * as THREE from "./vendor/three/three.module.js";

// Original deterministic material fields for spacecraft surfaces only.
// They are not measured surface scans or astronomical image textures.
export function createHardwareMaterials() {
  const size = 256,
    field = new Float32Array(size * size),
    normal = new Uint8Array(size * size * 4),
    rough = new Uint8Array(size * size * 4);
  function rand(x, y) {
    const v = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
    return v - Math.floor(v);
  }
  function noise(x, y) {
    const a = Math.floor(x),
      b = Math.floor(y),
      u = x - a,
      v = y - b,
      s = u * u * (3 - 2 * u),
      t = v * v * (3 - 2 * v);
    return THREE.MathUtils.lerp(
      THREE.MathUtils.lerp(rand(a, b), rand(a + 1, b), s),
      THREE.MathUtils.lerp(rand(a, b + 1), rand(a + 1, b + 1), s),
      t,
    );
  }
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      // Fold ridges at multiple scales, rather than the old periodic ripples.
      const fold = 1 - Math.abs(2 * noise(x / 31, y / 29) - 1);
      field[y * size + x] =
        fold * 0.75 + noise(x / 9, y / 11) * 0.18 + noise(x / 2, y / 2) * 0.025;
    }
  const sample = (x, y) =>
    field[((y + size) % size) * size + ((x + size) % size)];
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4,
        v = new THREE.Vector3(
          (sample(x - 1, y) - sample(x + 1, y)) * 9,
          (sample(x, y - 1) - sample(x, y + 1)) * 9,
          1,
        ).normalize();
      normal.set(
        [
          (v.x * 0.5 + 0.5) * 255,
          (v.y * 0.5 + 0.5) * 255,
          (v.z * 0.5 + 0.5) * 255,
          255,
        ],
        i,
      );
      const r = 210 + Math.floor(noise(x / 10, y / 10) * 36);
      rough.set([r, r, r, 255], i);
    }
  const foilNormal = new THREE.DataTexture(normal, size, size),
    foilRoughness = new THREE.DataTexture(rough, size, size);
  for (const t of [foilNormal, foilRoughness]) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.generateMipmaps = true;
    t.minFilter = THREE.LinearMipmapLinearFilter;
    t.magFilter = THREE.LinearFilter;
    t.needsUpdate = true;
  }
  foilNormal.name = "Original illustrative insulation creases";
  foilRoughness.name = "Original illustrative surface roughness";
  const materials = {
    paint: new THREE.MeshPhysicalMaterial({
      color: 0xf0efe9,
      metalness: 0,
      roughness: 0.43,
      clearcoat: 0.16,
      clearcoatRoughness: 0.45,
    }),
    aluminum: new THREE.MeshStandardMaterial({
      color: 0xd8dbdf,
      metalness: 1,
      roughness: 0.23,
    }),
    mirror: new THREE.MeshStandardMaterial({
      color: 0xe5e7eb,
      metalness: 1,
      roughness: 0.095,
      normalMap: foilNormal,
      normalScale: new THREE.Vector2(0.017, 0.017),
      side: THREE.DoubleSide,
    }),
    foil: new THREE.MeshStandardMaterial({
      color: 0xc9cbd1,
      metalness: 1,
      roughness: 0.26,
      roughnessMap: foilRoughness,
      normalMap: foilNormal,
      normalScale: new THREE.Vector2(0.65, 0.65),
      side: THREE.DoubleSide,
    }),
    gold: new THREE.MeshStandardMaterial({
      color: 0xba8534,
      metalness: 1,
      roughness: 0.28,
      roughnessMap: foilRoughness,
      normalMap: foilNormal,
      normalScale: new THREE.Vector2(0.5, 0.5),
      side: THREE.DoubleSide,
    }),
    tape: new THREE.MeshPhysicalMaterial({
      color: 0xc58e32,
      metalness: 0.4,
      roughness: 0.32,
      clearcoat: 0.4,
    }),
    seam: new THREE.MeshStandardMaterial({
      color: 0x9d9f99,
      metalness: 0.2,
      roughness: 0.75,
    }),
    black: new THREE.MeshStandardMaterial({
      color: 0x121419,
      metalness: 0.18,
      roughness: 0.68,
    }),
    rubber: new THREE.MeshStandardMaterial({
      color: 0x111317,
      metalness: 0,
      roughness: 0.88,
    }),
    cells: new THREE.MeshPhysicalMaterial({
      color: 0x101b32,
      metalness: 0.04,
      roughness: 0.28,
      clearcoat: 1,
      clearcoatRoughness: 0.24,
    }),
    rear: new THREE.MeshStandardMaterial({
      color: 0x28302d,
      metalness: 0.4,
      roughness: 0.6,
    }),
    wireBlue: new THREE.MeshStandardMaterial({
      color: 0x315781,
      metalness: 0,
      roughness: 0.57,
    }),
    wireCopper: new THREE.MeshStandardMaterial({
      color: 0x915728,
      metalness: 0.55,
      roughness: 0.46,
    }),
  };
  for (const [name, m] of Object.entries(materials))
    m.name = "SPHEREx / " + name;
  return materials;
}
