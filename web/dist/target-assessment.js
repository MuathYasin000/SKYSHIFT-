import {equalEvidence} from './packets.js';
import {skyToPixel} from './science.js';

// Version 1 presents the preserved negative R Draconis assessment only. A saved
// user-edited report can never enable playback or manufacture a detection claim.
export function validateTargetAssessment(report,bundle,loaded) {
  if(!report)return null;
  const fail=()=>{throw Error('Target assessment is unsupported or differs from its source images.');};
  if(report.schema_version!=='1.0'||report.kind!=='skyshift-target-assessment'||report.sequence_id!==bundle.sequence_id||
     !equalEvidence(report.source_hashes,bundle.identity.source_hashes)||report.target!=='R Draconis'||report.catalogue_source_id!=='1648328016354496384'||
     report.physical_change!=='not_established'||report.variability_significance!==null||report.target_comparison!=='unsupported_comparison'||
     report.scientific_approval!=='PENDING'||report.internal_human_review!=='PENDING'||
     report.outcome!==(bundle.playback_eligible?'valid_temporal_comparison':'unsupported_comparison')||
     !Array.isArray(report.epochs)||report.epochs.length!==bundle.frames.length||JSON.stringify(report).length>256000)fail();
  for(const [i,e] of report.epochs.entries()) {
    const frame=bundle.frames[i],p=e.catalogue_prediction;
    if(e.observation_id!==frame.observation.observation_id||e.source_sha256!==frame.observation.source.sha256||
       !p||!Number.isFinite(p.ra_deg)||p.ra_deg<0||p.ra_deg>=360||!Number.isFinite(p.dec_deg)||Math.abs(p.dec_deg)>90||
       e.centre?.usable!==false||!Array.isArray(e.centre.flags)||!e.centre.flags.includes('OVERFLOW')||!e.centre.flags.includes('SUR_ERROR')||
       e.source_extraction?.status!=='unsupported'||e.source_extraction.flux_mjy_sr_pixel_sum!==null||e.source_extraction.formal_independent_pixel_error!==null)fail();
    const pixel=skyToPixel(p.ra_deg,p.dec_deg,frame.wcs),x=Math.round(pixel.x),y=Math.round(pixel.y);
    if(x<0||y<0||x>=frame.shape[1]||y>=frame.shape[0]||loaded[i].arrays.VALID[y*frame.shape[1]+x])fail();
  }
  return report;
}
