// Pixel reef: the ecosystem behind the pixel page, seen from slightly above.
//
// The seabed is a grid where every cell is simulated: nutrients seep between
// neighbours, algae grows where they are, spreads, dies back into them and
// sheds plankton, and blood that reaches the floor stains it for a while.
// Above the floor, creatures, plankton, food, carcasses, blood and bubbles are
// free-moving objects with a height (h) off the seabed.
//
// Food web: algae -> plankton -> minnows and jellyfish; barracuda hunt
// minnows, jellyfish sting them, turtles eat jellyfish and graze kelp, crabs
// and minnows pick at carcasses, and carcasses and waste rot back into the
// seabed's nutrients.
//
// World units are art pixels: x across, z down the page, h up off the floor.

export const SURFACE = 110;
export const TICKS_PER_SECOND = 30;

export type Species = 'minnow' | 'barracuda' | 'crab' | 'jelly' | 'turtle';
export const SPECIES_LIST: Species[] = ['minnow', 'barracuda', 'crab', 'jelly', 'turtle'];
export type DeathCause = 'eaten' | 'stung' | 'starved' | 'oldAge';
/** What a creature is up to this tick, for the inspector. */
export type Mood = 'cruising' | 'schooling' | 'foraging' | 'grazing' | 'fleeing' | 'hunting' | 'scavenging' | 'drifting';

export interface OceanEvent {
  tick: number;
  kind: 'birth' | DeathCause;
  text: string;
}

export interface Particle {
  kind: 'plankton' | 'pellet';
  x: number; z: number; h: number;
  vx: number; vz: number; vh: number;
  life: number;
  alive: boolean;
}

export interface Creature {
  id: number;
  name: string;
  species: Species;
  mood: Mood;
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
  food: Particle | Carcass | null;
  grazeCell: number;
  kelp: Kelp | null;
  scanIn: number;
  prey: Creature | null;
  alive: boolean;
}

/**
 * A dead creature, or half of one. It sinks, settles on the seabed and is
 * picked at until only bones (or a shell) are left, then rots away.
 */
export interface Carcass {
  species: Species;
  palette: number;
  part: 'whole' | 'front' | 'back';
  x: number; z: number; h: number;
  vx: number; vz: number; vh: number;
  facing: 1 | -1;
  angle: number;
  spin: number;
  mass: number;
  fullMass: number;
  alive: boolean;
}

/** A drop of blood (or jellyfish goo) drifting off a kill. */
export interface Drop {
  kind: 'blood' | 'goo';
  x: number; z: number; h: number;
  vx: number; vz: number; vh: number;
  life: number;
  maxLife: number;
  shade: number;
  alive: boolean;
}

export interface Bubble { x: number; z: number; h: number; phase: number; alive: boolean }
export interface Kelp { x: number; z: number; length: number; maxLength: number; phase: number }
export interface Decor { kind: 'rock' | 'coral'; x: number; z: number; w: number; ht: number; seed: number; vent: boolean }

export interface OceanStats {
  tick: number;
  counts: Record<Species, number>;
  caps: Record<Species, number>;
  plankton: number;
  planktonCap: number;
  algae: number;
  food: number;
  carcasses: number;
  births: number;
  deaths: Record<DeathCause, number>;
  /** Most recent first. */
  events: OceanEvent[];
}

interface SpeciesDef {
  label: string;
  names: string[];
  cruise: number;
  burst: number;
  vision: number;
  metabolism: number;
  maxAge: [number, number];
  mature: number;
  hungerLine: number;
  breedAt: number;
  breedCost: number;
  breedCooldown: number;
  litter: [number, number];
  /** Food units that fill this creature from empty to full. */
  units: number;
  /** Food units left in the body when it dies. */
  body: number;
  minH: number;
  maxH: number;
  /** One per this many seabed cells, clamped to [min, max]. */
  cap: [number, number, number];
  palettes: number;
}

// Ticks run at 30 per second.
export const SPECIES: Record<Species, SpeciesDef> = {
  minnow: {
    label: 'Minnow', names: ['Finn', 'Pip', 'Bloop', 'Skip', 'Gill', 'Marlo', 'Fizz', 'Wren', 'Juno', 'Tide', 'Pebble', 'Sprout', 'Mochi', 'Biscuit', 'Noodle', 'Sunny', 'Ripple', 'Dot'],
    cruise: 0.32, burst: 0.8, vision: 26, metabolism: 0.0011, maxAge: [2700, 4200], mature: 450, hungerLine: 0.7,
    breedAt: 0.85, breedCost: 0.45, breedCooldown: 360, litter: [1, 3], units: 60, body: 18, minH: 4, maxH: 50,
    cap: [2600, 30, 300], palettes: 5,
  },
  barracuda: {
    label: 'Barracuda', names: ['Fang', 'Razor', 'Shade', 'Barra', 'Spike', 'Vex', 'Grim', 'Moray'],
    cruise: 0.26, burst: 1.1, vision: 60, metabolism: 0.0007, maxAge: [6000, 9000], mature: 900, hungerLine: 0.8,
    breedAt: 0.8, breedCost: 0.5, breedCooldown: 1200, litter: [1, 1], units: 200, body: 50, minH: 12, maxH: 60,
    cap: [40000, 1, 14], palettes: 2,
  },
  crab: {
    label: 'Crab', names: ['Pinch', 'Clack', 'Sandy', 'Rusty', 'Nipper', 'Scuttle', 'Bisque', 'Tango'],
    cruise: 0.12, burst: 0.2, vision: 50, metabolism: 0.0005, maxAge: [7000, 10000], mature: 900, hungerLine: 0.75,
    breedAt: 0.9, breedCost: 0.5, breedCooldown: 1500, litter: [1, 2], units: 80, body: 10, minH: 0, maxH: 0,
    cap: [30000, 2, 24], palettes: 2,
  },
  jelly: {
    label: 'Jellyfish', names: ['Wobble', 'Glow', 'Drift', 'Lumen', 'Jelly', 'Mist', 'Opal', 'Veil'],
    cruise: 0.08, burst: 0.08, vision: 8, metabolism: 0.0002, maxAge: [5000, 8000], mature: 600, hungerLine: 1,
    breedAt: 0.85, breedCost: 0.5, breedCooldown: 1500, litter: [1, 2], units: 30, body: 6, minH: 8, maxH: 45,
    cap: [28000, 2, 22], palettes: 3,
  },
  turtle: {
    label: 'Sea turtle', names: ['Shelly', 'Captain', 'Moss', 'Tortuga', 'Pebbles', 'Sage'],
    cruise: 0.18, burst: 0.3, vision: 90, metabolism: 0.0004, maxAge: [12000, 16000], mature: 1800, hungerLine: 0.7,
    breedAt: 0.9, breedCost: 0.6, breedCooldown: 4000, litter: [1, 1], units: 200, body: 60, minH: 12, maxH: 45,
    cap: [120000, 1, 5], palettes: 1,
  },
};

const PLANKTON_UNITS = 5;
const PELLET_UNITS = 12;
const BITE_UNITS = 3;
/** Algae coverage (0-255 per cell) that one nutrient unit grows. */
const ALGAE_PER_UNIT = 16;
const BUCKET = 32;
const EVENT_LOG_SIZE = 6;

const rand = (min: number, max: number) => min + Math.random() * (max - min);
const randInt = (min: number, max: number) => Math.floor(rand(min, max + 1));
const dist3 = (a: { x: number; z: number; h: number }, b: { x: number; z: number; h: number }) =>
  Math.hypot(a.x - b.x, a.z - b.z, a.h - b.h);

export class PixelOcean {
  w = 0;
  h = 0;
  /** Static seabed tone (0-255) and per-cell grain, for drawing. */
  terrain = new Uint8Array(0);
  grain = new Uint8Array(0);
  algae = new Uint8Array(0);
  nutrients = new Uint8Array(0);
  /** Blood soaked into the sand; fades as the floor is sampled. */
  stain = new Uint8Array(0);

  creatures: Creature[] = [];
  particles: Particle[] = [];
  carcasses: Carcass[] = [];
  drops: Drop[] = [];
  bubbles: Bubble[] = [];
  kelp: Kelp[] = [];
  decor: Decor[] = [];
  tick = 0;
  pointer: { x: number; z: number } | null = null;

  private nextId = 1;
  private births = 0;
  private deaths: Record<DeathCause, number> = { eaten: 0, stung: 0, starved: 0, oldAge: 0 };
  private events: OceanEvent[] = [];
  private grid: Creature[][] = [];
  private foodGrid: Particle[][] = [];
  private gridCols = 0;
  private gridRows = 0;
  private plankton = 0;
  private noisePhase = Array.from({ length: 12 }, () => rand(0, Math.PI * 2));

  constructor(w: number, h: number) {
    this.resize(w, h);
    for (const species of SPECIES_LIST) {
      for (let n = Math.max(1, Math.round(this.cap(species) * 0.5)); n > 0; n--) this.spawn(species, null);
    }
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
    const old = { w: this.w, h: this.h, terrain: this.terrain, grain: this.grain, algae: this.algae, nutrients: this.nutrients, stain: this.stain };
    const n = w * h;
    this.terrain = new Uint8Array(n);
    this.grain = new Uint8Array(n);
    this.algae = new Uint8Array(n);
    this.nutrients = new Uint8Array(n);
    this.stain = new Uint8Array(n);
    for (let z = 0; z < h; z++) {
      for (let x = 0; x < w; x++) {
        const i = z * w + x;
        if (x < old.w && z < old.h) {
          const o = z * old.w + x;
          this.terrain[i] = old.terrain[o];
          this.grain[i] = old.grain[o];
          this.algae[i] = old.algae[o];
          this.nutrients[i] = old.nutrients[o];
          this.stain[i] = old.stain[o];
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

    for (const list of [this.creatures, this.particles, this.carcasses, this.drops, this.bubbles]) {
      for (const o of list) if (!inside(o)) o.alive = false;
    }
    this.w = w;
    this.h = h;
    this.gridCols = Math.ceil(w / BUCKET);
    this.gridRows = Math.ceil(h / BUCKET);
    this.sweep();
  }

  private cap(species: Species) {
    const [cells, min, max] = SPECIES[species].cap;
    return Math.max(min, Math.min(max, Math.round((this.w * this.h) / cells)));
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

  private spawn(species: Species, parent: Creature | null, energy = rand(0.55, 0.9)) {
    const sp = SPECIES[species];
    const id = this.nextId++;
    const creature: Creature = {
      id,
      name: `${sp.names[id % sp.names.length]} #${id}`,
      species,
      mood: species === 'jelly' ? 'drifting' : 'cruising',
      x: parent ? parent.x + rand(-3, 3) : rand(4, this.w - 4),
      z: parent ? parent.z + rand(-3, 3) : rand(4, this.h - 4),
      h: parent ? parent.h : species === 'crab' ? 0 : rand(sp.minH + 2, sp.maxH - 2),
      vx: rand(-0.1, 0.1), vz: rand(-0.1, 0.1), vh: 0,
      facing: Math.random() < 0.5 ? 1 : -1,
      energy,
      hungry: false,
      age: parent ? 0 : randInt(sp.mature, sp.maxAge[0]),
      maxAge: randInt(sp.maxAge[0], sp.maxAge[1]),
      breedCooldown: sp.breedCooldown,
      palette: parent && Math.random() > 0.08 ? parent.palette : randInt(0, sp.palettes - 1),
      heading: rand(0, Math.PI * 2),
      cruiseH: rand(sp.minH, sp.maxH),
      waste: 0,
      food: null,
      grazeCell: -1,
      kelp: null,
      scanIn: randInt(0, 10),
      prey: null,
      alive: true,
    };
    this.creatures.push(creature);
    return creature;
  }

  private logEvent(kind: OceanEvent['kind'], text: string) {
    this.events.unshift({ tick: this.tick, kind, text });
    if (this.events.length > EVENT_LOG_SIZE) this.events.length = EVENT_LOG_SIZE;
  }

  // --- simulation ---------------------------------------------------------

  step() {
    this.tick++;
    this.updateFloor();
    this.updateKelp();
    this.buildGrids();
    this.updateCreatures();
    this.updateParticles();
    this.updateCarcasses();
    this.updateDrops();
    this.updateBubbles();
    this.sweep();
  }

  private sweep() {
    this.creatures = this.creatures.filter(c => c.alive);
    this.particles = this.particles.filter(p => p.alive);
    this.carcasses = this.carcasses.filter(c => c.alive);
    this.drops = this.drops.filter(d => d.alive);
    this.bubbles = this.bubbles.filter(b => b.alive);
  }

  /** Samples random cells: nutrients seep, algae grows, spreads and sheds plankton, stains fade. */
  private updateFloor() {
    const { w, h, algae, nutrients, stain } = this;
    const n = w * h;
    const planktonCap = this.planktonCap();
    for (let k = Math.max(200, Math.round(n / 80)); k > 0; k--) {
      const i = (Math.random() * n) | 0;
      const x = i % w;
      const r = Math.random();
      const j = r < 0.25 ? (x > 0 ? i - 1 : i)
        : r < 0.5 ? (x < w - 1 ? i + 1 : i)
          : r < 0.75 ? (i >= w ? i - w : i)
            : (i + w < n ? i + w : i);
      if (nutrients[i] > nutrients[j] + 1) { nutrients[i]--; nutrients[j]++; }
      if (stain[i] > 0) stain[i] = Math.max(0, stain[i] - 6);

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
    this.grid = Array.from({ length: size }, () => []);
    this.foodGrid = Array.from({ length: size }, () => []);
    const bucket = (x: number, z: number) =>
      Math.min(this.gridRows - 1, Math.max(0, (z / BUCKET) | 0)) * this.gridCols
      + Math.min(this.gridCols - 1, Math.max(0, (x / BUCKET) | 0));
    for (const c of this.creatures) this.grid[bucket(c.x, c.z)].push(c);
    this.plankton = 0;
    for (const p of this.particles) {
      this.foodGrid[bucket(p.x, p.z)].push(p);
      if (p.kind === 'plankton') this.plankton++;
    }
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

  private nearest(c: Creature, species: Species, radius: number) {
    let best: Creature | null = null;
    let bestD = radius * radius;
    this.near(this.grid, c.x, c.z, radius, o => {
      if (o.species !== species || !o.alive) return;
      const d = (o.x - c.x) ** 2 + (o.z - c.z) ** 2 + (o.h - c.h) ** 2;
      if (d < bestD) { bestD = d; best = o; }
    });
    return best as Creature | null;
  }

  private updateCreatures() {
    const counts = this.counts();
    for (let n = 0, total = this.creatures.length; n < total; n++) {
      const c = this.creatures[n];
      if (c.alive) this.updateCreature(c, counts);
    }

    // Newcomers wander in so a crashed population can recover.
    if (this.tick % 150 === 0) {
      if (counts.minnow < this.cap('minnow') * 0.15) {
        const leader = this.spawn('minnow', null);
        for (let k = 0; k < 5; k++) this.spawn('minnow', leader, rand(0.5, 0.8)).age = SPECIES.minnow.mature;
      }
      if (counts.barracuda === 0 && counts.minnow > this.cap('minnow') * 0.5 && Math.random() < 0.35) this.spawn('barracuda', null);
      if (counts.crab < 2) this.spawn('crab', null);
      if (counts.jelly < 2 && Math.random() < 0.5) this.spawn('jelly', null);
      if (counts.turtle === 0 && counts.jelly > 3 && Math.random() < 0.15) this.spawn('turtle', null);
    }
  }

  private counts() {
    const counts: Record<Species, number> = { minnow: 0, barracuda: 0, crab: 0, jelly: 0, turtle: 0 };
    for (const c of this.creatures) if (c.alive) counts[c.species]++;
    return counts;
  }

  private updateCreature(c: Creature, counts: Record<Species, number>) {
    const sp = SPECIES[c.species];
    c.age++;
    if (c.breedCooldown > 0) c.breedCooldown--;
    if (c.energy < sp.hungerLine) c.hungry = true;
    else if (c.energy > 0.95) { c.hungry = false; c.food = null; c.grazeCell = -1; c.kelp = null; }

    const steer = { x: 0, z: 0, h: 0, max: sp.cruise, effort: 1 };
    switch (c.species) {
      case 'minnow': this.thinkMinnow(c, steer); break;
      case 'barracuda': this.thinkBarracuda(c, steer); break;
      case 'crab': this.thinkCrab(c, steer); break;
      case 'jelly': this.thinkJelly(c, steer); break;
      case 'turtle': this.thinkTurtle(c, steer); break;
    }
    if (!c.alive) return;
    this.move(c, steer);

    const burned = sp.metabolism * steer.effort;
    c.energy -= burned;
    c.waste += burned * sp.units;
    if (c.waste >= 1) {
      const units = Math.floor(c.waste);
      c.waste -= units;
      this.fertilise(c.x, c.z, units, 2);
    }

    if (c.energy <= 0) { this.die(c, 'starved'); return; }
    if (c.age > c.maxAge) { this.die(c, 'oldAge'); return; }

    const cap = this.cap(c.species);
    if (c.energy > sp.breedAt && c.age > sp.mature && c.breedCooldown === 0 && counts[c.species] < cap) {
      // The litter shares what the parent spent, so breeding never makes energy.
      const litter = Math.min(cap - counts[c.species], randInt(sp.litter[0], sp.litter[1]));
      c.energy -= sp.breedCost;
      c.breedCooldown = sp.breedCooldown;
      for (let k = 0; k < litter; k++) this.spawn(c.species, c, sp.breedCost / litter);
      counts[c.species] += litter;
      this.births += litter;
      this.logEvent('birth', `${c.name} had ${litter === 1 ? 'a baby' : `${litter} babies`}`);
      if (c.species !== 'crab') this.bubbles.push({ x: c.x, z: c.z, h: c.h + 3, phase: rand(0, 6), alive: true });
    }

    if (c.species !== 'crab' && c.species !== 'jelly' && Math.random() < 0.0015) {
      this.bubbles.push({ x: c.x + c.facing * 4, z: c.z, h: c.h + 2, phase: rand(0, 6), alive: true });
    }
  }

  /** Applies steering, wandering, bounds and rock avoidance, then moves. */
  private move(c: Creature, s: { x: number; z: number; h: number; max: number }) {
    const sp = SPECIES[c.species];
    if (c.x < 6) s.x += 0.06;
    if (c.x > this.w - 6) s.x -= 0.06;
    if (c.z < 6) s.z += 0.06;
    if (c.z > this.h - 6) s.z -= 0.06;
    if (c.species !== 'crab') {
      if (c.h < sp.minH && c.grazeCell < 0) s.h += 0.03;
      if (c.h > sp.maxH) s.h -= 0.03;
      // Rocks and corals are never taller than this.
      for (const d of c.h > 20 ? [] : this.decor) {
        if (c.h > d.ht + 3) continue;
        const r = d.w * 0.5 + 2;
        if ((c.x - d.x) ** 2 + (c.z - d.z) ** 2 < r * r) s.h += 0.06;
      }
    }

    c.vx = (c.vx + s.x) * 0.95;
    c.vz = (c.vz + s.z) * 0.95;
    c.vh = (c.vh + s.h) * 0.9;
    const speed = Math.hypot(c.vx, c.vz, c.vh);
    if (speed > s.max) { c.vx *= s.max / speed; c.vz *= s.max / speed; c.vh *= s.max / speed; }
    c.x = Math.max(1, Math.min(this.w - 2, c.x + c.vx));
    c.z = Math.max(1, Math.min(this.h - 2, c.z + c.vz));
    c.h = c.species === 'crab' ? 0 : Math.max(1, Math.min(SURFACE - 8, c.h + c.vh));
    if (c.vx > 0.03) c.facing = 1;
    else if (c.vx < -0.03) c.facing = -1;
  }

  private wander(c: Creature, s: { x: number; z: number; h: number }, strength = 0.02) {
    const sp = SPECIES[c.species];
    c.heading += rand(-0.2, 0.2);
    s.x += Math.cos(c.heading) * strength;
    s.z += Math.sin(c.heading) * strength;
    if (Math.random() < 0.004) c.cruiseH = rand(sp.minH, sp.maxH);
    s.h += (c.cruiseH - c.h) * 0.002;
  }

  private toward(c: Creature, s: { x: number; z: number; h: number }, t: { x: number; z: number; h: number }, force: number, lead = 0) {
    const dx = t.x - (c.x + c.facing * lead);
    const dz = t.z - c.z;
    const dh = t.h - c.h;
    const d = Math.hypot(dx, dz, dh) || 1;
    s.x += dx / d * force;
    s.z += dz / d * force;
    s.h += dh / d * force;
    return d;
  }

  private thinkMinnow(c: Creature, s: { x: number; z: number; h: number; max: number; effort: number }) {
    const sp = SPECIES.minnow;
    let threat: { x: number; z: number } | null = null;
    let threatD = 28 * 28;
    this.near(this.grid, c.x, c.z, 28, o => {
      if (o.species !== 'barracuda' && o.species !== 'jelly') return;
      // Jellyfish are only worth avoiding up close.
      const reach = o.species === 'jelly' ? 4 : 28;
      const d = (o.x - c.x) ** 2 + (o.z - c.z) ** 2 + ((o.h - c.h) * 0.5) ** 2;
      if (d < reach * reach && d < threatD) { threatD = d; threat = o; }
    });
    if (this.pointer) {
      const d = (this.pointer.x - c.x) ** 2 + (this.pointer.z - c.z) ** 2;
      if (d < 18 * 18 && d < threatD) { threatD = d; threat = this.pointer; }
    }
    if (threat) {
      const t = threat as { x: number; z: number };
      const d = Math.sqrt(threatD) || 1;
      s.x += (c.x - t.x) / d * 0.14;
      s.z += (c.z - t.z) / d * 0.14;
      s.h += 0.03;
      s.max = sp.burst;
      s.effort = 1.8;
      c.food = null;
      c.grazeCell = -1;
      c.mood = 'fleeing';
      return;
    }
    if (c.hungry && this.forage(c, s)) return;
    c.mood = this.school(c, s) ? 'schooling' : 'cruising';
    this.wander(c, s);
  }

  private thinkBarracuda(c: Creature, s: { x: number; z: number; h: number; max: number; effort: number }) {
    if (c.hungry) {
      const prey = this.findPrey(c, 'minnow');
      if (prey) {
        this.toward(c, s, { x: prey.x + prey.vx * 6, z: prey.z + prey.vz * 6, h: prey.h }, 0.09);
        s.max = SPECIES.barracuda.burst;
        s.effort = 1.5;
        c.mood = 'hunting';
        if (Math.hypot(prey.x - (c.x + c.facing * 5), prey.z - c.z, prey.h - c.h) < 6) {
          this.kill(prey, 'eaten', c);
          c.energy = Math.min(1, c.energy + (SPECIES.minnow.body + prey.energy * SPECIES.minnow.units) / SPECIES.barracuda.units);
          c.prey = null;
        }
        return;
      }
      if (c.energy < 0.35 && this.forage(c, s)) return;
    }
    c.mood = 'cruising';
    this.wander(c, s);
  }

  /** Crabs scuttle sideways across the seabed to whatever has died or sunk. */
  private thinkCrab(c: Creature, s: { x: number; z: number; h: number; max: number; effort: number }) {
    if (c.hungry) {
      if (c.food && !c.food.alive) c.food = null;
      if (--c.scanIn <= 0 && !c.food) {
        c.scanIn = 20;
        let best: Carcass | Particle | null = null;
        let bestD = SPECIES.crab.vision ** 2;
        for (const k of this.carcasses) {
          if (k.h > 1) continue;
          const d = (k.x - c.x) ** 2 + (k.z - c.z) ** 2;
          if (d < bestD) { bestD = d; best = k; }
        }
        this.near(this.foodGrid, c.x, c.z, SPECIES.crab.vision, p => {
          if (p.kind !== 'pellet' || p.h > 1) return;
          const d = (p.x - c.x) ** 2 + (p.z - c.z) ** 2;
          if (d < bestD) { bestD = d; best = p; }
        });
        c.food = best;
        if (!best && c.grazeCell < 0) c.grazeCell = this.scanForAlgae(c, 40);
      }
      if (c.food) {
        const t = c.food;
        const d = this.toward(c, s, { x: t.x, z: t.z, h: 0 }, 0.04);
        c.mood = 'scavenging';
        if (d < 3 && this.tick % 10 === 0) this.eat(c, t);
        return;
      }
      if (this.graze(c, s, 0, 0.03)) return;
    }
    c.mood = 'cruising';
    // Mostly stand still, then dart a short way.
    if (Math.random() < 0.01) c.heading = rand(0, Math.PI * 2);
    if ((this.tick + c.id * 13) % 240 < 90) {
      s.x += Math.cos(c.heading) * 0.03;
      s.z += Math.sin(c.heading) * 0.015;
    }
  }

  /** Jellyfish pulse and drift, filter plankton and sting whatever touches them. */
  private thinkJelly(c: Creature, s: { x: number; z: number; h: number; max: number; effort: number }) {
    c.mood = 'drifting';
    const beat = (this.tick + c.id * 17) % 50;
    s.h += beat < 6 ? 0.06 : -0.004;
    s.max = beat < 6 ? 0.35 : SPECIES.jelly.cruise;
    // Each pulse pushes toward the nearest plankton it can sense, if any.
    if (--c.scanIn <= 0) {
      c.scanIn = 30;
      let best: Particle | null = null;
      let bestD = 40 * 40;
      this.near(this.foodGrid, c.x, c.z, 40, p => {
        if (p.kind !== 'plankton') return;
        const d = (p.x - c.x) ** 2 + (p.z - c.z) ** 2 + (p.h - c.h) ** 2;
        if (d < bestD) { bestD = d; best = p; }
      });
      c.food = best;
    }
    if (c.food && c.food.alive && beat < 6) this.toward(c, s, c.food, 0.05);
    else {
      c.heading += rand(-0.05, 0.05);
      s.x += Math.cos(c.heading) * 0.004;
      s.z += Math.sin(c.heading) * 0.004;
      s.h += (c.cruiseH - c.h) * 0.0005;
    }

    const reach = SPECIES.jelly.vision;
    this.near(this.foodGrid, c.x, c.z, reach, p => {
      if (p.alive && p.kind === 'plankton' && dist3(p, c) < reach) this.eat(c, p);
    });
    this.near(this.grid, c.x, c.z, 5, o => {
      if (o.species === 'minnow' && o.alive && Math.hypot(o.x - c.x, o.z - c.z, o.h - (c.h - 3)) < 4) {
        this.kill(o, 'stung', c);
        c.energy = Math.min(1, c.energy + 10 / SPECIES.jelly.units);
      }
    });
  }

  /** Turtles hunt jellyfish when hungry and otherwise browse the kelp. */
  private thinkTurtle(c: Creature, s: { x: number; z: number; h: number; max: number; effort: number }) {
    if (c.hungry) {
      const jelly = this.findPrey(c, 'jelly');
      if (jelly) {
        this.toward(c, s, jelly, 0.05);
        s.max = SPECIES.turtle.burst;
        c.mood = 'hunting';
        if (dist3(jelly, { x: c.x + c.facing * 6, z: c.z, h: c.h }) < 6) {
          this.kill(jelly, 'eaten', c);
          c.energy = Math.min(1, c.energy + 40 / SPECIES.turtle.units);
          c.prey = null;
        }
        return;
      }
      if (!c.kelp || c.kelp.length < 8) {
        c.kelp = null;
        let bestD = (SPECIES.turtle.vision * 2) ** 2;
        for (const k of this.kelp) {
          if (k.length < 12) continue;
          const d = (k.x - c.x) ** 2 + (k.z - c.z) ** 2;
          if (d < bestD) { bestD = d; c.kelp = k; }
        }
      }
      if (c.kelp) {
        const k = c.kelp;
        // Any height along the stalk will do, as long as the turtle can swim there.
        const d = this.toward(c, s, { x: k.x, z: k.z, h: Math.min(k.length - 2, SPECIES.turtle.maxH - 4) }, 0.03, 6);
        c.mood = d < 6 ? 'grazing' : 'foraging';
        if (d < 6 && this.tick % 15 === 0) {
          k.length--;
          c.energy = Math.min(1, c.energy + 3 / SPECIES.turtle.units);
        }
        return;
      }
      if (this.graze(c, s, 6, 0.03)) return;
    }
    c.mood = 'cruising';
    this.wander(c, s, 0.012);
  }

  /** Steers toward food. Minnows prefer drifting food, then graze the algae. */
  private forage(c: Creature, s: { x: number; z: number; h: number }): boolean {
    if (c.food && !c.food.alive) c.food = null;
    if (--c.scanIn <= 0 || (!c.food && c.grazeCell < 0 && c.scanIn < 6)) {
      c.scanIn = 12;
      c.food = this.scanForFood(c);
      if (c.food) c.grazeCell = -1;
      else if (c.species === 'minnow' && c.grazeCell < 0) c.grazeCell = this.scanForAlgae(c);
    }

    if (c.food) {
      const t = c.food;
      const d = this.toward(c, s, t, 0.06, 4);
      c.mood = 'foraging';
      if (d < 2.5) this.eat(c, t);
      return true;
    }

    return c.grazeCell >= 0 && this.graze(c, s, 4, 0.05);
  }

  /** Swims down to a patch of algae and nibbles it, a unit at a time. */
  private graze(c: Creature, s: { x: number; z: number; h: number }, mouth: number, force: number) {
    if (c.grazeCell < 0) {
      if (--c.scanIn > 0) return false;
      c.scanIn = 15;
      c.grazeCell = this.scanForAlgae(c, 40);
      if (c.grazeCell < 0) return false;
    }
    const gx = c.grazeCell % this.w;
    const gz = Math.floor(c.grazeCell / this.w);
    const dx = gx - (c.x + c.facing * mouth);
    const dz = gz - c.z;
    const d = Math.hypot(dx, dz) || 1;
    if (d > 2) {
      s.x += dx / d * force;
      s.z += dz / d * force;
    }
    s.h += (2 - c.h) * 0.01;
    c.mood = d < 4 ? 'grazing' : 'foraging';
    if (d < 4 && c.h < 5) {
      const i = this.cellAt(c.x + c.facing * mouth + rand(-1.5, 1.5), c.z + rand(-1.5, 1.5));
      if (this.algae[i] >= ALGAE_PER_UNIT) {
        this.algae[i] -= ALGAE_PER_UNIT;
        c.energy = Math.min(1, c.energy + 1 / SPECIES[c.species].units);
      } else if (Math.random() < 0.1) {
        c.grazeCell = -1;
      }
    }
    return true;
  }

  private scanForFood(c: Creature): Particle | Carcass | null {
    const r = SPECIES[c.species].vision;
    let best: Particle | Carcass | null = null;
    let bestScore = r * r;
    const consider = (t: Particle | Carcass, weight: number) => {
      const score = ((t.x - c.x) ** 2 + (t.z - c.z) ** 2 + (t.h - c.h) ** 2) * weight;
      if (score < bestScore) { bestScore = score; best = t; }
    };
    this.near(this.foodGrid, c.x, c.z, r, p => {
      if (c.species === 'minnow') consider(p, p.kind === 'pellet' ? 0.4 : 1);
      else if (p.kind === 'pellet') consider(p, 1);
    });
    for (const k of this.carcasses) {
      if (k.species !== 'jelly' && k.mass > 0) consider(k, 0.8);
    }
    return best;
  }

  private scanForAlgae(c: Creature, radius = 24) {
    let best = -1;
    let bestAlgae = 63;
    for (let k = 0; k < 16; k++) {
      const i = this.cellAt(c.x + rand(-radius, radius), c.z + rand(-radius, radius));
      if (this.algae[i] > bestAlgae) { bestAlgae = this.algae[i]; best = i; }
    }
    return best;
  }

  private eat(c: Creature, t: Particle | Carcass) {
    const units = SPECIES[c.species].units;
    if ('fullMass' in t) {
      const bite = Math.min(t.mass, BITE_UNITS);
      t.mass -= bite;
      if (t.mass <= 0) t.alive = false;
      c.energy = Math.min(1, c.energy + bite / units);
      return;
    }
    t.alive = false;
    if (t.kind === 'plankton') this.plankton--;
    c.energy = Math.min(1, c.energy + (t.kind === 'pellet' ? PELLET_UNITS : PLANKTON_UNITS) / units);
    c.food = null;
  }

  /** Steers with nearby minnows; false when there are none. */
  private school(c: Creature, s: { x: number; z: number; h: number }) {
    let n = 0;
    let avx = 0, avz = 0, cx = 0, cz = 0, ch = 0, sx = 0, sz = 0;
    this.near(this.grid, c.x, c.z, 16, o => {
      if (o === c || o.species !== 'minnow') return;
      const dx = o.x - c.x;
      const dz = o.z - c.z;
      const d2 = dx * dx + dz * dz;
      if (d2 > 256 || n >= 8) return;
      n++;
      avx += o.vx; avz += o.vz;
      cx += dx; cz += dz; ch += o.h - c.h;
      if (d2 < 25) { sx -= dx; sz -= dz; }
    });
    if (n === 0) return false;
    c.vx += (avx / n - c.vx) * 0.05 + cx / n * 0.003 + sx * 0.02;
    c.vz += (avz / n - c.vz) * 0.05 + cz / n * 0.003 + sz * 0.02;
    s.h += ch / n * 0.004;
    return true;
  }

  private findPrey(c: Creature, species: Species) {
    const p = c.prey;
    if (p && p.alive && (p.x - c.x) ** 2 + (p.z - c.z) ** 2 < 80 * 80) return p;
    c.prey = this.nearest(c, species, SPECIES[c.species].vision);
    return c.prey;
  }

  // --- death --------------------------------------------------------------

  private die(c: Creature, cause: 'starved' | 'oldAge') {
    this.kill(c, cause, null);
  }

  /**
   * Ends a creature. Bitten ones are torn in half in a spray of blood (or
   * burst into goo, for jellyfish); the rest go belly-up and sink.
   */
  private kill(c: Creature, cause: DeathCause, killer: Creature | null) {
    c.alive = false;
    this.deaths[cause]++;
    const sp = SPECIES[c.species];
    const mass = Math.round(sp.body + Math.max(0, c.energy) * sp.units * 0.3);
    const base = { species: c.species, palette: c.palette, x: c.x, z: c.z, h: c.h, facing: c.facing, alive: true };

    if (cause === 'eaten' && c.species === 'jelly') {
      this.splash('goo', c, 16);
      this.logEvent(cause, `${killer?.name ?? 'Something'} ate ${c.name}`);
      return;
    }
    if (cause === 'eaten') {
      // The killer swallows a share; two halves fly apart with what's left.
      const half = Math.max(2, Math.round(mass * 0.3));
      const away = c.facing;
      this.carcasses.push(
        { ...base, part: 'front', vx: away * rand(0.2, 0.35), vz: rand(-0.15, 0.15), vh: rand(0, 0.1), angle: 0, spin: rand(0.04, 0.09) * away, mass: half, fullMass: half },
        { ...base, part: 'back', vx: -away * rand(0.2, 0.35), vz: rand(-0.15, 0.15), vh: rand(0, 0.1), angle: 0, spin: -rand(0.04, 0.09) * away, mass: half, fullMass: half },
      );
      this.splash('blood', c, 26);
      this.logEvent(cause, `${killer?.name ?? 'Something'} bit ${c.name} in half`);
      return;
    }

    this.carcasses.push({ ...base, part: 'whole', vx: c.vx * 0.3, vz: c.vz * 0.3, vh: 0, angle: 0, spin: 0, mass, fullMass: mass });
    if (cause === 'stung') {
      this.splash('blood', c, 6);
      this.logEvent(cause, `${killer?.name ?? 'A jellyfish'} stung ${c.name}`);
    } else {
      this.logEvent(cause, `${c.name} ${cause === 'starved' ? 'starved' : 'died of old age'}`);
    }
  }

  private splash(kind: Drop['kind'], at: { x: number; z: number; h: number }, count: number) {
    for (let k = 0; k < count; k++) {
      const a = rand(0, Math.PI * 2);
      const speed = rand(0.05, 0.45);
      const life = randInt(50, 130);
      this.drops.push({
        kind,
        x: at.x + rand(-1, 1), z: at.z + rand(-1, 1), h: at.h + rand(-1, 1),
        vx: Math.cos(a) * speed, vz: Math.sin(a) * speed * 0.6, vh: rand(-0.15, 0.3),
        life, maxLife: life, shade: randInt(0, 2), alive: true,
      });
    }
  }

  // --- things that drift ----------------------------------------------------

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

  private updateCarcasses() {
    for (const k of this.carcasses) {
      if (k.h > 0) {
        // Drift apart, slow down, tumble, and sink; whole bodies roll belly-up.
        k.vx *= 0.96;
        k.vz *= 0.96;
        k.vh = Math.max(-0.18, k.vh * 0.95 - 0.006);
        k.x = Math.max(1, Math.min(this.w - 2, k.x + k.vx));
        k.z = Math.max(1, Math.min(this.h - 2, k.z + k.vz));
        k.h = Math.max(0, k.h + k.vh);
        if (k.part === 'whole') k.angle += (Math.PI - k.angle) * 0.05;
        else { k.angle += k.spin; k.spin *= 0.985; }
        continue;
      }
      if (Math.random() < (k.species === 'jelly' ? 0.08 : 0.03)) {
        k.mass--;
        this.fertilise(k.x, k.z, 1, 3);
        if (k.mass <= 0) k.alive = false;
      }
    }
  }

  private updateDrops() {
    for (const d of this.drops) {
      if (--d.life <= 0) { d.alive = false; continue; }
      d.vx *= 0.92;
      d.vz *= 0.92;
      d.vh = d.vh * 0.92 - 0.004;
      d.x += d.vx;
      d.z += d.vz;
      d.h += d.vh;
      if (d.h <= 0) {
        d.alive = false;
        if (d.kind === 'blood') {
          const i = this.cellAt(d.x, d.z);
          this.stain[i] = Math.min(255, this.stain[i] + 110);
        }
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
    let plankton = 0, food = 0;
    for (const p of this.particles) {
      if (p.kind === 'plankton') plankton++;
      else food++;
    }
    const caps = {} as Record<Species, number>;
    for (const s of SPECIES_LIST) caps[s] = this.cap(s);
    return {
      tick: this.tick,
      counts: this.counts(),
      caps,
      plankton,
      planktonCap: this.planktonCap(),
      algae: Math.round((algae / (255 * Math.max(1, this.algae.length))) * 100),
      food,
      carcasses: this.carcasses.length,
      births: this.births,
      deaths: { ...this.deaths },
      events: [...this.events],
    };
  }
}
