import {sha256} from './science.js';
import {equalEvidence} from './evidence-identity.js';

// Historical evidence is applicable only when its identities still match the
// supplied scientific inputs. This does not re-run the historical reconstruction.
export async function summarizeProvenance(audit,bundle,now=Date.now()){
  const m=bundle?.manifest,l=audit?.local;
  const unavailable=reason=>({state:'UNVERIFIED',reason,files:null,arrays:null,date:audit?.created_at_utc||'Unavailable'});
  if(audit?.schema_version!=='1.0'||!Number.isFinite(Date.parse(audit.created_at_utc))||Date.parse(audit.created_at_utc)>now||!l||l.pair_id!==m?.pair_id||l.manifest_match!==true||l.scientific_approval!=='PENDING'||m.processing.scientific_approval!=='PENDING')return unavailable('Missing, inconsistent or inapplicable historical audit.');
  const expected=new Map();
  for(const f of [...m.prepared_files,...m.observations.flatMap(o=>[o.source,o.spectral_calibration])]){
    if(expected.has(f.path)&&!equalEvidence(expected.get(f.path),f))return unavailable('Conflicting source identities.');
    expected.set(f.path,f);
  }
  if(!Array.isArray(l.files)||l.files.length!==expected.size||new Set(l.files.map(f=>f.path)).size!==expected.size)return unavailable('Historical file inventory is incomplete.');
  let files=0,arrays=0;
  for(const f of l.files){const e=expected.get(f.path);if(!e||f.match!==true||f.sha256!==e.sha256||f.expected_sha256!==e.sha256||f.size_bytes!==e.size_bytes)return unavailable('Historical file identities differ from this dataset.');files++;}
  const keys=Object.keys(m.processing.numeric_hashes);
  if(!equalEvidence(Object.keys(l.arrays||{}).sort(),[...keys].sort())||!equalEvidence(Object.keys(bundle.arrays).sort(),[...keys].sort()))return unavailable('Historical array inventory is incomplete.');
  for(const key of keys){
    const r=l.arrays[key],entry=bundle.arrays[key],h=m.processing.numeric_hashes[key];
    if(!r||!equalEvidence(entry.shape,m.processing.shape)||r.browser_to_prepared_bytes_match!==true||r.manifest_numeric_hash_match!==true||r.browser_raw_little_endian_sha256!==h||r.prepared_little_endian_sha256!==h)return unavailable('Historical array evidence is inconsistent.');
    for(const c of [r.browser_to_prepared,r.reconstructed_to_prepared])if(c?.match!==true||c.numeric_sha256_a!==h||c.numeric_sha256_b!==h||c.max_absolute_difference!==0||!equalEvidence(c.shape,entry.shape))return unavailable('Historical reconstruction evidence is inconsistent.');
    const raw=Uint8Array.from(atob(entry.data),c=>c.charCodeAt(0));
    if(await sha256(raw)!==h)return unavailable('The supplied browser array differs from the audited bytes.');
    arrays++;
  }
  return {state:'HISTORICAL',files:{passed:files,total:expected.size},arrays:{passed:arrays,total:keys.length},date:audit.created_at_utc,sourceRelease:l.release,pairId:l.pair_id,reason:'Recorded reconstruction evidence matches these supplied array and source identities. Website release verification is separate.'};
}

export async function loadProvenance(fetcher=globalThis.fetch){
  const json=async url=>{const r=await fetcher(url,{cache:'no-cache',signal:AbortSignal.timeout(10000)});if(!r.ok)throw Error('Recorded provenance unavailable');return r.json();};
  const [audit,catalogue]=await Promise.all([json('./data/provenance-audit.json'),json('./data/catalog.json')]);
  if(catalogue.bundle_url!=='./data/bundle.json'||!/^[a-f0-9]{64}$/.test(catalogue.bundle_sha256))throw Error('Unsupported scientific catalogue identity');
  const r=await fetcher(catalogue.bundle_url,{cache:'no-cache',signal:AbortSignal.timeout(10000)});if(!r.ok)throw Error('Audited scientific data unavailable');
  const bytes=new Uint8Array(await r.arrayBuffer());if(await sha256(bytes)!==catalogue.bundle_sha256)throw Error('Scientific bundle checksum mismatch');
  return {audit,summary:await summarizeProvenance(audit,JSON.parse(new TextDecoder().decode(bytes)))};
}
