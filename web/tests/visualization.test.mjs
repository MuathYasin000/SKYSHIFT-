import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {defaultVisualization as defaults,validateVisualization,displayLevel,paletteRGB} from '../dist/visualization.js';
import {openComparison} from '../dist/packets.js';
import {decodeArray,sha256,validateDisplay} from '../dist/science.js';
import {zipSync,strToU8,strFromU8} from '../dist/vendor/fflate.js';

test('all stretches have exact display endpoints, monotonic output and retain input values',()=>{
  const d={vmin:-.3,vmax:.7,asinh_a:.06},data=Float32Array.from([-.3,0,.2,.7]);const before=data.slice();
  for(const stretch of ['linear','asinh','log']){const v={...defaults,stretch};assert.equal(displayLevel(-1,d,v),0);assert.equal(displayLevel(1,d,v),255);let last=-1;for(let i=0;i<1000;i++){const x=displayLevel(-.3+i/999,d,v);assert.ok(x>=last&&x>=0&&x<=255);last=x;}for(const x of data)assert.ok(Number.isFinite(displayLevel(x,d,v)));}
  assert.deepEqual(data,before);assert.equal(displayLevel(NaN,d,defaults),0);
});
test('single-band palettes are bounded and have consistent dark/light endpoints',()=>{for(const palette of ['grayscale','ember','ice']){assert.deepEqual(paletteRGB(0,palette),[0,0,0]);assert.deepEqual(paletteRGB(255,palette),[255,255,255]);for(let i=0;i<256;i++)for(const c of paletteRGB(i,palette))assert.ok(Number.isInteger(c)&&c>=0&&c<=255);}});
test('visualization schema rejects unknown, malformed or unsupported settings',()=>{assert.deepEqual(validateVisualization(),defaults);for(const bad of [{...defaults,palette:'NASA optical'},{...defaults,stretch:'gamma'},{...defaults,wipe_position:NaN},{...defaults,wipe_position:101},{...defaults,wipe:'true'},{...defaults,interpolation:'AI'},{...defaults,extra:'payload'},{schema_version:'1.0'},null])assert.throws(()=>validateVisualization(bad));});
test('real saved evidence retains visualization extension and rejects corrupted extension',async()=>{
  const bundle=JSON.parse(await readFile(new URL('../dist/data/bundle.json',import.meta.url))),m=bundle.manifest,common=decodeArray(bundle.arrays.COMMON);
  const visual={...defaults,stretch:'log',palette:'ember',wipe:true,wipe_position:37,interpolation:'nearest'};
  const files={'manifest.json':strToU8(JSON.stringify(m)),'prepared/pair.fits':new Uint8Array(await readFile(new URL('../dist/data/pair.fits',import.meta.url))),'visualization.json':strToU8(JSON.stringify(visual))};
  async function packet(){files['hashes.json']=strToU8(JSON.stringify(Object.fromEntries(await Promise.all(Object.entries(files).filter(([k])=>k!=='hashes.json').map(async([k,v])=>[k,await sha256(v)])))));return zipSync(files);}
  const saved=await openComparison(await packet(),m,common);assert.deepEqual(saved.visualization,visual);assert.deepEqual(saved.display,validateDisplay(m.display,m));
  files['visualization.json']=strToU8(JSON.stringify({...visual,palette:'untrusted'}));
  const packetBytes=await packet();await assert.rejects(()=>openComparison(packetBytes,m,common),/visualization/);
});
test('all curated context payloads and array hashes verify; none offers wider temporal comparison',async()=>{
  const catalog=JSON.parse(await readFile(new URL('../dist/data/explore-catalog.json',import.meta.url)));assert.equal(catalog.fields.length,4);assert.equal(catalog.fields.reduce((n,f)=>n+f.observations.length,0),5);
  for(const f of catalog.fields){assert.ok(['provisional_restricted','incompatible_tested_pairs','unavailable'].includes(f.comparison_status));for(const o of f.observations){const bytes=new Uint8Array(await readFile(new URL('../dist/'+o.url.replace('./',''),import.meta.url)));assert.equal(await sha256(bytes),o.sha256);const p=JSON.parse(strFromU8(bytes));assert.equal(p.dataset_kind,'real');assert.equal(p.usage,'single_observation_only');assert.equal(p.scientific_approval,'PENDING');assert.ok(p.shape[0]>24);for(const [name,entry] of Object.entries(p.arrays)){const a=decodeArray(entry);const hash=await sha256(new Uint8Array(a.buffer));assert.equal(hash,entry.numeric_sha256,name+' hash');}assert.match(p.observation.source.source_url,/^https:\/\/irsa.ipac.caltech.edu\//);assert.equal(p.observation.source.sha256.length,64);}}});
