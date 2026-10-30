"""Fresh verifier output directories; never reuse a historical directory."""
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4
import os
import re


def fresh_run(label, explicit=None):
    parent=Path(__file__).resolve().parents[1]/'docs/evidence'
    parent.mkdir(parents=True,exist_ok=True)
    name=re.sub(r'[^a-zA-Z0-9_-]','-',label)
    stamp=datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S.%fZ')
    directory=Path(explicit or os.environ.get('SKYSHIFT_EVIDENCE_OUTPUT') or parent/f'{name}-{stamp}-{uuid4().hex[:8]}').resolve()
    directory.mkdir(exist_ok=False)
    print('SKYSHIFT_EVIDENCE_DIR='+str(directory))
    return directory


def write_report(directory, name, text):
    path=Path(directory)/Path(name).name
    with path.open('x',encoding='utf-8',newline='\n') as stream:
        stream.write(text)
    return path
