// Draws the shrine forest with the reef's and the pond's camera: looking down
// at an angle, x across the page, z down it, height lifting things up the
// screen and drawing them a little bigger.
//
//   1. the floor canvas: moss, flagstones, raked gravel, water and the low
//      plants, painted once a band at a time, since none of it moves;
//   2. the light canvas over it: moonlight dappling through the boughs, shafts
//      of moon, ripples on the ponds and the pools each lantern throws;
//   3. the sprites, depth-sorted: cedars, gates, buildings, animals, spirits,
//      then the lanterns' halos and the fireflies over everything.
//
// The canvases scroll with the page natively, as the reef's do: the floor and
// light cover the whole page at a canvas pixel per cell, and the sprites are
// drawn into a window around the view, swapped between two canvases.

import { Cane, ELEVATION, GROUND, Marcher, Prop, Shrine, ShrineCreature, ShrineSpecies } from './shrine';
import {
  AnimalKind, RivalPose, SHRINE_FLOOR, altarSprite, animalSprite, bambooSprite, bangSprite, bloodSprite, bridgeSprite, cedarSprite, crumbSprite, dappleTile, disguiseSprite,
  dustSprite, fallingLeafSprite, feetSprite, fireflySprite, fernSprite, floatLanternSprite, glowshroomSprite, grassSprite, guardianSprite, heartSprite, hitodamaSprite, hokoraSprite, hondenSprite,
  hydrangeaSprite, jizoSprite, kitsuneSprite, koiSprite, leafSprite, lightHole, lotusPadSprite, lotusSprite, makeCanvas, mapleSprite, noteSprite, offeringSprite, pagodaSprite, paperLanternSprite, paradeSprite,
  persimmonSprite, pool, rockSprite, sacredCedarSprite, skyLanternSprite, smokeSprite, spiderLilySprite, spoutSprite, starSprite, susukiSprite, tailSprite, tanukiSprite, toriiSprite, toroSprite, tuftSprite, whatSprite, zedSprite,
} from './shrineArt';
import { shadowSprite } from './pixelOceanArt';
import { buildRipples, rippleTile } from './pondArt';
import type { ReefLayout } from './pixelOceanView';

const PERSPECTIVE = 0.0035;
const RIPPLE_SIZE = 64;
const RIPPLE_FRAMES = 32;
const DAPPLE_SIZE = 128;
/** Rows of floor painted a frame, away from the view, until the whole page has been. */
const BACKLOG_ROWS = 120;
/** The light canvas is redrawn every this many ticks. */
const LIGHT_EVERY = 2;
const SPRITE_MARGIN = 40;
/** Tall things stand this far above their feet, so look this far down for them. */
const TALL_MARGIN = 190;
const LANTERN_POOL = 34;
const HALO = 20;
const WARM: [number, number, number] = [172, 92, 30];
const FESTIVE: [number, number, number] = [176, 92, 48];
const GHOST: [number, number, number] = [44, 110, 176];
const HALO_WARM: [number, number, number] = [255, 190, 110];
const HALO_GHOST: [number, number, number] = [130, 200, 255];
/** Shafts of moon through the canopy: how many to a stretch, how long a stretch and how far they slant. */
const SHAFTS = 2;
const SHAFT_PERIOD = 300;
const SHAFT_SLANT = 0.5;
const MARCHER_SCALE = 1.25;
/** How far (cells) a tree's crown leans at most, and how many slices it bends in. */
const CEDAR_SWAY = 2.2;
const CEDAR_SLICES = 10;
const MAPLE_SWAY = 1.4;
const MAPLE_SLICES = 6;
/** How dark the night lies over the ground and over everything standing on it (0 to 1), and its colour. */
const NIGHT_FLOOR = 0.8;
const NIGHT_SPRITES = 0.56;
const NIGHT_COLOUR = '#050818';
/** How far each kind of light reaches, in cells, and how fully it clears the dark. */
const LANTERN_REACH = 48;
const NIGHT_EVERY = 2;

export type ShrineLayout = ReefLayout;

interface Drawable { depth: number; draw: () => void }
interface SpriteOptions { alpha?: number; flipX?: boolean; scaleY?: number; scale?: number; anchor?: 'bottom' | 'center'; stretch?: number }

/** Sprite widths in art pixels as drawn, for shadows, picking and the inspection reticle. */
export const BODY_WIDTH: Record<ShrineSpecies, number> = {
  tanuki: 18, kitsune: 21, hahaki: 10, mouse: 8, hare: 11, deer: 23, owl: 10, bat: 9, crow: 13, frog: 9, koi: 15, kappa: 12, kodama: 9, hitodama: 7, kasa: 14, chochin: 11,
};

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v + 0.5) / 16);
const hash = (n: number) => {
  let x = n | 0;
  x = Math.imul(x ^ (x >>> 16), 0x45d9f3b);
  x = Math.imul(x ^ (x >>> 16), 0x45d9f3b);
  return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
};
const rgba = (c: number[]) => (255 << 24) | (Math.round(c[2]) << 16) | (Math.round(c[1]) << 8) | Math.round(c[0]);

export class ShrineView {
  regionTop = 0;
  regionHeight = 0;
  /** Set when frames are slow to draw: finishing touches are left out (see the reef's). */
  lean = false;
  private touches = 1;
  highlighted: ShrineCreature | null = null;

  private floorCtx: CanvasRenderingContext2D;
  private lightCtx: CanvasRenderingContext2D;
  private spriteCtx: CanvasRenderingContext2D;
  private spriteCtxs: CanvasRenderingContext2D[];
  private buffer = 1;
  private pendingShow = 0;
  private ripples = buildRipples(RIPPLE_SIZE, RIPPLE_FRAMES);
  private scrollY = 0;
  private viewW = 0;
  private viewH = 0;
  private lightKey = '';
  private painted = new Uint8Array(0);
  private paintVersion = -1;
  private backlogRow = 0;
  /** Everything but the water, in black, to keep its ripples to itself. */
  private notWater: HTMLCanvasElement | null = null;
  private shade: HTMLCanvasElement | null = null;
  private maskVersion = -1;
  /** The dark, in cells over the sprite window, with holes where there is light. */
  private night: HTMLCanvasElement | null = null;
  private nightKey = '';

  constructor(
    private shrine: Shrine,
    private floorCanvas: HTMLCanvasElement,
    private lightCanvas: HTMLCanvasElement,
    private spriteCanvases: [HTMLCanvasElement, HTMLCanvasElement],
    private px: number,
    private onLayout: (layout: ShrineLayout) => void,
    private showDelay = 1,
  ) {
    this.floorCtx = floorCanvas.getContext('2d', { alpha: false }) as CanvasRenderingContext2D;
    this.lightCtx = lightCanvas.getContext('2d', { alpha: false }) as CanvasRenderingContext2D;
    this.spriteCtxs = spriteCanvases.map(c => c.getContext('2d') as CanvasRenderingContext2D);
    this.spriteCtx = this.spriteCtxs[0];
  }

  // --- camera -------------------------------------------------------------

  project(x: number, z: number, h: number) {
    return { x: x * this.px, y: (z - h * ELEVATION) * this.px - this.regionTop, s: 1 + h * PERSPECTIVE };
  }
  pageToWorld(x: number, pageY: number, h: number) {
    return { x: x / this.px, z: pageY / this.px + h * ELEVATION };
  }
  pagePosition(c: ShrineCreature) {
    return { x: c.x * this.px, y: (c.z - c.h * ELEVATION) * this.px };
  }
  pick(x: number, pageY: number, reach = 24): ShrineCreature | null {
    let best: ShrineCreature | null = null;
    let bestD = reach * reach;
    for (const c of this.shrine.creatures) {
      if (!c.alive || c.hidden) continue;
      const p = this.pagePosition(c);
      // Things standing up are picked by their middle, not their feet.
      const lift = BODY_WIDTH[c.species] * 0.25 * this.px;
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
    const { px, shrine } = this;
    this.scrollY = scrollY;
    const step = Math.max(1, Math.ceil(viewH / 4 / px));
    const rows = Math.min(shrine.h, Math.ceil((viewH * 2) / px) + step);
    const top = Math.max(0, Math.min(shrine.h - rows, Math.floor((scrollY - viewH / 2) / px / step) * step));
    if (this.floorCanvas.width !== shrine.w || this.floorCanvas.height !== shrine.h || this.paintVersion !== shrine.version) this.placeFloor();
    const regionTop = top * px;
    const regionHeight = rows * px;
    if (regionTop !== this.regionTop || regionHeight !== this.regionHeight || viewW !== this.viewW) {
      this.regionTop = regionTop;
      this.regionHeight = regionHeight;
      this.viewW = viewW;
      this.placeSprites();
    }
    this.viewH = viewH;
    this.paintFloor(top, rows);
    const lightKey = `${top},${rows},${Math.floor(shrine.tick / LIGHT_EVERY)}`;
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
    const { floorCanvas, lightCanvas, shrine, px } = this;
    floorCanvas.width = lightCanvas.width = shrine.w;
    floorCanvas.height = lightCanvas.height = shrine.h;
    this.onLayout({ kind: 'floor', width: shrine.w * px, height: shrine.h * px });
    this.painted = new Uint8Array(shrine.h);
    this.paintVersion = shrine.version;
    this.backlogRow = 0;
    this.lightKey = '';
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

  // --- the floor ---------------------------------------------------------------

  private paintBacklog() {
    const { shrine } = this;
    if (this.backlogRow >= shrine.h) return;
    const n = Math.min(BACKLOG_ROWS, shrine.h - this.backlogRow);
    this.paintFloor(this.backlogRow, n);
    this.backlogRow += n;
  }

  /** Paints any rows in this range not yet painted, each only once. */
  private paintFloor(top: number, rows: number) {
    let z = top;
    const end = Math.min(this.shrine.h, top + rows);
    while (z < end) {
      while (z < end && this.painted[z]) z++;
      const start = z;
      while (z < end && !this.painted[z] && z - start < 64) z++;
      if (z > start) this.paintBand(start, z - start);
    }
  }

  private paintBand(top: number, rows: number) {
    const { shrine } = this;
    const { w, ground, terrain, pathX } = shrine;
    const F = SHRINE_FLOOR;
    const img = this.floorCtx.createImageData(w, rows);
    const out = new Uint32Array(img.data.buffer);
    const moss = F.moss.map(rgba);
    const glow = rgba(F.mossGlow);
    const shade = rgba(F.shade);
    const needles = F.needle.map(rgba);
    const stones = F.stone.map(rgba);
    const joint = rgba(F.joint);
    const gravel = F.gravel.map(rgba);
    const furrow = rgba(F.furrow);
    const rim = F.rim.map(rgba);
    const water = F.water.map(rgba);
    for (let k = 0; k < rows; k++) {
      const z = top + k;
      this.painted[z] = 1;
      for (let x = 0; x < w; x++) {
        const i = z * w + x;
        const g = ground[i];
        const bayer = BAYER[(z & 3) * 4 + (x & 3)];
        const t = terrain[i] / 255;
        let c = 0;
        if (g === GROUND.moss) {
          // Darker toward the page's edges, under the thickest of the cedars.
          const edge = Math.min(x, w - 1 - x) / Math.max(1, w * 0.12);
          const v = (t - 0.28) * 7.2 - (edge < 1 ? (1 - edge) * 1.4 : 0);
          const step = Math.max(0, Math.min(F.moss.length - 1, Math.floor(v + bayer)));
          c = moss[step];
          const speck = hash(i * 13 + 5);
          if (speck < 0.004 && (z & 1) === 0) c = needles[speck < 0.002 ? 0 : 1];
          else if (step === F.moss.length - 1 && speck > 0.94) c = glow;
          if (v < -1.2 && bayer < 0.5) c = shade;
        } else if (g === GROUND.stone) {
          // Long flagstones in staggered rows, moss in the joints.
          const row = Math.floor(z / 5);
          const cx = pathX[Math.min(shrine.h - 1, z)];
          const off = x - cx + 40 + (row & 1) * 3;
          const col = Math.floor(off / 6);
          const seam = z % 5 === 0 || Math.floor(off) % 6 === 0;
          const tone = stones[Math.floor(hash(row * 31 + col * 7) * stones.length)];
          c = seam ? (hash(i) < 0.45 ? joint : stones[2]) : tone;
        } else if (g === GROUND.gravel) {
          // Raked in long lines that ripple as they go.
          const wave = Math.sin(x * 0.09 + Math.sin(z * 0.05) * 1.4) * 2.5;
          c = Math.floor(z + wave) % 4 === 0 ? furrow : gravel[bayer < 0.5 ? 0 : 1];
        } else if (g === GROUND.rim) {
          c = rim[hash(Math.floor(x / 3) + Math.floor(z / 2) * 97) < 0.5 ? 0 : 1];
        } else {
          // Deepening toward the middle of the pond, in flat dithered steps.
          let d = 1;
          while (d < 22 && z + d < shrine.h && z - d >= 0 && x + d < w && x - d >= 0 && ground[i + d] === GROUND.water && ground[i - d] === GROUND.water && ground[i + d * w] === GROUND.water && ground[i - d * w] === GROUND.water) d++;
          c = water[Math.min(water.length - 1, Math.floor(d / 6 + bayer))];
        }
        out[k * w + x] = c;
      }
    }
    this.floorCtx.putImageData(img, 0, top);
    this.bakeLitter(top, rows);
    this.bakeLow(top, rows);
  }

  /** Fallen leaves in a drift round each maple's foot, thinning as they go. */
  private bakeLitter(top: number, rows: number) {
    const ctx = this.floorCtx;
    const { shrine } = this;
    for (const p of shrine.props) {
      if (p.kind !== 'maple' && p.kind !== 'goldMaple') continue;
      const reach = p.size * 2.2;
      if (p.z + reach * 0.6 < top || p.z - reach * 0.6 >= top + rows) continue;
      const colours = p.kind === 'maple' ? SHRINE_FLOOR.leaf : SHRINE_FLOOR.leafGold;
      const count = Math.round(p.size * 7);
      for (let k = 0; k < count; k++) {
        const a = hash(p.seed * 31 + k) * 6.28, d = hash(p.seed * 17 + k * 3) ** 2 * reach;
        const x = Math.round(p.x + Math.cos(a) * d), z = Math.round(p.z + Math.sin(a) * d * 0.6);
        if (z < top || z >= top + rows || x < 0 || x >= shrine.w) continue;
        const g = shrine.ground[z * shrine.w + x];
        if (g !== GROUND.moss && g !== GROUND.stone) continue;
        const col = colours[k % colours.length];
        ctx.fillStyle = `rgb(${col[0]},${col[1]},${col[2]})`;
        ctx.fillRect(x, z, 1 + (k & 1), 1);
      }
    }
  }

  /** The low plants are painted right into the floor. */
  private bakeLow(top: number, rows: number) {
    const ctx = this.floorCtx;
    const list = this.shrine.low;
    let lo = 0, hi = list.length;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (list[mid].z < top) lo = mid + 1; else hi = mid; }
    for (let k = lo; k < list.length && list[k].z < top + rows; k++) {
      const p = list[k];
      const img = p.kind === 'fern' ? fernSprite(p.seed) : p.kind === 'grass' ? grassSprite(p.seed) : p.kind === 'shroom' ? glowshroomSprite(p.seed) : p.kind === 'hydrangea' ? hydrangeaSprite(p.seed % 5, p.variant) : p.kind === 'lily' ? spiderLilySprite(p.seed % 6) : persimmonSprite();
      ctx.drawImage(img, Math.round(p.x - img.width / 2), Math.round(p.z - img.height));
    }
  }

  // --- the light ---------------------------------------------------------------

  private masks() {
    const { shrine } = this;
    if (this.notWater && this.maskVersion === shrine.version) return;
    this.maskVersion = shrine.version;
    const { w, h, ground } = shrine;
    const c = makeCanvas(w, h);
    const ctx = c.getContext('2d') as CanvasRenderingContext2D;
    const img = ctx.createImageData(w, h);
    const out = new Uint32Array(img.data.buffer);
    for (let i = 0; i < w * h; i++) out[i] = ground[i] === GROUND.water ? 0 : 255 << 24;
    ctx.putImageData(img, 0, 0);
    this.notWater = c;
    // Moonlight is kindest to the open middle and falls away under the edges' cedars.
    const s = makeCanvas(w, 2);
    const sctx = s.getContext('2d') as CanvasRenderingContext2D;
    const simg = sctx.createImageData(w, 2);
    for (let x = 0; x < w; x++) {
      const e = Math.min(x, w - 1 - x) / Math.max(1, w * 0.2);
      const a = Math.round(255 * Math.max(0, 1 - e) * 0.6);
      for (let y = 0; y < 2; y++) simg.data[(y * w + x) * 4 + 3] = a;
    }
    sctx.putImageData(simg, 0, 0);
    this.shade = s;
  }

  private renderLight(top: number, rows: number) {
    const { shrine, lightCtx: ctx } = this;
    this.masks();
    ctx.imageSmoothingEnabled = false;
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, top, shrine.w, rows);

    // Ripples on the water only.
    if (shrine.waters.length) {
      ctx.globalCompositeOperation = 'lighter';
      const frame = (shrine.tick >> 1) % RIPPLE_FRAMES;
      const a = ctx.createPattern(rippleTile(this.ripples, RIPPLE_SIZE, frame, SHRINE_FLOOR.caustic, false), 'repeat');
      if (a) { ctx.fillStyle = a; ctx.fillRect(0, top, shrine.w, rows); }
      ctx.globalCompositeOperation = 'source-over';
      if (this.notWater) ctx.drawImage(this.notWater, 0, top, shrine.w, rows, 0, top, shrine.w, rows);
    }

    ctx.globalCompositeOperation = 'lighter';
    // Moonlight sifting through the boughs: two layers drifting past one another as they sway.
    const dapple = dappleTile(DAPPLE_SIZE, SHRINE_FLOOR.moon);
    const pat = ctx.createPattern(dapple, 'repeat');
    const pat2 = ctx.createPattern(dapple, 'repeat');
    if (pat && pat2 && typeof DOMMatrix !== 'undefined') {
      const t = shrine.tick * 0.012;
      pat.setTransform(new DOMMatrix([2, 0, 0, 2, Math.round(Math.sin(t) * 7), Math.round(Math.cos(t * 0.7) * 5)]));
      pat2.setTransform(new DOMMatrix([-1.5, 0, 0, 1.5, 37 + Math.round(Math.sin(t * 1.3 + 2) * 6), 19 + Math.round(Math.cos(t * 0.9) * 6)]));
      ctx.globalAlpha = 0.85;
      ctx.fillStyle = pat;
      ctx.fillRect(0, top, shrine.w, rows);
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = pat2;
      ctx.fillRect(0, top, shrine.w, rows);
      ctx.globalAlpha = 1;
    }
    this.touches += ((this.lean ? 0 : 1) - this.touches) * 0.04;
    if (this.touches > 0.02) this.drawShafts(top, rows, this.touches);

    if (this.shade) {
      ctx.globalCompositeOperation = 'source-over';
      ctx.drawImage(this.shade, 0, 0, shrine.w, 2, 0, top, shrine.w, rows);
      ctx.globalCompositeOperation = 'lighter';
    }

    // The moon's own face on each pond, broken up by the ripples.
    for (const w of shrine.waters) {
      if (w.z + w.rz < top || w.z - w.rz > top + rows) continue;
      const m = pool(9, [220, 232, 250], false);
      const slice = m.height / 7;
      ctx.globalAlpha = 0.9;
      for (let k = 0; k < 7; k++) {
        const dx = Math.round(Math.sin(shrine.tick * 0.03 + k * 1.4) * (1 + k * 0.5));
        ctx.drawImage(m, 0, k * slice, m.width, slice, Math.round(w.moonX - m.width / 2 + dx), Math.round(w.moonZ - m.height / 2 + k * slice), m.width, slice);
      }
    }

    // The pools each lantern throws, warm, or gone blue while the parade passes.
    const ghost = shrine.ghostLight, fest = shrine.festivalLight;
    for (const l of shrine.lanterns) {
      if (l.z < top - LANTERN_POOL || l.z > top + rows + LANTERN_POOL) continue;
      const flick = 0.82 + Math.sin((shrine.tick + l.phase) * 0.17) * 0.09 + Math.sin((shrine.tick + l.phase) * 0.41) * 0.07;
      const r = fest > 0.3 ? LANTERN_POOL + 8 : LANTERN_POOL;
      if (ghost < 0.98) {
        ctx.globalAlpha = Math.min(1, flick * (1 - ghost));
        const img = pool(r, fest > 0.3 ? FESTIVE : WARM, false);
        ctx.drawImage(img, Math.round(l.x - img.width / 2), Math.round(l.z - img.height / 2));
      }
      if (ghost > 0.02) {
        ctx.globalAlpha = Math.min(1, flick * ghost);
        const img = pool(r, GHOST, false);
        ctx.drawImage(img, Math.round(l.x - img.width / 2), Math.round(l.z - img.height / 2));
      }
    }
    // Festival ropes throw a long warm glow down onto the approach.
    if (fest > 0.02) {
      ctx.globalAlpha = fest * 0.8;
      for (const f of shrine.festoons) {
        if (f.z < top - 30 || f.z > top + rows + 30) continue;
        const img = pool(26, FESTIVE, false);
        ctx.drawImage(img, Math.round((f.x0 + f.x1) / 2 - img.width / 2), Math.round(f.z - img.height / 2 + 2));
      }
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  /** Long slanted shafts of moon down the page. */
  private drawShafts(top: number, rows: number, strength: number) {
    const { shrine, lightCtx: ctx } = this;
    const [r, g, b] = SHRINE_FLOOR.ray;
    ctx.fillStyle = `rgb(${r},${g},${b})`;
    const t = shrine.tick * 0.003;
    for (let z = top - (top & 1); z < top + rows; z += 2) {
      for (let n = 0; n < SHAFTS; n++) {
        const period = Math.floor((z + n * 137) / SHAFT_PERIOD);
        const along = ((z + n * 137) % SHAFT_PERIOD) / SHAFT_PERIOD;
        const seed = hash(period * 31 + n * 7);
        const width = 12 + seed * 22;
        const x0 = shrine.w * (0.02 + seed * 0.8) + along * SHAFT_PERIOD * SHAFT_SLANT * (seed < 0.5 ? 1 : 0.6) + Math.sin(t + n + period) * 5;
        const fade = Math.sin(along * Math.PI) * (0.6 + 0.4 * Math.sin(t * 3 + n + period * 2.3));
        if (fade <= 0.05) continue;
        ctx.globalAlpha = strength * fade * 0.7;
        ctx.fillRect(Math.round(x0), z, Math.round(width), 2);
      }
    }
    ctx.globalAlpha = 1;
  }

  // --- sprites ---------------------------------------------------------------

  private sprite(img: HTMLCanvasElement, x: number, z: number, h: number, o: SpriteOptions = {}) {
    const { spriteCtx: ctx, px } = this;
    const p = this.project(x, z, h);
    const k = px * p.s * (o.scale ?? 1);
    const st = o.stretch ?? 0;
    const w = Math.round(img.width * k * (1 + st * 0.35));
    const hh = Math.round(img.height * k * (o.scaleY ?? 1) * (1 - st * 0.3));
    ctx.globalAlpha = o.alpha ?? 1;
    const top = o.anchor === 'center' ? p.y - hh / 2 : p.y - hh;
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

  private shadow(x: number, z: number, width: number, alpha: number) {
    const { spriteCtx: ctx, px } = this;
    const sw = Math.max(3, Math.round(width));
    const p = this.project(x, z, 0);
    const img = shadowSprite(sw);
    ctx.globalAlpha = alpha;
    ctx.drawImage(img, Math.round(p.x - (sw * px) / 2), Math.round(p.y - (img.height * px) / 2), sw * px, img.height * px);
  }

  renderSprites() {
    const { spriteCtx: ctx, shrine, px } = this;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, this.viewW, this.regionHeight);

    const z0 = Math.max(this.regionTop, this.scrollY) / px - SPRITE_MARGIN;
    const z1 = Math.min(this.regionTop + this.regionHeight, this.scrollY + this.viewH) / px + SPRITE_MARGIN;
    const zTall = z1 + TALL_MARGIN;
    const visible = (z: number) => z >= z0 && z <= z1 + 40;

    // On the water: the moving things under it first, then pads and floating lanterns.
    for (const c of shrine.creatures) {
      if (c.species === 'koi' && visible(c.z) && c.h <= 0) this.drawKoi(c);
    }
    for (const p of shrine.pads) {
      if (!visible(p.z)) continue;
      const bob = Math.sin(shrine.tick * 0.02 + p.phase) * 0.3;
      this.sprite(lotusPadSprite(p.r, p.tone), p.x, p.z, bob, { anchor: 'center' });
      if (p.flower) this.sprite(lotusSprite(p.flower - 1), p.x, p.z, 2 + bob);
    }
    for (const s of shrine.skies) {
      if (s.floating && visible(s.z)) this.sprite(floatLanternSprite(), s.x, s.z, Math.sin(shrine.tick * 0.03 + s.phase) * 0.4);
    }
    for (const c of shrine.creatures) {
      if (c.species === 'kappa' && c.h < 0 && visible(c.z)) this.drawKappaSwimming(c);
    }
    for (const b of shrine.bridges) if (visible(b.z)) this.drawBridgeReflection(b.x, b.z + 2, Math.round(b.w));
    this.drawRings(z0, z1);

    // Then the shadows, and everything standing, in order down the page.
    const over: Drawable[] = [];
    for (const p of shrine.props) {
      if (p.z < z0 || p.z > zTall) continue;
      over.push(this.propDrawable(p));
    }
    for (const c of shrine.canes) {
      if (c.z >= z0 && c.z <= z1 + (c.kind === 'bamboo' ? 120 : 40)) over.push({ depth: c.z, draw: () => this.drawCane(c) });
    }
    for (const b of shrine.bridges) {
      if (visible(b.z)) over.push({ depth: b.z + 4, draw: () => this.sprite(bridgeSprite(Math.round(b.w)), b.x, b.z + 2, 0) });
    }
    for (const a of shrine.altars) {
      if (!visible(a.z)) continue;
      this.shadow(a.x, a.z, 16, 0.3);
      over.push({ depth: a.z, draw: () => {
        this.sprite(altarSprite(), a.x, a.z, 0);
        if (a.item) this.sprite(offeringSprite(a.item), a.x, a.z, 14);
      } });
    }
    for (const l of shrine.lanterns) {
      if (!visible(l.z)) continue;
      const lit = ((shrine.tick + l.phase) >> 4) & 1;
      over.push({ depth: l.z, draw: () => this.sprite(toroSprite(shrine.ghostLight > 0.5 ? 'ghost' : lit ? 'lit' : 'lit2', l.mossy), l.x, l.z, 0) });
    }
    if (shrine.festivalLight > 0.02) {
      for (const f of shrine.festoons) {
        if (visible(f.z)) over.push({ depth: f.z, draw: () => this.drawFestoon(f.x0, f.x1, f.z, f.seed) });
      }
    }
    for (const c of shrine.creatures) {
      if (!c.alive || c.hidden || c.species === 'koi' || (c.species === 'kappa' && c.h < 0) || !visible(c.z)) continue;
      const air = c.species === 'bat' || c.species === 'owl' || c.species === 'crow' || c.species === 'hitodama' || c.species === 'chochin';
      const w = c.disguise ? 14 : BODY_WIDTH[c.species] * (air ? 0.7 : 0.85);
      if (!(air && c.h > 60)) this.shadow(c.x, c.z, w, air ? 0.16 : 0.32);
      over.push({ depth: c.z + 0.3, draw: () => this.drawCreature(c) });
    }
    const p = shrine.parade;
    if (p) {
      for (const m of p.marchers) {
        if (!visible(m.z)) continue;
        if (!m.fly) this.shadow(m.x, m.z, 16, 0.3);
        over.push({ depth: m.z + 0.4, draw: () => this.drawMarcher(m, m.x) });
      }
    }
    for (const t of shrine.tussles) {
      if (visible(t.z)) over.push({ depth: t.z + 0.5, draw: () => this.drawTussle(t.x, t.z, t.t) });
    }
    over.sort((a, b) => a.depth - b.depth);
    for (const item of over) item.draw();

    this.drawMotes(z0, z1);
    this.drawMoths(z0, z1);
    this.applyNight(z0, z1);
    this.drawHalos(z0, z1);
    this.drawSky(z0, z1);
    this.drawFireflies(z0, z1);
    for (const c of shrine.creatures) {
      if (c.emote && c.alive && !c.hidden && visible(c.z)) this.drawEmote(c);
      if (c.adopted && c.alive && visible(c.z)) this.drawAdoptedMarker(c);
    }
    const target = this.highlighted;
    if (target?.alive && visible(target.z)) this.drawReticle(target);
    ctx.globalAlpha = 1;
  }

  private propDrawable(p: Prop): Drawable {
    switch (p.kind) {
      case 'cedar': return { depth: p.z, draw: () => { this.shadow(p.x + 2, p.z, p.size * 1.5, 0.26); this.drawSwaying(cedarSprite(p.seed % 9, p.size), p.x, p.z + 1, CEDAR_SWAY, CEDAR_SLICES, false); } };
      case 'sacred': return { depth: p.z, draw: () => { this.shadow(p.x + 2, p.z, p.size * 1.6, 0.3); this.drawSwaying(sacredCedarSprite(p.seed % 3), p.x, p.z + 1, CEDAR_SWAY, CEDAR_SLICES + 4, false); } };
      case 'maple': case 'goldMaple': return { depth: p.z, draw: () => { this.shadow(p.x + 1, p.z, p.size * 1.7, 0.26); this.drawSwaying(mapleSprite(p.seed % 6, p.size, p.kind === 'goldMaple'), p.x, p.z + 1, MAPLE_SWAY, MAPLE_SLICES, p.flip); } };
      case 'torii': return { depth: p.z, draw: () => this.sprite(toriiSprite(p.size), p.x, p.z + 1, 0) };
      case 'honden': return { depth: p.z, draw: () => { this.shadow(p.x + 2, p.z - 2, 90, 0.3); this.sprite(hondenSprite(), p.x, p.z + 2, 0); } };
      case 'pagoda': return { depth: p.z, draw: () => { this.shadow(p.x + 2, p.z, 50, 0.3); this.sprite(pagodaSprite(), p.x, p.z + 1, 0); } };
      case 'hokora': return { depth: p.z, draw: () => { this.shadow(p.x + 1, p.z, 22, 0.3); this.sprite(hokoraSprite(0), p.x, p.z + 1, 0); } };
      case 'jizo': return { depth: p.z, draw: () => this.sprite(jizoSprite(), p.x, p.z, 0) };
      case 'foxStatue': return { depth: p.z, draw: () => this.sprite(guardianSprite('fox'), p.x, p.z, 0, { flipX: p.flip }) };
      case 'tanukiStatue': return { depth: p.z, draw: () => this.sprite(guardianSprite('tanuki'), p.x, p.z, 0, { flipX: p.flip }) };
      case 'lionStatue': return { depth: p.z, draw: () => this.sprite(guardianSprite('lion'), p.x, p.z, 0, { flipX: p.flip }) };
      case 'rock': return { depth: p.z, draw: () => { this.shadow(p.x, p.z, p.size * 2.3, 0.24); this.sprite(rockSprite(p.seed % 5, p.size), p.x, p.z, 0); } };
      default: return { depth: p.z, draw: () => this.sprite(spoutSprite(this.shrine.spout.tip > 0), p.x, p.z, 0, { flipX: p.flip }) };
    }
  }

  /** A stem of bamboo or grass, slid sideways in slices so it bends from the root. */
  private drawCane(c: Cane) {
    const { spriteCtx: ctx, px, shrine } = this;
    const img = c.kind === 'bamboo' ? bambooSprite(c.seed, c.len) : susukiSprite(c.seed);
    const sway = Math.sin(shrine.tick * 0.018 + c.phase) * (c.kind === 'bamboo' ? 3 : 1.5) + c.bx;
    const p = this.project(c.x, c.z, 0);
    const slices = c.kind === 'bamboo' ? 7 : 4;
    const sh = Math.ceil(img.height / slices);
    ctx.globalAlpha = 1;
    for (let k = 0; k < slices; k++) {
      const sy = k * sh;
      const t = 1 - (sy + sh / 2) / img.height;
      const dx = Math.round(sway * t * t) * px;
      const height = Math.min(sh, img.height - sy);
      ctx.drawImage(img, 0, sy, img.width, height, Math.round(p.x - (img.width * px) / 2 + dx), Math.round(p.y - (img.height - sy) * px), img.width * px, height * px);
    }
  }

  /** The arch upside down on the water beneath it, dim and rippling, which is what seats it there. */
  private drawBridgeReflection(x: number, z: number, w: number) {
    const { spriteCtx: ctx, px, shrine } = this;
    const img = bridgeSprite(w);
    const p = this.project(x, z, 0);
    const rows = img.height - 2;
    ctx.globalAlpha = 0.26;
    for (let k = 0; k < rows; k += 2) {
      const dx = Math.round(Math.sin(shrine.tick * 0.05 + k * 0.7) * (k / rows) * 1.5) * px;
      ctx.drawImage(img, 0, img.height - 3 - k - 1, img.width, 2, Math.round(p.x - (img.width * px) / 2 + dx), Math.round(p.y + k * px), img.width * px, 2 * px);
    }
    ctx.globalAlpha = 1;
  }

  /**
   * A tree stirring in the air: its picture slid sideways slice by slice, not
   * at all at the root and most at the crown, a slow swell passing down the
   * page from tree to tree.
   */
  private drawSwaying(img: HTMLCanvasElement, x: number, z: number, reach: number, slices: number, flip: boolean) {
    const { spriteCtx: ctx, px, shrine } = this;
    const swell = Math.sin(shrine.tick * 0.016 + x * 0.03 + z * 0.012) + Math.sin(shrine.tick * 0.037 + x * 0.05) * 0.35;
    const p = this.project(x, z, 0);
    const sh = Math.ceil(img.height / slices);
    const left = Math.round(p.x - (img.width * px) / 2);
    const foot = Math.round(p.y);
    ctx.globalAlpha = 1;
    for (let k = 0; k < slices; k++) {
      const sy = k * sh;
      const height = Math.min(sh, img.height - sy);
      const t = 1 - (sy + height / 2) / img.height;
      const dx = Math.round(swell * reach * t * t) * px;
      const y = foot - (img.height - sy) * px;
      if (!flip) ctx.drawImage(img, 0, sy, img.width, height, left + dx, y, img.width * px, height * px);
      else {
        ctx.save();
        ctx.translate(left + dx + img.width * px, y);
        ctx.scale(-1, 1);
        ctx.drawImage(img, 0, sy, img.width, height, 0, 0, img.width * px, height * px);
        ctx.restore();
      }
    }
  }

  private drawKoi(c: ShrineCreature) {
    const frame = ((this.shrine.tick + c.id * 7) >> 3) & 1;
    this.sprite(koiSprite(frame, c.palette), c.x, c.z, 0, { flipX: c.facing < 0, alpha: 0.9, anchor: 'center' });
  }

  private drawKappaSwimming(c: ShrineCreature) {
    const { spriteCtx: ctx, px } = this;
    const img = animalSprite('kappa');
    const p = this.project(c.x, c.z, 0);
    const rows = 7;
    const w = img.width * px;
    const bob = ((this.shrine.tick + c.id * 3) >> 4) & 1 ? px : 0;
    ctx.globalAlpha = 1;
    ctx.save();
    ctx.translate(Math.round(p.x), Math.round(p.y - rows * px + bob));
    if (c.facing < 0) ctx.scale(-1, 1);
    ctx.drawImage(img, 0, 0, img.width, rows, -w / 2, 0, w, rows * px);
    ctx.restore();
  }

  private rivalSprite(c: ShrineCreature, pose: RivalPose) {
    return c.species === 'tanuki' ? tanukiSprite(pose, c.palette) : kitsuneSprite(pose, c.palette);
  }

  private drawCreature(c: ShrineCreature) {
    const tick = this.shrine.tick;
    const walking = Math.hypot(c.vx, c.vz) > 0.04;
    const stride = ((tick + c.id * 5) >> 3) & 1;
    const flipX = c.facing < 0;
    switch (c.species) {
      case 'tanuki': case 'kitsune': this.drawRival(c, walking, stride); return;
      case 'hahaki': this.drawHahaki(c, walking, stride); return;
      case 'mouse': this.sprite(animalSprite(walking && stride ? 'mouse2' : 'mouse'), c.x, c.z, c.h, { flipX }); return;
      case 'hare': this.sprite(animalSprite(c.h > 0.4 ? 'hareHop' : 'hare'), c.x, c.z, c.h, { flipX }); return;
      case 'deer': {
        const kind: AnimalKind = c.state === 'bow' || c.state === 'graze' ? 'deerBow' : walking && stride ? 'deerWalk' : 'deer';
        this.sprite(animalSprite(kind), c.x, c.z, 0, { flipX });
        return;
      }
      case 'owl':
        if (c.state === 'perch') this.sprite(animalSprite('owl'), c.x, c.z, c.h, { flipX });
        else this.sprite(animalSprite((tick >> 3) & 1 ? 'owlFly1' : 'owlFly0'), c.x, c.z, c.h, { flipX, anchor: 'center' });
        return;
      case 'bat': this.sprite(animalSprite(((tick + c.id) >> 1) & 1 ? 'bat1' : 'bat0'), c.x, c.z, c.h, { flipX, anchor: 'center' }); return;
      case 'crow':
        if (c.state === 'perch') { this.sprite(animalSprite('crow'), c.x, c.z, c.h, { flipX }); return; }
        this.sprite(animalSprite((tick >> 2) & 1 ? 'crowFly1' : 'crowFly0'), c.x, c.z, c.h, { flipX, anchor: 'center' });
        if (c.carrying) this.sprite(offeringSprite(c.carrying), c.x + c.facing * 4, c.z, c.h - 4, { scale: 0.7 });
        return;
      case 'frog': this.sprite(animalSprite(c.state === 'leap' ? 'frogLeap' : 'frog'), c.x, c.z, c.h + 0.5, { flipX, stretch: c.squash }); return;
      case 'kappa': {
        const kind: AnimalKind = c.state === 'spill' ? 'kappaBow' : stride ? 'kappaWalk' : 'kappa';
        this.sprite(animalSprite(kind), c.x, c.z, 0, { flipX });
        return;
      }
      case 'kodama': {
        const shy = c.state === 'shy';
        this.sprite(animalSprite(((tick + c.id * 37) >> 6) & 1 ? 'kodama1' : 'kodama'), c.x, c.z, 0, { flipX: (c.id & 1) === 1, alpha: shy ? 0.25 : 0.9 });
        return;
      }
      case 'hitodama': this.sprite(hitodamaSprite((tick + c.id) >> 3, c.palette), c.x, c.z, c.h, { anchor: 'center', alpha: 0.92 }); return;
      case 'kasa': this.sprite(animalSprite(c.h > 0.3 ? 'kasaHop' : 'kasa'), c.x, c.z, c.h, { flipX, stretch: c.squash }); return;
      case 'chochin': this.sprite(animalSprite('chochin'), c.x, c.z, c.h, { flipX }); return;
    }
  }

  private drawRival(c: ShrineCreature, walking: boolean, stride: number) {
    const tick = this.shrine.tick;
    const young = c.age < SHRINE_MATURE;
    const scale = young ? 0.66 : 0.92;
    const flipX = c.facing < 0;
    const rival = c.species as 'tanuki' | 'kitsune';
    if (c.disguise) {
      if (c.scuttling) this.sprite(feetSprite(rival, stride), c.x, c.z + 1, c.h, { flipX });
      const img = disguiseSprite(c.disguise);
      this.sprite(img, c.x, c.z, c.h + (c.scuttling ? 1.6 : 0), { flipX: c.disguise === 'lantern' ? false : flipX, stretch: c.squash });
      if (c.tailOut > 0 || c.scuttling) this.sprite(tailSprite(rival), c.x - c.facing * (img.width / 2 + 1), c.z, c.h + 2, { flipX });
      return;
    }
    let pose: RivalPose = 'stand';
    if (c.state === 'sleep') pose = 'sleep';
    else if (c.state === 'perform') pose = c.species === 'tanuki' ? (((tick >> 2) & 1) ? 'drum' : 'sit') : (tick >> 5) & 1 ? 'howl' : 'sit';
    else if (c.state === 'changing') pose = 'sit';
    else if (walking && stride) pose = 'walk';
    this.sprite(this.rivalSprite(c, pose), c.x, c.z, c.h, { flipX, stretch: c.squash, scale });
    if (c.state === 'changing') {
      // The leaf on its head, while it gets ready.
      this.sprite(leafSprite(), c.x + c.facing * 3, c.z, c.h + 24);
    }
  }

  private drawHahaki(c: ShrineCreature, walking: boolean, stride: number) {
    const flipX = c.facing < 0;
    const lean = c.state === 'bow' || c.state === 'sweep' || c.state === 'puzzle';
    // It gets about in little hops.
    const hop = walking && !lean && stride ? 1.6 : 0;
    this.sprite(animalSprite(lean ? 'hahakiLean' : hop ? 'hahakiStep' : 'hahaki'), c.x, c.z, c.h + hop, { flipX, stretch: c.squash });
    if (c.carrying) this.sprite(offeringSprite(c.carrying), c.x, c.z, c.h + hop + 30);
  }

  private drawMarcher(m: Marcher, x: number) {
    const tick = this.shrine.tick;
    const scale = MARCHER_SCALE;
    const flipX = m.facing < 0;
    const bob = Math.abs(Math.sin(tick * 0.14 + m.phase)) * 1.8;
    const frame = ((tick + Math.round(m.phase * 10)) >> 3) & 1;
    switch (m.kind) {
      case 'hitodama': this.sprite(hitodamaSprite((tick + Math.round(m.phase * 7)) >> 3), x, m.z, m.h + Math.sin(tick * 0.05 + m.phase) * 3, { anchor: 'center', alpha: 0.95, scale }); return;
      case 'chochin': this.sprite(animalSprite('chochin'), x, m.z, m.h + bob, { scale, flipX }); return;
      case 'kasa': this.sprite(animalSprite(frame ? 'kasaHop' : 'kasa'), x, m.z, frame ? 3 : 0, { scale, flipX }); return;
      case 'teapot':
        // The joker at the back of the line, hoping nobody notices.
        this.sprite(feetSprite('tanuki', frame), x, m.z + 1, bob * 0.6, { flipX });
        this.sprite(disguiseSprite('teapot'), x, m.z, 2 + bob, { flipX });
        this.sprite(tailSprite('tanuki'), x - m.facing * 9, m.z, 3 + bob, { flipX });
        return;
      case 'momen': this.sprite(paradeSprite('momen', frame), x, m.z, m.h + Math.sin(tick * 0.06 + m.phase) * 4, { anchor: 'center', scale, flipX }); return;
      default: this.sprite(paradeSprite(m.kind, frame), x, m.z, bob * (m.kind === 'nurikabe' ? 0.5 : 1), { scale, flipX });
    }
  }

  /** Round and round in a cloud of dust, a paw or a tail poking out. */
  private drawTussle(x: number, z: number, t: number) {
    const shake = Math.sin(t * 0.9) * 2;
    for (let k = 0; k < 7; k++) {
      const a = t * 0.2 + k * 0.9;
      this.sprite(smokeSprite(((t + k * 3) >> 3) & 1), x + Math.cos(a) * 6 + shake, z + Math.sin(a) * 2, 3 + Math.abs(Math.sin(a * 2)) * 6, { anchor: 'center', scale: 1.2 });
    }
    const flip = Math.sin(t * 0.3) > 0;
    if ((t >> 3) & 1) this.sprite(tailSprite('tanuki'), x + (flip ? -9 : 9), z, 5, { flipX: flip });
    else this.sprite(tailSprite('kitsune'), x + (flip ? 9 : -9), z, 8, { flipX: !flip });
  }

  private drawFestoon(x0: number, x1: number, z: number, seed: number) {
    const { spriteCtx: ctx, px, shrine } = this;
    const lit = shrine.festivalLight;
    const H = 32;
    // Two poles, and a sagging rope between.
    const alpha = Math.min(1, lit * 1.4);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = 'rgb(70,50,52)';
    for (const x of [x0, x1]) {
      const p = this.project(x, z, H);
      const foot = this.project(x, z, 0);
      ctx.fillRect(Math.round(p.x), Math.round(p.y), px, Math.round(foot.y - p.y));
    }
    ctx.fillStyle = 'rgb(214,196,150)';
    for (let k = 0; k <= 24; k++) {
      const t = k / 24;
      const p = this.project(x0 + (x1 - x0) * t, z, H - Math.sin(t * Math.PI) * 6);
      ctx.fillRect(Math.round(p.x), Math.round(p.y), px, px);
    }
    for (let k = 1; k < 5; k++) {
      const t = k / 5;
      const sway = Math.sin(shrine.tick * 0.04 + k + seed) * 0.6;
      this.sprite(paperLanternSprite((k + seed) & 1, lit > 0.3), x0 + (x1 - x0) * t + sway, z, H - Math.sin(t * Math.PI) * 6 - 14, { alpha });
    }
  }

  private drawRings(z0: number, z1: number) {
    const { spriteCtx: ctx, shrine, px } = this;
    ctx.fillStyle = 'rgb(180,220,240)';
    for (const m of shrine.motes) {
      if (m.kind !== 'ring' || m.z < z0 || m.z > z1) continue;
      const t = 1 - m.life / m.max;
      const r = 1 + t * 8;
      const p = this.project(m.x, m.z, 0);
      ctx.globalAlpha = (1 - t) * 0.7;
      for (let a = 0; a < 16; a++) {
        const th = (a / 16) * Math.PI * 2;
        ctx.fillRect(Math.round((p.x + Math.cos(th) * r * px) / px) * px, Math.round((p.y + Math.sin(th) * r * 0.5 * px) / px) * px, px, px);
      }
    }
    ctx.globalAlpha = 1;
  }

  private drawMotes(z0: number, z1: number) {
    for (const m of this.shrine.motes) {
      if (m.kind === 'ring' || m.z < z0 || m.z > z1 + 40) continue;
      const t = 1 - m.life / m.max;
      switch (m.kind) {
        case 'smoke': this.sprite(smokeSprite(Math.floor(t * 4)), m.x, m.z, m.h, { anchor: 'center', scale: 1.1 }); break;
        case 'dust': this.sprite(dustSprite(Math.floor(t * 3)), m.x, m.z, m.h, { anchor: 'center', scale: 0.8 }); break;
        case 'star': this.sprite(starSprite(), m.x, m.z, m.h, { anchor: 'center', scale: t > 0.6 ? 0.6 : 1 }); break;
        case 'note': this.sprite(noteSprite(), m.x, m.z, m.h, { anchor: 'center', alpha: Math.min(1, m.life / 15) }); break;
        case 'heart': this.sprite(heartSprite(), m.x, m.z, m.h, { anchor: 'center', alpha: Math.min(1, m.life / 15) }); break;
        case 'leaf': this.sprite(fallingLeafSprite(m.seed, (this.shrine.tick >> 3) + m.seed), m.x, m.z, m.h, { anchor: 'center', alpha: Math.min(1, m.life / 40) }); break;
        case 'greenLeaf': this.sprite(leafSprite(), m.x, m.z, m.h, { anchor: 'center', alpha: Math.min(1, m.life / 15) }); break;
        case 'crumb': this.sprite(crumbSprite(), m.x, m.z, m.h, { anchor: 'center' }); break;
        case 'blood': this.sprite(bloodSprite(), m.x, m.z, m.h, { anchor: 'center' }); break;
        case 'tuft': this.sprite(tuftSprite(), m.x, m.z, m.h, { anchor: 'center' }); break;
        case 'splash': this.sprite(crumbSprite(), m.x, m.z, m.h, { anchor: 'center', alpha: 0.8 }); break;
        case 'ember': this.sprite(hitodamaSprite(0), m.x, m.z, m.h, { anchor: 'center', scale: 0.35, alpha: 1 - t }); break;
        default: break;
      }
    }
  }

  private drawMoths(z0: number, z1: number) {
    const { spriteCtx: ctx, shrine, px } = this;
    ctx.fillStyle = 'rgb(236,226,200)';
    ctx.globalAlpha = 1;
    for (const m of shrine.moths) {
      if (!m.alive || m.z < z0 || m.z > z1) continue;
      const p = this.project(m.x, m.z, m.h + Math.sin(m.a * 2) * 2);
      ctx.fillRect(Math.round(p.x), Math.round(p.y), px, px);
      if ((shrine.tick >> 1) & 1) { ctx.fillRect(Math.round(p.x - px), Math.round(p.y), px, px); ctx.fillRect(Math.round(p.x + px), Math.round(p.y), px, px); }
    }
  }

  /**
 * The night: a layer of darkness in cells, with a hole cut wherever something
 * gives light, so that all the colour on the page is what the lanterns show.
 * It goes over what's already drawn, and behind it over the floor below.
 */
  private applyNight(z0: number, z1: number) {
    const { spriteCtx: ctx, shrine, px } = this;
    const w = shrine.w, h = Math.ceil(this.regionHeight / px);
    if (!this.night || this.night.width !== w || this.night.height !== h) { this.night = makeCanvas(w, h); this.nightKey = ''; }
    const key = `${this.regionTop},${Math.floor(shrine.tick / NIGHT_EVERY)}`;
    if (key !== this.nightKey) {
      this.nightKey = key;
      this.paintNight(z0, z1, h);
    }
    // A firefly night is darker still; the festival lifts it.
    const deepen = 1 + shrine.syncFlash * 0.1 - shrine.festivalLight * 0.16;
    ctx.imageSmoothingEnabled = false;
    ctx.globalCompositeOperation = 'source-atop';
    ctx.globalAlpha = Math.min(1, NIGHT_SPRITES * deepen);
    ctx.drawImage(this.night, 0, 0, w * px, h * px);
    ctx.globalCompositeOperation = 'destination-over';
    ctx.globalAlpha = Math.min(1, NIGHT_FLOOR * deepen);
    ctx.drawImage(this.night, 0, 0, w * px, h * px);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
  }

  private paintNight(z0: number, z1: number, rows: number) {
    const { shrine, px } = this;
    const m = (this.night as HTMLCanvasElement).getContext('2d') as CanvasRenderingContext2D;
    const top = this.regionTop / px;
    m.imageSmoothingEnabled = false;
    m.globalCompositeOperation = 'source-over';
    m.globalAlpha = 1;
    m.fillStyle = NIGHT_COLOUR;
    m.fillRect(0, 0, shrine.w, rows);
    m.globalCompositeOperation = 'destination-out';
    const light = (x: number, z: number, reach: number, strength: number) => {
      if (z < top - reach || z > top + rows + reach) return;
      const img = lightHole(reach);
      m.globalAlpha = Math.min(1, strength);
      m.drawImage(img, Math.round(x - img.width / 2), Math.round(z - top - img.height / 2));
    };
    const fest = shrine.festivalLight;
    for (const l of shrine.lanterns) {
      const flick = 0.92 + Math.sin((shrine.tick + l.phase) * 0.17) * 0.05 + Math.sin((shrine.tick + l.phase) * 0.41) * 0.03;
      light(l.x, l.z + 2, Math.round(LANTERN_REACH + fest * 10), flick);
    }
    for (const p of shrine.props) {
      if (p.z < top - 80 || p.z > top + rows + 80) continue;
      if (p.kind === 'honden') light(p.x, p.z + 2, 62, 0.9);
      else if (p.kind === 'hokora') light(p.x, p.z + 3, 28, 0.8);
      else if (p.kind === 'pagoda') light(p.x, p.z - 4, 38, 0.6);
    }
    // The moon lies on the ponds, a little of it.
    for (const q of shrine.waters) light(q.x, q.z, Math.round(q.rx * 1.05), 0.42);
    for (const c of shrine.creatures) {
      if (!c.alive || c.z < z0 || c.z > z1) continue;
      if (c.species === 'hitodama') light(c.x, c.z, 18, 0.7);
      else if (c.species === 'chochin') light(c.x, c.z, 24, 0.85);
      else if (c.disguise === 'lantern') light(c.x, c.z, 24, 0.85);
    }
    const p = shrine.parade;
    if (p) {
      for (const c of p.marchers) {
        if (c.kind === 'hitodama') light(c.x, c.z, 30, 0.9);
        else if (c.kind === 'chochin') light(c.x, c.z, 38, 0.95);
      }
    }
    if (fest > 0.02) {
      for (const f of shrine.festoons) light((f.x0 + f.x1) / 2, f.z, 42, fest);
      for (const s of shrine.skies) {
        if (s.floating) light(s.x, s.z, 14, fest);
        else if (s.h < 60) light(s.x, s.z, 22, fest * (1 - s.h / 60));
      }
    }
    m.globalCompositeOperation = 'source-over';
    m.globalAlpha = 1;
  }

  /** A soft glow around every flame, over whatever stands near it. */
  private drawHalos(z0: number, z1: number) {
    if (this.touches <= 0.02) return;
    const { spriteCtx: ctx, shrine, px } = this;
    const halo = pool(HALO, shrine.ghostLight > 0.5 ? HALO_GHOST : HALO_WARM, true);
    const blue = pool(10, HALO_GHOST, true);
    const warm = pool(14, HALO_WARM, true);
    ctx.globalCompositeOperation = 'lighter';
    const place = (img: HTMLCanvasElement, x: number, z: number, h: number, alpha: number) => {
      const p = this.project(x, z, h);
      ctx.globalAlpha = alpha * this.touches;
      ctx.drawImage(img, Math.round(p.x - (img.width * px) / 2), Math.round(p.y - (img.height * px) / 2), img.width * px, img.height * px);
    };
    for (const l of shrine.lanterns) {
      if (l.z < z0 || l.z > z1 + 30) continue;
      place(halo, l.x, l.z, 16, 0.16 * (0.8 + Math.sin((shrine.tick + l.phase) * 0.2) * 0.12));
    }
    for (const c of shrine.creatures) {
      if (c.z < z0 || c.z > z1) continue;
      if (c.species === 'hitodama') place(c.palette ? warm : blue, c.x, c.z, c.h, 0.28);
      else if (c.species === 'chochin') place(warm, c.x, c.z, c.h + 10, 0.26);
      else if (c.disguise === 'lantern') place(warm, c.x, c.z, 16, 0.2);
    }
    const p = shrine.parade;
    if (p) {
      for (const m of p.marchers) {
        if ((m.kind === 'hitodama' || m.kind === 'chochin') && m.z > z0 && m.z < z1) place(m.kind === 'hitodama' ? blue : warm, m.x, m.z, m.h + 4, 0.34);
      }
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
  }

  /** Sky lanterns rising over everything. */
  private drawSky(z0: number, z1: number) {
    const { spriteCtx: ctx, shrine, px } = this;
    const warm = pool(10, HALO_WARM, true);
    for (const s of shrine.skies) {
      if (s.floating || s.z < z0 - 20 || s.z > z1 + 220) continue;
      const fade = Math.min(1, s.life / 90);
      this.sprite(skyLanternSprite(), s.x, s.z, s.h, { anchor: 'center', alpha: fade });
      ctx.globalCompositeOperation = 'lighter';
      const p = this.project(s.x, s.z, s.h);
      ctx.globalAlpha = 0.3 * fade;
      ctx.drawImage(warm, Math.round(p.x - (warm.width * px) / 2), Math.round(p.y - (warm.height * px) / 2), warm.width * px, warm.height * px);
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.globalAlpha = 1;
  }

  /** Fireflies blinking on and off; on a firefly night the whole wood falls into step. */
  private drawFireflies(z0: number, z1: number) {
    const { spriteCtx: ctx, shrine, px } = this;
    ctx.globalCompositeOperation = 'lighter';
    const sync = shrine.syncFlash;
    const img = fireflySprite();
    const size = img.width * px;
    for (const f of shrine.fireflies) {
      if (f.z < z0 || f.z > z1) continue;
      const own = Math.sin((shrine.tick + f.phase) * 0.08);
      const beat = Math.sin(shrine.tick * 0.07 - (f.x + f.z) * 0.022);
      const blink = own + (beat - own) * sync;
      if (blink < 0.1) continue;
      const p = this.project(f.x, f.z, f.h);
      ctx.globalAlpha = Math.min(1, blink);
      ctx.drawImage(img, Math.round(p.x - size / 2), Math.round(p.y - size / 2), size, size);
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
  }

  private drawEmote(c: ShrineCreature) {
    const img = c.emote === 'bang' ? bangSprite() : c.emote === 'what' ? whatSprite() : c.emote === 'zed' ? zedSprite() : c.emote === 'heart' ? heartSprite() : noteSprite();
    const tall = c.disguise ? 22 : c.species === 'hahaki' ? 22 : c.species === 'deer' ? 22 : 18;
    this.sprite(img, c.x, c.z, c.h + tall / ELEVATION + ((this.shrine.tick >> 3) & 1));
  }

  private drawAdoptedMarker(c: ShrineCreature) {
    const { spriteCtx: ctx, px } = this;
    const p = this.project(c.x, c.z, c.h);
    const bob = (this.shrine.tick >> 4) & 1 ? px : 0;
    const y = Math.round(p.y - (BODY_WIDTH[c.species] * 0.9 + 5) * px * p.s - bob);
    const x = Math.round(p.x);
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#1a0e1e';
    ctx.fillRect(x - px * 2.5, y - px * 0.5, px * 5, px * 2);
    ctx.fillRect(x - px * 1.5, y + px * 1.5, px * 3, px);
    ctx.fillRect(x - px * 0.5, y + px * 2.5, px, px);
    ctx.fillStyle = '#ff7a5a';
    ctx.fillRect(x - px * 2, y, px * 4, px);
    ctx.fillRect(x - px, y + px, px * 2, px);
  }

  private drawReticle(c: ShrineCreature) {
    const { spriteCtx: ctx, px } = this;
    const p = this.project(c.x, c.z, c.h);
    const lift = BODY_WIDTH[c.species] * 0.28 * px;
    const half = BODY_WIDTH[c.species] * px * p.s * 0.5 + px * 2;
    const arm = px * 2;
    const t = px * 0.75;
    const pulse = (this.shrine.tick >> 3) & 1 ? px : 0;
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
}

/** How old (ticks) a rival must be before it's drawn full size. */
const SHRINE_MATURE = 3 * 1800;
