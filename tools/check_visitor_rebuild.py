"""Confirm that checked-in visitor HTML/controllers regenerate without byte changes."""
from pathlib import Path
import hashlib
import json
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
FILES = ['explore.html', 'compare.html', 'site.js', 'app.js']


def run():
    before = {name: hashlib.sha256((ROOT/'web/dist'/name).read_bytes()).hexdigest() for name in FILES}
    for tool in ['build_visitor_pages.py', 'upgrade_visitor_controllers.py']:
        subprocess.run([sys.executable, str(ROOT/'tools'/tool)], cwd=ROOT, check=True)
    after = {name: hashlib.sha256((ROOT/'web/dist'/name).read_bytes()).hexdigest() for name in FILES}
    assert before == after, 'Regeneration changed checked-in outputs; inspect before release'
    result = {'status': 'pass', 'regenerated_files': after, 'science_rebuilt': False}
    (ROOT/'docs/evidence/visitor_rebuild_0.4.json').write_text(json.dumps(result, indent=2), encoding='utf-8')
    print(json.dumps(result, indent=2))


if __name__ == '__main__':
    run()
