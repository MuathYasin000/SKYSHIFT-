// Read-only explanation of the recorded screen; never changes its decision.
export function spectralScreenCopy(check) {
  if(check?.code!=='local_spectral_screen')return null;
  const m=check.measurements;
  if(!Number.isFinite(m?.max_separation_bandwidths)||!Number.isFinite(m?.threshold))return null;
  return `Maximum wavelength separation ${m.max_separation_bandwidths.toFixed(3)} of the bandwidth, threshold ${m.threshold} (provisional engineering choice, not a NASA standard).`;
}
