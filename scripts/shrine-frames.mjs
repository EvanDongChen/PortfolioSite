// Writes the shrine forest's pixel frames, cursors and icons: the pixel theme's
// own (pixel-theme.css), re-coloured from the reef's palette to the shrine's.
// Run with `node scripts/shrine-frames.mjs` and paste the output into the
// generated block at the top of shrine-theme.css.

import { readFileSync } from 'node:fs';

const COLOURS = {
  '%23050d14': '%230a1022', // ink
  '%23f0d8a0': '%23ffc978', // sand -> lantern gold
  '%238fe3dc': '%23ff8a5c', // foam -> vermilion glow
  '%232a1d08': '%232a1408', // text on sand
  '%231d4256': '%233a2c52', // line
  '%23e6f1f2': '%23f4efe2', // text
  '%231a3a4c': '%232e2444',
  '%2324506a': '%233e2f5c',
  '%232c6680': '%23543e74',
  '%23ffe6b0': '%23ffe2ac',
  '%23fff0cc': '%23fff2d0',
  '%23d8b878': '%23e0a058',
  '%23c9a96a': '%23c98a48',
  'rgba(4,11,18,0.96)': 'rgba(10,14,32,0.96)',
  'rgba(4,11,18,0.94)': 'rgba(10,14,32,0.94)',
  'rgba(18,48,64,0.95)': 'rgba(44,32,72,0.95)',
  'rgba(12,34,46,0.9)': 'rgba(30,24,56,0.9)',
  'rgba(8,20,30,0.94)': 'rgba(14,16,38,0.94)',
  'rgba(6,15,23,0.9)': 'rgba(12,14,32,0.9)',
};

const css = readFileSync(new URL('../pixel-theme.css', import.meta.url), 'utf8');
const lines = css.split('\n').filter(l => /^ {2}--px-[a-z-]+: url\(/.test(l));
const out = lines.map(l => l.replace(/%23[0-9a-fA-F]{6}|rgba\([0-9,. ]+\)/g, c => COLOURS[c] ?? c));
console.log(out.join('\n'));
