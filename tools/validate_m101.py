from pathlib import Path
import csv,json
from skyshift.models import SkyRegion
from skyshift.products import read_product
from skyshift.registration import measure_registration

ROOT=Path(__file__).resolve().parents[1]
region=SkyRegion(ra_deg=210.80227,dec_deg=54.34895,size_deg=.12)
cal=ROOT/'data/calibration/spectral_wcs_D2_spx_cal-wcs-v4-2025-254.fits'
products=[read_product(ROOT/f'data/raw/m101_probe/{name}_D2.fits',region,calibration=cal) for name in ['2025W49_2A_0756_3','2025W50_1A_0736_3']]
with (ROOT/'research/validation/m101_gaia_dr3.csv').open() as stream:catalogue=list(csv.DictReader(stream))
report=measure_registration(*products,catalogue,region)
out=ROOT/'docs/evidence/m101_registration_v1.json';out.write_text(json.dumps(report,indent=2,allow_nan=False),encoding='utf-8')
print({key:value for key,value in report.items() if key not in ['references','limitations','policy']})
print([(r['source_id'],r.get('reason'),r.get('residual_pixels')) for r in report['references']])
