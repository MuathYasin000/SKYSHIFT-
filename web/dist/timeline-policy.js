// Chronological browsing and scientific comparison have different admission rules.
// Every caller receives explicit frame indices; no interpolated epochs are made.
export function timelineFrames(bundle, mode = 'survey') {
  if (mode === 'survey') return bundle.frames.map((_, i) => i);
  if (mode !== 'matched') throw Error('Unknown timeline mode.');
  if (bundle.playback_eligible) return bundle.frames.map((_, i) => i);
  return bundle.matched_frame_indices || [];
}

export function nextTimelineFrame(indices, current, direction = 1, loop = true) {
  if (!indices.length) return null;
  const position = indices.indexOf(current);
  if (position < 0) return direction > 0 ? indices[0] : indices.at(-1);
  const next = position + direction;
  if (next < 0 || next >= indices.length) return loop ? indices[(next + indices.length) % indices.length] : null;
  return indices[next];
}

export function pairIsScreened(bundle, a, b) {
  if (a === b) return false;
  const [i, j] = [a, b].sort((x, y) => x - y);
  return bundle.comparisons.some(c => c.a === i && c.b === j && c.playback_eligible);
}
