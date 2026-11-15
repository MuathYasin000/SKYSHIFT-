import * as THREE from "./vendor/three/three.module.js";
import { createHardwareMaterials } from "./spherex-materials.js";

// Appearance heuristics only, never calibrated surface/optical properties.
export function atlasSurface(r, g, b) {
  const hi = Math.max(r, g, b),
    lo = Math.min(r, g, b),
    saturation = hi ? 1 - lo / hi : 0;
  return hi > 65 && saturation < 0.2
    ? { metal: 0.88, rough: 0.32 }
    : hi < 55
      ? { metal: 0.03, rough: 0.7 }
      : { metal: 0.08, rough: 0.4 };
}
function atlasMaps(map) {
  const image = map.image,
    size = 256,
    c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(image, 0, 0, size, size);
  const pixels = ctx.getImageData(0, 0, size, size).data,
    metal = new Uint8Array(pixels.length),
    rough = new Uint8Array(pixels.length);
  for (let i = 0; i < pixels.length; i += 4) {
    const s = atlasSurface(pixels[i], pixels[i + 1], pixels[i + 2]);
    metal.set([s.metal * 255, s.metal * 255, s.metal * 255, 255], i);
    rough.set([s.rough * 255, s.rough * 255, s.rough * 255, 255], i);
  }
  return [metal, rough].map((data) => {
    const t = new THREE.DataTexture(data, size, size);
    t.flipY = map.flipY;
    t.wrapS = map.wrapS;
    t.wrapT = map.wrapT;
    t.generateMipmaps = true;
    t.minFilter = THREE.LinearMipmapLinearFilter;
    t.magFilter = THREE.LinearFilter;
    t.needsUpdate = true;
    return t;
  });
}
// Move the pinned NASA model's closed front disk to a hinged-open presentation.
// The bounded selection is verified against this asset; source GLB stays intact.
export function openHubbleAperture(root) {
  root.updateMatrixWorld(true);
  let removed = 0,
    door = null;
  root.traverse((o) => {
    if (!o.isMesh || o.material.name !== "hbltel_1") return;
    const g = o.geometry,
      ix = g.index,
      p = g.attributes.position,
      kept = [],
      cover = [],
      vertices = [
        new THREE.Vector3(),
        new THREE.Vector3(),
        new THREE.Vector3(),
      ];
    for (let i = 0; i < (ix?.count || p.count); i += 3) {
      const ids = [0, 1, 2].map((k) => (ix ? ix.getX(i + k) : i + k));
      vertices.forEach((v, k) =>
        v.fromBufferAttribute(p, ids[k]).applyMatrix4(o.matrixWorld),
      );
      const cap = vertices.every(
        (v) => v.y > 258 && Math.abs(v.x) < 61 && Math.abs(v.z) < 61,
      );
      (cap ? cover : kept).push(...ids);
      if (cap) removed++;
    }
    if (!cover.length) return;
    const source = g.clone(),
      cap = g.clone();
    source.setIndex(kept);
    cap.setIndex(cover);
    cap.applyMatrix4(o.matrixWorld);
    cap.translate(0, -258, 57.5);
    o.geometry = source;
    g.dispose();
    door = new THREE.Group();
    door.name = "Reposed source aperture door / illustrative open state";
    door.position.set(0, 258, -57.5);
    door.rotation.x = -Math.PI * 0.55;
    door.add(new THREE.Mesh(cap, o.material));
  });
  if (removed !== 96)
    throw Error(
      "Hubble source cover topology changed; aperture refinement refused",
    );
  root.add(door);
  const black = new THREE.MeshStandardMaterial({
      color: 0x070a0f,
      roughness: 0.8,
      side: THREE.DoubleSide,
    }),
    metal = new THREE.MeshStandardMaterial({
      color: 0xaeb8c6,
      metalness: 1,
      roughness: 0.23,
    });
  function add(geometry, material, position) {
    const m = new THREE.Mesh(geometry, material);
    m.position.set(...position);
    root.add(m);
    return m;
  }
  const rim = add(
    new THREE.TorusGeometry(55.4, 1.2, 8, 96),
    metal,
    [0, 259, 0],
  );
  rim.rotation.x = Math.PI / 2;
  add(
    new THREE.CylinderGeometry(53.8, 49, 78, 64, 1, true),
    black,
    [0, 220, 0],
  );
  // Dark baffle/recess; hidden optical surfaces are not invented as engineering CAD.
  const back = add(new THREE.CircleGeometry(49, 64), black, [0, 181, 0]);
  back.rotation.x = -Math.PI / 2;
  return {
    removed_cover_triangles: removed,
    door_state: "illustrative open",
    internal_recess: "appearance only; no reconstructed internal optics",
  };
}
export function refineObservatory(root, id) {
  const materialSet = new Set(),
    stats = {
      mission: id,
      materials: 0,
      appearance:
        "source-informed PBR; not measured BRDF or engineering certification",
    };
  const hardware = id.startsWith("webb-") ? createHardwareMaterials() : null;
  root.traverse((o) => {
    if (!o.isMesh) return;
    const original = o.material,
      m = original.clone();
    o.material = m;
    materialSet.add(m);
    if (id === "webb-detail") {
      const n = m.name;
      m.emissive?.set(0);
      if (/:mirror_blinn$/.test(n)) {
        m.color.set("#e8bc64");
        m.metalness = 1;
        m.roughness = 0.19;
      } else if (/omnimirror/.test(n)) {
        m.color.set("#b9c3cd");
        m.metalness = 1;
        m.roughness = 0.2;
      } else if (/silver_mli|silvermli|smli|shld_silv/.test(n)) {
        m.color.set("#c6c9d0");
        m.metalness = 0.96;
        m.roughness = 0.3;
        m.normalMap = hardware.foil.normalMap;
        m.normalScale = new THREE.Vector2(0.06, 0.06);
      } else if (/pinkmli|pnkmli|pmli/.test(n)) {
        m.color.set("#c4a9b5");
        m.metalness = 0.9;
        m.roughness = 0.35;
        m.normalMap = hardware.foil.normalMap;
        m.normalScale = new THREE.Vector2(0.08, 0.08);
      } else if (/sacells/.test(n)) {
        m.color.set("#12213e");
        m.metalness = 0.05;
        m.roughness = 0.27;
      } else if (/alum|alu|ring_ssm/.test(n)) {
        m.color.set("#bac3cc");
        m.metalness = 0.9;
        m.roughness = 0.26;
      } else if (/gold/.test(n)) {
        m.color.set("#bb9555");
        m.metalness = 0.92;
        m.roughness = 0.3;
      } else if (/blk|black|carbon|graphite/.test(n)) {
        m.color.set("#0c1117");
        m.metalness = 0.04;
        m.roughness = 0.65;
      } else if (/whitepaint/.test(n)) {
        m.color.set("#f2f1e9");
        m.metalness = 0;
        m.roughness = 0.45;
      }
    } else if (id === "webb-b") {
      const n = m.name;
      if (/TopReflector|mirror-sm/.test(n)) {
        m.color.set("#e3b85f");
        m.metalness = 1;
        m.roughness = 0.22;
      } else if (/FoilLayer|PURPLEY|silverfoil|pmli|smli/i.test(n)) {
        m.metalness = 0.95;
        m.roughness = 0.34;
        m.normalMap = hardware.foil.normalMap;
        m.normalScale = new THREE.Vector2(0.08, 0.08);
        if (/FoilLayer[1-4]/.test(n)) m.color.set("#c7c8d0");
      } else if (/gold|bronze/i.test(n)) {
        m.color.set("#bb9555");
        m.metalness = 0.9;
        m.roughness = 0.3;
      } else if (/silver|bracket/i.test(n)) {
        m.metalness = 0.8;
        m.roughness = 0.29;
      } else if (/black/i.test(n)) {
        m.color.set("#11151b");
        m.metalness = 0.08;
        m.roughness = 0.7;
      } else if (/SolarPanel/.test(n)) {
        m.color.set("#182b53");
        m.metalness = 0.05;
        m.roughness = 0.3;
      }
    } else if (id === "hubble" && m.map) {
      // Preserve source atlas pixels; add bounded masks for mixed materials.
      const [metal, rough] = atlasMaps(m.map);
      m.color.set("#ffffff");
      m.metalness = 1;
      m.roughness = 1;
      m.metalnessMap = metal;
      m.roughnessMap = rough;
    }
    // Some source primitives have no UVs; a UV-space foil field is invalid there.
    if (!o.geometry.attributes.uv && m.normalMap === hardware?.foil.normalMap)
      m.normalMap = null;
    m.needsUpdate = true;
  });
  if (hardware) {
    // Keep only the referenced normal field; free unused helper maps/materials.
    const kept = hardware.foil.normalMap,
      seen = new Set();
    for (const m of Object.values(hardware)) {
      for (const x of Object.values(m))
        if (x?.isTexture && x !== kept && !seen.has(x)) {
          seen.add(x);
          x.dispose();
        }
      m.dispose();
    }
  }
  stats.materials = materialSet.size;
  if (id === "hubble") Object.assign(stats, openHubbleAperture(root));
  root.userData.refinement = stats;
  return stats;
}
