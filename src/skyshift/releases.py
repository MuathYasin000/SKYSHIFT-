"""Explicit release capabilities; discovery never grants scientific approval.

New releases need an adapter and authenticated reference-product tests. A new
pipeline within a readable family remains visualization-only until its exact
calibration association has been reviewed. Do not infer it from a filename.
"""
from __future__ import annotations

from copy import deepcopy
import re
from urllib.parse import urlsplit


REGISTRY_VERSION = 'spherex-release-registry-v1'
DOCUMENTATION_DATE = '2026-09-28'
DOCUMENTATION_CHECKED = '2026-10-30'
PRODUCT_DOCUMENTATION = 'https://caltech-ipac.github.io/spherex-archive-documentation/spherex-data-products/'
ACCESS_DOCUMENTATION = 'https://caltech-ipac.github.io/spherex-archive-documentation/spherex-data-access/'

# This pin is an authenticated scientific input, not a guessed latest version.
CALIBRATION = {
    ('qr2', 2): {
        'path': 'data/calibration/spectral_wcs_D2_spx_cal-wcs-v4-2025-254.fits',
        'sha256': '40c49a5acbf7047b7cebf3d46471cb99639867996f48a22d0e283f7e529249d7',
        'url': 'https://nasa-irsa-spherex.s3.us-east-1.amazonaws.com/qr2/spectral_wcs/cal-wcs-v4-2025-254/2/spectral_wcs_D2_spx_cal-wcs-v4-2025-254.fits',
    },
}

RELEASES = {
    'qr2': {
        'pipeline_family': 6,
        'calibrated_pipeline_versions': ['6.4+psffix1', '6.5.6', '6.5.7'],
        'calibrated_detectors': [2],
        'corrections': ['April 2026 PSF header correction; original bytes and their version remain part of provenance.'],
        'limitations': ['Only the pinned D2 CWAVE/CBAND association is enabled for screening.',
                        'No calibrated photometry, difference imaging, or cross-release temporal analysis.'],
    },
    'qr3': {
        'pipeline_family': 7,
        'calibrated_pipeline_versions': [],
        'calibrated_detectors': [],
        'corrections': ['QR3 introduces improved calibrations and effective PSF products. No QR2/QR3 flux equivalence is assumed.'],
        'limitations': ['WCS-WAVE is approximate visualization metadata only.',
                        'No QR3 CWAVE/CBAND calibration pin or calibrated temporal adapter is enabled.'],
    },
}


def release_adapter(release: str) -> dict:
    if release not in RELEASES:
        raise ValueError('Unsupported release: an explicit tested adapter is required (supported: qr2 and qr3)')
    return deepcopy(RELEASES[release])


def collection_for(release: str, deep: bool = False) -> str:
    release_adapter(release)
    return f'spherex_{release}' + ('_deep' if deep else '')


def product_adapter(version, detector, source_url=None, *, calibration_sha256=None) -> dict:
    """Validate product identity and separately authorize pinned calibration use."""
    if type(detector) is not int or detector not in range(1, 7):
        raise ValueError('Unsupported detector: expected an integer from 1 to 6')
    match = re.fullmatch(r'(6|7)\.\d+(?:\.\d+)?(?:\+[A-Za-z0-9.-]+)?', str(version))
    if not match:
        raise ValueError('Unsupported pipeline version: inspect its product documentation first')
    release = next(key for key, entry in RELEASES.items() if entry['pipeline_family'] == int(match[1]))
    adapter = release_adapter(release)
    if source_url is not None:
        parsed = urlsplit(source_url)
        if parsed.scheme != 'https' or parsed.username or parsed.password or parsed.port or parsed.hostname not in {'irsa.ipac.caltech.edu', 'nasa-irsa-spherex.s3.us-east-1.amazonaws.com'}:
            raise ValueError('Product provenance requires an approved HTTPS archive URL')
        parts = parsed.path.strip('/').split('/')
        expected = ['ibe', 'data', 'spherex', release, 'level2'] if parsed.hostname == 'irsa.ipac.caltech.edu' else [release, 'level2']
        if parts[:len(expected)] != expected:
            raise ValueError('Archive release and supported pipeline version disagree')
    if calibration_sha256 is not None:
        pin = CALIBRATION.get((release, detector))
        if (not pin or calibration_sha256 != pin['sha256'] or
                str(version) not in adapter['calibrated_pipeline_versions']):
            raise ValueError('Unreviewed release/pipeline/detector calibration association; visualization-only inspection is available')
    return {'registry_version': REGISTRY_VERSION, 'release': release,
            'detector': detector, 'pipeline_version': str(version),
            'mode': 'calibrated_screening' if calibration_sha256 is not None else 'visualization_only'}


def release_capabilities() -> dict:
    result = {}
    for release, entry in RELEASES.items():
        result[release] = {**deepcopy(entry),
            'adapter_version': REGISTRY_VERSION, 'collections': [collection_for(release), collection_for(release, True)],
            'discovery': True, 'visualization_detectors': list(range(1, 7)),
            'product_format': 'Level 2 spectral-image MEF; IMAGE/FLAGS/VARIANCE/WCS-WAVE',
            'flag_policy': 'conservative-v0.1; SOURCE retained, other declared and unknown bits excluded',
            'calibration_dependencies': [{'detector': d, **pin} for (r, d), pin in CALIBRATION.items() if r == release],
            'operations': ['single_observation_inspection', 'survey_timeline'] + (['provisional_temporal_screening'] if entry['calibrated_detectors'] else []),
            'scientific_approval': 'PENDING', 'cross_release_photometry': False,
            'documentation_date': DOCUMENTATION_DATE, 'documentation_checked_on': DOCUMENTATION_CHECKED,
            'documentation': [PRODUCT_DOCUMENTATION, ACCESS_DOCUMENTATION]}
        for dependency in result[release]['calibration_dependencies']:
            dependency.pop('path')  # API never exposes host-internal filesystem paths.
    return {'registry_version': REGISTRY_VERSION, 'releases': result,
            'unknown_releases': 'disabled_until_explicit_adapter_and_reference_validation'}
