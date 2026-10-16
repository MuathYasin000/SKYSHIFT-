"""Portable evidence packets, integrity checks, and independent reconstruction."""
from __future__ import annotations
from pathlib import Path,PurePosixPath
import csv,io,json,zipfile,hashlib,shutil,re
import numpy as np
from astropy.io import fits
from .archive import sha256_file,download
from .models import ComparisonManifest
from .products import read_product
from .preparation import project_pair,ARRAY_NAMES

MAX_UNCOMPRESSED=150_000_000


def safe_member(name):
    p=PurePosixPath(name)
    parts=name.split('/')
    if not name or len(name)>1024 or any(ord(c)<32 for c in name) or '\\' in name or ':' in name or p.is_absolute() or any(x in ('','..','.') or x.endswith(('.',' ')) or re.match(r'^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?:\.|$)',x,re.I) for x in parts):
        raise ValueError('Unsafe evidence archive path')
    return p


def export_packet(bundle:Path,destination:Path,manifest:ComparisonManifest|None=None):
    if destination.exists():raise FileExistsError('Choose a new evidence output path')
    baseline=ComparisonManifest.model_validate_json((bundle/'manifest.json').read_text(encoding='utf-8'))
    manifest=manifest or baseline
    if manifest.pair_id!=baseline.pair_id or manifest.processing!=baseline.processing or manifest.suitability!=baseline.suitability or manifest.observations!=baseline.observations:
        raise ValueError('User comparisons may change display and annotations, not scientific evidence')
    paths=[p for p in bundle.rglob('*') if p.is_file() and p.name!='hashes.json']
    payload={p.relative_to(bundle).as_posix():p.read_bytes() for p in paths}
    payload['manifest.json']=manifest.model_dump_json(indent=2).encode()
    payload['annotations.json']=json.dumps([a.model_dump(mode='json') for a in manifest.annotations],indent=2).encode()
    payload['citations.txt']='\n\n'.join(manifest.citations).encode()
    payload['README.txt']=("SKYSHIFT review evidence packet. Scientific approval: PENDING.\n"
        "Original FITS and spectral calibration are embedded; diagnostics and reproduction source are included.\n"
        "Install the project's pinned environment, then run: skyshift reconstruct packet.zip --output new-folder\n"
        "No motion, discovery, photometric variability, or calibrated significance is asserted.\n").encode()
    payload['hashes.json']=json.dumps({name:hashlib.sha256(data).hexdigest() for name,data in payload.items()},sort_keys=True,indent=2).encode()
    destination.parent.mkdir(parents=True,exist_ok=True)
    with zipfile.ZipFile(destination,'x',compression=zipfile.ZIP_DEFLATED,compresslevel=6) as z:
        for name,data in payload.items():safe_member(name);z.writestr(name,data)
    return {'path':str(destination),'size_bytes':destination.stat().st_size,'sha256':sha256_file(destination),'files':len(payload)}


def read_packet(path:Path):
    if path.stat().st_size>100_000_000:raise ValueError('Packet exceeds compressed size limit')
    with zipfile.ZipFile(path) as z:
        infos=z.infolist()
        if len(infos)>150 or sum(i.file_size for i in infos)>MAX_UNCOMPRESSED:raise ValueError('Packet exceeds safe extraction bounds')
        names=[i.filename for i in infos]
        if len(names)!=len(set(names)):raise ValueError('Duplicate evidence archive members')
        for name in names:safe_member(name)
        payload={name:z.read(name) for name in names}
    if 'hashes.json' not in payload or 'manifest.json' not in payload:raise ValueError('Evidence manifest or hashes are missing')
    hashes=json.loads(payload['hashes.json'])
    if set(hashes)!=set(payload)-{'hashes.json'}:raise ValueError('Hash inventory must cover every evidence member exactly')
    for name,digest in hashes.items():
        if hashlib.sha256(payload[name]).hexdigest()!=digest:raise ValueError(f'Evidence checksum mismatch: {name}')
    manifest=ComparisonManifest.model_validate_json(payload['manifest.json'])
    mode=json.loads(payload.get('packet.json',b'{"mode":"self_contained"}')).get('mode')
    if mode not in ('self_contained','references'):raise ValueError('Unsupported evidence packet mode')
    for file in [*[o.source for o in manifest.observations],*[o.spectral_calibration for o in manifest.observations if o.spectral_calibration],*manifest.prepared_files]:
        safe_member(file.path)
        if file.path not in payload and mode=='references' and file.source_url and file not in manifest.prepared_files:
            continue
        if file.path not in payload or hashlib.sha256(payload[file.path]).hexdigest()!=file.sha256:
            raise ValueError(f'Scientific input identity mismatch: {file.path}')
    return manifest,payload


def reconstruct_packet(packet:Path,output:Path,source_cache:Path|None=None):
    manifest,payload=read_packet(packet)
    processing=manifest.processing
    if processing.get('pipeline')!='preparation-v1' or processing.get('method')!='reproject_interp' or processing.get('order')!='bilinear':
        raise ValueError('Unsupported reconstruction method')
    if processing.get('background_subtracted') or processing.get('psf_matched'):
        raise ValueError('This reconstruction version supports unmodified-background, unmatched-PSF products only')
    if processing.get('scientific_approval')!='PENDING' or manifest.suitability.status not in ('pending','rejected'):
        raise ValueError('This release cannot import a claim of scientific approval')
    atol=float(processing['reconstruction_absolute_tolerance']);rtol=float(processing['reconstruction_relative_tolerance'])
    if not 0<=atol<=1e-6 or not 0<=rtol<=1e-6:raise ValueError('Reconstruction tolerances exceed this release policy')
    if source_cache and not source_cache.is_dir():raise ValueError('Source cache must be an extracted, verified full packet directory')
    output.mkdir(parents=True,exist_ok=False)
    for name,data in payload.items():
        target=output.joinpath(*safe_member(name).parts);target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(data)
    products=[]
    for o in manifest.observations:
        if o.spectral_calibration is None:raise ValueError('Missing spectral calibration')
        for source in (o.source,o.spectral_calibration):
            if not (output/source.path).exists():
                cached=source_cache/source.path if source_cache else None
                if cached and cached.is_file():
                    if sha256_file(cached)!=source.sha256:raise ValueError('Cached original differs from the recorded snapshot')
                    (output/source.path).parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(cached,output/source.path)
                else:
                    if not source.source_url:raise ValueError('Referenced input has no archive URL')
                    actual=download(source.source_url,output/source.path)
                    if actual.sha256!=source.sha256:raise ValueError('Archive data differ from the recorded snapshot; use the self-contained review packet')
        products.append(read_product(output/o.source.path,manifest.region,calibration=output/o.spectral_calibration.path,
            source_url=o.source.source_url,calibration_url=o.spectral_calibration.source_url))
    arrays,wcs,_=project_pair(*products,manifest.region)
    shape=arrays['COMMON'].shape
    for key,limit in [('center_x',shape[1]),('center_y',shape[0])]:
        value=getattr(manifest.display,key)
        if value is not None and not -.5<=value<limit-.5:raise ValueError('Viewport center is outside this field')
    results={}
    with fits.open(output/'prepared/pair.fits') as hdul:
        for name in ARRAY_NAMES:
            expected=np.asarray(hdul[name].data);actual=arrays[name]
            if name in ('COMMON','VALID_A','VALID_B'):passed=np.array_equal(actual,expected)
            else:passed=np.allclose(actual,expected,atol=atol,rtol=rtol,equal_nan=True)
            finite=np.isfinite(actual)&np.isfinite(expected)
            results[name]={'pass':bool(passed),'max_absolute_error':float(np.max(np.abs(actual[finite]-expected[finite]))) if finite.any() else None}
        expected_wcs=dict(hdul['SCI_A'].header)
        for key,value in wcs.to_header().items():
            if expected_wcs.get(key)!=value:raise ValueError(f'Reconstructed WCS differs: {key}')
    common=arrays['COMMON'].astype(bool)
    for annotation in manifest.annotations:
        x,y=wcs.world_to_pixel_values(annotation.ra_deg,annotation.dec_deg);ix,iy=int(np.rint(x)),int(np.rint(y))
        if not 0<=iy<common.shape[0] or not 0<=ix<common.shape[1] or not common[iy,ix]:raise ValueError('Annotation lies outside permitted common support')
    report={'status':'pass' if all(r['pass'] for r in results.values()) else 'fail','pair_id':manifest.pair_id,'scientific_approval':'PENDING',
        'arrays':results,'annotations_verified':len(manifest.annotations),'display_settings':manifest.display.model_dump(),
        'note':'This independently reruns the preparation arithmetic. It is not human scientific approval.'}
    (output/'reconstruction_result.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
    return report


def review_packet(packet:Path,output:Path):
    """Re-run arithmetic and reference/response diagnostics, without executing packet code."""
    reconstruction=reconstruct_packet(packet,output)
    manifest,_=read_packet(packet)
    from .registration import measure_registration
    from .response import response_report
    from .models import SkyRegion
    context=SkyRegion.model_validate(manifest.processing['registration_context'])
    products=[read_product(output/o.source.path,manifest.region,calibration=output/o.spectral_calibration.path,
        source_url=o.source.source_url,calibration_url=o.spectral_calibration.source_url) for o in manifest.observations]
    with (output/'diagnostics/gaia_dr3.csv').open() as f:catalogue=list(csv.DictReader(f))
    registration=measure_registration(*products,catalogue,context)
    response=response_report(*products,registration,output/'diagnostics/epsf_calibration.fits',manifest.region)
    # Association URLs are preserved in the original response record, independently hash-checked above.
    for name,value in [('registration',registration),('response',response)]:
        (output/f'recomputed_{name}.json').write_text(json.dumps(value,indent=2,allow_nan=False),encoding='utf-8')
    original=json.loads((output/'diagnostics/registration.json').read_text())
    agreement={key:bool(np.isclose(registration[key],original[key],atol=1e-9,rtol=1e-9)) for key in
        ('reference_count','quadrants','convex_hull_fraction','median_residual_pixels','p95_residual_pixels')}
    result={'reconstruction':reconstruction['status'],'registration':registration['status'],'registration_agreement':agreement,
        'scientific_approval':'PENDING','internal_technical_review':'PENDING',
        'note':'Automated reproduction completed. A human reviewer must inspect the evidence and document their own findings.'}
    (output/'independent_reproduction.json').write_text(json.dumps(result,indent=2),encoding='utf-8')
    return result
