try:
    from evidence_output import fresh_run
except ModuleNotFoundError:
    from tools.evidence_output import fresh_run
"""Recompute and plot the declared-context reference validation without correcting images."""
from pathlib import Path
import csv,json
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.colors import AsinhNorm
from astropy.io import fits
from skyshift.models import SkyRegion
from skyshift.products import read_product
from skyshift.registration import measure_registration
from skyshift.response import response_report

root=Path(__file__).resolve().parents[1];out=fresh_run('review-diagnostics')
region=SkyRegion(ra_deg=210.80227,dec_deg=54.34895,size_deg=.04);context=region.model_copy(update={'size_deg':.3})
cal=root/'data/calibration/spectral_wcs_D2_spx_cal-wcs-v4-2025-254.fits';epsf=root/'data/calibration/epsf_D2_spx_cal-epsf-v1-2026-191.fits'
products=[read_product(root/f'data/raw/m101_context/{obs}_D2.fits',region,calibration=cal) for obs in ['2025W49_2A_0756_3','2025W50_1A_0736_3']]
with (root/'research/validation/m101_context_gaia_dr3.csv').open() as f:catalogue=list(csv.DictReader(f))
r=measure_registration(*products,catalogue,context);response=response_report(*products,r,epsf,region)
for name,value in [('m101_registration_context_v2.json',r),('m101_response_v2.json',response)]:
    (out/name).write_text(json.dumps(value,indent=2,allow_nan=False),encoding='utf-8')
refs=[x for x in r['references'] if x['status']=='measured']
plt.rcParams.update({'font.family':'DejaVu Sans','font.size':10,'axes.spines.top':False,'axes.spines.right':False})
fig,axes=plt.subplots(1,2,figsize=(10.8,4.7),layout='constrained')
ax=axes[0];xy=np.array([[x['output_x'],x['output_y']] for x in refs]);uv=np.array([[x['dx_output_pixels'],x['dy_output_pixels']] for x in refs])
ax.quiver(xy[:,0],xy[:,1],uv[:,0],uv[:,1],angles='xy',scale_units='xy',scale=.015,color='#20746e',width=.006)
ax.scatter(xy[:,0],xy[:,1],s=12,color='#163e51');ax.set(xlim=(-.5,175.5),ylim=(-.5,175.5),xlabel='Context output x (pixels)',ylabel='Context output y (pixels)',title=f'{len(refs)} references inside declared context')
ax.add_patch(plt.Rectangle((75.5,75.5),24,24,fill=False,ec='#b87931',lw=1.5));ax.text(4,166,'Vectors magnified for inspection',fontsize=9)
ax=axes[1];res=np.sort([x['residual_pixels']*6.15 for x in refs]);ax.plot(res,np.arange(1,len(res)+1)/len(res),marker='o',color='#20746e')
ax.axvline(r['median_residual_arcsec'],color='#b87931',ls='--',label=f"Median {r['median_residual_arcsec']:.2f} arcsec")
ax.axvline(r['p95_residual_arcsec'],color='#425979',ls=':',label=f"p95 {r['p95_residual_arcsec']:.2f} arcsec")
ax.set(xlabel='Measured inter-epoch residual (arcsec)',ylabel='Cumulative reference fraction',title='Empirical sample, no absolute-precision claim');ax.legend(frameon=False,loc='lower right')
fig.suptitle('SKYSHIFT registration-v2 / scientific approval PENDING',fontsize=13)
fig.savefig(out/'registration_v2.png',dpi=180);plt.close(fig)

from skyshift.preparation import project_pair
arrays,wcs,_=project_pair(*products,region)
fig,axes=plt.subplots(1,3,figsize=(11,3.8),layout='constrained')
mask=arrays['COMMON'].astype(bool);cmap=plt.get_cmap('gray').copy();cmap.set_bad('#243642')
values=np.concatenate([arrays[n][mask] for n in ('SCI_A','SCI_B')]);lo,hi=np.percentile(values,[1,99.5])
for ax,name,product in zip(axes[:2],('SCI_A','SCI_B'),products):
    ax.imshow(arrays[name],origin='lower',cmap=cmap,norm=AsinhNorm(linear_width=(hi-lo)*.1,vmin=lo,vmax=hi),interpolation='nearest')
    ax.set(title=product.observation.time_start_utc.strftime('%Y-%m-%d UTC'),xlabel='Output x (pixels)',ylabel='Output y (pixels)')
image=axes[2].imshow(np.where(mask,arrays['SEPARATION'],np.nan),origin='lower',cmap='viridis',vmin=0,vmax=.25,interpolation='nearest')
axes[2].set(title='Local spectral diagnostic',xlabel='Output x (pixels)');fig.colorbar(image,ax=axes[2],label='Wavelength separation / minimum width')
fig.suptitle('Real SPHEREx QR2 / shared scale and masks / scientific approval PENDING',fontsize=12)
fig.savefig(out/'prepared_pair_v2.png',dpi=180);plt.close(fig)
print(json.dumps({'references':r['reference_count'],'quadrants':r['quadrants'],'hull_fraction':r['convex_hull_fraction'],'median_arcsec':r['median_residual_arcsec'],'p95_arcsec':r['p95_residual_arcsec'],
    'profile_ratio':response['empirical_profile_width_ratio_median_b_over_a'],'profile_p95_abs':response['empirical_profile_width_ratio_p95_absolute_deviation'],'status':r['status']},indent=2))
