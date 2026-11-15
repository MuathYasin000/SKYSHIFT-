import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createEvidenceDirectory,evidenceFile,writeEvidenceFile,claimEvidenceFile} from '../../tools/evidence-output.mjs';

test('explicit evidence directories and files refuse collisions and preserve bytes',async()=>{
  const parent=await fs.mkdtemp(path.join(os.tmpdir(),'skyshift-evidence-'));
  try {
    const output=path.join(parent,'run');
    await createEvidenceDirectory('unit-test',output);
    const file=evidenceFile(output,'old/path/historical.json');
    await writeEvidenceFile(file,'original');
    await assert.rejects(createEvidenceDirectory('unit-test',output),{code:'EEXIST'});
    await assert.rejects(writeEvidenceFile(file,'replacement'),{code:'EEXIST'});
    await assert.rejects(claimEvidenceFile(file),{code:'EEXIST'});
    assert.equal(await fs.readFile(file,'utf8'),'original');
    const screenshot=evidenceFile(output,'screenshot.png');
    assert.equal(await claimEvidenceFile(screenshot),screenshot);
    await fs.writeFile(screenshot,'captured pixels');
    await assert.rejects(claimEvidenceFile(screenshot),{code:'EEXIST'});
    assert.equal(await fs.readFile(screenshot,'utf8'),'captured pixels');
    const attempts=await Promise.allSettled(Array.from({length:8},()=>createEvidenceDirectory('unit-test',path.join(parent,'parallel'))));
    assert.equal(attempts.filter(x=>x.status==='fulfilled').length,1);
  } finally {await fs.rm(parent,{recursive:true,force:true});}
});

test('default evidence paths are distinct even for simultaneous runs',async()=>{
  const outputs=await Promise.all([createEvidenceDirectory('collision-test'),createEvidenceDirectory('collision-test')]);
  try {assert.notEqual(outputs[0],outputs[1]);}
  finally {await Promise.all(outputs.map(directory=>fs.rmdir(directory)));}
});
