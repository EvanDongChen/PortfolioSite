// Writes the hot pot page's pixel frames, cursors and icons: the pixel theme's
// own (pixel-theme.css), re-coloured from the reef's palette to the hot pot's.
// Run with `node scripts/hotpot-frames.mjs` and paste the output into the
// generated block at the top of hotpot-theme.css.

import { readFileSync } from 'node:fs';

const COLOURS = {
  '%23050d14': '%231e0406', // ink
  '%23f0d8a0': '%23ffcc6a', // sand -> oil gold
  '%238fe3dc': '%23f07824', // foam -> chili orange
  '%232a1d08': '%232a0a04', // text on sand
  '%231d4256': '%23801a0e', // line
  '%23e6f1f2': '%23fff4e0', // text
  '%231a3a4c': '%234a0c0a',
  '%2324506a': '%23801a0e',
  '%232c6680': '%23a02612',
  '%23ffe6b0': '%23ffe0a0',
  '%23fff0cc': '%23fff2d0',
  '%23d8b878': '%23e0a040',
  '%23c9a96a': '%23c08030',
  'rgba(4,11,18,0.96)': 'rgba(24,4,4,0.96)',
  'rgba(4,11,18,0.94)': 'rgba(24,4,4,0.94)',
  'rgba(18,48,64,0.95)': 'rgba(96,18,12,0.95)',
  'rgba(12,34,46,0.9)': 'rgba(70,12,10,0.9)',
  'rgba(8,20,30,0.94)': 'rgba(36,6,6,0.94)',
  'rgba(6,15,23,0.9)': 'rgba(30,5,5,0.9)',
};

const css = readFileSync(new URL('../styles/pixel-theme.css', import.meta.url), 'utf8');
const lines = css.split('\n').filter(l => /^ {2}--px-[a-z-]+: url\(/.test(l));
const out = lines.map(l => l.replace(/%23[0-9a-fA-F]{6}|rgba\([0-9,. ]+\)/g, c => COLOURS[c] ?? c));
console.log(out.join('\n'));
