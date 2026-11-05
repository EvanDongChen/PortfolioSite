// Pixel art for the shrine forest, in the same flat-colour style as the reef's
// and the pond's: every sprite is a small canvas at one canvas pixel per art
// pixel, drawn from a character map or generated, and scaled up by the
// renderer without smoothing. It is always night here, so colours run cool in
// the moonlight, with warm lantern light and vermilion as the jewels. Edges
// are shaded in each thing's own colours, never outlined.

import { Rgb, cached, fromRows, makeCanvas } from './pixelOceanArt';
import { bridgeDeck, bridgeRise } from './shrine';

export { makeCanvas };

/** The forest floor, the water and the light. */
export const SHRINE_FLOOR = {
  /** Moss in soft steps, shaded hollows to moonlit hummocks. */
  moss: [[20, 56, 58], [26, 68, 62], [34, 82, 68], [46, 98, 72], [62, 114, 76]] as Rgb[],
  mossGlow: [104, 150, 88] as Rgb,
  /** The deep shade under the cedars. */
  shade: [12, 34, 46] as Rgb,
  /** Cedar needles and fallen maple leaves lying on the moss. */
  needle: [[120, 72, 48], [92, 62, 50]] as Rgb[],
  leaf: [[208, 58, 54], [236, 104, 62], [178, 44, 66]] as Rgb[],
  leafGold: [[226, 170, 62], [246, 206, 94], [186, 124, 46]] as Rgb[],
  /** Flagstones on the approach, and the moss in their joints. */
  stone: [[116, 122, 138], [100, 108, 126], [86, 94, 114], [132, 136, 150]] as Rgb[],
  joint: [34, 70, 66] as Rgb,
  /** Raked gravel in the shrine courts, pale under the moon, and its furrows. */
  gravel: [[112, 116, 130], [98, 104, 122]] as Rgb[],
  furrow: [76, 84, 108] as Rgb,
  /** Stones round the water, and the water from the shallows to the deep. */
  rim: [[92, 100, 112], [66, 76, 92]] as Rgb[],
  water: [[34, 96, 112], [24, 78, 104], [16, 60, 92], [12, 46, 78]] as Rgb[],
  /** Milky hot-spring water. */
  spring: [[158, 208, 202], [122, 186, 186], [92, 164, 172], [70, 142, 158]] as Rgb[],
  caustic: [34, 62, 84] as Rgb,
  /** Moonlight dappling down through the canopy, and its shafts. */
  moon: [20, 28, 44] as Rgb,
  ray: [14, 20, 34] as Rgb,
};

const put = (ctx: CanvasRenderingContext2D, x: number, y: number, col: Rgb) => {
  ctx.fillStyle = `rgb(${col[0]},${col[1]},${col[2]})`;
  ctx.fillRect(x, y, 1, 1);
};
const box = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, col: Rgb) => {
  ctx.fillStyle = `rgb(${col[0]},${col[1]},${col[2]})`;
  ctx.fillRect(x, y, w, h);
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

/** Moves every colour a fraction of the way to another, for a sprite's lit or spectral versions. */
const mix = (a: Rgb, b: Rgb, k: number): Rgb => [Math.round(a[0] + (b[0] - a[0]) * k), Math.round(a[1] + (b[1] - a[1]) * k), Math.round(a[2] + (b[2] - a[2]) * k)];

// --- the rivals -----------------------------------------------------------

/** Tanuki and kitsune drawn facing right. Roles are in the colour tables below. */
const TANUKI: Record<string, string[]> = {
  stand: [
    '...........aa..aa.',
    '...........aBaaBa.',
    '..........aBBBBBBa',
    '.tTt......BDEBBDEB',
    'TTtTT.....BDDWWDDB',
    'TtTTT.aaaaaBWWNWWa',
    '.TTtTaBBBBBBBWWWB.',
    '..TTaBBBBBBBBBBBD.',
    '...BBBBBccccBBBBD.',
    '...BBBBccccccBBD..',
    '...DBBBcccccBBBD..',
    '....DD.DD..DD.DD..',
    '....KK.KK..KK.KK..',
  ],
  walk: [
    '...........aa..aa.',
    '...........aBaaBa.',
    '..........aBBBBBBa',
    '.tTt......BDEBBDEB',
    'TTtTT.....BDDWWDDB',
    'TtTTT.aaaaaBWWNWWa',
    '.TTtTaBBBBBBBWWWB.',
    '..TTaBBBBBBBBBBBD.',
    '...BBBBBccccBBBBD.',
    '...BBBBccccccBBD..',
    '...DBBBcccccBBBD..',
    '...DD...DD.DD..DD.',
    '...KK...KK.KK..KK.',
  ],
  // Sitting up on its haunches with its round belly out: for drumming.
  sit: [
    '.......aa..aa.',
    '.......aBaaBa.',
    '......aBBBBBBa',
    '......BDEBBDEB',
    '......BDDWWDDB',
    '.......BWWNWW.',
    '.tTt..aaBBWWB.',
    'TTtTTaBBBcccDB',
    'TtTTTBBBcccccD',
    '.TTtTBBcccccccD',
    '..TTBBBcccccccD',
    '....BBBBcccccD.',
    '....DBBBBBBBBD.',
    '....KKKK..KKKK.',
  ],
  // The paws raised, for the off beat.
  drum: [
    '.......aa..aa.',
    '.......aBaaBa.',
    '......aBBBBBBa',
    '......BDEBBDEB',
    '......BDDWWDDB',
    '.......BWWNWW.BK',
    '.tTt..aaBBWWBBD.',
    'TTtTTaBBBcccDD..',
    'TtTTTBBBccccc...',
    '.TTtTBBccccccc..',
    '..TTBBBccccccc..',
    '....BBBBccccc...',
    '....DBBBBBBBBD.',
    '....KKKK..KKKK.',
  ],
  // Curled up asleep, nose under its tail.
  sleep: [
    '.....aaaaaaa.....',
    '...aaBBBBBBBaa...',
    '..aBBBBBBBBBBBa..',
    '.aBBBBBBBBaa.aBa.',
    '.BBBBBBBBBBaBBBBa',
    'TtTTtTTBBDDEDDWWB',
    'TtTTtTTtTTBWWNWD.',
    '.DDBBBBBBBBBBBD..',
  ],
};
const TANUKI_SETS: Record<string, Rgb>[] = [
  { a: [186, 148, 104], B: [142, 106, 76], c: [216, 192, 150] },
  { a: [172, 140, 116], B: [124, 98, 84], c: [204, 186, 158] },
  { a: [198, 160, 96], B: [156, 116, 66], c: [226, 204, 150] },
].map(s => ({ ...s, D: [66, 46, 44], E: [255, 232, 150], W: [236, 226, 206], N: [24, 18, 22], T: [128, 94, 68], t: [60, 44, 42], K: [46, 34, 34] } as unknown as Record<string, Rgb>));

const KITSUNE: Record<string, string[]> = {
  stand: [
    '...............OD.OD.',
    '...............OODOO.',
    '..............aOOOOOO.',
    '.Wa...........OOEOOWWW',
    'WWa...........aOOWWWWN',
    'WWaO...........OOWWW..',
    'WaOOO...aaaaaaaOOWW...',
    '.OOOOaaaOOOOOOOOOWW...',
    '..OOOOOOOOOOOOOOOW....',
    '...oooOOOOOOOOOOOW....',
    '......ooOoooooOOO.....',
    '.......oK.K....oK.K...',
    '.......KK.K....KK.K...',
  ],
  walk: [
    '...............OD.OD.',
    '...............OODOO.',
    '..............aOOOOOO.',
    '.Wa...........OOEOOWWW',
    'WWa...........aOOWWWWN',
    'WWaO...........OOWWW..',
    'WaOOO...aaaaaaaOOWW...',
    '.OOOOaaaOOOOOOOOOWW...',
    '..OOOOOOOOOOOOOOOW....',
    '...oooOOOOOOOOOOOW....',
    '......ooOoooooOOO.....',
    '.....oK...K..oK...K...',
    '.....KK...K..KK...K...',
  ],
  // Sitting neatly, tail curled round its feet: a shrine fox's pose.
  sit: [
    '........OD.OD.',
    '........OODOO.',
    '.......aOOOOOO',
    '.......OOEOOWWW',
    '.......aOOWWWWN',
    '........OOWWW.',
    '.......aOOWW..',
    '.......OOOWW..',
    '......aOOOWW..',
    '......OOOOWW..',
    '.Wa...OOOOOW..',
    'WWaOOOOOOOOW..',
    'WaOOOOOoOKoK..',
  ],
  // Throwing its head back to bark at the moon.
  howl: [
    '...........WN.',
    '.........WWWW.',
    '.......OOOWW..',
    '......OEOOW...',
    '.....OD.OOW...',
    '.....O.OOWW...',
    '.......aOOWW..',
    '.......OOOWW..',
    '......aOOOWW..',
    '......OOOOWW..',
    '.Wa...OOOOOW..',
    'WWaOOOOOOOOW..',
    'WaOOOOOoOKoK..',
  ],
  sleep: [
    '.....aaaaaaa.....',
    '...aaOOOOOOOaa...',
    '..aOOOOOOOOOOOa..',
    '.aOOOOOOOOODO.OD.',
    '.OOOOOOOOOOOOOOOO',
    'WWaOOaOOOOOEOOWWW',
    'WWWaOOaOOOOOWWWWN',
    '.oooOOOOOOOOoooo.',
  ],
};
const KITSUNE_SETS: Record<string, Rgb>[] = [
  { a: [250, 170, 84], O: [228, 114, 44], o: [168, 72, 36] },
  { a: [252, 206, 118], O: [234, 164, 70], o: [182, 112, 46] },
  { a: [255, 250, 240], O: [226, 230, 240], o: [160, 172, 204] },
].map(s => ({ ...s, W: [252, 244, 228], D: [56, 30, 36], E: [255, 240, 150], N: [28, 20, 24], K: [44, 26, 32] } as unknown as Record<string, Rgb>));

export type RivalPose = 'stand' | 'walk' | 'sit' | 'drum' | 'howl' | 'sleep';
export const tanukiSprite = (pose: RivalPose, palette: number) =>
  cached(`tanuki-${pose}-${palette}`, () => fromRows(TANUKI[pose === 'howl' ? 'sit' : pose], TANUKI_SETS[palette % TANUKI_SETS.length]));
export const kitsuneSprite = (pose: RivalPose, palette: number) =>
  cached(`kitsune-${pose}-${palette}`, () => fromRows(KITSUNE[pose === 'drum' ? 'sit' : pose], KITSUNE_SETS[palette % KITSUNE_SETS.length]));

/** The leaf a rival sets on its head to change. */
export const leafSprite = () => cached('shrine-leaf', () => fromRows(['..gG', '.gGG', 'gGG.', 'k...'], { g: [150, 214, 96], G: [88, 170, 76], k: [70, 110, 60] }));

// --- what they turn into ----------------------------------------------------

const DISGUISES: Record<string, { rows: string[]; colours: Record<string, Rgb> }> = {
  // A round iron kettle of a teapot, with a lid and a bamboo handle.
  teapot: {
    rows: [
      '....hHHHHHh....',
      '...h.......h...',
      '...h..lLl..h...',
      '...h.lLLLl.h...',
      '....BaaaaaB....',
      '...BaaAAaaaB..s',
      '..BaAAAaaaaaBss',
      '.hBaAAaaaaaaBs.',
      'h.BaaaaaaaaaB..',
      'h.BaaaaaaaabB..',
      '.hBBaaaaabbB...',
      '...BBBBBBBB....',
    ],
    colours: { h: [176, 150, 92], H: [212, 186, 116], l: [78, 92, 116], L: [114, 130, 150], B: [44, 56, 80], a: [72, 88, 116], A: [132, 152, 178], b: [54, 66, 92], s: [64, 78, 104] },
  },
  // A stone lantern, its window glowing just like the real ones'.
  lantern: {
    rows: [
      '.....ss.....',
      '....sSSs....',
      '..ssSSSSss..',
      'sSSSSSSSSSSs',
      'ddddddddddd.',
      '...sLLLLd...',
      '...sLYYLd...',
      '...sLYYLd...',
      '...sLLLLd...',
      '..sSSSSSSd..',
      '....sSSd....',
      '....sSSd....',
      '....sSSd....',
      '....sSSd....',
      '...sSSSSd...',
      '..sSSSSSSd..',
    ],
    colours: { s: [176, 182, 192], S: [136, 142, 160], d: [92, 98, 118], L: [250, 184, 88], Y: [255, 238, 164] },
  },
  // A wayside statue in a red bib, looking very calm.
  statue: {
    rows: [
      '...sSSSd...',
      '..sSSSSSd..',
      '..sSSSSSd..',
      '..sEESEEd..',
      '..sSSSSSd..',
      '...sSSSd...',
      '..RRRRRRr..',
      '.sRRRRRRrd.',
      '.sSRRRRrSd.',
      '.sSSRRrSSd.',
      '.sSSSSSSSd.',
      '.sSSSSSSSd.',
      '.sSSSSSSSd.',
      'sSSSSSSSSSd',
      'dddddddddd.',
    ],
    colours: { s: [172, 178, 190], S: [132, 140, 158], d: [88, 94, 116], E: [70, 76, 96], R: [226, 62, 48], r: [168, 38, 44] },
  },
};
export type DisguiseKind = 'teapot' | 'lantern' | 'statue';
export const disguiseSprite = (kind: DisguiseKind) => cached(`disguise-${kind}`, () => fromRows(DISGUISES[kind].rows, DISGUISES[kind].colours));

/** Little feet the disguise grows when it thinks nobody is looking, and the tail that gives it away. */
export const feetSprite = (rival: 'tanuki' | 'kitsune', frame: number) =>
  cached(`disguise-feet-${rival}-${frame}`, () => {
    const k: Rgb = rival === 'tanuki' ? [120, 90, 66] : [228, 114, 44];
    return fromRows(frame ? ['.b...b.', 'bb...bb'] : ['..b.b..', '.bb.bb.'], { b: k });
  });
export const tailSprite = (rival: 'tanuki' | 'kitsune') =>
  cached(`disguise-tail-${rival}`, () => (rival === 'tanuki'
    ? fromRows(['.tT.', 'TTtT', 'TtTT', '.TTt'], { T: [128, 94, 68], t: [60, 44, 42] })
    : fromRows(['.w..', 'wwO.', '.OOO', '..OO'], { w: [252, 244, 228], O: [232, 118, 46] })));

// --- the rest of the forest's animals ---------------------------------------

const TSUCHI_COLOURS: Record<string, Rgb> = { a: [204, 172, 108], B: [128, 94, 62], c: [232, 214, 170], E: [20, 16, 18], N: [86, 60, 44], t: [150, 116, 76] };

const ANIMALS: Record<string, { rows: string[]; colours: Record<string, Rgb> }> = (() => {
  const DEER: Record<string, Rgb> = { a: [196, 148, 104], B: [158, 112, 76], b: [116, 80, 62], W: [244, 234, 214], s: [244, 236, 220], D: [78, 56, 52], E: [16, 14, 18], N: [30, 24, 28], A: [214, 196, 158] };
  const HARE: Record<string, Rgb> = { a: [226, 226, 234], B: [188, 192, 208], b: [144, 150, 176], P: [238, 158, 176], E: [226, 58, 72] };
  const MOUSE: Record<string, Rgb> = { a: [208, 166, 122], B: [158, 116, 88], P: [240, 170, 170], E: [16, 10, 14] };
  const OWL: Record<string, Rgb> = { a: [188, 170, 142], B: [138, 118, 98], b: [92, 78, 74], W: [232, 222, 200], Y: [255, 212, 92], E: [16, 12, 16], N: [70, 56, 50] };
  const BAT: Record<string, Rgb> = { a: [92, 84, 116], B: [60, 56, 88], E: [255, 200, 110] };
  const CROW: Record<string, Rgb> = { a: [86, 92, 128], B: [50, 52, 82], b: [32, 32, 56], N: [46, 42, 50], E: [230, 230, 240] };
  const FROG: Record<string, Rgb> = { a: [160, 216, 110], B: [98, 176, 92], b: [58, 128, 86], W: [230, 240, 190], E: [16, 18, 20] };
  const KAPPA: Record<string, Rgb> = { a: [140, 206, 150], B: [86, 170, 128], b: [50, 124, 108], S: [176, 138, 74], s: [128, 94, 58], W: [176, 226, 240], H: [32, 52, 66], Y: [240, 204, 92], E: [14, 16, 20] };
  const KODAMA: Record<string, Rgb> = { a: [242, 248, 240], B: [206, 222, 214], b: [160, 184, 186], E: [28, 40, 48] };
  const KASA: Record<string, Rgb> = { R: [212, 66, 76], r: [160, 44, 72], P: [236, 214, 164], p: [196, 168, 124], S: [108, 76, 56], W: [252, 244, 228], E: [18, 14, 18], T: [244, 110, 130], F: [226, 190, 150] };
  const CHOCHIN: Record<string, Rgb> = { p: [255, 226, 150], P: [250, 190, 92], q: [224, 136, 66], K: [52, 36, 44], E: [24, 14, 20], T: [232, 66, 84], W: [255, 248, 224] };
  const NEKO: Record<string, Rgb> = { a: [136, 124, 176], B: [86, 76, 118], K: [52, 46, 78], T: [112, 100, 152], Y: [255, 232, 110], P: [236, 130, 150] };
  const AKA: Record<string, Rgb> = { r: [160, 34, 44], R: [214, 56, 54], l: [244, 96, 76], M: [52, 16, 30], W: [255, 244, 220], E: [20, 12, 16], T: [246, 130, 150], D: [116, 26, 40] };
  const SOAK: Record<string, Rgb> = { a: [186, 148, 104], B: [142, 106, 76], D: [66, 46, 44], W: [236, 226, 206], N: [24, 18, 22], c: [120, 180, 180], C: [176, 220, 214], A: [214, 196, 158], d: [196, 148, 104], e: [158, 112, 76], f: [40, 28, 30], O: [228, 114, 44], o: [250, 170, 84], w: [252, 244, 228] };
  const BAKU: Record<string, Rgb> = { a: [176, 160, 206], B: [122, 110, 160], b: [82, 74, 118], W: [226, 220, 240], E: [255, 240, 190], t: [70, 62, 96], K: [48, 42, 70] };
  const TSUCHI: Record<string, Rgb> = TSUCHI_COLOURS;
  const HAHAKI: Record<string, Rgb> = { B: [150, 112, 72], L: [196, 156, 104], R: [214, 58, 52], r: [158, 38, 46], a: [236, 210, 128], b: [204, 172, 92], d: [150, 120, 66], E: [34, 24, 30], W: [255, 250, 230] };
  return {
    deer: { rows: [
      '.................A..A..',
      '.................A.AA..',
      '................AA.A...',
      '.................AAA...',
      '................BaaB...',
      '...............aBaEBNN.',
      '...............BBBBBBN.',
      '................aBBb...',
      '................aBB....',
      '.WW.............aBB....',
      '.WBaaaaaaaaaaaaaaBB....',
      '..BBBsBBBsBBBBsBBBb....',
      '..BBBBBsBBBBsBBBBBb....',
      '..BBBBBBBBBBBBBBBWW....',
      '..bbBBBbbbbbbbBBbWW....',
      '..bb.bb.......bb.bb....',
      '..bb.bb.......bb.bb....',
      '..bb.bb.......bb.bb....',
      '..DD.DD.......DD.DD....',
    ], colours: DEER },
    deerWalk: { rows: [
      '.................A..A..',
      '.................A.AA..',
      '................AA.A...',
      '.................AAA...',
      '................BaaB...',
      '...............aBaEBNN.',
      '...............BBBBBBN.',
      '................aBBb...',
      '................aBB....',
      '.WW.............aBB....',
      '.WBaaaaaaaaaaaaaaBB....',
      '..BBBsBBBsBBBBsBBBb....',
      '..BBBBBsBBBBsBBBBBb....',
      '..BBBBBBBBBBBBBBBWW....',
      '..bbBBBbbbbbbbBBbWW....',
      '.bb...bb.....bb...bb...',
      '.bb...bb.....bb...bb...',
      'bb.....bb...bb.....bb..',
      'DD.....DD...DD.....DD..',
    ], colours: DEER },
    // Head down: grazing moss, or bowing as Nara's deer do.
    deerBow: { rows: [
      '.WW....................',
      '.WBaaaaaaaaaaaaa.......',
      '..BBBsBBBsBBBBsBBa.....',
      '..BBBBBsBBBBsBBBBBa....',
      '..BBBBBBBBBBBBBBBWBa...',
      '..bbBBBbbbbbbbBBbWWBa.A',
      '..bb.bb.......bb.bbaBA.',
      '..bb.bb.......bb.bbBaBA',
      '..bb.bb.......bb.bbBEBB',
      '..DD.DD.......DD.DD.BBN',
    ], colours: DEER },
    hare: { rows: [
      '.....aP.aP.',
      '.....aP.aP.',
      '.....aP.aP.',
      '.....aaaaa.',
      '.a..aaaEaBa',
      'aaaaaaaaaaP',
      'aBaaaaaaaB.',
      'BBBBBBBBB..',
      '.bb..b.bb..',
    ], colours: HARE },
    hareHop: { rows: [
      '.........aP.aP',
      '........aP.aP.',
      '.......aP.aP..',
      '.......aaaaa..',
      '.a....aaaEaBa.',
      'aaaaaaaaaaaaP.',
      'aBaaaaaaaaaB..',
      '.BBBBBBBBBB...',
      'bb.........bb.',
    ], colours: HARE },
    mouse: { rows: ['......PP..', '.....aPPa.', '..aaaaaaEa', 'PaaBBBBaaP', 'P..B..B...'], colours: MOUSE },
    mouse2: { rows: ['......PP..', '.....aPPa.', '..aaaaaaEa', 'PaaBBBBaaP', '.P..BB....'], colours: MOUSE },
    owl: { rows: [
      '.a......a.',
      '.aaaaaaaa.',
      'aBWWWaWWWB',
      'aWYEWNWEYW',
      'aBWWWNWWWB',
      'BaaWaWaWaB',
      'BbaaWaWaBb',
      'BbaWaWaaBb',
      'BbaaWaWaBb',
      '.bBaaWaBb.',
      '..bBBBBb..',
      '..YY..YY..',
    ], colours: OWL },
    owlFly0: { rows: [
      'bb..............bb',
      'BBba..........abBB',
      '.BBBaaa.aa.aaaBBB.',
      '..BBBaaaYEaaaBBB..',
      '....BBaWNWaBB.....',
      '.....bBaaaBb......',
      '......bBBb........',
    ], colours: OWL },
    owlFly1: { rows: [
      '.......aa.........',
      '....baaYEaab......',
      '..bBBaWNWaBBb.....',
      '.BBBBBaaaBBBBB....',
      'BBBb.bBBBb.bBBB...',
      'bb.....b.....bb...',
    ], colours: OWL },
    bat0: { rows: ['a.......a', 'Ba.a.a.aB', 'BBBaEaBBB', '.BB.a.BB.'], colours: BAT },
    bat1: { rows: ['...a.a...', '.BBaEaBB.', 'BBB.a.BBB', 'B.......B'], colours: BAT },
    crow: { rows: [
      '........aaa..',
      '.......aBEBNN',
      '.......aBBB..',
      'b...aaaBBB...',
      'bbaaBBBBBB...',
      '.bbBBBBBBB...',
      '...bbbBBB....',
      '.....N.N.....',
      '....NN.NN....',
    ], colours: CROW },
    crowFly0: { rows: [
      '...aaa........',
      '...BBaa.......',
      '...bBBBa...aa.',
      'b...bBBBaaBEBN',
      'bbaaBBBBBBBB..',
      '.bbbBBBBBB....',
    ], colours: CROW },
    crowFly1: { rows: [
      '...........aa.',
      'b....aaaaaBEBN',
      'bbaaBBBBBBBB..',
      '.bbbBBBBBBB...',
      '...bBBBb......',
      '..bBBb........',
      '..bb..........',
    ], colours: CROW },
    frog: { rows: ['.EE...EE.', '.aEa.aEa.', 'aaBaaaBaa', 'BBWWWWWBB', 'bB.BBB.Bb'], colours: FROG },
    frogLeap: { rows: ['..EE.EE..', 'aaEaaEaaB', 'bBBWWWBBb', 'b.......b', 'b.......b'], colours: FROG },
    kappa: { rows: [
      '...WWWWW....',
      '..HWWWWWH...',
      '..HaaaaaaH..',
      '..aaEaaEaa..',
      '..aaaaaaYY..',
      '..BaaaaYYY..',
      '...BBBBB....',
      '.SSSaaaBa...',
      'SSSsaaBBBa..',
      'SsSsaaaaBa..',
      'SSsSaaaaB...',
      '.SSsaaaa....',
      '..aa..aa....',
      '.BBb..BBb...',
    ], colours: KAPPA },
    kappaWalk: { rows: [
      '...WWWWW....',
      '..HWWWWWH...',
      '..HaaaaaaH..',
      '..aaEaaEaa..',
      '..aaaaaaYY..',
      '..BaaaaYYY..',
      '...BBBBB....',
      '.SSSaaaBa...',
      'SSSsaaBBBa..',
      'SsSsaaaaBa..',
      'SSsSaaaaB...',
      '.SSsaaaa....',
      '.aa....aa...',
      'BBb....BBb..',
    ], colours: KAPPA },
    // Bowing politely, the water spilling from the dish on its head.
    kappaBow: { rows: [
      '.......HWW..',
      '.....HaaWW..',
      '.SSSaaaaaWW.',
      'SSSsaaaaEaW.',
      'SsSsaaBaaYY.',
      'SSsSaaaBBYY.',
      '.SSsaaaBB...',
      '..aaaaaa....',
      '..aa..aa....',
      '.BBb..BBb...',
    ], colours: KAPPA },
    // Small pale tree spirits, heads tilting.
    kodama: { rows: ['..aaaaa..', '.aaaaaaa.', 'aaEaaaEaa', 'aaaaaaaBa', '.aaaEaaB.', '..aBBBb..', '...aab...', '..aaabb..', '..a.a.b..'], colours: KODAMA },
    kodama1: { rows: ['...aaaaa.', '..aaaaaaa', '.aaEaaaEa', '.aaaaaaaB', '..aaaEaB.', '..aBBBb..', '...aab...', '..aaabb..', '..a.a.b..'], colours: KODAMA },
    // A one-eyed old paper umbrella on one hopping sandalled leg.
    kasa: { rows: [
      '......SS......',
      '.....RRRr.....',
      '....RRPRrr....',
      '...RRPRRRrr...',
      '..RRPRWWRRrr..',
      '.RRPRWWEWRrrr.',
      '.RPRRWEEWRRrr.',
      'RRPRRRWWRRrrrr',
      'RPRRRRRRTTRrrr',
      'p.p.p.pSTTp.p.',
      '.......ST.....',
      '.......S......',
      '.......S......',
      '.......S......',
      '.......F......',
      '.....SSFSS....',
    ], colours: KASA },
    kasaHop: { rows: [
      '......SS......',
      '.....RRRr.....',
      '....RRPRrr....',
      '...RRPRRRrr...',
      '..RRPRWWRRrr..',
      '.RRPRWWEWRrrr.',
      '.RPRRWEEWRRrr.',
      'RRPRRRWWRRrrrr',
      'RPRRRRRRRRRrrr',
      'p.p.p.pSTp.p..',
      '.......ST.....',
      '.......S......',
      '......FF......',
      '....SSFSS.....',
    ], colours: KASA },
    // A torn paper lantern with a face, a floating ghost of one.
    chochin: { rows: [
      '...KKKKK...',
      '..qPPPPPq..',
      '.PppppppPq.',
      '.qqqqqqqqq.',
      'PppEpppEppq',
      'PpWEpppWEpq',
      'qqqqqqqqqqq',
      'PppqTTTTppq',
      'PpppTWTTppq',
      '.qqqqTTTqq.',
      '.PpppTTppq.',
      '..qPPPPPq..',
      '...KKKKK...',
    ], colours: CHOCHIN },
    // In to the chin with its eyes shut, the water lapping round it.
    tanukiSoak: { rows: [
      '..aa..aa..',
      '..aBaaBa..',
      '.aBBBBBBa.',
      '.BDDBBDDB.',
      '.BffWWffB.',
      '..BWWNWW..',
      'cCCCCCCCCc',
      '.cccccccc.',
    ], colours: { ...SOAK, f: [38, 26, 26] } },
    kitsuneSoak: { rows: [
      '..oD..oD..',
      '..OODOOO..',
      '.oOOOOOOO.',
      '.OOffOOww.',
      '.oOOOwwwwN',
      '..OOwww...',
      'cCCCCCCCCc',
      '.cccccccc.',
    ], colours: SOAK },
    deerSoak: { rows: [
      '...A..A...',
      '...A.AA...',
      '..AA.A....',
      '...AAA....',
      '..eddde...',
      '.deffeNN..',
      '.eeeeeeN..',
      '..deee....',
      'cCCCCCCCCc',
      '.cccccccc.',
    ], colours: SOAK },
    // A black cat with two tails, its eyes gleaming.
    neko0: { rows: [
      '.T..T...........',
      '.T.T.........a.a',
      '..TT.........aaa',
      '..TT........aYaY',
      '...TaaaaaaaaaBaP',
      '...BBBBBBBBBBBB.',
      '...BBBBBBBBBBB..',
      '...B.B.....B.B..',
      '...K.K.....K.K..',
    ], colours: NEKO },
    neko1: { rows: [
      '..T.T...........',
      '.T..T........a.a',
      '.TT.T........aaa',
      '..TT........aYaY',
      '...TaaaaaaaaaBaP',
      '...BBBBBBBBBBBB.',
      '...BBBBBBBBBBB..',
      '..B...B...B...B.',
      '..K...K...K...K.',
    ], colours: NEKO },
    nekoSit: { rows: [
      '......a.a.',
      '......aaa.',
      '.....aYaY.',
      '.T.T..aaP.',
      '.T.T.aBB..',
      '..TT.BBBB.',
      '..TTBBBBB.',
      '...TBBBBB.',
      '...BBBKBK.',
    ], colours: NEKO },
    // Up on its hind legs, paws in the air.
    nekoDance0: { rows: [
      'a.....a..',
      'aa.a.a.aa',
      '.aaaaaaa.',
      '..aYaYa..',
      '...aaP...',
      '..BBBBB..',
      'T.BBBBB.T',
      '.TBBBBBT.',
      '.TBBBBB..',
      '..BB.BB..',
      '..KK.KK..',
    ], colours: NEKO },
    nekoDance1: { rows: [
      '.....a...',
      '.a.a.a.a.',
      '..aaaaaaa',
      '..aYaYa.a',
      '...aaP...',
      '..BBBBB..',
      '.TBBBBBT.',
      'T.BBBBB.T',
      '..BBBBB.T',
      '..BB.BB..',
      '.KK...KK.',
    ], colours: NEKO },
    // A small red imp, nearly all mouth.
    akaname: { rows: [
      '...l...l...',
      '...RrrrR...',
      '..lRRRRRr..',
      '.lRWERWERr.',
      '.RRRRRRRRr.',
      '.RMMMMMMMr.',
      '..RMTTTMr..',
      '..RRRRRRr..',
      '.RR.R.r.rr.',
      '.D..D.D..D.',
    ], colours: AKA },
    akanameLick: { rows: [
      '...l...l...',
      '...RrrrR...',
      '..lRRRRRr..',
      '.lRWERWERr.',
      '.RRRRRRRRMM',
      '.RMMMMMMMMT',
      '.RMMMMMMTTT',
      '..RRRRRRMMT',
      '.RR.R.r.rr.',
      '.D..D.D..D.',
    ], colours: AKA },
    // A dream-eater: a tapir's bulk and an elephant's trunk, in dusk lilac with pale star-marks.
    baku: { rows: [
      '...............a.aa.....',
      '...........aaaaBaBBa....',
      '.......aaaaBBBBBBBBBa...',
      '.t..aaaBBBBBBBBBBBEBBa..',
      't..aBBBBBBBWWBBBBBBBBBaa',
      't.aBBWWBBBBBWWWBBBBBbBBa',
      '.tBBWWWBBBBBBBBBBBbbb.Ba',
      '..BBBBBBBBBBBBBBBbb...Ba',
      '..bBBBBbbbbbbbBBBb.....a',
      '..bBB.bb....bb.BBb......',
      '..bBB.bb....bb.BBb......',
      '..KKK.KK....KK.KKK......',
    ], colours: BAKU },
    bakuWalk: { rows: [
      '...............a.aa.....',
      '...........aaaaBaBBa....',
      '.......aaaaBBBBBBBBBa...',
      '.t..aaaBBBBBBBBBBBEBBa..',
      't..aBBBBBBBWWBBBBBBBBBaa',
      't.aBBWWBBBBBWWWBBBBBbBBa',
      '.tBBWWWBBBBBBBBBBBbbb.Ba',
      '..BBBBBBBBBBBBBBBbb...Ba',
      '..bBBBBbbbbbbbBBBb.....a',
      '.bBB...bb..bb...BBb.....',
      '.bBB...bb..bb...BBb.....',
      '.KKK...KK..KK...KKK.....',
    ], colours: BAKU },
    // Trunk raised, drinking the air.
    bakuSip: { rows: [
      '..............a.aa....aa',
      '..........aaaaBaBBa..aBa',
      '......aaaaBBBBBBBBBaaBa.',
      '.t.aaaBBBBBBBBBBBEBBBBa.',
      't.aBBBBBBBWWBBBBBBBBa...',
      't.BBWWBBBBBBWWWBBBBb....',
      '.tBBWWWBBBBBBBBBBBb.....',
      '..BBBBBBBBBBBBBBBb......',
      '..bBBBBbbbbbbbBBBb......',
      '..bBB.bb....bb.BBb......',
      '..bBB.bb....bb.BBb......',
      '..KKK.KK....KK.KKK......',
    ], colours: BAKU },
    // At rest, for a moment: a fat body with a thin tail and a blunt head.
    tsuchinokoRest: { rows: [
      '.........aaaa...',
      '......aaaBBaEa..',
      '...aaaBaBBaBBaN.',
      '.aaBBaBBaBBaBc..',
      'tBBaBBaBBccccc..',
      'tt.ccccccc......',
    ], colours: TSUCHI },
    // A broom come to life: a bamboo handle, a red cord, a skirt of straw with two eyes in it.
    hahaki: { rows: [
      '....LB....',
      '....LB....',
      '....LB....',
      '....LB....',
      '....LB....',
      '....LB....',
      '....LB....',
      '...RRRr...',
      '...aab....',
      '..aabbb...',
      '..aWEbWE..',
      '.aabbbbbd.',
      '.abadbadb.',
      'aabdabdabd',
      'abdabdabdd',
      'abdabdabdd',
      'd.bd.ab.d.',
    ], colours: HAHAKI },
    // Mid-hop, its straw gathered in and its bristles off the ground.
    hahakiStep: { rows: [
      '....LB....',
      '....LB....',
      '....LB....',
      '....LB....',
      '....LB....',
      '....LB....',
      '....LB....',
      '...RRRr...',
      '...aab....',
      '..aabbb...',
      '..aWEbWE..',
      '..abbbbd..',
      '..badbad..',
      '.abdabda..',
      '.abdabdd..',
      '..dabdd...',
    ], colours: HAHAKI },
    // Tipped over to sweep, or to bow.
    hahakiLean: { rows: [
      '........LB',
      '.......LB.',
      '......LB..',
      '.....LB...',
      '....LB....',
      '...RRRr...',
      '...aab....',
      '..aabbb...',
      '..aWEbWE..',
      '.aabbbbbd.',
      '.abadbadb.',
      'aabdabdabd',
      'abdabdabdd',
      'abdabdabdd',
      'd.bd.ab.d.',
    ], colours: HAHAKI },
  };
})();
export type AnimalKind = 'deer' | 'deerWalk' | 'deerBow' | 'hare' | 'hareHop' | 'mouse' | 'mouse2' | 'owl' | 'owlFly0' | 'owlFly1' | 'bat0' | 'bat1' | 'crow' | 'crowFly0' | 'crowFly1' | 'frog' | 'frogLeap' | 'kappa' | 'kappaWalk' | 'kappaBow' | 'kodama' | 'kodama1' | 'kasa' | 'kasaHop' | 'chochin' | 'hahaki' | 'hahakiStep' | 'hahakiLean' | 'baku' | 'bakuWalk' | 'bakuSip' | 'tsuchinokoRest' | 'tanukiSoak' | 'kitsuneSoak' | 'deerSoak' | 'neko0' | 'neko1' | 'nekoSit' | 'nekoDance0' | 'nekoDance1' | 'akaname' | 'akanameLick';
export const animalSprite = (kind: AnimalKind) => cached(`shrine-animal-${kind}`, () => fromRows(ANIMALS[kind].rows, ANIMALS[kind].colours));

/** Koi seen from above through the water: kohaku, showa, ogon, shiro, in two tail swings. */
const KOI_SETS: Rgb[][] = [
  [[250, 244, 236], [232, 72, 44], [40, 36, 44]],
  [[244, 128, 44], [250, 240, 224], [36, 32, 42]],
  [[250, 214, 96], [255, 240, 170], [196, 150, 60]],
  [[242, 244, 250], [190, 206, 228], [226, 72, 66]],
  [[42, 44, 58], [232, 88, 46], [248, 244, 232]],
];
const KOI = [
  ['..........aa...', 'tt.aaabbaaaaa..', 'ttaabbbbaaabEa.', 'ttaaaabbbaaaaa.', 'tt.aaaaaabbaa..', '.....aa........'],
  ['t.........aa...', 'tt.aaabbaaaaa..', '.taabbbbaaabEa.', '.taaaabbbaaaaa.', 'tt.aaaaaabbaa..', 't....aa........'],
];
export const koiSprite = (frame: number, palette: number) =>
  cached(`koi-${frame}-${palette}`, () => {
    const s = KOI_SETS[palette % KOI_SETS.length];
    return fromRows(KOI[frame & 1], { a: s[0], b: s[1], t: mix(s[0], s[1], 0.3), E: [16, 16, 24] });
  });

/** A hitodama: a soul-flame, blue-white, trailing up. */
const HITODAMA = [
  ['...w...', '..wW...', '..WW.w.', '.wWWwW.', '.WWbWW.', 'wWbbbWw', 'WbbcbbW', 'WbcccbW', '.bcccb.', '..bbb..'],
  ['....w..', '...Ww..', '.w.WW..', '.WwWWw.', '.WWbWW.', 'wWbbbWw', 'WbbcbbW', 'WbcccbW', '.bcccb.', '..bbb..'],
  ['..w....', '..Ww...', '..WWw..', '.wWWWw.', '.WWbWW.', 'wWbbbWw', 'WbbcbbW', 'WbcccbW', '.bcccb.', '..bbb..'],
];
export const hitodamaSprite = (frame: number, hue = 0) =>
  cached(`hitodama-${frame}-${hue}`, () => fromRows(HITODAMA[frame % 3], hue
    ? { w: [255, 214, 140], W: [255, 172, 90], b: [250, 232, 170], c: [255, 252, 232] }
    : { w: [110, 170, 255], W: [96, 196, 255], b: [170, 234, 255], c: [240, 254, 255] }));

// --- the parade --------------------------------------------------------------

const PARADE_ART: Record<string, { rows: string[]; colours: Record<string, Rgb> }> = (() => {
  const ONI: Record<string, Rgb> = { H: [244, 232, 184], D: [44, 34, 50], R: [226, 62, 56], r: [168, 38, 52], l: [250, 110, 84], W: [252, 244, 228], E: [255, 226, 96], B: [36, 28, 44], Y: [240, 200, 70], y: [190, 140, 50], C: [70, 56, 66], c: [120, 104, 110], T: [236, 232, 240] };
  const TENGU: Record<string, Rgb> = { R: [226, 58, 54], r: [176, 40, 50], W: [248, 244, 234], w: [196, 204, 222], K: [42, 40, 66], k: [76, 72, 110], B: [32, 28, 42], E: [20, 16, 20], G: [244, 204, 96], F: [106, 170, 110], H: [240, 240, 244] };
  const ROKU: Record<string, Rgb> = { H: [26, 24, 44], h: [52, 48, 80], F: [244, 226, 214], f: [214, 186, 182], E: [24, 16, 24], L: [226, 62, 76], K: [130, 74, 150], k: [92, 54, 124], P: [236, 150, 186], S: [244, 232, 220] };
  const WALL: Record<string, Rgb> = { a: [188, 190, 196], B: [150, 154, 166], b: [118, 122, 138], m: [90, 124, 96], E: [18, 14, 18], W: [244, 240, 228], L: [226, 72, 84] };
  const MOMEN: Record<string, Rgb> = { a: [250, 250, 244], B: [212, 220, 232], b: [168, 182, 208], E: [16, 16, 24] };
  const BIWA: Record<string, Rgb> = { a: [190, 124, 66], B: [146, 88, 50], b: [100, 60, 44], s: [240, 226, 170], E: [255, 236, 150], M: [28, 18, 24], K: [240, 234, 220], k: [204, 54, 66], F: [120, 84, 60] };
  return {
    oni: { rows: [
      '...H......H.....',
      '...HD....DH.....',
      '...DDDDDDDD...T.',
      '...RRRRRRRR...TT',
      '..lRRERRERRr..cT',
      '..lRRRRRRRRr..cc',
      '..lRRWRRWRRr.cC.',
      '...RRRRRRRr..cC.',
      '...rRRRRRr..cC..',
      '.lRRRRRRRRRrcC..',
      'lRRRRRRRRRRRRR..',
      'lRRlRRRRRRRrRR..',
      'RRrlRRRRRRRr....',
      'RR.YyYyYyYyY....',
      '...yYyYyYyYy....',
      '...YyYyYyYyY....',
      '...RRRr.RRRr....',
      '...RRr...RRr....',
      '...BBB...BBB....',
    ], colours: ONI },
    oniWalk: { rows: [
      '...H......H.....',
      '...HD....DH.....',
      '...DDDDDDDD...T.',
      '...RRRRRRRR...TT',
      '..lRRERRERRr..cT',
      '..lRRRRRRRRr..cc',
      '..lRRWRRWRRr.cC.',
      '...RRRRRRRr..cC.',
      '...rRRRRRr..cC..',
      '.lRRRRRRRRRrcC..',
      'lRRRRRRRRRRRRR..',
      'lRRlRRRRRRRrRR..',
      'RRrlRRRRRRRr....',
      'RR.YyYyYyYyY....',
      '...yYyYyYyYy....',
      '...YyYyYyYyY....',
      '..RRRr...RRRr...',
      '..RRr.....RRr...',
      '..BBB.....BBB...',
    ], colours: ONI },
    tengu: { rows: [
      '.....BB.......',
      '....BBBB......',
      '.k..HHHH......',
      'kKk.RRRRRRR...',
      'kKKkRERRERRRRR',
      'KKKkRRRRRrRRRR',
      'KKKKRRRRRr....',
      'kKKKHHHHHH....',
      '.KKWWWWWWWw...',
      '.KKWWGWGWWwRF.',
      '.kKWWWGWWWwFFF',
      '..KWWWWWWWw.FF',
      '..kwwwwwwww.F.',
      '...KKKKKKk....',
      '...KKkKKkk....',
      '...KKkKKkk....',
      '...BB...BB....',
      '..BBBB.BBBB...',
      '..B..B.B..B...',
    ], colours: TENGU },
    roku: { rows: [
      '...HHHHH....',
      '..HHhHHHH...',
      '..HFFFFFH...',
      '..HFEFEFH...',
      '..HFFFFFH...',
      '..HfFLFfH...',
      '....FFf.....',
      '.....FF.....',
      '......FF....',
      '.......FF...',
      '.......FF...',
      '......FF....',
      '.....FF.....',
      '....FF......',
      '....FF......',
      '.....FF.....',
      '......FF....',
      '......FF....',
      '.....FF.....',
      '...KKFFKK...',
      '..KKKSSKKK..',
      '.KKPKKKKPKk.',
      '.KKKKPKKKKk.',
      '.FKKKKKKKkF.',
      '..PPPPPPPP..',
      '..KKKPKKKk..',
      '..KKKKKKPk..',
      '..KPKKKKKk..',
      '..KKKKKPKk..',
      '..kkkkkkkk..',
      '...SS..SS...',
    ], colours: ROKU },
    nurikabe: { rows: [
      '...aaaaaaaaaaaaB..',
      '.aaaaaaaaaaaaaaaBb',
      'aaaaaaaaaaaaaaaaBb',
      'aaaaaaaaaaaaBaaaBb',
      'aaaBaaaaaaaaaBaaBm',
      'aaBaWWWaaaaWWWaaBb',
      'aaaaWEEaaaaWEEaaBb',
      'aaaaWEEaaaaWEEaaBb',
      'aaaaaaaaaaaaaaaaBb',
      'aaaaaaaaaaaaaaaaBm',
      'aaaaaaLLLLLLaaaaBb',
      'aaaaaLLLLLLLLaaaBb',
      'aaBaaaaaaaaaaaaaBb',
      'aaaBaaaaaaaaBaaaBb',
      'aaaaBaaaaaaaaBaaBb',
      'aaaaaaaaaaaaaaaaBb',
      'mmmaaaaaaaaaaammmb',
      'mmmmmbbbbbbbbmmmmm',
    ], colours: WALL },
    momen0: { rows: [
      'a.aaBaaaaaaaaaaaaa..',
      '.aaBaaaaaaaaaaaaBaa.',
      '...bbBBaaaaaaBBbaEaa',
      '......bbBBBBbb.aaEa.',
    ], colours: MOMEN },
    momen1: { rows: [
      '.......aaaaaaaa.....',
      '.a..aaBaaaaaaaaBaaa.',
      'a.aaBBbbbbBBaaaaaEaa',
      '.aBb........bbBaaEa.',
    ], colours: MOMEN },
    biwa: { rows: [
      '..........KK....',
      '.........KssK...',
      '........KKsKKF..',
      '.......BBa..F...',
      '......aBa.......',
      '...aaaaBa.......',
      '..aaaaaas.......',
      '.aaaEaaEs.......',
      'aaaaaaasaa......',
      'aMMMaaasaaa.....',
      'aaMaaasaaaB.....',
      'aaaaasaaaaB.....',
      '.aaasaaaaB......',
      '..BBaaaBB.......',
      '...b...b........',
      '..bb...bb.......',
    ], colours: BIWA },
  };
})();
export type ParadeKind = 'oni' | 'oniBlue' | 'tengu' | 'roku' | 'nurikabe' | 'momen' | 'biwa' | 'nine';
const ONI_BLUE: Record<string, Rgb> = { R: [70, 120, 220], r: [44, 74, 170], l: [120, 176, 244] };
export const paradeSprite = (kind: ParadeKind, frame: number) =>
  cached(`parade-${kind}-${frame}`, () => {
    if (kind === 'oni' || kind === 'oniBlue') {
      const art = frame & 1 ? PARADE_ART.oniWalk : PARADE_ART.oni;
      return fromRows(art.rows, kind === 'oni' ? art.colours : { ...art.colours, ...ONI_BLUE });
    }
    if (kind === 'momen') { const a = PARADE_ART[frame & 1 ? 'momen1' : 'momen0']; return fromRows(a.rows, a.colours); }
    if (kind === 'nine') return nineTails(frame);
    const a = PARADE_ART[kind];
    return fromRows(a.rows, a.colours);
  });

/**
 * The great white fox of the parade: nine separate plumes fanned out behind
 * it, each fat in the middle and fine at the root, tipped with blue foxfire,
 * swaying a little out of step with one another over four frames.
 */
const nineTails = (frame: number) => {
  const base = kitsuneSprite(frame & 1 ? 'walk' : 'stand', 2);
  const margin = 34;
  const w = base.width + margin - 6, h = base.height + margin;
  const c = makeCanvas(w, h);
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  const hipX = margin + 3, hipY = h - 8;
  const WHITE: Rgb[] = [[252, 252, 250], [214, 220, 236], [160, 172, 206]];
  const FIRE: Rgb[] = [[150, 214, 255], [226, 246, 255], [90, 160, 240]];
  const phase = ((frame % 4) / 4) * Math.PI * 2;
  // From the outermost in, so the middle plumes lie on top.
  const order = [0, 8, 1, 7, 2, 6, 3, 5, 4];
  for (const k of order) {
    const spread = (k - 4) / 4;
    const a = Math.PI * (0.72 + spread * 0.36) + Math.sin(phase + k * 0.9) * 0.05;
    const len = 27 - Math.abs(spread) * 5;
    const curl = spread * 0.34 + Math.sin(phase + k * 1.4) * 0.05;
    for (let s = 0; s <= len; s += 0.5) {
      const t = s / len;
      const ang = a + curl * t * t;
      const x = hipX + Math.cos(ang) * s, y = hipY - Math.sin(ang) * s;
      const r = 0.5 + Math.sin(Math.pow(t, 0.8) * Math.PI) * 1.75;
      const set = t > 0.82 ? FIRE : WHITE;
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          if (dx * dx + dy * dy > r * r) continue;
          // Lit along the top of the plume, its own shade beneath.
          const tone = dy > 0.5 ? 2 : dy > -0.5 ? 1 : 0;
          put(ctx, Math.round(x + dx), Math.round(y + dy), t > 0.82 ? set[tone === 2 ? 2 : tone === 0 ? 1 : 0] : set[tone]);
        }
      }
    }
  }
  ctx.drawImage(base, margin - 6, h - base.height);
  return c;
};

// --- the scenery ------------------------------------------------------------

const V = { lit: [250, 96, 58] as Rgb, red: [224, 58, 40] as Rgb, mid: [176, 40, 38] as Rgb, dark: [118, 28, 40] as Rgb, cap: [40, 34, 52] as Rgb, capLit: [74, 72, 96] as Rgb, foot: [32, 28, 40] as Rgb, gold: [244, 204, 100] as Rgb };

/** A vermilion torii gate, as wide as `w`, the roof beam swept up at its ends. */
export const toriiSprite = (w: number) =>
  cached(`torii-${w}`, () => {
    const h = Math.round(w * 0.85);
    const c = makeCanvas(w, h);
    const ctx = c.getContext('2d')!;
    const postW = Math.max(2, Math.round(w * 0.09));
    const inset = Math.round(w * 0.16);
    const beamT = Math.max(2, Math.round(w * 0.07));
    for (const left of [inset, w - inset - postW]) {
      box(ctx, left, beamT + 1, postW, h - beamT - 1, V.red);
      box(ctx, left, beamT + 1, 1, h - beamT - 1, V.lit);
      box(ctx, left + postW - 1, beamT + 1, 1, h - beamT - 1, V.mid);
      box(ctx, left - 1, h - Math.max(2, Math.round(h * 0.09)), postW + 2, Math.max(2, Math.round(h * 0.09)), V.foot);
    }
    // The swept lintel: a shallow curve, thickest in the middle.
    for (let x = 0; x < w; x++) {
      const t = (x - w / 2 + 0.5) / (w / 2);
      const lift = Math.round(t * t * t * t * beamT * 1.2);
      const y0 = beamT - lift;
      box(ctx, x, y0, 1, 1, V.capLit);
      box(ctx, x, y0 + 1, 1, Math.max(1, Math.round(beamT * 0.4)), V.cap);
      box(ctx, x, y0 + 1 + Math.max(1, Math.round(beamT * 0.4)), 1, Math.max(1, Math.round(beamT * 0.55)), V.red);
      box(ctx, x, y0 + beamT, 1, 1, V.mid);
    }
    // The lower tie beam and the small tablet between the two.
    const tie = Math.round(h * 0.3);
    const tieT = Math.max(2, Math.round(beamT * 0.7));
    box(ctx, inset - Math.round(w * 0.05), tie, w - (inset - Math.round(w * 0.05)) * 2, tieT, V.red);
    box(ctx, inset - Math.round(w * 0.05), tie, w - (inset - Math.round(w * 0.05)) * 2, 1, V.lit);
    box(ctx, inset - Math.round(w * 0.05), tie + tieT - 1, w - (inset - Math.round(w * 0.05)) * 2, 1, V.dark);
    if (w >= 28) {
      const tw = Math.max(3, Math.round(w * 0.1));
      box(ctx, Math.round(w / 2 - tw / 2), beamT + 2, tw, tie - beamT - 2, V.dark);
      box(ctx, Math.round(w / 2 - tw / 2) + 1, beamT + 3, tw - 2, tie - beamT - 4, V.gold);
    }
    return c;
  });

/** A stone lantern, its window lit or dark (or burning ghost blue, while the parade passes). */
export const toroSprite = (state: 'lit' | 'lit2' | 'dark' | 'ghost', mossy: number) =>
  cached(`toro-${state}-${mossy}`, () => {
    const moss: Rgb = [84, 138, 92];
    const window: [Rgb, Rgb] = state === 'dark' ? [[48, 48, 66], [34, 36, 52]]
      : state === 'ghost' ? [[110, 190, 255], [220, 248, 255]]
      : state === 'lit' ? [[250, 178, 80], [255, 236, 160]] : [[244, 158, 70], [255, 222, 130]];
    const c = fromRows(DISGUISES.lantern.rows, { ...DISGUISES.lantern.colours, L: window[0], Y: window[1] });
    if (mossy) {
      const ctx = c.getContext('2d')!;
      box(ctx, 2, 2, 2, 1, moss); box(ctx, 7, 1, 2, 2, moss); box(ctx, 3, 14, 2, 1, moss); box(ctx, 7, 15, 3, 1, moss);
    }
    return c;
  });

/** A paper festival lantern, red and white. */
export const paperLanternSprite = (kind: number, lit: boolean) =>
  cached(`paper-lantern-${kind}-${lit}`, () => {
    const body: Rgb[] = kind % 2 === 0 ? [[255, 90, 66], [230, 56, 52], [255, 196, 120]] : [[255, 236, 190], [250, 206, 130], [255, 250, 226]];
    const dim = (r: Rgb) => mix(r, [40, 36, 60], lit ? 0 : 0.55);
    return fromRows(['..kk..', '.aaaa.', 'abccba', 'bbccbb', 'abccba', '.aaaa.', '..kk..', '..t...'], { k: dim([40, 34, 44]), a: dim(body[1]), b: dim(body[0]), c: dim(body[2]), t: dim([244, 214, 120]) });
  });

/** A little floating lantern for the water, or a paper sky lantern. */
export const floatLanternSprite = () =>
  cached('float-lantern', () => fromRows(['.pppp.', 'pPYYPp', 'pPYYPp', '.pppp.', 'wwwwww'], { p: [250, 190, 96], P: [255, 214, 130], Y: [255, 246, 196], w: [120, 86, 62] }));
export const skyLanternSprite = () =>
  cached('sky-lantern', () => fromRows(['.pppp.', 'pPPPPp', 'pPYYPp', 'pPYYPp', '.pYYp.', '..qq..'], { p: [240, 156, 80], P: [255, 200, 110], Y: [255, 244, 190], q: [255, 120, 60] }));

/**
 * A curved tiled roof, its eaves swept up: steep at the ridge and easing out,
 * with ribs of tile fanning down the slope and the sunlit (moonlit) side to
 * the left. Shared by the hall, the small shrines and the pagoda.
 */
const roof = (ctx: CanvasRenderingContext2D, cx: number, top: number, halfW: number, height: number, colours: { lit: Rgb; body: Rgb; low: Rgb; eave: Rgb }, ribs = 4) => {
  for (let y = 0; y < height; y++) {
    const t = y / (height - 1 || 1);
    const half = Math.round(halfW * (0.24 + 0.76 * Math.pow(t, 1.7)));
    for (let x = -half; x < half; x++) {
      const u = (x + 0.5) / half;
      const rib = ribs > 0 && Math.floor((u + 1) * halfW) % ribs === 0;
      const col = rib ? colours.low : u < -0.35 ? colours.lit : colours.body;
      put(ctx, Math.round(cx + x), top + y, y === 0 ? colours.lit : col);
    }
  }
  // The eave's edge, its corners flicking up.
  for (let x = -halfW; x < halfW; x++) {
    const t = Math.abs(x + 0.5) / halfW;
    const lift = Math.round(Math.pow(t, 6) * Math.max(2, height * 0.3));
    box(ctx, Math.round(cx + x), top + height - 1 - lift, 1, 2, colours.eave);
  }
};
const PATINA = { lit: [104, 150, 138] as Rgb, body: [66, 112, 108] as Rgb, low: [48, 88, 92] as Rgb, eave: [26, 40, 54] as Rgb };
const BARK_ROOF = { lit: [92, 84, 96] as Rgb, body: [64, 58, 74] as Rgb, low: [46, 42, 58] as Rgb, eave: [24, 22, 34] as Rgb };
const WOOD = { lit: [126, 84, 62] as Rgb, body: [88, 58, 52] as Rgb, dark: [54, 38, 44] as Rgb };
const SHOJI: [Rgb, Rgb] = [[255, 226, 150], [244, 176, 88]];

/** A strung sacred rope, twisted, with a few plain white paper streamers. */
const rope = (ctx: CanvasRenderingContext2D, x0: number, x1: number, y: number, sag: number) => {
  const w = x1 - x0;
  for (let x = x0; x < x1; x++) {
    const t = (x - x0) / w;
    const yy = Math.round(y + Math.sin(t * Math.PI) * sag);
    box(ctx, x, yy, 1, 2, (x & 3) < 2 ? [226, 206, 150] : [176, 150, 100]);
  }
  for (let k = 1; k < 4; k++) {
    const x = Math.round(x0 + (w * k) / 4);
    const yy = Math.round(y + Math.sin((k / 4) * Math.PI) * sag) + 2;
    box(ctx, x, yy, 2, 5, [244, 244, 240]);
    box(ctx, x + 1, yy + 1, 1, 4, [206, 212, 226]);
  }
};

/** The main hall: stone plinth, red posts framing lit paper bays and dark doors, under a great curved roof. */
export const hondenSprite = () =>
  cached('honden', () => {
    const w = 92, h = 72;
    const c = makeCanvas(w, h);
    const ctx = c.getContext('2d')!;
    const stone: Rgb[] = [[148, 152, 166], [112, 118, 134], [80, 86, 104]];
    // The plinth in two courses, and broad steps up the middle.
    box(ctx, 6, h - 5, w - 12, 5, stone[1]);
    box(ctx, 6, h - 5, w - 12, 1, stone[0]);
    box(ctx, 6, h - 1, w - 12, 1, stone[2]);
    box(ctx, 11, h - 9, w - 22, 4, stone[1]);
    box(ctx, 11, h - 9, w - 22, 1, stone[0]);
    for (let s = 0; s < 4; s++) { box(ctx, 35 - s, h - 9 + s * 2, 22 + s * 2, 1, stone[0]); box(ctx, 35 - s, h - 8 + s * 2, 22 + s * 2, 1, stone[2]); }
    // The walls: five bays, the middle one dark doors under a lit lattice.
    const top = 33, bottom = h - 9;
    box(ctx, 13, top, w - 26, bottom - top, WOOD.dark);
    const bays = [15, 29, 39, 53, 63];
    const widths = [12, 8, 12, 8, 12];
    bays.forEach((x, k) => {
      if (k === 2) {
        box(ctx, x, top + 3, widths[k], 6, SHOJI[1]);
        for (let g = 0; g < widths[k]; g += 3) box(ctx, x + g, top + 3, 1, 6, WOOD.dark);
        box(ctx, x, top + 9, widths[k], bottom - top - 9, WOOD.body);
        box(ctx, x + 5, top + 9, 2, bottom - top - 9, WOOD.dark);
        box(ctx, x, top + 9, 1, bottom - top - 9, WOOD.lit);
        return;
      }
      if (k === 1 || k === 3) {
        box(ctx, x, top + 3, widths[k], bottom - top - 3, WOOD.body);
        box(ctx, x, top + 3, 1, bottom - top - 3, WOOD.lit);
        return;
      }
      box(ctx, x, top + 3, widths[k], bottom - top - 3, SHOJI[0]);
      for (let g = 3; g < widths[k]; g += 4) box(ctx, x + g, top + 3, 1, bottom - top - 3, SHOJI[1]);
      for (let g = top + 7; g < bottom; g += 5) box(ctx, x, g, widths[k], 1, SHOJI[1]);
    });
    // The posts, and the beam across their tops.
    for (const x of [13, 27, 37, 51, 61, 75]) {
      box(ctx, x, top, 3, bottom - top, V.red);
      box(ctx, x, top, 1, bottom - top, V.lit);
      box(ctx, x + 2, top, 1, bottom - top, V.mid);
    }
    box(ctx, 11, top - 1, w - 22, 3, V.red);
    box(ctx, 11, top - 1, w - 22, 1, V.lit);
    box(ctx, 11, top + 2, w - 22, 1, V.dark);
    // The roof; rafter ends along the eave's shadow.
    roof(ctx, w / 2, 7, 46, 27, PATINA, 7);
    for (let x = 8; x < w - 8; x += 3) box(ctx, x, 34, 1, 1, [150, 120, 90]);
    // A heavy ridge with flared ends, three short logs and crossed rafters.
    box(ctx, 30, 5, w - 60, 3, PATINA.eave);
    box(ctx, 30, 5, w - 60, 1, PATINA.low);
    for (const x of [38, 45, 52]) { box(ctx, x, 3, 3, 2, PATINA.eave); box(ctx, x, 3, 1, 2, V.gold); }
    for (const [x, d] of [[30, -1], [w - 31, 1]] as [number, number][]) {
      for (let k = 0; k < 5; k++) { box(ctx, x + d * k, 5 - k, 2, 2, PATINA.eave); box(ctx, x - d * k, 5 - k, 2, 1, PATINA.low); }
    }
    rope(ctx, 26, w - 26, 36, 3);
    box(ctx, w / 2 - 1, 39, 3, 3, V.gold);
    return c;
  });

/** A small roadside shrine: a dark wooden box on a stone base, its lattice door lit, under a curved roof. */
export const hokoraSprite = (kind: number) =>
  cached(`hokora-${kind}`, () => {
    const w = 24, h = 24;
    const c = makeCanvas(w, h);
    const ctx = c.getContext('2d')!;
    box(ctx, 4, h - 4, 16, 4, [124, 130, 146]);
    box(ctx, 4, h - 4, 16, 1, [160, 164, 178]);
    box(ctx, 4, h - 1, 16, 1, [84, 90, 108]);
    box(ctx, 6, 11, 12, h - 15, kind ? WOOD.body : V.mid);
    box(ctx, 6, 11, 1, h - 15, kind ? WOOD.lit : V.red);
    box(ctx, 17, 11, 1, h - 15, WOOD.dark);
    box(ctx, 9, 13, 6, h - 18, SHOJI[0]);
    for (const x of [11, 13]) box(ctx, x, 13, 1, h - 18, SHOJI[1]);
    roof(ctx, w / 2, 2, 12, 10, kind ? BARK_ROOF : PATINA, 5);
    return c;
  });

/** A five-storey pagoda, vermilion under dark roofs with rafters beneath, a spire of rings on top. */
export const pagodaSprite = () =>
  cached('pagoda', () => {
    const w = 62, h = 128;
    const c = makeCanvas(w, h);
    const ctx = c.getContext('2d')!;
    const cx = w / 2;
    box(ctx, 10, h - 5, w - 20, 5, [116, 122, 138]);
    box(ctx, 10, h - 5, w - 20, 1, [156, 162, 176]);
    let y = h - 5;
    for (let f = 0; f < 5; f++) {
      const half = 17 - f * 2;
      const wall = 12 - f;
      y -= wall;
      box(ctx, cx - half, y, half * 2, wall, V.red);
      box(ctx, cx - half, y, 2, wall, V.lit);
      box(ctx, cx + half - 2, y, 2, wall, V.mid);
      box(ctx, cx - 3, y + 2, 6, wall - 2, WOOD.dark);
      if (f % 2 === 0) { box(ctx, cx - 2, y + 3, 4, wall - 3, SHOJI[0]); box(ctx, cx, y + 3, 1, wall - 3, SHOJI[1]); }
      const rh = 11 - f;
      y -= rh - 3;
      roof(ctx, cx, y, half + 11, rh, BARK_ROOF, 6);
      for (let x = -half - 8; x < half + 8; x += 3) box(ctx, cx + x, y + rh + 1, 1, 1, [150, 110, 84]);
    }
    for (let k = 0; k < 9; k++) box(ctx, cx - 1 + (k % 3 === 0 ? -1 : 0), y - k * 2 - 2, 2 + (k % 3 === 0 ? 2 : 0), 2, k % 3 === 0 ? V.gold : [190, 146, 70]);
    return c;
  });

/**
 * A red arched bridge, bank to bank: its deck climbs off stone footings at
 * each end, with a handrail on a few posts and two piers standing in the water.
 * The bottom row of the sprite is the ground and the waterline.
 */
export const bridgeSprite = (w: number) =>
  cached(`bridge-${w}`, () => {
    const rise = bridgeRise(w);
    const h = rise + 16;
    const c = makeCanvas(w, h);
    const ctx = c.getContext('2d')!;
    const deck = (x: number) => h - 1 - Math.round(bridgeDeck(w, x + 0.5 - w / 2));
    // Piers from under the deck down into the water.
    for (const x of [Math.round(w * 0.3), Math.round(w * 0.67)]) {
      box(ctx, x, deck(x), 3, h - deck(x), V.dark);
      box(ctx, x, deck(x), 1, h - deck(x), V.mid);
    }
    for (let x = 0; x < w; x++) {
      const top = deck(x);
      // Planks, the red side beam below them, and the rail above.
      box(ctx, x, top, 1, 1, [188, 150, 112]);
      box(ctx, x, top + 1, 1, 1, [136, 100, 78]);
      box(ctx, x, top + 2, 1, 2, V.red);
      box(ctx, x, top + 4, 1, 1, V.dark);
      box(ctx, x, top - 6, 1, 1, V.lit);
      box(ctx, x, top - 5, 1, 1, V.mid);
    }
    for (let x = 1; x < w; x += Math.max(8, Math.round(w / 7))) {
      const top = deck(x);
      box(ctx, x, top - 6, 2, 6, V.red);
      box(ctx, x, top - 6, 1, 6, V.lit);
      box(ctx, x, top - 8, 2, 2, V.gold);
    }
    // Stone footings the ends rest on, down at the ground.
    for (const x of [0, w - 7]) {
      box(ctx, x, h - 5, 7, 5, [112, 118, 134]);
      box(ctx, x, h - 5, 7, 1, [150, 156, 170]);
      box(ctx, x, h - 1, 7, 1, [76, 82, 100]);
      box(ctx, x + 2, h - 3, 1, 1, [76, 82, 100]);
    }
    return c;
  });

/** Offering stand: a square tray on a small box. */
export const altarSprite = () =>
  cached('altar', () => fromRows([
    'wwwwwwwwwwwwww',
    'WWWWWWWWWWWWWW',
    'dddddddddddddd',
    '..WwWWWWWWwW..',
    '..WwWRRRWWwW..',
    '..WwWRWRWWwW..',
    '..WwWWWWWWwW..',
    '..dddddddddd..',
  ], { w: [244, 232, 198], W: [214, 192, 148], d: [146, 122, 96], R: [190, 60, 54] }));

/** What is left on the stands. */
const OFFERINGS: Record<string, { rows: string[]; colours: Record<string, Rgb> }> = {
  rice: { rows: ['...ww...', '..wwWw..', '.wwWWww.', 'wwKKKKwW', 'wWKKKKWW'], colours: { w: [252, 252, 246], W: [214, 220, 232], K: [34, 56, 56] } },
  inari: { rows: ['.oOOOOo.', 'oOOOOOOo', 'OOaOOaOO', 'oOOOOOOo'], colours: { o: [176, 110, 46], O: [226, 158, 68], a: [244, 196, 106] } },
  sake: { rows: ['..RR..', '..WW..', '.WWWW.', '.WWWW.', 'WWwwWW', 'WwBBwW', 'WwBBwW', '.WWWW.'], colours: { R: [224, 58, 52], W: [240, 236, 224], w: [200, 202, 208], B: [56, 72, 130] } },
  mikan: { rows: ['..g...', '.OOOo.', 'OaOOOo', 'OOOOOo', '.OOoo.'], colours: { g: [110, 186, 90], O: [248, 148, 44], o: [212, 104, 34], a: [255, 204, 110] } },
  fish: { rows: ['.....ww.', 't.wwwwww', 'twwwEww.', 't..www..'], colours: { t: [150, 170, 200], w: [214, 226, 240], E: [20, 20, 30] } },
  cucumber: { rows: ['.....gGg', '...gGGg.', '.gGGg...', 'gGg.....'], colours: { g: [76, 164, 92], G: [128, 212, 112] } },
};
export type OfferingKind = keyof typeof OFFERINGS;
export const OFFERING_KINDS = Object.keys(OFFERINGS) as OfferingKind[];
export const offeringSprite = (kind: OfferingKind) => cached(`offering-${kind}`, () => fromRows(OFFERINGS[kind].rows, OFFERINGS[kind].colours));

/** A tsuchinoko bowling along, curled tight with its tail in its mouth: a fat coil with a blunt head, not a ring. */
export const tsuchinokoSprite = (frame: number) =>
  cached(`tsuchinoko-${frame % 8}`, () => {
    const size = 15;
    const c = makeCanvas(size, size);
    const ctx = c.getContext('2d')!;
    const cx = size / 2, cy = size / 2;
    const spin = ((frame % 8) / 8) * Math.PI * 2;
    const C = TSUCHI_COLOURS;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const dx = x + 0.5 - cx, dy = y + 0.5 - cy;
        const d = Math.hypot(dx, dy);
        if (d > 5.6) continue;
        const a = Math.atan2(dy, dx) - spin;
        // A spiral seam where the coil lies against itself, and its belly showing in the middle.
        const seam = Math.sin(a * 2 + d * 1.5);
        const band = Math.sin(a * 4 + d);
        put(ctx, x, y, d < 1.6 ? C.c : seam > 0.82 ? C.N : band > 0.5 ? C.B : dx + dy < -1 ? C.a : C.t);
      }
    }
    // The head on the outside, biting down on the tail as it comes round.
    const hx = Math.round(cx + Math.cos(spin) * 5.2 - 1.5), hy = Math.round(cy + Math.sin(spin) * 5.2 - 1.5);
    box(ctx, hx, hy, 4, 3, C.a);
    box(ctx, hx, hy + 2, 4, 1, C.B);
    put(ctx, hx + 1, hy + 1, C.E);
    put(ctx, hx + 3, hy + 2, C.N);
    return c;
  });

/** A berry bush: a low dark mound with its fruit on the side that shows, as many as are left. */
export const berryBushSprite = (seed: number, kind: number, berries: number) =>
  cached(`berry-bush-${seed % 4}-${kind}-${berries}`, () => {
    const rnd = seededRandom((seed % 4) * 23 + 5);
    const w = 18, h = 12;
    const c = makeCanvas(w, h);
    const ctx = c.getContext('2d')!;
    const LEAF: Rgb[] = [[18, 60, 56], [30, 88, 70], [50, 120, 84]];
    for (let y = 1; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const dx = (x + 0.5 - w / 2) / (w / 2), dy = (y + 0.5 - h) / (h - 1);
        if (dx * dx + dy * dy > 1 - rnd() * 0.1) continue;
        const light = -dx * 0.4 - dy * 0.8 - 0.1 + (rnd() - 0.5) * 0.25;
        put(ctx, x, y, LEAF[light > 0.42 ? 2 : light > 0.02 ? 1 : 0]);
      }
    }
    const SETS: Rgb[][] = [[[236, 50, 60], [255, 150, 130]], [[70, 92, 214], [160, 184, 255]], [[204, 86, 214], [244, 170, 246]]];
    const set = SETS[kind % SETS.length];
    const spots = [[4, 6], [9, 3], [13, 6], [7, 8], [11, 9], [3, 9]];
    for (let k = 0; k < berries && k < spots.length; k++) {
      const [x, y] = spots[k];
      box(ctx, x, y, 2, 2, set[0]);
      put(ctx, x, y, set[1]);
    }
    return c;
  });

/** A persimmon tree: dark sparse leaves and a scatter of bright fruit. */
export const persimmonTreeSprite = (seed: number, r: number) =>
  cached(`persimmon-tree-${seed}-${r}`, () => {
    const rnd = seededRandom(seed * 37 + r);
    const trunkH = Math.round(r * 1.1);
    const w = r * 2 + 8, h = Math.round(r * 1.5) + trunkH + 2;
    const c = makeCanvas(w, h);
    const ctx = c.getContext('2d')!;
    const cx = w / 2;
    const lean = rnd() < 0.5 ? -1 : 1;
    for (let y = h - 1; y > h - trunkH - 6; y--) {
      const x = Math.round(cx + lean * Math.sin(((h - y) / trunkH) * 2) * 2);
      box(ctx, x - 2, y, 4, 1, [58, 42, 48]);
      box(ctx, x - 2, y, 1, 1, [96, 70, 62]);
    }
    const set: Rgb[] = [[20, 58, 50], [32, 82, 58], [52, 108, 66], [80, 136, 74]];
    const lumps: { x: number; y: number; r: number }[] = [{ x: cx, y: r * 0.6, r: r * 0.55 }];
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2 + rnd();
      lumps.push({ x: cx + Math.cos(a) * r * 0.6, y: r * 0.7 + Math.sin(a) * r * 0.32, r: r * (0.3 + rnd() * 0.14) });
    }
    lumps.sort((a, b) => a.y - b.y);
    for (const l of lumps) {
      for (let y = Math.floor(l.y - l.r); y <= l.y + l.r; y++) {
        for (let x = Math.floor(l.x - l.r); x <= l.x + l.r; x++) {
          const dx = (x + 0.5 - l.x) / l.r, dy = (y + 0.5 - l.y) / (l.r * 0.82);
          if (dx * dx + dy * dy > 1 + (rnd() - 0.5) * 0.3) continue;
          const light = 0.5 - dx * 0.3 - dy * 0.5 + (rnd() - 0.5) * 0.3;
          put(ctx, x, y, set[Math.max(0, Math.min(3, Math.floor(light * 3.6)))]);
        }
      }
    }
    for (let k = 0; k < r; k++) {
      const a = rnd() * Math.PI * 2, d = Math.sqrt(rnd()) * r * 0.85;
      const x = Math.round(cx + Math.cos(a) * d), y = Math.round(r * 0.7 + Math.sin(a) * d * 0.55);
      box(ctx, x, y, 2, 2, [244, 130, 40]);
      put(ctx, x, y, [255, 196, 110]);
    }
    return c;
  });

/** One hanging spray of wisteria: broad and pale at the top, tapering to a deep violet tip. */
export const wisteriaSprite = (seed: number, len: number) =>
  cached(`wisteria-${seed % 4}-${len}`, () => {
    const rnd = seededRandom((seed % 4) * 41 + len);
    const w = 7;
    const c = makeCanvas(w, len);
    const ctx = c.getContext('2d')!;
    const SET: Rgb[] = [[214, 190, 248], [176, 140, 234], [134, 98, 206], [96, 66, 170]];
    for (let y = 0; y < len; y++) {
      const t = y / (len - 1);
      const half = (1 - t) * 3 + 0.5;
      for (let x = 0; x < w; x++) {
        const dx = x + 0.5 - w / 2;
        if (Math.abs(dx) > half) continue;
        // Separate little blossoms, not a solid tongue.
        if ((x + y * 2 + seed) % 4 === 0 && t < 0.92) continue;
        const tone = Math.min(3, Math.floor(t * 3.4 + (dx > 0 ? 0.6 : 0) + (rnd() - 0.5) * 0.5));
        put(ctx, x, y, SET[Math.max(0, tone)]);
      }
    }
    return c;
  });

/** A cross-beam of the wisteria pergola: two dark posts, a beam across, and leaves bunched along the top. */
export const pergolaSprite = (w: number) =>
  cached(`pergola-${w}`, () => {
    const h = 28;
    const c = makeCanvas(w, h);
    const ctx = c.getContext('2d')!;
    for (const x of [1, w - 4]) {
      box(ctx, x, 5, 3, h - 5, [62, 46, 50]);
      box(ctx, x, 5, 1, h - 5, [100, 76, 66]);
      box(ctx, x - 1, h - 2, 5, 2, [84, 90, 108]);
    }
    box(ctx, 0, 4, w, 2, [84, 62, 56]);
    box(ctx, 0, 4, w, 1, [118, 90, 74]);
    const rnd = seededRandom(w * 7 + 3);
    const LEAF: Rgb[] = [[28, 78, 62], [46, 110, 74], [76, 144, 84]];
    for (let x = 0; x < w; x++) {
      const up = 2 + Math.floor(rnd() * 3);
      for (let y = 4 - up; y < 5; y++) if (y >= 0) put(ctx, x, y, LEAF[y < 2 ? 2 : rnd() < 0.5 ? 1 : 0]);
    }
    return c;
  });

const RIMS = new WeakMap<HTMLCanvasElement, HTMLCanvasElement[]>();
/**
 * The warm edge a sprite catches on the side a lantern is: its outermost
 * pixels on that side in one colour, so it can be laid straight over the sprite.
 */
export const rimSprite = (img: HTMLCanvasElement, side: 1 | -1, ghost: boolean) => {
  let set = RIMS.get(img);
  if (!set) { set = []; RIMS.set(img, set); }
  const slot = (side > 0 ? 1 : 0) + (ghost ? 2 : 0);
  if (set[slot]) return set[slot];
  const w = img.width, h = img.height;
  const c = makeCanvas(w, h);
  const ctx = c.getContext('2d')!;
  const data = img.getContext('2d')!.getImageData(0, 0, w, h).data;
  const solid = (x: number, y: number) => x >= 0 && x < w && y >= 0 && y < h && data[(y * w + x) * 4 + 3] > 40;
  ctx.fillStyle = ghost ? 'rgb(150,214,255)' : 'rgb(255,196,112)';
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      // Its edge on that side, and along the top where the light falls across it.
      if (solid(x, y) && (!solid(x + side, y) || (!solid(x, y - 1) && !solid(x + side, y - 1)))) ctx.fillRect(x, y, 1, 1);
    }
  }
  set[slot] = c;
  return c;
};

/** A stone water basin with a bamboo spout, its water clear or scummed over. */
export const basinSprite = (dirty: boolean) =>
  cached(`basin-${dirty}`, () => fromRows([
    '..........gg..',
    '.........gGG..',
    '......ggGG....',
    '....gGGg.b....',
    'sSSSSSSSSbSSs.',
    'sWWWWWWWWWWSd.',
    'sWVWWWVWWWWSd.',
    'sSSSSSSSSSSSd.',
    '.sSSSSSSSSSd..',
    '.dddddddddd...',
  ], {
    g: [110, 196, 110], G: [68, 156, 96], b: [116, 84, 62], s: [176, 182, 194], S: [132, 140, 158], d: [88, 94, 116],
    W: dirty ? [94, 110, 64] : [120, 196, 226], V: dirty ? [70, 84, 50] : [214, 244, 252],
  }));

const SAKURA: Rgb[] = [[176, 110, 146], [222, 152, 184], [246, 192, 214], [255, 224, 236], [255, 244, 250]];
/** The old cherry: a huge gnarled trunk splitting into low boughs under a wide cloud of pale blossom. */
export const sakuraSprite = () =>
  cached('sakura-old', () => {
    const rnd = seededRandom(77);
    const w = 110, h = 112;
    const c = makeCanvas(w, h);
    const ctx = c.getContext('2d')!;
    const cx = w / 2;
    const BARK: Rgb[] = [[110, 84, 92], [72, 54, 66], [44, 34, 48]];
    const limb = (x0: number, y0: number, x1: number, y1: number, r0: number, r1: number) => {
      const steps = Math.ceil(Math.hypot(x1 - x0, y1 - y0));
      for (let s = 0; s <= steps; s++) {
        const t = s / steps;
        const x = x0 + (x1 - x0) * t + Math.sin(t * 5 + x0) * 1.5, y = y0 + (y1 - y0) * t;
        const r = r0 + (r1 - r0) * t;
        for (let dx = -r; dx <= r; dx++) {
          const across = (dx + r) / (r * 2);
          put(ctx, Math.round(x + dx), Math.round(y), BARK[across < 0.3 ? 0 : across > 0.7 ? 2 : (Math.floor(y / 3 + dx) & 1) ? 2 : 1]);
        }
      }
    };
    // Roots, the great trunk, and boughs reaching out low.
    limb(cx - 14, h - 1, cx - 3, h - 12, 2, 4);
    limb(cx + 15, h - 1, cx + 3, h - 12, 2, 4);
    limb(cx, h - 1, cx - 2, h - 34, 8, 6);
    limb(cx - 2, h - 34, cx - 34, h - 58, 5, 2);
    limb(cx - 2, h - 34, cx + 32, h - 56, 5, 2);
    limb(cx - 2, h - 34, cx - 6, h - 72, 5, 2);
    limb(cx - 18, h - 46, cx - 44, h - 46, 3, 1);
    limb(cx + 16, h - 45, cx + 44, h - 44, 3, 1);
    // A wide low crown, in overlapping clouds lit from above.
    const lumps: { x: number; y: number; r: number }[] = [];
    for (let k = 0; k < 26; k++) {
      const a = rnd() * Math.PI * 2, d = Math.sqrt(rnd());
      lumps.push({ x: cx + Math.cos(a) * d * 44, y: 40 + Math.sin(a) * d * 24, r: 9 + rnd() * 8 });
    }
    lumps.sort((p, q) => p.y - q.y);
    for (const l of lumps) {
      for (let y = Math.floor(l.y - l.r); y <= l.y + l.r; y++) {
        for (let x = Math.floor(l.x - l.r); x <= l.x + l.r; x++) {
          if (x < 0 || x >= w || y < 0 || y >= h) continue;
          const dx = (x + 0.5 - l.x) / l.r, dy = (y + 0.5 - l.y) / (l.r * 0.82);
          if (dx * dx + dy * dy > 1 + (rnd() - 0.5) * 0.35) continue;
          // Gaps in the blossom low down, where the boughs show through.
          if (dy > 0.5 && rnd() < 0.35) continue;
          const light = 0.55 - dx * 0.2 - dy * 0.55 + (rnd() - 0.5) * 0.35;
          put(ctx, x, y, SAKURA[Math.max(0, Math.min(4, Math.floor(light * 5)))]);
        }
      }
    }
    return c;
  });

/** The abandoned teahouse: a sagging thatch with a hole in it, leaning posts, a loose shutter, and one window still lit. */
export const teahouseSprite = () =>
  cached('teahouse', () => {
    const w = 60, h = 46;
    const c = makeCanvas(w, h);
    const ctx = c.getContext('2d')!;
    const rnd = seededRandom(31);
    const WOOD_: Rgb[] = [[104, 80, 70], [72, 56, 56], [46, 36, 44]];
    // The step and the walls, in old vertical boards, a few gone.
    box(ctx, 6, h - 3, w - 12, 3, [92, 80, 76]);
    box(ctx, 6, h - 3, w - 12, 1, [128, 110, 96]);
    for (let x = 10; x < w - 10; x++) {
      const board = Math.floor(x / 3);
      if (board === 15) continue;
      box(ctx, x, 20, 1, h - 23, WOOD_[x % 3 === 0 ? 2 : board % 2 ? 1 : 0]);
    }
    // The missing board's dark gap, and the doorway hanging open.
    box(ctx, 45, 20, 3, h - 23, [20, 16, 26]);
    box(ctx, 15, 24, 11, h - 27, [24, 18, 28]);
    box(ctx, 15, 24, 1, h - 27, WOOD_[0]);
    box(ctx, 26, 25, 2, h - 28, WOOD_[1]);
    // The window, still lit, its lattice broken at one corner.
    box(ctx, 32, 24, 11, 9, SHOJI[0]);
    for (const x of [35, 39]) box(ctx, x, 24, 1, 9, SHOJI[1]);
    box(ctx, 32, 28, 11, 1, SHOJI[1]);
    box(ctx, 41, 24, 2, 3, [24, 18, 28]);
    // Leaning posts.
    for (let y = 18; y < h - 2; y++) {
      const lean = Math.round((y - 18) * 0.08);
      box(ctx, 8 + lean, y, 2, 1, WOOD_[0]);
      box(ctx, w - 10 - lean, y, 2, 1, WOOD_[1]);
    }
    // The thatch, sagging in the middle with a hole gone through it.
    const THATCH: Rgb[] = [[148, 124, 84], [116, 96, 70], [84, 70, 58], [58, 50, 48]];
    for (let x = 0; x < w; x++) {
      const t = (x + 0.5 - w / 2) / (w / 2);
      const sag = Math.round((1 - t * t) * 4);
      const top = Math.round(2 + Math.abs(t) * 11 + sag);
      const bottom = 22 + (Math.abs(t) > 0.9 ? -1 : 0) + Math.round(sag * 0.4);
      for (let y = top; y <= bottom; y++) {
        const f = (y - top) / Math.max(1, bottom - top);
        const straw = (x * 3 + y) % 5 === 0;
        put(ctx, x, y, THATCH[f > 0.86 ? 3 : straw ? 2 : f < 0.25 ? 0 : 1]);
      }
      if (rnd() < 0.3) put(ctx, x, bottom + 1, THATCH[2]);
    }
    // The hole, with the dark showing through, and moss on the low side.
    for (let y = 10; y < 16; y++) for (let x = 39; x < 39 + 7 - Math.abs(y - 13); x++) put(ctx, x, y, [22, 18, 30]);
    for (let k = 0; k < 40; k++) put(ctx, Math.floor(rnd() * 22) + 2, 16 + Math.floor(rnd() * 6), rnd() < 0.5 ? [70, 120, 74] : [48, 96, 66]);
    return c;
  });

/** A pale stone rock in the moss or the raked gravel, with a cap of moss. */
export const rockSprite = (seed: number, r: number) =>
  cached(`shrine-rock-${seed}-${r}`, () => {
    const w = r * 2 + 1, h = Math.round(r * 1.5) + 1;
    const c = makeCanvas(w, h);
    const ctx = c.getContext('2d')!;
    const rnd = seededRandom(seed * 3 + 11);
    const bumps = [rnd(), rnd(), rnd()];
    for (let x = 0; x < w; x++) {
      const t = (x + 0.5 - w / 2) / (w / 2);
      const top = Math.round((1 - Math.sqrt(1 - t * t)) * h * 0.7 + Math.sin(t * 5 + bumps[0] * 6) * 0.8);
      for (let y = Math.max(0, top); y < h; y++) {
        const d = y - top;
        const lit = t < 0.1 && d < 4;
        const col: Rgb = d < 2 ? (t < 0.4 ? [92, 148, 96] : [66, 118, 88]) : lit ? [150, 156, 172] : t > 0.45 || y > h - 3 ? [84, 90, 110] : [118, 124, 142];
        put(ctx, x, y, col);
      }
    }
    return c;
  });

/** A row of old Jizo in red bibs. */
export const jizoSprite = () => disguiseSprite('statue');

/** A stone guardian fox or lion-dog on a plinth, facing inward. */
export const guardianSprite = (kind: 'fox' | 'tanuki' | 'lion') =>
  cached(`guardian-${kind}`, () => {
    const S: Record<string, Rgb> = { s: [176, 182, 194], S: [138, 146, 164], d: [92, 98, 120], R: [226, 62, 48], r: [168, 38, 44], K: [66, 72, 92], Y: [228, 196, 110] };
    if (kind === 'fox') return fromRows([
      '.....sd.sd..',
      '.....sSdSS..',
      '....sSSSSSS.',
      '....SSKSSsss',
      '....sSSSssSK',
      '.....RRRRr..',
      '....sRRRRr..',
      '.s..SSSRrd..',
      'sSs.SSSSSd..',
      'sSSSSSSSSd..',
      '.SSSSSSSSd..',
      '.ddddSdSdd..',
      'ssssssssssss',
      'SSSSSSSSSSSS',
      'dddddddddddd',
    ], S);
    if (kind === 'tanuki') return fromRows([
      '...sYYYYYs...',
      '..YYYYYYYYY..',
      'YYYYYYYYYYYYY',
      '..ssSSSSSss..',
      '..sKKSSSKKs..',
      '..ssSSKSSss..',
      '...sSSSSSd...',
      'R.sSSSSSSSd..',
      'RrSSsssssSd..',
      'RrSsssssssSd.',
      'rrSsssssssSd.',
      '..SSsssssSSd.',
      '..ddd...ddd..',
    ], S);
    return fromRows([
      '..ssSSs...',
      '.sSSSSSs..',
      '.sKSSKSd..',
      '.SSSSSSd..',
      '.sdKKKd...',
      '..RRRRr...',
      '.sSSSSSs..',
      'sSSSSSSSd.',
      'SSSsSSSSd.',
      'SSdSSdSSd.',
      'ssssssssss',
      'dddddddddd',
    ], S);
  });

// --- plants --------------------------------------------------------------

const CEDAR_SETS: Rgb[][] = [
  [[12, 44, 54], [20, 62, 62], [32, 84, 72], [52, 112, 86], [108, 164, 136]],
  [[12, 40, 58], [18, 56, 68], [28, 76, 80], [46, 104, 96], [104, 158, 150]],
];
const BARK: Rgb[] = [[104, 72, 62], [72, 50, 50], [46, 34, 42], [32, 26, 36]];

/** A great cedar: a fibrous red trunk bare a long way up, then tiers of drooping dark boughs rimmed by the moon. */
export const cedarSprite = (seed: number, size: number) =>
  cached(`cedar-${seed}-${size}`, () => {
    const rnd = seededRandom(seed * 29 + size);
    const w = size * 2 + 4;
    const h = Math.round(size * 3.6);
    const c = makeCanvas(w, h);
    const ctx = c.getContext('2d')!;
    const cx = w / 2;
    const set = CEDAR_SETS[seed & 1];
    const tw = Math.max(3, Math.round(size * 0.24));
    // The trunk, flaring into roots at the foot, its bark in long stripes.
    for (let y = Math.round(h * 0.1); y < h; y++) {
      const flare = Math.max(0, y - (h - 7));
      const half = tw / 2 + flare * 0.7;
      for (let x = Math.floor(cx - half); x < cx + half; x++) {
        const across = (x + 0.5 - (cx - half)) / (half * 2);
        const tone = across < 0.22 ? 0 : across > 0.72 ? 2 : (Math.floor(x * 1.7 + (y >> 3)) & 3) === 0 ? 2 : 1;
        put(ctx, x, y, BARK[tone]);
      }
    }
    // Tiers of boughs from the bottom up, each a droopy skirt of lumps.
    const tiers = Math.round(4 + size / 9);
    const top = 2;
    const bottom = Math.round(h * 0.62);
    for (let k = tiers - 1; k >= 0; k--) {
      const t = (k + 0.5) / tiers;
      const y = Math.round(top + (bottom - top) * t);
      const half = Math.max(3, size * (0.26 + 0.74 * Math.pow(t, 0.8)));
      const skirt = Math.max(3, Math.round(((bottom - top) / tiers) * 1.45));
      for (let x = -half; x < half; x++) {
        const across = x / half;
        // The bough's edge scallops, hanging lowest at each lump.
        const sc = Math.abs(Math.sin((x + seed + k * 3) * 0.55)) * 2.4;
        const down = (1 - across * across) * skirt + sc;
        const up = (1 - Math.abs(across)) * skirt * 0.5;
        const yTop = Math.round(y - up);
        const yEnd = Math.round(y + down);
        for (let yy = yTop; yy <= yEnd; yy++) {
          const f = (yy - yTop) / Math.max(1, yEnd - yTop);
          const lit = across < 0.1 ? 1 : 0;
          let tone = f < 0.2 ? 3 : f < 0.55 ? 2 : f < 0.85 ? 1 : 0;
          if (!lit && tone > 1) tone--;
          if (rnd() < 0.07 && tone > 0) tone--;
          put(ctx, Math.round(cx + x), yy, set[tone]);
        }
        // A rim of moonlight along the upper-left of each tier.
        if (across < -0.08 && rnd() < 0.72) put(ctx, Math.round(cx + x), yTop, set[4]);
      }
    }
    return c;
  });

const MAPLE: Rgb[] = [[108, 24, 54], [168, 36, 56], [218, 60, 54], [244, 104, 62], [255, 168, 96]];
/** A maple in its autumn fire: cloud-layered crown on a dark twisting trunk. */
export const mapleSprite = (seed: number, r: number, gold = false) =>
  cached(`maple-${seed}-${r}-${gold}`, () => {
    const rnd = seededRandom(seed * 13 + r);
    const trunkH = Math.round(r * 0.9);
    const w = r * 2 + 8, h = Math.round(r * 1.5) + trunkH + 2;
    const c = makeCanvas(w, h);
    const ctx = c.getContext('2d')!;
    const cx = w / 2;
    const set: Rgb[] = gold ? [[126, 72, 36], [190, 120, 44], [236, 170, 60], [252, 208, 92], [255, 238, 150]] : MAPLE;
    // The trunk, leaning a little as it climbs.
    const lean = rnd() < 0.5 ? -1 : 1;
    for (let y = h - 1; y > h - trunkH - 6; y--) {
      const x = Math.round(cx + lean * Math.sin(((h - y) / trunkH) * 2.2) * 2);
      box(ctx, x - 2, y, 5, 1, [62, 42, 50]);
      box(ctx, x - 2, y, 2, 1, [108, 72, 66]);
    }
    const lumps: { x: number; y: number; r: number }[] = [];
    for (let k = 0; k < 7; k++) {
      const a = (k / 7) * Math.PI * 2 + rnd();
      lumps.push({ x: cx + Math.cos(a) * r * 0.6, y: r * 0.72 + Math.sin(a) * r * 0.32, r: r * (0.34 + rnd() * 0.16) });
    }
    lumps.push({ x: cx, y: r * 0.55, r: r * 0.55 });
    lumps.sort((a, b) => a.y - b.y);
    for (const l of lumps) {
      for (let y = Math.floor(l.y - l.r); y <= l.y + l.r; y++) {
        for (let x = Math.floor(l.x - l.r); x <= l.x + l.r; x++) {
          const dx = (x + 0.5 - l.x) / l.r, dy = (y + 0.5 - l.y) / (l.r * 0.82);
          const d = dx * dx + dy * dy;
          if (d > 1 + (rnd() - 0.5) * 0.28) continue;
          // Lit from the upper left; flecks of leaf instead of a smooth blob.
          const light = 0.55 - dx * 0.3 - dy * 0.55 + (rnd() - 0.5) * 0.3;
          put(ctx, x, y, set[Math.max(0, Math.min(4, Math.floor(light * 4.6)))]);
        }
      }
    }
    return c;
  });

const HYDRANGEA: Rgb[][] = [
  [[52, 66, 140], [84, 106, 200], [130, 156, 236]],
  [[92, 56, 140], [140, 88, 190], [186, 136, 226]],
  [[136, 58, 110], [190, 90, 146], [226, 142, 180]],
];
/** A hydrangea: a mound of broad leaves with a few round mopheads of one colour set well apart. */
export const hydrangeaSprite = (seed: number, kind: number) =>
  cached(`hydrangea-${seed}-${kind}`, () => {
    const rnd = seededRandom(seed * 19 + kind);
    const w = 20, h = 13;
    const c = makeCanvas(w, h);
    const ctx = c.getContext('2d')!;
    const LEAF: Rgb[] = [[20, 66, 62], [32, 92, 76], [52, 122, 90]];
    for (let y = 1; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const dx = (x + 0.5 - w / 2) / (w / 2), dy = (y + 0.5 - h) / (h - 1);
        if (dx * dx + dy * dy > 1 - rnd() * 0.08) continue;
        const light = -dx * 0.4 - dy * 0.8 - 0.1;
        put(ctx, x, y, LEAF[light > 0.45 ? 2 : light > 0.05 ? 1 : 0]);
      }
    }
    const set = HYDRANGEA[kind % HYDRANGEA.length];
    const spots = [[5, 6], [10, 4], [15, 6], [10, 9]];
    for (const [hx, hy] of spots) {
      const cx = hx + Math.floor(rnd() * 2) - 0.5, cy = hy + Math.floor(rnd() * 2) - 0.5;
      for (let y = Math.floor(cy - 3); y <= cy + 3; y++) {
        for (let x = Math.floor(cx - 3); x <= cx + 3; x++) {
          const dx = x + 0.5 - cx, dy = y + 0.5 - cy;
          if (dx * dx + dy * dy > 7 || x < 0 || x >= w || y < 0 || y >= h) continue;
          put(ctx, x, y, set[dy < -0.6 ? 2 : dy > 1.1 ? 0 : 1]);
        }
      }
    }
    return c;
  });

const LILY_HEAD = [
  '.R.....R.',
  '..r.s.r..',
  'R..RsR..R',
  '.rRRsRRr.',
  'R.rRRRr.R',
  '..r.g.r..',
];
/** A red spider lily: a head of thin curling petals and long stamens on a bare green stem. */
export const spiderLilySprite = (seed: number) =>
  cached(`spider-lily-${seed % 2}`, () => {
    const tall = seed % 2 ? 7 : 9;
    const rows = [...LILY_HEAD];
    for (let k = 0; k < tall; k++) rows.push(k > tall - 3 ? '....G....' : '....g....');
    return fromRows(rows, { R: [226, 58, 56], r: [160, 34, 52], s: [255, 176, 140], g: [84, 150, 92], G: [46, 110, 80] });
  });

/** Ferns, grass tufts, and glowing mushrooms for the understorey. */
export const fernSprite = (seed: number) =>
  cached(`shrine-fern-${seed % 4}`, () => {
    const rnd = seededRandom((seed % 4) * 41 + 9);
    const w = 18, h = 10;
    const c = makeCanvas(w, h);
    const ctx = c.getContext('2d')!;
    for (let k = 0; k < 7; k++) {
      const a = Math.PI * (0.12 + (k / 6) * 0.76);
      const len = 6 + rnd() * 4;
      for (let s = 0; s < len; s++) {
        const x = Math.round(w / 2 + Math.cos(a) * s * 1.1);
        const y = Math.round(h - 1 - Math.sin(a) * s * 0.9 + (s * s) / 18);
        if (y < 0 || y >= h) continue;
        put(ctx, x, y, s > len * 0.7 ? [116, 186, 112] : k % 2 ? [54, 134, 92] : [76, 158, 100]);
        if (s % 2 === 0 && s > 1) put(ctx, x, y + 1, [34, 96, 80]);
      }
    }
    return c;
  });
export const grassSprite = (seed: number) =>
  cached(`shrine-grass-${seed % 3}`, () => fromRows(
    [['g...g..g', '.g..G.g.', '.G.gG.G.', '..GGdGG.', '..dGdd..'], ['..g...g.', 'g.G..g..', '.GG.GG.g', '.dGGdGG.', '..dGdd..'], ['...g....', '.g.G..g.', '.G.G.gG.', '..GGGG..', '..dddd..']][seed % 3],
    { g: [120, 196, 118], G: [68, 150, 96], d: [36, 104, 84] },
  ));
export const glowshroomSprite = (seed: number) =>
  cached(`glowshroom-${seed % 3}`, () => fromRows(
    [['..cCCc...', '.cCCCCc..', 'CCCwCCCC.', '..ss..cCc', '..ss.cCCC', '..ss..ss.', '.sss..ss.'], ['.cCCc....', 'cCCwCc.c.', '..ss..cCc', '..ss...s.', '.sss...s.'], ['...cCCc..', '.cCCCCCCc', '...sss...', '....s....', '...ss....']][seed % 3],
    { c: [140, 244, 220], C: [74, 214, 200], w: [230, 255, 240], s: [190, 224, 206] },
  ));
export const persimmonSprite = () =>
  cached('persimmon', () => fromRows(['.gg.', 'OOOo', 'OaOo', '.oo.'], { g: [84, 140, 84], O: [250, 132, 40], o: [206, 88, 34], a: [255, 196, 110] }));

/** A sacred cedar, far bigger than its neighbours, with a rope and paper streamers round its trunk. */
export const sacredCedarSprite = (seed: number) =>
  cached(`sacred-cedar-${seed}`, () => {
    const inner = cedarSprite(seed, 50);
    const c = makeCanvas(inner.width, inner.height);
    const ctx = c.getContext('2d')!;
    ctx.drawImage(inner, 0, 0);
    const y = inner.height - 28;
    const cx = inner.width / 2;
    rope(ctx, Math.round(cx - 9), Math.round(cx + 9), y, 2);
    box(ctx, Math.round(cx - 9), y - 1, 18, 1, [244, 226, 170]);
    return c;
  });

/** A piece of bamboo: tall jointed cane, a burst of leaves near its top. One image, slid sideways slice by slice to bend. */
export const bambooSprite = (seed: number, len: number) =>
  cached(`bamboo-${seed % 5}-${len}`, () => {
    const rnd = seededRandom((seed % 5) * 37 + len);
    const w = 22, h = len + 6;
    const c = makeCanvas(w, h);
    const ctx = c.getContext('2d')!;
    const cx = Math.floor(w / 2);
    const tone = seed % 2;
    const COL: Rgb[] = tone ? [[122, 214, 122], [72, 176, 112], [40, 128, 96], [188, 240, 158]] : [[150, 222, 112], [92, 188, 100], [52, 140, 92], [208, 244, 150]];
    for (let y = 6; y < h; y++) {
      const node = (y + (seed & 7)) % 11 === 0;
      put(ctx, cx - 1, y, node ? COL[3] : COL[0]);
      put(ctx, cx, y, node ? COL[3] : COL[1]);
      put(ctx, cx + 1, y, node ? COL[0] : COL[2]);
    }
    // Sprays of leaves, thicker near the top.
    for (let k = 0; k < 9; k++) {
      const y0 = 3 + Math.floor(rnd() * len * 0.42);
      const side = rnd() < 0.5 ? -1 : 1;
      const l = 4 + Math.floor(rnd() * 5);
      for (let s = 0; s < l; s++) {
        const x = cx + side * (1 + s);
        const y = y0 + Math.round((s * s) / 8);
        if (x >= 0 && x < w && y < h) put(ctx, x, y, s < l / 2 ? COL[1] : k % 2 ? COL[0] : COL[2]);
        if (s > 1 && s < l - 1 && x >= 0 && x < w && y + 1 < h) put(ctx, x, y + 1, COL[2]);
      }
    }
    for (let x = cx - 2; x <= cx + 2; x++) for (let y = 0; y < 6; y++) if (rnd() < 0.55 - Math.abs(x - cx) * 0.08) put(ctx, x, y, COL[y < 3 ? 0 : 1]);
    return c;
  });

/** Pampas grass with silvery plumes. */
export const susukiSprite = (seed: number) =>
  cached(`susuki-${seed % 3}`, () => {
    const rnd = seededRandom((seed % 3) * 53 + 17);
    const w = 18, h = 24;
    const c = makeCanvas(w, h);
    const ctx = c.getContext('2d')!;
    for (let k = 0; k < 5; k++) {
      const x0 = 5 + Math.floor(rnd() * 8);
      const lean = (rnd() - 0.5) * 7;
      const tall = 13 + Math.floor(rnd() * 10);
      for (let s = 0; s < tall; s++) {
        const t = s / tall;
        const x = Math.round(x0 + lean * t * t), y = h - 1 - s;
        if (y < 0 || x < 0 || x >= w) continue;
        if (t > 0.62) {
          put(ctx, x, y, t > 0.86 ? [204, 206, 200] : [170, 176, 170]);
          if (x + 1 < w && s % 3 === 0) put(ctx, x + 1, y, [136, 148, 146]);
        } else put(ctx, x, y, t < 0.3 ? [46, 118, 88] : [84, 160, 100]);
      }
    }
    return c;
  });

/** A lotus pad and a pink flower for the koi ponds. */
export const lotusPadSprite = (r: number, tone: number) =>
  cached(`shrine-pad-${r}-${tone}`, () => {
    const set: Rgb[] = tone ? [[24, 90, 86], [52, 136, 104], [100, 180, 126]] : [[20, 84, 76], [42, 124, 88], [84, 168, 104]];
    const w = r * 2 + 1, h = Math.round(r * 1.2) + 2;
    const c = makeCanvas(w, h);
    const ctx = c.getContext('2d')!;
    const cx = w / 2, cy = (h - 1) / 2;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const nx = (x + 0.5 - cx) / r, ny = (y + 0.5 - cy) / (r * 0.6);
        const d = nx * nx + ny * ny;
        if (d > 1) continue;
        // The notch to one side.
        if (nx > 0.1 && Math.abs(ny) < 0.12 + nx * 0.1) continue;
        put(ctx, x, y, d > 0.74 && ny > 0 ? set[0] : nx + ny < -0.5 ? set[2] : set[1]);
      }
    }
    return c;
  });
export const lotusSprite = (kind: number) =>
  cached(`shrine-lotus-${kind}`, () => {
    const pal: Record<string, Rgb> = kind ? { a: [255, 252, 240], b: [240, 220, 232], c: [214, 170, 200], y: [255, 220, 110] } : { a: [255, 200, 220], b: [244, 132, 178], c: [200, 76, 140], y: [255, 220, 110] };
    return fromRows(['...a...', '.a.a.a.', 'abbabba', 'abbybba', '.cbbbc.', '..ccc..'], pal);
  });

/** The stones of a bamboo water spout on its pivot (the deer-scarer), tipped or level. */
export const spoutSprite = (tipped: boolean) =>
  cached(`spout-${tipped}`, () => fromRows(tipped
    ? ['......gG.', '.....gGG.', '....gGg..', '..gGGg...', '.gGGg.b..', 'gGg..bb..', 'sSSSSSSSs', 'dddddddd.']
    : ['gGGg.....', '.gGGGg...', '...gGGGg.', '.....gGGg', '....b....', '...bb....', 'sSSSSSSSs', 'dddddddd.'],
  { g: [110, 196, 110], G: [68, 156, 96], b: [116, 84, 62], s: [160, 166, 180], S: [122, 128, 148], d: [84, 90, 110] }));

// --- particles -----------------------------------------------------------

const SMOKE = [
  ['..aaaa..', '.aaAAaa.', 'aaAAAAaa', 'aAAAAAAa', 'aaAAAAaa', '.bAAAab.', '..bbbb..'],
  ['.aaa.aa.', 'aaAAaaAa', 'aAAAAAAa', '.aAAAAa.', 'bbaAAab.', '.bb.bb..'],
  ['.a....a.', 'aAa..aAa', '.a.aa.a.', '...AA...', '.b....b.'],
  ['........', '...a....', '.a....a.', '...b....'],
];
export const smokeSprite = (frame: number) =>
  cached(`shrine-smoke-${frame}`, () => fromRows(SMOKE[Math.min(SMOKE.length - 1, frame)], { a: [236, 238, 248], A: [255, 255, 255], b: [176, 186, 216] }));

const DUST = [['..aa..', '.aAAa.', 'aAAAAa', '.aAAa.', '..aa..'], ['.a..a.', 'a.AA.a', '.AAAA.', 'a.AA.a', '.a..a.'], ['.a....', '...a..', 'a....a', '..a...']];
export const dustSprite = (frame: number) =>
  cached(`shrine-dust-${frame}`, () => fromRows(DUST[Math.min(DUST.length - 1, frame)], { a: [178, 170, 170], A: [216, 206, 194] }));

export const STAR = ['..y..', '.yYy.', 'yYWYy', '.yYy.', '..y..'];
export const starSprite = () => cached('shrine-star', () => fromRows(STAR, { y: [252, 196, 70], Y: [255, 224, 110], W: [255, 250, 210] }));
export const noteSprite = () => cached('shrine-note', () => fromRows(['..nn', '..n.', '..n.', 'nnn.', 'nn..'], { n: [255, 226, 130] }));
export const heartSprite = () => cached('shrine-heart', () => fromRows(['.pp.pp.', 'pPPpPPp', 'pPPPPPp', '.pPPPp.', '..pPp..', '...p...'], { p: [240, 96, 130], P: [255, 170, 190] }));
export const bangSprite = () => cached('shrine-bang', () => fromRows(['.yy.', '.yy.', '.yy.', '.y..', '....', '.yy.'], { y: [255, 224, 110] }));
export const whatSprite = () => cached('shrine-what', () => fromRows(['.www.', 'w...w', '...w.', '..w..', '.....', '..w..'], { w: [230, 240, 255] }));
export const zedSprite = () => cached('shrine-zed', () => fromRows(['zzzz', '..z.', '.z..', 'zzzz'], { z: [190, 206, 244] }));
export const fallingLeafSprite = (kind: number, frame: number) =>
  cached(`shrine-fall-${kind}-${frame}`, () => {
    const col = SHRINE_FLOOR.leaf[kind % SHRINE_FLOOR.leaf.length];
    return fromRows(frame % 2 ? ['.a.', 'aaa', '.a.'] : ['a.', '.a'], { a: col });
  });
export const fireflySprite = () => cached('shrine-firefly', () => fromRows(['..a..', '.bcb.', 'acdca', '.bcb.', '..a..'], { a: [44, 62, 20], b: [78, 106, 32], c: [170, 210, 72], d: [246, 255, 176] }));
export const dreamSprite = (frame: number) =>
  cached(`shrine-dream-${frame % 2}`, () => fromRows(frame % 2 ? ['.ab.', 'abca', '.bab', '..a.'] : ['..a.', '.bab', 'acba', '.ba.'], { a: [214, 110, 180], b: [250, 158, 214], c: [255, 226, 244] }));
export const sporeSprite = () => cached('shrine-spore', () => fromRows(['.a.', 'aba', '.a.'], { a: [70, 170, 160], b: [190, 255, 236] }));
export const petalSprite = () => cached('shrine-petal', () => fromRows(['ab'], { a: [196, 160, 240], b: [150, 110, 214] }));
export const sakuraPetalSprite = (frame: number) =>
  cached(`shrine-sakura-petal-${frame % 2}`, () => fromRows(frame % 2 ? ['ab', '.a'] : ['.b', 'ab'], { a: [226, 150, 186], b: [250, 196, 216] }));
/** A wisp of steam: pale, gapped, more air than vapour. */
export const steamSprite = (frame: number) =>
  cached(`shrine-steam-${frame}`, () => fromRows(
    [['..aa..', '.aAAa.', '..aa..'], ['.a.aa.', 'aAAAa.', '.aAAAa', '..a.a.'], ['a..aa..', '.aAAaa.', 'a.AAAa.', '.a.a..a', '...a...']][Math.min(2, frame)],
    { a: [190, 210, 220], A: [228, 238, 240] },
  ));
export const tongueSprite = (frame: number) =>
  cached(`akaname-tongue-${frame % 2}`, () => fromRows(frame % 2 ? ['TTTTTTTt.', 'ttTTTTTTt', '.ttttTTTt', '.....ttt.'] : ['TTTTTTTTt', 'ttTTTTTTT', '.ttttttTt', '.......t.'], { T: [246, 130, 150], t: [206, 86, 118] }));
export const crumbSprite = () => cached('shrine-crumb', () => fromRows(['a'], { a: [244, 236, 214] }));
export const bloodSprite = () => cached('shrine-blood', () => fromRows(['r'], { r: [200, 40, 50] }));
export const tuftSprite = () => cached('shrine-tuft', () => fromRows(['a'], { a: [214, 196, 170] }));

/**
 * The pool of light a lantern throws: dithered bands fading out from the
 * middle, squashed to lie flat on the ground, as a canvas of one colour on
 * black so it can be added over the floor or laid over sprites.
 */
export const pool = (r: number, colour: Rgb, transparent: boolean) =>
  cached(`shrine-pool-${r}-${colour.join(',')}-${transparent}`, () => {
    const w = r * 2, h = Math.round(r * 1.3);
    const c = makeCanvas(w, h);
    const ctx = c.getContext('2d')!;
    const img = ctx.createImageData(w, h);
    const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const dx = (x + 0.5 - w / 2) / (w / 2), dy = (y + 0.5 - h / 2) / (h / 2);
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d >= 1) continue;
        // Four flat steps, dithered where they meet.
        const v = (1 - d) * (1 - d) * 4 + (BAYER[(y & 3) * 4 + (x & 3)] / 16 - 0.5) * 0.5;
        const step = Math.max(0, Math.min(4, Math.round(v))) / 4;
        if (step <= 0) continue;
        const i = (y * w + x) * 4;
        if (transparent) {
          img.data[i] = colour[0]; img.data[i + 1] = colour[1]; img.data[i + 2] = colour[2]; img.data[i + 3] = Math.round(step * 255);
        } else {
          img.data[i] = colour[0] * step; img.data[i + 1] = colour[1] * step; img.data[i + 2] = colour[2] * step; img.data[i + 3] = 255;
        }
      }
    }
    ctx.putImageData(img, 0, 0);
    return c;
  });

/**
 * A hole of light for the darkness (see the view's night layer): a white disc
 * whose alpha falls away in many fine dithered steps, flat on the ground.
 */
export const lightHole = (r: number) =>
  cached(`shrine-hole-${r}`, () => {
    const w = r * 2, h = Math.round(r * 1.4);
    const c = makeCanvas(w, h);
    const ctx = c.getContext('2d')!;
    const img = ctx.createImageData(w, h);
    const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
    const STEPS = 6;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const dx = (x + 0.5 - w / 2) / (w / 2), dy = (y + 0.5 - h / 2) / (h / 2);
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d >= 1) continue;
        const v = Math.pow(1 - d, 1.25) * STEPS * 1.15 + (BAYER[(y & 3) * 4 + (x & 3)] / 16 - 0.5) * 0.9;
        const step = Math.max(0, Math.min(STEPS, Math.round(v))) / STEPS;
        const i = (y * w + x) * 4;
        img.data[i] = 255; img.data[i + 1] = 255; img.data[i + 2] = 255; img.data[i + 3] = Math.round(step * 255);
      }
    }
    ctx.putImageData(img, 0, 0);
    return c;
  });

/** A tile of ground mist: long soft banks, dithered thin, wrapping at its edges. */
export const mistTile = (size: number) =>
  cached(`shrine-mist-${size}`, () => {
    const c = makeCanvas(size, size);
    const ctx = c.getContext('2d')!;
    const img = ctx.createImageData(size, size);
    const k = (Math.PI * 2) / size;
    const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        // Stretched sideways, as mist lies.
        const a = Math.sin(k * (x + 2 * y) + 1.1 * Math.sin(k * 3 * y)) + Math.sin(k * (2 * x - 3 * y) + 0.8 * Math.sin(k * (x + y))) + 0.6 * Math.sin(k * 7 * y + k * x);
        const v = (a + 0.2) / 2.4 + (BAYER[(y & 3) * 4 + (x & 3)] / 16 - 0.5) * 0.45;
        if (v <= 0.14) continue;
        const i = (y * size + x) * 4;
        img.data[i] = 255; img.data[i + 1] = 232; img.data[i + 2] = 204;
        img.data[i + 3] = Math.round(Math.min(1, v) * 170);
      }
    }
    ctx.putImageData(img, 0, 0);
    return c;
  });

/** A tile of soft moonlight falling through the boughs: blobs in a few flat levels, dithered at their edges. */
export const dappleTile = (size: number, colour: Rgb) =>
  cached(`shrine-dapple-${size}-${colour.join(',')}`, () => {
    const c = makeCanvas(size, size);
    const ctx = c.getContext('2d')!;
    const img = ctx.createImageData(size, size);
    const k = (Math.PI * 2) / size;
    const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        // Crossed waves, wrapping at the tile's edges.
        const a = Math.sin(k * (2 * x + y) + 1.3 * Math.sin(k * (y - x))) + Math.sin(k * (3 * y - x) + 0.9 * Math.sin(k * 2 * x)) + 0.7 * Math.sin(k * (5 * x + 2 * y));
        const v = Math.max(0, (a - 0.35) / 1.9) * 3 + (BAYER[(y & 3) * 4 + (x & 3)] / 16 - 0.5) * 0.6;
        const step = Math.max(0, Math.min(3, Math.round(v))) / 3;
        const i = (y * size + x) * 4;
        img.data[i] = colour[0] * step; img.data[i + 1] = colour[1] * step; img.data[i + 2] = colour[2] * step; img.data[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    return c;
  });

// --- icons for the panels ----------------------------------------------------

export const shrineIcon = (kind: string): HTMLCanvasElement => {
  switch (kind) {
    case 'tanuki': return tanukiSprite('stand', 0);
    case 'kitsune': return kitsuneSprite('stand', 0);
    case 'hahaki': return animalSprite('hahaki');
    case 'mouse': return animalSprite('mouse');
    case 'deer': return animalSprite('deer');
    case 'hare': return animalSprite('hare');
    case 'owl': return animalSprite('owl');
    case 'bat': return animalSprite('bat0');
    case 'crow': return animalSprite('crow');
    case 'frog': return animalSprite('frog');
    case 'koi': return koiSprite(0, 0);
    case 'kappa': return animalSprite('kappa');
    case 'kodama': return animalSprite('kodama');
    case 'hitodama': return hitodamaSprite(0);
    case 'kasa': return animalSprite('kasa');
    case 'chochin': return animalSprite('chochin');
    case 'baku': return animalSprite('baku');
    case 'nekomata': return animalSprite('nekoSit');
    case 'akaname': return animalSprite('akaname');
    case 'tsuchinoko': return tsuchinokoSprite(0);
    default: return animalSprite('hare');
  }
};
