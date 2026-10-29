"""Verify browser-request/Python interoperability without fetching or rendering.

Run verify_challenge_readiness.mjs first to create the five browser downloads.
No scientific target validation or new dataset approval is performed here.
"""
from pathlib import Path
import hashlib
import json
import sys
import tempfile

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT/'src'))
from astropy.coordinates import SkyCoord
from skyshift.archive import parse_sia
from skyshift.intake import intake, read_request
from build_local_release import validate_assets, validate_scientific_assets


def verify():
    evidence = ROOT/'docs/evidence/challenge-readiness-20261029'
    targets = json.loads((ROOT/'config/challenge_targets.json').read_text(encoding='utf-8'))['targets']
    checks = []
    with tempfile.TemporaryDirectory(prefix='skyshift-request-contract-') as temporary:
        for target in targets:
            path = evidence/(target['id']+'-request.json')
            request, raw = read_request(path)
            reference = SkyCoord(target['ra'], target['dec'], frame='icrs')
            assert abs(request.region.ra_deg-reference.ra.deg) < 1e-10, target['id']
            assert abs(request.region.dec_deg-reference.dec.deg) < 1e-10, target['id']
            assert request.region.size_deg == target['fov_arcmin']/60, target['id']
            report = intake(path, Path(temporary)/target['id'])
            assert report['status'] == 'PLANNED' and report['target_validation'] == 'NOT_CONDUCTED'
            assert report['request_sha256'] == hashlib.sha256(raw).hexdigest()
            checks.append({'target': target['id'], 'coordinate_contract': 'PASS', 'offline_intake': 'PASS', 'scientific_target_test': 'NOT_CONDUCTED'})
    # The build can be checked without regenerating any astronomical products.
    validate_assets(ROOT/'web/dist')
    validate_scientific_assets(ROOT/'web/dist')
    assert (ROOT/'config/challenge_targets.json').read_bytes() == (ROOT/'web/dist/challenge-targets.json').read_bytes()
    raw = (evidence/'wise-0855-qr3-response.xml').read_bytes()
    query = json.loads((evidence/'wise-0855-qr3-query.json').read_text(encoding='utf-8'))
    assert hashlib.sha256(raw).hexdigest() == query['response_sha256']
    rows = parse_sia(raw)
    assert len(rows) == query['row_count']
    result = {'scope': 'Engineering resource preparation; not submission readiness or scientific validation',
              'target_contracts': checks, 'existing_scientific_asset_integrity': 'PASS',
              'recorded_wise_0855_qr3_inventory_rows': len(rows),
              'scientific_approval': 'PENDING', 'internal_human_review': 'PENDING',
              'independent_novice_validation': 'NOT_CONDUCTED'}
    (evidence/'resource-contract.json').write_text(json.dumps(result, indent=2)+'\n', encoding='utf-8')
    print(json.dumps(result, indent=2))


if __name__ == '__main__':
    verify()
