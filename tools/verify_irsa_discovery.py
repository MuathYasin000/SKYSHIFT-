"""Bounded live discovery across four collections, plus actual QR3 reader check."""
from pathlib import Path
import json,sys
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'src'))
from skyshift.archive_index import discover
from skyshift.models import SkyRegion
from skyshift.archive import download
from skyshift.products import read_product,product_summary
from evidence_output import fresh_run,write_report

out=fresh_run('irsa-index-live')
region=SkyRegion(ra_deg=210.8022671,dec_deg=54.34895,size_deg=.04)
collections=['spherex_qr2','spherex_qr2_deep','spherex_qr3','spherex_qr3_deep']
_,report=discover(region,collections,out/'m101',use_cache=False,progress=lambda m:print(m,flush=True))
_,cached=discover(region,collections,out/'cached',progress=lambda m:print(m,flush=True))
reference=json.loads((ROOT/'config/qr3_reference.json').read_text())
path=ROOT/'data/cache/cutouts'/'qr3-reference.fits'
record=download(reference['source_url'],path,max_bytes=reference['size_bytes'])
if record.sha256!=reference['sha256']:raise ValueError('Official QR3 original changed')
p=read_product(path,SkyRegion.model_validate(reference['region']))
write_report(out,'qr3-inspection.json',json.dumps(product_summary(p),indent=2))
write_report(out,'summary.json',json.dumps({'scope':'One small M101 field across QR2/QR3 wide/deep; not mission-wide completeness','live':report,'cache':{'network_requests':cached['network_requests'],'metadata_rows':cached['metadata_rows']},'qr3':product_summary(p)},indent=2))
print(json.dumps({'output':str(out),'status':report['status'],'rows':report['metadata_rows'],'requests':report['network_requests'],'network_bytes':report['network_bytes'],'cache_requests':cached['network_requests'],'qr3_pipeline':p.observation.pipeline_version}))
