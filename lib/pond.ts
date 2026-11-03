// Pixel pond: the living background of the pond page, seen from slightly
// above with the same camera as the reef (see pixelOcean.ts).
//
// The reference plane is the water surface: h = 0 is the waterline (and the
// ground of the banks, which are drawn on the same plane), the pond bed lies
// at h = -depth below it, and anything above the water has a positive h.
// Every creature knows which of four layers it is in (the bed, underwater,
// the surface, or the air) and moves between them through a transition you
// can see: a leap, a splash, a dive, surfacing, a climb.
//
// The banks run down the left and right of the page with a wobbly shoreline;
// the water between them shelves from the shallows into the deep middle. The
// pond bed is a grid of cells, indexed the way it is seen on the screen (by
// floor row, not by the surface point above it), where nutrients seep and
// algae grows, like the reef's seabed.
//
// World units are art pixels: x across, z down the page, h up off the water.

export const TICKS_PER_SECOND = 30;
/** How far up the screen one unit of height lifts a thing, in cells (as on the reef). */
export const ELEVATION = 0.55;
/** The deepest the pond gets, below the surface. */
export const MAX_DEPTH = 26;
/** How far (cells) the bed takes to shelve from the shore to full depth. */
const SHELF = 34;

export type Layer = 'bed' | 'under' | 'surface' | 'air';

export interface ClearZone { x0: number; z0: number; x1: number; z1: number }

const rand = (min: number, max: number) => min + Math.random() * (max - min);

export class Pond {
  w = 0;
  h = 0;
  /** Where the water starts and ends along each row (x of the left and right shores). */
  shoreL = new Float32Array(0);
  shoreR = new Float32Array(0);
  /** Depth of the water at each surface cell (0 on land). */
  depth = new Float32Array(0);
  /** Static bed and bank tone (0-255) and per-cell grain, for drawing. */
  terrain = new Uint8Array(0);
  grain = new Uint8Array(0);
  /** Algae on the bed, by floor cell. */
  algae = new Uint8Array(0);
  nutrients = new Uint8Array(0);
  tick = 0;

  /** Random phases for the shorelines, so every visit has its own pond. */
  private shorePhase = Array.from({ length: 8 }, () => rand(0, Math.PI * 2));
  private clearZones: ClearZone[] = [];

  constructor(w: number, h: number) {
    this.resize(w, h);
  }

  // --- the shape of the pond ------------------------------------------------

  /** How wide each bank is, before its wobble. */
  bankWidth() {
    return Math.max(7, Math.min(46, this.w * 0.065));
  }

  /** A shoreline's distance in from the edge at a row: slow bays, smaller coves, little kinks. */
  private shoreAt(z: number, side: 0 | 1) {
    const p = this.shorePhase;
    const base = this.bankWidth();
    const o = side * 4;
    const wobble = Math.sin(z * 0.011 + p[o]) * 0.5 + Math.sin(z * 0.031 + p[o + 1]) * 0.28
      + Math.sin(z * 0.087 + p[o + 2]) * 0.1 + Math.sin(z * 0.23 + p[o + 3]) * 0.04;
    return Math.max(3, base * (1 + wobble));
  }

  /** Grows or shrinks the world: the shores, depths and bed are worked out afresh. */
  resize(w: number, h: number) {
    if (w === this.w && h === this.h) return;
    const old = { w: this.w, h: this.h, algae: this.algae, nutrients: this.nutrients };
    this.w = w;
    this.h = h;
    const n = w * h;
    this.shoreL = new Float32Array(h);
    this.shoreR = new Float32Array(h);
    for (let z = 0; z < h; z++) {
      this.shoreL[z] = this.shoreAt(z, 0);
      this.shoreR[z] = w - this.shoreAt(z, 1);
    }
    this.depth = new Float32Array(n);
    this.terrain = new Uint8Array(n);
    this.grain = new Uint8Array(n);
    this.algae = new Uint8Array(n);
    this.nutrients = new Uint8Array(n);
    const p = this.shorePhase;
    for (let z = 0; z < h; z++) {
      const l = this.shoreL[z], r = this.shoreR[z];
      for (let x = 0; x < w; x++) {
        const i = z * w + x;
        // Gentle swells in the bed, and in the banks' turf.
        const tone = Math.sin(x * 0.09 + p[5]) * 0.3 + Math.sin(z * 0.07 + p[6]) * 0.3
          + Math.sin((x + z) * 0.05 + p[7]) * 0.25 + Math.sin((x - z) * 0.13 + p[4]) * 0.15;
        this.terrain[i] = Math.round((tone + 1) * 127);
        this.grain[i] = (Math.random() * 256) | 0;
        const d = Math.min(x - l, r - x);
        if (d > 0) {
          const k = Math.min(1, d / SHELF);
          // A wide sunlit shelf, a slope, then the deep middle; hollows here and there.
          this.depth[i] = MAX_DEPTH * (k * k * (3 - 2 * k)) * (0.82 + 0.18 * tone) + Math.min(1.5, d * 0.5);
        }
        if (x < old.w && z < old.h) {
          this.algae[i] = old.algae[z * old.w + x];
          this.nutrients[i] = old.nutrients[z * old.w + x];
        } else {
          this.nutrients[i] = 3 + ((Math.random() * 4) | 0);
          // The sunlit shallows start greenest.
          const shallow = d > 0 ? 1 - Math.min(1, this.depth[i] / MAX_DEPTH) : 0;
          if (d > 0 && tone + shallow > 0.9) this.algae[i] = Math.min(255, Math.round((tone + shallow - 0.9) * 260));
        }
      }
    }
    this.setClearZones(this.clearZones);
  }

  isWater(x: number, z: number) {
    const row = Math.max(0, Math.min(this.h - 1, Math.round(z)));
    return x > this.shoreL[row] && x < this.shoreR[row];
  }

  cellAt(x: number, z: number) {
    const cx = Math.max(0, Math.min(this.w - 1, Math.round(x)));
    const cz = Math.max(0, Math.min(this.h - 1, Math.round(z)));
    return cz * this.w + cx;
  }

  depthAt(x: number, z: number) {
    return this.depth[this.cellAt(x, z)];
  }

  /** The floor row where the bed under a surface point is seen (it lies deeper, so lower down the screen). */
  bedRow(x: number, z: number) {
    return z + this.depthAt(x, z) * ELEVATION;
  }

  // --- keeping the page readable --------------------------------------------

  setClearZones(zones: ClearZone[]) {
    this.clearZones = zones;
  }

  // --- simulation -------------------------------------------------------------

  step() {
    this.tick++;
  }
}
