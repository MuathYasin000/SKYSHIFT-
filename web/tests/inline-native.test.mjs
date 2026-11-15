import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createNativeLoader} from '../dist/inline-native.js';

const catalog=JSON.parse(await fs.readFile(new URL('../dist/data/native/catalog.json',import.meta.url)));
const entry=catalog.entries[0];
const raw=await fs.readFile(new URL('../dist/'+entry.url.slice(2),import.meta.url));
const payload=JSON.parse(raw);
function fetcherFor({entries=[entry],bytes=raw}={}) {
  const calls=[];
  const fetcher=async url=>{
    calls.push(url);
    return new Response(url.endsWith('catalog.json')?JSON.stringify({entries}):bytes,{status:200});
  };
  return {fetcher,calls};
}

test('inline native loader selects exact installed original and reuses bounded decoded cache',async()=>{
  const {fetcher,calls}=fetcherFor(),load=createNativeLoader({fetcher});
  const first=await load(payload.observation),second=await load(payload.observation);
  assert.equal(first,second);assert.equal(calls.length,2);
  assert.equal(first.payload.observation.source.sha256,entry.source_sha256);
  assert.equal(first.arrays.SCI.length,payload.shape[0]*payload.shape[1]);
  await assert.rejects(()=>load({...payload.observation,observation_id:'other observation'}),/differs/);
});

test('inline native loader refuses missing source, tampered asset, and arbitrary catalog URL',async()=>{
  await assert.rejects(()=>createNativeLoader(fetcherFor({entries:[]}))(payload.observation),/not installed/);
  const tampered=Buffer.from(raw);tampered[tampered.length-2]^=1;
  await assert.rejects(()=>createNativeLoader(fetcherFor({bytes:tampered}))(payload.observation),/checksum/);
  await assert.rejects(()=>createNativeLoader(fetcherFor({entries:[{...entry,url:'https://example.test/secret'}]}))(payload.observation),/Unsupported native asset/);
  await assert.rejects(()=>createNativeLoader(fetcherFor())({...payload.observation,source:{sha256:'invalid'}}),/No authenticated/);
});

test('inline native supplied live originals are checked independently, without catalog fallback',async()=>{
  let calls=0;const load=createNativeLoader({fetcher:async()=>{calls++;throw Error('unexpected network');}});
  const result=await load(payload.observation,payload);assert.equal(calls,0);assert.equal(result.arrays.SCI.length,payload.shape[0]*payload.shape[1]);
  await assert.rejects(()=>load(payload.observation,{...payload,observation:{...payload.observation,source:{sha256:'f'.repeat(64)}}}),/differs/);
  const changed=structuredClone(payload);changed.arrays.SCI.data=(changed.arrays.SCI.data[0]==='A'?'B':'A')+changed.arrays.SCI.data.slice(1);
  await assert.rejects(()=>load(payload.observation,changed),/checksum/);assert.equal(calls,0);
});

test('inline native failed requests remain retryable and never turn a cached identity into an alternate source',async()=>{
  const good=fetcherFor();let fail=true;
  const load=createNativeLoader({fetcher:async(...args)=>{if(fail){fail=false;return new Response('outage',{status:503});}return good.fetcher(...args);}});
  await assert.rejects(()=>load(payload.observation),/unavailable/);
  const result=await load(payload.observation);assert.equal(result.payload.observation.source.sha256,entry.source_sha256);
});
