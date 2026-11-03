// Pixel art for the pond, in the same flat-colour style as the reef's (see
// pixelOceanArt.ts): every sprite is a small canvas at one canvas pixel per
// art pixel, drawn from a character map or generated, and scaled up by the
// renderer without smoothing. The character maps were designed and previewed
// with the pxl pixel-art tool, then brought across by hand.

import { Rgb, cached, fromRows, makeCanvas } from './pixelOceanArt';

export { makeCanvas };

/** The pond bed, the banks and the light, before the water's own tint. */
export const POND_FLOOR = {
  /** Mud and silt on the bed, dark to light. */
  mudDark: [50, 50, 34] as Rgb,
  mudLight: [88, 82, 52] as Rgb,
  /** Pale silt in the shallows, where the sun reaches the bed. */
  silt: [118, 110, 74] as Rgb,
  /** What the bed fades toward at full depth: murky green-black water. */
  deep: [12, 34, 32] as Rgb,
  algae: [64, 106, 44] as Rgb,
  algaeDense: [44, 86, 36] as Rgb,
  /** Turf on the banks, dark to light, with sun-dried tips. */
  grassDark: [52, 94, 44] as Rgb,
  grassLight: [84, 132, 58] as Rgb,
  grassTip: [128, 160, 76] as Rgb,
  /** Damp earth near the water, the wet mud at its edge, and the dark lip where the bank drops in. */
  earth: [96, 76, 48] as Rgb,
  wetMud: [64, 52, 34] as Rgb,
  lip: [30, 30, 22] as Rgb,
  /** The bank's shadow on the water just below it. */
  bankShadow: [20, 32, 26] as Rgb,
  caustic: [18, 28, 14] as Rgb,
};

/** The water surface: its tint over everything below, and its glints. */
export const WATER = {
  sheet: 'rgba(38,104,90,0.26)',
  glint: ['rgb(196,236,214)', 'rgb(140,200,180)'],
};

/** Disturbed water: a splash droplet that shrinks to a fleck. */
const SPLASH = [['.w.', 'wWw', '.w.'], ['...', '.ww', '.w.'], ['...', '.w.', '...']];
export const splashSprite = (frame: number) =>
  cached(`pond-splash-${frame}`, () => fromRows(SPLASH[Math.min(SPLASH.length - 1, frame)], { w: [214, 240, 228], W: [160, 210, 196] }));

/**
 * Animated caustic ripples: tileable frames of bright wandering lines,
 * quantised to a few levels for a pixel look (the reef's, a little wider).
 */
export const buildRipples = (size: number, frames: number) => {
  const out = new Uint8Array(size * size * frames);
  const k = (Math.PI * 2) / size;
  for (let f = 0; f < frames; f++) {
    const t = (f / frames) * Math.PI * 2;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const a = Math.sin(k * (2 * x + y) + Math.sin(k * (x - 2 * y) + t) * 1.5 + t);
        const b = Math.sin(k * (2 * y - x) + Math.sin(k * (2 * x + y) - t) * 1.5 - t);
        const line = Math.max(0, 1 - Math.abs(a + b) * 2.2);
        out[f * size * size + y * size + x] = Math.round(line * line * line * 4);
      }
    }
  }
  return out;
};

/** A tileable frame of ripples as a canvas in one colour, black (or clear) elsewhere. */
export const rippleTile = (ripples: Uint8Array, size: number, frame: number, colour: Rgb, clear: boolean) =>
  cached(`pond-ripple-${frame}-${colour.join(',')}-${clear}`, () => {
    const tile = makeCanvas(size, size);
    const ctx = tile.getContext('2d')!;
    const img = ctx.createImageData(size, size);
    const base = frame * size * size;
    for (let i = 0; i < size * size; i++) {
      const c = ripples[base + i];
      img.data[i * 4] = (colour[0] * c) >> 2;
      img.data[i * 4 + 1] = (colour[1] * c) >> 2;
      img.data[i * 4 + 2] = (colour[2] * c) >> 2;
      img.data[i * 4 + 3] = clear ? (c ? 255 : 0) : 255;
    }
    ctx.putImageData(img, 0, 0);
    return tile;
  });
