import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import crypto from "node:crypto";
import { telescopeStories } from "../dist/telescope-stories.js";
import { createObservationEffects } from "../dist/observation-effects.js";
import {
  PerspectiveCamera,
  Vector3,
} from "../dist/vendor/three/three.module.js";

test("mission stories identify different published targets and never simulate measured filters", async () => {
  assert.deepEqual(Object.keys(telescopeStories), [
    "spherex",
    "webb-b",
    "hubble",
  ]);
  const manifest = JSON.parse(
    await fs.readFile(new URL("../dist/assets/assets.json", import.meta.url)),
  );
  for (const story of Object.values(telescopeStories)) {
    const asset = manifest.assets.find((a) => a.id === story.imageId);
    assert.ok(asset);
    const bytes = await fs.readFile(
      new URL("../dist/assets/" + asset.file, import.meta.url),
    );
    assert.equal(
      crypto.createHash("sha256").update(bytes).digest("hex"),
      asset.sha256,
    );
    assert.equal(asset.is_skyshift_comparison_evidence, false);
    assert.match(
      story.source,
      /^https:\/\/(www\.jpl\.nasa\.gov|science\.nasa\.gov)\//,
    );
  }
  assert.match(telescopeStories.spherex.steps[1][1], /not a prism/);
  assert.match(telescopeStories["webb-b"].steps[2][1], /not a live feed/);
  assert.match(
    telescopeStories.hubble.steps[2][1],
    /not an aligned temporal comparison/,
  );
});
test("visible light diagrams respond to channel selection and stop animating when disabled or reduced", () => {
  const effect = createObservationEffects(),
    camera = new PerspectiveCamera(),
    frame = {
      origin: new Vector3(),
      outward: new Vector3(0, 1, 0),
      radius: 0.1,
      length: 3,
    };
  effect.configure(frame, "#8cd9db", 1, 3);
  assert.equal(effect.update(500, camera), true);
  assert.equal(effect.diagnostics().channel, 3);
  effect.setEnabled(false);
  assert.equal(effect.update(500, camera), false);
  effect.setEnabled(true);
  effect.setMotion(false);
  assert.equal(effect.update(500, camera), false);
  effect.setMotion(true);
  effect.configure(
    { ...frame, outward: new Vector3(0, 0, 1) },
    "#fff",
    0,
    -1,
    "webb-b",
  );
  assert.equal(
    effect.diagnostics().external_geometry,
    "parallel rays toward model aperture; no FOV cone",
  );
  effect.setImage({
    src: "synthetic-image-fixture",
    naturalWidth: 1600,
    naturalHeight: 800,
  });
  effect.configure(frame, "#fff", 2);
  assert.equal(effect.update(500, camera), false);
  assert.equal(effect.diagnostics().published_image_visible, false);
  assert.match(effect.diagnostics().published_image_location, /2D panel only/);
  effect.clearImage();
  effect.update(500, camera);
  assert.equal(effect.diagnostics().published_image_visible, false);
  effect.close();
  assert.equal(effect.diagnostics().open, false);
  effect.dispose();
});
