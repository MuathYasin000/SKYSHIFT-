"""Conservative native-pixel target diagnostics, never automatic discovery.

Invalid source pixels cannot be filled, fitted away, or converted into a flux.
Reported aperture errors assume independent native-pixel variances and exclude
calibration, spectral, PSF and covariance systematics: diagnostics only.
"""
import math
import numpy as np
import astropy.units as u
from astropy.coordinates import SkyCoord,Distance
from astropy.time import Time
from photutils.aperture import CircularAperture,CircularAnnulus
from .response import local_epsf,calibration_history,background_diagnostics
from .suitability import ScreeningPolicy


def finite(value):
    return float(value) if value is not None and np.isfinite(value) else None


def catalogue_position(row,time):
    """Gaia DR3 ICRS/TCB reference epoch, with pmra = mu_alpha*cos(delta)."""
    required=['ra','dec','ref_epoch','pmra','pmdec','parallax']
    if any(not math.isfinite(float(row[k])) for k in required) or float(row['parallax'])<=0:
        raise ValueError('Target needs finite catalogue astrometry and positive parallax')
    rv=float(row['radial_velocity']) if row.get('radial_velocity') else 0.
    c=SkyCoord(ra=float(row['ra'])*u.deg,dec=float(row['dec'])*u.deg,
        pm_ra_cosdec=float(row['pmra'])*u.mas/u.yr,pm_dec=float(row['pmdec'])*u.mas/u.yr,
        distance=Distance(parallax=float(row['parallax'])*u.mas),radial_velocity=rv*u.km/u.s,
        obstime=Time(float(row['ref_epoch']),format='jyear',scale='tcb'),frame='icrs')
    return c.apply_space_motion(new_obstime=Time(time,scale='utc'))


def aperture_diagnostic(product,x,y,*,radius=2.5,annulus=(6.,10.)):
    """Exact fractional aperture, complete usable support, robust local sky.

    No aperture correction or calibrated inter-epoch photometry is asserted.
    Source-flagged pixels are excluded from the background annulus.
    """
    shape=product.image.shape
    yy,xx=np.indices(shape);distance=np.hypot(xx-x,yy-y)
    core=distance<=1.5
    reasons=[]
    if x-radius<-.5 or y-radius<-.5 or x+radius>shape[1]-.5 or y+radius>shape[0]-.5:
        reasons.append('source_aperture_outside_native_image')
    weights=CircularAperture((x,y),r=radius).to_mask(method='exact').to_image(shape)
    if weights is None:return {'status':'unsupported','reasons':['source_outside_native_image']}
    support=weights>1e-10
    invalid=support&~product.valid
    if invalid.any():reasons.append('invalid_source_aperture_pixels')
    flags={name:int(np.count_nonzero(product.flags[support]&(1<<bit))) for name,bit in product.flag_definitions.items()}
    result={'status':'unsupported','reasons':reasons,'position_native_pixels':[float(x),float(y)],
            'aperture_radius_pixels':radius,'aperture_support_pixels':int(support.sum()),
            'invalid_aperture_pixels':int(invalid.sum()),'core_support_pixels':int(core.sum()),
            'invalid_core_pixels':int((core&~product.valid).sum()),'aperture_flags':flags,
            'flux_mjy_sr_pixel_sum':None,'formal_independent_pixel_error':None,
            'uncertainty_scope':'Diagonal native variance + estimated background only; excludes pixel covariance, calibration, PSF/aperture, spectral and blend systematics. Not a variability significance.'}
    ring=CircularAnnulus((x,y),r_in=annulus[0],r_out=annulus[1]).to_mask(method='center').to_image(shape)
    if ring is None:return {**result,'reasons':reasons+['background_annulus_outside_native_image']}
    source_bit=1<<product.flag_definitions['SOURCE']
    background=(ring>0)&product.valid&((product.flags&source_bit)==0)
    if background.sum()<30:return {**result,'reasons':reasons+['insufficient_unflagged_source_free_background']}
    values=product.image[background];sky=float(np.median(values));scatter=float(1.4826*np.median(np.abs(values-sky)))
    # The median's Gaussian standard error; this remains a conditional diagnostic.
    sky_variance=math.pi/2*max(scatter**2,float(np.median(product.variance[background])))/len(values)
    result['background']={'method':'median of valid source-free native annulus pixels','inner_radius_pixels':annulus[0],'outer_radius_pixels':annulus[1],
        'sample_count':int(len(values)),'median_mjy_sr':sky,'robust_scatter_mjy_sr':scatter,'median_estimator_variance':sky_variance}
    if reasons:return result
    area=float(weights.sum());flux=float(np.sum(weights[support]*(product.image[support]-sky)))
    variance=float(np.sum(weights[support]**2*product.variance[support])+area**2*sky_variance)
    if not math.isfinite(flux) or not math.isfinite(variance) or variance<=0:
        return {**result,'reasons':['invalid_flux_or_diagonal_variance']}
    result.update(status='diagnostic_only',flux_mjy_sr_pixel_sum=flux,formal_independent_pixel_error=math.sqrt(variance),
        local_wavelength_um=finite(np.sum(weights[support]*product.wavelength_um[support])/area),
        local_bandwidth_um=finite(np.sum(weights[support]*product.bandwidth_um[support])/area))
    return result


def assess_target(products,bundle,catalogue_row,epsf):
    if len(products)!=2 or len(bundle['frames'])!=2:raise ValueError('This target case requires exactly two observations')
    rows=[];positions=[]
    for product,frame in zip(products,bundle['frames'],strict=True):
        o=product.observation
        if o.observation_id!=frame['observation']['observation_id'] or o.source.sha256!=frame['observation']['source']['sha256']:
            raise ValueError('Assessment originals differ from the temporal sequence')
        position=catalogue_position(catalogue_row,o.time_start_utc);positions.append(position)
        x,y=map(float,product.wcs.world_to_pixel(position));cx,cy=round(x),round(y)
        if not 0<=cx<product.image.shape[1] or not 0<=cy<product.image.shape[0]:raise ValueError('Propagated target is outside the original cutout')
        dt=abs(Time(o.time_start_utc).jyear-float(catalogue_row['ref_epoch']))
        uncertainty={axis:math.hypot(float(catalogue_row[axis+'_error']),dt*float(catalogue_row['pm'+axis+'_error'])) for axis in ['ra','dec']}
        extraction=aperture_diagnostic(product,x,y)
        rows.append({'observation_id':o.observation_id,'source_sha256':o.source.sha256,'time_start_utc':o.time_start_utc.isoformat(),
            'catalogue_prediction':{'ra_deg':float(position.ra.deg),'dec_deg':float(position.dec.deg),'native_pixel':[x,y],
                'diagonal_catalogue_error_mas':uncertainty,'error_limit':'Catalogue diagonal terms only; no covariance, stellar photocentre or image-WCS systematic uncertainty included.'},
            'centre':{'usable':bool(product.valid[cy,cx]),'image_mjy_sr':finite(product.image[cy,cx]),'variance_mjy_sr_squared':finite(product.variance[cy,cx]),
                      'flag_value':int(product.flags[cy,cx]),'flags':[n for n,b in product.flag_definitions.items() if product.flags[cy,cx]&(1<<b)],
                      'wavelength_um':float(product.wavelength_um[cy,cx]),'bandwidth_um':float(product.bandwidth_um[cy,cx])},
            'source_extraction':extraction,'context_background':background_diagnostics(product),
            'psf':local_epsf(product,epsf,x,y),'calibration_history':calibration_history(product)})
    comparison=bundle['comparisons'][0];registration=comparison['registration'];references=[]
    for row in registration.get('references',[]):
        if row['status']!='measured':continue
        extracted=[aperture_diagnostic(p,row[epoch]['x'],row[epoch]['y']) for p,epoch in zip(products,['a','b'])]
        result={'source_id':row['source_id'],'extractions':extracted,'ratio_b_over_a':None,'status':'unsupported'}
        if all(e['status']=='diagnostic_only' and e['flux_mjy_sr_pixel_sum']>0 for e in extracted):
            a,b=extracted;separation=abs(a['local_wavelength_um']-b['local_wavelength_um'])/min(a['local_bandwidth_um'],b['local_bandwidth_um'])
            result['local_spectral_separation_bandwidths']=separation
            if separation<=ScreeningPolicy().max_wavelength_separation_in_bandwidths:
                result.update(status='diagnostic_only',ratio_b_over_a=b['flux_mjy_sr_pixel_sum']/a['flux_mjy_sr_pixel_sum'])
            else:result['reason']='reference_wavelength_mismatch'
        references.append(result)
    ratios=[r['ratio_b_over_a'] for r in references if r['ratio_b_over_a'] is not None]
    field_eligible=bundle['playback_eligible'] and comparison['playback_eligible']
    return {'schema_version':'1.0','kind':'skyshift-target-assessment','target':'R Draconis','catalogue_source_id':str(catalogue_row['source_id']),
        'sequence_id':bundle['sequence_id'],'source_hashes':bundle['identity']['source_hashes'],
        'outcome':'valid_temporal_comparison' if field_eligible else 'unsupported_comparison',
        'scope':'Provisional visual field comparison only; target photometric comparison is unsupported.',
        'target_identification':{'catalogue_identity':'Gaia DR3 1648328016354496384; SIMBAD V* R Dra cross-identification',
            'spherex_counterpart':'Catalogue position is inside both images; an independent source centroid/flux cannot be established because its core is invalid.',
            'measured_target_centroid':None,'source_confusion':'Other catalogue entries near the star do not establish deblended infrared counterparts.'},
        'target_comparison':'unsupported_comparison','physical_change':'not_established','variability_significance':None,
        'reasons':sorted({reason for row in rows for reason in row['source_extraction']['reasons']}),
        'propagation':{'frame':'ICRS','reference_epoch_jyear':float(catalogue_row['ref_epoch']),'reference_timescale':'TCB',
            'pmra_convention':'mu_alpha*cos(delta)','radial_velocity_km_s':float(catalogue_row['radial_velocity']) if catalogue_row.get('radial_velocity') else None,
            'missing_radial_velocity':'Zero assumed for propagation only; no measured radial velocity is fabricated.',
            'parallax_mas':float(catalogue_row['parallax']),'annual_parallax':'Not applied to barycentric ICRS predictions; amplitude bounded by the recorded parallax, far below a native pixel. Spacecraft ephemeris not supplied.',
            'predicted_angular_separation_arcsec':float(positions[0].separation(positions[1]).arcsec)},
        'epochs':rows,'stationary_references':references,
        'reference_summary':{'registration_references':registration['reference_count'],'usable_aperture_ratio_count':len(ratios),
            'median_diagnostic_ratio_b_over_a':float(np.median(ratios)) if ratios else None,
            'robust_ratio_scatter':float(1.4826*np.median(np.abs(ratios-np.median(ratios)))) if ratios else None,
            'interpretation':'Reference ratios are conditional aperture diagnostics, not a target variability calibration or a complete systematic-error model.'},
        'uncertainty':{'target_flux':None,'target_flux_error':None,'systematic_error_model':'not_established',
            'explanation':'Missing target pixels/variance prohibit a target flux or significance. PSF wings cannot replace the invalid core without validated saturation recovery, response matching, aperture corrections, covariance, blending and calibration uncertainties.'},
        'scientific_approval':'PENDING','internal_human_review':'PENDING'}
