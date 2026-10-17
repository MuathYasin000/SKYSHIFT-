import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { createHash } from "node:crypto";
const root = new URL("../dist/assets/", import.meta.url),
  hash = (b) => createHash("sha256").update(b).digest("hex");

test("active interface WOFF2 fonts and licenses match the exact local manifest", async()=>{
 const m=JSON.parse(await fs.readFile(new URL('fonts/mission-fonts.json',root),'utf8'));
 for(const a of m.assets){const bytes=await fs.readFile(new URL('fonts/'+a.file,root));assert.equal(hash(bytes),a.sha256);assert.equal(bytes.length,a.bytes);assert.equal(a.license,'SIL Open Font License 1.1');await fs.access(new URL('fonts/'+a.license_file,root));if(a.file.endsWith('.woff2'))assert.equal(bytes.toString('ascii',0,4),'wOF2');}
});
test("retired interface payloads are absent from the shipped build",async()=>{
 for(const name of ['LOGO2.PNG','SKYSHIFT_ICON.PNG','seeing-invisible.png','fonts/Manrope.ttf','fonts/SourceSans3.ttf','fonts/Outfit.ttf','fonts/SpaceGrotesk.ttf','fonts/IBMPlexMono-Regular.ttf'])await assert.rejects(fs.access(new URL(name,root)));
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
