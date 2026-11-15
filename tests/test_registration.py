import numpy as np
from dataclasses import replace
from astropy.io import fits
from astropy.coordinates import SkyCoord
from skyshift.models import SkyRegion
from skyshift.coordinates import common_grid
from skyshift.registration import fit_reference, integrated_gaussian, measure_registration
from test_models_and_screening import fixture_product


def scene(shift=(0,0), count=8,profile_b=(.8,.9),background_b=2.0):
    region=SkyRegion(ra_deg=210.8,dec_deg=54.3,size_deg=.18)
    wcs,shape=common_grid(region)
    a=fixture_product();b=fixture_product('B',4)
    y,x=np.indices(shape,dtype=float)
    rng=np.random.default_rng(127)
    img_a=np.full(shape,2.0);img_b=np.full(shape,background_b);catalogue=[]
    positions=[(20,20),(50,20),(80,20),(20,50),(80,50),(20,80),(50,80),(80,80)][:count]
    for i,(cx,cy) in enumerate(positions):
        img_a+=integrated_gaussian([40,cx,cy,.8,.9,0,0,0],x,y)
        img_b+=integrated_gaussian([40,cx+shift[0],cy+shift[1],*profile_b,0,0,0],x,y)
        ra,dec=wcs.pixel_to_world_values(cx,cy)
        catalogue.append(dict(source_id=str(i),ra=str(ra),dec=str(dec),ref_epoch='2016',pmra='0',pmdec='0',parallax='0'))
    img_a+=rng.normal(0,.02,shape);img_b+=rng.normal(0,.02,shape)
    def update(product,image):
        return replace(product,image=image,variance=np.full(shape,.02**2),valid=np.ones(shape,dtype=bool),wcs=wcs)
    return update(a,img_a),update(b,img_b),catalogue,region


def test_known_subpixel_shift_is_measured_without_a_fitted_correction():
    a,b,c,r=scene((.12,-.07))
    result=measure_registration(a,b,c,r)
    assert result['status']=='pass'
    assert result['reference_count']==8
    assert abs(result['median_residual_pixels']-np.hypot(.12,.07))<.02


def test_large_offset_is_not_removed_to_make_registration_pass():
    a,b,c,r=scene((.8,0))
    result=measure_registration(a,b,c,r)
    assert result['status']=='fail'
    assert result['median_residual_pixels']>.7


def test_two_well_matching_stars_do_not_pass_coverage_gate():
    a,b,c,r=scene((0,0),count=2)
    result=measure_registration(a,b,c,r)
    assert result['reference_count']==2
    assert result['status']=='fail'


def test_masked_source_center_is_rejected():
    a,_,_,_=scene()
    a.valid[19:22,19:22]=False
    result=fit_reference(a.image,a.variance,a.valid,20,20)
    assert result['status']=='rejected'
    assert result['reason']=='flagged_or_missing_source_support'


def test_synthetic_background_offset_does_not_become_position_shift():
    a,b,c,r=scene(background_b=4.0)
    result=measure_registration(a,b,c,r)
    assert result['status']=='pass'
    assert result['median_residual_pixels']<.02


def test_synthetic_psf_broadening_is_recorded_without_a_motion_claim():
    a,b,c,r=scene(profile_b=(1.1,1.2))
    result=measure_registration(a,b,c,r)
    assert result['status']=='pass'
    assert result['median_residual_pixels']<.02
    ratios=[ref['b']['profile_fwhm_pixels']/ref['a']['profile_fwhm_pixels'] for ref in result['references'] if ref['status']=='measured']
    assert np.median(ratios)>1.25


def test_native_sources_outside_declared_context_do_not_inflate_coverage():
    a,b,c,r=scene()
    smaller=r.model_copy(update={'size_deg':.08})
    result=measure_registration(a,b,c,smaller)
    assert result['status']=='fail' and result['reference_count']==0
    assert all(ref['reason']=='outside_declared_registration_context' for ref in result['references'])
