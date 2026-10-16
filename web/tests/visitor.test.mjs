import test from 'node:test';
import assert from 'node:assert/strict';
import {stories,availability,friendlyDate,help} from '../dist/field-guide.js';

test('friendly dates explicitly use UTC independent of the local time zone',()=>{
  assert.equal(friendlyDate('2025-12-07T22:47:38.056Z'),'7 Dec 2025');
  assert.equal(friendlyDate('2025-12-07T22:47:38.056Z',true),'7 Dec 2025 · 22:47:38 UTC');
  assert.throws(()=>friendlyDate('bad date'));
});
test('visitor availability uses the declared dataset status and never approves science',()=>{
  assert.equal(availability({comparison_status:'provisional_restricted'}).limited,true);
  for(const status of ['incompatible_tested_pairs','unavailable','approved',undefined])assert.equal(availability({comparison_status:status}).limited,false);
  assert.match(availability({comparison_status:'provisional_restricted'}).explanation,/review is still pending/);
});
test('object stories name their actual field context and retain primary NASA sources',()=>{
  assert.deepEqual(Object.keys(stories).sort(),['m101','m42','m67','ngc188']);
  for(const s of Object.values(stories))assert.match(s.source,/^https:\/\/science\.nasa\.gov\//);
  assert.match(stories.m67.story,/does not establish cluster membership/);
  assert.match(stories.ngc188.caution,/not available/);
});
test('context help preserves limits on wavelength, resolution, notes and pending review',()=>{
  assert.match(help.mask[1],/do not mean the sky is empty/);
  assert.match(help.pixels[1],/24 × 24/);
  assert.match(help.wavelength[1],/does not prove identical response/);
  assert.match(help.notes[1],/no note is uploaded/);
  assert.match(help.review[1],/has not yet approved/);
});
