import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {validateSequence,saveSequence,openSequencePacket} from '../dist/sequence-records.js';

const read=name=>JSON.parse(fs.readFileSync(new URL('../../web/dist/data/'+name,import.meta.url)));
test('Authentic target assessment stays attached to its original epochs through export/reopen',async()=>{
  const bundle=read('sequence-r-draconis-temporal.json');bundle.target_assessment=read('science-r-draconis.json');
  await validateSequence(bundle);
  const packet=await saveSequence(bundle,{frame_index:0});
  const opened=await openSequencePacket(packet.bytes);
  assert.deepEqual(opened.bundle.target_assessment,bundle.target_assessment);
  assert.equal(opened.bundle.target_assessment.variability_significance,null);
});
test('Saved target analysis cannot forge a detected change, source association or usable core',async()=>{
  for(const mutate of [b=>b.target_assessment.physical_change='verified',b=>b.target_assessment.variability_significance=10,
    b=>b.target_assessment.source_hashes[0]='0'.repeat(64),b=>b.target_assessment.epochs[0].centre.usable=true,
    b=>b.target_assessment.epochs[0].source_extraction.flux_mjy_sr_pixel_sum=100]) {
    const b=read('sequence-r-draconis-temporal.json');b.target_assessment=read('science-r-draconis.json');mutate(b);
    await assert.rejects(()=>validateSequence(b),/Target assessment/);
  }
});
