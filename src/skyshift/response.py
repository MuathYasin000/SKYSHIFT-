"""Local spectral, image-response, background, and calibration diagnostics."""
from pathlib import Path
import re,json
import numpy as np
from astropy.io import fits
from .archive import record_file
from .products import Product, visualization_spectra


def local_epsf(product:Product,calibration:Path,x:float,y:float):
    px=x+1-product.header['CRPIX1A'];py=y+1-product.header['CRPIX2A']
    with fits.open(calibration,memmap=False) as hdul:
        hdu=hdul['EPSF'];data=hdu.data
        if int(hdu.header['DETECTOR'])!=product.observation.detector or hdu.header['DETCOORD']!=product.header['DETCOORD']:
            raise ValueError('ePSF detector/orientation does not match the input')
        index=int(np.argmin((data['XCENTER']-px)**2+(data['YCENTER']-py)**2))
        psf=np.array(data[index]['EPSF'],dtype=float)
        if not np.all(np.isfinite(psf)) or psf.sum()<=0:raise ValueError('Invalid ePSF model')
        # Negative model wings remain preserved; moments use positive weights only.
        weights=np.maximum(psf,0);weights/=weights.sum()
        yy,xx=np.indices(psf.shape,dtype=float)
        cx=float((weights*xx).sum());cy=float((weights*yy).sum())
        sx=float(np.sqrt((weights*(xx-cx)**2).sum())/int(hdu.header['OVSMPX']))
        sy=float(np.sqrt((weights*(yy-cy)**2).sum())/int(hdu.header['OVSMPY']))
        sidecar=calibration.with_suffix(calibration.suffix+'.source.json')
        source_url=json.loads(sidecar.read_text()).get('source_url') if sidecar.exists() else None
        return {'calibration':record_file(calibration,source_url).model_dump(mode='json'),'zone_index':index,
            'parent_x':float(px),'parent_y':float(py),'oversampling':int(hdu.header['OVSMPX']),
            'effective_area_native_pixels':float(data[index]['NEFF_MEAN']),
            'model_wavelength_um':float(data[index]['CWAVE']),
            'positive_weight_rms_radius_native_pixels':float(np.hypot(sx,sy)),
            'note':'Nearest local ePSF zone. Positive-wing moments are descriptive only; no deconvolution or matching applied.'}


def calibration_history(product):
    result={}
    for line in product.header.get('HISTORY',[]):
        m=re.match(r'\[CALIB\]\s+(\S+)\s+(\S+)',str(line))
        if m:result[m.group(1)]=m.group(2)
    return result


def background_diagnostics(product):
    source_bit=1<<product.flag_definitions['SOURCE']
    background=product.valid & ((product.flags & source_bit)==0)
    values=product.image[background]
    if len(values)<50:return {'status':'insufficient','sample_count':int(len(values))}
    median=float(np.median(values));mad=float(1.4826*np.median(np.abs(values-median)))
    with fits.open(product.observation.source.path,memmap=False) as hdul:
        zodi=np.asarray(hdul['ZODI'].data,dtype=float) if 'ZODI' in hdul else None
    return {'status':'measured','sample_count':int(len(values)),'median_mjy_sr':median,'robust_scatter_mjy_sr':mad,
        'variance_noise_median_mjy_sr':float(np.median(np.sqrt(product.variance[background]))),
        'zodiacal_model_median_mjy_sr':float(np.nanmedian(zodi[background])) if zodi is not None else None,
        'note':'Native valid pixels without SOURCE flag; background estimates can still contain diffuse astrophysical emission.'}


def response_report(a,b,registration,epsf_calibration,region):
    products=[]
    for p in (a,b):
        x,y=p.wcs.world_to_pixel_values(region.ra_deg,region.dec_deg)
        with fits.open(p.observation.source.path,memmap=False) as h:
            approx_wave,approx_band=visualization_spectra(h,p.header,p.image.shape)
        good=p.valid & np.isfinite(p.wavelength_um) & np.isfinite(approx_wave)
        products.append({'observation_id':p.observation.observation_id,'source_sha256':p.observation.source.sha256,
            'calibration_history':calibration_history(p),'spectral_calibration':p.observation.spectral_calibration.model_dump(mode='json'),
            'wave_lookup_minus_cwave_abs_median_um':float(np.median(np.abs(approx_wave[good]-p.wavelength_um[good]))),
            'band_lookup_minus_cband_abs_median_um':float(np.median(np.abs(approx_band[good]-p.bandwidth_um[good]))),
            'background':background_diagnostics(p),'local_epsf':local_epsf(p,epsf_calibration,float(x),float(y)),
            'flags':{name:int(np.count_nonzero(p.flags&(1<<bit))) for name,bit in p.flag_definitions.items()}})
    refs=[r for r in registration['references'] if r['status']=='measured']
    ratios=[r['b']['profile_fwhm_pixels']/r['a']['profile_fwhm_pixels'] for r in refs]
    a_area=products[0]['local_epsf']['effective_area_native_pixels'];b_area=products[1]['local_epsf']['effective_area_native_pixels']
    spectral_id=products[0]['calibration_history'].get('spectral_wcs')
    background_a=products[0]['background'].get('median_mjy_sr');background_b=products[1]['background'].get('median_mjy_sr')
    return {'status':'diagnostics_complete_review_pending','products':products,
        'same_pipeline_spectral_calibration_history':bool(spectral_id and spectral_id==products[1]['calibration_history'].get('spectral_wcs')),
        'empirical_profile_width_ratio_median_b_over_a':float(np.median(ratios)) if ratios else None,
        'empirical_profile_width_ratio_p95_absolute_deviation':float(np.percentile(np.abs(np.array(ratios)-1),95)) if ratios else None,
        'local_epsf_effective_area_ratio_b_over_a':b_area/a_area,
        'background_offset_mjy_sr':background_b-background_a if background_a is not None and background_b is not None else None,
        'restrictions':['Qualitative spatial inspection only; brightness variability and quantitative residuals are unsupported.',
            'Wavelength responses differ; CWAVE/CBAND agreement is an engineering screen, not response-function equality.',
            'ePSF calibration is a documented newer model applicable to QR2, not a change to original calibrated arrays.',
            'Background and zodiacal model remain unmodified in displayed scientific arrays.',
            'Pipeline HISTORY identities agree, but public calibration files do not expose those same UUIDs; association needs independent review.',
            'Unflagged instrumental artifacts and source blending remain possible.']}
