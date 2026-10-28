// Pixel art for the reef. Every sprite is a small canvas at one canvas pixel
// per art pixel, drawn from a character map or generated (rocks, corals),
// and scaled up by the renderer without smoothing.

export type Rgb = [number, number, number];

const css = ([r, g, b]: Rgb, a = 1) => (a === 1 ? `rgb(${r},${g},${b})` : `rgba(${r},${g},${b},${a})`);
const shadeOf = ([r, g, b]: Rgb, k: number): Rgb => [Math.min(255, r * k) | 0, Math.min(255, g * k) | 0, Math.min(255, b * k) | 0];

const makeCanvas = (w: number, h: number) => {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
};

/** Draws a character map; characters missing from `colors` are transparent. */
const fromRows = (rows: string[], colors: Record<string, Rgb>) => {
  const w = rows[0].length;
  const c = makeCanvas(w, rows.length);
  const ctx = c.getContext('2d')!;
  rows.forEach((row, y) => [...row].forEach((ch, x) => {
    const col = colors[ch];
    if (!col) return;
    ctx.fillStyle = css(col);
    ctx.fillRect(x, y, 1, 1);
  }));
  return c;
};

// Creatures drawn facing right (the renderer mirrors them), two frames each.
export type SpriteKind = 'minnow' | 'fry' | 'barracuda' | 'crab' | 'jelly' | 'turtle';

const ROWS: Record<SpriteKind, [string[], string[]]> = {
  // Lit back (D), body (B), belly (L), fins and tail (T), eye (E).
  minnow: [
    ['....DD....', 'T..DBBBB..', 'TTBBBBBBEB', 'T..LLLLB..', '....T.....'],
    ['....DD....', '.T.DBBBB..', '.TTBBBBBEB', '.T.LLLLB..', '....T.....'],
  ],
  fry: [
    ['..DD..', 'TBBBEB', '..LL..'],
    ['T.DD..', '.BBBEB', 'T.LL..'],
  ],
  barracuda: [
    ['.......TT.........', 'T....DDDDDDDD.....', 'TT..BBBBBBBBBBBB..', 'TTTBBBBBBBBBBBBBEB', 'TT..LLLLLLLLLLLB..', 'T.......T.........'],
    ['.......TT.........', '.T...DDDDDDDD.....', '.TT.BBBBBBBBBBBB..', '..TTBBBBBBBBBBBBEB', '.TT.LLLLLLLLLLLB..', '.T......T.........'],
  ],
  // Shell (B), underside (D), claws and legs (T), eyes (E). Legs scuttle.
  crab: [
    ['TT.......TT', 'TT.E...E.TT', '.T.BBBBB.T.', '..BBBBBBB..', '.BDDDDDDDB.', '.T.T...T.T.'],
    ['TT.......TT', 'TT.E...E.TT', '.T.BBBBB.T.', '..BBBBBBB..', '.BDDDDDDDB.', 'T.T.....T.T'],
  ],
  // Bell (B), highlight (D), tentacles (T). Open, then contracted.
  jelly: [
    ['..BBBBB..', '.BDDBBBB.', 'BDBBBBBBB', 'BBBBBBBBB', 'T.T.T.T.T', '.T.T.T.T.', 'T...T...T', '.T.....T.', '..T...T..'],
    ['...BBB...', '..BDBBB..', '.BDBBBBB.', '.BBBBBBB.', '..T.T.T..', '..T.T.T..', '.T..T..T.', '.T..T..T.', 'T...T...T'],
  ],
  // Shell rim (D), shell (B), shell pattern (L), skin and flippers (T), eye (E).
  turtle: [
    ['....DDDDDD......', '..DBLBBLBBLD....', '.DBBLBBLBBLBD.TT', 'TTBBBBBBBBBBBDTE', '.DDDDDDDDDDDD.TT', '..TT......TT....'],
    ['....DDDDDD......', '..DBLBBLBBLD....', '.DBBLBBLBBLBD.TT', '.TBBBBBBBBBBBDTE', '.DDDDDDDDDDDD.TT', '.TT........TT...'],
  ],
};

// [D, B, L, T] per palette.
const MINNOW_PALETTES: Rgb[][] = [
  [[214, 234, 248], [160, 192, 222], [228, 238, 246], [120, 152, 196]],
  [[255, 226, 120], [244, 190, 60], [255, 232, 160], [214, 150, 40]],
  [[255, 178, 150], [244, 118, 92], [255, 200, 176], [210, 90, 74]],
  [[150, 240, 222], [70, 200, 182], [180, 244, 230], [44, 156, 148]],
  [[214, 190, 255], [164, 128, 236], [224, 210, 255], [126, 96, 204]],
];
const PALETTES: Record<SpriteKind, Rgb[][]> = {
  minnow: MINNOW_PALETTES,
  fry: MINNOW_PALETTES,
  barracuda: [
    [[170, 190, 186], [118, 140, 136], [210, 220, 212], [84, 104, 102]],
    [[214, 120, 112], [168, 70, 72], [232, 180, 168], [124, 48, 54]],
  ],
  crab: [
    [[168, 60, 42], [224, 96, 60], [224, 96, 60], [240, 128, 80]],
    [[50, 90, 150], [80, 130, 200], [80, 130, 200], [110, 160, 230]],
  ],
  jelly: [
    [[255, 236, 255], [232, 138, 216], [232, 138, 216], [192, 112, 192]],
    [[236, 250, 255], [138, 208, 240], [138, 208, 240], [96, 160, 210]],
    [[255, 246, 220], [250, 190, 110], [250, 190, 110], [210, 140, 70]],
  ],
  turtle: [
    [[60, 90, 44], [110, 138, 58], [168, 184, 90], [130, 176, 112]],
  ],
};
const EYE: Rgb = [12, 14, 26];

const spriteCache = new Map<string, HTMLCanvasElement>();
const cached = (key: string, make: () => HTMLCanvasElement) => {
  let c = spriteCache.get(key);
  if (!c) { c = make(); spriteCache.set(key, c); }
  return c;
};

/** Washed-out greys for the starving and the dead. */
const pale = ([r, g, b]: Rgb): Rgb => {
  const v = (r + g + b) / 3;
  return [Math.round(v * 0.75 + 40), Math.round(v * 0.72 + 40), Math.round(v * 0.72 + 44)];
};

export const creatureSprite = (kind: SpriteKind, palette: number, frame: number, washed = false) =>
  cached(`${kind}-${palette}-${frame}-${washed}`, () => {
    const set = PALETTES[kind][palette % PALETTES[kind].length].map(c => (washed ? pale(c) : c));
    return fromRows(ROWS[kind][frame], { D: set[0], B: set[1], L: set[2], T: set[3], E: EYE });
  });

// What a picked-clean fish leaves behind, facing right.
const BONES: Record<'minnow' | 'barracuda', string[]> = {
  minnow: ['.b.b.b....', 'bbbbbbbbBK', '.b.b.b....'],
  barracuda: ['..b.b.b.b.b.b.....', 'bbbbbbbbbbbbbbbbBK', '..b.b.b.b.b.b.....'],
};
export const bonesSprite = (kind: 'minnow' | 'barracuda') =>
  cached(`bones-${kind}`, () => fromRows(BONES[kind], { b: [206, 212, 200], B: [226, 230, 220], K: [40, 44, 56] }));

export const bubbleSprite = () =>
  cached('bubble', () => fromRows(['.ww.', 'wH.w', 'w..w', '.ww.'], { w: [170, 224, 250], H: [240, 250, 255] }));

export const pelletSprite = () =>
  cached('pellet', () => fromRows(['ab', 'ba'], { a: [246, 168, 64], b: [206, 120, 40] }));

/** A soft pixel ellipse used for every shadow; drawn with alpha. */
export const shadowSprite = (w: number) =>
  cached(`shadow-${w}`, () => {
    const h = Math.max(2, Math.round(w * 0.35));
    const c = makeCanvas(w, h);
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = 'rgb(4,18,30)';
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const nx = (x + 0.5 - w / 2) / (w / 2);
        const ny = (y + 0.5 - h / 2) / (h / 2);
        if (nx * nx + ny * ny <= 1) ctx.fillRect(x, y, 1, 1);
      }
    }
    return c;
  });

// --- generated scenery ------------------------------------------------------

const seeded = (seed: number) => {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >> 17;
    s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
};

const ROCK_COLORS: Rgb[] = [[134, 150, 160], [104, 120, 134], [80, 94, 110], [58, 70, 86]];
const ROCK_OUTLINE: Rgb = [34, 44, 58];
const MOSS: Rgb[] = [[84, 150, 98], [64, 126, 84]];

/** A lumpy boulder lit from the top left, with an outline and some moss. */
export const rockSprite = (seed: number, w: number, h: number) =>
  cached(`rock-${seed}`, () => {
    const rnd = seeded(seed);
    const c = makeCanvas(w, h);
    const ctx = c.getContext('2d')!;
    const lumps = Array.from({ length: 6 }, () => rnd() * 0.25);
    const inside = (x: number, y: number) => {
      const nx = (x + 0.5 - w / 2) / (w / 2);
      const ny = (y + 0.5 - h * 0.55) / (h * 0.55);
      const angle = Math.atan2(ny, nx);
      const wobble = lumps[Math.floor(((angle + Math.PI) / (Math.PI * 2)) * 6) % 6];
      return y < h && nx * nx + ny * ny <= 1 - wobble;
    };
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (!inside(x, y)) continue;
        const edge = !inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1) || !inside(x, y + 1);
        let col: Rgb;
        if (edge) col = ROCK_OUTLINE;
        else {
          const light = (y / h) * 0.75 + (x / w) * 0.35 + (rnd() - 0.5) * 0.25;
          col = ROCK_COLORS[Math.max(0, Math.min(3, Math.floor(light * 3.2)))];
          if (y < h * 0.4 && rnd() < 0.12) col = MOSS[(rnd() * 2) | 0];
        }
        ctx.fillStyle = css(col);
        ctx.fillRect(x, y, 1, 1);
      }
    }
    return c;
  });

const CORAL_SETS: Rgb[][] = [
  [[255, 150, 170], [226, 104, 136], [176, 70, 110]],
  [[255, 186, 110], [236, 140, 70], [186, 96, 52]],
  [[196, 150, 255], [150, 104, 224], [104, 70, 176]],
  [[255, 120, 110], [214, 80, 84], [160, 52, 66]],
];

/** Either a branching coral or a round brain coral. */
export const coralSprite = (seed: number, w: number, h: number) =>
  cached(`coral-${seed}`, () => {
    const rnd = seeded(seed);
    const set = CORAL_SETS[Math.floor(rnd() * CORAL_SETS.length)];
    const c = makeCanvas(w, h);
    const ctx = c.getContext('2d')!;
    const put = (x: number, y: number, col: Rgb) => {
      if (x < 0 || y < 0 || x >= w || y >= h) return;
      ctx.fillStyle = css(col);
      ctx.fillRect(x | 0, y | 0, 1, 1);
    };

    if (rnd() < 0.5) {
      // Brain coral: a low, wide dome with winding grooves.
      const dome = Math.max(4, Math.round(w * 0.55));
      for (let y = h - dome; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const nx = (x + 0.5 - w / 2) / (w / 2);
          const ny = (y + 0.5 - h) / dome;
          if (nx * nx + ny * ny > 1) continue;
          const groove = Math.sin(x * 1.1 + Math.sin(y * 1.4) * 2.2) > 0.4;
          const edge = nx * nx + ny * ny > 0.8;
          put(x, y, edge ? set[2] : groove ? set[2] : y < h - dome * 0.55 ? set[0] : set[1]);
        }
      }
      return c;
    }

    // Branching coral: limbs that fork as they grow upward.
    const branch = (x: number, y: number, len: number, dx: number, depth: number) => {
      for (let k = 0; k < len; k++) {
        x += dx + (rnd() - 0.5) * 0.6;
        y -= 1;
        put(x, y, set[1]);
        put(x + 1, y, set[2]);
        if (depth < 3 && rnd() < 0.18) branch(x, y, len - k - 1, dx + (rnd() < 0.5 ? -0.5 : 0.5), depth + 1);
      }
      put(x, y - 1, set[0]);
    };
    branch(w / 2, h, h - 2, 0, 0);
    branch(w / 2, h, h * 0.7, -0.35, 1);
    branch(w / 2, h, h * 0.7, 0.35, 1);
    return c;
  });

// --- the seabed -------------------------------------------------------------

/** Seabed colours as seen through the water: sand, rubble, algae. */
export const FLOOR = {
  sandLight: [40, 84, 102] as Rgb,
  sandDark: [20, 48, 68] as Rgb,
  algae: [30, 88, 62] as Rgb,
  algaeDense: [20, 68, 48] as Rgb,
  caustic: [14, 24, 24] as Rgb,
  blood: [104, 10, 22] as Rgb,
};

/**
 * Animated caustic light: tileable frames of bright wandering lines,
 * quantised to a few levels for a pixel look.
 */
export const buildCaustics = (size: number, frames: number) => {
  const out = new Uint8Array(size * size * frames);
  const k = (Math.PI * 2) / size;
  for (let f = 0; f < frames; f++) {
    const t = (f / frames) * Math.PI * 2;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        // Integer frequencies keep the tile seamless; mixed angles keep it organic.
        const a = Math.sin(k * (3 * x + y) + Math.sin(k * (x - 2 * y) + t) * 1.7 + t);
        const b = Math.sin(k * (3 * y - x) + Math.sin(k * (2 * x + y) - t) * 1.7 - t);
        const line = Math.max(0, 1 - Math.abs(a + b) * 2.4);
        out[f * size * size + y * size + x] = Math.round(line * line * line * 4);
      }
    }
  }
  return out;
};

export { css, shadeOf };
