from pathlib import Path
import numpy as np
import pytest
from astropy.io import fits
from skyshift.models import SkyRegion
from skyshift.products import read_product, read_spectral_calibration


def test_reader_rejects_a_press_image_or_incomplete_fits(tmp_path):
    p = tmp_path / 'illustration.fits'
    fits.PrimaryHDU(np.ones((8, 8))).writeto(p)
    with pytest.raises(ValueError, match='IMAGE'):
        read_product(p, SkyRegion(ra_deg=210, dec_deg=54, size_deg=.04))


def test_reader_checks_saved_input_hash_before_parsing(tmp_path):
    from skyshift.archive import record_file
    p = tmp_path / 'input.fits';p.write_bytes(b'original')
    p.with_suffix('.fits.source.json').write_text(record_file(p, 'https://irsa.ipac.caltech.edu/input.fits').model_dump_json())
    p.write_bytes(b'changed')
    with pytest.raises(ValueError, match='checksum'):
        read_product(p, SkyRegion(ra_deg=210, dec_deg=54, size_deg=.04))


def test_spectral_calibration_checks_detector_before_sampling(tmp_path):
    h = fits.Header({'WCSNAMEA':'0-based active pixel coordinates', 'CRPIX1A':1, 'CRPIX2A':1,
        'CRVAL1A':0, 'CRVAL2A':0, 'CDELT1A':1, 'CDELT2A':1, 'CTYPE1A':'LINEAR', 'CTYPE2A':'LINEAR', 'DETECTOR':2,'DETCOORD':'sky'})
    p = tmp_path / 'wrong_detector.fits'
    layer = fits.ImageHDU(np.ones((2,2)), name='CWAVE');layer.header['DETECTOR']=3
    fits.HDUList([fits.PrimaryHDU(),layer]).writeto(p)
    with pytest.raises(ValueError, match='detectors differ'):
        read_spectral_calibration(p, h, (2,2))

