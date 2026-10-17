import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import {
  CHANNEL_COUNT,
  channelColor,
  placeLabels,
  overlaps,
} from "../dist/infrared-layout.js";
test("102-channel interface motif is bounded and stable, not a spectral calibration", () => {
  assert.equal(CHANNEL_COUNT, 102);
  const colors = Array.from({ length: CHANNEL_COUNT }, (_, i) =>
    channelColor(i),
  );
  assert.equal(new Set(colors).size, 102);
  assert.equal(channelColor(-1), colors[0]);
  assert.equal(channelColor(500), colors.at(-1));
  assert.match(colors[0], /^rgb\(28,60,139\)$/);
});
test("optional vendored animation libraries retain pinned identities and local license notices", async () => {
  const base = new URL("../dist/vendor/scroll/", import.meta.url),
    manifest = JSON.parse(
      await readFile(new URL("manifest.json", base), "utf8"),
    );
  for (const library of manifest.libraries) {
    const bytes = await readFile(new URL(library.file, base));
    assert.equal(
      createHash("sha256").update(bytes).digest("hex"),
      library.sha256,
    );
    assert.equal(bytes.length, library.bytes);
    const notice = await readFile(new URL(library.notice, base), "utf8");
    assert.ok(notice.length > 200);
    assert.ok(["MIT", "GSAP Standard License"].includes(library.license));
  }
});
test("overlapping Sun/Mercury and Earth/Moon labels occupy distinct screen regions", () => {
  const p = placeLabels(
    ["sun", "mercury", "earth", "moon"].map((id, i) => ({
      id,
      x: 400 + i,
      y: 300,
      width: 90,
      height: 30,
      distance: 100,
      visible: true,
      selected: id === "sun",
    })),
    [],
    1000,
    700,
  );
  assert.equal(p.filter((p) => !p.hidden).length, 4);
  const rect = (p) => ({
    left: p.left,
    right: p.left + p.width,
    top: p.top,
    bottom: p.top + p.height,
  });
  for (let i = 0; i < p.length; i++)
    for (let j = i + 1; j < p.length; j++)
      assert.equal(overlaps(rect(p[i]), rect(p[j])), false);
});
test("labels avoid panels, hide when no room remains, and prioritise selection", () => {
  const item = {
    x: 400,
    y: 300,
    width: 90,
    height: 30,
    distance: 100,
    visible: true,
  };
  const result = placeLabels(
    [
      { ...item, id: "a" },
      { ...item, id: "b", selected: true },
    ],
    [{ left: 0, right: 1000, top: 0, bottom: 700 }],
    1000,
    700,
  );
  assert.equal(result[0].id, "b");
  assert.ok(result.every((p) => p.hidden));
  assert.equal(
    placeLabels([{ ...item, id: "outside", visible: false }], [], 1000, 700)[0]
      .hidden,
    true,
  );
});
