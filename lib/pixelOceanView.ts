// Draws the reef from a camera looking down at the seabed at an angle.
//
// The seabed scrolls one-to-one with the page. Anything off the floor is
// lifted up the screen by its height and spread out from the view's centre
// (it is closer to the camera), with a shadow left on the floor beneath it.
// Both canvases cover the viewport plus a margin and sit in the page, so the
// browser scrolls them natively between frames.

import { Fish, PixelOcean, SURFACE } from './pixelOcean';
import {
  FLOOR, buildCaustics, fishSprite, bonesSprite, bubbleSprite, pelletSprite,
  shadowSprite, rockSprite, coralSprite,
} from './pixelOceanArt';

/** How far up the screen one unit of height lifts an object. */
const ELEVATION = 0.55;
/** How much bigger (and further from the centre) things get per unit of height. */
const PERSPECTIVE = 0.0035;
const CAUSTIC_SIZE = 64;
const CAUSTIC_FRAMES = 32;

interface Drawable { depth: number; draw: () => void }

export class OceanView {
  /** Top of the drawn region, in page pixels. */
  regionTop = 0;
  regionHeight = 0;
  /** The fish under inspection, drawn with a reticle. */
  highlighted: Fish | null = null;

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

  private get centerX() { return this.ocean.w / 2; }
  private get centerZ() { return (this.scrollY + this.viewH / 2) / this.px; }

  /** World point to region-local canvas pixels, plus its scale. */
  private project(x: number, z: number, h: number) {
    const s = 1 + h * PERSPECTIVE;
    const cx = this.centerX;
    const cz = this.centerZ;
    return {
      x: (cx + (x - cx) * s) * this.px,
      y: (cz + (z - cz) * s - h * ELEVATION) * this.px - this.regionTop,
      s,
    };
  }

  /** The world point under a viewport position at a given height. */
  screenToWorld(clientX: number, clientY: number, h: number) {
    const s = 1 + h * PERSPECTIVE;
    const cx = this.centerX;
    const cz = this.centerZ;
    return {
      x: cx + (clientX / this.px - cx) / s,
      z: cz + ((this.scrollY + clientY) / this.px + h * ELEVATION - cz) / s,
    };
  }

  /** Where a fish is drawn, in viewport pixels. */
  clientPosition(f: Fish) {
    const p = this.project(f.x, f.z, f.h);
    return { x: p.x, y: p.y + this.regionTop - this.scrollY };
  }

  /** The fish drawn nearest a viewport point, if one is within reach. */
  pick(clientX: number, clientY: number, reach = 24): Fish | null {
    let best: Fish | null = null;
    let bestD = reach * reach;
    for (const f of this.ocean.fish) {
      const p = this.clientPosition(f);
      const d = (p.x - clientX) ** 2 + (p.y - clientY) ** 2;
      if (d < bestD) { bestD = d; best = f; }
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
    if (floorCanvas.width !== ocean.w || floorCanvas.height !== rows) {
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
    const { w, terrain, grain, algae } = ocean;
    const frame = ((ocean.tick >> 1) % CAUSTIC_FRAMES) * CAUSTIC_SIZE * CAUSTIC_SIZE;
    const { sandLight: sl, sandDark: sd, algae: ag, algaeDense: ad, caustic: cl } = FLOOR;

    for (let row = 0; row < rows; row++) {
      const z = top + row;
      const crow = frame + (z & (CAUSTIC_SIZE - 1)) * CAUSTIC_SIZE;
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
        const c = caustics[crow + (x & (CAUSTIC_SIZE - 1))];
        if (c) {
          r += (cl[0] * c) >> 2;
          g += (cl[1] * c) >> 2;
          b += (cl[2] * c) >> 2;
        }
        out[row * w + x] = (255 << 24) | (Math.min(255, b) << 16) | (Math.min(255, g) << 8) | Math.min(255, r);
      }
    }
    this.floorCtx.putImageData(this.floorImage, 0, 0);
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
      const sprite = shadowSprite(sw);
      ctx.drawImage(sprite, Math.round(p.x - (sw * px) / 2), Math.round(p.y - (sprite.height * px) / 2), sw * px, sprite.height * px);
    };
    const sprite = (img: HTMLCanvasElement, x: number, z: number, h: number, alpha = 1, anchor: 'bottom' | 'center' = 'center') => {
      const p = this.project(x, z, h);
      const w = img.width * px * p.s;
      const hh = img.height * px * p.s;
      ctx.globalAlpha = alpha;
      ctx.drawImage(img, Math.round(p.x - w / 2), Math.round(anchor === 'bottom' ? p.y - hh : p.y - hh / 2), Math.round(w), Math.round(hh));
    };

    // Shadows lie on the floor under everything.
    for (const f of ocean.fish) if (visible(f.z)) shadow(f.x, f.z, f.h, f.kind === 'predator' ? 14 : 7);
    for (const r of ocean.remains) if (r.h > 0 && visible(r.z)) shadow(r.x, r.z, r.h, 7);
    for (const p of ocean.particles) if (p.kind === 'pellet' && p.h > 0 && visible(p.z)) shadow(p.x, p.z, p.h, 3);
    for (const d of ocean.decor) if (visible(d.z)) shadow(d.x + 2, d.z, 0, d.w + 2);

    const items: Drawable[] = [];
    for (const d of ocean.decor) {
      if (!visible(d.z)) continue;
      items.push({
        depth: d.z,
        draw: () => {
          sprite(d.kind === 'rock' ? rockSprite(d.seed, d.w, d.ht) : coralSprite(d.seed, d.w, d.ht), d.x, d.z, 0, 1, 'bottom');
          if (d.vent) {
            const p = this.project(d.x, d.z, 0);
            ctx.fillStyle = ((ocean.tick >> 3) & 1) ? 'rgb(255,170,80)' : 'rgb(230,110,50)';
            ctx.fillRect(Math.round(p.x - px / 2), Math.round(p.y - d.ht * px), px, px);
          }
        },
      });
    }
    for (const k of ocean.kelp) {
      if (visible(k.z)) items.push({ depth: k.z, draw: () => this.drawKelp(k.x, k.z, k.length, k.phase) });
    }
    for (const r of ocean.remains) {
      if (!visible(r.z)) continue;
      const scale = r.kind === 'predator' ? 1.7 : 1;
      items.push({
        depth: r.z + 0.1,
        draw: () => {
          const img = bonesSprite(r.facing);
          const p = this.project(r.x, r.z, r.h);
          const w = img.width * px * p.s * scale;
          const hh = img.height * px * p.s * scale;
          ctx.globalAlpha = 0.35 + 0.65 * (r.mass / r.fullMass);
          ctx.drawImage(img, Math.round(p.x - w / 2), Math.round(p.y - hh / 2), Math.round(w), Math.round(hh));
        },
      });
    }
    for (const p of ocean.particles) {
      if (!visible(p.z)) continue;
      if (p.kind === 'pellet') {
        items.push({ depth: p.z + 0.2, draw: () => sprite(pelletSprite(), p.x, p.z, p.h) });
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
    for (const f of ocean.fish) {
      if (!visible(f.z)) continue;
      const kind = f.kind === 'predator' ? 'predator' : f.age < 450 ? 'fry' : 'minnow';
      const speed = Math.hypot(f.vx, f.vz);
      const frame = Math.floor((ocean.tick + f.id * 7) / (speed > 0.5 ? 3 : 7)) & 1;
      items.push({ depth: f.z + 0.3, draw: () => sprite(fishSprite(kind, f.palette, frame, f.facing, f.energy < 0.15), f.x, f.z, f.h) });
    }
    for (const b of ocean.bubbles) {
      if (visible(b.z)) items.push({ depth: b.z + 0.4, draw: () => sprite(bubbleSprite(), b.x, b.z, b.h, 0.8) });
    }

    items.sort((a, b) => a.depth - b.depth);
    for (const item of items) item.draw();
    ctx.globalAlpha = 1;
    const target = this.highlighted;
    if (target?.alive && visible(target.z)) this.drawReticle(target);
  }

  /** Blinking corner brackets around a fish, like a targeting cursor. */
  private drawReticle(f: Fish) {
    const { spriteCtx: ctx, px } = this;
    const p = this.project(f.x, f.z, f.h);
    const half = (f.kind === 'predator' ? 12 : 8) * px * p.s * 0.5 + px * 2;
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
