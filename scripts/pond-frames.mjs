// Writes the pond's pixel frames, cursors and icons: the pixel theme's own
// (pixel-theme.css), re-coloured from the reef's palette to the pond's.
// Run with `node scripts/pond-frames.mjs` and paste the output into the
// generated block at the top of pond-theme.css.

import { readFileSync } from 'node:fs';

const COLOURS = {
  '%23050d14': '%230b1a14', // ink
  '%23f0d8a0': '%23f2b8cc', // sand -> lily pink
  '%238fe3dc': '%23a8e08a', // foam -> duckweed
  '%232a1d08': '%233a1222', // text on sand -> text on pink
  '%231d4256': '%232c5a3e', // line
  '%23e6f1f2': '%23eef4e2', // text
  '%231a3a4c': '%23224a32',
  '%2324506a': '%232e6242',
  '%232c6680': '%233c7c52',
  '%23ffe6b0': '%23ffd8e4',
  '%23fff0cc': '%23ffeaf0',
  '%23d8b878': '%23d48aa2',
  '%23c9a96a': '%23c07890',
  'rgba(4,11,18,0.96)': 'rgba(8,20,14,0.96)',
  'rgba(4,11,18,0.94)': 'rgba(8,20,14,0.94)',
  'rgba(18,48,64,0.95)': 'rgba(28,62,42,0.95)',
  'rgba(12,34,46,0.9)': 'rgba(18,44,30,0.9)',
  'rgba(8,20,30,0.94)': 'rgba(12,28,20,0.94)',
  'rgba(6,15,23,0.9)': 'rgba(9,22,16,0.9)',
};

const css = readFileSync(new URL('../pixel-theme.css', import.meta.url), 'utf8');
const lines = css.split('\n').filter(l => /^ {2}--px-[a-z-]+: url\(/.test(l));
const out = lines.map(l => l.replace(/%23[0-9a-fA-F]{6}|rgba\([0-9,. ]+\)/g, c => COLOURS[c] ?? c));
console.log(out.join('\n'));
