"""Bounded read-only receipts for the authoritative resources used by SKYSHIFT."""
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime,timezone
import hashlib
import json
from urllib.request import Request,urlopen
from urllib.error import HTTPError
from evidence_output import fresh_run,write_report

SOURCES=[
 ('challenge','https://www.spaceappschallenge.org/2026/challenges/planet-x-and-spherex/','HTML; challenge/resources may be temporarily unavailable'),
 ('event','https://www.spaceappschallenge.org/2026/','HTML; final event and submission rules need organizer confirmation'),
 ('terms','https://www.spaceappschallenge.org/legal/','HTML; no organizer exception is inferred'),
 ('mission','https://irsa.ipac.caltech.edu/Missions/spherex.html','HTML; mission entry and attributions'),
 ('products','https://caltech-ipac.github.io/spherex-archive-documentation/spherex-data-products/','HTML; release/HDU/calibration conventions'),
 ('access','https://caltech-ipac.github.io/spherex-archive-documentation/spherex-data-access/','HTML; SIA2 and authoritative access URLs'),
 ('cutouts','https://irsa.ipac.caltech.edu/ibe/cutouts.html','HTML; bounded FITS cutout API'),
 ('mosaic','https://irsa.ipac.caltech.edu/onlinehelp/spherex/spherex/mosaic.html','HTML; multi-epoch mosaics cannot substitute for temporal frames'),
 ('spectrophotometry','https://irsa.ipac.caltech.edu/onlinehelp/spherex/spherex/sp.html','HTML; exploratory pixel values are not fitted source spectra'),
 ('most','https://irsa.ipac.caltech.edu/applications/MOST/instructions.html','HTML; known-object search context, not a detection'),
 ('horizons','https://ssd.jpl.nasa.gov/horizons/manual.html','HTML; observer-specific predictions, not measured source positions'),
 ('gaia','https://gea.esac.esa.int/archive/','HTML; catalogue reference context'),
 ('aladin','https://aladin.cds.unistra.fr/AladinLite/doc/','HTML; optional sky context, not a temporal substitute'),
 ('normalization','https://docs.astropy.org/en/stable/visualization/normalization.html','HTML; display transformations preserve source arrays'),
 ('mosaic_tutorial','https://caltech-ipac.github.io/irsa-tutorials/spherex-mosaic/','HTML; published 102-plane M101 cube; no Mosaic Tool API'),
 ('gallery','https://spherex.caltech.edu/images','HTML; public images require source-specific credits'),
 ('cloud','https://registry.opendata.aws/spherex-qr/','HTML; public cloud products, not an authorization for bulk mirroring'),
 ('nasa_media','https://www.nasa.gov/nasa-brand-center/images-and-media/','HTML; educational use with credit and no implied endorsement; respect third-party rights'),
 ('image_policy','https://spherex.caltech.edu/page/image-use-policy','HTML; image credits, third-party exceptions and protected logos'),
 ('irsa_terms','https://irsa.ipac.caltech.edu/data_use_terms.html','HTML; public data terms and attribution; other datasets can have separate terms'),
]


def inspect(source):
    name,url,scope=source
    record={'name':name,'url':url,'expected_response':scope,'accessed_at_utc':datetime.now(timezone.utc).isoformat()}
    try:
        with urlopen(Request(url,headers={'User-Agent':'SKYSHIFT/0.11 scientific resource audit'}),timeout=20) as response:
            raw=response.read(2_000_001)
            record.update(status=response.status,final_url=response.url,content_type=response.headers.get('Content-Type'),bytes=len(raw),sha256=hashlib.sha256(raw).hexdigest(),truncated=len(raw)>2_000_000)
    except Exception as exc:record.update(status=getattr(exc,'code',None),error=str(exc))
    return record


if __name__=='__main__':
    out=fresh_run('master-official-resources')
    with ThreadPoolExecutor(max_workers=4) as pool:records=list(pool.map(inspect,SOURCES))
    write_report(out,'resources.json',json.dumps({'scope':'Read-only endpoint reachability and identity; not automatic interpretation or approval of final rules','resources':records},indent=2))
    print(json.dumps({'output':str(out),'resources':[{'name':r['name'],'status':r.get('status'),'error':r.get('error')} for r in records]}))
