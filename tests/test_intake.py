import hashlib
import json
import math
from urllib.parse import parse_qs, urlsplit

import pytest

from skyshift.archive import sia_query
from skyshift.intake import intake, inventory_summary, read_request
from skyshift.models import SkyRegion


def request_file(tmp_path, **updates):
    data = {'schema_version': '1.0', 'kind': 'skyshift-observation-request', 'release': 'qr3',
            'region': {'ra_deg': 133.79512916666668, 'dec_deg': -7.245147222222222, 'size_deg': .2, 'frame': 'icrs'}}
    data.update(updates)
    p = tmp_path/'request.json'
    p.write_text(json.dumps(data), encoding='utf-8')
    return p


def test_plan_is_offline_and_retains_exact_request_and_pending_status(monkeypatch, tmp_path):
    monkeypatch.setattr('skyshift.intake.inventory', lambda *a, **k: pytest.fail('Offline plans cannot access the archive'))
    p = request_file(tmp_path)
    out = tmp_path/'plan'
    report = intake(p, out)
    assert report['status'] == 'PLANNED'
    assert report['request_sha256'] == hashlib.sha256(p.read_bytes()).hexdigest()
    assert (out/'request.json').read_bytes() == p.read_bytes()
    assert report['scientific_approval'] == 'PENDING'
    assert report['target_validation'] == 'NOT_CONDUCTED'
    with pytest.raises(FileExistsError):
        intake(p, out)


def test_query_encloses_requested_square_and_selects_separate_release_survey():
    region = SkyRegion(ra_deg=.01, dec_deg=-89, size_deg=.5)
    params, url = sia_query(region, 'qr3', deep=True)
    assert params['COLLECTION'] == 'spherex_qr3_deep'
    assert math.isclose(float(params['POS'].split()[-1]), .5 / math.sqrt(2))
    assert params['MAXREC'] == '5000'
    assert parse_qs(urlsplit(url).query)['COLLECTION'] == ['spherex_qr3_deep']


def test_failed_intake_preserves_failure_without_promotion(monkeypatch, tmp_path):
    def fail(*args, **kwargs):
        raise ValueError('Archive query OVERFLOW')
    monkeypatch.setattr('skyshift.intake.inventory', fail)
    p = request_file(tmp_path)
    with pytest.raises(ValueError, match='OVERFLOW'):
        intake(p, tmp_path/'failed', query=True)
    report = json.loads((tmp_path/'failed/intake.json').read_text())
    assert report['status'] == 'FAILED'
    assert report['target_validation'] == 'NOT_CONDUCTED'
    assert 'summary' not in report


def test_inventory_candidates_do_not_become_validated_epochs(monkeypatch, tmp_path):
    rows = [{'t_min': '9'}, {'t_min': '10'}, {'t_min': '9'}, {'t_min': 'NaN'}, {'t_min': None}]
    monkeypatch.setattr('skyshift.intake.inventory', lambda *a, **k: rows)
    result = intake(request_file(tmp_path), tmp_path/'queried', query=True)
    assert result['status'] == 'INVENTORIED'
    s = result['summary']
    assert s['candidate_rows'] == 5 and s['distinct_start_values'] == 2
    assert s['time_min_mjd_raw'] == 9 and s['time_max_mjd_raw'] == 10
    assert s['missing_or_invalid_start_values'] == 2
    assert s['comparison_status'] == 'NOT_SCREENED'
    assert inventory_summary([])['distinct_start_values'] == 0


@pytest.mark.parametrize('updates', [{'release': 'qr9'}, {'kind': 'evidence'}, {'schema_version': '2.0'}, {'unexpected': True},
    {'region': {'ra_deg': 360, 'dec_deg': 0, 'size_deg': .2}},
    {'region': {'ra_deg': 1, 'dec_deg': 91, 'size_deg': .2}},
    {'region': {'ra_deg': 1, 'dec_deg': 0, 'size_deg': 100}}])
def test_unsupported_requests_fail_before_output_creation(tmp_path, updates):
    with pytest.raises(ValueError):
        intake(request_file(tmp_path, **updates), tmp_path/'invalid')
    assert not (tmp_path/'invalid').exists()


@pytest.mark.parametrize('region', [
    {'ra_deg': True, 'dec_deg': 0, 'size_deg': .2},
    {'ra_deg': '133', 'dec_deg': 0, 'size_deg': .2},
    {'ra_deg': 133, 'dec_deg': 0, 'size_deg': .001},
])
def test_intake_matches_browser_numeric_and_fov_contract(tmp_path, region):
    with pytest.raises(ValueError):
        intake(request_file(tmp_path, region=region), tmp_path/'invalid')
    assert not (tmp_path/'invalid').exists()


def test_duplicate_json_keys_and_oversize_requests_are_rejected(tmp_path):
    p = tmp_path/'request.json'
    p.write_text('{"release":"qr2","release":"qr3"}')
    with pytest.raises(ValueError, match='Duplicate'):
        read_request(p)
    p.write_bytes(b' ' * 16_385)
    with pytest.raises(ValueError, match='16 KiB'):
        read_request(p)
