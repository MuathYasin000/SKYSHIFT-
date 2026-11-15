import {pixelToSky, skyToPixel} from './science.js';

const gridKeys = ['CRPIX1','CRPIX2','CRVAL1','CRVAL2','CDELT1','CDELT2'];

export function pixelCovered(arrays, index) {
  if (arrays.COVERAGE) return Boolean(arrays.COVERAGE[index]);
  if (arrays.WAVE) return Number.isFinite(arrays.WAVE[index]) && arrays.WAVE[index] > 0;
  return Boolean(arrays.VALID[index]);
}

export function displayPixels(frame, showMasks) {
  const arrays = frame.arraysDecoded;
  const {SCI, VALID, shape:[height,width]} = arrays;
  const restore = showMasks || frame.derived === 'difference';
  const values = restore ? SCI : SCI.slice();
  const valid = restore ? VALID : VALID.slice();
  let masked=0, filled=0;
  for (let i=0; i<SCI.length; i++) {
    if (VALID[i] && Number.isFinite(SCI[i])) continue;
    masked++;
    if (restore || !pixelCovered(arrays,i)) continue;
    const x=i%width, y=Math.floor(i/width);
    let sum=0, weights=0, neighbours=0;
    for (let dy=-2;dy<=2;dy++) for (let dx=-2;dx<=2;dx++) {
      const sx=x+dx,sy=y+dy;
      const distance=dx*dx+dy*dy;
      if (distance===0 || distance>4 || sx<0 || sy<0 || sx>=width || sy>=height) continue;
      const j=sy*width+sx;
      if (!VALID[j] || !Number.isFinite(SCI[j])) continue;
      sum+=SCI[j]/distance;
      weights+=1/distance;
      neighbours++;
    }
    if (neighbours<2) continue;
    values[i]=sum/weights;
    valid[i]=1;
    filled++;
  }
  return {values,valid,masked,filled};
}

export function displayLimits(frame, settings) {
  if (!frame.displayStats) {
    const {SCI,VALID} = frame.arraysDecoded;
    const samples = SCI.filter((value,index)=>VALID[index]&&Number.isFinite(value)).sort();
    const value = fraction => samples[Math.floor((samples.length-1)*fraction)];
    frame.displayStats = {low:value(.01)??0, high:value(settings.upperPercentile??.997)??1, median:value(.5)??0};
  }
  const {low,high,median} = frame.displayStats;
  const background = settings.subtract ? median : 0;
  const lower = settings.lower ?? (settings.subtract ? 0 : low);
  const upper = settings.upper ?? high-background;
  return upper>lower ? {background,lower,upper} : {background,lower:low-background,upper:Math.max(high,low+1)-background};
}

export function alignFrame(frame, grid) {
  const source = frame.arraysDecoded;
  const [height, width] = grid.shape;
  const [sourceHeight, sourceWidth] = source.shape;
  if (width === sourceWidth && height === sourceHeight && gridKeys.every(key => grid.wcs[key] === frame.wcs[key])) {
    frame.wcs = grid.wcs;
    return;
  }

  const output = {shape:grid.shape, VALID:new Uint8Array(width * height)};
  for (const name of ['SCI','WAVE','BAND']) {
    if (source[name]) output[name] = new Float32Array(width * height).fill(NaN);
  }
  for (let i = 0; i < width * height; i++) {
    const sky = pixelToSky(i % width, Math.floor(i / width), grid.wcs);
    const p = skyToPixel(sky.ra_deg, sky.dec_deg, frame.wcs);
    const x = Math.round(p.x), y = Math.round(p.y);
    if (x < 0 || y < 0 || x >= sourceWidth || y >= sourceHeight) continue;
    const nearest = y * sourceWidth + x;
    for (const name of ['WAVE','BAND']) if (output[name]) output[name][i] = source[name][nearest];
    if (!source.VALID[nearest] || !Number.isFinite(source.SCI[nearest])) continue;

    const x0 = Math.floor(p.x), y0 = Math.floor(p.y);
    let sum = 0, weight = 0;
    // The nearest source pixel determines coverage and validity. Only usable
    // neighbours contribute to the interpolated value inside that support.
    for (let sy = y0; sy <= y0+1; sy++) for (let sx = x0; sx <= x0+1; sx++) {
      if (sx < 0 || sy < 0 || sx >= sourceWidth || sy >= sourceHeight) continue;
      const j = sy * sourceWidth + sx;
      if (!source.VALID[j] || !Number.isFinite(source.SCI[j])) continue;
      const w = (1 - Math.abs(p.x - sx)) * (1 - Math.abs(p.y - sy));
      sum += source.SCI[j] * w;
      weight += w;
    }
    output.SCI[i] = weight ? sum / weight : source.SCI[nearest];
    output.VALID[i] = 1;
  }

  const position = frame.target?.position ?? pixelToSky(frame.target.x, frame.target.y, frame.wcs);
  const target = skyToPixel(position.ra_deg, position.dec_deg, grid.wcs);
  const x = Math.round(target.x), y = Math.round(target.y);
  const valid = frame.target.valid && x >= 0 && y >= 0 && x < width && y < height && Boolean(output.VALID[y * width + x]);
  frame.target = {...frame.target, ...target, valid};
  frame.wcs = grid.wcs;
  frame.arraysDecoded = output;
}

function cubic(a,b,c,d,t) {
  return b + .5 * t * (c-a + t * (2*a-5*b+4*c-d + t * (3*(b-c)+d-a)));
}

const smoothed = new Map();

export function bicubicBitmap(source, valid) {
  if (smoothed.has(source)) {
    const previous = smoothed.get(source);
    smoothed.delete(source);
    smoothed.set(source, previous);
    return previous;
  }
  const {width,height} = source;
  const scale = Math.min(4, Math.floor(320 / Math.max(width,height)));
  if (scale < 2) return source;
  const pixels = source.getContext('2d').getImageData(0,0,width,height).data;
  const bitmap = document.createElement('canvas');
  bitmap.width = width*scale;
  bitmap.height = height*scale;
  const context = bitmap.getContext('2d');
  const output = context.createImageData(bitmap.width,bitmap.height);
  const clamp = (value,min,max) => Math.max(min,Math.min(max,value));
  const stencil = (i,size) => {
    const p = (i+.5)/scale-.5, left = Math.floor(p);
    return {t:p-left, points:[-1,0,1,2].map(offset=>clamp(left+offset,0,size-1)), nearest:clamp(Math.round(p),0,size-1)};
  };
  const xs = Array.from({length:bitmap.width},(_,i)=>stencil(i,width));
  const ys = Array.from({length:bitmap.height},(_,i)=>stencil(i,height));
  for (let j=0;j<ys.length;j++) for (let i=0;i<xs.length;i++) {
    const x=xs[i], y=ys[j];
    const outputOffset=(j*bitmap.width+i)*4;
    const nearest=(y.nearest*width+x.nearest)*4;
    if (!valid[(height-1-y.nearest)*width+x.nearest]) {
      output.data.set(pixels.subarray(nearest,nearest+4),outputOffset);
      continue;
    }
    for (let c=0;c<3;c++) {
      const horizontal=y.points.map(row=>{
        const offsets=x.points.map(col=>valid[(height-1-row)*width+col]?(row*width+col)*4:nearest);
        return cubic(pixels[offsets[0]+c],pixels[offsets[1]+c],pixels[offsets[2]+c],pixels[offsets[3]+c],x.t);
      });
      output.data[outputOffset+c]=cubic(horizontal[0],horizontal[1],horizontal[2],horizontal[3],y.t);
    }
    output.data[outputOffset+3]=pixels[nearest+3];
  }
  context.putImageData(output,0,0);
  smoothed.set(source,bitmap);
  if (smoothed.size>10) smoothed.delete(smoothed.keys().next().value);
  return bitmap;
}
