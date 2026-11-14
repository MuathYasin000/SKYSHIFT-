from pathlib import Path

import pytest
from pydantic import ValidationError

from skyshift import core
from skyshift.models import SkyRegion


def request(**values):
    return core.CoreSearchRequest(region=SkyRegion(ra_deg=10, dec_deg=20, size_deg=.1), **values)


def test_core_defaults_to_current_releases_and_all_detectors():
    value = request()
    assert value.releases == ['dr1', 'qr3']
    assert value.detectors == [1, 2, 3, 4, 5, 6]


def test_core_rejects_qr2():
    with pytest.raises(ValidationError, match='Choose DR1 and/or QR3'):
        request(releases=['qr2'])


def test_barnards_star_position_is_propagated_to_observation_epoch():
    target = core.load_targets()['barnards-star']
    moved = core.propagated_position(target, '2025-12-01T00:00:00')
    assert moved['reference_epoch'] == 'J2000.0'
    assert moved['observation_epoch_utc'].startswith('2025-12-01')
    assert moved['dec_deg'] > target['dec_deg'] + .07


def test_search_keeps_all_detectors_and_sorts_by_date(monkeypatch):
    rows = [
        {'observation_id': 'late', 'release': 'dr1', 'detector': 6, 'access_url': 'https://irsa.ipac.caltech.edu/ibe/data/spherex/dr1/level2/a', 'start_mjd': 2.0, 'time_start_utc': '2025-01-02T00:00:00Z', 'wavelength_min_m': 4e-6, 'wavelength_max_m': 5e-6},
        {'observation_id': 'early', 'release': 'dr1', 'detector': 1, 'access_url': 'https://irsa.ipac.caltech.edu/ibe/data/spherex/dr1/level2/b', 'start_mjd': 1.0, 'time_start_utc': '2025-01-01T00:00:00Z', 'wavelength_min_m': .75e-6, 'wavelength_max_m': 1e-6},
    ]
    monkeypatch.setattr(core, '_query_collection', lambda region, collection, progress: (rows if collection == 'spherex_dr1' else [], []))
    result = core.search_observations(request())
    assert result['status'] == 'complete'
    assert [(row['observation_id'], row['detector']) for row in result['observations']] == [('early', 1), ('late', 6)]


def test_search_reports_collection_failure_without_claiming_absence(monkeypatch):
    def query(region, collection, progress):
        if collection == 'spherex_qr3':
            raise OSError('HTTP 502')
        return [], []
    monkeypatch.setattr(core, '_query_collection', query)
    result = core.search_observations(request())
    assert result['status'] == 'partial_or_unavailable'
    assert result['observation_count'] == 0
    assert 'HTTP 502' in result['failures'][0]
    assert 'not treated as zero observations' in result['message']
