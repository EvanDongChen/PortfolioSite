// Draws the reef from a camera looking down at the seabed at an angle.
//
// The seabed scrolls one-to-one with the page. Anything off the floor is
// lifted up the screen by its height and drawn a little bigger (it is closer
// to the camera), with a shadow left on the floor beneath it.
// Both canvases cover the viewport plus a margin and sit in the page, so the
// browser scrolls them natively between frames.

import { Anemone, Carcass, Creature, Drop, PixelOcean, SPECIES, SURFACE, Species, Station, WhaleFall } from './pixelOcean';
import {
  FLOOR, SpriteKind, buildCaustics, creatureSprite, creaturePalette, bonesSprite, bubbleSprite, pelletSprite,
  shadowSprite, rockSprite, coralSprite, starfishSprite, cuttleSprite, whaleSprite,
} from './pixelOceanArt';

/** How far up the screen one unit of height lifts an object. */
const ELEVATION = 0.55;
/** How much bigger things get per unit of height. */
const PERSPECTIVE = 0.0035;
const CAUSTIC_SIZE = 64;
const CAUSTIC_FRAMES = 32;
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
};

/** Which bones a picked-clean fish leaves, and at what size. */
const BONES_OF: Partial<Record<Species, ['minnow' | 'barracuda', number]>> = {
  minnow: ['minnow', 1], puffer: ['minnow', 0.9], angler: ['minnow', 1.3],
  barracuda: ['barracuda', 1], eel: ['barracuda', 0.9], shark: ['barracuda', 1.5],
  clownfish: ['minnow', 1], dolphin: ['barracuda', 1.5],
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
const KELP_BASE = 'rgb(34,104,70)';
const KELP_STALK = 'rgb(48,140,84)';
const KELP_LEAF = 'rgb(64,160,90)';
const KELP_TIP = 'rgb(120,200,110)';

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

export class OceanView {
  /** Top of the drawn region, in page pixels. */
  regionTop = 0;
  regionHeight = 0;
  /** Set while a courting creature is redrawn as a glow over itself. */
  private glow = false;
  /** The creature under inspection, drawn with a reticle. */
  highlighted: Creature | null = null;

  private floorCtx: CanvasRenderingContext2D;
  private spriteCtx: CanvasRenderingContext2D;
  private lightCtx: CanvasRenderingContext2D;
  private floorImage: ImageData | null = null;
  private floorPixels = new Uint32Array(0);
  private caustics = buildCaustics(CAUSTIC_SIZE, CAUSTIC_FRAMES);
  private scrollY = 0;
  private viewW = 0;
  private viewH = 0;
  private dpr = 1;
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

  constructor(
    private ocean: PixelOcean,
    private floorCanvas: HTMLCanvasElement,
    /** The moving caustic light, on its own canvas blended over the floor. */
    private lightCanvas: HTMLCanvasElement,
    private spriteCanvas: HTMLCanvasElement,
    private px: number,
  ) {
    this.floorCtx = floorCanvas.getContext('2d', { alpha: false })!;
    this.lightCtx = lightCanvas.getContext('2d', { alpha: false })!;
    this.spriteCtx = spriteCanvas.getContext('2d')!;
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

  /** The world point under a viewport position at a given height. */
  screenToWorld(clientX: number, clientY: number, h: number) {
    return {
      x: clientX / this.px,
      z: (this.scrollY + clientY) / this.px + h * ELEVATION,
    };
  }

  /** Where a creature is drawn, in viewport pixels. */
  clientPosition(c: Creature) {
    const p = this.project(c.x, c.z, c.h);
    return { x: p.x, y: p.y + this.regionTop - this.scrollY };
  }

  /** The creature drawn nearest a viewport point, if one is within reach. */
  pick(clientX: number, clientY: number, reach = 24): Creature | null {
    let best: Creature | null = null;
    let bestD = reach * reach;
    for (const c of this.ocean.creatures) {
      const p = this.clientPosition(c);
      const d = (p.x - clientX) ** 2 + (p.y - clientY) ** 2;
      if (d < bestD) { bestD = d; best = c; }
    }
    return best;
  }

  // --- frame --------------------------------------------------------------

  render(scrollY: number, viewW: number, viewH: number, dpr: number) {
    const { px, ocean } = this;
    this.scrollY = scrollY;
    this.viewW = viewW;
    this.viewH = viewH;

    // Viewport plus half a screen either side, clamped to the world.
    // The region moves in quarter-screen steps, so scrolling only repaints
    // the seabed when it has to (it still covers the viewport with room to spare).
    const step = Math.max(1, Math.ceil(viewH / 4 / px));
    const rows = Math.min(ocean.h, Math.ceil((viewH * 2) / px) + step);
    const top = Math.max(0, Math.min(ocean.h - rows, Math.floor((scrollY - viewH / 2) / px / step) * step));
    const regionTop = top * px;
    const regionHeight = rows * px;
    if (regionTop !== this.regionTop || regionHeight !== this.regionHeight || dpr !== this.dpr
      || this.floorCanvas.width !== ocean.w) {
      this.regionTop = regionTop;
      this.regionHeight = regionHeight;
      this.dpr = dpr;
      this.place(rows);
    }

    // Sand, moss and blood change slowly, so their pixels are worked out on a
    // slow clock. The caustic light moves every other tick, but it is just a
    // tiled texture laid over them, which is cheap.
    const seabedKey = `${top},${rows},${Math.floor(ocean.tick / SEABED_EVERY)}`;
    if (seabedKey !== this.seabedKey) {
      this.seabedKey = seabedKey;
      this.renderSeabed(top, rows);
      if (this.floorImage) this.floorCtx.putImageData(this.floorImage, 0, 0);
    }
    const floorKey = `${top},${rows},${ocean.tick >> 1}`;
    if (floorKey !== this.floorKey) {
      this.floorKey = floorKey;
      this.renderFloor(top, rows);
    }
    this.renderSprites();
  }

  private place(rows: number) {
    this.floorKey = '';
    this.seabedKey = '';
    const { floorCanvas, lightCanvas, spriteCanvas, ocean, px } = this;
    // A canvas can outlive the view that sized it (React remounts the reef
    // onto the same element), so check for a buffer of our own as well.
    if (!this.floorImage || floorCanvas.width !== ocean.w || floorCanvas.height !== rows) {
      floorCanvas.width = ocean.w;
      floorCanvas.height = rows;
      this.floorImage = this.floorCtx.createImageData(ocean.w, rows);
      this.floorPixels = new Uint32Array(this.floorImage.data.buffer);
    }
    floorCanvas.style.width = `${ocean.w * px}px`;
    floorCanvas.style.height = `${rows * px}px`;
    floorCanvas.style.transform = `translateY(${this.regionTop}px)`;
    if (lightCanvas.width !== ocean.w || lightCanvas.height !== rows) {
      lightCanvas.width = ocean.w;
      lightCanvas.height = rows;
    }
    lightCanvas.style.width = floorCanvas.style.width;
    lightCanvas.style.height = floorCanvas.style.height;
    lightCanvas.style.transform = floorCanvas.style.transform;

    const w = Math.ceil(this.viewW * this.dpr);
    const h = Math.ceil(this.regionHeight * this.dpr);
    if (spriteCanvas.width !== w || spriteCanvas.height !== h) {
      spriteCanvas.width = w;
      spriteCanvas.height = h;
    }
    spriteCanvas.style.width = `${this.viewW}px`;
    spriteCanvas.style.height = `${this.regionHeight}px`;
    spriteCanvas.style.transform = `translateY(${this.regionTop}px)`;
  }

  /** The plain-sand colour of every cell (see sandCache). */
  private plainSand() {
    const { ocean } = this;
    const size = `${ocean.w}x${ocean.h}`;
    if (size === this.sandCacheSize) return this.sandCache;
    const { w, h, terrain, grain } = ocean;
    const { sandLight: sl, sandDark: sd } = FLOOR;
    const cache = new Uint32Array(w * h);
    for (let z = 0; z < h; z++) {
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
    this.sandCache = cache;
    this.sandCacheSize = size;
    return cache;
  }

  /** Works out the seabed's pixels (sand, moss, blood) into the floor image. */
  private renderSeabed(top: number, rows: number) {
    const { ocean, floorPixels: out } = this;
    if (!this.floorImage) return;
    const { w, terrain, grain, algae, stain } = ocean;
    const { sandLight: sl, sandDark: sd, algae: ag, algaeDense: ad, blood: bl } = FLOOR;
    const sand = this.plainSand();

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
    ctx.fillRect(0, 0, ocean.w, rows);
    const tile = this.causticTile((ocean.tick >> 1) % CAUSTIC_FRAMES);
    const pattern = ctx.createPattern(tile, 'repeat');
    if (!pattern) return;
    // Tile from the top of the world, so the light stays put as the region moves.
    pattern.setTransform(new DOMMatrix([1, 0, 0, 1, 0, -(top % CAUSTIC_SIZE)]));
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = pattern;
    for (let row = 0; row < rows; row += CAUSTIC_BAND) {
      // Light fades with depth, like the seabed under it.
      const z = top + row + CAUSTIC_BAND / 2;
      ctx.globalAlpha = 1 - (z / ocean.h) * DEPTH_DARKENING;
      ctx.fillRect(0, row, ocean.w, Math.min(CAUSTIC_BAND, rows - row));
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  /** A frame of the caustic light as a tileable canvas: black where there is none. */
  private causticTile(frame: number) {
    let tile = this.causticTiles[frame];
    if (tile) return tile;
    tile = document.createElement('canvas');
    tile.width = CAUSTIC_SIZE;
    tile.height = CAUSTIC_SIZE;
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
    const k = px * p.s * (o.scale ?? 1);
    const w = Math.round(sw * k);
    const hh = Math.round(img.height * k);
    ctx.globalAlpha = (o.alpha ?? 1) * (this.glow ? 0.45 : 1);
    if (!o.flipX && !o.angle && (o.scaleY ?? 1) === 1) {
      const top = o.anchor === 'bottom' ? p.y - hh : p.y - hh / 2;
      ctx.drawImage(img, sx, 0, sw, img.height, Math.round(p.x - w / 2), Math.round(top), w, hh);
      return;
    }
    ctx.save();
    ctx.translate(Math.round(p.x), Math.round(p.y));
    if (o.angle) ctx.rotate(o.angle);
    ctx.scale(o.flipX ? -1 : 1, o.scaleY ?? 1);
    ctx.drawImage(img, sx, 0, sw, img.height, -w / 2, -hh / 2, w, hh);
    ctx.restore();
  }

  private renderSprites() {
    const { spriteCtx: ctx, ocean, px, dpr } = this;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, this.viewW, this.regionHeight);

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

    // Shadows lie on the floor under everything.
    for (const c of ocean.creatures) {
      if (!visible(c.z) || c.species === 'eel') continue;
      shadow(c.x, c.z, c.species === 'manta' ? c.h * 0.4 : c.h, BODY_WIDTH[c.species] * 0.75);
    }
    for (const k of ocean.carcasses) if (k.h > 0 && visible(k.z)) shadow(k.x, k.z, k.h, BODY_WIDTH[k.species] * (k.part === 'whole' ? 0.7 : 0.4));
    for (const p of ocean.particles) if (p.kind === 'pellet' && p.h > 0 && visible(p.z)) shadow(p.x, p.z, p.h, 3);
    for (const d of ocean.decor) if (visible(d.z)) shadow(d.x + 2, d.z, 0, d.w + 2);
    const wf = ocean.whale;
    if (wf && visible(wf.z)) shadow(wf.x, wf.z, wf.h * 0.5, 50);

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
      if (visible(k.z)) items.push({ depth: k.z, draw: () => this.drawKelp(k.x, k.z, k.length, k.phase) });
    }
    for (const a of ocean.anemones) {
      if (visible(a.z)) items.push({ depth: a.z, draw: () => this.drawAnemone(a) });
    }
    for (const st of ocean.stations) {
      if (visible(st.z)) items.push({ depth: st.z + 0.15, draw: () => this.drawShrimp(st) });
    }
    if (wf && visible(wf.z)) items.push({ depth: wf.z, draw: () => this.drawWhale(wf) });
    for (const k of ocean.carcasses) {
      if (visible(k.z)) items.push({ depth: k.z + 0.1, draw: () => this.drawCarcass(k) });
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
          this.drawCreature(c);
          // Courting fish flash their colours.
          if (c.courting > 0 && (ocean.tick >> 3) & 1) {
            this.glow = true;
            ctx.globalCompositeOperation = 'lighter';
            this.drawCreature(c);
            ctx.globalCompositeOperation = 'source-over';
            this.glow = false;
          }
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
        if (c.puff > 0.08) {
          // Swelling up (and back down) into a ball whose spines wobble.
          const img = creatureSprite('pufferPuffed', c.palette, (tick >> 3) & 1, washed);
          this.sprite(img, c.x, c.z, c.h, { flipX: c.facing < 0, scale: 0.55 + 0.45 * c.puff });
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
      const size = Math.ceil(px * p.s * 2);
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
        const sway = Math.sin(ocean.tick * 0.08 + a.phase + k * 0.7) * (t / 8) * 2;
        const p = this.project(a.x + root + lean * t * 0.4 + sway, a.z, t);
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
      const img = creatureSprite('shrimp', 0, frame);
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
    const fadeOut = wf.mass <= 0 ? Math.min(1, (wf.bonesUntil - this.ocean.tick) / 600) : 1;
    this.sprite(whaleSprite(stage), wf.x, wf.z, wf.h + 3, { flipX: wf.facing < 0, alpha: Math.max(0, fadeOut) });
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
  private drawKelp(x: number, z: number, length: number, phase: number) {
    const { spriteCtx: ctx, px, ocean } = this;
    const t = ocean.tick * 0.04 + phase;
    // One path per colour, filled once each, rather than a fillRect per square.
    const base = new Path2D();
    const stalk = new Path2D();
    const leaves = new Path2D();
    const tip = new Path2D();
    for (let i = 0; i <= length; i += 1.4) {
      const sway = Math.sin(t + i * 0.12) * (i / 14);
      const p = this.project(x + sway, z, i);
      const size = Math.ceil(px * p.s);
      const left = Math.round(p.x - size / 2);
      const top = Math.round(p.y);
      (i > length - 3 ? tip : i < length * 0.3 ? base : stalk).rect(left, top, size, size);
      // Leaves on alternating sides.
      if (Math.floor(i / 1.4) % 4 === 0 && i > 3) {
        const side = Math.floor(i / 5.6) % 2 ? 1 : -1;
        leaves.rect(Math.round(p.x - size / 2 + side * size), top, size, size);
        leaves.rect(Math.round(p.x - size / 2 + side * size * 2), Math.round(p.y + size), size, size);
      }
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = KELP_BASE;
    ctx.fill(base);
    ctx.fillStyle = KELP_STALK;
    ctx.fill(stalk);
    ctx.fillStyle = KELP_LEAF;
    ctx.fill(leaves);
    ctx.fillStyle = KELP_TIP;
    ctx.fill(tip);
  }
}
