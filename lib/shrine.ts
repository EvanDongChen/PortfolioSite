// The shrine forest: the living background of the shrine page, seen from
// slightly above with the same camera as the reef and the pond. It is always
// night here. Moss and cedars run the length of the page with a flagstone
// approach winding down through them, and along it stand shrine precincts,
// a koi pond or two, bamboo groves, maple glades and a pagoda.
//
// The story is an old rivalry: tanuki and kitsune both want the offerings the
// broom spirits leave out, and the brooms swat away anything they catch at
// the stands. So either rival may set a leaf on its head and turn, with a puff
// of smoke, into a teapot, a lantern or a stone statue, then creep up to an
// offering a hop at a time whenever it thinks nobody is looking. That means
// the visitor too: the cursor freezes them, and clicking one gives it away.
//
// No DOM here, so it can be stepped in Node. World units are art pixels: x
// across, z down the page, h up off the ground.

import type { DisguiseKind, OfferingKind, ParadeKind } from './shrineArt';

export const TICKS_PER_SECOND = 30;
/** How far up the screen one unit of height lifts a thing, in cells (as on the reef). */
export const ELEVATION = 0.55;

export interface ClearZone { x0: number; z0: number; x1: number; z1: number }

export type ShrineSpecies = 'tanuki' | 'kitsune' | 'hahaki' | 'mouse' | 'hare' | 'deer' | 'owl' | 'bat' | 'crow' | 'frog' | 'koi' | 'kappa' | 'kodama' | 'hitodama' | 'kasa' | 'chochin';
export const SHRINE_SPECIES_LIST: ShrineSpecies[] = ['tanuki', 'kitsune', 'hahaki', 'mouse', 'hare', 'deer', 'owl', 'bat', 'crow', 'frog', 'koi', 'kappa', 'kodama', 'hitodama', 'kasa', 'chochin'];

export type ShrineMood = 'wandering' | 'sniffing' | 'sneaking' | 'pretending' | 'changing' | 'eating' | 'facing off' | 'scrapping' | 'fleeing' | 'sleeping' | 'drumming' | 'barking' | 'hunting' | 'pouncing' | 'following' | 'courting'
  | 'sweeping' | 'carrying' | 'bowing' | 'shooing' | 'puzzled' | 'grazing' | 'perched' | 'flying' | 'swooping' | 'sitting' | 'swimming' | 'hopping' | 'drifting' | 'watching' | 'thieving' | 'spilling';

interface SpeciesInfo {
  label: string; names: string[]; speed: number; palettes: number;
  /** Ticks until grown and until old; how fast it gets hungry; how many one page of forest can hold. */
  mature: number; old: number; hunger: number; perArea: number; min: number;
}
const MIN = TICKS_PER_SECOND * 60;
/** Cells of forest that hold one of each `perArea`. */
export const SHRINE_SPECIES: Record<ShrineSpecies, SpeciesInfo> = {
  tanuki: { label: 'Tanuki', names: ['Ponta', 'Bunbuku', 'Mameta', 'Danzaburo', 'Shibaemon', 'Kincho', 'Rokuemon', 'Tarobo'], speed: 0.24, palettes: 3, mature: 3 * MIN, old: 24 * MIN, hunger: 0.00006, perArea: 75000, min: 4 },
  kitsune: { label: 'Kitsune', names: ['Kuzunoha', 'Tamamo', 'Akane', 'Kon', 'Yuki', 'Otora', 'Hatsu', 'Shiro'], speed: 0.31, palettes: 3, mature: 3 * MIN, old: 24 * MIN, hunger: 0.00007, perArea: 75000, min: 4 },
  hahaki: { label: 'Broom spirit', names: ['Old Bristle', 'Sasara', 'Takebo', 'Hokiji'], speed: 0.26, palettes: 1, mature: 0, old: Infinity, hunger: 0, perArea: 200000, min: 3 },
  mouse: { label: 'Field mouse', names: ['Mouse'], speed: 0.3, palettes: 1, mature: MIN / 2, old: 8 * MIN, hunger: 0.00005, perArea: 60000, min: 6 },
  hare: { label: 'Hare', names: ['Hare'], speed: 0.34, palettes: 1, mature: MIN, old: 14 * MIN, hunger: 0.00004, perArea: 110000, min: 3 },
  deer: { label: 'Sika deer', names: ['Shika', 'Momiji', 'Nara', 'Kasuga'], speed: 0.16, palettes: 1, mature: 3 * MIN, old: 30 * MIN, hunger: 0.00002, perArea: 160000, min: 3 },
  owl: { label: 'Ural owl', names: ['Owl'], speed: 0.8, palettes: 1, mature: MIN, old: 30 * MIN, hunger: 0.00008, perArea: 150000, min: 2 },
  bat: { label: 'Bat', names: ['Bat'], speed: 0.8, palettes: 1, mature: 0, old: 20 * MIN, hunger: 0.0001, perArea: 150000, min: 3 },
  crow: { label: 'Crow', names: ['Crow'], speed: 0.7, palettes: 1, mature: 0, old: 30 * MIN, hunger: 0.00005, perArea: 300000, min: 2 },
  frog: { label: 'Frog', names: ['Frog'], speed: 0.1, palettes: 1, mature: 0, old: 20 * MIN, hunger: 0.00003, perArea: Infinity, min: 0 },
  koi: { label: 'Koi', names: ['Benigoi', 'Kohaku', 'Ogon', 'Showa', 'Tancho', 'Hikari'], speed: 0.16, palettes: 5, mature: 0, old: Infinity, hunger: 0, perArea: Infinity, min: 0 },
  kappa: { label: 'Kappa', names: ['Kawataro', 'Gataro', 'Sara'], speed: 0.15, palettes: 1, mature: 0, old: Infinity, hunger: 0, perArea: Infinity, min: 0 },
  kodama: { label: 'Kodama', names: ['Kodama'], speed: 0.06, palettes: 1, mature: 0, old: Infinity, hunger: 0, perArea: Infinity, min: 0 },
  hitodama: { label: 'Hitodama', names: ['Soul-flame'], speed: 0.1, palettes: 2, mature: 0, old: Infinity, hunger: 0, perArea: 130000, min: 3 },
  kasa: { label: 'Kasa-obake', names: ['Old Umbrella'], speed: 0.2, palettes: 1, mature: 0, old: Infinity, hunger: 0, perArea: 280000, min: 1 },
  chochin: { label: 'Chochin-obake', names: ['Old Lantern'], speed: 0.1, palettes: 1, mature: 0, old: Infinity, hunger: 0, perArea: 280000, min: 1 },
};

export interface ShrineCreature {
  id: number; species: ShrineSpecies; name: string; alive: boolean; adopted: boolean; lineId: number;
  x: number; z: number; h: number; vx: number; vz: number; vh: number;
  facing: 1 | -1; turnHold: number; squash: number;
  age: number; energy: number; palette: number; mood: ShrineMood;
  /** What it is doing, and how much longer. */
  state: string; timer: number;
  tx: number; tz: number;
  parent: ShrineCreature | null;
  foe: ShrineCreature | null;
  prey: ShrineCreature | null;
  altar: Altar | null;
  /** Hidden inside a scrap's dust cloud. */
  hidden: boolean;
  /** What it is pretending to be (tanuki and kitsune only), and for how much longer. */
  disguise: DisguiseKind | null; sneakLeft: number;
  /** Set while a disguise is creeping along on its little feet. */
  scuttling: boolean;
  /** How long the tail has been sticking out by mistake. */
  tailOut: number;
  /** A speech mark over its head: '!', '?', 'z', a note or a heart, and for how long. */
  emote: Emote | null; emoteT: number;
  carrying: OfferingKind | null;
  /** Up on a bridge's arch, its height set by the deck. */
  onBridge: boolean;
  /** Which cedar or pond it belongs to. */
  home: { x: number; z: number; h: number } | null;
  pond: Water | null;
}
export type Emote = 'bang' | 'what' | 'zed' | 'note' | 'heart';

/** Tall or solid things in the scene. */
export type PropKind = 'cedar' | 'sacred' | 'maple' | 'goldMaple' | 'torii' | 'honden' | 'pagoda' | 'hokora' | 'jizo' | 'foxStatue' | 'tanukiStatue' | 'lionStatue' | 'rock' | 'spout';
export interface Prop { kind: PropKind; x: number; z: number; size: number; seed: number; flip: boolean }
/** Low plants, baked into the floor. */
export type LowPlant = 'fern' | 'grass' | 'shroom' | 'hydrangea' | 'lily' | 'persimmon';
export interface Low { kind: LowPlant; x: number; z: number; seed: number; variant: number }
/** A stem that sways and bends away from whatever brushes it. */
export interface Cane { kind: 'bamboo' | 'susuki'; x: number; z: number; len: number; seed: number; phase: number; bx: number; bv: number }
export interface Lantern { x: number; z: number; phase: number; mossy: number }
/** A rope strung across the approach for the festival, hung with paper lanterns. */
export interface Festoon { x0: number; x1: number; z: number; seed: number }
export interface Altar { x: number; z: number; item: OfferingKind | null; favourite: OfferingKind; bites: number; wait: number; shrine: boolean }
export interface Water { x: number; z: number; rx: number; rz: number; moonX: number; moonZ: number }
export interface Bridge { x: number; z: number; w: number }
export interface Pad { x: number; z: number; r: number; tone: number; flower: number; phase: number; load: number }
export type MoteKind = 'smoke' | 'dust' | 'star' | 'note' | 'heart' | 'leaf' | 'crumb' | 'blood' | 'tuft' | 'ring' | 'ember' | 'petal' | 'splash' | 'greenLeaf';
export interface Mote { kind: MoteKind; x: number; z: number; h: number; vx: number; vz: number; vh: number; life: number; max: number; seed: number }
export interface Firefly { x: number; z: number; h: number; vx: number; vz: number; phase: number; life: number }
export interface Moth { lantern: Lantern; a: number; r: number; h: number; x: number; z: number; alive: boolean; wait: number }
export interface SkyLantern { x: number; z: number; h: number; drift: number; life: number; floating: Water | null; phase: number }
export interface Tussle { x: number; z: number; a: ShrineCreature; b: ShrineCreature; t: number; dur: number }

/** One marcher in the night parade. */
export interface Marcher {
  kind: ParadeKind | 'kasa' | 'chochin' | 'hitodama' | 'teapot';
  /** How many rows behind the head of the line it walks, and how far off the middle of the path. */
  back: number; side: number;
  x: number; z: number; h: number; facing: 1 | -1; phase: number; fly: boolean;
}
/** The line, walking down the approach: `head` is how far along the path its front has come, `headRow` and `tailRow` the rows its ends are on. */
export interface Parade { head: number; headRow: number; tailRow: number; speed: number; length: number; marchers: Marcher[] }

export type ShrineHappening = 'festival' | 'fireflies' | 'parade';
export type SiteKind = 'hall' | 'inari' | 'den' | 'koi' | 'bamboo' | 'lilies' | 'maples' | 'sacred' | 'pagoda' | 'zen';
const SITE_KINDS: SiteKind[] = ['hall', 'koi', 'inari', 'maples', 'den', 'bamboo', 'sacred', 'lilies', 'pagoda', 'zen'];
export interface Site { kind: SiteKind; x: number; z: number; rx: number; rz: number }

export type ShrineSpawnable = ShrineSpecies | 'teapot' | 'lantern' | 'statue';
export type ShrineEventKind = 'shift' | 'offering' | 'scrap' | 'caught' | 'theft' | 'eaten' | 'birth' | 'visit' | 'death';
export interface ShrineEvent { tick: number; kind: ShrineEventKind; text: string; starred: boolean }
export type ShrineDeath = 'eaten' | 'starved' | 'oldAge';
export interface ShrineStats {
  tick: number;
  counts: Record<ShrineSpecies, number>;
  disguised: number;
  score: { tanuki: number; kitsune: number };
  scraps: number; shifts: number; caught: number; stocked: number; altars: number;
  births: number; meals: number;
  deaths: Record<ShrineDeath, number>;
  fireflies: number;
  happening: { kind: ShrineHappening; progress: number } | null;
  events: ShrineEvent[];
}

const rng = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const hash2 = (x: number, y: number) => {
  let h = Math.imul(x, 374761393) + Math.imul(y, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};
/** Soft value noise, for the moss's hummocks. */
const noise = (x: number, y: number) => {
  const xi = Math.floor(x), yi = Math.floor(y);
  const fx = x - xi, fy = y - yi;
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
  const a = hash2(xi, yi), b = hash2(xi + 1, yi), c = hash2(xi, yi + 1), d = hash2(xi + 1, yi + 1);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
};
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const dist = (a: { x: number; z: number }, b: { x: number; z: number }) => Math.hypot(a.x - b.x, a.z - b.z);
const pick = <T>(list: T[]) => list[Math.floor(Math.random() * list.length)];
const between = (a: number, b: number) => a + Math.random() * (b - a);
const pickR = <T>(r: () => number, list: T[]) => list[Math.floor(r() * list.length)];

export const GROUND = { moss: 0, stone: 1, gravel: 2, water: 3, rim: 4 } as const;

const PATH_HALF = 7;
const RIVALS: ShrineSpecies[] = ['tanuki', 'kitsune'];
const OFFER_FOR_STANDS: OfferingKind[] = ['rice', 'mikan', 'fish', 'rice', 'mikan'];
const MAX_MOTES = 700;
const HAPPENING_LENGTH: Record<ShrineHappening, number> = { festival: 60 * TICKS_PER_SECOND, fireflies: 50 * TICKS_PER_SECOND, parade: 120 * TICKS_PER_SECOND };

export class Shrine {
  w = 0;
  h = 0;
  tick = 0;
  seed = Math.floor(Math.random() * 1e9);
  /** Bumped when the scene is rebuilt, so the view knows to repaint. */
  version = 0;
  ground = new Uint8Array(0);
  /** Whether a walker can't pass (trunks, buildings, water). */
  solid = new Uint8Array(0);
  terrain = new Uint8Array(0);
  /** Each row's x along the approach. */
  pathX = new Float32Array(0);
  /** How far along the path each row is, counting its bends. */
  pathArc = new Float32Array(0);
  props: Prop[] = [];
  low: Low[] = [];
  canes: Cane[] = [];
  lanterns: Lantern[] = [];
  festoons: Festoon[] = [];
  altars: Altar[] = [];
  waters: Water[] = [];
  bridges: Bridge[] = [];
  pads: Pad[] = [];
  sites: Site[] = [];
  private maples: Prop[] = [];
  private cedars: Prop[] = [];
  private dens: { kind: ShrineSpecies; x: number; z: number }[] = [];

  creatures: ShrineCreature[] = [];
  motes: Mote[] = [];
  fireflies: Firefly[] = [];
  moths: Moth[] = [];
  skies: SkyLantern[] = [];
  tussles: Tussle[] = [];
  parade: Parade | null = null;
  happening: { kind: ShrineHappening; t: number; dur: number } | null = null;
  /** How far the lanterns have gone over to ghost blue for the parade (0 to 1), and how far the festival has lit up. */
  ghostLight = 0;
  festivalLight = 0;
  /** How far the fireflies' flashes have fallen into step. */
  syncFlash = 0;
  nextHappening = 50 * TICKS_PER_SECOND;
  private happeningOrder: ShrineHappening[] = ['fireflies', 'parade', 'festival'];
  spout = { tip: 0, t: 0 };

  viewZ = { z0: 0, z1: 200 };
  private zones: ClearZone[] = [];
  private pointer: { x: number; z: number } | null = null;
  private nextId = 1;
  private lastCheck = 0;
  private births = 0;
  private meals = 0;
  private scraps = 0;
  private shifts = 0;
  private caught = 0;
  private score = { tanuki: 0, kitsune: 0 };
  private deaths: Record<ShrineDeath, number> = { eaten: 0, starved: 0, oldAge: 0 };
  private events: ShrineEvent[] = [];

  constructor(w: number, h: number, view: { z0: number; z1: number }, zones: ClearZone[]) {
    this.viewZ = view;
    this.zones = zones;
    this.build(w, h);
    this.stock();
  }

  // --- laying out the forest --------------------------------------------------

  /** Whether something standing at (x, z) and rising this far would cover a clear zone. */
  private inZone(x: number, z: number, halfW: number, tall: number, pad = 0) {
    for (const k of this.zones) {
      if (x + halfW > k.x0 - pad && x - halfW < k.x1 + pad && z > k.z0 - pad && z - tall * 1 < k.z1 + pad) return true;
    }
    return false;
  }

  /**
   * Lays out the whole scene. Seeded, so that when the page only grows taller
   * (fonts and images arriving) everything that was already there stays put.
   */
  private build(w: number, h: number) {
    this.w = w;
    this.h = h;
    this.version++;
    const r = rng(this.seed);
    const n = w * h;
    this.ground = new Uint8Array(n);
    this.solid = new Uint8Array(n);
    this.terrain = new Uint8Array(n);
    this.pathX = new Float32Array(h);
    this.props = []; this.low = []; this.canes = []; this.lanterns = []; this.festoons = [];
    this.altars = []; this.waters = []; this.bridges = []; this.pads = []; this.sites = [];
    this.dens = [];

    for (let z = 0; z < h; z++) {
      for (let x = 0; x < w; x++) {
        const v = noise(x * 0.018, z * 0.018) * 0.6 + noise(x * 0.06, z * 0.06) * 0.3 + noise(x * 0.17, z * 0.17) * 0.1;
        this.terrain[z * w + x] = clamp(v * 255, 0, 255);
      }
    }

    // The approach, winding down the page from one side to the other.
    const a = r() * 6.28, b = r() * 6.28;
    const swing = Math.min(w * 0.3, 110);
    for (let z = 0; z < h; z++) {
      this.pathX[z] = w / 2 + Math.sin(z * 0.0055 + a) * swing + Math.sin(z * 0.017 + b) * swing * 0.22;
    }

    // Precincts down the page, every kind before any repeats, on alternate sides.
    // The first goes opposite the way the path leaves the hero text.
    let queue: SiteKind[] = [];
    let side = 1;
    const planned: { kind: SiteKind; x: number; z: number; k: number }[] = [];
    const hero = this.zones[0];
    let z = hero ? Math.min(h - 1, hero.z1 + 30) : 80;
    // Something beside the hero, in the opening view.
    const opening: SiteKind[] = ['koi', 'hall', 'sacred'];
    const used = new Set<SiteKind>();
    while (z < h - 30) {
      if (!queue.length) queue = SITE_KINDS.slice().sort(() => r() - 0.5);
      let kind = opening.shift();
      if (kind) used.add(kind);
      else {
        do kind = queue.pop() as SiteKind; while (used.has(kind) && queue.length);
        used.clear();
      }
      const sprawl = r() < 0.3 ? 1.5 : 1;
      const gutter = Math.min(w * 0.16, 62);
      const x = clamp(side < 0 ? gutter : w - gutter, 40, w - 40);
      planned.push({ kind, x: x + (r() - 0.5) * 18, z, k: kind === 'koi' && w < 260 ? 0.45 : sprawl });
      z += 118 + r() * 60;
      side = -side;
    }

    // The approach bends round the hero text and anything solid in its way, then is paved.
    for (let pass = 0; pass < 2; pass++) {
      for (const q of this.zones) {
        if (q.x0 > PATH_HALF * 2 + 8) this.bendPath(q.x0 - 6, q.x1, q.z0 - 6, q.z1 + 6, -1);
      }
      for (const s of planned) {
        const box = siteBox(s.kind, s.x, s.z, s.k);
        if (box) this.bendPath(box.x0, box.x1, box.z0, box.z1, s.x < w / 2 ? 1 : -1);
      }
    }
    for (let row = 0; row < h; row++) {
      this.pathX[row] = clamp(this.pathX[row], PATH_HALF + 2, w - PATH_HALF - 3);
      const half = PATH_HALF + Math.sin(row * 0.04) * 1;
      for (let x = Math.max(0, Math.floor(this.pathX[row] - half)); x < Math.min(w, this.pathX[row] + half); x++) this.ground[row * w + x] = GROUND.stone;
    }
    this.pathArc = new Float32Array(h);
    for (let row = 1; row < h; row++) this.pathArc[row] = this.pathArc[row - 1] + Math.hypot(1, this.pathX[row] - this.pathX[row - 1]);
    for (const s of planned) this.placeSite(s.kind, s.x, s.z, s.k, r);

    // Lanterns line the approach, a torii every so far, and a festoon for the festival.
    for (let row = 20, k = 0; row < h - 4; row += 34, k++) {
      const x = this.pathX[row] + (k & 1 ? 1 : -1) * (PATH_HALF + 5);
      if (!this.inZone(x, row, 4, 6)) this.lanterns.push({ x, z: row, phase: r() * 100, mossy: r() < 0.4 ? 1 : 0 });
      if (k % 3 === 1) {
        const c = this.pathX[row];
        this.festoons.push({ x0: c - PATH_HALF - 8, x1: c + PATH_HALF + 8, z: row, seed: Math.floor(r() * 1000) });
      }
    }
    const gutter = Math.min(w * 0.11, 42);
    for (let row = 40, k = 0; row < h - 4; row += 58 + Math.floor(r() * 30), k++) {
      const x = k & 1 ? gutter + r() * 22 : w - gutter - r() * 22;
      if (this.inZone(x, row, 4, 6) || this.ground[row * w + Math.round(x)] !== GROUND.moss) continue;
      this.lanterns.push({ x, z: row, phase: r() * 100, mossy: r() < 0.5 ? 1 : 0 });
    }
    for (let row = 70; row < h - 10; row += 210 + Math.floor(r() * 90)) {
      if (this.inZone(this.pathX[row], row, 25, 40)) continue;
      this.props.push({ kind: 'torii', x: this.pathX[row], z: row, size: 40, seed: 1, flip: false });
    }

    // Stone and buildings block walkers; water does too, but for its bridges.
    for (const b2 of this.bridges) {
      const zr = Math.round(b2.z);
      for (let x = Math.round(b2.x - b2.w / 2); x < b2.x + b2.w / 2; x++) {
        for (let k = -4; k <= 4; k++) if (x >= 0 && x < w && zr + k >= 0 && zr + k < h) this.solid[(zr + k) * w + x] = 0;
      }
    }

    this.plantForest(r);
    this.props = this.props.filter(p => p.z < h);
    this.props.sort((p, q) => p.z - q.z);
    this.low.sort((p, q) => p.z - q.z);
    this.maples = this.props.filter(p => p.kind === 'maple' || p.kind === 'goldMaple');
    this.cedars = this.props.filter(p => p.kind === 'cedar' || p.kind === 'sacred');
    for (const p of this.props) {
      const half = p.kind === 'honden' ? 34 : p.kind === 'pagoda' ? 18 : p.kind === 'cedar' || p.kind === 'sacred' ? Math.max(2, p.size * 0.12) : p.kind === 'hokora' ? 8 : p.kind === 'rock' ? p.size * 0.6 : 0;
      const depth = p.kind === 'honden' ? 8 : p.kind === 'pagoda' ? 6 : p.kind === 'hokora' ? 3 : half * 0.6;
      if (half > 0) this.markSolid(p.x, p.z - depth * 0.5, half, depth);
    }
    this.moths = [];
    for (const l of this.lanterns) if (hash2(Math.round(l.x), Math.round(l.z)) < 0.3) {
      for (let k = 0; k < 2; k++) this.moths.push({ lantern: l, a: Math.random() * 6.28, r: 4 + Math.random() * 4, h: 8 + Math.random() * 14, x: l.x, z: l.z, alive: true, wait: 0 });
    }
  }

  /** Draws the approach aside just far enough to clear a box, easing in and out; rows already clear stay put. */
  private bendPath(x0: number, x1: number, z0: number, z1: number, toward: 1 | -1) {
    const margin = PATH_HALF + 5;
    const limit = toward < 0 ? x0 - margin : x1 + margin;
    const first = Math.max(0, Math.floor(z0)), last = Math.min(this.h - 1, Math.ceil(z1));
    const ease = 110;
    for (let z = Math.max(0, first - ease); z <= Math.min(this.h - 1, last + ease); z++) {
      const over = toward < 0 ? this.pathX[z] - limit : limit - this.pathX[z];
      if (over <= 0) continue;
      const t = z < first ? (z - (first - ease)) / ease : z > last ? (last + ease - z) / ease : 1;
      this.pathX[z] += toward * over * t * t * (3 - 2 * t);
    }
  }

  private markSolid(x: number, z: number, hw: number, hd: number) {
    for (let zz = Math.max(0, Math.round(z - hd)); zz <= Math.min(this.h - 1, Math.round(z + hd)); zz++) {
      for (let xx = Math.max(0, Math.round(x - hw)); xx <= Math.min(this.w - 1, Math.round(x + hw)); xx++) this.solid[zz * this.w + xx] = 1;
    }
  }

  /** A patch of raked gravel. */
  private court(x: number, z: number, rx: number, rz: number) {
    for (let zz = Math.max(0, Math.floor(z - rz)); zz < Math.min(this.h, z + rz); zz++) {
      for (let xx = Math.max(0, Math.floor(x - rx)); xx < Math.min(this.w, x + rx); xx++) {
        const nx = (xx - x) / rx, nz = (zz - z) / rz;
        const d = nx * nx + nz * nz + (hash2(xx >> 1, zz >> 1) - 0.5) * 0.06;
        if (d < 1 && this.ground[zz * this.w + xx] !== GROUND.stone) this.ground[zz * this.w + xx] = GROUND.gravel;
      }
    }
  }

  /** Stepping stones from a point over to the approach. */
  private trail(x: number, z: number, r: () => number) {
    const row = clamp(Math.round(z), 0, this.h - 1);
    const tx = this.pathX[row];
    const steps = Math.ceil(Math.abs(tx - x) / 7);
    for (let k = 0; k <= steps; k++) {
      const t = k / (steps || 1);
      const sx = x + (tx - x) * t, sz = z + Math.sin(t * 3.14) * 6 + (r() - 0.5) * 2;
      for (let zz = -2; zz <= 2; zz++) {
        for (let xx = -3; xx <= 3; xx++) {
          if ((xx * xx) / 10 + (zz * zz) / 5 > 1) continue;
          const cx = Math.round(sx + xx), cz = Math.round(sz + zz);
          if (cx < 0 || cx >= this.w || cz < 0 || cz >= this.h) continue;
          const i = cz * this.w + cx;
          if (this.ground[i] === GROUND.moss) this.ground[i] = GROUND.stone;
        }
      }
    }
  }

  private addLantern(x: number, z: number, r: () => number) {
    if (x > 2 && x < this.w - 2 && z > 2 && z < this.h - 1) this.lanterns.push({ x, z, phase: r() * 100, mossy: r() < 0.4 ? 1 : 0 });
  }
  private addProp(kind: PropKind, x: number, z: number, size: number, r: () => number) {
    this.props.push({ kind, x, z, size, seed: Math.floor(r() * 1000) + 1, flip: r() < 0.5 });
  }
  private addAltar(x: number, z: number, favourite: OfferingKind, shrine: boolean) {
    this.altars.push({ x, z, item: favourite, favourite, bites: 3, wait: 0, shrine });
  }
  private addLow(kind: LowPlant, x: number, z: number, r: () => number, variant = 0) {
    if (x < 0 || x >= this.w || z < 0 || z >= this.h) return;
    if (this.ground[Math.round(z) * this.w + Math.round(x)] !== GROUND.moss) return;
    this.low.push({ kind, x, z, seed: Math.floor(r() * 1000), variant });
  }

  /** A drift of one kind of low plant. */
  private drift(kind: LowPlant, x: number, z: number, rx: number, rz: number, count: number, r: () => number, variant = () => 0) {
    for (let k = 0; k < count; k++) {
      const a = r() * 6.28, d = Math.sqrt(r());
      this.addLow(kind, x + Math.cos(a) * d * rx, z + Math.sin(a) * d * rz, r, variant());
    }
  }

  private placeSite(kind: SiteKind, x: number, z: number, k: number, r: () => number) {
    this.sites.push({ kind, x, z, rx: 60 * k, rz: 42 * k });
    switch (kind) {
      case 'hall': {
        this.court(x, z + 16, 66, 42);
        this.trail(x, z + 40, r);
        this.addProp('honden', x, z, 92, r);
        this.addAltar(x, z + 20, 'rice', true);
        this.addProp('lionStatue', x - 22, z + 22, 1, r);
        this.addProp('lionStatue', x + 22, z + 22, 1, r);
        this.addProp('torii', x, z + 42, 46, r);
        for (const dx of [-46, -28, 28, 46]) this.addLantern(x + dx, z + 14 + Math.abs(dx) * 0.2, r);
        break;
      }
      case 'inari': {
        // A tunnel of small gates up to a small red shrine with its fox guardians.
        this.addProp('hokora', x, z, 0, r);
        this.addAltar(x, z + 9, 'inari', true);
        this.addProp('foxStatue', x - 13, z + 8, 1, r);
        this.addProp('foxStatue', x + 13, z + 8, 1, r);
        const count = Math.round(8 * k);
        const dx = (this.pathX[clamp(Math.round(z), 0, this.h - 1)] - x) / (count + 3);
        for (let g = 0; g < count; g++) {
          const gx = x + dx * (g + 1) * 0.6, gz = z + 15 + g * 8;
          for (let zz = -4; zz <= 4; zz++) for (let xx = -6; xx <= 6; xx++) {
            const i = clamp(Math.round(gz + zz), 0, this.h - 1) * this.w + clamp(Math.round(gx + xx), 0, this.w - 1);
            if (this.ground[i] === GROUND.moss) this.ground[i] = GROUND.stone;
          }
          this.addProp('torii', gx, gz, 26, r);
        }
        this.addLantern(x - 18, z + 14, r);
        this.addLantern(x + 18, z + 14, r);
        this.dens.push({ kind: 'kitsune', x: x + 24, z: z + 2 });
        this.dens.push({ kind: 'kitsune', x: x - 24, z: z + 2 });
        this.drift('lily', x, z + 22, 40, 22, 10, r);
        break;
      }
      case 'den': {
        // A troop of pot-bellied tanuki statues in straw hats, round a sake offering.
        this.addAltar(x, z + 8, 'sake', false);
        for (let g = 0; g < Math.round(6 * k); g++) {
          const a = (g / (6 * k)) * 6.28;
          this.addProp('tanukiStatue', x + Math.cos(a) * 24, z + 4 + Math.sin(a) * 14, 1, r);
        }
        this.addLantern(x - 34, z + 6, r);
        this.addLantern(x + 34, z + 10, r);
        this.dens.push({ kind: 'tanuki', x: x - 16, z: z + 18 });
        this.dens.push({ kind: 'tanuki', x: x + 16, z: z + 18 });
        for (let g = 0; g < 14 * k; g++) {
          const a = r() * 6.28, d = 34 + r() * 22;
          this.canes.push({ kind: 'bamboo', x: x + Math.cos(a) * d, z: z - 6 + Math.sin(a) * d * 0.55, len: 46 + Math.floor(r() * 26), seed: Math.floor(r() * 100), phase: r() * 6.28, bx: 0, bv: 0 });
        }
        this.drift('persimmon', x, z + 10, 26, 16, 6, r);
        this.drift('shroom', x, z + 8, 40, 20, 4, r);
        break;
      }
      case 'koi': {
        // A gourd-shaped garden pond: two lobes, and a narrow waist where the bridge crosses.
        const lobes = [
          { x: x - 10 * k, z: z - 19 * k, rx: 36 * k, rz: 20 * k },
          { x: x + 10 * k, z: z + 19 * k, rx: 40 * k, rz: 21 * k },
        ];
        const rx = 50 * k, rz = 41 * k;
        const pond: Water = { x, z, rx, rz, moonX: lobes[0].x + (r() - 0.5) * 20 * k, moonZ: lobes[0].z };
        this.waters.push(pond);
        for (let zz = Math.max(0, Math.floor(z - rz - 5)); zz < Math.min(this.h, z + rz + 5); zz++) {
          for (let xx = Math.max(0, Math.floor(x - rx - 5)); xx < Math.min(this.w, x + rx + 5); xx++) {
            const wob = (noise(xx * 0.09, zz * 0.09) - 0.5) * 0.24;
            let d = Infinity;
            for (const l of lobes) d = Math.min(d, Math.hypot((xx - l.x) / l.rx, (zz - l.z) / l.rz));
            d += wob;
            const i = zz * this.w + xx;
            if (d < 1) { this.ground[i] = GROUND.water; this.solid[i] = 1; }
            else if (d < 1.09) this.ground[i] = GROUND.rim;
          }
        }
        // The bridge spans the waist from bank to bank, as wide as the water there and a little over.
        const row = clamp(Math.round(z), 0, this.h - 1);
        let left = Math.round(x), right = Math.round(x);
        while (left > 0 && this.ground[row * this.w + left - 1] === GROUND.water) left--;
        while (right < this.w - 1 && this.ground[row * this.w + right + 1] === GROUND.water) right++;
        const bw = Math.max(26, right - left + 15);
        this.bridges.push({ x: (left + right) / 2, z: row, w: bw });
        // A few rafts of pads, each lobe to itself, a flower here and there.
        for (const l of lobes) {
          const rafts = 2;
          for (let f = 0; f < rafts; f++) {
            const a = r() * 6.28;
            const cx = l.x + Math.cos(a) * l.rx * 0.5, cz = l.z + Math.sin(a) * l.rz * 0.5;
            for (let g = 0; g < 3; g++) {
              const px = cx + (r() - 0.5) * 16, pz = cz + (r() - 0.5) * 8;
              const xi = Math.round(px), zi = Math.round(pz);
              if (xi < 0 || xi >= this.w || zi < 0 || zi >= this.h || this.ground[zi * this.w + xi] !== GROUND.water || Math.abs(pz - row) < 8) continue;
              this.pads.push({ x: px, z: pz, r: 4 + Math.floor(r() * 3), tone: r() < 0.5 ? 0 : 1, flower: r() < 0.25 ? 1 + Math.floor(r() * 2) : 0, phase: r() * 6.28, load: 0 });
            }
          }
        }
        this.addAltar(lobes[1].x + lobes[1].rx + 8, lobes[1].z - 6, 'cucumber', false);
        this.addLantern(lobes[0].x - lobes[0].rx - 6, lobes[0].z, r);
        this.addLantern(left - 10, row + 4, r);
        this.addLantern(right + 10, row + 4, r);
        for (const l of lobes) {
          for (let g = 0; g < 2; g++) { const a = r() * 6.28; this.addProp('rock', l.x + Math.cos(a) * l.rx * 1.08, l.z + Math.sin(a) * l.rz * 1.1, 3 + Math.floor(r() * 3), r); }
        }
        for (let g = 0; g < 5; g++) {
          const a = 3.3 + r() * 2.8;
          this.canes.push({ kind: 'susuki', x: lobes[0].x + Math.cos(a) * lobes[0].rx * 1.14, z: lobes[0].z + Math.sin(a) * lobes[0].rz * 1.24, len: 24, seed: Math.floor(r() * 100), phase: r() * 6.28, bx: 0, bv: 0 });
        }
        this.drift('hydrangea', lobes[0].x, lobes[0].z - lobes[0].rz, lobes[0].rx, 8, 3, r, () => 0);
        this.addProp('spout', lobes[1].x - lobes[1].rx - 3, lobes[1].z + 4, 1, r);
        break;
      }
      case 'bamboo': {
        for (let g = 0; g < 34 * k * k; g++) {
          const a = r() * 6.28, d = Math.sqrt(r());
          this.canes.push({ kind: 'bamboo', x: x + Math.cos(a) * d * 58 * k, z: z + Math.sin(a) * d * 38 * k, len: 52 + Math.floor(r() * 34), seed: Math.floor(r() * 100), phase: r() * 6.28, bx: 0, bv: 0 });
        }
        this.addLantern(x, z + 8, r);
        this.drift('fern', x, z, 56 * k, 36 * k, 12, r);
        this.drift('shroom', x, z, 40 * k, 30 * k, 5, r);
        break;
      }
      case 'lilies': {
        this.drift('lily', x, z, 66 * k, 38 * k, Math.round(38 * k * k), r);
        { const tone = Math.floor(r() * 3); this.drift('hydrangea', x + 30 * k, z - 26 * k, 36, 14, 5, r, () => tone); }
        this.addProp('jizo', x - 8, z, 1, r);
        this.addProp('jizo', x + 4, z + 2, 1, r);
        this.addAltar(x - 2, z + 10, 'mikan', false);
        this.addLantern(x + 22, z + 8, r);
        break;
      }
      case 'maples': {
        const count = Math.round(7 * k);
        for (let g = 0; g < count; g++) {
          const a = (g / count) * 6.28 + r(), d = 16 + r() * 32 * k;
          this.addProp(r() < 0.3 ? 'goldMaple' : 'maple', x + Math.cos(a) * d, z + Math.sin(a) * d * 0.6, 13 + Math.floor(r() * 8), r);
        }
        this.addLantern(x + 8, z + 16, r);
        this.addLantern(x - 18, z + 18, r);
        this.addAltar(x - 4, z + 22, 'mikan', false);
        this.drift('persimmon', x, z + 10, 40, 24, 6, r);
        this.dens.push({ kind: 'kitsune', x: x + 34, z: z + 22 });
        break;
      }
      case 'sacred': {
        this.addProp('sacred', x, z, 50, r);
        this.addAltar(x, z + 14, 'rice', false);
        for (let g = -2; g <= 2; g++) this.addProp('jizo', x + g * 12, z + 24, 1, r);
        this.addLantern(x - 34, z + 18, r);
        this.addLantern(x + 34, z + 18, r);
        this.drift('shroom', x, z + 6, 34, 20, 7, r);
        this.drift('fern', x, z + 4, 44, 24, 8, r);
        this.dens.push({ kind: 'tanuki', x: x - 26, z: z + 8 });
        break;
      }
      case 'pagoda': {
        this.court(x, z + 10, 46, 26);
        this.addProp('pagoda', x, z, 1, r);
        this.addAltar(x, z + 15, 'fish', true);
        for (const dx of [-30, 30, -18, 18]) this.addLantern(x + dx, z + 16 + Math.abs(dx) * 0.1, r);
        this.trail(x, z + 24, r);
        break;
      }
      case 'zen': {
        // Raked gravel round rocks like islands, with a moss bank and a maple.
        this.court(x, z, 58 * k, 30 * k);
        for (let g = 0; g < 5; g++) this.addProp('rock', x + (g - 2) * 18 * k + (r() - 0.5) * 8, z + (r() - 0.5) * 20, 4 + Math.floor(r() * 5), r);
        this.addProp('maple', x + 50 * k, z - 22, 15, r);
        this.addLantern(x - 40 * k, z + 22 * k, r);
        this.addLantern(x + 40 * k, z + 22 * k, r);
        this.addAltar(x, z + 26 * k, 'mikan', true);
        this.trail(x, z + 28, r);
        break;
      }
    }
  }

  /** Cedars and understorey over everywhere the precincts left free. */
  private plantForest(r: () => number) {
    const { w, h } = this;
    const area = w * h;
    const nearSite = (x: number, z: number, m: number) => this.sites.some(s => Math.abs(x - s.x) < s.rx * 0.8 * m && Math.abs(z - s.z) < s.rz * 0.8 * m);
    const onGround = (x: number, z: number) => {
      const xi = Math.round(x), zi = Math.round(z);
      return xi >= 0 && xi < w && zi >= 0 && zi < h ? this.ground[zi * w + xi] : GROUND.moss;
    };
    const cedars = Math.round(area / 2800);
    for (let k = 0; k < cedars; k++) {
      // Thickest toward the page's edges; thinner across the middle.
      const u = r();
      const side = r() < 0.5 ? u * u * 0.42 : 1 - u * u * 0.42;
      const x = side * w, z = r() * (h + 30);
      const size = 15 + Math.floor(r() * r() * 26);
      const tall = size * 3.6;
      if (this.inZone(x, z, size, tall, 8)) continue;
      if (Math.abs(x - this.pathX[clamp(Math.round(z), 0, h - 1)]) < PATH_HALF + 8) continue;
      if (nearSite(x, z, 1.35) || onGround(x, z) !== GROUND.moss) continue;
      // Nor standing in front of a building or the water, hiding it with its crown.
      if (this.sites.some(q => Math.abs(x - q.x) < q.rx + size && z > q.z && z - tall < q.z + q.rz)) continue;
      this.addProp('cedar', x, z, size, r);
    }
    // Maple accents out in the forest, a jewel every so often.
    for (let k = 0; k < area / 70000; k++) {
      const x = r() * w, z = r() * h;
      if (this.inZone(x, z, 16, 30, 6) || nearSite(x, z, 1) || onGround(x, z) !== GROUND.moss) continue;
      if (Math.abs(x - this.pathX[clamp(Math.round(z), 0, h - 1)]) < PATH_HALF + 10) continue;
      this.addProp(r() < 0.25 ? 'goldMaple' : 'maple', x, z, 12 + Math.floor(r() * 7), r);
    }
    // Ferns, grasses, mushrooms and the odd flower underfoot, in drifts.
    for (let k = 0; k < area / 800; k++) {
      const x = r() * w, z = r() * h;
      if (this.zones.some(q => x > q.x0 && x < q.x1 && z > q.z0 && z < q.z1)) continue;
      const v = noise(x * 0.03 + 9, z * 0.03);
      const kind: LowPlant = v < 0.4 ? 'fern' : v > 0.82 ? 'shroom' : 'grass';
      this.addLow(kind, x, z, r, Math.floor(r() * 3));
    }
    // Clear what was planted over the clear zones.
    this.low = this.low.filter(p => !this.zones.some(q => p.x > q.x0 && p.x < q.x1 && p.z > q.z0 && p.z < q.z1));
    this.canes = this.canes.filter(c => {
      if (this.inZone(c.x, c.z, 4, c.len)) return false;
      const xi = Math.round(c.x), zi = Math.round(c.z);
      return xi >= 0 && xi < w && zi >= 0 && zi < h && this.ground[zi * w + xi] !== GROUND.water && this.ground[zi * w + xi] !== GROUND.stone;
    });
    this.canes.sort((a, b) => a.z - b.z);
    this.lanterns = this.lanterns.filter(l => !this.zones.some(q => l.x > q.x0 && l.x < q.x1 && l.z > q.z0 && l.z < q.z1));
  }

  resize(w: number, h: number) {
    if (w === this.w && h === this.h) return;
    this.rebuild(w, h);
  }

  /** Lays the scene out afresh, keeping everyone about where they were. */
  private rebuild(w: number, h: number) {
    const oldW = this.w;
    this.build(w, h);
    for (const c of this.creatures) {
      c.x = clamp((c.x / oldW) * w, 2, w - 3);
      c.z = clamp(c.z, 2, h - 3);
      if (c.species === 'koi' || c.species === 'frog' || c.species === 'kappa') c.pond = null;
      c.altar = null;
      if (c.species === 'tanuki' || c.species === 'kitsune' || c.species === 'hahaki') { c.state = c.disguise ? 'disguised' : 'roam'; c.timer = 0; c.tx = c.x; c.tz = c.z; }
      if (c.species === 'hahaki') c.carrying = null;
      const flies = c.species === 'bat' || c.species === 'owl' || c.species === 'crow' || c.species === 'hitodama' || c.species === 'chochin' || c.species === 'koi' || c.species === 'frog' || c.species === 'kappa';
      if (!flies && this.isSolid(c.x, c.z)) this.freeSpot(c);
      if (c.species === 'owl' || c.species === 'crow') this.settleOnCedar(c);
    }
    this.reseatWaterFolk();
    for (const q of this.waters) if (!this.creatures.some(c => c.species === 'koi' && c.pond === q)) this.stockWater(q);
    this.fireflies = this.fireflies.filter(f => f.z < h && f.x < w);
  }

  setClearZones(zones: ClearZone[]) {
    const had = JSON.stringify(this.zones);
    const next = JSON.stringify(zones);
    if (had === next) return;
    // Rebuilt only when it moved enough to matter.
    const a = this.zones[0], b = zones[0];
    const moved = !a || !b || Math.abs(a.z1 - b.z1) + Math.abs(a.x1 - b.x1) + Math.abs(a.z0 - b.z0) + Math.abs(a.x0 - b.x0) > 8;
    this.zones = zones;
    if (moved) this.rebuild(this.w, this.h);
  }

  setPointer(x: number, z: number) { this.pointer = { x, z }; }
  clearPointer() { this.pointer = null; }

  // --- stocking -----------------------------------------------------------------

  private someZ(share = 0.4) {
    const { z0, z1 } = this.viewZ;
    return Math.random() < share ? between(z0, Math.min(this.h - 1, z1)) : between(0, this.h - 1);
  }

  private isSolid(x: number, z: number) {
    const xi = Math.round(x), zi = Math.round(z);
    if (xi < 0 || xi >= this.w || zi < 0 || zi >= this.h) return true;
    return this.solid[zi * this.w + xi] === 1;
  }

  private inClearZone(x: number, z: number) {
    return this.zones.some(q => x > q.x0 && x < q.x1 && z > q.z0 && z < q.z1);
  }

  /** Solid ground, or stepping from outside onto the clear zone round the hero text. */
  private blocked(c: { x: number; z: number }, x: number, z: number) {
    return this.isSolid(x, z) || (this.inClearZone(x, z) && !this.inClearZone(c.x, c.z));
  }

  private freeSpot(c: { x: number; z: number }) {
    for (let k = 0; k < 40; k++) {
      const x = clamp(c.x + between(-12 - k * 2, 12 + k * 2), 3, this.w - 4), z = clamp(c.z + between(-12 - k * 2, 12 + k * 2), 3, this.h - 4);
      if (!this.isSolid(x, z) && !this.inClearZone(x, z)) { c.x = x; c.z = z; return; }
    }
  }

  spawn(species: ShrineSpecies, x?: number, z?: number, parent: ShrineCreature | null = null): ShrineCreature {
    const info = SHRINE_SPECIES[species];
    const px = x ?? between(8, this.w - 8), pz = z ?? this.someZ();
    const c: ShrineCreature = {
      id: this.nextId++, species, name: pick(info.names), alive: true, adopted: false, lineId: parent ? parent.lineId : 0,
      x: px, z: pz, h: 0, vx: 0, vz: 0, vh: 0, facing: Math.random() < 0.5 ? 1 : -1, turnHold: 0, squash: 0,
      age: parent ? 0 : info.mature + Math.random() * Math.min(info.old * 0.4, 5 * MIN), energy: between(0.55, 0.9),
      palette: parent ? parent.palette : Math.floor(Math.random() * info.palettes), mood: 'wandering',
      state: 'roam', timer: Math.floor(Math.random() * 60), tx: px, tz: pz,
      parent, foe: null, prey: null, altar: null, hidden: false, disguise: null, sneakLeft: 0, scuttling: false, tailOut: 0,
      emote: null, emoteT: 0, carrying: null, onBridge: false, home: null, pond: null,
    };
    if (!c.lineId) c.lineId = c.id;
    const waterFolk = species === 'koi' || species === 'frog' || species === 'kappa';
    const flies = species === 'bat' || species === 'owl' || species === 'crow' || species === 'hitodama' || species === 'chochin';
    if (!waterFolk && (this.inClearZone(c.x, c.z) || (!flies && this.isSolid(c.x, c.z)))) this.freeSpot(c);
    this.creatures.push(c);
    return c;
  }

  private reseatWaterFolk() {
    for (const c of this.creatures) {
      if (c.species !== 'koi' && c.species !== 'frog' && c.species !== 'kappa') continue;
      const w = this.waters.length ? this.waters.reduce((b, q) => (dist(c, q) < dist(c, b) ? q : b)) : null;
      if (!w) { c.alive = false; continue; }
      c.pond = w;
      const p = this.waterSpot(w);
      c.x = p.x; c.z = p.z;
    }
  }

  /** Somewhere on a pond: its shape isn't a simple ellipse. */
  private waterSpot(w: Water) {
    for (let k = 0; k < 40; k++) {
      const x = w.x + between(-w.rx, w.rx), z = w.z + between(-w.rz, w.rz);
      if (this.isWater(x, z)) return { x, z };
    }
    return { x: w.x, z: w.z };
  }

  private populationCap(s: ShrineSpecies) {
    const info = SHRINE_SPECIES[s];
    return info.perArea === Infinity ? 0 : Math.max(info.min, Math.round((this.w * this.h) / info.perArea));
  }

  private stock() {
    for (const s of SHRINE_SPECIES_LIST) {
      const count = this.populationCap(s);
      for (let k = 0; k < count; k++) {
        const c = this.spawn(s);
        if (s === 'owl' || s === 'crow') this.settleOnCedar(c);
      }
    }
    // Rivals by the opening view's offerings, and a few already in disguise.
    const gutter = Math.min(this.w * 0.17, 66);
    const crowd = Math.min(1, this.w / 300);
    for (let k = 0; k < Math.round(5 * crowd); k++) {
      const left = k % 2 === 0;
      const x = left ? between(6, gutter) : between(this.w - gutter, this.w - 12);
      const z = between(this.viewZ.z0 + 18, this.viewZ.z1 - 6);
      const c = this.spawn(RIVALS[(k >> 1) % 2], x, z);
      if (k === 0 || k === 3) this.startDisguise(c, DISGUISE_ROTATION[k ? 1 : 0]);
    }
    // A deer or two, a few hares and mice about the same place, since it's what a visitor sees first.
    for (let k = 0; k < Math.round(3 * crowd); k++) {
      const left = k % 2 === 1;
      const x = left ? between(6, gutter) : between(this.w - gutter, this.w - 12);
      this.spawn((['deer', 'hare', 'hitodama'] as ShrineSpecies[])[k], x, between(this.viewZ.z0 + 14, this.viewZ.z1 - 6));
    }
    for (const w of this.waters) this.stockWater(w);
    // Kodama round the sacred cedars, and on any cedars in the opening view.
    for (const p of this.cedars) {
      const sacred = p.kind === 'sacred';
      const count = sacred ? 4 : 0;
      for (let k = 0; k < count; k++) {
        const c = this.spawn('kodama', p.x + between(-p.size * 0.6, p.size * 0.6), p.z + between(-6, 14));
        c.home = { x: p.x, z: p.z, h: 0 };
      }
    }
    this.fireflies = [];
    for (let k = 0; k < 60; k++) this.addFirefly(between(0, this.w), this.someZ(0.5));
    this.creatures.filter(c => c.species === 'bat' || c.species === 'hitodama' || c.species === 'chochin').forEach(c => { c.h = between(10, 34); });
  }

  private stockWater(w: Water) {
    for (let k = 0; k < 4; k++) {
      const p = this.waterSpot(w);
      const c = this.spawn('koi', p.x, p.z);
      c.pond = w; c.h = -1;
    }
    for (let k = 0; k < 2; k++) this.addFrog(w);
    const p = this.waterSpot(w);
    const k = this.spawn('kappa', p.x, p.z);
    k.pond = w; k.state = 'swim';
  }

  /** A frog on one of the pond's pads. */
  private addFrog(w: Water) {
    const mine = this.pads.filter(p => Math.abs(p.x - w.x) <= w.rx && Math.abs(p.z - w.z) <= w.rz);
    const at = mine.length ? pick(mine) : this.waterSpot(w);
    const c = this.spawn('frog', at.x, at.z);
    c.pond = w; c.state = 'sit';
  }

  private settleOnCedar(c: ShrineCreature) {
    if (!this.cedars.length) return;
    const p = pick(this.cedars);
    c.home = { x: p.x, z: p.z, h: (p.size * 2.3) / ELEVATION };
    c.x = p.x; c.z = p.z; c.h = c.home.h;
    c.state = 'perch'; c.timer = Math.floor(between(100, 500));
  }

  private addFirefly(x: number, z: number) {
    if (this.fireflies.length > 700) return;
    this.fireflies.push({ x, z, h: between(4, 30), vx: 0, vz: 0, phase: Math.random() * 400, life: Math.floor(between(1500, 6000)) });
  }

  // --- the running of things ------------------------------------------------------

  step() {
    this.tick++;
    const creatures = this.creatures;
    for (let i = 0; i < creatures.length; i++) {
      const c = creatures[i];
      if (!c.alive) continue;
      c.age++;
      if (c.emoteT > 0 && --c.emoteT === 0) c.emote = null;
      if (c.squash) { c.squash *= 0.86; if (Math.abs(c.squash) < 0.01) c.squash = 0; }
      if (c.turnHold > 0) c.turnHold--;
      const info = SHRINE_SPECIES[c.species];
      c.energy -= info.hunger;
      if (c.age > info.old) { this.die(c, 'oldAge'); continue; }
      if (c.energy <= 0) { this.die(c, 'starved'); continue; }
      this.think(c);
    }
    if (this.tick % 40 === 0) this.creatures = this.creatures.filter(c => c.alive);
    this.updateTussles();
    this.updateMotes();
    this.updateFireflies();
    this.updateMoths();
    this.updateCanes();
    this.updateAltars();
    this.updateScenery();
    this.updateHappening();
    this.updateParade();
    if (this.tick - this.lastCheck > 300) {
      this.lastCheck = this.tick;
      this.arrivals();
    }
  }

  /** New animals wander in from the page's edges when numbers fall short. */
  private arrivals() {
    const counts = this.countAll();
    for (const s of SHRINE_SPECIES_LIST) {
      const cap = this.populationCap(s);
      if (!cap || counts[s] >= Math.min(cap, SHRINE_SPECIES[s].min + 2)) continue;
      const left = Math.random() < 0.5;
      const z = this.someZ(0.4);
      const c = this.spawn(s, left ? 2 : this.w - 3, z);
      if (s === 'owl' || s === 'crow') this.settleOnCedar(c);
      if (s === 'tanuki' || s === 'kitsune') this.log('visit', `A ${SHRINE_SPECIES[s].label.toLowerCase()} comes down from the hills`, c);
    }
    for (const w of this.waters) {
      if (this.creatures.filter(c => c.alive && c.species === 'frog' && c.pond === w).length < 2) this.addFrog(w);
    }
  }

  private countAll() {
    const counts = Object.fromEntries(SHRINE_SPECIES_LIST.map(s => [s, 0])) as Record<ShrineSpecies, number>;
    for (const c of this.creatures) if (c.alive) counts[c.species]++;
    return counts;
  }

  private log(kind: ShrineEventKind, text: string, who?: ShrineCreature | null) {
    this.events.unshift({ tick: this.tick, kind, text, starred: !!who?.adopted });
    if (this.events.length > 12) this.events.length = 12;
  }

  private die(c: ShrineCreature, how: ShrineDeath) {
    c.alive = false;
    this.deaths[how]++;
    if (c.species === 'tanuki' || c.species === 'kitsune') this.log('death', how === 'oldAge' ? `Old ${c.name} is gone from the forest` : `${c.name} went hungry too long`, c);
    this.burst('smoke', c.x, c.z, 3, 3, 0.5);
  }

  private burst(kind: MoteKind, x: number, z: number, h: number, count: number, spread: number, up = 0.5) {
    for (let k = 0; k < count; k++) {
      if (this.motes.length >= MAX_MOTES) return;
      const life = kind === 'smoke' ? Math.floor(between(18, 30)) : kind === 'note' || kind === 'heart' ? 50 : kind === 'star' ? 26 : Math.floor(between(16, 34));
      this.motes.push({ kind, x, z, h, vx: between(-spread, spread), vz: between(-spread * 0.6, spread * 0.6), vh: between(up * 0.3, up), life, max: life, seed: Math.floor(Math.random() * 1000) });
    }
  }

  private emote(c: ShrineCreature, what: Emote, t = 45) { c.emote = what; c.emoteT = t; }

  /** A wisp of smoke, and a leaf fluttering down. */
  private poof(c: ShrineCreature) {
    this.burst('smoke', c.x, c.z, 6, 12, 0.7, 0.7);
    this.burst('star', c.x, c.z, 10, 4, 0.5, 0.9);
    this.burst('greenLeaf', c.x, c.z, 16, 1, 0.1, 0.2);
    c.squash = 0.8;
  }

  // --- moving around ---------------------------------------------------------------

  private setFacing(c: ShrineCreature, dir: number) {
    if (Math.abs(dir) < 0.02 || c.turnHold > 0) return;
    const next = dir > 0 ? 1 : -1;
    if (next !== c.facing) { c.facing = next; c.turnHold = 12; }
  }

  /** Steers toward a point, slipping round whatever is in the way. Returns the distance left. */
  private walkTo(c: ShrineCreature, tx: number, tz: number, speed: number, easing = 0.18) {
    const dx = tx - c.x, dz = tz - c.z;
    const d = Math.hypot(dx, dz) || 1;
    let vx = (dx / d) * speed, vz = (dz / d) * speed;
    const look = 4;
    if (this.blocked(c, c.x + (vx / speed) * look, c.z + (vz / speed) * look)) {
      for (const turn of [0.8, -0.8, 1.6, -1.6, 2.4, -2.4]) {
        const nx = Math.cos(turn) * vx - Math.sin(turn) * vz, nz = Math.sin(turn) * vx + Math.cos(turn) * vz;
        if (!this.blocked(c, c.x + (nx / speed) * look, c.z + (nz / speed) * look)) { vx = nx; vz = nz; break; }
      }
    }
    c.vx += (vx - c.vx) * easing;
    c.vz += (vz - c.vz) * easing;
    this.moveOn(c);
    return d;
  }

  private moveOn(c: ShrineCreature) {
    const nx = c.x + c.vx, nz = c.z + c.vz;
    if (!this.blocked(c, nx, c.z)) c.x = nx; else c.vx *= -0.2;
    if (!this.blocked(c, c.x, nz)) c.z = nz; else c.vz *= -0.2;
    c.x = clamp(c.x, 2, this.w - 3);
    c.z = clamp(c.z, 2, this.h - 3);
    const lift = this.bridgeLift(c.x, c.z);
    if (lift > 0) { c.h = lift; c.onBridge = true; }
    else if (c.onBridge) { c.h = 0; c.onBridge = false; }
    this.setFacing(c, c.vx);
  }

  /** How high a walker stands at this spot if it's on a bridge's deck (0 if not). */
  private bridgeLift(x: number, z: number) {
    for (const b of this.bridges) {
      if (Math.abs(z - b.z) > 4 || Math.abs(x - b.x) > b.w / 2) continue;
      return bridgeDeck(b.w, x - b.x) / ELEVATION;
    }
    return 0;
  }

  private halt(c: ShrineCreature) {
    c.vx *= 0.7; c.vz *= 0.7;
    this.moveOn(c);
  }

  private wanderTarget(c: ShrineCreature, range: number) {
    for (let k = 0; k < 12; k++) {
      const x = clamp(c.x + between(-range, range), 6, this.w - 7), z = clamp(c.z + between(-range, range) * 0.8, 6, this.h - 7);
      if (!this.isSolid(x, z) && !this.inClearZone(x, z)) { c.tx = x; c.tz = z; return; }
    }
    c.tx = c.x; c.tz = c.z;
  }

  private near(c: ShrineCreature, range: number, test: (o: ShrineCreature) => boolean) {
    let best: ShrineCreature | null = null;
    let bestD = range;
    for (const o of this.creatures) {
      if (o === c || !o.alive || !test(o)) continue;
      const dx = Math.abs(o.x - c.x);
      if (dx > bestD) continue;
      const d = Math.hypot(o.x - c.x, o.z - c.z);
      if (d < bestD) { bestD = d; best = o; }
    }
    return best;
  }

  private flee(c: ShrineCreature, from: { x: number; z: number }, t = 80) {
    const dx = c.x - from.x, dz = c.z - from.z;
    const d = Math.hypot(dx, dz) || 1;
    c.tx = clamp(c.x + (dx / d) * 80, 4, this.w - 5);
    c.tz = clamp(c.z + (dz / d) * 60, 4, this.h - 5);
    c.state = 'flee';
    c.timer = t;
    c.mood = 'fleeing';
  }

  /** The parade comes through: whoever is near its line gets out of the way, or pretends to be furniture. */
  private paradeNear(c: ShrineCreature) {
    const p = this.parade;
    if (!p || c.z > p.headRow + 60 || c.z < p.tailRow - 10) return false;
    return Math.abs(c.x - this.pathAt(c.z)) < 30;
  }

  /** Thinks a creature's thought for this tick. */
  private think(c: ShrineCreature) {
    switch (c.species) {
      case 'tanuki': case 'kitsune': this.thinkRival(c); break;
      case 'hahaki': this.thinkHahaki(c); break;
      case 'mouse': this.thinkMouse(c); break;
      case 'hare': this.thinkHare(c); break;
      case 'deer': this.thinkDeer(c); break;
      case 'owl': this.thinkOwl(c); break;
      case 'bat': this.thinkBat(c); break;
      case 'crow': this.thinkCrow(c); break;
      case 'frog': this.thinkFrog(c); break;
      case 'koi': this.thinkKoi(c); break;
      case 'kappa': this.thinkKappa(c); break;
      case 'kodama': this.thinkKodama(c); break;
      case 'hitodama': this.thinkHitodama(c); break;
      case 'kasa': this.thinkKasa(c); break;
      case 'chochin': this.thinkChochin(c); break;
    }
  }

  // --- tanuki and kitsune ---------------------------------------------------------

  private rivalOf(c: ShrineCreature): ShrineSpecies { return c.species === 'tanuki' ? 'kitsune' : 'tanuki'; }
  private isYoung(c: ShrineCreature) { return c.age < SHRINE_SPECIES[c.species].mature; }

  private thinkRival(c: ShrineCreature) {
    if (c.hidden) return;
    switch (c.state) {
      case 'disguised': this.thinkDisguised(c); return;
      case 'changing': this.thinkChanging(c); return;
      case 'flee': {
        c.mood = 'fleeing';
        const d = this.walkTo(c, c.tx, c.tz, SHRINE_SPECIES[c.species].speed * 1.9);
        if (this.tick % 5 === 0) this.burst('dust', c.x, c.z, 0, 1, 0.1, 0.1);
        if (--c.timer <= 0 || d < 4) { c.state = 'roam'; c.timer = 40; }
        return;
      }
      case 'standoff': this.thinkStandoff(c); return;
      case 'approach': this.thinkApproach(c); return;
      case 'eat': this.thinkEat(c); return;
      case 'sleep': {
        c.mood = 'sleeping';
        this.halt(c);
        if (this.tick % 80 === (c.id % 80)) this.emote(c, 'zed', 40);
        c.energy = Math.max(c.energy, 0.2);
        if (--c.timer <= 0) { c.state = 'roam'; c.timer = 30; }
        return;
      }
      case 'perform': {
        // A tanuki drumming its belly, or a fox barking at the moon.
        c.mood = c.species === 'tanuki' ? 'drumming' : 'barking';
        this.halt(c);
        if (this.tick % (c.species === 'tanuki' ? 12 : 40) === 0) {
          this.burst('note', c.x + c.facing * 7, c.z, 30, 1, 0.1, 0.4);
          c.squash = c.species === 'tanuki' ? 0.35 : 0.2;
        }
        if (--c.timer <= 0) { c.state = 'roam'; c.timer = 30; }
        return;
      }
      case 'hunt': this.thinkHunt(c); return;
      case 'forage': {
        c.mood = 'sniffing';
        const d = this.walkTo(c, c.tx, c.tz, SHRINE_SPECIES[c.species].speed);
        if (d < 3 || --c.timer <= 0) {
          this.burst('crumb', c.x, c.z, 2, 3, 0.2, 0.3);
          c.energy = Math.min(1, c.energy + 0.1);
          c.state = 'roam'; c.timer = Math.floor(between(30, 70));
        }
        return;
      }
    }
    // Roaming: young ones trail their parent and chase fireflies.
    if (c.parent?.alive && this.isYoung(c)) {
      c.mood = 'following';
      const p = c.parent;
      if (p.disguise) { this.wanderAbout(c, 0.7); return; }
      const d = Math.hypot(p.x - c.x, p.z - c.z);
      if (d > 14) this.walkTo(c, p.x - p.facing * 9, p.z + 3, SHRINE_SPECIES[c.species].speed * 1.4);
      else this.wanderAbout(c, 0.55);
      return;
    }
    if (this.paradeNear(c)) {
      if (!c.disguise && Math.random() < 0.015) this.beginChange(c);
      else if (this.parade) this.flee(c, { x: this.pathAt(c.z), z: c.z }, 70);
      return;
    }
    c.mood = 'wandering';
    if (--c.timer <= 0) { this.decide(c); return; }
    this.wanderAbout(c, 1);
    // A rival in the open: nose to nose.
    if (this.tick % 7 === c.id % 7) {
      const foe = this.near(c, 16, o => o.species === this.rivalOf(c) && !o.disguise && !o.hidden && (o.state === 'roam' || o.state === 'approach') && !this.isYoung(o));
      if (foe && !this.isYoung(c) && Math.random() < 0.25) this.startStandoff(c, foe);
    }
  }

  /** The row reached after going this far along the path (off either end, it runs straight on). */
  private rowAlong(d: number) {
    const arc = this.pathArc;
    if (d <= 0) return d;
    const last = arc[this.h - 1];
    if (d >= last) return this.h - 1 + (d - last);
    let lo = 0, hi = this.h - 1;
    while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (arc[mid] <= d) lo = mid; else hi = mid; }
    return lo + (d - arc[lo]) / Math.max(0.001, arc[hi] - arc[lo]);
  }

  private pathAt(z: number) { return this.pathX[clamp(Math.round(z), 0, this.h - 1)]; }

  private wanderAbout(c: ShrineCreature, pace: number) {
    if (Math.hypot(c.tx - c.x, c.tz - c.z) < 3 || Math.random() < 0.004) this.wanderTarget(c, 44);
    this.walkTo(c, c.tx, c.tz, SHRINE_SPECIES[c.species].speed * 0.6 * pace);
  }

  /** What next, for a rival with nothing on: mostly food, sometimes sleep or a little showing off. */
  private decide(c: ShrineCreature) {
    c.timer = Math.floor(between(110, 300));
    const hungry = c.energy < 0.75;
    const roll = Math.random();
    if (hungry) {
      const altar = this.bestAltar(c);
      if (altar && roll < 0.75) { c.altar = altar; c.state = 'approach'; return; }
      if (c.species === 'kitsune' && roll < 0.95) {
        const prey = this.near(c, 90, o => o.species === 'mouse' || (o.species === 'hare' && Math.random() < 0.4));
        if (prey) { c.prey = prey; c.state = 'hunt'; c.timer = 240; return; }
      }
      // Something on the forest floor: windfall persimmons, beetles, mushrooms.
      this.wanderTarget(c, 30);
      c.state = 'forage';
      c.timer = 120;
      return;
    }
    if (roll < 0.1) { c.state = 'perform'; c.timer = Math.floor(between(120, 240)); return; }
    if (roll < 0.32) { c.state = 'sleep'; c.timer = Math.floor(between(300, 700)); return; }
    if (roll < 0.44) { this.beginChange(c); return; }
    if (roll < 0.62 && this.tryCourt(c)) return;
    if (roll < 0.74) {
      const den = this.dens.filter(d => d.kind === c.species);
      if (den.length) { const d = pick(den); c.tx = d.x; c.tz = d.z; c.timer = 300; return; }
    }
  }

  /** The nearest offering it can smell, with its favourite counting extra. */
  private bestAltar(c: ShrineCreature) {
    let best: Altar | null = null;
    let score = Infinity;
    for (const a of this.altars) {
      if (!a.item) continue;
      const d = dist(c, a) - (a.item === (c.species === 'tanuki' ? 'sake' : 'inari') ? 90 : 0);
      if (d < score && d < 260) { score = d; best = a; }
    }
    return best;
  }

  private hahakiNear(x: number, z: number, range: number) {
    for (const o of this.creatures) {
      if (o.species === 'hahaki' && o.alive && Math.hypot(o.x - x, o.z - z) < range) return o;
    }
    return null;
  }

  private thinkApproach(c: ShrineCreature) {
    const a = c.altar;
    if (!a?.item) { c.state = 'roam'; c.timer = 30; c.altar = null; return; }
    c.mood = 'sniffing';
    const d = this.walkTo(c, a.x + (c.id & 1 ? 8 : -8), a.z + 4, SHRINE_SPECIES[c.species].speed);
    // Across open ground to a guarded stand, go in disguise.
    if (d < 46 && d > 16 && this.tick % 10 === 0 && this.hahakiNear(a.x, a.z, 60) && Math.random() < 0.3) { this.beginChange(c); return; }
    if (d < 4) { c.state = 'eat'; c.timer = 80; }
  }

  private thinkEat(c: ShrineCreature) {
    const a = c.altar;
    this.halt(c);
    c.mood = 'eating';
    if (!a?.item) { c.state = 'roam'; c.timer = 30; c.altar = null; return; }
    this.setFacing(c, a.x - c.x);
    if (this.tick % 20 === 0) { this.burst('crumb', a.x, a.z, 8, 2, 0.25, 0.4); c.squash = -0.2; }
    // A rival at the same stand? There will be a scrap for it.
    if (this.tick % 11 === 0) {
      const foe = this.near(c, 22, o => o.species === this.rivalOf(c) && !o.hidden && !o.disguise && !this.isYoung(o));
      if (foe) { this.startStandoff(c, foe); return; }
    }
    if (--c.timer <= 0) this.takeBite(c, a);
  }

  private takeBite(c: ShrineCreature, a: Altar) {
    a.bites--;
    this.meals++;
    c.energy = Math.min(1, c.energy + 0.3);
    if (a.bites <= 0) {
      const item = a.item as string;
      a.item = null;
      a.wait = 90;
      if (c.species === 'tanuki') this.score.tanuki++; else this.score.kitsune++;
      this.log('offering', `${c.disguise ? 'Somebody' : c.name} ate the ${OFFERING_NAME[item] ?? item}`, c);
    }
    if (c.state === 'eat') { c.state = 'roam'; c.timer = 30; c.altar = null; }
  }

  private startStandoff(a: ShrineCreature, b: ShrineCreature) {
    for (const [x, y] of [[a, b], [b, a]]) {
      x.state = 'standoff'; x.foe = y; x.timer = 60; x.vx = 0; x.vz = 0;
      x.facing = y.x > x.x ? 1 : -1; x.turnHold = 30; x.squash = 0.5;
      this.emote(x, 'bang', 50);
    }
  }

  private thinkStandoff(c: ShrineCreature) {
    const foe = c.foe;
    c.mood = 'facing off';
    if (!foe?.alive || foe.state !== 'standoff') { c.state = 'roam'; c.timer = 30; c.foe = null; return; }
    this.halt(c);
    if (this.tick % 14 === 0) c.squash = 0.3;
    if (--c.timer <= 0 && c.id < foe.id) {
      // A nervous fox sometimes thinks better of it and turns into something else.
      if (Math.random() < 0.2) { foe.state = 'roam'; foe.timer = 20; foe.foe = null; c.foe = null; this.beginChange(c); return; }
      this.startTussle(c, foe);
    }
  }

  private startTussle(a: ShrineCreature, b: ShrineCreature) {
    const dur = Math.floor(between(70, 140));
    this.tussles.push({ x: (a.x + b.x) / 2, z: (a.z + b.z) / 2, a, b, t: 0, dur });
    for (const c of [a, b]) { c.hidden = true; c.state = 'scrap'; c.mood = 'scrapping'; c.emote = null; }
    this.scraps++;
    this.log('scrap', `${a.name} and ${b.name} are at it again`, a.adopted ? a : b);
  }

  private updateTussles() {
    for (let i = this.tussles.length - 1; i >= 0; i--) {
      const t = this.tussles[i];
      t.t++;
      if (t.t % 6 === 0) this.burst('dust', t.x + between(-9, 9), t.z + between(-4, 4), between(0, 6), 2, 0.5, 0.5);
      if (t.t % 11 === 0) this.burst('star', t.x + between(-8, 8), t.z, between(6, 14), 1, 0.6, 0.8);
      if (t.t % 17 === 0) this.burst('tuft', t.x, t.z, 6, 3, 0.6, 0.6);
      if (t.t < t.dur) continue;
      this.tussles.splice(i, 1);
      const [win, lose] = Math.random() < (t.a.energy + 0.2) / (t.a.energy + t.b.energy + 0.4) ? [t.a, t.b] : [t.b, t.a];
      win.hidden = false; lose.hidden = false;
      lose.energy = Math.max(0.1, lose.energy - 0.15);
      this.flee(lose, { x: t.x, z: t.z }, 140);
      lose.foe = null; win.foe = null;
      lose.h = 0; win.squash = 0.6;
      win.state = win.altar?.item ? 'eat' : 'roam';
      win.timer = 60;
      this.emote(win, 'note', 60);
      this.burst('dust', t.x, t.z, 2, 8, 0.8, 0.6);
    }
  }

  private thinkHunt(c: ShrineCreature) {
    const p = c.prey;
    c.mood = 'hunting';
    if (!p?.alive || --c.timer <= 0) { c.prey = null; c.state = 'roam'; c.timer = 40; return; }
    const d = this.walkTo(c, p.x, p.z, SHRINE_SPECIES[c.species].speed * 1.5);
    if (d < 18 && c.h === 0 && this.tick % 4 === 0) { c.vh = 0.9; c.mood = 'pouncing'; c.squash = 0.6; }
    if (c.h > 0 || c.vh > 0) {
      c.h += c.vh; c.vh -= 0.1;
      if (c.h <= 0) { c.h = 0; c.vh = 0; }
    }
    if (d < 5) {
      p.alive = false;
      this.deaths.eaten++;
      this.burst('blood', p.x, p.z, 2, 10, 0.7, 0.8);
      this.burst('tuft', p.x, p.z, 3, 6, 0.5, 0.6);
      c.energy = Math.min(1, c.energy + (p.species === 'hare' ? 0.6 : 0.35));
      c.prey = null; c.state = 'roam'; c.timer = 60;
      this.emote(c, 'note', 40);
      this.log('eaten', `${c.name} caught a ${SHRINE_SPECIES[p.species].label.toLowerCase()}`, c);
    }
  }

  private tryCourt(c: ShrineCreature) {
    const counts = this.creatures.filter(o => o.alive && o.species === c.species).length;
    if (counts >= this.populationCap(c.species) + 4 || c.energy < 0.6 || this.isYoung(c)) return false;
    const mate = this.near(c, 60, o => o.species === c.species && !o.disguise && !this.isYoung(o) && o.energy > 0.5 && !o.hidden);
    if (!mate) return false;
    this.emote(c, 'heart', 60);
    this.emote(mate, 'heart', 60);
    this.burst('heart', c.x, c.z, 12, 2, 0.2, 0.4);
    const kid = this.spawn(c.species, c.x + 3, c.z + 2, c);
    kid.state = 'roam';
    c.energy -= 0.2;
    this.births++;
    this.log('birth', `${c.name} has a new ${c.species === 'tanuki' ? 'cub' : 'kit'}`, c);
    return true;
  }

  // --- changing shape ------------------------------------------------------------

  /** It plucks a leaf, sets it on its head, and hops up: then it's a teapot. */
  beginChange(c: ShrineCreature) {
    if (c.disguise || c.state === 'changing') return;
    c.state = 'changing';
    c.timer = 42;
    c.vx = 0; c.vz = 0;
    c.mood = 'changing';
  }

  private thinkChanging(c: ShrineCreature) {
    this.halt(c);
    c.mood = 'changing';
    // A little hop at the end, and poof.
    if (c.timer === 12) { c.vh = 0.8; c.squash = 0.6; }
    if (c.vh !== 0 || c.h > 0) { c.h = Math.max(0, c.h + c.vh); c.vh -= 0.12; if (c.h === 0) c.vh = 0; }
    if (--c.timer <= 0) this.startDisguise(c, pick(DISGUISE_ROTATION));
  }

  private startDisguise(c: ShrineCreature, kind: DisguiseKind) {
    c.h = 0; c.vh = 0;
    c.disguise = kind;
    c.state = 'disguised';
    c.sneakLeft = Math.floor(between(TICKS_PER_SECOND * 30, TICKS_PER_SECOND * 75));
    c.timer = 0;
    c.altar = c.altar?.item ? c.altar : this.bestAltar(c);
    this.shifts++;
    this.poof(c);
    this.log('shift', `A new ${kind} has appeared by the path`, c);
  }

  /** Back out of the disguise with a puff, looking pleased with itself (or caught out). */
  endDisguise(c: ShrineCreature, surprised = false) {
    if (!c.disguise) return;
    c.disguise = null;
    c.scuttling = false;
    c.tailOut = 0;
    this.poof(c);
    if (surprised) { c.vh = 1.4; this.emote(c, 'bang', 45); this.flee(c, { x: c.x + between(-6, 6), z: c.z + between(-6, 6) }, 110); this.caught++; }
    else { c.state = 'roam'; c.timer = 40; this.emote(c, 'note', 45); }
  }

  /** Whether anyone is looking: the visitor's cursor close by, or it's plainly a sitting duck. */
  private watched(c: ShrineCreature) {
    const p = this.pointer;
    return !!p && Math.hypot(p.x - c.x, p.z - c.z) < 48;
  }

  private thinkDisguised(c: ShrineCreature) {
    c.sneakLeft--;
    if (c.h > 0 || c.vh !== 0) { c.h = Math.max(0, c.h + c.vh); c.vh -= 0.09; if (c.h === 0) c.vh = 0; }
    if (c.tailOut > 0) c.tailOut--;
    c.scuttling = false;
    const seen = this.watched(c);
    if (seen) {
      // Frozen, trying very hard to be furniture: the tail sometimes slips out.
      if (c.mood !== 'pretending') { c.squash = 0.25; if (Math.random() < 0.5) c.tailOut = 34; if (Math.random() < 0.3) this.emote(c, 'what', 26); }
      c.mood = 'pretending';
      c.vx = 0; c.vz = 0;
      return;
    }
    // A rival might see through it.
    if (this.tick % 24 === c.id % 24) {
      const foe = this.near(c, 22, o => o.species === this.rivalOf(c) && !o.disguise && !o.hidden && o.state === 'roam' && !this.isYoung(o));
      if (foe && Math.random() < 0.3) {
        this.emote(foe, 'bang', 40);
        this.endDisguise(c, true);
        foe.vh = 1;
        this.startStandoff(foe, c);
        return;
      }
    }
    const altar = c.altar?.item ? c.altar : null;
    if (altar) {
      const d = Math.hypot(altar.x - c.x, altar.z - c.z);
      if (d < 7) {
        // Right beside the offering: it disappears, a bite at a time, the lid lifting.
        c.mood = 'eating';
        if (this.tick % 22 === 0) { c.squash = 0.35; this.burst('crumb', altar.x, altar.z, 8, 2, 0.25, 0.4); }
        if (this.tick % 90 === 0) { this.takeBite(c, altar); if (!altar.item) { c.altar = null; c.sneakLeft = Math.min(c.sneakLeft, 240); } }
        return;
      }
    }
    if (c.sneakLeft <= 0 && !this.hahakiNear(c.x, c.z, 40)) { this.endDisguise(c); return; }
    // A hop or two, then stock still again, with a nervous pause.
    const beat = (this.tick + c.id * 13) % 110;
    if (beat < 70) {
      c.scuttling = true;
      c.mood = 'sneaking';
      if (altar) { c.tx = altar.x + 7 * (c.id & 1 ? 1 : -1); c.tz = altar.z + 4; }
      else if (Math.hypot(c.tx - c.x, c.tz - c.z) < 4) this.wanderTarget(c, 60);
      this.walkTo(c, c.tx, c.tz, 0.26);
      if (this.tick % 10 === 0) { c.vh = 0.4; c.squash = 0.25; }
    } else {
      c.mood = 'pretending';
      c.vx = 0; c.vz = 0;
      if (beat === 72 && Math.random() < 0.18) c.tailOut = 26;
    }
  }

  /** A visitor's click: if it's a disguise, the game's up. */
  poke(c: ShrineCreature) {
    if (c.disguise) { this.endDisguise(c, true); this.log('caught', `The ${c.species === 'tanuki' ? 'tanuki' : 'fox'} ${c.name} is found out!`, c); return true; }
    return false;
  }

  // --- the broom spirits ----------------------------------------------------------------

  private thinkHahaki(c: ShrineCreature) {
    const speed = SHRINE_SPECIES.hahaki.speed;
    if (c.state === 'shoo') {
      const prey = c.prey;
      c.mood = 'shooing';
      if (!prey?.alive || prey.disguise || --c.timer <= 0) { c.prey = null; c.state = 'roam'; c.timer = 40; return; }
      const d = this.walkTo(c, prey.x, prey.z, speed * 2.1);
      if (this.tick % 12 === 0) c.squash = 0.2;
      if (d < 16 && prey.state !== 'flee') { this.emote(prey, 'bang', 40); prey.vh = 1; this.flee(prey, c, 130); prey.altar = null; prey.h = 0.1; this.caught++; this.log('caught', `${c.name} swats ${prey.name} off the stand`, prey); }
      return;
    }
    if (c.state === 'carry') {
      const a = c.altar;
      c.mood = 'carrying';
      if (!a || a.item) { c.state = 'roam'; c.altar = null; c.carrying = null; c.timer = 20; return; }
      const d = this.walkTo(c, a.x, a.z + 6, speed);
      if (d < 3) {
        a.item = c.carrying ?? a.favourite;
        a.bites = 3;
        c.carrying = null; c.altar = null;
        c.state = 'bow'; c.timer = 70;
        this.burst('star', a.x, a.z, 10, 3, 0.3, 0.5);
      }
      return;
    }
    if (c.state === 'bow') {
      c.mood = 'bowing';
      this.halt(c);
      if (--c.timer <= 0) { c.state = 'roam'; c.timer = 30; }
      return;
    }
    if (c.state === 'puzzle') {
      c.mood = 'puzzled';
      this.halt(c);
      if (--c.timer <= 0) { c.state = 'roam'; c.timer = 30; }
      return;
    }
    if (c.state === 'sweep') {
      c.mood = 'sweeping';
      this.halt(c);
      if (this.tick % 14 === 0) { c.squash = 0.15; this.burst('leaf', c.x + c.facing * 8, c.z + 1, 1, 2, 0.35, 0.25); c.facing = (c.facing * -1) as 1 | -1; }
      if (--c.timer <= 0) { c.state = 'roam'; c.timer = 80; }
      return;
    }
    // Any empty stand is worth a walk.
    if (this.tick % 30 === c.id % 30) {
      const empty = this.altars.filter(a => !a.item && a.wait <= 0 && !this.creatures.some(o => o.species === 'hahaki' && o.altar === a));
      if (empty.length) {
        c.altar = empty.reduce((b, a) => (dist(c, a) < dist(c, b) ? a : b));
        c.carrying = c.altar.favourite === 'sake' || c.altar.favourite === 'inari' || c.altar.favourite === 'cucumber' ? c.altar.favourite : pick(OFFER_FOR_STANDS);
        c.state = 'carry';
        return;
      }
      // Thieves in the open, at or near a stand.
      const thief = this.near(c, 80, o => (o.species === 'tanuki' || o.species === 'kitsune') && !o.disguise && !o.hidden && (o.state === 'eat' || (o.state === 'approach' && !!o.altar && dist(o, o.altar) < 26)));
      if (thief) { c.prey = thief; c.state = 'shoo'; c.timer = 200; this.emote(c, 'bang', 40); return; }
      // A teapot where there wasn't one before.
      const odd = this.near(c, 18, o => !!o.disguise);
      if (odd && Math.random() < 0.3) { c.state = 'puzzle'; c.timer = 80; this.emote(c, 'what', 70); this.setFacing(c, odd.x - c.x); return; }
    }
    c.mood = 'wandering';
    if (--c.timer <= 0) {
      if (Math.random() < 0.4) { c.state = 'sweep'; c.timer = Math.floor(between(150, 300)); return; }
      const row = clamp(Math.round(c.z + between(-120, 120)), 4, this.h - 5);
      c.tx = this.pathX[row] + between(-5, 5); c.tz = row;
      c.timer = Math.floor(between(200, 500));
    }
    if (Math.hypot(c.tx - c.x, c.tz - c.z) > 3) this.walkTo(c, c.tx, c.tz, speed);
    else this.halt(c);
  }

  // --- the wild animals -------------------------------------------------------------

  private thinkMouse(c: ShrineCreature) {
    c.mood = 'wandering';
    if (c.state === 'flee') {
      c.mood = 'fleeing';
      const d = this.walkTo(c, c.tx, c.tz, SHRINE_SPECIES.mouse.speed * 1.8);
      if (--c.timer <= 0 || d < 3) { c.state = 'roam'; c.timer = 30; }
      return;
    }
    if (this.tick % 10 === c.id % 10) {
      const threat = this.near(c, 22, o => (o.species === 'kitsune' && !o.disguise) || o.species === 'kasa' || (o.species === 'owl' && o.state === 'swoop'));
      if (threat) { this.flee(c, threat, 50); return; }
      const altar = this.altars.find(a => a.item && Math.abs(a.x - c.x) < 34 && Math.abs(a.z - c.z) < 24);
      if (altar && Math.random() < 0.2) { c.tx = altar.x; c.tz = altar.z + 3; }
    }
    // Nibbling makes a little go a long way, and new litters keep up the numbers.
    c.energy = Math.min(1, c.energy + 0.0002);
    if (Math.hypot(c.tx - c.x, c.tz - c.z) < 2) {
      if (--c.timer > 0) { this.halt(c); return; }
      this.wanderTarget(c, 30);
      c.timer = Math.floor(between(20, 110));
      if (Math.random() < 0.006 && this.creatures.filter(o => o.species === 'mouse' && o.alive).length < this.populationCap('mouse')) { this.spawn('mouse', c.x, c.z, c); this.births++; }
    } else this.walkTo(c, c.tx, c.tz, SHRINE_SPECIES.mouse.speed);
  }

  private thinkHare(c: ShrineCreature) {
    if (c.h > 0 || c.vh !== 0) { c.h = Math.max(0, c.h + c.vh); c.vh -= 0.12; if (c.h === 0) c.vh = 0; }
    if (c.state === 'flee') {
      c.mood = 'fleeing';
      this.walkTo(c, c.tx, c.tz, SHRINE_SPECIES.hare.speed * 2.2);
      if (this.tick % 7 === 0 && c.h === 0) c.vh = 0.8;
      if (--c.timer <= 0) { c.state = 'roam'; c.timer = 60; }
      return;
    }
    if (this.tick % 12 === c.id % 12) {
      const threat = this.near(c, 30, o => (o.species === 'kitsune' && !o.disguise && o.state === 'hunt') || o.species === 'kasa');
      if (threat) { this.flee(c, threat, 80); return; }
    }
    if (--c.timer <= 0) {
      if (Math.random() < 0.5) { this.wanderTarget(c, 40); c.state = 'hop'; c.timer = 60; }
      else { c.state = 'graze'; c.timer = Math.floor(between(60, 240)); }
    }
    if (c.state === 'hop') {
      c.mood = 'hopping';
      this.walkTo(c, c.tx, c.tz, SHRINE_SPECIES.hare.speed);
      if (this.tick % 14 === 0 && c.h === 0) c.vh = 0.55;
    } else { c.mood = 'grazing'; this.halt(c); c.energy = Math.min(1, c.energy + 0.0003); }
  }

  private thinkDeer(c: ShrineCreature) {
    if (--c.timer <= 0) {
      const roll = Math.random();
      if (roll < 0.45) { c.state = 'graze'; c.timer = Math.floor(between(140, 420)); }
      else { this.wanderTarget(c, 60); c.state = 'walk'; c.timer = Math.floor(between(120, 320)); }
    }
    if (c.state === 'bow') { c.mood = 'bowing'; this.halt(c); return; }
    if (c.state === 'walk') { c.mood = 'wandering'; this.walkTo(c, c.tx, c.tz, SHRINE_SPECIES.deer.speed); }
    else { c.mood = 'grazing'; this.halt(c); c.energy = Math.min(1, c.energy + 0.0002); }
    // Polite: it bows to a broom spirit or a kappa it meets.
    if (this.tick % 30 === c.id % 30) {
      const other = this.near(c, 16, o => o.species === 'hahaki' || (o.species === 'kappa' && o.state === 'ashore'));
      if (other && c.state !== 'bow') {
        this.setFacing(c, other.x - c.x);
        c.state = 'bow'; c.timer = 80;
        if (other.species === 'kappa') { other.state = 'spill'; other.timer = 90; }
      }
    }
  }

  private thinkOwl(c: ShrineCreature) {
    const home = c.home;
    if (c.state === 'perch') {
      c.mood = 'perched';
      c.vx = 0; c.vz = 0;
      if (--c.timer <= 0) {
        const prey = this.near(c, 110, o => o.species === 'mouse');
        if (prey && c.energy < 0.8) { c.prey = prey; c.state = 'swoop'; c.timer = 240; this.emote(c, 'bang', 18); }
        else { c.timer = Math.floor(between(120, 500)); if (Math.random() < 0.3) this.settleOnCedar(c); }
      }
      return;
    }
    if (c.state === 'swoop') {
      c.mood = 'swooping';
      const p = c.prey;
      if (!p?.alive || --c.timer <= 0) { c.state = 'back'; c.prey = null; return; }
      const dx = p.x - c.x, dz = p.z - c.z, d = Math.hypot(dx, dz) || 1;
      c.x += (dx / d) * 0.95; c.z += (dz / d) * 0.95;
      c.h = Math.max(2, c.h - Math.max(0.2, c.h / Math.max(8, d)));
      this.setFacing(c, dx);
      if (d < 4 && c.h < 6) {
        p.alive = false;
        this.deaths.eaten++;
        this.burst('blood', p.x, p.z, 2, 6, 0.4, 0.6);
        this.burst('tuft', p.x, p.z, 3, 4, 0.4, 0.5);
        c.energy = 1;
        c.state = 'back'; c.prey = null;
        this.log('eaten', 'An owl takes a mouse off the path', c);
      }
      return;
    }
    // Flying back up to its tree.
    c.mood = 'flying';
    if (!home) { this.settleOnCedar(c); return; }
    const dx = home.x - c.x, dz = home.z - c.z, d = Math.hypot(dx, dz) || 1;
    c.x += (dx / d) * 0.7; c.z += (dz / d) * 0.7;
    c.h += (home.h - c.h) * 0.03;
    this.setFacing(c, dx);
    if (d < 2) { c.x = home.x; c.z = home.z; c.h = home.h; c.state = 'perch'; c.timer = Math.floor(between(200, 600)); }
  }

  private thinkBat(c: ShrineCreature) {
    c.mood = 'flying';
    if (Math.hypot(c.tx - c.x, c.tz - c.z) < 6 || Math.random() < 0.015) {
      // Flits between the lanterns' moth clouds.
      const moths = this.moths.filter(m => m.alive && Math.abs(m.z - c.z) < 90);
      if (moths.length) { const m = pick(moths); c.tx = m.x; c.tz = m.z; }
      else { c.tx = clamp(c.x + between(-70, 70), 4, this.w - 5); c.tz = clamp(c.z + between(-50, 50), 4, this.h - 5); }
    }
    const dx = c.tx - c.x, dz = c.tz - c.z, d = Math.hypot(dx, dz) || 1;
    c.vx += ((dx / d) * 0.8 - c.vx) * 0.08 + between(-0.08, 0.08);
    c.vz += ((dz / d) * 0.6 - c.vz) * 0.08 + between(-0.08, 0.08);
    c.x = clamp(c.x + c.vx, 2, this.w - 3);
    c.z = clamp(c.z + c.vz, 2, this.h - 3);
    c.h += (16 + Math.sin(this.tick * 0.05 + c.id) * 9 - c.h) * 0.05;
    this.setFacing(c, c.vx);
    if (this.tick % 8 === c.id % 8) {
      for (const m of this.moths) {
        if (m.alive && Math.abs(m.x - c.x) < 3 && Math.abs(m.z - c.z) < 3) {
          m.alive = false; m.wait = Math.floor(between(200, 700));
          c.energy = 1;
          this.meals++;
          break;
        }
      }
    }
  }

  private thinkCrow(c: ShrineCreature) {
    if (c.state === 'perch') {
      c.mood = 'perched';
      if (--c.timer <= 0) {
        const altar = this.altars.filter(a => a.item && Math.abs(a.z - c.z) < 220);
        if (altar.length && Math.random() < 0.7 && !this.hahakiNear(c.x, c.z, 30)) { c.altar = pick(altar); c.state = 'raid'; }
        else this.settleOnCedar(c);
      }
      return;
    }
    if (c.state === 'raid' || c.state === 'away') {
      c.mood = c.state === 'raid' ? 'thieving' : 'flying';
      const a = c.altar;
      const tx = c.state === 'raid' && a ? a.x : c.home?.x ?? c.x;
      const tz = c.state === 'raid' && a ? a.z : c.home?.z ?? c.z;
      const dx = tx - c.x, dz = tz - c.z, d = Math.hypot(dx, dz) || 1;
      const speed = SHRINE_SPECIES.crow.speed;
      c.x += (dx / d) * speed; c.z += (dz / d) * speed;
      this.setFacing(c, dx);
      const wantH = c.state === 'raid' ? (d < 30 ? 7 : 40) : (c.home?.h ?? 50);
      c.h += (wantH - c.h) * 0.05;
      if (c.state === 'raid' && (!a?.item)) { c.state = 'away'; c.altar = null; return; }
      if (c.state === 'raid' && d < 3) {
        // Off with it: a crow takes the whole thing, if the stand has only a bit left.
        c.carrying = a?.item ?? null;
        if (a) { a.bites -= 2; if (a.bites <= 0) { a.item = null; a.wait = 300; this.log('theft', 'A crow has made off with an offering', c); } }
        c.state = 'away';
        c.energy = 1;
        c.altar = null;
        this.burst('leaf', c.x, c.z, 4, 3, 0.4, 0.4);
        return;
      }
      if (c.state === 'away' && d < 3) { c.carrying = null; this.settleOnCedar(c); }
      return;
    }
    if (!c.home) this.settleOnCedar(c);
  }

  private thinkFrog(c: ShrineCreature) {
    if (!c.pond) return;
    if (c.state === 'leap') {
      c.mood = 'hopping';
      c.x += c.vx; c.z += c.vz; c.h += c.vh; c.vh -= 0.09;
      this.setFacing(c, c.vx);
      if (c.h <= 0) {
        c.h = 0; c.state = 'sit'; c.timer = Math.floor(between(80, 340));
        this.burst('ring', c.x, c.z, 0, 1, 0, 0);
        this.burst('splash', c.x, c.z, 0, 3, 0.3, 0.5);
      }
      return;
    }
    c.mood = 'sitting';
    if (this.tick % 12 === c.id % 12) {
      // A firefly within reach of its tongue.
      for (const f of this.fireflies) {
        if (Math.abs(f.x - c.x) < 10 && Math.abs(f.z - c.z) < 8 && f.h < 22) {
          f.life = 0;
          c.energy = 1;
          this.meals++;
          this.burst('star', f.x, f.z, f.h, 1, 0.1, 0.1);
          c.squash = 0.4;
          c.prey = null;
          c.emoteT = 0;
          break;
        }
      }
    }
    if (--c.timer <= 0) {
      // To another pad, or back to the shore.
      const pads = this.pads.filter(p => Math.abs(p.x - c.x) < 34 && Math.abs(p.z - c.z) < 22);
      const pad = pads.length ? pick(pads) : null;
      const spot = pad ?? this.waterSpot(c.pond);
      const tx = spot.x, tz = spot.z;
      const steps = 26;
      c.vx = (tx - c.x) / steps; c.vz = (tz - c.z) / steps;
      c.vh = 1.1;
      c.state = 'leap';
      c.squash = 0.5;
    }
  }

  private thinkKoi(c: ShrineCreature) {
    const w = c.pond;
    if (!w) return;
    c.mood = 'swimming';
    if (c.state === 'jump') {
      c.x += c.vx; c.z += c.vz; c.h += c.vh; c.vh -= 0.1;
      if (c.h <= -1) {
        c.h = -1; c.state = 'roam'; c.timer = Math.floor(between(100, 300));
        this.burst('ring', c.x, c.z, 0, 1, 0, 0);
        this.burst('splash', c.x, c.z, 0, 6, 0.5, 0.9);
      }
      return;
    }
    if (--c.timer <= 0 || Math.hypot(c.tx - c.x, c.tz - c.z) < 4) {
      const p = this.waterSpot(w);
      c.tx = p.x; c.tz = p.z;
      c.timer = Math.floor(between(120, 400));
      // Now and then it leaps for something over the water.
      if (Math.random() < 0.12) {
        c.state = 'jump'; c.vh = 1.3; c.vx = c.facing * 0.5; c.vz = 0;
        this.burst('splash', c.x, c.z, 0, 5, 0.4, 0.8);
        this.burst('ring', c.x, c.z, 0, 1, 0, 0);
        return;
      }
    }
    const dx = c.tx - c.x, dz = c.tz - c.z, d = Math.hypot(dx, dz) || 1;
    const speed = SHRINE_SPECIES.koi.speed;
    c.vx += ((dx / d) * speed - c.vx) * 0.05;
    c.vz += ((dz / d) * speed - c.vz) * 0.05;
    if (this.isWater(c.x + c.vx * 6, c.z + c.vz * 6)) { c.x += c.vx; c.z += c.vz; }
    else { c.vx *= -0.3; c.vz *= -0.3; c.timer = 0; }
    this.setFacing(c, c.vx);
    if (this.pointer && Math.hypot(this.pointer.x - c.x, this.pointer.z - c.z) < 14 && Math.random() < 0.05) {
      c.tx = c.x + (c.x - this.pointer.x) * 3; c.tz = c.z + (c.z - this.pointer.z) * 3;
    }
  }

  private thinkKappa(c: ShrineCreature) {
    const w = c.pond;
    if (!w) return;
    if (c.state === 'spill') {
      // Bowed back, and the water from its dish all spilled: it goes weak and wobbles home.
      c.mood = 'spilling';
      this.halt(c);
      if (this.tick % 8 === 0) this.burst('splash', c.x + c.facing * 3, c.z, 8, 3, 0.3, 0.3);
      if (--c.timer <= 0) { c.state = 'home'; c.timer = 400; }
      return;
    }
    if (c.state === 'ashore' || c.state === 'home') {
      c.mood = 'wandering';
      const altar = this.altars.find(a => a.favourite === 'cucumber' && dist(a, w) < w.rx + 50);
      const tx = c.state === 'home' || !altar ? w.x : altar.x;
      const tz = c.state === 'home' || !altar ? w.z : altar.z + 3;
      // Water is no obstacle to a kappa.
      const dx = tx - c.x, dz = tz - c.z, d = Math.hypot(dx, dz) || 1;
      c.x += (dx / d) * 0.14; c.z += (dz / d) * 0.14;
      this.setFacing(c, dx);
      c.h = this.isWater(c.x, c.z) ? -3 : 0;
      if (d < 4) {
        if (c.state === 'home' || !altar) { c.state = 'swim'; c.timer = Math.floor(between(300, 900)); return; }
        if (altar.item === 'cucumber') { altar.bites = 0; altar.item = null; altar.wait = 200; this.burst('crumb', altar.x, altar.z, 8, 4, 0.3, 0.4); this.meals++; this.emote(c, 'heart', 50); this.log('offering', `${c.name} the kappa took the cucumber`, c); }
        c.state = 'home'; c.timer = 300;
      }
      if (this.tick % 40 === 0 && !this.isWater(c.x, c.z) && this.near(c, 16, o => o.species === 'hahaki')) { c.state = 'spill'; c.timer = 80; this.emote(c, 'what', 30); }
      return;
    }
    // In the pond: only the head and dish show.
    c.mood = 'swimming';
    c.h = -3;
    if (Math.hypot(c.tx - c.x, c.tz - c.z) < 4) {
      const p = this.waterSpot(w);
      c.tx = p.x; c.tz = p.z;
    }
    const dx = c.tx - c.x, dz = c.tz - c.z, d = Math.hypot(dx, dz) || 1;
    c.x += (dx / d) * 0.1; c.z += (dz / d) * 0.1;
    this.setFacing(c, dx);
    if (--c.timer <= 0) {
      const has = this.altars.some(a => a.favourite === 'cucumber' && a.item && dist(a, w) < w.rx + 50);
      if (has) { c.state = 'ashore'; c.timer = 500; }
      else c.timer = Math.floor(between(200, 600));
    }
  }

  isWater(x: number, z: number) {
    const xi = Math.round(x), zi = Math.round(z);
    if (xi < 0 || xi >= this.w || zi < 0 || zi >= this.h) return false;
    return this.ground[zi * this.w + xi] === GROUND.water;
  }

  private thinkKodama(c: ShrineCreature) {
    c.mood = 'watching';
    // They tilt their heads in turn, and duck behind the roots when something big comes close.
    if (this.tick % 20 === c.id % 20) {
      const big = this.near(c, 16, o => o.species === 'hahaki' || o.species === 'deer' || ((o.species === 'tanuki' || o.species === 'kitsune') && !o.disguise));
      c.state = big ? 'shy' : 'roam';
    }
    if (c.home) {
      c.x += Math.sin(this.tick * 0.01 + c.id) * 0.012;
    }
  }

  private thinkHitodama(c: ShrineCreature) {
    c.mood = 'drifting';
    c.h += (14 + Math.sin(this.tick * 0.03 + c.id) * 8 - c.h) * 0.04;
    if (Math.hypot(c.tx - c.x, c.tz - c.z) < 4 || Math.random() < 0.003) {
      c.tx = clamp(c.x + between(-50, 50), 4, this.w - 5); c.tz = clamp(c.z + between(-36, 36), 4, this.h - 5);
      if (this.inClearZone(c.tx, c.tz)) { c.tx = c.x; c.tz = c.z; }
    }
    const dx = c.tx - c.x, dz = c.tz - c.z, d = Math.hypot(dx, dz) || 1;
    if (this.inClearZone(c.x + dx / d, c.z + dz / d) && !this.inClearZone(c.x, c.z)) { c.tx = c.x; c.tz = c.z; return; }
    c.x += (dx / d) * SHRINE_SPECIES.hitodama.speed; c.z += (dz / d) * SHRINE_SPECIES.hitodama.speed;
  }

  private thinkKasa(c: ShrineCreature) {
    if (c.h > 0 || c.vh !== 0) { c.h = Math.max(0, c.h + c.vh); c.vh -= 0.11; if (c.h === 0) { c.vh = 0; c.squash = 0.5; this.burst('dust', c.x, c.z, 0, 1, 0.2, 0.2); } }
    c.mood = 'hopping';
    if (Math.hypot(c.tx - c.x, c.tz - c.z) < 4 || Math.random() < 0.004) this.wanderTarget(c, 60);
    if (this.tick % 26 === c.id % 26 && c.h === 0) {
      c.vh = 1;
      this.walkTo(c, c.tx, c.tz, 0.2);
      c.squash = 0.4;
    }
    if (c.h > 0) { c.vx = c.vx || 0; c.vz = c.vz || 0; this.walkTo(c, c.tx, c.tz, SHRINE_SPECIES.kasa.speed * 1.2); }
    // Leaps out at anyone in the open, for the fun of it.
    if (this.tick % 40 === c.id % 40) {
      const mark = this.near(c, 18, o => (o.species === 'tanuki' || o.species === 'kitsune') && !o.disguise && !o.hidden && o.state === 'roam');
      if (mark && Math.random() < 0.3) { this.emote(mark, 'bang', 40); mark.vh = 1; this.flee(mark, c, 70); c.vh = 1.3; }
    }
  }

  private thinkChochin(c: ShrineCreature) {
    c.mood = 'drifting';
    c.h += (18 + Math.sin(this.tick * 0.025 + c.id) * 6 - c.h) * 0.03;
    if (Math.hypot(c.tx - c.x, c.tz - c.z) < 4 || Math.random() < 0.002) {
      // Down the approach, looking for company among the real lanterns.
      const row = clamp(Math.round(c.z + between(-90, 90)), 4, this.h - 5);
      c.tx = this.pathX[row] + between(-20, 20); c.tz = row;
    }
    const dx = c.tx - c.x, dz = c.tz - c.z, d = Math.hypot(dx, dz) || 1;
    if (this.inClearZone(c.x + dx / d, c.z + dz / d) && !this.inClearZone(c.x, c.z)) { c.tx = c.x; c.tz = c.z; return; }
    c.x += (dx / d) * SHRINE_SPECIES.chochin.speed; c.z += (dz / d) * SHRINE_SPECIES.chochin.speed;
    this.setFacing(c, dx);
  }

  // --- small things ---------------------------------------------------------------------

  private updateMotes() {
    const motes = this.motes;
    for (let i = motes.length - 1; i >= 0; i--) {
      const m = motes[i];
      m.life--;
      if (m.life <= 0) { motes[i] = motes[motes.length - 1]; motes.pop(); continue; }
      m.x += m.vx; m.z += m.vz; m.h += m.vh;
      switch (m.kind) {
        case 'smoke': m.vx *= 0.9; m.vz *= 0.9; m.vh *= 0.92; break;
        case 'dust': m.vx *= 0.85; m.vz *= 0.85; m.vh *= 0.85; break;
        case 'leaf': case 'greenLeaf': case 'petal':
          m.vh = -0.09; m.vx = Math.sin(this.tick * 0.08 + m.seed) * 0.16 + 0.04;
          if (m.h <= 0) { m.h = 0; m.vx = 0; m.vz = 0; m.vh = 0; }
          break;
        case 'note': case 'heart': m.vx = Math.sin(this.tick * 0.1 + m.seed) * 0.08; m.vh = 0.14; break;
        case 'star': m.vh -= 0.03; break;
        case 'ember': m.vh = 0.05; m.vx += between(-0.02, 0.02); break;
        case 'ring': break;
        default:
          m.vh -= 0.07;
          if (m.h <= 0) { m.h = 0; m.vx = 0; m.vz = 0; m.vh = 0; }
      }
    }
    // Leaves falling from the maples near the view, all the time.
    if (this.tick % 22 === 0 && this.maples.length && this.motes.length < MAX_MOTES - 50) {
      const near = this.maples.filter(p => p.z > this.viewZ.z0 - 40 && p.z < this.viewZ.z1 + 60);
      if (near.length) {
        const p = pick(near);
        const h = (p.size * 1.6) / ELEVATION;
        this.motes.push({ kind: 'leaf', x: p.x + between(-p.size, p.size), z: p.z + between(-3, 3), h, vx: 0, vz: 0, vh: -0.1, life: Math.floor(h / 0.09) + 120, max: 500, seed: Math.floor(Math.random() * 3) });
      }
    }
  }

  private updateFireflies() {
    const flies = this.fireflies;
    const event = this.happening?.kind === 'fireflies';
    this.syncFlash += ((event ? 1 : 0) - this.syncFlash) * 0.003;
    for (let i = flies.length - 1; i >= 0; i--) {
      const f = flies[i];
      f.life--;
      if (f.life <= 0) { flies[i] = flies[flies.length - 1]; flies.pop(); continue; }
      f.vx += between(-0.012, 0.012); f.vz += between(-0.01, 0.01);
      f.vx *= 0.97; f.vz *= 0.97;
      f.x += f.vx; f.z += f.vz;
      f.h += Math.sin(this.tick * 0.03 + f.phase) * 0.05;
    }
    const want = event ? 620 : 30;
    if (flies.length < want && this.tick % (event ? 1 : 20) === 0) {
      for (let k = 0; k < (event ? 5 : 1); k++) {
        const z = between(this.viewZ.z0 - 40, this.viewZ.z1 + 60);
        this.addFirefly(between(0, this.w), clamp(z, 0, this.h - 1));
      }
    }
  }

  private updateMoths() {
    for (const m of this.moths) {
      if (!m.alive) {
        if (--m.wait <= 0) m.alive = true;
        continue;
      }
      m.a += 0.09 + Math.sin(this.tick * 0.03 + m.r) * 0.04;
      m.x = m.lantern.x + Math.cos(m.a) * m.r;
      m.z = m.lantern.z + Math.sin(m.a) * m.r * 0.6;
    }
  }

  private updateCanes() {
    // Anything walking through a stand of bamboo or grass pushes it aside; the rest sway on the breeze.
    if (this.tick % 3) return;
    const { z0, z1 } = this.viewZ;
    const pushers = this.creatures.filter(c => c.alive && c.h < 10 && c.z > z0 - 20 && c.z < z1 + 100 && (Math.abs(c.vx) + Math.abs(c.vz) > 0.04) && c.species !== 'koi' && c.species !== 'bat');
    for (const c of this.canes) {
      if (c.z < z0 - 30 || c.z > z1 + 100) continue;
      for (const p of pushers) {
        const dx = c.x - p.x;
        if (Math.abs(dx) < 7 && Math.abs(c.z - p.z) < 5) { c.bv += (dx > 0 ? 1 : -1) * 0.5; break; }
      }
      c.bv += -c.bx * 0.08;
      c.bv *= 0.88;
      c.bx += c.bv;
    }
  }

  private updateAltars() {
    // Also, a passing worshipper leaves something now and then, when the brooms fall behind.
    if (this.tick % 90 === 0) {
      for (const a of this.altars) {
        if (a.item) continue;
        if (a.wait > 0) a.wait -= 90;
        else if (a.wait < -3000) { a.item = a.favourite; a.bites = 3; a.wait = 0; }
        else a.wait -= 90;
      }
    }
  }

  private updateScenery() {
    // The deer-scarer fills, tips and knocks: a clack everyone nearby looks up at.
    const s = this.spout;
    s.t++;
    if (s.t > 300) {
      s.t = 0;
      s.tip = 30;
      for (const c of this.creatures) {
        if (c.species === 'hare' && c.state !== 'flee') for (const q of this.props) {
          if (q.kind === 'spout' && Math.hypot(q.x - c.x, q.z - c.z) < 60) { this.emote(c, 'bang', 30); break; }
        }
      }
    }
    if (s.tip > 0) s.tip--;
  }

  // --- happenings --------------------------------------------------------------------

  startHappening(kind: ShrineHappening) {
    if (this.happening?.kind === 'parade') this.parade = null;
    this.happening = { kind, t: 0, dur: HAPPENING_LENGTH[kind] };
    if (kind === 'parade') this.startParade();
    if (kind === 'festival') {
      // Every stand heaped up, and paper lanterns afloat on every pond.
      for (const a of this.altars) { a.item = a.favourite; a.bites = 5; a.wait = 0; }
      for (const w of this.waters) {
        for (let k = 0; k < 7; k++) {
          const at = this.waterSpot(w);
          this.skies.push({ x: at.x, z: at.z, h: 0, drift: between(-0.03, 0.03), life: HAPPENING_LENGTH.festival - Math.floor(between(0, 400)), floating: w, phase: Math.random() * 6.28 });
        }
      }
      this.log('visit', 'The lantern festival begins', null);
    } else if (kind === 'fireflies') this.log('visit', 'A firefly night', null);
  }

  private updateHappening() {
    const ev = this.happening;
    const kind = ev?.kind;
    this.festivalLight += ((kind === 'festival' && ev && ev.t < ev.dur - 120 ? 1 : 0) - this.festivalLight) * 0.02;
    this.ghostLight += ((this.parade ? 1 : 0) - this.ghostLight) * 0.02;
    if (kind === 'festival' && ev && this.tick % 8 === 0 && ev.t < ev.dur - 300) {
      // Sky lanterns lifting off over the view.
      this.skies.push({ x: between(0, this.w), z: between(this.viewZ.z0, this.viewZ.z1 + 80), h: 0, drift: between(-0.05, 0.05), life: Math.floor(between(500, 900)), floating: null, phase: Math.random() * 6.28 });
    }
    for (let i = this.skies.length - 1; i >= 0; i--) {
      const s = this.skies[i];
      s.life--;
      if (s.life <= 0) { this.skies.splice(i, 1); continue; }
      if (s.floating) { s.x += Math.sin(this.tick * 0.01 + s.phase) * 0.03 + s.drift; }
      else { s.h += 0.14; s.x += s.drift + Math.sin(this.tick * 0.02 + s.phase) * 0.05; }
    }
    if (kind === 'festival' && this.tick % 60 === 0) {
      // The rivals forget themselves: drumming and barking all down the page.
      for (const c of this.creatures) {
        if ((c.species === 'tanuki' || c.species === 'kitsune') && c.state === 'roam' && Math.random() < 0.25) { c.state = 'perform'; c.timer = Math.floor(between(120, 260)); }
      }
    }
    if (kind === 'fireflies' && this.tick % 50 === 0) {
      // Kits and cubs chase them, hopping.
      for (const c of this.creatures) if ((c.species === 'tanuki' || c.species === 'kitsune') && this.isYoung(c) && c.h === 0) c.vh = 0.7;
    }
    if (ev) {
      ev.t++;
      if (ev.t >= ev.dur) this.happening = null;
    } else if (--this.nextHappening <= 0) {
      const next = this.happeningOrder.shift() as ShrineHappening;
      this.happeningOrder.push(next);
      this.startHappening(next);
      this.nextHappening = Math.floor(between(130, 260)) * TICKS_PER_SECOND;
    }
  }

  private startParade() {
    const line: Marcher['kind'][] = ['chochin', 'oni', 'tengu', 'kasa', 'biwa', 'oniBlue', 'roku', 'momen', 'nurikabe', 'kasa', 'nine', 'chochin', 'oni', 'kasa', 'tengu', 'teapot'];
    const make = (kind: Marcher['kind'], back: number, side: number): Marcher => {
      const fly = kind === 'momen' || kind === 'hitodama' || kind === 'chochin';
      return { kind, back, side, x: 0, z: 0, h: kind === 'momen' ? 16 : kind === 'hitodama' ? 14 : kind === 'chochin' ? 8 : 0, facing: 1, phase: Math.random() * 6.28, fly };
    };
    const marchers: Marcher[] = [];
    // In single file down the middle of the path, the big ones given more room.
    let back = 0;
    for (const kind of line) {
      back += kind === 'nurikabe' || kind === 'nine' || kind === 'roku' ? 30 : 20;
      marchers.push(make(kind, back, between(-1.5, 1.5)));
    }
    // Soul-flames carried along both verges, lighting the way.
    for (let f = 0; f <= back + 10; f += 28) {
      marchers.push(make('hitodama', f, -(PATH_HALF + 9)));
      marchers.push(make('hitodama', f + 14, PATH_HALF + 9));
    }
    const length = back + 24;
    // From just above wherever the visitor is, on down the page.
    const speed = 0.3;
    const startRow = Math.max(-10, this.viewZ.z0 - 16);
    const head = startRow < 0 ? startRow : this.pathArc[Math.min(this.h - 1, startRow | 0)];
    this.parade = { head, headRow: startRow, tailRow: startRow - length, speed, length, marchers };
    if (this.happening) this.happening.dur = Math.ceil((this.pathArc[this.h - 1] - head + length + 60) / speed);
    this.log('visit', 'The night parade of a hundred demons is coming down the path', null);
  }

  private updateParade() {
    const p = this.parade;
    if (!p) return;
    p.head += p.speed;
    p.headRow = this.rowAlong(p.head);
    p.tailRow = this.rowAlong(p.head - p.length);
    // Everyone follows the path's bends, turning as it turns.
    for (const m of p.marchers) {
      m.z = this.rowAlong(p.head - m.back);
      m.x = this.pathAt(m.z) + m.side;
      const slope = this.pathAt(m.z + 8) - this.pathAt(m.z - 8);
      if (Math.abs(slope) > 1.5) m.facing = slope > 0 ? 1 : -1;
    }
    if (this.tick % 7 === 0) {
      const m = pick(p.marchers);
      if (m.z > 0 && m.z < this.h) this.burst(m.fly ? 'ember' : 'dust', m.x, m.z, m.fly ? m.h : 0, 1, 0.1, 0.2);
    }
    // Whoever is on the path gets off it, or bows from the verge.
    if (this.tick % 15 === 0) {
      for (const c of this.creatures) {
        if (!c.alive || c.h > 20 || c.z > p.headRow + 40 || c.z < p.tailRow) continue;
        const px = this.pathAt(c.z);
        if (Math.abs(c.x - px) > 24) continue;
        if (c.species === 'mouse' || c.species === 'hare') this.flee(c, { x: px, z: c.z }, 60);
        else if ((c.species === 'hahaki' || c.species === 'deer') && c.state !== 'bow') { c.state = 'bow'; c.timer = 140; }
      }
    }
    if (p.tailRow > this.h + 30) {
      this.parade = null;
      if (this.happening?.kind === 'parade') this.happening = null;
    }
  }

  // --- the page's windows on it --------------------------------------------------------

  stats(): ShrineStats {
    const counts = this.countAll();
    return {
      tick: this.tick,
      counts,
      disguised: this.creatures.filter(c => c.alive && c.disguise).length,
      score: { ...this.score },
      scraps: this.scraps, shifts: this.shifts, caught: this.caught,
      stocked: this.altars.filter(a => a.item).length, altars: this.altars.length,
      births: this.births, meals: this.meals,
      deaths: { ...this.deaths },
      fireflies: this.fireflies.length,
      happening: this.happening ? { kind: this.happening.kind, progress: this.happening.t / this.happening.dur } : null,
      events: this.events.slice(0, 6),
    };
  }

  adopt(c: ShrineCreature, name: string) {
    c.name = name;
    c.adopted = true;
  }

  release(saved: ShrineSpecies, name: string, palette: number) {
    // A creature saved under a species that has since gone comes back as a tanuki.
    const species: ShrineSpecies = SHRINE_SPECIES[saved] ? saved : 'tanuki';
    const water = species === 'koi' || species === 'frog' || species === 'kappa';
    const w = water && this.waters.length ? pick(this.waters) : null;
    const c = water && !w ? this.spawn('tanuki') : this.spawn(species, w?.x, w?.z);
    c.pond = w;
    c.palette = palette % SHRINE_SPECIES[c.species].palettes;
    c.age = Math.max(c.age, SHRINE_SPECIES[c.species].mature);
    this.adopt(c, name);
    if (c.species === 'tanuki' || c.species === 'kitsune' || c.species === 'mouse') { const r = this.spawn(c.species, c.x + 6, c.z + 2, c); r.age = SHRINE_SPECIES[c.species].mature; r.lineId = c.lineId; }
    return c;
  }

  heirOf(c: ShrineCreature) {
    let heir: ShrineCreature | null = null;
    for (const o of this.creatures) {
      if (o.alive && o !== c && o.lineId === c.lineId && (!heir || o.age > heir.age)) heir = o;
    }
    return heir;
  }

  debugSpawn(kind: ShrineSpawnable, x: number, z: number) {
    if (kind === 'teapot' || kind === 'lantern' || kind === 'statue') {
      const c = this.spawn(Math.random() < 0.5 ? 'tanuki' : 'kitsune', x, z);
      this.startDisguise(c, kind);
      return;
    }
    if (kind === 'koi' || kind === 'frog' || kind === 'kappa') {
      if (!this.waters.length) return;
      const w = this.waters.reduce((b, q) => (Math.hypot(q.x - x, q.z - z) < Math.hypot(b.x - x, b.z - z) ? q : b));
      const c = this.spawn(kind, w.x, w.z);
      c.pond = w;
      c.state = kind === 'frog' ? 'sit' : kind === 'kappa' ? 'swim' : 'roam';
      return;
    }
    const c = this.spawn(kind, x, z);
    if (kind === 'owl' || kind === 'crow') this.settleOnCedar(c);
    if (kind === 'bat' || kind === 'hitodama' || kind === 'chochin') c.h = 18;
    if (kind === 'kodama') c.home = { x, z, h: 0 };
  }
}

/** How high (rows) a bridge's deck stands at an offset from its middle: its arch, climbing off the ground at each end. */
export const bridgeRise = (w: number) => Math.round(w * 0.2);
export const bridgeDeck = (w: number, offset: number) => {
  const t = Math.min(1, Math.abs(offset) / (w / 2));
  return (1 - t * t) * bridgeRise(w) + Math.min(5, (w / 2 - Math.abs(offset)) * 0.8);
};

/** The part of a precinct the approach has to go round; the softer kinds it can run through. */
const siteBox = (kind: SiteKind, x: number, z: number, k: number) => {
  const box = (hw: number, up: number, down: number) => ({ x0: x - hw, x1: x + hw, z0: z - up, z1: z + down });
  switch (kind) {
    case 'koi': return box(50 * k + 8, 41 * k + 8, 41 * k + 8);
    case 'hall': return box(58, 12, 46);
    case 'pagoda': return box(34, 8, 28);
    case 'sacred': return box(34, 6, 30);
    case 'inari': return box(30, 6, 16);
    case 'den': return box(36, 6, 24);
    default: return null;
  }
};

const DISGUISE_ROTATION: DisguiseKind[] = ['teapot', 'lantern', 'statue'];
const OFFERING_NAME: Record<string, string> = { rice: 'rice balls', inari: 'inari sushi', sake: 'sake', mikan: 'mikan', fish: 'fish', cucumber: 'cucumber' };
