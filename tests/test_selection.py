import io
import json
from pathlib import Path
from unittest.mock import patch

import numpy as np
import pytest
from astropy.io import fits
from astropy.wcs import WCS

from skyshift.archive import fetch_header_prefix
from skyshift.selection import footprint_contains,choose_compatible,metadata_pool,evaluate_header,preselect
from skyshift.sequence import SequenceRequest

REQUEST={'schema_version':'1.0','kind':'skyshift-observation-request','release':'qr2',
         'region':{'ra_deg':0.,'dec_deg':0.,'size_deg':.04}}


@pytest.mark.parametrize('extra',[{'start_date':'2026-02-30'},{'start_date':'2026-08-01','end_date':'2026-01-01'},
    {'selection':'guess'},{'wavelength_um':True},{'wavelength_um':.5}])
def test_selection_inputs_are_strict(extra):
    with pytest.raises(ValueError):SequenceRequest.model_validate({**REQUEST,**extra})


def test_spherical_footprint_handles_wrap_poles_and_invalid_polygons():
    assert footprint_contains('POLYGON ICRS 359 -1 1 -1 1 1 359 1',[0],[0])
    assert not footprint_contains('POLYGON ICRS 359 -1 1 -1 1 1 359 1',[2],[0])
    assert footprint_contains('POLYGON ICRS 0 88 90 88 180 88 270 88',[30],[89.9])
    with pytest.raises(ValueError):footprint_contains('POLYGON GALACTIC 0 0 1 0 1 1',[0],[0])


def probe(name,wave,day,version='6.5.7'):
    return {'observation_id':name,'pipeline_version':version,'t_min':day,
            'sample_wavelengths_um':[wave]*25,'sample_bandwidths_um':[.04]*25}


def test_selector_prefers_matching_wavelengths_to_chronological_endpoints():
    rows=[probe('early',1.1,1),probe('middle-a',1.3,20),probe('middle-b',1.301,100),probe('late',1.6,200)]
    selected,pairs=choose_compatible(rows,3)
    assert {p['observation_id'] for p in selected}=={'middle-a','middle-b'}
    assert len(pairs)==1


def test_matching_centre_does_not_override_field_edge_or_pipeline_mismatch():
    a=probe('a',1.3,1);b=probe('b',1.3,2);b['sample_wavelengths_um'][0]=1.32
    assert choose_compatible([a,b],2)[0]==[]
    assert choose_compatible([a,probe('c',1.3,3,'6.4')],2)[0]==[]
    assert choose_compatible([a,probe('short',1.3,1.001)],2)[0]==[]


class Response:
    def __init__(self,status=206,content_range='bytes 0-65535/1000000',data=None):
        self.status=status;self.url='https://irsa.ipac.caltech.edu/example.fits'
        self.headers={'Content-Range':content_range,'Content-Length':'65536'}
        self.data=data if data is not None else b' '*65536;self.read_called=False
    def __enter__(self):return self
    def __exit__(self,*args):pass
    def read(self,n):self.read_called=True;return self.data[:n]


@pytest.mark.parametrize('response',[Response(200),Response(content_range='bytes 10-65545/1000000'),Response(data=b'truncated')])
def test_range_probe_refuses_ignored_ranges_and_truncation(response):
    with patch('skyshift.archive.urlopen',return_value=response):
        with pytest.raises(ValueError):fetch_header_prefix(response.url)
    if response.status==200:assert not response.read_called


def test_range_probe_records_partial_identity_not_a_full_original():
    response=Response()
    with patch('skyshift.archive.urlopen',return_value=response):data,record=fetch_header_prefix(response.url)
    assert len(data)==65536 and record['bytes']==65536
    assert 'partial_sha256'in record and 'sha256' not in record


def test_metadata_filter_checks_requested_dates_release_and_full_footprint():
    row={'obs_id':'synthetic','energy_bandpassname':'SPHEREx-D2','t_min':'60000',
         'calib_level':'2','s_region':'POLYGON ICRS 359 -1 1 -1 1 1 359 1',
         'access_url':'https://irsa.ipac.caltech.edu/ibe/data/spherex/qr2/level2/example.fits'}
    request=SequenceRequest.model_validate({**REQUEST,'start_date':'2026-01-01'})
    chosen,rejected=metadata_pool([row],request,np.array([0]),np.array([0]))
    assert not chosen and 'UTC'in rejected[0]['reason']
    chosen,_=metadata_pool([row],SequenceRequest.model_validate(REQUEST),np.array([0]),np.array([0]))
    assert chosen==[row]


def test_actual_cached_headers_are_preflighted_without_loading_science_arrays():
    root=Path(__file__).resolve().parents[1]
    path=root/'data/raw/m101_context/2025W49_2A_0756_3_D2.fits'
    if not path.exists():pytest.skip('Optional original header fixture absent')
    # A real cutout header works with its own geometry; no image array accessed.
    with path.open('rb') as f:raw=f.read(65536)
    stream=io.BytesIO(raw);fits.Header.fromfile(stream);h=fits.Header.fromfile(stream)
    w=WCS(h).celestial;ra,dec=w.pixel_to_world_values(np.full(25,80.),np.full(25,80.))
    request=SequenceRequest.model_validate({**REQUEST,'region':{'ra_deg':float(ra[0]),'dec_deg':float(dec[0]),'size_deg':.04}})
    layers=[np.full((2040,2040),1.3,dtype=np.float32),np.full((2040,2040),.04,dtype=np.float32)]
    record=evaluate_header(raw,{'obs_id':h['OBSID'],'t_min':h['MJD-BEG']},request,ra,dec,layers,h['DETCOORD'])
    assert record['exposure_quality']=='Pass' and 'UNKNOWN'in record['pixel_quality']


def test_preflight_is_bounded_and_preserves_failed_partial_identity(tmp_path):
    rows=[{'obs_id':str(i),'t_min':str(i)} for i in range(100)]
    def evaluate(raw,row,*args):
        if row['obs_id']=='0':raise ValueError('Declared quality failed')
        return probe(row['obs_id'],1.3,float(row['t_min']))
    with patch('skyshift.selection.metadata_pool',return_value=(rows,[])),patch('skyshift.selection.calibration_layers',return_value=([],None)),patch('skyshift.selection.sha256_file',return_value='pinned'),patch('skyshift.selection.probe_url',return_value='https://irsa.ipac.caltech.edu/example'),patch('skyshift.selection.fetch_header_prefix',return_value=(b'prefix',{'bytes':6,'partial_sha256':'partial'})) as fetch,patch('skyshift.selection.evaluate_header',side_effect=evaluate):
        chosen,report=preselect(rows,SequenceRequest.model_validate(REQUEST),Path('unused'),tmp_path/'selection')
    assert fetch.call_count==12 and len(chosen)==3
    assert len(report['header_attempts'])==12
    assert report['header_attempts'][0]['partial_sha256']=='partial'
    assert report['header_attempts'][0]['status']=='rejected'
    assert (tmp_path/'selection/header-00.bin').read_bytes()==b'prefix'
    with pytest.raises(FileExistsError):preselect([],SequenceRequest.model_validate(REQUEST),None,tmp_path/'selection')


def test_empty_metadata_result_explains_filters_without_loading_calibration(tmp_path):
    with patch('skyshift.selection.calibration_layers') as load:
        chosen,report=preselect([],SequenceRequest.model_validate(REQUEST),Path('unused'),tmp_path/'empty')
    assert chosen==[] and 'No observations in the bounded archive response' in report['outcome']
    load.assert_not_called()


def test_group_selection_maximizes_epochs_before_a_tighter_isolated_pair():
    rows=[probe('tight-a',1.1,1),probe('tight-b',1.1001,2),
          probe('group-a',1.3,20),probe('group-b',1.303,50),probe('group-c',1.306,100)]
    selected,_=choose_compatible(rows,3)
    assert [p['observation_id'] for p in selected]==['group-a','group-b','group-c']
    # Input order never affects the selected science candidates.
    assert choose_compatible(list(reversed(rows)),3)[0]==selected


def test_group_selection_never_treats_adjacent_spectral_links_as_transitive():
    rows=[probe('a',1.3,1),probe('b',1.307,20),probe('c',1.314,100)]
    selected,pairs=choose_compatible(rows,3)
    assert len(pairs)==2
    assert [p['observation_id'] for p in selected]==['b','c']


def test_group_selection_refuses_unbounded_or_duplicate_probe_inputs():
    with pytest.raises(ValueError,match='bounded'):choose_compatible([probe(str(i),1.3,i) for i in range(13)],3)
    with pytest.raises(ValueError,match='Duplicate'):choose_compatible([probe('a',1.3,1),probe('a',1.3,2)],3)
