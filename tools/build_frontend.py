"""Build the challenge-focused frontend from the authoritative web/src tree."""
from pathlib import Path
import hashlib
import json


ROOT = Path(__file__).resolve().parents[1]


def content_identity(directory):
    digest = hashlib.sha256()
    for path in sorted(directory.rglob('*')):
        if path.is_file() and path.suffix in {'.html', '.js', '.css', '.json'}:
            digest.update(path.relative_to(directory).as_posix().encode())
            digest.update(path.read_bytes())
    return digest.hexdigest()


def build():
    source, dist = ROOT/'web/src', ROOT/'web/dist'
    changed = []
    for path in sorted(source.rglob('*')):
        if not path.is_file() or path.suffix not in {'.js', '.css', '.html'}:
            continue
        target = dist/path.relative_to(source)
        data = path.read_bytes()
        if not target.exists() or target.read_bytes() != data:
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(data)
            changed.append(target.relative_to(dist).as_posix())
    for source_path, relative in (
        (ROOT/'config/challenge_targets.json', Path('challenge-targets.json')),
        (ROOT/'config/web_release.json', Path('release.json')),
    ):
        if not source_path.is_file():
            continue
        target = dist/relative
        data = source_path.read_bytes()
        if not target.exists() or target.read_bytes() != data:
            target.write_bytes(data)
            changed.append(relative.as_posix())
    required = ['index.html', 'core-app.js', 'core.css', 'science.js', 'viewport-input.js', 'challenge-targets.json']
    missing = [name for name in required if not (dist/name).is_file()]
    if missing:
        raise ValueError('Missing challenge frontend files: '+', '.join(missing))
    print(json.dumps({'changed': changed, 'content_id': content_identity(dist)}))


if __name__ == '__main__':
    build()
