import * as THREE from "./vendor/three/three.module.js";
import { observingColors } from "./telescope-stories.js";

// A deliberately schematic, detached educational light fan. It is not an
// instrument boresight, calibrated FOV, optical design or measured photon stream.
export function createObservationEffects() {
  const root = new THREE.Group();
  root.name = "Conceptual light collection and wavelength diagram";
  const beam = new THREE.Group();
  root.add(beam);
  const channels = [],
    rays = [],
    photons = [];
  for (let i = 0; i < 6; i++) {
    const color = new THREE.Color(observingColors[i]);
    const x = (i - 2.5) * 0.58;
    const path = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(x, 2.8, -5.4),
      new THREE.Vector3(0, 0.9, 0),
    ]);
    const ray = new THREE.Line(
      path,
      new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.35 }),
    );
    beam.add(ray);
    rays.push(ray);
    const channel = new THREE.Mesh(
      new THREE.BoxGeometry(0.42, 0.08, 1.05),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.75 }),
    );
    channel.position.set(x, -1.9, 1.3);
    beam.add(channel);
    channels.push(channel);
    const photon = new THREE.Mesh(
      new THREE.SphereGeometry(0.035, 8, 6),
      new THREE.MeshBasicMaterial({ color }),
    );
    beam.add(photon);
    photons.push(photon);
  }
  const fan = new THREE.Mesh(
    new THREE.ConeGeometry(1.8, 5.7, 32, 1, true),
    new THREE.MeshBasicMaterial({
      color: 0x8cd9db,
      transparent: true,
      opacity: 0.055,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  fan.position.set(0, 1.85, -2.7);
  fan.quaternion.setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    new THREE.Vector3(0, -1.9, 5.4).normalize(),
  );
  beam.add(fan);
  const detector = new THREE.Mesh(
    new THREE.PlaneGeometry(4.3, 1.6),
    new THREE.MeshBasicMaterial({
      color: 0x1a2227,
      transparent: true,
      opacity: 0.65,
      side: THREE.DoubleSide,
    }),
  );
  detector.rotation.x = -Math.PI / 2;
  detector.position.set(0, -1.95, 1.3);
  beam.add(detector);
  const pulse = new THREE.Mesh(
    new THREE.RingGeometry(1.9, 1.93, 96),
    new THREE.MeshBasicMaterial({
      color: 0x8cd9db,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  root.add(pulse);
  const imagePlane = new THREE.Mesh(
    new THREE.PlaneGeometry(4.3, 3.2),
    new THREE.MeshBasicMaterial({
      color: 0xffffff,
      side: THREE.DoubleSide,
      toneMapped: false,
    }),
  );
  imagePlane.position.set(0, 2.8, -5.4);
  imagePlane.visible = false;
  beam.add(imagePlane);
  let imageReady = false,
    imageSource = null;
  let active = false,
    stage = 0,
    spread = 1,
    channel = -1,
    enabled = true,
    motion = true,
    pulseStart = -Infinity,
    pulseOrigin = new THREE.Vector3(),
    serial = 0;
  function feedback(position, color, now = performance.now()) {
    pulseOrigin.copy(position);
    pulse.position.copy(position);
    pulse.material.color.set(color);
    pulseStart = now;
    serial++;
  }
  function configure(
    position,
    color,
    nextStage = 0,
    nextChannel = -1,
    mission = "spherex",
  ) {
    active = true;
    stage = nextStage;
    channel = nextChannel;
    // Qualitative survey vs targeted-collection distinction only, not relative
    // measured fields of view or a claimed optical performance comparison.
    spread = mission === "spherex" ? 1 : mission === "webb-b" ? 0.45 : 0.7;
    fan.scale.set(spread, 1, spread);
    beam.position.copy(position);
    fan.material.color.set(color);
    rays.forEach((r, i) => {
      r.material.opacity = channel < 0 || channel === i ? 0.55 : 0.08;
      r.geometry.attributes.position.setX(0, (i - 2.5) * 0.58 * spread);
      r.geometry.attributes.position.needsUpdate = true;
      r.geometry.computeBoundingSphere();
    });
    channels.forEach((c, i) => {
      c.visible = stage >= 1;
      c.material.opacity = channel < 0 || channel === i ? 0.85 : 0.12;
    });
    detector.visible = stage >= 1;
    fan.visible = stage === 0;
    root.visible = true;
  }
  return {
    root,
    configure,
    feedback,
    setImage(image) {
      if (imageSource !== image.src) {
        imagePlane.material.map?.dispose();
        const map = new THREE.Texture(image);
        map.colorSpace = THREE.SRGBColorSpace;
        map.needsUpdate = true;
        imagePlane.material.map = map;
        imagePlane.material.needsUpdate = true;
        imageSource = image.src;
      }
      const ratio = image.naturalWidth / image.naturalHeight;
      imagePlane.scale.set(
        Math.min(1, ratio / 1.34375),
        Math.min(1, 1.34375 / ratio),
        1,
      );
      imageReady = true;
    },
    clearImage() {
      imageReady = false;
      imagePlane.visible = false;
    },
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
      pulse.visible = enabled && t >= 0 && t < 1;
      if (pulse.visible) {
        pulse.position.copy(pulseOrigin);
        pulse.quaternion.copy(camera.quaternion);
        pulse.scale.setScalar(1 + t * 0.6);
        pulse.material.opacity = motion ? (1 - t) * 0.75 : 0.7;
      }
      beam.visible = active;
      imagePlane.visible = active && stage === 2 && imageReady;
      imagePlane.quaternion.copy(camera.quaternion);
      photons.forEach((p, i) => {
        p.visible = active && enabled && stage < 2;
        const phase = motion ? (now / 2400 + i / 6) % 1 : 0.5;
        p.position.set(
          (i - 2.5) * 0.58 * spread * (1 - phase),
          2.8 - 1.9 * phase,
          -5.4 + 5.4 * phase,
        );
        p.material.opacity = channel < 0 || channel === i ? 1 : 0.15;
        p.material.transparent = true;
      });
      // Photon animation only runs during an explicitly opened explanation.
      return (
        (pulse.visible && motion) || (active && enabled && motion && stage < 2)
      );
    },
    diagnostics() {
      return {
        open: active,
        stage,
        channel,
        illustrative_spread: spread,
        effects: enabled,
        motion,
        pulse_serial: serial,
        published_image_visible: imagePlane.visible,
      };
    },
    dispose() {
      imagePlane.material.map?.dispose();
      root.traverse((o) => {
        o.geometry?.dispose();
        o.material?.dispose();
      });
    },
  };
}
