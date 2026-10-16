import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {decodeArray,pixelToSky} from '../dist/science.js';
import {validateExposureQuestions,MAX_EXPOSURE_QUESTIONS} from '../dist/exposure-questions.js';
import {createExposureRecord,parseExposureRecord,validateExposureRecord} from '../dist/exposure-records.js';
import {createExplorationMemory} from '../dist/exploration-memory.js';
import {defaultVisualization} from '../dist/visualization.js';

const catalogue=JSON.parse(await readFile(new URL('../dist/data/explore-catalog.json',import.meta.url))),field=catalogue.fields.find(f=>f.id==='m42'),entry=field.observations[0];
const product=JSON.parse(await readFile(new URL('../dist/'+entry.url.slice(2),import.meta.url))),valid=decodeArray(product.arrays.VALID),[h,w]=product.shape;
const good=valid.findIndex(v=>v===1),bad=valid.findIndex(v=>v===0);
const at=i=>pixelToSky(i%w,Math.floor(i/w),product.wcs);
const question=()=>({id:'70210922-4215-4d40-b649-d4ef46fc485d',product_sha256:entry.sha256,frame:'icrs',...at(good),question:'SYNTHETIC question: what contributes to this light?',created_at:'2026-10-16T20:00:00.000Z'});
const view={visualization:defaultVisualization,contrast:1,viewport:{zoom:1,center_x:(w-1)/2,center_y:(h-1)/2}};

test('a question belongs to exactly one verified exposure and usable coordinate',()=>{
  const q=question();assert.deepEqual(validateExposureQuestions([q],product,entry.sha256,valid),[q]);
  assert.throws(()=>validateExposureQuestions([{...q,...at(bad)}],product,entry.sha256,valid),/usable pixel/);
  assert.throws(()=>validateExposureQuestions([q],product,'0'.repeat(64),valid),/identity/);
  assert.throws(()=>validateExposureQuestions([q],product,entry.sha256),/quality mask/);
});
test('bounded questions reject duplicate IDs, extra fields, bad timestamps and unsafe geometry',()=>{
  for(const patch of [{id:'bad'},{extra:'payload'},{frame:'galactic'},{question:' '},{question:'x'.repeat(1501)},{created_at:'2026-02-31T20:00:00.000Z'},{created_at:'yesterday'},{ra_deg:360},{dec_deg:NaN},{ra_deg:0,dec_deg:0}])assert.throws(()=>validateExposureQuestions([{...question(),...patch}],product,entry.sha256,valid));
  assert.throws(()=>validateExposureQuestions([question(),question()],product,entry.sha256,valid));
  assert.throws(()=>validateExposureQuestions(Array(MAX_EXPOSURE_QUESTIONS+1).fill(question()),product,entry.sha256,valid));
});
test('1.1 JSON preserves questions while 1.0 remains the unchanged no-question format',()=>{
  const record=createExposureRecord(field,entry,product,{...view,questions:[question()]}),parsed=parseExposureRecord(new TextEncoder().encode(JSON.stringify(record)));
  assert.equal(parsed.schema_version,'1.1');assert.deepEqual(validateExposureRecord(parsed,field,entry,product,{VALID:valid}).questions,[question()]);
  assert.throws(()=>validateExposureRecord(parsed,field,entry,product),/quality mask/);
  const forged=structuredClone(parsed);forged.questions[0].product_sha256='0'.repeat(64);assert.throws(()=>validateExposureRecord(forged,field,entry,product,{VALID:valid}));
  const original=createExposureRecord(field,entry,product,view);assert.equal(original.schema_version,'1.0');assert.equal(Object.hasOwn(original,'questions'),false);assert.deepEqual(validateExposureRecord(original,field,entry,product).questions,[]);
});
test('automatic exploration history refuses private questions even if the file is valid',()=>{
  let writes=0;const record=createExposureRecord(field,entry,product,{...view,questions:[question()]}),memory=createExplorationMemory(()=>({getItem:()=>JSON.stringify(record),setItem:()=>writes++}));
  assert.equal(memory.write(record),false);assert.equal(writes,0);assert.equal(memory.read().record,null);
});
