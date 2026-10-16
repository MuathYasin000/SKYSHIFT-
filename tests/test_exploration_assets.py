"""Verify larger contexts stay traceable and separate from temporal evidence."""
import base64
import importlib.util
import json
from pathlib import Path
import numpy as np
import pytest
from astropy.wcs import WCS
from reproject import reproject_interp
from skyshift.archive import sha256_file
from skyshift.models import SkyRegion
from skyshift.products import read_product
from skyshift.preparation import numeric_hash

ROOT=Path(__file__).resolve().parents[1]
def decode(entry):
    return np.frombuffer(base64.b64decode(entry['data']),dtype=np.uint8 if entry['dtype']=='uint8' else '<f4').reshape(entry['shape'])

def test_contexts_match_native_data_and_conservative_masks():
    catalog=json.loads((ROOT/'web/dist/data/explore-catalog.json').read_text())
    assert len(catalog['fields'])==3
    count=0
    for field in catalog['fields']:
        for entry in field['observations']:
            path=ROOT/'web/dist'/entry['url'].removeprefix('./')
            assert sha256_file(path)==entry['sha256']
            p=json.loads(path.read_text());count+=1
            assert p['usage']=='single_observation_only' and p['scientific_approval']=='PENDING'
            source=p['observation']['source']
            matches=list((ROOT/'data/raw').glob('*/'+source['path']))
            if not matches:pytest.skip('Original archive cache is not present')
            original=matches[0];assert sha256_file(original)==source['sha256']
            native=read_product(original,SkyRegion(**p['region']),calibration=ROOT/'data/calibration'/p['observation']['spectral_calibration']['path'])
            assert p['native_shape']==list(native.image.shape)
            wcs=WCS(p['wcs']);shape=tuple(p['shape'])
            science,_=reproject_interp((native.image,native.wcs),wcs,shape_out=shape,order='bilinear')
            support,fp=reproject_interp((native.valid.astype(float),native.wcs),wcs,shape_out=shape,order='bilinear')
            valid=decode(p['arrays']['VALID']).astype(bool)
            assert np.all((fp>0)[valid] & (support[valid]>=1-1e-10))
            np.testing.assert_array_equal(np.asarray(science,dtype=np.float32)[valid],decode(p['arrays']['SCI'])[valid])
            assert np.all(np.isnan(decode(p['arrays']['SCI'])[~valid]))
            for layer in p['arrays'].values():assert numeric_hash(decode(layer))==layer['numeric_sha256']
    assert count==4

def test_rebuilding_context_assets_is_byte_reproducible(tmp_path):
    spec=importlib.util.spec_from_file_location('exploration',ROOT/'tools/build_exploration_assets.py')
    module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
    module.build(tmp_path/'explore')
    for path in (ROOT/'web/dist/data/explore').glob('*'):
        assert (tmp_path/'explore'/path.name).read_bytes()==path.read_bytes()
