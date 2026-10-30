"""Fetch seven exact context/native originals and their pinned D2 calibration.

Used for clean-checkout numerical integration tests. No candidate search, data
selection, image generation or scientific approval. Refuse changed identities.
"""
from pathlib import Path
import json
import sys

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'src'))
from skyshift.archive import download, sha256_file


def main():
    catalog=json.loads((ROOT/'web/dist/data/explore-catalog.json').read_text(encoding='utf-8'))
    directories={'m101':'m101_context','m67':'m67_outskirts','ngc188':'ngc188','m42':'m42_context'}
    inputs={}
    for field in catalog['fields']:
        for item in field['observations']:
            prepared=ROOT/'web/dist'/item['url'].removeprefix('./')
            if sha256_file(prepared)!=item['sha256']:raise ValueError('Prepared source-record identity changed')
            observation=json.loads(prepared.read_text(encoding='utf-8'))['observation']
            for name,record in [('original',observation['source']),('calibration',observation['spectral_calibration'])]:
                directory=ROOT/('data/raw/'+directories[field['id']] if name=='original' else 'data/calibration')
                path=directory/Path(record['path']).name
                inputs[path]=record
    if len(inputs)!=6 or sum(r['size_bytes'] for r in inputs.values())>100_000_000:
        raise ValueError('Fixture set differs from the bounded five-original/one-calibration plan')
    # The native M101 views use two of those same originals. Only the two
    # pinned R Draconis originals need additional acquisition, never a search.
    known={record['sha256'] for record in inputs.values()}
    temporal=json.loads((ROOT/'config/temporal_example.json').read_text(encoding='utf-8'))
    for record in temporal['sources']:
        if record['sha256'] in known:continue
        path=ROOT/'data/cache/cutouts'/Path(record['path']).name
        inputs[path]=record
        known.add(record['sha256'])
    if len(inputs)!=8 or sum(r['size_bytes'] for r in inputs.values())>120_000_000:
        raise ValueError('Native fixture identities exceed the bounded seven-original/one-calibration plan')
    for path,record in inputs.items():
        downloaded=download(record['source_url'],path,max_bytes=record['size_bytes'])
        if downloaded.sha256!=record['sha256']:raise ValueError('Official input changed; preserve failure and investigate')
    # The offline M101 registration fixture has its own published query/hash.
    sequence=json.loads((ROOT/'web/dist/data/sequence-example.json').read_text(encoding='utf-8'))
    reference=sequence['reference_catalogue']
    path=ROOT/'research/validation/m101_context_gaia_dr3.csv'
    downloaded=download(reference['url'],path,max_bytes=2_000_000)
    if downloaded.sha256!=reference['sha256']:raise ValueError('Reference catalogue differs from pinned fixture')
    query=path.with_name('m101_context_gaia_query.json')
    if not query.exists():query.write_text(json.dumps(reference,indent=2),encoding='utf-8')
    print(json.dumps({'originals':7,'calibrations':1,'reference_catalogues':1,
                      'verified_bytes':sum(r['size_bytes'] for r in inputs.values()),'scope':'Exact fixtures, not new astronomical results'}))


if __name__=='__main__':main()
