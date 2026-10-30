import json,time
import pytest
from skyshift.jobs import JobStore

@pytest.mark.parametrize('status',['complete','partial_or_unavailable'])
def test_metadata_jobs_only_reuse_complete_discovery_scopes(tmp_path,status):
 def builder(request,output,progress,cancel):
  output.mkdir();value={'kind':'spherex_archive_discovery','frames':[],'status':status};(output/'sequence.json').write_text(json.dumps(value));return value
 store=JobStore(tmp_path/'jobs',builder)
 payload={'schema_version':'1.0','kind':'skyshift-observation-request','release':'qr2','region':{'ra_deg':210.,'dec_deg':54.,'size_deg':.04},'discovery_only':True}
 try:
  first=store.create(payload)
  for _ in range(100):
   if store.status(first['id'])['state']=='complete':break
   time.sleep(.01)
  second=store.create(payload)
  assert (second['id']==first['id'])==(status=='complete')
 finally:store.close()
