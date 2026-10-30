"""Re-evaluate exact originals with current code; never overwrite old evidence.

The five named target tests repeat their bounded recorded fields, not a new
mission-wide search. A single live M101 discovery verifies current metadata and
bounded selection. QR3 uses the one-row authoritative SIA smoke sample.
"""
import hashlib
import json
from pathlib import Path
import subprocess
import sys
import argparse

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'src'))
from evidence_output import fresh_run,write_report
from skyshift.archive import sha256_file
from skyshift.sequence import build_sequence,SequenceRequest
from skyshift.releases import release_capabilities


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--retry-report',type=Path,help='Retain successful validation receipts and repeat only previously failed cases')
    args=parser.parse_args()
    previous=json.loads(args.retry_report.read_text(encoding='utf-8')) if args.retry_report else None
    out=fresh_run('master-scientific-validation')
    summary={'source_head':subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip(),
             'scope':'Current working-tree code; exact-source bounded re-evaluation, not independent scientific approval.',
             'release_registry':release_capabilities(),'targets':[],'physical_change':'NOT_ESTABLISHED'}
    # Locate by immutable identity, never by an assumed observation filename.
    inputs={}
    for sidecar in [p for parent in ['data','research'] for p in (ROOT/parent).rglob('*.fits.source.json')]:
        record=json.loads(sidecar.read_text(encoding='utf-8'))
        path=Path(str(sidecar).removesuffix('.source.json'))
        if path.exists():inputs.setdefault(record['sha256'],path)
    references={}
    for p in [p for parent in ['docs/evidence','data/investigations','research'] for p in (ROOT/parent).rglob('gaia-query.json')]:
        try:
            record=json.loads(p.read_text(encoding='utf-8'))
            csv=p.with_name('gaia.csv')
            if csv.exists() and sha256_file(csv)==record['sha256']:references.setdefault(record['sha256'],(csv,p))
        except (KeyError,ValueError):pass
    manifest=json.loads((ROOT/'web/dist/data/target-status.json').read_text(encoding='utf-8'))
    cases=manifest['targets']+[x for x in manifest['case_studies'] if x['id']=='comet-december']
    for case in cases:
        prior=next((x for x in previous['targets'] if x['id']==case['id'] and x['status']=='pass'),None) if previous else None
        if prior:
            summary['targets'].append({**prior,'reused_validation_report':str(args.retry_report)})
            continue
        print(case['id'],flush=True)
        path=ROOT/'web/dist'/case['url'].removeprefix('./')
        if sha256_file(path)!=case['sha256']:raise ValueError('Historical case hash differs')
        expected=json.loads(path.read_text(encoding='utf-8'))
        try:
            paths=[inputs[f['observation']['source']['sha256']] for f in expected['frames']]
            ref=expected.get('reference_catalogue')
            ref_inputs=references.get(ref['sha256']) if ref else None
            if len(paths)>1 and ref and ref_inputs is None:raise ValueError('Exact reference snapshot unavailable')
            current=build_sequence(expected['request'],out/case['id'],input_paths=paths,reference_inputs=ref_inputs,progress=lambda m:print('  '+m,flush=True))
            arrays_equal=all(a['arrays']==b['arrays'] for a,b in zip(expected['frames'],current['frames'])) and len(current['frames'])==len(expected['frames'])
            if not arrays_equal:raise AssertionError('Prepared arrays differ from the independently preserved original run')
            item={'id':case['id'],'status':'pass','original_receipt_sha256':case['sha256'],'frames':len(current['frames']),
                  'native_shapes':[p['shape'] if p else None for p in current['native_frames']],
                  'same_original_prepared_arrays':arrays_equal,'playback_modes':current['playback_modes'],
                  'observations':[f['observation'] for f in current['frames']],
                  'failed_checks':[{'a':c['a'],'b':c['b'],'checks':[x['code'] for x in c['screen']['suitability']['checks'] if x['status']=='fail'],
                                    'registration':c['registration']['status']} for c in current['comparisons']],
                  'limitations':'Fixed historical search centre, not a target detection. No target position is silently propagated; catalogue predictions and measurements remain distinct.',
                  'receipt':str((out/case['id']/'sequence.json').relative_to(ROOT))}
        except Exception as exc:item={'id':case['id'],'status':'fail','error':str(exc)}
        summary['targets'].append(item)
        write_report(out,case['id']+'-result.json',json.dumps(item,indent=2))
    # A genuine QR3 pipeline 7.0.5 input, discovered through official SIA.
    smoke=ROOT/'docs/evidence/release-target-validation-20261030T103831.482613Z-d9f72e96'
    row=json.loads((smoke/'qr3-product-sample.json').read_text(encoding='utf-8'))['rows'][0]
    request=SequenceRequest.model_validate({'schema_version':'1.0','kind':'skyshift-observation-request','release':'qr3',
        'region':{'ra_deg':float(row['s_ra']),'dec_deg':float(row['s_dec']),'size_deg':.04,'frame':'icrs'},'max_frames':1,'detector':2})
    qr3=build_sequence(request,out/'qr3',input_paths=[smoke/'qr3-sample.fits']) if not previous else None
    summary['qr3']=previous['qr3'] if previous else {'frames':len(qr3['frames']),'native_shapes':[p['shape'] if p else None for p in qr3['native_frames']],
                    'spectral_basis':[f['processing']['spectral_basis'] for f in qr3['frames']],
                    'rejections':qr3['rejections'],'physical_comparison':False}
    # One bounded live query. This does not prove all-sky archive completeness.
    request={'schema_version':'1.0','kind':'skyshift-observation-request','release':'qr2',
             'region':{'ra_deg':210.80227,'dec_deg':54.34895,'size_deg':.04,'frame':'icrs'},'max_frames':2,'detector':2,'use_cache':False}
    try:
        live=build_sequence(request,out/'live-m101',use_local=False,progress=lambda m:print(m,flush=True)) if not previous else None
        summary['live_discovery']=previous['live_discovery'] if previous else {'status':'pass','frames':len(live['frames']),'selection':live['selection'],
                                   'playback_modes':live['playback_modes'],'rejections':live['rejections']}
    except Exception as exc:summary['live_discovery']={'status':'unavailable','error':str(exc)}
    write_report(out,'summary.json',json.dumps(summary,indent=2,allow_nan=False))
    print(json.dumps({'output':str(out),'targets':[{k:v for k,v in t.items() if k in ['id','status','error','frames']} for t in summary['targets']],
                      'qr3':summary['qr3'],'live':summary['live_discovery'].get('status')}))
    if any(t['status']=='fail' for t in summary['targets']) or not summary['qr3']['frames']:raise SystemExit(1)

if __name__=='__main__':main()
