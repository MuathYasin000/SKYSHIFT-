export const NARROW_BAND_HALF_WIDTH = 0.05;
const widths = [NARROW_BAND_HALF_WIDTH, 0.1, 0.25];
const wave = frame => frame.wavelength_center_um;
const date = frame => frame.time_start_utc ?? frame.archiveRow?.time_start_utc ?? '';
const byDate = (a, b) => date(a).localeCompare(date(b));
const tolerance = 1e-9;

export function readWavelengthWindow(params) {
  const center = Number(params.get('wl'));
  const halfWidth = Number(params.get('wlw'));
  if (!(center > 0 && center <= 10) || !widths.includes(halfWidth)) return null;
  const requestedDetector = Number(params.get('wld'));
  const detector = Number.isInteger(requestedDetector) && requestedDetector >= 1 && requestedDetector <= 6 ? requestedDetector : null;
  return {center, halfWidth, detector, singleDetector: detector !== null && params.get('wls') === '1'};
}

export function writeWavelengthWindow(params, window) {
  for (const key of ['wl', 'wlw', 'wld', 'wls']) params.delete(key);
  if (!window) return params;
  params.set('wl', window.center);
  params.set('wlw', window.halfWidth);
  if (window.detector !== null) params.set('wld', window.detector);
  if (window.singleDetector) params.set('wls', '1');
  return params;
}

export function framesInWavelengthWindow(frames, window) {
  if (!window) return frames;
  return frames.filter(frame => (!window.singleDetector || frame.detector === window.detector) &&
    Number.isFinite(wave(frame)) && Math.abs(wave(frame) - window.center) <= window.halfWidth + tolerance)
    .sort((a, b) => Number(b.detector === window.detector) - Number(a.detector === window.detector) || byDate(a, b));
}

export function largestSameBand(frames) {
  const detectors = new Map();
  for (const frame of frames) {
    if (!Number.isFinite(wave(frame)) || wave(frame) <= 0) continue;
    if (!detectors.has(frame.detector)) detectors.set(frame.detector, []);
    detectors.get(frame.detector).push(frame);
  }
  let best = null;
  for (const [detector, candidates] of detectors) {
    candidates.sort((a, b) => wave(a) - wave(b) || byDate(a, b));
    for (let first = 0, last = 0; last < candidates.length; last++) {
      while (wave(candidates[last]) - wave(candidates[first]) > 2 * NARROW_BAND_HALF_WIDTH + tolerance) first++;
      const count = last - first + 1;
      const min = wave(candidates[first]), max = wave(candidates[last]);
      if (best && (count < best.count || count === best.count && max - min >= best.max - best.min)) continue;
      best = {detector, count, min, max, first, last, candidates};
    }
  }
  if (!best) return null;
  const {detector, count, min, max, first, last, candidates} = best;
  return {detector, count, min, max, center: (min + max) / 2, frames: candidates.slice(first, last + 1).sort(byDate)};
}
