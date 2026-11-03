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

const put = (ctx: CanvasRenderingContext2D, x: number, y: number, col: Rgb) => {
  ctx.fillStyle = `rgb(${col[0]},${col[1]},${col[2]})`;
  ctx.fillRect(x, y, 1, 1);
};

const seededRandom = (seed: number) => {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >> 17;
    s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
};

// --- lily pads and flowers --------------------------------------------------

/** Pad colours: [rim and underside, body, sunlit, veins]: green, yellow-green, old and red-rimmed. */
const PAD_SETS: Rgb[][] = [
  [[30, 74, 38], [58, 122, 54], [92, 156, 70], [44, 98, 46]],
  [[44, 84, 32], [86, 136, 52], [126, 172, 74], [68, 114, 44]],
  [[88, 42, 40], [70, 120, 56], [104, 154, 72], [56, 102, 50]],
];

/**
 * A lily pad seen at the camera's angle: an ellipse r across and r * 0.6
 * deep, a wedge-shaped notch to its centre, veins fanning out, the sunlit
 * side to the upper left, and its rim's edge showing along the bottom.
 */
export const padSprite = (r: number, notch: number, palette: number) =>
  cached(`pond-pad-${r}-${notch}-${palette}`, () => {
    const set = PAD_SETS[palette % PAD_SETS.length];
    const rx = r, rz = Math.max(2, r * 0.6);
    const w = Math.ceil(rx * 2) + 1, h = Math.ceil(rz * 2) + 2;
    const cx = w / 2, cz = (h - 1) / 2;
    const c = makeCanvas(w, h);
    const ctx = c.getContext('2d')!;
    const notchAngle = (notch / 8) * Math.PI * 2;
    const inside = (x: number, y: number) => {
      const nx = (x + 0.5 - cx) / rx, ny = (y + 0.5 - cz) / rz;
      if (nx * nx + ny * ny > 1) return false;
      // The notch: a thin wedge from the centre to the rim.
      const a = Math.atan2(ny, nx);
      let off = Math.abs(a - notchAngle);
      if (off > Math.PI) off = Math.PI * 2 - off;
      return off > 0.22 || nx * nx + ny * ny < 0.04;
    };
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (!inside(x, y)) {
          // The pad's rim, seen just below its lower edge.
          if (y > 0 && inside(x, y - 1) && y - 1 > cz) put(ctx, x, y, set[0]);
          continue;
        }
        const nx = (x + 0.5 - cx) / rx, ny = (y + 0.5 - cz) / rz;
        const edge = !inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1) || !inside(x, y + 1);
        let col = set[1];
        if (nx + ny < -0.7) col = set[2];
        // Veins: a few spokes from the centre.
        const a = Math.atan2(ny, nx) - notchAngle;
        const spoke = Math.abs(Math.sin(a * 3.5)) < 0.12 && nx * nx + ny * ny > 0.12;
        if (spoke) col = set[3];
        if (edge) col = ny > 0.5 ? set[0] : set[3];
        put(ctx, x, y, col);
      }
    }
    return c;
  });

// Designed in pxl (pond.px.js): white petal tips (w), pink petals (p),
// deeper pink (P), a yellow heart (y), and the bud's stalk (G).
const LILY = {
  open: ['....w.w....', '..w.pwp.w..', '.wppPyPppw.', '..pPPPPPp..', '....ppp....'],
  half: ['...w.w...', '..pwpwp..', '..pPyPp..', '...ppp...'],
  bud: ['.w.', 'pwp', 'pPp', '.G.'],
};
const LILY_SETS: Record<string, Rgb>[] = [
  { w: [255, 244, 246], p: [244, 166, 192], P: [216, 112, 143], y: [255, 216, 74], G: [47, 94, 42] },
  { w: [255, 255, 255], p: [236, 236, 226], P: [204, 206, 190], y: [255, 206, 64], G: [47, 94, 42] },
];
/** A water lily: open by day, half open at dusk and dawn, a closed bud at night. Palette 1 is pink, 2 white. */
export const lilySprite = (stage: 'open' | 'half' | 'bud', palette: number) =>
  cached(`pond-lily-${stage}-${palette}`, () => fromRows(LILY[stage], LILY_SETS[(palette - 1) & 1]));

// --- stones, logs and roots -------------------------------------------------

const STONE_COLORS: Rgb[] = [[150, 146, 128], [118, 116, 102], [90, 88, 78], [66, 64, 58]];
const STONE_OUTLINE: Rgb = [40, 40, 34];
const STONE_MOSS: Rgb[] = [[92, 132, 64], [70, 110, 52]];

/** A rounded pond stone lit from the upper left, with moss on top. */
export const stoneSprite = (seed: number, w: number, h: number) =>
  cached(`pond-stone-${seed}-${w}-${h}`, () => {
    const rnd = seededRandom(seed);
    const c = makeCanvas(w, h);
    const ctx = c.getContext('2d')!;
    const lumps = Array.from({ length: 5 }, () => rnd() * 0.2);
    const inside = (x: number, y: number) => {
      const nx = (x + 0.5 - w / 2) / (w / 2);
      const ny = (y + 0.5 - h * 0.55) / (h * 0.55);
      const wobble = lumps[Math.floor(((Math.atan2(ny, nx) + Math.PI) / (Math.PI * 2)) * 5) % 5];
      return y < h && nx * nx + ny * ny <= 1 - wobble;
    };
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (!inside(x, y)) continue;
        const edge = !inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1) || !inside(x, y + 1);
        let col: Rgb;
        if (edge) col = STONE_OUTLINE;
        else {
          const light = (y / h) * 0.8 + (x / w) * 0.3 + (rnd() - 0.5) * 0.2;
          col = STONE_COLORS[Math.max(0, Math.min(3, Math.floor(light * 3.4)))];
          if (y < h * 0.4 && rnd() < 0.18) col = STONE_MOSS[(rnd() * 2) | 0];
        }
        put(ctx, x, y, col);
      }
    }
    return c;
  });

const BARK: Rgb[] = [[132, 100, 64], [104, 76, 48], [78, 56, 36], [52, 38, 26]];
const GRAIN: Rgb[] = [[196, 160, 110], [160, 124, 82]];
const LOG_MOSS: Rgb = [92, 128, 58];

/**
 * A log lying across the page, its cut end on the right: a sunlit top, bark
 * furrows running along it, a dark underside and rings on the end grain.
 */
export const logSprite = (seed: number, len: number) =>
  cached(`pond-log-${seed}-${len}`, () => {
    const rnd = seededRandom(seed);
    const h = 6;
    const c = makeCanvas(len, h);
    const ctx = c.getContext('2d')!;
    const furrows = Array.from({ length: 3 }, () => ({ y: 1 + Math.floor(rnd() * 3), from: Math.floor(rnd() * len * 0.5), to: Math.floor(len * (0.5 + rnd() * 0.45)) }));
    for (let x = 0; x < len - 2; x++) {
      // A gentle taper toward the far (left) end.
      const top = x < 3 ? 1 : 0;
      for (let y = top; y < h; y++) {
        let col = y === top ? BARK[0] : y >= h - 2 ? BARK[3] : y >= h - 3 ? BARK[2] : BARK[1];
        if (furrows.some(f => f.y === y && x >= f.from && x <= f.to)) col = BARK[2];
        if (y === top && rnd() < 0.15) col = LOG_MOSS;
        put(ctx, x, y, col);
      }
    }
    // The cut end: rings of pale wood.
    const ring = ['.ab.', 'abba', 'abba', 'abba', '.ab.', '..'];
    ring.forEach((row, y) => [...row].forEach((ch, k) => {
      const x = len - 3 + k;
      if (x >= len) return;
      if (ch === 'a') put(ctx, x, y, GRAIN[1]);
      else if (ch === 'b') put(ctx, x, y, GRAIN[0]);
    }));
    return c;
  });

const ROOT: Rgb[] = [[92, 66, 42], [62, 44, 30]];
/** A tangle of roots reaching out from a bank, toward the right. */
export const rootSprite = (seed: number) =>
  cached(`pond-root-${seed}`, () => {
    const rnd = seededRandom(seed);
    const w = 16, h = 9;
    const c = makeCanvas(w, h);
    const ctx = c.getContext('2d')!;
    for (let k = 0; k < 4; k++) {
      let x = 0, y = 1 + rnd() * (h - 3);
      const dy = (rnd() - 0.5) * 0.7;
      const len = 7 + rnd() * 8;
      for (let i = 0; i < len && x < w; i++) {
        put(ctx, Math.floor(x), Math.max(0, Math.min(h - 1, Math.floor(y))), ROOT[i < len * 0.5 ? 0 : 1]);
        x += 1;
        y += dy + (rnd() - 0.5) * 0.8;
        // A rootlet off to the side now and then.
        if (rnd() < 0.15) put(ctx, Math.floor(x), Math.max(0, Math.min(h - 1, Math.floor(y + (rnd() < 0.5 ? -1 : 1)))), ROOT[1]);
      }
    }
    return c;
  });

/** Reed colours by kind and shade: [base, stalk, tip]. */
export const REED_COLORS: Record<'reed' | 'cattail' | 'rush', string[][]> = {
  reed: [
    ['rgb(58,104,50)', 'rgb(88,140,62)', 'rgb(160,176,96)'],
    ['rgb(66,110,46)', 'rgb(104,150,66)', 'rgb(176,180,104)'],
    ['rgb(52,96,52)', 'rgb(78,130,64)', 'rgb(140,168,92)'],
  ],
  cattail: [
    ['rgb(56,100,48)', 'rgb(82,134,58)', 'rgb(120,160,76)'],
    ['rgb(62,106,50)', 'rgb(94,142,60)', 'rgb(132,166,80)'],
    ['rgb(50,94,48)', 'rgb(74,124,58)', 'rgb(112,152,76)'],
  ],
  rush: [
    ['rgb(48,92,56)', 'rgb(70,122,64)', 'rgb(150,150,96)'],
    ['rgb(54,98,52)', 'rgb(80,128,62)', 'rgb(168,160,100)'],
    ['rgb(44,88,58)', 'rgb(64,116,68)', 'rgb(140,148,98)'],
  ],
};
/** A cattail's brown head: dark, lit. */
export const CATTAIL_HEAD = ['rgb(96,56,32)', 'rgb(136,84,46)'];
/** Underwater pondweed, by shade: [stalk, leaf]. */
export const WEED_COLORS = [
  ['rgb(40,90,52)', 'rgb(62,122,60)'],
  ['rgb(46,96,44)', 'rgb(74,132,56)'],
  ['rgb(36,84,58)', 'rgb(54,112,70)'],
];
/** Duckweed fronds, three greens. */
export const DUCKWEED = ['rgb(108,168,60)', 'rgb(142,196,76)', 'rgb(80,138,52)'];
