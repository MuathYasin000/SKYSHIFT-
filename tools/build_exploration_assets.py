"""Build traceable single-observation contexts; never promote them to temporal pairs."""
from pathlib import Path
import base64
import hashlib
import json
import sys
import numpy as np
from reproject import reproject_interp
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'src'))
from skyshift.products import read_product
from skyshift.coordinates import common_grid
from skyshift.models import SkyRegion
from skyshift.preparation import numeric_hash

FIELDS = [
    ('m101', 'M101 · Pinwheel Galaxy', 'A nearby spiral galaxy field in Ursa Major. Explore the wider context, then enter the small wavelength-screened comparison.', 210.80227, 54.34895, .3, 'm101_context'),
    ('m67', 'M67 outskirts', 'A field near an open star cluster in Cancer. These observations are available for inspection; the tested wider pairs failed the wavelength screen.', 132.925, 11.8, .2, 'm67_outskirts'),
    ('ngc188', 'NGC 188 region', 'A northern star-cluster region close to the celestial pole. Inspect a real infrared exposure; no tested wider pair met the temporal comparison criteria.', 11.9, 85.25, .2, 'ngc188'),
]

def encode(a):
    a = np.ascontiguousarray(a, dtype=np.uint8 if a.dtype.kind in 'bu' else '<f4')
    return {'dtype': 'uint8' if a.dtype.kind in 'bu' else 'float32', 'shape': list(a.shape), 'data': base64.b64encode(a.tobytes()).decode(), 'numeric_sha256': numeric_hash(a)}

def build(output=None):
    out = Path(output or ROOT/'web/dist/data/explore'); out.mkdir(parents=True, exist_ok=True)
    cal = ROOT/'data/calibration/spectral_wcs_D2_spx_cal-wcs-v4-2025-254.fits'
    fields = []
    for key, title, description, ra, dec, size, directory in FIELDS:
        region = SkyRegion(ra_deg=ra, dec_deg=dec, size_deg=size)
        candidates = []
        for path in sorted((ROOT/'data/raw'/directory).glob('*.fits')):
            try:
                p = read_product(path, region, calibration=cal)
                candidates.append((float(p.valid.mean()), path, p))
            except ValueError:
                continue  # Rejections remain in the original screening records.
        if not candidates: raise ValueError(f'No readable authenticated context for {key}')
        chosen = sorted(candidates, key=lambda x: (-x[0], x[1].name))[:2 if key=='m101' else 1]
        entries = []
        for _, path, p in chosen:
            wcs, shape = common_grid(region)
            arrays = {}
            for name, a in [('SCI', p.image), ('WAVE', p.wavelength_um), ('BAND', p.bandwidth_um)]:
                value, footprint = reproject_interp((a,p.wcs), wcs, shape_out=shape, order='bilinear')
                arrays[name] = np.asarray(value, dtype=np.float32)
            support, fp = reproject_interp((p.valid.astype(float),p.wcs), wcs, shape_out=shape, order='bilinear')
            valid = (fp>0)&np.isfinite(support)&(support>=1-1e-10)
            for a in arrays.values(): valid &= np.isfinite(a)
            arrays['VALID'] = valid.astype(np.uint8)
            arrays['SCI'][~valid] = np.nan
            lo, hi = np.percentile(arrays['SCI'][valid], [1,99.7]).tolist()
            obs = p.observation.model_dump(mode='json')
            for field in ['source','spectral_calibration']:
                obs[field]['path'] = Path(obs[field]['path']).name
            payload = {'schema_version':'1.0','dataset_kind':'real','usage':'single_observation_only',
                'scientific_approval':'PENDING', 'observation':obs, 'region':region.model_dump(),
                'native_shape':list(p.image.shape),'shape':list(shape),'pixel_scale_arcsec':6.15,
                'wcs':dict(wcs.to_header()),'arrays':{k:encode(v) for k,v in arrays.items()},
                'display':{'vmin':lo,'vmax':hi,'stretch':'asinh','asinh_a':.06},
                'wavelength_range_um':[float(np.min(arrays['WAVE'][valid])),float(np.max(arrays['WAVE'][valid]))],
                'processing':{'algorithm':'reproject_interp bilinear','flag_policy':'conservative-v0.1; SOURCE alone retained',
                    'support':'all bilinear contributors must be usable; no inpainting, sharpening, PSF matching or background subtraction',
                    'tool_sha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest()},
                'limitations':['Single exposure only. Wavelength changes across the field.','Context is not screened as a temporal comparison.','Display interpolation never creates a measurement.']}
            stem=f'{key}-{obs["observation_id"]}'
            raw=json.dumps(payload,separators=(',',':'),allow_nan=False).encode(); (out/f'{stem}.json').write_bytes(raw)
            # Honest single-band asinh preview, north up; NaNs never used as measured pixels.
            scaled=np.clip((np.nan_to_num(arrays['SCI'],nan=lo)-lo)/(hi-lo),0,1)
            level=np.arcsinh(scaled/.06)/np.arcsinh(1/.06)
            rgb=np.repeat((level*255).astype(np.uint8)[...,None],3,axis=2);rgb[~valid]=[20,33,51]
            Image.fromarray(np.flipud(rgb)).save(out/f'{stem}.png')
            entries.append({'url':f'./data/explore/{stem}.json','sha256':hashlib.sha256(raw).hexdigest(),
                'preview':f'./data/explore/{stem}.png','observation_id':obs['observation_id'],
                'time_start_utc':obs['time_start_utc'],'native_shape':list(p.image.shape),'shape':list(shape)})
        fields.append({'id':key,'title':title,'description':description,'ra_deg':ra,'dec_deg':dec,'size_deg':size,
            'comparison_status':'provisional_restricted' if key=='m101' else 'incompatible_tested_pairs',
            'observations':sorted(entries,key=lambda e:e['time_start_utc'])})
    catalog={'schema_version':'1.0','scope':'Three curated real fields; no general all-sky or multi-epoch availability claim','fields':fields}
    (out.parent/'explore-catalog.json').write_text(json.dumps(catalog,indent=2),encoding='utf-8')
    return catalog

if __name__=='__main__':
    result=build(); print(json.dumps({'fields':len(result['fields']),'observations':sum(len(f['observations']) for f in result['fields'])}))
