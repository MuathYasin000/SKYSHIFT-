from types import SimpleNamespace
import numpy as np
import pytest
from photutils.aperture import CircularAperture
from skyshift.target_assessment import aperture_diagnostic,catalogue_position


def synthetic():
    yy,xx=np.indices((61,61));image=3+10*np.exp(-((xx-30.2)**2+(yy-30.3)**2)/2)
    return SimpleNamespace(image=image,variance=np.full_like(image,.04),valid=np.ones_like(image,dtype=bool),
        flags=np.zeros_like(image,dtype=np.uint32),flag_definitions={'SOURCE':21,'OVERFLOW':1},
        wavelength_um=np.full_like(image,1.2),bandwidth_um=np.full_like(image,.03))


def test_aperture_recovers_known_background_subtracted_flux_without_total_flux_claim():
    p=synthetic();r=aperture_diagnostic(p,30.2,30.3)
    w=CircularAperture((30.2,30.3),r=2.5).to_mask(method='exact').to_image(p.image.shape)
    expected=np.sum(w*(p.image-3))
    assert r['status']=='diagnostic_only'
    assert abs(r['flux_mjy_sr_pixel_sum']-expected)<1e-5
    assert r['formal_independent_pixel_error']>np.sqrt(np.sum(w*w*.04))
    assert 'excludes pixel covariance' in r['uncertainty_scope']


def test_invalid_target_core_never_gets_a_flux_or_fabricated_error():
    p=synthetic();p.valid[30,30]=False;p.flags[30,30]=1<<1
    p.image[30,30]=np.nan;p.variance[30,30]=np.nan
    r=aperture_diagnostic(p,30.2,30.3)
    assert r['status']=='unsupported' and r['flux_mjy_sr_pixel_sum'] is None
    assert r['formal_independent_pixel_error'] is None
    assert r['aperture_flags']['OVERFLOW']==1 and r['background']['sample_count']>=30


def test_incomplete_aperture_and_missing_background_are_explicitly_unsupported():
    p=synthetic();assert 'source_aperture_outside_native_image'in aperture_diagnostic(p,0,0)['reasons']
    p.flags[:]=1<<21
    r=aperture_diagnostic(p,30,30)
    assert r['flux_mjy_sr_pixel_sum'] is None and 'insufficient_unflagged_source_free_background'in r['reasons']


def test_propagation_respects_pmra_cosine_and_catalogue_epoch():
    row={'ra':'10','dec':'60','ref_epoch':'2016','pmra':'1000','pmdec':'0','parallax':'100','radial_velocity':''}
    p=catalogue_position(row,'2026-01-01T12:00:00')
    assert abs((p.ra.deg-10)*3600-20)<.02
    with pytest.raises(ValueError):catalogue_position({**row,'parallax':'-1'},'2026-01-01')
