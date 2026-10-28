// Draws the reef from a camera looking down at the seabed at an angle.
//
// The seabed scrolls one-to-one with the page. Anything off the floor is
// lifted up the screen by its height and drawn a little bigger (it is closer
// to the camera), with a shadow left on the floor beneath it.
// Both canvases cover the viewport plus a margin and sit in the page, so the
// browser scrolls them natively between frames.

import { Carcass, Creature, PixelOcean, SPECIES, SURFACE, Species } from './pixelOcean';
import {
  FLOOR, SpriteKind, buildCaustics, creatureSprite, creaturePalette, bonesSprite, bubbleSprite, pelletSprite,
  shadowSprite, rockSprite, coralSprite,
} from './pixelOceanArt';

/** How far up the screen one unit of height lifts an object. */
const ELEVATION = 0.55;
/** How much bigger things get per unit of height. */
const PERSPECTIVE = 0.0035;
const CAUSTIC_SIZE = 64;
const CAUSTIC_FRAMES = 32;
/** How much darker the seabed gets from the top of the page to the bottom. */
const DEPTH_DARKENING = 0.4;

/** Sprite widths in art pixels, for shadows and the inspection reticle. */
const BODY_WIDTH: Record<Species, number> = {
  minnow: 10, barracuda: 18, crab: 11, jelly: 9, turtle: 16, puffer: 9, seahorse: 6, urchin: 7,
  octopus: 12, eel: 10, shark: 26, manta: 20, angler: 13,
};

/** Which bones a picked-clean fish leaves, and at what size. */
const BONES_OF: Partial<Record<Species, ['minnow' | 'barracuda', number]>> = {
  minnow: ['minnow', 1], puffer: ['minnow', 0.9], angler: ['minnow', 1.3],
  barracuda: ['barracuda', 1], eel: ['barracuda', 0.9], shark: ['barracuda', 1.5],
};

const BLOOD = ['rgb(110,10,24)', 'rgb(176,18,40)', 'rgb(226,44,64)'];
const GOO = ['rgb(200,120,200)', 'rgb(240,170,230)', 'rgb(255,214,246)'];
const INK = ['rgb(14,10,24)', 'rgb(24,18,38)', 'rgb(36,28,52)'];
const DROP_COLORS = { blood: BLOOD, goo: GOO, ink: INK };

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
  /** The creature under inspection, drawn with a reticle. */
  highlighted: Creature | null = null;

  private floorCtx: CanvasRenderingContext2D;
  private spriteCtx: CanvasRenderingContext2D;
  private floorImage: ImageData | null = null;
  private floorPixels = new Uint32Array(0);
  private caustics = buildCaustics(CAUSTIC_SIZE, CAUSTIC_FRAMES);
  private scrollY = 0;
  private viewW = 0;
  private viewH = 0;
  private dpr = 1;

  constructor(
    private ocean: PixelOcean,
    private floorCanvas: HTMLCanvasElement,
    private spriteCanvas: HTMLCanvasElement,
    private px: number,
  ) {
    this.floorCtx = floorCanvas.getContext('2d', { alpha: false })!;
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
    const rows = Math.min(ocean.h, Math.ceil((viewH * 2) / px));
    const top = Math.max(0, Math.min(ocean.h - rows, Math.floor((scrollY - viewH / 2) / px)));
    const regionTop = top * px;
    const regionHeight = rows * px;
    if (regionTop !== this.regionTop || regionHeight !== this.regionHeight || dpr !== this.dpr
      || this.floorCanvas.width !== ocean.w) {
      this.regionTop = regionTop;
      this.regionHeight = regionHeight;
      this.dpr = dpr;
      this.place(rows);
    }

    this.renderFloor(top, rows);
    this.renderSprites();
  }

  private place(rows: number) {
    const { floorCanvas, spriteCanvas, ocean, px } = this;
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

  private renderFloor(top: number, rows: number) {
    const { ocean, floorPixels: out, caustics } = this;
    if (!this.floorImage) return;
    const { w, terrain, grain, algae, stain } = ocean;
    const frame = ((ocean.tick >> 1) % CAUSTIC_FRAMES) * CAUSTIC_SIZE * CAUSTIC_SIZE;
    const { sandLight: sl, sandDark: sd, algae: ag, algaeDense: ad, caustic: cl, blood: bl } = FLOOR;

    for (let row = 0; row < rows; row++) {
      const z = top + row;
      const crow = frame + (z & (CAUSTIC_SIZE - 1)) * CAUSTIC_SIZE;
      // Deeper down the page the light fades; blues hold out longest.
      const dim = 256 - Math.round((z / ocean.h) * DEPTH_DARKENING * 256);
      const dimBlue = Math.min(256, dim + 24);
      for (let x = 0; x < w; x++) {
        const i = z * w + x;
        // Sand tone from the terrain, roughened by the cell's grain.
        const t = Math.max(0, Math.min(255, terrain[i] + ((grain[i] & 31) - 16)));
        let r = sd[0] + (((sl[0] - sd[0]) * t) >> 8);
        let g = sd[1] + (((sl[1] - sd[1]) * t) >> 8);
        let b = sd[2] + (((sl[2] - sd[2]) * t) >> 8);
        // Algae: dithered speckle where thin, a carpet where thick.
        const a = algae[i];
        if (a > 0 && a + (grain[i] >> 1) > 120) {
          const dense = a > 200 && (grain[i] & 3) === 0;
          const col = dense ? ad : ag;
          const mix = Math.min(230, 110 + (a >> 1));
          r += ((col[0] - r) * mix) >> 8;
          g += ((col[1] - g) * mix) >> 8;
          b += ((col[2] - b) * mix) >> 8;
        }
        const st = stain[i];
        if (st > 0) {
          const mix = (st * 3) >> 2;
          r += ((bl[0] - r) * mix) >> 8;
          g += ((bl[1] - g) * mix) >> 8;
          b += ((bl[2] - b) * mix) >> 8;
        }
        const c = caustics[crow + (x & (CAUSTIC_SIZE - 1))];
        if (c) {
          r += (cl[0] * c) >> 2;
          g += (cl[1] * c) >> 2;
          b += (cl[2] * c) >> 2;
        }
        r = (r * dim) >> 8;
        g = (g * dim) >> 8;
        b = (b * dimBlue) >> 8;
        out[row * w + x] = (255 << 24) | (Math.min(255, b) << 16) | (Math.min(255, g) << 8) | Math.min(255, r);
      }
    }
    this.floorCtx.putImageData(this.floorImage, 0, 0);
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
    ctx.globalAlpha = o.alpha ?? 1;
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

    // Anything whose floor point is near the drawn region (tall or high
    // things reach further up the screen than their footprint).
    const z0 = this.regionTop / px - 10;
    const z1 = (this.regionTop + this.regionHeight) / px + SURFACE * ELEVATION + 10;
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
    for (const k of ocean.carcasses) {
      if (visible(k.z)) items.push({ depth: k.z + 0.1, draw: () => this.drawCarcass(k) });
    }
    for (const p of ocean.particles) {
      if (!visible(p.z)) continue;
      if (p.kind === 'pellet') {
        items.push({ depth: p.z + 0.2, draw: () => this.sprite(pelletSprite(), p.x, p.z, p.h) });
      } else {
        items.push({
          depth: p.z + 0.2,
          draw: () => {
            const q = this.project(p.x, p.z, p.h);
            const size = Math.max(2, Math.round(px * 0.75 * q.s));
            ctx.globalAlpha = 0.85;
            ctx.fillStyle = (p.life & 32) ? 'rgb(150,240,170)' : 'rgb(110,214,190)';
            ctx.fillRect(Math.round(q.x), Math.round(q.y), size, size);
          },
        });
      }
    }
    for (const d of ocean.drops) {
      if (!visible(d.z)) continue;
      items.push({
        depth: d.z + 0.25,
        draw: () => {
          const q = this.project(d.x, d.z, d.h);
          const size = Math.max(2, Math.round(px * (d.kind === 'ink' ? 2.2 : 0.8) * q.s));
          ctx.globalAlpha = Math.min(d.kind === 'ink' ? 0.75 : 1, (d.life / d.maxLife) * 1.6);
          ctx.fillStyle = DROP_COLORS[d.kind][d.shade];
          ctx.fillRect(Math.round(q.x), Math.round(q.y), size, size);
        },
      });
    }
    for (const c of ocean.creatures) {
      // Hiding minnows sit behind the kelp fronds around them.
      if (!visible(c.z)) continue;
      const depth = c.species === 'eel' ? c.anchorZ + 0.2 : c.hidden ? c.z - 6 : c.z + 0.3;
      items.push({ depth, draw: () => this.drawCreature(c) });
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
    for (let i = 0; i <= length; i += 1.4) {
      const sway = Math.sin(t + i * 0.12) * (i / 14);
      const p = this.project(x + sway, z, i);
      const size = Math.ceil(px * p.s);
      const tip = i > length - 3;
      ctx.globalAlpha = 1;
      ctx.fillStyle = tip ? 'rgb(120,200,110)' : i < length * 0.3 ? 'rgb(34,104,70)' : 'rgb(48,140,84)';
      ctx.fillRect(Math.round(p.x - size / 2), Math.round(p.y), size, size);
      // Leaves on alternating sides.
      if (Math.floor(i / 1.4) % 4 === 0 && i > 3) {
        const side = Math.floor(i / 5.6) % 2 ? 1 : -1;
        ctx.fillStyle = 'rgb(64,160,90)';
        ctx.fillRect(Math.round(p.x - size / 2 + side * size), Math.round(p.y), size, size);
        ctx.fillRect(Math.round(p.x - size / 2 + side * size * 2), Math.round(p.y + size), size, size);
      }
    }
  }
}
