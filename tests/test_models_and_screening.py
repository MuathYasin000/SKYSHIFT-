from datetime import datetime, timezone, timedelta
from dataclasses import replace
import numpy as np
import pytest
from astropy.io import fits
from pydantic import ValidationError
from skyshift.coordinates import common_grid
from skyshift.models import SkyRegion, Observation, FileRecord, CheckResult, Suitability, DisplaySettings
from skyshift.products import Product
from skyshift.suitability import screen_pair

REGION = SkyRegion(ra_deg=210.80227, dec_deg=54.34895, size_deg=0.04)


def fixture_product(identifier="A", offset_days=0, wavelength=1.2):
    grid, shape = common_grid(REGION)
    now = datetime(2025, 1, 1, tzinfo=timezone.utc) + timedelta(days=offset_days)
    f = FileRecord(path="fixture.fits", sha256="a" * 64, size_bytes=100, source_url="https://irsa.ipac.caltech.edu/fixture")
    o = Observation(observation_id=identifier, release="qr2", detector=2, pipeline_version="6.4+psffix1", time_start_utc=now,
        time_end_utc=now + timedelta(seconds=115), original_timescale="utc", science_unit="MJy/sr", source=f, spectral_calibration=f,
        center_wavelength_um=wavelength, center_bandwidth_um=0.03, hdus=["IMAGE", "FLAGS", "VARIANCE"])
    return Product(o, np.ones(shape), np.zeros(shape, dtype=np.uint32), np.ones(shape), np.ones(shape, dtype=bool), np.full(shape, wavelength),
                   np.full(shape, 0.03), grid, fits.Header(), {"SOURCE": 21}, 0, [], "calibration_cwave_cband")


def test_passing_engineering_screen_does_not_claim_scientific_approval():
    report, _ = screen_pair(fixture_product(), fixture_product("B", 4), REGION)
    assert report["suitability"]["status"] == "pending"
    assert any(c["code"] == "scientific_review" and c["status"] == "pending" for c in report["suitability"]["checks"])


def test_same_physical_observation_is_rejected():
    report, _ = screen_pair(fixture_product(), fixture_product(), REGION)
    assert report["suitability"]["status"] == "rejected"


def test_matching_center_with_incompatible_edge_is_rejected():
    a = fixture_product(); b = fixture_product("B", 4)
    b.wavelength_um[:, -5:] += 0.03
    report, _ = screen_pair(a, b, REGION)
    check = next(c for c in report["suitability"]["checks"] if c["code"] == "local_spectral_screen")
    assert check["status"] == "fail"


def test_unknown_flag_pixels_cannot_pass():
    b = replace(fixture_product("B", 4), unknown_flag_pixels=1)
    report, _ = screen_pair(fixture_product(), b, REGION)
    assert report["suitability"]["status"] == "rejected"


def test_visualization_spectra_cannot_approve_science_screen():
    b = replace(fixture_product("B", 4), spectral_basis="visualization_wcs_wave_only")
    report, _ = screen_pair(fixture_product(), b, REGION)
    assert report["suitability"]["status"] == "rejected"


def test_missing_provenance_cannot_pass():
    b = fixture_product("B", 4)
    b.observation.source.source_url = None
    report, _ = screen_pair(fixture_product(), b, REGION)
    assert report["suitability"]["status"] == "rejected"


def test_missing_common_coverage_is_rejected():
    b = fixture_product("B", 4);b.valid[:] = False
    report, _ = screen_pair(fixture_product(), b, REGION)
    assert report["suitability"]["status"] == "rejected"


def test_models_block_acceptance_with_pending_checks():
    with pytest.raises(ValidationError, match="pending"):
        Suitability(policy_version="test", status="accepted_qualitative", checks=[CheckResult(code="alignment", status="pending", explanation="Not checked")], limitations=[])


@pytest.mark.parametrize("lo,hi", [(1, 1), (2, 1), (float('nan'), 2)])
def test_display_limits_must_be_finite_and_ordered(lo, hi):
    with pytest.raises(ValidationError):
        DisplaySettings(vmin=lo, vmax=hi)


def test_observation_times_need_timezone():
    values = fixture_product().observation.model_dump()
    values['time_start_utc'] = datetime(2025, 1, 1)
    with pytest.raises(ValidationError, match="timezone"):
        Observation(**values)
