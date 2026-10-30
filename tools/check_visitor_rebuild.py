try:
    from evidence_output import fresh_run
except ModuleNotFoundError:
    from tools.evidence_output import fresh_run
"""Confirm HTML regeneration preserves bytes and directly maintained JS is unchanged."""
from pathlib import Path
import hashlib
import json
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
FILES = ['explore.html', 'compare.html', 'site.js', 'app.js']


def run():
    before = {name: hashlib.sha256((ROOT/'web/dist'/name).read_bytes()).hexdigest() for name in FILES}
    for tool in ['build_visitor_pages.py']:
        subprocess.run([sys.executable, str(ROOT/'tools'/tool)], cwd=ROOT, check=True)
    after = {name: hashlib.sha256((ROOT/'web/dist'/name).read_bytes()).hexdigest() for name in FILES}
    assert before == after, 'Regeneration changed checked-in outputs; inspect before release'
    result = {'status': 'pass', 'checked_files': after, 'html_regenerated': ['explore.html','compare.html'], 'controllers_maintained_directly': True, 'science_rebuilt': False}
    (fresh_run('visitor-rebuild')/'visitor_rebuild_current.json').write_text(json.dumps(result, indent=2), encoding='utf-8')
    print(json.dumps(result, indent=2))


if __name__ == '__main__':
    run()
