import base64,gzip,hashlib,json
from pathlib import Path
import numpy as np
import pytest
from skyshift.mosaics import read_mosaic

ROOT=Path(__file__).resolve().parents[1]
def test_all_published_cube_planes_retain_exact_samples_masks_and_wavelengths():
 source=ROOT/'data/mosaics/originals/M101_irsa.fits'
 if not source.exists():pytest.skip('Run tools/build_irsa_mosaic.py for the bounded authenticated cube fixture')
 m=json.loads((ROOT/'web/dist/data/mosaics/m101-v1/manifest.json').read_text())
 cube=read_mosaic(source,m['source']['sha256'])
 assert len(m['channels'])==102 and m['temporal_comparison_allowed'] is False and m['dates']=={}
 for i,c in enumerate(m['channels']):
  raw=(ROOT/'web/dist'/c['url'].removeprefix('./')).read_bytes();assert hashlib.sha256(raw).hexdigest()==c['sha256']
  p=json.loads(gzip.decompress(raw))
  for key,expected in [('SCI',cube['image'][i]),('HITS',cube['hits'][i]),('FLAGS',cube['flags'][i]),('VALID',cube['valid'][i])]:
   a=p['arrays'][key];b=base64.b64decode(a['data']);assert hashlib.sha256(b).hexdigest()==a['sha256']
   np.testing.assert_array_equal(np.frombuffer(b,dtype=a['dtype']).reshape(p['shape']),expected)
  assert c['wavelength_um']==cube['channels'][i]['wavelength_um'] and p['channel']['plane']==i+1
 assert m['channels'][62]['wavelength_um']==pytest.approx(3.293,abs=1e-6)

def test_changed_or_unknown_mosaic_source_cannot_gain_adapter_support(tmp_path):
 p=tmp_path/'cube.fits';p.write_bytes(b'not a verified cube')
 with pytest.raises(ValueError,match='identity changed'):read_mosaic(p,'0'*64)
