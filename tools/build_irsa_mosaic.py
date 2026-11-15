"""Acquire the one official published M101 cube; produce bounded per-plane assets."""
from pathlib import Path
import json,sys,hashlib
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'src'))
from skyshift.archive import download
from skyshift.mosaics import read_mosaic,prepare_planes,ADAPTER
from evidence_output import fresh_run,write_report

SOURCE={'source_url':'https://irsa.ipac.caltech.edu/data/demos/notebooks/spherex/M101_irsa.fits','sha256':'44e89f460c55f46f7e384ba7dfe8927fa8e56163875aba3766499a5646813447','size_bytes':87295680}


def main():
    path=ROOT/'data/mosaics/originals/M101_irsa.fits'
    record=download(SOURCE['source_url'],path,max_bytes=90_000_000)
    cube=read_mosaic(path,SOURCE['sha256'])
    source={**SOURCE,'retrieved_at_utc':record.retrieved_at_utc.isoformat()}
    output=ROOT/'web/dist/data/mosaics/m101-v1'
    channels,total=prepare_planes(cube,output,source)
    manifest={'schema_version':'1.0','kind':'spherex_mosaic_cube','adapter_version':ADAPTER,'id':'m101','name':'M101 / Pinwheel Galaxy',
              'usage':'multi_epoch_wavelength_context_only','temporal_comparison_allowed':False,'science_unit':'MJy/sr',
              'source':source,'shape':list(cube['image'].shape),'wcs':cube['wcs'],'channels':channels,'default_plane':63,
              'flag_definitions':cube['flag_definitions'],'mask_policy':'Finite IMAGE and positive NHITS; OVERFLOW, OUTLIER and unknown bits excluded; SOURCE alone retained.',
              'release':'Not identified in the distributed cube; do not assume QR2/QR3 equivalence.',
              'dates':cube['recorded_dates'],'time_composition':'Multiple input observations; their individual IDs and acquisition dates are not supplied by this tutorial cube. Not a temporal frame.',
              'limitations':['No variance extension is supplied; NHITS is coverage, not uncertainty.','Wavelength changes reveal different infrared emission; they do not show change over time.','Plane-dependent gaps and residual stripes/artifacts remain visible.'],
              'processing':'Original spatial samples, units and flags retained. No interpolation, background subtraction, smoothing or inpainting. Per-plane display limits cannot measure spectral or temporal variability.',
              'documentation':['https://caltech-ipac.github.io/irsa-tutorials/spherex-mosaic/','https://irsa.ipac.caltech.edu/onlinehelp/spherex/spherex/mosaic.html'],
              'credit':'NASA/JPL-Caltech/IPAC; official IRSA SPHEREx Mosaic Tool tutorial product.',
              'storage':{'source_fits_bytes':record.size_bytes,'prepared_transfer_bytes':total,'per_plane_max_bytes':max(x['bytes'] for x in channels),'browser_cache_planes':6},
              'processing_source_sha256':hashlib.sha256((ROOT/'src/skyshift/mosaics.py').read_bytes()).hexdigest()}
    raw=json.dumps(manifest,indent=2,allow_nan=False).encode()
    target=output/'manifest.json'
    if target.exists() and target.read_bytes()!=raw:raise ValueError('Mosaic manifest changed; use a new adapter version')
    if not target.exists():target.write_bytes(raw)
    out=fresh_run('irsa-mosaic-ingestion')
    write_report(out,'inspection.json',json.dumps({**manifest,'original_image_header':cube['header'],'hdus':cube['hdus'],'manifest_sha256':hashlib.sha256(raw).hexdigest()},indent=2))
    print(json.dumps({'output':str(out),'manifest_sha256':hashlib.sha256(raw).hexdigest(),'channels':len(channels),'covered_channels':sum(c['available'] for c in channels),'storage':manifest['storage']}))

if __name__=='__main__':main()
