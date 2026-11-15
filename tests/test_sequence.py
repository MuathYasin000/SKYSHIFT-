from pathlib import Path
import json
import threading
import time
import pytest

from skyshift.sequence import SequenceRequest,selected_rows,build_sequence,verified_local_inputs,Cancelled,playback_modes
from skyshift.jobs import JobStore

ROOT=Path(__file__).resolve().parents[1]
REQUEST={'schema_version':'1.0','kind':'skyshift-observation-request','release':'qr2','region':{'ra_deg':210.80227,'dec_deg':54.34895,'size_deg':.04}}

def test_fixed_selection_uses_bounded_temporal_quantiles_and_excludes_unapproved_sources():
    rows=[{'energy_bandpassname':'SPHEREx-D2','t_min':str(i),'obs_id':str(i),'access_url':f'https://irsa.ipac.caltech.edu/ibe/data/spherex/qr2/level2/{i}.fits'} for i in range(10)]
    rows.append({**rows[0],'access_url':'https://example.com/untrusted.fits'})
    chosen,total=selected_rows(rows,2,3)
    assert total==10 and [r['obs_id'] for r in chosen]==['0','4','9']

@pytest.mark.parametrize('patch',[{'max_frames':7},{'max_frames':True},{'detector':0},{'detector':'2'},{'extra':True}])
def test_request_work_is_strictly_bounded(patch):
    with pytest.raises(ValueError):SequenceRequest.model_validate({**REQUEST,**patch})

def test_cancelled_preparation_does_not_fetch_or_create_a_new_receipt(tmp_path):
    event=threading.Event();event.set()
    with pytest.raises(Cancelled):build_sequence(REQUEST,tmp_path/'cancelled',cancel=event)
    assert not (tmp_path/'cancelled').exists()


@pytest.mark.parametrize('paths',[[],[Path('unused.fits')]*4])
def test_explicit_original_bounds_fail_before_acquisition_or_output(tmp_path,paths):
    with pytest.raises(ValueError,match='count exceeds'):
        build_sequence(REQUEST,tmp_path/'invalid',input_paths=paths)
    assert not (tmp_path/'invalid').exists()


def test_cache_does_not_substitute_smaller_originals_for_a_wider_request():
    r=SequenceRequest.model_validate({**REQUEST,'region':{**REQUEST['region'],'size_deg':.5}})
    assert verified_local_inputs(r)==[]

def test_job_cancellation_and_queue_limit(tmp_path):
    gate=threading.Event()
    def builder(request,output,progress,cancel):
        gate.wait(3)
        if cancel.is_set():raise Cancelled('Cancelled before data preparation')
        output.mkdir();(output/'sequence.json').write_text('{"frames":[]}');return {'frames':[]}
    store=JobStore(tmp_path,builder)
    try:
        a=store.create(REQUEST);store.create(REQUEST)
        with pytest.raises(ValueError,match='full'):store.create(REQUEST)
        store.cancel(a['id']);gate.set()
        deadline=time.monotonic()+3
        while store.status(a['id'])['state'] not in ('cancelled','failed') and time.monotonic()<deadline:time.sleep(.01)
        assert store.status(a['id'])['state']=='cancelled'
    finally:gate.set();store.close()

def test_real_cached_example_honors_field_width_and_retains_checks(tmp_path):
    cal=ROOT/'data/calibration/spectral_wcs_D2_spx_cal-wcs-v4-2025-254.fits'
    if not cal.exists():pytest.skip('Immutable original cache is absent')
    value=build_sequence(REQUEST,tmp_path/'real')
    assert len(value['frames'])==2 and value['playback_eligible']
    assert all(f['region']['size_deg']==.04 and f['shape']==[24,24] for f in value['frames'])
    assert value['scientific_approval']=='PENDING'


def test_survey_playback_is_explicitly_distinct_from_rejected_physical_comparison():
    frames=[{'observation':{'observation_id':str(i),'time_start_utc':f'2025-12-{i+1:02d}T00:00:00Z'}} for i in range(3)]
    checks=[{'a':0,'b':1,'playback_eligible':False},{'a':1,'b':2,'playback_eligible':False}]
    modes=playback_modes(frames,checks)
    assert modes['survey_timeline']['eligible'] is True
    assert modes['survey_timeline']['frame_indices']==[0,1,2]
    assert modes['survey_timeline']['physical_comparison'] is False
    assert modes['matched_wavelength']['eligible'] is False
    assert modes['matched_wavelength']['frame_indices']==[]
    assert 'No two prepared epochs passed' in modes['matched_wavelength']['reason']


def test_matched_playback_finds_a_mutually_valid_subset_and_preserves_failed_links():
    frames=[{'observation':{'observation_id':str(i),'time_start_utc':f'2025-12-{i+1:02d}T00:00:00Z'}} for i in range(4)]
    comparisons=[{'a':0,'b':1,'playback_eligible':True},{'a':1,'b':2,'playback_eligible':True},
                 {'a':0,'b':2,'playback_eligible':False},{'a':2,'b':3,'playback_eligible':True}]
    modes=playback_modes(frames,comparisons)
    assert len(modes['matched_wavelength']['frame_indices'])==2
    assert modes['matched_wavelength']['frame_indices']==[0,1]
    assert modes['matched_wavelength']['physical_comparison'] is False
    assert comparisons[2]['playback_eligible'] is False
    assert playback_modes(frames[:1],[])['survey_timeline']['eligible'] is False
    assert playback_modes([],[])['survey_timeline']['eligible'] is False
