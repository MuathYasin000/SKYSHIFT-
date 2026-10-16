"""HTTP integration tests against temporary loopback servers and synthetic files."""
import gzip
import hashlib
from http.client import HTTPConnection
import importlib.util
import json
from pathlib import Path
import shutil
import threading
from concurrent.futures import ThreadPoolExecutor

import pytest

ROOT = Path(__file__).parents[1]


def load_module(name, relative):
    spec = importlib.util.spec_from_file_location(name, ROOT/relative)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


server_module = load_module('local_server', 'tools/local_server.py')
builder = load_module('build_local_release', 'tools/build_local_release.py')


@pytest.fixture
def running(tmp_path):
    directory = tmp_path/'public'; directory.mkdir()
    (directory/'index.html').write_text('<!doctype html><title>SKYSHIFT synthetic HTTP fixture</title>')
    (directory/'app.js').write_text('export const value = 1;')
    (directory/'style.css').write_text('body { color: white; }')
    (directory/'pair.fits').write_bytes(b'SIMPLE  = synthetic transport fixture only')
    (directory/'private').mkdir()
    (directory/'.secret').write_text('never served')
    (tmp_path/'outside.txt').write_text('outside secret')
    server = server_module.LocalServer(directory, port=0)
    thread = threading.Thread(target=server.serve_forever, kwargs={'poll_interval': .01}, daemon=True)
    thread.start()
    server.test_thread = thread
    yield server, directory
    server.shutdown(); server.server_close(); thread.join(timeout=2)


def request(server, path='/', method='GET', headers=None):
    conn = HTTPConnection('127.0.0.1', server.server_address[1], timeout=3)
    conn.request(method, path, headers=headers or {})
    response = conn.getresponse()
    body = response.read()
    result = response.status, dict(response.getheaders()), body
    conn.close()
    return result


def test_loopback_static_html_health_and_version(running):
    server, _ = running
    assert server.server_address[0] == '127.0.0.1'
    status, headers, body = request(server)
    assert status == 200 and b'SKYSHIFT' in body
    assert headers['Content-Type'] == 'text/html'
    assert json.loads(request(server, '/healthz')[2])['status'] == 'ok'
    assert json.loads(request(server, '/version.json')[2])['application'] == 'SKYSHIFT'


def test_parallel_module_loading_does_not_refuse_connections(running):
    server, _ = running
    barrier = threading.Barrier(48)
    def fetch_module(_):
        barrier.wait(timeout=5)
        return request(server, '/app.js')[0]
    with ThreadPoolExecutor(max_workers=48) as pool:
        assert list(pool.map(fetch_module, range(48))) == [200] * 48


def test_served_content_identity_changes_when_ui_changes(running):
    server, directory = running
    before = json.loads(request(server, '/healthz')[2])
    (directory/'app.js').write_text('export const value = 2;')
    after = json.loads(request(server, '/version.json')[2])
    assert len(before['content_id']) == 64
    assert before['content_id'] != after['content_id']


def test_startup_reopens_only_the_same_local_directory(running, monkeypatch):
    server, directory = running
    port = server.server_address[1]
    assert server_module.same_local_server(directory, port)
    assert not server_module.same_local_server(directory.parent, port)
    opened = []
    monkeypatch.setattr(server_module.webbrowser, 'open', opened.append)
    assert server_module.main(['--directory', str(directory), '--port', str(port), '--open-browser']) == 0
    assert opened == [f'http://localhost:{port}']


@pytest.mark.parametrize('path', ['/../outside.txt', '/%2e%2e/outside.txt', '/..%5coutside.txt', '/.secret', '/private/', '/missing', '/C:/Windows/win.ini', '/%00'])
def test_traversal_hidden_files_and_directory_listing_are_denied(running, path):
    server, _ = running
    status, _, body = request(server, path)
    assert status == 404
    assert b'outside secret' not in body and b'never served' not in body


def test_wrong_host_rejected_and_post_does_not_write(running):
    server, _ = running
    assert request(server, headers={'Host': 'unrelated.example'})[0] == 421
    assert request(server, '/app.js', 'POST')[0] == 405
    assert request(server, '/__skyshift_shutdown', 'POST')[0] == 401


def test_mime_head_and_security_headers(running):
    server, _ = running
    for path, mime in [('/app.js', 'text/javascript'), ('/style.css', 'text/css'), ('/pair.fits', 'application/fits')]:
        status, headers, body = request(server, path, 'HEAD')
        assert status == 200 and headers['Content-Type'] == mime and not body
        assert int(headers['Content-Length']) > 0
        assert headers['X-Content-Type-Options'] == 'nosniff'
        assert "connect-src 'self'" in headers['Content-Security-Policy']
        assert headers['X-Frame-Options'] == 'SAMEORIGIN'
        assert "frame-ancestors 'self'" in headers['Content-Security-Policy']
        assert "connect-src 'self' blob:" in headers['Content-Security-Policy']


def test_precompressed_text_decompresses_to_exact_original(running):
    server, directory = running
    data = (directory/'app.js').read_bytes()
    (directory/'app.js.gz').write_bytes(gzip.compress(data, mtime=0))
    status, headers, body = request(server, '/app.js', headers={'Accept-Encoding': 'gzip'})
    assert status == 200
    assert headers['Content-Encoding'] == 'gzip'
    assert headers['Content-Type'] == 'text/javascript'
    assert gzip.decompress(body) == data
    assert request(server, '/app.js')[2] == data
    assert request(server, '/app.js', headers={'Accept-Encoding': 'gzip;q=0'})[2] == data
    assert request(server, '/app.js', headers={'Accept-Encoding': 'gzip;q=invalid'})[2] == data


def test_occupied_port_does_not_replace_running_service(running):
    server, directory = running
    with pytest.raises(OSError):
        server_module.LocalServer(directory, port=server.server_address[1])
    assert request(server, '/healthz')[0] == 200


def test_stop_requires_matching_recorded_token(running, tmp_path):
    server, _ = running
    state = tmp_path/'state.json'
    state.write_text(json.dumps({'port': server.server_address[1], 'token': 'wrong'}))
    assert server_module.stop_server(state) == 1
    assert request(server, '/healthz')[0] == 200
    state.write_text(json.dumps({'port': server.server_address[1], 'token': server.shutdown_token}))
    # Mirror main()'s close-and-unlink handshake; this fixture otherwise runs
    # serve_forever directly and has no launcher to retire its state file.
    def retire():
        server.test_thread.join(timeout=3)
        if not server.test_thread.is_alive():
            server.server_close()
            state.unlink(missing_ok=True)
    retiring = threading.Thread(target=retire)
    retiring.start()
    assert server_module.stop_server(state) == 0
    retiring.join(timeout=3)
    assert not retiring.is_alive()


def test_build_preserves_previous_release_and_all_asset_hashes(tmp_path):
    dist = tmp_path/'web/dist'; dist.mkdir(parents=True)
    (dist/'data').mkdir()
    (dist/'index.html').write_text('<title>Synthetic release fixture only</title>'+' '*1000)
    fake_fits = b'explicit synthetic transport fixture; not astronomical observations'
    (dist/'data/pair.fits').write_bytes(fake_fits)
    fake_bundle = json.dumps({'manifest': {'dataset_kind': 'synthetic', 'prepared_files': [{'sha256': hashlib.sha256(fake_fits).hexdigest()}]},
                            'prepared_fits_url': './data/pair.fits'}).encode()
    (dist/'data/bundle.json').write_bytes(fake_bundle)
    (dist/'data/catalog.json').write_text(json.dumps({'bundle_url': './data/bundle.json', 'bundle_sha256': hashlib.sha256(fake_bundle).hexdigest()}))
    (tmp_path/'tools').mkdir()
    for relative in ('tools/local_server.py', 'start_skyshift.bat', 'stop_skyshift.bat'):
        shutil.copyfile(ROOT/relative, tmp_path/relative)
    first = builder.build_release(tmp_path, 'first')
    original = Path(first['directory'])/'web/dist/index.html'
    before = original.read_bytes()
    (dist/'index.html').write_text('<title>Changed synthetic fixture</title>')
    second = builder.build_release(tmp_path, 'second')
    assert original.read_bytes() == before
    assert Path(second['directory']).is_dir()
    sums = json.loads((Path(first['directory'])/'SHA256SUMS.json').read_text())
    assert all(builder.sha256(Path(first['directory'])/name) == checksum for name, checksum in sums.items())
    assert not first['published']
    with pytest.raises(FileExistsError):
        builder.build_release(tmp_path, 'first')
    with pytest.raises(ValueError):
        builder.build_release(tmp_path, '../escape')
    (dist/'data/pair.fits').write_bytes(b'tampered synthetic fixture')
    with pytest.raises(ValueError, match='identity failed'):
        builder.build_release(tmp_path, 'corrupt')


def test_real_workspace_entry_assets_are_served_without_modification():
    directory = ROOT/'web/dist'
    server = server_module.LocalServer(directory, port=0)
    thread = threading.Thread(target=server.serve_forever, kwargs={'poll_interval': .01}, daemon=True)
    thread.start()
    try:
        for relative in ('index.html', 'app.js', 'science.js', 'style.css', 'data/catalog.json', 'data/bundle.json', 'data/pair.fits'):
            status, _, body = request(server, '/'+relative)
            assert status == 200, relative
            assert body == (directory/relative).read_bytes(), relative
    finally:
        server.shutdown(); server.server_close(); thread.join(timeout=2)


def test_release_asset_validation_catches_missing_and_remote_runtime_assets(tmp_path):
    (tmp_path/'index.html').write_text('<script src="missing.js"></script>')
    with pytest.raises(ValueError, match='Missing'):
        builder.validate_assets(tmp_path)
    (tmp_path/'index.html').write_text('<img src="https://example.org/image.jpg">')
    with pytest.raises(ValueError, match='Vendor external'):
        builder.validate_assets(tmp_path)
    (tmp_path/'index.html').write_text('<a href="https://irsa.ipac.caltech.edu">Archive reference link</a>')
    builder.validate_assets(tmp_path)
