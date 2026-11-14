"""Region-scoped, versioned metadata index. Never a mission mirror or science gate."""
from collections import deque
from .releases import INDEXED_COLLECTIONS, collection_for
from datetime import datetime,timezone,timedelta
import hashlib
import json
import math
from pathlib import Path
import re
import sqlite3
from urllib.parse import urlencode,urlsplit,parse_qs
import xml.etree.ElementTree as ET

from astropy.time import Time
from .archive import sia_query,fetch_bytes,parse_sia,utc_now,NS,SIA_ENDPOINT
from .messages import public_error_message

INDEX_VERSION='spherex-metadata-index-v1'
ROOT=Path(__file__).resolve().parents[2]
TAP_ENDPOINT='https://irsa.ipac.caltech.edu/TAP/sync'


def tap_query(region,collection,lo,hi,detector=None):
    # Values come from the validated region, fixed collection registry and
    # numeric time partitions. Never accept caller-supplied ADQL/table names.
    if collection not in INDEXED_COLLECTIONS:raise ValueError('Unsupported indexed collection')
    if detector is not None and (type(detector) is not int or detector not in range(1,7)):raise ValueError('Unsupported detector')
    # IRSA's documented CAOM tables supply ObsCore-equivalent columns and the
    # authoritative artifact URI in one spatially indexed query. Joining the
    # entire ObsCore view to artifacts is prohibitively slow on this service.
    query=("SELECT TOP 5001 o.observationid AS obs_id,o.collection AS obs_collection,"
           "p.energy_bandpassname,p.time_bounds_lower AS t_min,p.time_bounds_upper AS t_max,"
           "p.poly AS s_region,COORD1(p.pt) AS s_ra,COORD2(p.pt) AS s_dec,"
           "p.energy_bounds_lower AS em_min,p.energy_bounds_upper AS em_max,"
           "p.provenance_version AS pipeline_version,p.quality_flag,p.obs_publisher_did,"
           "a.uri AS product_uri,a.contentchecksum AS archive_checksum FROM spherex.observation o "
           "JOIN spherex.plane p ON o.obsid=p.obsid "
           "JOIN spherex.artifact a ON p.planeid=a.planeid "
           f"WHERE o.collection='{collection}' AND a.producttype='science' AND a.releasetype='data' "
           f"AND p.time_bounds_upper>={lo:.8f} AND p.time_bounds_lower<={hi:.8f} "
           f"AND INTERSECTS(p.poly,CIRCLE('ICRS',{region.ra_deg},{region.dec_deg},{region.size_deg/math.sqrt(2)}))=1")
    if detector is not None:query+=f" AND p.energy_bandpassname='SPHEREx-D{detector}'"
    return TAP_ENDPOINT+'?'+urlencode({'REQUEST':'doQuery','LANG':'ADQL','FORMAT':'votable','MAXREC':5001,'QUERY':query})


def canonical_tap_row(row,collection):
    row=dict(row);uri=row.pop('product_uri',None)
    if not isinstance(uri,str) or not uri.startswith('ibe/data/spherex/') or any(c in uri for c in ['?', '#', '\\']):raise ValueError('Unsupported authoritative TAP product URI')
    row['datalink_url']=('https://irsa.ipac.caltech.edu/datalink/links/spherex?'+urlencode({'ID':row['obs_publisher_did']})) if row.get('obs_publisher_did') else row.get('access_url')
    row['access_url']='https://irsa.ipac.caltech.edu/'+uri
    normalize_row(row,collection)
    # normalize_row enforces the release's official /level2/ path.
    row['calib_level'] = 2
    return row


def datalink_url(row,collection):
    url=row.get('datalink_url');parsed=urlsplit(url or '')
    detector=(row.get('energy_bandpassname') or '').removeprefix('SPHEREx-')
    expected=f"ivo://irsa.ipac/{collection}?{row.get('obs_id')}/{detector}"
    if parsed.scheme!='https' or parsed.netloc!='irsa.ipac.caltech.edu' or parsed.path!='/datalink/links/spherex' or parsed.fragment or parse_qs(parsed.query)!= {'ID':[expected]}:
        raise ValueError('DataLink identity differs from the observation/collection/detector')
    return url


def calibration_links(raw,row,collection):
    links=parse_sia(raw);primary=[r for r in links if r.get('semantics')=='#this']
    if len(primary)!=1 or primary[0].get('error_message') or primary[0].get('access_url')!=row['access_url']:raise ValueError('DataLink primary source differs from TAP product identity')
    result=[];release=collection.split('_')[1]
    families={'spectral_wcs','dichroic','abs_gain_matrix','nonlinear_pars','average_psf','dark','nonfunc','readnoise_pars','gain_factors'}
    for link in links:
        if link.get('semantics')!='#calibration':continue
        parsed=urlsplit(link.get('access_url') or '')
        prefix=f'/ibe/data/spherex/{release}/'
        if link.get('error_message') or parsed.scheme!='https' or parsed.netloc!='irsa.ipac.caltech.edu' or parsed.query or parsed.fragment or not parsed.path.startswith(prefix) or parsed.path[len(prefix):].split('/')[0] not in families or '..' in parsed.path.split('/'):
            raise ValueError('Unsupported DataLink calibration source')
        result.append({k:link.get(k) for k in ['access_url','semantics','description','content_type','content_length']})
    return result


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
            previous=self.db.execute('SELECT raw_json FROM observations WHERE key=?',(key,)).fetchone()
            if previous:
                # A SIA refresh must not erase a previously verified DataLink
                # association or TAP processing version for the SAME URL.
                row={**json.loads(previous[0]),**{k:v for k,v in row.items() if v is not None}}
            raw=json.dumps(row,sort_keys=True,separators=(',',':'),allow_nan=False)
            if not previous and count+added>=200000:raise ValueError('Metadata index reached its 200,000-record limit')
            added+=previous is None;changed+=previous is not None and previous[0]!=raw
            self.db.execute('''INSERT INTO observations VALUES (?,?,?,?,?,?,?,?,?,?,?)
             ON CONFLICT(key) DO UPDATE SET raw_json=excluded.raw_json,last_seen=excluded.last_seen,
             ra=excluded.ra,dec=excluded.dec,start_mjd=excluded.start_mjd,detector=excluded.detector''',
             (key,collection,record['observation_id'],record['access_url'],record['ra_deg'],record['dec_deg'],record['start_mjd'],record['detector'],raw,now,now))
            keys.append(key)
        self.db.commit()
        return keys,{'added':int(added),'changed':int(changed),'unchanged':len(rows)-int(added)-int(changed)}


def normalize_row(row,collection):
    if collection not in INDEXED_COLLECTIONS:raise ValueError('Unsupported indexed collection')
    release=collection.split('_')[1]
    url=urlsplit(row.get('access_url') or '')
    if url.scheme!='https' or url.hostname!='irsa.ipac.caltech.edu' or url.username or url.password or url.port or url.query or url.fragment or '..' in url.path.split('/') or not url.path.startswith(f'/ibe/data/spherex/{release}/level2/'):
        raise ValueError('Metadata source URL differs from the approved collection')
    if row.get('obs_collection') not in (None,collection):raise ValueError('Metadata collection identity differs')
    match=re.fullmatch(r'SPHEREx-D([1-6])',row.get('energy_bandpassname') or '')
    if not row.get('obs_id') or not match:raise ValueError('Metadata observation/detector identity is missing')
    if row.get('datalink_url'):datalink_url(row,collection)
    def number(key):
        value=row.get(key)
        if value is None or value=='':return None
        result=float(value)
        if not math.isfinite(result):raise ValueError('Nonfinite archive metadata')
        return result
    ra,dec,start=number('s_ra'),number('s_dec'),number('t_min')
    if ra is not None and not 0<=ra<360 or dec is not None and not -90<=dec<=90:raise ValueError('Invalid archive sky coordinate')
    return {'observation_id':row['obs_id'],'collection':collection,'release':release,'detector':int(match[1]),
            'ra_deg':ra,'dec_deg':dec,'footprint':row.get('s_region'),
            'footprint_format':'EWKB hexadecimal (ICRS/SRID 4326)' if re.fullmatch('[0-9a-fA-F]+',row.get('s_region') or '') else 'STC-S',
            'start_mjd':start,'end_mjd':number('t_max'),
            'time_start_utc':Time(start,format='mjd',scale='utc').isot+'Z' if start is not None else None,
            'wavelength_min_m':number('em_min'),'wavelength_max_m':number('em_max'),
            'pipeline_version':row.get('pipeline_version'),
            'processing_product_version':next((p for p in url.path.split('/') if p.startswith('l2b-')),None),
            'calibration_associations':{k:v for k,v in row.items() if 'calib' in k and k!='calib_level' and v is not None},
            'quality_metadata':{k:v for k,v in row.items() if any(x in k.lower() for x in ['flag','quality','contam']) and v is not None},
            'access_url':row['access_url'],'datalink_url':row.get('datalink_url'),'archive_checksum':row.get('archive_checksum'),'cloud_access':row.get('cloud_access'),
            'interpretation':'Archive metadata candidate only; local calibration, pixel quality and temporal compatibility are not established.'}


def discover(region,collections,output,*,detector=None,start_date=None,end_date=None,use_cache=True,index_path=None,cancel=None,progress=lambda _:None,max_requests=8,fetcher=fetch_bytes,provider='sia2'):
    """At most eight bounded metadata requests, splitting overflowing windows.

    Refresh re-queries the requested scope and upserts only new/changed records;
    old processing revisions are retained. TIME is observation time, not ingest
    time: no latest-observation watermark can hide newly reprocessed older data.
    """
    if provider not in {'sia2','tap'}:raise ValueError('Unsupported metadata provider')
    if not 1<=len(collections)<=4 or len(set(collections))!=len(collections) or not 1<=max_requests<=8:raise ValueError('Discovery request exceeds bounded collections/request count')
    output=Path(output);output.mkdir(parents=True,exist_ok=False)
    index=ObservationIndex(index_path);rows_out=[];normalized_out=[];receipts=[];queries=0;transferred=0;budget_used=0;failed_transfer_bound=0
    def transfer(url,response_limit):
        nonlocal transferred,budget_used,failed_transfer_bound
        # fetch_bytes may consume up to max_bytes+1 before rejecting a body.
        # Failed/partial reads cannot be measured exactly by that API, so reserve
        # their entire upper bound rather than allowing another full allowance.
        cap=min(response_limit,16_000_000-budget_used)-1
        if cap<1:raise ValueError('Archive metadata transfer budget exhausted')
        try:raw=fetcher(url,max_bytes=cap,timeout=25,attempts=1)
        except (OSError,ValueError):
            budget_used+=cap+1;failed_transfer_bound+=cap+1;raise
        budget_used+=len(raw);transferred+=len(raw)
        if len(raw)>cap:raise ValueError('Metadata fetcher exceeded its response bound')
        return raw
    try:
        for collection in collections:
            if collection not in INDEXED_COLLECTIONS:raise ValueError('Unsupported indexed collection')
            scope={'version':INDEX_VERSION,'provider':provider,'region':region.model_dump(mode='json'),'collection':collection,'detector':detector,'start_date':start_date,'end_date':end_date}
            query_key=hashlib.sha256(json.dumps(scope,sort_keys=True).encode()).hexdigest()
            cached=index.snapshot(query_key) if use_cache else None
            if cached:
                rows,checked=cached;rows_out.extend(rows);normalized_out.extend(normalize_row(r,collection) for r in rows);receipts.append({'collection':collection,'status':'complete','origin':'metadata_index','checked_at_utc':checked,'rows':len(rows),'network_bytes':0});continue
            start=float(Time(start_date or '2025-03-11',scale='utc').mjd)
            end=float(Time(end_date,scale='utc').mjd+1) if end_date else float(Time((utc_now()+timedelta(days=1)).date().isoformat(),scale='utc').mjd)
            pending=deque([(start,end)]);records={};parts=[];failed=False
            while pending and queries<max_requests and budget_used<15_999_999:
                if cancel and cancel.is_set():raise ValueError('Archive metadata discovery cancelled')
                lo,hi=pending.popleft();release=collection.split('_')[1]
                params,_=sia_query(region,release,deep=collection.endswith('_deep'),detector=detector)
                params['TIME']=f'{lo:.8f} {hi:.8f}'
                url=tap_query(region,collection,lo,hi,detector) if provider=='tap' else SIA_ENDPOINT+'?'+urlencode(params);queries+=1
                progress(f'Discovering {collection}: bounded metadata request {queries}/{max_requests}')
                part={'collection':collection,'url':url,'time_mjd':[lo,hi]};parts.append(part)
                try:
                    raw=transfer(url,8_000_000)
                    name=f'response-{queries:02d}.xml';(output/name).write_bytes(raw)
                    part.update(response_file=name,sha256=hashlib.sha256(raw).hexdigest(),bytes=len(raw),retrieved_at_utc=utc_now().isoformat())
                    tree=ET.fromstring(raw)
                    if tree.tag!='{http://www.ivoa.net/xml/VOTable/v1.3}VOTABLE':raise ValueError('Expected a supported VOTable archive response')
                    overflow=any(n.get('value')=='OVERFLOW' for n in tree.findall('.//v:INFO',NS) if n.get('name')=='QUERY_STATUS')
                    rows=[] if overflow else parse_sia(raw)
                    if overflow or len(rows)>=(5001 if provider=='tap' else 5000):
                        if hi-lo<1e-4:raise ValueError('Archive overflow persists at the minimum time partition')
                        mid=(lo+hi)/2;pending.extendleft([(mid,hi),(lo,mid)])
                        part['status']='overflow_partitioned';continue
                    for row in rows:
                        if provider=='tap':row=canonical_tap_row(row,collection)
                        normalize_row(row,collection)
                        records[(row['obs_id'],row['access_url'])]=row
                    part.update(status='complete',rows=len(rows))
                except (ValueError,OSError,ET.ParseError) as exc:
                    failed=True;part.update(status='unavailable',reason=public_error_message(exc));break
            rows=list(records.values())
            # One representative association lookup per nonempty collection,
            # sharing the SAME total request/byte budget. Never fetch its FITS.
            if provider=='tap' and rows and queries<max_requests and budget_used<15_999_999:
                sample=rows[0];queries+=1;part={'collection':collection,'kind':'DataLink','url':datalink_url(sample,collection)};parts.append(part)
                try:
                    if cancel and cancel.is_set():raise ValueError('Archive metadata discovery cancelled')
                    raw=transfer(part['url'],1_000_000)
                    name=f'response-{queries:02d}.xml';(output/name).write_bytes(raw)
                    part.update(response_file=name,bytes=len(raw),sha256=hashlib.sha256(raw).hexdigest(),retrieved_at_utc=utc_now().isoformat())
                    sample['calibration_links']=calibration_links(raw,sample,collection)
                    sample['calibration_link_receipt']={k:part[k] for k in ['url','sha256','retrieved_at_utc']}
                    part.update(status='complete',calibration_links=len(sample['calibration_links']))
                except (ValueError,OSError,ET.ParseError) as exc:
                    part.update(status='unavailable',reason=public_error_message(exc))
            keys,changes=index.ingest(rows,collection)
            complete=not failed and not pending
            checked=utc_now().isoformat()
            index.db.execute('INSERT OR REPLACE INTO queries VALUES (?,?,?,?,?)',(query_key,json.dumps(scope,sort_keys=True),checked,int(complete),json.dumps(keys)));index.db.commit()
            receipts.append({'collection':collection,'status':'complete' if complete else 'partial_or_unavailable','origin':'live_TAP_CAOM_ObsCore_columns' if provider=='tap' else 'live_SIA2','checked_at_utc':checked,'rows':len(rows),'incremental_changes':changes,'remaining_time_partitions':len(pending),'parts':parts})
            rows_out.extend(rows)
            normalized_out.extend(normalize_row(r,collection) for r in rows)
        report={'schema_version':'1.0','kind':'spherex_archive_discovery','frames':[],
                'status':'complete' if all(r['status']=='complete' for r in receipts) else 'partial_or_unavailable',
                'index_version':INDEX_VERSION,'metadata_provider':provider,'request_scope':'Coordinate field across explicitly requested supported collections; not an all-sky mirror or mission-completeness claim',
                'detector_filter':detector,
                'collections':receipts,'observations':normalized_out,
                'metadata_rows':len(rows_out),'network_requests':queries,'network_bytes':transferred,'index_bytes':index.path.stat().st_size,
                'transfer_budget_used_bytes':budget_used,'unmeasured_failed_transfer_upper_bound_bytes':failed_transfer_bound,
                'limits':{'requests':max_requests,'transfer_bytes':16000000,'index_records':200000,'index_bytes':128*1024*1024},
                'limitations':['SIA2 ingestion may lag browsable directories, the archive GUI and some TAP results; zero rows do not establish mission-wide absence.','TAP samples at most one authoritative DataLink association list per nonempty collection within the shared request budget; unqueried or failed associations remain unknown.','Pipeline versions, calibration associations and pixel quality remain unknown where the metadata service does not supply them.','A complete requested query scope is not a complete all-sky archive index.'],
                'scientific_approval':'PENDING','interpretation':'Metadata only. No image acquisition, detection or temporal comparison is established.'}
        (output/'discovery.json').write_text(json.dumps(report,indent=2,allow_nan=False),encoding='utf-8')
        return rows_out,report
    finally:index.close()


def indexed_inventory(region,release,output,*,deep=False,detector=None,start_date=None,end_date=None,use_cache=True,cancel=None,progress=lambda _:None,provider='sia2',**unused):
    rows,report=discover(region,[collection_for(release, deep)],output,detector=detector,start_date=start_date,end_date=end_date,use_cache=use_cache,cancel=cancel,progress=progress,provider=provider)
    if report['status']!='complete':raise ValueError('Archive metadata search is partial or unavailable; no complete coverage or absence is inferred. Inspect its preserved discovery receipt.')
    return rows
