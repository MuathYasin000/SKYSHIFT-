"""Build honest DR1/QR3 target caches from live IRSA responses.

Incomplete metadata searches never become a supposedly complete cache.  A
failure manifest is still written so the application can explain the problem
and offer a live retry without substituting QR2 or generated pixels.
"""
from __future__ import annotations

from datetime import datetime, timezone
import json
from pathlib import Path

from skyshift.core import CoreSearchRequest, load_targets, prepare_frame, search_observations
from skyshift.models import SkyRegion


ROOT = Path(__file__).resolve().parents[1]


def build_target(target):
    destination = ROOT/'web/dist/data/targets'/target['id']
    destination.mkdir(parents=True, exist_ok=True)
    request = CoreSearchRequest(
        region=SkyRegion(ra_deg=target['ra_deg'], dec_deg=target['dec_deg'], size_deg=target['fov_arcmin']/60),
        target_id=target['id'],
    )
    result = search_observations(request, progress=lambda message: print(f"{target['id']}: {message}", flush=True))
    now = datetime.now(timezone.utc).isoformat()
    manifest = {
        'schema_version': '2.0', 'kind': 'skyshift-target-cache', 'target_id': target['id'], 'target_name': target['name'],
        'created_at_utc': now, 'source': 'NASA/IPAC IRSA SPHEREx SIA2', 'allowed_releases': ['dr1','qr3'],
        'detectors_requested': [1,2,3,4,5,6], 'reference_epoch': f"J{target['reference_epoch_jyear']:.1f}",
        'astrometry_source_url': target['astrometry_source_url'], 'collections': result['collections'], 'observations': [],
    }
    if result['status'] != 'complete':
        manifest.update(status='unavailable', failure_reason=' '.join(result['failures']) or 'IRSA returned an incomplete metadata search.')
    else:
        failures=[]
        for index, observation in enumerate(result['observations']):
            try:
                frame=prepare_frame(result,index,ROOT/'data/cache/core')
                name=f"frame-{index:04d}.json"
                (destination/name).write_text(json.dumps(frame,separators=(',',':'),allow_nan=False),encoding='utf-8')
                manifest['observations'].append({**observation,'frame_url':f'./data/targets/{target["id"]}/{name}'})
            except Exception as exc:
                failures.append(f"{observation['observation_id']} D{observation['detector']}: {exc}")
        manifest['status']='complete' if not failures else 'partial'
        if failures:manifest['failure_reason']=' '.join(failures)
        if len(manifest['observations'])<2:
            manifest['demo_note']=f"Only {len(manifest['observations'])} real DR1/QR3 frame(s) could be cached; two-frame comparison is unavailable for this target."
    (destination/'manifest.json').write_text(json.dumps(manifest,indent=2,allow_nan=False)+'\n',encoding='utf-8')
    return {'target':target['id'],'status':manifest['status'],'frames':len(manifest['observations']),'reason':manifest.get('failure_reason')}


def main():
    results=[]
    for target in load_targets().values():
        results.append(build_target(target))
    print(json.dumps(results,indent=2))


if __name__ == '__main__':
    main()
