// Pixel ecosystem: a falling-sand world where every cell is simulated, plus
// the minnows and predators that live in it.
//
// Matter cycles through a shared nutrient pool: kelp and plankton grow from
// it, minnows graze them, predators hunt minnows, and everything that dies
// sinks as corpse pixels that rot back into nutrients. Breathing (metabolism)
// also returns nutrients, and the vents top the pool up if it runs low.

export const WATER = 0;
export const SAND = 1;
export const ROCK = 2;
export const KELP = 3;
export const PLANKTON = 4;
export const PELLET = 5;
export const CORPSE = 6;
export const BUBBLE = 7;

const MINNOW = 0;
const PREDATOR = 1;

export type DeathCause = 'starved' | 'oldAge' | 'eaten';

export interface OceanStats {
  minnows: number;
  predators: number;
  plankton: number;
  kelp: number;
  food: number;
  corpses: number;
  nutrients: number;
  births: number;
  deaths: Record<DeathCause, number>;
}

// Colours are packed little-endian ABGR for a Uint32 view of ImageData.
const rgb = (r: number, g: number, b: number) => ((255 << 24) | (b << 16) | (g << 8) | r) >>> 0;
const palette = (...colors: [number, number, number][]) => colors.map(c => rgb(c[0], c[1], c[2]));

const SAND_COLORS = palette([194, 163, 108], [178, 148, 96], [207, 178, 122], [160, 132, 86]);
const ROCK_COLORS = palette([74, 82, 99], [62, 70, 86], [88, 96, 112], [55, 61, 76]);
const KELP_COLORS = palette([34, 139, 84], [46, 160, 90], [28, 118, 72], [40, 150, 80]);
const KELP_TIP_COLORS = palette([96, 200, 110], [120, 214, 120]);
const PLANKTON_COLORS = palette([150, 255, 170], [120, 236, 200], [190, 255, 150]);
const PELLET_COLORS = palette([234, 150, 52], [204, 118, 40], [250, 180, 80]);
const CORPSE_COLORS = palette([190, 170, 165], [160, 140, 140], [210, 192, 182], [140, 122, 124]);
const BUBBLE_COLORS = palette([190, 236, 255], [150, 212, 245]);
const VENT_COLORS = palette([255, 140, 60], [255, 190, 90], [210, 90, 40]);
const EYE = rgb(8, 10, 20);

// Sprite roles: B body, D back, L belly, T tail, E eye. Drawn facing right.
type Role = 'B' | 'D' | 'L' | 'T' | 'E';
interface SpritePixel { dx: number; dy: number; role: Role }
interface Sprite { pixels: SpritePixel[]; halfW: number }

const sprite = (rows: string[]): Sprite => {
  const height = rows.length;
  const width = rows[0].length;
  const pixels: SpritePixel[] = [];
  rows.forEach((row, y) => {
    [...row].forEach((ch, x) => {
      if (ch !== '.') pixels.push({ dx: x - (width >> 1), dy: y - (height >> 1), role: ch as Role });
    });
  });
  return { pixels, halfW: width >> 1 };
};

const FRY_SPRITE = sprite([
  'TBBE',
  '.LL.',
]);
const MINNOW_SPRITE = sprite([
  'T.DDD.',
  '.TBBEB',
  'T.LLL.',
]);
const PREDATOR_SPRITE = sprite([
  '.....D.....',
  'T..DDDDDD..',
  'TTBBBBBBBEB',
  'T..LLLLLLB.',
  '.....L.....',
]);

// [body, back, belly, tail]
const MINNOW_PALETTES = [
  palette([170, 200, 225], [110, 140, 180], [220, 235, 245], [140, 170, 205]),
  palette([245, 200, 70], [200, 150, 40], [255, 230, 140], [230, 170, 50]),
  palette([250, 130, 100], [205, 90, 70], [255, 190, 160], [230, 110, 85]),
  palette([80, 210, 190], [40, 160, 150], [170, 240, 225], [60, 185, 170]),
  palette([180, 140, 240], [130, 95, 200], [220, 200, 255], [160, 120, 225]),
];
const PREDATOR_PALETTES = [
  palette([120, 140, 132], [70, 90, 86], [200, 210, 200], [100, 120, 112]),
  palette([176, 74, 74], [120, 44, 50], [230, 170, 160], [150, 60, 62]),
];
const ROLE_INDEX: Record<Role, number> = { B: 0, D: 1, L: 2, T: 3, E: -1 };

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
}

// Ticks run at 30 per second.
const SPECIES: Species[] = [
  { cruise: 0.34, burst: 0.85, vision: 16, metabolism: 0.0017, maxAge: [2700, 4200], mature: 450, breedAt: 0.88, breedCost: 0.45, breedCooldown: 360, litter: [1, 3] },
  { cruise: 0.28, burst: 1.05, vision: 40, metabolism: 0.0008, maxAge: [5400, 8100], mature: 900, breedAt: 0.8, breedCost: 0.5, breedCooldown: 1200, litter: [1, 1] },
];

// Energy each food cell is worth to a fish. Nutrients per unit of energy
// burned keeps the cycle roughly balanced (one plankton ~ 0.1 energy).
const FOOD_VALUE: Partial<Record<number, number>> = { [PLANKTON]: 0.1, [PELLET]: 0.3, [CORPSE]: 0.14, [KELP]: 0.06 };
const NUTRIENTS_PER_ENERGY = 10;

interface Agent {
  kind: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  facing: 1 | -1;
  energy: number;
  age: number;
  maxAge: number;
  breedCooldown: number;
  speed: number;
  palette: number;
  wander: number;
  target: number;
  scanIn: number;
  prey: Agent | null;
  alive: boolean;
}

const rand = (min: number, max: number) => min + Math.random() * (max - min);
const randInt = (min: number, max: number) => Math.floor(rand(min, max + 1));
const gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;

export class PixelOcean {
  w = 0;
  h = 0;
  mat = new Uint8Array(0);
  life = new Uint16Array(0);
  shade = new Uint8Array(0);
  height = new Uint16Array(0);
  stamp = new Uint8Array(0);
  kelpCap = new Uint16Array(0);
  vents: number[] = [];
  agents: Agent[] = [];
  nutrients = 0;
  tick = 0;
  pointer: { x: number; y: number } | null = null;

  private floorBase = 0;
  private respired = 0;
  private births = 0;
  private deaths: Record<DeathCause, number> = { starved: 0, oldAge: 0, eaten: 0 };
  private waterLut = new Uint32Array(0);
  private rayTex = new Uint8Array(256);

  constructor(w: number, h: number) {
    this.allocate(w, h);
    this.floorBase = Math.max(6, Math.round(h * 0.09));
    for (let x = 0; x < w; x++) this.buildColumn(x);
    this.scatterRocks();
    this.nutrients = Math.round((w * h) / 130);
    for (let n = Math.round((w * h) / 700); n > 0; n--) {
      const i = randInt(0, w * h - 1);
      if (this.mat[i] === WATER && this.nutrients > 0) this.place(i, PLANKTON, randInt(300, 1800));
    }
    const caps = this.caps();
    for (let n = Math.round(caps.minnows * 0.35); n > 0; n--) this.spawnAgent(MINNOW, null);
    for (let n = Math.round(caps.predators * 0.3); n > 0; n--) this.spawnAgent(PREDATOR, null);
    for (let i = 0; i < 256; i++) {
      const band = Math.sin(i / 256 * Math.PI * 6) * 0.5 + Math.sin(i / 256 * Math.PI * 14) * 0.3;
      this.rayTex[i] = Math.max(0, Math.min(7, Math.round((band + 0.2) * 6)));
    }
  }

  // --- world setup --------------------------------------------------------

  private allocate(w: number, h: number) {
    const n = w * h;
    this.w = w;
    this.h = h;
    this.mat = new Uint8Array(n);
    this.life = new Uint16Array(n);
    this.shade = new Uint8Array(n);
    this.height = new Uint16Array(n);
    this.stamp = new Uint8Array(n);
    this.kelpCap = new Uint16Array(w);
    for (let i = 0; i < n; i++) this.shade[i] = (Math.random() * 256) | 0;
    this.buildWaterLut();
  }

  private buildWaterLut() {
    const { h } = this;
    this.waterLut = new Uint32Array(h * 8);
    for (let y = 0; y < h; y++) {
      const t = y / Math.max(1, h - 1);
      const r = 14 + (2 - 14) * t;
      const g = 78 + (10 - 78) * t;
      const b = 140 + (36 - 140) * t;
      const rayStrength = Math.max(0, 1 - t * 1.6) * 5;
      for (let level = 0; level < 8; level++) {
        const add = level * rayStrength;
        this.waterLut[y * 8 + level] = rgb(
          Math.min(255, r + add * 0.5) | 0,
          Math.min(255, g + add * 0.9) | 0,
          Math.min(255, b + add) | 0,
        );
      }
    }
  }

  /** Sand depth (in cells, from the bottom) of a column: gentle dunes. */
  private floorDepth(x: number) {
    const base = this.floorBase;
    return Math.max(2, Math.round(base + Math.sin(x * 0.045) * base * 0.35 + Math.sin(x * 0.13 + 1.7) * base * 0.15));
  }

  private buildColumn(x: number) {
    const { w, h } = this;
    const top = h - this.floorDepth(x);
    for (let y = Math.max(0, top); y < h; y++) this.mat[y * w + x] = SAND;
    this.kelpCap[x] = 0;
    if (Math.random() < 0.11 && top > 4) this.plantKelp(x, top - 1, randInt(2, Math.round(h * 0.18)));
  }

  private plantKelp(x: number, rootY: number, initialHeight: number) {
    const { w, h } = this;
    this.kelpCap[x] = Math.round(h * rand(0.12, 0.35));
    const grow = Math.min(initialHeight, this.kelpCap[x]);
    for (let k = 0; k < grow; k++) {
      const y = rootY - k;
      if (y < 2 || this.mat[y * w + x] !== WATER) break;
      this.mat[y * w + x] = KELP;
      this.height[y * w + x] = k + 1;
    }
  }

  private scatterRocks() {
    const { w, h } = this;
    const count = Math.max(2, Math.round(w / 110));
    this.vents = [];
    for (let r = 0; r < count; r++) {
      const cx = randInt(8, w - 9);
      const cy = h - this.floorDepth(cx) + 1;
      const rx = randInt(5, 12);
      const ry = randInt(3, 7);
      let peak = -1;
      for (let y = cy - ry; y <= cy + ry; y++) {
        for (let x = cx - rx; x <= cx + rx; x++) {
          if (x < 0 || y < 0 || x >= w || y >= h) continue;
          const d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2;
          if (d > 1 - Math.random() * 0.25) continue;
          const i = y * w + x;
          this.mat[i] = ROCK;
          if (peak < 0 || y < Math.floor(peak / w)) peak = i;
        }
      }
      if (peak >= 0 && Math.random() < 0.7) this.vents.push(peak);
    }
  }

  /** Bottom-anchored resize: the seabed stays put and new columns get sand. */
  resize(w: number, h: number) {
    if (w === this.w && h === this.h) return;
    const old = { w: this.w, h: this.h, mat: this.mat, life: this.life, shade: this.shade, height: this.height, kelpCap: this.kelpCap };
    const dy = h - old.h;
    this.allocate(w, h);
    for (let y = 0; y < h; y++) {
      const oy = y - dy;
      if (oy < 0 || oy >= old.h) continue;
      for (let x = 0; x < Math.min(w, old.w); x++) {
        const i = y * w + x;
        const o = oy * old.w + x;
        this.mat[i] = old.mat[o];
        this.life[i] = old.life[o];
        this.shade[i] = old.shade[o];
        this.height[i] = old.height[o];
      }
    }
    for (let x = 0; x < w; x++) {
      if (x < old.w) this.kelpCap[x] = old.kelpCap[x];
      else this.buildColumn(x);
    }
    this.vents = this.vents
      .map(v => ({ x: v % old.w, y: Math.floor(v / old.w) + dy }))
      .filter(v => v.x < w && v.y >= 0 && v.y < h)
      .map(v => v.y * w + v.x)
      .filter(v => this.mat[v] === ROCK);
    for (const a of this.agents) {
      a.y += dy;
      if (a.x >= w - 2 || a.y < 1 || a.y >= h - 2) a.alive = false;
    }
    this.agents = this.agents.filter(a => a.alive);
  }

  // --- helpers ------------------------------------------------------------

  private place(i: number, m: number, life: number) {
    this.mat[i] = m;
    this.life[i] = life;
    this.shade[i] = (Math.random() * 256) | 0;
    this.height[i] = 0;
    if (m === PLANKTON) this.nutrients--;
  }

  private move(i: number, j: number, mark: number) {
    const { mat, life, shade, height } = this;
    const m = mat[j]; mat[j] = mat[i]; mat[i] = m;
    const l = life[j]; life[j] = life[i]; life[i] = l;
    const s = shade[j]; shade[j] = shade[i]; shade[i] = s;
    const hh = height[j]; height[j] = height[i]; height[i] = hh;
    this.stamp[j] = mark;
  }

  private light(y: number) {
    const t = 1 - y / this.h;
    return t * t;
  }

  private isSolid(x: number, y: number) {
    if (x < 0 || x >= this.w || y < 0 || y >= this.h) return true;
    const m = this.mat[y * this.w + x];
    return m === SAND || m === ROCK;
  }

  private caps() {
    const cells = this.w * this.h;
    return {
      minnows: Math.max(30, Math.min(200, Math.round(cells / 700))),
      predators: Math.max(1, Math.min(14, Math.round(cells / 9000))),
    };
  }

  dropFood(cx: number, cy: number) {
    const { w, h } = this;
    for (let n = 0; n < 12; n++) {
      const x = Math.round(cx + rand(-3, 3));
      const y = Math.round(cy + rand(-2, 2));
      if (x < 0 || y < 0 || x >= w || y >= h) continue;
      const i = y * w + x;
      if (this.mat[i] === WATER) this.place(i, PELLET, randInt(1800, 2700));
    }
  }

  setPointer(x: number, y: number) { this.pointer = { x, y }; }
  clearPointer() { this.pointer = null; }

  // --- simulation ---------------------------------------------------------

  step() {
    this.tick++;
    this.updateCells();
    this.updateBloom();
    this.updateAgents();
    // Anything past the ceiling is buried in the sediment, which keeps the
    // cycle bounded however the fish bookkeeping drifts.
    this.nutrients = Math.min(this.nutrients, Math.round((this.w * this.h) / 100));
  }

  private updateCells() {
    const { w, h, mat, life, stamp } = this;
    const mark = (this.tick % 255) + 1;
    const leftToRight = (this.tick & 1) === 0;

    for (let y = h - 1; y >= 0; y--) {
      const row = y * w;
      for (let k = 0; k < w; k++) {
        const x = leftToRight ? k : w - 1 - k;
        const i = row + x;
        const m = mat[i];
        if (m === WATER || m === ROCK || stamp[i] === mark) continue;

        switch (m) {
          case SAND: {
            if (y === h - 1) break;
            if (mat[i + w] === WATER || mat[i + w] === BUBBLE) { this.move(i, i + w, mark); break; }
            const dx = Math.random() < 0.5 ? -1 : 1;
            if (x + dx >= 0 && x + dx < w && mat[i + w + dx] === WATER && mat[i + dx] === WATER) this.move(i, i + w + dx, mark);
            break;
          }
          case PLANKTON: {
            if (--life[i] === 0) { mat[i] = WATER; this.nutrients++; break; }
            if (Math.random() > 0.25) break;
            const dx = randInt(-1, 1);
            const r = Math.random();
            const dy = r < 0.35 ? 1 : r < 0.62 ? -1 : 0;
            const nx = x + dx;
            const ny = y + dy;
            if (nx >= 0 && nx < w && ny >= 0 && ny < h && mat[ny * w + nx] === WATER) this.move(i, ny * w + nx, mark);
            break;
          }
          case PELLET:
          case CORPSE: {
            if (--life[i] === 0) { mat[i] = WATER; this.nutrients += m === PELLET ? 3 : 1; break; }
            if (y === h - 1 || Math.random() > (m === PELLET ? 0.5 : 0.35)) break;
            if (mat[i + w] === WATER) { this.move(i, i + w, mark); break; }
            const dx = Math.random() < 0.5 ? -1 : 1;
            if (x + dx >= 0 && x + dx < w && mat[i + w + dx] === WATER) this.move(i, i + w + dx, mark);
            break;
          }
          case BUBBLE: {
            if (y === 0 || --life[i] === 0) { mat[i] = WATER; break; }
            if (Math.random() > 0.8) break;
            const nx = x + (Math.random() < 0.3 ? randInt(-1, 1) : 0);
            if (nx >= 0 && nx < w && mat[i - w + nx - x] === WATER) this.move(i, i - w + nx - x, mark);
            else if (nx >= 0 && nx < w && mat[i + nx - x] === WATER) this.move(i, i + nx - x, mark);
            break;
          }
          case KELP:
            this.updateKelp(i, x, y);
            break;
        }
      }
    }
  }

  private updateKelp(i: number, x: number, y: number) {
    const { w, mat } = this;
    const isTip = y === 0 || mat[i - w] !== KELP;
    if (isTip) {
      const light = this.light(y);
      if (y > 2 && mat[i - w] === WATER && this.nutrients > 0 && this.height[i] < this.kelpCap[x]
        && Math.random() < 0.006 * light + 0.0015) {
        this.place(i - w, KELP, 0);
        this.height[i - w] = this.height[i] + 1;
        this.nutrients--;
      } else if (Math.random() < 0.00025) {
        mat[i] = WATER;
        this.nutrients++;
        return;
      }
    }
    // Kelp sheds plankton into the water beside it.
    if (this.nutrients > 0 && Math.random() < 0.0007) {
      const j = i + (Math.random() < 0.5 ? -1 : 1);
      if (j >= 0 && j < mat.length && mat[j] === WATER) this.place(j, PLANKTON, randInt(900, 1800));
    }
  }

  /** Plankton blooms in the sunlit water when nutrients allow; vents breathe. */
  private updateBloom() {
    const { w, h, mat } = this;
    const attempts = Math.max(2, Math.round((w * h) / 7000));
    const richness = this.nutrients / (this.nutrients + 300);
    for (let n = 0; n < attempts; n++) {
      const y = randInt(1, Math.round(h * 0.7));
      const i = y * w + randInt(0, w - 1);
      if (mat[i] === WATER && this.nutrients > 0 && Math.random() < this.light(y) * richness * 0.18) {
        this.place(i, PLANKTON, randInt(900, 1800));
      }
    }

    const target = (w * h) / 320;
    for (const v of this.vents) {
      if (Math.random() < 0.04 && v >= w && mat[v - w] === WATER) this.place(v - w, BUBBLE, 600);
      if (this.nutrients < target && Math.random() < 0.05) this.nutrients++;
    }

    // Now and then a spore takes root on bare sand.
    if (this.tick % 90 === 0 && this.nutrients > target * 0.5) {
      const x = randInt(1, w - 2);
      if (this.kelpCap[x] === 0) {
        let y = 0;
        while (y < h && mat[y * w + x] === WATER) y++;
        if (y < h && mat[y * w + x] === SAND && y > 6) this.plantKelp(x, y - 1, 1);
      }
    }
  }

  // --- fish ---------------------------------------------------------------

  private spawnAgent(kind: number, parent: Agent | null, atEdge = false, energy = rand(0.55, 0.9)): Agent | null {
    const { w, h } = this;
    let x = 0;
    let y = 0;
    for (let tries = 0; tries < 20; tries++) {
      x = parent ? parent.x + rand(-3, 3) : atEdge ? (Math.random() < 0.5 ? 2 : w - 3) : rand(4, w - 5);
      y = parent ? parent.y + rand(-2, 2) : rand(h * 0.12, h * 0.75);
      if (!this.isSolid(Math.round(x), Math.round(y))) break;
      if (tries === 19) return null;
    }
    const sp = SPECIES[kind];
    const palettes = kind === MINNOW ? MINNOW_PALETTES : PREDATOR_PALETTES;
    const mutate = !parent || Math.random() < 0.08;
    const agent: Agent = {
      kind,
      x,
      y,
      vx: atEdge ? (x < w / 2 ? 0.4 : -0.4) : rand(-0.2, 0.2),
      vy: 0,
      facing: x < w / 2 ? 1 : -1,
      energy,
      age: parent ? 0 : randInt(sp.mature, sp.maxAge[0]),
      maxAge: randInt(sp.maxAge[0], sp.maxAge[1]),
      breedCooldown: sp.breedCooldown,
      speed: parent ? Math.max(0.6, Math.min(1.5, parent.speed * (1 + gauss() * 0.08))) : rand(0.9, 1.1),
      palette: mutate ? randInt(0, palettes.length - 1) : parent!.palette,
      wander: rand(0, Math.PI * 2),
      target: -1,
      scanIn: randInt(0, 10),
      prey: null,
      alive: true,
    };
    this.agents.push(agent);
    return agent;
  }

  private spriteOf(a: Agent) {
    if (a.kind === PREDATOR) return PREDATOR_SPRITE;
    return a.age < SPECIES[MINNOW].mature ? FRY_SPRITE : MINNOW_SPRITE;
  }

  private kill(a: Agent, cause: DeathCause) {
    a.alive = false;
    this.deaths[cause]++;
    if (cause === 'eaten') return;
    // The body stays behind as corpse pixels that sink and rot.
    const { w, h } = this;
    const cx = Math.round(a.x);
    const cy = Math.round(a.y);
    for (const p of this.spriteOf(a).pixels) {
      const x = cx + p.dx * a.facing;
      const y = cy + p.dy;
      if (x < 0 || y < 0 || x >= w || y >= h) continue;
      const i = y * w + x;
      if (this.mat[i] === WATER) this.place(i, CORPSE, randInt(500, 1100));
    }
  }

  private isFood(kind: number, i: number) {
    const m = this.mat[i];
    if (kind === PREDATOR) return m === CORPSE || m === PELLET;
    return m === PLANKTON || m === PELLET || m === CORPSE;
  }

  /** Minnows nibble kelp tips they brush past, but never seek kelp out. */
  private isKelpTip(i: number) {
    return this.mat[i] === KELP && (i < this.w || this.mat[i - this.w] !== KELP);
  }

  /** Nearest food cell within sight; pellets count as closer (fish love them). */
  private scanForFood(a: Agent) {
    const { w, h } = this;
    const r = SPECIES[a.kind].vision;
    const cx = Math.round(a.x);
    const cy = Math.round(a.y);
    let best = -1;
    let bestScore = Infinity;
    for (let y = Math.max(0, cy - r); y <= Math.min(h - 1, cy + r); y++) {
      for (let x = Math.max(0, cx - r); x <= Math.min(w - 1, cx + r); x++) {
        const i = y * w + x;
        if (!this.isFood(a.kind, i)) continue;
        let score = (x - cx) ** 2 + (y - cy) ** 2;
        if (this.mat[i] === PELLET) score *= 0.4;
        if (score < bestScore) { bestScore = score; best = i; }
      }
    }
    return best;
  }

  private updateAgents() {
    const { agents } = this;
    const caps = this.caps();
    for (let n = 0, count = agents.length; n < count; n++) {
      const a = agents[n];
      if (a.alive) this.updateAgent(a, caps);
    }
    this.agents = agents.filter(a => a.alive);
    let minnows = 0;
    let predators = 0;
    for (const a of this.agents) {
      if (a.kind === MINNOW) minnows++;
      else predators++;
    }

    // Newcomers drift in from the edges so a crashed population can recover.
    if (this.tick % 150 === 0) {
      if (minnows < caps.minnows * 0.12) {
        for (let k = 0; k < 5; k++) this.spawnAgent(MINNOW, null, true);
      }
      if (predators === 0 && minnows > caps.minnows * 0.5 && Math.random() < 0.35) {
        this.spawnAgent(PREDATOR, null, true);
      }
    }
  }

  private updateAgent(a: Agent, caps: { minnows: number; predators: number }) {
    const sp = SPECIES[a.kind];
    const { w, h } = this;
    a.age++;
    if (a.breedCooldown > 0) a.breedCooldown--;

    let ax = 0;
    let ay = 0;
    let maxSpeed = sp.cruise * a.speed;
    let burning = 1;

    if (a.kind === MINNOW) {
      // Flee the nearest predator (or a cursor that comes too close).
      let threatX = 0;
      let threatY = 0;
      let threatD = Infinity;
      for (const o of this.agents) {
        if (o.kind !== PREDATOR || !o.alive) continue;
        const d = (o.x - a.x) ** 2 + (o.y - a.y) ** 2;
        if (d < threatD) { threatD = d; threatX = o.x; threatY = o.y; }
      }
      if (this.pointer) {
        const d = (this.pointer.x - a.x) ** 2 + (this.pointer.y - a.y) ** 2;
        if (d < 64 && d < threatD) { threatD = d; threatX = this.pointer.x; threatY = this.pointer.y; }
      }
      if (threatD < 144) {
        const d = Math.sqrt(threatD) || 1;
        ax += (a.x - threatX) / d * 0.14;
        ay += (a.y - threatY) / d * 0.14;
        maxSpeed = sp.burst * a.speed;
        burning = 1.8;
        a.target = -1;
      } else if (a.energy < 0.75) {
        this.steerToFood(a);
      } else {
        this.school(a);
      }
    } else {
      if (a.energy < 0.8) {
        const prey = this.findPrey(a);
        if (prey) {
          const lead = 5;
          const dx = prey.x + prey.vx * lead - a.x;
          const dy = prey.y + prey.vy * lead - a.y;
          const d = Math.hypot(dx, dy) || 1;
          ax += dx / d * 0.08;
          ay += dy / d * 0.08;
          maxSpeed = sp.burst * a.speed;
          burning = 1.5;
          if (Math.hypot(prey.x - (a.x + a.facing * 4), prey.y - a.y) < 3.2) {
            this.kill(prey, 'eaten');
            a.energy = Math.min(1, a.energy + 0.32 + prey.energy * 0.2);
            this.nutrients += 6;
            a.prey = null;
          }
        } else if (a.energy < 0.4) {
          this.steerToFood(a);
        }
      }
    }

    // Wander, stay off the surface and out of the edges.
    a.wander += rand(-0.25, 0.25);
    ax += Math.cos(a.wander) * 0.015;
    ay += Math.sin(a.wander) * 0.008;
    if (a.y < 4) ay += 0.04;
    if (a.x < 4) ax += 0.05;
    if (a.x > w - 5) ax -= 0.05;
    if (this.isSolid(Math.round(a.x), Math.round(a.y) + 3)) ay -= 0.03;

    a.vx = (a.vx + ax) * 0.95;
    a.vy = (a.vy + ay) * 0.95;
    const speed = Math.hypot(a.vx, a.vy);
    if (speed > maxSpeed) { a.vx *= maxSpeed / speed; a.vy *= maxSpeed / speed; }

    const nx = a.x + a.vx;
    const ny = a.y + a.vy;
    if (!this.isSolid(Math.round(nx), Math.round(ny))) { a.x = nx; a.y = ny; }
    else if (!this.isSolid(Math.round(nx), Math.round(a.y))) { a.x = nx; a.vy = -Math.abs(a.vy) - 0.05; }
    else { a.vx = -a.vx; a.vy = -Math.abs(a.vy) - 0.08; }
    a.x = Math.max(1, Math.min(w - 2, a.x));
    a.y = Math.max(1, Math.min(h - 2, a.y));
    if (a.vx > 0.03) a.facing = 1;
    else if (a.vx < -0.03) a.facing = -1;

    this.eat(a);

    const burned = sp.metabolism * (0.6 + 0.4 * a.speed * a.speed) * burning;
    a.energy -= burned;
    this.respired += burned * NUTRIENTS_PER_ENERGY;
    if (this.respired >= 1) { const whole = Math.floor(this.respired); this.nutrients += whole; this.respired -= whole; }

    if (a.energy <= 0) { this.kill(a, 'starved'); return; }
    if (a.age > a.maxAge) { this.kill(a, 'oldAge'); return; }

    if (a.energy > sp.breedAt && a.age > sp.mature && a.breedCooldown === 0) {
      const cap = a.kind === MINNOW ? caps.minnows : caps.predators;
      const room = cap - this.agents.filter(o => o.alive && o.kind === a.kind).length;
      if (room <= 0) return;
      a.energy -= sp.breedCost;
      a.breedCooldown = sp.breedCooldown;
      // The litter shares what the parent spent, so breeding never makes energy.
      const litter = Math.min(room, randInt(sp.litter[0], sp.litter[1]));
      for (let k = 0; k < litter; k++) {
        if (this.spawnAgent(a.kind, a, false, sp.breedCost / litter)) this.births++;
      }
      const i = Math.round(a.y - 2) * w + Math.round(a.x);
      if (i >= 0 && this.mat[i] === WATER) this.place(i, BUBBLE, 400);
    }

    if (Math.random() < 0.002) {
      const i = Math.round(a.y - 1) * w + Math.round(a.x + a.facing * 2);
      if (i >= 0 && i < this.mat.length && this.mat[i] === WATER) this.place(i, BUBBLE, 400);
    }
  }

  private steerToFood(a: Agent) {
    if (a.target >= 0 && !this.isFood(a.kind, a.target)) a.target = -1;
    if (--a.scanIn <= 0 || (a.target < 0 && a.scanIn < 8)) {
      a.target = this.scanForFood(a);
      a.scanIn = 12;
    }
    if (a.target < 0) return;
    const tx = a.target % this.w;
    const ty = Math.floor(a.target / this.w);
    const dx = tx - (a.x + a.facing * 2);
    const dy = ty - a.y;
    const d = Math.hypot(dx, dy) || 1;
    a.vx += dx / d * 0.05;
    a.vy += dy / d * 0.05;
  }

  private school(a: Agent) {
    let n = 0;
    let avx = 0, avy = 0, cx = 0, cy = 0, sx = 0, sy = 0;
    for (const o of this.agents) {
      if (o === a || o.kind !== MINNOW || !o.alive) continue;
      const dx = o.x - a.x;
      const dy = o.y - a.y;
      const d2 = dx * dx + dy * dy;
      if (d2 > 144) continue;
      n++;
      avx += o.vx; avy += o.vy;
      cx += dx; cy += dy;
      if (d2 < 9) { sx -= dx; sy -= dy; }
    }
    if (n === 0) return;
    a.vx += (avx / n - a.vx) * 0.05 + cx / n * 0.004 + sx * 0.03;
    a.vy += (avy / n - a.vy) * 0.05 + cy / n * 0.004 + sy * 0.03;
  }

  private findPrey(a: Agent) {
    if (a.prey && a.prey.alive && (a.prey.x - a.x) ** 2 + (a.prey.y - a.y) ** 2 < 60 ** 2) return a.prey;
    const r2 = SPECIES[PREDATOR].vision ** 2;
    let best: Agent | null = null;
    let bestD = r2;
    for (const o of this.agents) {
      if (o.kind !== MINNOW || !o.alive) continue;
      const d = (o.x - a.x) ** 2 + (o.y - a.y) ** 2;
      if (d < bestD) { bestD = d; best = o; }
    }
    a.prey = best;
    return best;
  }

  /** Eat whatever food is right at the mouth. */
  private eat(a: Agent) {
    const { w, h } = this;
    const mx = Math.round(a.x + a.facing * this.spriteOf(a).halfW);
    const my = Math.round(a.y);
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const x = mx + dx;
        const y = my + dy;
        if (x < 0 || y < 0 || x >= w || y >= h || a.energy >= 1) continue;
        const i = y * w + x;
        const nibble = a.kind === MINNOW && this.isKelpTip(i) && Math.random() < 0.03;
        if (!nibble && !this.isFood(a.kind, i)) continue;
        if (nibble) this.nutrients++;
        a.energy = Math.min(1, a.energy + (FOOD_VALUE[this.mat[i]] ?? 0) * (a.kind === PREDATOR ? 0.6 : 1));
        this.mat[i] = WATER;
        if (i === a.target) a.target = -1;
      }
    }
  }

  // --- rendering ----------------------------------------------------------

  render(buf: Uint32Array) {
    const { w, h, mat, shade, waterLut, rayTex } = this;
    const drift = (this.tick >> 2) & 255;

    for (let y = 0; y < h; y++) {
      const row = y * w;
      const lutRow = y * 8;
      const rayRow = (y >> 1) + drift;
      for (let x = 0; x < w; x++) {
        const i = row + x;
        const m = mat[i];
        const s = shade[i];
        switch (m) {
          case SAND: buf[i] = SAND_COLORS[s & 3]; break;
          case ROCK: buf[i] = ROCK_COLORS[s & 3]; break;
          case PLANKTON: buf[i] = PLANKTON_COLORS[s % 3]; break;
          case PELLET: buf[i] = PELLET_COLORS[s % 3]; break;
          case CORPSE: buf[i] = CORPSE_COLORS[s & 3]; break;
          case BUBBLE: buf[i] = BUBBLE_COLORS[s & 1]; break;
          default: buf[i] = waterLut[lutRow + rayTex[(x + rayRow) & 255]];
        }
      }
    }

    // Kelp sways: each cell is drawn shifted by a wave that grows with height.
    const t = this.tick * 0.05;
    for (let y = 0; y < h; y++) {
      const row = y * w;
      for (let x = 0; x < w; x++) {
        const i = row + x;
        if (mat[i] !== KELP) continue;
        const hh = this.height[i];
        const amp = Math.min(2.4, hh / 9);
        const sx = x + Math.round(Math.sin(t + x * 0.7 - hh * 0.18) * amp);
        if (sx < 0 || sx >= w) continue;
        const isTip = y === 0 || mat[i - w] !== KELP;
        buf[row + sx] = isTip ? KELP_TIP_COLORS[shade[i] & 1] : KELP_COLORS[shade[i] & 3];
      }
    }

    for (const v of this.vents) {
      if (v >= 0 && v < buf.length) buf[v] = VENT_COLORS[((this.tick >> 3) + v) % 3];
    }

    for (const a of this.agents) {
      const colors = a.kind === MINNOW ? MINNOW_PALETTES[a.palette] : PREDATOR_PALETTES[a.palette];
      const cx = Math.round(a.x);
      const cy = Math.round(a.y);
      // A starving fish fades toward grey.
      const pale = a.energy < 0.2;
      for (const p of this.spriteOf(a).pixels) {
        const x = cx + p.dx * a.facing;
        const y = cy + p.dy;
        if (x < 0 || y < 0 || x >= w || y >= h) continue;
        const role = ROLE_INDEX[p.role];
        buf[y * w + x] = role < 0 ? EYE : pale ? CORPSE_COLORS[role & 3] : colors[role];
      }
    }
  }

  stats(): OceanStats {
    const { mat } = this;
    let plankton = 0, kelp = 0, food = 0, corpses = 0;
    for (let i = 0; i < mat.length; i++) {
      const m = mat[i];
      if (m === PLANKTON) plankton++;
      else if (m === KELP) kelp++;
      else if (m === PELLET) food++;
      else if (m === CORPSE) corpses++;
    }
    let minnows = 0, predators = 0;
    for (const a of this.agents) {
      if (a.kind === MINNOW) minnows++;
      else predators++;
    }
    return {
      minnows,
      predators,
      plankton,
      kelp,
      food,
      corpses,
      nutrients: this.nutrients,
      births: this.births,
      deaths: { ...this.deaths },
    };
  }
}
