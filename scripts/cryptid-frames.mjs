// Writes the cryptid forest's pixel frames, cursors and icons: the pixel
// theme's own (pixel-theme.css), re-coloured from the reef's palette to the
// forest's (night moss, flashlight amber, foxfire green). Run with
// `node scripts/cryptid-frames.mjs` and paste the output into the generated
// block at the top of cryptid-theme.css.

import { readFileSync } from 'node:fs';

const COLOURS = {
  '%23050d14': '%2306090c', // ink
  '%23f0d8a0': '%23f2c14e', // sand -> flashlight amber
  '%238fe3dc': '%238fd4a0', // foam -> foxfire green
  '%232a1d08': '%231e1404', // text on sand
  '%231d4256': '%2324382e', // line
  '%23e6f1f2': '%23eef0e4', // text
  '%231a3a4c': '%231a2a22',
  '%2324506a': '%2324382e',
  '%232c6680': '%2336503c',
  '%23ffe6b0': '%23ffe9a8',
  '%23fff0cc': '%23fff4cc',
  '%23d8b878': '%23d8a03a',
  '%23c9a96a': '%23a87a24',
  'rgba(4,11,18,0.96)': 'rgba(5,9,8,0.96)',
  'rgba(4,11,18,0.94)': 'rgba(5,9,8,0.94)',
  'rgba(18,48,64,0.95)': 'rgba(28,44,34,0.95)',
  'rgba(12,34,46,0.9)': 'rgba(16,28,22,0.9)',
  'rgba(8,20,30,0.94)': 'rgba(10,18,14,0.94)',
  'rgba(6,15,23,0.9)': 'rgba(8,14,11,0.9)',
};

const css = readFileSync(new URL('../styles/pixel-theme.css', import.meta.url), 'utf8');
const lines = css.split('\n').filter(l => /^ {2}--px-[a-z-]+: url\(/.test(l));
const out = lines.map(l => l.replace(/%23[0-9a-fA-F]{6}|rgba\([0-9,. ]+\)/g, c => COLOURS[c] ?? c));
console.log(out.join('\n'));
