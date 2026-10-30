"""Explicit adapter for IRSA's published 102-plane tutorial cube.

No temporal eligibility, flux conversion, background fitting, interpolation or
PSF treatment is introduced. Original IMAGE/NHITS/FLAGS samples are retained.
"""
import base64
import gzip
import hashlib
import json
from pathlib import Path
import warnings
import numpy as np
from astropy.io import fits
from astropy.wcs import WCS
from astropy.visualization import ZScaleInterval
from .archive import sha256_file

ADAPTER='irsa-mosaic-cube-v1'
KNOWN_FLAGS={'OVERFLOW':1,'OUTLIER':19,'SOURCE':21}


def read_mosaic(path,expected_sha256):
    if sha256_file(path)!=expected_sha256:raise ValueError('Mosaic source identity changed; explicit adapter review required')
    with fits.open(path,memmap=False) as hdul:
        for role in ['IMAGE','NHITS','FLAGS','SPECTRAL_CHANNELS','WCS-WAVE']:
            if role not in hdul:raise ValueError('Missing official mosaic HDU: '+role)
        image=np.array(hdul['IMAGE'].data,dtype='<f4',copy=True)
        hits=np.array(hdul['NHITS'].data,dtype='<i4',copy=True)
        flags=np.array(hdul['FLAGS'].data,dtype='<u4',copy=True)
        if image.ndim!=3 or image.shape[0]!=102 or image.shape[1]*image.shape[2]>300000 or hits.shape!=image.shape or flags.shape!=image.shape:
            raise ValueError('Unsupported mosaic dimensions or channel count')
        if not np.issubdtype(hdul['NHITS'].data.dtype,np.integer) or not np.issubdtype(hdul['FLAGS'].data.dtype,np.integer) or np.any(hits<0):raise ValueError('Invalid mosaic count/flag array')
        header=hdul['IMAGE'].header
        if header.get('BUNIT','').strip()!='MJy/sr' or header.get('RADESYS')!='ICRS':raise ValueError('Unsupported mosaic intensity unit/frame')
        definitions={k[3:]:v for k,v in hdul['FLAGS'].header.items() if k.startswith('MP_')}
        if definitions!=KNOWN_FLAGS:raise ValueError('Unreviewed mosaic flag convention')
        table=hdul['WCS-WAVE'].data
        planes=np.asarray(table['PLANE'][0]);wave=np.asarray(table['WAVELENGTHS'][0]).ravel();band=np.asarray(table['BANDWIDTHS'][0]).ravel()
        spectral=hdul['SPECTRAL_CHANNELS'].data
        if not np.array_equal(planes,np.arange(1,103)) or len(spectral)!=102 or not np.isfinite([wave,band]).all() or np.any(np.diff(wave)<=0) or np.any(band<=0):raise ValueError('Unsupported wavelength-plane mapping')
        if not np.array_equal(wave,spectral['WAVELENGTH']) or not np.array_equal(band,spectral['BANDWIDTH']):raise ValueError('Mosaic wavelength tables disagree')
        with warnings.catch_warnings():
            warnings.simplefilter('ignore')
            wcs=WCS(header,fobj=hdul).celestial
        wh=dict(wcs.to_header())
        if wh.get('CTYPE1')!='RA---TAN' or wh.get('CTYPE2')!='DEC--TAN' or any(k.startswith(('A_','B_','PC')) for k in wh):raise ValueError('Unsupported display WCS; explicit projection adapter required')
        known=sum(1<<v for v in KNOWN_FLAGS.values())
        valid=np.isfinite(image)&(hits>0)&((flags&np.uint32((~known)&0xffffffff))==0)&((flags&np.uint32((1<<1)|(1<<19)))==0)
        channels=[{'plane':i+1,'wavelength_um':float(wave[i]),'bandwidth_um':float(band[i]),'detector':int(spectral['DETECTOR'][i]),'subchannel':int(spectral['SUBCHAN'][i])} for i in range(102)]
        return dict(image=image,hits=hits,flags=flags,valid=valid,wcs=wh,channels=channels,
                    header=header.tostring(),hdus=[h.name for h in hdul],flag_definitions=KNOWN_FLAGS,
                    recorded_dates={k:header[k] for k in header if 'DATE' in k or k.startswith(('MJD-BEG','MJD-END'))})


def encode(array,dtype):
    raw=np.ascontiguousarray(array,dtype=dtype).tobytes()
    return {'dtype':dtype,'data':base64.b64encode(raw).decode(),'sha256':hashlib.sha256(raw).hexdigest()}


def prepare_planes(cube,output,source):
    output=Path(output);output.mkdir(parents=True,exist_ok=True)
    channels=[];total=0
    for i,channel in enumerate(cube['channels']):
        valid=cube['valid'][i];values=cube['image'][i][valid]
        lo,hi=np.percentile(values,[1,99.7]).tolist() if values.size else (0.,1.)
        zl,zh=ZScaleInterval().get_limits(values) if values.size else (0.,1.)
        display={'percentile':{'vmin':float(lo),'vmax':float(max(hi,lo+1e-6))},'zscale':{'vmin':float(zl),'vmax':float(max(zh,zl+1e-6))}}
        payload={'schema_version':'1.0','kind':'spherex_mosaic_plane','usage':'multi_epoch_wavelength_context_only',
                 'temporal_comparison_allowed':False,'source_sha256':source['sha256'],'channel':channel,'shape':list(valid.shape),
                 'arrays':{k:encode(a,d) for k,a,d in [('SCI',cube['image'][i],'<f4'),('HITS',cube['hits'][i],'<i4'),('FLAGS',cube['flags'][i],'<u4'),('VALID',valid,'|u1')]}}
        raw=json.dumps(payload,separators=(',',':'),allow_nan=False).encode()
        packed=gzip.compress(raw,compresslevel=9,mtime=0)
        name=f'plane-{i+1:03d}.json.gz';path=output/name
        if path.exists() and path.read_bytes()!=packed:raise ValueError('Prepared mosaic bytes changed; use a new versioned product directory')
        if not path.exists():path.write_bytes(packed)
        total+=len(packed)
        channels.append({**channel,'url':'./data/mosaics/m101-v1/'+name,'sha256':hashlib.sha256(packed).hexdigest(),'bytes':len(packed),'decoded_bytes':len(raw),
                         'display':display,'valid_fraction':float(valid.mean()),'coverage_fraction':float((cube['hits'][i]>0).mean()),'available':bool(values.size)})
    return channels,total
