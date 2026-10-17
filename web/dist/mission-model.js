// Optional, bounded spacecraft viewer. It shares the existing illustrative
// geometry and source-supported component identifiers; no scientific engine.
import * as THREE from "./vendor/three/three.module.js";
import { OrbitControls } from "./vendor/three/OrbitControls.js";
import { RoomEnvironment } from "./vendor/three/RoomEnvironment.js";
import { createSPHEREx } from "./spherex-model.js";
import { readPreferences } from "./space-preferences.js";

export function createMissionModel(
  canvas,
  { onComponent = () => {}, onError = () => {}, presentation = "mission" } = {},
) {
  const hero = presentation === "hero";
  const lifetime = new AbortController(),
    listen = (target, type, fn) =>
      target.addEventListener(type, fn, { signal: lifetime.signal });
  const preferences = readPreferences();
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: hero,
    antialias: preferences.quality !== "low",
    powerPreference: "low-power",
  });
  renderer.setPixelRatio(
    Math.min(devicePixelRatio || 1, preferences.quality === "low" ? 1 : 1.5),
  );
  renderer.setClearColor(hero ? "#070a12" : "#0c1115", hero ? 0 : 1);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = preferences.quality !== "low";
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene(),
    camera = new THREE.PerspectiveCamera(38, 1, 0.05, 100),
    controls = new OrbitControls(camera, canvas),
    model = createSPHEREx();
  scene.add(model);
  model.rotation.z = hero ? -0.22 : 0;
  model.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  const room = new RoomEnvironment();
  const pmrem = new THREE.PMREMGenerator(renderer),
    env = pmrem.fromScene(room, 0.04);
  room.dispose();
  scene.environment = env.texture;
  scene.environmentIntensity = 0.65;
  const key = new THREE.DirectionalLight("#fff4e4", 3.2);
  key.position.set(-3, 5, 6);
  key.castShadow = preferences.quality !== "low";
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.left = key.shadow.camera.bottom = -3;
  key.shadow.camera.right = key.shadow.camera.top = 3;
  key.shadow.camera.near = 0.5;
  key.shadow.camera.far = 20;
  key.shadow.normalBias = 0.025;
  const rim = new THREE.DirectionalLight("#8fb8ed", 2.1);
  rim.position.set(3, 1, -4);
  scene.add(key, rim, new THREE.HemisphereLight("#edf3ff", "#292322", 0.75));
  controls.enableDamping = false;
  controls.enablePan = false;
  // Homepage scrolling takes precedence; explicit zoom buttons remain available.
  controls.enableZoom = !hero;
  if (hero) canvas.style.touchAction = "pan-y pinch-zoom";
  controls.minDistance = 2;
  controls.maxDistance = 12;
  let visible = true,
    frame = 0,
    frames = 0,
    disposed = false,
    selected = null,
    down = null,
    userModified = false;
  function draw() {
    if (!visible || disposed || document.hidden || frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      renderer.render(scene, camera);
      frames++;
    });
  }
  function resize() {
    const r = canvas.getBoundingClientRect();
    if (!r.width || !r.height) return;
    renderer.setSize(r.width, r.height, false);
    camera.aspect = r.width / r.height;
    camera.updateProjectionMatrix();
    if (hero && !userModified) reset();
    draw();
  }
  function reset() {
    userModified = false;
    selected = null;
    model.traverse((o) => {
      if (o.isMesh)
        for (const m of Array.isArray(o.material) ? o.material : [o.material])
          m.emissive?.set("#000000");
    });
    controls.target.set(0, -0.22, 0);
    const aspect = Math.max(
      0.1,
      canvas.clientWidth / Math.max(1, canvas.clientHeight),
    );
    const verticalFov = THREE.MathUtils.degToRad(camera.fov);
    const limitingFov = Math.min(
      verticalFov,
      2 * Math.atan(Math.tan(verticalFov / 2) * aspect),
    );
    const distance = Math.max(4.8, 2.0 / Math.sin(limitingFov / 2));
    camera.position
      .copy(controls.target)
      .add(
        new THREE.Vector3(-4.5, 2.9, 4.8).normalize().multiplyScalar(distance),
      );
    controls.update();
    draw();
  }
  controls.addEventListener("change", draw);
  controls.addEventListener("start", () => {
    userModified = true;
  });
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  function focusComponent(id) {
    userModified = true;
    selected = id;
    const box = new THREE.Box3();
    model.updateMatrixWorld(true);
    model.traverse((o) => {
      if (o.isMesh) {
        const picked = o.userData.component === id;
        if (picked) box.expandByObject(o);
        for (const material of Array.isArray(o.material)
          ? o.material
          : [o.material])
          material.emissive?.set(picked ? "#31484b" : "#000000");
      }
    });
    if (!box.isEmpty()) {
      const center = box.getCenter(new THREE.Vector3()),
        size = box.getSize(new THREE.Vector3()).length();
      controls.target.copy(center);
      camera.position
        .copy(center)
        .add(
          new THREE.Vector3(-1, 0.7, 1.6)
            .normalize()
            .multiplyScalar(Math.max(2.5, size * 1.6)),
        );
      controls.update();
    }
    draw();
  }
  listen(canvas, "pointerdown", (e) => {
    down = [e.clientX, e.clientY];
  });
  listen(canvas, "pointerup", (e) => {
    if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 5)
      return;
    const r = canvas.getBoundingClientRect(),
      ray = new THREE.Raycaster();
    ray.setFromCamera(
      new THREE.Vector2(
        ((e.clientX - r.left) / r.width) * 2 - 1,
        (-(e.clientY - r.top) / r.height) * 2 + 1,
      ),
      camera,
    );
    const hit = ray
      .intersectObject(model, true)
      .find((h) => h.object.userData.component);
    if (hit) onComponent(hit.object.userData.component);
    down = null;
  });
  listen(canvas, "keydown", (e) => {
    if (["+", "=", "-"].includes(e.key)) {
      e.preventDefault();
      zoom(e.key === "-" ? 1.2 : 0.8);
    } else if (e.key === "Home") {
      e.preventDefault();
      reset();
    } else if (e.key.startsWith("Arrow")) {
      userModified = true;
      e.preventDefault();
      const offset = camera.position.clone().sub(controls.target),
        s = new THREE.Spherical().setFromVector3(offset);
      s.theta +=
        e.key === "ArrowLeft" ? 0.12 : e.key === "ArrowRight" ? -0.12 : 0;
      s.phi += e.key === "ArrowUp" ? -0.12 : e.key === "ArrowDown" ? 0.12 : 0;
      s.makeSafe();
      camera.position
        .copy(controls.target)
        .add(new THREE.Vector3().setFromSpherical(s));
      controls.update();
      draw();
    }
  });
  listen(canvas, "webglcontextlost", (e) => {
    e.preventDefault();
    onError(
      "The model’s graphics context was lost. Retry the model; your scientific work is unchanged.",
    );
  });
  function zoom(factor) {
    userModified = true;
    const d = camera.position.clone().sub(controls.target),
      distance = Math.max(2, Math.min(12, d.length() * factor));
    camera.position.copy(controls.target).add(d.setLength(distance));
    controls.update();
    draw();
  }
  reset();
  resize();
  return {
    reset,
    zoom,
    focusComponent,
    setVisible(value) {
      visible = Boolean(value);
      if (!visible && frame) {
        cancelAnimationFrame(frame);
        frame = 0;
      }
      if (visible) {
        resize();
        draw();
      }
    },
    diagnostics: () => ({
      frames,
      visible,
      selected,
      kind: "illustrative_spacecraft",
      presentation,
      camera: camera.position.toArray(),
      draw_calls: renderer.info.render.calls,
      triangles: renderer.info.render.triangles,
    }),
    dispose() {
      disposed = true;
      lifetime.abort();
      observer.disconnect();
      controls.dispose();
      cancelAnimationFrame(frame);
      const textures = new Set();
      model.traverse((o) => {
        o.geometry?.dispose();
        for (const m of o.material
          ? Array.isArray(o.material)
            ? o.material
            : [o.material]
          : []) {
          for (const v of Object.values(m)) if (v?.isTexture) textures.add(v);
          m.dispose();
        }
      });
      textures.forEach((t) => t.dispose());
      env.dispose();
      pmrem.dispose();
      key.shadow.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
}
