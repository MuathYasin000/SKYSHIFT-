"""Region-scoped, versioned metadata index. Never a mission mirror or science gate."""
from collections import deque
from datetime import datetime,timezone,timedelta
import hashlib
import json
import math
from pathlib import Path
import re
import sqlite3
from urllib.parse import urlencode,urlsplit
import xml.etree.ElementTree as ET

from astropy.time import Time
from .archive import sia_query,fetch_bytes,parse_sia,utc_now,NS,SIA_ENDPOINT
from .messages import public_error_message

INDEX_VERSION='spherex-metadata-index-v1'
ROOT=Path(__file__).resolve().parents[2]


class ObservationIndex:
    def __init__(self,path=None):
        self.path=Path(path or ROOT/'data/cache/metadata/archive-index-v1.sqlite3')
        self.path.parent.mkdir(parents=True,exist_ok=True)
        if self.path.exists() and self.path.stat().st_size>128*1024*1024:
            raise ValueError('Metadata index reached its 128 MiB limit; existing records are preserved')
        self.db=sqlite3.connect(self.path,timeout=15)
        self.db.execute('PRAGMA busy_timeout=15000')
        self.db.execute('PRAGMA max_page_count=32768')
        self.db.executescript('''CREATE TABLE IF NOT EXISTS observations (
          key TEXT PRIMARY KEY, collection TEXT NOT NULL, observation_id TEXT NOT NULL,
          access_url TEXT NOT NULL, ra REAL, dec REAL, start_mjd REAL, detector INTEGER,
          raw_json TEXT NOT NULL, first_seen TEXT NOT NULL, last_seen TEXT NOT NULL);
          CREATE INDEX IF NOT EXISTS obs_collection_time ON observations(collection,start_mjd);
          CREATE INDEX IF NOT EXISTS obs_position ON observations(ra,dec);
          CREATE TABLE IF NOT EXISTS queries(key TEXT PRIMARY KEY, scope_json TEXT NOT NULL,
            checked_at TEXT NOT NULL, complete INTEGER NOT NULL, keys_json TEXT NOT NULL);
        ''')

    def close(self):self.db.close()

    def snapshot(self,key,ttl_seconds=300):
        row=self.db.execute('SELECT checked_at,complete,keys_json FROM queries WHERE key=?',(key,)).fetchone()
        if not row or not row[1] or not 0<=(utc_now()-datetime.fromisoformat(row[0])).total_seconds()<ttl_seconds:return None
        records=[]
        for identity in json.loads(row[2]):
            item=self.db.execute('SELECT raw_json FROM observations WHERE key=?',(identity,)).fetchone()
            if item:records.append(json.loads(item[0]))
            else:return None
        return records,row[0]

    def ingest(self,rows,collection):
        added=changed=0;keys=[]
        count=self.db.execute('SELECT count(*) FROM observations').fetchone()[0]
        now=utc_now().isoformat()
        for row in rows:
            record=normalize_row(row,collection)
            key=hashlib.sha256((collection+'\0'+record['observation_id']+'\0'+record['access_url']).encode()).hexdigest()
            raw=json.dumps(row,sort_keys=True,separators=(',',':'),allow_nan=False)
            previous=self.db.execute('SELECT raw_json FROM observations WHERE key=?',(key,)).fetchone()
            if not previous and count+added>=200000:raise ValueError('Metadata index reached its 200,000-record limit')
            added+=previous is None;changed+=previous is not None and previous[0]!=raw
            self.db.execute('''INSERT INTO observations VALUES (?,?,?,?,?,?,?,?,?,?,?)
             ON CONFLICT(key) DO UPDATE SET raw_json=excluded.raw_json,last_seen=excluded.last_seen''',
             (key,collection,record['observation_id'],record['access_url'],record['ra_deg'],record['dec_deg'],record['start_mjd'],record['detector'],raw,now,now))
            keys.append(key)
        self.db.commit()
        return keys,{'added':int(added),'changed':int(changed),'unchanged':len(rows)-int(added)-int(changed)}


def normalize_row(row,collection):
    if collection not in {'spherex_qr2','spherex_qr2_deep','spherex_qr3','spherex_qr3_deep'}:raise ValueError('Unsupported indexed collection')
    release=collection.split('_')[1]
    url=urlsplit(row.get('access_url') or '')
    if url.scheme!='https' or url.hostname!='irsa.ipac.caltech.edu' or url.username or url.password or url.port or url.query or not url.path.startswith(f'/ibe/data/spherex/{release}/level2/'):
        raise ValueError('Metadata source URL differs from the approved collection')
    if row.get('obs_collection') not in (None,collection):raise ValueError('Metadata collection identity differs')
    match=re.fullmatch(r'SPHEREx-D([1-6])',row.get('energy_bandpassname') or '')
    if not row.get('obs_id') or not match:raise ValueError('Metadata observation/detector identity is missing')
    def number(key):
        value=row.get(key)
        if value is None or value=='':return None
        result=float(value)
        if not math.isfinite(result):raise ValueError('Nonfinite archive metadata')
        return result
    ra,dec,start=number('s_ra'),number('s_dec'),number('t_min')
    if ra is not None and not 0<=ra<360 or dec is not None and not -90<=dec<=90:raise ValueError('Invalid archive sky coordinate')
    return {'observation_id':row['obs_id'],'collection':collection,'release':release,'detector':int(match[1]),
            'ra_deg':ra,'dec_deg':dec,'footprint':row.get('s_region'),'start_mjd':start,'end_mjd':number('t_max'),
            'time_start_utc':Time(start,format='mjd',scale='utc').isot+'Z' if start is not None else None,
            'wavelength_min_m':number('em_min'),'wavelength_max_m':number('em_max'),
            'pipeline_version':row.get('pipeline_version'),
            'processing_product_version':next((p for p in url.path.split('/') if p.startswith('l2b-')),None),
            'calibration_associations':{k:v for k,v in row.items() if 'calib' in k and k!='calib_level' and v is not None},
            'quality_metadata':{k:v for k,v in row.items() if any(x in k.lower() for x in ['flag','quality','contam']) and v is not None},
            'access_url':row['access_url'],'cloud_access':row.get('cloud_access'),
            'interpretation':'Archive metadata candidate only; local calibration, pixel quality and temporal compatibility are not established.'}


def discover(region,collections,output,*,detector=None,start_date=None,end_date=None,use_cache=True,index_path=None,cancel=None,progress=lambda _:None,max_requests=8,fetcher=fetch_bytes):
    """At most eight bounded SIA requests, splitting overflowing time windows.

    Refresh re-queries the requested scope and upserts only new/changed records;
    old processing revisions are retained. TIME is observation time, not ingest
    time: no latest-observation watermark can hide newly reprocessed older data.
    """
    if not 1<=len(collections)<=4 or len(set(collections))!=len(collections) or not 1<=max_requests<=8:raise ValueError('Discovery request exceeds bounded collections/request count')
    output=Path(output);output.mkdir(parents=True,exist_ok=False)
    index=ObservationIndex(index_path);rows_out=[];normalized_out=[];receipts=[];queries=0;transferred=0
    try:
        for collection in collections:
            if collection not in {'spherex_qr2','spherex_qr2_deep','spherex_qr3','spherex_qr3_deep'}:raise ValueError('Unsupported indexed collection')
            scope={'version':INDEX_VERSION,'region':region.model_dump(mode='json'),'collection':collection,'detector':detector,'start_date':start_date,'end_date':end_date}
            query_key=hashlib.sha256(json.dumps(scope,sort_keys=True).encode()).hexdigest()
            cached=index.snapshot(query_key) if use_cache else None
            if cached:
                rows,checked=cached;rows_out.extend(rows);normalized_out.extend(normalize_row(r,collection) for r in rows);receipts.append({'collection':collection,'status':'complete','origin':'metadata_index','checked_at_utc':checked,'rows':len(rows),'network_bytes':0});continue
            start=float(Time(start_date or '2025-03-11',scale='utc').mjd)
            end=float(Time(end_date,scale='utc').mjd+1) if end_date else float(Time((utc_now()+timedelta(days=1)).date().isoformat(),scale='utc').mjd)
            pending=deque([(start,end)]);records={};parts=[];failed=False
            while pending and queries<max_requests and transferred<16_000_000:
                if cancel and cancel.is_set():raise ValueError('Archive metadata discovery cancelled')
                lo,hi=pending.popleft();release=collection.split('_')[1]
                params,_=sia_query(region,release,deep=collection.endswith('_deep'),detector=detector)
                params['TIME']=f'{lo:.8f} {hi:.8f}'
                url=SIA_ENDPOINT+'?'+urlencode(params);queries+=1
                progress(f'Discovering {collection}: bounded metadata request {queries}/{max_requests}')
                part={'collection':collection,'url':url,'time_mjd':[lo,hi]};parts.append(part)
                try:
                    raw=fetcher(url,max_bytes=min(8_000_000,16_000_000-transferred),timeout=25,attempts=2)
                    transferred+=len(raw);name=f'response-{queries:02d}.xml';(output/name).write_bytes(raw)
                    part.update(response_file=name,sha256=hashlib.sha256(raw).hexdigest(),bytes=len(raw),retrieved_at_utc=utc_now().isoformat())
                    tree=ET.fromstring(raw)
                    if tree.tag!='{http://www.ivoa.net/xml/VOTable/v1.3}VOTABLE':raise ValueError('Expected a supported VOTable archive response')
                    overflow=any(n.get('value')=='OVERFLOW' for n in tree.findall('.//v:INFO',NS) if n.get('name')=='QUERY_STATUS')
                    if overflow:
                        if hi-lo<1e-4:raise ValueError('Archive overflow persists at the minimum time partition')
                        mid=(lo+hi)/2;pending.extendleft([(mid,hi),(lo,mid)])
                        part['status']='overflow_partitioned';continue
                    rows=parse_sia(raw)
                    for row in rows:
                        normalize_row(row,collection)
                        records[(row['obs_id'],row['access_url'])]=row
                    part.update(status='complete',rows=len(rows))
                except (ValueError,OSError,ET.ParseError) as exc:
                    failed=True;part.update(status='unavailable',reason=public_error_message(exc));break
            rows=list(records.values());keys,changes=index.ingest(rows,collection)
            complete=not failed and not pending
            checked=utc_now().isoformat()
            index.db.execute('INSERT OR REPLACE INTO queries VALUES (?,?,?,?,?)',(query_key,json.dumps(scope,sort_keys=True),checked,int(complete),json.dumps(keys)));index.db.commit()
            receipts.append({'collection':collection,'status':'complete' if complete else 'partial_or_unavailable','origin':'live_SIA2','checked_at_utc':checked,'rows':len(rows),'incremental_changes':changes,'remaining_time_partitions':len(pending),'parts':parts})
            rows_out.extend(rows)
            normalized_out.extend(normalize_row(r,collection) for r in rows)
        report={'schema_version':'1.0','kind':'spherex_archive_discovery','frames':[],
                'status':'complete' if all(r['status']=='complete' for r in receipts) else 'partial_or_unavailable',
                'index_version':INDEX_VERSION,'request_scope':'Coordinate field across explicitly requested supported collections; not an all-sky mirror or mission-completeness claim',
                'detector_filter':detector,
                'collections':receipts,'observations':normalized_out,
                'metadata_rows':len(rows_out),'network_requests':queries,'network_bytes':transferred,'index_bytes':index.path.stat().st_size,
                'limits':{'requests':max_requests,'transfer_bytes':16000000,'index_records':200000,'index_bytes':128*1024*1024},
                'limitations':['SIA2 ingestion may lag browsable directories, the archive GUI and some TAP results; zero rows do not establish mission-wide absence.','Pipeline versions, calibration associations and pixel quality remain unknown where the metadata service does not supply them.','A complete requested query scope is not a complete all-sky archive index.'],
                'scientific_approval':'PENDING','interpretation':'Metadata only. No image acquisition, detection or temporal comparison is established.'}
        (output/'discovery.json').write_text(json.dumps(report,indent=2,allow_nan=False),encoding='utf-8')
        return rows_out,report
    finally:index.close()


def indexed_inventory(region,release,output,*,deep=False,detector=None,start_date=None,end_date=None,use_cache=True,cancel=None,progress=lambda _:None,**unused):
    rows,report=discover(region,[f'spherex_{release}'+('_deep' if deep else '')],output,detector=detector,start_date=start_date,end_date=end_date,use_cache=use_cache,cancel=cancel,progress=progress)
    if report['status']!='complete':raise ValueError('Archive metadata search is partial or unavailable; no complete coverage or absence is inferred. Inspect its preserved discovery receipt.')
    return rows
