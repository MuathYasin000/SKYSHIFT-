import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {timelineFrames,nextTimelineFrame,pairIsScreened} from '../src/timeline-policy.js';
import {validateSequence} from '../dist/sequence-records.js';
import {requestURL,requestFromURL} from '../dist/coordinate-query.js';
const baseline=JSON.parse(await fs.readFile(new URL('../dist/data/sequence-example.json',import.meta.url)));
test('Survey Timeline preserves actual epochs independently of matched eligibility',()=>{
 const b={frames:[{}, {}, {}],playback_eligible:false,matched_frame_indices:[0,2]};
 assert.deepEqual(timelineFrames(b,'survey'),[0,1,2]);assert.deepEqual(timelineFrames(b,'matched'),[0,2]);
 assert.equal(nextTimelineFrame([0,2],0),2);assert.equal(nextTimelineFrame([0,2],2,1,false),null);
 assert.equal(nextTimelineFrame([0,2],2,1,true),0);assert.equal(nextTimelineFrame([],0),null);
 assert.equal(nextTimelineFrame([0,2],1,1),0);assert.equal(nextTimelineFrame([0,2],1,-1),2);
});
test('Matched subset cannot forge approval of a rejected link',async()=>{
 const b=structuredClone(baseline);b.matched_frame_indices=[0,1];await validateSequence(b);
 b.comparisons[0].registration.status='fail';b.playback_eligible=false;
 await assert.rejects(validateSequence(b),/unscreened/);
 const duplicate=structuredClone(baseline);duplicate.matched_frame_indices=[0,0];await assert.rejects(validateSequence(duplicate),/indices/);
});
test('Comparison presentation checks the actual requested link',()=>{
 const b={comparisons:[{a:0,b:2,playback_eligible:true},{a:0,b:1,playback_eligible:false}]};
 assert.equal(pairIsScreened(b,2,0),true);assert.equal(pairIsScreened(b,0,1),false);assert.equal(pairIsScreened(b,2,2),false);
});
test('The acquisition frame bound survives sharing and invalid bounds fail',()=>{
 const request={...baseline.request,max_frames:6};
 assert.equal(requestFromURL(requestURL(request,'https://skyshift.example/')).max_frames,6);
 for(const value of [0,7,2.5,true])assert.throws(()=>requestURL({...request,max_frames:value},'https://skyshift.example/'));
 assert.throws(()=>requestFromURL('https://skyshift.example/?ra=10&dec=20&frames=3&frames=6'),/Duplicate/);
});
