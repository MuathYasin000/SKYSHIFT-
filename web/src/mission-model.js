// Optional, bounded spacecraft viewer. It shares the existing illustrative
// geometry and source-supported component identifiers; no scientific engine.
import * as THREE from "./vendor/three/three.module.js";
import { OrbitControls } from "./vendor/three/OrbitControls.js";
import { createHardwareStudio } from "./hardware-studio.js";
import { createSPHEREx } from "./spherex-model.js";
import { readPreferences } from "./space-preferences.js";
import { createObservationEffects } from "./observation-effects.js";
import { spherexOpticalFrame } from "./telescope-optics.js";

export function createMissionModel(
  canvas,
  {
    onComponent = () => {},
    onError = () => {},
    onFirstFrame = () => {},
    onAnchors = () => {},
    presentation = "mission",
  } = {},
) {
  const hero = presentation === "hero";
  const lifetime = new AbortController(),
    listen = (target, type, fn) =>
      target.addEventListener(type, fn, { signal: lifetime.signal });
  const preferences = readPreferences();
  // Retain automatic real-model startup on constrained devices with bounded
  // antialiasing, shadow and pixel-buffer costs.
  const constrained=(navigator.deviceMemory>0&&navigator.deviceMemory<=4)||(navigator.hardwareConcurrency>0&&navigator.hardwareConcurrency<=2)||navigator.connection?.saveData;
  if(constrained)preferences.quality='low';
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: hero,
    antialias: preferences.quality !== "low",
    powerPreference: "low-power",
  });
  renderer.setPixelRatio(
    Math.min(devicePixelRatio || 1, preferences.quality === "low" ? 1 : 1.5),
  );
  renderer.setClearColor("black", hero ? 0 : 1);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.95;
  renderer.shadowMap.enabled = preferences.quality !== "low";
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene(),
    camera = new THREE.PerspectiveCamera(38, 1, 0.05, 100),
    controls = new OrbitControls(camera, canvas),
    model = createSPHEREx();
  scene.add(model);
  // Present the coverglass cell face rather than a grazing white reflection.
  model.rotation.y = -0.2;
  model.rotation.z = hero ? -0.08 : 0;
  model.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  const room = createHardwareStudio();
  const pmrem = new THREE.PMREMGenerator(renderer),
    env = pmrem.fromScene(room.scene, 0.02);
  room.dispose();
  scene.environment = env.texture;
  scene.environmentIntensity = 0.8;
  const key = new THREE.DirectionalLight("white", 2.8);
  key.position.set(-3, 5, 6);
  key.castShadow = preferences.quality !== "low";
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.left = key.shadow.camera.bottom = -3;
  key.shadow.camera.right = key.shadow.camera.top = 3;
  key.shadow.camera.near = 0.5;
  key.shadow.camera.far = 20;
  key.shadow.normalBias = 0.025;
  const rim = new THREE.DirectionalLight("white", 1.3);
  rim.position.set(3, 1, -4);
  scene.add(key, rim, new THREE.HemisphereLight("white", "black", 0.35));
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
    userModified = false,
    flight = null,
    arrivalOrbit = null,
    arrivalLight = null,
    componentCenters = null;
  function draw() {
    if (!visible || disposed || document.hidden || frame) return;
    frame = requestAnimationFrame((now) => {
      frame = 0;
      if (!visible || disposed || document.hidden) return;
      if (flight) {
        const t =
            matchMedia("(prefers-reduced-motion:reduce)").matches ||
            !readPreferences().effects
              ? 1
              : Math.min(1, (now - flight.started) / 700),
          k = t * t * (3 - 2 * t);
        camera.position.lerpVectors(flight.from, flight.to, k);
        controls.target.lerpVectors(flight.targetFrom, flight.targetTo, k);
        controls.update();
        if (t === 1) flight = null;
      }
      if (arrivalOrbit) {
        const t = Math.min(1,(now-arrivalOrbit.started)/arrivalOrbit.duration);
        const reduced = matchMedia('(prefers-reduced-motion:reduce)').matches;
        const k = reduced ? 0 : Math.sin(Math.PI*t);
        const turn = t*t*(3-2*t);
        model.rotation.y = -.2 + (reduced ? 0 : Math.PI*2*turn);
        model.rotation.z = -.08 + .06*k;
        model.position.y = .06*k;
        arrivalLight?.update(now,camera);
        if(t===1 || !k && matchMedia('(prefers-reduced-motion:reduce)').matches)endArrivalOrbit();
      }
      try {renderer.render(scene, camera);} catch(error){onError(error.message);return;}
      frames++;
      if(frames===1)onFirstFrame();
      if (!hero) {
        if (!componentCenters) {
          const boxes = new Map();
          model.updateMatrixWorld(true);
          model.traverse((o) => {
            const id = o.userData.component;
            if (o.isMesh && id) {
              if (!boxes.has(id)) boxes.set(id, new THREE.Box3());
              boxes.get(id).expandByObject(o);
            }
          });
          componentCenters = [...boxes].map(([id, box]) => ({
            id,
            center: box.getCenter(new THREE.Vector3()),
          }));
        }
        onAnchors(
          componentCenters.map(({ id, center }) => {
            const p = center.clone().project(camera);
            return {
              id,
              x: (p.x + 1) / 2,
              y: (1 - p.y) / 2,
              visible:
                p.z > -1 &&
                p.z < 1 &&
                Math.abs(p.x) < 0.9 &&
                Math.abs(p.y) < 0.85,
            };
          }),
        );
      }
      if (flight || arrivalOrbit) draw();
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
    flight = null;
    endArrivalOrbit();
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
    flight = null;
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
          material.emissive?.set(picked ? "#222222" : "black");
      }
    });
    if (!box.isEmpty()) {
      const center = box.getCenter(new THREE.Vector3()),
        size = box.getSize(new THREE.Vector3()).length();
      const destination = center
        .clone()
        .add(
          new THREE.Vector3(-1, 0.7, 1.6)
            .normalize()
            .multiplyScalar(Math.max(2.5, size * 1.6)),
        );
      if (
        matchMedia("(prefers-reduced-motion:reduce)").matches ||
        !readPreferences().effects
      ) {
        flight = null;
        controls.target.copy(center);
        camera.position.copy(destination);
        controls.update();
      } else
        flight = {
          started: performance.now(),
          from: camera.position.clone(),
          to: destination,
          targetFrom: controls.target.clone(),
          targetTo: center,
        };
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
    flight = null;
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
    flight = null;
    userModified = true;
    const d = camera.position.clone().sub(controls.target),
      distance = Math.max(2, Math.min(12, d.length() * factor));
    camera.position.copy(controls.target).add(d.setLength(distance));
    controls.update();
    draw();
  }
  function endArrivalOrbit(){
    if(!arrivalOrbit)return;
    arrivalLight?.close();if(arrivalLight)arrivalLight.root.visible=false;
    arrivalOrbit=null;model.rotation.set(0,-.2,-.08);model.position.y=0;controls.enabled=true;
  }
  function playArrivalOrbit(duration=1200){
    if(!hero||disposed||!visible||matchMedia('(prefers-reduced-motion:reduce)').matches||!readPreferences().effects)return;
    if(!arrivalLight){
      // Clip once in model-local coordinates, then rotate the diagram with the
      // spacecraft. Reuse the existing parallel incoming-light illustration.
      const rotation=model.rotation.clone();model.rotation.set(0,0,0);model.updateMatrixWorld(true);
      const optical=spherexOpticalFrame();arrivalLight=createObservationEffects();
      arrivalLight.configure({origin:new THREE.Vector3(...optical.origin),outward:new THREE.Vector3(...optical.outward),radius:optical.radius,length:1.9,occluder:model},'#fc3d21');
      model.rotation.copy(rotation);model.add(arrivalLight.root);model.updateMatrixWorld(true);
    }
    arrivalLight.root.visible=true;
    arrivalOrbit={started:performance.now(),duration:Math.max(300,Math.min(3000,duration))};controls.enabled=false;draw();
  }
  reset();
  resize();
  return {
    reset,
    zoom,
    focusComponent,
    playArrivalOrbit,
    setVisible(value) {
      visible = Boolean(value);
      if (!visible) flight = null;
      if (!visible) endArrivalOrbit();
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
      arrival_orbit: Boolean(arrivalOrbit),
      model_rotation: model.rotation.toArray().slice(0,3),
      arrival_light: arrivalLight?{...arrivalLight.diagnostics(),visible:arrivalLight.root.visible}:null,
      camera: camera.position.toArray(),
      draw_calls: renderer.info.render.calls,
      triangles: renderer.info.render.triangles,
      quality: preferences.quality,
      memory: {...renderer.info.memory},
    }),
    dispose() {
      if(disposed)return;
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
