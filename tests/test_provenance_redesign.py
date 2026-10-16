"""Synthetic audit fault controls; these fixtures are never displayed as real sky."""
import base64
import importlib.util
from pathlib import Path

from astropy.io import fits
import numpy as np
import pytest

spec = importlib.util.spec_from_file_location('provenance_audit', Path(__file__).parents[1]/'tools/audit_provenance_redesign.py')
audit = importlib.util.module_from_spec(spec)
spec.loader.exec_module(audit)


def record(a):
    return {'dtype': 'float32', 'shape': list(a.shape), 'data': base64.b64encode(np.asarray(a, dtype='<f4').tobytes()).decode()}


def test_exact_array_and_nan_preservation():
    a = np.array([[1, np.nan], [3, 4]], dtype=np.float32)
    b = audit.decode_array(record(a))
    assert audit.compare_array(a, b)['match']
    assert audit.compare_array(a, b)['max_absolute_difference'] == 0


def test_reject_tampered_dimensions_and_invalid_encoding():
    r = record(np.ones((2, 2)))
    r['shape'] = [2, 3]
    with pytest.raises(ValueError, match='byte count'):
        audit.decode_array(r)
    r['shape'] = [2, 2]
    r['data'] = '?'
    with pytest.raises(ValueError):
        audit.decode_array(r)


def test_nonfinite_change_is_not_silently_accepted():
    assert not audit.compare_array(np.array([np.nan, 1]), np.array([0, 1]))['match']


def test_single_pixel_science_tampering_detected():
    a = np.ones((4, 4), dtype=np.float32)
    b = a.copy(); b[2, 2] += .25
    result = audit.compare_array(a, b)
    assert not result['match']
    assert result['max_absolute_difference'] == .25
    assert result['numeric_sha256_a'] != result['numeric_sha256_b']


def test_fits_dynamic_header_change_is_separated_from_science_data(tmp_path):
    a, b = tmp_path/'a.fits', tmp_path/'b.fits'
    fits.HDUList([fits.PrimaryHDU(), fits.ImageHDU(np.ones((2, 2)), name='IMAGE')]).writeto(a)
    with fits.open(a) as hdul:
        hdul[1].header['DATE'] = '2026-10-16T00:00:00'
        hdul.writeto(b)
    result = audit.compare_fits(a, b)
    assert not result['byte_identical']
    assert result['all_data_equal']
    assert result['hdus'][1]['changed_header_keywords'] == ['DATE']


def test_fits_data_change_is_not_treated_as_header_change(tmp_path):
    a, b = tmp_path/'a.fits', tmp_path/'b.fits'
    fits.HDUList([fits.PrimaryHDU(), fits.ImageHDU(np.ones((2, 2)), name='IMAGE')]).writeto(a)
    with fits.open(a) as hdul:
        hdul[1].data[0, 0] = 2
        hdul.writeto(b)
    assert not audit.compare_fits(a, b)['all_data_equal']


def test_structured_fits_calibration_table_compares_all_columns(tmp_path):
    a, b = tmp_path/'a.fits', tmp_path/'b.fits'
    hdu = fits.BinTableHDU.from_columns([fits.Column(name='X', format='E', array=[1, 2])])
    fits.HDUList([fits.PrimaryHDU(), hdu]).writeto(a)
    with fits.open(a) as hdul:
        hdul.writeto(b)
    assert audit.compare_fits(a, b)['all_data_equal']


def test_inventory_must_match_detector_release_url_and_actual_timestamp():
    obs = {'observation_id': 'test', 'release': 'qr2', 'source': {'source_url': 'https://archive/test?size=.3'},
           'time_start_utc': '2025-12-07T00:00:00Z', 'time_end_utc': '2025-12-07T00:01:00Z'}
    start = float(audit.Time('2025-12-07T00:00:00').mjd)
    end = float(audit.Time('2025-12-07T00:01:00').mjd)
    row = {'obs_id': 'test', 'obs_collection': 'spherex_qr2', 'energy_bandpassname': 'SPHEREx-D2',
           'access_url': 'https://archive/test', 't_min': round(start, 6), 't_max': round(end, 6),
           'obs_publisher_did': 'test-id', 's_pixel_scale': '6.15', 's_xel1': '2040', 's_xel2': '2040', 't_exptime': '60'}
    header = {'OBSID': 'test', 'DETECTOR': 2, 'MJD-BEG': start, 'MJD-END': end,
              'DATE-BEG': '2025-12-07T00:00:00', 'DATE-END': '2025-12-07T00:01:00', 'XPOSURE': 60}
    assert audit.check_inventory(row, header, obs)['match']
    row['energy_bandpassname'] = 'SPHEREx-D5'
    assert not audit.check_inventory(row, header, obs)['match']
    row['energy_bandpassname'] = 'SPHEREx-D2'
    row['t_min'] = start + 1
    assert not audit.check_inventory(row, header, obs)['match']
