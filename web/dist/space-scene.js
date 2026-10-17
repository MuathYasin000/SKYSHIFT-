import * as THREE from "./vendor/three/three.module.js";
import { OrbitControls } from "./vendor/three/OrbitControls.js";
import { GLTFLoader } from "./vendor/three/GLTFLoader.js";
import { DRACOLoader } from "./vendor/three/DRACOLoader.js";
import { RoomEnvironment } from "./vendor/three/RoomEnvironment.js";
import { bodies, fieldVector, bodyPosition } from "./space-content.js";
import { createSPHEREx } from "./spherex-model.js";
import { telescopeStories } from "./telescope-stories.js";
import { createObservationEffects } from "./observation-effects.js";
import {
  createInfraredBackdrop,
  createEarthAtmosphere,
} from "./space-atmosphere.js";

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
  renderer.setClearColor(0x000000);
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
  const ambient = new THREE.HemisphereLight(0xf1eddf, 0x252220, 0.65);
  scene.add(ambient);
  const key = new THREE.DirectionalLight(0xffedd4, 2.5);
  key.position.set(6, 8, 10);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xd3e4f4, 0.65);
  rim.position.set(-6, 2, -4);
  scene.add(rim);
  const modelGroup = new THREE.Group(),
    solarGroup = new THREE.Group(),
    skyGroup = new THREE.Group();
  scene.add(modelGroup, solarGroup, skyGroup);
  const objects = new Map(),
    hardwareLoads = new Map(),
    fieldPoints = new Map(),
    cache = new Map();
  let active = "observatory",
    collection = false,
    currentHardware = "spherex",
    pendingFocus = null,
    modelSequence = 0,
    animation = null,
    frame = 0,
    paused = false,
    disposed = false,
    presentation = "overview",
    lost = false;
  const reduced = matchMedia("(prefers-reduced-motion:reduce)"),
    metrics = {
      frames: 0,
      render_ms: [],
      draw_calls: 0,
      triangles: 0,
      assets_loaded: [],
      textured_models: {},
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
      signal: AbortSignal.any([lifetime.signal, AbortSignal.timeout(20000)]),
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
          let mapped = 0,
            emissive = 0;
          root.traverse((o) => {
            if (o.isMesh)
              for (const m of Array.isArray(o.material)
                ? o.material
                : [o.material]) {
                if (m.map) mapped++;
                if (m.emissiveMap) emissive++;
              }
          });
          metrics.textured_models[id] = {
            base_color_maps: mapped,
            emissive_maps: emissive,
          };
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
      if (disposed) {
        texture.dispose();
        throw Error("Renderer disposed");
      }
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
  spherex.position.set(...telescopeStories.spherex.position);
  modelGroup.add(spherex);
  objects.set("spherex", spherex);
  const observing = createObservationEffects();
  scene.add(observing.root);
  observing.setEnabled(preferences.effects);
  observing.setMotion(!reduced.matches);
  let observingId = null,
    hoverId = null;
  const haloMaterial = new THREE.MeshBasicMaterial({
    color: 0x8cd9db,
    transparent: true,
    opacity: 0.22,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const telescopeHalos = new Map();
  for (const [id, story] of Object.entries(telescopeStories)) {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(2.35, 2.37, 128),
      haloMaterial.clone(),
    );
    ring.position.set(...story.position);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = -2.1;
    ring.material.color.set(story.color);
    modelGroup.add(ring);
    telescopeHalos.set(id, ring);
  }
  async function loadHardware(id) {
    if (objects.has(id)) return objects.get(id);
    if (!hardwareLoads.has(id))
      hardwareLoads.set(
        id,
        (async () => {
          const object = await model(id);
          if (disposed) return null;
          object.scale.multiplyScalar(2);
          object.position.set(...telescopeStories[id].position);
          object.traverse((o) => {
            if (o.isMesh) o.userData.id = id;
          });
          objects.set(id, object);
          object.visible = collection || id === "spherex";
          modelGroup.add(object);
          invalidate();
          canvas.dispatchEvent(new CustomEvent("space-frame"));
          return object;
        })().catch((e) => {
          hardwareLoads.delete(id);
          throw e;
        }),
      );
    return hardwareLoads.get(id);
  }
  async function loadObservatories() {
    if (!collection) return;
    const result = await Promise.allSettled(
      ["webb-b", "hubble"].map(loadHardware),
    );
    if (disposed || active !== "observatory") return;
    const missing = result
      .map((r, i) => (r.status === "rejected" ? ["webb-b", "hubble"][i] : null))
      .filter(Boolean);
    if (missing.length)
      onStatus(
        "Some telescopes could not load: " +
          missing.join(", ") +
          ". Select one to retry.",
        "error",
      );
    else
      onStatus(
        "Three observatories · select a telescope to discover how it sees",
      );
  }
  // Official Earth imagery in an explicitly schematic orbital context. No live
  // ephemerides, orbit scale, attitude or ground track are inferred here.
  const earthContext = new THREE.Group();
  modelGroup.add(earthContext);
  let contextEarthLoading = false;
  async function loadEarthContext() {
    if (contextEarthLoading) return;
    contextEarthLoading = true;
    try {
      const earth = await model("earth-natural");
      if (disposed) return;
      earth.scale.multiplyScalar(3.3);
      earth.position.set(-7, -4, -12);
      earthContext.add(earth);
      const atmosphere = createEarthAtmosphere(3.3);
      atmosphere.visible = preferences.effects;
      atmosphere.position.copy(earth.position);
      earthContext.add(atmosphere);
      const orbit = new THREE.LineLoop(
        new THREE.BufferGeometry().setFromPoints(
          Array.from({ length: 180 }, (_, i) => {
            const a = (i / 180) * Math.PI * 2;
            return new THREE.Vector3(
              -7 + 5.3 * Math.cos(a),
              -4 + 5.3 * Math.sin(a),
              -12,
            );
          }),
        ),
        new THREE.LineBasicMaterial({
          color: 0xb49b69,
          transparent: true,
          opacity: 0.22,
        }),
      );
      earthContext.add(orbit);
      invalidate();
    } catch (e) {
      contextEarthLoading = false;
      onStatus(
        "Earth context unavailable. SPHEREx and its scientific observations remain usable.",
      );
    }
  }
  // Noncatalogued procedural backdrop: aesthetic navigation context, never a measured star map.
  let seed = 401;
  const rand = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    },
    starPositions = [],
    colors = [];
  for (let i = 0; i < (preferences.quality === "low" ? 3500 : 10000); i++) {
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
      0.24 + Math.pow(rand(), 2) * 0.65,
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
  const starStamp = document.createElement("canvas");
  starStamp.width = starStamp.height = 32;
  const starContext = starStamp.getContext("2d"),
    glow = starContext.createRadialGradient(16, 16, 0, 16, 16, 16);
  glow.addColorStop(0, "#fff");
  glow.addColorStop(0.18, "#fff");
  glow.addColorStop(0.45, "#ffffff66");
  glow.addColorStop(1, "#ffffff00");
  starContext.fillStyle = glow;
  starContext.fillRect(0, 0, 32, 32);
  const starTexture = new THREE.CanvasTexture(starStamp);
  const stars = new THREE.Points(
    starGeometry,
    new THREE.PointsMaterial({
      size: 1.25,
      map: starTexture,
      sizeAttenuation: true,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  scene.add(stars);
  const infraredBackdrop = createInfraredBackdrop();
  scene.add(infraredBackdrop);
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
    if (active === "solar") onStatus("Loading NASA worlds…");
    solarPromise = Promise.allSettled(
      bodies.map(async (b) => {
        if (objects.has(b.id)) return;
        let object = b.model
          ? await model(b.model)
          : await textured(b.texture, b.radius);
        if (disposed) return;
        if (b.model) object.scale.multiplyScalar(b.radius);
        if (b.id === "sun")
          object.traverse((o) => {
            if (o.isMesh) {
              const material = o.material;
              // The NASA Sun asset carries its imagery in emissiveTexture,
              // with no base-color map. Replacing it with material.map erases
              // the authentic solar texture and produces a flat yellow disk.
              material.emissive = new THREE.Color(0xffffff);
              material.emissiveMap ||= material.map;
              material.emissiveIntensity = 1;
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
        if (b.id === "earth") {
          const atmosphere = createEarthAtmosphere(b.radius);
          atmosphere.visible = preferences.effects;
          atmosphere.position.copy(object.position);
          solarGroup.add(atmosphere);
        }
        if (active === "solar")
          onStatus(
            "Loading NASA worlds · " +
              bodies.filter((body) => objects.has(body.id)).length +
              " / " +
              bodies.length,
          );
        if (active === "solar" && pendingFocus === b.id) focus(b.id);
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
          const orbit = new THREE.Line(
            new THREE.BufferGeometry().setFromPoints(points),
            new THREE.LineBasicMaterial({
              color: b.id === "earth" ? 0x85c9cf : 0xc2a362,
              transparent: true,
              opacity: 0.48,
            }),
          );
          orbit.userData.orbit = b.id;
          solarGroup.add(orbit);
        }
        invalidate();
      }),
    ).then((results) => {
      if (disposed) return results;
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
      } else if (active === "solar")
        onStatus("NASA contextual assets loaded · schematic arrangement");
      return results;
    });
    return solarPromise;
  }
  function invalidate() {
    if (!frame && !paused && !lost && !disposed && !document.hidden)
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
    if (observing.update(now, camera)) invalidate();
    try {
      renderer.render(scene, camera);
    } catch (error) {
      lost = true;
      metrics.webgl = "error";
      onError(
        "3D rendering stopped: " +
          error.message +
          ". Classic View remains available.",
      );
      return;
    }
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
        fit = Math.max(
          1,
          (rect.width <= 740 ? 1.25 : 0.8) / (rect.width / rect.height || 1),
        );
      travel(
        collection
          ? [0, 6.5 * fit, 19 * fit]
          : [-4.7 * fit, 3.5 * fit, 8 * fit],
        [0, -0.2, -1.5],
      );
    } else if (active === "solar") travel([32, 48, 67], [0, 0, 0]);
    else travel([-45, 31, 60], [0, 0, 0]);
  }
  function resize() {
    const r = canvas.getBoundingClientRect();
    if (!r.width || !r.height) return;
    renderer.setSize(r.width, r.height, false);
    camera.aspect = r.width / r.height;
    // Reserve the lower touch HUD without shrinking the interactive canvas.
    // This is a presentation offset, not a change to celestial coordinates.
    if (r.width <= 740)
      camera.setViewOffset(
        r.width,
        r.height,
        0,
        r.height * (presentation === "explanation" ? 0.24 : 0.1),
        r.width,
        r.height,
      );
    else if (presentation !== "overview")
      camera.setViewOffset(
        r.width,
        r.height,
        r.width * (presentation === "lens" ? 0.3 : 0.12),
        0,
        r.width,
        r.height,
      );
    else camera.clearViewOffset();
    camera.updateProjectionMatrix();
    invalidate();
  }
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  listen(canvas, "webglcontextlost", (e) => {
    e.preventDefault();
    lost = true;
    metrics.webgl = "lost";
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    onError(
      "3D rendering was interrupted. Your notes and observations are preserved. Open observations without 3D, or retry the renderer.",
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
    observing.setMotion(!reduced.matches);
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
  function visiblePick(hit) {
    let object = hit.object;
    while (object) {
      if (!object.visible) return false;
      object = object.parent;
    }
    return hit.object.userData.id || hit.object.userData.component;
  }
  let down = null,
    gesture = false,
    moved = false;
  let lastHover = -Infinity;
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
    if (
      !pointers.size &&
      e.pointerType !== "touch" &&
      performance.now() - lastHover > 40
    ) {
      lastHover = performance.now();
      const rect = canvas.getBoundingClientRect();
      raycaster.setFromCamera(
        new THREE.Vector2(
          ((e.clientX - rect.left) / rect.width) * 2 - 1,
          (-(e.clientY - rect.top) / rect.height) * 2 + 1,
        ),
        camera,
      );
      const hit = raycaster
        .intersectObjects(
          (active === "observatory"
            ? modelGroup
            : active === "solar"
              ? solarGroup
              : skyGroup
          ).children,
          true,
        )
        .find(visiblePick);
      hoverId =
        hit?.object.userData.id ||
        (hit?.object.userData.component ? "spherex" : null);
      canvas.style.cursor = hit ? "pointer" : "grab";
      telescopeHalos.forEach(
        (ring, id) =>
          (ring.material.opacity =
            id === hoverId ? 0.6 : id === currentHardware ? 0.4 : 0.16),
      );
      invalidate();
    }
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
      .find(visiblePick);
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
  function focus(id) {
    pendingFocus = id;
    if (active === "solar")
      for (const line of solarGroup.children) {
        if (line.userData.orbit)
          line.material.color.set(
            line.userData.orbit === id ? 0x85c9cf : 0xc2a362,
          );
      }
    if (active === "observatory") {
      const position = new THREE.Vector3(
        ...(telescopeStories[id]?.position || [0, 0, 0]),
      );
      const fit = Math.max(1, 0.8 / camera.aspect);
      travel(
        position
          .clone()
          .add(new THREE.Vector3(-4.7 * fit, 3.5 * fit, 6 * fit))
          .toArray(),
        position
          .clone()
          .add(new THREE.Vector3(0, -0.2, 0))
          .toArray(),
      );
      observing.feedback(position, telescopeStories[id]?.color || "#8cd9db");
      return;
    }
    if (active === "sky" && fieldPoints.has(id)) {
      const p = fieldPoints.get(id).position;
      observing.feedback(p, "#8cd9db");
      travel(p.clone().multiplyScalar(2.15).toArray(), [0, 0, 0]);
    } else if (active === "solar" && objects.has(id)) {
      const object = objects.get(id),
        r = bodies.find((b) => b.id === id).radius,
        p = object.position,
        fit = Math.max(1, 0.9 / camera.aspect);
      observing.feedback(object.position, "#e7bb69");
      controls.minDistance = Math.max(0.5, r * 1.7);
      travel(
        [p.x + r * 3 * fit, p.y + r * 1.9 * fit, p.z + r * 4 * fit],
        p.toArray(),
      );
    } else if (active === "solar") {
      onStatus(
        "Loading selected destination… Your camera will travel when it is ready.",
      );
    }
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
          : new Map(
              Object.keys(telescopeStories)
                .filter((id) => objects.has(id))
                .map((id) => [id, objects.get(id)]),
            );
    return [...list].map(([id, o]) => {
      const world = o.getWorldPosition(new THREE.Vector3());
      if (active === "observatory") world.y -= 2.25;
      const distance = camera.position.distanceTo(world);
      const p = world.project(camera);
      return {
        id,
        distance,
        x: (p.x + 1) / 2,
        y: (1 - p.y) / 2,
        visible:
          o.visible &&
          p.z > -1 &&
          p.z < 1 &&
          Math.abs(p.x) < 0.94 &&
          Math.abs(p.y) < 0.88,
      };
    });
  }
  function setEffects(value) {
    scene.traverse((o) => {
      if (o.userData.illustrativeAtmosphere) o.visible = value;
    });
    stars.visible = value;
    infraredBackdrop.visible = value;
    observing.setEnabled(value);
    invalidate();
  }
  setEffects(preferences.effects);
  reset();
  return {
    setScene(name) {
      if (!["observatory", "solar", "sky"].includes(name)) return;
      active = name;
      observing.close();
      observingId = null;
      pendingFocus = null;
      metrics.scene = name;
      modelGroup.visible = name === "observatory";
      solarGroup.visible = name === "solar";
      skyGroup.visible = name === "sky";
      ambient.intensity = name === "solar" ? 0.25 : 0.65;
      scene.environmentIntensity = name === "solar" ? 0.3 : 0.55;
      if (name === "solar") loadSolar();
      if (name === "observatory") loadObservatories();
      if (name === "observatory" && !collection) loadEarthContext();
      reset();
    },
    setCollection(value) {
      collection = Boolean(value);
      for (const id of ["webb-b", "hubble"])
        if (objects.has(id)) objects.get(id).visible = collection;
      for (const [id, ring] of telescopeHalos)
        ring.visible = collection || id === "spherex";
      earthContext.visible = !collection;
      if (collection && active === "observatory") loadObservatories();
      else if (active === "observatory") loadEarthContext();
      invalidate();
    },
    captureView() {
      return {
        scene: active,
        position: camera.position.toArray(),
        target: controls.target.toArray(),
      };
    },
    restoreView(view) {
      if (
        view?.scene === active &&
        view.position?.length === 3 &&
        view.target?.length === 3
      )
        travel(view.position, view.target);
    },
    async showHardware(id, move = true) {
      currentHardware = id;
      const seq = ++modelSequence;
      onStatus(
        id === "spherex"
          ? "SPHEREx educational model"
          : "Loading verified NASA 3D model…",
      );
      try {
        let object = await loadHardware(id);
        if (disposed || seq !== modelSequence) return;
        if (active === "observatory" && move && observingId !== id) focus(id);
        telescopeHalos.forEach(
          (ring, key) => (ring.material.opacity = key === id ? 0.5 : 0.16),
        );
        onStatus("Interactive model ready");
      } catch (e) {
        if (!disposed && seq === modelSequence)
          onStatus(
            "Model unavailable: " +
              e.message +
              ". Select another model or retry.",
            "error",
          );
      }
    },
    observe(id, stage = 0, channel = -1) {
      if (!telescopeStories[id]) return;
      observingId = id;
      const position = new THREE.Vector3(...telescopeStories[id].position);
      observing.configure(
        position,
        telescopeStories[id].color,
        stage,
        channel,
        id,
      );
      observing.feedback(position, telescopeStories[id].color);
      if (stage === 0) {
        const fit = Math.max(
          1,
          (canvas.clientWidth <= 740 ? 1.35 : 0.8) / camera.aspect,
        );
        travel(
          position
            .clone()
            .add(new THREE.Vector3(7 * fit, 6 * fit, 12 * fit))
            .toArray(),
          position
            .clone()
            .add(new THREE.Vector3(0, 0.8, -1.7))
            .toArray(),
        );
      }
      invalidate();
    },
    closeObservation() {
      observing.close();
      observingId = null;
      invalidate();
    },
    setObservationImage(image) {
      observing.setImage(image);
      invalidate();
    },
    clearObservationImage() {
      observing.clearImage();
      invalidate();
    },
    focus,
    highlight(component) {
      spherex.traverse((o) => {
        if (o.isMesh) {
          for (const m of Array.isArray(o.material) ? o.material : [o.material])
            if (m.emissive)
              m.emissive.set(
                o.userData.component === component ? 0x273f48 : 0x000000,
              );
        }
      });
      observing.feedback(spherex.position, "#8cd9db");
      invalidate();
    },
    zoom,
    reset,
    setPresentation(value) {
      presentation = value;
      resize();
    },
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
        loaded_telescopes: Object.keys(telescopeStories).filter((id) =>
          objects.has(id),
        ),
        observing: observing.diagnostics(),
        hover_id: hoverId,
      };
    },
    dispose() {
      disposed = true;
      paused = true;
      lifetime.abort();
      if (frame) cancelAnimationFrame(frame);
      observer.disconnect();
      controls.dispose();
      draco.dispose();
      const geometries = new Set(),
        materials = new Set(),
        textures = new Set();
      function release(root) {
        root.traverse((o) => {
          if (o.geometry) geometries.add(o.geometry);
          if (o.material)
            for (const m of Array.isArray(o.material)
              ? o.material
              : [o.material]) {
              materials.add(m);
              for (const v of Object.values(m))
                if (v?.isTexture) textures.add(v);
            }
        });
        for (const geometry of geometries) geometry.dispose();
        for (const material of materials) material.dispose();
        for (const texture of textures) texture.dispose();
      }
      release(scene);
      for (const object of objects.values()) release(object);
      for (const pending of cache.values())
        pending.then(release).catch(() => {});
      environment.dispose();
      pmrem.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
}
