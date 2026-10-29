import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {decodeArray,sha256} from '../dist/science.js';
import {validatePreparedExposure} from '../dist/exposure-validation.js';
import {createExposureLoader} from '../dist/exposure-loader.js';

const root = new URL('../dist/',import.meta.url), catalog = JSON.parse(await fs.readFile(new URL('data/explore-catalog.json',root)));
const entry = catalog.fields[0].observations[0], baseline = JSON.parse(await fs.readFile(new URL(entry.url,root)));
const arrays = p => Object.fromEntries(Object.entries(p.arrays).map(([name, value])=>[name,decodeArray(value)]));

test('All installed real exposures meet the incoming-resource schema without data changes',async()=>{
  for(const f of catalog.fields)for(const e of f.observations){const p=JSON.parse(await fs.readFile(new URL(e.url,root)));await validatePreparedExposure(p,arrays(p));}
});
test('Unsupported projection, dates, units and display bounds fail before display',async()=>{
  const mutations=[p=>p.schema_version='2.0',p=>p.wcs.CTYPE1='RA---SIN',p=>p.wcs.PC1_2=.1,p=>p.wcs.CD1_1=.1,
    p=>p.wcs.CDELT1=0,p=>p.observation.detector=7,p=>p.observation.release='qr9',p=>p.observation.science_unit='counts',
    p=>p.observation.time_end_utc=p.observation.time_start_utc,p=>p.display.vmax=p.display.vmin];
  for(const mutate of mutations){const p=structuredClone(baseline);mutate(p);await assert.rejects(validatePreparedExposure(p,arrays(p)));}
});
test('Nonbinary masks, empty support and invalid supported wavelengths cannot enter the viewer',async()=>{
  const p=structuredClone(baseline),a=arrays(p),i=a.VALID.findIndex(Boolean);
  a.VALID[i]=2;await assert.rejects(validatePreparedExposure(p,a),/nonbinary/);
  a.VALID[i]=1;a.WAVE[i]=NaN;await assert.rejects(validatePreparedExposure(p,a),/measurements/);
  a.WAVE[i]=1;a.BAND[i]=-1;await assert.rejects(validatePreparedExposure(p,a),/measurements/);
  a.VALID.fill(0);await assert.rejects(validatePreparedExposure(p,a),/no usable/);
});
test('A freshly checksummed file with an inconsistent numeric hash is rejected and retry remains possible',async()=>{
  const p=structuredClone(baseline);p.arrays.WAVE.numeric_sha256='0'.repeat(64);
  const bytes=new TextEncoder().encode(JSON.stringify(p)), e={...entry,sha256:await sha256(bytes)};
  let calls=0;const loader=createExposureLoader(async()=>{calls++;return new Response(bytes);});
  await assert.rejects(loader(e),/numeric checksum/);await assert.rejects(loader(e),/numeric checksum/);assert.equal(calls,2);
});
