import numpy as np
import pytest
from astropy.io import fits
from skyshift.coordinates import common_grid, roundtrip_error
from skyshift.models import SkyRegion
from skyshift.products import quality_mask, parent_pixel_coordinates


def test_source_flag_does_not_remove_astronomical_sources():
    flags = np.array([[0, 1 << 21, 1 << 6, 1 << 29]], dtype=np.uint32)
    valid, unknown, _ = quality_mask(np.ones((1, 4)), flags, np.ones((1, 4)), {"SOURCE": 21, "NONFUNC": 6})
    assert valid.tolist() == [[True, True, False, False]]
    assert unknown == 1


def test_nonfinite_image_and_nonpositive_variance_are_invalid():
    valid, _, _ = quality_mask(np.array([[np.nan, 2, 3]]), np.zeros((1, 3), dtype=np.uint32), np.array([[1, 0, 1]]), {"SOURCE": 21})
    assert valid.tolist() == [[False, False, True]]


def test_conflicting_flag_bit_definitions_are_rejected():
    with pytest.raises(ValueError, match='duplicate'):
        quality_mask(np.ones((1,1)), np.zeros((1,1),dtype=np.uint32), np.ones((1,1)), {'SOURCE':21, 'BAD':21})


def test_parent_mapping_bridges_fits_one_based_and_numpy_zero_based():
    h = fits.Header({"WCSNAMEA": "0-based active pixel coordinates", "CRPIX1A": -10, "CRPIX2A": -20,
                     "CRVAL1A": 0, "CRVAL2A": 0, "CDELT1A": 1, "CDELT2A": 1, "CTYPE1A": "LINEAR", "CTYPE2A": "LINEAR"})
    x, y = parent_pixel_coordinates(h, (2, 3))
    assert x[0].tolist() == [11, 12, 13]
    assert y[:, 0].tolist() == [21, 22]


def test_parent_mapping_rejects_unknown_coordinate_convention():
    with pytest.raises(ValueError, match="convention"):
        parent_pixel_coordinates(fits.Header(), (2, 2))


@pytest.mark.parametrize("ra,dec", [(210.80227, 54.34895), (359.999, -12), (0.001, 85)])
def test_output_grid_roundtrips_across_coordinate_wrap_and_high_declination(ra, dec):
    wcs, shape = common_grid(SkyRegion(ra_deg=ra, dec_deg=dec, size_deg=0.12))
    assert roundtrip_error(wcs, shape) < 0.001
    center = (shape[0] - 1) / 2
    sky = wcs.pixel_to_world_values(center, center)
    assert abs(((sky[0] - ra + 180) % 360) - 180) < 1e-9
    assert abs(sky[1] - dec) < 1e-9

