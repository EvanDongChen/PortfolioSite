// Writes the hot pot page's chopstick cursors: a pair held open over food, and
// pinched shut for a moment when you click it. Pixel art in 2px blocks, wood
// with a lacquered band, edged dark like the pixel theme's other cursors.
// Run with `node scripts/hotpot-cursors.mjs` and paste the output into the
// chopstick cursor rules in hotpot-theme.css.

const SIZE = 14;
const INK = '%232a0a04', WOOD = '%23e8a850', GRAIN = '%23c07a30', LACQUER = '%23d0302a';

/** The cells of a line from (x0, y0) to (x1, y1). */
const line = (x0, y0, x1, y1) => {
  const out = [];
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
  for (let i = 0; i <= n; i++) out.push([Math.round(x0 + ((x1 - x0) * i) / n), Math.round(y0 + ((y1 - y0) * i) / n)]);
  return out;
};

/** Two sticks from their butts at the top right to their tips; returns the data URI and the tip (the hotspot). */
const cursor = (tipA, tipB) => {
  const grid = new Map();
  const sticks = [line(13, 0, ...tipA), line(13, 2, ...tipB)];
  for (const stick of sticks) stick.forEach(([x, y], i) => grid.set(`${x},${y}`, i < 3 ? LACQUER : i % 3 === 0 ? GRAIN : WOOD));
  // A dark edge round them, so they show on any colour.
  const edge = new Map();
  for (const key of grid.keys()) {
    const [x, y] = key.split(',').map(Number);
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const k = `${x + dx},${y + dy}`;
      if (!grid.has(k) && x + dx >= 0 && y + dy >= 0 && x + dx < SIZE && y + dy < SIZE) edge.set(k, INK);
    }
  }
  const rects = [...edge, ...grid].map(([k, c]) => { const [x, y] = k.split(',').map(Number); return `%3Crect x='${x * 2}' y='${y * 2}' width='2' height='2' fill='${c}'/%3E`; });
  const uri = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='${SIZE * 2}' height='${SIZE * 2}' shape-rendering='crispEdges'%3E${rects.join('')}%3C/svg%3E")`;
  return { uri, hot: [tipA[0] * 2 + 1, tipA[1] * 2 + 1] };
};

const open = cursor([1, 9], [5, 13]);
const shut = cursor([2, 12], [3, 13]);
console.log(`  --hp-chop-open: ${open.uri};`);
console.log(`  --hp-chop-shut: ${shut.uri};`);
console.log(`/* hotspots: open ${open.hot.join(' ')}, shut ${shut.hot.join(' ')} */`);
