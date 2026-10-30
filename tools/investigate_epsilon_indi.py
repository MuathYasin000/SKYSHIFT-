"""One predeclared alternative: long-cadence motion feasibility for Epsilon Indi B.

At most one Gaia identity query, one SIA inventory, twelve 64-KiB header probes,
and two context cutouts. Require >=100 days among the probed compatible pairs;
stop without science acquisition if no such pair exists. No threshold changes.
"""
import csv
import json
import sys
from pathlib import Path
from urllib.parse import urlencode
import argparse

ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'src'))
from skyshift.archive import download,inventory,cutout_url,sha256_file
from skyshift.sequence import SequenceRequest,build_sequence,CALIBRATION
from skyshift.selection import preselect
from skyshift.target_assessment import catalogue_position


def run(output):
    output=Path(output);output.mkdir(parents=True,exist_ok=False)
    objective={'target':'Epsilon Indi B unresolved brown-dwarf system','catalogue_id':'6412596012146801152',
        'identity_reference':'https://simbad.u-strasbg.fr/simbad/sim-id?Ident=%2A+eps+Ind+B',
        'objective':'Test whether one >=100-day, wavelength-compatible pair exists in a bounded subset. High catalogue proper motion motivates this alternative; no detected motion is assumed.',
        'maximum_header_probes':12,'maximum_cutouts':2,'minimum_cadence_days':100,'scientific_approval':'PENDING'}
    (output/'objective.json').open('x',encoding='utf-8').write(json.dumps(objective,indent=2)+'\n')
    query="SELECT source_id,ra,dec,ref_epoch,pmra,pmdec,parallax,radial_velocity,ra_error,dec_error,pmra_error,pmdec_error,ruwe,phot_g_mean_mag FROM gaia_dr3_source WHERE source_id=6412596012146801152"
    url='https://irsa.ipac.caltech.edu/TAP/sync?'+urlencode({'REQUEST':'doQuery','LANG':'ADQL','FORMAT':'csv','QUERY':query})
    path=output/'catalogue.csv';record=download(url,path,max_bytes=100000)
    rows=list(csv.DictReader(path.read_text(encoding='utf-8-sig').splitlines()))
    if len(rows)!=1 or rows[0]['source_id']!=objective['catalogue_id']:raise ValueError('Catalogue identity unavailable')
    centre=catalogue_position(rows[0],'2025-10-01T00:00:00')
    request=SequenceRequest.model_validate({'schema_version':'1.0','kind':'skyshift-observation-request','release':'qr2',
        'region':{'ra_deg':float(centre.ra.deg),'dec_deg':float(centre.dec.deg),'size_deg':.04,'frame':'icrs'},
        'detector':2,'max_frames':2,'use_cache':False})
    context=request.region.model_copy(update={'size_deg':.3})
    rows=inventory(context,'qr2',output/'inventory',detector=2)
    pin=CALIBRATION[('qr2',2)];cal=ROOT/pin['path']
    if sha256_file(cal)!=pin['sha256']:raise ValueError('Pinned wavelength calibration changed')
    _,selection=preselect(rows,request,cal,output/'selection',progress=lambda message:print(message,flush=True))
    candidates=[p for p in selection.get('compatible_pairs_in_probed_subset',[]) if p['time_separation_days']>=100]
    if not candidates:
        result={'outcome':'no_long_cadence_pair_in_bounded_subset','interpretation':'No mission-wide nonexistence or target nondetection is inferred. No extra science cutouts acquired.',
                'metadata_candidates':selection['contained_candidates'],'probed_headers':len(selection['probes']),'compatible_pairs':selection.get('compatible_pairs_in_probed_subset',[]),'physical_change':'not_established'}
    else:
        chosen=min(candidates,key=lambda p:(-p['time_separation_days'],p['max_sample_separation_bandwidths'],p['a'],p['b']))
        (output/'chosen-pair.json').open('x',encoding='utf-8').write(json.dumps(chosen,indent=2)+'\n')
        paths=[]
        for ident in [chosen['a'],chosen['b']]:
            matches=[row for row in rows if row['obs_id']==ident]
            if len(matches)!=1:raise ValueError('Ambiguous selected metadata identity')
            path=output/'originals'/(ident+'_D2.fits')
            download(cutout_url(matches[0]['access_url'],context),path,max_bytes=20000000);paths.append(path)
        bundle=build_sequence(request,output/'prepared',input_paths=paths)
        result={'outcome':'engineering_temporal_candidate' if bundle['playback_eligible'] else 'rejected_for_temporal_comparison',
            'chosen_pair':chosen,'playback_eligible':bundle['playback_eligible'],'comparisons':bundle['comparisons'],'rejections':bundle['rejections'],'physical_change':'not_established'}
    (output/'result.json').open('x',encoding='utf-8').write(json.dumps(result,indent=2,allow_nan=False)+'\n')
    print(json.dumps({k:v for k,v in result.items() if k not in ['comparisons','rejections']}),flush=True)


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--output',type=Path,required=True)
    run(parser.parse_args().output)
