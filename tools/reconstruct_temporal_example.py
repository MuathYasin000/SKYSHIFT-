"""Rebuild the pinned temporal example with the native engine and exact originals.

No candidate search or threshold changes. Only missing pinned inputs are fetched.
Output must be a new directory; fresh acquisition events retain their true dates.
"""
from pathlib import Path
import argparse
import json
import math
import sys

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'src'))
from skyshift.archive import download,sha256_file
from skyshift.sequence import build_sequence


def compare_diagnostics(expected,actual,path='',differences=None):
    """Platform fit noise only; decisions, identities, policies and screens exact.

    Continuous registration diagnostics allow 1e-6 absolute + 1e-9 relative
    numerical error. This is a reconstruction tolerance, never a science gate.
    """
    differences=[] if differences is None else differences
    if isinstance(expected,dict):
        assert expected.keys()==actual.keys(),path
        for key in expected:compare_diagnostics(expected[key],actual[key],path+'/'+key,differences)
    elif isinstance(expected,list):
        assert len(expected)==len(actual),path
        for i,(a,b) in enumerate(zip(expected,actual)):compare_diagnostics(a,b,path+'/'+str(i),differences)
    elif expected!=actual:
        assert isinstance(expected,float) and isinstance(actual,(int,float)) and '/registration/' in path and '/policy/' not in path,path
        assert math.isclose(expected,actual,abs_tol=1e-6,rel_tol=1e-9),path
        differences.append({'path':path,'absolute_difference':abs(expected-actual)})
    return differences


def reconstruct(output):
    output=Path(output)
    output.mkdir(parents=True,exist_ok=False)
    spec=json.loads((ROOT/'config/temporal_example.json').read_text(encoding='utf-8'))
    prepared=ROOT/'web/dist'/spec['prepared_url']
    if sha256_file(prepared)!=spec['prepared_sha256']:raise ValueError('Prepared example identity differs')
    expected=json.loads(prepared.read_text(encoding='utf-8'))
    inputs=[];events=[]
    for record in spec['sources']:
        path=ROOT/'data/cache/cutouts'/Path(record['path']).name
        acquired=download(record['source_url'],path,max_bytes=record['size_bytes'])
        if acquired.sha256!=record['sha256']:raise ValueError('Pinned archive input identity differs')
        events.append(acquired.model_dump(mode='json'))
        inputs.append(path)
    record=spec['calibration'];path=ROOT/'data/calibration'/Path(record['path']).name
    acquired=download(record['source_url'],path,max_bytes=record['size_bytes'])
    if acquired.sha256!=record['sha256']:raise ValueError('Pinned calibration differs')
    events.append(acquired.model_dump(mode='json'))
    csv_path,query_path=ROOT/spec['reference_csv'],ROOT/spec['reference_query']
    if sha256_file(csv_path)!=spec['reference_sha256']:raise ValueError('Reference snapshot differs')
    actual=build_sequence(expected['request'],output/'prepared',input_paths=inputs,
                          reference_inputs=(csv_path,query_path))
    arrays=[]
    for old,new in zip(expected['frames'],actual['frames'],strict=True):
        assert old['observation']['observation_id']==new['observation']['observation_id']
        for key,value in old['arrays'].items():
            assert value['numeric_sha256']==new['arrays'][key]['numeric_sha256'],key
            arrays.append({'observation_id':old['observation']['observation_id'],'array':key,'numeric_sha256':value['numeric_sha256']})
    differences=compare_diagnostics(expected['comparisons'],actual['comparisons'])
    assert actual['playback_eligible'] is True
    report={'status':'pass','scope':'Exact-input numerical reconstruction, not independent scientific approval or physical-change detection',
            'numeric_arrays':arrays,'scientific_decisions_identical':True,'diagnostics_exact':not differences,
            'diagnostic_tolerance':{'absolute':1e-6,'relative':1e-9,'scope':'Continuous registration fit diagnostics only; all policies, masks, screens and decisions exact'},
            'diagnostic_differences':differences,'acquisition_events':events,
            'historical_example_sha256':spec['prepared_sha256'],'scientific_approval':'PENDING'}
    (output/'reconstruction.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
    return {'status':'pass','numeric_arrays':len(arrays),'scientific_decisions':'identical','diagnostics_exact':not differences,'output':str(output)}


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output',type=Path,required=True)
    print(json.dumps(reconstruct(parser.parse_args().output)))
