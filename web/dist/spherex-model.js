import * as THREE from "./vendor/three/three.module.js";

// Original educational geometry informed by the JPL spacecraft press kit.
// Known envelope and panel dimensions guide proportions; fittings/placement simplified.
export function createSPHEREx() {
  const root = new THREE.Group();
  root.name = "SPHEREx · SKYSHIFT artistic visualization";
  // Original micro-normal pattern for illustrative insulating foil. This is
  // a material treatment, not measured spacecraft surface/engineering data.
  const n = 128,
    pixels = new Uint8Array(n * n * 4);
  const height = (x, y) =>
    Math.sin(x * 0.54 + Math.sin(y * 0.21) * 3) * 0.28 +
    Math.sin(y * 0.61 + x * 0.17) * 0.18 +
    Math.sin(x * 1.17 - y * 0.93) * 0.08;
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      const dx = height(x + 1, y) - height(x - 1, y),
        dy = height(x, y + 1) - height(x, y - 1);
      const v = new THREE.Vector3(-dx, -dy, 1).normalize(),
        i = (y * n + x) * 4;
      pixels.set(
        [
          Math.round((v.x * 0.5 + 0.5) * 255),
          Math.round((v.y * 0.5 + 0.5) * 255),
          Math.round((v.z * 0.5 + 0.5) * 255),
          255,
        ],
        i,
      );
    }
  const foil = new THREE.DataTexture(pixels, n, n);
  foil.wrapS = foil.wrapT = THREE.RepeatWrapping;
  foil.repeat.set(10, 3);
  foil.needsUpdate = true;
  const metal = new THREE.MeshStandardMaterial({
    color: 0xd5d9dc,
    metalness: 0.9,
    roughness: 0.29,
    side: THREE.DoubleSide,
    normalMap: foil,
    normalScale: new THREE.Vector2(0.18, 0.18),
  });
  const white = new THREE.MeshStandardMaterial({
    color: 0xf2eee2,
    metalness: 0.26,
    roughness: 0.38,
    side: THREE.DoubleSide,
    normalMap: foil,
    normalScale: new THREE.Vector2(0.09, 0.09),
  });
  const gold = new THREE.MeshStandardMaterial({
    color: 0xb29649,
    metalness: 0.83,
    roughness: 0.38,
  });
  const dark = new THREE.MeshStandardMaterial({
    color: 0x111b26,
    metalness: 0.65,
    roughness: 0.35,
  });
  function part(geometry, material, position, component) {
    const mesh = new THREE.Mesh(geometry, material.clone());
    mesh.position.set(...position);
    mesh.userData.component = component;
    root.add(mesh);
    return mesh;
  }
  function rod(a, b, r, material, component) {
    const start = new THREE.Vector3(...a),
      end = new THREE.Vector3(...b),
      direction = end.clone().sub(start);
    const mesh = part(
      new THREE.CylinderGeometry(r, r, direction.length(), 8),
      material,
      start.clone().add(end).multiplyScalar(0.5).toArray(),
      component,
    );
    mesh.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      direction.normalize(),
    );
    return mesh;
  }
  // The 3.2m outer opening and 1.7m cone envelope are documented; inner cones are illustrative.
  for (let i = 0; i < 3; i++) {
    const top = 1.6 - i * 0.21,
      bottom = 0.53 - i * 0.07,
      height = 1.7 - i * 0.13,
      y = 0.15 + i * 0.07;
    part(
      new THREE.CylinderGeometry(top, bottom, height, 96, 1, true),
      i === 0 ? white : metal,
      [0, y, 0],
      "shields",
    );
    for (const [r, dy] of [
      [top, height / 2],
      [bottom, -height / 2],
    ]) {
      const rim = part(
        new THREE.TorusGeometry(r, 0.012, 6, 96),
        metal,
        [0, y + dy, 0],
        "shields",
      );
      rim.rotation.x = Math.PI / 2;
    }
    const ring = part(
      new THREE.CylinderGeometry(
        bottom + 0.28,
        bottom * 0.8,
        0.13,
        48,
        1,
        true,
      ),
      metal,
      [0, -0.76 - i * 0.1, 0],
      "radiators",
    );
    ring.rotation.z = Math.PI;
  }
  const seam = metal.clone();
  seam.color.set(0xb7b4aa);
  seam.roughness = 0.62;
  for (let i = 0; i < 12; i++) {
    const a = (i * Math.PI) / 6,
      c = Math.cos(a),
      s = Math.sin(a);
    rod(
      [0.533 * c, -0.699, 0.533 * s],
      [1.603 * c, 0.999, 1.603 * s],
      0.004,
      seam,
      "shields",
    );
  }
  const body = part(
    new THREE.CylinderGeometry(0.5, 0.48, 0.68, 12),
    white,
    [0, -1.12, 0],
    "bus",
  );
  for (let i = 0; i < 12; i++) {
    const a = (i * Math.PI) / 6;
    const panel = part(
      new THREE.BoxGeometry(0.18, 0.3, 0.025),
      i % 3 ? gold : dark,
      [Math.sin(a) * 0.49, -1.12, Math.cos(a) * 0.49],
      "bus",
    );
    panel.rotation.y = a;
  }
  const telescope = part(
    new THREE.CylinderGeometry(0.2, 0.25, 0.95, 48),
    dark,
    [0, -0.13, 0],
    "telescope",
  );
  telescope.rotation.z = 0.15;
  part(
    new THREE.CylinderGeometry(0.19, 0.19, 0.015, 48),
    metal,
    [0.07, 0.35, 0],
    "telescope",
  );
  part(
    new THREE.CylinderGeometry(0.1, 0.1, 0.018, 48),
    new THREE.MeshStandardMaterial({
      color: 0x091724,
      metalness: 1,
      roughness: 0.1,
    }),
    [0.07, 0.36, 0],
    "telescope",
  );
  const frame = part(
    new THREE.BoxGeometry(0.045, 1.08, 2.73),
    gold,
    [-0.73, -0.83, 0],
    "panel",
  );
  const solar = new THREE.MeshStandardMaterial({
    color: 0x142e50,
    metalness: 0.7,
    roughness: 0.24,
  });
  part(
    new THREE.BoxGeometry(0.05, 1.02, 2.67),
    solar,
    [-0.76, -0.83, 0],
    "panel",
  );
  const cells = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.003, 0.145, 0.119),
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      metalness: 0.65,
      roughness: 0.28,
    }),
    120,
  );
  cells.userData.component = "panel";
  let cellIndex = 0;
  for (let row = 0; row < 6; row++)
    for (let col = 0; col < 20; col++) {
      cells.setMatrixAt(
        cellIndex,
        new THREE.Matrix4().makeTranslation(
          -0.788,
          -1.26 + row * 0.168,
          -1.25 + col * 0.132,
        ),
      );
      cells.setColorAt(
        cellIndex,
        new THREE.Color((row + col) % 3 === 0 ? 0x284465 : 0x1a345b),
      );
      cellIndex++;
    }
  root.add(cells);
  for (const a of [0, (Math.PI * 2) / 3, (Math.PI * 4) / 3]) {
    const strut = part(
      new THREE.CylinderGeometry(0.016, 0.016, 0.68, 8),
      gold,
      [Math.cos(a) * 0.4, -0.56, Math.sin(a) * 0.4],
      "radiators",
    );
    strut.rotation.z = 0.12;
    rod(
      [Math.cos(a) * 0.46, -1.42, Math.sin(a) * 0.46],
      [Math.cos(a + 0.4) * 0.72, -0.7, Math.sin(a + 0.4) * 0.72],
      0.012,
      metal,
      "radiators",
    );
  }
  part(
    new THREE.CylinderGeometry(0.4, 0.32, 0.12, 32),
    metal,
    [0, -1.51, 0],
    "bus",
  );
  for (const x of [-0.24, 0.24]) {
    const antenna = part(
      new THREE.CylinderGeometry(0.06, 0.11, 0.16, 24, 1, true),
      gold,
      [x, -1.57, 0.16],
      "bus",
    );
    antenna.rotation.z = Math.PI;
  }
  root.rotation.y = -0.5;
  return root;
}
