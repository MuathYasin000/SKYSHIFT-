"""Read-only project audit plus an isolated synthetic queue-bound probe.

Writes receipts alongside this file. Does not query the archive, alter application
code, or create astronomical products. File timestamps are not proof of authorship.
Run from repository root with its existing Python environment.
"""
from pathlib import Path
from datetime import datetime, timezone
import hashlib
import json
import subprocess
import sys
import threading
import urllib.request

ROOT = Path(__file__).resolve().parents[3]
OUT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT / 'src'))

def git(*args):
    return subprocess.check_output(['git', *args], cwd=ROOT, text=True).strip()

def write(name, value):
    (OUT / name).write_text(json.dumps(value, indent=2, ensure_ascii=False), encoding='utf-8')

skip = {'.git', '.venv', 'node_modules', '__pycache__', '.pytest_cache', '.skyshift-local'}
files = []
for folder in ['src', 'web', 'tools', 'tests', 'config', 'docs', 'schemas', 'scripts', 'plan', 'output']:
    for p in (ROOT / folder).rglob('*'):
        rel = p.relative_to(ROOT)
        if not p.is_file() or any(part in skip for part in rel.parts) or OUT in p.parents:
            continue
        s = p.stat()
        item = {'path':rel.as_posix(), 'bytes':s.st_size,
                'mtime_utc':datetime.fromtimestamp(s.st_mtime, timezone.utc).isoformat()}
        # Hash small implementation/configuration artifacts, not duplicate large media.
        if s.st_size < 2_000_000 and folder != 'output':
            item['sha256'] = hashlib.sha256(p.read_bytes()).hexdigest()
        files.append(item)
commits = [json.loads(row) for row in subprocess.check_output(
    ['git','log','--reverse','--format={"commit":"%H","authored":"%aI","committed":"%cI","subject":"%s"}'],
    cwd=ROOT, text=True).splitlines()]
write('preexisting-work.json', {
    'recorded_at_utc':datetime.now(timezone.utc).isoformat(),
    'scope':'Existing implementation and output artifacts; runtime dependencies, cache and large scientific inputs excluded. Not a complete disk image.',
    'limitations':'Local Git dates and file mtimes are recorded observations, not independently authenticated authorship or competition eligibility evidence.',
    'head':git('rev-parse','HEAD'), 'branch':git('branch','--show-current'),
    'tags':git('tag','--list').splitlines(), 'commits':commits,
    'status':git('status','--porcelain=v1','--untracked-files=all').splitlines(),
    'files':files,
    'root_files':[{'path':p.name,'bytes':p.stat().st_size,
                   'mtime_utc':datetime.fromtimestamp(p.stat().st_mtime,timezone.utc).isoformat(),
                   'sha256':hashlib.sha256(p.read_bytes()).hexdigest()}
                  for p in ROOT.iterdir() if p.is_file() and p.stat().st_size<2_000_000]})

links=[]
for base in ['http://localhost:3000','https://skyshiftt.netlify.app']:
    for path in ['/','/healthz','/api/capabilities','/release.json']:
        row={'url':base+path}
        try:
            with urllib.request.urlopen(base+path, timeout=20) as response:
                body=response.read(2_000_000)
                row.update(status=response.status, bytes_read=len(body), sha256=hashlib.sha256(body).hexdigest())
                if 'json' in response.headers.get('Content-Type',''):
                    row['json']=json.loads(body)
        except Exception as e:
            row['error']=str(e)
        links.append(row)
write('delivery-check.json',links)

# This is an in-memory scheduler experiment, NOT a public endpoint load test.
from skyshift.jobs import JobStore
from skyshift.sequence import Cancelled
started, release = threading.Event(), threading.Event()
def blocked_builder(request, output, **kwargs):
    started.set()
    release.wait(10)
    raise Cancelled('Synthetic audit fixture; no archive or science data accessed')
fixture=OUT/'queue-fixture'
store=JobStore(fixture, builder=blocked_builder)
payload={'schema_version':'1.0','kind':'skyshift-observation-request','release':'qr2',
         'region':{'ra_deg':10.,'dec_deg':10.,'size_deg':.04,'frame':'icrs'},'use_cache':False}
try:
    first=store.create(payload)
    assert started.wait(5)
    for _ in range(12):
        job=store.create(payload)
        store.cancel(job['id'])
    queue_probe={'fixture':'Synthetic blocked builder, one running job; twelve queued create/cancel cycles',
                 'advertised_active_limit':2, 'queued_executor_items':store.executor._work_queue.qsize(),
                 'reported_active_jobs':sum(j['state'] in ('queued','running') for j in store.jobs.values()),
                 'retained_jobs':len(store.jobs), 'archive_requests':0,
                 'finding':'Cancellation frees admission slots before executor work is removed; queue bound is bypassable.'}
finally:
    release.set()
    store.executor.shutdown(wait=True)
write('queue-probe.json',queue_probe)
print(json.dumps({'files':len(files),'commits':len(commits),'links':len(links),'queue_probe':queue_probe}))
