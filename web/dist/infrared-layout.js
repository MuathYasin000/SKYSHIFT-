// Presentation helpers. These never transform scientific coordinates or pixels.
export const CHANNEL_COUNT = 102;
export function channelColor(index) {
  const t =
    Math.max(0, Math.min(CHANNEL_COUNT - 1, index)) / (CHANNEL_COUNT - 1);
  const stops = [
    [28, 60, 139],
    [64, 124, 185],
    [235, 183, 89],
    [246, 109, 45],
    [229, 57, 61],
    [190, 60, 139],
  ];
  const x = t * (stops.length - 1),
    a = Math.min(stops.length - 2, Math.floor(x)),
    f = x - a;
  return `rgb(${stops[a].map((v, i) => Math.round(v + (stops[a + 1][i] - v) * f)).join(",")})`;
}
export function overlaps(a, b, gap = 8) {
  return (
    a.left < b.right + gap &&
    a.right > b.left - gap &&
    a.top < b.bottom + gap &&
    a.bottom > b.top - gap
  );
}
// Prioritise selected/nearby labels, then search bounded screen-space offsets.
// The accessible destination list retains every object when a label cannot fit.
export function placeLabels(items, obstacles, width, height) {
  const occupied = [...obstacles],
    result = [];
  const sorted = [...items].sort(
    (a, b) =>
      Number(Boolean(b.selected)) - Number(Boolean(a.selected)) ||
      a.distance - b.distance ||
      a.id.localeCompare(b.id),
  );
  for (const item of sorted) {
    let chosen = null;
    if (item.visible)
      for (const dy of [18, -24, 60, -66, 102, -108]) {
        const r = {
          left: item.x - item.width / 2,
          right: item.x + item.width / 2,
          top: item.y + dy,
          bottom: item.y + dy + item.height,
        };
        if (
          r.left < 8 ||
          r.right > width - 8 ||
          r.top < 82 ||
          r.bottom > height - 74 ||
          occupied.some((o) => overlaps(r, o))
        )
          continue;
        chosen = r;
        occupied.push(r);
        break;
      }
    result.push({
      ...item,
      hidden: !chosen,
      left: chosen?.left,
      top: chosen?.top,
      opacity: item.selected ? 1 : Math.max(0.62, 1 - item.distance / 400),
    });
  }
  return result;
}
