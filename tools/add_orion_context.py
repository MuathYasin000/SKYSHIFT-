"""One targeted QR2/D2 single-exposure addition, with preserved discovery and independent interpolation checks.

Never runs temporal-pair screening or regenerates existing observation payloads.
"""
from pathlib import Path
import hashlib
import importlib.util
import json
import shutil
import sys
import numpy as np
from astropy.io import fits
from astropy.coordinates import SkyCoord
import astropy.units as u

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'src'))
from skyshift.archive import sha256_file,cutout_url,download
from skyshift.products import read_product
from skyshift.models import SkyRegion
import build_exploration_assets as builder

RA=83.82083333333334;DEC=-5.391108333333334
REGION=SkyRegion(ra_deg=RA,dec_deg=DEC,size_deg=.2)
COORDINATE_SOURCE='https://science.nasa.gov/asset/hubble/the-orion-nebula-handout/'


def manual_bilinear(array,x,y):
    h,w=array.shape;inside=(x>=-.5)&(x<=w-.5)&(y>=-.5)&(y<=h-.5)
    x=np.clip(x,0,w-1);y=np.clip(y,0,h-1);x0=np.floor(x).astype(int);y0=np.floor(y).astype(int);x1=np.minimum(x0+1,w-1);y1=np.minimum(y0+1,h-1)
    dx=x-x0;dy=y-y0
    value=array[y0,x0]*(1-dx)*(1-dy)+array[y0,x1]*dx*(1-dy)+array[y1,x0]*(1-dx)*dy+array[y1,x1]*dx*dy
    return np.where(inside,value,np.nan),inside


def main():
    research=ROOT/'research/m42-targeted'
    rows=json.loads((research/'inventory/observations.json').read_text(encoding='utf-8'))
    candidates=[r for r in rows if r['energy_bandpassname']=='SPHEREx-D2' and 'l2b-v20-2025' in r['access_url']]
    center=SkyCoord(RA*u.deg,DEC*u.deg)
    candidates.sort(key=lambda r:center.separation(SkyCoord(float(r['s_ra'])*u.deg,float(r['s_dec'])*u.deg)).deg)
    if not candidates:raise ValueError('No product in the supported QR2/D2 processing family')
    row=candidates[0]
    path=ROOT/'data/raw/m42_context'/(row['obs_id']+'_D2.fits')
    source=download(cutout_url(row['access_url'],REGION),path,max_bytes=8000000)
    cal=ROOT/'data/calibration/spectral_wcs_D2_spx_cal-wcs-v4-2025-254.fits'
    if sha256_file(cal)!='40c49a5acbf7047b7cebf3d46471cb99639867996f48a22d0e283f7e529249d7':raise ValueError('Calibration identity changed')
    product=read_product(path,REGION,calibration=cal)
    if product.observation.pipeline_version!='6.4+psffix1' or product.unknown_flag_pixels or product.valid.mean()<.5:raise ValueError('Native single-context curation checks failed')
    private=research/'prepared/explore'
    if private.parent.exists():raise FileExistsError('Preserve existing preparation evidence; use it rather than regenerating')
    # Invoke the unchanged, fingerprinted preparation code with one explicit field configuration.
    previous=builder.FIELDS
    builder.FIELDS=[('m42','Orion Nebula · M42','A real single-band infrared view of part of the Orion Nebula, a star-forming region in Orion. No temporal comparison is available.',RA,DEC,.2,'m42_context')]
    try:field=builder.build(private)['fields'][0]
    finally:builder.FIELDS=previous
    field['comparison_status']='unavailable'
    entry=field['observations'][0];payload_path=private/Path(entry['url']).name
    payload=json.loads(payload_path.read_text(encoding='utf-8'))
    payload['observation']['source']['retrieved_at_utc']=source.model_dump(mode='json')['retrieved_at_utc']
    payload['observation']['spectral_calibration']['retrieved_at_utc']=json.loads(cal.with_suffix('.fits.source.json').read_text(encoding='utf-8')).get('retrieved_at_utc')
    payload['limitations'].extend(['No temporal screening, independent source registration or photometric variability assessment for this single exposure.','Calibration UUID associations and scientific interpretation still require qualified assessment.'])
    payload_path.write_bytes(json.dumps(payload,separators=(',',':'),allow_nan=False).encode())
    entry['sha256']=sha256_file(payload_path)
    (private.parent/'explore-catalog.json').write_text(json.dumps({'schema_version':'1.0','scope':'Targeted single-exposure preparation of M42 only; no temporal screening or comparison','fields':[field]},indent=2),encoding='utf-8')
    spec=importlib.util.spec_from_file_location('audit_reference',ROOT/'tools/audit_provenance_redesign.py');audit=importlib.util.module_from_spec(spec);spec.loader.exec_module(audit)
    inventory_check=audit.check_inventory(row,fits.getheader(path,'IMAGE'),payload['observation'])
    if not inventory_check['match']:raise ValueError('Original observation does not match inventory')
    from astropy.wcs import WCS
    output_wcs=WCS(payload['wcs']);yy,xx=np.indices(payload['shape']);ra,dec=output_wcs.pixel_to_world_values(xx,yy);x,y=product.wcs.world_to_pixel_values(ra,dec)
    native={'SCI':product.image,'WAVE':product.wavelength_um,'BAND':product.bandwidth_um}
    recreated={name:manual_bilinear(a,x,y)[0].astype(np.float32) for name,a in native.items()}
    support,inside=manual_bilinear(product.valid.astype(float),x,y)
    valid=inside&np.isfinite(support)&(support>=1-1e-10)
    for value in recreated.values():valid&=np.isfinite(value)
    recreated['SCI'][~valid]=np.nan;recreated['VALID']=valid.astype(np.uint8)
    comparisons={}
    for name,expected in recreated.items():
        actual=audit.decode_array(payload['arrays'][name]);same_nonfinite=bool(np.array_equal(np.isfinite(expected),np.isfinite(actual)))
        mask=np.isfinite(expected)&np.isfinite(actual);error=float(np.max(np.abs(actual[mask].astype(float)-expected[mask].astype(float)))) if mask.any() else 0
        passed=same_nonfinite and bool(np.array_equal(actual,expected,equal_nan=True))
        comparisons[name]={'exact_match':passed,'finite_support_matches':same_nonfinite,'max_absolute_error':error}
        if not passed:raise ValueError('Independent bilinear reconstruction differs: '+name+' '+str(comparisons[name]))
    if valid.mean()<.5:raise ValueError('Prepared usable support is insufficient for the declared single-context policy')
    report={'objective':'One additional nebular single-exposure context; no temporal pair screening','coordinate_source':COORDINATE_SOURCE,'region':REGION.model_dump(),
        'inventory_query':json.loads((research/'inventory/query.json').read_text(encoding='utf-8')),'supported_family_candidates':len(candidates),
        'selection':'Nearest native detector-frame centre among QR2 D2 l2b-v20-2025 products; acquire one cutout only','selected_observation':payload['observation'],
        'inventory_check':inventory_check,'native_valid_fraction':float(product.valid.mean()),'prepared_valid_fraction':float(valid.mean()),'unknown_flag_pixels':product.unknown_flag_pixels,
        'independent_reconstruction':'Direct inverse WCS mapping and explicit four-neighbour bilinear arithmetic; no reproject call in validation',
        'arrays':comparisons,'product_sha256':entry['sha256'],'scientific_approval':'PENDING','temporal_comparison_enabled':False,'temporal_pairs_screened':0,
        'preparation_tool_sha256':sha256_file(ROOT/'tools/build_exploration_assets.py'),'curation_tool_sha256':sha256_file(Path(__file__)),'publication':'local application only'}
    (research/'validated-context.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
    catalog_path=ROOT/'web/dist/data/explore-catalog.json';catalog=json.loads(catalog_path.read_text(encoding='utf-8'))
    if any(f['id']=='m42' for f in catalog['fields']):raise ValueError('Orion is already present; do not duplicate it')
    target=ROOT/'web/dist/data/explore'
    for name in [payload_path.name,Path(entry['preview']).name]:
        if (target/name).exists():raise FileExistsError('Preserve existing output: '+name)
        shutil.copyfile(private/name,target/name)
    catalog['fields'].append(field);catalog['scope']='Four curated real fields; single-exposure exploration plus one restricted M101 comparison candidate; no all-sky availability claim'
    catalog_path.write_text(json.dumps(catalog,indent=2),encoding='utf-8')
    (ROOT/'docs/evidence/m42_single_context.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
    print(json.dumps({'field':'m42','observation':row['obs_id'],'prepared_valid_fraction':float(valid.mean()),'arrays':comparisons,'scientific_approval':'PENDING','temporal_comparison_enabled':False},indent=2))


if __name__=='__main__':main()
