"""Independently audit archive, FITS, reconstruction and browser data identities.

Run with .venv/Scripts/python.exe tools/audit_provenance_redesign.py --network.
Network responses are retained without overwriting earlier evidence. This audit
verifies provenance; it does not confer scientific suitability or approval.
"""
from __future__ import annotations

import argparse
import base64
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import sys
import time
import zipfile
from urllib.parse import urljoin, urlsplit
from urllib.request import Request, urlopen

from astropy.io import fits
from astropy.time import Time
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'src'))
from skyshift.archive import parse_sia, sha256_file
from skyshift.models import SkyRegion
from skyshift.preparation import ARRAY_NAMES, numeric_hash, project_pair
from skyshift.products import read_product

PUBLIC_BASE = 'https://skyshift-project-mercury.surebream11.chatgpt.site/'
OFFICIAL_GUIDE = 'https://caltech-ipac.github.io/spherex-archive-documentation/spherex-data-products/'


def digest(data):
    return hashlib.sha256(data).hexdigest()


def equal_values(a, b):
    a, b = np.asarray(a), np.asarray(b)
    numeric = a.dtype.kind in 'biufc' and b.dtype.kind in 'biufc'
    return np.array_equal(a, b, equal_nan=True) if numeric else np.array_equal(a, b)


def decode_array(record):
    """Strictly decode the exact browser payload, never inferring dimensions."""
    if record['dtype'] not in ('float32', 'uint8'):
        raise ValueError('Unsupported browser array dtype')
    shape = record['shape']
    if len(shape) != 2 or any(type(n) is not int or n < 1 or n > 4096 for n in shape):
        raise ValueError('Invalid browser array shape')
    raw = base64.b64decode(record['data'], validate=True)
    dtype = np.dtype('<f4' if record['dtype'] == 'float32' else 'u1')
    if len(raw) != int(np.prod(shape)) * dtype.itemsize:
        raise ValueError('Browser array byte count differs from dimensions')
    return np.frombuffer(raw, dtype=dtype).reshape(shape)


def compare_array(a, b):
    a, b = np.asarray(a), np.asarray(b)
    if a.shape != b.shape:
        return {'match': False, 'shape_a': list(a.shape), 'shape_b': list(b.shape)}
    equal = np.array_equal(a, b, equal_nan=True)
    finite = np.isfinite(a) & np.isfinite(b)
    return {'match': bool(equal), 'shape': list(a.shape), 'numeric_sha256_a': numeric_hash(a),
            'numeric_sha256_b': numeric_hash(b), 'max_absolute_difference':
            float(np.max(np.abs(a[finite].astype(float)-b[finite].astype(float)))) if np.any(finite) else None,
            'finite_count': int(np.count_nonzero(finite))}


def compare_fits(a, b):
    """Separate byte identity, data equivalence and header differences."""
    result = {'byte_identical': sha256_file(a) == sha256_file(b), 'hdus': [], 'all_data_equal': True}
    with fits.open(a, memmap=False) as left, fits.open(b, memmap=False) as right:
        if [h.name for h in left] != [h.name for h in right]:
            result.update(all_data_equal=False, hdu_names_match=False)
            return result
        for x, y in zip(left, right):
            if x.data is None or y.data is None:
                eq = x.data is None and y.data is None
            elif x.data.dtype.names:
                eq = x.data.dtype.names == y.data.dtype.names and all(
                    equal_values(x.data[n], y.data[n]) for n in x.data.dtype.names)
            else:
                eq = equal_values(x.data, y.data)
            changed = sorted(k for k in set(x.header) | set(y.header)
                             if str(x.header.get(k)) != str(y.header.get(k)))
            result['hdus'].append({'name': x.name, 'data_equal': bool(eq), 'changed_header_keywords': changed})
            result['all_data_equal'] &= bool(eq)
    return result


def check_inventory(row, header, observation):
    # Archive SIA time values are rounded to 1e-6 d; half a unit is .0432 s.
    errors = {label: abs(float(row[key])-float(header[fits_key])) * 86400
              for label, key, fits_key in [('start', 't_min', 'MJD-BEG'), ('end', 't_max', 'MJD-END')]}
    manifest_errors = {key: abs((Time(observation[name]) - Time(header[key], format='isot', scale='utc')).sec)
                       for key, name in [('DATE-BEG', 'time_start_utc'), ('DATE-END', 'time_end_utc')]}
    match = (row['obs_id'] == observation['observation_id'] == header['OBSID'] and
             row['energy_bandpassname'] == f"SPHEREx-D{header['DETECTOR']}" and
             row['obs_collection'] == f"spherex_{observation['release']}" and
             row['access_url'] == observation['source']['source_url'].split('?')[0] and
             max(errors.values()) <= .0433 and max(manifest_errors.values()) < 1e-6)
    return {'match': bool(match), 'archive_time_rounding_tolerance_seconds': .0433,
            'archive_to_fits_time_difference_seconds': errors, 'manifest_to_fits_time_difference_seconds': manifest_errors,
            'publisher_did': row['obs_publisher_did'], 'archive_pixel_scale_arcsec': float(row['s_pixel_scale']),
            'archive_full_detector_shape': [int(row['s_xel2']), int(row['s_xel1'])],
            'archive_integration_time_seconds': float(row['t_exptime']), 'fits_integration_time_seconds': float(header['XPOSURE'])}


def retrieve(job, directory):
    name, url, expected = job
    target = directory / name
    started = datetime.now(timezone.utc).isoformat()
    result = {'name': name, 'url': url, 'attempted_at_utc': started, 'expected_sha256': expected}
    try:
        request = Request(url, headers={'User-Agent': 'SKYSHIFT-Provenance-Audit/0.3', 'Cache-Control': 'no-cache'})
        with urlopen(request, timeout=90) as response:
            data = response.read(90_000_001)
            if len(data) > 90_000_000:
                raise ValueError('Response exceeded audit size bound')
            result.update(http_status=response.status, response_url=response.url,
                          response_headers={k: response.headers.get(k) for k in ('Content-Type', 'ETag', 'Last-Modified', 'Date')})
        with target.open('xb') as stream:
            stream.write(data)
        result.update(status='retrieved', sha256=digest(data), size_bytes=len(data),
                      retrieved_at_utc=datetime.now(timezone.utc).isoformat(),
                      hash_match=(digest(data) == expected) if expected else None)
    except Exception as exc:
        result.update(status='failed', error=f'{type(exc).__name__}: {exc}')
    return result


def earlier_authentication(evidence_root, observations):
    """Keep a later service failure visible without discarding earlier proof."""
    sources = [o.get('source', o.get('original_source')) for o in observations]
    expected = {o['source_url']: o['sha256'] for o in sources}
    found = {}
    for path in sorted(evidence_root.glob('*/audit.json')):
        try:
            prior = json.loads(path.read_text(encoding='utf-8'))
        except (OSError, ValueError):
            continue
        for record in prior.get('network', []):
            url = record.get('url')
            if url in expected and record.get('status') == 'retrieved' and record.get('sha256') == expected[url]:
                found[url] = {'url': url, 'sha256': record['sha256'], 'retrieved_at_utc': record['retrieved_at_utc'],
                    'evidence_audit': path.relative_to(ROOT).as_posix(), 'retained_response': path.with_name(record['name']).relative_to(ROOT).as_posix(),
                    'evidence_audit_sha256': sha256_file(path)}
    return list(found.values())


def earlier_failures(evidence_root):
    failures = []
    for path in sorted(evidence_root.glob('*/audit.json')):
        try:
            prior = json.loads(path.read_text(encoding='utf-8'))
        except (OSError, ValueError):
            continue
        for record in prior.get('network', []):
            if record.get('status') == 'failed':
                failures.append({**record, 'evidence_audit': path.relative_to(ROOT).as_posix()})
    return failures


def audit_local(release, bundle_path):
    manifest = json.loads((release / 'manifest.json').read_text(encoding='utf-8'))
    bundle = json.loads(bundle_path.read_text(encoding='utf-8'))
    with fits.open(release / 'prepared/pair.fits') as hdul:
        arrays = {name: np.array(hdul[name].data) for name in ARRAY_NAMES}
    region = SkyRegion.model_validate(manifest['region'])
    products = [read_product(release/o['source']['path'], region,
                 calibration=release/o['spectral_calibration']['path'], source_url=o['source']['source_url'],
                 calibration_url=o['spectral_calibration']['source_url']) for o in manifest['observations']]
    reproduced, _, _ = project_pair(*products, region)
    array_report = {}
    for name in ARRAY_NAMES:
        browser = decode_array(bundle['arrays'][name])
        dtype = np.uint8 if name in ('COMMON', 'VALID_A', 'VALID_B') else '<f4'
        browser_raw = base64.b64decode(bundle['arrays'][name]['data'], validate=True)
        prepared_raw = np.ascontiguousarray(arrays[name], dtype=dtype).tobytes()
        array_report[name] = {'browser_to_prepared': compare_array(browser, arrays[name]),
                              'reconstructed_to_prepared': compare_array(reproduced[name], arrays[name]),
                              'browser_raw_little_endian_sha256': digest(browser_raw),
                              'prepared_little_endian_sha256': digest(prepared_raw),
                              'browser_to_prepared_bytes_match': browser_raw == prepared_raw,
                              'manifest_numeric_hash_match': numeric_hash(arrays[name]) == manifest['processing']['numeric_hashes'][name]}
    files = []
    for record in manifest['prepared_files'] + [o['source'] for o in manifest['observations']] + [manifest['observations'][0]['spectral_calibration']]:
        path = release / record['path']
        files.append({'path': record['path'], 'sha256': sha256_file(path), 'expected_sha256': record['sha256'],
                      'match': sha256_file(path) == record['sha256'], 'size_bytes': path.stat().st_size})
    rows = json.loads((ROOT/'data/inventory/m101_qr2_cli_v1/observations.json').read_text())
    observations = []
    for obs, product in zip(manifest['observations'], products):
        matches = [r for r in rows if r['obs_id'] == obs['observation_id'] and r['energy_bandpassname'] == f"SPHEREx-D{obs['detector']}"]
        if len(matches) != 1:
            raise ValueError('Expected one exact archive observation/detector record')
        h = product.header
        yy, xx = np.indices(product.image.shape)
        ra, dec = product.wcs.pixel_to_world_values(xx, yy)
        observations.append({'observation_id': obs['observation_id'], 'detector': obs['detector'], 'release': obs['release'],
            'pipeline_version': obs['pipeline_version'], 'time_start_utc': obs['time_start_utc'], 'time_end_utc': obs['time_end_utc'],
            'original_source': obs['source'], 'spectral_calibration': obs['spectral_calibration'],
            'native_cutout_shape_yx': list(product.image.shape), 'native_valid_fraction': float(np.mean(product.valid)),
            'image_unit': obs['science_unit'], 'native_psf_fwhm_header_arcsec': float(h['PSF_FWHM']),
            'native_sky_bounds_deg': {'ra': [float(np.min(ra)), float(np.max(ra))], 'dec': [float(np.min(dec)), float(np.max(dec))]},
            'center_wavelength_um': obs['center_wavelength_um'], 'center_bandwidth_um': obs['center_bandwidth_um'],
            'time_semantics': 'Exposure interval, not download time; XPOSURE is meaningful integration time, distinct from elapsed interval.',
            'archive_inventory_check': check_inventory(matches[0], h, obs),
            'calibration_history': [str(v) for v in h.get('HISTORY', []) if '[CALIB]' in str(v)]})
    code_checks = {name: {'expected_sha256': expected, 'live_source_match': sha256_file(ROOT/'src/skyshift'/name) == expected,
                          'retained_reproduction_source_match': sha256_file(release/'reproduction/src/skyshift'/name) == expected}
                   for name, expected in manifest['processing']['code_hashes'].items()}
    return {'pair_id': manifest['pair_id'], 'release': release.name, 'scientific_approval': 'PENDING',
            'dataset_kind': manifest['dataset_kind'], 'manifest_match': bundle['manifest'] == manifest,
            'files': files, 'arrays': array_report, 'observations': observations, 'code_identity_checks': code_checks,
            'prepared_grid': {'shape_yx': list(arrays['COMMON'].shape), 'requested_width_deg': region.size_deg,
                'pixel_scale_arcsec': manifest['processing']['pixel_scale_arcsec'],
                'actual_grid_width_arcmin': arrays['COMMON'].shape[1]*6.15/60,
                'common_supported_pixels': int(np.count_nonzero(arrays['COMMON'])),
                'common_supported_fraction': float(np.mean(arrays['COMMON'])),
                'projection': 'North-up ICRS TAN', 'interpolation': 'bilinear', 'comparison_width_not_instrument_resolution': True},
            'calibration_association': 'Public file identity verified; exact pipeline UUID-to-public calibration-file association requires qualified review.',
            'limitations': ['Provenance authenticity is distinct from scientific comparison approval.',
                'No human scientific approval or discovery is established by this audit.',
                'Initial raw retrieval timestamps were not recorded and cannot be retrospectively asserted.',
                'The two observations are near 1.1 microns; they are not full-color images or all 102 spectral channels.',
                'No quantitative variability, motion or significance product is supported.',
                'The 0.3 degree native context supports inspection and registration, not an approved temporal comparison over that entire context.']}


def write_report(report, path):
    local = report['local']
    arr_ok = all(v['browser_to_prepared']['match'] and v['reconstructed_to_prepared']['match'] and v['manifest_numeric_hash_match'] for v in local['arrays'].values())
    lines = ['# SKYSHIFT 0.3 data-provenance audit', '',
        'This is a measured software/data audit. Scientific approval remains **PENDING**.', '',
        f"Audit timestamp (UTC): {report['created_at_utc']}. Immutable source release: `{local['release']}`; pair: `{local['pair_id']}`.", '',
        '## What the visitor sees', '',
        'The comparison contains **24 × 24 measured grid samples**, at **6.15 arcseconds per pixel** (2.46 arcminutes edge to edge). '
        'The requested comparison width is 0.04 degrees; rounding to complete pixels makes the grid slightly wider. '
        'This small field was selected to preserve the existing spectral compatibility gate. Enlarging a browser canvas does not create astronomical resolution.', '',
        'The original 0.3-degree archive requests returned detector-coordinate rectangles of different sizes because the sky field is rotated and clipped near an active-detector edge. '
        'The full active detector is 2040 × 2040 samples. A larger context can be shown for one-epoch inspection with wavelength and quality labels, '
        'but it must not be presented as having passed temporal-comparison checks over its whole area.', '',
        '## Traceable stages', '',
        '| Stage | Measured evidence | Result |', '| --- | --- | --- |',
        f"| Archive → native FITS | Exact SIA observation/detector IDs, source URLs, UTC intervals, native hashes | {'Pass' if all(o['archive_inventory_check']['match'] for o in local['observations']) else 'Investigate'} |",
        f"| Stored files | {len(local['files'])} manifest file checksums | {'Pass' if all(v['match'] for v in local['files']) else 'Fail'} |",
        f"| Native + spectral calibration → prepared FITS | Re-ran unchanged bilinear preparation, conservative quality masks and all ten arrays | {'Exact numeric match' if arr_ok else 'Investigate mismatch'} |",
        f"| Prepared FITS → local browser payload | Strict base64 decoding and canonical numeric hashes for all ten arrays | {'Exact numeric match' if arr_ok else 'Investigate mismatch'} |", '',
        'The browser receives SCI_A/B, VALID_A/B, COMMON, WAVE_A/B, BAND_A/B and SEPARATION. Invalid science pixels remain NaN; '
        'masking, stretching, color mapping and display interpolation must not replace underlying calibrated values.', '',
        '## Identifiable observations', '']
    for obs in local['observations']:
        lines += [f"### {obs['observation_id']} / D{obs['detector']}", '',
            f"- UTC interval: {obs['time_start_utc']} to {obs['time_end_utc']}.",
            f"- {obs['release'].upper()}, pipeline `{obs['pipeline_version']}`, IMAGE unit MJy/sr; native shape y/x {obs['native_cutout_shape_yx']}.",
            f"- At selected center: {obs['center_wavelength_um']:.8f} µm central wavelength, {obs['center_bandwidth_um']:.8f} µm bandwidth.",
            f"- [Original archive cutout]({obs['original_source']['source_url']}) · SHA-256 `{obs['original_source']['sha256']}`.",
            f"- Archive publisher identifier: `{obs['archive_inventory_check']['publisher_did']}`.",
            f"- Archive/FITS time differences (rounded SIA values), seconds: `{obs['archive_inventory_check']['archive_to_fits_time_difference_seconds']}`.", '']
    lines += ['## Independent live retrievals', '',
              'Every request, response identity, HTTP status and failure is preserved in the machine-readable audit. Fresh network retrieval times are distinct from exposure times.']
    for item in report.get('network', []):
        match = item.get('hash_match')
        label = 'exact expected byte hash' if match else 'byte hash differs; inspect FITS equivalence' if match is False else 'identity recorded' if item['status'] == 'retrieved' else 'request failed'
        lines += [f"- `{item['name']}`: {item['status']}; {label}."]
    for item in report.get('native_refetch_comparisons', []):
        lines += [f"- `{item['name']}`: byte-identical={item['comparison']['byte_identical']}; all HDU scientific data identical={item['comparison']['all_data_equal']}. Header differences are listed per HDU in JSON."]
    for item in report.get('earlier_authenticated_source_retrievals', []):
        lines += [f"- An earlier independently retained retrieval at {item['retrieved_at_utc']} authenticated the exact original hash `{item['sha256']}`. Evidence: `{item['evidence_audit']}`. A later request failure does not erase that earlier evidence, and the later failure remains recorded above."]
    for item in report.get('earlier_preserved_failures', []):
        lines += [f"- Preserved earlier unsuccessful request `{item['name']}` at {item['attempted_at_utc']}: {item['error']}. Evidence: `{item['evidence_audit']}`. This failure is not represented as a successful retrieval."]
    if report.get('deployed'):
        lines += ['', '## Historical public-release payload verification', '',
            'This independently inspected the previously published 0.2 release. The 0.3 redesign uses local hosting by default; '
            'this audit does not publish or modify the historical public website.', '',
            json.dumps(report['deployed'], indent=2).join(['```json\n', '\n```'])]
    lines += ['', '## Calibration and scientific limits', '',
        'The exact full CWAVE/CBAND spectral calibration file is retained and hashed. '
        'The official IRSA guide recommends full CWAVE/CBAND for science, describes cutout-parent mapping, and recommends newer ePSFs for QR2 as well as QR3. '
        'These documentation statements do not prove the pipeline UUID association or approve a comparison. '
        f'[Official data-product guide]({OFFICIAL_GUIDE}).', '',
        'The existing engineering registration gate uses 13 references inside the declared context; residuals are diagnostic, not precision-motion measurements. '
        'No local background subtraction or PSF matching has been applied. The extended-galaxy spectral response, PSF effects and local registration adequacy require qualified scientific assessment.', '',
        'Original retrieval times are unknown. Public source URLs and retained hashes are known. Public downloadable products can change; '
        'a fresh cutout hash mismatch is recorded as a mismatch, even if arrays prove identical. No identity is silently rewritten.', '',
        '## Reproduce', '',
        '`python tools/audit_provenance_redesign.py --network` re-runs the audit, retaining a new timestamped network-evidence directory. '
        'Use `--release m101-review-v6` to select the immutable baseline explicitly. Tests use synthetic fixtures only, clearly separate from displayed real observations.', '']
    path.write_text('\n'.join(lines), encoding='utf-8')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--release', default='m101-review-v6')
    parser.add_argument('--network', action='store_true')
    parser.add_argument('--base-url', default=PUBLIC_BASE)
    args = parser.parse_args()
    release = ROOT/'data/prepared'/args.release
    if release.parent != ROOT/'data/prepared' or args.release in ('.', '..'):
        parser.error('Release must be a plain directory name')
    stamp = datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%fZ')
    evidence = ROOT/'research/audit_0.3'/stamp
    evidence.mkdir(parents=True, exist_ok=False)
    bundle_path = ROOT/'web/dist/data/bundle.json'
    # Preserve the exact locally audited payload in case the redesign changes later.
    (evidence/'local-bundle.json').write_bytes(bundle_path.read_bytes())
    report = {'schema_version': '1.0', 'created_at_utc': datetime.now(timezone.utc).isoformat(),
        'scope': 'Data authenticity and reproducibility, distinct from scientific approval',
        'local': audit_local(release, evidence/'local-bundle.json'), 'network': [], 'native_refetch_comparisons': []}
    report['earlier_authenticated_source_retrievals'] = earlier_authentication(ROOT/'research/audit_0.3', report['local']['observations'])
    report['earlier_preserved_failures'] = earlier_failures(ROOT/'research/audit_0.3')
    if args.network:
        manifest = json.loads((release/'manifest.json').read_text())
        jobs = [(f'native-{suffix}.fits', o['source']['source_url'], o['source']['sha256']) for suffix,o in zip('AB',manifest['observations'])]
        cal = manifest['observations'][0]['spectral_calibration']
        epsf_record = json.loads((ROOT/'data/calibration/epsf_D2_spx_cal-epsf-v1-2026-191.fits.source.json').read_text())
        inventory_query = json.loads((ROOT/'data/inventory/m101_qr2_cli_v1/query.json').read_text())
        jobs += [('spectral-calibration.fits', cal['source_url'], cal['sha256']),
            ('epsf-calibration.fits', epsf_record['source_url'], epsf_record['sha256']),
            ('archive-sia.xml', inventory_query['url'], None),
            ('official-guide.html', OFFICIAL_GUIDE, None),
            ('deployed-catalog.json', urljoin(args.base_url, 'data/catalog.json'), None)]
        with ThreadPoolExecutor(max_workers=4) as pool:
            report['network'] = list(pool.map(lambda j: retrieve(j, evidence), jobs))
        for suffix, obs in zip('AB',manifest['observations']):
            path = evidence/f'native-{suffix}.fits'
            if path.exists():
                report['native_refetch_comparisons'].append({'name': f'native-{suffix}.fits',
                    'comparison': compare_fits(release/obs['source']['path'], path)})
        if (evidence/'archive-sia.xml').exists():
            rows = parse_sia((evidence/'archive-sia.xml').read_bytes())
            report['live_archive'] = {'row_count': len(rows), 'observations': []}
            for obs in manifest['observations']:
                matches = [r for r in rows if r['obs_id'] == obs['observation_id'] and r['energy_bandpassname'] == 'SPHEREx-D2']
                report['live_archive']['observations'].append({'observation_id': obs['observation_id'], 'exact_row_count': len(matches),
                    'row': matches[0] if len(matches) == 1 else None,
                    'check': check_inventory(matches[0], fits.getheader(release/obs['source']['path'], 'IMAGE'), obs) if len(matches) == 1 else None})
        if (evidence/'deployed-catalog.json').exists():
            catalog = json.loads((evidence/'deployed-catalog.json').read_text())
            job = ('deployed-bundle.json', urljoin(args.base_url, catalog['bundle_url']), catalog['bundle_sha256'])
            result = retrieve(job, evidence); report['network'].append(result)
            if result['status'] == 'retrieved':
                deployed = json.loads((evidence/'deployed-bundle.json').read_text())
                local = json.loads((evidence/'local-bundle.json').read_text())
                report['deployed'] = {'base_url': args.base_url, 'catalog_declared_hash_match': result['hash_match'],
                    'scope': 'Historical public 0.2 release; 0.3 redesign is local-first and does not modify this site',
                    'bundle_matches_local_bytes': digest((evidence/'local-bundle.json').read_bytes()) == result['sha256'],
                    'pair_id': deployed['manifest']['pair_id'], 'manifest_matches_immutable_release': deployed['manifest'] == manifest,
                    'array_comparisons': {n: compare_array(decode_array(deployed['arrays'][n]), decode_array(local['arrays'][n])) for n in ARRAY_NAMES}}
                asset_jobs = [('deployed-pair.fits', urljoin(args.base_url, deployed['prepared_fits_url']), manifest['prepared_files'][0]['sha256'])]
                asset_jobs += [(f"deployed-review-part-{i}.bin", urljoin(args.base_url, part['url']), part['sha256'])
                               for i, part in enumerate(catalog['review_packet']['parts'])]
                with ThreadPoolExecutor(max_workers=4) as pool:
                    asset_results = list(pool.map(lambda j: retrieve(j, evidence), asset_jobs))
                report['network'].extend(asset_results)
                report['deployed']['prepared_fits_hash_match'] = asset_results[0].get('hash_match', False)
                parts_match = all(x.get('hash_match') is True for x in asset_results[1:])
                report['deployed']['review_packet_part_hashes_match'] = parts_match
                if parts_match:
                    joined = evidence/'deployed-review-packet.zip'
                    with joined.open('xb') as target:
                        for i in range(len(catalog['review_packet']['parts'])):
                            target.write((evidence/f'deployed-review-part-{i}.bin').read_bytes())
                    original_archive = ROOT/'data/exports'/catalog['review_packet']['name']
                    report['deployed']['review_packet_sha256'] = sha256_file(joined)
                    report['deployed']['review_packet_matches_local_archive'] = sha256_file(joined) == sha256_file(original_archive)
                    with zipfile.ZipFile(joined) as packet:
                        report['deployed']['review_packet_manifest_matches_immutable_release'] = json.loads(packet.read('manifest.json')) == manifest
    text = json.dumps(report, indent=2, allow_nan=False)
    (evidence/'audit.json').write_text(text, encoding='utf-8')
    (ROOT/'docs/evidence/provenance_audit_0.3.json').write_text(text, encoding='utf-8')
    write_report(report, ROOT/'docs/provenance_audit_0.3.md')
    print(json.dumps({'evidence': evidence.relative_to(ROOT).as_posix(), 'local_arrays': len(report['local']['arrays']),
        'network': [{'name': r['name'], 'status': r['status'], 'hash_match': r.get('hash_match')} for r in report['network']],
        'scientific_approval': 'PENDING'}, indent=2))


if __name__ == '__main__':
    main()
