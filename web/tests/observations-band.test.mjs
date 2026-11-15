import assert from 'node:assert/strict';
import test from 'node:test';
import {framesInWavelengthWindow, largestSameBand, readWavelengthWindow, writeWavelengthWindow} from '../dist/observations-band.js';

const frame = (detector, wavelength, day) => ({detector, wavelength_center_um: wavelength, time_start_utc: `2025-04-${day}T00:00:00Z`});

test('same-band selection uses one detector, a 0.10 µm span, and date order', () => {
  const early = frame(2, 1.6, '01');
  const middle = frame(2, 1.55, '02');
  const late = frame(2, 1.5, '03');
  const frames = [late, frame(1, 1.55, '04'), middle, early, frame(2, 1.66, '04'), frame(2, null, '04')];
  const group = largestSameBand(frames);
  assert.equal(group.detector, 2);
  assert.equal(group.count, 3);
  assert.deepEqual(group.frames, [early, middle, late]);
  assert.equal(largestSameBand([frame(2, null, '01')]), null);
});

test('wavelength window prefers the reference detector and preserves a shared restriction', () => {
  const other = frame(1, 1.1, '01');
  const preferred = frame(2, 1.15, '02');
  const outside = frame(2, 1.151, '03');
  const frames = [other, preferred, outside];
  const params = new URLSearchParams('wl=1.1&wlw=0.05&wld=2&target=wise-0855');
  const selected = readWavelengthWindow(params);
  assert.deepEqual(framesInWavelengthWindow(frames, selected), [preferred, other]);
  selected.singleDetector = true;
  assert.deepEqual(readWavelengthWindow(writeWavelengthWindow(params, selected)), selected);
  assert.deepEqual(framesInWavelengthWindow(frames, selected), [preferred]);
  assert.equal(writeWavelengthWindow(params, null).toString(), 'target=wise-0855');
  assert.equal(readWavelengthWindow(new URLSearchParams('wl=Infinity&wlw=0.1')), null);
  assert.equal(readWavelengthWindow(new URLSearchParams('wl=1.1&wlw=100')), null);
});
