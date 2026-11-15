try:
    from evidence_output import fresh_run
except ModuleNotFoundError:
    from tools.evidence_output import fresh_run
from pathlib import Path
import json,shutil,hashlib
from datetime import datetime,timezone
root=Path(__file__).resolve().parents[1];out=fresh_run('archive-release-evidence')
for source,target in [
 ('data/reconstruction/m101-v4-clean-environment/reconstruction_result.json','clean_v4_reconstruction.json'),
 ('data/reconstruction/m101-v4-clean-environment/independent_reproduction.json','clean_v4_independent_reproduction.json'),
 ('data/reconstruction/production-v4-comparison/reconstruction_result.json','production_v4_annotation_reconstruction.json')]:
 shutil.copyfile(root/source,out/target)
qa={'recorded_at_utc':datetime.now(timezone.utc).isoformat(),'type':'agent-operated engineering QA; no human usability study',
 'release_pair_id':'pair-52ad675d929b0740c23b','production_url':'https://skyshift-project-mercury.surebream11.chatgpt.site',
 'verified':['Production real data and exact pair identity load','Persistent pending-science labels','Shared side-by-side and A/B control','Coordinate note add/edit/delete/locate exercised',
 'Compact production export/reopen restores a QA note','Corrupted manifest rejected with checksum mismatch; prior note retained','Production full packet download matches original SHA-256',
 'Clean-environment native preparation and Gaia registration summaries reproduce','Production annotation reconstructs inside common support','Tab-local session isolation: desktop one note, narrow tab zero',
 'No horizontal overflow at desktop 1265x720 or narrow 314x655','Console warning/error logs empty during inspected workflow'],
 'limits':['No five-person novice sessions','No cross-browser or physical-device certification','No controlled browser cold-cache/paint benchmark','No real browser offline-network interception test',
 'No human internal sign-off','No qualified scientific approval'],
 'screenshots':{p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in (root/'output/screenshots').glob('skyshift-production-*.png')}}
(out/'browser_qa_v4.json').write_text(json.dumps(qa,indent=2),encoding='utf-8')
print('Archived clean-environment, production annotation, and browser QA records')
