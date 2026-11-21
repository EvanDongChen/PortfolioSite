// Writes the sky page's pixel frames, cursors and icons: the pixel theme's
// own (pixel-theme.css), re-coloured from the reef's palette to the sky's
// (porcelain blue, gold and cloud white). Run with `node scripts/sky-frames.mjs`
// and paste the output into the generated block at the top of sky-theme.css.

import { readFileSync } from 'node:fs';

const COLOURS = {
  '%23050d14': '%230e1c3a', // ink
  '%23f0d8a0': '%23f8d052', // sand -> gold
  '%238fe3dc': '%23d0def6', // foam -> cloud
  '%232a1d08': '%232a1a08', // text on sand
  '%231d4256': '%232a5090', // line
  '%23e6f1f2': '%23f6f2e6', // text
  '%231a3a4c': '%231e3c70',
  '%2324506a': '%232a5090',
  '%232c6680': '%233c68b0',
  '%23ffe6b0': '%23fff0a8',
  '%23fff0cc': '%23fff8d0',
  '%23d8b878': '%23e0a42c',
  '%23c9a96a': '%23b0761e',
  'rgba(4,11,18,0.96)': 'rgba(14,28,58,0.96)',
  'rgba(4,11,18,0.94)': 'rgba(14,28,58,0.94)',
  'rgba(18,48,64,0.95)': 'rgba(30,60,112,0.95)',
  'rgba(12,34,46,0.9)': 'rgba(22,44,86,0.9)',
  'rgba(8,20,30,0.94)': 'rgba(16,32,66,0.94)',
  'rgba(6,15,23,0.9)': 'rgba(20,40,78,0.88)',
};

const css = readFileSync(new URL('../styles/pixel-theme.css', import.meta.url), 'utf8');
const lines = css.split('\n').filter(l => /^ {2}--px-[a-z-]+: url\(/.test(l));
const out = lines.map(l => l.replace(/%23[0-9a-fA-F]{6}|rgba\([0-9,. ]+\)/g, c => COLOURS[c] ?? c));
console.log(out.join('\n'));
