import {decodeArray,sha256} from './science.js';
import {validatePreparedExposure} from './exposure-validation.js';
import {equalEvidence,inspectZipBounds} from './packets.js';
import {zipSync,unzipSync,strToU8,strFromU8} from './vendor/fflate.js';
import {validateTargetAssessment} from './target-assessment.js';

const MAX_BYTES=32*1024*1024;
export async function validateSequence(value) {
  if (!value || value.schema_version!=='1.0' || value.kind!=='spherex_sequence' || value.dataset_kind!=='real' ||
      value.scientific_approval!=='PENDING' || !/^sequence-[a-f0-9]{24}$/.test(value.sequence_id) ||
      !Array.isArray(value.frames) || !value.frames.length || value.frames.length>6 ||
      !Array.isArray(value.comparisons) || value.comparisons.length>15 || !Array.isArray(value.rejections))
    throw Error('Unsupported or empty SPHEREx sequence.');
  const r=value.request?.region;
  if(!r||r.frame!=='icrs'||!Number.isFinite(r.ra_deg)||r.ra_deg<0||r.ra_deg>=360||!Number.isFinite(r.dec_deg)||Math.abs(r.dec_deg)>90||!Number.isFinite(r.size_deg)||r.size_deg<1/60||r.size_deg>.5)
    throw Error('Invalid sequence request geometry.');
  const ids=new Set(),loaded=[];
  for(const [index,p] of value.frames.entries()) {
    if(p.dataset_kind!=='real'||p.scientific_approval!=='PENDING'||p.usage!=='single_observation_only'||
       !equalEvidence(p.region,r)||!Array.isArray(p.shape)||p.shape.length!==2||p.shape.some(n=>!Number.isInteger(n)||n<1)||p.shape[0]*p.shape[1]>1000000)
      throw Error('Sequence frame geometry or scientific identity differs from its request.');
    if(!equalEvidence(Object.keys(p.arrays||{}).sort(),['BAND','SCI','VALID','WAVE']))throw Error('Unsupported sequence array roles.');
    for(const [name,a] of Object.entries(p.arrays))if(!equalEvidence(a.shape,p.shape)||a.dtype!==(name==='VALID'?'uint8':'float32'))throw Error('Sequence array role or shape mismatch.');
    const arrays=Object.fromEntries(Object.entries(p.arrays).map(([k,v])=>[k,decodeArray(v)]));
    await validatePreparedExposure(p,arrays);
    const side=Math.ceil(r.size_deg*3600/6.15);
    // FITS cards serialize finite decimal precision; allow only sub-microarcsecond rounding.
    if(p.shape[0]!==side||p.shape[1]!==side||!Number.isFinite(p.wcs.CRVAL1)||!Number.isFinite(p.wcs.CRVAL2)||Math.abs(p.wcs.CRVAL1-r.ra_deg)>1e-10||Math.abs(p.wcs.CRVAL2-r.dec_deg)>1e-10||p.wcs.CRPIX1!==(side+1)/2||p.wcs.CRPIX2!==(side+1)/2||Math.abs(p.wcs.CDELT1+6.15/3600)>1e-12||Math.abs(p.wcs.CDELT2-6.15/3600)>1e-12)
      throw Error('Sequence WCS differs from the requested fixed sky grid.');
    const o=p.observation, source=o.source, u=new URL(source.source_url);
    if(u.protocol!=='https:'||!['irsa.ipac.caltech.edu','nasa-irsa-spherex.s3.us-east-1.amazonaws.com'].includes(u.hostname)||u.username||u.password||u.port||!u.pathname.includes('/'+o.release+'/')||
       !/^[a-f0-9]{64}$/.test(source.sha256)||o.release!==value.request.release||o.detector!==(value.request.detector??2)||ids.has(o.observation_id))
      throw Error('Sequence source identity is unsupported or repeated.');
    ids.add(o.observation_id);
    if(value.identity?.source_hashes?.[index]!==source.sha256)throw Error('Sequence source hashes disagree.');
    if(index&&Date.parse(o.time_start_utc)<=Date.parse(value.frames[index-1].observation.time_start_utc))throw Error('Sequence times must be strictly chronological.');
    if(index&&(!equalEvidence(p.wcs,value.frames[0].wcs)||!equalEvidence(p.shape,value.frames[0].shape)))throw Error('Sequence frames do not share one fixed sky grid.');
    loaded.push({product:p,arrays});
  }
  // Recompute eligibility from every link. A boolean flag alone cannot enable play.
  let eligible=value.frames.length>1;
  for(let i=0;i<value.frames.length;i++)for(let j=i+1;j<value.frames.length;j++) {
    const links=value.comparisons.filter(c=>c.a===i&&c.b===j),c=links[0];
    if(links.length!==1||!c.playback_eligible||c.screen?.suitability?.status!=='pending'||c.screen.suitability.checks.some(k=>k.status==='fail')||c.registration?.status!=='pass')eligible=false;
    else {
      const r=c.registration,p=c.screen.policy,checks=c.screen.suitability.checks;
      const spectral=checks.find(k=>k.code==='local_spectral_screen'),coverage=checks.find(k=>k.code==='common_coverage');
      if(p?.version!=='screening-v0.1'||p.max_wavelength_separation_in_bandwidths!==.25||p.minimum_common_fraction!==.5||p.minimum_time_separation_days!==.01||
         !Number.isFinite(spectral?.measurements?.max_separation_bandwidths)||spectral.measurements.max_separation_bandwidths>.25||!Number.isFinite(coverage?.measurements?.common_fraction)||coverage.measurements.common_fraction<.5||
         r.policy?.version!=='registration-v2'||!Number.isInteger(r.reference_count)||r.reference_count<6||!Number.isInteger(r.quadrants)||r.quadrants<3||r.quadrants>4||!Number.isFinite(r.convex_hull_fraction)||r.convex_hull_fraction<.1||r.convex_hull_fraction>1||!Number.isFinite(r.median_residual_pixels)||r.median_residual_pixels<0||r.median_residual_pixels>.25||!Number.isFinite(r.p95_residual_pixels)||r.p95_residual_pixels<0||r.p95_residual_pixels>.5||
         r.reference_count!==r.references?.filter(x=>x.status==='measured').length||
         value.frames[i].observation.pipeline_version!==value.frames[j].observation.pipeline_version||
         !value.frames[i].observation.spectral_calibration||!value.frames[j].observation.spectral_calibration||
         (Date.parse(value.frames[j].observation.time_start_utc)-Date.parse(value.frames[i].observation.time_start_utc))/86400000<.01)eligible=false;
    }
  }
  if(value.playback_eligible!==eligible)throw Error('Sequence playback eligibility disagrees with its scientific checks.');
  const d=value.display;
  if(value.reference_overlay) {
    if(!Array.isArray(value.reference_overlay)||value.reference_overlay.length>100)throw Error('Invalid reference overlay.');
    for(const r of value.reference_overlay)if(typeof r.source_id!=='string'||!Number.isFinite(r.reference_epoch_jyear)||!Array.isArray(r.positions)||r.positions.length!==value.frames.length||r.positions.some(p=>!Number.isFinite(p.ra_deg)||p.ra_deg<0||p.ra_deg>=360||!Number.isFinite(p.dec_deg)||Math.abs(p.dec_deg)>90))throw Error('Invalid reference prediction geometry.');
  }
  if(!d||![d.vmin,d.vmax,d.asinh_a].every(Number.isFinite)||d.vmax<=d.vmin||d.asinh_a<=0||d.stretch!=='asinh')throw Error('Invalid shared sequence display.');
  validateTargetAssessment(value.target_assessment,value,loaded);
  return {bundle:value,loaded};
}

export async function saveSequence(bundle,session) {
  const payload={'sequence.json':strToU8(JSON.stringify(bundle)), 'session.json':strToU8(JSON.stringify(session)),
    'README.txt':strToU8('SKYSHIFT real-data sequence investigation. Prepared measured arrays, masks, dates and source/calibration references are in sequence.json. Original FITS are referenced by URL and hash, not embedded. Hashes verify integrity, not authenticity or scientific approval. Reopen in SKYSHIFT. User questions are hypotheses. Scientific approval and internal human review PENDING. No confirmed motion or calibrated variability.\n')};
  const hashes={};for(const [name,raw] of Object.entries(payload))hashes[name]=await sha256(raw);
  payload['hashes.json']=strToU8(JSON.stringify(hashes));
  return {bytes:zipSync(payload,{level:6}),name:'SKYSHIFT-'+bundle.sequence_id+'.zip',type:'application/zip'};
}

export function isSequencePacket(bytes) {
  const sequence=inspectZipBounds(bytes).has('sequence.json');
  if(sequence&&bytes.length>MAX_BYTES)throw Error('Sequence packet exceeds 32 MiB.');
  return sequence;
}
export async function openSequencePacket(bytes) {
  const entries=inspectZipBounds(bytes);
  if([...entries.values()].reduce((n,e)=>n+e.size,0)>MAX_BYTES)throw Error('Sequence packet expands beyond 32 MiB.');
  const allowed=['sequence.json','session.json','README.txt','hashes.json'];
  if(entries.size!==4||[...entries.keys()].some(n=>!allowed.includes(n)))throw Error('Unexpected sequence packet members.');
  const data=unzipSync(bytes,{filter:f=>{const e=entries.get(f.name);if(!e||e.size!==f.originalSize||e.compressed!==f.size)throw Error('Invalid sequence archive allocation.');return true;}});
  const hashes=JSON.parse(strFromU8(data['hashes.json']));
  if(!equalEvidence(Object.keys(hashes).sort(),allowed.filter(n=>n!=='hashes.json').sort()))throw Error('Incomplete sequence hash inventory.');
  for(const [name,hash] of Object.entries(hashes))if(await sha256(data[name])!==hash)throw Error('Sequence packet checksum mismatch.');
  const value=JSON.parse(strFromU8(data['sequence.json'])),session=JSON.parse(strFromU8(data['session.json']));
  return {...await validateSequence(value),session};
}
