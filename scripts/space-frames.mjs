// Writes the space page's pixel frames, cursors and icons: the pixel theme's
// own (pixel-theme.css), re-coloured from the reef's palette to deep space's.
// Run with `node scripts/space-frames.mjs` and paste the output into the
// generated block at the top of space-theme.css.

import { readFileSync } from 'node:fs';

const COLOURS = {
  '%23050d14': '%2304030a', // ink
  '%23f0d8a0': '%23c8b4ff', // sand -> starlight violet
  '%238fe3dc': '%23ec84a0', // foam -> nebula pink
  '%232a1d08': '%2316102e', // text on sand
  '%231d4256': '%23301c5a', // line
  '%23e6f1f2': '%23eef0ff', // text
  '%231a3a4c': '%23211848',
  '%2324506a': '%23301c5a',
  '%232c6680': '%2344226c',
  '%23ffe6b0': '%23e4d8ff',
  '%23fff0cc': '%23f2ecff',
  '%23d8b878': '%239a84e0',
  '%23c9a96a': '%237c68c8',
  'rgba(4,11,18,0.96)': 'rgba(6,5,16,0.96)',
  'rgba(4,11,18,0.94)': 'rgba(6,5,16,0.94)',
  'rgba(18,48,64,0.95)': 'rgba(34,24,72,0.95)',
  'rgba(12,34,46,0.9)': 'rgba(22,18,54,0.9)',
  'rgba(8,20,30,0.94)': 'rgba(10,8,26,0.94)',
  'rgba(6,15,23,0.9)': 'rgba(8,7,22,0.9)',
};

const css = readFileSync(new URL('../pixel-theme.css', import.meta.url), 'utf8');
const lines = css.split('\n').filter(l => /^ {2}--px-[a-z-]+: url\(/.test(l));
const out = lines.map(l => l.replace(/%23[0-9a-fA-F]{6}|rgba\([0-9,. ]+\)/g, c => COLOURS[c] ?? c));
console.log(out.join('\n'));
