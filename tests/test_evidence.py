from pathlib import Path
import json,zipfile,hashlib
import numpy as np
import pytest
from skyshift.evidence import safe_member,read_packet
from skyshift.preparation import project_pair,numeric_hash
from test_models_and_screening import fixture_product,REGION


@pytest.mark.parametrize('name',['../escape','/absolute','C:/absolute','a\\b','a/../b','.','a\x00b','a/./b','a//b','CON.txt','NUL','a.','a '])
def test_archive_paths_cannot_escape_or_change_platform_meaning(name):
    with pytest.raises(ValueError):safe_member(name)


def test_packet_requires_complete_hash_inventory(tmp_path):
    path=tmp_path/'bad.zip'
    with zipfile.ZipFile(path,'w') as z:
        z.writestr('manifest.json','{}');z.writestr('hashes.json','{}')
    with pytest.raises(ValueError,match='cover every'):read_packet(path)


def test_packet_detects_tampering_before_scientific_parsing(tmp_path):
    path=tmp_path/'bad.zip'
    with zipfile.ZipFile(path,'w') as z:
        z.writestr('manifest.json','changed');z.writestr('hashes.json',json.dumps({'manifest.json':hashlib.sha256(b'original').hexdigest()}))
    with pytest.raises(ValueError,match='checksum'):read_packet(path)


def test_common_grid_preserves_masked_pixels_as_missing_not_zero():
    a=fixture_product();b=fixture_product('B',4)
    a.valid[8:11,8:11]=False
    arrays,_,_=project_pair(a,b,REGION)
    assert not arrays['COMMON'][9,9]
    assert np.isnan(arrays['SCI_A'][9,9])
    assert np.isnan(arrays['SCI_B'][9,9])


def test_numeric_hash_is_independent_of_array_byte_order():
    values=np.array([1,2,np.nan],dtype='<f4')
    assert numeric_hash(values)==numeric_hash(values.astype('>f4'))
