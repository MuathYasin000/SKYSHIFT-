"""Independent catalogue-anchored centroids on native, unresampled images.

No transform is fitted or applied. All measured stars are validation references,
so agreement cannot result from fitting and testing on the same coordinates.
"""
from __future__ import annotations
from dataclasses import dataclass, asdict
import warnings
import numpy as np
import astropy.units as u
from astropy.coordinates import SkyCoord
from astropy.time import Time
from scipy.optimize import least_squares
from scipy.special import erf
from scipy.spatial import ConvexHull, QhullError
from .products import Product
from .models import SkyRegion
from .coordinates import common_grid


@dataclass(frozen=True)
class RegistrationPolicy:
    version: str = 'registration-v2'
    minimum_references: int = 6
    minimum_quadrants: int = 3
    minimum_hull_fraction: float = 0.10
    maximum_median_pixels: float = 0.25
    maximum_p95_pixels: float = 0.50
    minimum_peak_snr: float = 8
    maximum_proper_motion_masyr: float = 100
    maximum_parallax_mas: float = 5
    isolation_arcsec: float = 30
    fit_radius: int = 4


def integrated_gaussian(parameters, x, y):
    amplitude, cx, cy, sx, sy, bg, gx, gy = parameters
    fx = .5 * (erf((x + .5 - cx) / (np.sqrt(2) * sx)) - erf((x - .5 - cx) / (np.sqrt(2) * sx)))
    fy = .5 * (erf((y + .5 - cy) / (np.sqrt(2) * sy)) - erf((y - .5 - cy) / (np.sqrt(2) * sy)))
    return amplitude * fx * fy + bg + gx * (x - cx) + gy * (y - cy)


def fit_reference(image, variance, valid, predicted_x, predicted_y, radius=4, minimum_peak_snr=8):
    """Pixel-integrated axis-aligned Gaussian plus local background plane.

    Shape values are empirical profile diagnostics, not calibrated optical PSFs.
    Fit covariance is intentionally not reported as astrometric precision.
    """
    ix, iy = int(np.rint(predicted_x)), int(np.rint(predicted_y))
    if min(ix, iy) < radius or ix + radius >= image.shape[1] or iy + radius >= image.shape[0]:
        return {'status':'rejected','reason':'window_outside_native_footprint'}
    sl=np.s_[iy-radius:iy+radius+1, ix-radius:ix+radius+1]
    data=np.asarray(image[sl]); var=np.asarray(variance[sl]); good=np.asarray(valid[sl]) & np.isfinite(data) & np.isfinite(var) & (var>0)
    if good.mean()<.8 or not np.all(good[radius-1:radius+2,radius-1:radius+2]):
        return {'status':'rejected','reason':'flagged_or_missing_source_support'}
    y,x=np.indices(data.shape,dtype=float); px=predicted_x-(ix-radius);py=predicted_y-(iy-radius)
    border=(np.hypot(x-px,y-py)>radius-1)&good
    if border.sum()<12:return {'status':'rejected','reason':'insufficient_local_background'}
    bg=float(np.median(data[border]));noise=float(np.sqrt(np.median(var[good])))
    excess=np.where(good,data-bg,-np.inf); peak=float(np.max(excess))
    if peak/noise<minimum_peak_snr:return {'status':'rejected','reason':'low_peak_snr','peak_snr':peak/noise}
    initial=[max(peak*5,noise),px,py,.8,.8,bg,0,0]
    lower=[0,px-2,py-2,.30,.30,-np.inf,-np.inf,-np.inf]
    upper=[np.inf,px+2,py+2,2.5,2.5,np.inf,np.inf,np.inf]
    def residual(params):return ((integrated_gaussian(params,x,y)-data)/np.sqrt(var))[good]
    fit=least_squares(residual,initial,bounds=(lower,upper),loss='soft_l1',f_scale=2,max_nfev=500)
    amp,cx,cy,sx,sy,bg,gx,gy=fit.x
    if not fit.success or max(abs(cx-px),abs(cy-py))>1.8:
        return {'status':'rejected','reason':'centroid_fit_not_reliable'}
    if min(sx,sy)<.32 or max(sx,sy)>2.45 or max(sx,sy)/min(sx,sy)>2:
        return {'status':'rejected','reason':'noncompact_or_elongated_profile'}
    return {'status':'measured','x':float(cx+ix-radius),'y':float(cy+iy-radius),
            'sigma_x_pixels':float(sx),'sigma_y_pixels':float(sy),'profile_fwhm_pixels':float(2.35482*np.sqrt(sx*sy)),
            'peak_snr':peak/noise,'background_mjy_sr':float(bg),'fit_residual_rms_sigma':float(np.sqrt(np.mean(residual(fit.x)**2))),
            'valid_window_fraction':float(good.mean())}


def reference_position(row, time):
    # Tangential proper motion only. Parallax >5 mas is excluded by the policy.
    source=SkyCoord(ra=float(row['ra'])*u.deg,dec=float(row['dec'])*u.deg,
        pm_ra_cosdec=float(row['pmra'])*u.mas/u.yr,pm_dec=float(row['pmdec'])*u.mas/u.yr,
        obstime=Time(float(row['ref_epoch']),format='jyear'),frame='icrs')
    with warnings.catch_warnings():
        warnings.simplefilter('ignore',category=Warning)
        return source.apply_space_motion(new_obstime=Time(time))


def measure_registration(a:Product,b:Product,catalogue:list[dict],region:SkyRegion,policy:RegistrationPolicy|None=None):
    policy=policy or RegistrationPolicy()
    out,shape=common_grid(region)
    catsky=SkyCoord([float(r['ra']) for r in catalogue]*u.deg,[float(r['dec']) for r in catalogue]*u.deg)
    rows=[]
    for i,row in enumerate(catalogue):
        result={'source_id':str(row['source_id']),'catalogue_ra_deg':float(row['ra']),'catalogue_dec_deg':float(row['dec'])}
        pm=np.hypot(float(row['pmra']),float(row['pmdec']));parallax=float(row.get('parallax') or 0)
        if pm>policy.maximum_proper_motion_masyr or abs(parallax)>policy.maximum_parallax_mas:
            result.update(status='rejected',reason='proper_motion_or_parallax_limit');rows.append(result);continue
        separations=catsky[i].separation(catsky).arcsec
        if np.count_nonzero(separations<policy.isolation_arcsec)>1:
            result.update(status='rejected',reason='catalogue_neighbor');rows.append(result);continue
        predicted_positions=[reference_position(row,p.observation.time_start_utc) for p in (a,b)]
        context_positions=[out.world_to_pixel(pos) for pos in predicted_positions]
        if any(not np.isfinite([x,y]).all() or not -.5<=x<shape[1]-.5 or not -.5<=y<shape[0]-.5 for x,y in context_positions):
            result.update(status='rejected',reason='outside_declared_registration_context');rows.append(result);continue
        measurements=[];corrected=[];predictions=[]
        for p in (a,b):
            predicted=predicted_positions[len(measurements)]
            x,y=p.wcs.world_to_pixel(predicted)
            fit=fit_reference(p.image,p.variance,p.valid,float(x),float(y),policy.fit_radius,policy.minimum_peak_snr)
            measurements.append(fit);predictions.append((float(x),float(y)))
            if fit['status']=='measured':
                measured=p.wcs.pixel_to_world(fit['x'],fit['y'])
                ox,oy=out.world_to_pixel(measured);px,py=out.world_to_pixel(predicted)
                corrected.append((float(ox-px),float(oy-py)))
        result['a']=measurements[0];result['b']=measurements[1]
        if len(corrected)!=2:
            result.update(status='rejected',reason='unmeasurable_in_one_or_both_epochs');rows.append(result);continue
        dx=corrected[1][0]-corrected[0][0];dy=corrected[1][1]-corrected[0][1]
        midpoint=reference_position(row,a.observation.time_start_utc)
        ox,oy=out.world_to_pixel(midpoint)
        result.update(status='measured',dx_output_pixels=dx,dy_output_pixels=dy,residual_pixels=float(np.hypot(dx,dy)),
            absolute_offset_a_pixels=list(corrected[0]),absolute_offset_b_pixels=list(corrected[1]),output_x=float(ox),output_y=float(oy))
        rows.append(result)
    matches=[r for r in rows if r['status']=='measured']
    if matches:
        residuals=np.array([r['residual_pixels'] for r in matches])
        quadrants={(r['output_x']>shape[1]/2,r['output_y']>shape[0]/2) for r in matches}
        positions=np.array([[r['output_x'],r['output_y']] for r in matches])
        try:hull=ConvexHull(positions).volume/(shape[0]*shape[1]) if len(matches)>=3 else 0
        except QhullError:hull=0
        median=float(np.median(residuals));p95=float(np.percentile(residuals,95))
    else:median=p95=None;quadrants=set();hull=0
    passed=len(matches)>=policy.minimum_references and len(quadrants)>=policy.minimum_quadrants and hull>=policy.minimum_hull_fraction and median<=policy.maximum_median_pixels and p95<=policy.maximum_p95_pixels
    return {'method':'Gaia DR3 anchored, native-image integrated-Gaussian centroids; no fitted registration transform','region':region.model_dump(mode='json'),
        'policy':asdict(policy),'status':'pass' if passed else 'fail','reference_count':len(matches),'quadrants':len(quadrants),
        'convex_hull_fraction':float(hull),'median_residual_pixels':median,'p95_residual_pixels':p95,
        'pixel_scale_arcsec':6.15,'median_residual_arcsec':median*6.15 if median is not None else None,
        'p95_residual_arcsec':p95*6.15 if p95 is not None else None,'references':rows,
        'limitations':['Reference identity is independent of SPHEREx image processing. No astrometric correction was fitted.',
                      'Empirical Gaussian profiles are diagnostics, not an ePSF astrometric likelihood.',
                      'No formal positional uncertainties or absolute astrometric precision are claimed.',
                      'Catalogue positions use proper motion; sub-5 mas parallax is neglected for this arcsecond-scale check.',
                      'References outside the inspection region can constrain surrounding registration, but do not prove local distortions are absent.']}
