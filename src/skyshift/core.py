"""Challenge-focused DR1/QR3 observation discovery and progressive cutouts.

This module has one job: return real SPHEREx Level 2 observations covering a
sky position and prepare each cutout independently.  It does not decide whether
two observations are scientifically comparable and it never disables visual
comparison because wavelengths differ.
"""
from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
import base64
import hashlib
import json
import math
from pathlib import Path
import secrets
import threading
from urllib.parse import urlencode, urlsplit
import xml.etree.ElementTree as ET

from astropy.time import Time
import numpy as np
from pydantic import BaseModel, ConfigDict, Field, field_validator
from reproject import reproject_interp

from .archive import NS, SIA_ENDPOINT, cutout_url, download, fetch_bytes, parse_sia, sha256_file, sia_query
from .archive_index import normalize_row
from .coordinates import common_grid
from .models import SkyRegion
from .products import read_product


ROOT = Path(__file__).resolve().parents[2]
CURRENT_COLLECTIONS = ("spherex_dr1", "spherex_dr1_deep", "spherex_qr3", "spherex_qr3_deep")
MAX_METADATA_BYTES = 16_000_000
MAX_FRAME_BYTES = 80_000_000


class CoreSearchRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)
    region: SkyRegion
    target_id: str | None = Field(default=None, pattern=r"^[a-z0-9-]{1,48}$")
    releases: list[str] = Field(default_factory=lambda: ["dr1", "qr3"], min_length=1, max_length=2)
    detectors: list[int] = Field(default_factory=lambda: list(range(1, 7)), min_length=1, max_length=6)
    refresh: bool = False

    @field_validator("releases")
    @classmethod
    def current_releases_only(cls, value):
        if len(value) != len(set(value)) or any(item not in {"dr1", "qr3"} for item in value):
            raise ValueError("Choose DR1 and/or QR3")
        return value

    @field_validator("detectors")
    @classmethod
    def valid_detectors(cls, value):
        if len(value) != len(set(value)) or any(type(item) is not int or item not in range(1, 7) for item in value):
            raise ValueError("Detectors must be unique integers from 1 through 6")
        return sorted(value)


def utc_now():
    return datetime.now(timezone.utc)


def load_targets(path: Path | None = None):
    source = path or ROOT / "config" / "challenge_targets.json"
    value = json.loads(source.read_text(encoding="utf-8"))
    return {item["id"]: item for item in value["targets"]}


def propagated_position(target: dict, observation_time: str | float):
    """Propagate ICRS position using pm_ra_cosdec and pm_dec.

    SIMBAD defines pmra as mu_alpha*cos(delta).  The returned record names both
    the reference epoch and the observation epoch so the UI never presents a
    propagated coordinate without its time basis.
    """
    when = Time(observation_time, format="mjd", scale="utc") if isinstance(observation_time, (float, int)) else Time(observation_time, scale="utc")
    reference_jyear = float(target["reference_epoch_jyear"])
    years = float(when.jyear) - reference_jyear
    dec0 = float(target["dec_deg"])
    cos_dec = math.cos(math.radians(dec0))
    if abs(cos_dec) < 1e-12:
        raise ValueError("Proper-motion propagation is undefined at the celestial pole")
    ra = (float(target["ra_deg"]) + float(target["pm_ra_cosdec_mas_per_year"]) * years / (3_600_000 * cos_dec)) % 360
    dec = dec0 + float(target["pm_dec_mas_per_year"]) * years / 3_600_000
    return {
        "ra_deg": ra,
        "dec_deg": dec,
        "reference_epoch": f"J{reference_jyear:.1f}",
        "observation_epoch_utc": when.utc.isot + "Z",
        "method": "ICRS linear proper motion; pm_ra is mu_alpha*cos(dec); no parallax or radial-velocity correction",
        "source_url": target["astrometry_source_url"],
        "source_bibcode": target.get("astrometry_bibcode"),
    }


def _votable_overflow(raw: bytes):
    tree = ET.fromstring(raw)
    return any(
        node.get("name") == "QUERY_STATUS" and node.get("value") == "OVERFLOW"
        for node in tree.findall(".//v:INFO", NS)
    )


def _query_collection(region: SkyRegion, collection: str, *, progress=lambda message: None):
    release = collection.split("_")[1]
    deep = collection.endswith("_deep")
    start = float(Time("2025-03-11", scale="utc").mjd)
    end = float(Time((utc_now().date()).isoformat(), scale="utc").mjd + 1)
    pending = [(start, end)]
    records = {}
    receipts = []
    while pending:
        lo, hi = pending.pop(0)
        params, _ = sia_query(region, release, deep=deep, detector=None)
        params["TIME"] = f"{lo:.8f} {hi:.8f}"
        url = SIA_ENDPOINT + "?" + urlencode(params)
        progress(f"Searching {release.upper()}{' deep' if deep else ''} observations")
        raw = fetch_bytes(url, max_bytes=MAX_METADATA_BYTES, timeout=45, attempts=2)
        overflow = _votable_overflow(raw)
        rows = [] if overflow else parse_sia(raw)
        if overflow or len(rows) >= 5000:
            if hi - lo < 0.01:
                raise ValueError(f"{collection} metadata remained truncated at the minimum date page")
            mid = (lo + hi) / 2
            pending[0:0] = [(lo, mid), (mid, hi)]
            continue
        receipts.append({
            "collection": collection,
            "source_url": url,
            "retrieved_at_utc": utc_now().isoformat(),
            "sha256": hashlib.sha256(raw).hexdigest(),
            "bytes": len(raw),
            "rows": len(rows),
            "time_mjd": [lo, hi],
        })
        for row in rows:
            normalized = normalize_row(row, collection)
            records[(normalized["observation_id"], normalized["access_url"])] = normalized
    return list(records.values()), receipts


def search_observations(request: CoreSearchRequest, *, progress=lambda message: None):
    targets = load_targets()
    target = targets.get(request.target_id) if request.target_id else None
    observations = []
    collections = []
    failures = []
    wanted = [c for c in CURRENT_COLLECTIONS if c.split("_")[1] in request.releases]
    for collection in wanted:
        try:
            rows, receipts = _query_collection(request.region, collection, progress=progress)
            collections.append({"collection": collection, "status": "complete", "rows": len(rows), "receipts": receipts})
            observations.extend(rows)
        except (OSError, ValueError, ET.ParseError) as exc:
            message = str(exc)
            collections.append({"collection": collection, "status": "unavailable", "rows": 0, "reason": message})
            failures.append(f"{collection}: {message}")
    deduped = {}
    for row in observations:
        if row["detector"] not in request.detectors:
            continue
        key = (row["release"], row["observation_id"], row["detector"], row["access_url"])
        if target and row.get("start_mjd") is not None:
            row = {**row, "target_position": propagated_position(target, float(row["start_mjd"]))}
        row["wavelength_center_um"] = (
            (row["wavelength_min_m"] + row["wavelength_max_m"]) * 0.5e6
            if row.get("wavelength_min_m") is not None and row.get("wavelength_max_m") is not None
            else None
        )
        deduped[key] = row
    ordered = sorted(deduped.values(), key=lambda row: (row.get("start_mjd") or math.inf, row["detector"], row["release"], row["observation_id"]))
    complete = not failures
    return {
        "schema_version": "2.0",
        "kind": "skyshift-observation-search",
        "status": "complete" if complete else "partial_or_unavailable",
        "request": request.model_dump(mode="json"),
        "target": ({k: target.get(k) for k in (
            "id", "name", "reference_epoch_jyear", "pm_ra_cosdec_mas_per_year", "pm_dec_mas_per_year",
            "astrometry_source_url", "astrometry_bibcode",
        )} if target else None),
        "collections": collections,
        "observations": ordered,
        "observation_count": len(ordered),
        "failures": failures,
        "message": (
            f"Found {len(ordered)} DR1/QR3 observations across all six detectors."
            if complete else
            "Archive search was incomplete. Retry is available; missing collections are not treated as zero observations."
        ),
    }


def _encode(array):
    value = np.ascontiguousarray(array, dtype=np.uint8 if array.dtype.kind in "bu" else "<f4").copy()
    return {
        "dtype": "uint8" if value.dtype.kind in "bu" else "float32",
        "shape": list(value.shape),
        "data": base64.b64encode(value.tobytes()).decode("ascii"),
    }


def prepare_frame(search: dict, index: int, cache_directory: Path, *, progress=lambda message: None):
    rows = search["observations"]
    if type(index) is not int or not 0 <= index < len(rows):
        raise ValueError("Observation index is outside this search")
    row = rows[index]
    request = CoreSearchRequest.model_validate(search["request"])
    target_position = row.get("target_position")
    centre_ra = target_position["ra_deg"] if target_position else request.region.ra_deg
    centre_dec = target_position["dec_deg"] if target_position else request.region.dec_deg
    region = SkyRegion(ra_deg=centre_ra, dec_deg=centre_dec, size_deg=request.region.size_deg)
    source_url = cutout_url(row["access_url"], region)
    cache_key = hashlib.sha256((source_url + "\ncore-frame-v2").encode()).hexdigest()
    cache_directory.mkdir(parents=True, exist_ok=True)
    result_path = cache_directory / f"{cache_key}.json"
    if result_path.is_file():
        return json.loads(result_path.read_text(encoding="utf-8"))
    fits_path = cache_directory / f"{cache_key}.fits"
    progress(f"Downloading {index + 1} of {len(rows)}: {row['observation_id']} / D{row['detector']}")
    if not fits_path.is_file():
        download(source_url, fits_path, max_bytes=MAX_FRAME_BYTES)
    product = read_product(fits_path, region, source_url=source_url)
    output_wcs, shape = common_grid(region)
    arrays = {}
    for name, source in (("SCI", product.image), ("WAVE", product.wavelength_um), ("BAND", product.bandwidth_um)):
        value, _ = reproject_interp((source, product.wcs), output_wcs, shape_out=shape, order="bilinear")
        arrays[name] = np.asarray(value, dtype=np.float32)
    support, footprint = reproject_interp((product.valid.astype(float), product.wcs), output_wcs, shape_out=shape, order="bilinear")
    valid = (footprint > 0) & np.isfinite(support) & (support >= 1 - 1e-10)
    for value in arrays.values():
        valid &= np.isfinite(value)
    valid &= (arrays["WAVE"] > 0) & (arrays["BAND"] > 0)
    arrays["VALID"] = valid.astype(np.uint8)
    arrays["SCI"][~valid] = np.nan
    usable = arrays["SCI"][valid]
    lo, hi = np.percentile(usable, [1, 99.7]).tolist() if usable.size else (0.0, 1.0)
    if hi <= lo:
        hi = lo + 1
    target_x = float(output_wcs.wcs_world2pix([[centre_ra, centre_dec]], 0)[0][0])
    target_y = float(output_wcs.wcs_world2pix([[centre_ra, centre_dec]], 0)[0][1])
    tx, ty = round(target_x), round(target_y)
    target_valid = bool(0 <= tx < shape[1] and 0 <= ty < shape[0] and valid[ty, tx])
    result = {
        "schema_version": "2.0",
        "kind": "skyshift-real-spherex-frame",
        "dataset_kind": "real",
        "archive_id": row["observation_id"],
        "archive_source_url": row["access_url"],
        "cutout_source_url": source_url,
        "cutout_sha256": sha256_file(fits_path),
        "release": row["release"],
        "detector": row["detector"],
        "time_start_utc": product.observation.time_start_utc.isoformat().replace("+00:00", "Z"),
        "wavelength_center_um": float(arrays["WAVE"][ty, tx]) if target_valid else row.get("wavelength_center_um"),
        "bandwidth_um": float(arrays["BAND"][ty, tx]) if target_valid else None,
        "region": region.model_dump(mode="json"),
        "shape": list(shape),
        "wcs": dict(output_wcs.to_header()),
        "arrays": {name: _encode(value) for name, value in arrays.items()},
        "display": {"vmin": lo, "vmax": hi, "stretch": "asinh", "asinh_a": 0.06},
        "target": {
            "x": target_x,
            "y": target_y,
            "valid": target_valid,
            "position": target_position or {
                "ra_deg": centre_ra,
                "dec_deg": centre_dec,
                "reference_epoch": "search coordinate",
                "observation_epoch_utc": product.observation.time_start_utc.isoformat().replace("+00:00", "Z"),
            },
        },
        "usable_fraction": float(valid.mean()),
    }
    temporary = result_path.with_suffix(".tmp")
    temporary.write_text(json.dumps(result, separators=(",", ":"), allow_nan=False), encoding="utf-8")
    temporary.replace(result_path)
    return result


class CoreSearchStore:
    """Small in-memory search queue; frame data are downloaded only on request."""

    def __init__(self, cache_directory: Path):
        self.cache_directory = Path(cache_directory)
        self.executor = ThreadPoolExecutor(max_workers=2, thread_name_prefix="skyshift-search")
        self.jobs = {}
        self.lock = threading.RLock()

    def create(self, payload):
        request = CoreSearchRequest.model_validate(payload)
        key = secrets.token_hex(16)
        job = {"id": key, "state": "queued", "message": "Waiting to search DR1 and QR3", "request": request, "result": None}
        with self.lock:
            self.jobs[key] = job
        self.executor.submit(self._run, key)
        return self.status(key)

    def _run(self, key):
        with self.lock:
            job = self.jobs[key]
            job.update(state="running", message="Searching all six SPHEREx detectors")
        try:
            def progress(message):
                with self.lock:
                    job["message"] = message
            result = search_observations(job["request"], progress=progress)
            with self.lock:
                job.update(state="complete", message=result["message"], result=result)
        except Exception as exc:
            with self.lock:
                job.update(state="failed", message=str(exc))

    def status(self, key):
        with self.lock:
            if key not in self.jobs:
                raise KeyError(key)
            job = self.jobs[key]
            value = {name: job[name] for name in ("id", "state", "message")}
            if job["state"] == "complete":
                value["result"] = job["result"]
            return value

    def frame(self, key, index):
        with self.lock:
            if key not in self.jobs:
                raise KeyError(key)
            job = self.jobs[key]
            if job["state"] != "complete":
                raise ValueError("Observation search is not complete")
            result = job["result"]
        return prepare_frame(result, index, self.cache_directory)

    def close(self):
        self.executor.shutdown(wait=False, cancel_futures=True)
