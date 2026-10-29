import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {zipSync,strToU8} from '../dist/vendor/fflate.js';
import {safeName,inspectZipBounds,openComparison,equalEvidence} from '../dist/packets.js';
import {decodeArray,sha256} from '../dist/science.js';

const bundle=JSON.parse(fs.readFileSync(new URL('../dist/data/bundle.json',import.meta.url)));
const baseline=bundle.manifest,common=decodeArray(bundle.arrays.COMMON);
async function packet(manifest=baseline,changes={}){
  const payload={'manifest.json':strToU8(JSON.stringify(manifest)),[baseline.prepared_files[0].path]:new Uint8Array(fs.readFileSync(new URL('../dist/data/pair.fits',import.meta.url))),...changes};
  const hashes={};for(const [name,data]of Object.entries(payload))hashes[name]=await sha256(data);
  payload['hashes.json']=strToU8(JSON.stringify(hashes));return zipSync(payload);
}
test('curated scientific product and settings round trip',async()=>{const result=await openComparison(await packet(),baseline,common);assert.equal(result.display.zoom,1);assert.deepEqual(result.annotations,[]);});
test('metadata equality is independent of JSON key order',()=>assert.ok(equalEvidence({a:1,b:{x:2,y:3}},{b:{y:3,x:2},a:1})));
test('forged scientific approval is rejected even with new hashes',async()=>{const m=structuredClone(baseline);m.processing.scientific_approval='APPROVED';await assert.rejects(openComparison(await packet(m),baseline,common),/Scientific metadata/);});
for(const key of ['citations','created_at','app_version'])test('immutable '+key+' cannot be rewritten with self-consistent hashes',async()=>{const m=structuredClone(baseline);m[key]=key==='citations'?[]:'forged';await assert.rejects(openComparison(await packet(m),baseline,common),/Scientific metadata/);});
test('duplicate annotation records must agree with manifest',async()=>{await assert.rejects(openComparison(await packet(baseline,{'annotations.json':strToU8('[{}]')}),baseline,common),/Annotation records disagree/);});
test('self-consistent but forged diagnostics are rejected against current trusted evidence',async()=>{await assert.rejects(openComparison(await packet(baseline,{'diagnostics/registration.json':strToU8('{}')}),baseline,common,bundle),/Scientific diagnostics differ/);});
test('changed prepared bytes are rejected even with self-consistent archive hashes',async()=>{await assert.rejects(openComparison(await packet(baseline,{[baseline.prepared_files[0].path]:strToU8('forged')}),baseline,common),/Prepared scientific product/);});
test('tampered evidence hash fails before import',async()=>{const bytes=zipSync({'manifest.json':strToU8('{}'),'hashes.json':strToU8('{"manifest.json":"bad"}')});await assert.rejects(openComparison(bytes,baseline,common),/checksum/);});
for(const name of ['../a','C:/a','a\\b','a/./b','a//b','NUL','dir/con.txt','a.','a '])test('reject unsafe path '+name,()=>assert.throws(()=>safeName(name),/Unsafe/));
test('multi-disk ZIP is rejected before decompression',async()=>{const bytes=await packet();const end=bytes.length-22;new DataView(bytes.buffer).setUint16(end+4,1,true);assert.throws(()=>inspectZipBounds(bytes),/Unsupported/);});
test('misreported ZIP size is rejected before allocation',async()=>{const bytes=await packet(),v=new DataView(bytes.buffer),start=v.getUint32(bytes.length-6,true);v.setUint32(start+24,150000001,true);assert.throws(()=>inspectZipBounds(bytes),/decompressed size/);});
