"""Offline reconstruction of the curated Orion context from immutable original inputs.

Writes only to a new directory. Does not discover, download or publish observations.
The unchanged base preparer retains its historical processing fingerprint.
"""
from pathlib import Path
import argparse
import json
import build_exploration_assets as builder
from skyshift.archive import sha256_file

ROOT=Path(__file__).resolve().parents[1]


def reconstruct(output):
    output=Path(output)
    if output.exists():raise FileExistsError('Use a new reconstruction output directory')
    catalogue=json.loads((ROOT/'web/dist/data/explore-catalog.json').read_text(encoding='utf-8'))
    field=next(f for f in catalogue['fields'] if f['id']=='m42')
    source=ROOT/'data/raw/m42_context/2025W37_2A_0010_1_D2.fits'
    calibration=ROOT/'data/calibration/spectral_wcs_D2_spx_cal-wcs-v4-2025-254.fits'
    if sha256_file(source)!='334b591a00814270d53577bce832cc9dd402aa9f607c2744d5895c0728072f27':raise ValueError('Original exposure identity differs')
    if sha256_file(calibration)!='40c49a5acbf7047b7cebf3d46471cb99639867996f48a22d0e283f7e529249d7':raise ValueError('Calibration identity differs')
    previous=builder.FIELDS
    builder.FIELDS=[('m42',field['title'],field['description'],field['ra_deg'],field['dec_deg'],field['size_deg'],'m42_context')]
    try:rebuilt=builder.build(output)['fields'][0]
    finally:builder.FIELDS=previous
    rebuilt['comparison_status']='unavailable'
    entry=rebuilt['observations'][0];payload_path=output/Path(entry['url']).name
    payload=json.loads(payload_path.read_text(encoding='utf-8'))
    payload['observation']['source']['retrieved_at_utc']=json.loads(source.with_suffix('.fits.source.json').read_text(encoding='utf-8')).get('retrieved_at_utc')
    # No historical retrieval date was recorded for this calibration; keep null honestly.
    payload['observation']['spectral_calibration']['retrieved_at_utc']=json.loads(calibration.with_suffix('.fits.source.json').read_text(encoding='utf-8')).get('retrieved_at_utc')
    payload['limitations'].extend(['No temporal screening, independent source registration or photometric variability assessment for this single exposure.','Calibration UUID associations and scientific interpretation still require qualified assessment.'])
    payload_path.write_bytes(json.dumps(payload,separators=(',',':'),allow_nan=False).encode())
    entry['sha256']=sha256_file(payload_path)
    if rebuilt!=field:raise ValueError('Reconstructed Orion metadata or byte identity differ from the curated record')
    (output.parent/'explore-catalog.json').write_text(json.dumps({'schema_version':'1.0','scope':'Offline Orion single-context reconstruction only; no temporal comparison','fields':[rebuilt]},indent=2),encoding='utf-8')
    return rebuilt


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--output',type=Path,required=True)
    print(json.dumps(reconstruct(parser.parse_args().output),indent=2))
