// CSS is the sole authority for interface colors, including Canvas2D furniture.
export function uiTheme() {
  const s = getComputedStyle(document.documentElement),
    read = (name) => s.getPropertyValue("--" + name).trim();
  return {
    black: read("black"),
    white: read("white"),
    secondary: read("text-2"),
    caption: read("text-3"),
    surface: read("surface-1"),
    raised: read("surface-2"),
    red: read("red"),
    blue: read("blue"),
    link: read("blue-text"),
    line: read("line"),
  };
}
export function pixelGuideGeometry(g, display, shape, point) {
  if (!point || !Number.isFinite(g.scale) || g.scale <= 0) return null;
  const [height, width] = shape,
    x = Math.round(point.x),
    y = Math.round(point.y);
  if (x < 0 || x >= width || y < 0 || y >= height) return null;
  return {
    x,
    y,
    cx: g.width / 2 + (x - display.center_x) * g.scale,
    cy: g.height / 2 - (y - display.center_y) * g.scale,
    vertical: Array.from(
      { length: width + 1 },
      (_, i) => g.width / 2 + (i - 0.5 - display.center_x) * g.scale,
    ).filter((v) => v >= 0 && v <= g.width),
    horizontal: Array.from(
      { length: height + 1 },
      (_, i) => g.height / 2 - (i - 0.5 - display.center_y) * g.scale,
    ).filter((v) => v >= 0 && v <= g.height),
  };
}
export function drawPixelGuide(ctx, g, display, shape, point, theme) {
  const guide = pixelGuideGeometry(g, display, shape, point);
  if (!guide) return;
  ctx.save();
  ctx.strokeStyle = theme.white;
  ctx.lineWidth = 1;
  ctx.globalAlpha = 0.12;
  ctx.beginPath();
  for (const x of guide.vertical) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, g.height);
  }
  for (const y of guide.horizontal) {
    ctx.moveTo(0, y);
    ctx.lineTo(g.width, y);
  }
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.beginPath();
  ctx.moveTo(guide.cx - 10, guide.cy);
  ctx.lineTo(guide.cx + 10, guide.cy);
  ctx.moveTo(guide.cx, guide.cy - 10);
  ctx.lineTo(guide.cx, guide.cy + 10);
  ctx.stroke();
  const label = `PIXEL ${guide.x}, ${guide.y} / PREPARED GRID`;
  ctx.font = '12px "IBM Plex Mono",monospace';
  const width = ctx.measureText(label).width + 16,
    left = Math.max(0, Math.min(g.width - width, guide.cx + 16)),
    top = Math.max(0, Math.min(g.height - 28, guide.cy + 16));
  ctx.fillStyle = theme.black;
  ctx.fillRect(left, top, width, 26);
  ctx.fillStyle = theme.white;
  ctx.fillText(label, left + 8, top + 18);
  ctx.restore();
}
