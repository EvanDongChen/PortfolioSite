// Pixel art for the pond, in the same flat-colour style as the reef's (see
// pixelOceanArt.ts): every sprite is a small canvas at one canvas pixel per
// art pixel, drawn from a character map or generated, and scaled up by the
// renderer without smoothing. The character maps were designed and previewed
// with the pxl pixel-art tool, then brought across by hand.

import { Rgb, cached, fromRows, makeCanvas } from './pixelOceanArt';
import { SNAG_W, snagShape } from './pond';

export { makeCanvas };

/**
 * The pond bed, the banks and the light, before the water's own tint. A
 * clear spring pond: pale sand in the sunlit shallows going down through
 * jade to a deep cool teal, so the greens of the pads and weeds stand out
 * against the water as the reef's creatures do against its blue.
 */
export const POND_FLOOR = {
  /** The bed seen through the water, shallow to deep, in flat steps. */
  bed: [[150, 150, 104], [126, 146, 100], [98, 140, 102], [68, 128, 104], [44, 108, 98], [30, 88, 88], [22, 68, 74]] as Rgb[],
  algae: [92, 150, 84] as Rgb,
  algaeDense: [70, 132, 76] as Rgb,
  /** Turf on the banks in three soft tones, with sunlit tufts and dark roots. */
  grass: [[54, 104, 60], [70, 124, 66], [92, 146, 74]] as Rgb[],
  grassTip: [132, 178, 92] as Rgb,
  grassRoot: [42, 86, 52] as Rgb,
  /** The deep shade under the bankside trees, toward the page's edges. */
  treeShade: [22, 52, 44] as Rgb,
  /** The shore, from the water up: wet sand, damp earth, then moss before the turf. */
  shore: [[132, 134, 92], [104, 122, 74], [80, 114, 64], [66, 108, 60]] as Rgb[],
  /** The bank's shadow on the water just below it. */
  bankShadow: [30, 78, 74] as Rgb,
  caustic: [40, 58, 44] as Rgb,
  /** Shafts of sunlight slanting down through the water. */
  ray: [30, 40, 26] as Rgb,
  /** Wildflowers in the turf, in drifts of one colour: buttercup, daisy, clover, speedwell and campion. */
  flowers: [[244, 214, 60], [246, 244, 236], [222, 132, 176], [140, 150, 226], [214, 96, 150]] as Rgb[],
  /** Pebbles in the shallows, and fallen leaves sunk on the bed. */
  pebble: [[150, 144, 124], [112, 108, 94]] as Rgb[],
  litter: [[120, 78, 42], [150, 100, 48]] as Rgb[],
};

/** The water surface: its tint over everything below, and its glints. */
export const WATER = {
  sheet: 'rgba(36,126,124,0.16)',
  glint: ['rgb(236,252,246)', 'rgb(170,226,224)'],
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
  [[30, 92, 56], [70, 156, 78], [128, 198, 98], [48, 124, 66]],
  [[52, 104, 44], [112, 170, 66], [168, 212, 102], [82, 142, 56]],
  [[26, 86, 70], [60, 146, 100], [112, 192, 128], [40, 114, 84]],
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
        // No outline: only the near (lower) edge darkens, where the rim turns under.
        if (edge && ny > 0.5) col = set[0];
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
  { w: [255, 246, 160], p: [246, 212, 60], P: [214, 160, 30], y: [184, 116, 30], G: [47, 94, 42] },
];
/** A water lily: open by day, half open at dusk and dawn, a closed bud at night. Palette 1 is pink, 2 white, 3 a yellow pond lily. */
export const lilySprite = (stage: 'open' | 'half' | 'bud', palette: number) =>
  cached(`pond-lily-${stage}-${palette}`, () => fromRows(LILY[stage], LILY_SETS[(palette - 1) % LILY_SETS.length]));

// --- stones, logs and roots -------------------------------------------------

const STONE_COLORS: Rgb[] = [[150, 146, 128], [118, 116, 102], [90, 88, 78], [66, 64, 58]];
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
        // No outline: the edge just takes the shade of its side, darkest underneath.
        if (edge) col = STONE_COLORS[y > h * 0.55 ? 3 : x > w * 0.6 ? 2 : 1];
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

/**
 * A rock standing out of the water: a stone `w` by `h` whose lower rows
 * are under the surface (tinted by the water) below a waterline at `above`,
 * where a lip of foam laps against it (two frames).
 */
export const rockSprite = (seed: number, w: number, h: number, above: number, frame: number) =>
  cached(`pond-rock-${seed}-${w}-${h}-${frame}`, () => {
    const stone = stoneSprite(seed, w, h);
    const c = makeCanvas(w + 4, h + 1);
    const ctx = c.getContext('2d')!;
    ctx.drawImage(stone, 2, 0);
    const img = ctx.getImageData(0, 0, w + 4, h + 1);
    const d = img.data;
    const water: Rgb = [40, 98, 86];
    for (let y = above; y < h + 1; y++) {
      for (let x = 0; x < w + 4; x++) {
        const i = (y * (w + 4) + x) * 4;
        if (!d[i + 3]) continue;
        // Deeper rows fade further into the water.
        const k = Math.min(0.85, 0.45 + (y - above) * 0.12);
        for (let n = 0; n < 3; n++) d[i + n] = Math.round(d[i + n] + (water[n] - d[i + n]) * k);
        d[i + 3] = Math.round(255 * (1 - k * 0.5));
      }
    }
    // Foam at the waterline, a cell out past each side, lapping.
    const rnd = seededRandom(seed + frame * 7);
    let left = -1, right = -1;
    for (let x = 0; x < w + 4; x++) if (d[(above * (w + 4) + x) * 4 + 3]) { if (left < 0) left = x; right = x; }
    if (left >= 0) {
      for (let x = Math.max(0, left - 1); x <= Math.min(w + 3, right + 1); x++) {
        if (x > left + 1 && x < right - 1 && rnd() < 0.5) continue;
        const i = (above * (w + 4) + x) * 4;
        d[i] = 196; d[i + 1] = 232; d[i + 2] = 218; d[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    return c;
  });

const BARK: Rgb[] = [[132, 100, 64], [104, 76, 48], [78, 56, 36], [52, 38, 26]];
const GRAIN: Rgb[] = [[196, 160, 110], [160, 124, 82]];
const LOG_MOSS: Rgb = [92, 128, 58];

/**
 * A log lying across the page, h thick, its cut end on the right: a sunlit
 * top with moss along it, bark furrows running its length, a knot or two
 * where branches were, a dark underside and rings on the end grain.
 */
export const logSprite = (seed: number, len: number, h = 6) =>
  cached(`pond-log-${seed}-${len}-${h}`, () => {
    const rnd = seededRandom(seed);
    const c = makeCanvas(len, h);
    const ctx = c.getContext('2d')!;
    const furrows = Array.from({ length: Math.max(3, h - 2) }, () => ({ y: 1 + Math.floor(rnd() * (h - 3)), from: Math.floor(rnd() * len * 0.5), to: Math.floor(len * (0.5 + rnd() * 0.45)) }));
    const knots = Array.from({ length: Math.floor(len / 22) + 1 }, () => ({ x: 4 + Math.floor(rnd() * (len - 10)), y: 1 + Math.floor(rnd() * Math.max(1, h - 4)) }));
    const moss = Array.from({ length: Math.floor(len / 16) + 1 }, () => ({ from: Math.floor(rnd() * len * 0.8), w: 3 + Math.floor(rnd() * 6) }));
    const end = len - Math.ceil(h * 0.6);
    for (let x = 0; x < end; x++) {
      // A gentle taper toward the far (left) end.
      const top = x < 3 ? 1 : 0;
      for (let y = top; y < h; y++) {
        let col = y === top ? BARK[0] : y >= h - 2 ? BARK[3] : y >= h - 3 ? BARK[2] : y <= top + 1 && h > 6 ? BARK[0] : BARK[1];
        if (furrows.some(f => f.y === y && x >= f.from && x <= f.to)) col = BARK[2];
        if (y <= top + (h > 6 ? 1 : 0) && moss.some(m => x >= m.from && x < m.from + m.w) && rnd() < 0.7) col = LOG_MOSS;
        else if (y === top && rnd() < 0.1) col = LOG_MOSS;
        put(ctx, x, y, col);
      }
    }
    for (const k of knots) {
      if (k.x + 1 >= end) continue;
      put(ctx, k.x, k.y, BARK[3]); put(ctx, k.x + 1, k.y, BARK[2]); put(ctx, k.x, k.y + 1, BARK[2]);
    }
    // The cut end: rings of pale wood in an oval as tall as the log.
    const ew = len - end + 1;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < ew; x++) {
        const nx = (x + 0.5 - ew / 2) / (ew / 2), ny = (y + 0.5 - h / 2) / (h / 2);
        const r2 = nx * nx + ny * ny;
        if (r2 > 1) continue;
        put(ctx, end - 1 + x, y, r2 > 0.6 ? BARK[2] : Math.floor(Math.sqrt(r2) * 4) % 2 ? GRAIN[1] : GRAIN[0]);
      }
    }
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
export const REED_COLORS: Record<'reed' | 'cattail' | 'rush' | 'iris' | 'loosestrife' | 'pickerel' | 'arrowhead', string[][]> = {
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
  // Blue-green sword leaves.
  iris: [
    ['rgb(46,92,70)', 'rgb(70,126,86)', 'rgb(104,150,98)'],
    ['rgb(52,98,66)', 'rgb(80,134,84)', 'rgb(116,158,100)'],
    ['rgb(42,86,72)', 'rgb(64,118,90)', 'rgb(96,142,104)'],
  ],
  loosestrife: [
    ['rgb(58,94,48)', 'rgb(84,118,56)', 'rgb(116,136,66)'],
    ['rgb(64,100,46)', 'rgb(92,124,58)', 'rgb(124,142,70)'],
    ['rgb(54,90,50)', 'rgb(78,112,60)', 'rgb(110,130,70)'],
  ],
  pickerel: [
    ['rgb(50,98,52)', 'rgb(72,132,62)', 'rgb(96,152,72)'],
    ['rgb(56,104,50)', 'rgb(80,138,60)', 'rgb(104,158,70)'],
    ['rgb(46,92,56)', 'rgb(66,124,66)', 'rgb(90,146,76)'],
  ],
  // Arrowhead: the third colour is its broad arrow-shaped leaf.
  arrowhead: [
    ['rgb(56,102,50)', 'rgb(80,136,60)', 'rgb(110,166,74)'],
    ['rgb(62,108,48)', 'rgb(88,142,58)', 'rgb(122,174,78)'],
    ['rgb(52,98,54)', 'rgb(74,130,64)', 'rgb(102,158,80)'],
  ],
};
/** A cattail's brown head: dark, lit. */
export const CATTAIL_HEAD = ['rgb(96,56,32)', 'rgb(136,84,46)'];
/** A yellow flag iris's petals and its darker throat; purple loosestrife's flower spike, two pinks. */
export const IRIS_FLOWER = ['rgb(250,214,60)', 'rgb(206,140,28)'];
export const LOOSESTRIFE_FLOWER = ['rgb(168,78,164)', 'rgb(214,128,200)'];
/** Pickerelweed's spike of blue-violet flowers. */
export const PICKEREL_FLOWER = ['rgb(92,102,206)', 'rgb(140,150,236)'];
/** Underwater weeds by kind (see WEED_KINDS) and shade: [stalk, leaf, tip]. */
export const WEED_COLORS: string[][][] = [
  // Pondweed: broad leaves in pairs.
  [['rgb(44,108,64)', 'rgb(72,148,74)', 'rgb(104,170,82)'], ['rgb(50,114,58)', 'rgb(84,156,70)', 'rgb(118,178,80)'], ['rgb(40,102,68)', 'rgb(64,138,82)', 'rgb(96,164,92)']],
  // Eelgrass: pale ribbons.
  [['rgb(84,138,68)', 'rgb(112,164,80)', 'rgb(150,188,100)'], ['rgb(92,146,64)', 'rgb(122,170,78)', 'rgb(162,196,104)'], ['rgb(78,132,72)', 'rgb(104,156,84)', 'rgb(140,180,100)']],
  // Hornwort: dark and bushy.
  [['rgb(30,90,64)', 'rgb(48,120,76)', 'rgb(80,152,88)'], ['rgb(34,96,60)', 'rgb(54,126,72)', 'rgb(88,158,84)'], ['rgb(28,86,68)', 'rgb(44,114,80)', 'rgb(72,146,92)']],
  // Milfoil: feathery, with red tips.
  [['rgb(56,110,70)', 'rgb(84,144,82)', 'rgb(214,150,96)'], ['rgb(62,116,66)', 'rgb(92,150,78)', 'rgb(226,168,104)'], ['rgb(52,106,74)', 'rgb(78,138,86)', 'rgb(204,140,98)']],
];
/** Floating fronds: duckweed in three greens, then water crowfoot's leaves in two. */
export const DUCKWEED = ['rgb(108,168,60)', 'rgb(142,196,76)', 'rgb(80,138,52)', 'rgb(56,116,58)', 'rgb(82,140,66)'];
/** Water crowfoot's flower: white petals round a yellow heart. */
export const CROWFOOT_FLOWER = ['rgb(250,250,244)', 'rgb(250,212,70)'];

// --- creatures ----------------------------------------------------------------

// Designed in pxl (frog.px.js), facing right; the renderer mirrors them.
// Roles as on the reef: D lit back, B body, L belly, T legs, E eye, o the
// eye's gold ring, S the throat sac; K, k and g a tadpole's head and tail.
export type PondSpriteKind =
  | 'frogSit' | 'frogBlink' | 'frogCroak' | 'frogCrouch' | 'frogLeap' | 'frogSwim0' | 'frogSwim1' | 'frogEyes'
  | 'tad0' | 'tad1' | 'tadLegs0' | 'tadLegs1' | 'tadArms' | 'froglet' | 'frogletBare';

const POND_ROWS: Record<PondSpriteKind, string[]> = {
  frogSit: ['.......TT...', '......ToET..', '...DDDDDDDD.', '.DDBBBBBBBBB', 'DBBBBBBBLLL.', 'DBTTTBBLLL..', '.TTTTTT.T...', 'TT.....TT...'],
  frogBlink: ['.......TT...', '......TTTT..', '...DDDDDDDD.', '.DDBBBBBBBBB', 'DBBBBBBBLLL.', 'DBTTTBBLLL..', '.TTTTTT.T...', 'TT.....TT...'],
  frogCroak: ['.......TT....', '......ToET...', '...DDDDDDDD..', '.DDBBBBBBBBB.', 'DBBBBBBBLSSS.', 'DBTTTBBLSSSSS', '.TTTTTT.SSSS.', 'TT.....TT....'],
  frogCrouch: ['............', '.......TT...', '......ToET..', '...DDDDDDDDD', '.DDBBBBBBBBB', 'DBTTTTBBLLL.', 'TTTTTTTTTT..'],
  frogLeap: ['..........TT..', '.........ToET.', '......DDDDDDDD', 'TT..DDBBBBBBBB', '.TTTBBBBBBLLT.', '...TT..LLL..TT'],
  frogSwim0: ['.........TT..', 'T.......ToET.', '.TT.DDDDDDDDD', '...TBBBBBBBBB', '.TT.BLLLLLLB.', 'T.......T....'],
  frogSwim1: ['.........TT..', '........ToET.', '..TTDDDDDDDDD', '.T.TBBBBBBBBB', '..TTBLLLLLLB.', '......TT.....'],
  frogEyes: ['.oE...oE.', 'DDDDDDDDD'],
  tad0: ['.kk...', 'KKek.g', '.KK.g.'],
  tad1: ['.kk...', 'KKekg.', '.KK..g'],
  tadLegs0: ['.kk....', 'KKekkg.', '.KKT..g', '..T....'],
  tadLegs1: ['.kk...g', 'KKekkg.', '.KKT...', '..T....'],
  tadArms: ['..kk....', 'DKKekkg.', '.TKKT..g', '.T.T....'],
  froglet: ['....TT..', '...ToET.', '..DDDDDD', 'gDBBBBBB', 'gBTTBLL.', '.TT..T..'],
  frogletBare: ['....TT..', '...ToET.', '..DDDDDD', '.DBBBBBB', '.BTTBLL.', '.TT..T..'],
};

/** Frog colourways: [D, B, L, T, o, S]: green, brown (a common frog), olive. */
const FROG_SETS: Rgb[][] = [
  [[140, 207, 90], [79, 154, 60], [230, 220, 138], [58, 116, 48], [201, 166, 74], [242, 238, 188]],
  [[176, 142, 92], [132, 100, 62], [228, 208, 160], [94, 70, 46], [212, 172, 80], [242, 232, 192]],
  [[170, 186, 92], [112, 136, 58], [224, 216, 142], [80, 102, 44], [214, 180, 70], [244, 240, 190]],
];
const TADPOLE: Record<string, Rgb> = { K: [46, 50, 34], k: [96, 104, 66], g: [128, 140, 88], e: [214, 190, 96] };
const POND_EYE: Rgb = [20, 22, 26];

/** Washed-out greys for the starving and the dead (as on the reef). */
const paleOf = ([r, g, b]: Rgb): Rgb => {
  const v = (r + g + b) / 3;
  return [Math.round(v * 0.75 + 40), Math.round(v * 0.72 + 40), Math.round(v * 0.72 + 44)];
};

export const pondSprite = (kind: PondSpriteKind, palette: number, washed = false): HTMLCanvasElement =>
  cached(`pond-${kind}-${palette}-${washed}`, () => {
    const set = FROG_SETS[palette % FROG_SETS.length].map(c => (washed ? paleOf(c) : c));
    const colours: Record<string, Rgb> = {
      D: set[0], B: set[1], L: set[2], T: set[3], o: set[4], S: set[5], E: POND_EYE,
      ...Object.fromEntries(Object.entries(TADPOLE).map(([k, c]) => [k, washed ? paleOf(c) : c])),
    };
    return fromRows(POND_ROWS[kind], colours);
  });

/** A frog's tongue: pink, with a darker sticky tip. */
export const TONGUE = ['rgb(232,120,140)', 'rgb(176,64,90)'];
/** Midges: a dark speck with a glint of wing. */
export const MIDGE = ['rgb(30,34,30)', 'rgb(190,210,200)'];
/** Ripple rings on the surface: light, and lighter. */
export const RING = ['rgb(176,226,206)', 'rgb(214,244,232)'];

/** Frogspawn jelly (pale, paler at the rim) and its eggs, darkening as they develop. */
const JELLY: Rgb[] = [[214, 226, 206], [178, 198, 176]];
const EGG: Rgb[] = [[52, 54, 46], [34, 36, 30], [24, 26, 22]];

/**
 * A clump of frogspawn: a blob of clear jelly packed with eggs. The eggs
 * start as round black dots, stretch into commas as the tadpoles grow
 * inside (stage 0 to 3), and wriggle (the two frames) just before hatching.
 */
export const spawnSprite = (seed: number, stage: number, frame: number) =>
  cached(`pond-spawn-${seed % 8}-${stage}-${frame}`, () => {
    const rnd = seededRandom(seed % 8 + 1);
    const w = 11, h = 7;
    const c = makeCanvas(w, h);
    const ctx = c.getContext('2d')!;
    const inside = (x: number, y: number) => {
      const nx = (x + 0.5 - w / 2) / (w / 2), ny = (y + 0.5 - h / 2) / (h / 2);
      return nx * nx + ny * ny <= 1 - (Math.sin(x * 1.7 + seed) * 0.08);
    };
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (!inside(x, y)) continue;
      const edge = !inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1) || !inside(x, y + 1);
      put(ctx, x, y, JELLY[edge ? 0 : 1]);
    }
    // Eggs on a loose grid inside the jelly.
    const egg = EGG[Math.min(2, stage)];
    for (let y = 1; y < h - 1; y += 2) {
      for (let x = 1 + (y & 2 ? 1 : 0); x < w - 1; x += 2) {
        if (!inside(x, y) || rnd() < 0.15) continue;
        put(ctx, x, y, egg);
        // Growing tadpoles: a tail curling off each egg.
        if (stage >= 1 && x + 1 < w && inside(x + 1, y + (frame ? -1 : 0) + (stage >= 3 ? 1 : 0))) {
          const ty = Math.min(h - 1, Math.max(0, y + (stage >= 3 ? (frame ? -1 : 1) : 0)));
          if (stage >= 2) put(ctx, x + 1, ty, egg);
        }
      }
    }
    return c;
  });

// --- ducks ------------------------------------------------------------------------

// Designed in pxl (duck.px.js, duck2.px.js), facing right. Roles: H head (h its
// sheen), Y bill, W collar, C chest, B body (b its shade), D back and wing, S the
// blue speculum, T tail, E eye, F feet, L the waterline.
export type DuckSpriteKind = 'float' | 'quack' | 'preen' | 'dabble' | 'run' | 'fly0' | 'fly1' | 'duckling' | 'tufted' | 'tuftedDive';
const DUCK_ROWS: Record<DuckSpriteKind, string[]> = {
  float: ['..................hHH....', '.................hHHHH...', '.................HHHEH...', '.................HHHHHYYY', '..................HHH.YY.', '..................WWW....', '..T..........DDDDCCC.....', '.TTT..bBBBBDDDDDDCCCC....', 'TTWTBBBBBBBDDSSDDCCCC....', '.TBBBBBBBBBBBBBBBCCC.....', '..bBBBBBBBBBBBBBBBC......', '...LLLLLLLLLLLLLLL.......'],
  quack: ['..................hHH....', '.................hHHHH...', '.................HHHE.YY.', '.................HHHHHY..', '..................HHH..YY', '..................WWW....', '..T..........DDDDCCC.....', '.TTT..bBBBBDDDDDDCCCC....', 'TTWTBBBBBBBDDSSDDCCCC....', '.TBBBBBBBBBBBBBBBCCC.....', '..bBBBBBBBBBBBBBBBC......', '...LLLLLLLLLLLLLLL.......'],
  preen: ['.........................', '.........................', '...........hHH...........', '.........YhHHHH..........', '..T.....YYHHEHH..CCC.....', '.TTT..bBBHHHHDDDDCCCC....', 'TTWTBBBBBBBDDSSDDCCCC....', '.TBBBBBBBBBBBBBBBCCC.....', '..bBBBBBBBBBBBBBBBC......', '...LLLLLLLLLLLLLLL.......'],
  dabble: ['...T.......', '..TTT......', '..TWT......', '.bBBDD.....', '.BBBDSD....', 'BBBBDSDD...', 'BBBBBDD....', '.BBBBBB.F..', '..LLLLL.FF.'],
  run: ['........DD..........hHH..', '.......DSSD........hHHHH.', '......DDDDD........HHHEH.', '.....DDDDD.........HHHHHYY', '..T..DDDD..........WHH...', '.TTT..bBBBBBBBBBWWCCC....', 'TTWTBBBBBBBBBBBBBCCCC....', '.TBBBBBBBBBBBBBBBCCC.....', '..bBBBBBBBBBBBBBC........', '.....F....F..............', '....FF...FF..............'],
  fly0: ['.........DD...............', '........DSSD..............', '........DDDD..............', '.........DDDD........hHH..', '..........DDD.......hHHHH.', '..T........DD......WHHHEH.', '.TTTbBBBBBBBBBBBBBWWHHHHYY', 'TTWTBBBBBBBBBBBCCCC.......', '.TBBBBBBBBBBBCCC..........', '...FF.....................'],
  fly1: ['...........................', '.....................hHH...', '....................hHHHH..', '...................WHHHEH..', '.TTTbBBBBBBBBBBBBBWWHHHHYY.', 'TTWTBBBBBBBDDDDCCCC........', '.TBBBBBBBDDDSSDCC..........', '...FF.....DDDDD............', '...........DDDD............', '............DD.............'],
  duckling: ['....bb..', '...bbEbo', '..yyyy..', '.yyybyy.', '.yyyyy..'],
  tufted: ['...............KKK..', '..............KKKKK.', '.............KKKKeK.', '.............KKKKKgg', '..............KKK...', '..K.......KKKKK.....', '.KKKKwwwwwwwwKKK....', 'KKKwwwwwwwwwwKK.....', '.KKwwwwwwwwwKK......', '...LLLLLLLLLLL......'],
  tuftedDive: ['..........KKKK.....', 'K....KKKKKKKKKKeKg.', 'KKKKKwwwwwwwwKKKKgg', '.K.KKKKKKKKKKKK....', '...F.....F.........'],
};
/** Mallard drake (0) and hen (1): [H, h, Y, W, C, B, b, D, S, T, L]. */
const DUCK_SETS: Rgb[][] = [
  [[47, 122, 74], [74, 154, 98], [232, 196, 58], [244, 242, 232], [138, 74, 46], [200, 196, 184], [168, 164, 152], [138, 132, 120], [58, 90, 200], [34, 38, 42], [126, 122, 112]],
  [[128, 96, 62], [150, 116, 80], [214, 132, 48], [150, 118, 82], [150, 112, 74], [178, 142, 100], [156, 122, 84], [120, 92, 60], [58, 90, 200], [96, 74, 50], [120, 96, 70]],
];
const DUCK_EXTRA: Record<string, Rgb> = {
  E: [16, 18, 20], F: [232, 137, 42], y: [242, 210, 74], o: [168, 120, 46], b: [106, 74, 34],
  K: [28, 30, 36], w: [238, 240, 238], g: [108, 116, 136], e: [232, 196, 58],
};

export const duckSprite = (kind: DuckSpriteKind, palette: number, washed = false) =>
  cached(`pond-duck-${kind}-${palette}-${washed}`, () => {
    const set = DUCK_SETS[palette % DUCK_SETS.length];
    const roles = ['H', 'h', 'Y', 'W', 'C', 'B', 'b', 'D', 'S', 'T', 'L'];
    const colours: Record<string, Rgb> = { ...DUCK_EXTRA, ...Object.fromEntries(roles.map((r, i) => [r, set[i]])) };
    if (washed) for (const k of Object.keys(colours)) colours[k] = paleOf(colours[k]);
    return fromRows(DUCK_ROWS[kind], colours);
  });

/** A mallard's nest: a ring of grass and twigs on the bank. */
export const nestSprite = () =>
  cached('pond-nest', () => fromRows(['..tTtTtTt..', '.TtgggggtT.', 'tTgggggggTt', '.TtTtTtTtT.'], { t: [120, 92, 54], T: [92, 70, 42], g: [70, 56, 36] }));

// --- fish -------------------------------------------------------------------------

// Designed in pxl (fish.px.js), facing right. Roles: D back, B body, L belly,
// T fins and tail, E eye, P a koi's patches, W a catfish's whiskers, S a pike's spots.
export type FishSpriteKind = 'minnow0' | 'minnow1' | 'fry' | 'koi0' | 'koi1' | 'catfish0' | 'pike0' | 'pike1';
const FISH_ROWS: Record<FishSpriteKind, string[]> = {
  minnow0: ['...DDD...', 'T.DBBBBE.', 'TTBBBBBBB', 'T..LLLL..'],
  minnow1: ['...DDD...', '.TDBBBBE.', '.TBBBBBBB', '.T.LLLL..'],
  fry: ['.DD..', 'TBBBE', '..LL.'],
  koi0: ['........TTT.........', '......DDDDDDDD......', 'T...DDPPPDDDPPDD....', 'TT.BBBPPPBBBBPPBBE..', 'TTTBBBBBBBBBBBBBBBBB', 'TT..LLLLLLLLLLLLLL..', 'T......TT....TT.....'],
  koi1: ['........TTT.........', '......DDDDDDDD......', '....DDPPPDDDPPDD....', '.T.BBBPPPBBBBPPBBE..', 'TTTBBBBBBBBBBBBBBBBB', '.T..LLLLLLLLLLLLLL..', '.......TT....TT.....'],
  catfish0: ['.......TTT.........', 'T...DDDDDDDDDDD....', 'TTDDBBBBBBBBBBBBEW.', 'TTBBBBBBBBBBBBBBBBWW', 'T..LLLLLLLLLLLLL..W.', '.....T......T.......'],
  pike0: ['.....TT..................', 'T...DDDDDDDDDDDDDDD......', 'TT.BBSBBSBBBSBBBSBBBBBE..', 'TTTBBBBBBBBBBBBBBBBBBBBBB', 'TT..LLLLLLLLLLLLLLLLLLL..', 'T......TT.......T........'],
  pike1: ['.....TT..................', '.T..DDDDDDDDDDDDDDD......', '.T.BBSBBSBBBSBBBSBBBBBE..', 'TTTBBBBBBBBBBBBBBBBBBBBBB', '.T..LLLLLLLLLLLLLLLLLLL..', '.......TT.......T........'],
};
/** Colourways by species: [D, B, L, T, P, W, S]. Koi come white with orange patches, or gold. */
const FISH_SETS: Record<string, Rgb[][]> = {
  minnow: [[[70, 92, 80], [168, 184, 170], [226, 232, 220], [110, 130, 112], [0, 0, 0], [0, 0, 0], [0, 0, 0]]],
  koi: [
    [[236, 232, 222], [246, 244, 236], [255, 255, 250], [230, 214, 200], [232, 96, 40], [0, 0, 0], [0, 0, 0]],
    [[222, 158, 48], [242, 188, 70], [255, 228, 150], [232, 168, 80], [255, 238, 196], [0, 0, 0], [0, 0, 0]],
  ],
  catfish: [[[52, 46, 38], [86, 76, 62], [150, 136, 110], [66, 58, 48], [0, 0, 0], [40, 34, 28], [0, 0, 0]]],
  pike: [[[62, 84, 52], [104, 128, 74], [214, 214, 170], [84, 102, 62], [0, 0, 0], [0, 0, 0], [200, 206, 140]]],
};

export const fishSprite = (species: 'minnow' | 'koi' | 'catfish' | 'pike', kind: FishSpriteKind, palette: number, washed = false) =>
  cached(`pond-fish-${species}-${kind}-${palette}-${washed}`, () => {
    const sets = FISH_SETS[species];
    const set = sets[palette % sets.length];
    const colours: Record<string, Rgb> = { E: [16, 18, 20] };
    ['D', 'B', 'L', 'T', 'P', 'W', 'S'].forEach((r, i) => { colours[r] = washed ? paleOf(set[i]) : set[i]; });
    return fromRows(FISH_ROWS[kind], colours);
  });

/** Silt stirred off the bed: two muddy browns. */
export const SILT = ['rgb(104,92,62)', 'rgb(134,120,84)'];


// --- insects, snails, the turtle and the heron -----------------------------------

// Designed in pxl (extras.px.js), facing right.
export type ExtraSpriteKind = 'dfly0' | 'dfly1' | 'strider' | 'snail' | 'turtle' | 'turtleSwim' | 'heronStand' | 'heronStrike' | 'heronFly0' | 'heronFly1';
const EXTRA_ROWS: Record<ExtraSpriteKind, string[]> = {
  dfly0: ['..ww..ww...', '...WW.WW...', 'aaaaaaaAAEE', '...WW.WW...', '..ww..ww...'],
  dfly1: ['...........', '...........', 'aaaaaaaAAEE', '..wwWWwwW..', '...........'],
  strider: ['s.....s', '.sSSSE.', '.s...s.', 's.....s'],
  snail: ['.cCc.', 'cCcCc', 'CcCc.', 'kkkky'],
  turtle: ['....TTTTTT......', '..TtyTtyTtyT....', '.TtttttttttttT..', 'TtytttyttttyttT.kkk', '.kTTTTTTTTTTTkkkkE', '..kk......kk.....'],
  turtleSwim: ['....TTTTTT.......', '..TtyTtyTtyT.....', 'kTtttttttttttTkk.', 'kkTTTTTTTTTTTkkkE', '.k..k.....kk.....'],
  heronStand: ['.......KKK....', '.....KKHHHE...', '.....HHHHHYYYY', '......HHH.....', '.......HH.....', '.......HH.....', '......HHH.....', '.....gHHH.....', '...ggggHH.....', '..GgggggH.....', '.GGgggggg.....', 'KGGgggggg.....', 'K.GGgggg......', '....GgL.......', '.....L........', '.....L........', '.....L........', '....LL........'],
  heronStrike: ['..................', '..................', '..................', '..................', '...gggg...........', '..GgggggHHH.......', '.GGggggggHHHH.....', 'KGGgggggg..HHHH...', 'K.GGgggg.....HHHKK', '....GgL.......HHHE', '.....L.........HYYYY', '.....L............', '.....L............', '....LL............'],
  heronFly0: ['........GGGGG.........', '.......GGGGGGGG.......', '......GGggggggG.......', 'LLLL..ggggggggHHHKK...', '...LLLggggggggHHHHEYYY', '......gggggg..........'],
  heronFly1: ['......................', '......................', '...........KK.........', 'LLLL..ggggggggHHHKK...', '...LLLggggggggHHHHEYYY', '......GggggggG........', '.....GGGGGGGGGG.......', '.......GGGGGG.........'],
};
const EXTRA_COLOURS: Record<string, Rgb> = {
  A: [58, 184, 216], a: [31, 112, 144], w: [216, 240, 244], W: [168, 212, 224], E: [16, 18, 20],
  s: [58, 50, 38], S: [106, 90, 64], c: [200, 180, 138], C: [138, 116, 80], k: [106, 96, 64], y: [200, 180, 90],
  t: [74, 122, 58], T: [46, 84, 40], g: [138, 150, 160], G: [90, 100, 110], H: [216, 220, 216], Y: [232, 196, 58], K: [34, 38, 42], L: [200, 168, 104],
};
/** A red dragonfly (a darter), for variety. */
const RED_DARTER: Record<string, Rgb> = { A: [226, 72, 58], a: [150, 40, 36] };

export const extraSprite = (kind: ExtraSpriteKind, palette = 0, washed = false) =>
  cached(`pond-extra-${kind}-${palette}-${washed}`, () => {
    const colours = { ...EXTRA_COLOURS, ...(palette === 1 ? RED_DARTER : {}) };
    if (washed) for (const k of Object.keys(colours)) colours[k] = paleOf(colours[k]);
    return fromRows(EXTRA_ROWS[kind], colours);
  });

// --- the newer arrivals: beetles, damselflies, the kingfisher, moorhens, butterflies, newts --

// Facing right, as the rest. Each kind has its own colour roles (see WILD_COLOURS).
export type WildSpriteKind =
  | 'whirligig' | 'damselPerch' | 'damsel0' | 'damsel1'
  | 'kfPerch' | 'kfFly0' | 'kfFly1' | 'kfDive'
  | 'moorhen' | 'moorhenBob' | 'moorhenWalk'
  | 'flyOpen' | 'flyHalf' | 'newt0' | 'newt1'
  | 'swallow0' | 'swallow1' | 'swallowGlide' | 'swallowPerch'
  | 'beaverTop' | 'beaverBelow' | 'beaverSit' | 'beaverSlap';
const WILD_ROWS: Record<WildSpriteKind, string[]> = {
  // A whirligig beetle: a glossy black oval.
  whirligig: ['kK.', 'KKK'],
  // A damselfly: a long thin banded body, wings folded over its back at rest, a blur in flight.
  damselPerch: ['....www..', 'adadadAAE'],
  damsel0: ['....ww...', 'adadadAAE', '....ww...'],
  damsel1: ['.....w...', 'adadadAAE', '.....w...'],
  // A kingfisher: blue crown and back, orange cheek and breast, a white neck patch, a long dark bill.
  kfPerch: ['...BBB.....', '..BbBbB....', '..BOOEKKKK.', '..WWOB.....', '..BOOO.....', '.CBOOO.....', 'CCBOoO.....', 'CTB.oo.....', 'T...F......'],
  kfFly0: ['....CbC......', '...CCBC......', 'TTBBBBBBOEKKK', '....OOOOO....'],
  kfFly1: ['.............', '.............', 'TTBBBBBBOEKKK', '...CBBCOOO...', '....CbC......'],
  kfDive: ['TT.....', '.BB....', '..CBO..', '...BOO.', '....BOE', '......K'],
  // A moorhen: slate black with a brown back, a white flank stripe and tail, a red shield and a yellow-tipped bill.
  moorhen: ['.........KK...', '........KKKER.', '........KKKKRY', '.........KK...', 'UU.......KK...', 'UDDDDDDDDKK...', '.KKWWWWKKKK...', '..KKKKKKKK....', '...LLLLLLL....'],
  moorhenBob: ['..............', '..........KK..', '.........KKKER', '.........KKKKRY', 'UU.......KK...', 'UDDDDDDDDKK...', '.KKWWWWKKKK...', '..KKKKKKKK....', '...LLLLLLL....'],
  moorhenWalk: ['.........KK...', '........KKKER.', '........KKKKRY', '.........KK...', 'UU.......KK...', 'UDDDDDDDDKK...', '.KKWWWWKKKK...', '..KKKKKKKK....', '.....G..G.....', '....G..G.G....', '...GG.GG.GG...'],
  // A butterfly from above: wings spread, and half closed.
  flyOpen: ['WW.WW', 'wWBWw', '.W.W.'],
  flyHalf: ['.W.W.', '.WBW.', '.....'],
  // A smooth newt: olive back, orange belly and feet, a long tail.
  newt0: ['....DDDD..', 'TTTDBBBBBE', '.....OO.O.'],
  newt1: ['T...DDDD..', '.TTDBBBBBE', '.....O..O.'],
  // A swallow: glossy blue-black back, long forked tail, red throat, pale belly; wings up, down, and gliding.
  swallow0: ['....B......', '...BB......', 'TT.SSSSSRK.', '.T..WWWW...'],
  swallow1: ['...........', 'TT.SSSSSRK.', '.T.BWWWW...', '...BB......', '....B......'],
  swallowGlide: ['....BB.....', 'TT.SSSSSRK.', '.T.BWWWWB..', '....BB.....'],
  // Perched, wings folded over its back, the long tail streamers hanging behind.
  swallowPerch: ['....SBB..', '...BBBRK.', '..SBBWR..', '.SSBWWW..', 'TTSWWWW..', 'T...KK...'],
  // A beaver, swimming: only its head (a small round ear, a bright eye, a
  // blunt dark nose) and the low curve of its back break the water...
  beaverTop: [
    '..........ab.....',
    '.........aaBBa...',
    '..aaaaa.aBBBBEa..',
    '.aBBBBBBBBBBBBBBN',
    'bbbbbbbbbbbbbbbD.',
  ],
  // ...and the rest of it is a dim shape below: its body, the hind feet
  // kicking, and the broad flat tail trailing behind.
  beaverBelow: [
    '.......aaaaaaaa.......',
    '......aBBBBBBBBaaBB...',
    'tTTTT.bBBBBBBBBBBBBBa.',
    'TTTTTTbBBBBBBBBBBBBBBN',
    '.TTTT..bbbbbbbbbbbbbD.',
    '.......ff......ff.....',
  ],
  // Sitting up on its haunches on the lodge, forepaws to its chest, tail out in front.
  beaverSit: [
    '......ab..',
    '.....aBBa.',
    '....aBBEBa',
    '....aBBBBN',
    '...aBBBbf.',
    '...aBBBb..',
    '..aBBBBbf.',
    '..aBBBBb..',
    'TTTbbbbff.',
  ],
  // Tail flung up, about to crack down on the water as it dives.
  beaverSlap: [
    'tT............',
    'TTt...........',
    '.TTaaa........',
    '..aBBBBaa.....',
    '...bBBBBBBaE..',
    '....bbbbbbbbN.',
  ],
};
// Wet fur: a warm sheen along the top, chestnut, a dark belly; a charcoal tail.
const BEAVER_COLOURS: Record<string, Rgb> = {
  a: [168, 116, 72], B: [122, 80, 48], b: [86, 56, 36], D: [62, 40, 28], E: [20, 14, 12], N: [40, 28, 24],
  T: [70, 66, 68], t: [104, 98, 98], f: [58, 42, 32],
};
/** Damselflies: azure blue, emerald green and red, as [a, d, A, E]. */
const DAMSEL_SETS: Rgb[][] = [
  [[86, 172, 232], [24, 44, 66], [62, 140, 206], [36, 86, 140]],
  [[70, 184, 122], [26, 62, 44], [54, 150, 100], [30, 96, 70]],
  [[220, 72, 60], [70, 24, 24], [190, 56, 50], [120, 36, 36]],
];
/** Butterflies: a small tortoiseshell's orange, a cabbage white, a common blue, a brimstone's yellow, as [W, w]. */
const BUTTERFLY_SETS: Rgb[][] = [
  [[236, 136, 44], [60, 40, 30]],
  [[246, 246, 238], [70, 70, 70]],
  [[110, 142, 236], [206, 218, 250]],
  [[242, 226, 96], [214, 186, 60]],
];
const WILD_COLOURS: Record<string, Rgb> = {
  K: [26, 30, 32], k: [150, 172, 184], w: [222, 238, 246], B: [30, 104, 170], b: [116, 204, 238], C: [60, 176, 220],
  O: [232, 122, 48], o: [192, 88, 36], W: [244, 240, 230], E: [16, 18, 20], F: [214, 70, 60], T: [24, 76, 138],
};
const MOORHEN_COLOURS: Record<string, Rgb> = {
  K: [44, 46, 56], D: [78, 68, 50], W: [232, 230, 222], U: [242, 242, 238], R: [214, 48, 40], Y: [240, 210, 60],
  E: [176, 36, 36], L: [64, 72, 76], G: [172, 190, 64],
};
const SWALLOW_COLOURS: Record<string, Rgb> = {
  B: [34, 48, 96], S: [44, 62, 120], T: [26, 34, 70], R: [186, 64, 44], K: [20, 22, 28], W: [236, 228, 214],
};
const NEWT_COLOURS: Record<string, Rgb> = { D: [86, 84, 56], B: [124, 116, 76], O: [232, 128, 48], T: [104, 98, 66], E: [16, 18, 20] };

export const wildSprite = (kind: WildSpriteKind, palette = 0, washed = false) =>
  cached(`pond-wild-${kind}-${palette}-${washed}`, () => {
    let colours: Record<string, Rgb> = WILD_COLOURS;
    if (kind.startsWith('damsel')) {
      const [a, d, A, E] = DAMSEL_SETS[palette % DAMSEL_SETS.length];
      colours = { a, d, A, E, w: WILD_COLOURS.w };
    } else if (kind.startsWith('fly')) {
      const [W, w] = BUTTERFLY_SETS[palette % BUTTERFLY_SETS.length];
      colours = { W, w, B: [40, 34, 30] };
    } else if (kind.startsWith('moorhen')) colours = MOORHEN_COLOURS;
    else if (kind.startsWith('newt')) colours = NEWT_COLOURS;
    else if (kind.startsWith('swallow')) colours = SWALLOW_COLOURS;
    else if (kind.startsWith('beaver')) colours = BEAVER_COLOURS;
    if (washed) colours = Object.fromEntries(Object.entries(colours).map(([k, c]) => [k, paleOf(c)]));
    return fromRows(WILD_ROWS[kind], colours);
  });

const BOUGH_LEAVES: Rgb[] = [[62, 118, 54], [92, 152, 68], [46, 94, 44]];

/**
 * A bough reaching out over the water from the bank, toward the right: a
 * limb thick at the bank and thinning, level along its outer half where a
 * kingfisher sits (its top at row BOUGH_LIMB), twigs off it, and leaves.
 */
export const BOUGH_HEIGHT = 11;
export const BOUGH_LIMB = 6;
export const boughSprite = (seed: number, len: number) =>
  cached(`pond-bough-${seed}-${len}`, () => {
    const rnd = seededRandom(seed);
    const h = BOUGH_HEIGHT;
    const c = makeCanvas(len, h);
    const ctx = c.getContext('2d')!;
    const leaves: [number, number][] = [];
    for (let x = 0; x < len; x++) {
      const k = x / len;
      const thick = k < 0.25 ? 3 : k < 0.5 ? 2 : 1;
      // Rising a little off the bank, then level, drooping at the very tip.
      const top = k < 0.25 ? BOUGH_LIMB + 1 : k > 0.92 ? BOUGH_LIMB + 1 : BOUGH_LIMB;
      for (let y = top; y < top + thick && y < h; y++) put(ctx, x, y, y === top ? BARK[0] : y === top + thick - 1 ? BARK[3] : BARK[2]);
      // Twigs, up or down, ending in leaves.
      if (x > 2 && x % 4 === (seed & 3) && rnd() < 0.85) {
        const up = rnd() < 0.6;
        const tl = 1 + Math.floor(rnd() * 3);
        for (let t = 1; t <= tl; t++) {
          const tx = x + (t > 1 ? 1 : 0), ty = up ? top - t : top + thick - 1 + t;
          if (ty >= 0 && ty < h && tx < len) put(ctx, tx, ty, BARK[1]);
          if (t === tl) leaves.push([tx, ty]);
        }
      }
      if (k > 0.3 && rnd() < 0.18) leaves.push([x, top - 1]);
    }
    for (const [lx, ly] of leaves) {
      for (let n = 0; n < 5; n++) {
        const x = lx + Math.floor(rnd() * 3) - 1, y = ly + Math.floor(rnd() * 3) - 1;
        if (x >= 0 && x < len && y >= 0 && y < h) put(ctx, x, y, BOUGH_LEAVES[Math.floor(rnd() * 3)]);
      }
    }
    return c;
  });

// --- plants on the land: trees, bushes, ferns, grass, flowers, mushrooms ------------------

/** Leaf colourways, deep shade to sunlit tips: a fresh green, a deep green, an olive and a blossom tree's. */
const LEAF_SETS: Rgb[][] = [
  [[24, 56, 40], [40, 88, 50], [60, 120, 60], [92, 154, 72], [138, 190, 92]],
  [[18, 46, 38], [30, 74, 50], [46, 102, 60], [70, 132, 68], [104, 164, 84]],
  [[34, 58, 34], [58, 90, 46], [86, 122, 56], [118, 152, 68], [160, 184, 90]],
  [[24, 56, 40], [40, 88, 50], [60, 120, 60], [92, 154, 72], [138, 190, 92]],
];
const BLOSSOM: Rgb[] = [[244, 176, 200], [255, 222, 232]];
const TRUNK: Rgb[] = [[64, 46, 32], [94, 68, 44], [124, 94, 62]];
const BERRIES: Rgb[] = [[214, 52, 58], [250, 246, 236], [246, 206, 60], [150, 96, 200]];

/**
 * A rounded mass of leaves lit from the upper left, as a union of lumps:
 * each pixel shaded by the lump it sits most deeply in, so the mass reads
 * as clusters of leaves, darker underneath, with a scatter of bright tips
 * and no outline.
 */
const leafMass = (ctx: CanvasRenderingContext2D, lumps: { x: number; y: number; r: number }[], set: Rgb[], rnd: () => number, w: number, h: number) => {
  const at = (x: number, y: number) => {
    let best = -1, bx = 0, by = 0;
    for (const l of lumps) {
      const dx = (x + 0.5 - l.x) / l.r, dy = (y + 0.5 - l.y) / l.r;
      const k = 1 - Math.hypot(dx, dy);
      if (k > best) { best = k; bx = dx; by = dy; }
    }
    return { inside: best > 0, k: best, nx: bx, ny: by };
  };
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const p = at(x, y);
      if (!p.inside) continue;
      const light = -p.nx * 0.55 - p.ny * 0.75 + (rnd() - 0.5) * 0.35;
      // The underside of the mass falls into the deepest shade.
      const tone = Math.max(p.ny > 0.7 && p.k < 0.2 ? 0 : 1, Math.min(4, Math.round(2.4 + light * 2)));
      put(ctx, x, y, set[tone]);
    }
  }
};

/** A tree from slightly above: its crown of leaf clusters over a short trunk (anchor its trunk's foot). Kind 3 is in blossom. */
export const treeSprite = (seed: number, r: number, kind: number) =>
  cached(`pond-tree-${seed}-${r}-${kind}`, () => {
    const rnd = seededRandom(seed * 7 + r);
    const trunkH = Math.round(r * 0.55) + 2;
    const w = r * 2 + 6, h = r * 2 + trunkH + 2;
    const c = makeCanvas(w, h);
    const ctx = c.getContext('2d')!;
    const cx = w / 2, cy = r + 2;
    // The trunk, a little of it showing below the crown, with a root flare.
    for (let y = cy + r * 0.5; y < h; y++) {
      const flare = y >= h - 1 ? 1 : 0;
      for (let x = Math.floor(cx - 1 - flare); x <= Math.floor(cx + 1 + flare); x++) put(ctx, x, Math.floor(y), x < cx - 0.5 ? TRUNK[2] : x > cx + 0.5 ? TRUNK[0] : TRUNK[1]);
    }
    const lumps = [{ x: cx, y: cy, r: r * 0.82 }];
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2 + rnd() * 0.8;
      lumps.push({ x: cx + Math.cos(a) * r * 0.48, y: cy + Math.sin(a) * r * 0.42, r: r * (0.42 + rnd() * 0.16) });
    }
    leafMass(ctx, lumps, LEAF_SETS[kind % LEAF_SETS.length], rnd, w, h);
    if (kind === 3) {
      // Blossom over the sunlit side.
      for (let n = Math.round(r * r * 0.5); n > 0; n--) {
        const x = Math.floor(cx + (rnd() - 0.6) * r * 1.6), y = Math.floor(cy + (rnd() - 0.6) * r * 1.5);
        const d = ctx.getImageData(x, y, 1, 1).data;
        if (d[3] && d[1] > 70) put(ctx, x, y, BLOSSOM[rnd() < 0.6 ? 0 : 1]);
      }
    }
    return c;
  });

/** A weeping willow: a crown with curtains of pale streamers hanging to the ground. */
export const willowSprite = (seed: number, r: number) =>
  cached(`pond-willow-${seed}-${r}`, () => {
    const rnd = seededRandom(seed * 13 + r);
    const w = r * 2 + 6, h = Math.round(r * 2.4) + 4;
    const c = makeCanvas(w, h);
    const ctx = c.getContext('2d')!;
    const cx = w / 2, cy = r + 1;
    const set: Rgb[] = [[40, 74, 40], [70, 112, 52], [104, 148, 64], [140, 178, 80], [184, 206, 112]];
    for (let y = cy; y < h; y++) for (let x = Math.floor(cx - 1); x <= Math.floor(cx); x++) put(ctx, x, y, TRUNK[x < cx - 0.5 ? 2 : 1]);
    leafMass(ctx, [{ x: cx, y: cy, r: r * 0.9 }, { x: cx - r * 0.45, y: cy + 1, r: r * 0.55 }, { x: cx + r * 0.45, y: cy + 1, r: r * 0.55 }], set, rnd, w, Math.round(cy + r));
    // Streamers falling from the crown's lower half, every other column.
    for (let x = Math.floor(cx - r * 0.95); x <= cx + r * 0.95; x += 1 + (rnd() < 0.3 ? 1 : 0)) {
      const top = cy + Math.sqrt(Math.max(0, (r * 0.9) ** 2 - (x - cx) ** 2)) * 0.6;
      const len = 2 + rnd() * (h - top - 2);
      for (let y = Math.floor(top); y < Math.min(h - 1, top + len); y++) put(ctx, x, y, set[y > top + len * 0.6 ? 4 : 3]);
    }
    return c;
  });

/** A bush: a low mound of leaves, sometimes with berries or flowers dotted over it (variant 0 is plain). */
export const bushSprite = (seed: number, r: number, variant: number) =>
  cached(`pond-bush-${seed}-${r}-${variant}`, () => {
    const rnd = seededRandom(seed * 31 + r);
    const w = r * 2 + 4, h = Math.round(r * 1.6) + 3;
    const c = makeCanvas(w, h);
    const ctx = c.getContext('2d')!;
    const lumps = [{ x: w / 2, y: h - r * 0.8, r: r * 0.85 }];
    for (let k = 0; k < 3; k++) lumps.push({ x: w / 2 + (rnd() - 0.5) * r * 1.2, y: h - r * (0.7 + rnd() * 0.5), r: r * (0.5 + rnd() * 0.2) });
    leafMass(ctx, lumps, LEAF_SETS[seed % 3], rnd, w, h);
    if (variant > 0) {
      for (let n = Math.round(r * 2.2); n > 0; n--) {
        const x = Math.floor(rnd() * w), y = Math.floor(rnd() * h * 0.8);
        const d = ctx.getImageData(x, y, 1, 1).data;
        if (d[3] && d[1] > 60) put(ctx, x, y, BERRIES[(variant - 1) % BERRIES.length]);
      }
    }
    return c;
  });

const FERN: Rgb[] = [[38, 90, 48], [70, 138, 64], [116, 182, 82]];
/** A fern: fronds arching out from the middle, leaflets along each. */
export const fernSprite = (seed: number) =>
  cached(`pond-fern-${seed}`, () => {
    const rnd = seededRandom(seed * 5 + 3);
    const w = 15, h = 9;
    const c = makeCanvas(w, h);
    const ctx = c.getContext('2d')!;
    const fronds = 5 + Math.floor(rnd() * 3);
    for (let f = 0; f < fronds; f++) {
      const a = Math.PI * (0.08 + 0.84 * (f / (fronds - 1))) + (rnd() - 0.5) * 0.2;
      const len = 5 + rnd() * 3;
      for (let t = 0; t <= len; t += 0.5) {
        const x = 7 + Math.cos(Math.PI - a) * t, y = h - 1 - Math.sin(a) * t * 0.9 + (t / len) ** 2 * 2.2;
        const xi = Math.round(x), yi = Math.round(y);
        put(ctx, xi, yi, FERN[t < len * 0.3 ? 0 : 1]);
        // Leaflets either side, brighter toward the tip.
        if (Math.round(t * 2) % 2 === 0 && t > 1) { put(ctx, xi, yi - 1, FERN[t > len * 0.6 ? 2 : 1]); }
      }
    }
    return c;
  });

const BLADE: Rgb[] = [[52, 102, 50], [86, 146, 66], [142, 186, 92]];
const SEED_HEAD: Rgb = [196, 178, 112];
/** A tuft of long grass: blades leaning this way and that, a seed head or two. */
export const grassSprite = (seed: number) =>
  cached(`pond-grass-${seed}`, () => {
    const rnd = seededRandom(seed * 3 + 11);
    const w = 9, h = 10;
    const c = makeCanvas(w, h);
    const ctx = c.getContext('2d')!;
    for (let b = 0; b < 6; b++) {
      const lean = (rnd() - 0.5) * 0.9, len = 4 + rnd() * 5;
      const heads = rnd() < 0.3;
      for (let t = 0; t < len; t++) {
        const x = Math.round(4 + (b - 2.5) * 0.6 + lean * t), y = h - 1 - t;
        put(ctx, x, y, heads && t >= len - 2 ? SEED_HEAD : BLADE[t < 2 ? 0 : t > len - 2 ? 2 : 1]);
      }
    }
    return c;
  });

/** Flower clumps: [petal, centre or shade] for foxgloves, ox-eye daisies, poppies, bluebells and buttercups. */
const FLOWER_SETS: Rgb[][] = [
  [[214, 112, 176], [244, 170, 214]],
  [[250, 250, 244], [246, 206, 60]],
  [[226, 64, 52], [40, 30, 30]],
  [[110, 120, 222], [160, 170, 244]],
  [[248, 214, 52], [255, 240, 140]],
];
/** A clump of flowers on green stems; foxgloves (kind 0) as tall spikes. */
export const flowerSprite = (seed: number, kind: number) =>
  cached(`pond-flowers-${seed}-${kind}`, () => {
    const rnd = seededRandom(seed * 17 + kind);
    const tall = kind === 0;
    const w = 9, h = tall ? 12 : 7;
    const c = makeCanvas(w, h);
    const ctx = c.getContext('2d')!;
    const [petal, heart] = FLOWER_SETS[kind % FLOWER_SETS.length];
    for (let s = 0; s < (tall ? 3 : 5); s++) {
      const x = 1 + Math.floor(rnd() * (w - 2)), top = tall ? 1 + Math.floor(rnd() * 3) : 1 + Math.floor(rnd() * 3);
      for (let y = top; y < h; y++) put(ctx, x, y, BLADE[y > h - 3 ? 0 : 1]);
      if (tall) {
        // A spike of bells, down one side.
        for (let y = top; y < top + 6; y++) put(ctx, x + (y & 1 ? 1 : -1), y, y & 1 ? petal : heart);
        put(ctx, x, top - 1, BLADE[2]);
      } else if (kind === 3) {
        put(ctx, x, top, petal); put(ctx, x + 1, top + 1, petal); put(ctx, x + 1, top + 2, heart);
      } else {
        put(ctx, x - 1, top, petal); put(ctx, x + 1, top, petal); put(ctx, x, top - 1, petal); put(ctx, x, top, heart);
      }
    }
    return c;
  });

/** A few mushrooms: red with white spots, or brown. */
export const mushroomSprite = (seed: number) =>
  cached(`pond-mushrooms-${seed}`, () => {
    const red = seed % 2 === 0;
    const cap: Rgb = red ? [206, 52, 48] : [150, 102, 60], spot: Rgb = red ? [250, 246, 236] : [190, 146, 96];
    return fromRows(['.cc......', 'ccsc..cc.', '.ww..cscc', '.ww...ww.', '......ww.'], { c: cap, s: spot, w: [236, 226, 204] });
  });

// --- standing out of the water: lotus and the snags of a drowned grove -------------------

const LOTUS_LEAF: Rgb[] = [[20, 66, 56], [36, 104, 80], [58, 138, 96], [102, 178, 120]];
const LOTUS_PETAL: Rgb[] = [[214, 96, 140], [244, 150, 182], [255, 214, 228]];
const LOTUS_POD: Rgb[] = [[140, 150, 82], [184, 186, 108], [70, 76, 44]];
/**
 * A lotus: a broad round leaf held up on its stalk (variant 0), a pink
 * flower on a taller one (1), or a seed pod gone over (2). Anchor its foot
 * at the waterline.
 */
export const lotusSprite = (seed: number, variant: number) =>
  cached(`pond-lotus-${seed}-${variant}`, () => {
    const rnd = seededRandom(seed * 19 + variant + 1);
    if (variant === 0) {
      const w = 11 + Math.floor(rnd() * 3), stalk = 2 + Math.floor(rnd() * 3), h = 5 + stalk;
      const c = makeCanvas(w, h);
      const ctx = c.getContext('2d')!;
      const cx = w / 2, cy = 2.5;
      for (let y = 0; y < 5; y++) {
        for (let x = 0; x < w; x++) {
          const nx = (x + 0.5 - cx) / (w / 2), ny = (y + 0.5 - cy) / 2.5;
          const r2 = nx * nx + ny * ny;
          if (r2 > 1) continue;
          // A shallow cup: the rim dark, the far side lit, a pale dimple at the stalk.
          let tone = r2 > 0.72 && ny > 0 ? 1 : nx + ny < -0.3 ? 3 : 2;
          if (Math.abs(nx) < 0.12 && Math.abs(ny) < 0.25) tone = 3;
          put(ctx, x, y, LOTUS_LEAF[tone]);
        }
      }
      for (let y = 5; y < h; y++) put(ctx, Math.floor(cx), y, LOTUS_LEAF[1]);
      return c;
    }
    const stalk = 6 + Math.floor(rnd() * 5);
    const rows = variant === 1
      ? ['..c.c..', '.cbcbc.', 'cbaaabc', '.baYab.', '..aaa..']
      : ['.ppppp.', 'pqpqpqp', '.ppppp.', '..ppp..'];
    const head = fromRows(rows, { a: LOTUS_PETAL[0], b: LOTUS_PETAL[1], c: LOTUS_PETAL[2], Y: [246, 206, 60], p: LOTUS_POD[0], q: LOTUS_POD[2] });
    const c = makeCanvas(7, rows.length + stalk);
    const ctx = c.getContext('2d')!;
    ctx.drawImage(head, 0, 0);
    for (let y = rows.length; y < rows.length + stalk; y++) put(ctx, 3, y, LOTUS_LEAF[1]);
    return c;
  });

const SNAG: Rgb[] = [[58, 56, 52], [96, 92, 84], [138, 132, 120], [180, 174, 160]];
const SNAG_MOSS: Rgb = [84, 120, 62];
/**
 * The bleached snag of a drowned tree, h tall: a trunk lit down its left
 * side, broken off at the top, a bare branch or two, moss at the waterline.
 */
export const snagSprite = (seed: number, h: number) =>
  cached(`pond-snag-${seed}-${h}`, () => {
    const rnd = seededRandom(seed * 23 + h);
    const w = SNAG_W;
    const c = makeCanvas(w, h);
    const ctx = c.getContext('2d')!;
    const cx = 6;
    // Its shape is the pond's (swallows perch on the branch tips).
    const { top, branches } = snagShape(seed, h);
    for (let y = top; y < h; y++) {
      // Thickening down the trunk, flaring at the waterline.
      const thick = y > h - 3 ? 5 : y > h * 0.45 ? 4 : 3;
      for (let k = 0; k < thick; k++) {
        const x = cx - Math.floor(thick / 2) + k;
        const tone = k === 0 ? 3 : k === thick - 1 ? 1 : 2;
        put(ctx, x, y, y > h - 3 && rnd() < 0.6 ? SNAG_MOSS : SNAG[tone]);
      }
    }
    // A jagged break at the top.
    put(ctx, cx, top - 1 < 0 ? 0 : top - 1, SNAG[2]);
    // Bare branches reaching up and out.
    for (const cells of branches) cells.forEach(([x, y], t) => put(ctx, x, y, SNAG[t < cells.length - 1 ? 2 : 1]));
    return c;
  });

/** Wood the beavers have stripped of its bark: pale, from lit to shaded. */
const PEELED: Rgb[] = [[226, 204, 154], [194, 166, 116]];
const MUD: Rgb[] = [[118, 96, 66], [96, 78, 54], [76, 60, 42], [58, 46, 34]];
const DAM_LEAVES: Rgb[] = [[96, 150, 70], [66, 118, 56]];
/** Water spilling over a dam's foot. */
const SPILL: Rgb[] = [[214, 236, 228], [164, 208, 202]];

/** A log lying along a dam, `len` long and three rows thick at row y: lit along the top, its end grain on the right. */
const damLog = (ctx: CanvasRenderingContext2D, x0: number, y: number, len: number, rnd: () => number, w: number) => {
  for (let x = x0; x < x0 + len; x++) {
    if (x < 0 || x >= w) continue;
    const end = x === x0 + len - 1, start = x === x0;
    if (end) {
      put(ctx, x, y, GRAIN[1]); put(ctx, x, y + 1, GRAIN[0]); put(ctx, x, y + 2, GRAIN[1]);
      continue;
    }
    if (!start) put(ctx, x, y, rnd() < 0.18 ? LOG_MOSS : BARK[0]);
    put(ctx, x, y + 1, rnd() < 0.25 ? BARK[2] : BARK[1]);
    put(ctx, x, y + 2, BARK[2]);
  }
};

/**
 * A beaver dam `len` long, its root (by the lodge) on the left: a low bank
 * of mud with logs laid along it in two courses like brickwork, their cut
 * ends showing, twigs and the odd leafy branch along the crest, sloping
 * down to the unfinished tip, and water spilling white at its foot.
 */
export const DAM_HEIGHT = 11;
export const damSprite = (seed: number, len: number) =>
  cached(`pond-dam-${seed}-${len}`, () => {
    const rnd = seededRandom(seed);
    const h = DAM_HEIGHT;
    const c = makeCanvas(len, h);
    const ctx = c.getContext('2d')!;
    // The crest, lower toward the tip.
    const crest = (x: number) => 1 + Math.round(Math.max(0, x - (len - 9)) * 0.5);
    for (let x = 0; x < len; x++) {
      const top = crest(x);
      for (let y = top + 1; y < h - 1; y++) {
        const k = (y - top) / (h - 1 - top);
        put(ctx, x, y, k < 0.3 ? MUD[1] : k < 0.75 ? MUD[2] : MUD[3]);
      }
      if (top + 1 < h - 1) put(ctx, x, top + 1, MUD[0]);
      // Water spilling over the foot.
      const r = rnd();
      if (r < 0.5) put(ctx, x, h - 1, SPILL[r < 0.2 ? 0 : 1]);
    }
    // Two courses of logs, the upper set back from the tip.
    for (const [row, from, stop] of [[2, 0, len - 6], [5, -4 - Math.floor(rnd() * 4), len - 2]] as [number, number, number][]) {
      let x = from;
      while (x < stop) {
        const l = Math.min(stop - x, 7 + Math.floor(rnd() * 8));
        if (l >= 4) damLog(ctx, x, row + Math.max(0, crest(x + l) - 1), l, rnd, len);
        x += l + 1;
      }
    }
    // Twigs along the crest, and a leafy branch here and there.
    for (let x = 2; x < len - 2; x += 3 + Math.floor(rnd() * 4)) {
      const top = crest(x) + 1;
      const lean = rnd() < 0.5 ? -1 : 1;
      const tone = rnd() < 0.3 ? PEELED[1] : BARK[1];
      put(ctx, x, top, tone);
      put(ctx, x + lean, top - 1, tone);
      if (rnd() < 0.35) { put(ctx, x + lean * 2, top - 1, DAM_LEAVES[0]); put(ctx, x + lean, top - 2 < 0 ? 0 : top - 2, DAM_LEAVES[1]); }
    }
    return c;
  });

/**
 * A beaver lodge, w wide and about half as tall: a heap of logs and sticks
 * leaning together, plastered with mud, lit from the upper left, a few cut
 * ends showing low down, peeled sticks poking from its top, and wet at the
 * waterline.
 */
export const lodgeSprite = (seed: number, w: number) =>
  cached(`pond-lodge-${seed}-${w}`, () => {
    const rnd = seededRandom(seed);
    const h = Math.round(w * 0.55);
    const c = makeCanvas(w, h + 2);
    const ctx = c.getContext('2d')!;
    const cx = w / 2, base = h;
    // A rounded heap: a cone with its shoulders filled out.
    const shape = (x: number, y: number) => {
      const nx = (x + 0.5 - cx) / (w / 2), ny = (base - y) / h;
      return ny >= 0 && ny <= 1 && Math.abs(nx) <= Math.pow(1 - ny, 0.6);
    };
    const light = (x: number, y: number) => {
      const nx = (x + 0.5 - cx) / (w / 2), ny = (base - y) / h;
      return ny * 0.8 - nx * 0.55;
    };
    for (let y = 0; y <= base; y++) {
      for (let x = 0; x < w; x++) {
        if (!shape(x, y)) continue;
        const l = light(x, y) + (rnd() - 0.5) * 0.2;
        put(ctx, x, y, y >= base - 1 ? MUD[3] : l > 0.45 ? MUD[0] : l > 0 ? MUD[1] : MUD[2]);
      }
    }
    // Sticks and small logs leaning up the heap, each lit along its top.
    for (let k = Math.round(w * 1.6); k > 0; k--) {
      const x0 = Math.floor(rnd() * w), y0 = Math.floor(rnd() * base);
      if (!shape(x0, y0)) continue;
      // Leaning with the slope: up to the right on the left side, down to the right on the right.
      const dir = x0 < cx ? -1 : 1;
      const len = 3 + Math.floor(rnd() * 5);
      const l = light(x0, y0);
      const top = l > 0.4 ? BARK[0] : l > -0.1 ? BARK[1] : BARK[2];
      const under = l > 0.4 ? BARK[1] : BARK[3];
      let x = x0, y = y0;
      for (let t = 0; t < len; t++) {
        if (shape(x, y)) put(ctx, x, y, top);
        if (shape(x, y + 1) && y + 1 < base - 1) put(ctx, x, y + 1, under);
        x += 1;
        if (t % 2 === 1) y += dir;
      }
    }
    // Cut ends of the logs low down.
    for (let k = Math.max(2, Math.round(w / 8)); k > 0; k--) {
      const x = 2 + Math.floor(rnd() * (w - 5)), y = base - 2 - Math.floor(rnd() * h * 0.4);
      if (!shape(x, y) || !shape(x + 1, y + 1)) continue;
      put(ctx, x, y, GRAIN[0]); put(ctx, x + 1, y, GRAIN[1]); put(ctx, x, y + 1, GRAIN[1]); put(ctx, x + 1, y + 1, BARK[2]);
    }
    // Peeled sticks poking from the top.
    for (let k = 2 + Math.floor(rnd() * 2); k > 0; k--) {
      const x = Math.floor(cx + (rnd() - 0.5) * w * 0.35);
      let top = 0;
      while (top < base && !shape(x, top)) top++;
      const lean = rnd() < 0.5 ? -1 : 1;
      put(ctx, x, top, PEELED[1]);
      if (top > 0) put(ctx, x + lean, top - 1, PEELED[0]);
    }
    // The water lapping round its foot.
    for (let x = 0; x < w; x++) if (shape(x, base) && rnd() < 0.55) put(ctx, x, base + 1, SPILL[rnd() < 0.4 ? 0 : 1]);
    return c;
  });

/** How many directions a towed log is drawn in. */
export const LOG_ANGLES = 16;
/**
 * A log seen from above as a beaver tows it, pointing `step` sixteenths of
 * a turn round from the right (toward the beaver), its length along the
 * page's rows foreshortened as it lies flat: lit along its upper side,
 * furrowed bark, moss, and its cut end trailing.
 */
export const towedLogSprite = (seed: number, len: number, step: number, foreshorten: number) =>
  cached(`pond-towlog-${seed}-${len}-${step}`, () => {
    const rnd = seededRandom(seed);
    const a = (step / LOG_ANGLES) * Math.PI * 2;
    const dx = Math.cos(a), dy = Math.sin(a) * foreshorten;
    const r = (len >= 50 ? 9 : len >= 38 ? 7 : 5) / 2;
    const w = Math.ceil(Math.abs(dx) * len + r * 2 + 2), h = Math.ceil(Math.abs(dy) * len + r * 2 + 2);
    const c = makeCanvas(w, h);
    const ctx = c.getContext('2d')!;
    const x0 = w / 2 - (dx * len) / 2, y0 = h / 2 - (dy * len) / 2;
    const L = Math.hypot(dx * len, dy * len);
    const ux = (dx * len) / L, uy = (dy * len) / L;
    // Its upper side (or, pointing straight up or down the page, its left) is the lit one.
    let nx = -uy, ny = ux;
    if (ny > 0 || (ny === 0 && nx > 0)) { nx = -nx; ny = -ny; }
    const furrow = Array.from({ length: Math.ceil(L) + 1 }, () => rnd());
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const px = x + 0.5 - x0, py = y + 0.5 - y0;
        const t = px * ux + py * uy;
        const s = px * nx + py * ny;
        if (t < 0 || t > L || Math.abs(s) > r) continue;
        let col: Rgb;
        if (t < 1.2) col = Math.abs(s) < r * 0.5 ? GRAIN[0] : GRAIN[1];
        else if (s > r * 0.4) col = furrow[Math.floor(t)] < 0.15 ? LOG_MOSS : BARK[0];
        else if (s < -r * 0.55) col = BARK[3];
        else col = furrow[Math.floor(t)] < 0.3 ? BARK[2] : BARK[1];
        put(ctx, x, y, col);
      }
    }
    return c;
  });

// --- events -------------------------------------------------------------------------

/** A mayfly nymph on a stem, and a mayfly splitting out of it (pale wings up). */
export const nymphSprite = (emerging: boolean) =>
  cached(`pond-nymph-${emerging}`, () => fromRows(
    emerging ? ['.w.', 'ww.', 'nN.', 'nN.', '.n.'] : ['nN', 'nN', '.n'],
    { n: [96, 78, 50], N: [130, 106, 70], w: [236, 232, 210] },
  ));
/** A mayfly in flight (wings up, long tails), and a spent one lying flat on the water. */
export const mayflySprite = (spent: boolean) =>
  cached(`pond-mayfly-${spent}`, () => fromRows(
    spent ? ['.w.w.', 'tmmmw', '.w.w.'] : ['..w.', '..ww', 'tmmm'],
    { m: [220, 206, 150], w: [244, 242, 230], t: [170, 156, 110] },
  ));
/** Night and dusk: the colours laid over the whole pond. */
export const SKY = { night: 'rgb(4,10,28)', dusk: 'rgb(255,150,60)', dawn: 'rgb(255,170,170)', rain: 'rgb(30,40,46)' };
/** Fireflies: the glow and the bright core. */
export const FIREFLY = ['rgb(200,255,120)', 'rgb(255,255,210)'];
export const RAIN = 'rgb(190,220,226)';

// --- icons ---------------------------------------------------------------------------

/** Each species' (or frog life stage's) own sprite, for the census and the debug panel. */
export const pondIcon = (kind: string): HTMLCanvasElement => {
  switch (kind) {
    case 'spawn': return spawnSprite(3, 1, 0);
    case 'tadpole': return pondSprite('tad0', 0);
    case 'backLegs': return pondSprite('tadLegs0', 0);
    case 'fourLegs': return pondSprite('tadArms', 0);
    case 'froglet': return pondSprite('froglet', 0);
    case 'frog': case 'adult': return pondSprite('frogSit', 0);
    case 'mallard': return duckSprite('float', 0);
    case 'tufted': return duckSprite('tufted', 0);
    case 'minnow': return fishSprite('minnow', 'minnow0', 0);
    case 'koi': return fishSprite('koi', 'koi0', 0);
    case 'catfish': return fishSprite('catfish', 'catfish0', 0);
    case 'pike': return fishSprite('pike', 'pike0', 0);
    case 'dragonfly': return extraSprite('dfly0', 0);
    case 'strider': return extraSprite('strider');
    case 'snail': return extraSprite('snail');
    case 'turtle': return extraSprite('turtle');
    case 'heron': return extraSprite('heronStand');
    case 'whirligig': return wildSprite('whirligig');
    case 'damselfly': return wildSprite('damselPerch', 0);
    case 'kingfisher': return wildSprite('kfPerch');
    case 'moorhen': return wildSprite('moorhen');
    case 'butterfly': return wildSprite('flyOpen', 0);
    case 'newt': return wildSprite('newt0');
    case 'swallow': return wildSprite('swallowGlide');
    case 'beaver': return wildSprite('beaverSit');
    default: return pondSprite('frogSit', 0);
  }
};
