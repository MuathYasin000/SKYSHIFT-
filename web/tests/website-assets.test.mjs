import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { createHash } from "node:crypto";
const root = new URL("../dist/assets/", import.meta.url),
  hash = (b) => createHash("sha256").update(b).digest("hex");

test("observatory mono font and OFL notice retain their recorded original bytes", async () => {
  const manifest = JSON.parse(
    await fs.readFile(new URL("fonts/observatory-fonts.json", root), "utf8"),
  );
  for (const a of manifest.assets) {
    const bytes = await fs.readFile(new URL("fonts/" + a.file, root));
    assert.equal(hash(bytes), a.sha256);
    assert.equal(bytes.length, a.bytes);
    assert.equal(a.license, "SIL Open Font License 1.1");
    assert.match(
      a.source,
      /^https:\/\/raw.githubusercontent.com\/google\/fonts\//,
    );
  }
});
test("new website fonts retain exact pinned upstream bytes and OFL notices locally", async () => {
  const manifest = JSON.parse(
    await fs.readFile(new URL("fonts/website-fonts.json", root), "utf8"),
  );
  assert.equal(
    manifest.source_commit,
    "47d54ca1ebb14fd864695f1d39dc734f39017c33",
  );
  for (const font of manifest.assets) {
    const bytes = await fs.readFile(new URL("fonts/" + font.file, root)),
      license = await fs.readFile(new URL("fonts/" + font.license_file, root));
    assert.equal(bytes.length, font.bytes);
    assert.equal(hash(bytes), font.sha256);
    assert.equal(bytes.readUInt32BE(0), 0x00010000);
    assert.equal(hash(license), font.license_sha256);
    assert.match(license.toString(), /SIL OPEN FONT LICENSE Version 1.1/);
    assert.match(font.source_url, new RegExp(manifest.source_commit));
  }
});
test("homepage NASA composite retains original context identity and resolution", async () => {
  const manifest = JSON.parse(
      await fs.readFile(new URL("assets.json", root), "utf8"),
    ),
    asset = manifest.assets.find((x) => x.id === "spherex-vela"),
    bytes = await fs.readFile(new URL(asset.file, root));
  assert.equal(hash(bytes), asset.sha256);
  assert.equal(asset.category, "official_observed_infrared_composite");
  assert.equal(asset.is_skyshift_comparison_evidence, false);
  assert.deepEqual(asset.dimensions, [2400, 1187]);
  assert.deepEqual(asset.infrared_color_mapping_microns, {
    red: [4.54, 4.65],
    green: [2.83, 3.2],
    blue: [0.74, 0.88],
  });
});
