import {pixelToSky, skyToPixel} from './science.js';
import {pixelCovered} from './observations-render.js';

export function sampleSky(frame, sky) {
  let pixel;
  try { pixel = skyToPixel(sky.ra_deg, sky.dec_deg, frame.wcs); }
  catch { return null; }
  const {SCI, VALID, WAVE, BAND, shape:[height,width]} = frame.arraysDecoded;
  const x = Math.round(pixel.x), y = Math.round(pixel.y);
  if (x < 0 || x >= width || y < 0 || y >= height) return null;
  const i = y * width + x;
  const valid = Boolean(VALID[i] && Number.isFinite(SCI[i]));
  return {valid, value:valid ? SCI[i] : null, wave:WAVE?.[i], band:BAND?.[i]};
}

export function combineFrames(reference, group, mode) {
  const [height,width] = reference.arraysDecoded.shape;
  if (width * height * (group.length + 1) > 10_000_000) {
    throw Error('This combination is too large for an interactive preview. Narrow the field or frame range.');
  }
  const count = group.length;
  const SCI = new Float32Array(width * height).fill(NaN);
  const VALID = new Uint8Array(SCI.length);
  const COVERAGE = new Uint8Array(SCI.length);
  const aligned = group.every(frame => frame.wcs === reference.wcs);
  const bounds = [];
  for (let i=0;i<SCI.length;i++) {
    const sky = aligned ? null : pixelToSky(i%width, Math.floor(i/width), reference.wcs);
    const valueAt = frame => {
      if (!aligned) return sampleSky(frame,sky)?.value ?? NaN;
      const arrays=frame.arraysDecoded;
      return arrays.VALID[i] ? arrays.SCI[i] : NaN;
    };
    if (mode === 'difference') {
      const a = valueAt(reference), b = valueAt(group[0]);
      if (!Number.isFinite(a) || !Number.isFinite(b)) continue;
      SCI[i] = a - b;
    } else {
      let total=0, usable=0;
      for (const frame of group) {
        if (aligned && pixelCovered(frame.arraysDecoded,i)) COVERAGE[i]=1;
        const value=valueAt(frame);
        if (!Number.isFinite(value)) continue;
        total += value;
        usable++;
      }
      if (!usable) continue;
      SCI[i] = total / usable;
    }
    VALID[i]=1;
    COVERAGE[i]=1;
    bounds.push(SCI[i]);
  }
  bounds.sort((a,b)=>a-b);
  let lo = bounds[Math.floor(bounds.length*.01)] ?? 0;
  let hi = bounds[Math.floor(bounds.length*.99)] ?? 1;
  if (mode === 'difference') {
    hi = Math.max(Math.abs(lo),Math.abs(hi)) || 1;
    lo = -hi;
  } else if (hi <= lo) hi = lo+1;
  const {x,y} = reference.target;
  const tx=Math.round(x),ty=Math.round(y);
  const validTarget=tx>=0&&ty>=0&&tx<width&&ty<height&&Boolean(VALID[ty*width+tx]);
  return {
    ...reference, bitmap:null, derived:mode,
    arraysDecoded:{SCI,VALID,COVERAGE,shape:[height,width]},
    target:{...reference.target,valid:validTarget},
    display:{vmin:lo,vmax:hi},
    label:mode==='difference'?'A − B · signed surface brightness':'Mean coadd · '+count+' exposures',
    usable_fraction:bounds.length/SCI.length,
  };
}

export function spectrumAt(frames, sky) {
  return frames.flatMap(frame=>{
    const sample=sampleSky(frame,sky);
    if (!sample) return [];
    const measured=Number.isFinite(sample.wave)&&sample.wave>0;
    const wave=measured?sample.wave:frame.wavelength_center_um;
    return Number.isFinite(wave)?[{...sample,wave,measured,id:frame.archive_id,detector:frame.detector}]:[];
  }).sort((a,b)=>a.wave-b.wave);
}

export function referencePosition(source, utc, moving) {
  if (!moving || ![source.ref_epoch,source.pmra,source.pmdec].every(Number.isFinite)) {
    return {ra_deg:source.ra,dec_deg:source.dec,propagated:false};
  }
  const epoch = 2000+(Date.parse(utc)-Date.UTC(2000,0,1,12))/31557600000;
  const years = epoch-source.ref_epoch;
  const scale = Math.cos(source.dec*Math.PI/180);
  if (!Number.isFinite(years) || Math.abs(scale)<1e-9) {
    return {ra_deg:source.ra,dec_deg:source.dec,propagated:false};
  }
  return {
    ra_deg:((source.ra+source.pmra*years/(3600000*scale))%360+360)%360,
    dec_deg:source.dec+source.pmdec*years/3600000,propagated:true,
  };
}
