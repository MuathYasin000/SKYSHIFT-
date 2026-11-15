import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {validateSequence} from '../dist/sequence-records.js';
import {createInvestigation} from '../dist/investigation.js';
import {pixelToSky} from '../dist/science.js';
const baseline=JSON.parse(await fs.readFile(new URL('../dist/data/sequence-example.json',import.meta.url)));

test('Real comet case preserves spectral rejection and forbids temporal playback',async()=>{
 const manifest=JSON.parse(await fs.readFile(new URL('../dist/data/target-status.json',import.meta.url)));
 const entry=manifest.case_studies.find(x=>x.id==='comet-december');
 const bytes=await fs.readFile(new URL('../dist/'+entry.url.slice(2),import.meta.url));
 const {createHash}=await import('node:crypto');
 assert.equal(createHash('sha256').update(bytes).digest('hex'),entry.sha256);
 const bundle=JSON.parse(bytes);await validateSequence(bundle);
 assert.equal(bundle.frames.length,2);assert.equal(bundle.playback_eligible,false);
 assert.equal(bundle.comparisons[0].registration.status,'pass');
 const spectral=bundle.comparisons[0].screen.suitability.checks.find(c=>c.code==='local_spectral_screen');
 assert.equal(spectral.status,'fail');assert.ok(spectral.measurements.max_separation_bandwidths>4);
 const investigation=createInvestigation();await investigation.openSequence(bundle);
 assert.equal(investigation.active.sequence.bundle.playback_eligible,false);
});

test('All five real cached target grids tolerate FITS decimal serialization but reject a shifted centre',async()=>{
 const manifest=JSON.parse(await fs.readFile(new URL('../dist/data/target-status.json',import.meta.url)));
 for(const target of manifest.targets){
  const b=JSON.parse(await fs.readFile(new URL('../dist/'+target.url.slice(2),import.meta.url)));
  await validateSequence(b);
  b.frames.forEach(f=>f.wcs.CRVAL1+=1e-7);
  await assert.rejects(validateSequence(b),/fixed sky grid/);
 }
});
test('Real sequence preserves a fixed grid, shared display and per-epoch questions through ZIP round trip',async()=>{
 const e=createInvestigation();const v=await e.openSequence(structuredClone(baseline));const original={...v.display};
 const i=v.arrays.VALID.findIndex(Boolean),sky=pixelToSky(i%v.shape[1],Math.floor(i/v.shape[1]),v.wcs);
 e.updateQuestions([{id:'22222222-2222-4222-8222-222222222222',product_sha256:v.entry.sha256,frame:'icrs',...sky,category:'quality_issue',question:'Automated engineering question.',created_at:'2026-10-29T00:00:00.000Z'}]);
 e.sequenceFrame(1);assert.equal(e.active.questions.length,0);assert.deepEqual(e.active.display,original);e.sequenceFrame(0);assert.equal(e.active.questions.length,1);
 e.active.display.zoom=2;const saved=await e.save();const other=createInvestigation();await other.reopen(saved.bytes);
 assert.deepEqual(other.diagnostics(),e.diagnostics());
});
test('An eligibility flag cannot bypass missing/failed wavelength or reference checks',async()=>{
 for(const mutate of [b=>b.comparisons=[],b=>b.comparisons[0].registration.status='fail',b=>b.comparisons[0].registration.p95_residual_pixels=99,b=>b.frames.reverse(),b=>b.frames[1].wcs.CRVAL1+=.01,b=>b.identity.source_hashes[0]='0'.repeat(64)]) {
  const b=structuredClone(baseline);mutate(b);await assert.rejects(validateSequence(b));
 }
});
test('A variable-length, independently inspectable sequence preserves rejected links and never enables play',async()=>{
 const b=structuredClone(baseline);const extra=structuredClone(b.frames[1]);extra.observation.observation_id+='-software-format-test';extra.observation.time_start_utc='2026-01-01T00:00:00.000Z';extra.observation.time_end_utc='2026-01-01T00:02:00.000Z';
 b.frames.push(extra);b.identity.source_hashes.push(extra.observation.source.sha256);b.playback_eligible=false;
 const e=createInvestigation();await e.openSequence(b);e.sequenceFrame(2);assert.equal(e.active.sequence.loaded.length,3);assert.equal(e.active.sequence.bundle.playback_eligible,false);
 // This exercises software state with a cloned frame; it is never a published astronomical example.
});
test('Invalid sequence display cannot partially replace the current investigation',async()=>{
 const e=createInvestigation();await e.openSequence(baseline);const before=e.diagnostics();
 const b=structuredClone(baseline);b.display.vmax=b.display.vmin;await assert.rejects(e.openSequence(b));assert.deepEqual(e.diagnostics(),before);
});
