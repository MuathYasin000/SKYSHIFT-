"""Validate two predeclared comet pairs; preserve rejections, never fit the comet.

Bounded acquisition: four official cutouts, existing pinned D2 calibration,
and at most one Gaia metadata response per field. Existing originals are reused
only after checksum verification. No catalogue or scientific thresholds change.
"""
from pathlib import Path
import argparse
import json
import sys

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'src'))
from skyshift.archive import download, cutout_url, sha256_file, utc_now
from skyshift.models import SkyRegion
from skyshift.products import read_product, product_summary
from skyshift.suitability import screen_pair
from skyshift.registration import measure_registration
from skyshift.sequence import reference_catalogue, CALIBRATION


def investigate(ident, output_root):
    source=ROOT/'docs/evidence/phase0-paths-20261029'
    links=json.loads((source/'resolved-product-links.json').read_text())
    centre=next(x for x in json.loads((source/'geometry-crosscheck.json').read_text())['fields'] if x['candidate']==ident)
    region=SkyRegion(ra_deg=centre['12_arcmin_box_centre_ra_deg'],dec_deg=centre['12_arcmin_box_centre_dec_deg'],size_deg=.2)
    context=region.model_copy(update={'size_deg':.3})
    output=output_root/ident
    if (output/'outcome.json').exists():
        raise FileExistsError('This investigation already has an outcome; select a new --output directory to preserve it.')
    output.mkdir(parents=True,exist_ok=True)
    calibration=ROOT/'data/calibration/spectral_wcs_D2_spx_cal-wcs-v4-2025-254.fits'
    if not calibration.exists():
        download(CALIBRATION[('qr2',2)]['url'],calibration,max_bytes=40_000_000)
    assert sha256_file(calibration)=='40c49a5acbf7047b7cebf3d46471cb99639867996f48a22d0e283f7e529249d7'
    calibration_url=json.loads(calibration.with_suffix('.fits.source.json').read_text())['source_url']
    products=[]
    receipt={'candidate':ident,'recorded_at_utc':utc_now().isoformat(),'region':region.model_dump(),
             'scientific_approval':'PENDING','detection':'NOT ESTABLISHED','code_sha256':sha256_file(Path(__file__))}
    try:
        for row in [r for r in links if r['candidate']==ident]:
            path=output/(row['obs_id']+'_D2.fits')
            print('Retrieving',ident,row['epoch'],flush=True)
            download(cutout_url(row['science_url'],context),path,max_bytes=20_000_000)
            product=read_product(path,region,calibration=calibration,calibration_url=calibration_url)
            if product.observation.observation_id!=row['obs_id']:
                raise ValueError('Actual observation ID differs from declared candidate')
            products.append(product)
            (output/(row['epoch']+'-inspection.json')).write_text(json.dumps(product_summary(product),indent=2))
        report,_=screen_pair(*products,region)
        (output/'screen.json').write_text(json.dumps(report,indent=2))
        receipt['screen_status']=report['suitability']['status']
        receipt['failed_checks']=[c for c in report['suitability']['checks'] if c['status']=='fail']
        if (output/'gaia.csv').exists() and (output/'gaia-query.json').exists():
            import csv,io
            raw=(output/'gaia.csv').read_bytes()
            if sha256_file(output/'gaia.csv')!=json.loads((output/'gaia-query.json').read_text())['sha256']:
                raise ValueError('Saved reference catalogue checksum mismatch')
            references=list(csv.DictReader(io.StringIO(raw.decode('utf-8-sig'))))
        else:
            references,_=reference_catalogue(context,output,None)
        registration=measure_registration(*products,references,context)
        (output/'registration.json').write_text(json.dumps(registration,indent=2))
        receipt['registration']={k:v for k,v in registration.items() if k!='references'}
        receipt['playback_eligible']=report['suitability']['status']!='rejected' and registration['status']=='pass'
        receipt['outcome']='engineering_eligible_only' if receipt['playback_eligible'] else 'rejected_for_temporal_comparison'
    except (OSError,ValueError,KeyError) as exc:
        receipt.update(outcome='acquisition_or_validation_failed',error=str(exc),playback_eligible=False)
    (output/'outcome.json').write_text(json.dumps(receipt,indent=2))
    print(json.dumps(receipt),flush=True)
    return receipt


if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--candidate',choices=['DEC-D2','AUG-D2','both'],default='both')
    p.add_argument('--output',type=Path,default=ROOT/'research/validation/comet-20261030')
    args=p.parse_args()
    for ident in (['DEC-D2','AUG-D2'] if args.candidate=='both' else [args.candidate]):
        investigate(ident,args.output)
