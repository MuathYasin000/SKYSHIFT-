"""Explicit release capabilities; discovery never grants scientific approval.

New releases need an adapter and authenticated reference-product tests. A new
pipeline within a readable family remains visualization-only until its exact
calibration association has been reviewed. Do not infer it from a filename.
"""
from __future__ import annotations

from copy import deepcopy
import re
from urllib.parse import urlsplit


REGISTRY_VERSION = 'spherex-release-registry-v2'
DOCUMENTATION_DATE = '2026-11-12'
DOCUMENTATION_CHECKED = '2026-11-14'
PRODUCT_DOCUMENTATION = 'https://irsa.ipac.caltech.edu/spherex-archive-documentation/spherex-data-products/'
ACCESS_DOCUMENTATION = 'https://irsa.ipac.caltech.edu/spherex-archive-documentation/spherex-data-access/'
CURRENT_RELEASES = ('dr1', 'qr3')
RELEASE_DOIS = {'qr2': '10.26131/IRSA652', 'qr3': '10.26131/IRSA662', 'dr1': '10.26131/IRSA678'}

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
    'dr1': {
        'pipeline_family': 7,
        'calibrated_pipeline_versions': [],
        'calibrated_detectors': [],
        'corrections': ['DR1 reprocesses Surveys 1 and 2 with the R7 pipeline also used by QR3.'],
        'limitations': ['WCS-WAVE is approximate visualization metadata only.',
                        'Current-release temporal screening requires an independently validated calibration adapter.'],
    },
}


def release_adapter(release: str) -> dict:
    if release not in RELEASES:
        raise ValueError('Unsupported release: an explicit tested adapter is required (supported: dr1, qr3 and qr2)')
    return deepcopy(RELEASES[release])


def collection_for(release: str, deep: bool = False) -> str:
    release_adapter(release)
    return f'spherex_{release}' + ('_deep' if deep else '')


CURRENT_COLLECTIONS = tuple(collection_for(release, deep) for release in CURRENT_RELEASES for deep in (False, True))
INDEXED_COLLECTIONS = frozenset(collection_for(release, deep) for release in RELEASES for deep in (False, True))


def product_adapter(version, detector, source_url=None, *, calibration_sha256=None) -> dict:
    """Validate product identity and separately authorize pinned calibration use."""
    if type(detector) is not int or detector not in range(1, 7):
        raise ValueError('Unsupported detector: expected an integer from 1 to 6')
    match = re.fullmatch(r'(6|7)\.\d+(?:\.\d+)?(?:\+[A-Za-z0-9.-]+)?', str(version))
    if not match:
        raise ValueError('Unsupported pipeline version: inspect its product documentation first')
    family = int(match[1])
    # Older local inputs had no source URL and only supported one release per family.
    release = 'qr2' if family == 6 else 'qr3'
    if source_url is not None:
        parsed = urlsplit(source_url)
        if parsed.scheme != 'https' or parsed.username or parsed.password or parsed.port or parsed.hostname not in {'irsa.ipac.caltech.edu', 'nasa-irsa-spherex.s3.us-east-1.amazonaws.com'}:
            raise ValueError('Product provenance requires an approved HTTPS archive URL')
        parts = parsed.path.strip('/').split('/')
        prefix = ['ibe', 'data', 'spherex'] if parsed.hostname == 'irsa.ipac.caltech.edu' else []
        identity = parts[len(prefix):]
        if parts[:len(prefix)] != prefix or len(identity) < 3 or identity[1] != 'level2' or '..' in parts:
            raise ValueError('Expected an official SPHEREx Level 2 product path')
        release = identity[0]
        if release not in RELEASES or RELEASES[release]['pipeline_family'] != family:
            raise ValueError('Archive release and supported pipeline version disagree')
    adapter = release_adapter(release)
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
    for release in CURRENT_RELEASES:
        entry = RELEASES[release]
        result[release] = {**deepcopy(entry),
            'adapter_version': REGISTRY_VERSION, 'collections': [collection_for(release), collection_for(release, True)],
            'discovery': release in CURRENT_RELEASES, 'visualization_detectors': list(range(1, 7)),
            'citation_doi': RELEASE_DOIS[release],
            'product_format': 'Level 2 spectral-image MEF; IMAGE/FLAGS/VARIANCE/WCS-WAVE',
            'flag_policy': 'conservative-v0.1; SOURCE retained, other declared and unknown bits excluded',
            'calibration_dependencies': [{'detector': d, **pin} for (r, d), pin in CALIBRATION.items() if r == release],
            'operations': ['single_observation_inspection', 'survey_timeline'] + (['provisional_temporal_screening'] if entry['calibrated_detectors'] else []),
            'scientific_approval': 'PENDING', 'cross_release_photometry': False,
            'documentation_date': DOCUMENTATION_DATE, 'documentation_checked_on': DOCUMENTATION_CHECKED,
            'documentation': [PRODUCT_DOCUMENTATION, ACCESS_DOCUMENTATION]}
        for dependency in result[release]['calibration_dependencies']:
            dependency.pop('path')  # API never exposes host-internal filesystem paths.
    return {'registry_version': REGISTRY_VERSION, 'releases': result, 'current_collections': list(CURRENT_COLLECTIONS),
            'unknown_releases': 'disabled_until_explicit_adapter_and_reference_validation'}
