"""Prepare a self-contained, explicitly pending scientific review release."""
from pathlib import Path
import json,csv,argparse
from skyshift.models import SkyRegion
from skyshift.products import read_product
from skyshift.registration import measure_registration
from skyshift.response import response_report
from skyshift.preparation import prepare_review_bundle
from skyshift.evidence import export_packet

ROOT=Path(__file__).resolve().parents[1]


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--name',required=True,help='New immutable release directory name')
    args=parser.parse_args()
    if '/' in args.name or '\\' in args.name or args.name in ('.','..'):parser.error('Use a plain release name')
    region=SkyRegion(ra_deg=210.80227,dec_deg=54.34895,size_deg=.04)
    context=region.model_copy(update={'size_deg':.3})
    cal=ROOT/'data/calibration/spectral_wcs_D2_spx_cal-wcs-v4-2025-254.fits'
    epsf=ROOT/'data/calibration/epsf_D2_spx_cal-epsf-v1-2026-191.fits'
    products=[read_product(ROOT/f'data/raw/m101_context/{name}_D2.fits',region,calibration=cal) for name in ['2025W49_2A_0756_3','2025W50_1A_0736_3']]
    with (ROOT/'research/validation/m101_context_gaia_dr3.csv').open() as f:catalogue=list(csv.DictReader(f))
    registration=measure_registration(*products,catalogue,context)
    response=response_report(*products,registration,epsf,region)
    output=ROOT/'data/prepared'/args.name
    manifest=prepare_review_bundle(*products,region,output,registration,response,{
        'gaia_dr3.csv':ROOT/'research/validation/m101_context_gaia_dr3.csv',
        'gaia_query.json':ROOT/'research/validation/m101_context_gaia_query.json',
        'epsf_calibration.fits':epsf,
        'original_failed_registration.json':ROOT/'docs/evidence/m101_registration_v1.json',
        'm67_screening.json':ROOT/'data/screening/m67_012_v1/pair_shortlist.json',
        'ngc188_screening.json':ROOT/'data/screening/ngc188_012_v1/pair_shortlist.json',
        'official_data_products.html':ROOT/'research/validation/official_data_products.html',
        'official_source_record.json':ROOT/'research/validation/official_source_record.json',
        'superseded_registration_v1.json':ROOT/'docs/evidence/m101_registration_context_v1.json',
        'registration_scope_audit.md':ROOT/'docs/registration_scope_audit.md',
        'registration_plot.png':ROOT/'docs/evidence/registration_v2.png',
        'prepared_pair_plot.png':ROOT/'docs/evidence/prepared_pair_v2.png'})
    archive=ROOT/'data/exports'/(args.name+'.zip')
    print(json.dumps({'pair_id':manifest.pair_id,'status':manifest.suitability.status,'registration':registration['status'],'export':export_packet(output,archive)},indent=2))


if __name__=='__main__':main()
