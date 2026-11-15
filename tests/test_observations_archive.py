import json
from pathlib import Path
from urllib.error import HTTPError
from urllib.parse import parse_qs, urlsplit

from skyshift import observations_archive as archive
from skyshift.models import SkyRegion


def test_truncated_page_splits_and_a_retry_fetches_only_the_failed_interval(tmp_path, monkeypatch):
    interval_calls = []
    failed = set()

    def fetch(url, *, max_bytes, timeout, attempts):
        parsed = urlsplit(url)
        params = parse_qs(parsed.query)
        assert timeout == 15
        if parsed.path == "/TAP/sync":
            assert attempts == 1
            assert "TOP 1000" in params["QUERY"][0]
            interval_calls.append("tap")
            raise TimeoutError("TAP timed out")
        assert params["COLLECTION"] == ["spherex_dr1"]
        assert "BAND" not in params
        assert attempts == 2
        interval = tuple(map(float, params["TIME"][0].split()))
        interval_calls.append(interval)
        if interval == (61001, 61002) and interval not in failed:
            failed.add(interval)
            raise HTTPError(url, 502, "Bad Gateway", None, None)
        status = "OVERFLOW" if interval == (61000, 61002) else "OK"
        return f'''<VOTABLE xmlns="http://www.ivoa.net/xml/VOTable/v1.3"><RESOURCE>
        <INFO name="QUERY_STATUS" value="{status}"/><TABLE><FIELD name="obs_id"/>
        <DATA><TABLEDATA/></DATA></TABLE></RESOURCE></VOTABLE>'''.encode()

    monkeypatch.setattr(archive, "fetch_bytes", fetch)
    region = SkyRegion(ra_deg=10, dec_deg=20, size_deg=.01)
    def run():
        return archive._query_collection(region, "spherex_dr1", 61000, 61002, motion_margin=0, directory=tmp_path, progress=lambda _: None)

    _, receipts, failures = run()
    assert len(receipts) == 1 and "502" in failures[0]
    assert interval_calls == [(61000, 61002), (61000, 61001), (61001, 61002), "tap"]
    _, receipts, failures = run()
    assert len(receipts) == 2 and not failures
    assert interval_calls[4:] == [(61001, 61002)]


def test_deep_collection_starts_with_time_pages(tmp_path, monkeypatch):
    intervals = []

    def read_page(url, collection, lo, hi, directory, progress, *, provider):
        intervals.append((lo, hi))
        assert provider == "sia2"
        return {"split": False, "rows": [], "receipt": {"time_mjd": [lo, hi]}}

    monkeypatch.setattr(archive, "_metadata_page", read_page)
    region = SkyRegion(ra_deg=10, dec_deg=20, size_deg=.01)
    archive._query_collection(region, "spherex_dr1_deep", 61000, 61250, motion_margin=0,
                              directory=tmp_path, progress=lambda _: None)
    assert intervals == [(61000, 61120), (61120, 61240), (61240, 61250)]


def test_cutout_uses_propagated_barnard_position_for_each_exposure(tmp_path, monkeypatch):
    target = archive.load_targets()["barnards-star"]
    request = archive.CoreSearchRequest(
        region=SkyRegion(ra_deg=target["ra_deg"], dec_deg=target["dec_deg"], size_deg=1 / 60),
        target_id=target["id"],
    )
    dates = [60800., 61500.]
    source = "https://irsa.ipac.caltech.edu/ibe/data/spherex/dr1/level2/example.fits"
    rows = [{"access_url": source, "target_position": archive.propagated_position(target, date)} for date in dates]

    def verify_center(row, region, source_url, cache_key, directory, target_position, progress):
        center, = parse_qs(urlsplit(source_url).query)["center"]
        ra, dec = map(float, center.split(","))
        assert (ra, dec) == (target_position["ra_deg"], target_position["dec_deg"])
        return dec

    monkeypatch.setattr(archive, "_prepare_frame", verify_center)
    prepared = [archive.prepare_frame({"request": request.model_dump(), "observations": rows}, index, tmp_path)
                for index in range(len(rows))]
    assert prepared[1] > prepared[0] > target["dec_deg"]


def test_preset_discovery_expands_for_motion_and_uses_every_current_collection(tmp_path, monkeypatch):
    queries = []
    def query(region, collection, start, end, *, motion_margin, directory, progress):
        queries.append((region, collection, motion_margin))
        return [], [], []

    monkeypatch.setattr(archive, "_query_collection", query)
    target = archive.load_targets()["barnards-star"]
    request = archive.CoreSearchRequest(
        region=SkyRegion(ra_deg=target["ra_deg"], dec_deg=target["dec_deg"], size_deg=1 / 60),
        target_id=target["id"],
    )
    result = archive.search_observations(request, directory=tmp_path)
    assert [collection for _, collection, _ in queries] == list(archive.CURRENT_COLLECTIONS)
    assert all(region.dec_deg > target["dec_deg"] and margin > 0 for region, _, margin in queries)
    assert result["request"]["detectors"] == list(range(1, 7))
    assert result["metadata_query_position"]["reference_epoch"] == "J2000.0"


def test_shipped_preset_cutouts_have_current_provenance_and_matching_manifest_rows():
    dist = Path(__file__).resolve().parents[1] / "web" / "dist"
    for target in archive.load_targets():
        manifest = json.loads((dist / "data" / "observation-targets" / target / "manifest.json").read_bytes())
        observations = manifest["observations"]
        assert len(observations) >= 2
        assert [row["time_start_utc"] for row in observations] == sorted(row["time_start_utc"] for row in observations)
        for row in observations:
            frame = json.loads((dist / row["frame_url"]).read_bytes())
            assert frame["dataset_kind"] == "real" and frame["release"] in archive.CURRENT_RELEASES
            assert frame["archive_id"] == row["observation_id"] and frame["detector"] == row["detector"]
            assert frame["archive_source_url"] == row["access_url"]
            assert len(frame["cutout_sha256"]) == 64
            assert urlsplit(frame["cutout_source_url"]).hostname == "irsa.ipac.caltech.edu"
