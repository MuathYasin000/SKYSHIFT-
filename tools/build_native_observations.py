"""Incremental native display assets, independent references, and measured evidence."""
from pathlib import Path
import hashlib
import json
import sys
import base64
import numpy as np
from astropy.io import fits
from PIL import Image
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'src'))
from skyshift.products import read_product
from skyshift.models import SkyRegion
from skyshift.native_display import native_diagnostics,encode_native,distribution
from skyshift.archive import sha256_file

OUT=ROOT/'web/dist/data/native'
EVIDENCE=ROOT/'docs/evidence/scientific-visualization-20261030'

def write_changed(path, data):
    path.parent.mkdir(parents=True,exist_ok=True)
    if not path.exists() or path.read_bytes()!=data:path.write_bytes(data)

def build():
    cal=ROOT/'data/calibration/spectral_wcs_D2_spx_cal-wcs-v4-2025-254.fits'
    temporal=json.loads((ROOT/'config/temporal_example.json').read_text())
    pair=json.loads((ROOT/'web/dist/data/bundle.json').read_text())
    r_bundle=json.loads((ROOT/'web/dist/data/sequence-r-draconis-temporal.json').read_text())
    entries=[];measurements=[]
    for field,region,paths,prepared in [
        ('m101',SkyRegion.model_validate(pair['manifest']['region']),
         [ROOT/'data/prepared/m101-review-v6'/o['source']['path'] for o in pair['manifest']['observations']],pair),
        ('r-draconis',SkyRegion.model_validate(r_bundle['request']['region']),
         [ROOT/'data/cache/cutouts'/x['path'] for x in temporal['sources']],r_bundle)]:
      for index,path in enumerate(paths):
        original=(pair['manifest']['observations'][index] if field=='m101' else r_bundle['frames'][index]['observation'])
        p=read_product(path,region,calibration=cal,source_url=original['source']['source_url'])
        obs=p.observation.model_dump(mode='json')
        # Retain acquisition timestamps from the immutable preparation receipt.
        # Reading a cached FITS is not a new archive retrieval.
        for role in ['source','spectral_calibration']:
            if original.get(role):
                if obs[role]['sha256']!=original[role]['sha256']:raise ValueError('Calibration or source provenance differs')
                obs[role]['retrieved_at_utc']=original[role].get('retrieved_at_utc')
        expected=(pair['manifest']['observations'][index] if field=='m101' else r_bundle['frames'][index]['observation'])['source']['sha256']
        if obs['source']['sha256']!=expected:raise ValueError('Original identity differs from prepared evidence')
        for role in ['source','spectral_calibration']:
            obs[role]['path']=Path(obs[role]['path']).name
        name=field+'-'+obs['observation_id'];diag=native_diagnostics(p)
        with fits.open(path) as hdul:
            if not np.array_equal(hdul['IMAGE'].data,p.image,equal_nan=True):raise ValueError('Native display must retain original science values exactly')
            zodi=distribution(hdul['ZODI'].data)
        diag['zodiacal_model']=dict(statistics=zodi,note='Original ZODI model; not subtracted from IMAGE or used as fitted sky.')
        # Native WCS positions are evaluated by Astropy, including SIP distortion.
        y,x=np.indices(p.image.shape);sky=p.wcs.pixel_to_world(x,y)
        arrays={k:encode_native(v,dtype) for k,v,dtype in [
            ('SCI',p.image,'<f4'),('VALID',p.valid,'|u1'),('FLAGS',p.flags,'<u4'),
            ('VARIANCE',p.variance,'<f4'),('WAVE',p.wavelength_um,'<f4'),
            ('RA',sky.ra.deg,'<f8'),('DEC',sky.dec.deg,'<f8')]}
        payload=dict(schema_version='1.0',kind='spherex_native_display',usage='single_observation_only',
            scientific_approval='PENDING',observation=obs,shape=list(p.image.shape),
            flag_definitions=p.flag_definitions,diagnostics=diag,arrays=arrays,
            orientation='Native detector axes; x right, y up. Not north up.',
            region=region.model_dump(mode='json'),wcs_header=p.wcs.to_header(relax=True).tostring(),
            processing='No reprojection, interpolation, inpainting, background subtraction or PSF matching. Original arrays unchanged.',
            temporal_comparison_allowed=False)
        raw=json.dumps(payload,allow_nan=False,separators=(',',':')).encode()
        write_changed(OUT/(name+'.json'),raw)
        entries.append(dict(id=name,field=field,observation_id=obs['observation_id'],
            source_sha256=expected,url='./data/native/'+name+'.json',sha256=hashlib.sha256(raw).hexdigest()))
        # Independent NumPy reference at one source pixel per output pixel.
        d=diag['display']['percentile'];scaled=np.clip((np.nan_to_num(p.image,nan=d['vmin'])-d['vmin'])/(d['vmax']-d['vmin']),0,1)
        level=np.floor(255*np.arcsinh(scaled/.1)/np.arcsinh(10)+.5).astype('uint8')
        rgb=np.repeat(level[...,None],3,axis=2);rgb[~p.valid]=[67,23,75]
        EVIDENCE.mkdir(parents=True,exist_ok=True)
        ref=EVIDENCE/(name+'-reference.png')
        if not ref.exists():Image.fromarray(np.flipud(rgb)).save(ref)
        counts,edges=diag['valid_science']['histogram'].values()
        fig,ax=plt.subplots(figsize=(7,3));ax.stairs(counts,edges);ax.set_yscale('symlog',linthresh=1)
        ax.set_xlabel('Native valid IMAGE (MJy/sr)');ax.set_ylabel('Pixel count');ax.set_title(field+' / '+obs['observation_id'])
        fig.tight_layout();hist=EVIDENCE/(name+'-histogram.png')
        if not hist.exists():fig.savefig(hist,dpi=120)
        plt.close(fig)
        if field=='m101':
            shape=prepared['manifest']['processing']['shape'];a=prepared['arrays']['SCI_'+'AB'[index]];mask=prepared['arrays']['COMMON'];display=prepared['manifest']['display']
        else:
            f=prepared['frames'][index];shape=f['shape'];a=f['arrays']['SCI'];mask=f['arrays']['VALID'];display=prepared['display']
        values=np.frombuffer(base64.b64decode(a['data']),dtype='<f4');valid=np.frombuffer(base64.b64decode(mask['data']),dtype='u1').astype(bool)
        measurements.append(dict(id=name,source_sha256=expected,source_url=obs['source']['source_url'],native=diag,
            prepared=dict(shape=shape,valid_percentage=float(valid.mean()*100),valid_science=distribution(values[valid]),display=display),
            native_pixel_count_ratio=p.image.size/(shape[0]*shape[1])))
    catalog=dict(schema_version='1.0',usage='Native observation inspection only; no temporal gate changes',entries=entries)
    write_changed(OUT/'catalog.json',json.dumps(catalog,indent=2).encode())
    write_changed(EVIDENCE/'measurements.json',json.dumps(measurements,indent=2,allow_nan=False).encode())
    print(json.dumps([dict(id=m['id'],native=m['native']['shape'],valid=m['native']['valid_percentage'],categories=m['native']['categories'],ratio=m['native_pixel_count_ratio']) for m in measurements]))
    return catalog

if __name__=='__main__':build()
