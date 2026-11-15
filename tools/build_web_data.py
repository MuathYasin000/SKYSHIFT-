"""Project the immutable scientific review release into small browser assets."""
from pathlib import Path
import argparse,json,base64,hashlib,shutil
from astropy.io import fits
import numpy as np
from skyshift.models import ComparisonManifest
from skyshift.preparation import ARRAY_NAMES

ROOT=Path(__file__).resolve().parents[1]


def main():
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--release',required=True);args=parser.parse_args()
    bundle=ROOT/'data/prepared'/args.release
    manifest=ComparisonManifest.model_validate_json((bundle/'manifest.json').read_text())
    dest=ROOT/'web/dist/data';dest.mkdir(parents=True,exist_ok=True)
    arrays={}
    with fits.open(bundle/'prepared/pair.fits') as hdul:
        for name in ARRAY_NAMES:
            dtype='uint8' if name in ('COMMON','VALID_A','VALID_B') else 'float32'
            data=np.asarray(hdul[name].data,dtype=np.uint8 if dtype=='uint8' else '<f4')
            arrays[name]={'dtype':dtype,'shape':list(data.shape),'data':base64.b64encode(data.tobytes()).decode()}
    registration=json.loads((bundle/'diagnostics/registration.json').read_text())
    response=json.loads((bundle/'diagnostics/response.json').read_text())
    # Strip local machine paths from public diagnostics; source records remain portable in the manifest.
    for p in response['products']:
        for key in ('spectral_calibration',):p[key]['path']='calibration/'+Path(p[key]['path']).name
        p['local_epsf']['calibration']['path']='diagnostics/epsf_calibration.fits'
    payload={'manifest':manifest.model_dump(mode='json'),'arrays':arrays,'registration':registration,'response':response,
        'title':'M101 / Pinwheel Galaxy','description':'A small region around the galactic nucleus. Real near-infrared observations; independent scientific approval remains pending.',
        'registration_context_size_deg':.3,'prepared_fits_url':'./data/pair.fits'}
    data=json.dumps(payload,separators=(',',':'),allow_nan=False).encode()
    (dest/'bundle.json').write_bytes(data);shutil.copyfile(bundle/'prepared/pair.fits',dest/'pair.fits')
    # Split the large self-contained scientific packet into independently hashed deployment-safe parts.
    archive=ROOT/'data/exports'/(args.release+'.zip');parts=[]
    with archive.open('rb') as stream:
        i=0
        while chunk:=stream.read(8_000_000):
            name=f'review-part-{i}.bin';(dest/name).write_bytes(chunk)
            parts.append({'url':'./data/'+name,'size_bytes':len(chunk),'sha256':hashlib.sha256(chunk).hexdigest()});i+=1
    catalogue={'schema_version':'1.0','bundle_url':'./data/bundle.json','bundle_sha256':hashlib.sha256(data).hexdigest(),
        'review_packet':{'name':args.release+'.zip','size_bytes':archive.stat().st_size,'parts':parts},'scientific_approval':'PENDING'}
    (dest/'catalog.json').write_text(json.dumps(catalogue,indent=2),encoding='utf-8')
    print(json.dumps({'browser_bundle_bytes':len(data),'review_packet_bytes':archive.stat().st_size,'parts':len(parts),'pair_id':manifest.pair_id}))


if __name__=='__main__':main()
