import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {parseCoordinate, observationRequest, requestFromURL, requestURL, archiveURL, nearbyFields, selectionOptions} from '../src/coordinate-query.js';

test('current search defaults to DR1 and retains an explicitly selected TAP provider', () => {
  const request = {...observationRequest({ra: '210', dec: '54', fov: '3'}), metadata_provider: 'tap'};
  assert.equal(request.release, 'dr1');
  assert.deepEqual(requestFromURL(requestURL(request, 'http://localhost:3000')), request);
  assert.throws(() => requestFromURL('http://localhost:3000/?ra=210&dec=54&provider=unknown'));
});

test('Temporal selection filters validate dates and survive shareable URLs',()=>{
  const filters=selectionOptions({selection:'chronological',wavelength:'1.32',start:'2025-12-01',end:'2025-12-31'});
  const request={...observationRequest({ra:248.1676,dec:66.75498,fov:2.4,release:'qr2'}),detector:2,...filters};
  assert.deepEqual(requestFromURL(requestURL(request,'http://localhost:3000')),request);
  assert.deepEqual(selectionOptions({}),{});
  for(const input of [{start:'2026-02-30'},{start:'2026-03-01',end:'2026-01-01'},{wavelength:'0.7'},{wavelength:'true'},{selection:'anything'}])assert.throws(()=>selectionOptions(input));
  assert.throws(()=>requestFromURL('http://localhost:3000/?ra=1&dec=2&start=2025-01-01&start=2026-01-01'));
});

test('Challenge WISE 0855 coordinates convert with explicit RA hours and negative declination', () => {
  assert.ok(Math.abs(parseCoordinate('08h55m10.831s','ra') - 133.79512916666668) < 1e-10);
  assert.ok(Math.abs(parseCoordinate('-7d14m42.53s','dec') + 7.245147222222222) < 1e-10);
  assert.equal(parseCoordinate('12','ra'),12);
  assert.equal(parseCoordinate('12:00:00','ra'),180);
  assert.equal(parseCoordinate('-00:30:00','dec'),-.5);
  assert.equal(parseCoordinate('−00d30m00s','dec'),-.5);
  assert.equal(parseCoordinate('+90d00m00s','dec'),90);
});
test('Invalid or ambiguous coordinates and request sizes fail without normalization', () => {
  for (const ra of ['', ' ', 'NaN','Infinity','360','-1','24:00:00','12:60:00','12h00m60s','12d00m00s','0x10','12foo']) assert.throws(() => parseCoordinate(ra,'ra'),ra);
  for (const dec of ['91','-90d00m01s','90:01:00','-07:14:60','1h2m3s','']) assert.throws(() => parseCoordinate(dec,'dec'),dec);
  for (const fov of ['',0,.1,31,'NaN','0x10']) assert.throws(() => observationRequest({ra:'1',dec:'2',fov}),String(fov));
  assert.throws(() => observationRequest({ra:'1',dec:'2',fov:12,release:'qr9'}));
});
test('Search links round trip independently of the current route and omit private state', () => {
  const req = observationRequest({ra:'0',dec:'-90',fov:30,release:'qr2'});
  const url = requestURL(req, 'http://localhost:3000/index.html?note=private#compare');
  assert.deepEqual(requestFromURL(url),req);
  assert.equal(new URL(url).hash,'#sky-search');
  assert.ok(!url.includes('private'));
  assert.equal(requestFromURL('http://localhost:3000/?view=compare'),null);
  for (const query of ['ra=1','ra=1&ra=2&dec=0','ra=&dec=0','ra=1&dec=2&fov=31']) assert.throws(() => requestFromURL('http://localhost:3000/?'+query));
});
test('Archive search encloses square corners and encodes southern coordinates', () => {
  const req = observationRequest({ra:133,dec:-7,fov:12});
  const url = new URL(archiveURL(req));
  assert.equal(url.hostname,'irsa.ipac.caltech.edu');
  assert.equal(url.searchParams.get('dec'),'-7');
  assert.ok(Math.abs(parseFloat(url.searchParams.get('sr')) - .2/Math.sqrt(2)) < 1e-12);
});
test('Nearby centres handle RA wrap and poles without asserting coverage', () => {
  const req = observationRequest({ra:.01,dec:0,fov:12});
  const fields=[{id:'across-zero',ra_deg:359.99,dec_deg:0,size_deg:.1},{id:'far',ra_deg:180,dec_deg:0,size_deg:.1}];
  assert.deepEqual(nearbyFields(req,{fields}).map(x=>x.field.id),['across-zero']);
  assert.ok(nearbyFields(observationRequest({ra:180,dec:90,fov:12}),{fields:[{id:'pole',ra_deg:0,dec_deg:90,size_deg:.1}]})[0].separation_deg < 1e-10);
});
test('All five challenge presets are valid sourced search centres and stay unvalidated', () => {
  const catalog = JSON.parse(fs.readFileSync(new URL('../../config/challenge_targets.json',import.meta.url)));
  assert.equal(catalog.targets.length,5);
  assert.equal(new Set(catalog.targets.map(t=>t.id)).size,5);
  for (const t of catalog.targets) {
    observationRequest({ra:t.ra,dec:t.dec,fov:t.fov_arcmin});
    assert.equal(t.validation_status,'NOT_TESTED');
    assert.match(t.source_url,/^https:\/\//);
    assert.ok(t.coordinate_context.length > 30);
  }
  const epsilon=catalog.targets.find(t=>t.id==='epsilon-indi-b');
  assert.ok(Math.abs(parseCoordinate(epsilon.ra,'ra')-331.0441465885)<1e-8);
});
