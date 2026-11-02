// Pixel art for the reef. Every sprite is a small canvas at one canvas pixel
// per art pixel, drawn from a character map or generated (rocks, corals),
// and scaled up by the renderer without smoothing.

export type Rgb = [number, number, number];

const css = ([r, g, b]: Rgb, a = 1) => (a === 1 ? `rgb(${r},${g},${b})` : `rgba(${r},${g},${b},${a})`);
const shadeOf = ([r, g, b]: Rgb, k: number): Rgb => [Math.min(255, r * k) | 0, Math.min(255, g * k) | 0, Math.min(255, b * k) | 0];

/**
 * A blank canvas. In a worker (where the reef usually runs) there is no
 * document, so it is an OffscreenCanvas: the same drawing API, typed here as
 * a canvas element so the rest of the code needn't care which it got.
 */
export const makeCanvas = (w: number, h: number): HTMLCanvasElement => {
  if (typeof document === 'undefined') return new OffscreenCanvas(w, h) as unknown as HTMLCanvasElement;
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
  | 'clownfish' | 'dolphin' | 'cleaner' | 'starfish' | 'cuttlefish'
  | 'shrimp' | 'parrotfish' | 'mantis' | 'mantisPeek' | 'gardenEel' | 'lionfish' | 'lionfishFlared'
  | 'hermit' | 'hermitShell' | 'hermitNaked';

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
  cleaner: [
    ['D.......', '.DBWBBW.', '..BWBBWT', '..L.L.L.'],
    ['.D......', '.DBWBBW.', '..BWBBWT', '...L.L.L'],
  ],
  // A glassy little shrimp: tail fan (T), body (B), banding (L), long feelers (D); the legs patter.
  shrimp: [
    ['......DD', '.BBBBBE.', 'TBLBLBB.', '.T.L.L..'],
    ['.....D.D', '.BBBBBE.', 'TBLBLBB.', '.T..L.L.'],
  ],
  // Chunky, scaled (L), with a fused beak (W) for biting coral; the tail beats,
  // and the third frame has the beak open mid-crunch.
  parrotfish: [
    ['......DDDD.....', '....DDBBBBDD...', 'T..DBLBBLBBBD..', 'TTDBBBLBBLBBBE.', 'TTBBLBBLBBLBBBW', 'TTBBBBBBBBBBBWW', 'T..LLLLLLLLLL..', '.....TT..TT....'],
    ['......DDDD.....', '....DDBBBBDD...', '.T.DBLBBLBBBD..', '.TDBBBLBBLBBBE.', '..TBLBBLBBLBBBW', '.TTBBBBBBBBBBWW', '.T.LLLLLLLLLL..', '.....TT..TT....'],
    ['......DDDD.....', '....DDBBBBDD...', 'T..DBLBBLBBBD..', 'TTDBBBLBBLBBBEW', 'TTBBLBBLBBLBBB.', 'TTBBBBBBBBBBBB.', 'T..LLLLLLLLLLWW', '.....TT..TT....'],
  ],
  // Mantis shrimp: carapace (D), body (B), bright bands (L), legs, tail and
  // eyestalks (T); the folded club (W) snaps out on the second frame.
  mantis: [
    ['.........E.E..', '.........T.T..', '..DDDDDDDDBB..', '.DBLBBLBBLBBB.', 'TBBBBBBBBBBBBW', 'TT.LLLLLLLL.WW', '..T.T.T.T.....'],
    ['.........E.E....', '.........T.T....', '..DDDDDDDDBB....', '.DBLBBLBBLBBB...', 'TBBBBBBBBBBBBWWW', 'TT.LLLLLLLL....W', '..T.T.T.T.......'],
  ],
  // Just the eyes on their stalks, watching from the burrow.
  mantisPeek: [['E.E', 'T.T', 'DBD']],
  // For icons: a garden eel standing up out of its hole.
  gardenEel: [['..DB.', '..BE.', '..B..', '..L..', '..B..', '.B...', '.L...', '.B...', '.B...', 'DDDD.']],
  // Lionfish: striped body (B, D) and long venomous spines (T, D), folded
  // back, then fanned out wide to herd or to warn.
  lionfish: [
    ['...T.T.T.......', '..T.T.T.T......', '..TDTDTDT......', '.TBBDBBDBBB....', 'TTBDBBDBBDBBE..', 'TTBBDBBDBBBBBB.', '.TLLLLLLLLLB...', '..TDTDTDT......', '...T.T.T.T.....'],
    ['....T.T.T......', '..T.T.T.T......', '..TDTDTDT......', '.TBBDBBDBBB....', '.TBDBBDBBDBBE..', 'TTBBDBBDBBBBBB.', '.TLLLLLLLLLB...', '..TDTDTDT......', '..T.T.T.T......'],
  ],
  lionfishFlared: [
    ['T...T...T....', '.T..T..T.....', '..T.T.T......', '...TDTDT.....', 'TTTBBDBBDBB..', 'TTBDBBDBBDBE.', 'TTTBDBBDBBBBB', '...LLLLLLLB..', '...TDTDT.....', '..T.T.T......', '.T..T..T.....', 'T...T...T....'],
    ['.T...T...T...', '..T..T..T....', '...T.T.T.....', '...TDTDT.....', 'TTTBBDBBDBB..', 'TTBDBBDBBDBE.', 'TTTBDBBDBBBBB', '...LLLLLLLB..', '...TDTDT.....', '...T.T.T.....', '..T..T..T....', '.T...T...T...'],
  ],
  // A hermit crab in its spiral shell (D spiral, B shell, L highlight), legs
  // and claw (T) and eyes poking out the front; the legs step.
  hermit: [
    ['...DD.......', '..DLLD......', '.DLBBLD..E.E', 'DLBDDBLD.T.T', 'DBDLLDBBTTTT', '.BBDDBBTTLTT', '..BBBB.T.T..'],
    ['...DD.......', '..DLLD......', '.DLBBLD..E.E', 'DLBDDBLD.T.T', 'DBDLLDBBTTTT', '.BBDDBBTTLTT', '..BBBB..T.T.'],
  ],
  // Pulled right in: just the shell.
  hermitShell: [['...DD...', '..DLLD..', '.DLBBLD.', 'DLBDDBLB', 'DBDLLDBB', '.BBDDBB.', '..BBBB..']],
  // Between shells: soft, curled and pink.
  hermitNaked: [['.....E.E', '.LLL.TT.', 'LLLLTTTT', '.LL.T.T.']],
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
  cleaner: [
    [[255, 235, 225], [235, 70, 60], [255, 190, 180], [210, 50, 50]],
  ],
  shrimp: [
    [[255, 214, 200], [236, 150, 132], [255, 204, 188], [214, 104, 100]],
    [[214, 238, 250], [160, 196, 214], [226, 240, 248], [120, 160, 190]],
  ],
  parrotfish: [
    [[124, 232, 214], [40, 168, 158], [150, 242, 224], [232, 116, 164]],
    [[255, 178, 196], [228, 98, 140], [120, 222, 202], [90, 200, 190]],
    [[196, 166, 255], [120, 90, 212], [252, 204, 124], [255, 196, 96]],
  ],
  mantis: [
    [[130, 226, 124], [40, 160, 92], [232, 92, 70], [250, 146, 60]],
    [[124, 204, 255], [60, 120, 222], [255, 212, 80], [255, 92, 124]],
  ],
  mantisPeek: [],
  // Spotted (dark spots on pale), and splendid (orange, banded white).
  gardenEel: [
    [[40, 40, 52], [232, 228, 212], [70, 70, 84], [196, 188, 168]],
    [[200, 92, 40], [250, 150, 60], [252, 242, 230], [255, 206, 120]],
  ],
  lionfish: [
    [[250, 240, 230], [186, 70, 52], [240, 204, 184], [222, 92, 72]],
  ],
  lionfishFlared: [],
  hermit: [
    [[150, 100, 60], [214, 170, 110], [250, 222, 170], [232, 112, 80]],
    [[170, 80, 92], [232, 140, 142], [255, 212, 202], [232, 112, 80]],
    [[80, 90, 122], [140, 150, 182], [212, 216, 236], [232, 112, 80]],
  ],
  hermitShell: [],
  hermitNaked: [
    [[255, 190, 180], [255, 170, 160], [255, 196, 184], [232, 112, 80]],
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
PALETTES.mantisPeek = PALETTES.mantis;
PALETTES.lionfishFlared = PALETTES.lionfish;
PALETTES.hermitShell = PALETTES.hermit;
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

/**
 * A puff of sand kicked off the seabed, seen from slightly above: a lump
 * bursts up, billows into a low ring and thins away. Tones: light (L),
 * mid (B), shadow (D). Coral spawn uses the same puff in pinks.
 */
const PUFF = [
  ['...........', '...........', '....LLL....', '...LBBBL...', '....DDD....'],
  ['...........', '....LLL....', '...LBBBL...', '..LBBDBBL..', '...DDDDD...'],
  ['....LLL....', '..LLBBBLL..', '.LBB.B.BBL.', '.BDD...DDB.', '..DD...DD..'],
  ['...L...L...', '.LB.....BL.', 'L.........L', 'BD.......DB', '.D.......D.'],
  ['...........', 'L.........L', '...........', 'D.........D', '...........'],
];
export const PUFF_FRAMES = PUFF.length;
const PUFF_COLORS = [
  { L: [210, 196, 154] as Rgb, B: [178, 166, 130] as Rgb, D: [140, 130, 102] as Rgb },
  { L: [255, 240, 246] as Rgb, B: [255, 150, 190] as Rgb, D: [216, 108, 156] as Rgb },
];

/** A puff frame: palette 0 is sand, 1 coral spawn. */
export const puffSprite = (frame: number, palette: number) =>
  cached(`puff-${frame}-${palette}`, () => fromRows(PUFF[Math.min(PUFF.length - 1, frame)], PUFF_COLORS[palette & 1]));

/** Disturbed water behind a fast swimmer: a bubble that shrinks to a fleck. */
const FIZZ = [['.f.', 'fFf', '.f.'], ['...', '.ff', '.f.'], ['...', '.f.', '...']];
export const fizzSprite = (frame: number) =>
  cached(`fizz-${frame}`, () => fromRows(FIZZ[Math.min(FIZZ.length - 1, frame)], { f: [196, 232, 240], F: [140, 190, 210] }));

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
  cached(`coral-${seed}-${w}-${h}`, () => {
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

/**
 * A parrotfish's night bubble: a pale, glassy cocoon of mucus with a glint
 * of light on it, drawn around the sleeping fish.
 */
export const mucusSprite = () =>
  cached('mucus', () => {
    const w = 22, h = 13;
    const c = makeCanvas(w, h);
    const ctx = c.getContext('2d')!;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const nx = (x + 0.5 - w / 2) / (w / 2), ny = (y + 0.5 - h / 2) / (h / 2);
        const d = nx * nx + ny * ny;
        if (d > 1) continue;
        ctx.fillStyle = d > 0.72 ? 'rgba(214,236,250,0.55)' : 'rgba(190,226,246,0.16)';
        ctx.fillRect(x, y, 1, 1);
      }
    }
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fillRect(5, 2, 2, 1);
    ctx.fillRect(4, 3, 1, 1);
    return c;
  });

/** Draws one pixel of a generated sprite, skipping anything off the canvas. */
const plotter = (ctx: CanvasRenderingContext2D, w: number, h: number) => (x: number, y: number, col: Rgb | string) => {
  x = Math.floor(x); y = Math.floor(y);
  if (x < 0 || y < 0 || x >= w || y >= h) return;
  ctx.fillStyle = typeof col === 'string' ? col : css(col);
  ctx.fillRect(x, y, 1, 1);
};

/**
 * A little coral growing on a landmark: a branching tuft, a round knob, a
 * flat table, a purple sea fan or a clump of sponge tubes, standing on its
 * base point.
 */
const coralTuft = (put: (x: number, y: number, col: Rgb) => void, rnd: () => number, x: number, y: number, size: number) => {
  const kind = Math.floor(rnd() * 5);
  const set = CORAL_SETS[Math.floor(rnd() * CORAL_SETS.length)];
  if (kind === 0) {
    // Branching: a few forked twigs.
    const twig = (tx: number, ty: number, len: number, dx: number) => {
      for (let k = 0; k < len; k++) { tx += dx + (rnd() - 0.5) * 0.5; ty -= 1; put(tx, ty, set[1]); put(tx + 1, ty, set[2]); }
      put(tx, ty - 1, set[0]);
    };
    twig(x, y, size, 0);
    twig(x, y, size * 0.7, -0.4);
    twig(x, y, size * 0.7, 0.4);
  } else if (kind === 1) {
    // A knob of brain coral.
    const r = Math.max(2, size * 0.5);
    for (let yy = -r; yy <= 0; yy++) for (let xx = -r; xx <= r; xx++) {
      const d = (xx / r) ** 2 + (yy / r) ** 2;
      if (d > 1) continue;
      put(x + xx, y + yy, d > 0.7 ? set[2] : (xx + yy) & 1 ? set[1] : set[0]);
    }
  } else if (kind === 2) {
    // A table coral: a flat plate on a short stalk.
    const half = Math.round(size * 0.8);
    for (let k = 0; k < 2; k++) put(x, y - k, set[2]);
    for (let xx = -half; xx <= half; xx++) { put(x + xx, y - 2, set[1]); put(x + xx, y - 3, Math.abs(xx) < half ? set[0] : set[1]); }
  } else if (kind === 3) {
    // A sea fan: a lattice of fine purple branches.
    const fan: Rgb[] = [[214, 120, 230], [170, 80, 200], [120, 50, 160]];
    for (let yy = 0; yy < size + 2; yy++) {
      const half = Math.round(Math.sin((yy / (size + 2)) * Math.PI) * size * 0.6);
      for (let xx = -half; xx <= half; xx++) if (((xx + yy) & 1) === 0 || Math.abs(xx) === half) put(x + xx, y - yy, fan[(Math.abs(xx) + yy) % 3]);
    }
  } else {
    // Sponge tubes.
    const tube: Rgb[] = [[255, 214, 90], [236, 160, 50], [180, 110, 40]];
    for (let t = -1; t <= 1; t++) {
      const tall = Math.round(size * (0.6 + rnd() * 0.5));
      for (let yy = 0; yy < tall; yy++) { put(x + t * 2, y - yy, tube[1]); put(x + t * 2 + 1, y - yy, tube[2]); }
      put(x + t * 2, y - tall, tube[0]);
      put(x + t * 2 + 1, y - tall, tube[2]);
    }
  }
};

/**
 * A wooden ship lying on the seabed: high stern castle on the left, the bow
 * rising on the right, a broken mast, five portholes (open, so whatever
 * hides inside shows through) and two breaches low in the hull where morays
 * den. Weathered planks, algae and barnacles, rust streaks, and corals
 * growing all over it. The layout matches WRECK in the simulation.
 */
export const wreckSprite = (seed: number, portholes: { x: number; y: number }[], breaches: number[], w: number, h: number) =>
  cached(`wreck-${seed}`, () => {
    const rnd = seeded(seed);
    const c = makeCanvas(w, h);
    const ctx = c.getContext('2d')!;
    const put = plotter(ctx, w, h);
    const OUTLINE: Rgb = [24, 28, 36];
    const WOOD: Rgb[] = [[118, 108, 88], [96, 86, 72], [76, 68, 60], [58, 54, 52]];
    const SEAM: Rgb = [40, 38, 42];
    const ALGAE: Rgb[] = [[74, 118, 76], [60, 98, 66]];
    const RUST: Rgb = [128, 74, 52];
    const BRASS: Rgb[] = [[176, 156, 92], [132, 114, 68], [92, 80, 52]];
    // The deck sags in the middle; the stern castle stands above it.
    const deck = (x: number) => (x < 20 ? 6 : Math.round(13 - 5 * ((x - 42) / 34) ** 2));
    const buried = (x: number) => h - 3 - Math.round(1.2 * Math.sin(x * 0.31) + Math.sin(x * 0.13 + 1));
    const stern = (y: number) => 3 + ((y - 6) / (h - 6)) * 3;
    const bow = (y: number) => w - 2 - Math.max(0, (y - 9) / (h - 9)) ** 1.5 * 13;
    const inHull = (x: number, y: number) => y >= deck(x) && y < buried(x) && x >= stern(y) && x <= bow(y);
    // A porthole: an open hole in a brass ring, lit on top.
    const portAt = (x: number, y: number) => {
      for (const p of portholes) {
        const r = Math.hypot(x + 0.5 - p.x, y + 0.5 - p.y);
        if (r <= 1.6) return 'hole';
        if (r <= 2.95) return y + 0.5 < p.y ? 'lit' : r > 2.6 ? 'dark' : 'ring';
      }
      return null;
    };
    const breachAt = (x: number, y: number) => breaches.some(bx => Math.abs(x - bx) <= 2 + ((y * 7 + x) % 3 === 0 ? 1 : 0) && y >= buried(x) - 7);

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (!inHull(x, y)) continue;
        const edge = !inHull(x - 1, y) || !inHull(x + 1, y) || !inHull(x, y - 1);
        const port = portAt(x, y);
        if (port === 'hole') continue;
        if (port) { put(x, y, BRASS[port === 'lit' ? 0 : port === 'ring' ? 1 : 2]); continue; }
        if (breachAt(x, y)) { put(x, y, (x + y) & 1 ? [14, 16, 24] : [20, 22, 30]); continue; }
        if (edge) { put(x, y, OUTLINE); continue; }
        const down = y - deck(x);
        if (down === 1) { put(x, y, WOOD[0]); continue; } // The gunwale catches the light.
        if (down % 3 === 1) { put(x, y, SEAM); continue; }
        // Lit from above, darker toward the sand, roughened by weather.
        const depth = down / Math.max(1, buried(x) - deck(x));
        let tone = Math.floor(depth * 3.2 + (rnd() - 0.5) * 0.9);
        if (((x * 3 + Math.floor(down / 3) * 11) % 17) === 0) tone++; // Plank ends.
        put(x, y, WOOD[Math.max(0, Math.min(3, tone))]);
        if (down < 6 && rnd() < 0.14) put(x, y, ALGAE[(rnd() * 2) | 0]);
        if (rnd() < 0.025) put(x, y, [196, 196, 176]); // Barnacles.
      }
    }
    // Rust weeping from under each porthole, and the bottom edge sunk in shadow.
    for (const p of portholes) {
      for (let k = 3; k < 3 + 2 + Math.floor(rnd() * 4); k++) if (inHull(p.x, p.y + k)) put(p.x - 1 + (k & 1), p.y + k, RUST);
    }
    for (let x = 0; x < w; x++) {
      const b = buried(x);
      if (inHull(x, b - 1) && !breachAt(x, b - 1)) put(x, b - 1, [34, 36, 42]);
    }
    // Railing posts along the deck and round the stern castle, some broken away.
    for (let x = 4; x < w - 3; x += 3) {
      if (rnd() < 0.25) continue;
      const top = deck(x);
      if (!inHull(x, top)) continue;
      const tall = rnd() < 0.3 ? 1 : 2;
      for (let k = 1; k <= tall; k++) put(x, top - k, WOOD[1]);
    }
    // The mast, snapped off, leaning back, with a yard still across it and a trailing rope.
    const mastX = (y: number) => 46 - (13 - y) * 0.3;
    for (let y = 1; y < deck(46); y++) { put(mastX(y), y, WOOD[2]); put(mastX(y) + 1, y, WOOD[3]); }
    put(mastX(0) + 1, 0, WOOD[2]);
    for (let x = 37; x <= 52; x++) put(x, Math.round(4 + (x - 44) * 0.18), WOOD[1]);
    for (let k = 0; k < 26; k += 2) put(mastX(2) + 2 + k, 2 + k * 0.27 + Math.sin(k * 0.5), [150, 140, 110]);
    // Corals settled all over it.
    for (let k = 0; k < 9; k++) {
      const x = 6 + Math.floor(rnd() * (w - 14));
      coralTuft(put, rnd, x, deck(x) - (rnd() < 0.5 ? 0 : 1), 3 + Math.floor(rnd() * 3));
    }
    for (let k = 0; k < 3; k++) {
      const x = 10 + Math.floor(rnd() * (w - 22));
      const y = deck(x) + 6 + Math.floor(rnd() * 8);
      if (inHull(x, y) && !portAt(x, y)) coralTuft(put, rnd, x, y, 2 + Math.floor(rnd() * 2));
    }
    return c;
  });

/**
 * A coral bommie: a great knoll of old reef, a rocky mound crowded with
 * corals of every kind, sea fans and sponges.
 */
export const bommieSprite = (seed: number, w: number, h: number) =>
  cached(`bommie-${seed}`, () => {
    const rnd = seeded(seed);
    const c = makeCanvas(w, h);
    const ctx = c.getContext('2d')!;
    const put = plotter(ctx, w, h);
    // The rocky mound: a lumpy dome, wider than tall, lit from the top left.
    const top = h * 0.22;
    const lumps = Array.from({ length: 8 }, () => rnd() * 0.18);
    const inside = (x: number, y: number) => {
      const nx = (x + 0.5 - w / 2) / (w / 2 - 1);
      const ny = (y + 0.5 - h) / (h - top);
      const a = Math.atan2(ny, nx);
      return y < h && nx * nx + ny * ny <= 1 - lumps[Math.floor(((a + Math.PI) / (Math.PI * 2)) * 8) % 8];
    };
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (!inside(x, y)) continue;
        const edge = !inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1);
        if (edge) { put(x, y, ROCK_OUTLINE); continue; }
        const light = ((y - top) / (h - top)) * 0.8 + (x / w) * 0.3 + (rnd() - 0.5) * 0.3;
        put(x, y, ROCK_COLORS[Math.max(0, Math.min(3, Math.floor(light * 3.2)))]);
        // Crusted over with patches of living coral, thickest toward the light.
        const patch = ((((x >> 2) * 73856093) ^ ((y / 3 | 0) * 19349663) ^ seed) >>> 0) % 1000 / 1000;
        const crust = 0.6 - ((y - top) / (h - top)) * 0.45;
        if (patch < crust) {
          const set = CORAL_SETS[Math.floor(patch * 97) % CORAL_SETS.length];
          put(x, y, set[light < 0.5 ? 0 : light < 0.8 ? 1 : 2]);
        } else if (rnd() < 0.1) put(x, y, MOSS[(rnd() * 2) | 0]);
      }
    }
    // Corals crowd its top and flanks: the back ones first, so the front ones overlap them.
    const spots: { x: number; y: number }[] = [];
    for (let k = 0; k < 30; k++) {
      const x = 2 + Math.floor(rnd() * (w - 4));
      let y = 0;
      while (y < h && !inside(x, y)) y++;
      if (y >= h - 3) continue;
      spots.push({ x, y: y + Math.floor(rnd() * Math.min(16, (h - y) * 0.6)) });
    }
    spots.sort((a, b) => a.y - b.y);
    for (const s of spots) coralTuft(put, rnd, s.x, s.y + 1, 3 + Math.floor(rnd() * 6));
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
