"""Package this release's application, source and selected evidence without changing inputs."""
import argparse
from datetime import datetime, timezone
from hashlib import sha256
import json
from pathlib import Path
import subprocess
from zipfile import ZIP_DEFLATED, ZipFile, ZipInfo


ROOT = Path(__file__).resolve().parents[1]
PROJECT_FILES = (
    'src', 'web', 'config', 'schemas', 'tests', 'tools', 'scripts', 'deploy',
    '.dockerignore', '.gitattributes', '.gitignore', 'Dockerfile', 'LICENSE',
    'NOTICE', 'CHANGELOG.md', 'README.md', 'pyproject.toml', 'requirements-lock.txt',
    'start_skyshift.bat', 'stop_skyshift.bat', 'prepare_web_upload.bat',
)
SUPPORT_FILES = (
    'docs/submission_2026-11-14.md', 'docs/evidence/submission-2026-11-14',
    'docs/local_hosting.md', 'docs/public_service.md', 'docs/hosting_options.md',
    'docs/deployment.md', 'docs/methods.md', 'docs/reviewer_guide.md',
    'docs/reproducibility.md', 'docs/irsa_upgrade_20261030.md',
    'docs/completion_20261030.md', 'docs/registration_scope_audit.md',
    'docs/evidence/challenge-readiness-20261029/target-results.json',
    'docs/evidence/scientific-proof-20261030T072451.418003Z-b6564c1c/gaia-r-dra.csv',
    'docs/evidence/scientific-proof-20261030T072451.418003Z-b6564c1c/gaia-r-dra-query.json',
    'data/inventory', 'data/screening',
)


def git(*args):
    return subprocess.check_output(['git', *args], cwd=ROOT).decode('utf-8')


def write_submission(output):
    paths = sorted(set(git('ls-files', '-z', '--cached', '--others', '--exclude-standard',
                           '--', *PROJECT_FILES, *SUPPORT_FILES).split('\0')) - {''})
    tracked = set(git('ls-tree', '-rz', '--name-only', 'HEAD').split('\0'))
    modified = set(git('diff', 'HEAD', '--name-only', '-z').split('\0'))
    release = json.loads((ROOT/'web/dist/release.json').read_text(encoding='utf-8'))
    baseline = git('rev-parse', 'HEAD').strip()
    timestamp = datetime.now(timezone.utc).astimezone()
    manifest = {
        **release,
        'packaged_at': timestamp.isoformat(),
        'baseline_commit': baseline,
        'baseline_commit_date': git('show', '-s', '--format=%cI', baseline).strip(),
        'scope': 'Application and source snapshot with selected verification receipts. Archive entry times record assembly; original content and scientific provenance retain their own dates.',
        'files': {},
    }
    required = {'README.md', 'docs/submission_2026-11-14.md', 'web/dist/index.html',
                'web/dist/data/sequence-m101-dr1.json', 'web/dist/release.json'}
    if not required.issubset(paths):
        raise ValueError('Build the release and write the submission handoff before packaging.')
    output.parent.mkdir(parents=True, exist_ok=True)
    with output.open('xb') as stream:
        try:
            with ZipFile(stream, 'w', compression=ZIP_DEFLATED, compresslevel=3) as archive:
                def add(name, data):
                    entry = ZipInfo(name, timestamp.timetuple()[:6])
                    archive.writestr(entry, data, compress_type=ZIP_DEFLATED, compresslevel=3)

                for name in paths:
                    path = ROOT/name
                    if path.is_symlink() or not path.resolve().is_relative_to(ROOT):
                        raise ValueError(f'Cannot package path outside the checkout: {name}')
                    if not path.is_file():
                        continue
                    data = path.read_bytes()
                    origin = 'added_since_baseline' if name not in tracked else 'revised_since_baseline' if name in modified else 'unchanged_from_baseline'
                    manifest['files'][name] = {'sha256': sha256(data).hexdigest(), 'bytes': len(data), 'origin': origin}
                    add(name, data)
                add('SUBMISSION-MANIFEST.json', json.dumps(manifest, indent=2) + '\n')
            stream.flush()
        except BaseException:
            stream.close()
            output.unlink()
            raise
    return manifest


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('output', type=Path)
    args = parser.parse_args()
    manifest = write_submission(args.output.resolve())
    print(f"Packaged {len(manifest['files'])} SHA-256 identities in {args.output}")
