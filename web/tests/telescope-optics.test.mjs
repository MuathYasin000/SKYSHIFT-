import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "../dist/vendor/three/three.module.js";
import {
  sourceOpticalFrame,
  spherexOpticalFrame,
  worldOpticalFrame,
  incomingPaths,
  clipIncomingPaths,
} from "../dist/telescope-optics.js";
import { createObservationEffects } from "../dist/observation-effects.js";
import { atlasSurface } from "../dist/observatory-hardware.js";
import { opticalLessons } from "../dist/optics-explainer.js";
test("Webb primary faces the secondary side of its source asset; Hubble and tilted SPHEREx have different aperture axes", () => {
  const a = new THREE.Group();
  a.userData.optics = sourceOpticalFrame("webb-detail", new THREE.Vector3());
  a.rotation.y = -Math.PI / 2;
  assert.ok(
    worldOpticalFrame(a).outward.distanceTo(new THREE.Vector3(0, 0, 1)) < 1e-12,
  );
  assert.deepEqual(
    sourceOpticalFrame("webb-b", new THREE.Vector3()).outward,
    [0, 0, 1],
  );
  assert.deepEqual(
    sourceOpticalFrame("hubble", new THREE.Vector3()).outward,
    [0, 1, 0],
  );
  const s = spherexOpticalFrame();
  assert.ok(s.outward[0] < 0);
  assert.ok(Math.abs(s.outward[1] - Math.cos(0.1)) < 1e-12);
});
test("aperture alignment follows full model translation, rotation and scale rather than a world-space diagonal", () => {
  const parent = new THREE.Group(),
    object = new THREE.Group();
  parent.position.set(5, -3, 9);
  parent.rotation.z = 0.7;
  parent.scale.setScalar(2);
  parent.add(object);
  object.rotation.x = 0.4;
  object.userData.optics = {
    origin: [0, 1, 0],
    outward: [0, 1, 0],
    radius: 0.2,
  };
  const f = worldOpticalFrame(object),
    expected = object.localToWorld(new THREE.Vector3(0, 1, 0)),
    ahead = object
      .localToWorld(new THREE.Vector3(0, 2, 0))
      .sub(expected)
      .normalize();
  assert.ok(f.origin.distanceTo(expected) < 1e-12);
  assert.ok(f.outward.distanceTo(ahead) < 1e-12);
  assert.equal(f.radius, 0.4);
});
test("every incoming ray is parallel, points inward and terminates on the collector plane with no pre-aperture focus", () => {
  const frame = {
      origin: new THREE.Vector3(2, 3, 4),
      outward: new THREE.Vector3(0.2, 0.9, 0.1).normalize(),
      radius: 0.6,
      length: 3,
    },
    paths = incomingPaths(frame);
  for (const p of paths) {
    const motion = p.end.clone().sub(p.start).normalize();
    assert.ok(motion.dot(frame.outward) < -0.999999);
    const radial = p.end.clone().sub(frame.origin);
    assert.ok(Math.abs(radial.dot(frame.outward)) < 1e-12);
    assert.ok(radial.length() < frame.radius);
  }
  for (let i = 1; i < paths.length; i++)
    assert.ok(
      Math.abs(
        paths[i].start.distanceTo(paths[0].start) -
          paths[i].end.distanceTo(paths[0].end),
      ) < 1e-12,
    );
});
test("opaque foreground hardware stops a marker; surfaces behind the aperture do not extend or bend its external path", () => {
  const object = new THREE.Group();
  const foreground = new THREE.Mesh(
    new THREE.PlaneGeometry(4, 4),
    new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }),
  );
  foreground.position.z = 1;
  object.add(foreground);
  const path = {
    start: new THREE.Vector3(0, 0, 3),
    end: new THREE.Vector3(0, 0, 0),
  };
  let [p] = clipIncomingPaths([path], object);
  assert.equal(p.blocked, true);
  assert.equal(p.end.z, 1);
  assert.deepEqual(p.start, path.start);
  foreground.position.z = -1;
  [p] = clipIncomingPaths([path], object);
  assert.equal(p.blocked, false);
  assert.deepEqual(p.end, path.end);
  foreground.geometry.dispose();
  foreground.material.dispose();
});
test("colour keys do not bend paths; disabled/missing frames and published-result stage hide the external diagram", () => {
  const effect = createObservationEffects(),
    camera = new THREE.PerspectiveCamera(),
    frame = {
      origin: new THREE.Vector3(),
      outward: new THREE.Vector3(0, 0, 1),
      radius: 0.5,
      length: 3,
    };
  effect.configure(frame, "#fff", 1, -1, "webb-b");
  effect.update(200, camera);
  const before = effect.diagnostics().rays;
  effect.configure(frame, "#fff", 1, 4, "webb-b");
  effect.update(200, camera);
  assert.deepEqual(effect.diagnostics().rays, before);
  effect.setEnabled(false);
  assert.equal(effect.update(500, camera), false);
  assert.equal(effect.diagnostics().diagram_visible, false);
  effect.setEnabled(true);
  effect.configure(null, "#fff", 0);
  effect.update(700, camera);
  assert.equal(effect.diagnostics().diagram_visible, false);
  effect.configure(frame, "#fff", 2);
  effect.update(900, camera);
  assert.equal(effect.diagnostics().diagram_visible, false);
  assert.equal(effect.diagnostics().published_image_visible, false);
  effect.dispose();
});
test("mixed-atlas appearance distinguishes neutral metal, dark insulation and coloured areas without rewriting source pixels", () => {
  assert.ok(atlasSurface(190, 191, 189).metal > 0.8);
  assert.ok(atlasSurface(5, 8, 14).metal < 0.1);
  assert.ok(atlasSurface(180, 130, 35).metal < 0.2);
});
test("internal lessons retain distinct optical orders and never treat shields or arrays as collectors", () => {
  assert.equal(opticalLessons["webb-b"][2][0], "Aft optics");
  assert.match(opticalLessons.hubble[3][1], /central opening/);
  assert.match(opticalLessons.spherex[2][1], /not a prism/);
});
