"""Bounded reference cones used only by the optional observation overlays."""
import csv
import hashlib
import io
import itertools
import json
import math
from urllib.parse import urlencode, urlsplit
from urllib.request import Request

from .archive import archive_opener, approved_url
from .models import SkyRegion
from .observations_archive import _ARCHIVE_SLOTS, _CUTOUT_LOCKS, write_cache_json

ENDPOINTS = {
    "gaia": "https://mast.stsci.edu/vo-conesearch/api/v0.1/gaiadr3",
    "wise": "https://vizier.cfa.harvard.edu/viz-bin/asu-tsv",
}
MAX_BYTES = 6_000_000
MAX_SOURCES = 500


def _number(row, key):
    try:
        value = float(row[key])
    except (KeyError, TypeError, ValueError):
        return None
    return value if math.isfinite(value) else None


def reference_cone(kind, payload, directory):
    if kind not in ENDPOINTS:
        raise ValueError("Unknown reference catalog")
    region = SkyRegion.model_validate(payload, strict=True)
    # Include cutout corners and a margin for proper motion. Larger fields
    # intentionally display only the central cone.
    radius = min(0.12, region.size_deg / math.sqrt(2) + 0.02)
    gaia = kind == "gaia"
    query = {"RA": region.ra_deg, "DEC": region.dec_deg, "SR": round(radius, 8), "format": "csv"} if gaia else {
        "-source": "II/328/allwise", "-c": f"{region.ra_deg} {region.dec_deg}",
        "-c.rd": round(radius, 8), "-out": "AllWISE,RAJ2000,DEJ2000", "-out.max": MAX_SOURCES + 1,
    }
    url = ENDPOINTS[kind] + "?" + urlencode(query)
    key = hashlib.sha256(url.encode()).hexdigest()
    path = directory / f"{key}.json"
    with _CUTOUT_LOCKS[int(key[:8], 16) % len(_CUTOUT_LOCKS)]:
        if path.is_file():
            return json.loads(path.read_text(encoding="utf-8"))
        hosts = {urlsplit(ENDPOINTS[kind]).hostname}
        with _ARCHIVE_SLOTS, archive_opener(hosts).open(Request(url, headers={"User-Agent": "SKYSHIFT/1"}), timeout=12) as response:
            if not approved_url(response.url, hosts):
                raise ValueError("Reference catalog redirected to an unexpected host")
            raw = response.read(MAX_BYTES + 1)
        if len(raw) > MAX_BYTES:
            raise ValueError("This reference cone exceeded the transfer limit. Try a smaller field.")
        result = {**decode_reference(raw, gaia), "radius_deg": radius, "source_url": url}
        write_cache_json(path, result)
        return result


def decode_reference(raw, gaia):
    lines = io.StringIO(raw.decode("utf-8-sig"))
    source_lines = lines if gaia else (line for line in lines if line.strip() and not line.startswith("#"))
    table = csv.DictReader(source_lines, delimiter="," if gaia else "\t")
    identity, ra_key, dec_key = ("source_id", "ra", "dec") if gaia else ("AllWISE", "RAJ2000", "DEJ2000")
    if not {ra_key, dec_key, identity}.issubset(table.fieldnames or []):
        raise ValueError("The upstream catalog did not return the expected columns")

    def sources():
        for row in table:
            ra, dec = _number(row, ra_key), _number(row, dec_key)
            if ra is None or dec is None or not row.get(identity):
                continue
            source = {"id": row[identity].strip(), "ra": ra, "dec": dec}
            if gaia:
                source.update({k: _number(row, k) for k in ("ref_epoch", "pmra", "pmdec")})
            yield source

    scanned = list(itertools.islice(sources(), MAX_SOURCES + 1))
    return {"sources": scanned[:MAX_SOURCES], "truncated": len(scanned) > MAX_SOURCES}
