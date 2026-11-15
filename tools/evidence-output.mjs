// Every verifier owns a fresh directory. Existing paths are never reused.
import fs from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export async function createEvidenceDirectory(label,explicit) {
  const name=String(label).replace(/[^a-zA-Z0-9_-]/g,'-');
  const parent=path.join(root,'docs','evidence');
  await fs.mkdir(parent,{recursive:true});
  const directory=path.resolve(explicit||path.join(parent,`${name}-${new Date().toISOString().replace(/[:.]/g,'-')}-${randomUUID().slice(0,8)}`));
  // mkdir is atomic, including for parallel runs and explicit output directories.
  await fs.mkdir(directory,{recursive:false});
  console.log('SKYSHIFT_EVIDENCE_DIR='+directory);
  return directory;
}
export function evidenceFile(directory,oldPath) {
  const name=path.basename(String(oldPath).replaceAll('\\','/'));
  if(!name||name==='.'||name==='..')throw Error('Evidence output requires a filename');
  return path.join(directory,name);
}
export async function writeEvidenceFile(filename,data,options={}) {
  return fs.writeFile(filename,data,{...(typeof options==='string'?{encoding:options}:options),flag:'wx'});
}
export async function claimEvidenceFile(filename) {
  // Screenshot/download APIs overwrite by default. Claim an empty destination
  // atomically first; those APIs may replace only this run's empty reservation.
  const handle=await fs.open(filename,'wx');
  await handle.close();
  return filename;
}
