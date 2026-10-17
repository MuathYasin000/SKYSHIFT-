// Display furniture only. The verified masks and measured arrays stay unchanged.
const paths = new WeakMap(),
  patterns = new WeakMap();
export function excludedCells(mask, shape) {
  const [height, width] = shape,
    cells = [];
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++)
      if (!mask[y * width + x]) cells.push([x, y]);
  return cells;
}
export function drawMaskedPixels(ctx, g, view, shape, mask, theme) {
  let path = paths.get(mask);
  if (!path) {
    path = new Path2D();
    for (const [x, y] of excludedCells(mask, shape)) path.rect(x, y, 1, 1);
    paths.set(mask, path);
  }
  let pattern = patterns.get(ctx);
  if (!pattern) {
    const tile = document.createElement("canvas");
    tile.width = tile.height = 10;
    const t = tile.getContext("2d");
    t.fillStyle = theme.surface;
    t.fillRect(0, 0, 10, 10);
    t.strokeStyle = theme.line;
    t.lineWidth = 1;
    t.beginPath();
    t.moveTo(-2, 2);
    t.lineTo(2, -2);
    t.moveTo(0, 10);
    t.lineTo(10, 0);
    t.moveTo(8, 12);
    t.lineTo(12, 8);
    t.stroke();
    pattern = ctx.createPattern(tile, "repeat");
    patterns.set(ctx, pattern);
  }
  const matrix = ctx.getTransform();
  ctx.save();
  ctx.translate(g.width / 2, g.height / 2);
  ctx.scale(g.scale, -g.scale);
  ctx.translate(-view.center_x - 0.5, -view.center_y - 0.5);
  ctx.clip(path);
  ctx.setTransform(matrix);
  ctx.fillStyle = pattern;
  ctx.fillRect(0, 0, g.width, g.height);
  ctx.restore();
}
export function displayPreview(original) {
  return (
    "./assets/previews/" +
    original
      .split("/")
      .at(-1)
      .replace(/\.png$/, ".webp")
  );
}
