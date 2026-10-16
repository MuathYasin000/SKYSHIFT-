from pathlib import Path
import pytest
from skyshift.archive import parse_sia, fetch_bytes, download, record_file

PREFIX = '<VOTABLE xmlns="http://www.ivoa.net/xml/VOTable/v1.3"><RESOURCE>'
SUFFIX = '</RESOURCE></VOTABLE>'


def test_sia_preserves_null_values_and_field_names():
    data = PREFIX + '<INFO name="QUERY_STATUS" value="OK"/><TABLE><FIELD name="obs_id"/><FIELD name="access_url"/><DATA><TABLEDATA><TR><TD>exposure-1</TD><TD/></TR></TABLEDATA></DATA></TABLE>' + SUFFIX
    assert parse_sia(data.encode()) == [{"obs_id": "exposure-1", "access_url": None}]


@pytest.mark.parametrize("status", ["ERROR", "OVERFLOW"])
def test_sia_does_not_treat_failed_or_truncated_query_as_empty(status):
    with pytest.raises(ValueError, match=status):
        parse_sia((PREFIX + f'<INFO name="QUERY_STATUS" value="{status}">failed</INFO>' + SUFFIX).encode())


def test_sia_rejects_html_error_page():
    with pytest.raises(ValueError, match="VOTable"):
        parse_sia(b"<html>service unavailable</html>")


def test_sia_rejects_unknown_binary_decoder():
    with pytest.raises(ValueError, match="Binary"):
        parse_sia((PREFIX + '<TABLE><DATA><BINARY/></DATA></TABLE>' + SUFFIX).encode())


@pytest.mark.parametrize("url", ["http://irsa.ipac.caltech.edu/SIA", "https://example.org/input.fits", "file:///C:/secret"])
def test_only_approved_https_services_can_be_fetched(url):
    with pytest.raises(ValueError, match="approved"):
        fetch_bytes(url, max_bytes=10)


def test_existing_data_without_provenance_is_never_overwritten(tmp_path):
    p = tmp_path / "input.fits";p.write_bytes(b"original")
    with pytest.raises(FileExistsError):
        download("https://irsa.ipac.caltech.edu/a.fits", p)
    assert p.read_bytes() == b"original"


def test_download_detects_changed_cached_bytes(tmp_path):
    p = tmp_path / "input.fits";p.write_bytes(b"original")
    url = "https://irsa.ipac.caltech.edu/a.fits"
    p.with_suffix(".fits.source.json").write_text(record_file(p, url).model_dump_json())
    p.write_bytes(b"changed")
    with pytest.raises(ValueError, match="identity"):
        download(url, p)


def test_failed_inventory_preserves_server_response_and_query(monkeypatch, tmp_path):
    import skyshift.archive as archive
    from skyshift.models import SkyRegion
    payload = (PREFIX + '<INFO name="QUERY_STATUS" value="ERROR">bad query</INFO>' + SUFFIX).encode()
    monkeypatch.setattr(archive, 'fetch_bytes', lambda *args, **kwargs: payload)
    out = tmp_path / 'failed-query'
    with pytest.raises(ValueError, match='ERROR'):
        archive.inventory(SkyRegion(ra_deg=210, dec_deg=54, size_deg=.1), 'qr2', out)
    assert (out / 'response.xml').read_bytes() == payload
    assert '"status": "failed"' in (out / 'query.json').read_text()

