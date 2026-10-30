"""Bounded metadata/header preselection; never scientific pair approval.

Global SIA band ranges do not describe the wavelength at a sky position. Read
at most twelve 64-KiB prefixes, use the pinned calibration at a 5x5 sky grid,
then prefer a mutually compatible set. Full pixel/mask/reference screening is
still mandatory after acquiring the selected cutouts.
"""
import io
from itertools import combinations
import json
import math
from pathlib import Path
import re
from urllib.parse import urlsplit

from astropy.io import fits
from astropy.time import Time
from astropy.wcs import WCS
import astropy.units as u
import numpy as np
from scipy.ndimage import map_coordinates

from .archive import fetch_header_prefix, sha256_file
from .coordinates import common_grid
from .suitability import ScreeningPolicy

MAX_PROBES=12


def samples(region):
    wcs,shape=common_grid(region)
    x,y=np.meshgrid(np.linspace(0,shape[1]-1,5),np.linspace(0,shape[0]-1,5))
    ra,dec=wcs.pixel_to_world_values(x.ravel(),y.ravel())
    return np.asarray(ra),np.asarray(dec)


def footprint_contains(polygon,ra,dec):
    """Convex spherical polygon half-spaces, including RA wrap and poles."""
    words=(polygon or '').split()
    if words[:2]!=['POLYGON','ICRS']:raise ValueError('Unsupported metadata sky footprint')
    values=np.asarray([float(v) for v in words[2:]])
    if len(values)<6 or len(values)%2 or not np.isfinite(values).all():raise ValueError('Invalid metadata sky footprint')
    corners=values.reshape(-1,2)
    if np.allclose(corners[0],corners[-1],rtol=0,atol=1e-10):corners=corners[:-1]
    def vectors(a,b):
        a,b=np.radians(a),np.radians(b)
        return np.stack([np.cos(b)*np.cos(a),np.cos(b)*np.sin(a),np.sin(b)],axis=-1)
    v=vectors(corners[:,0],corners[:,1]);centre=v.sum(axis=0);q=vectors(ra,dec)
    if len(v)<3 or np.linalg.norm(centre)<1e-8:raise ValueError('Ambiguous metadata sky footprint')
    for a,b in zip(v,np.roll(v,-1,axis=0)):
        normal=np.cross(a,b);orientation=np.dot(normal,centre)
        if abs(orientation)<1e-12:raise ValueError('Degenerate metadata sky footprint')
        if np.any((q@normal)*np.sign(orientation)<-1e-10):return False
    return True


def quantiles(rows,count):
    ordered=sorted(rows,key=lambda r:(float(r['t_min']),r.get('obs_id',r.get('observation_id'))))
    if len(ordered)<=count:return ordered
    return [ordered[i] for i in sorted({round(j*(len(ordered)-1)/(count-1)) for j in range(count)})] if count>1 else [ordered[0]]


def probe_url(row):
    try:
        cloud=json.loads(row['cloud_access'])['aws']
        if cloud['bucket_name']=='nasa-irsa-spherex' and cloud['region']=='us-east-1' and cloud['key'].startswith(('qr2/level2/','qr3/level2/')) and '..' not in cloud['key']:
            return 'https://nasa-irsa-spherex.s3.us-east-1.amazonaws.com/'+cloud['key']
    except (ValueError,KeyError,TypeError):pass
    return row['access_url']


def metadata_pool(rows,request,ra,dec):
    chosen={};rejected=[]
    start=Time(request.start_date,scale='utc').mjd if request.start_date else -math.inf
    end=Time(request.end_date,scale='utc').mjd+1 if request.end_date else math.inf
    for row in rows:
        if row.get('energy_bandpassname')!=f'SPHEREx-D{request.detector}':continue
        try:
            url=urlsplit(row['access_url']);t=float(row['t_min'])
            if url.scheme!='https' or url.hostname!='irsa.ipac.caltech.edu' or not url.path.startswith(f'/ibe/data/spherex/{request.release}/level2/') or url.query or url.username:raise ValueError('Unapproved source/release')
            if not math.isfinite(t) or not start<=t<end:raise ValueError('Outside requested UTC start-date range')
            if row.get('calib_level') not in ('2',2):raise ValueError('Not a calibrated level-2 image')
            if not footprint_contains(row.get('s_region'),ra,dec):raise ValueError('Requested sky grid is not contained in the metadata footprint')
            if request.wavelength_um is not None and not float(row['em_min'])*1e6<=request.wavelength_um<=float(row['em_max'])*1e6:raise ValueError('Requested wavelength outside detector range')
            old=chosen.get(row['obs_id'])
            if old is None or (row.get('obs_release_date') or '',row['access_url'])>(old.get('obs_release_date') or '',old['access_url']):chosen[row['obs_id']]=row
        except (ValueError,KeyError,TypeError) as exc:
            rejected.append({'observation_id':row.get('obs_id'),'stage':'metadata','reason':str(exc)})
    return list(chosen.values()),rejected


def calibration_layers(path,detector):
    with fits.open(path,memmap=False) as h:
        result=[]
        for name in ['CWAVE','CBAND']:
            layer=h[name]
            if layer.header.get('DETECTOR')!=detector or layer.data.shape!=(2040,2040):raise ValueError('Unsupported preflight calibration')
            factor=u.Unit(layer.header['BUNIT']).to(u.um)
            result.append(np.asarray(layer.data,dtype=np.float32).copy()*factor)
        return result,h['CWAVE'].header.get('DETCOORD')


def evaluate_header(raw,row,request,ra,dec,layers,orientation):
    stream=io.BytesIO(raw)
    primary=fits.Header.fromfile(stream);header=fits.Header.fromfile(stream)
    if primary.get('SIMPLE') is not True or primary.get('NAXIS')!=0 or header.get('EXTNAME')!='IMAGE':raise ValueError('Unsupported FITS header layout')
    if header.get('OBSID')!=row['obs_id'] or header.get('DETECTOR')!=request.detector:raise ValueError('Header identity differs from metadata')
    version=str(primary.get('VERSION',''))
    if not version.startswith('6.' if request.release=='qr2' else '7.'):raise ValueError('Header processing version differs from supported release')
    if header.get('L2DQAFLG')!='Pass':raise ValueError('No passing exposure-level quality assessment')
    scale=str(header.get('TIMESYS','')).lower()
    if scale not in {'utc','tai','tt','tdb'}:raise ValueError('Unsupported observation timescale')
    begin=Time(header['DATE-BEG'],format='isot',scale=scale)
    if abs(begin.mjd-float(header['MJD-BEG']))*86400>.01 or abs(begin.utc.mjd-float(row['t_min']))*86400>1:raise ValueError('Header time differs from archive metadata')
    if header.get('RADESYS')!='ICRS' or header.get('DETCOORD')!=orientation or header.get('WCSNAMEA')!='0-based active pixel coordinates':raise ValueError('Unsupported frame or detector orientation')
    wcs=WCS(header).celestial;x,y=wcs.world_to_pixel_values(ra,dec)
    if not np.isfinite([x,y]).all() or np.any(x<0) or np.any(y<0) or np.any(x>header['NAXIS1']-1) or np.any(y>header['NAXIS2']-1):raise ValueError('Requested grid is outside the actual image WCS')
    for k,v in {'CRVAL1A':0,'CRVAL2A':0,'CDELT1A':1,'CDELT2A':1,'CTYPE1A':'LINEAR','CTYPE2A':'LINEAR'}.items():
        if header.get(k)!=v:raise ValueError('Unsupported detector coordinate mapping')
    px=x+1-header['CRPIX1A'];py=y+1-header['CRPIX2A']
    wave,band=[map_coordinates(a,[py,px],order=1,mode='constant',cval=np.nan,prefilter=False) for a in layers]
    if not np.isfinite([wave,band]).all() or np.any(band<=0):raise ValueError('No calibrated local wavelength support')
    if request.wavelength_um is not None and abs(float(wave[12])-request.wavelength_um)>float(band[12])/2:raise ValueError('Requested wavelength does not overlap the local field-centre band')
    return {'observation_id':row['obs_id'],'pipeline_version':version,'t_min':float(begin.utc.mjd),
            'centre_wavelength_um':float(wave[12]),'centre_bandwidth_um':float(band[12]),
            'sample_wavelengths_um':wave.tolist(),'sample_bandwidths_um':band.tolist(),
            'exposure_quality':'Pass','pixel_quality':'UNKNOWN until full cutout masks are checked'}


def choose_compatible(probes,count):
    """Find the strongest all-pairs-compatible group in the bounded probe set.

    Cardinality precedes temporal span, then maximum field-wide wavelength
    separation and stable observation identities break ties. Pair approval is
    still deferred to full arrays, masks and independent references. Testing
    every subset is cheap at the hard twelve-probe/six-frame acquisition bounds;
    it avoids assuming that compatibility with a neighbour is transitive.
    """
    if not 1 <= count <= 6 or len(probes)>MAX_PROBES:
        raise ValueError('Compatible selection exceeds the bounded search')
    policy=ScreeningPolicy()
    ordered=sorted(probes,key=lambda p:(p['t_min'],p['observation_id']))
    if len({p['observation_id'] for p in ordered})!=len(ordered):
        raise ValueError('Duplicate header probe observation identity')
    pairs=[];edges={}
    def separation(a,b):
        return max(abs(x-y)/min(dx,dy) for x,y,dx,dy in zip(a['sample_wavelengths_um'],b['sample_wavelengths_um'],a['sample_bandwidths_um'],b['sample_bandwidths_um']))
    for i,a in enumerate(ordered):
        for j in range(i+1,len(ordered)):
            b=ordered[j];distance=separation(a,b);days=abs(a['t_min']-b['t_min'])
            if (a['pipeline_version']==b['pipeline_version'] and
                days>=policy.minimum_time_separation_days and
                distance<=policy.max_wavelength_separation_in_bandwidths):
                edges[i,j]=distance
                pairs.append((distance,-days,a['observation_id'],b['observation_id']))
    for size in range(min(count,len(ordered)),1,-1):
        groups=[]
        for group in combinations(range(len(ordered)),size):
            links=list(combinations(group,2))
            if all(link in edges for link in links):
                score=(-(ordered[group[-1]]['t_min']-ordered[group[0]]['t_min']),
                       max(edges[link] for link in links),
                       tuple(ordered[i]['observation_id'] for i in group))
                groups.append((score,group))
        if groups:
            chosen=min(groups)[1]
            return [ordered[i] for i in chosen],pairs
    return [],pairs


def preselect(rows,request,calibration,output,*,cancel=None,progress=lambda _:None):
    ra,dec=samples(request.region);pool,rejections=metadata_pool(rows,request,ra,dec)
    output=Path(output);output.mkdir(parents=True,exist_ok=False)
    report={'version':'header-preselection-v2','mode':request.selection,'metadata_rows':len(rows),'contained_candidates':len(pool),
            'ranking_policy':'Hard metadata/header eligibility, then maximum all-pairs-compatible group cardinality, widest UTC span, smallest worst field-wide spectral separation, stable observation identities. At most twelve temporal-quantile header probes; not an exhaustive archive search.',
            'probe_limit':MAX_PROBES,'probe_bytes_limit':MAX_PROBES*65536,'header_attempts':[],'probes':[],'rejections':rejections,
            'limitations':['A 5x5 wavelength preflight ranks candidates; it is not full response-function equivalence or pair approval.',
                           'Pixel masks, PSF, background, variance and stationary registration remain unverified until full preparation.']}
    if not pool:
        selected=[]
        report['outcome']='No observations in the bounded archive response contain this field and satisfy the requested release, wavelength and UTC dates.'
    elif calibration is None:
        selected=quantiles(pool,request.max_frames) if request.wavelength_um is None else []
        report['outcome']='No pinned local calibration; independent chronological inspection only.'
    else:
        layers,orientation=calibration_layers(calibration,request.detector)
        report['calibration_sha256']=sha256_file(calibration)
        bounded=quantiles(pool,MAX_PROBES);probes=[]
        for i,row in enumerate(bounded):
            if cancel and cancel.is_set():raise ValueError('Preselection cancelled')
            progress(f'Checking local wavelengths from bounded header {i+1}/{len(bounded)}')
            attempt={'observation_id':row['obs_id'],'url':probe_url(row)}
            report['header_attempts'].append(attempt)
            try:
                raw,evidence=fetch_header_prefix(probe_url(row))
                (output/f'header-{i:02d}.bin').write_bytes(raw)
                attempt.update({'prefix_file':f'header-{i:02d}.bin',**evidence})
                p=evaluate_header(raw,row,request,ra,dec,layers,orientation);p['header_evidence']=evidence;probes.append(p)
                attempt['status']='passed_preflight'
            except (ValueError,OSError,KeyError) as exc:
                attempt.update({'status':'rejected','reason':str(exc)})
                report['rejections'].append({'observation_id':row['obs_id'],'stage':'header_preflight','reason':str(exc)})
        report['probes']=probes
        compatible,pairs=choose_compatible(probes,request.max_frames)
        report['compatible_pairs_in_probed_subset']=[{'a':a,'b':b,'max_sample_separation_bandwidths':s,'time_separation_days':-days} for s,days,a,b in sorted(pairs)]
        selected_probes=compatible if request.selection=='compatible' and compatible else quantiles(probes,request.max_frames)
        ids={p['observation_id'] for p in selected_probes};selected=[r for r in pool if r['obs_id'] in ids]
        report['outcome']='Preflight-compatible subset; full scientific screening still required.' if request.selection=='compatible' and compatible else 'Chronological inspection only; no comparison approval follows from this selection.'
    selected.sort(key=lambda r:(float(r['t_min']),r['obs_id']))
    report['selected_observation_ids']=[r['obs_id'] for r in selected]
    evidence=json.dumps(report,indent=2,allow_nan=False).encode('utf-8')
    if len(evidence)>8_000_000:raise ValueError('Preselection evidence exceeds its 8 MB bound')
    (output/'selection.json').write_bytes(evidence)
    return selected,report
