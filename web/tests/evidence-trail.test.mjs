import test from 'node:test';
import assert from 'node:assert/strict';
import {evidenceTrail} from '../dist/evidence-trail.js';
test('evidence trail preserves exact source identities and never invents absent references',()=>{
 const o={observation_id:'actual-id',time_start_utc:'2025-01-01',source:{source_url:'https://irsa.ipac.caltech.edu/original',sha256:'a'.repeat(64)}};
 const before=JSON.stringify(o),[r]=evidenceTrail([o]);assert.equal(r.id,o.observation_id);assert.equal(r.references[0].sha256,o.source.sha256);assert.equal(r.references[0].url,o.source.source_url);assert.deepEqual(r.references[1],{label:'Spectral calibration',url:null,sha256:null});assert.equal(JSON.stringify(o),before);
});
