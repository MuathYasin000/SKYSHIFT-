"""Bounded, traceable sky-position preparation using the established science code.

No fitted target alignment, background subtraction, PSF matching or photometric
variability is introduced. Every temporal link is screened and reference-checked.
"""
from __future__ import annotations

import base64
import csv
import hashlib
import io
import json
import math
from importlib.metadata import version
from pathlib import Path
from threading import Event
from urllib.parse import urlencode, urlsplit, parse_qs

import numpy as np
from pydantic import Field
from reproject import reproject_interp

from .archive import inventory, download, cutout_url, sha256_file, fetch_bytes, utc_now
from .coordinates import common_grid
from .intake import ObservationRequest
from .preparation import numeric_hash
from .products import read_product
from .registration import measure_registration, reference_position
from .suitability import screen_pair

ROOT = Path(__file__).resolve().parents[2]
CALIBRATION = {
    ('qr2', 2): {
        'path': 'data/calibration/spectral_wcs_D2_spx_cal-wcs-v4-2025-254.fits',
        'sha256': '40c49a5acbf7047b7cebf3d46471cb99639867996f48a22d0e283f7e529249d7',
        'url': 'https://nasa-irsa-spherex.s3.us-east-1.amazonaws.com/qr2/spectral_wcs/cal-wcs-v4-2025-254/2/spectral_wcs_D2_spx_cal-wcs-v4-2025-254.fits',
    },
}
LIMITATIONS = [
    'Qualitative inspection only; no confirmed motion, photometric variability or discovery.',
    'No PSF matching, background subtraction or significance map; blending and unflagged artifacts remain possible.',
    'WCS reprojection alone does not establish registration. Playback requires separate reference checks.',
    'CWAVE/CBAND screening is not equality of spectral response functions.',
    'The requested centre is a search position, not a propagated position or a detected source.',
]


class SequenceRequest(ObservationRequest):
    detector: int = Field(default=2, ge=1, le=6, strict=True)
    max_frames: int = Field(default=3, ge=1, le=6, strict=True)
    deep: bool = Field(default=False,strict=True)
    use_cache: bool = Field(default=True,strict=True)


class Cancelled(ValueError):
    pass


def check_cancel(cancel):
    if cancel and cancel.is_set():
        raise Cancelled('Investigation cancelled; no later result will replace it.')


def encode(array):
    a = np.ascontiguousarray(array, dtype=np.uint8 if array.dtype.kind in 'bu' else '<f4').copy()
    if a.dtype.kind == 'f':
        a[np.isnan(a)] = np.float32(np.nan)
    return {'dtype': 'uint8' if a.dtype.kind in 'bu' else 'float32', 'shape': list(a.shape),
            'data': base64.b64encode(a.tobytes()).decode(), 'numeric_sha256': numeric_hash(a)}


def prepare_exposure(product, region):
    """Use exactly the established grid and all-contributors-valid mask policy."""
    wcs, shape = common_grid(region)
    arrays = {}
    for name, data in [('SCI', product.image), ('WAVE', product.wavelength_um), ('BAND', product.bandwidth_um)]:
        value, _ = reproject_interp((data, product.wcs), wcs, shape_out=shape, order='bilinear')
        arrays[name] = np.asarray(value, dtype=np.float32)
    support, footprint = reproject_interp((product.valid.astype(float), product.wcs), wcs, shape_out=shape, order='bilinear')
    valid = (footprint > 0) & np.isfinite(support) & (support >= 1 - 1e-10)
    for a in arrays.values():
        valid &= np.isfinite(a)
    valid &= (arrays['WAVE'] > 0) & (arrays['BAND'] > 0)
    if not valid.any():
        raise ValueError('No usable measured pixels in the requested field')
    arrays['VALID'] = valid.astype(np.uint8)
    arrays['SCI'][~valid] = np.nan
    lo, hi = np.percentile(arrays['SCI'][valid], [1, 99.7]).tolist()
    if hi <= lo:
        hi = lo + 1
    obs = product.observation.model_dump(mode='json')
    for key in ('source', 'spectral_calibration'):
        if obs[key]:
            obs[key]['path'] = Path(obs[key]['path']).name
    return {'schema_version': '1.0', 'dataset_kind': 'real', 'usage': 'single_observation_only',
            'scientific_approval': 'PENDING', 'observation': obs, 'region': region.model_dump(),
            'shape': list(shape), 'native_shape': list(product.image.shape), 'pixel_scale_arcsec': 6.15,
            'wcs': dict(wcs.to_header()), 'arrays': {k: encode(v) for k, v in arrays.items()},
            'display': {'vmin': lo, 'vmax': hi, 'stretch': 'asinh', 'asinh_a': .06},
            'wavelength_range_um': [float(arrays['WAVE'][valid].min()), float(arrays['WAVE'][valid].max())],
            'processing': {'algorithm': 'reproject_interp bilinear', 'flag_policy': 'conservative-v0.1; SOURCE alone retained',
                           'spectral_basis': product.spectral_basis, 'usable_fraction': float(valid.mean()),
                           'unknown_flag_pixels': product.unknown_flag_pixels, 'masked_flags': product.fatal_flag_names,
                           'support': 'all bilinear contributors must be usable; no inpainting or target alignment',
                           'tool_sha256': sha256_file(Path(__file__))},
            'limitations': LIMITATIONS}


def selected_rows(rows, detector, count):
    # Fixed temporal quantiles, not an exhaustive pair search or optimization
    # against a hoped-for result. Keep every subsequent rejection.
    candidates = {}
    for row in rows:
        if row.get('energy_bandpassname') != f'SPHEREx-D{detector}':
            continue
        try:
            time = float(row['t_min'])
            if not math.isfinite(time):
                continue
            url = urlsplit(row['access_url'])
            if url.scheme != 'https' or url.hostname != 'irsa.ipac.caltech.edu' or not url.path.startswith('/ibe/data/spherex/') or url.query:
                continue
            previous=candidates.get(row['obs_id'])
            if previous is None or (row.get('obs_release_date') or '',row['access_url'])>(previous.get('obs_release_date') or '',previous['access_url']):
                candidates[row['obs_id']] = row
        except (TypeError, KeyError, ValueError):
            continue
    ordered = sorted(candidates.values(), key=lambda r: (float(r['t_min']), r['access_url']))
    indices = sorted({round(i * (len(ordered) - 1) / max(1, count - 1)) for i in range(min(count, len(ordered)))})
    return [ordered[i] for i in indices], len(ordered)


def verified_local_inputs(request):
    """Reuse authenticated originals only when their actual WCS contains the centre."""
    if request.release != 'qr2' or request.detector != 2 or request.deep:
        return []
    catalog = json.loads((ROOT/'web/dist/data/explore-catalog.json').read_text(encoding='utf-8'))
    result = []
    for field in catalog['fields']:
        # This is merely a cache index. read_product below checks actual WCS;
        # this proximity test never establishes usable support.
        da = math.radians(field['ra_deg'] - request.region.ra_deg)
        d1, d2 = map(math.radians, (field['dec_deg'], request.region.dec_deg))
        separation=math.degrees(2*math.asin(math.sqrt(max(0,min(1,math.sin((d1-d2)/2)**2+math.cos(d1)*math.cos(d2)*math.sin(da/2)**2)))))
        if separation > .02:
            continue
        for entry in field['observations']:
            record = json.loads((ROOT/'web/dist'/entry['url'].removeprefix('./')).read_text(encoding='utf-8'))
            size=parse_qs(urlsplit(record['observation']['source']['source_url']).query).get('size',['0'])[0]
            if float(size)<request.region.size_deg+2*separation-1e-9:continue
            identity = record['observation']['source']['sha256']
            for sidecar in (ROOT/'data/raw').glob(f"*/{entry['observation_id']}_D2.fits.source.json"):
                path = sidecar.with_suffix('').with_suffix('')
                if path.is_file() and sha256_file(path) == identity:
                    result.append(path)
    return result[:request.max_frames]


def reference_catalogue(region, output, cancel):
    # Same catalogue selection as the established native-reference validation.
    # A larger context does not relax the reference residual/coverage policies.
    if (abs(region.ra_deg-210.80227) < .02 and abs(region.dec_deg-54.34895) < .02
            and (ROOT/'research/validation/m101_context_gaia_dr3.csv').is_file()
            and (ROOT/'research/validation/m101_context_gaia_query.json').is_file()):
        raw = (ROOT/'research/validation/m101_context_gaia_dr3.csv').read_bytes()
        source = json.loads((ROOT/'research/validation/m101_context_gaia_query.json').read_text())
    else:
        query = ("SELECT TOP 2000 source_id,ra,dec,ref_epoch,pmra,pmdec,parallax,ruwe,phot_g_mean_mag "
                 "FROM gaia_dr3_source WHERE CONTAINS(POINT('ICRS',ra,dec),"
                 f"CIRCLE('ICRS',{region.ra_deg},{region.dec_deg},{region.size_deg/math.sqrt(2)}))=1 "
                 "AND phot_g_mean_mag<20 AND ruwe<1.4 AND pmra IS NOT NULL AND pmdec IS NOT NULL")
        url = 'https://irsa.ipac.caltech.edu/TAP/sync?' + urlencode({'REQUEST':'doQuery','LANG':'ADQL','FORMAT':'csv','QUERY':query})
        check_cancel(cancel)
        raw = fetch_bytes(url, max_bytes=2_000_000, timeout=30, attempts=2)
        source = {'url': url, 'query': query, 'retrieved_at_utc': utc_now().isoformat()}
    rows = list(csv.DictReader(io.StringIO(raw.decode('utf-8-sig'))))
    if len(rows) >= 2000:
        raise ValueError('Reference catalogue reached its row limit; truncation cannot approve registration')
    required = {'source_id','ra','dec','ref_epoch','pmra','pmdec','parallax'}
    if not rows or not required.issubset(rows[0]):
        raise ValueError('No supported Gaia reference catalogue returned')
    (output/'gaia.csv').write_bytes(raw)
    source['sha256'] = hashlib.sha256(raw).hexdigest()
    (output/'gaia-query.json').write_text(json.dumps(source, indent=2), encoding='utf-8')
    return rows, source


def build_sequence(request, output, *, progress=lambda message: None, cancel=None, use_local=True, input_paths=None):
    check_cancel(cancel)
    request = SequenceRequest.model_validate(request)
    if input_paths is not None and not 1 <= len(input_paths) <= request.max_frames:
        raise ValueError('Explicit original count exceeds the request bound')
    output = Path(output)
    output.mkdir(parents=True, exist_ok=False)
    raw_request = request.model_dump(mode='json')
    (output/'request.json').write_text(json.dumps(raw_request, indent=2), encoding='utf-8')
    products, frames, rejections = [], [], []
    pin = CALIBRATION.get((request.release, request.detector))
    calibration = None
    if pin:
        calibration = ROOT/pin['path']
        if not calibration.exists():
            progress('Retrieving the pinned detector calibration')
            download(pin['url'], calibration, max_bytes=40_000_000)
        if sha256_file(calibration) != pin['sha256']:
            raise ValueError('Pinned calibration bytes changed; adapter review is required')
    # Research/CLI callers may select exact originals. This is never accepted
    # from an HTTP payload; each file still passes the same provenance, release,
    # mask, spectral and reference checks as archive-selected observations.
    paths = list(map(Path,input_paths)) if input_paths is not None else (verified_local_inputs(request) if use_local and request.use_cache else [])
    origin = 'explicit_originals' if input_paths is not None else ('verified_original_cache' if paths else 'live_archive')
    candidate_count = len(paths)
    if not paths and input_paths is None:
        progress('Searching official archive metadata for the requested position')
        rows = inventory(request.region, request.release, output/'inventory', deep=request.deep, detector=request.detector,timeout_seconds=30,attempts=2)
        chosen, candidate_count = selected_rows(rows, request.detector, request.max_frames)
        paths = []
        for i, row in enumerate(chosen):
            check_cancel(cancel)
            progress(f'Retrieving bounded cutout {i+1} of {len(chosen)}')
            source = row['access_url']
            if f'/{request.release}/' not in source:
                rejections.append({'observation_id': row['obs_id'], 'reason': 'Archive release mismatch'})
                continue
            # Content-addressed source URL cache; never overwrite source bytes.
            url = cutout_url(source, request.region)
            path = ROOT/'data/cache/cutouts'/(hashlib.sha256(url.encode()).hexdigest()+'.fits')
            try:
                if not path.exists() and path.parent.exists() and sum(p.stat().st_size for p in path.parent.glob('*.fits'))+20_000_000>512*1024*1024:
                    raise ValueError('Original cutout cache reached its 512 MiB acquisition budget; existing evidence is preserved')
                download(url, path, max_bytes=20_000_000)
                paths.append(path)
            except (OSError, ValueError) as exc:
                rejections.append({'observation_id': row['obs_id'], 'source_url': url, 'reason': str(exc)})
    for i, path in enumerate(paths):
        check_cancel(cancel)
        progress(f'Preparing measured pixels and conservative masks {i+1} of {len(paths)}')
        try:
            product = read_product(path, request.region, calibration=calibration, calibration_url=pin['url'] if pin else None)
            for file,record in ((path,product.observation.source),(calibration,product.observation.spectral_calibration)):
                if file and record:
                    sidecar=file.with_suffix(file.suffix+'.source.json')
                    if sidecar.exists():
                        from .models import FileRecord
                        record.retrieved_at_utc=FileRecord.model_validate_json(sidecar.read_text()).retrieved_at_utc
            if product.observation.release != request.release or product.observation.detector != request.detector:
                raise ValueError('Input release or detector differs from the request')
            frames.append(prepare_exposure(product, request.region))
            products.append(product)
        except (ValueError, OSError, KeyError) as exc:
            rejections.append({'input_sha256': sha256_file(path), 'reason': str(exc)})
    order = sorted(range(len(frames)), key=lambda i: frames[i]['observation']['time_start_utc'])
    products, frames = [products[i] for i in order], [frames[i] for i in order]
    comparisons, references, reference_source = [], None, None
    context = request.region.model_copy(update={'size_deg': max(.3, request.region.size_deg)})
    if len(products) > 1 and calibration:
        try:
            progress('Checking stationary Gaia references without fitting a target alignment')
            references, reference_source = reference_catalogue(context, output, cancel)
        except (ValueError, OSError) as exc:
            rejections.append({'stage': 'reference_catalogue', 'reason': str(exc)})
        for i in range(len(products)):
            for j in range(i+1, len(products)):
                check_cancel(cancel)
                report, _ = screen_pair(products[i], products[j], request.region)
                try:
                    registration = measure_registration(products[i], products[j], references, context) if references else {'status': 'pending', 'reference_count': 0}
                except (ValueError,KeyError,ArithmeticError) as exc:
                    registration={'status':'fail','reference_count':0,'reason':str(exc)}
                    rejections.append({'stage':'registration','a':i,'b':j,'reason':str(exc)})
                comparisons.append({'a': i, 'b': j, 'screen': report, 'registration': registration,
                                    'playback_eligible': report['suitability']['status'] != 'rejected' and registration['status'] == 'pass'})
    # Playback never crosses an unverified temporal link. Independent frames
    # remain manually inspectable even when no comparison passes.
    eligible = len(frames) > 1 and len(comparisons) == len(frames)*(len(frames)-1)//2 and all(c['playback_eligible'] for c in comparisons)
    finite = [np.frombuffer(base64.b64decode(f['arrays']['SCI']['data']), dtype='<f4') for f in frames]
    values = np.concatenate([a[np.isfinite(a)] for a in finite]) if finite else np.array([])
    display = {'vmin': 0., 'vmax': 1., 'stretch': 'asinh', 'asinh_a': .06}
    if values.size:
        lo, hi = np.percentile(values, [1,99.7]).tolist()
        display.update(vmin=lo, vmax=max(hi, lo+1e-6))
    identity = {'request':raw_request, 'source_hashes':[f['observation']['source']['sha256'] for f in frames],
                'calibration_sha256': pin['sha256'] if pin else None, 'code_sha256': sha256_file(Path(__file__)),
                'code_hashes':{name:sha256_file(Path(__file__).with_name(name)) for name in ('sequence.py','products.py','coordinates.py','registration.py','suitability.py','preparation.py')},
                'software_versions':{name:version(name) for name in ('numpy','astropy','scipy','reproject')}}
    overlay=[]
    if references and comparisons:
        measured=set.intersection(*[{r['source_id'] for r in c['registration'].get('references',[]) if r['status']=='measured'} for c in comparisons])
        for row in references:
            if str(row['source_id']) not in measured:continue
            positions=[]
            for p in products:
                pos=reference_position(row,p.observation.time_start_utc)
                positions.append({'ra_deg':float(pos.ra.deg),'dec_deg':float(pos.dec.deg)})
            overlay.append({'source_id':str(row['source_id']),'reference_epoch_jyear':float(row['ref_epoch']),'positions':positions})
            if len(overlay)>=100:break
    result = {'schema_version': '1.0', 'kind': 'spherex_sequence', 'dataset_kind': 'real',
              'sequence_id': 'sequence-'+hashlib.sha256(json.dumps(identity, sort_keys=True).encode()).hexdigest()[:24],
              'created_at_utc': utc_now().isoformat(), 'request': raw_request,
              'origin': origin, 'candidate_rows_for_detector': candidate_count,
              'status': 'prepared' if frames else 'unavailable_in_tested_request',
              'frames': frames, 'display': display, 'comparisons': comparisons,
              'playback_eligible': eligible, 'reference_catalogue': reference_source,
              'reference_overlay':overlay,
              'rejections': rejections, 'scientific_approval': 'PENDING', 'internal_human_review': 'PENDING',
              'interpretation': 'No measured motion or calibrated variability is established.',
              'selection_strategy': 'Explicit original identities; no archive substitution.' if input_paths is not None else 'Verified original cache when applicable; otherwise fixed chronological quantiles, at most six cutouts.',
              'citations':[
                  'SPHEREx '+request.release.upper()+': https://doi.org/10.26131/'+('IRSA652' if request.release=='qr2' else 'IRSA662'),
                  'This publication makes use of data products from the Spectro-Photometer for the History of the Universe, Epoch of Reionization and Ices Explorer (SPHEREx), which is a joint project of the Jet Propulsion Laboratory and the California Institute of Technology, and is funded by the National Aeronautics and Space Administration.',
                  'Gaia DR3: https://doi.org/10.1051/0004-6361/202243940. ESA Gaia data processed by DPAC.'],
              'limitations': LIMITATIONS, 'identity': identity}
    raw = json.dumps(result, separators=(',', ':'), allow_nan=False).encode()
    if len(raw)>32*1024*1024:raise ValueError('Prepared result exceeds 32 MiB; reduce the field width or frame count')
    (output/'sequence.json').write_bytes(raw)
    (output/'sequence.sha256').write_text(hashlib.sha256(raw).hexdigest())
    progress('Prepared images are ready' if frames else 'No supported image could be prepared for this bounded request')
    return result
