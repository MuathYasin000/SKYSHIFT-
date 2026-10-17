import test from "node:test";
import assert from "node:assert/strict";
import { pixelGuideGeometry } from "../dist/ui-theme.js";
test("pixel guide maps prepared cell boundaries and coordinates without changing measured data", () => {
  const display = { center_x: 11.5, center_y: 11.5 },
    g = { width: 480, height: 480, scale: 20 };
  const result = pixelGuideGeometry(g, display, [24, 24], { x: 12.1, y: 12.2 });
  assert.equal(result.x, 12);
  assert.equal(result.y, 12);
  assert.equal(result.cx, 250);
  assert.equal(result.cy, 230);
  assert.equal(result.vertical.length, 25);
  assert.equal(result.horizontal.length, 25);
  assert.equal(result.vertical[0], 0);
  assert.equal(result.vertical.at(-1), 480);
  assert.equal(
    pixelGuideGeometry(g, display, [24, 24], { x: 24, y: 12 }),
    null,
  );
  assert.equal(
    pixelGuideGeometry({ ...g, scale: 0 }, display, [24, 24], { x: 0, y: 0 }),
    null,
  );
});
