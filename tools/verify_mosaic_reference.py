"""Independent NumPy display and Astropy WCS reference for the exact official cube."""
from pathlib import Path
import hashlib,json,sys,warnings
import numpy as np
from astropy.io import fits
from astropy.wcs import WCS
from evidence_output import fresh_run,write_report
ROOT=Path(__file__).resolve().parents[1]
out=fresh_run('irsa-mosaic-reference')
m=json.loads((ROOT/'web/dist/data/mosaics/m101-v1/manifest.json').read_text())
source=ROOT/'data/mosaics/originals/M101_irsa.fits'
assert hashlib.sha256(source.read_bytes()).hexdigest()==m['source']['sha256']
with fits.open(source) as hdul:
 i=62;image=hdul['IMAGE'].data[i].astype(float);hits=hdul['NHITS'].data[i];flags=hdul['FLAGS'].data[i].astype(np.uint32)
 known=(1<<1)|(1<<19)|(1<<21)
 valid=np.isfinite(image)&(hits>0)&((flags&np.uint32((~known)&0xffffffff))==0)&((flags&((1<<1)|(1<<19)))==0)
 limits=np.percentile(image[valid],[1,99.7]);c=m['channels'][i];assert c['display']['percentile']['vmin']==limits[0] and c['display']['percentile']['vmax']==limits[1]
 level=np.zeros(image.shape,dtype=float);v=np.clip((image[valid]-limits[0])/(limits[1]-limits[0]),0,1)
 level[valid]=np.floor(np.arcsinh(v/.06)/np.arcsinh(1/.06)*255+.5)
 x=level/255
 rgba=np.stack([np.floor(255*np.minimum(1,x*1.8)+.5),np.floor(255*x**1.5+.5),np.floor(255*x**3+.5),np.full(image.shape,255)],axis=-1).astype('u1')
 rgba[~valid,:3]=np.where((hits[~valid]>0)[:,None],np.array([67,23,75]),np.array([18,18,18]))
 with warnings.catch_warnings():warnings.simplefilter('ignore');wcs=WCS(hdul['IMAGE'].header,fobj=hdul).celestial
 grid=[(0,0),(133,133),(266,266),(20,240),(200,60)]
 samples=[]
 for x,y in grid:
  sky=wcs.pixel_to_world(x,y);samples.append({'x':x,'y':y,'ra_deg':float(sky.ra.deg),'dec_deg':float(sky.dec.deg)})
 raw=rgba.tobytes();(out/'plane-063-reference.rgba').open('xb').write(raw)
 report={'source_sha256':m['source']['sha256'],'plane':63,'wavelength_um':c['wavelength_um'],'display':c['display']['percentile'],'rgba_sha256':hashlib.sha256(raw).hexdigest(),'shape':list(image.shape),'wcs_samples':samples,'method':'Independent NumPy asinh/ember normalization and Astropy full-FITS celestial WCS; no source array modifications.'}
 write_report(out,'reference.json',json.dumps(report,indent=2));print(json.dumps({'output':str(out),**report}))
