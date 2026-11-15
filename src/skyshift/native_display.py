"""Read-only native display diagnostics. Never used to admit temporal comparisons."""
from __future__ import annotations
import base64
import hashlib
from pathlib import Path
import numpy as np
from astropy.visualization import ZScaleInterval
from astropy.wcs.utils import proj_plane_pixel_scales, proj_plane_pixel_area


def encode_native(array, dtype):
    a = np.ascontiguousarray(array, dtype=np.dtype(dtype))
    raw = a.tobytes()
    return dict(dtype=dtype, shape=list(a.shape), data=base64.b64encode(raw).decode(),
                sha256=hashlib.sha256(raw).hexdigest())


def distribution(values):
    values = np.asarray(values)
    values = values[np.isfinite(values)]
    if not values.size:
        return dict(count=0, mean=None, median=None, variance=None, histogram=None)
    counts, edges = np.histogram(values, bins=64)
    return dict(count=int(values.size), min=float(values.min()), max=float(values.max()),
                mean=float(values.mean()), median=float(np.median(values)),
                variance=float(np.var(values)), variance_estimator='population ddof=0',
                histogram=dict(counts=counts.tolist(), edges=edges.tolist()))


def native_diagnostics(p):
    h, w = p.image.shape
    finite = np.isfinite(p.image)
    missing_bit = p.flag_definitions.get('MISSING_DATA')
    missing = (p.flags & (1 << missing_bit)) != 0 if missing_bit is not None else np.zeros_like(p.valid)
    # Disjoint, auditable categories. Flags can have multiple simultaneous causes.
    nonfinite = ~finite & ~missing
    quality = ~p.valid & ~missing & ~nonfinite
    corners = p.wcs.pixel_to_world([-0.5, w-.5, w-.5, -.5], [-.5, -.5, h-.5, h-.5])
    scale = proj_plane_pixel_scales(p.wcs) * 3600
    valid_values = p.image[p.valid]
    if not valid_values.size:
        raise ValueError('No usable native values for display')
    lo, hi = np.percentile(valid_values, [1, 99.5])
    zl, zh = ZScaleInterval(n_samples=1000, contrast=.25).get_limits(valid_values)
    return dict(shape=[h,w], pixel_count=h*w, valid_pixels=int(p.valid.sum()),
        valid_percentage=float(p.valid.mean()*100),
        coverage=dict(corners_icrs_deg=np.column_stack([corners.ra.deg,corners.dec.deg]).tolist(),
            pixel_scale_arcsec=scale.tolist(),
            projected_extent_arcmin=[float(w*scale[0]/60),float(h*scale[1]/60)],
            projected_area_sq_deg=float(abs(proj_plane_pixel_area(p.wcs))*h*w),
            note='Detector-axis extents and tangent-plane area; not a north-up rectangular footprint. SIP WCS retained in original FITS.'),
        categories=dict(valid=int(p.valid.sum()),missing_data=int(missing.sum()),
            nonfinite_without_missing_flag=int(nonfinite.sum()),quality_excluded=int(quality.sum())),
        flag_counts={name:int(np.count_nonzero(p.flags & (1<<bit))) for name,bit in p.flag_definitions.items()},
        finite_science=distribution(p.image[finite]), valid_science=distribution(valid_values),
        native_measurement_variance=distribution(p.variance[p.valid]),
        background=dict(value=float(np.median(valid_values)),unit='MJy/sr',
            method='Median of all valid pixels; includes sources and diffuse emission. Display diagnostic, not fitted sky or subtracted background.'),
        display=dict(percentile=dict(vmin=float(lo),vmax=float(max(hi,lo+1e-6)),percentiles=[1,99.5]),
            zscale=dict(vmin=float(zl),vmax=float(max(zh,zl+1e-6)),n_samples=1000,contrast=.25,implementation='astropy.visualization.ZScaleInterval'),
            stretch='asinh',asinh_a=.1,contrast=1,palette='grayscale',interpolation='nearest'),
        interpretation='Masked values are not evidence of a dead detector. Finite unflagged values may still include noise or artifacts; no pixel-level astrophysical classification is established.')


def native_payload(product, region):
    """Portable original detector pixels for inspection, never pair approval.

    Celestial arrays are evaluated by Astropy including SIP distortion. The
    native axes remain independent for each exposure; only the sequence's
    separately reprojected arrays may participate in fixed-sky playback.
    """
    if product.image.size>1_000_000:
        raise ValueError('Native inspection exceeds its one-million-pixel bound')
    obs=product.observation.model_dump(mode='json')
    for role in ('source','spectral_calibration'):
        if obs.get(role):obs[role]['path']=Path(obs[role]['path']).name
    y,x=np.indices(product.image.shape)
    sky=product.wcs.pixel_to_world(x,y)
    arrays={name:encode_native(array,dtype) for name,array,dtype in (
        ('SCI',product.image,'<f4'),('VALID',product.valid,'|u1'),
        ('FLAGS',product.flags,'<u4'),('VARIANCE',product.variance,'<f4'),
        ('WAVE',product.wavelength_um,'<f4'),('RA',sky.ra.deg,'<f8'),
        ('DEC',sky.dec.deg,'<f8'))}
    return dict(schema_version='1.0',kind='spherex_native_display',usage='single_observation_only',
        scientific_approval='PENDING',observation=obs,shape=list(product.image.shape),
        flag_definitions=product.flag_definitions,diagnostics=native_diagnostics(product),arrays=arrays,
        orientation='Native detector axes; x right, y up. Not north up.',
        region=region.model_dump(mode='json'),wcs_header=product.wcs.to_header(relax=True).tostring(),
        processing='No reprojection, interpolation, inpainting, background subtraction or PSF matching. Original arrays unchanged.',
        temporal_comparison_allowed=False)
