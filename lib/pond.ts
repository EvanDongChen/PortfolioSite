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

/** A plant's lean, as a spring: pushed over by whatever brushes it, then righting itself. */
export interface Bend { bx: number; bz: number; bvx: number; bvz: number }
const upright = (): Bend => ({ bx: 0, bz: 0, bvx: 0, bvz: 0 });

/**
 * A lily pad floating on the surface, tethered by its stem to where it grew
 * (ax, az). It bobs, dips (and tips) when something lands on it, and drifts
 * aside to let a swimmer by before its stem pulls it back.
 */
export interface Pad {
  x: number; z: number; ax: number; az: number;
  vx: number; vz: number;
  /** Radius across, in cells; it looks r * 0.6 deep from the camera's angle. */
  r: number;
  /** Which way its notch points, in eighths of a turn. */
  notch: number;
  palette: number;
  /** 0 none, 1 a pink lily, 2 a white one. */
  flower: number;
  /** How open its flower is, 0 (a closed bud) to 1. */
  bloom: number;
  phase: number;
  /** How far it is pushed under (negative) and how fast, and its tip toward a weight on it. */
  dip: number; dipV: number;
  tilt: number;
  /** Who is sitting on it, so two frogs don't share. */
  load: number;
}

export type ReedKind = 'reed' | 'cattail' | 'rush';
/** A stem in a clump of reeds, cattails or rushes along the shore. */
export interface Stem extends Bend { x: number; z: number; len: number; kind: ReedKind; phase: number; shade: number }
export interface ReedClump { x: number; z: number; stems: Stem[] }
/** Pondweed rising from the bed toward the light, swaying in the water. */
export interface Weed { x: number; z: number; len: number; phase: number; shade: number }
export interface WeedBed { x: number; z: number; rx: number; rz: number; weeds: Weed[] }
/** A stone on the bed (or the bank, where `land` is set). */
export interface Stone { x: number; z: number; w: number; ht: number; seed: number; land: boolean }
/**
 * A log: sunk on the bed, or floating at the surface with one end grounded
 * on the bank, where frogs and the turtle climb out to bask.
 */
export interface Log { x: number; z: number; len: number; seed: number; floating: boolean; side: 1 | -1 }
/** Roots reaching into the shallows from the bank. */
export interface Roots { x: number; z: number; side: 1 | -1; seed: number }
/** One duckweed frond, drifting with its patch. */
export interface Frond { x: number; z: number; vx: number; vz: number; patch: number; shade: number; alive: boolean }
export interface DuckweedPatch { x: number; z: number; rx: number; rz: number; target: number; count: number }

const rand = (min: number, max: number) => min + Math.random() * (max - min);
const randInt = (min: number, max: number) => Math.floor(rand(min, max + 1));
const compact = <T extends { alive: boolean }>(list: T[]) => {
  let n = 0;
  for (const item of list) if (item.alive) list[n++] = item;
  list.length = n;
};

const BEND_FORCE = 0.25;
const MAX_BEND = 6;
/** Algae spreads in units of this much per growth step. */
const ALGAE_PER_UNIT = 16;
/** Cells sampled a tick, in short runs (see the reef's updateFloor). */
const FLOOR_RUN = 16;
/** How hard a pad's stem pulls it back to where it grew, and how hard swimmers push it. */
const PAD_TETHER = 0.004;
const PAD_PUSH = 0.05;
/** Duckweed: how far a swimmer parts it, and how hard a patch holds together. */
const PART_REACH = 7;
const FROND_COHESION = 0.0006;
const MAX_FRONDS = 2400;

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

  pads: Pad[] = [];
  clumps: ReedClump[] = [];
  weedBeds: WeedBed[] = [];
  stones: Stone[] = [];
  logs: Log[] = [];
  roots: Roots[] = [];
  fronds: Frond[] = [];
  patches: DuckweedPatch[] = [];
  /** The breeze across the surface (cells a tick), turning slowly. */
  wind = { x: 0, z: 0 };
  /** Where the visitor's pointer is on the water, which parts the duckweed like a swimmer. */
  pointer: { x: number; z: number } | null = null;

  /** Random phases for the shorelines, so every visit has its own pond. */
  private shorePhase = Array.from({ length: 8 }, () => rand(0, Math.PI * 2));
  private clearZones: ClearZone[] = [];
  private windAngle = rand(0, Math.PI * 2);
  private seed = (Math.random() * 0xffffffff) >>> 0 || 1;

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
        if (x < old.w && z < old.h && w === old.w) {
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
    // A narrower or wider page moves the shores, so everything is planted
    // afresh; a taller one only plants the new rows at the bottom.
    const from = w === old.w ? old.h : 0;
    if (from === 0) {
      this.pads = []; this.clumps = []; this.weedBeds = []; this.stones = []; this.logs = [];
      this.roots = []; this.fronds = []; this.patches = [];
    } else {
      const inside = (o: { z: number }) => o.z < h;
      this.pads = this.pads.filter(inside);
      this.clumps = this.clumps.filter(inside);
      this.weedBeds = this.weedBeds.filter(inside);
      this.stones = this.stones.filter(inside);
      this.logs = this.logs.filter(inside);
      this.roots = this.roots.filter(inside);
      for (const f of this.fronds) if (!inside(f)) f.alive = false;
    }
    if (h > from) this.plant(from, h);
    this.setClearZones(this.clearZones);
  }

  // --- planting -----------------------------------------------------------

  /** Water close to a shore at a row: `inward` cells in from the left (side 1) or right (-1). */
  private offShore(z: number, side: 1 | -1, inward: number) {
    const row = Math.max(0, Math.min(this.h - 1, Math.round(z)));
    return side > 0 ? this.shoreL[row] + inward : this.shoreR[row] - inward;
  }

  /** Plants the rows from z0 to z1: reeds, pads, duckweed, weeds, stones, logs and roots. */
  private plant(z0: number, z1: number) {
    const { w } = this;
    const sides: (1 | -1)[] = [1, -1];
    // Reeds and cattails in clumps along both shores, rooted at the waterline.
    for (const side of sides) {
      for (let z = z0 + rand(10, 50); z < z1 - 4; z += rand(35, 90)) {
        const x = this.offShore(z, side, rand(-3, 2));
        const stems: Stem[] = [];
        const kind: ReedKind = Math.random() < 0.4 ? 'cattail' : Math.random() < 0.5 ? 'reed' : 'rush';
        for (let k = randInt(8, 16); k > 0; k--) {
          const sz = z + rand(-5, 5);
          stems.push({
            x: x + rand(-3, 3) * (1 + Math.random()), z: sz,
            len: kind === 'cattail' ? randInt(22, 36) : kind === 'reed' ? randInt(18, 32) : randInt(12, 22),
            kind: kind === 'cattail' && Math.random() < 0.25 ? 'reed' : kind,
            phase: rand(0, Math.PI * 2), shade: randInt(0, 2), ...upright(),
          });
        }
        stems.sort((a, b) => a.z - b.z);
        this.clumps.push({ x, z, stems });
      }
    }
    // Lily pads in clusters in the shallows near the shores, out in the margins.
    for (const side of sides) {
      for (let z = z0 + rand(20, 90); z < z1 - 6; z += rand(70, 170)) {
        const cx = this.offShore(z, side, rand(7, 13));
        for (let k = randInt(3, 7), tries = 0; k > 0 && tries < 40; tries++) {
          const r = Math.round(rand(5, 10) * 2) / 2;
          const x = cx + rand(-11, 11), pz = z + rand(-14, 14);
          if (!this.isWater(x - r, pz) || !this.isWater(x + r, pz) || this.depthAt(x, pz) > MAX_DEPTH * 0.7) continue;
          if (this.pads.some(o => Math.hypot(o.x - x, (o.z - pz) * 1.6) < o.r + r + 1)) continue;
          const flower = r >= 6.5 && Math.random() < 0.4 ? (Math.random() < 0.7 ? 1 : 2) : 0;
          this.pads.push({
            x, z: pz, ax: x, az: pz, vx: 0, vz: 0, r, notch: randInt(0, 7), palette: randInt(0, 2),
            flower, bloom: 1, phase: rand(0, Math.PI * 2), dip: 0, dipV: 0, tilt: 0, load: 0,
          });
          k--;
        }
      }
    }
    // Duckweed in sheltered patches near the shores.
    for (let z = z0 + rand(30, 120); z < z1 - 6; z += rand(120, 260)) {
      const side: 1 | -1 = Math.random() < 0.5 ? 1 : -1;
      const rx = rand(7, 13), rz = rand(4, 7);
      const x = this.offShore(z, side, rx * 0.6 + rand(1, 6));
      const patch = this.patches.length;
      // Dense enough to read as a carpet, thinning toward its edges.
      const target = Math.round(rx * rz * 2.2);
      this.patches.push({ x, z, rx, rz, target, count: 0 });
      for (let k = 0; k < target && this.fronds.length < MAX_FRONDS; k++) {
        const a = rand(0, Math.PI * 2), d = Math.random() ** 0.7;
        this.addFrond(x + Math.cos(a) * d * rx, z + Math.sin(a) * d * rz, patch);
      }
    }
    // Beds of pondweed in the deeper water.
    for (let z = z0 + rand(40, 160); z < z1 - 10; z += rand(140, 300)) {
      const x = rand(w * 0.15, w * 0.85);
      if (!this.isWater(x, z) || this.depthAt(x, z) < 8) continue;
      const rx = rand(8, 16), rz = rand(4, 8);
      const weeds: Weed[] = [];
      for (let k = Math.round(rx * rz * 0.25); k > 0; k--) {
        const wx = x + rand(-rx, rx), wz = z + rand(-rz, rz);
        const depth = this.depthAt(wx, wz);
        if (depth < 5) continue;
        weeds.push({ x: wx, z: wz, len: rand(depth * 0.4, depth * 0.85), phase: rand(0, Math.PI * 2), shade: randInt(0, 2) });
      }
      weeds.sort((a, b) => a.z - b.z);
      if (weeds.length) this.weedBeds.push({ x, z, rx, rz, weeds });
    }
    // Stones: mostly in the shallows, a few on the banks.
    const area = w * (z1 - z0);
    for (let k = Math.round(area / 2600); k > 0; k--) {
      const z = rand(z0 + 2, z1 - 2);
      const side: 1 | -1 = Math.random() < 0.5 ? 1 : -1;
      const land = Math.random() < 0.25;
      const x = land ? this.offShore(z, side, -rand(3, 10)) : Math.random() < 0.7 ? this.offShore(z, side, rand(2, 24)) : rand(0, w);
      if (x < 2 || x > w - 2 || this.isWater(x, z) === land) continue;
      const big = Math.random() < 0.25;
      this.stones.push({ x, z, w: big ? randInt(8, 13) : randInt(4, 7), ht: big ? randInt(5, 7) : randInt(3, 4), seed: randInt(1, 1e9), land });
    }
    // Roots reaching in from the banks, and logs: sunk, or floating with an end on the bank.
    for (const side of sides) {
      for (let z = z0 + rand(40, 120); z < z1 - 6; z += rand(120, 260)) {
        this.roots.push({ x: this.offShore(z, side, -1), z, side, seed: randInt(1, 1e9) });
      }
    }
    for (let z = z0 + rand(150, 400); z < z1 - 10; z += rand(380, 700)) {
      const side: 1 | -1 = Math.random() < 0.5 ? 1 : -1;
      const len = randInt(24, 38);
      // The bank end rests a few cells up the shore.
      this.logs.push({ x: this.offShore(z, side, len / 2 - 5), z, len, seed: randInt(1, 1e9), floating: true, side });
    }
    for (let z = z0 + rand(200, 500); z < z1 - 10; z += rand(450, 900)) {
      const x = rand(w * 0.2, w * 0.8);
      if (this.isWater(x - 16, z) && this.isWater(x + 16, z) && this.depthAt(x, z) > 10) {
        this.logs.push({ x, z, len: randInt(20, 32), seed: randInt(1, 1e9), floating: false, side: Math.random() < 0.5 ? 1 : -1 });
      }
    }
  }

  private addFrond(x: number, z: number, patch: number) {
    if (!this.isWater(x, z)) return;
    this.fronds.push({ x, z, vx: 0, vz: 0, patch, shade: randInt(0, 2), alive: true });
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

  /**
   * Keeps the space behind the hero text clear of plants, pads and logs.
   * Things that stand up are drawn above their base, so anything rooted a
   * little below a zone that would reach up into it goes too.
   */
  setClearZones(zones: ClearZone[]) {
    this.clearZones = zones;
    if (!zones.length) return;
    const blocks = (x: number, z: number, halfW: number, rise: number, sink = 0) =>
      zones.some(r => x + halfW >= r.x0 && x - halfW <= r.x1 && z + sink >= r.z0 && z - rise <= r.z1);
    this.pads = this.pads.filter(p => !blocks(p.ax, p.az, p.r + 2, p.r));
    for (const c of this.clumps) c.stems = c.stems.filter(st => !blocks(st.x, st.z, 2, st.len * ELEVATION));
    this.clumps = this.clumps.filter(c => c.stems.length);
    this.logs = this.logs.filter(l => !blocks(l.x, l.z, l.len / 2, 4, l.floating ? 0 : MAX_DEPTH * ELEVATION));
    this.stones = this.stones.filter(st => !blocks(st.x, st.z, st.w / 2, st.ht, st.land ? 0 : this.depthAt(st.x, st.z) * ELEVATION));
    for (const f of this.fronds) if (blocks(f.x, f.z, 1, 1)) f.alive = false;
    for (const p of this.patches) if (blocks(p.x, p.z, p.rx, p.rz)) p.target = 0;
  }

  setPointer(x: number, z: number) { this.pointer = { x, z }; }
  clearPointer() { this.pointer = null; }

  // --- simulation -------------------------------------------------------------

  step() {
    this.tick++;
    this.updateWind();
    this.updateFloor();
    this.updatePads();
    this.updateReeds();
    this.updateDuckweed();
  }

  /** The breeze turns slowly, and gusts now and then. */
  private updateWind() {
    this.windAngle += Math.sin(this.tick * 0.0011) * 0.002 + rand(-0.004, 0.004);
    const gust = 0.5 + 0.5 * Math.sin(this.tick * 0.0047) ** 2;
    this.wind.x = Math.cos(this.windAngle) * 0.0025 * gust;
    this.wind.z = Math.sin(this.windAngle) * 0.0015 * gust;
  }

  /**
   * Samples random bed cells, as the reef does its seabed: nutrients seep
   * between neighbours, and algae grows where there are nutrients and light
   * (fastest in the shallows), spreads, and dies back into them.
   */
  private updateFloor() {
    const { w, h, algae, nutrients, depth } = this;
    const n = w * h;
    let seed = this.seed;
    const rnd = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return (seed >>> 0) / 4294967296; };
    for (let k = Math.max(100, Math.round(n / 200)); k > 0; k -= FLOOR_RUN) {
      const first = (rnd() * (n - FLOOR_RUN * 2)) | 0;
      for (let i = first; i < first + FLOOR_RUN * 2; i += 2) {
        if (depth[i] === 0) continue;
        const x = i % w;
        const r = rnd();
        const j = r < 0.25 ? (x > 0 ? i - 1 : i) : r < 0.5 ? (x < w - 1 ? i + 1 : i) : r < 0.75 ? (i >= w ? i - w : i) : (i + w < n ? i + w : i);
        const diff = nutrients[i] - nutrients[j];
        if (diff > 1 && depth[j] > 0) { nutrients[i]--; nutrients[j]++; }
        const sun = 1 - depth[i] / (MAX_DEPTH * 1.25);
        const a = algae[i];
        if (nutrients[i] > 0 && a <= 255 - ALGAE_PER_UNIT && (a > 0 || algae[j] >= 96 || rnd() < 0.003)) {
          if (rnd() < 0.15 + 0.5 * sun) { algae[i] = a + ALGAE_PER_UNIT; nutrients[i]--; }
        } else if (a >= ALGAE_PER_UNIT && rnd() < 0.05 + (1 - sun) * 0.05) {
          algae[i] = a - ALGAE_PER_UNIT;
          if (nutrients[i] < 255) nutrients[i]++;
        }
      }
    }
    this.seed = (seed >>> 0) || 1;
  }

  /** Pads bob, spring back from a dip, drift aside for swimmers and are pulled home by their stems. */
  private updatePads() {
    const t = this.tick;
    const pushers = this.surfacePushers();
    for (const p of this.pads) {
      p.dipV = (p.dipV - p.dip * 0.08) * 0.9;
      p.dip += p.dipV;
      p.tilt *= 0.93;
      for (let k = 0; k < pushers.length; k += 3) {
        const dx = p.x - pushers[k], dz = (p.z - pushers[k + 1]) * 1.6;
        const reach = p.r + pushers[k + 2];
        const d = Math.hypot(dx, dz);
        if (d >= reach || d === 0) continue;
        const f = (1 - d / reach) * PAD_PUSH;
        p.vx += (dx / d) * f;
        p.vz += (dz / d) * f * 0.6;
        // Shouldered aside, it tips and rocks a little.
        p.dipV -= f * 0.3;
      }
      p.vx = (p.vx + (p.ax - p.x) * PAD_TETHER + this.wind.x * 0.5) * 0.9;
      p.vz = (p.vz + (p.az - p.z) * PAD_TETHER + this.wind.z * 0.5) * 0.9;
      p.x += p.vx;
      p.z += p.vz;
      // Flowers open by day and close at night (see nightfall).
      const open = 1 - this.nightfall();
      p.bloom += (open - p.bloom) * 0.01;
      void t;
    }
  }

  /** Points (x, z, reach each) that push things floating on the surface aside. */
  private surfacePushers() {
    const out: number[] = [];
    if (this.pointer) out.push(this.pointer.x, this.pointer.z, PART_REACH);
    return out;
  }

  /** Reeds spring back upright; things pushing through them bend them. */
  private updateReeds() {
    const parity = this.tick & 1;
    const pushers = this.surfacePushers();
    for (let n = 0; n < this.clumps.length; n++) {
      const c = this.clumps[n];
      const near = (n & 1) === parity && pushers.length > 0;
      for (const st of c.stems) this.bend(st, st.x, st.z, near ? pushers : null);
    }
  }

  /** Pushes a plant away from nearby pushers, then lets it spring back (see the reef's bend). */
  private bend(b: Bend, x: number, z: number, pushers: number[] | null) {
    if (pushers) {
      for (let k = 0; k < pushers.length; k += 3) {
        const dx = x - pushers[k], dz = z - pushers[k + 1];
        const reach = pushers[k + 2];
        const d = Math.hypot(dx, dz);
        if (d >= reach || d === 0) continue;
        const f = (1 - d / reach) * BEND_FORCE;
        b.bvx += (dx / d) * f;
        b.bvz += (dz / d) * f * 0.6;
      }
    }
    if (b.bx === 0 && b.bz === 0 && b.bvx === 0 && b.bvz === 0) return;
    b.bvx = (b.bvx - b.bx * 0.03) * 0.88;
    b.bvz = (b.bvz - b.bz * 0.03) * 0.88;
    b.bx = Math.max(-MAX_BEND, Math.min(MAX_BEND, b.bx + b.bvx));
    b.bz = Math.max(-MAX_BEND, Math.min(MAX_BEND, b.bz + b.bvz));
    if (Math.abs(b.bx) + Math.abs(b.bz) + Math.abs(b.bvx) + Math.abs(b.bvz) < 0.02) b.bx = b.bz = b.bvx = b.bvz = 0;
  }

  /**
   * Duckweed drifts with the breeze, holds together as a patch, parts
   * around anything moving through it and never goes ashore; a thinned
   * patch slowly buds back.
   */
  private updateDuckweed() {
    const { wind, patches } = this;
    const pushers = this.surfacePushers();
    for (const p of patches) p.count = 0;
    for (const f of this.fronds) {
      if (!f.alive) continue;
      const p = patches[f.patch];
      p.count++;
      // Held loosely to the patch: only those straying past its edge are pulled back in.
      const dx = (f.x - p.x) / p.rx, dz = (f.z - p.z) / p.rz;
      const out = dx * dx + dz * dz;
      if (out > 1) { f.vx -= dx * FROND_COHESION * out; f.vz -= dz * FROND_COHESION * out; }
      for (let k = 0; k < pushers.length; k += 3) {
        const ex = f.x - pushers[k], ez = f.z - pushers[k + 1];
        const reach = pushers[k + 2];
        if (ex > reach || ex < -reach || ez > reach || ez < -reach) continue;
        const d = Math.hypot(ex, ez);
        if (d >= reach || d === 0) continue;
        const push = (1 - d / reach) * 0.06;
        f.vx += (ex / d) * push;
        f.vz += (ez / d) * push;
      }
      f.vx = (f.vx + wind.x) * 0.92;
      f.vz = (f.vz + wind.z) * 0.92;
      const nx = f.x + f.vx, nz = f.z + f.vz;
      if (this.isWater(nx, nz)) { f.x = nx; f.z = nz; } else { f.vx = -f.vx * 0.5; f.vz = -f.vz * 0.5; }
    }
    // The patches drift with the wind too, a little, and bud back where thinned.
    for (let n = 0; n < patches.length; n++) {
      const p = patches[n];
      if (p.count < p.target && this.fronds.length < MAX_FRONDS && Math.random() < 0.02) {
        const a = rand(0, Math.PI * 2), d = Math.sqrt(Math.random());
        this.addFrond(p.x + Math.cos(a) * d * p.rx, p.z + Math.sin(a) * d * p.rz, n);
      }
    }
    if (this.tick % 30 === 0) compact(this.fronds);
  }

  /** How far into the night it is, 0 (day) to 1 (full night); events set this. */
  nightfall() {
    return 0;
  }
}
