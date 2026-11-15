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
from collections import deque
import hashlib
import json
import math
import os
from pathlib import Path
import secrets
import threading
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode, urlsplit
import xml.etree.ElementTree as ET

from astropy.time import Time
import numpy as np
from pydantic import BaseModel, ConfigDict, Field, field_validator
from reproject import reproject_interp

from .archive import NS, SIA_ENDPOINT, cutout_url, download, fetch_bytes, parse_sia, sha256_file, sia_query
from .archive_index import canonical_tap_row, normalize_row, tap_query
from .coordinates import common_grid
from .models import SkyRegion
from .products import read_product
from .releases import CURRENT_RELEASES, collection_for


ROOT = Path(__file__).resolve().parents[2]
CURRENT_COLLECTIONS = tuple(collection_for(release, deep) for release in CURRENT_RELEASES for deep in (False, True))
TARGET_QUERY_EPOCH_UTC = "2025-12-01T00:00:00"
MISSION_START_UTC = "2025-03-11"
MAX_METADATA_BYTES = 6_000_000
METADATA_PAGE_ROWS = 1000
DEEP_PAGE_DAYS = 120
METADATA_LIMIT_ERROR = "Archive response exceeds the configured size bound"
MAX_FRAME_BYTES = 80_000_000
_ARCHIVE_SLOTS = threading.BoundedSemaphore(2)
_CUTOUT_LOCKS = [threading.Lock() for _ in range(32)]


class ObservationSearchBusy(ValueError):
    retryable = True


class CoreSearchRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)
    region: SkyRegion
    target_id: str | None = Field(default=None, pattern=r"^[a-z0-9-]{1,48}$")
    releases: list[str] = Field(default_factory=lambda: list(CURRENT_RELEASES), min_length=1, max_length=len(CURRENT_RELEASES))
    detectors: list[int] = Field(default_factory=lambda: list(range(1, 7)), min_length=1, max_length=6)
    refresh: bool = False

    @field_validator("releases")
    @classmethod
    def current_releases_only(cls, value):
        if len(value) != len(set(value)) or any(item not in CURRENT_RELEASES for item in value):
            raise ValueError(f"Choose a current release: {', '.join(CURRENT_RELEASES)}")
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
    source = path or ROOT / "web" / "dist" / "observations-targets.json"
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


def write_cache_json(path, value, *, indent=None):
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_name(f"{path.name}.{secrets.token_hex(6)}.tmp")
    with temporary.open("w", encoding="utf-8", newline="\n") as stream:
        json.dump(value, stream, indent=indent, allow_nan=False, separators=(",", ":") if indent is None else None)
        stream.write("\n")
        stream.flush()
        os.fsync(stream.fileno())
    temporary.replace(path)


def _metadata_page(url, collection, lo, hi, directory, progress, *, provider):
    key = hashlib.sha256(url.encode()).hexdigest()
    path = directory / f"{key}.json"
    with _CUTOUT_LOCKS[int(key[:8], 16) % len(_CUTOUT_LOCKS)]:
        if path.is_file():
            try:
                page = json.loads(path.read_text(encoding="utf-8"))
                checked = datetime.fromisoformat(page["receipt"]["retrieved_at_utc"])
                if (utc_now() - checked).total_seconds() < 86400:
                    return page
            except (OSError, ValueError, TypeError, KeyError):
                pass
        progress(f"Searching {collection} via {provider.upper()} · MJD {lo:.0f}–{hi:.0f}")
        with _ARCHIVE_SLOTS:
            raw = fetch_bytes(url, max_bytes=MAX_METADATA_BYTES,
                              timeout=15, attempts=1 if provider == 'tap' else 2)
        overflow = _votable_overflow(raw)
        rows = [] if overflow else parse_sia(raw)
        split = overflow or len(rows) >= METADATA_PAGE_ROWS
        if not split and provider == 'tap':
            rows = [canonical_tap_row(row, collection) for row in rows]
        page = {
            "split": split,
            "rows": [] if split else [
                normalize_row(row, collection) for row in rows
            ],
            "receipt": {
                "collection": collection, "source_url": url, "provider": provider,
                "retrieved_at_utc": utc_now().isoformat(),
                "sha256": hashlib.sha256(raw).hexdigest(), "bytes": len(raw),
                "rows": len(rows), "time_mjd": [lo, hi],
            },
        }
        write_cache_json(path, page)
        return page


def _query_collection(region: SkyRegion, collection: str, start, end, *, motion_margin, directory, progress):
    release = collection.split("_")[1]
    deep = collection.endswith("_deep")
    pending = deque()
    lo = start
    while lo < end:
        hi = min(end, lo + DEEP_PAGE_DAYS) if deep else end
        pending.append((lo, hi))
        lo = hi
    radius = region.size_deg / math.sqrt(2) + motion_margin
    records = {}
    receipts = []
    failures = []
    while pending:
        lo, hi = pending.popleft()
        params, _ = sia_query(region, release, deep=deep, detector=None)
        params["POS"] = f"circle {region.ra_deg} {region.dec_deg} {radius}"
        params["MAXREC"] = str(METADATA_PAGE_ROWS)
        params["TIME"] = f"{lo:.8f} {hi:.8f}"
        url = SIA_ENDPOINT + "?" + urlencode(params)
        try:
            try:
                page = _metadata_page(url, collection, lo, hi, directory, progress, provider='sia2')
            except (URLError, TimeoutError, ValueError, ET.ParseError) as sia_error:
                if str(sia_error) == METADATA_LIMIT_ERROR or isinstance(sia_error, HTTPError) and sia_error.code == 429:
                    raise
                fallback = tap_query(region, collection, lo, hi, radius_deg=radius, max_records=METADATA_PAGE_ROWS)
                try:
                    page = _metadata_page(fallback, collection, lo, hi, directory, progress, provider='tap')
                except (OSError, ValueError, ET.ParseError) as tap_error:
                    if str(tap_error) == METADATA_LIMIT_ERROR:
                        raise
                    raise ValueError(f"SIA2: {sia_error}; TAP: {tap_error}") from tap_error
        except (OSError, ValueError, ET.ParseError) as exc:
            if str(exc) == METADATA_LIMIT_ERROR and hi - lo >= 0.01:
                mid = (lo + hi) / 2
                pending.extendleft([(mid, hi), (lo, mid)])
                continue
            failures.append(f"MJD {lo:.5f}–{hi:.5f}: {exc}")
            continue
        if page["split"]:
            if hi - lo < 0.01:
                failures.append(f"MJD {lo:.5f}–{hi:.5f}: metadata remained truncated")
                continue
            mid = (lo + hi) / 2
            pending.extendleft([(mid, hi), (lo, mid)])
            continue
        receipts.append(page["receipt"])
        for normalized in page["rows"]:
            records[(normalized["observation_id"], normalized["access_url"])] = normalized
    return list(records.values()), receipts, failures


def search_observations(request: CoreSearchRequest, *, directory=None, progress=lambda message: None):
    targets = load_targets()
    target = targets.get(request.target_id) if request.target_id else None
    if request.target_id and not target:
        raise ValueError("Unknown challenge target")
    observations = []
    collections = []
    failures = []
    query_region = request.region
    query_position = None
    start = float(Time(MISSION_START_UTC, scale="utc").mjd)
    end = float(Time(utc_now().date().isoformat(), scale="utc").mjd + 1)
    motion_margin = 0.0
    if target:
        query_position = propagated_position(target, TARGET_QUERY_EPOCH_UTC)
        query_region = SkyRegion(
            ra_deg=query_position["ra_deg"],
            dec_deg=query_position["dec_deg"],
            size_deg=request.region.size_deg,
        )
        # Search a conservative swept cone, then centre each requested cutout
        # at its own epoch. The sum is an upper bound on angular displacement.
        speed = abs(target["pm_ra_cosdec_mas_per_year"]) + abs(target["pm_dec_mas_per_year"])
        midpoint = float(Time(TARGET_QUERY_EPOCH_UTC, scale="utc").mjd)
        motion_margin = speed * max(abs(start - midpoint), abs(end - midpoint)) / (3_600_000 * 365.25)
        query_position["query_radius_deg"] = query_region.size_deg / math.sqrt(2) + motion_margin
    wanted = [c for c in CURRENT_COLLECTIONS if c.split("_")[1] in request.releases]
    directory = directory or ROOT / "data" / "cache" / "observations" / "metadata"
    for collection in wanted:
        rows, receipts, missing = _query_collection(query_region, collection, start, end, motion_margin=motion_margin, directory=directory, progress=progress)
        status = ("partial" if receipts else "unavailable") if missing else "complete"
        collections.append({"collection": collection, "status": status, "rows": len(rows), "receipts": receipts, "reason": " | ".join(missing)})
        observations.extend(rows)
        failures.extend(f"{collection}: {message}" for message in missing)
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
        "metadata_query_position": query_position,
        "collections": collections,
        "observations": ordered,
        "observation_count": len(ordered),
        "failures": failures,
        "message": (
            f"Found {len(ordered)} {'/'.join(release.upper() for release in request.releases)} archive matches for the selected detectors."
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
    if request.target_id and not target_position:
        raise ValueError("The archive did not supply an observation epoch for this target.")
    centre_ra = target_position["ra_deg"] if target_position else request.region.ra_deg
    centre_dec = target_position["dec_deg"] if target_position else request.region.dec_deg
    region = SkyRegion(ra_deg=centre_ra, dec_deg=centre_dec, size_deg=request.region.size_deg)
    source_url = cutout_url(row["access_url"], region)
    cache_key = hashlib.sha256((source_url + "\ncore-frame-v2").encode()).hexdigest()
    with _CUTOUT_LOCKS[int(cache_key[:8], 16) % len(_CUTOUT_LOCKS)]:
        return _prepare_frame(row, region, source_url, cache_key, cache_directory, target_position, progress)


def _prepare_frame(row, region, source_url, cache_key, cache_directory, target_position, progress):
    cache_directory.mkdir(parents=True, exist_ok=True)
    result_path = cache_directory / f"{cache_key}.json"
    if result_path.is_file():
        try:
            cached = json.loads(result_path.read_text(encoding="utf-8"))
            if cached.get("quality") and cached.get("cutout_source_url") == source_url:
                return cached
        except (OSError, ValueError, TypeError):
            pass
    fits_path = cache_directory / f"{cache_key}.fits"
    progress(f"Downloading {row['observation_id']} / D{row['detector']}")
    with _ARCHIVE_SLOTS:
        try:
            download(source_url, fits_path, max_bytes=MAX_FRAME_BYTES)
        except (FileExistsError, ValueError):
            if not fits_path.is_file():
                raise
            # An interrupted previous write must not prevent a retry. Keep its
            # bytes and provenance sidecar separate from the new download.
            fits_path = cache_directory / f"{cache_key}.retry-{secrets.token_hex(6)}.fits"
            download(source_url, fits_path, max_bytes=MAX_FRAME_BYTES)
    try:
        product = read_product(fits_path, region, source_url=source_url)
    except ValueError as exc:
        if target_position and str(exc) == "Requested center is outside this cutout":
            raise ValueError("The returned detector cutout does not cover the epoch-propagated target position.") from exc
        raise
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
    target_x, target_y = map(float, output_wcs.wcs_world2pix([[region.ra_deg, region.dec_deg]], 0)[0])
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
        "wavelength_min_um": row["wavelength_min_m"] * 1e6 if row.get("wavelength_min_m") is not None else None,
        "wavelength_max_um": row["wavelength_max_m"] * 1e6 if row.get("wavelength_max_m") is not None else None,
        "quality": frame_quality(product, region, row),
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
                "ra_deg": region.ra_deg,
                "dec_deg": region.dec_deg,
                "reference_epoch": "search coordinate",
                "observation_epoch_utc": product.observation.time_start_utc.isoformat().replace("+00:00", "Z"),
            },
        },
        "usable_fraction": float(valid.mean()),
    }
    write_cache_json(result_path, result)
    return result


def frame_quality(product, region, row):
    x, y = product.wcs.world_to_pixel_values(region.ra_deg, region.dec_deg)
    ix, iy = int(round(float(x))), int(round(float(y)))
    inside = 0 <= iy < product.flags.shape[0] and 0 <= ix < product.flags.shape[1]
    bits = int(product.flags[iy, ix]) if inside else None
    return {
        "archive_flags": row.get("quality_metadata", {}),
        "nearest_native_pixel": [ix, iy] if inside else None,
        "target_bits": bits,
        "target_flags": [name for name, bit in product.flag_definitions.items() if bits is not None and bits & (1 << bit)],
        "target_unknown_bits": bits & ~sum(1 << bit for bit in product.flag_definitions.values()) if bits is not None else None,
        "usable_pixel_policy": "Native archive flags and finite measurements determine which samples enter the display.",
    }


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
            if sum(item["state"] in {"queued", "running"} for item in self.jobs.values()) >= 2:
                raise ObservationSearchBusy("Two archive searches are active. Wait and retry.")
            while len(self.jobs) >= 32:
                expired = next(k for k, item in self.jobs.items() if item["state"] in {"complete", "failed"})
                del self.jobs[expired]
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
            result = search_observations(job["request"], directory=self.cache_directory / "metadata", progress=progress)
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
