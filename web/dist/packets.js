import {unzipSync,strFromU8} from './vendor/fflate.js';
import {sha256,validateAnnotation,validateDisplay} from './science.js';
import {validateVisualization} from './visualization.js';
import {equalEvidence} from './evidence-identity.js';
export {equalEvidence} from './evidence-identity.js';

export function safeName(name){
  const parts=name.split('/');
  if(!name||name.length>1024||/[\\:\u0000-\u001f]/.test(name)||name.startsWith('/')||parts.some(p=>!p||p==='.'||p==='..'||/[. ]$/.test(p)||/^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?:\.|$)/i.test(p)))throw Error('Unsafe comparison file path');
}

export function inspectZipBounds(bytes){
  if(bytes.length>100000000||bytes.length<22)throw Error('Invalid or oversized saved comparison');
  const v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);let end=-1;
  for(let i=bytes.length-22;i>=Math.max(0,bytes.length-65557);i--){if(v.getUint32(i,true)===0x06054b50&&i+22+v.getUint16(i+20,true)===bytes.length){end=i;break;}}
  if(end<0)throw Error('Invalid ZIP directory');
  const count=v.getUint16(end+10,true),start=v.getUint32(end+16,true),length=v.getUint32(end+12,true);
  if(v.getUint16(end+4,true)||v.getUint16(end+6,true)||v.getUint16(end+8,true)!==count||count>150||!count||start+length!==end)throw Error('Unsupported ZIP layout');
  let pos=start,total=0;const names=new Map();
  for(let i=0;i<count;i++){
    if(pos+46>end||v.getUint32(pos,true)!==0x02014b50)throw Error('Invalid ZIP entry');
    const size=v.getUint32(pos+24,true),compressed=v.getUint32(pos+20,true),n=v.getUint16(pos+28,true),extra=v.getUint16(pos+30,true),comment=v.getUint16(pos+32,true),off=v.getUint32(pos+42,true),method=v.getUint16(pos+10,true);
    if(pos+46+n+extra+comment>end||size===0xffffffff||compressed===0xffffffff||v.getUint16(pos+8,true)&1||![0,8].includes(method))throw Error('Unsupported ZIP entry');
    const name=strFromU8(bytes.subarray(pos+46,pos+46+n));safeName(name);
    if(names.has(name)||off+30>start||v.getUint32(off,true)!==0x04034b50)throw Error('Duplicate or invalid ZIP entry');
    const localNameLength=v.getUint16(off+26,true),localExtra=v.getUint16(off+28,true),dataStart=off+30+localNameLength+localExtra;
    if(dataStart+compressed>start||v.getUint16(off+8,true)!==method||strFromU8(bytes.subarray(off+30,off+30+localNameLength))!==name)throw Error('ZIP local and central entries disagree');
    total+=size;if(total>150000000)throw Error('Saved comparison exceeds its decompressed size limit');
    names.set(name,{size,compressed,method});pos+=46+n+extra+comment;
  }
  if(pos!==end)throw Error('ZIP directory length mismatch');
  return names;
}

export async function openComparison(bytes,baseline,common,evidence={}){
  const entries=inspectZipBounds(bytes);
  const payload=unzipSync(bytes,{filter:file=>{const e=entries.get(file.name);if(!e||e.size!==file.originalSize||e.compressed!==file.size)throw Error('ZIP allocation metadata disagree');return true;}});
  if(Object.keys(payload).length!==entries.size)throw Error('ZIP members disagree with the directory');
  if(!payload['hashes.json']||!payload['manifest.json'])throw Error('Evidence hashes or manifest are missing');
  const hashes=JSON.parse(strFromU8(payload['hashes.json'])),names=Object.keys(payload).filter(n=>n!=='hashes.json');
  if(Object.keys(hashes).length!==names.length||names.some(n=>!Object.hasOwn(hashes,n)))throw Error('Hash inventory is incomplete');
  for(const name of names)if(payload[name].length!==entries.get(name).size||await sha256(payload[name])!==hashes[name])throw Error('Saved comparison checksum mismatch: '+name);
  const m=JSON.parse(strFromU8(payload['manifest.json']));
  if(m.schema_version!=='1.0'||m.pair_id!==baseline.pair_id||m.dataset_kind!=='real')throw Error('This saved comparison belongs to a different or unsupported dataset');
  // Only the display and annotations are user-editable. Preserve attribution,
  // restrictions, timestamps and every other manifest field as well as arrays.
  const immutable=value=>Object.fromEntries(Object.entries(value).filter(([key])=>!['display','annotations'].includes(key)));
  if(!equalEvidence(immutable(m),immutable(baseline)))throw Error('Scientific metadata differ from the curated dataset');
  if(!Array.isArray(m.annotations)||m.annotations.length>500)throw Error('Invalid annotation list');
  const ids=new Set();for(const note of m.annotations){validateAnnotation(note,baseline,common);if(ids.has(note.annotation_id))throw Error('Duplicate annotation identity');ids.add(note.annotation_id);}
  if(payload['annotations.json']&&!equalEvidence(JSON.parse(strFromU8(payload['annotations.json'])),m.annotations))throw Error('Annotation records disagree with the manifest');
  for(const name of ['registration','response']){
    const path=`diagnostics/${name}.json`;
    if(payload[path]&&evidence[name]&&!equalEvidence(JSON.parse(strFromU8(payload[path])),evidence[name]))throw Error('Scientific diagnostics differ from the curated dataset: '+name);
  }
  if(payload['packet.json']&&JSON.parse(strFromU8(payload['packet.json'])).scientific_approval!=='PENDING')throw Error('Unsupported packet scientific approval claim');
  for(const file of baseline.prepared_files)if(!payload[file.path]||await sha256(payload[file.path])!==file.sha256)throw Error('Prepared scientific product differs from the curated dataset');
  const extension=payload['visualization.json']?{visualization:validateVisualization(JSON.parse(strFromU8(payload['visualization.json'])))}:{};
  return {display:validateDisplay(m.display,baseline),annotations:m.annotations,...extension};
}
