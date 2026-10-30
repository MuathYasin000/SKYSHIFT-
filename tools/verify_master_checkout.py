"""Record build and test results from an explicit clean worktree."""
import argparse
import json
import os
from pathlib import Path
import subprocess
import sys
from evidence_output import fresh_run,write_report

parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('checkout',type=Path)
parser.add_argument('--acquire-fixtures',action='store_true',help='Acquire only the seven pinned originals before numerical integration tests')
args=parser.parse_args()
checkout=args.checkout.resolve()
if not (checkout/'pyproject.toml').is_file():raise ValueError('Expected a complete SKYSHIFT checkout')
out=fresh_run('master-clean-checkout')
identity=subprocess.check_output(['git','rev-parse','HEAD'],cwd=checkout,text=True).strip()
before=subprocess.check_output(['git','status','--porcelain'],cwd=checkout,text=True)
if before:raise ValueError('Clean checkout must start without source modifications')
environment={**os.environ,'PYTHONPATH':str(checkout/'src')}
commands=[('dependency-check',[sys.executable,'-m','pip','check']),
          ('build',[sys.executable,'tools/build_frontend.py']),
          ('python-tests',[sys.executable,'-m','pytest','-q']),
          ('javascript-tests',['node','--test',*map(str,sorted((checkout/'web/tests').glob('*.test.mjs')))])]
if args.acquire_fixtures:commands.insert(2,('authenticated-fixtures',[sys.executable,'tools/bootstrap_test_inputs.py']))
results=[]
for name,command in commands:
    result=subprocess.run(command,cwd=checkout,env=environment,text=True,stdout=subprocess.PIPE,stderr=subprocess.STDOUT)
    write_report(out,name+'.txt',result.stdout)
    results.append({'name':name,'exit_code':result.returncode})
    print(name,result.returncode,flush=True)
    if result.returncode:print(result.stdout[-4000:],flush=True)
report={'source_head':identity,'clean_start':True,'checkout':str(checkout),'results':results,
        'environment':'Existing pinned Windows interpreter; the separate Linux Docker build installs requirements from scratch.',
        'status':'pass' if all(x['exit_code']==0 for x in results) else 'fail'}
write_report(out,'verification.json',json.dumps(report,indent=2))
print(json.dumps({'output':str(out),**report}))
if report['status']!='pass':raise SystemExit(1)
