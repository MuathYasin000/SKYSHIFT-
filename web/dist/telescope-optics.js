import * as THREE from "./vendor/three/three.module.js";

// Coordinates in the inspected, hash-pinned NASA asset's original scene space.
// They locate model surfaces; they are not engineering boresight calibrations.
export const sourceOptics = Object.freeze({
  "webb-detail": {
    origin: [1.055, 6.2746, 0],
    outward: [1, 0, 0],
    radius: 2.95,
    reference:
      "NASA A model: 18 primary segments centred near x=1.055, y=6.2746; secondary support near x=8.352, y=6.3315",
  },
  "webb-b": {
    origin: [0, 3.37, 1.55],
    outward: [0, 0, 1],
    radius: 2.92,
    reference:
      "Primary faces near z=1.55; secondary near z=8.45 in NASA B model",
  },
  hubble: {
    origin: [0, 259.5, 0],
    outward: [0, 1, 0],
    radius: 45,
    reference:
      "Front circular cover at y=258.27–259.46 in NASA A scene; opened for this educational view",
  },
});
export function sourceOpticalFrame(id, center) {
  const p = sourceOptics[id];
  if (!p) return null;
  return {
    origin: new THREE.Vector3(...p.origin).sub(center).toArray(),
    outward: [...p.outward],
    radius: p.radius,
    reference: p.reference,
  };
}
export function spherexOpticalFrame() {
  // Match the actual housing's inferred 0.1-radian Z tilt in spherex-model.js.
  const q = new THREE.Quaternion().setFromAxisAngle(
    new THREE.Vector3(0, 0, 1),
    0.1,
  );
  return {
    origin: new THREE.Vector3(0.025, 0.44, 0).applyQuaternion(q).toArray(),
    outward: new THREE.Vector3(0, 1, 0).applyQuaternion(q).toArray(),
    radius: 0.085,
    reference:
      "Illustrative housing aperture, including its modeled tilt; not measured flight alignment",
  };
}
export function worldOpticalFrame(object) {
  const p = object?.userData.optics;
  if (!p) return null;
  object.updateWorldMatrix(true, false);
  const origin = new THREE.Vector3(...p.origin).applyMatrix4(
      object.matrixWorld,
    ),
    outward = new THREE.Vector3(...p.outward).transformDirection(
      object.matrixWorld,
    ),
    scale = object.getWorldScale(new THREE.Vector3()),
    radius = p.radius * Math.max(scale.x, scale.y, scale.z);
  if (![...origin, ...outward, radius].every(Number.isFinite) || radius <= 0)
    throw Error("Invalid model aperture frame");
  return {
    origin,
    outward,
    radius,
    length: Math.max(2.2, radius * 4),
    reference: p.reference,
    occluder: object,
  };
}
export function incomingPaths(frame, count = 8) {
  if (
    !frame ||
    !Number.isFinite(frame.radius) ||
    frame.radius <= 0 ||
    frame.outward.lengthSq() < 0.99
  )
    throw Error("Missing model-aligned optical frame");
  const axis = frame.outward.clone().normalize(),
    helper =
      Math.abs(axis.y) > 0.9
        ? new THREE.Vector3(1, 0, 0)
        : new THREE.Vector3(0, 1, 0),
    u = new THREE.Vector3().crossVectors(axis, helper).normalize(),
    v = new THREE.Vector3().crossVectors(axis, u).normalize();
  return Array.from({ length: count }, (_, i) => {
    const a = (i * Math.PI * 2) / count,
      offset = u
        .clone()
        .multiplyScalar(Math.cos(a) * frame.radius * 0.72)
        .addScaledVector(v, Math.sin(a) * frame.radius * 0.72),
      end = frame.origin.clone().add(offset),
      start = end.clone().addScaledVector(axis, frame.length);
    return { start, end };
  });
}

// Presentation-level visibility test, not reflection/refraction or throughput.
// Stop at the first rendered surface in front of the aperture (e.g. a secondary
// support), rather than drawing animated photons through opaque hardware.
export function clipIncomingPaths(paths, object) {
  if (!object) return paths;
  object.updateWorldMatrix(true, true);
  return paths.map(({ start, end }) => {
    const direction = end.clone().sub(start),
      length = direction.length();
    const cast = new THREE.Raycaster(start, direction.normalize(), 0, length);
    const hit = cast.intersectObject(object, true)[0];
    return hit && hit.distance < length - 1e-5
      ? {
          start,
          end: hit.point.clone(),
          blocked: true,
          surface:
            hit.object.name ||
            hit.object.material?.name ||
            "foreground hardware",
        }
      : { start, end, blocked: false };
  });
}
