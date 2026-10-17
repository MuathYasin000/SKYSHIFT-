import * as THREE from "./vendor/three/three.module.js";

// Original virtual photographic softboxes. This is illustrative product
// lighting, not a measured clean-room HDR scan or a simulation of flight light.
export function createHardwareStudio() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x141820);
  const geometries = [],
    materials = [];
  function softbox(position, size, power, color = 0xffffff) {
    const geometry = new THREE.PlaneGeometry(...size),
      material = new THREE.MeshBasicMaterial({
        color: new THREE.Color(color).multiplyScalar(power),
        side: THREE.DoubleSide,
      });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(...position);
    mesh.lookAt(0, 0, 0);
    scene.add(mesh);
    geometries.push(geometry);
    materials.push(material);
  }
  softbox([-4, 3, 4], [2.4, 6], 5.5, 0xfff8ec);
  softbox([4, 1, 2], [1, 5], 3.8, 0xdde7f4);
  softbox([0, 6, -1], [5, 3], 4.5);
  softbox([1, 0, -5], [0.45, 6], 3.5);
  softbox([-3, -2, -3], [1.2, 3], 1.6, 0xe3e7f0);
  // Dark bars between rectangular sources produce readable metal reflections.
  return {
    scene,
    dispose() {
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
    },
  };
}
