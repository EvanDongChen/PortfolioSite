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

import { ELEVATION, MAX_DEPTH, Pond } from './pond';
import { POND_FLOOR, WATER, buildRipples, makeCanvas, rippleTile } from './pondArt';
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
  /** The banks, in floor cells, for masking the light: rebuilt with the world. */
  private landPath: Path2D | null = null;
  private landKey = '';
  /** The water in the sprite window, in its canvas pixels: rebuilt as the window moves. */
  private waterPath: Path2D | null = null;
  private waterKey = '';

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
          }
        } else {
          const d = depth[i] / MAX_DEPTH;
          const k = t / 255;
          let rr = F.mudDark[0] + (F.mudLight[0] - F.mudDark[0]) * k;
          let gg = F.mudDark[1] + (F.mudLight[1] - F.mudDark[1]) * k;
          let bb = F.mudDark[2] + (F.mudLight[2] - F.mudDark[2]) * k;
          // Pale silt where the water is shallow and the sun gets through.
          const silt = Math.max(0, 1 - d * 3) * 0.75;
          rr += (F.silt[0] - rr) * silt; gg += (F.silt[1] - gg) * silt; bb += (F.silt[2] - bb) * silt;
          // Into the murk.
          const murk = Math.min(0.85, d * 0.95);
          rr += (F.deep[0] - rr) * murk; gg += (F.deep[1] - gg) * murk; bb += (F.deep[2] - bb) * murk;
          c = [rr, gg, bb];
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

  /** The banks as one path of floor cells, for keeping the light off them. */
  private land() {
    const { pond } = this;
    const key = `${pond.w}x${pond.h}`;
    if (this.landPath && key === this.landKey) return this.landPath;
    const path = new Path2D();
    const { shoreL, shoreR, w, h } = pond;
    let start = 0;
    for (let z = 1; z <= h; z++) {
      const same = z < h && Math.round(shoreL[z]) === Math.round(shoreL[start]) && Math.round(shoreR[z]) === Math.round(shoreR[start]);
      if (same) continue;
      const l = Math.round(shoreL[start]) + 1, r = Math.round(shoreR[start]) - 1;
      path.rect(0, start, l, z - start);
      path.rect(r, start, w - r, z - start);
      start = z;
    }
    this.landPath = path;
    this.landKey = key;
    return path;
  }

  /** Caustic light dancing on the bed, kept off the banks. */
  private renderLight(top: number, rows: number) {
    const { pond, lightCtx: ctx } = this;
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, top, pond.w, rows);
    const tile = rippleTile(this.ripples, RIPPLE_SIZE, (pond.tick >> 1) % RIPPLE_FRAMES, POND_FLOOR.caustic, false);
    const pattern = ctx.createPattern(tile, 'repeat');
    if (pattern) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = pattern;
      ctx.fillRect(0, top, pond.w, rows);
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.fillStyle = '#000';
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, top, pond.w, rows);
    ctx.clip();
    ctx.fill(this.land());
    ctx.restore();
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

  private renderSprites() {
    const { spriteCtx: ctx } = this;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, this.viewW, this.regionHeight);
    this.drawSurface();
  }

  /**
   * The water surface: a translucent sheet over everything below it, faint
   * ripples of light across it, and glints that come and go as it moves.
   */
  private drawSurface() {
    const { spriteCtx: ctx, pond, px } = this;
    const water = this.water();
    ctx.globalAlpha = 1;
    ctx.fillStyle = WATER.sheet;
    ctx.fill(water);
    if (!this.lean) {
      // Ripples of light on the surface: the caustic frames, half a cycle on and twice the size.
      const tile = rippleTile(this.ripples, RIPPLE_SIZE, ((pond.tick >> 2) + RIPPLE_FRAMES / 2) % RIPPLE_FRAMES, [150, 210, 190], true);
      const pattern = ctx.createPattern(tile, 'repeat');
      if (pattern && typeof DOMMatrix !== 'undefined') {
        const scale = px * 2;
        pattern.setTransform(new DOMMatrix([scale, 0, 0, scale, 0, -(this.regionTop % (RIPPLE_SIZE * scale))]));
        ctx.globalAlpha = 0.08;
        ctx.fillStyle = pattern;
        ctx.fill(water);
      }
    }
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
            ctx.globalAlpha = 0.2 + 0.55 * fade;
            ctx.fillRect(Math.round(x * px), Math.round(z * px - this.regionTop), len * px, px);
          }
        }
      }
    }
  }
}

export { makeCanvas };
