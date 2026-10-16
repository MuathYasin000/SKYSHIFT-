"""Bounded new crop experiment using existing real originals and unchanged policy.

A screen result never enables a browser pair or implies reference registration.
"""
from pathlib import Path
from itertools import combinations
import json
import sys
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'src'))
from skyshift.products import read_product
from skyshift.models import SkyRegion
from skyshift.suitability import screen_pair

def run():
    output=ROOT/'research/expansion-0.4';output.mkdir(parents=True,exist_ok=False)
    cal=ROOT/'data/calibration/spectral_wcs_D2_spx_cal-wcs-v4-2025-254.fits'
    result={'scope':'Existing real archive sample, smaller crop; no threshold change','scientific_approval':'PENDING','registration_performed':False,'new_pairs_enabled':False,'fields':[]}
    for name,ra,dec in [('m67_outskirts',132.925,11.8),('ngc188',11.9,85.25)]:
        region=SkyRegion(ra_deg=ra,dec_deg=dec,size_deg=.04);products=[];failures=[]
        for path in sorted((ROOT/'data/raw'/name).glob('*.fits')):
            try:products.append(read_product(path,region,calibration=cal))
            except (ValueError,OSError,KeyError) as e:failures.append({'file':path.name,'error':str(e)})
        reports=[]
        for a,b in combinations(products,2):
            report,_=screen_pair(a,b,region);reports.append(report)
        (output/(name+'.json')).write_text(json.dumps(reports,indent=2),encoding='utf-8')
        candidates=[r for r in reports if r['suitability']['status']=='pending']
        result['fields'].append({'field':name,'readable_products':len(products),'input_failures':failures,'pairs_screened':len(reports),'engineering_candidates':len(candidates),'candidates':candidates,'limitations':['No independent reference-source registration or qualified science approval for any new candidate.','The 0.12-degree prior rejections remain valid at that region size.','No new comparison was added to the application.']})
        print(name,len(reports),'screens;',len(candidates),'candidates, no registration/approval',flush=True)
    (ROOT/'docs/evidence/expansion_0.4.json').write_text(json.dumps(result,indent=2),encoding='utf-8')
if __name__=='__main__':run()
