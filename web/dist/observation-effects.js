import * as THREE from "./vendor/three/three.module.js";
import { observingColors } from "./telescope-stories.js";
import { incomingPaths, clipIncomingPaths } from "./telescope-optics.js";

// External collection only. Distant-source on-axis rays remain parallel until
// they reach the model's collecting surface. No conical FOV or internal raytrace.
export function createObservationEffects() {
  const root = new THREE.Group(),
    beam = new THREE.Group();
  root.name = "Model-aligned incoming-light direction diagram";
  root.add(beam);
  const rays = [],
    markers = [],
    arrows = [];
  for (let i = 0; i < 8; i++) {
    const ray = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(),
        new THREE.Vector3(),
      ]),
      new THREE.LineBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.45,
        depthWrite: false,
      }),
    );
    const marker = new THREE.Mesh(
      new THREE.SphereGeometry(0.024, 8, 6),
      new THREE.MeshBasicMaterial({ color: 0xffffff }),
    );
    const arrow = new THREE.Mesh(
      new THREE.ConeGeometry(0.035, 0.12, 8),
      new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.8,
      }),
    );
    beam.add(ray, marker, arrow);
    rays.push(ray);
    markers.push(marker);
    arrows.push(arrow);
  }
  const pulse = new THREE.Mesh(
    new THREE.RingGeometry(1.9, 1.93, 96),
    new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  root.add(pulse);
  let active = false,
    stage = 0,
    channel = -1,
    enabled = true,
    motion = true,
    frame = null,
    paths = [],
    pulseStart = -Infinity,
    pulseOrigin = new THREE.Vector3(),
    serial = 0,
    mission = null;
  function feedback(position, color, now = performance.now()) {
    pulseOrigin.copy(position);
    pulse.position.copy(position);
    pulse.material.color.set(color);
    pulseStart = now;
    serial++;
  }
  function configure(
    nextFrame,
    color,
    nextStage = 0,
    nextChannel = -1,
    nextMission = "spherex",
  ) {
    stage = nextStage;
    channel = nextChannel;
    mission = nextMission;
    if (!nextFrame) {
      active = false;
      beam.visible = false;
      frame = null;
      paths = [];
      return;
    }
    paths = clipIncomingPaths(incomingPaths(nextFrame), nextFrame.occluder);
    frame = nextFrame;
    active = true;
    stage = nextStage;
    channel = nextChannel;
    mission = nextMission;
    const tint = channel >= 0 ? observingColors[channel] : color;
    rays.forEach((r, i) => {
      r.geometry.setFromPoints([paths[i].start, paths[i].end]);
      r.geometry.computeBoundingSphere();
      r.material.color.set(tint);
      markers[i].material.color.set(tint);
      arrows[i].material.color.set(tint);
      arrows[i].position.lerpVectors(paths[i].start, paths[i].end, 0.56);
      arrows[i].quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        paths[i].end.clone().sub(paths[i].start).normalize(),
      );
    });
  }
  return {
    root,
    configure,
    feedback,
    // Published results remain in the credited native 2D panel, never floated at
    // a beam endpoint as if they were a live target, detector or projected image.
    setImage() {},
    clearImage() {},
    close() {
      active = false;
      beam.visible = false;
    },
    setEnabled(value) {
      enabled = value;
    },
    setMotion(value) {
      motion = value;
    },
    update(now, camera) {
      const t = (now - pulseStart) / 1100;
      pulse.visible = enabled && motion && t >= 0 && t < 1;
      if (pulse.visible) {
        pulse.position.copy(pulseOrigin);
        pulse.quaternion.copy(camera.quaternion);
        pulse.scale.setScalar(1 + t * 0.6);
        pulse.material.opacity = motion ? (1 - t) * 0.6 : 0.5;
      }
      beam.visible = active && enabled && stage < 2;
      markers.forEach((p, i) => {
        p.visible = beam.visible;
        if (paths[i])
          p.position.lerpVectors(
            paths[i].start,
            paths[i].end,
            motion ? (now / 2600 + i / 8) % 1 : 0.5,
          );
      });
      return (pulse.visible && motion) || (beam.visible && motion);
    },
    labelPoint() {
      return active && enabled && stage < 2 && frame
        ? frame.origin
            .clone()
            .addScaledVector(frame.outward, frame.length * 0.72)
        : null;
    },
    diagnostics() {
      return {
        open: active,
        mission,
        stage,
        channel,
        effects: enabled,
        motion,
        pulse_serial: serial,
        published_image_visible: false,
        published_image_location: "credited native 2D panel only",
        external_geometry: "parallel rays toward model aperture; no FOV cone",
        origin: frame?.origin.toArray() || null,
        outward: frame?.outward.toArray() || null,
        collector_radius: frame?.radius || null,
        rays: paths.map((p) => ({
          start: p.start.toArray(),
          end: p.end.toArray(),
          blocked: Boolean(p.blocked),
          surface: p.surface || null,
        })),
        diagram_visible: beam.visible,
      };
    },
    dispose() {
      root.traverse((o) => {
        o.geometry?.dispose();
        o.material?.dispose();
      });
    },
  };
}
