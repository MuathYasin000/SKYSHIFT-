import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {defaultVisualization} from '../dist/visualization.js';
import {createExposureRecord,parseExposureRecord,resolveExposureRecord,validateExposureRecord,MAX_VIEW_RECORD_BYTES} from '../dist/exposure-records.js';
import {createExposureLoader} from '../dist/exposure-loader.js';
import {sha256} from '../dist/science.js';

const catalog=JSON.parse(await readFile(new URL('../dist/data/explore-catalog.json',import.meta.url)));
const field=catalog.fields[0],entry=field.observations[1];
const bytes=new Uint8Array(await readFile(new URL('../dist/'+entry.url.slice(2),import.meta.url)));
const product=JSON.parse(new TextDecoder().decode(bytes));
const view={visualization:{...defaultVisualization,palette:'ember',stretch:'log',interpolation:'nearest'},contrast:1.35,viewport:{zoom:2.5,center_x:67.5,center_y:80.25}};
const saved=()=>createExposureRecord(field,entry,product,view);
const response=b=>({ok:true,arrayBuffer:async()=>b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength)});

test('existing 1.0 exposure record restores exact identity, viewport and supported appearance',()=>{
  const record=parseExposureRecord(new TextEncoder().encode(JSON.stringify(saved())));
  assert.deepEqual(resolveExposureRecord(record,catalog),{field,entry,index:1});
  const restored=validateExposureRecord(record,field,entry,product);
  assert.deepEqual(restored.viewport,view.viewport);assert.deepEqual(restored.visualization,view.visualization);
  assert.ok(Math.abs(restored.contrast-view.contrast)<1e-12);
  assert.equal(record.scientific_approval,'PENDING');
});

test('verbatim 0.4 browser-export fixture remains compatible without needing ignored output files',async()=>{
  const raw=new Uint8Array(await readFile(new URL('./fixtures/single-view-0.4.json',import.meta.url)));
  const record=parseExposureRecord(raw),resolved=resolveExposureRecord(record,catalog);
  assert.equal(resolved.entry,entry);assert.equal(validateExposureRecord(record,field,entry,product).viewport.zoom,1.25);
});

test('unknown fields, remote URLs, mismatched hashes and counterfeit approval are rejected',()=>{
  for(const patch of [{field:'unavailable'},{product_url:'https://example.com/injected.json'},{product_sha256:'0'.repeat(64)},{scientific_approval:'APPROVED'},{record_kind:'comparison'},{extra:'payload'}]){
    assert.throws(()=>resolveExposureRecord({...saved(),...patch},catalog));
  }
});

test('every recorded scientific metadata group must match the trusted product',()=>{
  for(const key of ['observation','region','wcs','native_shape','prepared_shape','processing','array_hashes','limitations']){
    const r=saved();r[key]={modified:true};
    assert.throws(()=>validateExposureRecord(r,field,entry,product),undefined,key);
  }
  // Scientific values cannot be smuggled in through a record with otherwise correct references.
  assert.throws(()=>resolveExposureRecord({...saved(),arrays:product.arrays},catalog));
});

test('invalid or out-of-bounds display settings never silently clamp into an accepted view',()=>{
  for(const patch of [{zoom:21},{zoom:NaN},{center_x:-.1},{center_y:product.shape[0]},{center_x:'10'},{extra:1}]){
    const r=saved();r.viewport={...r.viewport,...patch};assert.throws(()=>validateExposureRecord(r,field,entry,product));
  }
  for(const patch of [{vmin:-1},{vmax:Infinity},{vmax:product.display.vmin},{vmax:product.display.vmax*100},{asinh_a:.5},{extra:1}]){
    const r=saved();r.display={...r.display,...patch};assert.throws(()=>validateExposureRecord(r,field,entry,product));
  }
  for(const patch of [{palette:'AI detail'},{wipe:true},{wipe_position:22},{stretch:'invalid'}]){
    const r=saved();r.visualization={...r.visualization,...patch};assert.throws(()=>validateExposureRecord(r,field,entry,product));
  }
});

test('small-file bounds, malformed UTF-8, non-JSON and wrong record versions fail clearly',()=>{
  for(const input of [new Uint8Array(),new Uint8Array(MAX_VIEW_RECORD_BYTES+1),new Uint8Array([255]),new TextEncoder().encode('not JSON'),new TextEncoder().encode('null'),new TextEncoder().encode(JSON.stringify({...saved(),schema_version:'9'}))])assert.throws(()=>parseExposureRecord(input));
});

test('all curated real exposures can export and validate without altering numeric source bytes',async()=>{
  for(const f of catalog.fields)for(const e of f.observations){
    const raw=await readFile(new URL('../dist/'+e.url.slice(2),import.meta.url)),p=JSON.parse(raw);
    const before=JSON.stringify(p.arrays),r=createExposureRecord(f,e,p,{visualization:defaultVisualization,contrast:.5,viewport:{zoom:1,center_x:(p.shape[1]-1)/2,center_y:(p.shape[0]-1)/2}});
    validateExposureRecord(r,f,e,p);assert.equal(JSON.stringify(p.arrays),before);assert.equal(await sha256(raw),e.sha256);
  }
});

test('verified loader deduplicates concurrent fetches and decodes, then reuses the result',async()=>{
  let calls=0;const load=createExposureLoader(async()=>{calls++;return response(bytes);});
  const [a,b]=await Promise.all([load(entry),load(entry)]);
  assert.equal(calls,1);assert.equal(a,b);assert.equal(await load(entry),a);
  assert.equal(a.arrays.SCI.length,product.shape[0]*product.shape[1]);
});

test('a checksum failure is not cached and retry genuinely loads verified bytes',async()=>{
  let calls=0;const load=createExposureLoader(async()=>response(++calls===1?new Uint8Array([1,2,3]):bytes));
  await assert.rejects(load(entry),/checksum/);const result=await load(entry);
  assert.equal(calls,2);assert.equal(result.product.observation.observation_id,entry.observation_id);
});
test('stalled exposure requests time out clearly and do not poison retry',async()=>{
  let calls=0;const load=createExposureLoader((url,{signal})=>++calls===1?new Promise((resolve,reject)=>signal.addEventListener('abort',()=>reject(new Error('aborted')))):Promise.resolve(response(bytes)),4,5);
  await assert.rejects(load(entry),/taking too long/);assert.equal((await load(entry)).product.observation.observation_id,entry.observation_id);
});

test('LRU exposure cache stays bounded and rejects remote sources before any fetch',async()=>{
  let calls=0;const entries=field.observations,raw=await Promise.all(entries.map(async e=>new Uint8Array(await readFile(new URL('../dist/'+e.url.slice(2),import.meta.url)))));
  const load=createExposureLoader(async url=>{calls++;return response(raw[entries.findIndex(e=>e.url===url)]);},1);
  await load(entries[0]);await load(entries[1]);await load(entries[0]);assert.equal(calls,3);
  await assert.rejects(load({...entry,url:'https://example.com/data.json'}),/verified local/);assert.equal(calls,3);
});

test('a matching file hash cannot override catalogue date, identity or two-dimensional geometry',async()=>{
  const load=createExposureLoader(async()=>response(bytes));
  await load(entry);
  await assert.rejects(load({...entry,observation_id:'wrong'}),/identity/);
  await load(entry);
  await assert.rejects(load({...entry,time_start_utc:'2026-01-01Z'}),/identity/);
  await load(entry);
  await assert.rejects(load({...entry,shape:[1,product.shape[0]*product.shape[1]]}),/shapes/);
});
