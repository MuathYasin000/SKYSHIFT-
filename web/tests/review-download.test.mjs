import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createReviewDownloader,REVIEW_ARCHIVE_SHA256} from '../dist/review-download.js';
import {sha256} from '../dist/science.js';
const root=new URL('../dist/',import.meta.url),catalogue=JSON.parse(await fs.readFile(new URL('data/catalog.json',root)));
test('full archive verifies final hash, reports real progress, deduplicates and retries only failed components',async()=>{
  const counts=new Map();let fail=true;const progress=[];
  const load=createReviewDownloader(async url=>{counts.set(url,(counts.get(url)||0)+1);if(url.endsWith('part-2.bin')&&fail){fail=false;return new Response('retry',{status:503});}return new Response(await fs.readFile(new URL(url,root)));});
  const first=load(catalogue.review_packet,{onProgress:p=>progress.push(p)});
  assert.equal(load(catalogue.review_packet),first);
  await assert.rejects(first,/503/);
  const result=await load(catalogue.review_packet,{onProgress:p=>progress.push(p)});
  assert.equal(await sha256(result.bytes),REVIEW_ARCHIVE_SHA256);assert.equal(result.bytes.length,40697263);
  assert.equal(counts.get('./data/review-part-0.bin'),1);assert.equal(counts.get('./data/review-part-1.bin'),1);assert.equal(counts.get('./data/review-part-2.bin'),2);
  assert.equal(progress.at(-1).state,'verifying archive');assert.equal(progress.at(-1).loaded,40697263);
});
test('cancellation and corrupt component fail without returning an archive',async()=>{
  const controller=new AbortController();controller.abort();await assert.rejects(createReviewDownloader()(catalogue.review_packet,{signal:controller.signal}),{name:'AbortError'});
  const load=createReviewDownloader(async()=>new Response(new Uint8Array(8000000)));
  await assert.rejects(load(catalogue.review_packet),/checksum mismatch/);
});
test('altered parts with recomputed component hashes cannot replace the final immutable archive',async()=>{
  const forged=structuredClone(catalogue.review_packet),bad=new Uint8Array(8000000);forged.parts[0].sha256=await sha256(bad);
  const load=createReviewDownloader(async url=>new Response(url.endsWith('part-0.bin')?bad:await fs.readFile(new URL(url,root))));
  await assert.rejects(load(forged),/Final review archive checksum mismatch/);
});
