"""Versioned observation requests and bounded archive intake, without promotion.

Plans are offline by default. Query mode saves one metadata response; it never
downloads FITS or decides temporal comparability, detections or approval.
"""
from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Literal
from pydantic import model_validator

from .archive import inventory, sia_query, utc_now
from .models import Record, SkyRegion


class ObservationRequest(Record):
    schema_version: Literal['1.0']
    kind: Literal['skyshift-observation-request']
    release: Literal['qr2', 'qr3']
    region: SkyRegion

    @model_validator(mode='before')
    @classmethod
    def numeric_region(cls, data):
        region = data.get('region') if isinstance(data, dict) else None
        if not isinstance(region, dict) or any(type(region.get(k)) not in (int, float) for k in ('ra_deg', 'dec_deg', 'size_deg')):
            raise ValueError('Request coordinates and width must be JSON numbers')
        if region['size_deg'] < 1 / 60:
            raise ValueError('Request field width must be at least one arcminute')
        return data


def read_request(path: Path) -> tuple[ObservationRequest, bytes]:
    with path.open('rb') as stream:
        raw = stream.read(16_385)
    if len(raw) > 16_384:
        raise ValueError('Observation request exceeds 16 KiB')
    def unique_object(pairs):
        result = {}
        for key, value in pairs:
            if key in result:
                raise ValueError(f'Duplicate observation request key: {key}')
            result[key] = value
        return result
    data = json.loads(raw, object_pairs_hook=unique_object)
    if isinstance(data,dict) and any(k in data for k in ('detector','max_frames','deep','use_cache','selection','wavelength_um','start_date','end_date','discovery_only','discovery_scope')):
        from .sequence import SequenceRequest
        return SequenceRequest.model_validate(data), raw
    return ObservationRequest.model_validate(data), raw


def inventory_summary(rows: list[dict]) -> dict:
    """Summarize archive candidates without interpreting them as usable epochs."""
    import math
    times = set()
    invalid = 0
    for row in rows:
        try:
            value = float(row.get('t_min'))
            if not math.isfinite(value):
                raise ValueError('Nonfinite MJD')
            times.add(value)
        except (ValueError, TypeError):
            invalid += 1
    times = sorted(times)
    return {'candidate_rows': len(rows), 'distinct_start_values': len(times),
            'time_min_mjd_raw': times[0] if times else None,
            'time_max_mjd_raw': times[-1] if times else None,
            'missing_or_invalid_start_values': invalid,
            'comparison_status': 'NOT_SCREENED',
            'note': 'Rows and distinct times are metadata candidates, not independent usable epochs or a detection.'}


def intake(request_path: Path, output: Path, *, query: bool = False, deep: bool = False) -> dict:
    request, raw = read_request(request_path)
    params, url = sia_query(request.region, request.release, deep=deep or getattr(request,'deep',False),detector=getattr(request,'detector',None))
    # Immutable request folders prevent later releases from replacing evidence.
    output.mkdir(parents=True, exist_ok=False)
    (output/'request.json').write_bytes(raw)
    report = {'schema_version': '1.0', 'kind': 'skyshift-resource-intake',
              'created_at_utc': utc_now().isoformat(), 'request_sha256': hashlib.sha256(raw).hexdigest(),
              'request': request.model_dump(mode='json'), 'query_url': url,
              'query_parameters': params, 'status': 'PLANNED',
              'scientific_approval': 'PENDING', 'target_validation': 'NOT_CONDUCTED',
              'archive_documentation': 'https://caltech-ipac.github.io/spherex-archive-documentation/spherex-data-access/',
              'next': ['Retrieve bounded archive metadata with --query.',
                       'Select source identities and matching release/detector calibration from official resources.',
                       'Use inspect, screen and review with existing thresholds before adding viewer products.']}
    try:
        if query:
            rows = inventory(request.region, request.release, output/'inventory', deep=deep or getattr(request,'deep',False),detector=getattr(request,'detector',None))
            report.update(status='INVENTORIED', summary=inventory_summary(rows))
    except (ValueError, OSError) as exc:
        report.update(status='FAILED', error=str(exc))
        raise
    finally:
        (output/'intake.json').write_text(json.dumps(report, indent=2, allow_nan=False) + '\n', encoding='utf-8')
    return report
