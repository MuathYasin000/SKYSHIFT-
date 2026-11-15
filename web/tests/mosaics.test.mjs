import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {validateMosaicManifest,decodeMosaicPlane,createMosaicLoader} from '../dist/mosaic-data.js';
import {validateSequence} from '../dist/sequence-records.js';
const manifest=JSON.parse(await fs.readFile(new URL('../dist/data/mosaics/m101-v1/manifest.json',import.meta.url)));
const path=c=>new URL('../dist/'+c.url.slice(2),import.meta.url);
test('All 102 real mosaic planes preserve explicit wavelength, source and conservative masks',async()=>{
 validateMosaicManifest(manifest);
 for(const [i,c] of manifest.channels.entries()){
  const result=await decodeMosaicPlane(new Uint8Array(await fs.readFile(path(c))),manifest,i);
  assert.equal(result.payload.channel.plane,i+1);assert.equal(result.arrays.SCI.length,267*267);
 }
 await assert.rejects(validateSequence(manifest),/Unsupported/);
});
test('Corrupt mosaic bytes and a temporal identity are refused',async()=>{
 const bytes=new Uint8Array(await fs.readFile(path(manifest.channels[62])));bytes[100]^=1;
 await assert.rejects(decodeMosaicPlane(bytes,manifest,62),/checksum/);
 assert.throws(()=>validateMosaicManifest({...manifest,temporal_comparison_allowed:true}),/identity/);
 const bad=structuredClone(manifest);bad.channels[1].wavelength_um=bad.channels[0].wavelength_um;assert.throws(()=>validateMosaicManifest(bad),/wavelength/);
});
test('Mosaic decoded cache is bounded and failed transfers remain retryable',async()=>{
 let calls=0;const loader=createMosaicLoader(async url=>{calls++;const c=manifest.channels.find(c=>c.url===url);return new Response(await fs.readFile(path(c)));});
 for(let i=0;i<8;i++)await loader.load(manifest,i);
 assert.equal(loader.size(),6);await loader.load(manifest,7);assert.equal(calls,8);await loader.load(manifest,0);assert.equal(calls,9);
 let attempt=0;const retry=createMosaicLoader(async()=>++attempt===1?new Response('',{status:503}):new Response(await fs.readFile(path(manifest.channels[62]))));
 await assert.rejects(retry.load(manifest,62),/unavailable/);await retry.load(manifest,62);assert.equal(attempt,2);
});
test('Additional gallery regions retain published-image identity and credit without pixel astrometry',async()=>{
 const catalog=JSON.parse(await fs.readFile(new URL('../dist/data/sky-products.json',import.meta.url)));
 for(const id of ['cygnus','ngc1760']){const item=catalog.entries.find(e=>e.id===id);assert.equal(item.kind,'published_image');assert.equal(item.pixel_astrometry,'NOT_VALIDATED');assert.equal(item.temporal_comparison_allowed,false);assert.match(item.credit,/NASA/);assert.match(item.usage_policy,/spherex.caltech.edu/);}
});
