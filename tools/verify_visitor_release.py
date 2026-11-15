try:
    from evidence_output import fresh_run, write_report
except ModuleNotFoundError:
    from tools.evidence_output import fresh_run, write_report
"""Read-only integrity checks for the 0.4 visitor release against the 0.3 snapshot."""
from pathlib import Path
from datetime import datetime, timezone
import hashlib
import json
import subprocess
import sys
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]


def sha(path):
    h = hashlib.sha256()
    with path.open('rb') as stream:
        for block in iter(lambda: stream.read(1048576), b''):
            h.update(block)
    return h.hexdigest()


def run():
    current = ROOT/'output/local-production/skyshift-0.4-visitor-verified'
    previous = ROOT/'output/local-production/skyshift-0.3-local-verified'
    inventory = json.loads((current/'SHA256SUMS.json').read_text(encoding='utf-8'))
    actual = {p.relative_to(current).as_posix() for p in current.rglob('*') if p.is_file()}
    assert actual == set(inventory)|{'SHA256SUMS.json'}, 'Unexpected production files'
    for name, expected in inventory.items():
        assert sha(current/name) == expected, 'Production identity failed: '+name
    preserved = {}
    for folder in ('data', 'assets'):
        original = previous/'web/dist'/folder
        files = [p for p in original.rglob('*') if p.is_file() and p.suffix != '.gz']
        old_names = {p.relative_to(original).as_posix() for p in files}
        new_names = {p.relative_to(ROOT/'web/dist'/folder).as_posix() for p in (ROOT/'web/dist'/folder).rglob('*') if p.is_file()}
        assert old_names == new_names, 'Scientific/imagery file set changed: '+folder
        for path in files:
            relative = path.relative_to(previous/'web/dist')
            assert sha(path) == sha(ROOT/'web/dist'/relative) == sha(current/'web/dist'/relative), str(relative)
            preserved[relative.as_posix()] = sha(path)
    for name, expected in json.loads((current/'web/dist/release.json').read_text())['source_asset_sha256'].items():
        assert sha(ROOT/'web/dist'/name) == expected, 'Workspace differs from production: '+name
    # The recorded baseline was the completed 0.3 handoff, not a synthetic fixture.
    changed = subprocess.check_output(['git', 'diff', '--name-only', 'cf6de76', '--', 'src/skyshift'], cwd=ROOT, text=True)
    assert not changed.strip(), 'Scientific processing source changed'
    tests = {}
    for suite in ('python', 'javascript'):
        tree = ET.parse(ROOT/f'docs/evidence/{suite}_0.4.xml')
        cases = list(tree.iter('testcase'))
        errors = len(list(tree.iter('failure')))+len(list(tree.iter('error')))
        skipped = len(list(tree.iter('skipped')))
        assert errors == 0 and skipped == 0
        tests[suite] = {'passed': len(cases), 'failed': errors, 'skipped': skipped}
    for suffix in ('', '-production'):
        result = json.loads((ROOT/f'output/browser-0.4{suffix}/verification.json').read_text(encoding='utf-8'))
        assert len(result['results']) == 22 and all(r['status'] == 'pass' for r in result['results'])
        assert not result['errors'] and not result['external']
        assert all(not a['violations'] for a in result['accessibility'])
        tests['browser'+suffix] = {'passed': 22, 'failed': 0, 'version': result['browser_version'],
                                  'manual_accessibility_findings_retained': True}
    result = {'checked_at_utc': datetime.now(timezone.utc).isoformat(),
              'production_files_verified': len(inventory), 'preserved_science_and_imagery': preserved,
              'scientific_source_unchanged_since': 'cf6de76', 'scientific_approval': 'PENDING',
              'independent_novice_validation': 'NOT CONDUCTED', 'tests': tests,
              'all_hashes_match': True, 'no_publication': True}
    write_report(fresh_run('verify-visitor-release'),'release_0.4_integrity.json',json.dumps(result, indent=2))
    print(json.dumps({'all_hashes_match': True, 'production_files_verified': len(inventory),
                      'preserved_science_and_imagery_files': len(preserved), 'tests': tests}, indent=2))


if __name__ == '__main__':
    run()
