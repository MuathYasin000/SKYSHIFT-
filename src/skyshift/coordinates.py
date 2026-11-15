"""Explicit zero-based image and ICRS sky conversions."""
import numpy as np
from astropy.wcs import WCS
from .models import SkyRegion


def common_grid(region: SkyRegion, pixel_scale_arcsec: float = 6.15):
    if not 1 <= pixel_scale_arcsec <= 30:
        raise ValueError("Output pixel scale must be between 1 and 30 arcseconds")
    side = int(np.ceil(region.size_deg * 3600 / pixel_scale_arcsec))
    wcs = WCS(naxis=2)
    wcs.wcs.crpix = [(side + 1) / 2, (side + 1) / 2]
    wcs.wcs.cdelt = [-pixel_scale_arcsec / 3600, pixel_scale_arcsec / 3600]
    wcs.wcs.crval = [region.ra_deg, region.dec_deg]
    wcs.wcs.ctype = ["RA---TAN", "DEC--TAN"]
    wcs.wcs.radesys = "ICRS"
    return wcs, (side, side)


def roundtrip_error(wcs, shape):
    ys = np.linspace(0, shape[0] - 1, 7)
    xs = np.linspace(0, shape[1] - 1, 7)
    x, y = np.meshgrid(xs, ys)
    ra, dec = wcs.pixel_to_world_values(x, y)
    xx, yy = wcs.world_to_pixel_values(ra, dec)
    errors = np.hypot(xx - x, yy - y)
    if not np.all(np.isfinite(errors)):
        raise ValueError("Coordinate round trip produced nonfinite values")
    return float(np.max(errors))

