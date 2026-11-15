import * as THREE from "./vendor/three/three.module.js";
import { mergeGeometries } from "./vendor/three/BufferGeometryUtils.js";
import { createHardwareMaterials } from "./spherex-materials.js";

// Photo-assisted original geometry, not NASA CAD or a measured digital twin.
// References and uncertainty are recorded in assets/space/manifest.json.
export function createSPHEREx() {
  const root = new THREE.Group();
  root.name = "SPHEREx · SKYSHIFT photo-assisted artistic visualization";
  const m = createHardwareMaterials(),
    batches = new Map();
  const matrix = new THREE.Matrix4(),
    unit = new THREE.Vector3(1, 1, 1);
  function part(geometry, material, position, component, rotation = null) {
    const q = rotation?.isQuaternion
      ? rotation
      : new THREE.Quaternion().setFromEuler(
          new THREE.Euler(...(rotation || [0, 0, 0])),
        );
    matrix.compose(new THREE.Vector3(...position), q, unit);
    const g = geometry.index ? geometry.toNonIndexed() : geometry.clone();
    g.applyMatrix4(matrix);
    const key = component + "/" + material.name;
    if (!batches.has(key))
      batches.set(key, { component, material, geometries: [] });
    batches.get(key).geometries.push(g);
    geometry.dispose();
  }
  function box(size, material, position, component, rotation) {
    part(
      new THREE.BoxGeometry(...size),
      material,
      position,
      component,
      rotation,
    );
  }
  function rod(a, b, r, material, component, segments = 8) {
    const start = new THREE.Vector3(...a),
      end = new THREE.Vector3(...b),
      d = end.clone().sub(start);
    const q = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      d.clone().normalize(),
    );
    part(
      new THREE.CylinderGeometry(r, r, d.length(), segments),
      material,
      start.add(end).multiplyScalar(0.5).toArray(),
      component,
      q,
    );
  }
  function ring(radius, tube, y, material, component) {
    part(
      new THREE.TorusGeometry(radius, tube, 6, 160),
      material,
      [0, y, 0],
      component,
      [Math.PI / 2, 0, 0],
    );
  }
  function cable(points, r, material, component) {
    part(
      new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p))),
        20,
        r,
        6,
        false,
      ),
      material,
      [0, 0, 0],
      component,
    );
  }
  function roundedShape(w, h, r) {
    const s = new THREE.Shape(),
      x = -w / 2,
      y = -h / 2;
    s.moveTo(x + r, y);
    s.lineTo(x + w - r, y);
    s.quadraticCurveTo(x + w, y, x + w, y + r);
    s.lineTo(x + w, y + h - r);
    s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    s.lineTo(x + r, y + h);
    s.quadraticCurveTo(x, y + h, x, y + h - r);
    s.lineTo(x, y + r);
    s.quadraticCurveTo(x, y, x + r, y);
    return s;
  }
  function roundedBox(w, h, d, r, material, position, component, rotation) {
    const g = new THREE.ExtrudeGeometry(roundedShape(w, h, r), {
      depth: d,
      bevelEnabled: true,
      bevelThickness: 0.004,
      bevelSize: 0.004,
      bevelSegments: 2,
      curveSegments: 4,
      steps: 1,
    });
    g.translate(0, 0, -d / 2);
    part(g, material, position, component, rotation);
  }
  function patchAt(
    angle,
    y,
    radius,
    depth,
    material,
    component,
    width = 0.045,
    height = 0.065,
  ) {
    const c = Math.cos(angle),
      s = Math.sin(angle),
      tangent = new THREE.Vector3(s, 0, -c),
      slope = new THREE.Vector3(c * 0.6, 1, s * 0.6).normalize(),
      normal = tangent.clone().cross(slope).normalize();
    const q = new THREE.Quaternion().setFromRotationMatrix(
      new THREE.Matrix4().makeBasis(tangent, slope, normal),
    );
    box(
      [width, height, depth],
      material,
      [c * radius, y, s * radius],
      component,
      q,
    );
    return { normal, q, c, s };
  }
  // Documented outer envelope: 3.2m opening, 1.7m shield height, ~19mm walls.
  // Inner rim radii/heights are inferred from assembly photos, not metrology.
  const shields = [
    { top: 1.6, bottom: 0.58, lo: -0.7, hi: 1.0 },
    { top: 1.27, bottom: 0.42, lo: -0.51, hi: 0.94 },
    { top: 0.97, bottom: 0.28, lo: -0.32, hi: 0.88 },
  ];
  for (let index = 0; index < shields.length; index++) {
    const s = shields[index],
      h = s.hi - s.lo,
      center = (s.hi + s.lo) / 2;
    part(
      new THREE.CylinderGeometry(s.top, s.bottom, h, 192, 12, true),
      index === 0 ? m.paint : m.mirror,
      [0, center, 0],
      "shields",
    );
    // A separate offset inner skin and annular edge give the shields real thickness.
    const inside = m.mirror.clone();
    inside.side = THREE.BackSide;
    inside.name = "SPHEREx / inner mirror " + index;
    part(
      new THREE.CylinderGeometry(
        s.top - 0.019,
        s.bottom - 0.019,
        h,
        192,
        12,
        true,
      ),
      inside,
      [0, center, 0],
      "shields",
    );
    part(
      new THREE.RingGeometry(s.top - 0.019, s.top, 192),
      m.foil,
      [0, s.hi, 0],
      "shields",
      [-Math.PI / 2, 0, 0],
    );
    ring(s.top - 0.003, 0.004, s.hi, m.aluminum, "shields");
    ring(s.bottom, 0.004, s.lo, m.aluminum, "shields");
    for (let seam = 0; seam < 12; seam++) {
      const a = (seam * Math.PI) / 6,
        c = Math.cos(a),
        z = Math.sin(a);
      rod(
        [c * (s.bottom + 0.001), s.lo, z * (s.bottom + 0.001)],
        [c * (s.top + 0.001), s.hi, z * (s.top + 0.001)],
        0.0008,
        index === 0 ? m.seam : m.aluminum,
        "shields",
        5,
      );
      for (const fraction of [0.12, 0.48, 0.81]) {
        const y = s.lo + h * fraction,
          r = s.bottom + (s.top - s.bottom) * fraction + 0.006;
        const { normal, q } = patchAt(
          a,
          y,
          r,
          0.005,
          m.aluminum,
          "shields",
          0.032,
          0.058,
        );
        const center = new THREE.Vector3(c * r, y, z * r).addScaledVector(
          normal,
          0.006,
        );
        box([0.019, 0.036, 0.006], m.black, center.toArray(), "shields", q);
        box(
          [0.011, 0.027, 0.012],
          m.aluminum,
          center.clone().addScaledVector(normal, 0.006).toArray(),
          "shields",
          q,
        );
        for (const dy of [-0.023, 0.023]) {
          const p = new THREE.Vector3(0, dy, 0.004)
            .applyQuaternion(q)
            .add(new THREE.Vector3(c * r, y, z * r));
          const boltRotation = new THREE.Quaternion().setFromUnitVectors(
            new THREE.Vector3(0, 1, 0),
            normal,
          );
          part(
            new THREE.CylinderGeometry(0.003, 0.003, 0.0025, 6),
            m.aluminum,
            p.toArray(),
            "shields",
            boltRotation,
          );
        }
      }
    }
    // Discrete reflective tape tabs visible along the inner lip.
    for (let j = 0; j < 24; j++) {
      const a = (j * Math.PI) / 12,
        y = s.hi - 0.065,
        r = s.top - ((s.top - s.bottom) * 0.065) / h - 0.021;
      patchAt(a, y, r, 0.001, m.tape, "shields", 0.018, 0.045);
    }
  }
  // Reflective v-groove assemblies with machined edge bands and thermal struts.
  for (let assembly = 0; assembly < 3; assembly++) {
    for (let tier = 0; tier < 3; tier++) {
      const r = 0.42 + assembly * 0.105 + tier * 0.022,
        y = -0.43 - assembly * 0.1 - tier * 0.024;
      part(
        new THREE.CylinderGeometry(0.24, r, 0.075, 96, 1, true),
        m.mirror,
        [0, y, 0],
        "radiators",
      );
      ring(r, 0.005, y - 0.0375, m.aluminum, "radiators");
    }
  }
  for (let a = 0; a < Math.PI * 2; a += (Math.PI * 2) / 3) {
    const c = Math.cos(a),
      s = Math.sin(a);
    rod(
      [0.38 * c, -0.87, 0.38 * s],
      [0.23 * c, -0.2, 0.23 * s],
      0.016,
      m.black,
      "radiators",
    );
    rod(
      [0.38 * c, -0.87, 0.38 * s],
      [0.23 * c, -0.2, 0.23 * s],
      0.009,
      m.aluminum,
      "radiators",
    );
    for (const y of [-0.81, -0.29])
      part(
        new THREE.CylinderGeometry(0.026, 0.026, 0.018, 12),
        m.aluminum,
        [c * 0.35, y, s * 0.35],
        "radiators",
      );
  }
  // Ribbed black telescope housing. No ground-test protective red caps are included.
  // Geometry is assembled with a slight inferred tilt, not an optical ray trace.
  roundedBox(0.34, 0.64, 0.29, 0.045, m.black, [0.025, 0.11, 0], "telescope");
  for (let i = 0; i < 10; i++)
    roundedBox(
      0.355,
      0.014,
      0.305,
      0.018,
      m.rubber,
      [0.025, -0.18 + i * 0.059, 0],
      "telescope",
    );
  const aperture = roundedShape(0.31, 0.24, 0.04),
    hole = roundedShape(0.258, 0.19, 0.03);
  aperture.holes.push(new THREE.Path(hole.getPoints(24)));
  const apertureRing = new THREE.ExtrudeGeometry(aperture, {
    depth: 0.014,
    bevelEnabled: false,
    curveSegments: 6,
  });
  part(apertureRing, m.aluminum, [0.025, 0.44, 0], "telescope", [
    -Math.PI / 2,
    0,
    0,
  ]);
  box([0.25, 0.014, 0.18], m.black, [0.025, 0.432, 0], "telescope");
  for (const x of [-0.2, 0.24]) {
    rod([x, -0.31, 0.08], [x, 0.35, 0.08], 0.008, m.aluminum, "telescope");
    box([0.06, 0.035, 0.04], m.aluminum, [x, 0.32, 0.08], "telescope");
  }
  // The bus is an asymmetric equipment deck over a short insulated base band,
  // rather than the previous cylinder with evenly spaced toy-like gold squares.
  part(
    new THREE.CylinderGeometry(0.53, 0.51, 0.19, 96),
    m.paint,
    [0, -1.36, 0],
    "bus",
  );
  part(
    new THREE.CylinderGeometry(0.53, 0.53, 0.026, 96),
    m.aluminum,
    [0, -1.245, 0],
    "bus",
  );
  part(
    new THREE.CylinderGeometry(0.49, 0.49, 0.045, 96),
    m.aluminum,
    [0, -0.84, 0],
    "bus",
  );
  box([0.74, 0.34, 0.57], m.aluminum, [0, -1.04, 0], "bus");
  const equipment = [
    { p: [0.39, -1.03, 0.12], s: [0.22, 0.32, 0.38], mat: m.foil },
    { p: [-0.33, -1.0, 0.18], s: [0.23, 0.29, 0.31], mat: m.gold },
    { p: [0.1, -1.02, 0.38], s: [0.3, 0.28, 0.16], mat: m.foil },
    { p: [0.08, -1.03, -0.35], s: [0.38, 0.3, 0.18], mat: m.gold },
    { p: [-0.28, -1.1, -0.25], s: [0.23, 0.2, 0.28], mat: m.black },
  ];
  for (const e of equipment) {
    roundedBox(e.s[0], e.s[1], e.s[2], 0.018, e.mat, e.p, "bus");
    // Narrow Kapton bands, blanket overlap and small equipment labels.
    box([e.s[0] * 0.15, e.s[1] + 0.008, e.s[2] + 0.012], m.tape, e.p, "bus");
    box(
      [e.s[0] * 0.36, 0.025, 0.002],
      m.aluminum,
      [e.p[0], e.p[1] + 0.045, e.p[2] + e.s[2] / 2 + 0.009],
      "bus",
    );
  }
  roundedBox(0.27, 0.23, 0.055, 0.012, m.black, [0.21, -1.04, 0.485], "bus");
  for (let i = 0; i < 8; i++)
    box(
      [0.24, 0.002, 0.002],
      m.aluminum,
      [0.21, -1.135 + i * 0.027, 0.517],
      "bus",
    );
  for (let row = 0; row < 2; row++)
    for (let col = 0; col < 6; col++) {
      const x = -0.27 + col * 0.1,
        y = -0.91 - row * 0.2;
      part(
        new THREE.CylinderGeometry(0.009, 0.009, 0.018, 8),
        m.aluminum,
        [x, y, 0.304],
        "bus",
        [Math.PI / 2, 0, 0],
      );
    }
  for (let j = 0; j < 10; j++) {
    const x = -0.34 + j * 0.072;
    cable(
      [
        [x, -0.79, 0.29],
        [x + 0.02, -0.91, 0.34],
        [x + 0.025, -1.16, 0.35],
        [x, -1.25, 0.29],
      ],
      0.003,
      j % 3 === 0 ? m.wireBlue : j % 3 === 1 ? m.wireCopper : m.rubber,
      "bus",
    );
  }
  for (const z of [-0.23, 0.23])
    cable(
      [
        [0.33, -0.85, z],
        [0.53, -0.9, z],
        [0.54, -1.14, z],
        [0.41, -1.23, z],
      ],
      0.012,
      m.rubber,
      "bus",
    );
  for (const x of [-0.22, 0.22]) {
    part(
      new THREE.CylinderGeometry(0.04, 0.075, 0.14, 32, 1, true),
      m.aluminum,
      [x, -1.52, 0.15],
      "bus",
    );
    part(
      new THREE.CircleGeometry(0.071, 24),
      m.black,
      [x, -1.585, 0.15],
      "bus",
      [Math.PI / 2, 0, 0],
    );
    part(
      new THREE.CylinderGeometry(0.08, 0.08, 0.012, 24),
      m.aluminum,
      [x, -1.45, 0.15],
      "bus",
    );
  }
  part(
    new THREE.CylinderGeometry(0.075, 0.075, 0.025, 32),
    m.paint,
    [0, -1.47, -0.19],
    "bus",
  );
  // Single fixed array: documented 2.67 x 1.02m. Cell counts/pattern and hinges
  // are representative; no manufacturing drawing or flight cell map was used.
  const px = -0.78,
    py = -0.91;
  box([0.045, 1.05, 2.7], m.aluminum, [px, py, 0], "panel");
  box([0.047, 1.02, 2.67], m.rear, [px - 0.004, py, 0], "panel");
  const cellGeometry = new THREE.ShapeGeometry(
    roundedShape(0.119, 0.145, 0.012),
    4,
  );
  const cells = new THREE.InstancedMesh(cellGeometry, m.cells, 126),
    transform = new THREE.Object3D();
  cells.name = "Representative coverglass solar cells";
  cells.userData.component = "panel";
  let n = 0;
  for (let row = 0; row < 6; row++)
    for (let col = 0; col < 21; col++) {
      transform.position.set(
        px - 0.031,
        py - 0.424 + row * 0.17,
        -1.27 + col * 0.126,
      );
      transform.rotation.set(0, -Math.PI / 2, 0);
      transform.updateMatrix();
      cells.setMatrixAt(n, transform.matrix);
      cells.setColorAt(
        n,
        new THREE.Color().setRGB(
          1 + Math.sin(n * 2.7) * 0.025,
          1 + Math.cos(n * 1.9) * 0.018,
          1,
        ),
      );
      n++;
      for (const dz of [-0.026, 0.026])
        box(
          [0.001, 0.133, 0.0008],
          m.aluminum,
          [px - 0.032, py - 0.424 + row * 0.17, -1.27 + col * 0.126 + dz],
          "panel",
        );
    }
  root.add(cells);
  for (const z of [-1.36, 1.36]) {
    part(
      new THREE.CylinderGeometry(0.024, 0.024, 0.045, 24),
      m.paint,
      [px, py, z],
      "panel",
      [Math.PI / 2, 0, 0],
    );
    box([0.05, 0.14, 0.11], m.aluminum, [px + 0.01, py, z * 0.88], "panel");
  }
  for (const z of [-0.41, 0.41]) {
    rod([-0.35, -0.94, z], [px, -0.75, z], 0.015, m.aluminum, "panel");
    rod([-0.35, -1.22, z], [px, -1.25, z], 0.012, m.aluminum, "panel");
    part(
      new THREE.CylinderGeometry(0.028, 0.028, 0.13, 24),
      m.aluminum,
      [px + 0.04, py, z],
      "panel",
      [Math.PI / 2, 0, 0],
    );
  }
  // Merge by material + component: fine fittings keep their pickable component
  // identity while avoiding a render call for every clamp, tape tab or wire.
  for (const { component, material, geometries } of batches.values()) {
    const geometry = mergeGeometries(geometries, false);
    if (!geometry) throw Error("Incompatible spacecraft geometry batch");
    if (component === "telescope") geometry.rotateZ(0.1);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = component + " / " + material.name;
    mesh.userData.component = component;
    root.add(mesh);
    geometries.forEach((g) => g.dispose());
  }
  root.rotation.y = -0.5;
  root.userData.fidelity =
    "Photo-assisted; small hardware placement and hidden geometry remain inferred";
  return root;
}
