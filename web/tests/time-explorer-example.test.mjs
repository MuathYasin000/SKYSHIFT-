import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {validateSequence} from '../dist/sequence-records.js';
const manifest=JSON.parse(await fs.readFile(new URL('../dist/data/time-explorer-examples.json',import.meta.url)));
const entry=manifest.examples[0];
const raw=await fs.readFile(new URL('../dist/'+entry.url.slice(2),import.meta.url));
const value=JSON.parse(raw);
test('The live-discovered M101 example retains every fixed-sky and native source identity',async()=>{
 assert.equal(createHash('sha256').update(raw).digest('hex'),entry.sha256);
 await validateSequence(value);
 assert.equal(value.playback_eligible,true);assert.equal(value.frames.length,2);
 assert.equal(value.playback_modes.matched_wavelength.physical_comparison,false);
 assert.deepEqual(value.matched_frame_indices,[0,1]);
 for(const p of value.native_frames)assert.ok(p.shape[0]*p.shape[1]>20000);
});
test('A native frame from a different date or with altered measured samples is refused',async()=>{
 const wrong=structuredClone(value);wrong.native_frames[0].observation.time_start_utc=wrong.native_frames[1].observation.time_start_utc;
 await assert.rejects(validateSequence(wrong),/identity differs/);
 const corrupt=structuredClone(value);corrupt.native_frames[0].arrays.SCI.data='AAAA'+corrupt.native_frames[0].arrays.SCI.data.slice(4);
 await assert.rejects(validateSequence(corrupt),/checksum/);
});
