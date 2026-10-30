"""Bounded optical HiPS context, never part of scientific measurements."""
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime,timezone
from io import BytesIO
import hashlib
import json
import urllib.request
import numpy as np
from PIL import Image
from astropy.wcs import WCS
from astropy_healpix import HEALPix

ROOT=Path(__file__).resolve().parents[1]
BASE='https://irsa.ipac.caltech.edu/data/hips/CDS/DSS2/color'
CACHE=ROOT/'data/cache/native-reference'
OUT=ROOT/'web/dist/data/native'

def fetch(url):
    path=CACHE/hashlib.sha256(url.encode()).hexdigest()
    if path.exists():return path.read_bytes()
    with urllib.request.urlopen(url,timeout=25) as r:raw=r.read(5_000_001)
    if len(raw)>5_000_000:raise ValueError('Reference request exceeds bound')
    CACHE.mkdir(parents=True,exist_ok=True);path.write_bytes(raw)
    return raw

def build():
    properties=fetch(BASE+'/properties').decode()
    OUT.mkdir(parents=True,exist_ok=True)
    properties_path=OUT/'dss-properties.txt'
    properties_bytes=properties.encode('utf-8')
    if not properties_path.exists() or properties_path.read_bytes()!=properties_bytes:
        properties_path.write_bytes(properties_bytes)
    for field,ra,dec in [('m101',210.80227,54.34895),('r-draconis',248.16761083294998,66.75497941722)]:
        output=OUT/(field+'-reference.json')
        if output.exists() and json.loads(output.read_text()).get('mapping_version')=='hips-jpeg-xy-v2':continue
        wcs=WCS(naxis=2);wcs.wcs.ctype=['RA---TAN','DEC--TAN'];wcs.wcs.crval=[ra,dec];wcs.wcs.crpix=[360.5,360.5];wcs.wcs.cdelt=[-1/720,1/720]
        y,x=np.indices((720,720));sky=wcs.pixel_to_world(x,y)
        # Order 7 tiles contain 512x512 nested HEALPix subpixels (order 16).
        hp=HEALPix(nside=2**16,order='nested',frame='icrs');index=hp.skycoord_to_healpix(sky)
        tile=index//(512*512);sub=index%(512*512)
        px=np.zeros_like(sub);py=np.zeros_like(sub)
        for bit in range(9):px|=((sub>>(2*bit))&1)<<bit;py|=((sub>>(2*bit+1))&1)<<bit
        ids=np.unique(tile)
        if len(ids)>30:raise ValueError('Context tile request exceeds bounded footprint')
        urls=[BASE+f'/Norder7/Dir{int(i)//10000*10000}/Npix{i}.jpg' for i in ids]
        with ThreadPoolExecutor(max_workers=4) as pool:raws=list(pool.map(fetch,urls))
        image=np.zeros((720,720,3),dtype=np.uint8)
        for i,raw in zip(ids,raws):
            a=np.asarray(Image.open(BytesIO(raw)).convert('RGB'))
            if a.shape!=(512,512,3):raise ValueError('Unexpected HiPS tile geometry')
            # HiPS JPEG corners S/E/N/W map to (0,0)/(0,w)/(w,w)/(w,0).
            # Nested HEALPix local x runs S->E and y runs S->W.
            m=tile==i;image[m]=a[px[m],py[m]]
        png=OUT/(field+'-reference.png');Image.fromarray(np.flipud(image)).save(png)
        footprints={}
        for entry in json.loads((OUT/'catalog.json').read_text())['entries']:
            if entry['field']!=field:continue
            p=json.loads((ROOT/'web/dist'/entry['url'].removeprefix('./')).read_text());corners=np.array(p['diagnostics']['coverage']['corners_icrs_deg'])
            fx,fy=wcs.world_to_pixel_values(corners[:,0],corners[:,1]);footprints[entry['id']]=np.column_stack([fx,719-fy]).tolist()
        meta=dict(field=field,survey='CDS/P/DSS2/color',usage='Optical context only; never a temporal frame or scientific array',
            title='DSS2 optical color / CDS HiPS, served by IRSA',fov_deg=1,shape=[720,720],
            image='./data/native/'+png.name,image_sha256=hashlib.sha256(png.read_bytes()).hexdigest(),
            credit='Digitized Sky Survey — STScI/NASA. Colored and HEALPix tiled by CDS (CNRS/Unistra).',
            acknowledgement=next(s.split('=',1)[1].strip() for s in properties.splitlines() if s.startswith('obs_ack ')),
            copyright_url='https://archive.stsci.edu/dss/copyright.html',
            properties_url=BASE+'/properties',properties_sha256=hashlib.sha256(properties.encode()).hexdigest(),
            reference_epoch='Historical photographic plates, survey-wide 1975–1999; individual plate dates not inferred.',
            spectral_regime='Optical; not wavelength compatible with SPHEREx detector 2',
            method='Nearest HEALPix sample to TAN grid using Astropy HEALPix; order 7 / tile width 512. HiPS JPEG row=local HEALPix x, column=local HEALPix y; final TAN y flipped north up. Display context only.',
            mapping_version='hips-jpeg-xy-v2',
            wcs=dict(wcs.to_header()),footprints=footprints,
            restricted_field_pixels=28.8,created_at_utc=datetime.now(timezone.utc).isoformat(),
            tiles=[dict(url=u,sha256=hashlib.sha256(b).hexdigest(),size_bytes=len(b)) for u,b in zip(urls,raws)])
        output.write_text(json.dumps(meta,indent=2),encoding='utf-8');print(field,len(ids),png.stat().st_size)

if __name__=='__main__':build()
