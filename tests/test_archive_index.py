import json
from pathlib import Path
from urllib.parse import parse_qs,urlsplit
import pytest
from skyshift.models import SkyRegion
from skyshift.archive_index import discover,ObservationIndex,normalize_row

REGION=SkyRegion(ra_deg=210.802,dec_deg=54.349,size_deg=.04)
COLLECTIONS=['spherex_qr2','spherex_qr2_deep','spherex_qr3','spherex_qr3_deep']
def row(collection='spherex_qr2',version='20'):
 release=collection.split('_')[1]
 return {'obs_id':'2026W20_2A_0464_3','obs_collection':collection,'access_url':f'https://irsa.ipac.caltech.edu/ibe/data/spherex/{release}/level2/period/l2b-v{version}-date/2/file.fits','energy_bandpassname':'SPHEREx-D2','t_min':'61000','s_ra':'210.802','s_dec':'54.349','s_region':'POLYGON ICRS 210 54 211 54 211 55 210 55','em_min':'1.1e-6','em_max':'1.6e-6'}
def xml(rows,status='OK'):
 import xml.etree.ElementTree as ET
 ns='http://www.ivoa.net/xml/VOTable/v1.3';root=ET.Element('{'+ns+'}VOTABLE');resource=ET.SubElement(root,'{'+ns+'}RESOURCE');ET.SubElement(resource,'{'+ns+'}INFO',name='QUERY_STATUS',value=status);table=ET.SubElement(resource,'{'+ns+'}TABLE')
 fields=list(rows[0]) if rows else list(row())
 for k in fields:ET.SubElement(table,'{'+ns+'}FIELD',name=k)
 data=ET.SubElement(ET.SubElement(table,'{'+ns+'}DATA'),'{'+ns+'}TABLEDATA')
 for item in rows:
  tr=ET.SubElement(data,'{'+ns+'}TR')
  for k in fields:ET.SubElement(tr,'{'+ns+'}TD').text=item.get(k)
 return ET.tostring(root)

def test_all_supported_collections_are_indexed_without_downloading_images_and_reused(tmp_path):
 calls=[]
 def fetch(url,**kwargs):
  calls.append(url);collection=parse_qs(urlsplit(url).query)['COLLECTION'][0];return xml([row(collection)])
 rows,report=discover(REGION,COLLECTIONS,tmp_path/'first',index_path=tmp_path/'index.sqlite3',fetcher=fetch)
 assert len(rows)==4 and report['status']=='complete' and len(calls)==4
 assert all('/SIA?' in x for x in calls)
 assert all(r['pipeline_version'] is None and r['calibration_associations']=={} for r in report['observations'])
 assert {r['collection'] for r in report['observations']}==set(COLLECTIONS)
 _,cached=discover(REGION,COLLECTIONS,tmp_path/'cached',index_path=tmp_path/'index.sqlite3',fetcher=lambda *a,**k:pytest.fail('Cache should avoid network'))
 assert cached['network_requests']==0 and cached['metadata_rows']==4

def test_refresh_retains_older_reprocessing_and_ingests_only_new_or_changed_products(tmp_path):
 db=ObservationIndex(tmp_path/'index.sqlite3')
 try:
  _,first=db.ingest([row()],COLLECTIONS[0]);_,again=db.ingest([row()],COLLECTIONS[0]);_,new=db.ingest([row(version='27')],COLLECTIONS[0])
  assert first['added']==1 and again['unchanged']==1 and new['added']==1
  assert db.db.execute('SELECT count(*) FROM observations').fetchone()[0]==2
 finally:db.close()

def test_overflow_is_partitioned_and_budget_exhaustion_never_claims_absence(tmp_path):
 calls=[]
 def fetch(url,**kwargs):
  calls.append(url);return xml([],status='OVERFLOW') if len(calls)==1 else xml([row()])
 _,result=discover(REGION,[COLLECTIONS[0]],tmp_path/'split',index_path=tmp_path/'index.sqlite3',fetcher=fetch,max_requests=3)
 assert result['status']=='complete' and result['network_requests']==3 and result['metadata_rows']==1
 _,partial=discover(REGION,[COLLECTIONS[0]],tmp_path/'partial',index_path=tmp_path/'p.sqlite3',fetcher=lambda *a,**k:xml([],status='OVERFLOW'),max_requests=1)
 assert partial['status']=='partial_or_unavailable' and partial['collections'][0]['remaining_time_partitions']==2
 _,again=discover(REGION,[COLLECTIONS[0]],tmp_path/'retry',index_path=tmp_path/'p.sqlite3',fetcher=lambda *a,**k:xml([]))
 assert again['network_requests']==1 and again['status']=='complete'

def test_unknown_collections_and_mismatched_source_identity_fail_closed(tmp_path):
 for bad in ['spherex_qr4','qr3','spherex_qr1']:
  with pytest.raises(ValueError):normalize_row(row(),bad)
 with pytest.raises(ValueError):normalize_row(row('spherex_qr3'),'spherex_qr2')
 _,result=discover(REGION,[COLLECTIONS[0]],tmp_path/'html',index_path=tmp_path/'h.sqlite3',fetcher=lambda *a,**k:b'<html>outage</html>')
 assert result['status']=='partial_or_unavailable'


def test_partial_network_reads_consume_the_shared_transfer_budget(tmp_path):
 calls=[]
 def fetch(url,**kwargs):
  calls.append(kwargs['max_bytes'])
  raise TimeoutError('Partial transfer could not be measured')
 _,report=discover(REGION,COLLECTIONS,tmp_path/'failed',index_path=tmp_path/'index.sqlite3',fetcher=fetch)
 assert len(calls)==2 and report['network_requests']==2
 assert report['network_bytes']==0 and report['transfer_budget_used_bytes']==16_000_000
 assert report['unmeasured_failed_transfer_upper_bound_bytes']==16_000_000
 assert report['status']=='partial_or_unavailable'
