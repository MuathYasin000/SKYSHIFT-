import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {decodeNative,nativeRGBA,nativePixel} from '../dist/native-data.js';
import {validateSequence} from '../dist/sequence-records.js';
const catalog=JSON.parse(await fs.readFile(new URL('../dist/data/native/catalog.json',import.meta.url)));
const defaults={limits:'percentile',stretch:'asinh',asinh_a:.1,contrast:1,palette:'grayscale',mask:'overlay'};

test('every display combination preserves native arrays and never displays excluded science as valid',async()=>{
 for(const entry of catalog.entries){
  const p=JSON.parse(await fs.readFile(new URL('../dist/'+entry.url.replace('./',''),import.meta.url))),a=await decodeNative(p);
  const copies=Object.fromEntries(Object.entries(a).map(([k,v])=>[k,v.slice()]));
  for(const limits of ['percentile','zscale'])for(const stretch of ['asinh','linear','log'])for(const palette of ['grayscale','ember','ice'])for(const mask of ['overlay','excluded'])for(const contrast of [.25,1,4]){
   const {rgba,display}=nativeRGBA(p,a,{...defaults,limits,stretch,palette,mask,contrast});
   assert.ok(display.vmax>display.vmin);
   for(let i=0;i<a.VALID.length;i++)if(!a.VALID[i])assert.deepEqual(Array.from(rgba.slice(i*4,i*4+3)),mask==='overlay'?[67,23,75]:[24,24,24]);
  }
  for(const [k,v] of Object.entries(a))assert.deepEqual(v,copies[k]);
  await assert.rejects(()=>validateSequence(p));
  const i=a.VALID.findIndex(x=>!x),pixel=nativePixel(p,a,i%p.shape[1],Math.floor(i/p.shape[1]));assert.equal(pixel.valid,false);
  assert.match(nativePixel(p,a,-1,0).reason,/no coverage/);
 }
});

test('native decoder rejects changed source samples, wrong roles, shape, and invalid settings',async()=>{
 const e=catalog.entries[0],p=JSON.parse(await fs.readFile(new URL('../dist/'+e.url.replace('./',''),import.meta.url)));
 const bad=structuredClone(p);bad.arrays.SCI.data=(bad.arrays.SCI.data[0]==='A'?'B':'A')+bad.arrays.SCI.data.slice(1);await assert.rejects(()=>decodeNative(bad),/checksum/);
 await assert.rejects(()=>decodeNative({...p,kind:'spherex_sequence'}));await assert.rejects(()=>decodeNative({...p,shape:[1,2]}));
 const a=await decodeNative(p);
 for(const patch of [{contrast:NaN},{asinh_a:0},{palette:'natural optical'},{mask:'show masked flux'}])assert.throws(()=>nativeRGBA(p,a,{...defaults,...patch}));
});
