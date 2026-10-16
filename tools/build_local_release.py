"""Create an independent, offline-capable local SKYSHIFT website release.

Never edits an older release or publishes to a hosting service.
"""
from __future__ import annotations

import argparse
from datetime import datetime, timezone
import gzip
import hashlib
from html.parser import HTMLParser
import json
from pathlib import Path
import re
import shutil
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[1]


class ReferencedAssets(HTMLParser):
    def __init__(self):
        super().__init__()
        self.references = []

    def handle_starttag(self, tag, attrs):
        values = dict(attrs)
        if tag in ('script', 'img', 'source', 'video', 'audio') and values.get('src'):
            self.references.append(values['src'])
        if tag == 'video' and values.get('poster'):
            self.references.append(values['poster'])
        if tag == 'link' and values.get('href'):
            self.references.append(values['href'])


def validate_assets(source):
    for entry in source.rglob('*'):
        if entry.is_symlink():
            raise ValueError('Static release assets must be ordinary files, not symbolic links')
        if entry.is_file() and any(part.startswith('.') for part in entry.relative_to(source).parts):
            raise ValueError('Hidden files do not belong in the local website release')
    for path in source.rglob('*.html'):
        parser = ReferencedAssets(); parser.feed(path.read_text(encoding='utf-8'))
        for reference in parser.references:
            url = urlsplit(reference)
            if url.scheme == 'data':
                continue
            if url.scheme or url.netloc:
                raise ValueError(f'Vendor external runtime asset for offline hosting: {reference}')
            target = (source/unquote(url.path).lstrip('/')) if url.path.startswith('/') else path.parent/unquote(url.path)
            target = target.resolve()
            if not target.is_relative_to(source.resolve()) or not target.is_file():
                raise ValueError(f'Missing or unsupported website asset: {reference}')


def checked_asset(source, url, expected):
    parsed = urlsplit(url)
    if parsed.scheme or parsed.netloc:
        raise ValueError('Scientific release assets must be available locally')
    path = (source/unquote(parsed.path).lstrip('/')).resolve()
    if not path.is_relative_to(source.resolve()) or not path.is_file() or sha256(path) != expected:
        raise ValueError('Scientific release asset identity failed: '+url)
    return path


def validate_scientific_assets(source):
    catalog = json.loads((source/'data/catalog.json').read_text(encoding='utf-8'))
    bundle_path = checked_asset(source, catalog['bundle_url'], catalog['bundle_sha256'])
    bundle = json.loads(bundle_path.read_text(encoding='utf-8'))
    checked_asset(source, bundle['prepared_fits_url'], bundle['manifest']['prepared_files'][0]['sha256'])
    for part in catalog.get('review_packet', {}).get('parts', []):
        path = checked_asset(source, part['url'], part['sha256'])
        if path.stat().st_size != part['size_bytes']:
            raise ValueError('Scientific evidence packet part size mismatch')


def sha256(path):
    h = hashlib.sha256()
    with path.open('rb') as stream:
        for block in iter(lambda: stream.read(1_048_576), b''):
            h.update(block)
    return h.hexdigest()


def build_release(root, name, app_version='0.3.0'):
    if not re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9._-]{0,100}', name) or name.endswith('.'):
        raise ValueError('Use a plain release name containing letters, numbers, dots, hyphens or underscores')
    source = root/'web/dist'
    if not (source/'index.html').is_file() or not (source/'data/catalog.json').is_file():
        raise ValueError('Website index.html and real-data catalog.json must exist before building')
    validate_assets(source)
    validate_scientific_assets(source)
    output = root/'output/local-production'/name
    output.mkdir(parents=True, exist_ok=False)
    # Snapshot only static application files and the dependency-free local host.
    shutil.copytree(source, output/'web/dist')
    (output/'tools').mkdir()
    for relative in ('tools/local_server.py', 'start_skyshift.bat', 'stop_skyshift.bat'):
        shutil.copyfile(root/relative, output/relative)
    assets = {p.relative_to(output/'web/dist').as_posix(): sha256(p) for p in sorted((output/'web/dist').rglob('*')) if p.is_file()}
    metadata = {'schema_version': '1.0', 'release_id': name, 'app_version': app_version,
        'created_at_utc': datetime.now(timezone.utc).isoformat(), 'scientific_approval': 'PENDING',
        'hosting': 'localhost only; no publication performed', 'source_asset_sha256': assets}
    (output/'web/dist/release.json').write_text(json.dumps(metadata, indent=2), encoding='utf-8')
    compressed = 0
    for path in list((output/'web/dist').rglob('*')):
        if path.is_file() and path.suffix.lower() in ('.html', '.css', '.js', '.json', '.svg', '.txt') and path.stat().st_size >= 512:
            data = path.read_bytes()
            zipped = gzip.compress(data, compresslevel=9, mtime=0)
            if len(zipped) < len(data):
                path.with_name(path.name+'.gz').write_bytes(zipped)
                compressed += 1
    (output/'START_HERE.txt').write_text(
        'SKYSHIFT local release\n\nDouble-click start_skyshift.bat to open http://localhost:3000.\n'
        'Keep the server window open. Press Ctrl+C or use stop_skyshift.bat to stop.\n'
        'Python 3.11 or newer is required. No dependency installation or network access is needed to start.\n'
        'The public 0.2 website is preserved independently.\n'
        'Scientific approval remains PENDING. Notes are user hypotheses, not discoveries.\n'
        'The website is a local read-only scientific viewer. Downloaded evidence remains separate from local startup.\n', encoding='utf-8')
    hashes = {p.relative_to(output).as_posix(): sha256(p) for p in sorted(output.rglob('*')) if p.is_file()}
    (output/'SHA256SUMS.json').write_text(json.dumps(hashes, indent=2), encoding='utf-8')
    return {'release_id': name, 'directory': str(output), 'app_version': app_version,
            'files': len(hashes)+1, 'precompressed_text_assets': compressed,
            'scientific_approval': 'PENDING', 'published': False}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--name', default='skyshift-0.3-'+datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ'))
    parser.add_argument('--app-version', default='0.3.0')
    args = parser.parse_args()
    print(json.dumps(build_release(ROOT, args.name, args.app_version), indent=2))


if __name__ == '__main__':
    main()
