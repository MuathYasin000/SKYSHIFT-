"""SKYSHIFT's dependency-free, loopback-only production static server.

Run ``python tools/local_server.py --open-browser`` or start_skyshift.bat.
This server hosts already prepared scientific products; it does not alter them.
"""
from __future__ import annotations

import argparse
from datetime import datetime, timezone
import hmac
import hashlib
from http import HTTPStatus
from http.client import HTTPConnection
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
import mimetypes
from pathlib import Path
import secrets
import socket
import sys
import threading
import time
from urllib.parse import unquote, urlsplit
import webbrowser

ROOT = Path(__file__).resolve().parents[1]
SERVER_VERSION = '1.2'
CONTENT_SECURITY_POLICY = (
    "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; worker-src 'self' blob:; style-src 'self' 'unsafe-inline'; "
    "img-src 'self' data: blob:; font-src 'self'; connect-src 'self' blob:; "
    "media-src 'self' blob:; object-src 'none'; base-uri 'self'; "
    "frame-ancestors 'self'; form-action 'self'"
)


def load_release(directory):
    path = directory/'release.json'
    if path.exists():
        raw = json.loads(path.read_text(encoding='utf-8'))
        return {k: raw[k] for k in ('release_id', 'app_version', 'created_at_utc') if k in raw}
    return {'release_id': 'workspace', 'app_version': '0.11.0-time-explorer-local-workspace'}


def content_identity(directory):
    """Identify the served UI without reading or rewriting scientific datasets."""
    digest = hashlib.sha256()
    for path in sorted(Path(directory).glob('*')):
        if path.is_file() and path.suffix in ('.html', '.js', '.css'):
            digest.update(path.name.encode())
            digest.update(path.read_bytes())
    return digest.hexdigest()


def accepts_gzip(header):
    for item in header.lower().split(','):
        fields = [field.strip() for field in item.split(';')]
        if fields[0] != 'gzip':
            continue
        quality = 1.0
        for field in fields[1:]:
            if field.startswith('q='):
                try:
                    quality = float(field[2:])
                except ValueError:
                    quality = 0.0
        return 0 < quality <= 1
    return False


class LocalServer(ThreadingHTTPServer):
    daemon_threads = True
    allow_reuse_address = False
    # Windows rejects excess TCP connections when the inherited backlog of five
    # fills during parallel ES-module loading. One refused import prevents the
    # entire controller from executing, leaving an apparently frozen HUD.
    request_queue_size = 128

    def __init__(self, directory, port=3000, *, bind='127.0.0.1', public_hosts=None, health_hosts=None):
        self.directory = Path(directory).resolve(strict=True)
        if not (self.directory/'index.html').is_file():
            raise ValueError('Application directory does not contain index.html')
        self.release = load_release(self.directory)
        self.directory_id = hashlib.sha256(str(self.directory).lower().encode()).hexdigest()[:16]
        self.shutdown_token = secrets.token_urlsafe(32)
        self.public_hosts = set(public_hosts or [])
        self.health_hosts=set(health_hosts or [])
        self.preparation = None
        self.preparation_lock = threading.Lock()
        self.preparation_enabled = self.directory == (ROOT/'web/dist').resolve() and (ROOT/'src/skyshift/sequence.py').is_file()
        super().__init__((bind, port), LocalHandler)

    def preparation_store(self):
        if not self.preparation_enabled:
            raise ValueError('This static snapshot has no preparation service')
        with self.preparation_lock:
            if self.preparation is None:
                sys.path.insert(0, str(ROOT/'src'))
                from skyshift.jobs import JobStore
                self.preparation = JobStore(ROOT/'data/investigations')
        return self.preparation

    def server_close(self):
        if self.preparation is not None:
            self.preparation.close()
        super().server_close()


class LocalHandler(SimpleHTTPRequestHandler):
    server_version = 'SKYSHIFT/' + SERVER_VERSION
    sys_version = ''
    protocol_version = 'HTTP/1.1'

    def setup(self):
        super().setup()
        self.connection.settimeout(30)
    extensions_map = {**SimpleHTTPRequestHandler.extensions_map,
        '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json',
        '.fits': 'application/fits', '.fit': 'application/fits', '.bin': 'application/octet-stream',
        '.svg': 'image/svg+xml', '.csv': 'text/csv', '.zip': 'application/zip', '.wasm': 'application/wasm',
        '.glb': 'model/gltf-binary'}

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(args[2].directory), **kwargs)

    def setup(self):
        super().setup()
        # Reuse browser connections for module/texture bursts instead of
        # churning Windows TCP buffers; release idle browser connections.
        self.connection.settimeout(15)

    def end_headers(self):
        for name, value in {
            'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'SAMEORIGIN',
            'Referrer-Policy': 'strict-origin-when-cross-origin',
            'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
            'Cross-Origin-Opener-Policy': 'same-origin',
            'Content-Security-Policy': CONTENT_SECURITY_POLICY,
            'Cache-Control': 'no-cache',
        }.items():
            self.send_header(name, value)
        super().end_headers()

    def valid_host(self):
        host = self.headers.get('Host', '')
        port = self.server.server_address[1]
        return host.lower() in ({f'127.0.0.1:{port}', f'localhost:{port}'} | self.server.public_hosts) or (
            self.command in {'GET','HEAD'} and self.path=='/healthz' and host.lower() in self.server.health_hosts)

    def api_request(self, path, payload=None):
        try:
            if path == '/api/capabilities' and self.command in ('GET','HEAD'):
                from skyshift.releases import release_capabilities
                self.send_json(HTTPStatus.OK, {'preparation': self.server.preparation_enabled,
                    'preparation_code_sha256':hashlib.sha256(b''.join(p.name.encode()+p.read_bytes() for p in sorted((ROOT/'src/skyshift').glob('*.py')))).hexdigest() if self.server.preparation_enabled else None,
                    'max_frames':6,'max_field_arcmin':30,'max_active_jobs':2,
                    'calibrated_temporal_adapters':['qr2/D2'],
                    'release_registry':release_capabilities(),
                    'archive_discovery':{'collections':['spherex_qr2','spherex_qr2_deep','spherex_qr3','spherex_qr3_deep'],'providers':['sia2','tap'],'max_requests':8,'max_transfer_bytes':16000000,'index_version':'spherex-metadata-index-v1','scope':'Region-scoped incremental ingestion; no all-sky mirror or complete archive claim'},
                    'scope':'Other release/detector combinations may provide single-frame visualization only; no automatic fallback.'})
                return
            store = self.server.preparation_store()
            if path == '/api/investigations' and self.command == 'POST':
                self.send_json(HTTPStatus.ACCEPTED, store.create(payload))
                return
            parts = path.strip('/').split('/')
            if len(parts) in (3,4) and parts[:2] == ['api','investigations'] and len(parts[2]) == 32 and all(c in '0123456789abcdef' for c in parts[2]):
                key = parts[2]
                if len(parts) == 3 and self.command in ('GET','HEAD'):
                    self.send_json(HTTPStatus.OK, store.status(key)); return
                if len(parts) == 4 and parts[3] == 'cancel' and self.command == 'POST':
                    self.send_json(HTTPStatus.OK, store.cancel(key)); return
                if len(parts) == 4 and parts[3] == 'result' and self.command in ('GET','HEAD'):
                    raw = store.result(key)
                    self.send_response(HTTPStatus.OK)
                    self.send_header('Content-Type','application/json; charset=utf-8')
                    self.send_header('Content-Length',str(len(raw)))
                    self.end_headers()
                    if self.command != 'HEAD': self.wfile.write(raw)
                    return
            self.send_json(HTTPStatus.NOT_FOUND, {'error':'Unknown investigation endpoint'})
        except KeyError:
            self.send_json(HTTPStatus.NOT_FOUND, {'error':'Investigation expired or was not found'})
        except (ValueError, OSError, ImportError) as exc:
            status = HTTPStatus.TOO_MANY_REQUESTS if getattr(exc, 'retryable', False) else HTTPStatus.BAD_REQUEST
            self.send_json(status, {'error':str(exc)})

    def send_json(self, status, payload):
        if isinstance(payload,dict) and ('error' in payload or 'message' in payload):
            try:
                from skyshift.messages import public_error_message
                payload={k:public_error_message(v) if k in {'error','message'} else v for k,v in payload.items()}
            except ImportError:
                payload={k:'Scientific preparation is unavailable on this host.' if k=='error' else v for k,v in payload.items()}
        content = json.dumps(payload, separators=(',', ':')).encode()
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(content)))
        self.end_headers()
        if self.command != 'HEAD':
            self.wfile.write(content)

    def resolve_requested(self):
        parsed = urlsplit(self.path)
        if parsed.scheme or parsed.netloc:
            return None
        try:
            path = unquote(parsed.path, encoding='utf-8', errors='strict')
        except UnicodeDecodeError:
            return None
        parts = path.split('/')
        if any(p in ('.', '..') or p.startswith('.') for p in parts if p) or any(c in path for c in ('\\', ':', '\x00')):
            return None
        resolved = (self.server.directory/path.lstrip('/')).resolve()
        if not resolved.is_relative_to(self.server.directory):
            return None
        if resolved.is_dir():
            resolved = (resolved/'index.html').resolve()
        if not resolved.is_relative_to(self.server.directory) or not resolved.is_file():
            return None
        return resolved

    def send_head(self):
        if not self.valid_host():
            self.send_json(HTTPStatus.MISDIRECTED_REQUEST, {'error': 'Use the local SKYSHIFT address printed by the startup script.'})
            return None
        path = urlsplit(self.path).path
        if path.startswith('/api/'):
            self.api_request(path)
            return None
        if path == '/healthz':
            self.send_json(HTTPStatus.OK, {'status': 'ok', 'application': 'SKYSHIFT',
                'server_version': SERVER_VERSION, 'directory_id': self.server.directory_id,
                'content_id': content_identity(self.server.directory), **self.server.release})
            return None
        if path == '/version.json':
            self.send_json(HTTPStatus.OK, {'application': 'SKYSHIFT', 'server_version': SERVER_VERSION,
                'content_id': content_identity(self.server.directory), **self.server.release})
            return None
        target = self.resolve_requested()
        if target is None:
            self.send_error(HTTPStatus.NOT_FOUND, 'SKYSHIFT file or page was not found.')
            return None
        content_type = self.guess_type(str(target))
        compressed = False
        # A release build precompresses text. Data files are never transformed in place.
        gzip_path = target.with_name(target.name+'.gz')
        if (accepts_gzip(self.headers.get('Accept-Encoding', '')) and
                target.suffix.lower() in ('.html', '.css', '.js', '.json', '.svg', '.txt') and
                gzip_path.is_file() and gzip_path.resolve().is_relative_to(self.server.directory) and
                gzip_path.stat().st_mtime >= target.stat().st_mtime):
            target, compressed = gzip_path, True
        try:
            stream = target.open('rb')
        except OSError:
            self.send_error(HTTPStatus.NOT_FOUND, 'SKYSHIFT file could not be opened.')
            return None
        info = target.stat()
        self.send_response(HTTPStatus.OK)
        self.send_header('Content-Type', content_type)
        self.send_header('Content-Length', str(info.st_size))
        self.send_header('Last-Modified', self.date_time_string(info.st_mtime))
        self.send_header('Vary', 'Accept-Encoding')
        if compressed:
            self.send_header('Content-Encoding', 'gzip')
        self.end_headers()
        return stream

    def do_POST(self):
        if not self.valid_host():
            self.send_json(HTTPStatus.MISDIRECTED_REQUEST, {'error': 'Local host header required.'})
            return
        if self.path.startswith('/api/'):
            host = self.headers.get('Host','')
            origin = self.headers.get('Origin')
            if origin and origin not in {f'http://{host}',f'https://{host}'}:
                self.close_connection = True
                self.send_json(HTTPStatus.FORBIDDEN, {'error':'Same-origin preparation requests required'})
                return
            try:
                length = int(self.headers.get('Content-Length','0'))
                if self.headers.get('Transfer-Encoding') or not 0 < length <= 4096 or self.headers.get('Content-Type','').split(';')[0] != 'application/json':
                    raise ValueError('Use a JSON observation request no larger than 4096 bytes')
                payload = json.loads(self.rfile.read(length))
                self.api_request(urlsplit(self.path).path,payload)
            except (ValueError, OSError) as exc:
                self.close_connection = True
                self.send_json(HTTPStatus.BAD_REQUEST, {'error':str(exc)})
            return
        if self.path != '/__skyshift_shutdown' or self.server.public_hosts:
            self.send_json(HTTPStatus.METHOD_NOT_ALLOWED, {'error': 'Static SKYSHIFT hosting does not accept uploads or changes.'})
            return
        expected = 'Bearer '+self.server.shutdown_token
        if not hmac.compare_digest(self.headers.get('Authorization', ''), expected):
            self.send_json(HTTPStatus.UNAUTHORIZED, {'error': 'A valid local startup token is required to stop this server.'})
            return
        self.send_json(HTTPStatus.OK, {'status': 'stopping', 'application': 'SKYSHIFT'})
        threading.Thread(target=self.server.shutdown, daemon=True).start()


def stop_server(state_file):
    if not state_file.exists():
        print('No SKYSHIFT server started by this project was found. Close its server window or press Ctrl+C if running manually.')
        return 0
    try:
        state = json.loads(state_file.read_text())
        port = state['port']
        if type(port) is not int or not 1 <= port <= 65535:
            raise ValueError('Invalid local server state')
        connection = HTTPConnection('127.0.0.1', port, timeout=3)
        connection.request('POST', '/__skyshift_shutdown', headers={'Authorization': 'Bearer '+state['token']})
        response = connection.getresponse()
        payload = response.read()
        connection.close()
        if response.status != HTTPStatus.OK:
            print('SKYSHIFT could not verify the running server. No unrelated process was stopped.')
            return 1
        # The shutdown response precedes serve_forever exiting. Wait for main's
        # close-and-unlink handshake so an immediate restart cannot race bind().
        deadline = time.monotonic() + 5
        while state_file.exists() and time.monotonic() < deadline:
            try:
                if json.loads(state_file.read_text()).get('token') != state['token']:
                    break
            except (OSError, ValueError):
                break
            time.sleep(.05)
        if state_file.exists():
            try:
                if json.loads(state_file.read_text()).get('token') == state['token']:
                    print('SKYSHIFT accepted shutdown but has not finished closing. Wait briefly before restarting.')
                    return 1
            except (OSError, ValueError):
                pass
        print('SKYSHIFT local server stopped.')
        return 0
    except (OSError, ValueError, KeyError):
        print('The recorded SKYSHIFT server is not available. No unrelated process was stopped.')
        return 1


def same_local_server(directory, port):
    """Only reopen a server identifying this exact local content directory."""
    try:
        connection = HTTPConnection('127.0.0.1', port, timeout=2)
        connection.request('GET', '/healthz')
        response = connection.getresponse()
        payload = json.loads(response.read())
        connection.close()
        directory_id = hashlib.sha256(str(Path(directory).resolve()).lower().encode()).hexdigest()[:16]
        return (response.status == 200 and payload.get('application') == 'SKYSHIFT'
                and payload.get('directory_id') == directory_id)
    except (OSError, ValueError):
        return False


def main(argv=None):
    if sys.version_info < (3, 11):
        print('SKYSHIFT needs Python 3.11 or newer. Install Python or use the project .venv interpreter.', file=sys.stderr)
        return 1
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--port', type=int, default=3000)
    parser.add_argument('--directory', type=Path, default=ROOT/'web/dist')
    parser.add_argument('--open-browser', action='store_true')
    parser.add_argument('--stop', action='store_true')
    args = parser.parse_args(argv)
    if not 1 <= args.port <= 65535:
        parser.error('Port must be between 1 and 65535')
    state_file = ROOT/'.skyshift-local'/f'server-{args.port}.json'
    if args.stop:
        return stop_server(state_file)
    try:
        server = LocalServer(args.directory, args.port)
    except OSError:
        if args.open_browser and same_local_server(args.directory, args.port):
            address = f'http://localhost:{args.port}'
            print(f'SKYSHIFT is already running at {address}. Opening the existing local application.')
            webbrowser.open(address)
            return 0
        print(f'Cannot start SKYSHIFT: localhost:{args.port} is occupied or unavailable. '
              'Run stop_skyshift.bat for this project, close the other server, or use --port 3001.', file=sys.stderr)
        return 1
    except (ValueError, json.JSONDecodeError) as exc:
        print(f'Cannot start SKYSHIFT: {exc}', file=sys.stderr)
        return 1
    state_file.parent.mkdir(parents=True, exist_ok=True)
    state = {'port': args.port, 'token': server.shutdown_token,
             'started_at_utc': datetime.now(timezone.utc).isoformat()}
    state_file.write_text(json.dumps(state), encoding='utf-8')
    state_file.chmod(0o600)
    address = f'http://localhost:{args.port}'
    print(f'\nSKYSHIFT is ready at {address}\nLocal hosting only. Keep this window open. Press Ctrl+C to stop.\n', flush=True)
    if args.open_browser:
        threading.Timer(.3, lambda: webbrowser.open(address)).start()
    try:
        server.serve_forever(poll_interval=.2)
    except KeyboardInterrupt:
        print('\nStopping SKYSHIFT.')
    finally:
        server.server_close()
        try:
            if json.loads(state_file.read_text()).get('token') == state['token']:
                state_file.unlink()
        except (OSError, ValueError):
            pass
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
