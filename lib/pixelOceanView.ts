// Draws the reef from a camera looking down at the seabed at an angle.
//
// The seabed scrolls one-to-one with the page. Anything off the floor is
// lifted up the screen by its height and drawn a little bigger (it is closer
// to the camera), with a shadow left on the floor beneath it.
//
// Every canvas sits in the page, so the browser scrolls them natively
// between frames. The seabed and its light cover the whole page at one canvas
// pixel per cell and never move; only the rows around the view are repainted.
// The sprites are drawn at screen resolution into a window around the view;
// when that window moves, the next one is drawn into a second canvas and the
// page swaps them once it is ready, so the reef can be drawn off the main
// thread without the sprites ever jumping. Nothing here touches the DOM: the
// page is told where to put the canvases through `onLayout`.

import {
  Anemone, AnemoneField, Carcass, Creature, Drop, ELEVATION, Kelp, Lettuce, Meadow, PixelOcean, SPECIES, SURFACE, SeaFan, SeaWhip, Species,
  Station, WeedKind, WhaleFall,
} from './pixelOcean';
import {
  FLOOR, SpriteKind, buildCaustics, makeCanvas, creatureSprite, creaturePalette, bonesSprite, bubbleSprite, pelletSprite,
  shadowSprite, rockSprite, coralSprite, starfishSprite, cuttleSprite, whaleSprite, silhouetteSprite, puffSprite, fizzSprite, PUFF_FRAMES,
  gardenEelSprite, GARDEN_EEL_FRAMES, fanSprite, lettuceSprite, LETTUCE_FRAMES,
} from './pixelOceanArt';

/** How much bigger things get per unit of height. */
const PERSPECTIVE = 0.0035;
const CAUSTIC_SIZE = 64;
const CAUSTIC_FRAMES = 32;
/** Rows of seabed painted a frame, away from the view, until the whole page has been. */
const BACKLOG_ROWS = 160;
/** Sand, moss and blood change slowly: repaint them every this many ticks. */
const SEABED_EVERY = 8;
/** The caustic light is darkened with depth in bands this many cells tall. */
const CAUSTIC_BAND = 16;
/** How much darker the seabed gets from the top of the page to the bottom. */
const DEPTH_DARKENING = 0.4;
/**
 * Sprites are drawn only this far (in world units) beyond the viewport. The
 * canvases cover a screen either side so native scrolling between frames
 * never shows a gap, but nobody sees that far out before the next frame.
 */
const SPRITE_MARGIN = 60;

/** Sprite widths in art pixels, for shadows and the inspection reticle. */
const BODY_WIDTH: Record<Species, number> = {
  minnow: 10, barracuda: 18, crab: 11, jelly: 9, turtle: 16, puffer: 9, seahorse: 6, urchin: 7,
  octopus: 12, eel: 10, shark: 26, manta: 20, angler: 13,
  clownfish: 12, starfish: 15, cuttlefish: 16, dolphin: 26,
  shrimp: 8, mantis: 14, gardenEel: 4, lionfish: 15, hermit: 10,
};
/**
 * How much bigger (or smaller) than its sprite each animal is drawn, so they
 * sit at roughly the right sizes next to each other: true scale would leave
 * a minnow a pixel long beside a shark, so big animals grow less than they
 * should. 1.5 and 2 stay on whole screen pixels at the default pixel size.
 */
const SIZE: Partial<Record<Species, number>> = {
  manta: 2, shark: 1.5, dolphin: 1.5, turtle: 1.5, barracuda: 1.5, eel: 1.3,
  cuttlefish: 1.2, puffer: 1.2, clownfish: 0.85, shrimp: 0.85, mantis: 0.8, starfish: 0.75,
};
for (const s of Object.keys(SIZE) as Species[]) BODY_WIDTH[s] *= SIZE[s]!;

/** Which bones a picked-clean fish leaves, and at what size. */
const BONES_OF: Partial<Record<Species, ['minnow' | 'barracuda', number]>> = {
  minnow: ['minnow', 1], puffer: ['minnow', 0.9], angler: ['minnow', 1.3],
  barracuda: ['barracuda', 1], eel: ['barracuda', 0.9], shark: ['barracuda', 1.5],
  clownfish: ['minnow', 1], dolphin: ['barracuda', 1.5], lionfish: ['minnow', 1.2],
};

const BLOOD = ['rgb(110,10,24)', 'rgb(176,18,40)', 'rgb(226,44,64)'];
const GOO = ['rgb(200,120,200)', 'rgb(240,170,230)', 'rgb(255,214,246)'];
const INK = ['rgb(14,10,24)', 'rgb(24,18,38)', 'rgb(36,28,52)'];
const DROP_COLORS: Record<Drop['kind'], string[]> = {
  blood: BLOOD, goo: GOO, ink: INK,
  heart: ['rgb(255,110,150)', 'rgb(255,150,180)', 'rgb(255,190,210)'],
  sand: ['rgb(150,140,110)', 'rgb(178,166,130)', 'rgb(120,112,90)'],
  scent: ['rgb(200,70,90)', 'rgb(220,100,110)', 'rgb(180,60,80)'],
  sparkle: ['rgb(255,255,255)', 'rgb(200,250,255)', 'rgb(255,240,200)'],
  puff: [],
  flash: ['rgb(255,255,255)', 'rgb(255,246,190)', 'rgb(190,240,255)'],
};
// Pixel shapes for the particles that aren't plain squares.
const HEART = ['.X.X.', 'XXXXX', 'XXXXX', '.XXX.', '..X..'];
const SPARKLE = ['.X.', 'XXX', '.X.'];
/** Anemone colours: [base, stalk, tip]. */
const ANEMONE = [
  ['rgb(150,40,90)', 'rgb(232,96,150)', 'rgb(255,190,220)'],
  ['rgb(90,50,140)', 'rgb(160,110,220)', 'rgb(230,200,255)'],
  ['rgb(40,110,80)', 'rgb(80,190,130)', 'rgb(190,255,210)'],
];
/** How fast each swimmer must go to leave a wake of disturbed water behind it. */
const WAKE_SPEED: Partial<Record<Species, number>> = {
  minnow: 0.55, barracuda: 0.6, shark: 0.55, dolphin: 0.7, cuttlefish: 0.35, puffer: 0.4, clownfish: 0.4, turtle: 0.35,
  shrimp: 0.7, lionfish: 0.5,
};
/** Meadow colours by blade kind and shade: [base, middle, tip]. */
const WEEDS: Record<WeedKind, string[][]> = {
  seagrass: [
    ['rgb(40,112,70)', 'rgb(58,146,82)', 'rgb(98,182,96)'],
    ['rgb(52,112,58)', 'rgb(82,148,70)', 'rgb(136,188,92)'],
    ['rgb(34,98,72)', 'rgb(50,128,86)', 'rgb(84,166,106)'],
  ],
  red: [
    ['rgb(124,32,54)', 'rgb(178,52,72)', 'rgb(232,104,116)'],
    ['rgb(140,44,40)', 'rgb(196,76,62)', 'rgb(240,132,104)'],
  ],
  purple: [
    ['rgb(72,42,112)', 'rgb(116,64,166)', 'rgb(170,118,218)'],
    ['rgb(96,40,118)', 'rgb(146,70,180)', 'rgb(206,142,232)'],
  ],
};
/** Sea whip colours: [base, stalk, tip]: red, orange, yellow, purple, white. */
const WHIPS = [
  ['rgb(150,30,42)', 'rgb(214,56,64)', 'rgb(255,146,134)'],
  ['rgb(170,80,30)', 'rgb(236,132,50)', 'rgb(255,204,124)'],
  ['rgb(160,130,30)', 'rgb(226,196,60)', 'rgb(255,242,152)'],
  ['rgb(92,40,132)', 'rgb(152,82,202)', 'rgb(222,174,250)'],
  ['rgb(140,144,156)', 'rgb(210,212,220)', 'rgb(255,255,255)'],
];
/** Small anemone colours: [foot, stalk, tip]: pink, purple, green, orange, teal, yellow. */
const POLYPS = [
  ['rgb(120,40,80)', 'rgb(230,92,152)', 'rgb(255,194,222)'],
  ['rgb(70,46,120)', 'rgb(152,102,222)', 'rgb(228,204,255)'],
  ['rgb(30,92,62)', 'rgb(72,182,122)', 'rgb(192,255,204)'],
  ['rgb(130,62,30)', 'rgb(240,132,62)', 'rgb(255,212,152)'],
  ['rgb(24,88,96)', 'rgb(52,172,182)', 'rgb(176,250,250)'],
  ['rgb(120,100,30)', 'rgb(230,202,62)', 'rgb(255,246,172)'],
];
/** Where each kind's colour sets start in the one list the runs are kept by. */
const WEED_FIRST: Record<WeedKind, number> = { seagrass: 0, red: 3, purple: 5 };
const WEED_SETS = [...WEEDS.seagrass, ...WEEDS.red, ...WEEDS.purple];
/** Seagrass is drawn in bands this deep, each sorted with whatever swims among it. */
const GRASS_BAND = 3;
/** How far (cells) a swimmer parts the seagrass around it. */
const GRASS_PART = 6;
/** Coral spawn: pink eggs and white sperm bundles. */
const SPAWN_COLORS = ['rgb(255,150,190)', 'rgb(255,240,246)'];
/**
 * God rays: shafts of sunlight slanting down through the water, swaying
 * slowly and fading out with depth (in cells, the fade's scale).
 */
const RAYS = 5;
const RAY_SLANT = 0.45;
const RAY_DEPTH = 380;
const RAY_COLOR: [number, number, number] = [44, 70, 62];
/** How dark the water gets on a coral spawning night. */
const NIGHT_SHADE = 0.42;
const KELP_BASE = 'rgb(34,104,70)';
const KELP_STALK = 'rgb(48,140,84)';
const KELP_LEAF = 'rgb(64,160,90)';
const KELP_TIP = 'rgb(120,200,110)';
/** Kelp colours by run: base, stalk, leaves, tip. */
const KELP_COLORS = [KELP_BASE, KELP_STALK, KELP_LEAF, KELP_TIP];

interface Drawable { depth: number; draw: () => void }

interface SpriteOptions {
  alpha?: number;
  flipX?: boolean;
  /** -1 draws it upside down; values in between squash it mid-roll. */
  scaleY?: number;
  angle?: number;
  scale?: number;
  /** Draw only this column range of the sprite (a half). */
  sx?: number;
  sw?: number;
  anchor?: 'bottom' | 'center';
}

/**
 * Animals far above the reef that never come down: now and then one passes
 * overhead and only its shadow slides across the screen. Sizes are in sprite
 * cells times this scale, speeds in screen pixels per tick.
 */
const PASSERS: { kind: SpriteKind | 'whale'; scale: number; speed: number; count: number; spread: number }[] = [
  { kind: 'whale', scale: 3.2, speed: 2, count: 1, spread: 0 },
  { kind: 'manta', scale: 5, speed: 2.6, count: 1, spread: 0 },
  { kind: 'manta', scale: 4, speed: 2.8, count: 2, spread: 130 },
  { kind: 'shark', scale: 4.5, speed: 3.4, count: 1, spread: 0 },
  { kind: 'turtle', scale: 5, speed: 1.8, count: 1, spread: 0 },
  { kind: 'dolphin', scale: 4, speed: 5.5, count: 3, spread: 120 },
  { kind: 'minnow', scale: 2.5, speed: 4.5, count: 16, spread: 260 },
];
/** Ticks between passing shadows. */
const PASSER_GAP: [number, number] = [600, 1300];
const PASSER_ALPHA = 0.28;

/** Where the page should put the reef's canvases, in CSS pixels. */
export type ReefLayout =
  /** The seabed and light canvases: the whole world, from the top of the page. */
  | { kind: 'floor'; width: number; height: number }
  /** Show this sprite canvas (and hide the other) at this place on the page. */
  | { kind: 'sprites'; buffer: number; top: number; width: number; height: number };

interface Passer {
  kind: SpriteKind | 'whale';
  scale: number;
  speed: number;
  dir: 1 | -1;
  /** Where on the page the group's centre crosses (page pixels), so it scrolls with the seabed. */
  y: number;
  start: number;
  /** Each member's offset from the group's centre, and its own beat. */
  members: { dx: number; dy: number; phase: number }[];
  /** How far the group reaches either side of its centre. */
  reach: number;
}

export class OceanView {
  /** Top of the drawn region, in page pixels. */
  regionTop = 0;
  regionHeight = 0;
  /** Set while a courting creature is redrawn as a glow over itself. */
  private glow = false;
  /** Kelp squares by colour (left, top, size each), reused from stalk to stalk. */
  private kelpRuns: number[][] = [[], [], [], []];
  /** The same for seagrass: three shades of blade, three colours each. */
  private grassRuns: number[][] = Array.from({ length: WEED_SETS.length * 3 }, () => []);
  /** Sea whip and small anemone rectangles by colour (left, top, width, height each). */
  private whipRuns: number[][] = Array.from({ length: WHIPS.length * 3 }, () => []);
  private polypRuns: number[][] = Array.from({ length: POLYPS.length * 3 }, () => []);
  /** Swimmers among the seagrass of the meadow being drawn (x, z each). */
  private movers: number[] = [];
  /**
   * Set by the page when frames are slow to draw: the finishing touches
   * (wakes, sun rays, shadows passing overhead, the whale's bacterial mat)
   * are left out until it catches up.
   */
  lean = false;
  /** The creature being drawn's squash and stretch (positive stretches it along its length). */
  private stretch = 0;
  /** The creature (or carcass) being drawn's size relative to its sprite (see SIZE). */
  private size = 1;
  /** The creature under inspection, drawn with a reticle. */
  highlighted: Creature | null = null;

  private floorCtx: CanvasRenderingContext2D;
  private spriteCtx: CanvasRenderingContext2D;
  private lightCtx: CanvasRenderingContext2D;
  private spriteCtxs: CanvasRenderingContext2D[];
  /** The sprite canvas being drawn into, and frames left before the page may show it. */
  private buffer = 1;
  private pendingShow = 0;
  private floorImage: ImageData | null = null;
  private floorPixels = new Uint32Array(0);
  private caustics = buildCaustics(CAUSTIC_SIZE, CAUSTIC_FRAMES);
  private scrollY = 0;
  private viewW = 0;
  private viewH = 0;
  /** What the floor canvas last showed; it is only repainted when this changes. */
  private floorKey = '';
  private seabedKey = '';
  /** One tileable canvas per frame of the caustic light, built on first use. */
  private causticTiles: HTMLCanvasElement[] = [];
  /**
   * Each seabed cell's finished colour when nothing is on it (sand, darkened
   * for depth). Terrain never changes, so it is worked out once per world
   * size; only cells with moss, blood or caustic light are mixed each frame.
   */
  private sandCache = new Uint32Array(0);
  private sandCacheSize = '';
  private sandRowsDone = new Uint8Array(0);
  /** The first seabed row not yet painted since the floor was placed, and the band it is painted through. */
  private backlogRow = 0;
  private backlogImage: ImageData | null = null;
  private backlogWait = 0;
  private passer: Passer | null = null;
  private nextPasser = 450;

  constructor(
    private ocean: PixelOcean,
    private floorCanvas: HTMLCanvasElement,
    /** The moving caustic light, on its own canvas blended over the floor. */
    private lightCanvas: HTMLCanvasElement,
    /** Two sprite canvases, taking turns as the window around the view moves. */
    private spriteCanvases: [HTMLCanvasElement, HTMLCanvasElement],
    private px: number,
    /** Tells the page where to put the canvases. */
    private onLayout: (layout: ReefLayout) => void,
    /**
     * Frames to keep drawing a new sprite window before the page shows it:
     * 1 on the main thread, 2 from a worker, whose frames reach the screen
     * only after the message saying they're ready might.
     */
    private showDelay = 1,
  ) {
    this.floorCtx = floorCanvas.getContext('2d', { alpha: false }) as CanvasRenderingContext2D;
    this.lightCtx = lightCanvas.getContext('2d', { alpha: false }) as CanvasRenderingContext2D;
    this.spriteCtxs = spriteCanvases.map(c => c.getContext('2d') as CanvasRenderingContext2D);
    this.spriteCtx = this.spriteCtxs[0];
  }

  // --- camera -------------------------------------------------------------

  /**
   * World point to region-local canvas pixels, plus its scale. Height lifts a
   * thing up the screen and makes it bigger, but it stays over its own spot on
   * the page: spreading it from the view's centre would make tall kelp slide
   * across the content as the page scrolls.
   */
  private project(x: number, z: number, h: number) {
    return {
      x: x * this.px,
      y: (z - h * ELEVATION) * this.px - this.regionTop,
      s: 1 + h * PERSPECTIVE,
    };
  }

  /** The world point under a point on the page at a given height. */
  pageToWorld(x: number, pageY: number, h: number) {
    return { x: x / this.px, z: pageY / this.px + h * ELEVATION };
  }

  /** Where a creature is drawn, in page pixels. */
  pagePosition(c: Creature) {
    return { x: c.x * this.px, y: (c.z - c.h * ELEVATION) * this.px };
  }

  /** The creature drawn nearest a point on the page, if one is within reach. */
  pick(x: number, pageY: number, reach = 24): Creature | null {
    let best: Creature | null = null;
    let bestD = reach * reach;
    for (const c of this.ocean.creatures) {
      const p = this.pagePosition(c);
      const d = (p.x - x) ** 2 + (p.y - pageY) ** 2;
      if (d < bestD) { bestD = d; best = c; }
    }
    return best;
  }

  // --- frame --------------------------------------------------------------

  /**
   * Whether scrolling alone calls for a redraw. Nothing is drawn relative to
   * the screen (the canvases scroll with the page), so only once the view has
   * moved far enough that sprites just past the drawn margin could show.
   */
  scrolledFar(scrollY: number) {
    return Math.abs(scrollY - this.scrollY) >= (SPRITE_MARGIN * this.px) / 2;
  }

  render(scrollY: number, viewW: number, viewH: number) {
    const { px, ocean } = this;
    this.scrollY = scrollY;

    // Viewport plus half a screen either side, clamped to the world.
    // The region moves in quarter-screen steps, so scrolling only repaints
    // the seabed when it has to (it still covers the viewport with room to spare).
    const step = Math.max(1, Math.ceil(viewH / 4 / px));
    const rows = Math.min(ocean.h, Math.ceil((viewH * 2) / px) + step);
    const top = Math.max(0, Math.min(ocean.h - rows, Math.floor((scrollY - viewH / 2) / px / step) * step));
    if (this.floorCanvas.width !== ocean.w || this.floorCanvas.height !== ocean.h) this.placeFloor();
    if (!this.floorImage || this.floorImage.height !== rows) this.makeFloorImage(rows);
    const regionTop = top * px;
    const regionHeight = rows * px;
    if (regionTop !== this.regionTop || regionHeight !== this.regionHeight || viewW !== this.viewW) {
      this.regionTop = regionTop;
      this.regionHeight = regionHeight;
      this.viewW = viewW;
      this.placeSprites();
    }
    this.viewH = viewH;

    // Sand, moss and blood change slowly, so their pixels are worked out on a
    // slow clock. The caustic light moves every other tick, but it is just a
    // tiled texture laid over them, which is cheap.
    const seabedKey = `${top},${rows},${Math.floor(ocean.tick / SEABED_EVERY)}`;
    if (seabedKey !== this.seabedKey) {
      this.seabedKey = seabedKey;
      this.renderSeabed(top, rows);
      if (this.floorImage) this.floorCtx.putImageData(this.floorImage, 0, top);
    }
    const floorKey = `${top},${rows},${ocean.tick >> 1}`;
    if (floorKey !== this.floorKey) {
      this.floorKey = floorKey;
      this.renderFloor(top, rows);
    }
    this.renderSprites();
    this.paintBacklog();
    // A new sprite window goes up once its frames have had time to land.
    if (this.pendingShow > 0 && --this.pendingShow === 0) {
      this.onLayout({ kind: 'sprites', buffer: this.buffer, top: this.regionTop, width: this.viewW, height: this.regionHeight });
    }
  }

  /**
   * Sizes the seabed and light canvases to the whole world. The rows around
   * the view are painted straight away; the rest of the page follows a band
   * a frame (see paintBacklog), rather than holding up the first frame.
   */
  private placeFloor() {
    const { floorCanvas, lightCanvas, ocean, px } = this;
    floorCanvas.width = lightCanvas.width = ocean.w;
    floorCanvas.height = lightCanvas.height = ocean.h;
    this.onLayout({ kind: 'floor', width: ocean.w * px, height: ocean.h * px });
    this.backlogRow = 0;
    this.backlogWait = 1;
    this.seabedKey = '';
    this.floorKey = '';
  }

  /** Paints the next band of seabed not yet painted since the floor was placed. */
  private paintBacklog() {
    const { ocean } = this;
    if (this.backlogRow >= ocean.h) return;
    // Not on the first frame after placing the floor: that one comes first.
    if (this.backlogWait > 0) { this.backlogWait--; return; }
    if (!this.backlogImage || this.backlogImage.width !== ocean.w) {
      this.backlogImage = this.floorCtx.createImageData(ocean.w, BACKLOG_ROWS);
    }
    const n = Math.min(BACKLOG_ROWS, ocean.h - this.backlogRow);
    // renderSeabed paints into the floor image; borrow it for the band.
    const [image, pixels] = [this.floorImage, this.floorPixels];
    this.floorImage = this.backlogImage;
    this.floorPixels = new Uint32Array(this.backlogImage.data.buffer);
    this.renderSeabed(this.backlogRow, n);
    this.floorCtx.putImageData(this.backlogImage, 0, this.backlogRow, 0, 0, ocean.w, n);
    [this.floorImage, this.floorPixels] = [image, pixels];
    this.backlogRow += n;
  }

  /** The pixels for a band of seabed this many rows tall. */
  private makeFloorImage(rows: number) {
    this.floorImage = this.floorCtx.createImageData(this.ocean.w, rows);
    this.floorPixels = new Uint32Array(this.floorImage.data.buffer);
    this.seabedKey = '';
  }

  /** Moves the sprites to the other canvas, sized for the new window. */
  private placeSprites() {
    this.buffer ^= 1;
    const canvas = this.spriteCanvases[this.buffer];
    const w = Math.ceil(this.viewW);
    const h = Math.ceil(this.regionHeight);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    this.spriteCtx = this.spriteCtxs[this.buffer];
    this.pendingShow = this.showDelay;
  }

  /**
   * The plain-sand colour of every cell (see sandCache), worked out a row at
   * a time as rows are first painted rather than all at once up front.
   */
  private plainSand(top: number, rows: number) {
    const { ocean } = this;
    const { w, h, terrain, grain } = ocean;
    const size = `${w}x${h}`;
    if (size !== this.sandCacheSize) {
      this.sandCache = new Uint32Array(w * h);
      this.sandRowsDone = new Uint8Array(h);
      this.sandCacheSize = size;
    }
    const cache = this.sandCache;
    const { sandLight: sl, sandDark: sd } = FLOOR;
    for (let z = top; z < top + rows; z++) {
      if (this.sandRowsDone[z]) continue;
      this.sandRowsDone[z] = 1;
      const dim = 256 - Math.round((z / h) * DEPTH_DARKENING * 256);
      const dimBlue = Math.min(256, dim + 24);
      for (let x = 0; x < w; x++) {
        const i = z * w + x;
        const t = Math.max(0, Math.min(255, terrain[i] + ((grain[i] & 31) - 16)));
        const r = ((sd[0] + (((sl[0] - sd[0]) * t) >> 8)) * dim) >> 8;
        const g = ((sd[1] + (((sl[1] - sd[1]) * t) >> 8)) * dim) >> 8;
        const b = ((sd[2] + (((sl[2] - sd[2]) * t) >> 8)) * dimBlue) >> 8;
        cache[i] = (255 << 24) | (Math.min(255, b) << 16) | (Math.min(255, g) << 8) | Math.min(255, r);
      }
    }
    return cache;
  }

  /** Works out the seabed's pixels (sand, moss, blood) into the floor image. */
  private renderSeabed(top: number, rows: number) {
    const { ocean, floorPixels: out } = this;
    if (!this.floorImage) return;
    const { w, terrain, grain, algae, stain } = ocean;
    const { sandLight: sl, sandDark: sd, algae: ag, algaeDense: ad, blood: bl } = FLOOR;
    const sand = this.plainSand(top, rows);

    for (let row = 0; row < rows; row++) {
      const z = top + row;
      // Deeper down the page the light fades; blues hold out longest.
      const dim = 256 - Math.round((z / ocean.h) * DEPTH_DARKENING * 256);
      const dimBlue = Math.min(256, dim + 24);
      for (let x = 0; x < w; x++) {
        const i = z * w + x;
        const a = algae[i];
        const st = stain[i];
        // Bare sand: the cached colour is already the answer.
        if (st === 0 && (a === 0 || a + (grain[i] >> 1) <= 120)) {
          out[row * w + x] = sand[i];
          continue;
        }
        // Sand tone from the terrain, roughened by the cell's grain.
        const t = Math.max(0, Math.min(255, terrain[i] + ((grain[i] & 31) - 16)));
        let r = sd[0] + (((sl[0] - sd[0]) * t) >> 8);
        let g = sd[1] + (((sl[1] - sd[1]) * t) >> 8);
        let b = sd[2] + (((sl[2] - sd[2]) * t) >> 8);
        // Algae: dithered speckle where thin, a carpet where thick.
        if (a > 0 && a + (grain[i] >> 1) > 120) {
          const dense = a > 200 && (grain[i] & 3) === 0;
          const col = dense ? ad : ag;
          const mix = Math.min(230, 110 + (a >> 1));
          r += ((col[0] - r) * mix) >> 8;
          g += ((col[1] - g) * mix) >> 8;
          b += ((col[2] - b) * mix) >> 8;
        }
        if (st > 0) {
          const mix = (st * 3) >> 2;
          r += ((bl[0] - r) * mix) >> 8;
          g += ((bl[1] - g) * mix) >> 8;
          b += ((bl[2] - b) * mix) >> 8;
        }
        r = (r * dim) >> 8;
        g = (g * dim) >> 8;
        b = (b * dimBlue) >> 8;
        out[row * w + x] = (255 << 24) | (Math.min(255, b) << 16) | (Math.min(255, g) << 8) | Math.min(255, r);
      }
    }
  }

  /**
   * Draws the moving caustic light on its own canvas, which the page blends
   * over the seabed (black adds nothing). Kept apart from the seabed canvas so
   * that one only takes a pixel upload when the seabed itself changes.
   */
  private renderFloor(top: number, rows: number) {
    const { ocean, lightCtx: ctx } = this;
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, top, ocean.w, rows);
    const tile = this.causticTile((ocean.tick >> 1) % CAUSTIC_FRAMES);
    const pattern = ctx.createPattern(tile, 'repeat');
    if (!pattern) return;
    // The canvas is the whole world, so the tiles start at its top and stay put.
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = pattern;
    for (let row = 0; row < rows; row += CAUSTIC_BAND) {
      // Light fades with depth, like the seabed under it.
      const z = top + row + CAUSTIC_BAND / 2;
      ctx.globalAlpha = (1 - (z / ocean.h) * DEPTH_DARKENING) * (1 - ocean.nightfall() * 0.7);
      ctx.fillRect(0, top + row, ocean.w, Math.min(CAUSTIC_BAND, rows - row));
    }
    if (!this.lean) {
      // The rays are worked out from the region's top.
      ctx.save();
      ctx.translate(0, top);
      this.drawRays(top, rows);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  /**
   * Shafts of sunlight slanting down across the shallows. Each is a slanted
   * band filled with one vertical gradient (by depth in the world, so it
   * stays put as the region moves), swaying and shimmering slowly. The light
   * canvas is a cell per pixel, so the edges come out as pixel steps.
   */
  private drawRays(top: number, rows: number) {
    const { ocean, lightCtx: ctx } = this;
    if (Math.exp(-top / RAY_DEPTH) < 0.03) return;
    const bottom = Math.min(rows, RAY_DEPTH * 3.5 - top);
    if (bottom <= 0) return;
    const [r, g, b] = RAY_COLOR;
    const grad = ctx.createLinearGradient(0, -top, 0, RAY_DEPTH * 3.5 - top);
    for (const at of [0, 0.1, 0.25, 0.45, 0.7, 1]) {
      const fade = Math.exp(-at * 3.5);
      grad.addColorStop(at, `rgba(${r},${g},${b},${(fade * (at === 1 ? 0 : 1)).toFixed(3)})`);
    }
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = grad;
    const t = ocean.tick * 0.004;
    const night = ocean.nightfall();
    const span = ocean.w + bottom * RAY_SLANT + 80;
    for (let k = 0; k < RAYS; k++) {
      const width = 7 + ((k * 7) % 11);
      const sway = Math.sin(t + k * 1.7) * 14 + Math.sin(t * 0.37 + k * 2.3) * 8;
      // Where the shaft crosses the top of the world, wrapped so shafts slide on as others slide off.
      const x0 = ((((k + 0.5) / RAYS) * span + sway) % span + span) % span - bottom * RAY_SLANT - 40;
      const shimmer = (0.45 + 0.55 * Math.sin(t * 3.1 + k * 2.1) ** 2) * (1 - night * 0.85);
      const xa = x0 + top * RAY_SLANT;
      const xb = x0 + (top + bottom) * RAY_SLANT;
      // A wide faint glow, then the brighter core of the shaft inside it.
      for (const [grow, alpha] of [[2.2, 0.45], [1, 0.8]]) {
        const pad = (width * (grow - 1)) / 2;
        ctx.globalAlpha = shimmer * alpha;
        ctx.beginPath();
        ctx.moveTo(xa - pad, 0);
        ctx.lineTo(xa + width + pad, 0);
        ctx.lineTo(xb + (width + pad) * 1.6, bottom);
        ctx.lineTo(xb - pad * 1.6, bottom);
        ctx.closePath();
        ctx.fill();
      }
    }
  }

  /** A frame of the caustic light as a tileable canvas: black where there is none. */
  private causticTile(frame: number) {
    let tile = this.causticTiles[frame];
    if (tile) return tile;
    tile = makeCanvas(CAUSTIC_SIZE, CAUSTIC_SIZE);
    const tctx = tile.getContext('2d')!;
    const img = tctx.createImageData(CAUSTIC_SIZE, CAUSTIC_SIZE);
    const cl = FLOOR.caustic;
    const base = frame * CAUSTIC_SIZE * CAUSTIC_SIZE;
    for (let i = 0; i < CAUSTIC_SIZE * CAUSTIC_SIZE; i++) {
      const c = this.caustics[base + i];
      img.data[i * 4] = (cl[0] * c) >> 2;
      img.data[i * 4 + 1] = (cl[1] * c) >> 2;
      img.data[i * 4 + 2] = (cl[2] * c) >> 2;
      img.data[i * 4 + 3] = 255;
    }
    tctx.putImageData(img, 0, 0);
    this.causticTiles[frame] = tile;
    return tile;
  }

  /** Draws a sprite (or a column range of it) at a world point, scaled for depth. */
  private sprite(img: HTMLCanvasElement, x: number, z: number, h: number, o: SpriteOptions = {}) {
    const { spriteCtx: ctx, px } = this;
    const p = this.project(x, z, h);
    const sx = o.sx ?? 0;
    const sw = o.sw ?? img.width;
    const k = px * p.s * (o.scale ?? 1) * this.size;
    const w = Math.round(sw * k);
    const hh = Math.round(img.height * k);
    ctx.globalAlpha = (o.alpha ?? 1) * (this.glow ? 0.45 : 1);
    const st = this.stretch;
    if (!o.flipX && !o.angle && (o.scaleY ?? 1) === 1 && !st) {
      const top = o.anchor === 'bottom' ? p.y - hh : p.y - hh / 2;
      ctx.drawImage(img, sx, 0, sw, img.height, Math.round(p.x - w / 2), Math.round(top), w, hh);
      return;
    }
    // Stretching keeps the volume about the same: longer and thinner, or squat and wide.
    ctx.save();
    ctx.translate(Math.round(p.x), Math.round(p.y));
    if (o.angle) ctx.rotate(o.angle);
    ctx.scale((o.flipX ? -1 : 1) * (1 + st * 0.35), (o.scaleY ?? 1) * (1 - st * 0.3));
    ctx.drawImage(img, sx, 0, sw, img.height, -w / 2, o.anchor === 'bottom' ? -hh : -hh / 2, w, hh);
    ctx.restore();
  }

  private renderSprites() {
    const { spriteCtx: ctx, ocean, px } = this;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, this.viewW, this.regionHeight);
    const night = ocean.nightfall();
    if (night > 0) {
      ctx.globalAlpha = night * NIGHT_SHADE;
      ctx.fillStyle = 'rgb(2,6,18)';
      ctx.fillRect(0, 0, this.viewW, this.regionHeight);
    }
    if (!this.lean) this.drawPasser();

    // Anything whose floor point is near the viewport (tall or high things
    // reach further up the screen than their footprint).
    const z0 = Math.max(this.regionTop, this.scrollY) / px - SPRITE_MARGIN;
    const z1 = Math.min(this.regionTop + this.regionHeight, this.scrollY + this.viewH) / px + SPRITE_MARGIN + SURFACE * ELEVATION;
    const visible = (z: number) => z >= z0 && z <= z1;

    const shadow = (x: number, z: number, h: number, width: number) => {
      const fade = Math.max(0, 1 - h / 90);
      if (fade <= 0) return;
      const sw = Math.max(3, Math.round(width * (0.6 + fade * 0.4)));
      const p = this.project(x, z, 0);
      ctx.globalAlpha = 0.32 * fade;
      const img = shadowSprite(sw);
      ctx.drawImage(img, Math.round(p.x - (sw * px) / 2), Math.round(p.y - (img.height * px) / 2), sw * px, img.height * px);
    };

    // Shadows lie on the floor under everything (not under things in burrows).
    for (const c of ocean.creatures) {
      if (!visible(c.z) || c.species === 'eel' || c.species === 'gardenEel' || (c.species === 'mantis' && c.lunge < 0.3)) continue;
      shadow(c.x, c.z, c.species === 'manta' ? c.h * 0.4 : c.h, BODY_WIDTH[c.species] * 0.75);
    }
    for (const k of ocean.carcasses) if (k.h > 0 && visible(k.z)) shadow(k.x, k.z, k.h, BODY_WIDTH[k.species] * (k.part === 'whole' ? 0.7 : 0.4));
    for (const p of ocean.particles) if (p.kind === 'pellet' && p.h > 0 && visible(p.z)) shadow(p.x, p.z, p.h, 3);
    for (const d of ocean.decor) if (visible(d.z)) shadow(d.x + 2, d.z, 0, d.w + 2);
    const wf = ocean.whale;
    if (wf && visible(wf.z)) {
      shadow(wf.x, wf.z, wf.h * 0.5, 60);
      if (wf.landed && !this.lean) this.drawMat(wf);
    }

    const items: Drawable[] = [];
    for (const d of ocean.decor) {
      if (!visible(d.z)) continue;
      items.push({
        depth: d.z,
        draw: () => {
          this.sprite(d.kind === 'rock' ? rockSprite(d.seed, d.w, d.ht) : coralSprite(d.seed, d.w, d.ht), d.x, d.z, 0, { anchor: 'bottom' });
          if (d.vent) {
            const p = this.project(d.x, d.z, 0);
            ctx.globalAlpha = 1;
            ctx.fillStyle = ((ocean.tick >> 3) & 1) ? 'rgb(255,170,80)' : 'rgb(230,110,50)';
            ctx.fillRect(Math.round(p.x - px / 2), Math.round(p.y - d.ht * px), px, px);
          }
        },
      });
    }
    for (const k of ocean.kelp) {
      if (visible(k.z)) items.push({ depth: k.z, draw: () => this.drawKelp(k) });
    }
    for (const m of ocean.meadows) {
      if (m.blades.length && m.z + m.rz >= z0 && m.z - m.rz <= z1) this.addSeagrass(m, items);
    }
    for (const fan of ocean.fans) if (visible(fan.z)) items.push({ depth: fan.z, draw: () => this.drawFan(fan) });
    for (const w of ocean.whips) if (visible(w.z)) items.push({ depth: w.z, draw: () => this.drawWhip(w) });
    for (const l of ocean.lettuce) {
      if (l.leaves >= 1 && visible(l.z)) items.push({ depth: l.z, draw: () => this.drawLettuce(l) });
    }
    for (const fd of ocean.fields) {
      if (fd.polyps.length && fd.z + fd.rz >= z0 && fd.z - fd.rz <= z1) this.addPolyps(fd, items);
    }
    for (const sh of ocean.shells) {
      if (!visible(sh.z)) continue;
      // Old shells fade as they crumble away.
      const fade = Math.min(1, (sh.until - ocean.tick) / 600);
      items.push({ depth: sh.z, draw: () => this.sprite(creatureSprite('hermitShell', sh.palette, 0), sh.x, sh.z, 0, { anchor: 'bottom', scale: 0.6 + sh.size * 0.1, alpha: Math.max(0.2, fade) }) });
    }
    for (const a of ocean.anemones) {
      if (visible(a.z)) items.push({ depth: a.z, draw: () => this.drawAnemone(a) });
    }
    for (const st of ocean.stations) {
      if (visible(st.z)) items.push({ depth: st.z + 0.15, draw: () => this.drawShrimp(st) });
    }
    if (wf && visible(wf.z)) items.push({ depth: wf.z, draw: () => this.drawWhale(wf) });
    for (const k of ocean.carcasses) {
      if (visible(k.z)) items.push({ depth: k.z + 0.1, draw: () => { this.size = SIZE[k.species] ?? 1; this.drawCarcass(k); this.size = 1; } });
    }
    // Plankton are tiny specks that don't need depth sorting: draw them all in
    // one pass, by colour, before everything else.
    ctx.globalAlpha = 0.85;
    for (const shade of [0, 32]) {
      ctx.fillStyle = shade ? 'rgb(150,240,170)' : 'rgb(110,214,190)';
      for (const p of ocean.particles) {
        if (p.kind !== 'plankton' || (p.life & 32) !== shade || !visible(p.z)) continue;
        const q = this.project(p.x, p.z, p.h);
        const size = Math.max(2, Math.round(px * 0.75 * q.s));
        ctx.fillRect(Math.round(q.x), Math.round(q.y), size, size);
      }
    }
    // Coral spawn twinkles between pink and white as it drifts.
    if (ocean.spawnCount > 0) {
      ctx.globalAlpha = 0.95;
      for (let shade = 0; shade < 2; shade++) {
        ctx.fillStyle = SPAWN_COLORS[shade];
        for (const p of ocean.particles) {
          if (p.kind !== 'spawn' || ((p.life >> 4) & 1) !== shade || !visible(p.z)) continue;
          const q = this.project(p.x, p.z, p.h);
          const size = Math.max(2, Math.round(px * q.s));
          ctx.fillRect(Math.round(q.x), Math.round(q.y), size, size);
        }
      }
    }
    for (const p of ocean.particles) {
      if (p.kind === 'pellet' && visible(p.z)) {
        items.push({ depth: p.z + 0.2, draw: () => this.sprite(pelletSprite(), p.x, p.z, p.h) });
      }
    }
    for (const d of ocean.drops) {
      if (!visible(d.z)) continue;
      items.push({
        depth: d.z + 0.25,
        draw: () => {
          if (d.kind === 'puff') {
            const frame = Math.min(PUFF_FRAMES - 1, Math.floor((1 - d.life / d.maxLife) * PUFF_FRAMES));
            this.sprite(puffSprite(frame, d.shade), d.x, d.z, d.h, { alpha: 0.85 });
            return;
          }
          if (d.kind === 'flash') { this.drawFlash(d); return; }
          const q = this.project(d.x, d.z, d.h);
          const fade = Math.min(1, (d.life / d.maxLife) * 1.6);
          ctx.fillStyle = DROP_COLORS[d.kind][d.shade];
          if (d.kind === 'heart' || d.kind === 'sparkle') {
            // Twinkle as they rise.
            ctx.globalAlpha = fade * (d.kind === 'sparkle' && (d.life >> 2) & 1 ? 0.5 : 1);
            this.pixelShape(d.kind === 'heart' ? HEART : SPARKLE, q.x, q.y, Math.max(1, Math.round(px * 0.5)));
            return;
          }
          const size = Math.max(2, Math.round(px * (d.kind === 'ink' ? 2.2 : d.kind === 'sand' ? 1.2 : 0.8) * q.s));
          ctx.globalAlpha = fade * (d.kind === 'ink' ? 0.75 : d.kind === 'scent' ? 0.35 : 1);
          ctx.fillRect(Math.round(q.x), Math.round(q.y), size, size);
        },
      });
    }
    for (const c of ocean.creatures) {
      // Hiding minnows sit behind the kelp fronds around them.
      if (!visible(c.z)) continue;
      const depth = c.species === 'eel' ? c.anchorZ + 0.2 : c.hidden ? c.z - 6 : c.z + 0.3;
      items.push({
        depth,
        draw: () => {
          const wake = this.lean ? 0 : WAKE_SPEED[c.species];
          if (wake && !c.hidden && c.vx * c.vx + c.vz * c.vz > wake * wake) this.drawWake(c);
          this.stretch = c.squash;
          this.size = SIZE[c.species] ?? 1;
          this.drawCreature(c);
          this.stretch = 0;
          // Courting fish flash their colours.
          if (c.courting > 0 && (ocean.tick >> 3) & 1) {
            this.glow = true;
            ctx.globalCompositeOperation = 'lighter';
            this.drawCreature(c);
            ctx.globalCompositeOperation = 'source-over';
            this.glow = false;
          }
          this.size = 1;
          if (c.parasites > 0.45 && c.species !== 'eel') this.drawParasites(c);
        },
      });
    }
    for (const b of ocean.bubbles) {
      if (visible(b.z)) items.push({ depth: b.z + 0.4, draw: () => this.sprite(bubbleSprite(), b.x, b.z, b.h, { alpha: 0.8 }) });
    }

    items.sort((a, b) => a.depth - b.depth);
    for (const item of items) item.draw();
    ctx.globalAlpha = 1;
    for (const c of ocean.creatures) if (c.adopted && visible(c.z)) this.drawAdoptedMarker(c);
    const target = this.highlighted;
    if (target?.alive && visible(target.z)) this.drawReticle(target);
  }

  /**
   * A short trail of disturbed water behind a fast swimmer: pale specks that
   * thin out behind it, jostled to either side.
   */
  private drawWake(c: Creature) {
    const { ocean } = this;
    const speed = Math.hypot(c.vx, c.vz) || 1;
    const nx = -c.vz / speed, nz = c.vx / speed;
    const back = BODY_WIDTH[c.species] * 0.45;
    const count = c.species === 'minnow' ? 3 : 5;
    // Bubbles shrink to flecks the further back they are, and jostle side to side.
    for (let i = 0; i < count; i++) {
      const along = back + i * 2.6;
      const side = (((ocean.tick >> 2) + i + c.id) & 1 ? 1 : -1) * (0.4 + i * 0.4);
      const frame = Math.min(2, Math.floor((i * 3) / count + ((ocean.tick >> 2) & 1) * 0.5));
      this.sprite(fizzSprite(frame), c.x - c.vx / speed * along + nx * side, c.z - c.vz / speed * along + nz * side, c.h - c.vh / speed * along,
        { alpha: 0.75 * (1 - i / (count + 1)) });
    }
  }

  private drawCreature(c: Creature) {
    const tick = this.ocean.tick;
    const washed = c.energy < 0.15;
    switch (c.species) {
      case 'crab': {
        // Crabs face the camera; legs only move while they walk.
        const walking = Math.hypot(c.vx, c.vz) > 0.03;
        this.sprite(creatureSprite('crab', c.palette, walking ? (tick >> 2) & 1 : 0, washed), c.x, c.z, c.h, { anchor: 'bottom' });
        return;
      }
      case 'jelly': {
        const contracted = (tick + c.id * 17) % 50 < 10;
        this.sprite(creatureSprite('jelly', c.palette, contracted ? 1 : 0, washed), c.x, c.z, c.h, { alpha: 0.82, flipX: c.facing < 0 });
        return;
      }
      case 'urchin':
        this.sprite(creatureSprite('urchin', c.palette, ((tick + c.id * 7) >> 4) & 1, washed), c.x, c.z, c.h, { anchor: 'bottom' });
        return;
      case 'puffer': {
        // A puffer's squash is a swell all round, not a stretch.
        const swell = 1 + this.stretch * 0.35;
        this.stretch = 0;
        if (c.puff > 0.08) {
          // Swelling up (and back down) into a ball whose spines wobble.
          const img = creatureSprite('pufferPuffed', c.palette, (tick >> 3) & 1, washed);
          this.sprite(img, c.x, c.z, c.h, { flipX: c.facing < 0, scale: (0.55 + 0.45 * c.puff) * swell });
        } else {
          this.sprite(creatureSprite('puffer', c.palette, ((tick + c.id * 5) >> 2) & 1, washed), c.x, c.z, c.h, { flipX: c.facing < 0 });
        }
        return;
      }
      case 'seahorse': {
        // Hold on to the kelp and sway with it.
        const k = c.kelp;
        const sway = k && c.mood !== 'cruising' ? Math.sin(tick * 0.04 + k.phase + c.h * 0.12) * (c.h / 14) : 0;
        const frame = c.carrying > 0 ? 2 : ((tick + c.id * 3) >> 3) & 1;
        this.sprite(creatureSprite('seahorse', c.palette, frame, washed), c.x + sway, c.z, c.h, { flipX: c.facing < 0 });
        return;
      }
      case 'octopus': {
        // Tentacles curl faster as it crawls; it fades into the colours of the rock.
        const period = Math.hypot(c.vx, c.vz) > 0.05 ? 4 : 12;
        const frame = Math.floor((tick + c.id * 5) / period) & 1;
        const stretch = c.mood === 'inking' ? { scaleY: 0.7 } : {};
        if (c.camo < 0.98) this.sprite(creatureSprite('octopus', 0, frame, washed), c.x, c.z, c.h, { flipX: c.facing < 0, alpha: 1 - c.camo * 0.9, ...stretch });
        if (c.camo > 0.02) this.sprite(creatureSprite('octopus', 1, frame, washed), c.x, c.z, c.h, { flipX: c.facing < 0, alpha: c.camo * 0.85, ...stretch });
        return;
      }
      case 'eel':
        this.drawEel(c, washed);
        return;
      case 'shark': {
        const frame = Math.floor((tick + c.id * 5) / 6) % 3;
        this.sprite(creatureSprite('shark', c.palette, frame, washed), c.x, c.z, c.h, { flipX: c.facing < 0 });
        return;
      }
      case 'manta': {
        // Slow, deep wingbeats: the wings flex and the tips curl on the downstroke.
        const beat = Math.sin(tick * 0.06 + c.id);
        const img = creatureSprite('manta', c.palette, beat < -0.3 ? 1 : 0, washed);
        this.sprite(img, c.x, c.z, c.h + beat * 2, { flipX: c.facing < 0, scaleY: 0.8 + 0.2 * Math.abs(beat) });
        return;
      }
      case 'angler':
        this.sprite(creatureSprite('angler', c.palette, c.lunge > 0.5 ? 1 : 0, washed), c.x, c.z, c.h, { flipX: c.facing < 0 });
        this.drawLure(c);
        return;
      case 'dolphin': {
        // Fluke strokes, faster when diving; a slight rise and fall as it swims.
        const period = c.mood === 'diving' ? 3 : 6;
        const beat = Math.floor((tick + c.id * 5) / period) % 4;
        const frame = [0, 1, 2, 1][beat];
        this.sprite(creatureSprite('dolphin', 0, frame, washed), c.x, c.z, c.h + [1, 0, -1, 0][beat] * 0.5, { flipX: c.facing < 0 });
        return;
      }
      case 'starfish': {
        // Turned to face where it is heading; the arms curl as it creeps or eats.
        const turn = ((c.heading % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
        const step = Math.round(turn / (Math.PI / 8)) % 16;
        const busy = c.mood === 'eating' || Math.hypot(c.vx, c.vz) > 0.004;
        const curl = busy ? (tick >> 4) & 1 : 0;
        this.sprite(starfishSprite(c.palette, c.limbs, step, curl, washed), c.x, c.z, c.h + 1);
        return;
      }
      case 'cuttlefish': {
        // The fin ripples; hypnotising (or courting), bands of colour roll across it.
        const display = c.mood === 'hypnotising' || c.mood === 'striking' || c.courting > 0;
        const frame = Math.floor((tick + c.id * 3) / (display ? 2 : 5)) % 4;
        this.sprite(cuttleSprite(frame, display, washed), c.x, c.z, c.h, { flipX: c.facing < 0 });
        if (c.lunge > 0 && c.prey?.alive) this.drawTentacles(c, c.prey);
        return;
      }
      case 'lionfish': {
        // The long fins ripple slowly, folded or fanned out.
        const frame = ((tick + c.id * 5) >> 4) & 1;
        this.sprite(creatureSprite(c.puff > 0.5 ? 'lionfishFlared' : 'lionfish', 0, frame, washed), c.x, c.z, c.h, { flipX: c.facing < 0 });
        return;
      }
      case 'mantis': {
        const burrow = this.project(c.anchorX, c.anchorZ, 0);
        const { spriteCtx: ctx, px } = this;
        ctx.globalAlpha = 0.8;
        ctx.fillStyle = 'rgb(8,18,28)';
        ctx.fillRect(Math.round(burrow.x - px * 1.5), Math.round(burrow.y - px * 0.5), px * 3, px);
        if (c.lunge < 0.3) {
          // Only the eyes, swivelling on their stalks.
          const look = ((tick + c.id * 13) >> 5) % 3 === 0;
          this.sprite(creatureSprite('mantisPeek', c.palette, 0, washed), c.anchorX, c.anchorZ - 0.2, 1, { anchor: 'bottom', flipX: look });
          return;
        }
        // The club snaps out as it punches.
        this.sprite(creatureSprite('mantis', c.palette, c.squash > 0.15 ? 1 : 0, washed), c.x, c.z, 1.5, { flipX: c.facing < 0 });
        return;
      }
      case 'gardenEel':
        this.drawGardenEel(c, washed);
        return;
      case 'hermit': {
        const scale = 0.6 + Math.max(1, c.shell) * 0.1;
        if (c.shell === 0) {
          // Soft and exposed, hurrying to its next shell.
          this.sprite(creatureSprite('hermitNaked', 0, 0, washed), c.x, c.z, 0, { anchor: 'bottom', flipX: c.facing < 0 });
          return;
        }
        const walking = Math.hypot(c.vx, c.vz) > 0.02;
        const kind: SpriteKind = c.hidden ? 'hermitShell' : 'hermit';
        this.sprite(creatureSprite(kind, c.palette, walking ? (tick >> 3) & 1 : 0, washed), c.x, c.z, 0, { anchor: 'bottom', flipX: c.facing < 0, scale });
        return;
      }
      default: {
        const kind: SpriteKind = c.species === 'minnow' && c.age < SPECIES.minnow.mature ? 'fry' : c.species;
        const speed = Math.hypot(c.vx, c.vz);
        const period = c.species === 'turtle' ? 14 : speed > 0.5 ? 3 : 7;
        const frame = Math.floor((tick + c.id * 7) / period) & 1;
        this.sprite(creatureSprite(kind, c.palette, frame, washed), c.x, c.z, c.h, { flipX: c.facing < 0, alpha: c.hidden ? 0.7 : 1 });
      }
    }
  }

  /**
   * A garden eel: a sprite standing up out of its burrow, swaying, bent back
   * by the current with its head turned into it; sinking into the sand as it
   * ducks. Each eel is its own height.
   */
  private drawGardenEel(c: Creature, washed: boolean) {
    const { spriteCtx: ctx, px, ocean } = this;
    const hole = this.project(c.anchorX, c.anchorZ, 0);
    const pit = shadowSprite(4);
    ctx.globalAlpha = 0.8;
    ctx.drawImage(pit, Math.round(hole.x - 2 * px), Math.round(hole.y - pit.height * px * 0.5), 4 * px, pit.height * px);
    const full = Math.round(c.cruiseH * ELEVATION) + 2;
    const rows = Math.round(c.lunge * full);
    if (rows < 2) return;
    const frame = ((ocean.tick + c.id * 7) >> 4) % GARDEN_EEL_FRAMES;
    this.sprite(gardenEelSprite(c.palette, frame, rows, washed, full), c.anchorX, c.anchorZ, 0, { anchor: 'bottom', flipX: c.facing < 0 });
  }

  /**
   * A seagrass meadow, in bands of depth so whatever swims or hides among
   * the blades is drawn between them. The blades sway together and part
   * around anything moving through them.
   */
  private addSeagrass(m: Meadow, items: Drawable[]) {
    const movers: number[] = [];
    for (const c of this.ocean.creatures) {
      if (c.h > 16 || Math.abs(c.x - m.x) > m.rx + GRASS_PART || Math.abs(c.z - m.z) > m.rz + GRASS_PART) continue;
      if (Math.hypot(c.vx, c.vz) > 0.03 || c.mood === 'grazing') movers.push(c.x, c.z);
    }
    const { blades } = m;
    for (let first = 0; first < blades.length;) {
      const band = Math.floor(blades[first].z / GRASS_BAND);
      let last = first;
      while (last < blades.length && Math.floor(blades[last].z / GRASS_BAND) === band) last++;
      const from = first, to = last;
      items.push({ depth: (band + 0.5) * GRASS_BAND, draw: () => { this.movers = movers; this.drawBlades(m, from, to); } });
      first = last;
    }
  }

  private drawBlades(m: Meadow, from: number, to: number) {
    const { spriteCtx: ctx, px, ocean, regionTop } = this;
    const runs = this.grassRuns;
    for (const run of runs) run.length = 0;
    const t = ocean.tick * 0.045;
    // Only the swimmers close enough to this band to part any of it.
    const z0 = m.blades[from].z - GRASS_PART, z1 = m.blades[to - 1].z + GRASS_PART;
    const movers: number[] = [];
    for (let k = 0; k < this.movers.length; k += 2) {
      const z = this.movers[k + 1];
      if (z > z0 && z < z1) movers.push(this.movers[k], z);
    }
    for (let n = from; n < to; n++) {
      const b = m.blades[n];
      // Pushed aside by anything swimming through.
      let leanX = 0, leanZ = 0;
      for (let k = 0; k < movers.length; k += 2) {
        const dx = b.x - movers[k], dz = b.z - movers[k + 1];
        const d = Math.hypot(dx, dz);
        if (d >= GRASS_PART || d === 0) continue;
        const f = (1 - d / GRASS_PART) * 3.5;
        leanX += (dx / d) * f;
        leanZ += (dz / d) * f * 0.5;
      }
      const shade = (WEED_FIRST[b.kind] + b.shade) * 3;
      const red = b.kind === 'red', purple = b.kind === 'purple';
      const wave = Math.sin(t + b.phase * 0.3 + b.x * 0.12);
      const flutter = Math.sin(t * 1.7 + b.phase) * 0.4;
      // Squares stacked in the same column and colour go in as one tall
      // rectangle: a blade only steps sideways two or three times.
      let col = -1, left = 0, top = 0, bottom = 0, size = 0;
      // One cell up the screen per step: squares meet without overlapping.
      for (let i = 0; i <= b.len; i += 1 / ELEVATION) {
        const k = i / b.maxLen;
        const give = k * Math.sqrt(k);
        const sx = (b.x + (wave * 1.6 + flutter + leanX) * give) * px;
        const sy = Math.round((b.z + leanZ * give - i * ELEVATION) * px - regionTop);
        const s = Math.ceil(px * (1 + i * PERSPECTIVE));
        const l = Math.round(sx - s / 2);
        const c = shade + (i > b.len - 2 ? 2 : i < b.len * 0.35 ? 0 : 1);
        // Red seaweed is frilly, a little leaf off alternate sides; purple
        // forks near the top into two tips.
        if (red && i > 2 && (Math.round(i * ELEVATION) & 1)) runs[shade + 2].push(l + (Math.round(i * ELEVATION) & 2 ? s : -s), sy, s, s);
        if (purple && i > b.len * 0.55) {
          const spread = Math.round((i - b.len * 0.55) * 0.7 * px);
          runs[c].push(l - spread, sy, s, s, l + spread, sy, s, s);
          continue;
        }
        if (c === col && l === left && s === size) { top = sy; continue; }
        if (col >= 0) runs[col].push(left, top, size, bottom - top + size);
        col = c; left = l; top = sy; bottom = sy; size = s;
      }
      if (col >= 0) runs[col].push(left, top, size, bottom - top + size);
    }
    ctx.globalAlpha = 1;
    for (let c = 0; c < runs.length; c++) {
      const run = runs[c];
      if (!run.length) continue;
      ctx.fillStyle = WEED_SETS[(c / 3) | 0][c % 3];
      for (let n = 0; n < run.length; n += 4) ctx.fillRect(run[n], run[n + 1], run[n + 2], run[n + 3]);
    }
  }

  /**
   * A sea fan, drawn a couple of rows at a time so it can flex as one piece:
   * the higher the row, the further it is pushed over, swayed, or shaken
   * when something has just brushed it.
   */
  private drawFan(f: SeaFan) {
    const { spriteCtx: ctx, px, ocean } = this;
    const img = fanSprite(f.seed, f.palette, f.w, f.ht);
    const base = this.project(f.x, f.z, 0);
    const left = base.x - (f.w * px) / 2;
    const top = base.y - f.ht * px;
    const t = ocean.tick;
    const sway = Math.sin(t * 0.03 + f.phase) * 1.1;
    const shake = f.shudder * Math.sin(t * 1.1 + f.phase) * 1.6;
    ctx.globalAlpha = 1;
    for (let y = 0; y < f.ht; y += 2) {
      const up = (f.ht - y) / f.ht;
      const give = up * Math.sqrt(up);
      const dx = Math.round((f.bx * 0.8 + sway + shake) * give * px);
      const dy = Math.round(f.bz * 0.4 * give * px);
      const rows = Math.min(2, f.ht - y);
      ctx.drawImage(img, 0, y, f.w, rows, Math.round(left + dx), Math.round(top + y * px + dy), f.w * px, rows * px);
    }
  }

  /** A sea whip: a thin stalk, stiff at the root and springy toward its pale tip. */
  private drawWhip(b: SeaWhip) {
    const { spriteCtx: ctx, px, ocean, regionTop } = this;
    const runs = this.whipRuns;
    const set = b.palette * 3;
    const t = ocean.tick * 0.05 + b.phase;
    let col = -1, left = 0, top = 0, bottom = 0, size = 0;
    for (let i = 0; i <= b.len; i += 1 / ELEVATION) {
      const k = i / b.len;
      const give = k * k;
      const sx = (b.x + (b.bx + Math.sin(t + i * 0.08) * 0.9) * give) * px;
      const sy = Math.round((b.z + b.bz * give * 0.5 - i * ELEVATION) * px - regionTop);
      const s = Math.ceil(px * (1 + i * PERSPECTIVE));
      const l = Math.round(sx - s / 2);
      const c = set + (i > b.len - 2.5 ? 2 : i < b.len * 0.25 ? 0 : 1);
      if (c === col && l === left && s === size) { top = sy; continue; }
      if (col >= 0) runs[col].push(left, top, size, bottom - top + size);
      col = c; left = l; top = sy; bottom = sy; size = s;
    }
    if (col >= 0) runs[col].push(left, top, size, bottom - top + size);
    ctx.globalAlpha = 1;
    for (let c = set; c < set + 3; c++) {
      const run = runs[c];
      ctx.fillStyle = WHIPS[b.palette][c - set];
      for (let n = 0; n < run.length; n += 4) ctx.fillRect(run[n], run[n + 1], run[n + 2], run[n + 3]);
      run.length = 0;
    }
  }

  /** A clump of sea lettuce at the foot of a rock, its frilly edges rippling. */
  private drawLettuce(l: Lettuce) {
    const frame = Math.floor(this.ocean.tick / 14 + l.phase * 3) % LETTUCE_FRAMES;
    this.sprite(lettuceSprite(Math.ceil(l.leaves), frame, l.palette), l.x, l.z, 0, { anchor: 'bottom' });
  }

  /** A field of small anemones, in bands of depth like the meadows. */
  private addPolyps(f: AnemoneField, items: Drawable[]) {
    const { polyps } = f;
    for (let first = 0; first < polyps.length;) {
      const band = Math.floor(polyps[first].z / GRASS_BAND);
      let last = first;
      while (last < polyps.length && Math.floor(polyps[last].z / GRASS_BAND) === band) last++;
      const from = first, to = last;
      items.push({ depth: (band + 0.5) * GRASS_BAND, draw: () => this.drawPolyps(f, from, to) });
      first = last;
    }
  }

  /**
   * Small anemones: a foot on the sand and four short tentacles, each a
   * stalk and a pale tip. Open, they stand up and sway together; shut, only
   * a little knob is left.
   */
  private drawPolyps(f: AnemoneField, from: number, to: number) {
    const { spriteCtx: ctx, px, ocean, regionTop } = this;
    const runs = this.polypRuns;
    const t = ocean.tick * 0.06;
    for (let n = from; n < to; n++) {
      const p = f.polyps[n];
      const set = p.palette * 3;
      const bx = Math.round(p.x * px);
      const by = Math.round(p.z * px - regionTop);
      runs[set].push(bx - px, by - px, px * 2, px);
      const tall = Math.round(p.open * 3);
      if (tall < 1) { runs[set + 1].push(bx - Math.round(px / 2), by - px * 2, px, px); continue; }
      const sway = Math.round(Math.sin(t + p.phase * 0.4 + p.x * 0.2) * p.open * px * 0.8);
      for (let k = -1.5; k <= 1.5; k++) {
        const spread = Math.round(k * px * (0.3 + p.open * 0.3));
        const x = bx + spread - Math.round(px / 2);
        if (tall > 1) runs[set + 1].push(x, by - px * tall, px, px * (tall - 1));
        runs[set + 2].push(x + sway + Math.round(spread * 0.4), by - px * (tall + 1), px, px);
      }
    }
    ctx.globalAlpha = 1;
    for (let c = 0; c < runs.length; c++) {
      const run = runs[c];
      if (!run.length) continue;
      ctx.fillStyle = POLYPS[(c / 3) | 0][c % 3];
      for (let k = 0; k < run.length; k += 4) ctx.fillRect(run[k], run[k + 1], run[k + 2], run[k + 3]);
      run.length = 0;
    }
  }

  /** A mantis shrimp's punch: a white-hot flash bursting into a ring of sparks. */
  private drawFlash(d: Drop) {
    const { spriteCtx: ctx, px } = this;
    const q = this.project(d.x, d.z, d.h);
    const age = 1 - d.life / d.maxLife;
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 1 - age * 0.8;
    if (age < 0.35) {
      ctx.fillStyle = DROP_COLORS.flash[0];
      ctx.fillRect(Math.round(q.x - px * 1.5), Math.round(q.y - px * 1.5), px * 3, px * 3);
    }
    ctx.fillStyle = DROP_COLORS.flash[age < 0.5 ? 1 : 2];
    const r = (1.5 + age * 5) * px;
    for (let k = 0; k < 8; k++) {
      const a = (k * Math.PI) / 4;
      const len = k % 2 ? 1 : 2;
      for (let s = 0; s < len; s++) {
        ctx.fillRect(Math.round(q.x + Math.cos(a) * (r + s * px) - px / 2), Math.round(q.y + Math.sin(a) * (r + s * px) * 0.7 - px / 2), px, px);
      }
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  /**
   * A moray's body snakes out of its den to the head, rippling along its
   * length; the jaw gapes as it strikes.
   */
  private drawEel(c: Creature, washed: boolean) {
    const { spriteCtx: ctx, px, ocean } = this;
    const den = this.project(c.anchorX, c.anchorZ, 0);
    // The dark mouth of the den.
    const hole = shadowSprite(8);
    ctx.globalAlpha = 0.7;
    ctx.drawImage(hole, Math.round(den.x - 4 * px), Math.round(den.y - hole.height * px * 0.5), 8 * px, hole.height * px);

    const [spot, main] = creaturePalette('eel', c.palette, washed);
    const dx = c.x - c.anchorX;
    const dz = c.z - c.anchorZ;
    const dh = c.h - 1;
    const len = Math.hypot(dx, dz, dh);
    const n = Math.max(4, Math.ceil(len / 0.9));
    const nx = len ? -dz / len : 0;
    const nz = len ? dx / len : 0;
    ctx.globalAlpha = 1;
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const wiggle = Math.sin(ocean.tick * 0.22 - t * 6 + c.id) * 2.2 * Math.sin(t * Math.PI);
      const p = this.project(c.anchorX + dx * t + nx * wiggle, c.anchorZ + dz * t + nz * wiggle, 1 + dh * t);
      const size = Math.ceil(px * p.s * 2 * this.size);
      const col = i % 3 === 0 ? spot : main;
      ctx.fillStyle = `rgb(${col[0]},${col[1]},${col[2]})`;
      ctx.fillRect(Math.round(p.x - size / 2), Math.round(p.y - size / 2), size, size);
    }
    const open = c.mood === 'striking' && c.lunge > 0.4;
    this.sprite(creatureSprite('eelHead', c.palette, open ? 1 : 0, washed), c.x, c.z, c.h, { flipX: c.facing < 0 });
  }

  /** Draws a small character-map shape at a screen point, `unit` pixels per cell. */
  private pixelShape(rows: string[], x: number, y: number, unit: number) {
    const { spriteCtx: ctx } = this;
    const ox = Math.round(x - (rows[0].length * unit) / 2);
    const oy = Math.round(y - (rows.length * unit) / 2);
    rows.forEach((row, r) => [...row].forEach((ch, k) => {
      if (ch === 'X') ctx.fillRect(ox + k * unit, oy + r * unit, unit, unit);
    }));
  }

  /** A few dark specks on a fish that is due a visit to the cleaners. */
  private drawParasites(c: Creature) {
    const { spriteCtx: ctx, px } = this;
    const width = BODY_WIDTH[c.species];
    const count = Math.round(c.parasites * 5);
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = 'rgb(40,36,30)';
    for (let k = 0; k < count; k++) {
      const along = (((c.id * 7 + k * 13) % 11) / 11 - 0.5) * width * 0.6;
      const up = ((c.id + k * 5) % 3) - 1;
      const p = this.project(c.x + along, c.z, c.h + up);
      const size = Math.max(2, Math.round(px * 0.6));
      ctx.fillRect(Math.round(p.x), Math.round(p.y), size, size);
    }
  }

  /** A cuttlefish's two long tentacles shooting out to its prey. */
  private drawTentacles(c: Creature, prey: Creature) {
    const { spriteCtx: ctx, px } = this;
    const from = { x: c.x + c.facing * 8, z: c.z, h: c.h };
    const steps = 14;
    ctx.globalAlpha = 1;
    for (let k = 0; k <= steps * c.lunge; k++) {
      const t = k / steps;
      for (const side of [-0.6, 0.6]) {
        const p = this.project(from.x + (prey.x - from.x) * t, from.z + (prey.z - from.z) * t, from.h + (prey.h - from.h) * t + side * (1 - t));
        const size = Math.max(2, Math.round(px * 0.7 * p.s));
        // Clubbed tips, darker suckers along the way.
        ctx.fillStyle = k >= steps * c.lunge - 1 ? 'rgb(255,214,196)' : k % 3 ? 'rgb(226,176,154)' : 'rgb(186,128,112)';
        ctx.fillRect(Math.round(p.x), Math.round(p.y), size, size);
      }
    }
  }

  /** An anemone: a fan of tentacles that sway, and pull in when touched. */
  private drawAnemone(a: Anemone) {
    const { spriteCtx: ctx, px, ocean } = this;
    const [baseCol, stalkCol, tipCol] = ANEMONE[a.palette % ANEMONE.length];
    const base = new Path2D();
    const stalk = new Path2D();
    const tips = new Path2D();
    // A fleshy foot on the seabed...
    for (let x = -5; x <= 5; x++) for (let y = 0; y < 2; y++) {
      const p = this.project(a.x + x, a.z + y * 0.5, y ? 0 : 1);
      base.rect(Math.round(p.x - px / 2), Math.round(p.y - px), px, px);
    }
    // ...and a crown of fat tentacles, fanned out, that pull in when touched.
    const reach = 10 - a.retract * 7;
    // Separate strands, so it reads as tentacles rather than a fan.
    for (let k = 0; k < 9; k++) {
      const root = (k - 4) * 1.3;
      const lean = (k - 4) * 0.6;
      for (let t = 1; t <= reach; t += 0.6) {
        const give = (t / 10) ** 1.3;
        // Halved: their own clownfish are always brushing through them.
        const sway = Math.sin(ocean.tick * 0.08 + a.phase + k * 0.7) * (t / 8) * 2 + a.bx * give * 0.5;
        const p = this.project(a.x + root + lean * t * 0.4 + sway, a.z + a.bz * give * 0.5, t);
        const size = Math.ceil(px * p.s);
        (t > reach - 1 ? tips : stalk).rect(Math.round(p.x - size / 2), Math.round(p.y), size, size);
      }
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = baseCol;
    ctx.fill(base);
    ctx.fillStyle = stalkCol;
    ctx.fill(stalk);
    ctx.fillStyle = tipCol;
    ctx.fill(tips);
  }

  /**
   * Cleaner shrimp: they wait on top of their rock, and while a fish is
   * being cleaned they hop about all over it.
   */
  private drawShrimp(st: Station) {
    const tick = this.ocean.tick;
    const client = st.queue[0];
    const working = client?.alive && client.mood === 'cleaning';
    for (let k = 0; k < 3; k++) {
      const frame = (tick + k * 5) >> 3 & 1;
      const img = creatureSprite('cleaner', 0, frame);
      if (working) {
        const width = BODY_WIDTH[client.species];
        // Spread along the fish, each pottering about its own patch.
        const along = (k - 1) * width * 0.32 + Math.sin(tick * 0.05 + k * 2.1) * 2;
        const hop = Math.abs(Math.sin(tick * 0.2 + k * 1.3)) * 2;
        this.sprite(img, client.x + along, client.z + 0.2, client.h + 3 + hop + (k === 1 ? 1.5 : 0), { flipX: (k % 2 ? 1 : -1) * st.side < 0 });
      } else {
        const bob = (tick + k * 20) % 90 < 10 ? 1 : 0;
        this.sprite(img, st.x + (k - 1) * 6, st.z, st.ht + 1 + bob, { flipX: k === 2 });
      }
    }
  }

  /** A whale carcass: fresh, then bitten, then picked to the ribs, then bones. */
  private drawWhale(wf: WhaleFall) {
    const left = wf.mass / wf.fullMass;
    const stage = wf.mass <= 0 ? 3 : left > 0.66 ? 0 : left > 0.33 ? 1 : 2;
    this.sprite(whaleSprite(stage), wf.x, wf.z, wf.h + 4, { flipX: wf.facing < 0, alpha: this.whaleFade(wf) });
  }

  private whaleFade(wf: WhaleFall) {
    return wf.mass <= 0 ? Math.max(0, Math.min(1, (wf.bonesUntil - this.ocean.tick) / 600)) : 1;
  }

  /**
   * The pale bacterial mat that spreads over the seabed round a whale fall,
   * fixed specks in a ring that widens as the carcass is eaten.
   */
  private drawMat(wf: WhaleFall) {
    const { spriteCtx: ctx, px } = this;
    const grown = Math.min(1, 0.35 + (1 - Math.max(0, wf.mass) / wf.fullMass));
    ctx.globalAlpha = 0.5 * this.whaleFade(wf);
    for (let i = 0; i < 70; i++) {
      // A fixed scatter per whale, so the specks stay put.
      const a = i * 2.39996 + wf.x;
      const r = Math.sqrt((i + 0.5) / 70) * grown;
      const p = this.project(wf.x + Math.cos(a) * r * 32, wf.z + 1 + Math.sin(a) * r * 9, 0);
      ctx.fillStyle = i % 3 ? 'rgb(214,222,200)' : 'rgb(236,226,170)';
      const size = px * (i % 5 === 0 ? 2 : 1);
      ctx.fillRect(Math.round(p.x), Math.round(p.y), size, size);
    }
  }

  /** The shadow of something passing far overhead, if one is due. */
  private drawPasser() {
    const { ocean, spriteCtx: ctx, viewW, viewH } = this;
    let p = this.passer;
    if (!p) {
      if (ocean.tick < this.nextPasser) return;
      const pick = PASSERS[Math.floor(Math.random() * PASSERS.length)];
      const img = this.passerImage(pick.kind, 0);
      const w = img.width * this.px * pick.scale;
      const h = img.height * this.px * pick.scale;
      // A school mills about at random; bigger animals keep station in an
      // echelon, each one behind and to the side of the last.
      const members = Array.from({ length: pick.count }, (_, i) => pick.kind === 'minnow'
        ? { dx: (Math.random() - 0.5) * pick.spread * 2, dy: (Math.random() - 0.5) * pick.spread, phase: Math.random() * 8 }
        : { dx: -i * w * 0.7, dy: (i % 2 ? 1 : -1) * Math.ceil(i / 2) * (h * 1.3 + pick.spread * 0.3), phase: i * 3 });
      p = this.passer = {
        ...pick,
        dir: Math.random() < 0.5 ? 1 : -1,
        y: this.scrollY + viewH * (0.2 + Math.random() * 0.6),
        start: ocean.tick,
        members,
        reach: pick.spread + w * (pick.kind === 'minnow' ? 1 : pick.count * 0.7 + 0.5),
      };
    }
    const t = ocean.tick - p.start;
    const cx = p.dir > 0 ? -p.reach + t * p.speed : viewW + p.reach - t * p.speed;
    // Done once it has crossed, or once the visitor has scrolled well away from it.
    if (cx > viewW + p.reach || cx < -p.reach || Math.abs(p.y - (this.scrollY + viewH / 2)) > viewH * 1.5) {
      this.passer = null;
      this.nextPasser = ocean.tick + PASSER_GAP[0] + Math.random() * (PASSER_GAP[1] - PASSER_GAP[0]);
      return;
    }
    // From the page to the sprite canvas, which starts at the region's top.
    const top = -this.regionTop;
    ctx.globalAlpha = PASSER_ALPHA;
    for (const m of p.members) {
      const img = this.passerImage(p.kind, ((t >> 3) + Math.round(m.phase)) & 1);
      const k = this.px * p.scale;
      const w = Math.round(img.width * k);
      const hh = Math.round(img.height * k);
      const sway = Math.sin(t * 0.05 + m.phase) * k * 2;
      ctx.save();
      ctx.translate(Math.round(cx + m.dx * p.dir), Math.round(top + p.y + m.dy + sway));
      ctx.scale(p.dir, 1);
      ctx.drawImage(img, -w / 2, -hh / 2, w, hh);
      ctx.restore();
    }
  }

  private passerImage(kind: SpriteKind | 'whale', frame: number) {
    if (kind === 'whale') return silhouetteSprite('whale', whaleSprite(0));
    return silhouetteSprite(`${kind}-${frame}`, creatureSprite(kind, 0, frame));
  }

  /** An anglerfish's lure: a thin stalk ending in a pulsing glow. */
  private drawLure(c: Creature) {
    const { spriteCtx: ctx, px, ocean } = this;
    const lure = ocean.lureOf(c);
    const base = { x: c.x + c.facing * 3, z: c.z, h: c.h + 3 };
    ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgb(70,62,84)';
    for (let i = 1; i < 6; i++) {
      const t = i / 6;
      // The stalk arches up and over.
      const p = this.project(base.x + (lure.x - base.x) * t, c.z, base.h + (lure.h - base.h) * t + Math.sin(t * Math.PI) * 2);
      const size = Math.ceil(px * p.s * 0.8);
      ctx.fillRect(Math.round(p.x), Math.round(p.y), size, size);
    }
    const q = this.project(lure.x, lure.z, lure.h);
    const pulse = 0.6 + 0.4 * Math.sin(ocean.tick * 0.12 + c.id);
    const size = Math.ceil(px * q.s * 1.5);
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.35 * pulse;
    ctx.fillStyle = 'rgb(140,255,220)';
    ctx.fillRect(Math.round(q.x - size * 1.5), Math.round(q.y - size * 1.5), size * 4, size * 4);
    ctx.globalAlpha = 0.6 * pulse;
    ctx.fillRect(Math.round(q.x - size * 0.5), Math.round(q.y - size * 0.5), size * 2, size * 2);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgb(230,255,240)';
    ctx.fillRect(Math.round(q.x), Math.round(q.y), size, size);
  }

  /**
   * Bodies roll belly-up as they sink; halves tumble with a raw red edge.
   * Picked over, fish turn to bones and everything else fades away.
   */
  private drawCarcass(k: Carcass) {
    const { spriteCtx: ctx, px } = this;
    const left = k.mass / k.fullMass;
    const boneKind = BONES_OF[k.species];
    const bones = !!boneKind && left < 0.4;
    const img = boneKind && bones
      ? bonesSprite(boneKind[0])
      : creatureSprite(k.species, k.palette, 0, k.part === 'whole');
    const scale = boneKind && bones ? boneKind[1] : 1;
    const soft = k.species === 'jelly' || k.species === 'seahorse' || k.species === 'manta';
    const fade = soft ? 0.2 + left * 0.6 : bones ? 0.5 + left : 1;

    if (k.part === 'whole') {
      this.sprite(img, k.x, k.z, k.h, { alpha: fade, flipX: k.facing < 0, scale, scaleY: bones ? 1 : Math.cos(k.angle) });
      return;
    }
    // The head end is on the right of a right-facing sprite.
    const split = Math.floor(img.width / 2);
    const front = k.part === 'front';
    const sx = front ? split : 0;
    const sw = front ? img.width - split : split;
    this.sprite(img, k.x, k.z, k.h, { alpha: fade, flipX: k.facing < 0, angle: k.angle, sx, sw });
    if (bones) return;
    const p = this.project(k.x, k.z, k.h);
    const unit = px * p.s;
    ctx.save();
    ctx.translate(Math.round(p.x), Math.round(p.y));
    ctx.rotate(k.angle);
    ctx.scale(k.facing < 0 ? -1 : 1, 1);
    ctx.globalAlpha = 1;
    ctx.fillStyle = BLOOD[1];
    const edge = front ? (-sw * unit) / 2 : (sw * unit) / 2 - unit;
    ctx.fillRect(edge, -img.height * unit * 0.3, unit, img.height * unit * 0.6);
    ctx.restore();
  }

  /** A small bobbing sand arrow over the visitor's own creature. */
  private drawAdoptedMarker(c: Creature) {
    const { spriteCtx: ctx, px } = this;
    const p = this.project(c.x, c.z, c.h);
    const bob = (this.ocean.tick >> 4) & 1 ? px : 0;
    const y = Math.round(p.y - (BODY_WIDTH[c.species] * 0.35 + 5) * px * p.s - bob);
    const x = Math.round(p.x);
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#050d14';
    ctx.fillRect(x - px * 2.5, y - px * 0.5, px * 5, px * 2);
    ctx.fillRect(x - px * 1.5, y + px * 1.5, px * 3, px);
    ctx.fillRect(x - px * 0.5, y + px * 2.5, px, px);
    ctx.fillStyle = '#f0d8a0';
    ctx.fillRect(x - px * 2, y, px * 4, px);
    ctx.fillRect(x - px, y + px, px * 2, px);
  }

  /** Blinking corner brackets around a creature, like a targeting cursor. */
  private drawReticle(c: Creature) {
    const { spriteCtx: ctx, px } = this;
    const p = this.project(c.x, c.z, c.h);
    const half = BODY_WIDTH[c.species] * px * p.s * 0.5 + px * 2;
    const arm = px * 2;
    const t = px * 0.75;
    const pulse = (this.ocean.tick >> 3) & 1 ? px : 0;
    const x0 = Math.round(p.x - half - pulse);
    const x1 = Math.round(p.x + half + pulse);
    const y0 = Math.round(p.y - half * 0.75 - pulse);
    const y1 = Math.round(p.y + half * 0.75 + pulse);
    ctx.fillStyle = '#ffd166';
    for (const [x, y, dx, dy] of [[x0, y0, 1, 1], [x1, y0, -1, 1], [x0, y1, 1, -1], [x1, y1, -1, -1]]) {
      ctx.fillRect(dx > 0 ? x : x - arm, dy > 0 ? y : y - t, arm, t);
      ctx.fillRect(dx > 0 ? x : x - t, dy > 0 ? y : y - arm, t, arm);
    }
  }

  /** A kelp stalk rising toward the camera, swaying more toward its tip. */
  private drawKelp(k: Kelp) {
    const { spriteCtx: ctx, px, ocean, regionTop } = this;
    const { x, z, length } = k;
    const t = ocean.tick * 0.04 + k.phase;
    // Squares are gathered by colour and filled in four runs, with the
    // projection worked out inline: a screenful of kelp is thousands of them.
    const runs = this.kelpRuns;
    for (const run of runs) run.length = 0;
    for (let i = 0; i <= length; i += 1.4) {
      // Pushed over by whatever swims through: the tip moves furthest.
      const give = (i / length) ** 1.5;
      const sway = Math.sin(t + i * 0.12) * (i / 14) + k.bx * give;
      const sx = (x + sway) * px;
      const sy = (z + k.bz * give - i * ELEVATION) * px - regionTop;
      const size = Math.ceil(px * (1 + i * PERSPECTIVE));
      const left = Math.round(sx - size / 2);
      const top = Math.round(sy);
      runs[i > length - 3 ? 3 : i < length * 0.3 ? 0 : 1].push(left, top, size);
      // Leaves on alternating sides.
      if (Math.floor(i / 1.4) % 4 === 0 && i > 3) {
        const side = Math.floor(i / 5.6) % 2 ? 1 : -1;
        runs[2].push(Math.round(sx - size / 2 + side * size), top, size, Math.round(sx - size / 2 + side * size * 2), Math.round(sy + size), size);
      }
    }
    ctx.globalAlpha = 1;
    for (let c = 0; c < 4; c++) {
      const run = runs[c];
      if (!run.length) continue;
      ctx.fillStyle = KELP_COLORS[c];
      for (let n = 0; n < run.length; n += 3) ctx.fillRect(run[n], run[n + 1], run[n + 2], run[n + 2]);
    }
  }
}
