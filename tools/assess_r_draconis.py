"""Reconstruct the pinned R Draconis target assessment from authenticated inputs.

--catalogue/--query may point to a fresh recorded Gaia response. Without them,
use the reviewed pinned snapshot. Only missing official FITS inputs are fetched.
The output directory must be new; no historic case/report is overwritten.
"""
import argparse
import csv
import hashlib
import json
from pathlib import Path
import sys

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'src'))
from skyshift.archive import download,sha256_file,utc_now
from skyshift.models import SkyRegion
from skyshift.products import read_product
from skyshift.target_assessment import assess_target


def run(output,catalogue,query):
    output=Path(output);output.mkdir(parents=True,exist_ok=False)
    query_path=Path(query);catalogue=Path(catalogue)
    record=json.loads(query_path.read_text(encoding='utf-8'));raw=catalogue.read_bytes()
    if hashlib.sha256(raw).hexdigest()!=record['sha256'] or not record['url'].startswith('https://irsa.ipac.caltech.edu/TAP/sync?'):
        raise ValueError('Target catalogue checksum/source differs')
    matches=[r for r in csv.DictReader(raw.decode('utf-8-sig').splitlines()) if r['source_id']=='1648328016354496384']
    if len(matches)!=1:raise ValueError('Unique SIMBAD-cross-identified Gaia target is missing')
    spec=json.loads((ROOT/'config/temporal_example.json').read_text(encoding='utf-8'))
    sequence=ROOT/'web/dist'/spec['prepared_url']
    if sha256_file(sequence)!=spec['prepared_sha256']:raise ValueError('Frozen temporal example changed')
    bundle=json.loads(sequence.read_text(encoding='utf-8'));region=SkyRegion.model_validate(bundle['request']['region'])
    calibration=ROOT/'data/calibration'/Path(spec['calibration']['path']).name
    acquired=download(spec['calibration']['source_url'],calibration,max_bytes=spec['calibration']['size_bytes'])
    if acquired.sha256!=spec['calibration']['sha256']:raise ValueError('Wavelength calibration differs')
    epsf_url='https://nasa-irsa-spherex.s3.us-east-1.amazonaws.com/qr3/epsf/cal-epsf-v1-2026-191/2/epsf_D2_spx_cal-epsf-v1-2026-191.fits'
    epsf=ROOT/'data/calibration/epsf_D2_spx_cal-epsf-v1-2026-191.fits'
    acquired=download(epsf_url,epsf,max_bytes=7943040)
    if acquired.sha256!='7b94af0250aa7e56a9e78af34ca2c1373985926c0a0f3263218d1b0ddc94a926':raise ValueError('ePSF calibration differs')
    products=[]
    for record in spec['sources']:
        path=ROOT/'data/cache/cutouts'/Path(record['path']).name
        acquired=download(record['source_url'],path,max_bytes=record['size_bytes'])
        if acquired.sha256!=record['sha256']:raise ValueError('Original target cutout differs')
        products.append(read_product(path,region,calibration=calibration))
    report=assess_target(products,bundle,matches[0],epsf)
    for epoch in report['epochs']:
        epoch['psf']['calibration']['path']=Path(epoch['psf']['calibration']['path']).name
    report.update(created_at_utc=utc_now().isoformat(),catalogue={'query':json.loads(query_path.read_text(encoding='utf-8')),
        'selected_row':matches[0],'identity_reference':'https://simbad.u-strasbg.fr/simbad/sim-id?Ident=R+Dra',
        'identity_reference_access':'SIMBAD production-page indexed text confirmed R Dra / Gaia DR3 identifier; direct TAP access failed and that failure is preserved.'},
        citations=bundle['citations'],
        methodology_sources=['https://caltech-ipac.github.io/spherex-archive-documentation/spherex-data-products/',
                             'https://irsa.ipac.caltech.edu/data/SPHEREx/docs/SPHEREx_Expsupp_QR.pdf'])
    (output/'assessment.json').open('x',encoding='utf-8').write(json.dumps(report,indent=2,allow_nan=False)+'\n')
    (output/'catalogue.csv').open('xb').write(raw)
    print(json.dumps({'outcome':report['outcome'],'target_comparison':report['target_comparison'],'physical_change':report['physical_change'],
        'centres':[{'id':x['observation_id'],'flags':x['centre']['flags'],'usable':x['centre']['usable']} for x in report['epochs']],
        'reference_summary':report['reference_summary'],'output':str(output)}))
    return report


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output',type=Path,required=True)
    config_path=ROOT/'config/r_draconis_assessment.json'
    defaults=json.loads(config_path.read_text(encoding='utf-8')) if config_path.exists() else {}
    parser.add_argument('--catalogue',type=Path,default=ROOT/defaults['catalogue'] if defaults else None)
    parser.add_argument('--query',type=Path,default=ROOT/defaults['query'] if defaults else None)
    args=parser.parse_args();run(args.output,args.catalogue,args.query)
