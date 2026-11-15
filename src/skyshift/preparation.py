"""Deterministic common-grid products with conservative masks and provenance."""
from __future__ import annotations
from pathlib import Path
from hashlib import sha256
from importlib.metadata import version
import json
import shutil
import numpy as np
from astropy.io import fits
from reproject import reproject_interp
from . import __version__
from .archive import utc_now,record_file,sha256_file
from .coordinates import common_grid
from .models import ComparisonManifest,DisplaySettings,SkyRegion,Suitability,CheckResult
from .products import Product
from .suitability import screen_pair

ARRAY_NAMES=('SCI_A','SCI_B','VALID_A','VALID_B','COMMON','WAVE_A','WAVE_B','BAND_A','BAND_B','SEPARATION')


def project_pair(a:Product,b:Product,region:SkyRegion):
    report,meta=screen_pair(a,b,region)
    out_wcs=meta['wcs'];shape=meta['shape']
    arrays={}
    for suffix,p in zip(('A','B'),(a,b)):
        for label,data in [('SCI',p.image),('WAVE',p.wavelength_um),('BAND',p.bandwidth_um)]:
            output,footprint=reproject_interp((data,p.wcs),out_wcs,shape_out=shape,order='bilinear')
            arrays[f'{label}_{suffix}']=np.asarray(output,dtype=np.float32)
        support,footprint=reproject_interp((p.valid.astype(float),p.wcs),out_wcs,shape_out=shape,order='bilinear')
        valid=(footprint>0)&np.isfinite(support)&(support>=1-1e-10)
        valid&=np.isfinite(arrays[f'SCI_{suffix}'])&np.isfinite(arrays[f'WAVE_{suffix}'])&np.isfinite(arrays[f'BAND_{suffix}'])
        arrays[f'VALID_{suffix}']=valid.astype(np.uint8)
    common=meta['common_support'] & arrays['VALID_A'].astype(bool)&arrays['VALID_B'].astype(bool)
    arrays['COMMON']=common.astype(np.uint8)
    arrays['SEPARATION']=np.asarray(meta['spectral_separation'],dtype=np.float32)
    for label in ('SCI_A','SCI_B'):
        arrays[label]=np.where(common,arrays[label],np.float32(np.nan)).astype(np.float32)
    return arrays,out_wcs,report


def write_prepared(path,arrays,wcs):
    hdus=[fits.PrimaryHDU()]
    for name in ARRAY_NAMES:
        h=fits.ImageHDU(arrays[name],header=wcs.to_header(),name=name)
        h.header['BUNIT']='MJy/sr' if name.startswith('SCI') else 'um' if name.startswith(('WAVE','BAND')) else ''
        hdus.append(h)
    fits.HDUList(hdus).writeto(path,overwrite=False,checksum=True)


def numeric_hash(array):
    dtype=np.uint8 if np.asarray(array).dtype.kind in 'bu' else np.dtype('<f4')
    values=np.ascontiguousarray(array,dtype=dtype).copy()
    if values.dtype.kind=='f':values[np.isnan(values)]=np.float32(np.nan)
    return sha256(values.tobytes()).hexdigest()


def prepare_review_bundle(a,b,region,output:Path,registration:dict,response:dict,review_evidence:dict[str,Path]|None=None):
    arrays,wcs,screen=project_pair(a,b,region)
    if screen['suitability']['status']=='rejected':raise ValueError('Rejected engineering screens cannot be prepared as a comparison bundle')
    if registration['status']!='pass':raise ValueError('Independent registration check must pass before a real review bundle is prepared')
    output.mkdir(parents=True,exist_ok=False)
    for d in ('sources','calibration','prepared','diagnostics'): (output/d).mkdir()
    observations=[]
    calibration_files={}
    for suffix,p in zip(('A','B'),(a,b)):
        obs=p.observation.model_copy(deep=True)
        original=Path(obs.source.path);relative=f'sources/{suffix}.fits'
        shutil.copyfile(original,output/relative)
        obs.source.path=relative
        cal=obs.spectral_calibration
        if cal:
            rel='calibration/'+Path(cal.path).name
            if rel not in calibration_files:
                shutil.copyfile(cal.path,output/rel);calibration_files[rel]=cal.sha256
            cal.path=rel
        observations.append(obs)
    write_prepared(output/'prepared/pair.fits',arrays,wcs)
    for name,value in [('registration.json',registration),('response.json',response),('screen.json',screen)]:
        (output/'diagnostics'/name).write_text(json.dumps(value,indent=2,allow_nan=False),encoding='utf-8')
    for name,path in (review_evidence or {}).items():
        if '/' in name or '\\' in name or name in ('.','..'):raise ValueError('Evidence filenames must be plain names')
        shutil.copyfile(path,output/'diagnostics'/name)
    # Include the exact implementation needed to inspect/reproduce this snapshot.
    code_root=Path(__file__).parent
    for source in code_root.glob('*.py'):
        target=output/'reproduction/src/skyshift'/source.name;target.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(source,target)
    project_root=code_root.parents[1]
    for filename in ('pyproject.toml','requirements-lock.txt','README.md'):
        if (project_root/filename).exists():shutil.copyfile(project_root/filename,output/'reproduction'/filename)
    for filename in ('reviewer_guide.md','methods.md','data_dossier.md','alternative_fields.md'):
        if (project_root/'docs'/filename).exists():shutil.copyfile(project_root/'docs'/filename,output/'diagnostics'/filename)
    finite=np.concatenate([arrays[n][arrays['COMMON'].astype(bool)] for n in ('SCI_A','SCI_B')])
    vmin,vmax=[float(v) for v in np.percentile(finite,[1,99.5])]
    if vmax<=vmin:vmax=vmin+1
    code_hashes={p.name:sha256_file(p) for p in code_root.glob('*.py')}
    software_versions={n:version(n) for n in ('numpy','astropy','scipy','reproject','pydantic')}
    identity={'source_hashes':[o.source.sha256 for o in observations],'calibration_hashes':calibration_files,'region':region.model_dump(),'pipeline':'preparation-v1','policy':screen['policy'],
        'code_hashes':code_hashes,'software_versions':software_versions}
    pair_id='pair-'+sha256(json.dumps(identity,sort_keys=True).encode()).hexdigest()[:20]
    processing={'pipeline':'preparation-v1','method':'reproject_interp','order':'bilinear','output_wcs':dict(wcs.to_header()),'shape':list(arrays['COMMON'].shape),
        'pixel_scale_arcsec':6.15,'mask_policy':'conservative-v0.1','support_rule':'all contributing bilinear samples valid',
        'background_subtracted':False,'psf_matched':False,'review_mode':True,'scientific_approval':'PENDING',
        'numeric_hashes':{n:numeric_hash(arrays[n]) for n in ARRAY_NAMES},
        'code_hashes':code_hashes,'registration_context':registration.get('region'),
        'reconstruction_absolute_tolerance':1e-6,'reconstruction_relative_tolerance':1e-6,
        'uncertainty_note':'Native variances retained in original FITS. No resampled variance/significance map is claimed; interpolation creates covariance.'}
    file=record_file(output/'prepared/pair.fits');file.path='prepared/pair.fits'
    citations=['SPHEREx QR2 DOI: https://doi.org/10.26131/IRSA652',
        'This publication makes use of data products from the Spectro-Photometer for the History of the Universe, Epoch of Reionization and Ices Explorer (SPHEREx), which is a joint project of the Jet Propulsion Laboratory and the California Institute of Technology, and is funded by the National Aeronautics and Space Administration.',
        'Gaia DR3: https://doi.org/10.1051/0004-6361/202243940',
        'This work has made use of data from the European Space Agency (ESA) mission Gaia, processed by the Gaia Data Processing and Analysis Consortium (DPAC).']
    suitability=Suitability.model_validate(screen['suitability'])
    for check in suitability.checks:
        if check.code=='scientific_review':
            check.explanation='Engineering registration and response diagnostics are available. Internal technical review and qualified external scientific assessment have not been completed.'
    suitability.checks.insert(-1,CheckResult(code='independent_registration',status='pass',explanation='Native Gaia-anchored reference residuals meet the declared engineering policy. No fitted correction was applied.',
        measurements={'references':registration['reference_count'],'median_residual_arcsec':registration['median_residual_arcsec'],'p95_residual_arcsec':registration['p95_residual_arcsec']}))
    manifest=ComparisonManifest(app_version=__version__,pair_id=pair_id,dataset_kind='real',created_at=utc_now(),region=region,observations=observations,
        suitability=suitability,processing=processing,prepared_files=[file],display=DisplaySettings(vmin=vmin,vmax=vmax),
        software_versions=software_versions,citations=citations)
    (output/'manifest.json').write_text(manifest.model_dump_json(indent=2),encoding='utf-8')
    (output/'review.json').write_text(json.dumps({'scientific_approval':'PENDING','internal_technical_review':{'status':'PENDING','reviewer':None,'findings':None},
        'external_scientific_review':{'status':'PENDING','reviewer':None,'qualifications':None,'findings':None},
        'questions_for_specialist':['Are the local spectral-response differences acceptable for qualitative position comparison of this extended galaxy field?',
        'Do the native-image profile fits and Gaia references adequately constrain local registration despite undersampling and blending?',
        'Is the public QR2 spectral/ePSF calibration association correctly interpreted?',
        'Could local wavelength, background, or PSF variation mimic a feature a novice might call motion?']},indent=2),encoding='utf-8')
    return manifest
