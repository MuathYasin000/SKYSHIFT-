"""Native display never modifies or promotes scientific evidence."""
import base64
import hashlib
import json
from pathlib import Path
from types import SimpleNamespace
import numpy as np
from astropy.wcs import WCS
from skyshift.native_display import distribution,native_diagnostics,encode_native

ROOT=Path(__file__).resolve().parents[1]

def test_native_statistics_distinguish_missing_flags_nonfinite_and_quality_without_mutation():
    image=np.array([[1.,2.,np.nan],[4.,5.,6.]])
    flags=np.array([[0,512,0],[64,0,0]],dtype=np.uint32)
    variance=np.array([[1.,1.,1.],[1.,0.,1.]])
    valid=np.array([[True,False,False],[False,False,True]])
    wcs=WCS(naxis=2);wcs.wcs.ctype=['RA---TAN','DEC--TAN'];wcs.wcs.crval=[359.99,80];wcs.wcs.crpix=[2,1.5];wcs.wcs.cdelt=[-6.15/3600,6.15/3600]
    p=SimpleNamespace(image=image,flags=flags,variance=variance,valid=valid,wcs=wcs,flag_definitions={'SOURCE':21,'MISSING_DATA':9,'NONFUNC':6})
    before=[a.copy() for a in (image,flags,variance,valid)];d=native_diagnostics(p)
    assert d['categories']==dict(valid=2,missing_data=1,nonfinite_without_missing_flag=1,quality_excluded=2)
    assert d['valid_science']['mean']==3.5
    assert d['valid_science']['variance']==6.25
    assert d['valid_science']['histogram']['counts'][0]==1
    assert sum(d['valid_science']['histogram']['counts'])==2
    for a,b in zip((image,flags,variance,valid),before):np.testing.assert_array_equal(a,b)


def test_target_cache_manifests_use_only_current_releases_and_report_failures_honestly():
    targets = ROOT / 'web/dist/data/targets'
    manifests = list(targets.glob('*/manifest.json'))
    assert len(manifests) == 5
    for path in manifests:
        manifest = json.loads(path.read_text(encoding='utf-8'))
        assert manifest['allowed_releases'] == ['dr1', 'qr3']
        assert manifest['detectors_requested'] == [1, 2, 3, 4, 5, 6]
        assert all(row.get('release') in ('dr1', 'qr3') for row in manifest['observations'])
        if not manifest['observations']:
            assert manifest['status'] == 'unavailable'
            assert manifest['failure_reason']


def test_native_encoding_retains_32_bit_flags_and_histograms_count_only_finite_values():
    a=np.array([[2**31,2**21,0]],dtype=np.uint32)
    encoded=encode_native(a,'<u4')
    np.testing.assert_array_equal(np.frombuffer(base64.b64decode(encoded['data']),dtype='<u4'),a.ravel())
    assert distribution([np.nan,np.inf])['count']==0
    assert sum(distribution([-2.,0.,3.,np.inf])['histogram']['counts'])==3


def test_live_native_payload_preserves_pixels_coordinates_and_public_source_identity():
    from skyshift.native_display import native_payload
    from skyshift.models import SkyRegion
    image=np.array([[1.,2.],[3.,4.]],dtype=np.float32)
    flags=np.array([[0,2**21],[2**6,0]],dtype=np.uint32)
    variance=np.ones((2,2),dtype=np.float32)
    wcs=WCS(naxis=2);wcs.wcs.ctype=['RA---TAN','DEC--TAN'];wcs.wcs.crval=[10.,20.]
    wcs.wcs.crpix=[1.5,1.5];wcs.wcs.cdelt=[-.001,.001]
    obs=SimpleNamespace(model_dump=lambda **kwargs:{'observation_id':'synthetic-control',
        'source':{'path':'private/host/original.fits','sha256':'a'*64},'spectral_calibration':None})
    product=SimpleNamespace(image=image,flags=flags,variance=variance,valid=np.array([[True,True],[False,True]]),
        wavelength_um=np.full((2,2),1.3,dtype=np.float32),wcs=wcs,
        flag_definitions={'SOURCE':21,'NONFUNC':6},observation=obs)
    payload=native_payload(product,SkyRegion(ra_deg=10.,dec_deg=20.,size_deg=.04))
    assert payload['observation']['source']['path']=='original.fits'
    assert payload['temporal_comparison_allowed'] is False
    assert payload['shape']==[2,2]
    for name,expected in [('SCI',image),('FLAGS',flags),('VARIANCE',variance)]:
        array=payload['arrays'][name]
        decoded=np.frombuffer(base64.b64decode(array['data']),dtype=array['dtype']).reshape((2,2))
        np.testing.assert_array_equal(decoded,expected)
    y,x=np.indices((2,2));sky=wcs.pixel_to_world(x,y)
    for name,expected in [('RA',sky.ra.deg),('DEC',sky.dec.deg)]:
        decoded=np.frombuffer(base64.b64decode(payload['arrays'][name]['data']),dtype='<f8').reshape((2,2))
        np.testing.assert_array_equal(decoded,expected)
