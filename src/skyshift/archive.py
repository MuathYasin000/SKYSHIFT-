"""Bounded IRSA access with preserved responses and content identity."""
from __future__ import annotations

import hashlib
import json
import math
import re
import time
from datetime import datetime, timezone
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode, urlsplit
from urllib.request import HTTPRedirectHandler, Request, build_opener
import xml.etree.ElementTree as ET

from .models import FileRecord, SkyRegion
from .releases import collection_for

SIA_ENDPOINT = "https://irsa.ipac.caltech.edu/SIA"
ALLOWED_HOSTS = {"irsa.ipac.caltech.edu", "nasa-irsa-spherex.s3.us-east-1.amazonaws.com"}
NS = {"v": "http://www.ivoa.net/xml/VOTable/v1.3"}


def approved_url(url, hosts):
    try:
        parsed = urlsplit(url)
        return (parsed.scheme == "https" and parsed.hostname in hosts
                and parsed.port in (None, 443) and parsed.username is None
                and parsed.password is None and not parsed.fragment)
    except ValueError:
        return False


class ArchiveRedirects(HTTPRedirectHandler):
    def __init__(self, hosts):
        self.hosts = hosts

    def redirect_request(self, req, fp, code, msg, headers, newurl):
        if not approved_url(newurl, self.hosts):
            raise ValueError("Archive redirected to an unapproved HTTPS service")
        return super().redirect_request(req, fp, code, msg, headers, newurl)


def archive_opener(hosts):
    return build_opener(ArchiveRedirects(hosts))


urlopen = archive_opener(ALLOWED_HOSTS).open


def utc_now():
    return datetime.now(timezone.utc)


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def record_file(path: Path, source_url: str | None = None) -> FileRecord:
    return FileRecord(path=str(path.resolve()), sha256=sha256_file(path), size_bytes=path.stat().st_size, source_url=source_url)


def fetch_bytes(url: str, *, max_bytes: int, timeout: int = 60, attempts: int = 3) -> bytes:
    if not approved_url(url, ALLOWED_HOSTS):
        raise ValueError("Only approved HTTPS archive services may be fetched")
    for attempt in range(attempts):
        try:
            request = Request(url, headers={"User-Agent": "SKYSHIFT/0.1 (student research)"})
            with urlopen(request, timeout=timeout) as response:
                if not approved_url(response.url, ALLOWED_HOSTS):
                    raise ValueError("Archive redirected to an unapproved service")
                if int(response.headers.get("Content-Length", "0")) > max_bytes:
                    raise ValueError("Archive response exceeds the configured size bound")
                data = response.read(max_bytes + 1)
                if len(data) > max_bytes:
                    raise ValueError("Archive response exceeds the configured size bound")
                return data
        except HTTPError as exc:
            if exc.code not in {429, 500, 502, 503, 504} or attempt == attempts - 1:
                raise
        except (URLError, TimeoutError):
            if attempt == attempts - 1:
                raise
        time.sleep(2 ** attempt)
    raise RuntimeError("Archive request failed")


def fetch_header_prefix(url: str, *, size: int = 65536, timeout: int = 20) -> tuple[bytes, dict]:
    """A strictly bounded Range probe, never an incomplete 'original FITS'."""
    if not approved_url(url, ALLOWED_HOSTS):
        raise ValueError('Header probes require an approved HTTPS archive URL')
    if not 2880 <= size <= 65536:
        raise ValueError('Header probe bound must be between 2880 and 65536 bytes')
    request=Request(url,headers={'Range':f'bytes=0-{size-1}','User-Agent':'SKYSHIFT bounded FITS header preflight'})
    with urlopen(request,timeout=timeout) as response:
        if not approved_url(response.url, ALLOWED_HOSTS):
            raise ValueError('Header probe redirected to an unapproved service')
        content_range=response.headers.get('Content-Range','')
        match=re.fullmatch(r'bytes 0-(\d+)/(\d+)',content_range)
        if response.status!=206 or not match or int(match[1])!=size-1 or int(match[2])<size:
            raise ValueError('Archive did not honor the bounded header Range request; full download refused')
        if int(response.headers.get('Content-Length','0')) not in (0,size):
            raise ValueError('Unexpected header probe response size')
        data=response.read(size+1)
        if len(data)!=size:raise ValueError('Header probe is truncated or exceeds its bound')
    return data,{'url':url,'range':content_range,'partial_sha256':hashlib.sha256(data).hexdigest(),
                 'bytes':len(data),'retrieved_at_utc':utc_now().isoformat(),
                 'scope':'Header prefix only; not the original FITS identity or pixel-quality approval'}


def parse_sia(data: bytes) -> list[dict]:
    try:
        root = ET.fromstring(data)
    except ET.ParseError as exc:
        raise ValueError("Archive response is not valid XML") from exc
    if root.tag != "{http://www.ivoa.net/xml/VOTable/v1.3}VOTABLE":
        raise ValueError("Expected a supported VOTable archive response")
    statuses = [info for info in root.findall(".//v:INFO", NS) if info.get("name") == "QUERY_STATUS"]
    for info in statuses:
        if info.get("value") in {"ERROR", "OVERFLOW"}:
            raise ValueError(f"Archive query {info.get('value')}: {info.text}")
    rows = []
    tables = root.findall(".//v:TABLE", NS)
    if len(tables) != 1:
        raise ValueError('Expected one archive result table; missing tables are not zero coverage')
    for table in tables:
        if table.find(".//v:BINARY", NS) is not None or table.find(".//v:BINARY2", NS) is not None:
            raise ValueError("Binary VOTable responses require an explicitly supported decoder")
        fields = [field.get("name") for field in table.findall("v:FIELD", NS)]
        if not fields or any(not name for name in fields) or len(set(fields)) != len(fields):
            raise ValueError('Archive result fields must be named and unique')
        for row in table.findall(".//v:TABLEDATA/v:TR", NS):
            values = [cell.text for cell in row.findall("v:TD", NS)]
            if len(values) != len(fields):
                raise ValueError("Archive table row does not match its fields")
            rows.append(dict(zip(fields, values)))
    return rows


def sia_query(region: SkyRegion, release: str, *, deep: bool = False, detector: int | None = None) -> tuple[dict, str]:
    # Enclose the square's corners, not only its inscribed circle. Candidate
    # footprints and per-pixel support still need inspection after this search.
    params = {"COLLECTION": collection_for(release, deep),
              "POS": f"circle {region.ra_deg} {region.dec_deg} {region.size_deg / math.sqrt(2)}",
              "MAXREC": "5000", "RESPONSEFORMAT": "VOTABLE"}
    if detector is not None:
        # SIA BAND is in metres. Restrict the requested detector's wavelength
        # regime before retrieving metadata; this is not a local spectral match.
        bands={1:.9,2:1.35,3:2.,4:3.,5:4.1,6:4.7}
        if type(detector) is not int or detector not in bands:
            raise ValueError('Detector must be an integer from 1 to 6')
        value=bands[detector]*1e-6
        params['BAND']=f'{value} {value}'
    url = SIA_ENDPOINT + "?" + urlencode(params)
    return params, url


def inventory(region: SkyRegion, release: str, output: Path, *, deep: bool = False, detector: int | None = None, timeout_seconds: int = 60, attempts: int = 3) -> list[dict]:
    params, url = sia_query(region, release, deep=deep, detector=detector)
    output.mkdir(parents=True, exist_ok=False)
    query = {"url": url, "parameters": params, "attempted_at": utc_now().isoformat(), "status": "pending"}
    (output / "query.json").write_text(json.dumps(query, indent=2), encoding="utf-8")
    try:
        data = fetch_bytes(url, max_bytes=8_000_000, timeout=timeout_seconds, attempts=attempts)
        (output / "response.xml").write_bytes(data)
        query.update(retrieved_at=utc_now().isoformat(), response_sha256=hashlib.sha256(data).hexdigest())
        rows = parse_sia(data)
    except (OSError, ValueError) as exc:
        query.update(status="failed", error=str(exc))
        (output / "query.json").write_text(json.dumps(query, indent=2), encoding="utf-8")
        raise
    query.update(status="complete", row_count=len(rows))
    (output / "query.json").write_text(json.dumps(query, indent=2), encoding="utf-8")
    catalogue=json.dumps(rows,indent=2).encode('utf-8')
    if len(catalogue)>16_000_000:
        raise ValueError('Expanded metadata exceeds its 16 MB evidence bound')
    (output / "observations.json").write_bytes(catalogue)
    return rows


def cutout_url(access_url: str, region: SkyRegion) -> str:
    if urlsplit(access_url).query:
        raise ValueError("Expected an archive source URL without a query")
    return access_url + "?" + urlencode({"center": f"{region.ra_deg},{region.dec_deg}", "size": region.size_deg})


def download(url: str, destination: Path, max_bytes: int = 80_000_000) -> FileRecord:
    sidecar = destination.with_suffix(destination.suffix + ".source.json")
    if destination.exists():
        if not sidecar.exists():
            raise FileExistsError("Existing input has no provenance sidecar; refusing to overwrite it")
        saved = FileRecord.model_validate_json(sidecar.read_text(encoding="utf-8"))
        if saved.source_url != url or sha256_file(destination) != saved.sha256:
            raise ValueError("Existing input differs from its source identity")
        return saved
    data = fetch_bytes(url, max_bytes=max_bytes)
    destination.parent.mkdir(parents=True, exist_ok=True)
    with destination.open("xb") as stream:
        stream.write(data)
    record = record_file(destination, url).model_copy(update={'retrieved_at_utc':utc_now()})
    sidecar.write_text(record.model_dump_json(indent=2), encoding="utf-8")
    return record
