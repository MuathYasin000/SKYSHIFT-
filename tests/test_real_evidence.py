"""Integration checks using an existing immutable local real-data snapshot, no network."""
from pathlib import Path
import hashlib,json,zipfile
import pytest
from skyshift.evidence import export_packet,reconstruct_packet,read_packet
from skyshift.models import Annotation

ROOT=Path(__file__).resolve().parents[1]
BUNDLE=ROOT/'data/prepared/m101-review-v4'
pytestmark=pytest.mark.skipif(not BUNDLE.exists(),reason='Optional real-data review snapshot absent')

def test_real_annotation_and_viewport_reconstruct_exactly(tmp_path):
    base,_=read_packet(ROOT/'data/exports/m101-review-v4.zip')
    note=Annotation(annotation_id='synthetic-qa-note',pair_id=base.pair_id,ra_deg=base.region.ra_deg,dec_deg=base.region.dec_deg,
        category='uncertain',note='Synthetic QA annotation on real data; no astronomical finding.',created_at=base.created_at)
    comparison=base.model_copy(deep=True);comparison.annotations=[note];comparison.display.zoom=2;comparison.display.center_x=11;comparison.display.center_y=12
    packet=tmp_path/'comparison.zip';export_packet(BUNDLE,packet,comparison)
    result=reconstruct_packet(packet,tmp_path/'reconstructed')
    assert result['status']=='pass' and result['annotations_verified']==1
    assert result['display_settings']['zoom']==2
    assert all(a['max_absolute_error']==0 for a in result['arrays'].values())

def test_unsupported_approval_claim_does_not_create_output(tmp_path):
    _,payload=read_packet(ROOT/'data/exports/m101-review-v4.zip')
    manifest=json.loads(payload['manifest.json']);manifest['processing']['scientific_approval']='APPROVED'
    payload['manifest.json']=json.dumps(manifest).encode();payload['hashes.json']=json.dumps({n:hashlib.sha256(v).hexdigest() for n,v in payload.items() if n!='hashes.json'}).encode()
    path=tmp_path/'forged.zip'
    with zipfile.ZipFile(path,'w',zipfile.ZIP_DEFLATED) as z:
        for n,v in payload.items():z.writestr(n,v)
    output=tmp_path/'output'
    with pytest.raises(ValueError,match='cannot import a claim'):reconstruct_packet(path,output)
    assert not output.exists()

def test_user_export_cannot_modify_scientific_preparation(tmp_path):
    base,_=read_packet(ROOT/'data/exports/m101-review-v4.zip');base.processing['order']='nearest'
    with pytest.raises(ValueError,match='not scientific evidence'):export_packet(BUNDLE,tmp_path/'bad.zip',base)
