"""Display derivatives cannot change supported astronomical preview pixels."""
import base64
import hashlib
import json
from pathlib import Path
import numpy as np
from PIL import Image

WEB=Path(__file__).resolve().parents[1]/'web/dist'

def test_display_derivatives_preserve_supported_rgb_and_source_hashes():
    records=json.loads((WEB/'assets/previews/manifest.json').read_text())['assets']
    assert len(records)==5
    for record in records:
        for file, checksum in [('file','sha256'),('source','source_sha256'),('mask_payload','mask_payload_sha256')]:
            assert hashlib.sha256((WEB/record[file]).read_bytes()).hexdigest()==record[checksum]
        data=json.loads((WEB/record['mask_payload']).read_text())
        valid=np.flipud(np.frombuffer(base64.b64decode(data['arrays']['VALID']['data']),dtype=np.uint8).reshape(data['shape'])).astype(bool)
        original=np.array(Image.open(WEB/record['source']).convert('RGB'))
        display=np.array(Image.open(WEB/record['file']).convert('RGB'))
        np.testing.assert_array_equal(display[valid],original[valid])
        assert set(np.unique(display[~valid])).issubset({10,26})
        np.testing.assert_array_equal(display[...,0][~valid],display[...,1][~valid])
        np.testing.assert_array_equal(display[...,1][~valid],display[...,2][~valid])
