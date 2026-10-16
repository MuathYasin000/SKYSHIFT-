"""Verify public release bytes without cookies, credentials, or a browser session."""
from pathlib import Path
from urllib.request import urlopen,Request
from urllib.parse import urljoin
from hashlib import sha256
from time import perf_counter
from datetime import datetime,timezone
import json,zipfile

root=Path(__file__).resolve().parents[1]
origin='https://skyshift-project-mercury.surebream11.chatgpt.site/'
measurements=[]
def get(name,limit):
    start=perf_counter()
    with urlopen(Request(urljoin(origin,name),headers={'User-Agent':'SKYSHIFT-release-verification/0.2'}),timeout=60) as r:
        data=r.read(limit+1);status=r.status;headers=dict(r.headers)
    if len(data)>limit:raise ValueError('Public response exceeds verification limit')
    measurements.append({'path':name,'status':status,'size_bytes':len(data),'elapsed_seconds':perf_counter()-start})
    return data
html=get('',1_000_000).decode();assert 'Scientific approval pending' in html
catalog=json.loads(get('data/catalog.json',1_000_000));raw=get(catalog['bundle_url'],2_000_000)
assert sha256(raw).hexdigest()==catalog['bundle_sha256']
bundle=json.loads(raw);m=bundle['manifest'];assert m['pair_id']=='pair-52ad675d929b0740c23b'
assert m['processing']['scientific_approval']=='PENDING' and m['suitability']['status']=='pending'
assert bundle['registration']['reference_count']==13 and bundle['registration']['policy']['version']=='registration-v2'
for i in range(3):get(catalog['bundle_url'],2_000_000)
prepared=get('data/pair.fits',2_000_000);assert sha256(prepared).hexdigest()==m['prepared_files'][0]['sha256']
expected=sha256((root/'data/exports/m101-review-v6.zip').read_bytes()).hexdigest()
downloaded=Path.home()/'Downloads/m101-review-v6.zip'
assert sha256(downloaded.read_bytes()).hexdigest()==expected
comparison=Path.home()/f"Downloads/SKYSHIFT-{m['pair_id']}-comparison.zip"
with zipfile.ZipFile(comparison) as z:
    payload={n:z.read(n) for n in z.namelist()};saved=json.loads(payload['manifest.json'])
    assert len(saved['annotations'])==1 and saved['annotations'][0]['note'].startswith('QA demonstration:')
    # Preserve an explicitly corrupt control for the browser rejection exercise.
    payload['manifest.json']=b'corrupted test manifest'
    with zipfile.ZipFile(root/'tmp/corrupt-comparison.zip','w',zipfile.ZIP_DEFLATED) as bad:
        for n,b in payload.items():bad.writestr(n,b)
report={'verified_at_utc':datetime.now(timezone.utc).isoformat(),'url':origin,'credentials_used':False,
    'pair_id':m['pair_id'],'review_packet_sha256':expected,'browser_download_matches_snapshot':True,
    'production_comparison_annotations':len(saved['annotations']),'measurements':measurements,
    'performance_scope':'Unauthenticated HTTP transfer timings only, not browser paint, controlled cache, concurrent load, or user-study measurements.',
    'scientific_approval':'PENDING'}
(root/'docs/evidence/public_release_verification.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
print(json.dumps(report,indent=2))
