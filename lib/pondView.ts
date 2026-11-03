// Draws the pond with the reef's camera (see pixelOceanView.ts): looking down
// at an angle, x across the page, z down it, and height lifting things up
// the screen and drawing them a little bigger.
//
// Around the one water surface the pond is drawn in layers by depth:
//   1. the bed, on the floor canvas: mud, silt and algae seen through the
//      water, tinted and dimmed with depth and rippling a little sideways,
//      with the caustic light on its own canvas over it;
//   2. underwater: everything below the surface, depth-sorted, fading into
//      the murk the deeper it is, its shadow on the bed;
//   3. the surface: a translucent sheet with glints and ripples over all of
//      that, then the shadows of whatever is above it;
//   4. on and above the surface: pads, duckweed, floating and flying things,
//      reeds, depth-sorted together.
//
// The canvases scroll with the page natively, as the reef's do: the floor and
// light cover the whole page at a canvas pixel per cell, and the sprites are
// drawn into a window around the view, swapped between two canvases.

import {
  BOUGH_H, ELEVATION, MAX_DEPTH, POND_SPECIES, logThickness, Pad, Pond, PondCreature, PondSpecies, ReedClump, SPAWN_TICKS, Stem, TADPOLE_TICKS, TAIL_TICKS, WEED_KINDS, WeedBed,
} from './pond';
import {
  CATTAIL_HEAD, CROWFOOT_FLOWER, DUCKWEED, IRIS_FLOWER, LOOSESTRIFE_FLOWER, makeCanvas, MIDGE, POND_FLOOR, PondSpriteKind, REED_COLORS, RING, TONGUE, WATER, WEED_COLORS, buildRipples, lilySprite,
  logSprite, padSprite, pondSprite, rippleTile, rootSprite, spawnSprite, splashSprite, stoneSprite,
  DuckSpriteKind, duckSprite, nestSprite, FishSpriteKind, fishSprite, SILT, ExtraSpriteKind, extraSprite,
  FIREFLY, RAIN, SKY, mayflySprite, nymphSprite, WildSpriteKind, wildSprite, boughSprite,
} from './pondArt';
import { shadowSprite, silhouetteSprite } from './pixelOceanArt';
import type { ReefLayout } from './pixelOceanView';

/** How much bigger things get per unit of height (as on the reef). */
const PERSPECTIVE = 0.0035;
const RIPPLE_SIZE = 64;
const RIPPLE_FRAMES = 32;
/** Rows of floor painted a frame, away from the view, until the whole page has been. */
const BACKLOG_ROWS = 160;
/** The bed's sideways ripple (and its algae) is redrawn every this many ticks. */
const WOBBLE_EVERY = 5;
/** The caustic light is redrawn every this many ticks. */
const LIGHT_EVERY = 2;
/** Sprites are drawn only this far (world units) beyond the viewport (see the reef's). */
const SPRITE_MARGIN = 60;
/** Glints on the surface: one tile this many cells square holds a few. */
const GLINT_TILE = 30;
const GLINTS_PER_TILE = 2;
const GLINT_LIFE = 110;

export type PondLayout = ReefLayout;

interface Drawable { depth: number; draw: () => void }

interface SpriteOptions {
  alpha?: number;
  flipX?: boolean;
  scaleY?: number;
  scale?: number;
  anchor?: 'bottom' | 'center';
  /** Squash and stretch: positive stretches it along its length, keeping its volume. */
  stretch?: number;
}

/**
 * How big each species is drawn, against its sprite: so a frog is a small
 * thing beside a duck and a heron stands tall over both (see the reef's SIZE).
 */
const SIZE: Partial<Record<PondSpecies, number>> = { frog: 0.75, heron: 1.5, pike: 1.25 };

/** Sprite widths in art pixels as drawn, for shadows and the inspection reticle. */
export const BODY_WIDTH: Record<PondSpecies, number> = { frog: 9, spawn: 11, tadpole: 6, mallard: 24, tufted: 20, minnow: 9, koi: 20, catfish: 20, pike: 31,
  dragonfly: 11, strider: 7, snail: 5, turtle: 18, heron: 24,
  whirligig: 3, damselfly: 9, kingfisher: 10, moorhen: 14, butterfly: 5, newt: 10,
};

/** Reed clumps and weed beds are drawn in bands this many rows deep, each sorted with whatever is among them. */
const BAND = 5;
/** The kinds of stem, in the order their colour runs are kept. */
const STEM_KINDS = ['reed', 'cattail', 'rush', 'iris', 'loosestrife'] as const;
/** Where the flower colours' runs sit, after every kind's three shades of three parts. */
const HEAD = STEM_KINDS.length * 9;

const hash = (n: number) => {
  let x = n | 0;
  x = Math.imul(x ^ (x >>> 16), 0x45d9f3b);
  x = Math.imul(x ^ (x >>> 16), 0x45d9f3b);
  return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
};

const rgba = (r: number, g: number, b: number) => (255 << 24) | (Math.min(255, Math.max(0, b)) << 16) | (Math.min(255, Math.max(0, g)) << 8) | Math.min(255, Math.max(0, r));

export class PondView {
  regionTop = 0;
  regionHeight = 0;
  /** Set when frames are slow to draw: finishing touches are left out (see the reef's). */
  lean = false;
  /** The creature under inspection, drawn with a reticle. */
  highlighted: PondCreature | null = null;

  private floorCtx: CanvasRenderingContext2D;
  private lightCtx: CanvasRenderingContext2D;
  private spriteCtx: CanvasRenderingContext2D;
  private spriteCtxs: CanvasRenderingContext2D[];
  private buffer = 1;
  private pendingShow = 0;
  private floorImage: ImageData | null = null;
  private floorPixels = new Uint32Array(0);
  private ripples = buildRipples(RIPPLE_SIZE, RIPPLE_FRAMES);
  private scrollY = 0;
  private viewW = 0;
  private viewH = 0;
  private floorKey = '';
  private lightKey = '';
  /** Each floor cell's finished colour with no algae on it, worked out a row at a time. */
  private baseCache = new Uint32Array(0);
  private baseRowsDone = new Uint8Array(0);
  private baseSize = '';
  /** A row's colours before the bed's ripple shifts them. */
  private rowScratch = new Uint32Array(0);
  private backlogRow = 0;
  private backlogImage: ImageData | null = null;
  private backlogWait = 0;
  /** The banks and the deep water, for dimming the light (see shade): rebuilt with the world. */
  private shadeCanvas: HTMLCanvasElement | null = null;
  private shadeKey = '';
  /** The water in the sprite window, in its canvas pixels: rebuilt as the window moves. */
  private waterPath: Path2D | null = null;
  private waterKey = '';
  /** Stem squares by colour (left, top, width, height each), reused from clump to clump. */
  private stemRuns: number[][] = Array.from({ length: HEAD + 6 }, () => []);
  private weedRuns: number[][] = Array.from({ length: WEED_KINDS.length * 9 }, () => []);
  private frondRuns: number[][] = Array.from({ length: DUCKWEED.length + 2 }, () => []);

  constructor(
    private pond: Pond,
    private floorCanvas: HTMLCanvasElement,
    private lightCanvas: HTMLCanvasElement,
    private spriteCanvases: [HTMLCanvasElement, HTMLCanvasElement],
    private px: number,
    private onLayout: (layout: PondLayout) => void,
    private showDelay = 1,
  ) {
    this.floorCtx = floorCanvas.getContext('2d', { alpha: false }) as CanvasRenderingContext2D;
    this.lightCtx = lightCanvas.getContext('2d', { alpha: false }) as CanvasRenderingContext2D;
    this.spriteCtxs = spriteCanvases.map(c => c.getContext('2d') as CanvasRenderingContext2D);
    this.spriteCtx = this.spriteCtxs[0];
  }

  // --- camera -------------------------------------------------------------

  /** World point to sprite-canvas pixels, plus its scale (the reef's projection). */
  project(x: number, z: number, h: number) {
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
  pagePosition(c: PondCreature) {
    return { x: c.x * this.px, y: (c.z - c.h * ELEVATION) * this.px };
  }

  /** The creature drawn nearest a point on the page, if one is within reach. */
  pick(x: number, pageY: number, reach = 24): PondCreature | null {
    let best: PondCreature | null = null;
    let bestD = reach * reach;
    for (const c of this.pond.creatures) {
      const p = this.pagePosition(c);
      // Things standing up are picked by their middle, not their feet.
      const lift = c.layer === 'air' && c.h < 12 ? BODY_WIDTH[c.species] * 0.25 * this.px : 0;
      const d = (p.x - x) ** 2 + (p.y - lift - pageY) ** 2;
      if (d < bestD) { bestD = d; best = c; }
    }
    return best;
  }

  scrolledFar(scrollY: number) {
    return Math.abs(scrollY - this.scrollY) >= (SPRITE_MARGIN * this.px) / 2;
  }

  // --- frame --------------------------------------------------------------

  render(scrollY: number, viewW: number, viewH: number) {
    const { px, pond } = this;
    this.scrollY = scrollY;
    const step = Math.max(1, Math.ceil(viewH / 4 / px));
    const rows = Math.min(pond.h, Math.ceil((viewH * 2) / px) + step);
    const top = Math.max(0, Math.min(pond.h - rows, Math.floor((scrollY - viewH / 2) / px / step) * step));
    if (this.floorCanvas.width !== pond.w || this.floorCanvas.height !== pond.h) this.placeFloor();
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

    const floorKey = `${top},${rows},${Math.floor(pond.tick / WOBBLE_EVERY)}`;
    if (floorKey !== this.floorKey) {
      this.floorKey = floorKey;
      this.renderBed(top, rows, this.floorPixels);
      if (this.floorImage) this.floorCtx.putImageData(this.floorImage, 0, top);
    }
    const lightKey = `${top},${rows},${Math.floor(pond.tick / LIGHT_EVERY)}`;
    if (lightKey !== this.lightKey) {
      this.lightKey = lightKey;
      this.renderLight(top, rows);
    }
    this.renderSprites();
    this.paintBacklog();
    if (this.pendingShow > 0 && --this.pendingShow === 0) {
      this.onLayout({ kind: 'sprites', buffer: this.buffer, top: this.regionTop, width: this.viewW, height: this.regionHeight });
    }
  }

  private placeFloor() {
    const { floorCanvas, lightCanvas, pond, px } = this;
    floorCanvas.width = lightCanvas.width = pond.w;
    floorCanvas.height = lightCanvas.height = pond.h;
    this.onLayout({ kind: 'floor', width: pond.w * px, height: pond.h * px });
    this.backlogRow = 0;
    this.backlogWait = 1;
    this.floorKey = '';
    this.lightKey = '';
  }

  /** Paints the next band of floor not yet painted since the floor was placed. */
  private paintBacklog() {
    const { pond } = this;
    if (this.backlogRow >= pond.h) return;
    if (this.backlogWait > 0) { this.backlogWait--; return; }
    if (!this.backlogImage || this.backlogImage.width !== pond.w) {
      this.backlogImage = this.floorCtx.createImageData(pond.w, BACKLOG_ROWS);
    }
    const n = Math.min(BACKLOG_ROWS, pond.h - this.backlogRow);
    this.renderBed(this.backlogRow, n, new Uint32Array(this.backlogImage.data.buffer));
    this.floorCtx.putImageData(this.backlogImage, 0, this.backlogRow, 0, 0, pond.w, n);
    this.backlogRow += n;
  }

  private makeFloorImage(rows: number) {
    this.floorImage = this.floorCtx.createImageData(this.pond.w, rows);
    this.floorPixels = new Uint32Array(this.floorImage.data.buffer);
    this.floorKey = '';
  }

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

  // --- the floor: banks and bed -----------------------------------------------

  /**
   * Every floor cell's colour without algae: turf, earth and wet mud on the
   * banks with a dark lip where they drop into the water; on the bed, silt
   * in the sunlit shallows going to mud, fading into murky green with depth.
   * Static, so worked out once per world size, a row at a time as needed.
   */
  private baseColours(top: number, rows: number) {
    const { pond } = this;
    const { w, h, terrain, grain, depth, shoreL, shoreR } = pond;
    const size = `${w}x${h}`;
    if (size !== this.baseSize) {
      this.baseCache = new Uint32Array(w * h);
      this.baseRowsDone = new Uint8Array(h);
      this.baseSize = size;
    }
    const F = POND_FLOOR;
    const out = this.baseCache;
    for (let z = top; z < top + rows; z++) {
      if (this.baseRowsDone[z]) continue;
      this.baseRowsDone[z] = 1;
      const l = shoreL[z], r = shoreR[z];
      for (let x = 0; x < w; x++) {
        const i = z * w + x;
        const g = grain[i];
        const t = Math.max(0, Math.min(255, terrain[i] + ((g & 31) - 16)));
        const fromShore = Math.min(x - l, r - x);
        let c: number[];
        if (fromShore <= 0) {
          // On the bank: how far up it from the water.
          const up = -fromShore;
          if (up < 1) c = F.lip;
          else if (up < 2.2) c = F.wetMud;
          else if (up < 3.5 + (g & 1)) c = F.earth;
          else {
            const k = t / 255;
            c = [0, 1, 2].map(n => F.grassDark[n] + (F.grassLight[n] - F.grassDark[n]) * k);
            // Blades of turf: sunlit tips and dark roots, scattered.
            if ((g & 15) === 0) c = F.grassTip;
            else if ((g & 15) === 1) c = F.grassDark.map(v => v * 0.8);
            // Wildflowers in drifts, each drift one colour, thickest where the turf swells.
            else if (up > 4.5 && hash(i * 31 + 7) < (k > 0.8 ? 0.16 : 0.003)) {
              c = F.flowers[Math.floor(hash(Math.floor(x / 9) + Math.floor(z / 7) * 1013) * F.flowers.length)];
            }
          }
        } else {
          const d = depth[i] / MAX_DEPTH;
          const k = t / 255;
          let rr = F.mudDark[0] + (F.mudLight[0] - F.mudDark[0]) * k;
          let gg = F.mudDark[1] + (F.mudLight[1] - F.mudDark[1]) * k;
          let bb = F.mudDark[2] + (F.mudLight[2] - F.mudDark[2]) * k;
          // Depth in a few flat bands, dithered where they meet, as pixel art
          // shades a slope (the cell's grain decides which side of the step it falls).
          const steps = 6;
          const banded = Math.min(1, Math.floor(d * steps + ((g >> 4) & 15) / 16) / steps);
          // Pale silt where the water is shallow and the sun gets through.
          const silt = Math.max(0, 1 - banded * 3) * 0.75;
          rr += (F.silt[0] - rr) * silt; gg += (F.silt[1] - gg) * silt; bb += (F.silt[2] - bb) * silt;
          // Into the murk.
          const murk = Math.min(0.72, banded * 0.85);
          rr += (F.deep[0] - rr) * murk; gg += (F.deep[1] - gg) * murk; bb += (F.deep[2] - bb) * murk;
          c = [rr, gg, bb];
          // Pebbles in the shallows and fallen leaves further out, seen through the water.
          const speck = hash(i * 17 + 3);
          const seen = 1 - murk;
          if (banded < 0.4 && speck < 0.03) c = c.map((v, n) => v + (F.pebble[speck < 0.012 ? 0 : 1][n] - v) * seen);
          else if (banded >= 0.2 && speck > 0.988) c = c.map((v, n) => v + (F.litter[speck > 0.995 ? 1 : 0][n] - v) * seen * 0.8);
          // The bank's shadow just off its edge.
          if (fromShore < 1.6) c = F.bankShadow;
          else if (fromShore < 2.6) c = c.map((v, n) => (v + F.bankShadow[n]) / 2);
        }
        out[i] = rgba(Math.round(c[0]), Math.round(c[1]), Math.round(c[2]));
      }
    }
    return out;
  }

  /**
   * Works out the floor's pixels into `out` (rows from `top`): the base
   * colours with algae mixed in, the water's cells shifted a cell or so
   * sideways in slow bands, as the bed seen through moving water wobbles.
   */
  private renderBed(top: number, rows: number, out: Uint32Array) {
    const { pond } = this;
    const { w, algae, grain, shoreL, shoreR, tick } = pond;
    const base = this.baseColours(top, rows);
    if (this.rowScratch.length !== w) this.rowScratch = new Uint32Array(w);
    const row = this.rowScratch;
    const F = POND_FLOOR;
    const t = tick / WOBBLE_EVERY;
    for (let k = 0; k < rows; k++) {
      const z = top + k;
      const at = z * w;
      row.set(base.subarray(at, at + w));
      const l = Math.ceil(shoreL[z]) + 1, r = Math.floor(shoreR[z]) - 1;
      for (let x = l; x < r; x++) {
        const a = algae[at + x];
        if (a === 0 || a + (grain[at + x] >> 1) <= 120) continue;
        const c = a > 200 && (grain[at + x] & 3) === 0 ? F.algaeDense : F.algae;
        const mix = Math.min(200, 90 + (a >> 1));
        const p = row[x];
        const pr = p & 255, pg = (p >> 8) & 255, pb = (p >> 16) & 255;
        row[x] = rgba(pr + (((c[0] - pr) * mix) >> 8), pg + (((c[1] - pg) * mix) >> 8), pb + (((c[2] - pb) * mix) >> 8));
      }
      const wobble = Math.round(Math.sin(z * 0.21 + t * 0.35) * 0.8 + Math.sin(z * 0.067 - t * 0.21) * 0.6);
      const o = k * w;
      out.set(row, o);
      if (wobble !== 0 && r - l > 4) {
        // The water's span only, so the banks stay put.
        const from = Math.max(l, l - wobble), to = Math.min(r, r - wobble);
        out.set(row.subarray(from, to), o + from + wobble);
      }
    }
  }

  /**
   * The banks in black and the water darkening with depth, a canvas pixel
   * per cell: laid over the caustics, so they dance brightest in the
   * shallows and fade out over the deep middle. Rebuilt with the world.
   */
  private shade() {
    const { pond } = this;
    const key = `${pond.w}x${pond.h}`;
    if (this.shadeCanvas && key === this.shadeKey) return this.shadeCanvas;
    const { w, h, depth } = pond;
    const c = makeCanvas(w, h);
    const ctx = c.getContext('2d') as CanvasRenderingContext2D;
    const img = ctx.createImageData(w, h);
    const px = new Uint32Array(img.data.buffer);
    for (let i = 0; i < w * h; i++) {
      const d = depth[i] / MAX_DEPTH;
      const a = depth[i] === 0 ? 255 : Math.round(255 * Math.min(0.72, d * d * 0.9));
      px[i] = a << 24;
    }
    ctx.putImageData(img, 0, 0);
    this.shadeCanvas = c;
    this.shadeKey = key;
    return c;
  }

  /**
   * Caustic light dancing on the bed: two sets of ripples crossing, one
   * mirrored, a little larger and drifting, so the pattern never visibly
   * repeats; kept off the banks and faint over the deep water.
   */
  private renderLight(top: number, rows: number) {
    const { pond, lightCtx: ctx } = this;
    ctx.imageSmoothingEnabled = false;
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, top, pond.w, rows);
    // The sun's light on the bed dims under rain clouds and goes at night.
    const sun = Math.max(0.05, (1 - pond.nightfall() * 0.9) * (1 - pond.rainAmount() * 0.6));
    ctx.globalCompositeOperation = 'lighter';
    const frame = (pond.tick >> 1) % RIPPLE_FRAMES;
    const a = ctx.createPattern(rippleTile(this.ripples, RIPPLE_SIZE, frame, POND_FLOOR.caustic, false), 'repeat');
    const b = ctx.createPattern(rippleTile(this.ripples, RIPPLE_SIZE, (frame + 11) % RIPPLE_FRAMES, POND_FLOOR.caustic, false), 'repeat');
    if (a && b && typeof DOMMatrix !== 'undefined') {
      ctx.globalAlpha = sun * 0.8;
      ctx.fillStyle = a;
      ctx.fillRect(0, top, pond.w, rows);
      const drift = pond.tick * 0.02;
      b.setTransform(new DOMMatrix([-1.3125, 0, 0, 1.3125, 37 + drift, 19 + drift * 0.6]));
      ctx.globalAlpha = sun * 0.7;
      ctx.fillStyle = b;
      ctx.fillRect(0, top, pond.w, rows);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(this.shade(), 0, top, pond.w, rows, 0, top, pond.w, rows);
  }

  // --- sprites ------------------------------------------------------------

  /** The water in the sprite window, as one path in its canvas pixels. */
  private water() {
    const { pond, px } = this;
    const key = `${this.regionTop},${this.regionHeight},${pond.w}x${pond.h}`;
    if (this.waterPath && key === this.waterKey) return this.waterPath;
    const path = new Path2D();
    const z0 = Math.floor(this.regionTop / px);
    const z1 = Math.min(pond.h, z0 + Math.ceil(this.regionHeight / px));
    let start = z0;
    for (let z = z0 + 1; z <= z1; z++) {
      const same = z < z1 && Math.round(pond.shoreL[z]) === Math.round(pond.shoreL[start]) && Math.round(pond.shoreR[z]) === Math.round(pond.shoreR[start]);
      if (same) continue;
      const l = Math.round(pond.shoreL[start]) + 1, r = Math.round(pond.shoreR[start]) - 1;
      path.rect(l * px, start * px - this.regionTop, (r - l) * px, (z - start) * px);
      start = z;
    }
    this.waterPath = path;
    this.waterKey = key;
    return path;
  }

  /** How solid something this deep is drawn: the murk swallows the deepest. */
  private depthAlpha(depth: number) {
    return Math.max(0.5, 1 - (0.5 * depth) / MAX_DEPTH);
  }

  /**
   * How far (cells) the bed seen at a floor row is shifted sideways by the
   * moving water this frame: the same ripple the floor is drawn with.
   */
  private wobbleAt(row: number) {
    const t = Math.floor(this.pond.tick / WOBBLE_EVERY);
    return Math.round(Math.sin(row * 0.21 + t * 0.35) * 0.8 + Math.sin(row * 0.067 - t * 0.21) * 0.6);
  }

  /** Draws a sprite at a world point, scaled for its height (see the reef's). */
  private sprite(img: HTMLCanvasElement, x: number, z: number, h: number, o: SpriteOptions = {}) {
    const { spriteCtx: ctx, px } = this;
    const p = this.project(x, z, h);
    const k = px * p.s * (o.scale ?? 1);
    const st = o.stretch ?? 0;
    const w = Math.round(img.width * k * (1 + st * 0.35));
    const hh = Math.round(img.height * k * (o.scaleY ?? 1) * (1 - st * 0.3));
    ctx.globalAlpha = o.alpha ?? 1;
    const top = o.anchor === 'bottom' ? p.y - hh : p.y - hh / 2;
    if (!o.flipX) {
      ctx.drawImage(img, Math.round(p.x - w / 2), Math.round(top), w, hh);
      return;
    }
    ctx.save();
    ctx.translate(Math.round(p.x), Math.round(top));
    ctx.scale(-1, 1);
    ctx.drawImage(img, -Math.round(w / 2), 0, w, hh);
    ctx.restore();
  }

  /** A soft dark ellipse on the bed or the surface (see the reef's shadows). */
  private shadow(x: number, z: number, h: number, width: number, alpha: number) {
    const { spriteCtx: ctx, px } = this;
    const sw = Math.max(3, Math.round(width));
    const p = this.project(x, z, h);
    const img = shadowSprite(sw);
    ctx.globalAlpha = alpha;
    ctx.drawImage(img, Math.round(p.x - (sw * px) / 2), Math.round(p.y - (img.height * px) / 2), sw * px, img.height * px);
  }

  private renderSprites() {
    const { spriteCtx: ctx, pond, px } = this;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, this.viewW, this.regionHeight);

    // Anything whose footprint is near the viewport: things underwater are
    // drawn further down than their spot on the surface, tall things further up.
    const z0 = Math.max(this.regionTop, this.scrollY) / px - SPRITE_MARGIN - MAX_DEPTH * ELEVATION;
    const z1 = Math.min(this.regionTop + this.regionHeight, this.scrollY + this.viewH) / px + SPRITE_MARGIN + 40 * ELEVATION;
    const visible = (z: number) => z >= z0 && z <= z1;

    // 1. Underwater: shadows on the bed, then the bed's own things and
    // everything swimming, depth-sorted, fading into the murk.
    const under: Drawable[] = [];
    for (const p of pond.pads) {
      if (!visible(p.z)) continue;
      const d = pond.depthAt(p.x, p.z);
      this.shadow(p.x + this.wobbleAt(p.z + d * ELEVATION), p.z, -d, p.r * 2.2, 0.28 * this.depthAlpha(d));
    }
    for (const st of pond.stones) {
      if (st.land || !visible(st.z)) continue;
      const d = pond.depthAt(st.x, st.z);
      under.push({ depth: st.z, draw: () => this.sprite(stoneSprite(st.seed, st.w, st.ht), st.x + this.wobbleAt(st.z + d * ELEVATION), st.z, -d, { anchor: 'bottom', alpha: this.depthAlpha(d) }) });
    }
    for (const r of pond.roots) {
      if (!visible(r.z)) continue;
      under.push({ depth: r.z, draw: () => this.sprite(rootSprite(r.seed), r.x + r.side * 7, r.z, -1.5, { flipX: r.side < 0, alpha: 0.75 }) });
    }
    for (const l of pond.logs) {
      if (l.floating || !visible(l.z)) continue;
      const d = pond.depthAt(l.x, l.z);
      under.push({ depth: l.z, draw: () => this.sprite(logSprite(l.seed, l.len, logThickness(l.len)), l.x + this.wobbleAt(l.z + d * ELEVATION), l.z, -d, { anchor: 'bottom', flipX: l.side < 0, alpha: this.depthAlpha(d) }) });
    }
    for (const b of pond.weedBeds) {
      if (b.z + b.rz >= z0 && b.z - b.rz <= z1) this.addWeeds(b, under);
    }
    for (const c of pond.creatures) {
      if (!visible(c.z)) continue;
      if (c.layer === 'under' || c.layer === 'bed') {
        const d = pond.depthAt(c.x, c.z);
        // Its shadow on the bed below it, fainter the further above the bed it is.
        this.shadow(c.x, c.z, -d, BODY_WIDTH[c.species] * 0.7, 0.3 * Math.max(0.2, 1 - (d + c.h) / 20) * this.depthAlpha(d));
        under.push({ depth: c.z + 0.3, draw: () => this.drawCreature(c, this.depthAlpha(-c.h)) });
      } else if (c.species === 'strider') {
        // Each foot dimples the surface, and every dimple throws a round shadow on the bed.
        const d = pond.depthAt(c.x, c.z);
        for (const [fx, fz] of [[-3, -1], [3, -1], [-3, 1], [3, 1]]) this.shadow(c.x + fx, c.z + fz, -d, 2, 0.35 * this.depthAlpha(d));
      } else if (c.layer === 'surface' && c.species === 'frog') {
        // A frog floating with its eyes up: the rest of it hangs just below the surface.
        under.push({ depth: c.z + 0.3, draw: () => this.sprite(pondSprite('frogSwim1', c.palette, c.energy < 0.15), c.x, c.z, c.h - 1.5, { flipX: c.facing < 0, alpha: 0.55, scale: SIZE.frog }) });
      }
    }
    under.sort((a, b) => a.depth - b.depth);
    for (const item of under) item.draw();
    this.drawSilt(z0, z1);

    // 2. The surface itself, over everything below it.
    this.drawSurface();
    if (pond.heronPass && !this.lean) this.drawHeronPass();

    // 3. On and above the surface: duckweed flat on the water first, then
    // pads, logs, reeds and the banks' stones, depth-sorted.
    this.drawDuckweed(z0, z1);
    this.drawRings(z0, z1);
    for (const c of pond.creatures) {
      if (c.layer === 'surface' && (c.species === 'mallard' || c.species === 'tufted') && visible(c.z)) this.drawWake(c);
    }
    // Shadows of things in the air, on the water or the ground beneath them.
    for (const c of pond.creatures) {
      if (c.layer !== 'air' || c.perch || !visible(c.z)) continue;
      this.shadow(c.x, c.z, 0, BODY_WIDTH[c.species] * 0.75, 0.3 * Math.max(0.15, 1 - c.h / 40));
    }
    const over: Drawable[] = [];
    for (const c of pond.creatures) {
      if ((c.layer === 'air' || c.layer === 'surface') && visible(c.z)) over.push({ depth: c.z + 0.3, draw: () => this.drawCreature(c, 1) });
    }
    for (const n of pond.nymphs) {
      if (visible(n.z)) over.push({ depth: n.z + 0.2, draw: () => this.sprite(nymphSprite(n.timer > 0), n.x, n.z, Math.max(0, n.h), { anchor: 'bottom', alpha: n.h < 0 ? 0.6 : 1 }) });
    }
    for (const m of pond.midges) {
      if (m.swarm >= 0 || !m.alive || !visible(m.z)) continue;
      over.push({ depth: m.z + 0.2, draw: () => this.sprite(mayflySprite(!!m.spent), m.x, m.z, m.h, { alpha: m.spent ? 0.85 : 1 }) });
    }
    for (const n of pond.nests) if (visible(n.z)) over.push({ depth: n.z - 0.5, draw: () => this.sprite(nestSprite(), n.x, n.z + 1, 0, { anchor: 'bottom' }) });
    for (const p of pond.pads) if (visible(p.z)) over.push({ depth: p.z - p.r * 0.6, draw: () => this.drawPad(p) });
    for (const l of pond.logs) {
      if (!l.floating || !visible(l.z)) continue;
      // Its shadow on the water, and the log riding low in it.
      this.shadow(l.x, l.z + 1, 0, l.len * 1.05, 0.3);
      over.push({ depth: l.z, draw: () => this.sprite(logSprite(l.seed, l.len, logThickness(l.len)), l.x, l.z, 0.6, { anchor: 'bottom', flipX: l.side < 0 }) });
    }
    for (const b of pond.boughs) {
      if (!visible(b.z)) continue;
      const cx = b.x + (b.side * b.len) / 2;
      // Its shade on the water below.
      this.shadow(cx + b.side * 3, b.z + 2, 0, b.len * 0.9, 0.22);
      over.push({ depth: b.z + 1, draw: () => this.sprite(boughSprite(b.seed, b.len), cx, b.z, BOUGH_H, { anchor: 'bottom', flipX: b.side < 0 }) });
    }
    for (const st of pond.stones) {
      if (st.land && visible(st.z)) over.push({ depth: st.z, draw: () => this.sprite(stoneSprite(st.seed, st.w, st.ht), st.x, st.z, 0, { anchor: 'bottom' }) });
    }
    for (const c of pond.clumps) {
      if (c.z + 8 >= z0 && c.z - 8 <= z1) this.addReeds(c, over);
    }
    over.sort((a, b) => a.depth - b.depth);
    for (const item of over) item.draw();
    this.drawMidges(z0, z1);
    this.drawDroplets(z0, z1);
    this.drawSky();
    this.drawFireflies(z0, z1);
    ctx.globalAlpha = 1;
    for (const c of pond.creatures) if (c.adopted && visible(c.z)) this.drawAdoptedMarker(c);
    const target = this.highlighted;
    if (target?.alive && visible(target.z)) this.drawReticle(target);
  }

  /** A small bobbing arrow over the visitor's own creature (as on the reef), in lily pink. */
  private drawAdoptedMarker(c: PondCreature) {
    const { spriteCtx: ctx, px } = this;
    const p = this.project(c.x, c.z, c.h);
    const bob = (this.pond.tick >> 4) & 1 ? px : 0;
    const up = c.layer === 'air' && c.h < 12 ? BODY_WIDTH[c.species] * 0.6 : BODY_WIDTH[c.species] * 0.35;
    const y = Math.round(p.y - (up + 5) * px * p.s - bob);
    const x = Math.round(p.x);
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#0b1a14';
    ctx.fillRect(x - px * 2.5, y - px * 0.5, px * 5, px * 2);
    ctx.fillRect(x - px * 1.5, y + px * 1.5, px * 3, px);
    ctx.fillRect(x - px * 0.5, y + px * 2.5, px, px);
    ctx.fillStyle = '#f2b8cc';
    ctx.fillRect(x - px * 2, y, px * 4, px);
    ctx.fillRect(x - px, y + px, px * 2, px);
  }

  /** Blinking corner brackets around a creature, like a targeting cursor (as on the reef). */
  private drawReticle(c: PondCreature) {
    const { spriteCtx: ctx, px } = this;
    const p = this.project(c.x, c.z, c.h);
    const lift = c.layer === 'air' && c.h < 12 ? BODY_WIDTH[c.species] * 0.25 * px : 0;
    const half = BODY_WIDTH[c.species] * px * p.s * 0.5 + px * 2;
    const arm = px * 2;
    const t = px * 0.75;
    const pulse = (this.pond.tick >> 3) & 1 ? px : 0;
    const x0 = Math.round(p.x - half - pulse);
    const x1 = Math.round(p.x + half + pulse);
    const y0 = Math.round(p.y - lift - half * 0.75 - pulse);
    const y1 = Math.round(p.y - lift + half * 0.75 + pulse);
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#ffd166';
    for (const [x, y, dx, dy] of [[x0, y0, 1, 1], [x1, y0, -1, 1], [x0, y1, 1, -1], [x1, y1, -1, -1]]) {
      ctx.fillRect(dx > 0 ? x : x - arm, dy > 0 ? y : y - t, arm, t);
      ctx.fillRect(dx > 0 ? x : x - t, dy > 0 ? y : y - arm, t, arm);
    }
  }

  /**
   * The light of the moment over everything: the warm gold of dusk (pinker
   * at dawn), the deep blue of night, and grey rain with streaks falling.
   */
  private drawSky() {
    const { spriteCtx: ctx, pond, px } = this;
    const night = pond.nightfall();
    const glow = pond.duskGlow();
    const rain = pond.rainAmount();
    const ev = pond.happening;
    if (glow > 0) {
      ctx.globalAlpha = glow * 0.16;
      ctx.fillStyle = ev && ev.t > ev.dur / 2 ? SKY.dawn : SKY.dusk;
      ctx.fillRect(0, 0, this.viewW, this.regionHeight);
    }
    if (night > 0) {
      ctx.globalAlpha = night * 0.5;
      ctx.fillStyle = SKY.night;
      ctx.fillRect(0, 0, this.viewW, this.regionHeight);
    }
    if (rain > 0) {
      ctx.globalAlpha = rain * 0.2;
      ctx.fillStyle = SKY.rain;
      ctx.fillRect(0, 0, this.viewW, this.regionHeight);
      // Streaks: short slanted dashes falling across the view, two cells long.
      ctx.globalAlpha = 0.45 * rain;
      ctx.fillStyle = RAIN;
      const top = this.scrollY - this.regionTop;
      const count = Math.round((this.viewW * this.viewH) / 9000 * rain);
      for (let k = 0; k < count; k++) {
        const fall = ((pond.tick * 9 + hash(k * 13 + 7) * this.viewH) % (this.viewH + 40)) - 20;
        const x = Math.round((hash(k * 31 + 3) * this.viewW + fall * 0.25) / px) * px;
        const y = Math.round((top + fall) / px) * px;
        ctx.fillRect(x, y, px, px);
        ctx.fillRect(x - px, y - px * 2, px, px);
      }
    }
  }

  /** Fireflies blinking over the banks: a soft glow with a bright heart, on, then off. */
  private drawFireflies(z0: number, z1: number) {
    const { spriteCtx: ctx, pond, px } = this;
    if (!pond.fireflies.length) return;
    ctx.globalCompositeOperation = 'lighter';
    for (const f of pond.fireflies) {
      if (f.z < z0 || f.z > z1) continue;
      const blink = Math.sin((pond.tick + f.phase) * 0.08);
      if (blink < 0.2) continue;
      const p = this.project(f.x, f.z, f.h);
      ctx.globalAlpha = 0.35 * blink;
      ctx.fillStyle = FIREFLY[0];
      ctx.fillRect(Math.round(p.x - px), Math.round(p.y - px), px * 3, px * 3);
      ctx.globalAlpha = blink;
      ctx.fillStyle = FIREFLY[1];
      ctx.fillRect(Math.round(p.x), Math.round(p.y), px, px);
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  private drawCreature(c: PondCreature, alpha: number) {
    const tick = this.pond.tick;
    switch (c.species) {
      case 'frog': this.drawFrog(c, alpha); return;
      case 'mallard': case 'tufted': this.drawDuck(c, alpha); return;
      case 'dragonfly': {
        // Wings a blur: they beat every tick while it hovers.
        const kind: ExtraSpriteKind = (tick + c.id) & 1 ? 'dfly1' : 'dfly0';
        this.sprite(extraSprite(kind, c.palette), c.x, c.z, c.h, { flipX: c.facing < 0, alpha });
        return;
      }
      case 'strider':
        this.sprite(extraSprite('strider'), c.x, c.z, 0.4, { flipX: c.facing < 0, alpha });
        return;
      case 'snail':
        this.sprite(extraSprite('snail'), c.x, c.z, c.h, { flipX: c.facing < 0, alpha: alpha * 0.95 });
        return;
      case 'turtle':
        this.sprite(extraSprite(c.layer === 'under' ? 'turtleSwim' : 'turtle'), c.x, c.z, c.h, { flipX: c.facing < 0, alpha, anchor: c.layer === 'under' ? 'center' : 'bottom', stretch: c.squash });
        return;
      case 'heron': {
        let kind: ExtraSpriteKind = 'heronStand';
        if (c.layer === 'air') kind = (tick + c.id) >> 3 & 1 ? 'heronFly1' : 'heronFly0';
        else if (c.mood === 'striking') kind = 'heronStrike';
        // Standing in the shallows, its feet below the surface.
        this.sprite(extraSprite(kind), c.x, c.z, c.layer === 'air' ? c.h : -2, { flipX: c.facing < 0, alpha, anchor: 'bottom', scale: SIZE.heron });
        return;
      }
      case 'whirligig':
        this.sprite(wildSprite('whirligig'), c.x, c.z, 0.3, { flipX: c.facing < 0, alpha });
        return;
      case 'damselfly': {
        const kind: WildSpriteKind = c.mood === 'perched' ? 'damselPerch' : (tick + c.id) & 1 ? 'damsel1' : 'damsel0';
        this.sprite(wildSprite(kind, c.palette), c.x, c.z, c.h, { flipX: c.facing < 0, alpha, anchor: c.mood === 'perched' ? 'bottom' : 'center' });
        return;
      }
      case 'kingfisher': {
        let kind: WildSpriteKind = 'kfPerch';
        if (c.mood === 'diving') kind = 'kfDive';
        else if (c.mood === 'flying') kind = (tick + c.id) >> 1 & 1 ? 'kfFly1' : 'kfFly0';
        // Perched, it bobs its head now and then.
        const bob = c.mood === 'perched' && (tick + c.id * 13) % 90 < 6 ? -0.6 : 0;
        this.sprite(wildSprite(kind), c.x, c.z, c.h + bob, { flipX: c.facing < 0, alpha, anchor: c.mood === 'perched' ? 'bottom' : 'center' });
        return;
      }
      case 'moorhen': {
        const onPad = c.layer === 'air';
        // A nod of the head with every stroke, and pecking at the pad it stands on.
        const nod = onPad ? (tick + c.id * 7) % 40 < 8 : Math.hypot(c.vx, c.vz) > 0.06 && (tick + c.id * 5) % 16 < 6;
        const kind: WildSpriteKind = onPad ? (nod ? 'moorhenBob' : 'moorhenWalk') : nod ? 'moorhenBob' : 'moorhen';
        const bob = onPad ? 0 : ((tick + c.id * 11) >> 4 & 1) * 0.5 - 1.5;
        this.sprite(wildSprite(kind, 0, c.energy < 0.15), c.x, c.z, c.h + bob, { flipX: c.facing < 0, alpha, anchor: 'bottom', stretch: c.squash });
        return;
      }
      case 'butterfly': {
        // Wings beating fast in flight, opening and closing slowly on a flower.
        const open = c.mood === 'feeding' ? (tick + c.id * 3) % 70 < 40 : (tick + c.id) >> 1 & 1;
        this.sprite(wildSprite(open ? 'flyOpen' : 'flyHalf', c.palette), c.x, c.z, c.h, { flipX: c.facing < 0, alpha, anchor: c.mood === 'feeding' ? 'bottom' : 'center' });
        return;
      }
      case 'newt': {
        const moving = Math.hypot(c.vx, c.vz) > 0.01;
        const kind: WildSpriteKind = moving && (tick + c.id * 3) >> 3 & 1 ? 'newt1' : 'newt0';
        this.sprite(wildSprite(kind, 0, c.energy < 0.15), c.x, c.z, c.h, { flipX: c.facing < 0, alpha });
        return;
      }
      case 'minnow': case 'koi': case 'catfish': case 'pike': {
        const young = c.age < POND_SPECIES[c.species].mature;
        const fast = Math.hypot(c.vx, c.vz) > 0.4 || c.mood === 'striking';
        const beat = ((tick + c.id * 7) >> (fast ? 2 : c.species === 'minnow' ? 3 : 4)) & 1;
        const kind: FishSpriteKind = c.species === 'minnow' ? (young ? 'fry' : beat ? 'minnow1' : 'minnow0')
          : c.species === 'koi' ? (beat ? 'koi1' : 'koi0') : c.species === 'catfish' ? 'catfish0' : beat ? 'pike1' : 'pike0';
        // A lurking pike is half hidden among the weeds.
        const hide = c.species === 'pike' && c.mood !== 'striking' ? 0.8 : 1;
        this.sprite(fishSprite(c.species, kind, c.palette, c.energy < 0.15), c.x, c.z, c.h, { flipX: c.facing < 0, alpha: alpha * hide, stretch: c.squash, scale: SIZE[c.species] });
        return;
      }
      case 'spawn': {
        // The eggs darken and stretch into commas, and the jelly wobbles more as hatching nears.
        const dev = c.age / SPAWN_TICKS;
        const stage = Math.min(3, Math.floor(dev * 4));
        const jiggle = stage >= 2 ? Math.sin(tick * 0.25 + c.id) * 0.08 * stage : 0;
        this.sprite(spawnSprite(c.id, stage, (tick >> 3) & 1), c.x, c.z, c.h, { alpha: alpha * 0.9, stretch: jiggle });
        return;
      }
      case 'tadpole': {
        // A wriggling comma: back legs first, then front legs.
        const dev = c.age / TADPOLE_TICKS;
        const wriggle = (tick + c.id * 3) >> 2 & 1;
        const kind: PondSpriteKind = dev < 0.4 ? (wriggle ? 'tad1' : 'tad0') : dev < 0.72 ? (wriggle ? 'tadLegs1' : 'tadLegs0') : 'tadArms';
        this.sprite(pondSprite(kind, c.palette, c.energy < 0.15), c.x, c.z, c.h, { flipX: c.facing < 0, alpha, stretch: kind === 'tadArms' ? (wriggle ? 0.12 : -0.05) : c.squash });
        return;
      }
    }
  }

  /**
   * A frog: sitting (blinking now and then), croaking with its throat sac
   * swelling, crouched to spring, stretched out in the air, kicking through
   * the water, or just its eyes above the surface.
   */
  private drawFrog(c: PondCreature, alpha: number) {
    const tick = this.pond.tick;
    const washed = c.energy < 0.15;
    let kind: PondSpriteKind;
    const froglet = c.age < POND_SPECIES.frog.mature;
    if (froglet && c.layer !== 'surface') kind = c.age < TAIL_TICKS ? 'froglet' : 'frogletBare';
    else if (c.leap) kind = c.leap.t < 3 ? 'frogCrouch' : 'frogLeap';
    else if (c.layer === 'surface') kind = 'frogEyes';
    else if (c.layer === 'under') kind = (tick + c.id * 7) % 22 < 8 ? 'frogSwim0' : 'frogSwim1';
    else if (c.throat > 0.5) kind = 'frogCroak';
    else kind = (tick + c.id * 37) % 110 < 4 ? 'frogBlink' : 'frogSit';
    const anchor = c.layer === 'under' || c.layer === 'surface' ? 'center' : 'bottom';
    this.sprite(pondSprite(kind, c.palette, washed), c.x, c.z, c.h, { flipX: c.facing < 0, alpha, anchor, stretch: c.squash, scale: SIZE.frog });
    if (c.tongue > 0) this.drawTongue(c);
    if (kind === 'frogCroak') this.drawCroak(c);
  }

  /**
   * A duck: floating, quacking, preening, tail-up dabbling, running across
   * the water to take off, beating its wings in flight, or (a tufted duck)
   * swimming under; ducklings are little balls of fluff.
   */
  private drawDuck(c: PondCreature, alpha: number) {
    const tick = this.pond.tick;
    const washed = c.energy < 0.15;
    const tufted = c.species === 'tufted';
    let kind: DuckSpriteKind;
    if (c.age < POND_SPECIES[c.species].mature) kind = 'duckling';
    else if (tufted) kind = c.layer === 'under' ? 'tuftedDive' : 'tufted';
    else if (c.mood === 'flying') kind = (tick + c.id * 3) >> 2 & 1 ? 'fly1' : 'fly0';
    else if (c.mood === 'landing') kind = c.h > 4 ? 'fly0' : 'run';
    else if (c.mood === 'takingOff') kind = c.h > 0 ? ((tick >> 2) & 1 ? 'fly1' : 'fly0') : 'run';
    else if (c.mood === 'dabbling') kind = 'dabble';
    else if (c.mood === 'preening') kind = (tick + c.id) >> 4 & 1 ? 'preen' : 'float';
    else if (c.mood === 'quacking') kind = (tick >> 2) & 1 ? 'quack' : 'float';
    else kind = 'float';
    // Floating birds sit low in the water; their bobbing is a pixel up and down.
    const afloat = c.layer === 'surface';
    const bob = afloat ? ((tick + c.id * 11) >> 4 & 1) * 0.5 - 1.5 : 0;
    this.sprite(duckSprite(kind, c.palette, washed), c.x, c.z, c.h + bob, { flipX: c.facing < 0, alpha, anchor: c.layer === 'under' ? 'center' : 'bottom', stretch: c.squash });
    if (kind === 'quack') this.drawQuack(c);
  }

  /** A V of ripples spreading back from a paddling bird. */
  private drawWake(c: PondCreature) {
    const { spriteCtx: ctx, px, pond } = this;
    const speed = Math.hypot(c.vx, c.vz);
    if (speed < 0.04) return;
    const dx = c.vx / speed, dz = c.vz / speed;
    const big = c.age >= POND_SPECIES[c.species].mature;
    const n = big ? 7 : 3;
    const stern = BODY_WIDTH[c.species] * (big ? 0.4 : 0.2);
    ctx.fillStyle = RING[0];
    for (let k = 1; k <= n; k++) {
      const along = stern + k * 2.2;
      const spread = k * 1.15;
      // The arms shimmer as they spread, every other dot dropping out in turn.
      if (((pond.tick >> 2) + k) % 3 === 0) continue;
      ctx.globalAlpha = 0.7 * (1 - k / (n + 1)) * Math.min(1, speed * 6);
      for (const side of [-1, 1]) {
        const p = this.project(c.x - dx * along - dz * spread * side, c.z - dz * along * 0.6 + dx * spread * side * 0.5, 0);
        ctx.fillRect(Math.round(p.x - px / 2), Math.round(p.y), px * (k > 3 ? 2 : 1), px);
      }
    }
  }

  /** A quack: three little strokes from the open bill. */
  private drawQuack(c: PondCreature) {
    const { spriteCtx: ctx, px } = this;
    const p = this.project(c.x + c.facing * 10, c.z, c.h + 10);
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = RING[1];
    for (const [dx, dy] of [[0, -2], [1, 0], [0, 2]]) ctx.fillRect(Math.round(p.x + c.facing * dx * px), Math.round(p.y + dy * px), px * 2, px);
  }

  /** A frog's tongue, out to a midge and back: a pink line with a sticky tip. */
  private drawTongue(c: PondCreature) {
    const { spriteCtx: ctx, px } = this;
    const { mouth, tip } = this.pond.tongueTip(c);
    const steps = Math.max(2, Math.ceil(Math.hypot(tip.x - mouth.x, (tip.h - mouth.h) * ELEVATION)));
    ctx.globalAlpha = 1;
    for (let k = 0; k <= steps; k++) {
      const t = k / steps;
      const p = this.project(mouth.x + (tip.x - mouth.x) * t, mouth.z + (tip.z - mouth.z) * t, mouth.h + (tip.h - mouth.h) * t);
      ctx.fillStyle = TONGUE[k === steps ? 1 : 0];
      ctx.fillRect(Math.round(p.x - px / 2), Math.round(p.y - px / 2), px, px);
    }
  }

  /** Little arcs of sound spreading from a croaking frog's throat. */
  private drawCroak(c: PondCreature) {
    const { spriteCtx: ctx, px } = this;
    const p = this.project(c.x + c.facing * 7, c.z, c.h + 4);
    const phase = (this.pond.tick >> 2) % 3;
    ctx.fillStyle = RING[1];
    for (let k = 0; k < 2; k++) {
      const r = (k * 3 + phase + 2) * px;
      ctx.globalAlpha = 0.7 - k * 0.3;
      for (const dy of [-1, 0, 1]) ctx.fillRect(Math.round(p.x + c.facing * (r - Math.abs(dy) * px)), Math.round(p.y + dy * px), px, px);
    }
  }

  /**
   * A heron high overhead: only its shadow, a big dark silhouette three
   * times its size, slides across the water with slow wingbeats.
   */
  private drawHeronPass() {
    const { spriteCtx: ctx, pond, px } = this;
    const hp = pond.heronPass!;
    const frame = (pond.tick >> 4) & 1 ? 'heronFly1' : 'heronFly0';
    const img = silhouetteSprite(`pond-${frame}`, extraSprite(frame), 'rgb(4,16,12)');
    const k = px * 3;
    const w = img.width * k, h = img.height * k;
    const p = this.project(hp.x, hp.z, 0);
    ctx.globalAlpha = 0.24;
    ctx.save();
    ctx.translate(Math.round(p.x), Math.round(p.y));
    ctx.scale(hp.dir, 1);
    ctx.drawImage(img, -w / 2, -h / 2, w, h);
    ctx.restore();
  }

  /** Clouds of silt stirred up off the bed, thinning as they settle. */
  private drawSilt(z0: number, z1: number) {
    const { spriteCtx: ctx, pond, px } = this;
    for (const p of pond.silt) {
      if (p.z < z0 || p.z > z1) continue;
      const q = this.project(p.x, p.z, p.h);
      const k = p.life / p.maxLife;
      ctx.globalAlpha = 0.5 * k;
      ctx.fillStyle = SILT[k > 0.5 ? 1 : 0];
      const size = px * (k > 0.6 ? 2 : 1);
      ctx.fillRect(Math.round(q.x), Math.round(q.y), size, size);
    }
  }

  /** Ripple rings spreading over the surface, as dotted pixel ellipses fading as they grow. */
  private drawRings(z0: number, z1: number) {
    const { spriteCtx: ctx, pond, px } = this;
    for (const r of pond.rings) {
      if (r.z < z0 || r.z > z1) continue;
      const p = this.project(r.x, r.z, 0);
      const fade = r.life / r.maxLife;
      ctx.globalAlpha = 0.75 * fade;
      ctx.fillStyle = RING[fade > 0.6 ? 1 : 0];
      const n = Math.max(6, Math.round(r.r * 3));
      for (let k = 0; k < n; k++) {
        const a = (k / n) * Math.PI * 2;
        ctx.fillRect(Math.round(p.x + Math.cos(a) * r.r * px - px / 2), Math.round(p.y + Math.sin(a) * r.r * 0.45 * px - px / 2), px, px);
      }
    }
  }

  /** Midges: specks dancing over the reeds, a wing glinting now and then. */
  private drawMidges(z0: number, z1: number) {
    const { spriteCtx: ctx, pond, px } = this;
    const size = Math.max(2, Math.round(px * 0.75));
    for (let shade = 0; shade < 2; shade++) {
      ctx.globalAlpha = shade ? 0.6 : 0.85;
      ctx.fillStyle = MIDGE[shade];
      for (const m of pond.midges) {
        if (!m.alive || m.swarm < 0 || m.z < z0 || m.z > z1) continue;
        const glint = ((pond.tick >> 1) + (m.swarm * 7 + Math.round(m.x))) % 5 === 0;
        if ((shade === 1) !== glint) continue;
        const p = this.project(m.x, m.z, m.h);
        ctx.fillRect(Math.round(p.x), Math.round(p.y), size, size);
      }
    }
  }

  private drawDroplets(z0: number, z1: number) {
    for (const d of this.pond.droplets) {
      if (d.z < z0 || d.z > z1) continue;
      this.sprite(splashSprite(d.vh > 0 ? 0 : d.h > 2 ? 1 : 2), d.x, d.z, d.h, { alpha: 0.9 });
    }
  }

  /** A lily pad (bobbing, dipped or tipped by a weight on it) and its flower. */
  private drawPad(p: Pad) {
    const bob = Math.sin(this.pond.tick * 0.05 + p.phase) * 0.45 + p.dip;
    this.sprite(padSprite(p.r, p.notch, p.palette), p.x, p.z, bob, { scaleY: 1 - Math.min(0.25, Math.abs(p.tilt) * 0.2) });
    if (p.flower) {
      const stage = p.bloom > 0.66 ? 'open' : p.bloom > 0.33 ? 'half' : 'bud';
      const fx = p.x + Math.cos((p.notch / 8) * Math.PI * 2 + Math.PI) * p.r * 0.35;
      this.sprite(lilySprite(stage, p.flower), fx, p.z, bob + 1.5, { anchor: 'bottom' });
    }
  }

  /**
   * Duckweed and crowfoot: a little oval leaf two cells across per frond,
   * and crowfoot's flowers (white petals round a yellow heart) held just
   * above the water; gathered by colour in one pass, then filled.
   */
  private drawDuckweed(z0: number, z1: number) {
    const { spriteCtx: ctx, pond, px, regionTop } = this;
    const runs = this.frondRuns;
    const petals = DUCKWEED.length, heart = petals + 1;
    for (const f of pond.fronds) {
      if (!f.alive || f.z < z0 || f.z > z1) continue;
      const x = Math.round(f.x) * px, y = Math.round(f.z) * px - regionTop;
      runs[f.shade].push(x, y, px * 2, px);
      if (f.flower) runs[petals].push(x - px, y - px, px * 3, px, x, y - px * 2, px, px * 3), runs[heart].push(x, y - px, px, px);
    }
    ctx.globalAlpha = 1;
    for (let c = 0; c < runs.length; c++) {
      const run = runs[c];
      if (!run.length) continue;
      ctx.fillStyle = c < petals ? DUCKWEED[c] : CROWFOOT_FLOWER[c - petals];
      for (let k = 0; k < run.length; k += 4) ctx.fillRect(run[k], run[k + 1], run[k + 2], run[k + 3]);
      run.length = 0;
    }
  }

  /** A reed clump in bands of depth, so whatever sits among the stems is drawn between them. */
  private addReeds(c: ReedClump, items: Drawable[]) {
    const { stems } = c;
    for (let first = 0; first < stems.length;) {
      const band = Math.floor(stems[first].z / BAND);
      let last = first;
      while (last < stems.length && Math.floor(stems[last].z / BAND) === band) last++;
      const from = first, to = last;
      items.push({ depth: (band + 0.5) * BAND, draw: () => this.drawStems(stems, from, to) });
      first = last;
    }
  }

  /**
   * Reed, rush and cattail stems, stiff at the root and springy toward the
   * tip, swaying in the breeze and pushed over by whatever brushes them;
   * reeds put out leaf blades, cattails carry a brown head below a thin spike.
   * Squares stacked in one column and colour go in as one tall rectangle.
   */
  private drawStems(stems: Stem[], from: number, to: number) {
    const { spriteCtx: ctx, px, pond, regionTop } = this;
    const runs = this.stemRuns;
    const head = HEAD, headLit = HEAD + 1, petal = HEAD + 2, throat = HEAD + 3, spike = HEAD + 4, spikeLit = HEAD + 5;
    const t = pond.tick * 0.035;
    for (let n = from; n < to; n++) {
      const st = stems[n];
      const set = (STEM_KINDS.indexOf(st.kind) * 3 + st.shade) * 3;
      const wave = Math.sin(t + st.phase + st.x * 0.05) * 0.9 + pond.wind.x * 120;
      let col = -1, left = 0, top = 0, bottom = 0, size = 0;
      // Not every iris is in flower.
      const blooms = st.kind === 'iris' ? st.phase < 2.8 : st.kind === 'loosestrife';
      let bloomed = false;
      for (let i = 0; i <= st.len; i += 1 / ELEVATION) {
        const k = i / st.len;
        const give = k * k;
        const sx = (st.x + (wave + st.bx) * give) * px;
        const sy = Math.round((st.z + st.bz * give * 0.5 - i * ELEVATION) * px - regionTop);
        const s = Math.ceil(px * (1 + i * PERSPECTIVE));
        const l = Math.round(sx - s / 2);
        if (st.kind === 'cattail' && k > 0.62 && k < 0.84) {
          // The head: two cells wide, lit down one side.
          runs[head].push(l - Math.round(s / 2), sy, s, s);
          runs[headLit].push(l + Math.round(s / 2), sy, s, s);
          continue;
        }
        if (blooms && st.kind === 'iris' && k > 0.86) {
          // An iris flower at the tip: falls to either side and a standard above, round a dark throat.
          if (!bloomed) runs[petal].push(l - s, sy, s, s, l + s, sy, s, s, l, sy - s, s, s, l - s, sy + s, s, s);
          if (!bloomed) runs[throat].push(l, sy, s, s);
          bloomed = true;
          continue;
        }
        if (blooms && st.kind === 'loosestrife' && k > 0.58) {
          // A spike of little purple flowers, stepping from side to side.
          const n2 = Math.round(i * ELEVATION);
          runs[n2 & 1 ? spike : spikeLit].push(l, sy, s, s);
          if (k < 0.92) runs[spike].push(l + (n2 & 1 ? s : -s), sy, s, s);
          continue;
        }
        const c = set + (k > 0.86 ? 2 : k < 0.3 ? 0 : 1);
        // Leaf blades off alternate sides, angled up and out.
        if ((st.kind === 'reed' || st.kind === 'loosestrife') && i > 4 && Math.round(i * ELEVATION) % 5 === 0) {
          const side = Math.round(i * ELEVATION) % 10 === 0 ? 1 : -1;
          runs[set + 1].push(l + side * s, sy - s, s, s, l + side * s * 2, sy - s * 2, s, s);
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
      ctx.fillStyle = c >= HEAD ? [...CATTAIL_HEAD, ...IRIS_FLOWER, ...LOOSESTRIFE_FLOWER][c - HEAD]
        : REED_COLORS[STEM_KINDS[Math.floor(c / 9)]][Math.floor(c / 3) % 3][c % 3];
      for (let k = 0; k < run.length; k += 4) ctx.fillRect(run[k], run[k + 1], run[k + 2], run[k + 3]);
      run.length = 0;
    }
  }

  /** A bed of pondweed, in bands of depth like the reeds. */
  private addWeeds(b: WeedBed, items: Drawable[]) {
    const { weeds } = b;
    for (let first = 0; first < weeds.length;) {
      const band = Math.floor(weeds[first].z / BAND);
      let last = first;
      while (last < weeds.length && Math.floor(weeds[last].z / BAND) === band) last++;
      const from = first, to = last;
      items.push({ depth: (band + 0.5) * BAND, draw: () => this.drawWeeds(b, from, to) });
      first = last;
    }
  }

  /**
   * Weed stalks rising from the bed, swaying in the water and dim with
   * depth: pondweed with paired leaves, eelgrass in long pale ribbons,
   * hornwort bushy with whorls all the way up, milfoil feathery and red-tipped.
   */
  private drawWeeds(b: WeedBed, from: number, to: number) {
    const { spriteCtx: ctx, px, pond, regionTop } = this;
    const runs = this.weedRuns;
    const t = pond.tick * 0.03;
    const kind = WEED_KINDS.indexOf(b.kind);
    const swing = b.kind === 'eelgrass' ? 2.6 : b.kind === 'hornwort' ? 0.9 : 1.6;
    let alpha = 1;
    for (let n = from; n < to; n++) {
      const wd = b.weeds[n];
      const d = pond.depthAt(wd.x, wd.z);
      alpha = this.depthAlpha(d);
      const base = wd.z + d * ELEVATION;
      const shift = this.wobbleAt(base);
      const set = (kind * 3 + wd.shade) * 3;
      for (let i = 0; i <= wd.len; i += 1 / ELEVATION) {
        const k = i / wd.len;
        const sway = Math.sin(t + wd.phase + i * 0.25) * swing * k;
        const x = Math.round((wd.x + sway + shift) * px - px / 2);
        const y = Math.round((base - i * ELEVATION) * px - regionTop);
        const step = Math.round(i * ELEVATION);
        const tip = k > (b.kind === 'milfoil' ? 0.72 : 0.85);
        runs[set + (tip ? 2 : 0)].push(x, y, px, px);
        const leaf = set + (tip ? 2 : 1);
        if (b.kind === 'pondweed') {
          // Leaves in pairs every few cells.
          if (step % 3 === 1) runs[leaf].push(x - px, y, px, px, x + px, y - px, px, px);
        } else if (b.kind === 'hornwort') {
          // Whorls of needles all the way up: a pair close in, then a pair further out.
          if (step & 1) runs[leaf].push(x - px * 2, y - px, px, px, x + px * 2, y - px, px, px);
          else runs[leaf].push(x - px, y, px, px, x + px, y, px, px);
        } else if (b.kind === 'milfoil') {
          // Feathery leaves every other cell.
          if (step & 1) runs[leaf].push(x - px * 2, y - px, px * 2, px, x + px, y - px, px * 2, px);
        } else if (step % 4 === 2) {
          // Eelgrass: a second ribbon beside the first, now and then.
          runs[leaf].push(x + px, y, px, px);
        }
      }
    }
    ctx.globalAlpha = alpha;
    for (let c = 0; c < runs.length; c++) {
      const run = runs[c];
      if (!run.length) continue;
      ctx.fillStyle = WEED_COLORS[Math.floor(c / 9)][Math.floor(c / 3) % 3][c % 3];
      for (let k = 0; k < run.length; k += 4) ctx.fillRect(run[k], run[k + 1], run[k + 2], run[k + 3]);
      run.length = 0;
    }
  }

  /**
   * The water surface: a translucent sheet over everything below it, and
   * glints that come and go as it moves.
   */
  private drawSurface() {
    const { spriteCtx: ctx } = this;
    const water = this.water();
    ctx.globalAlpha = 1;
    ctx.fillStyle = WATER.sheet;
    ctx.fill(water);
    this.drawGlints();
    ctx.globalAlpha = 1;
  }

  /**
   * Short horizontal glints of sky on the water, anchored to the page: each
   * tile of surface has a few, each fading in, drifting with the breeze and
   * fading out at its own time before turning up somewhere else.
   */
  private drawGlints() {
    const { spriteCtx: ctx, pond, px } = this;
    const z0 = Math.max(0, Math.floor(this.scrollY / px / GLINT_TILE) - 1);
    const z1 = Math.ceil((this.scrollY + this.viewH) / px / GLINT_TILE) + 1;
    const cols = Math.ceil(pond.w / GLINT_TILE);
    const tick = pond.tick;
    // No sun to glint at night, and less under rain clouds.
    const dim = (1 - pond.nightfall() * 0.85) * (1 - pond.rainAmount() * 0.5);
    for (let shade = 0; shade < 2; shade++) {
      ctx.fillStyle = WATER.glint[shade];
      for (let tz = z0; tz < z1; tz++) {
        for (let tx = 0; tx < cols; tx++) {
          for (let k = 0; k < GLINTS_PER_TILE; k++) {
            const id = (tz * cols + tx) * GLINTS_PER_TILE + k;
            const offset = hash(id * 3 + 1) * GLINT_LIFE;
            const gen = Math.floor((tick + offset) / GLINT_LIFE);
            const age = (tick + offset) % GLINT_LIFE;
            const seed = id * 7919 + gen * 104729;
            if ((hash(seed + 5) < 0.3 ? 0 : 1) !== shade) continue;
            const x = (tx + hash(seed)) * GLINT_TILE + age * 0.03;
            const z = (tz + hash(seed + 1)) * GLINT_TILE;
            if (!pond.isWater(x - 2, z) || !pond.isWater(x + 4, z)) continue;
            // A glint swells from a fleck to a short dash and back, and is
            // only up for part of its life.
            const life = age / GLINT_LIFE;
            if (life > 0.6) continue;
            const fade = Math.sin((life / 0.6) * Math.PI);
            const len = Math.max(1, Math.round((1 + hash(seed + 2) * 3) * fade));
            ctx.globalAlpha = (0.2 + 0.55 * fade) * dim;
            ctx.fillRect(Math.round(x * px), Math.round(z * px - this.regionTop), len * px, px);
          }
        }
      }
    }
  }
}
