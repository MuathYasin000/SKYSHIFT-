import * as THREE from "./vendor/three/three.module.js";
import { OrbitControls } from "./vendor/three/OrbitControls.js";
import { GLTFLoader } from "./vendor/three/GLTFLoader.js";
import { DRACOLoader } from "./vendor/three/DRACOLoader.js";
import { RoomEnvironment } from "./vendor/three/RoomEnvironment.js";
import { bodies, fieldVector, bodyPosition } from "./space-content.js";
import { createSPHEREx } from "./spherex-model.js";

export function createSpaceScene(
  canvas,
  { assets, fields, onSelect, onStatus, onError, preferences },
) {
  const lifetime = new AbortController(),
    listen = (target, type, handler) =>
      target.addEventListener(type, handler, { signal: lifetime.signal });
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: preferences.quality !== "low",
    powerPreference: "low-power",
    alpha: false,
  });
  renderer.setPixelRatio(
    Math.min(devicePixelRatio || 1, preferences.quality === "low" ? 1 : 1.5),
  );
  renderer.setClearColor(0x020407);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.92;
  const scene = new THREE.Scene(),
    camera = new THREE.PerspectiveCamera(45, 1, 0.05, 2000);
  camera.position.set(5, 2.7, 7);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = !matchMedia("(prefers-reduced-motion:reduce)")
    .matches;
  controls.dampingFactor = 0.09;
  controls.minDistance = 2.5;
  controls.maxDistance = 180;
  controls.enablePan = false;
  const pmrem = new THREE.PMREMGenerator(renderer),
    environment = pmrem.fromScene(new RoomEnvironment(), 0.04);
  scene.environment = environment.texture;
  scene.environmentIntensity = 0.55;
  const ambient = new THREE.HemisphereLight(0xb5d9ff, 0x252029, 0.65);
  scene.add(ambient);
  const key = new THREE.DirectionalLight(0xffedd4, 2.5);
  key.position.set(6, 8, 10);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x5ed5e5, 0.9);
  rim.position.set(-6, 2, -4);
  scene.add(rim);
  const modelGroup = new THREE.Group(),
    solarGroup = new THREE.Group(),
    skyGroup = new THREE.Group();
  scene.add(modelGroup, solarGroup, skyGroup);
  const objects = new Map(),
    fieldPoints = new Map(),
    cache = new Map();
  let active = "observatory",
    currentHardware = "spherex",
    modelSequence = 0,
    animation = null,
    frame = 0,
    paused = false,
    lost = false;
  const reduced = matchMedia("(prefers-reduced-motion:reduce)"),
    metrics = {
      frames: 0,
      render_ms: [],
      draw_calls: 0,
      triangles: 0,
      assets_loaded: [],
      scene: "observatory",
      webgl: "ready",
    };
  const registry = new Map(
    assets.filter((a) => a.status !== "not_integrated").map((a) => [a.id, a]),
  );
  const manager = new THREE.LoadingManager(),
    failedResources = new Set(),
    draco = new DRACOLoader(manager);
  manager.onError = (url) => failedResources.add(url);
  draco.setDecoderPath("./vendor/three/draco/");
  draco.setDecoderConfig({ type: "wasm" });
  draco.setWorkerLimit(1);
  const loader = new GLTFLoader(manager);
  loader.setDRACOLoader(draco);
  const textureLoader = new THREE.TextureLoader(manager);
  async function verifiedBuffer(id) {
    const asset = registry.get(id);
    if (!asset) throw Error("No verified asset record for " + id);
    const response = await fetch("./" + asset.file, {
      signal: AbortSignal.timeout(20000),
    });
    if (!response.ok)
      throw Error("Model unavailable (" + response.status + ")");
    const bytes = await response.arrayBuffer(),
      hash = Array.from(
        new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)),
        (v) => v.toString(16).padStart(2, "0"),
      ).join("");
    if (hash !== asset.sha256)
      throw Error("Context asset checksum mismatch: " + id);
    return bytes;
  }
  async function model(id) {
    if (!cache.has(id))
      cache.set(
        id,
        (async () => {
          const bytes = await verifiedBuffer(id),
            before = failedResources.size,
            gltf = await loader.parseAsync(bytes, "");
          if (failedResources.size > before)
            throw Error("A required model texture failed to load");
          const root = gltf.scene;
          root.updateMatrixWorld(true);
          const box = new THREE.Box3().setFromObject(root),
            center = box.getCenter(new THREE.Vector3()),
            size = box.getSize(new THREE.Vector3()),
            pivot = new THREE.Group();
          root.position.sub(center);
          pivot.add(root);
          pivot.scale.setScalar(2 / Math.max(size.x, size.y, size.z));
          root.traverse((o) => {
            if (o.isMesh) {
              o.castShadow = false;
              o.receiveShadow = false;
              if (o.material) {
                for (const m of Array.isArray(o.material)
                  ? o.material
                  : [o.material]) {
                  m.side = THREE.DoubleSide;
                }
              }
            }
          });
          metrics.assets_loaded.push(id);
          return pivot;
        })().catch((e) => {
          cache.delete(id);
          throw e;
        }),
      );
    return (await cache.get(id)).clone(true);
  }
  async function textured(id, radius) {
    const bytes = await verifiedBuffer(id),
      url = URL.createObjectURL(new Blob([bytes]));
    try {
      const texture = await textureLoader.loadAsync(url);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = Math.min(
        4,
        renderer.capabilities.getMaxAnisotropy(),
      );
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(radius, 64, 40),
        new THREE.MeshStandardMaterial({
          map: texture,
          roughness: 0.9,
          metalness: 0,
        }),
      );
      metrics.assets_loaded.push(id);
      return mesh;
    } finally {
      URL.revokeObjectURL(url);
    }
  }
  const spherex = createSPHEREx();
  modelGroup.add(spherex);
  objects.set("spherex", spherex);
  // Noncatalogued procedural backdrop: aesthetic navigation context, never a measured star map.
  let seed = 401;
  const rand = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    },
    starPositions = [],
    colors = [];
  for (let i = 0; i < 2200; i++) {
    const z = rand() * 2 - 1,
      a = rand() * Math.PI * 2,
      r = 400;
    starPositions.push(
      r * Math.sqrt(1 - z * z) * Math.cos(a),
      r * z,
      r * Math.sqrt(1 - z * z) * Math.sin(a),
    );
    const c = new THREE.Color().setHSL(
      0.08 + rand() * 0.55,
      0.12,
      0.35 + rand() * 0.5,
    );
    colors.push(c.r, c.g, c.b);
  }
  const starGeometry = new THREE.BufferGeometry();
  starGeometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(starPositions, 3),
  );
  starGeometry.setAttribute(
    "color",
    new THREE.Float32BufferAttribute(colors, 3),
  );
  const stars = new THREE.Points(
    starGeometry,
    new THREE.PointsMaterial({
      size: 0.65,
      sizeAttenuation: true,
      vertexColors: true,
      transparent: true,
      opacity: 0.7,
    }),
  );
  scene.add(stars);
  const gridMaterial = new THREE.LineBasicMaterial({
    color: 0x294c59,
    transparent: true,
    opacity: 0.42,
  });
  for (let dec = -60; dec <= 60; dec += 30) {
    const points = Array.from(
      { length: 181 },
      (_, i) => new THREE.Vector3(...fieldVector(i * 2, dec)),
    );
    skyGroup.add(
      new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(points),
        gridMaterial,
      ),
    );
  }
  for (let ra = 0; ra < 360; ra += 30) {
    const points = Array.from(
      { length: 91 },
      (_, i) => new THREE.Vector3(...fieldVector(ra, -90 + i * 2)),
    );
    skyGroup.add(
      new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(points),
        gridMaterial,
      ),
    );
  }
  for (const field of fields) {
    const marker = new THREE.Mesh(
      new THREE.SphereGeometry(0.45, 20, 12),
      new THREE.MeshBasicMaterial({
        color: field.id === "m101" ? 0xffbc67 : 0x6bd8e5,
      }),
    );
    marker.position.set(...fieldVector(field.ra_deg, field.dec_deg));
    marker.userData.id = field.id;
    skyGroup.add(marker);
    fieldPoints.set(field.id, marker);
  }
  let solarPromise = null;
  async function loadSolar() {
    if (solarPromise) return solarPromise;
    solarPromise = Promise.allSettled(
      bodies.map(async (b) => {
        if (objects.has(b.id)) return;
        let object = b.model
          ? await model(b.model)
          : await textured(b.texture, b.radius);
        if (b.model) object.scale.multiplyScalar(b.radius);
        if (b.id === "sun")
          object.traverse((o) => {
            if (o.isMesh) {
              const material = o.material;
              material.emissive = new THREE.Color(0xff9c34);
              material.emissiveMap = material.map;
              material.emissiveIntensity = 1.2;
            }
          });
        object.position.set(...bodyPosition(b));
        if (b.id === "moon") {
          const earth = bodyPosition(bodies.find((b) => b.id === "earth"));
          object.position.set(earth[0] + 2, 0, earth[2] + 0.7);
        }
        object.userData.id = b.id;
        object.traverse((o) => {
          if (o.isMesh) o.userData.id = b.id;
        });
        objects.set(b.id, object);
        solarGroup.add(object);
        if (b.orbit) {
          const points = Array.from(
            { length: 181 },
            (_, i) =>
              new THREE.Vector3(
                Math.cos((i * Math.PI) / 90) * b.orbit,
                0,
                Math.sin((i * Math.PI) / 90) * b.orbit,
              ),
          );
          solarGroup.add(
            new THREE.Line(
              new THREE.BufferGeometry().setFromPoints(points),
              new THREE.LineBasicMaterial({
                color: 0x4e6b71,
                transparent: true,
                opacity: 0.32,
              }),
            ),
          );
        }
        invalidate();
      }),
    ).then((results) => {
      const failures = results
        .map((r, i) =>
          r.status === "rejected"
            ? bodies[i].name + ": " + r.reason.message
            : null,
        )
        .filter(Boolean);
      if (failures.length) {
        solarPromise = null;
        onStatus(
          "Some contextual models could not load: " +
            failures.join("; ") +
            ". Re-enter Solar system to retry.",
          "error",
        );
      } else onStatus("NASA contextual assets loaded · schematic arrangement");
      return results;
    });
    return solarPromise;
  }
  function invalidate() {
    if (!frame && !paused && !lost && !document.hidden)
      frame = requestAnimationFrame(draw);
  }
  function draw(now) {
    frame = 0;
    if (paused || lost || document.hidden) return;
    const started = performance.now();
    if (animation) {
      const t = Math.min(1, (now - animation.start) / 850),
        k = 1 - Math.pow(1 - t, 3);
      camera.position.lerpVectors(animation.from, animation.to, k);
      controls.target.lerpVectors(animation.targetFrom, animation.targetTo, k);
      if (t === 1) animation = null;
      else invalidate();
    }
    controls.update();
    renderer.render(scene, camera);
    metrics.frames++;
    metrics.draw_calls = renderer.info.render.calls;
    metrics.triangles = renderer.info.render.triangles;
    metrics.render_ms.push(performance.now() - started);
    if (metrics.render_ms.length > 180) metrics.render_ms.shift();
    canvas.dispatchEvent(new CustomEvent("space-frame"));
  }
  controls.addEventListener("change", invalidate);
  controls.addEventListener("start", () => (animation = null));
  function travel(position, target) {
    const to = new THREE.Vector3(...position),
      targetTo = new THREE.Vector3(...target);
    if (reduced.matches) {
      camera.position.copy(to);
      controls.target.copy(targetTo);
      animation = null;
    } else
      animation = {
        from: camera.position.clone(),
        to,
        targetFrom: controls.target.clone(),
        targetTo,
        start: performance.now(),
      };
    invalidate();
  }
  function reset() {
    controls.minDistance = active === "sky" ? 30 : 2.5;
    controls.maxDistance = active === "sky" ? 110 : 180;
    if (active === "observatory") {
      const rect = canvas.getBoundingClientRect(),
        fit = Math.max(1, 0.8 / (rect.width / rect.height || 1));
      travel([5 * fit, 2.7 * fit, 7 * fit], [0, -0.2, 0]);
    } else if (active === "solar") travel([32, 48, 67], [0, 0, 0]);
    else travel([-45, 31, 60], [0, 0, 0]);
  }
  const observer = new ResizeObserver(() => {
    const r = canvas.getBoundingClientRect();
    if (!r.width || !r.height) return;
    renderer.setSize(r.width, r.height, false);
    camera.aspect = r.width / r.height;
    camera.updateProjectionMatrix();
    invalidate();
  });
  observer.observe(canvas);
  listen(canvas, "webglcontextlost", (e) => {
    e.preventDefault();
    lost = true;
    metrics.webgl = "lost";
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    onError(
      "3D rendering was interrupted. Your scientific workspace is preserved. Open Classic View or reload to retry 3D.",
    );
  });
  listen(canvas, "webglcontextrestored", () => {
    lost = false;
    metrics.webgl = "restored";
    invalidate();
    onStatus("3D context restored.");
  });
  listen(document, "visibilitychange", () => {
    if (document.hidden) {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
    } else invalidate();
  });
  listen(reduced, "change", () => {
    controls.enableDamping = !reduced.matches;
    if (reduced.matches && animation) {
      camera.position.copy(animation.to);
      controls.target.copy(animation.targetTo);
      animation = null;
    }
    invalidate();
  });
  const raycaster = new THREE.Raycaster(),
    pointers = new Set();
  let down = null,
    gesture = false,
    moved = false;
  listen(canvas, "pointerdown", (e) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    pointers.add(e.pointerId);
    if (pointers.size === 1) {
      down = { x: e.clientX, y: e.clientY };
      gesture = false;
      moved = false;
    } else gesture = true;
  });
  listen(canvas, "pointermove", (e) => {
    if (
      pointers.has(e.pointerId) &&
      down &&
      Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6
    )
      moved = true;
  });
  listen(canvas, "pointercancel", () => {
    pointers.clear();
    down = null;
    gesture = false;
    moved = false;
  });
  listen(canvas, "pointerup", (e) => {
    const activePointer = pointers.delete(e.pointerId),
      pick =
        activePointer &&
        down &&
        !gesture &&
        !moved &&
        Math.hypot(e.clientX - down.x, e.clientY - down.y) <= 6;
    if (!pointers.size) down = null;
    if (!pick) return;
    const rect = canvas.getBoundingClientRect();
    raycaster.setFromCamera(
      new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        (-(e.clientY - rect.top) / rect.height) * 2 + 1,
      ),
      camera,
    );
    const group =
      active === "sky"
        ? skyGroup
        : active === "solar"
          ? solarGroup
          : modelGroup;
    const hit = raycaster
      .intersectObjects(group.children, true)
      .find((h) => h.object.userData.id || h.object.userData.component);
    if (hit)
      onSelect(
        hit.object.userData.component
          ? "component:" + hit.object.userData.component
          : hit.object.userData.id,
      );
  });
  listen(canvas, "keydown", (e) => {
    if (e.key === "Home" || e.key.toLowerCase() === "r") {
      e.preventDefault();
      reset();
    } else if (["+", "=", "-"].includes(e.key)) {
      e.preventDefault();
      zoom(e.key === "-" ? 1.2 : 1 / 1.2);
    } else if (
      ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)
    ) {
      e.preventDefault();
      const offset = camera.position.clone().sub(controls.target),
        spherical = new THREE.Spherical().setFromVector3(offset);
      spherical.theta += { ArrowLeft: 0.12, ArrowRight: -0.12 }[e.key] || 0;
      spherical.phi = Math.max(
        0.08,
        Math.min(
          Math.PI - 0.08,
          spherical.phi + ({ ArrowUp: -0.12, ArrowDown: 0.12 }[e.key] || 0),
        ),
      );
      camera.position
        .copy(controls.target)
        .add(new THREE.Vector3().setFromSpherical(spherical));
      animation = null;
      invalidate();
    }
  });
  function zoom(factor) {
    const offset = camera.position.clone().sub(controls.target);
    offset.multiplyScalar(factor);
    offset.clampLength(controls.minDistance, controls.maxDistance);
    camera.position.copy(controls.target).add(offset);
    animation = null;
    invalidate();
  }
  function positions() {
    const list =
      active === "sky"
        ? fieldPoints
        : active === "solar"
          ? new Map(
              bodies
                .filter((b) => objects.has(b.id))
                .map((b) => [b.id, objects.get(b.id)]),
            )
          : new Map();
    return [...list].map(([id, o]) => {
      const p = o.getWorldPosition(new THREE.Vector3()).project(camera);
      return {
        id,
        x: (p.x + 1) / 2,
        y: (1 - p.y) / 2,
        visible:
          p.z > -1 && p.z < 1 && Math.abs(p.x) < 0.94 && Math.abs(p.y) < 0.88,
      };
    });
  }
  function setEffects(value) {
    stars.visible = value;
    invalidate();
  }
  setEffects(preferences.effects);
  reset();
  return {
    setScene(name) {
      if (!["observatory", "solar", "sky"].includes(name)) return;
      active = name;
      metrics.scene = name;
      modelGroup.visible = name === "observatory";
      solarGroup.visible = name === "solar";
      skyGroup.visible = name === "sky";
      ambient.intensity = name === "solar" ? 0.15 : 0.65;
      scene.environmentIntensity = name === "solar" ? 0.15 : 0.55;
      if (name === "solar") loadSolar();
      reset();
    },
    async showHardware(id) {
      currentHardware = id;
      const seq = ++modelSequence;
      modelGroup.visible = false;
      onStatus(
        id === "spherex"
          ? "SPHEREx educational model"
          : "Loading verified NASA 3D model…",
      );
      try {
        let object = id === "spherex" ? spherex : await model(id);
        if (seq !== modelSequence) return;
        modelGroup.clear();
        modelGroup.add(object);
        modelGroup.visible = active === "observatory";
        object.scale.multiplyScalar(id === "spherex" ? 1 : 2);
        objects.set(id, object);
        if (active === "observatory") reset();
        onStatus("Interactive model ready");
      } catch (e) {
        if (seq === modelSequence)
          onStatus(
            "Model unavailable: " +
              e.message +
              ". Select another model or retry.",
            "error",
          );
      }
    },
    focus(id) {
      if (active === "sky" && fieldPoints.has(id)) {
        const p = fieldPoints.get(id).position;
        travel(p.clone().multiplyScalar(2.15).toArray(), [0, 0, 0]);
      } else if (active === "solar" && objects.has(id)) {
        const object = objects.get(id),
          r = bodies.find((b) => b.id === id).radius,
          p = object.position;
        controls.minDistance = Math.max(0.5, r * 1.7);
        travel([p.x + r * 3, p.y + r * 1.9, p.z + r * 4], p.toArray());
      }
    },
    highlight(component) {
      modelGroup.traverse((o) => {
        if (o.isMesh) {
          for (const m of Array.isArray(o.material) ? o.material : [o.material])
            if (m.emissive)
              m.emissive.set(
                o.userData.component === component ? 0x273f48 : 0x000000,
              );
        }
      });
      invalidate();
    },
    zoom,
    reset,
    positions,
    setEffects,
    setPaused(value) {
      paused = value;
      if (value) {
        animation = null;
        if (frame) cancelAnimationFrame(frame);
        frame = 0;
      } else invalidate();
    },
    diagnostics() {
      return {
        ...metrics,
        render_ms: [...metrics.render_ms],
        camera: camera.position.toArray(),
        target: controls.target.toArray(),
        active_hardware: currentHardware,
      };
    },
    dispose() {
      paused = true;
      lifetime.abort();
      if (frame) cancelAnimationFrame(frame);
      observer.disconnect();
      controls.dispose();
      draco.dispose();
      scene.traverse((o) => {
        o.geometry?.dispose();
        if (o.material)
          for (const m of Array.isArray(o.material) ? o.material : [o.material])
            m.dispose();
      });
      environment.dispose();
      pmrem.dispose();
      renderer.dispose();
    },
  };
}
