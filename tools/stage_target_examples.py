"""Publish only the newly prepared, hashed scientific examples; no media rendering."""
import hashlib
import json
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]


def changed(path,raw):
    if not path.exists() or path.read_bytes()!=raw:
        path.write_bytes(raw)


def main():
    report=json.loads((ROOT/'docs/evidence/challenge-readiness-20261029/target-results.json').read_text(encoding='utf-8'))
    output=[]
    for target in report['targets']:
        item={k:target.get(k) for k in ('id','name','status','prepared_frames','playback_eligible','error')}
        item['interpretation']='Prepared field inspection only; source identification, motion and calibrated variability are not established.'
        if target.get('receipt'):
            path=ROOT/target['receipt'];raw=path.read_bytes()
            if hashlib.sha256(raw).hexdigest()!=path.with_name('sequence.sha256').read_text():raise ValueError('Target receipt integrity failed')
            value=json.loads(raw)
            name='sequence-'+target['id']+'.json'
            changed(ROOT/'web/dist/data'/name,raw)
            item.update(url='./data/'+name,sha256=hashlib.sha256(raw).hexdigest(),
                        dates=[f['observation']['time_start_utc'] for f in value['frames']],
                        request=value['request'],created_at_utc=value['created_at_utc'])
        output.append(item)
    status=ROOT/'web/dist/data/target-status.json'
    previous=json.loads(status.read_text(encoding='utf-8')) if status.exists() else {}
    updated={'schema_version':'1.0','scope':report['scope'],'targets':output}
    if previous.get('case_studies'):updated['case_studies']=previous['case_studies']
    changed(status,(json.dumps(updated,indent=2,ensure_ascii=False)+'\n').encode())
    print(json.dumps({'targets':len(output),'prepared_examples':sum('url'in t for t in output)}))


if __name__=='__main__':main()
