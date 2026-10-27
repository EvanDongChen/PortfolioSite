// Pixel reef: the ecosystem behind the pixel page, seen from slightly above.
//
// The seabed is a grid where every cell is simulated: nutrients seep between
// neighbours, algae grows where they are, spreads, dies back into them and
// sheds plankton. Above the floor, fish, plankton, food, remains and bubbles
// are free-moving objects with a height (h) off the seabed. Matter cycles:
// algae -> plankton -> minnows -> predators -> remains -> nutrients -> algae,
// and fish waste fertilises the floor wherever they swim.
//
// World units are art pixels: x across, z down the page, h up off the floor.

export const SURFACE = 110;

export type FishKind = 'minnow' | 'predator';
export type DeathCause = 'starved' | 'oldAge' | 'eaten';

export interface Particle {
  kind: 'plankton' | 'pellet';
  x: number; z: number; h: number;
  vx: number; vz: number; vh: number;
  life: number;
  alive: boolean;
}

export interface Remains {
  kind: FishKind;
  x: number; z: number; h: number;
  facing: 1 | -1;
  mass: number;
  fullMass: number;
  alive: boolean;
}

export interface Fish {
  id: number;
  kind: FishKind;
  x: number; z: number; h: number;
  vx: number; vz: number; vh: number;
  facing: 1 | -1;
  energy: number;
  /** Starts below the species' hunger line and lasts until nearly full. */
  hungry: boolean;
  age: number;
  maxAge: number;
  breedCooldown: number;
  palette: number;
  heading: number;
  cruiseH: number;
  waste: number;
  food: Particle | Remains | null;
  grazeCell: number;
  scanIn: number;
  prey: Fish | null;
  alive: boolean;
}

export interface Bubble { x: number; z: number; h: number; phase: number; alive: boolean }
export interface Kelp { x: number; z: number; length: number; maxLength: number; phase: number }
export interface Decor { kind: 'rock' | 'coral'; x: number; z: number; w: number; ht: number; seed: number; vent: boolean }

export interface OceanStats {
  minnows: number;
  predators: number;
  plankton: number;
  algae: number;
  food: number;
  remains: number;
  births: number;
  deaths: Record<DeathCause, number>;
}

interface Species {
  cruise: number;
  burst: number;
  vision: number;
  metabolism: number;
  maxAge: [number, number];
  mature: number;
  breedAt: number;
  breedCost: number;
  breedCooldown: number;
  litter: [number, number];
  /** Food units that fill this fish from empty to full. */
  units: number;
  /** Food units left in the body when it dies. */
  body: number;
  minH: number;
  maxH: number;
}

// Ticks run at 30 per second.
const SPECIES: Record<FishKind, Species> = {
  minnow: { cruise: 0.32, burst: 0.8, vision: 26, metabolism: 0.0011, maxAge: [2700, 4200], mature: 450, breedAt: 0.85, breedCost: 0.45, breedCooldown: 360, litter: [1, 3], units: 60, body: 18, minH: 4, maxH: 50 },
  predator: { cruise: 0.26, burst: 1.1, vision: 60, metabolism: 0.0007, maxAge: [6000, 9000], mature: 900, breedAt: 0.8, breedCost: 0.5, breedCooldown: 1200, litter: [1, 1], units: 200, body: 50, minH: 12, maxH: 60 },
};

export const MINNOW_PALETTE_COUNT = 5;
export const PREDATOR_PALETTE_COUNT = 2;

const PLANKTON_UNITS = 5;
const PELLET_UNITS = 12;
const BITE_UNITS = 3;
/** Algae coverage (0-255 per cell) that one nutrient unit grows. */
const ALGAE_PER_UNIT = 16;
const BUCKET = 32;

const rand = (min: number, max: number) => min + Math.random() * (max - min);
const randInt = (min: number, max: number) => Math.floor(rand(min, max + 1));

export class PixelOcean {
  w = 0;
  h = 0;
  /** Static seabed tone (0-255) and per-cell grain, for drawing. */
  terrain = new Uint8Array(0);
  grain = new Uint8Array(0);
  algae = new Uint8Array(0);
  nutrients = new Uint8Array(0);

  fish: Fish[] = [];
  particles: Particle[] = [];
  remains: Remains[] = [];
  bubbles: Bubble[] = [];
  kelp: Kelp[] = [];
  decor: Decor[] = [];
  tick = 0;
  pointer: { x: number; z: number } | null = null;

  private nextId = 1;
  private births = 0;
  private deaths: Record<DeathCause, number> = { starved: 0, oldAge: 0, eaten: 0 };
  private fishGrid: Fish[][] = [];
  private foodGrid: Particle[][] = [];
  private gridCols = 0;
  private gridRows = 0;
  private plankton = 0;
  private noisePhase = Array.from({ length: 12 }, () => rand(0, Math.PI * 2));

  constructor(w: number, h: number) {
    this.resize(w, h);
    const caps = this.caps();
    for (let n = Math.round(caps.minnows * 0.5); n > 0; n--) this.spawnFish('minnow', null);
    for (let n = Math.max(1, Math.round(caps.predators * 0.5)); n > 0; n--) this.spawnFish('predator', null);
    for (let n = Math.round(this.planktonCap() * 0.4); n > 0; n--) {
      this.spawnParticle('plankton', rand(0, w), rand(0, h), rand(4, 40));
    }
  }

  // --- world --------------------------------------------------------------

  /** Smooth value in [-1, 1]; the same everywhere for the life of the world. */
  private noise(x: number, z: number, octave: number) {
    const p = this.noisePhase;
    const o = octave * 4;
    const f = 0.02 / (octave + 1);
    return (Math.sin(x * f * 1.3 + p[o]) + Math.sin(z * f * 1.1 + p[o + 1])
      + Math.sin((x + z) * f * 0.9 + p[o + 2]) + Math.sin((x - z) * f * 1.7 + p[o + 3])) / 4;
  }

  /** Grows or shrinks the world, keeping everything that still fits. */
  resize(w: number, h: number) {
    if (w === this.w && h === this.h) return;
    const old = { w: this.w, h: this.h, terrain: this.terrain, grain: this.grain, algae: this.algae, nutrients: this.nutrients };
    const n = w * h;
    this.terrain = new Uint8Array(n);
    this.grain = new Uint8Array(n);
    this.algae = new Uint8Array(n);
    this.nutrients = new Uint8Array(n);
    for (let z = 0; z < h; z++) {
      for (let x = 0; x < w; x++) {
        const i = z * w + x;
        if (x < old.w && z < old.h) {
          const o = z * old.w + x;
          this.terrain[i] = old.terrain[o];
          this.grain[i] = old.grain[o];
          this.algae[i] = old.algae[o];
          this.nutrients[i] = old.nutrients[o];
          continue;
        }
        this.terrain[i] = Math.round((this.noise(x, z, 0) * 0.7 + this.noise(x, z, 2) * 0.3 + 1) * 127);
        this.grain[i] = (Math.random() * 256) | 0;
        const fertile = this.noise(x, z, 1);
        this.nutrients[i] = Math.max(0, Math.round(2 + fertile * 4 + Math.random() * 2));
        if (fertile > 0.35) this.algae[i] = Math.min(255, Math.round((fertile - 0.35) * 500 + Math.random() * 40));
      }
    }

    const inside = (o: { x: number; z: number }) => o.x < w && o.z < h;
    this.decor = this.decor.filter(inside);
    this.kelp = this.kelp.filter(inside);
    // New ground (on the right or below) gets its own rocks, corals and kelp.
    const fresh = (x: number, z: number) => x >= old.w || z >= old.h;
    const area = n - Math.min(w, old.w) * Math.min(h, old.h);
    const scatter = (count: number, place: (x: number, z: number) => void) => {
      for (let k = 0, tries = 0; k < count && tries < count * 20; tries++) {
        const x = rand(6, w - 6);
        const z = rand(6, h - 4);
        if (fresh(x, z)) { place(x, z); k++; }
      }
    };
    scatter(Math.round(area / 9000), (x, z) => {
      const big = Math.random() < 0.3;
      this.decor.push({ kind: 'rock', x, z, w: big ? randInt(18, 30) : randInt(8, 16), ht: big ? randInt(10, 16) : randInt(5, 9), seed: randInt(1, 1e9), vent: big && Math.random() < 0.5 });
    });
    scatter(Math.round(area / 7000), (x, z) => {
      this.decor.push({ kind: 'coral', x, z, w: randInt(9, 15), ht: randInt(8, 14), seed: randInt(1, 1e9), vent: false });
    });
    scatter(Math.round(area / 30000), (x, z) => {
      for (let k = randInt(3, 7); k > 0; k--) {
        const maxLength = randInt(25, 70);
        this.kelp.push({ x: Math.min(w - 2, Math.max(2, x + rand(-10, 10))), z: Math.min(h - 2, Math.max(2, z + rand(-6, 6))), length: randInt(8, maxLength), maxLength, phase: rand(0, Math.PI * 2) });
      }
    });

    for (const f of this.fish) if (!inside(f)) f.alive = false;
    for (const p of this.particles) if (!inside(p)) p.alive = false;
    for (const r of this.remains) if (!inside(r)) r.alive = false;
    for (const b of this.bubbles) if (!inside(b)) b.alive = false;
    this.w = w;
    this.h = h;
    this.gridCols = Math.ceil(w / BUCKET);
    this.gridRows = Math.ceil(h / BUCKET);
    this.sweep();
  }

  private caps() {
    const cells = this.w * this.h;
    return {
      minnows: Math.max(30, Math.min(320, Math.round(cells / 2600))),
      predators: Math.max(1, Math.min(16, Math.round(cells / 40000))),
    };
  }

  private planktonCap() {
    return Math.max(60, Math.min(1500, Math.round((this.w * this.h) / 500)));
  }

  private cellAt(x: number, z: number) {
    const cx = Math.max(0, Math.min(this.w - 1, Math.round(x)));
    const cz = Math.max(0, Math.min(this.h - 1, Math.round(z)));
    return cz * this.w + cx;
  }

  /** Spreads food units back into the seabed's nutrients around a point. */
  private fertilise(x: number, z: number, units: number, radius: number) {
    for (let k = 0; k < units; k++) {
      const i = this.cellAt(x + rand(-radius, radius), z + rand(-radius, radius));
      if (this.nutrients[i] < 255) this.nutrients[i]++;
    }
  }

  dropFood(x: number, z: number, h: number) {
    for (let n = 0; n < 10; n++) {
      this.spawnParticle('pellet', x + rand(-4, 4), z + rand(-3, 3), h + rand(-3, 3));
    }
  }

  setPointer(x: number, z: number) { this.pointer = { x, z }; }
  clearPointer() { this.pointer = null; }

  private spawnParticle(kind: Particle['kind'], x: number, z: number, h: number) {
    if (kind === 'plankton') this.plankton++;
    this.particles.push({
      kind, x, z, h,
      vx: rand(-0.05, 0.05), vz: rand(-0.05, 0.05), vh: kind === 'pellet' ? -0.3 : rand(0.02, 0.08),
      life: kind === 'pellet' ? randInt(1800, 2400) : randInt(1200, 2400),
      alive: true,
    });
  }

  private spawnFish(kind: FishKind, parent: Fish | null, energy = rand(0.55, 0.9)) {
    const sp = SPECIES[kind];
    const fish: Fish = {
      id: this.nextId++,
      kind,
      x: parent ? parent.x + rand(-3, 3) : rand(4, this.w - 4),
      z: parent ? parent.z + rand(-3, 3) : rand(4, this.h - 4),
      h: parent ? parent.h : rand(sp.minH + 4, sp.maxH - 4),
      vx: rand(-0.2, 0.2), vz: rand(-0.2, 0.2), vh: 0,
      facing: Math.random() < 0.5 ? 1 : -1,
      energy,
      hungry: false,
      age: parent ? 0 : randInt(sp.mature, sp.maxAge[0]),
      maxAge: randInt(sp.maxAge[0], sp.maxAge[1]),
      breedCooldown: sp.breedCooldown,
      palette: parent && Math.random() > 0.08
        ? parent.palette
        : randInt(0, (kind === 'minnow' ? MINNOW_PALETTE_COUNT : PREDATOR_PALETTE_COUNT) - 1),
      heading: rand(0, Math.PI * 2),
      cruiseH: rand(sp.minH + 4, sp.maxH - 4),
      waste: 0,
      food: null,
      grazeCell: -1,
      scanIn: randInt(0, 10),
      prey: null,
      alive: true,
    };
    this.fish.push(fish);
    return fish;
  }

  // --- simulation ---------------------------------------------------------

  step() {
    this.tick++;
    this.updateFloor();
    this.updateKelp();
    this.buildGrids();
    this.updateFish();
    this.updateParticles();
    this.updateRemains();
    this.updateBubbles();
    this.sweep();
  }

  private sweep() {
    this.fish = this.fish.filter(f => f.alive);
    this.particles = this.particles.filter(p => p.alive);
    this.remains = this.remains.filter(r => r.alive);
    this.bubbles = this.bubbles.filter(b => b.alive);
  }

  /** Samples random cells: nutrients seep, algae grows, spreads and sheds plankton. */
  private updateFloor() {
    const { w, h, algae, nutrients } = this;
    const n = w * h;
    const planktonCap = this.planktonCap();
    for (let k = Math.max(200, Math.round(n / 60)); k > 0; k--) {
      const i = (Math.random() * n) | 0;
      const x = i % w;
      const r = Math.random();
      const j = r < 0.25 ? (x > 0 ? i - 1 : i)
        : r < 0.5 ? (x < w - 1 ? i + 1 : i)
          : r < 0.75 ? (i >= w ? i - w : i)
            : (i + w < n ? i + w : i);
      if (nutrients[i] > nutrients[j] + 1) { nutrients[i]--; nutrients[j]++; }

      const a = algae[i];
      if (nutrients[i] > 0 && a <= 255 - ALGAE_PER_UNIT && (a > 0 || algae[j] >= 96 || Math.random() < 0.002)) {
        if (Math.random() < 0.5) { algae[i] = a + ALGAE_PER_UNIT; nutrients[i]--; }
      } else if (a >= ALGAE_PER_UNIT && Math.random() < 0.04) {
        algae[i] = a - ALGAE_PER_UNIT;
        if (nutrients[i] < 255) nutrients[i]++;
      }
      if (algae[i] >= 224 && this.plankton < planktonCap && Math.random() < 0.004) {
        algae[i] -= PLANKTON_UNITS * ALGAE_PER_UNIT;
        this.spawnParticle('plankton', x, Math.floor(i / w), 1);
      }
    }
  }

  private updateKelp() {
    for (const k of this.kelp) {
      const i = this.cellAt(k.x, k.z);
      if (k.length < k.maxLength && this.nutrients[i] >= 2 && Math.random() < 0.01) {
        k.length++;
        this.nutrients[i] -= 2;
      } else if (k.length > 6 && Math.random() < 0.0025) {
        k.length--;
        this.fertilise(k.x, k.z, 2, 2);
      }
    }
  }

  private buildGrids() {
    const size = this.gridCols * this.gridRows;
    this.fishGrid = Array.from({ length: size }, () => []);
    this.foodGrid = Array.from({ length: size }, () => []);
    const bucket = (x: number, z: number) =>
      Math.min(this.gridRows - 1, Math.max(0, (z / BUCKET) | 0)) * this.gridCols
      + Math.min(this.gridCols - 1, Math.max(0, (x / BUCKET) | 0));
    for (const f of this.fish) this.fishGrid[bucket(f.x, f.z)].push(f);
    for (const p of this.particles) this.foodGrid[bucket(p.x, p.z)].push(p);
  }

  private near<T>(grid: T[][], x: number, z: number, radius: number, visit: (item: T) => void) {
    const c0 = Math.max(0, Math.floor((x - radius) / BUCKET));
    const c1 = Math.min(this.gridCols - 1, Math.floor((x + radius) / BUCKET));
    const r0 = Math.max(0, Math.floor((z - radius) / BUCKET));
    const r1 = Math.min(this.gridRows - 1, Math.floor((z + radius) / BUCKET));
    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        for (const item of grid[r * this.gridCols + c]) visit(item);
      }
    }
  }

  private updateFish() {
    const caps = this.caps();
    const counts = { minnow: 0, predator: 0 };
    for (const f of this.fish) counts[f.kind]++;

    for (let n = 0, count = this.fish.length; n < count; n++) {
      const f = this.fish[n];
      if (f.alive) this.updateOneFish(f, caps, counts);
    }

    // Newcomers wander in so a crashed population can recover.
    if (this.tick % 150 === 0) {
      if (counts.minnow < caps.minnows * 0.15) {
        const leader = this.spawnFish('minnow', null);
        for (let k = 0; k < 5; k++) this.spawnFish('minnow', leader, rand(0.5, 0.8)).age = SPECIES.minnow.mature;
      }
      if (counts.predator === 0 && counts.minnow > caps.minnows * 0.5 && Math.random() < 0.35) {
        this.spawnFish('predator', null);
      }
    }
  }

  private updateOneFish(f: Fish, caps: { minnows: number; predators: number }, counts: Record<FishKind, number>) {
    const sp = SPECIES[f.kind];
    f.age++;
    if (f.breedCooldown > 0) f.breedCooldown--;

    let ax = 0, az = 0, ah = 0;
    let maxSpeed = sp.cruise;
    let effort = 1;
    let busy = false;
    if (f.energy < (f.kind === 'minnow' ? 0.7 : 0.8)) f.hungry = true;
    else if (f.energy > 0.95) { f.hungry = false; f.food = null; f.grazeCell = -1; }

    if (f.kind === 'minnow') {
      let threatX = 0, threatZ = 0, threatD = 28 * 28;
      let found = false;
      this.near(this.fishGrid, f.x, f.z, 28, o => {
        if (o.kind !== 'predator') return;
        const d = (o.x - f.x) ** 2 + (o.z - f.z) ** 2 + ((o.h - f.h) * 0.5) ** 2;
        if (d < threatD) { threatD = d; threatX = o.x; threatZ = o.z; found = true; }
      });
      if (this.pointer) {
        const d = (this.pointer.x - f.x) ** 2 + (this.pointer.z - f.z) ** 2;
        if (d < 18 * 18 && d < threatD) { threatD = d; threatX = this.pointer.x; threatZ = this.pointer.z; found = true; }
      }
      if (found) {
        const d = Math.sqrt(threatD) || 1;
        ax += (f.x - threatX) / d * 0.14;
        az += (f.z - threatZ) / d * 0.14;
        ah += 0.03;
        maxSpeed = sp.burst;
        effort = 1.8;
        f.food = null;
        f.grazeCell = -1;
        busy = true;
      } else if (f.hungry) {
        busy = this.forage(f);
      }
      if (!busy) this.school(f);
    } else if (f.hungry) {
      const prey = this.findPrey(f);
      if (prey) {
        const dx = prey.x + prey.vx * 6 - f.x;
        const dz = prey.z + prey.vz * 6 - f.z;
        const dh = prey.h - f.h;
        const d = Math.hypot(dx, dz, dh) || 1;
        ax += dx / d * 0.09;
        az += dz / d * 0.09;
        ah += dh / d * 0.09;
        maxSpeed = sp.burst;
        effort = 1.5;
        busy = true;
        if (Math.hypot(prey.x - (f.x + f.facing * 5), prey.z - f.z, prey.h - f.h) < 6) {
          prey.alive = false;
          this.deaths.eaten++;
          f.energy = Math.min(1, f.energy + (SPECIES.minnow.body + prey.energy * SPECIES.minnow.units) / sp.units);
          f.prey = null;
        }
      } else if (f.energy < 0.35) {
        busy = this.forage(f);
      }
    }

    // Wander and drift between cruising heights.
    f.heading += rand(-0.2, 0.2);
    if (!busy) {
      ax += Math.cos(f.heading) * 0.02;
      az += Math.sin(f.heading) * 0.02;
      if (Math.random() < 0.004) f.cruiseH = rand(sp.minH + 4, sp.maxH - 4);
      ah += (f.cruiseH - f.h) * 0.002;
    }
    if (f.x < 6) ax += 0.06;
    if (f.x > this.w - 6) ax -= 0.06;
    if (f.z < 6) az += 0.06;
    if (f.z > this.h - 6) az -= 0.06;
    if (f.h < sp.minH && f.grazeCell < 0) ah += 0.03;
    if (f.h > sp.maxH) ah -= 0.03;
    for (const d of this.decor) {
      if (f.h > d.ht + 3) continue;
      const dx = f.x - d.x;
      const dz = f.z - d.z;
      const r = d.w * 0.5 + 2;
      if (dx * dx + dz * dz < r * r) ah += 0.06;
    }

    f.vx = (f.vx + ax) * 0.95;
    f.vz = (f.vz + az) * 0.95;
    f.vh = (f.vh + ah) * 0.9;
    const speed = Math.hypot(f.vx, f.vz, f.vh);
    if (speed > maxSpeed) { f.vx *= maxSpeed / speed; f.vz *= maxSpeed / speed; f.vh *= maxSpeed / speed; }
    f.x = Math.max(1, Math.min(this.w - 2, f.x + f.vx));
    f.z = Math.max(1, Math.min(this.h - 2, f.z + f.vz));
    f.h = Math.max(1, Math.min(SURFACE - 8, f.h + f.vh));
    if (f.vx > 0.03) f.facing = 1;
    else if (f.vx < -0.03) f.facing = -1;

    const burned = sp.metabolism * effort;
    f.energy -= burned;
    f.waste += burned * sp.units;
    if (f.waste >= 1) {
      const units = Math.floor(f.waste);
      f.waste -= units;
      this.fertilise(f.x, f.z, units, 2);
    }

    if (f.energy <= 0) { this.die(f, 'starved'); return; }
    if (f.age > f.maxAge) { this.die(f, 'oldAge'); return; }

    const cap = f.kind === 'minnow' ? caps.minnows : caps.predators;
    if (f.energy > sp.breedAt && f.age > sp.mature && f.breedCooldown === 0 && counts[f.kind] < cap) {
      // The litter shares what the parent spent, so breeding never makes energy.
      const litter = Math.min(cap - counts[f.kind], randInt(sp.litter[0], sp.litter[1]));
      f.energy -= sp.breedCost;
      f.breedCooldown = sp.breedCooldown;
      for (let k = 0; k < litter; k++) this.spawnFish(f.kind, f, sp.breedCost / litter);
      counts[f.kind] += litter;
      this.births += litter;
      this.bubbles.push({ x: f.x, z: f.z, h: f.h + 3, phase: rand(0, 6), alive: true });
    }

    if (Math.random() < 0.0015) this.bubbles.push({ x: f.x + f.facing * 4, z: f.z, h: f.h + 2, phase: rand(0, 6), alive: true });
  }

  private die(f: Fish, cause: DeathCause) {
    f.alive = false;
    this.deaths[cause]++;
    const sp = SPECIES[f.kind];
    const mass = Math.round(sp.body + Math.max(0, f.energy) * sp.units * 0.3);
    this.remains.push({ kind: f.kind, x: f.x, z: f.z, h: f.h, facing: f.facing, mass, fullMass: mass, alive: true });
  }

  /** Steers toward food. Minnows prefer drifting food, then graze the algae. */
  private forage(f: Fish): boolean {
    const sp = SPECIES[f.kind];
    const food = f.food;
    if (food && !food.alive) f.food = null;
    if (--f.scanIn <= 0 || (!f.food && f.grazeCell < 0 && f.scanIn < 6)) {
      f.scanIn = 12;
      f.food = this.scanForFood(f);
      if (f.food) f.grazeCell = -1;
      else if (f.kind === 'minnow' && f.grazeCell < 0) f.grazeCell = this.scanForAlgae(f);
    }

    if (f.food) {
      const t = f.food;
      const dx = t.x - (f.x + f.facing * 4);
      const dz = t.z - f.z;
      const dh = t.h - f.h;
      const d = Math.hypot(dx, dz, dh) || 1;
      f.vx += dx / d * 0.06;
      f.vz += dz / d * 0.06;
      f.vh += dh / d * 0.06;
      if (d < 2.5) this.eat(f, t);
      return true;
    }

    if (f.grazeCell >= 0) {
      const gx = f.grazeCell % this.w;
      const gz = Math.floor(f.grazeCell / this.w);
      const dx = gx - (f.x + f.facing * 4);
      const dz = gz - f.z;
      const d = Math.hypot(dx, dz) || 1;
      if (d > 2) {
        f.vx += dx / d * 0.05;
        f.vz += dz / d * 0.05;
      }
      f.vh += (2 - f.h) * 0.01;
      if (d < 4 && f.h < 5) {
        // Nibble the mouth's cell and its neighbours, one unit at a time.
        const i = this.cellAt(f.x + f.facing * 4 + rand(-1.5, 1.5), f.z + rand(-1.5, 1.5));
        if (this.algae[i] >= ALGAE_PER_UNIT) {
          this.algae[i] -= ALGAE_PER_UNIT;
          f.energy = Math.min(1, f.energy + 1 / sp.units);
        } else if (Math.random() < 0.1) {
          f.grazeCell = -1;
        }
      }
      return true;
    }
    return false;
  }

  private scanForFood(f: Fish): Particle | Remains | null {
    const r = SPECIES[f.kind].vision;
    let best: Particle | Remains | null = null;
    let bestScore = r * r;
    const consider = (t: Particle | Remains, weight: number) => {
      const score = ((t.x - f.x) ** 2 + (t.z - f.z) ** 2 + (t.h - f.h) ** 2) * weight;
      if (score < bestScore) { bestScore = score; best = t; }
    };
    if (f.kind === 'minnow') {
      this.near(this.foodGrid, f.x, f.z, r, p => consider(p, p.kind === 'pellet' ? 0.4 : 1));
    } else {
      this.near(this.foodGrid, f.x, f.z, r, p => { if (p.kind === 'pellet') consider(p, 1); });
    }
    for (const rm of this.remains) consider(rm, 0.8);
    return best;
  }

  private scanForAlgae(f: Fish) {
    let best = -1;
    let bestAlgae = 63;
    for (let k = 0; k < 10; k++) {
      const i = this.cellAt(f.x + rand(-24, 24), f.z + rand(-24, 24));
      if (this.algae[i] > bestAlgae) { bestAlgae = this.algae[i]; best = i; }
    }
    return best;
  }

  private eat(f: Fish, t: Particle | Remains) {
    const sp = SPECIES[f.kind];
    if ('fullMass' in t) {
      const bite = Math.min(t.mass, BITE_UNITS);
      t.mass -= bite;
      if (t.mass <= 0) t.alive = false;
      f.energy = Math.min(1, f.energy + bite / sp.units);
      return;
    }
    t.alive = false;
    if (t.kind === 'plankton') this.plankton--;
    f.energy = Math.min(1, f.energy + (t.kind === 'pellet' ? PELLET_UNITS : PLANKTON_UNITS) / sp.units);
    f.food = null;
  }

  private school(f: Fish) {
    let n = 0;
    let avx = 0, avz = 0, cx = 0, cz = 0, ch = 0, sx = 0, sz = 0;
    this.near(this.fishGrid, f.x, f.z, 16, o => {
      if (o === f || o.kind !== 'minnow') return;
      const dx = o.x - f.x;
      const dz = o.z - f.z;
      const d2 = dx * dx + dz * dz;
      if (d2 > 256 || n >= 8) return;
      n++;
      avx += o.vx; avz += o.vz;
      cx += dx; cz += dz; ch += o.h - f.h;
      if (d2 < 25) { sx -= dx; sz -= dz; }
    });
    if (n === 0) return;
    f.vx += (avx / n - f.vx) * 0.05 + cx / n * 0.003 + sx * 0.02;
    f.vz += (avz / n - f.vz) * 0.05 + cz / n * 0.003 + sz * 0.02;
    f.vh += ch / n * 0.004;
  }

  private findPrey(f: Fish) {
    const p = f.prey;
    if (p && p.alive && (p.x - f.x) ** 2 + (p.z - f.z) ** 2 < 80 * 80) return p;
    let best: Fish | null = null;
    let bestD = SPECIES.predator.vision ** 2;
    this.near(this.fishGrid, f.x, f.z, SPECIES.predator.vision, o => {
      if (o.kind !== 'minnow' || !o.alive) return;
      const d = (o.x - f.x) ** 2 + (o.z - f.z) ** 2 + (o.h - f.h) ** 2;
      if (d < bestD) { bestD = d; best = o; }
    });
    f.prey = best;
    return best;
  }

  private updateParticles() {
    for (const p of this.particles) {
      if (!p.alive) continue;
      if (--p.life <= 0) {
        p.alive = false;
        if (p.kind === 'plankton') this.plankton--;
        this.fertilise(p.x, p.z, p.kind === 'pellet' ? PELLET_UNITS : PLANKTON_UNITS, 2);
        continue;
      }
      if (p.kind === 'pellet') {
        if (p.h > 0) {
          p.x += Math.sin(this.tick * 0.05 + p.life) * 0.04;
          p.h = Math.max(0, p.h + p.vh);
        }
        continue;
      }
      p.vx = Math.max(-0.08, Math.min(0.08, p.vx + rand(-0.01, 0.01)));
      p.vz = Math.max(-0.08, Math.min(0.08, p.vz + rand(-0.01, 0.01)));
      p.vh = Math.max(-0.06, Math.min(0.06, p.vh + rand(-0.008, 0.008) + (p.h < 6 ? 0.004 : p.h > 45 ? -0.004 : 0)));
      p.x = Math.max(0, Math.min(this.w - 1, p.x + p.vx));
      p.z = Math.max(0, Math.min(this.h - 1, p.z + p.vz));
      p.h = Math.max(0.5, p.h + p.vh);
    }
  }

  private updateRemains() {
    for (const r of this.remains) {
      if (r.h > 0) { r.h = Math.max(0, r.h - 0.15); continue; }
      if (Math.random() < 0.03) {
        r.mass--;
        this.fertilise(r.x, r.z, 1, 3);
        if (r.mass <= 0) r.alive = false;
      }
    }
  }

  private updateBubbles() {
    for (const d of this.decor) {
      if (d.vent && Math.random() < 0.03) {
        this.bubbles.push({ x: d.x + rand(-2, 2), z: d.z, h: d.ht, phase: rand(0, 6), alive: true });
      }
    }
    for (const b of this.bubbles) {
      b.h += 0.45;
      b.x += Math.sin(this.tick * 0.12 + b.phase) * 0.08;
      if (b.h > SURFACE) b.alive = false;
    }
  }

  stats(): OceanStats {
    let algae = 0;
    for (let i = 0; i < this.algae.length; i++) algae += this.algae[i];
    let minnows = 0, predators = 0, plankton = 0, food = 0;
    for (const f of this.fish) {
      if (f.kind === 'minnow') minnows++;
      else predators++;
    }
    for (const p of this.particles) {
      if (p.kind === 'plankton') plankton++;
      else food++;
    }
    return {
      minnows,
      predators,
      plankton,
      algae: Math.round((algae / (255 * Math.max(1, this.algae.length))) * 100),
      food,
      remains: this.remains.length,
      births: this.births,
      deaths: { ...this.deaths },
    };
  }
}
