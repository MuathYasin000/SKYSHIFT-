import {sha256} from './science.js';

// The canvas projection supports the prepared, unrotated ICRS TAN grid only.
// A file checksum cannot by itself establish a supported scientific format.
export async function validatePreparedExposure(product, arrays) {
  if (product.schema_version !== '1.0') throw Error('Unsupported prepared exposure schema.');
  const w = product.wcs, o = product.observation, d = product.display;
  if (!w || w.CTYPE1 !== 'RA---TAN' || w.CTYPE2 !== 'DEC--TAN' || w.RADESYS !== 'ICRS' ||
      w.CUNIT1 !== 'deg' || w.CUNIT2 !== 'deg' ||
      !['CRPIX1','CRPIX2','CDELT1','CDELT2','CRVAL1','CRVAL2'].every(k => Number.isFinite(w[k])) ||
      w.CDELT1 >= 0 || w.CDELT2 <= 0 || w.CRVAL1 < 0 || w.CRVAL1 >= 360 || Math.abs(w.CRVAL2) > 90 ||
      Object.keys(w).some(k => /^(CD\d|A_|B_|AP_|BP_|PV\d)/.test(k)) ||
      ['PC1_1','PC1_2','PC2_1','PC2_2'].some(k => k in w && w[k] !== (k==='PC1_1'||k==='PC2_2'?1:0)))
    throw Error('Prepared exposure has an unsupported sky projection.');
  if (!o || !['dr1','qr2','qr3'].includes(o.release) || !Number.isInteger(o.detector) || o.detector < 1 || o.detector > 6 || o.science_unit !== 'MJy/sr' ||
      ![o.time_start_utc,o.time_end_utc].every(t => typeof t === 'string' && t.endsWith('Z') && Number.isFinite(Date.parse(t))) ||
      Date.parse(o.time_end_utc) <= Date.parse(o.time_start_utc))
    throw Error('Prepared exposure has invalid release, detector, units or observation times.');
  if (!d || !Number.isFinite(d.vmin) || !Number.isFinite(d.vmax) || d.vmax <= d.vmin || d.stretch !== 'asinh' || !Number.isFinite(d.asinh_a) || d.asinh_a <= 0)
    throw Error('Prepared exposure has invalid display bounds.');
  let usable = 0;
  for (let i = 0; i < arrays.VALID.length; i++) {
    const valid = arrays.VALID[i];
    if (valid !== 0 && valid !== 1) throw Error('Prepared exposure has a nonbinary usable-pixel mask.');
    if (valid) {
      if (!Number.isFinite(arrays.SCI[i]) || !Number.isFinite(arrays.WAVE[i]) || arrays.WAVE[i] <= 0 || !Number.isFinite(arrays.BAND[i]) || arrays.BAND[i] <= 0)
        throw Error('Prepared exposure has invalid measurements inside its usable-pixel mask.');
      usable++;
    }
  }
  if (!usable) throw Error('Prepared exposure contains no usable measured pixels.');
  await Promise.all(Object.values(product.arrays).map(async entry => {
    if (!/^[a-f0-9]{64}$/.test(entry.numeric_sha256)) throw Error('Prepared exposure is missing an array identity.');
    // Hash encoded little-endian bytes, independently of host endianness/NaN decoding.
    const raw = Uint8Array.from(atob(entry.data), c => c.charCodeAt(0));
    if (await sha256(raw) !== entry.numeric_sha256) throw Error('Prepared exposure array does not match its numeric checksum.');
  }));
}
