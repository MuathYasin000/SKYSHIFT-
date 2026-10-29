"""Read-only checks of the user's actual Netlify baseline; never publishes."""
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import urllib.request

BASE='https://skyshiftt.netlify.app/'
OUT=Path(__file__).resolve().parents[1]/'docs/evidence/repair-20261018/production-assets.json'


def get(path, method='GET'):
    with urllib.request.urlopen(urllib.request.Request(BASE+path, method=method),timeout=30) as r:
        return r.read(),dict(r.headers),r.status


def run():
    release=json.loads(get('release.json')[0]);version=json.loads(get('version.json')[0])
    catalog=json.loads(get('data/catalog.json')[0]);exposures=json.loads(get('data/explore-catalog.json')[0])
    requests={catalog['bundle_url'].removeprefix('./'):catalog['bundle_sha256']}
    bundle=json.loads(get('data/bundle.json')[0])
    requests[bundle['prepared_fits_url'].removeprefix('./')]=bundle['manifest']['prepared_files'][0]['sha256']
    for f in exposures['fields']:
        for o in f['observations']:requests[o['url'].removeprefix('./')]=o['sha256']
    for part in catalog['review_packet']['parts']:requests[part['url'].removeprefix('./')]=part['sha256']
    # Check the published baseline's declared UI identity, not the repaired local files.
    for name in ['site.js','website-bootstrap.js','hero-model.js']:
        requests[name]=release['source_asset_sha256'][name]
    def verify(item):
        path,expected=item;data,headers,status=get(path)
        return dict(path=path,status=status,sha256=hashlib.sha256(data).hexdigest(),expected_sha256=expected,
                    match=hashlib.sha256(data).hexdigest()==expected,size_bytes=len(data),headers=headers),data
    with ThreadPoolExecutor(max_workers=4) as pool:rows=list(pool.map(verify,requests.items()))
    results=[r for r,data in rows];by_path={r['path']:data for r,data in rows}
    joined=b''.join(by_path[p['url'].removeprefix('./')] for p in catalog['review_packet']['parts'])
    final=hashlib.sha256(joined).hexdigest()
    audit=json.loads(get('data/provenance-audit.json')[0])
    mime=[]
    for suffix in ['.js','.json','.fits','.glb','.bin']:
        path=next(p for p in release['source_asset_sha256'] if p.endswith(suffix))
        _,headers,status=get(path,'HEAD');mime.append(dict(path=path,status=status,headers=headers))
    result=dict(checked_at_utc=datetime.now(timezone.utc).isoformat(),base_url=BASE,
                release_id=release['release_id'],content_id=release['content_id'],version_matches=version['content_id']==release['content_id'],
                deployment_id=release.get('deployment_id'),scope='Published baseline only. Local repairs have not been deployed.',
                scientific_approval='PENDING',files=results,mime=mime,review_archive_sha256=final,
                review_archive_match=final==audit['deployed']['review_packet_sha256'])
    OUT.write_text(json.dumps(result,indent=2)+'\n',encoding='utf-8')
    assert all(r['match'] for r in results) and result['review_archive_match'] and result['version_matches']
    print(json.dumps(dict(status='pass',files=len(results),release_id=result['release_id'],content_id=result['content_id'],mime={r['path']:r['headers'].get('Content-Type') for r in mime})))


if __name__=='__main__':run()
