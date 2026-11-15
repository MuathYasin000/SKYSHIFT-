import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {summarizeProvenance} from '../dist/provenance-summary.js';
const json=name=>JSON.parse(fs.readFileSync(new URL('../dist/data/'+name,import.meta.url)));
const audit=json('provenance-audit.json'),bundle=json('bundle.json');
test('historical counts derive from complete applicable evidence and current raw array hashes',async()=>{const s=await summarizeProvenance(audit,bundle);assert.equal(s.state,'HISTORICAL');assert.deepEqual(s.files,{passed:4,total:4});assert.deepEqual(s.arrays,{passed:10,total:10});assert.equal(s.sourceRelease,'m101-review-v6');});
for(const [label,mutate] of [
  ['missing evidence',a=>delete a.local.arrays.COMMON],
  ['false success flags',a=>a.local.files[0].match=false],
  ['stale pair',a=>a.local.pair_id='stale'],
  ['inconsistent reconstruction',a=>a.local.arrays.SCI_A.reconstructed_to_prepared.numeric_sha256_a='0'.repeat(64)],
  ['duplicate file',a=>a.local.files[1]=a.local.files[0]],
  ['invalid date',a=>a.created_at_utc='invalid'],
  ['future date',a=>a.created_at_utc='2099-01-01T00:00:00Z']
])test(label+' cannot display passing counters',async()=>{const a=structuredClone(audit);mutate(a);const s=await summarizeProvenance(a,bundle);assert.equal(s.state,'UNVERIFIED');assert.equal(s.files,null);assert.equal(s.arrays,null);});
test('tampered actual bytes cannot reuse historical passing evidence',async()=>{const b=structuredClone(bundle);const data=Buffer.from(b.arrays.SCI_A.data,'base64');data[0]^=1;b.arrays.SCI_A.data=data.toString('base64');assert.equal((await summarizeProvenance(audit,b)).state,'UNVERIFIED');});
