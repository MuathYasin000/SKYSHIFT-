"""Optimize downloaded contextual NASA GLBs without changing mesh geometry.

Originals stay under data/raw/context-assets. Only embedded color textures are
resampled, and buffer views are repacked with their original alignment.
"""
from pathlib import Path
from io import BytesIO
import hashlib
import json
import struct
from PIL import Image

ROOT=Path(__file__).resolve().parents[1]


def optimize_glb(source,destination,max_texture=2048):
    raw=Path(source).read_bytes()
    if len(raw)<28:raise ValueError('Truncated GLB')
    magic,version,length=struct.unpack_from('<III',raw)
    if magic!=0x46546c67 or version!=2 or length!=len(raw):raise ValueError('Invalid GLB')
    json_length,kind=struct.unpack_from('<II',raw,12)
    if kind!=0x4e4f534a:raise ValueError('Missing GLB JSON')
    document=json.loads(raw[20:20+json_length]);offset=20+json_length
    binary_length,binary_kind=struct.unpack_from('<II',raw,offset)
    if binary_kind!=0x004e4942:raise ValueError('Missing GLB binary')
    original=raw[offset+8:offset+8+binary_length];replacements={}
    for image in document.get('images',[]):
        view=document['bufferViews'][image['bufferView']];start=view.get('byteOffset',0)
        encoded=original[start:start+view['byteLength']];im=Image.open(BytesIO(encoded));im.thumbnail((max_texture,max_texture),Image.Resampling.LANCZOS)
        if im.mode=='RGBA' and im.getchannel('A').getextrema()==(255,255):im=im.convert('RGB')
        result=BytesIO();im.save(result,format='PNG' if im.mode=='RGBA' else 'JPEG',**({} if im.mode=='RGBA' else {'quality':88}))
        replacements[image['bufferView']]=result.getvalue();image['mimeType']='image/png' if im.mode=='RGBA' else 'image/jpeg'
    binary=bytearray()
    for index,view in enumerate(document['bufferViews']):
        binary.extend(b'\0'*(-len(binary)%4));start=view.get('byteOffset',0)
        data=replacements.get(index,original[start:start+view['byteLength']]);view['byteOffset']=len(binary);view['byteLength']=len(data);binary.extend(data)
    document['buffers'][0]['byteLength']=len(binary);binary.extend(b'\0'*(-len(binary)%4))
    js=json.dumps(document,separators=(',',':')).encode();js+=b' '*(-len(js)%4)
    output=struct.pack('<III',magic,version,12+8+len(js)+8+len(binary))+struct.pack('<II',len(js),0x4e4f534a)+js+struct.pack('<II',len(binary),0x004e4942)+binary
    Path(destination).write_bytes(output)
    return {'bytes':len(output),'sha256':hashlib.sha256(output).hexdigest(),'max_texture':max_texture,'modifications':'Embedded textures limited to 2048px; opaque textures JPEG quality 88; true alpha retained losslessly as PNG; mesh geometry/materials unchanged; buffer views realigned'}


if __name__=='__main__':
    for name in ['sun','mercury','uranus','saturn']:
        source=ROOT/'data/raw/context-assets'/(name+'-original.glb')
        print(name,optimize_glb(source,ROOT/'web/dist/assets/space'/(name+'.glb')))
