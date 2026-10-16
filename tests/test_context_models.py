"""Actual downloaded contextual assets retain their geometry and transparent rings."""
import importlib.util
import json
from pathlib import Path
import struct
from io import BytesIO
from PIL import Image
import pytest

ROOT=Path(__file__).resolve().parents[1]


def unpack(path):
    data=path.read_bytes();length=struct.unpack_from('<I',data,12)[0]
    return json.loads(data[20:20+length]),data[28+length:]


@pytest.mark.parametrize('name',['sun','mercury','saturn','uranus','earth-natural'])
def test_real_context_optimization_preserves_geometry_and_alpha(name):
    source=ROOT/'data/raw/context-assets'/(name+'-original.glb')
    if not source.exists():pytest.skip('Downloaded context original is absent')
    before,raw=unpack(source);after,prepared=unpack(ROOT/'web/dist/assets/space'/(name+'.glb'))
    for key in ['meshes','nodes','accessors','materials','scenes']:assert before.get(key)==after.get(key)
    images={i['bufferView'] for i in before.get('images',[])}
    assert len(before['bufferViews'])==len(after['bufferViews'])
    for index,(a,b) in enumerate(zip(before['bufferViews'],after['bufferViews'])):
        if index in images:continue
        assert raw[a.get('byteOffset',0):a.get('byteOffset',0)+a['byteLength']]==prepared[b.get('byteOffset',0):b.get('byteOffset',0)+b['byteLength']]
    for old,new in zip(before['images'],after['images']):
        a=before['bufferViews'][old['bufferView']];b=after['bufferViews'][new['bufferView']]
        first=Image.open(BytesIO(raw[a.get('byteOffset',0):a.get('byteOffset',0)+a['byteLength']]))
        second=Image.open(BytesIO(prepared[b.get('byteOffset',0):b.get('byteOffset',0)+b['byteLength']]))
        assert max(second.size)<=2048
        if first.mode=='RGBA' and first.getchannel('A').getextrema()!=(255,255):assert second.mode=='RGBA' and second.getchannel('A').getextrema()==first.getchannel('A').getextrema()


def test_optimizer_rejects_non_glb_input(tmp_path):
    spec=importlib.util.spec_from_file_location('context_models',ROOT/'tools/prepare_context_models.py');module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
    source=tmp_path/'bad.glb';source.write_bytes(b'not a 3D model')
    with pytest.raises(ValueError):module.optimize_glb(source,tmp_path/'output.glb')
    assert not (tmp_path/'output.glb').exists()
