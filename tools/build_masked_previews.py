"""Make display-only mask styling; preserve every supported preview pixel exactly."""
from pathlib import Path
import base64
import hashlib
import json
import numpy as np
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
WEB=ROOT/'web/dist'
def run():
    out=WEB/'assets/previews';out.mkdir(exist_ok=True)
    catalog=json.loads((WEB/'data/explore-catalog.json').read_text(encoding='utf-8'))
    records=[]
    for field in catalog['fields']:
        for entry in field['observations']:
            source=WEB/entry['preview'].removeprefix('./')
            payload=WEB/entry['url'].removeprefix('./')
            data=json.loads(payload.read_text(encoding='utf-8'))
            valid=np.frombuffer(base64.b64decode(data['arrays']['VALID']['data']),dtype=np.uint8).reshape(data['shape'])
            valid=np.flipud(valid).astype(bool)
            original=np.array(Image.open(source).convert('RGB'))
            assert original.shape[:2]==valid.shape
            result=original.copy();y,x=np.indices(valid.shape)
            result[~valid]=10;result[(~valid)&((x+y)%6==0)]=26
            assert np.array_equal(original[valid],result[valid])
            target=out/(source.stem+'.webp')
            image=Image.fromarray(result);image.save(target,lossless=True,method=6)
            assert np.array_equal(np.array(Image.open(target).convert('RGB')),result)
            records.append(dict(file=target.relative_to(WEB).as_posix(),sha256=hashlib.sha256(target.read_bytes()).hexdigest(),source=source.relative_to(WEB).as_posix(),source_sha256=hashlib.sha256(source.read_bytes()).hexdigest(),mask_payload=payload.relative_to(WEB).as_posix(),mask_payload_sha256=hashlib.sha256(payload.read_bytes()).hexdigest(),supported_rgb_pixels='EXACTLY_UNCHANGED',modifications='Excluded pixels only: neutral 10/255 with faint diagonal hatch. No upsampling or astronomical detail added.'))
    (out/'manifest.json').write_text(json.dumps({'scope':'Display-only derivatives; original archive/prepared identities remain authoritative.','assets':records},indent=2)+'\n',encoding='utf-8',newline='\n')
    print(f'{len(records)} masked display derivatives; all supported pixels preserved exactly')
if __name__=='__main__':run()
