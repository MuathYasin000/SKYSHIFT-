try:
    from evidence_output import fresh_run
except ModuleNotFoundError:
    from tools.evidence_output import fresh_run
"""Produce a clearly labeled engineering preview, never a validated detection."""
from pathlib import Path
import json
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np
from astropy.visualization import ImageNormalize, AsinhStretch
from reproject import reproject_interp
from skyshift.models import SkyRegion
from skyshift.products import read_product
from skyshift.suitability import screen_pair

ROOT = Path(__file__).resolve().parents[1]


def main():
    region = SkyRegion(ra_deg=210.80227, dec_deg=54.34895, size_deg=0.04)
    calibration = ROOT / 'data/calibration/spectral_wcs_D2_spx_cal-wcs-v4-2025-254.fits'
    products = [read_product(ROOT / f'data/raw/m101_probe/{name}_D2.fits', region, calibration=calibration)
                for name in ['2025W49_2A_0756_3', '2025W50_1A_0736_3']]
    report, meta = screen_pair(*products, region)
    views = []
    for p in products:
        view, _ = reproject_interp((p.image,p.wcs),meta['wcs'],shape_out=meta['shape'],order='bilinear')
        view[~meta['common_support']] = np.nan
        views.append(view)
    finite = np.concatenate([v[np.isfinite(v)] for v in views])
    limits = np.percentile(finite,[1,99.5])
    norm = ImageNormalize(vmin=limits[0],vmax=limits[1],stretch=AsinhStretch(0.1),clip=False)
    fig,axes=plt.subplots(1,3,figsize=(14,5.8))
    fig.subplots_adjust(left=.045,right=.94,bottom=.23,top=.73,wspace=.38)
    cmap=plt.get_cmap('gray').copy();cmap.set_bad('#bcc5cd')
    for i in range(2):
        im=axes[i].imshow(np.ma.masked_invalid(views[i]),origin='lower',cmap=cmap,norm=norm)
        o=products[i].observation
        axes[i].set_title(f"Observation {'AB'[i]}\n{o.time_start_utc.strftime('%Y-%m-%d %H:%M:%S')} UTC",fontsize=10)
        axes[i].set_xlabel('Shared grid x (0-based pixel)');axes[i].set_ylabel('Shared grid y (0-based pixel)')
    fig.colorbar(im,ax=list(axes[:2]),label='Calibrated brightness (MJy/sr)',shrink=.7)
    spectral=np.where(meta['common_support'],meta['spectral_separation'],np.nan)
    spectral_cmap=plt.get_cmap('viridis').copy();spectral_cmap.set_bad('#bcc5cd')
    heat=axes[2].imshow(np.ma.masked_invalid(spectral),origin='lower',cmap=spectral_cmap,vmin=0,vmax=.25)
    axes[2].set_title('Local spectral separation\nProvisional threshold: 0.25 bandwidth',fontsize=10)
    axes[2].set_xlabel('Shared grid x (0-based pixel)')
    fig.colorbar(heat,ax=axes[2],label='Wavelength separation / smaller bandwidth',shrink=.7)
    fig.suptitle('REAL SPHEREx DATA - Engineering preview only\nM101 candidate, 2.4 arcmin field - Scientific review PENDING',fontsize=14,color='#17354d',y=.96)
    fig.supxlabel('Same stretch; gray is invalid support. No PSF matching, background subtraction, or motion measurement.\nData: NASA/IPAC IRSA SPHEREx QR2 | DOI: 10.26131/IRSA652',fontsize=9,y=.04)
    out=fresh_run('pair-diagnostics')
    fig.savefig(out/'candidate_engineering_preview.png',dpi=150);plt.close(fig)
    (out/'candidate_screen.json').write_text(json.dumps(report,indent=2,allow_nan=False),encoding='utf-8')
    print('Saved clearly labeled candidate preview and engineering screen.')


if __name__=='__main__':
    main()
