try:
    from evidence_output import fresh_run
except ModuleNotFoundError:
    from tools.evidence_output import fresh_run
"""Bounded real-data tests: QR2/D2 at the five supplied search centres.

Scientific objective: determine what three fixed chronological samples support
at a 12-arcminute width. No exhaustive pair search or confirmed detection claim.
"""
import hashlib
import json
from pathlib import Path
import sys
import argparse
from astropy.coordinates import SkyCoord

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'src'))
from skyshift.sequence import SequenceRequest, build_sequence


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--retry-timeouts',action='store_true',help='Retry failed broad queries using the new single-detector SIA BAND restriction')
    args=parser.parse_args()
    run_output=fresh_run('challenge-target-validation')
    targets = json.loads((ROOT/'config/challenge_targets.json').read_text(encoding='utf-8'))['targets']
    report_path=ROOT/'docs/evidence/challenge-readiness-20261029/target-results.json'
    prior=json.loads(report_path.read_text())['targets'] if report_path.exists() and args.retry_timeouts else []
    results={r['id']:r for r in prior}
    report_path=run_output/'target-results.json'
    for target in targets:
        if args.retry_timeouts and results.get(target['id'],{}).get('status')!='test_failed':continue
        print(target['name'],flush=True)
        coordinate = SkyCoord(target['ra'],target['dec'],frame='icrs')
        request = SequenceRequest(schema_version='1.0',kind='skyshift-observation-request',release='qr2',
            region={'ra_deg':float(coordinate.ra.deg),'dec_deg':float(coordinate.dec.deg),'size_deg':target['fov_arcmin']/60},max_frames=3,detector=2)
        output=run_output/target['id']
        try:
            if (output/'sequence.json').exists():
                raw=(output/'sequence.json').read_bytes()
                if hashlib.sha256(raw).hexdigest() != (output/'sequence.sha256').read_text(): raise ValueError('Saved target receipt hash mismatch')
                value=json.loads(raw)
            else:
                value=build_sequence(request,output,progress=lambda m:print('  '+m,flush=True),use_local=False)
            result={'id':target['id'],'name':target['name'],'coordinate_context':target['coordinate_context'],
                    'coordinate_source_url':target['source_url'],'request':request.model_dump(mode='json'),
                    'status':'partially_supported' if value['frames'] else 'unavailable_in_tested_data',
                    'prepared_frames':len(value['frames']),'playback_eligible':value['playback_eligible'],
                    'observations':[f['observation'] for f in value['frames']],
                    'quality':[f['processing'] for f in value['frames']],
                    'comparisons':value['comparisons'],'rejections':value['rejections'],
                    'receipt':str(output.relative_to(ROOT)/'sequence.json'),
                    'interpretation':'Search-centre image preparation and engineering checks only. Target identification, measured motion and calibrated variability NOT ESTABLISHED.',
                    'proper_motion_handling':'12-arcminute fixed search around the stated centre. No epoch is inferred and no target position is propagated; background Gaia references use the established proper-motion policy.'}
        except Exception as exc:
            result={'id':target['id'],'name':target['name'],'status':'test_failed','error':str(exc),'request':request.model_dump(mode='json')}
        if target['id'] in results:result['previous_attempt']={k:v for k,v in results[target['id']].items() if k not in ('comparisons','observations','quality')}
        results[target['id']]=result
        (run_output/(target['id']+'-result.json')).write_text(json.dumps(result,indent=2,allow_nan=False)+'\n',encoding='utf-8')
        report_path.write_text(json.dumps({'scientific_approval':'PENDING','internal_human_review':'PENDING',
            'scope':'QR2/D2 only; bounded three-sample availability and preparation tests, not target detections',
            'targets':list(results.values())},indent=2,allow_nan=False)+'\n',encoding='utf-8')
        print(result['status'],result.get('prepared_frames',0),flush=True)


if __name__=='__main__': main()
