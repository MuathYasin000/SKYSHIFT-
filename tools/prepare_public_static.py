"""Stage only the verified static application for a conventional public host.

No host credentials or hosting IDs are written into the independent application.
Run in the project root with --destination tmp/skyshift-upload/dist.
"""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
import shutil
from datetime import datetime, timezone

from build_local_release import validate_assets, validate_scientific_assets
from local_server import CONTENT_SECURITY_POLICY, content_identity

ROOT = Path(__file__).resolve().parents[1]


def stage(destination: Path, release_id='skyshift-0.7-home-layout'):
    source = (ROOT / 'web/dist').resolve()
    destination = destination.resolve()
    if destination.name != 'dist' or not destination.is_relative_to(ROOT / 'tmp'):
        raise ValueError('Public staging must be a named dist directory under this workspace tmp folder')
    validate_assets(source)
    validate_scientific_assets(source)
    destination.mkdir(parents=True, exist_ok=True)
    sources = {p.relative_to(source): p for p in source.rglob('*') if p.is_file()}
    # Remove obsolete files only in the checked, explicitly named staging tree.
    for p in destination.rglob('*'):
        if p.is_symlink():
            raise ValueError('Symlinks are not allowed in the public staging tree')
        if p.is_file() and p.relative_to(destination) not in sources:
            if not p.resolve().is_relative_to(destination):
                raise ValueError('Staging path escaped its verified directory')
            p.unlink()
    hashes = {}
    for relative, p in sources.items():
        target = destination / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        digest = hashlib.sha256(p.read_bytes()).hexdigest()
        if not target.exists() or hashlib.sha256(target.read_bytes()).hexdigest() != digest:
            shutil.copyfile(p, target)
        hashes[relative.as_posix()] = digest
    release = dict(schema_version='1.0', release_id=release_id,
                   app_version='0.7-home-layout', created_at_utc=datetime.now(timezone.utc).isoformat(),
                   scientific_approval='PENDING', content_id=content_identity(source),
                   source_asset_sha256=hashes)
    (destination/'release.json').write_text(json.dumps(release, indent=2)+'\n', encoding='utf-8')
    # Static equivalents for the optional runtime-info UI; never a shutdown route.
    health = dict(status='ok', server_version='public-static', app_version=release['app_version'],
                  content_id=release['content_id'], release_id=release['release_id'])
    (destination/'healthz').write_text(json.dumps(health)+'\n', encoding='utf-8')
    (destination/'version.json').write_text(json.dumps(health)+'\n', encoding='utf-8')
    (destination/'_headers').write_text(
        '/*\n  Content-Security-Policy: '+CONTENT_SECURITY_POLICY+'\n'
        '  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n'
        '  Permissions-Policy: camera=(), microphone=(), geolocation=()\n'
        '  Cache-Control: no-cache\n/healthz\n  Content-Type: application/json; charset=utf-8\n',
        encoding='utf-8')
    validate_assets(destination)
    validate_scientific_assets(destination)
    return dict(directory=str(destination), source_files=len(hashes), scientific_approval='PENDING',
                content_id=release['content_id'], credentials_included=False)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--destination', type=Path, required=True)
    parser.add_argument('--release-id', default='skyshift-0.7-home-layout')
    args = parser.parse_args()
    print(json.dumps(stage(args.destination, args.release_id), indent=2))
