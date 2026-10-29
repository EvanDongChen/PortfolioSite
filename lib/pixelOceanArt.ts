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
  // Rows may be ragged; shorter ones are padded with transparency.
  const w = Math.max(...rows.map(r => r.length));
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

// Creatures drawn facing right (the renderer mirrors them), as animation frames.
// Roles: D lit back or highlight, B body, L belly or underside, T fins, tail,
// tentacles or spines, E eye, W teeth.
export type SpriteKind =
  | 'minnow' | 'fry' | 'barracuda' | 'crab' | 'jelly' | 'turtle'
  | 'puffer' | 'pufferPuffed' | 'seahorse' | 'urchin' | 'octopus'
  | 'eel' | 'eelHead' | 'shark' | 'manta' | 'angler'
  | 'clownfish' | 'dolphin' | 'shrimp' | 'starfish' | 'cuttlefish';

// A dolphin seen side on, without its tail; the flukes beat up and down.
const DOLPHIN_BODY = [
  '............DD............',
  '...........DDD............',
  '.......DDDDDDDDDDDD.......',
  '....DDBBBBBBBBBBBBBBBD....',
  '...BBBBBBBBBBBBBBBBBBBEBB.',
  '....LLLLLLLLLLLLLLLLLLBBBB',
  '.........LL........L......',
];
const dolphinFrame = (tail: [number, string][]) => {
  const rows = DOLPHIN_BODY.map(r => r.split(''));
  for (const [r, t] of tail) [...t].forEach((ch, i) => { if (ch !== '.') rows[r][i] = ch; });
  return rows.map(r => r.join(''));
};

const ROWS: Record<SpriteKind, string[][]> = {
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
  // Tail and fins flick.
  puffer: [
    ['...DDD...', '..BBBBB..', 'TBBBBBEB.', 'TBLLLLBB.', '..LLLL...'],
    ['...DDD...', '..BBBBB..', '.TBBBBBEB', '.TBLLLLBB', '...LLLL..'],
  ],
  // A spiky ball whose spines wobble.
  pufferPuffed: [
    ['...T.T.T...', '..TDDDDDT..', '.TBBBBBBBT.', 'TBBBBBBBEBT', '.BBBBBBBBB.', 'TLLLLLLLLLT', '.TLLLLLLLT.', '..TLLLLLT..', '...T.T.T...'],
    ['..T.T.T.T..', '.T.DDDDD.T.', '..BBBBBBB..', 'TBBBBBBBEBT', 'TBBBBBBBBBT', '.LLLLLLLLL.', 'TLLLLLLLLLT', '..LLLLLLL..', '.T.T.T.T.T.'],
  ],
  // Upright: the fin flutters and the tail curls; the third frame carries eggs.
  seahorse: [
    ['..DD..', '.DBBE.', '.BBBBB', '..BB..', '.BBBT.', '.BBB..', '..BBB.', '...BB.', '..BB..', '.BB...'],
    ['..DD..', '.DBBE.', '.BBBBB', '..BB..', '.BBB.T', '.BBB..', '..BBB.', '...BB.', '...BB.', '..BBB.'],
    ['..DD..', '.DBBE.', '.BBBBB', '..BB..', '.BBBBT', 'BLLLB.', '.LLLB.', '..BBB.', '...BB.', '..BB..'],
  ],
  // Spines ripple.
  urchin: [
    ['T.T.T.T', '.TBDBT.', 'TBBBBBT', '.TBBBT.', 'T..T..T'],
    ['.T.T.T.', 'T.BDB.T', 'TBBBBBT', 'T.BBB.T', '.T.T.T.'],
  ],
  // Tentacles curl one way, then the other.
  octopus: [
    ['...DDDDDD...', '..DBBBBBBD..', '..BEBBBBEB..', '..BBBBBBBB..', '...LLLLLL...', '..T.T..T.T..', '.T..T..T..T.', 'T...T..T...T', '.T..T..T..T.'],
    ['...DDDDDD...', '..DBBBBBBD..', '..BEBBBBEB..', '..BBBBBBBB..', '...LLLLLL...', '..T..TT..T..', '.T.T....T.T.', '.T..T..T..T.', 'T..T....T..T'],
  ],
  // Laid out straight, for remains and icons; live morays are drawn segment by segment.
  eel: [
    ['..DDDDDDDDDDD...', 'BBBBBBBBBBBBBBEB', '.LLLLLLLLLLLLLL.'],
  ],
  // The head: jaw shut, then gaping with teeth showing.
  eelHead: [
    ['...DDD...', '..DBBBDD.', '.BBBBBBEB', 'BBBBBBBBB', 'BLLLLLLLB', '.LLLLLL..'],
    ['...DDD...', '..DBBBDD.', '.BBBBBBEB', 'BBBBBBW.W', 'BBBBB....', 'BLLLLLW.W', '.LLLLLLL.'],
  ],
  // The tail sweeps through three positions.
  shark: [
    ['............D.............', '...........DD.............', 'T........DDDDDDDD.........', 'TT....BBBBBBBBBBBBBBBB....', 'TTTBBBBBBBBBBBBBBBBBBBBBEB', 'TT....LLLLLLLLLLLLLLLLLB..', 'T........T.......T........'],
    ['............D.............', '...........DD.............', '.T.......DDDDDDDD.........', '.TT...BBBBBBBBBBBBBBBB....', '..TTBBBBBBBBBBBBBBBBBBBBEB', '.TT...LLLLLLLLLLLLLLLLLB..', '.T.......T.......T........'],
    ['............D.............', 'T..........DD.............', 'TT.......DDDDDDDD.........', '.TT...BBBBBBBBBBBBBBBB....', '..TTBBBBBBBBBBBBBBBBBBBBEB', '......LLLLLLLLLLLLLLLLLB..', '.........T.......T........'],
  ],
  // Wings spread, then curled in at the tips (the renderer also flexes them).
  manta: [
    ['..........D.........', '..........DB........', '.........DBB........', '........DBBBB.......', '.......DBBBBBB......', '......DBBBBBBBBB....', 'TT...DBBBBBBBBBBBBD.', 'TTTTTBBBBBBBBBBBBBBE', 'TT...LBBBBBBBBBBBBD.', '......LBBBBBBBBB....', '.......LBBBBBB......', '........LBBBB.......', '.........LBB........', '..........LB........', '..........L.........'],
    ['....................', '....................', '.........DBB........', '........DBBBB.......', '.......DBBBBBB......', '......DBBBBBBBBB....', 'TT...DBBBBBBBBBBBBD.', 'TTTTTBBBBBBBBBBBBBBE', 'TT...LBBBBBBBBBBBBD.', '......LBBBBBBBBB....', '.......LBBBBBB......', '........LBBBB.......', '.........LBB........', '....................', '....................'],
  ],
  // White bands edged in black; the tail flicks.
  clownfish: [
    ['....DD......', 'T..BWBBWB...', 'TTBBWBBWBBEB', 'TTBBWBBWBBBB', 'T..LWLLWL...', '....T.......'],
    ['....DD......', '.T.BWBBWB...', '.TBBWBBWBBEB', '.TBBWBBWBBBB', '.T.LWLLWL...', '....T.......'],
  ],
  // Flukes up, level and down.
  dolphin: [
    dolphinFrame([[2, 'T'], [3, 'TTT'], [4, '.TT']]),
    dolphinFrame([[3, 'T'], [4, 'TTT'], [5, 'T']]),
    dolphinFrame([[4, '.TT'], [5, 'TTT'], [6, 'T']]),
  ],
  // Cleaner shrimp: striped, with long feelers; the legs patter.
  shrimp: [
    ['D.......', '.DBWBBW.', '..BWBBWT', '..L.L.L.'],
    ['.D......', '.DBWBBW.', '..BWBBWT', '...L.L.L'],
  ],
  // Drawn by code (see starfishSprite and cuttleSprite); kept here for the types.
  starfish: [['.']],
  cuttlefish: [['.']],
  // Jaw shut, then hanging open full of teeth. The lure is drawn separately.
  angler: [
    ['...DDDDD.....', '..DBBBBBDD...', '.DBBBBBBBBEB.', 'TBBBBBBBBBBBB', 'TBBBBBBBWBWBW', '.LLLLLLLLLLL.', '..LLLLLLLL...'],
    ['...DDDDD.....', '..DBBBBBDD...', '.DBBBBBBBBEB.', 'TBBBBBBBBB...', 'TBBBBBBBBW.W.', '.LLLLLLLLLW.W', '..LLLLLLLLLL.'],
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
  puffer: [
    [[232, 200, 90], [214, 176, 70], [250, 238, 196], [150, 120, 50]],
    [[200, 206, 210], [170, 180, 186], [236, 240, 240], [90, 100, 110]],
  ],
  pufferPuffed: [],
  seahorse: [
    [[255, 190, 90], [240, 150, 60], [255, 214, 150], [255, 220, 120]],
    [[255, 236, 120], [236, 200, 60], [255, 240, 170], [255, 246, 160]],
    [[255, 170, 200], [226, 110, 150], [255, 200, 220], [255, 190, 210]],
  ],
  urchin: [
    [[200, 150, 230], [90, 50, 120], [90, 50, 120], [150, 90, 190]],
    [[120, 120, 140], [30, 30, 44], [30, 30, 44], [70, 70, 90]],
  ],
  // The second set is its camouflage: the colours of the rocks.
  octopus: [
    [[240, 140, 110], [214, 92, 72], [240, 170, 150], [190, 76, 64]],
    [[150, 166, 170], [104, 120, 134], [134, 150, 160], [80, 94, 110]],
  ],
  eel: [
    [[70, 96, 44], [104, 132, 56], [170, 170, 96], [60, 80, 36]],
  ],
  eelHead: [],
  shark: [
    [[120, 140, 150], [150, 168, 176], [220, 226, 226], [110, 128, 138]],
  ],
  manta: [
    [[40, 50, 70], [70, 84, 110], [200, 206, 214], [50, 60, 80]],
  ],
  angler: [
    [[80, 70, 96], [56, 48, 70], [96, 86, 110], [44, 38, 56]],
  ],
  clownfish: [
    [[34, 24, 24], [255, 122, 30], [255, 170, 80], [236, 104, 28]],
  ],
  dolphin: [
    [[72, 88, 108], [124, 144, 164], [214, 224, 232], [92, 110, 130]],
  ],
  shrimp: [
    [[255, 235, 225], [235, 70, 60], [255, 190, 180], [210, 50, 50]],
  ],
  // [outline, body, arm tips, speckles]
  starfish: [
    [[110, 36, 18], [240, 120, 60], [255, 190, 120], [255, 230, 170]],
    [[60, 22, 72], [172, 82, 204], [232, 162, 242], [250, 222, 255]],
    [[96, 20, 32], [222, 62, 72], [255, 150, 140], [255, 212, 202]],
  ],
  cuttlefish: [
    [[150, 100, 80], [200, 150, 120], [235, 210, 190], [215, 175, 150]],
  ],
};
PALETTES.pufferPuffed = PALETTES.puffer;
PALETTES.eelHead = PALETTES.eel;
const EYE: Rgb = [12, 14, 26];
const TEETH: Rgb = [232, 232, 220];

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

/** A sprite's colours by role: [D, B, L, T]. */
export const creaturePalette = (kind: SpriteKind, palette: number, washed = false) =>
  PALETTES[kind][palette % PALETTES[kind].length].map(c => (washed ? pale(c) : c));

export const creatureSprite = (kind: SpriteKind, palette: number, frame: number, washed = false): HTMLCanvasElement => {
  if (kind === 'starfish') return starfishSprite(palette, 5, 0, frame & 1, washed);
  if (kind === 'cuttlefish') return cuttleSprite(frame, false, washed);
  return cached(`${kind}-${palette}-${frame}-${washed}`, () => {
    const set = PALETTES[kind][palette % PALETTES[kind].length].map(c => (washed ? pale(c) : c));
    const frames = ROWS[kind];
    return fromRows(frames[frame % frames.length], { D: set[0], B: set[1], L: set[2], T: set[3], E: EYE, W: TEETH });
  });
};

/** A sprite filled in one flat colour, for shadows cast from far overhead. */
export const silhouetteSprite = (key: string, img: HTMLCanvasElement, colour = 'rgb(2,10,18)') =>
  cached(`silhouette-${key}`, () => {
    const c = makeCanvas(img.width, img.height);
    const ctx = c.getContext('2d')!;
    ctx.drawImage(img, 0, 0);
    ctx.globalCompositeOperation = 'source-in';
    ctx.fillStyle = colour;
    ctx.fillRect(0, 0, c.width, c.height);
    return c;
  });

// --- hand-made sprites with variants -----------------------------------------

/**
 * A starfish from above, like the other sprites a hand-placed map: lit centre
 * (D), body (B), pale arm tips (L) and speckles (T). Digits mark each arm's
 * cells, so arms a crab has nipped off can be left as stubs.
 */
const STARFISH = [
  ['......L......', '......1......', '.....111.....', '.....1D1.....', 'L555DDDDD222L', '.55BBBTBBB22.', '..5BTBBBTB2..', '...BBBTBBB...', '...4BBBBB3...', '..44.....33..', '.44.......33.', '.L.........L.'],
  ['......L......', '......1......', '.....111.....', 'L....1D1....L', '.555DDDDD222.', '.55BBBTBBB22.', '..5BTBBBTB2..', '...BBBTBBB...', '...4BBBBB3...', '..44.....33..', '.44.......33.', '..L.......L..'],
];
const STAR_MID = { x: 6, y: 6 };

export const starfishSprite = (palette: number, limbs: number, _step: number, curl: number, washed = false) =>
  cached(`star-${palette}-${limbs}-${curl}-${washed}`, () => {
    const [lit, body, tip, speck] = creaturePalette('starfish', palette, washed);
    const rows = STARFISH[curl & 1].map((row, y) => [...row].map((ch, x) => {
      // A missing arm keeps only the stub nearest the body.
      const arm = Number(ch);
      if (arm && arm > limbs && Math.hypot(x - STAR_MID.x, y - STAR_MID.y) > 3.2) return '.';
      if (ch === 'L' && armOfTip(x, y) > limbs) return '.';
      return arm ? 'B' : ch;
    }).join(''));
    return fromRows(rows, { D: lit, B: body, L: tip, T: speck });
  });

/** Which arm a tip cell belongs to: 1 top, then clockwise. */
const armOfTip = (x: number, y: number) => {
  const a = Math.atan2(y - STAR_MID.y, x - STAR_MID.x);
  const turns = ((a + Math.PI / 2) / (Math.PI * 2) + 1) % 1;
  return (Math.round(turns * 5) % 5) + 1;
};

/**
 * A cuttlefish facing right: lit mantle (D), body (B), pale belly (L), fin
 * fringe and arms (T), eye (E). The fringe ripples between two frames.
 */
const CUTTLE = [
  ['..T.T.T.T.T....', '.DDDDDDDDDDD...', 'TBBBBBBBBBBEBTT', 'TBBBBBBBBBBBBT.', '.LLLLLLLLLLL..T', '..T.T.T.T.T....'],
  ['...T.T.T.T.....', '.DDDDDDDDDDD...', 'TBBBBBBBBBBEBT.', 'TBBBBBBBBBBBBTT', '.LLLLLLLLLLL.T.', '...T.T.T.T.....'],
];

/**
 * Cuttlefish frames. Displaying, diagonal bands of its own dark and pale
 * tones roll back along the mantle over four frames.
 */
export const cuttleSprite = (frame: number, display: boolean, washed = false) =>
  cached(`cuttle-${frame % 4}-${display}-${washed}`, () => {
    const [lit, body, belly, fin] = creaturePalette('cuttlefish', 0, washed);
    const band = shadeOfRgb(lit, 0.62);
    const rows = CUTTLE[frame & 1].map((row, y) => [...row].map((ch, x) => {
      if (!display || !'DBL'.includes(ch)) return ch;
      return Math.floor((x + y - (frame % 4) * 2) / 2) % 2 === 0 ? 'S' : 'L';
    }).join(''));
    return fromRows(rows, { D: lit, B: body, L: belly, T: fin, E: EYE, S: band });
  });

const shadeOfRgb = ([r, g, b]: Rgb, k: number): Rgb => [Math.round(r * k), Math.round(g * k), Math.round(b * k)];

/**
 * A whale carcass on its side, head to the right, in four hand-drawn stages:
 * whole, with bites torn from its back, picked to the ribs, and a bare
 * skeleton. Tones as the other sprites: back (D), body (B), belly (L), throat
 * pleats (P), flukes (T), the long pale flipper (F), eye (E), plus raw meat
 * (R), bone (W) and shaded bone (K).
 */
const WHALE = [
  [
    '..................................................',
    'TT.....................DD.........................',
    'TTT.................DDDDDDDDDDDDDDDDDD............',
    '.TTT.............DDDDDDDDDDDDDDDDDDDDDDDDDD.......',
    '..TTT.......DDDDDBBBBBBBBBBBBBBBBBBBBBBBBBDDDD....',
    '...TTT..DDDDBBBBBBBBBBBBBBBBBBBBBBBBBBBBLBBBLBDD..',
    '....TTDDBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBLD.',
    '....TTBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBEBBBBBBBB',
    '....TTBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBDDDDDDDDDDDD',
    '...TTT..LLLLLLBBBBBBBBBBBBBBBBBBLLLLLLLLLLLLLLLLL.',
    '..TTT.......LLLLLLLLLLPPPPPPPPPPPPPPPPPPPPPPPPPP..',
    '.TTT..............LLLLLLLLLLLLLLLLLLLLLLLLLLLLL...',
    'TTT...................PPPPPPPPPPPPPPPPPPPPPPPP....',
    'TT...........FLFFLFFLFFFFFFFLLLLLLLLLLLLLLLLL.....',
    '..........FLFFFFFFFFF.............................',
    '.......FFFFFF.....................................',
  ],
  [
    '..................................................',
    'TT......................R.........................',
    'TTT.....................RRDDR.......RD............',
    '.TTT....................RDDDRR.....RRDDDDDD.......',
    '..TTT.......DDDDDRR...RRBBBBBRRRRRRRBBBBBBDDDD....',
    '...TTT..DDDDBBBBBBBRRRBBBBBBBBBBBBBBBBBBLBBBLBDD..',
    '....TTDDBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBLD.',
    '....TTBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBEBBBBBBBB',
    '....TTBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBDDDDDDDDDDDD',
    '...TTT..LLLLLLBBBBBBBBBBBBBBBBBBLLLLLLLLLLLLLLLLL.',
    '..TTT.......R.RRRLLLLLPPPPPPPPPPPPPPPPPPPPPPPPPP..',
    '.TTT..............LLLLLLLLLLLLLLLLLLLLLLLLLLLLL...',
    'TTT...................PPPPPPPPPPPPPPPPPPPPPPPP....',
    'TT...........FRFFLFFLFFFFFFFLLLLLLLLLLLLLLLLL.....',
    '..........FLFFFFFFFFF.............................',
    '.......FFFFFF.....................................',
  ],
  [
    '..................................................',
    'TT................................................',
    'TTT.................................DD............',
    '.TTT......................R.........RDDDDDD.......',
    '..TTT.........R.....................RBBBBBDDDD....',
    '...TTT..DDDR.................R......RBBBLBBBLBDD..',
    '....TTDDBBBR.K.K.K.K.K.K.K.K.K.K.K.KRBBBBBBBBBBLD.',
    '....TTBBBBBRWWWWWWWWWWWWWWWWWWWWWWWWRBBBBEBBBBBBBB',
    '....TTBBBBBR...W..W..W..W..W..W..W..RBDDDDDDDDDDDD',
    '...TTT..LLLR...W..W..W..W..W..W..W..RLLLLLLLLLLLL.',
    '..TTT..........K..W..W..W..W..W..R..RPPPPPPPPPPP..',
    '.TTT.............KR.W..W..W..K..K...RLLLLLLLLLL...',
    'TTT.................K..R..K.........RPPPPPPPPP....',
    'TT...........FLFFLFFLFFFFFFF........LLLLLLLLL.....',
    '..........FLFFFFFFFFF.............................',
    '.......FFFFFF.....................................',
  ],
  [
    '..................................................',
    '..................................................',
    '..................................................',
    '..................................................',
    'W....................................WWWW.........',
    'WW..................................WKKKKWWW......',
    '.WW.K.K.K.K.K.K.K.K.K.K.K.K.K.K.K.KWKK.KKKKKWWW...',
    '...WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWKKKKKKKKKKKKWWW',
    '.WW............W..W..W..W..W..W..W.WWWWWWWWWWWWWWW',
    'WW.............W..W..W..W..W..W..W.............WW.',
    'W..............K..W..W..W..W..KKKWWWWWWWWWWWWWW...',
    '.................K..W..W..W..K..K.................',
    '....................K..K..K.......................',
    '......................KWKWKWK.....................',
    '...............WKWKWKW............................',
    '.........WKWKWK...................................',
  ],
];
const WHALE_COLORS = {
  D: [52, 64, 86] as Rgb, B: [84, 100, 124] as Rgb, L: [170, 180, 196] as Rgb, P: [118, 132, 154] as Rgb,
  T: [62, 76, 100] as Rgb, F: [196, 204, 214] as Rgb, E: EYE, R: [176, 64, 74] as Rgb,
  W: [228, 224, 206] as Rgb, K: [170, 162, 140] as Rgb,
};

export const whaleSprite = (stage: number) =>
  cached(`whale-${stage}`, () => fromRows(WHALE[Math.max(0, Math.min(3, stage))], WHALE_COLORS));

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
