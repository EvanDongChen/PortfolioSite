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

export type ShrineSpecies = 'tanuki' | 'kitsune' | 'hahaki' | 'mouse' | 'hare' | 'deer' | 'owl' | 'bat' | 'crow' | 'frog' | 'koi' | 'kappa' | 'kodama' | 'hitodama' | 'kasa' | 'chochin' | 'baku' | 'tsuchinoko' | 'nekomata' | 'akaname';
export const SHRINE_SPECIES_LIST: ShrineSpecies[] = ['tanuki', 'kitsune', 'hahaki', 'mouse', 'hare', 'deer', 'owl', 'bat', 'crow', 'frog', 'koi', 'kappa', 'kodama', 'hitodama', 'kasa', 'chochin', 'baku', 'tsuchinoko', 'nekomata', 'akaname'];

export type ShrineMood = 'wandering' | 'sniffing' | 'sneaking' | 'pretending' | 'changing' | 'eating' | 'facing off' | 'scrapping' | 'fleeing' | 'sleeping' | 'drumming' | 'barking' | 'hunting' | 'pouncing' | 'following' | 'courting'
  | 'sweeping' | 'carrying' | 'bowing' | 'shooing' | 'puzzled' | 'grazing' | 'perched' | 'flying' | 'swooping' | 'sitting' | 'swimming' | 'hopping' | 'drifting' | 'watching' | 'thieving' | 'spilling' | 'sipping' | 'rolling' | 'dancing' | 'nibbling' | 'soaking' | 'licking' | 'moonviewing' | 'prowling' | 'pecking' | 'kicking' | 'chasing' | 'dazed' | 'lurking' | 'cackling' | 'out cold';

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
  kasa: { label: 'Kasa-obake', names: ['Old Umbrella'], speed: 0.2, palettes: 1, mature: 0, old: Infinity, hunger: 0, perArea: 170000, min: 2 },
  nekomata: { label: 'Nekomata', names: ['Tama', 'Kuro', 'Yoru', 'Mike'], speed: 0.16, palettes: 1, mature: 0, old: Infinity, hunger: 0, perArea: 300000, min: 2 },
  akaname: { label: 'Akaname', names: ['Akaname'], speed: 0.14, palettes: 1, mature: 0, old: Infinity, hunger: 0, perArea: 400000, min: 2 },
  baku: { label: 'Baku', names: ['Old Dream-eater', 'Yumekui', 'Hakutaku'], speed: 0.13, palettes: 1, mature: 0, old: Infinity, hunger: 0, perArea: 450000, min: 2 },
  tsuchinoko: { label: 'Tsuchinoko', names: ['Tsuchinoko'], speed: 0.55, palettes: 1, mature: 0, old: Infinity, hunger: 0, perArea: 450000, min: 2 },
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
  /** The berries or fruit it's making for. */
  food: BerryBush | Fruit | null;
  /** The hot spring it's making for or sitting in. */
  spring: HotSpring | null;
  /** The roof or beam a nekomata is walking, or the basin an akaname is after. */
  perch: Perch | null;
  basin: Basin | null;
  /** The mushroom ring it's dancing in, and where round it. */
  ring: MushroomRing | null; angle: number;
  /** Up on a bridge's arch, its height set by the deck. */
  onBridge: boolean;
  /** Which cedar or pond it belongs to. */
  home: { x: number; z: number; h: number } | null;
  pond: Water | null;
  /** Whoever is onto this disguise: a crow pecking it, or a fox with suspicions. */
  pest: ShrineCreature | null;
  /** The drum circle it's playing or dancing in. */
  drum: DrumCircle | null;
  /** What it means to turn into next, if it has made up its mind. */
  nextForm: DisguiseKind | null;
}
export type Emote = 'bang' | 'what' | 'zed' | 'note' | 'heart';

/** Tall or solid things in the scene. */
export type PropKind = 'sakura' | 'teahouse' | 'teapotProp' | 'persimmonTree' | 'cedar' | 'sacred' | 'maple' | 'goldMaple' | 'torii' | 'honden' | 'pagoda' | 'hokora' | 'jizo' | 'foxStatue' | 'tanukiStatue' | 'lionStatue' | 'rock' | 'spout';
export interface Prop { kind: PropKind; x: number; z: number; size: number; seed: number; flip: boolean }
/** Low plants, baked into the floor. */
export type LowPlant = 'fern' | 'grass' | 'shroom' | 'hydrangea' | 'lily' | 'persimmon';
export interface Low { kind: LowPlant; x: number; z: number; seed: number; variant: number }
/** A stem that sways and bends away from whatever brushes it. */
export interface Cane { kind: 'bamboo' | 'susuki'; x: number; z: number; len: number; seed: number; phase: number; bx: number; bv: number }
/** A bush with berries that get eaten and grow back. */
export type BushKind = 0 | 1 | 2;
export interface BerryBush { x: number; z: number; kind: BushKind; berries: number; regrow: number; seed: number }
export const BUSH_BERRIES = 6;
/** A persimmon on its way down from the tree, or lying where it fell. */
export interface Fruit { x: number; z: number; h: number; vh: number; life: number }
/** A fairy ring of glowing mushrooms, where foxes come to dance. */
export interface MushroomRing { x: number; z: number; rx: number; rz: number; shrooms: { x: number; z: number; seed: number }[]; dancers: number }
/** A cross-beam of a wisteria pergola over the path, and a hanging spray of its flowers. */
export interface WisteriaBeam { x: number; z: number; w: number }
export interface Strand { x: number; z: number; len: number; seed: number; phase: number; bx: number; bv: number }
/** A steaming pool in the rocks, with places to sit in it. */
export interface HotSpring { x: number; z: number; rx: number; rz: number; seats: number }
/** The ridge of a roof or the top of a gate: somewhere high for a cat to walk. */
export interface Perch { x0: number; x1: number; z: number; h: number }
/** A stone water basin, slowly fouling until an akaname licks it clean. */
export interface Basin { x: number; z: number; dirt: number }
/** Tracks in raked gravel, filling back in. */
export interface Print { x: number; z: number; life: number }
export const PRINT_LIFE = 660;
export interface Lantern { x: number; z: number; phase: number; mossy: number }
/** A rope strung across the approach for the festival, hung with paper lanterns. */
export interface Festoon { x0: number; x1: number; z: number; seed: number }
export interface Altar { x: number; z: number; item: OfferingKind | null; favourite: OfferingKind; bites: number; wait: number; shrine: boolean }
export interface Water { x: number; z: number; rx: number; rz: number; moonX: number; moonZ: number }
export interface Bridge { x: number; z: number; w: number }
export interface Pad { x: number; z: number; r: number; tone: number; flower: number; phase: number; load: number }
export type MoteKind = 'sakura' | 'steam' | 'dream' | 'spore' | 'smoke' | 'dust' | 'star' | 'note' | 'heart' | 'leaf' | 'crumb' | 'blood' | 'tuft' | 'ring' | 'ember' | 'petal' | 'splash' | 'greenLeaf';
export interface Mote { kind: MoteKind; x: number; z: number; h: number; vx: number; vz: number; vh: number; life: number; max: number; seed: number }
export interface Firefly { x: number; z: number; h: number; vx: number; vz: number; phase: number; life: number }
export interface Moth { lantern: Lantern; a: number; r: number; h: number; x: number; z: number; alive: boolean; wait: number }
export interface SkyLantern { x: number; z: number; h: number; drift: number; life: number; floating: Water | null; phase: number }
/** A tanuki drumming its belly, and everyone it has drawn in to dance round it. */
export interface DrumCircle {
  x: number; z: number; rx: number; rz: number; drummer: ShrineCreature;
  t: number; dur: number; beatAt: number; beats: number; pulse: boolean;
  /** Counts up from the final note, while everybody stares. */
  stunned: number; over: boolean;
}
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

export type ShrineHappening = 'festival' | 'fireflies' | 'parade' | 'moonview' | 'contest';
export type SiteKind = 'hall' | 'inari' | 'den' | 'koi' | 'bamboo' | 'lilies' | 'maples' | 'sacred' | 'pagoda' | 'zen' | 'ring' | 'sakura' | 'teahouse' | 'onsen';
const SITE_KINDS: SiteKind[] = ['hall', 'koi', 'inari', 'maples', 'den', 'bamboo', 'sacred', 'lilies', 'pagoda', 'zen', 'ring'];
export interface Site { kind: SiteKind; x: number; z: number; rx: number; rz: number }

export type ShrineSpawnable = ShrineSpecies | 'teapot' | 'lantern' | 'statue' | 'bush' | 'dance' | 'peck' | 'sniff' | 'boo' | 'drum';

/** What the rivals turn into in the great contest, in order, each bigger and sillier than the last. */
export const CONTEST_FORMS = ['teapot', 'lantern', 'statue', 'mushroom', 'koi', 'torii'] as const;
export type ContestForm = typeof CONTEST_FORMS[number];
/** The disguise contest: two rivals taking turns on a little stage, and it ends badly. */
export interface Contest {
  x: number; z: number; side: 1 | -1;
  a: ShrineCreature; b: ShrineCreature;
  round: number; t: number;
  stage: 'gather' | 'show' | 'over';
}
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
  berries: number;
  berriesFull: number;
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

export const GROUND = { moss: 0, stone: 1, gravel: 2, water: 3, rim: 4, spring: 5 } as const;

const PATH_HALF = 7;
const RIVALS: ShrineSpecies[] = ['tanuki', 'kitsune'];
const OFFER_FOR_STANDS: OfferingKind[] = ['rice', 'mikan', 'fish', 'rice', 'mikan'];
const MAX_MOTES = 700;
const HAPPENING_LENGTH: Record<ShrineHappening, number> = { festival: 60 * TICKS_PER_SECOND, fireflies: 50 * TICKS_PER_SECOND, parade: 120 * TICKS_PER_SECOND, moonview: 60 * TICKS_PER_SECOND, contest: 80 * TICKS_PER_SECOND };

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
  /** Each water cell's distance from the shore, in thirds of a cell. */
  shoreDepth = new Uint16Array(0);
  /** How far the path reaches either side of pathX on each row: wider where it runs sideways, so it keeps its width. */
  pathHalf = new Float32Array(0);
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
  springs: HotSpring[] = [];
  perches: Perch[] = [];
  basins: Basin[] = [];
  prints: Print[] = [];
  contest: Contest | null = null;
  /** Where the moonlight's falling on the viewing, while it lasts. */
  moonview: { x: number; z: number } | null = null;
  bushes: BerryBush[] = [];
  fruits: Fruit[] = [];
  rings: MushroomRing[] = [];
  beams: WisteriaBeam[] = [];
  strands: Strand[] = [];
  private maples: Prop[] = [];
  private cedars: Prop[] = [];
  private dens: { kind: ShrineSpecies; x: number; z: number }[] = [];

  creatures: ShrineCreature[] = [];
  motes: Mote[] = [];
  fireflies: Firefly[] = [];
  moths: Moth[] = [];
  skies: SkyLantern[] = [];
  tussles: Tussle[] = [];
  drums: DrumCircle[] = [];
  parade: Parade | null = null;
  happening: { kind: ShrineHappening; t: number; dur: number } | null = null;
  /** How far the lanterns have gone over to ghost blue for the parade (0 to 1), and how far the festival has lit up. */
  ghostLight = 0;
  festivalLight = 0;
  /** How far the fireflies' flashes have fallen into step. */
  syncFlash = 0;
  nextHappening = 50 * TICKS_PER_SECOND;
  private happeningOrder: ShrineHappening[] = ['fireflies', 'contest', 'parade', 'moonview', 'festival'];
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
  /** How many jump scares and drum circles there have been, for checking they turn up often enough. */
  scares = 0;
  drumCircles = 0;
  private lastScene = 0;
  private lastDrum = -DRUM_GAP;
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
    this.endDrums();
    this.props = []; this.low = []; this.canes = []; this.lanterns = []; this.festoons = [];
    this.altars = []; this.waters = []; this.bridges = []; this.pads = []; this.sites = [];
    this.bushes = []; this.fruits = []; this.rings = []; this.beams = []; this.strands = [];
    this.springs = []; this.perches = []; this.basins = []; this.prints = [];
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
    const opening: SiteKind[] = ['koi', 'hall', 'sakura', 'ring', 'onsen', 'teahouse', 'sacred'];
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
      z += 100 + r() * 46;
      side = -side;
    }

    // The approach bends round the hero text and anything solid in its way, then is paved.
    const clearAll = () => {
      for (const q of this.zones) {
        if (q.x0 > PATH_HALF * 2 + 8) this.bendPath(q.x0 - 6, q.x1, q.z0 - 6, q.z1 + 6, -1);
      }
      for (const s of planned) {
        const box = siteBox(s.kind, s.x, s.z, s.k);
        if (box) this.bendPath(box.x0, box.x1, box.z0, box.z1, s.x < w / 2 ? 1 : -1);
      }
    };
    for (let pass = 0; pass < 4; pass++) {
      clearAll();
      this.smoothPath(pass < 3 ? 28 : 14);
    }
    clearAll();
    this.smoothPath(8);
    for (let row = 0; row < h; row++) this.pathX[row] = clamp(this.pathX[row], PATH_HALF + 2, w - PATH_HALF - 3);
    this.pathHalf = new Float32Array(h);
    for (let row = 0; row < h; row++) {
      const slope = (this.pathX[Math.min(h - 1, row + 3)] - this.pathX[Math.max(0, row - 3)]) / 6;
      const half = (PATH_HALF + Math.sin(row * 0.04) * 1) * Math.sqrt(1 + slope * slope) * (1 + 0.3 * Math.min(1, Math.abs(slope)));
      this.pathHalf[row] = half;
      for (let x = Math.max(0, Math.floor(this.pathX[row] - half)); x < Math.min(w, this.pathX[row] + half); x++) this.ground[row * w + x] = GROUND.stone;
    }
    this.pathArc = new Float32Array(h);
    for (let row = 1; row < h; row++) this.pathArc[row] = this.pathArc[row - 1] + Math.hypot(1, this.pathX[row] - this.pathX[row - 1]);
    for (const s of planned) this.placeSite(s.kind, s.x, s.z, s.k, r);

    // Lanterns line the approach, a torii every so far, and a festoon for the festival.
    for (let row = 20, k = 0; row < h - 4; row += 34, k++) {
      const x = this.pathX[row] + (k & 1 ? 1 : -1) * (this.pathHalf[row] + 5);
      if (!this.inZone(x, row, 4, 6)) this.lanterns.push({ x, z: row, phase: r() * 100, mossy: r() < 0.4 ? 1 : 0 });
      if (k % 3 === 1 && this.pathHalf[row] < PATH_HALF * 1.4) {
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
      if (this.inZone(this.pathX[row], row, 25, 40) || this.pathHalf[row] > PATH_HALF * 1.4) continue;
      this.props.push({ kind: 'torii', x: this.pathX[row], z: row, size: 40, seed: 1, flip: false });
    }

    // Stone and buildings block walkers; water does too, but for its bridges.
    for (const b2 of this.bridges) {
      const zr = Math.round(b2.z);
      for (let x = Math.round(b2.x - b2.w / 2); x < b2.x + b2.w / 2; x++) {
        for (let k = -4; k <= 4; k++) if (x >= 0 && x < w && zr + k >= 0 && zr + k < h) this.solid[(zr + k) * w + x] = 0;
      }
    }

    this.measureWater();
    this.placeWisteria(r);
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
    this.perches = [];
    for (const p of this.props) {
      if (p.kind === 'honden') this.perches.push({ x0: p.x - 15, x1: p.x + 15, z: p.z + 0.5, h: 67 / ELEVATION });
      else if (p.kind === 'torii') this.perches.push({ x0: p.x - p.size / 2 + 2, x1: p.x + p.size / 2 - 2, z: p.z + 1.5, h: (p.size * 0.85 - 1) / ELEVATION });
      else if (p.kind === 'hokora') this.perches.push({ x0: p.x - 4, x1: p.x + 4, z: p.z + 1, h: 22 / ELEVATION });
      else if (p.kind === 'teahouse') this.perches.push({ x0: p.x - 14, x1: p.x + 12, z: p.z + 0.5, h: 39 / ELEVATION });
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

  /** Rounds off the approach's bends with a moving average over this many rows either way. */
  private smoothPath(radius: number) {
    const { h, pathX } = this;
    const out = new Float32Array(h);
    let sum = 0;
    const at = (z: number) => pathX[clamp(z, 0, h - 1)];
    for (let z = -radius; z <= radius; z++) sum += at(z);
    for (let z = 0; z < h; z++) {
      out[z] = sum / (radius * 2 + 1);
      sum += at(z + radius + 1) - at(z - radius);
    }
    this.pathX = out;
  }

  /** How far every water cell is from the nearest shore, in cells (a chamfer distance, measured in thirds). */
  private measureWater() {
    const { w, h, ground } = this;
    const d = new Uint16Array(w * h);
    for (let i = 0; i < w * h; i++) d[i] = ground[i] === GROUND.water || ground[i] === GROUND.spring ? 60000 : 0;
    for (let z = 1; z < h; z++) {
      for (let x = 1; x < w - 1; x++) {
        const i = z * w + x;
        if (d[i]) d[i] = Math.min(d[i], d[i - 1] + 3, d[i - w] + 3, d[i - w - 1] + 4, d[i - w + 1] + 4);
      }
    }
    for (let z = h - 2; z >= 0; z--) {
      for (let x = w - 2; x >= 1; x--) {
        const i = z * w + x;
        if (d[i]) d[i] = Math.min(d[i], d[i + 1] + 3, d[i + w] + 3, d[i + w + 1] + 4, d[i + w - 1] + 4);
      }
    }
    // Water running off the page just carries on: its edge cells take their neighbours' depth.
    for (let z = 0; z < h; z++) {
      if (d[z * w]) d[z * w] = d[z * w + 1];
      if (d[z * w + w - 1]) d[z * w + w - 1] = d[z * w + w - 2];
    }
    for (let x = 0; x < w; x++) {
      if (d[x]) d[x] = d[w + x];
      if (d[(h - 1) * w + x]) d[(h - 1) * w + x] = d[(h - 2) * w + x];
    }
    this.shoreDepth = d;
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
        this.basins.push({ x: x + 36, z: z + 30, dirt: r() });
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
        this.addProp('persimmonTree', x + 30, z + 30, 14, r);
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
        // Lanterns on the far banks, so their light runs down across the water toward you.
        for (const [lx, l] of [[lobes[0].x - lobes[0].rx * 0.2, lobes[0]], [lobes[1].x + lobes[1].rx * 0.45, lobes[1]]] as [number, typeof lobes[0]][]) {
          let lz = l.z;
          while (lz > 2 && this.isWater(lx, lz)) lz--;
          this.addLantern(lx, lz - 4, r);
        }
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
        this.addProp('persimmonTree', x - 30, z + 28, 15, r);
        this.dens.push({ kind: 'kitsune', x: x + 34, z: z + 22 });
        break;
      }
      case 'sacred': {
        this.addProp('sacred', x, z, 50, r);
        this.addAltar(x, z + 14, 'rice', false);
        this.basins.push({ x: x + 24, z: z + 16, dirt: r() });
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
        this.basins.push({ x: x + 26, z: z + 22, dirt: r() });
        for (const dx of [-30, 30, -18, 18]) this.addLantern(x + dx, z + 16 + Math.abs(dx) * 0.1, r);
        this.trail(x, z + 24, r);
        break;
      }
      case 'sakura': {
        // One huge old tree alone on a mossy rise, nothing near it but one lantern.
        this.addProp('sakura', x, z + 26, 1, r);
        this.addLantern(x + 30, z + 34, r);
        break;
      }
      case 'teahouse': {
        // A collapsing hut, and among the real teapots on its step, some not so real.
        this.addProp('teahouse', x, z + 8, 1, r);
        for (const [dx, dz] of [[-24, 14], [-12, 18], [13, 19], [25, 14], [3, 22]]) this.addProp('teapotProp', x + dx, z + dz, 1, r);
        this.addAltar(x + 34, z + 20, 'sake', false);
        this.dens.push({ kind: 'tanuki', x: x - 34, z: z + 22 });
        this.dens.push({ kind: 'tanuki', x: x + 6, z: z + 30 });
        this.drift('fern', x, z + 12, 44, 20, 8, r);
        break;
      }
      case 'onsen': {
        const rx = 34 * k, rz = 19 * k;
        for (let zz = Math.max(0, Math.floor(z - rz - 4)); zz < Math.min(this.h, z + rz + 4); zz++) {
          for (let xx = Math.max(0, Math.floor(x - rx - 4)); xx < Math.min(this.w, x + rx + 4); xx++) {
            const d = Math.hypot((xx - x) / rx, (zz - z) / rz) + (noise(xx * 0.14, zz * 0.14) - 0.5) * 0.3;
            const i = zz * this.w + xx;
            if (d < 1) { this.ground[i] = GROUND.spring; this.solid[i] = 1; }
            else if (d < 1.16) this.ground[i] = GROUND.rim;
          }
        }
        this.springs.push({ x, z, rx, rz, seats: 4 });
        for (let g = 0; g < 7; g++) { const a = r() * 6.28; this.addProp('rock', x + Math.cos(a) * rx * 1.16, z + Math.sin(a) * rz * 1.2, 3 + Math.floor(r() * 4), r); }
        this.addLantern(x - rx * 0.5, z - rz - 5, r);
        this.addLantern(x + rx + 6, z + 4, r);
        this.drift('fern', x, z, rx + 14, rz + 10, 7, r);
        break;
      }
      case 'ring': {
        // A wide fairy ring of mushrooms on a clear patch of moss, with nothing in the middle.
        const ring: MushroomRing = { x, z, rx: 30 * k, rz: 16 * k, shrooms: [], dancers: 0 };
        const count = Math.round(18 * k);
        for (let g = 0; g < count; g++) {
          const a = (g / count) * 6.28 + (r() - 0.5) * 0.12;
          ring.shrooms.push({ x: x + Math.cos(a) * ring.rx, z: z + Math.sin(a) * ring.rz, seed: Math.floor(r() * 1000) });
        }
        ring.shrooms.sort((p, q) => p.z - q.z);
        this.rings.push(ring);
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
      if (Math.abs(x - this.pathX[clamp(Math.round(z), 0, h - 1)]) < this.pathHalf[clamp(Math.round(z), 0, h - 1)] + 8) continue;
      if (nearSite(x, z, 1.35) || onGround(x, z) !== GROUND.moss) continue;
      // Nor standing in front of a building or the water, hiding it with its crown.
      if (this.sites.some(q => Math.abs(x - q.x) < q.rx + size && z > q.z && z - tall < q.z + q.rz)) continue;
      this.addProp('cedar', x, z, size, r);
    }
    // Maple accents out in the forest, a jewel every so often.
    for (let k = 0; k < area / 70000; k++) {
      const x = r() * w, z = r() * h;
      if (this.inZone(x, z, 16, 30, 6) || nearSite(x, z, 1) || onGround(x, z) !== GROUND.moss) continue;
      if (Math.abs(x - this.pathX[clamp(Math.round(z), 0, h - 1)]) < this.pathHalf[clamp(Math.round(z), 0, h - 1)] + 10) continue;
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
    // Berry bushes: mostly at the edge of a lantern's light, the rest out in the dark, in small clumps.
    const addBush = (x: number, z: number) => {
      if (onGround(x, z) !== GROUND.moss || this.inZone(x, z, 10, 12, 4) || x < 4 || x > w - 5) return;
      const kind = Math.floor(noise(x * 0.02 + 40, z * 0.02) * 3 * 1.4) % 3 as BushKind;
      this.bushes.push({ x, z, kind, berries: Math.floor(BUSH_BERRIES * (0.5 + r() * 0.5)), regrow: Math.floor(r() * BERRY_REGROW), seed: Math.floor(r() * 4) });
    };
    for (const l of this.lanterns) {
      if (r() > 0.34) continue;
      const a = r() * 6.28;
      addBush(l.x + Math.cos(a) * 20, l.z + Math.sin(a) * 12);
    }
    for (let k = 0; k < area / 40000; k++) addBush(r() * w, r() * h);
    this.bushes.sort((a, b) => a.z - b.z);
    // A persimmon tree here and there, dropping its fruit.
    for (let k = 0; k < area / 90000; k++) {
      const x = r() * w, z = r() * h;
      if (this.inZone(x, z, 16, 30, 6) || nearSite(x, z, 1) || onGround(x, z) !== GROUND.moss) continue;
      this.addProp('persimmonTree', x, z, 13 + Math.floor(r() * 4), r);
    }
    // Thickets of bamboo out in the gutters, clear of the page's cards, so there's always somewhere in view for an old umbrella to wait.
    for (let row = 60 + Math.floor(r() * 50), k = 0; row < h - 20; row += 190 + Math.floor(r() * 70), k++) {
      const side = k & 1 ? 1 : -1;
      const cx = w / 2 + side * (w / 2 - Math.min(w * 0.11, 40)) + (r() - 0.5) * 14, cz = row;
      if (this.inZone(cx, cz, 14, 40) || onGround(cx, cz) !== GROUND.moss) continue;
      this.addLantern(cx + side * -6, cz + 12, r);
      const count = 8 + Math.floor(r() * 5);
      for (let g = 0; g < count; g++) {
        const a = r() * 6.28, d = Math.sqrt(r());
        this.canes.push({ kind: 'bamboo', x: cx + Math.cos(a) * d * 17, z: cz + Math.sin(a) * d * 9, len: 46 + Math.floor(r() * 30), seed: Math.floor(r() * 100), phase: r() * 6.28, bx: 0, bv: 0 });
      }
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
    this.endGathering();
    const oldW = this.w;
    this.build(w, h);
    for (const c of this.creatures) {
      c.x = clamp((c.x / oldW) * w, 2, w - 3);
      c.z = clamp(c.z, 2, h - 3);
      if (c.species === 'koi' || c.species === 'frog' || c.species === 'kappa') c.pond = null;
      c.altar = null;
      c.food = null;
      c.ring = null;
      c.spring = null;
      c.perch = null;
      c.basin = null;
      if (c.species === 'deer' || c.species === 'hare') c.state = 'roam';
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

  private someZ(share = 0.14) {
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
      emote: null, emoteT: 0, carrying: null, food: null, spring: null, perch: null, basin: null, ring: null, angle: 0, onBridge: false, home: null, pond: null, pest: null, drum: null, nextForm: null,
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
        if ((s === 'nekomata' || s === 'akaname') && c.z < this.viewZ.z1 + 30) {
          c.z = between(this.viewZ.z1 + 30, Math.max(this.viewZ.z1 + 31, this.h - 8));
          c.tx = c.x; c.tz = c.z;
          if (this.isSolid(c.x, c.z)) this.freeSpot(c);
        }
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
    for (const q of this.springs) {
      for (const kind of ['tanuki', 'deer'] as ShrineSpecies[]) {
        const c = this.spawn(kind, q.x, q.z);
        c.spring = q;
        this.settleInSpring(c, q);
      }
    }
    for (const p of this.props) {
      if (p.kind !== 'teahouse') continue;
      for (let k = 0; k < 2; k++) {
        const c = this.spawn('tanuki', p.x + (k ? 18 : -18), p.z + 14);
        this.startDisguise(c, 'teapot');
        c.altar = null; c.tx = c.x; c.tz = c.z;
      }
      this.spawn('tanuki', p.x - 8, p.z + 18);
    }
    if (this.rings.length) {
      const ring = this.rings[0];
      for (let k = 0; k < 3; k++) {
        const c = this.spawn('kitsune', ring.x, ring.z);
        c.ring = ring; c.angle = (k / 3) * 6.28; c.state = 'dance'; c.timer = 1500;
        c.x = ring.x + Math.cos(c.angle) * ring.rx * 0.65; c.z = ring.z + Math.sin(c.angle) * ring.rz * 0.65;
      }
    }
    {
      const left = between(8, 40);
      const sleeper = this.spawn('tanuki', left, between(this.viewZ.z0 + 30, this.viewZ.z1 - 16));
      sleeper.state = 'sleep'; sleeper.timer = 1500;
      const baku = this.spawn('baku', sleeper.x + 34, sleeper.z - 12);
      baku.prey = sleeper; baku.state = 'seek';
    }
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
    this.updateDrums();
    this.stageScenes();
    this.updateMotes();
    this.updateFireflies();
    this.updateMoths();
    this.updateCanes();
    this.updateAltars();
    this.updateScenery();
    this.updateFood();
    this.updateSprings();
    this.updatePrints();
    this.updateContest();
    this.updateRings();
    this.updateWisteria();
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
      const life = kind === 'steam' ? Math.floor(between(70, 120)) : kind === 'smoke' ? Math.floor(between(18, 30)) : kind === 'note' || kind === 'heart' ? 50 : kind === 'star' ? 26 : Math.floor(between(16, 34));
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
    if (c.h < 2 && (this.tick + c.id) % 8 === 0 && c.z > this.viewZ.z0 - 20 && c.z < this.viewZ.z1 + 30 && Math.abs(c.vx) + Math.abs(c.vz) > 0.04) {
      const i = Math.round(c.z) * this.w + Math.round(c.x);
      if (this.ground[i] === GROUND.gravel) {
        if (this.prints.length > 260) this.prints.shift();
        this.prints.push({ x: c.x + ((this.tick >> 3) & 1 ? 1 : -1), z: c.z, life: PRINT_LIFE });
      }
    }
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
      if (o === c || !o.alive || o.hidden || !test(o)) continue;
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
    return Math.abs(c.x - this.pathAt(c.z)) < this.pathHalf[clamp(Math.round(c.z), 0, this.h - 1)] + 23;
  }

  /** Thinks a creature's thought for this tick. */
  private think(c: ShrineCreature) {
    if (c.drum) { this.thinkDrum(c); return; }
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
      case 'baku': this.thinkBaku(c); break;
      case 'nekomata': this.thinkNekomata(c); break;
      case 'akaname': this.thinkAkaname(c); break;
      case 'tsuchinoko': this.thinkTsuchinoko(c); break;
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
        this.fall(c);
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
      case 'chase': this.thinkChaseCrow(c); return;
      case 'suspect': case 'sniff': case 'kick': case 'gloat': this.thinkSniffTest(c); return;
      case 'toppling': this.thinkToppling(c); return;
      case 'dazed': this.thinkDazed(c); return;
      case 'passedOut': {
        c.mood = 'out cold';
        this.halt(c);
        if (this.tick % 14 === 0) this.burst('star', c.x + between(-5, 5), c.z, 12, 1, 0.25, 0.5);
        if (--c.timer <= 0) { c.state = 'sleep'; c.timer = Math.floor(between(240, 420)); }
        return;
      }
      case 'toRing': case 'dance': this.thinkDance(c); return;
      case 'sitWatch': case 'contest': this.thinkSitting(c); return;
      case 'toSoak': case 'soak': this.thinkSoak(c); return;
      case 'forage': {
        c.mood = 'sniffing';
        const d = this.walkTo(c, c.tx, c.tz, SHRINE_SPECIES[c.species].speed);
        if (d < 3 || --c.timer <= 0) {
          this.burst('crumb', c.x, c.z, 2, 3, 0.2, 0.3);
          const ate = !!c.food && this.takeFood(c.food);
          c.food = null;
          c.energy = Math.min(1, c.energy + (ate ? 0.3 : 0.1));
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
    // A statue that wasn't there yesterday, and a fox who remembers.
    if (c.species === 'kitsune' && this.tick % 30 === c.id % 30 && !this.isYoung(c)) {
      const statue = this.near(c, 80, o => o.species === 'tanuki' && o.disguise === 'statue' && !o.pest && o.state === 'disguised');
      if (statue && Math.random() < 0.6) this.startSniffTest(c, statue);
    }
  }

  /** Up in the air and back down, for anything that has been made to jump. */
  private fall(c: ShrineCreature, gravity = 0.11) {
    if (c.onBridge || (c.h <= 0 && c.vh === 0)) return;
    c.h = Math.max(0, c.h + c.vh);
    c.vh -= gravity;
    if (c.h === 0) { c.vh = 0; c.squash = 0.35; }
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
      // Berries or a windfall if there are any near; otherwise beetles and mushrooms.
      c.food = this.foodNear(c, 110);
      if (c.food) { c.tx = c.food.x; c.tz = c.food.z + 3; }
      else this.wanderTarget(c, 30);
      c.state = 'forage';
      c.timer = 120;
      return;
    }
    if (c.species === 'kitsune' && !this.happening && Math.random() < 0.2 && this.goDancing(c)) return;
    if (c.species === 'tanuki' && Math.random() < 0.14 && this.goSoaking(c)) return;
    if (c.species === 'tanuki' && roll < 0.1 && Math.random() < 0.6 && this.startDrumCircle(c)) return;
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
      const foe = this.near(c, 22, o => o.species === this.rivalOf(c) && !o.hidden && !o.disguise && !o.drum && o.state === 'roam' && !this.isYoung(o));
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
    if (--c.timer <= 0) { this.startDisguise(c, c.nextForm ?? pick(DISGUISE_ROTATION)); c.nextForm = null; }
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
    c.pest = null;
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
    // Someone is onto it: it holds very still and hopes.
    if (c.pest) {
      const p = c.pest;
      if (!p.alive || p.prey !== c || !(p.state === 'toPeck' || p.state === 'peck' || p.state === 'suspect' || p.state === 'sniff' || p.state === 'kick')) c.pest = null;
      else if (p.state !== 'toPeck') { c.mood = 'pretending'; c.vx = 0; c.vz = 0; return; }
    }
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
        if (foe.species === 'kitsune' && c.disguise === 'statue' && !c.pest) { this.startSniffTest(foe, c); return; }
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
      else if (Math.hypot(c.tx - c.x, c.tz - c.z) < 4) {
        const house = c.species === 'tanuki' ? this.props.find(p => p.kind === 'teahouse' && Math.hypot(p.x - c.x, p.z - c.z) < 260) : null;
        if (house) { c.tx = house.x + between(-28, 28); c.tz = house.z + between(8, 20); }
        else this.wanderTarget(c, 60);
      }
      this.walkTo(c, c.tx, c.tz, 0.26);
      if (this.tick % 10 === 0) { c.vh = 0.4; c.squash = 0.25; }
    } else {
      c.mood = 'pretending';
      c.vx = 0; c.vz = 0;
      if (beat === 72 && Math.random() < 0.18) c.tailOut = 26;
    }
  }

  // --- scenes where they can be seen ---------------------------------------------------

  /**
   * The page is long and only a screen of it is looked at, so now and then the
   * forest arranges for one of its squabbles to break out in view, using whoever
   * happens to be there.
   */
  private stageScenes() {
    if (this.tick % 90 || this.happening) return;
    if (this.tick - this.lastScene < SCENE_GAP) return;
    const { z0, z1 } = this.viewZ;
    const seen = (o: { z: number }) => o.z > z0 + 10 && o.z < z1 - 10;
    // The page's cards cover the middle, so the gutters come first when there's anyone in them.
    const among = (test: (o: ShrineCreature) => boolean) => {
      const all = this.creatures.filter(o => o.alive && !o.hidden && seen(o) && test(o));
      const out = all.filter(o => o.x < this.w * 0.2 || o.x > this.w * 0.8);
      return out.length ? out : all;
    };
    const free = (o: ShrineCreature) => o.state === 'roam' && !o.drum && !this.isYoung(o);
    const tanuki = among(o => o.species === 'tanuki' && free(o) && !o.disguise);
    const scenes: (() => boolean)[] = [
      () => {
        if (this.tick - this.lastDrum < DRUM_GAP || !tanuki.length) return false;
        const ok = this.startDrumCircle(pick(tanuki));
        if (ok) this.lastDrum = this.tick;
        return ok;
      },
      () => {
        const crow = this.creatures.find(o => o.alive && o.species === 'crow' && o.state === 'perch');
        if (!crow) return false;
        const pot = among(o => o.species === 'tanuki' && o.disguise !== 'statue' && o.state === 'disguised' && !o.pest)[0];
        if (pot) { crow.prey = pot; pot.pest = crow; crow.state = 'toPeck'; return true; }
        if (!tanuki.length) return false;
        const t = pick(tanuki);
        t.nextForm = 'teapot';
        this.beginChange(t);
        return false;
      },
      () => {
        const fox = among(o => o.species === 'kitsune' && free(o) && !o.disguise);
        if (!fox.length) return false;
        const statue = among(o => o.species === 'tanuki' && o.disguise === 'statue' && o.state === 'disguised' && !o.pest)[0];
        if (statue) { this.startSniffTest(fox.reduce((b, o) => (dist(o, statue) < dist(b, statue) ? o : b)), statue); return true; }
        if (!tanuki.length) return false;
        const t = pick(tanuki);
        t.nextForm = 'statue';
        this.beginChange(t);
        return false;
      },
      () => {
        // Somebody strolls past the bamboo with an umbrella in it.
        const lurker = among(o => o.species === 'kasa' && o.state === 'lurk')[0];
        if (!lurker) {
          const kasa = this.creatures.find(o => o.alive && o.species === 'kasa' && o.state === 'roam');
          const cane = this.canes.find(q => q.kind === 'bamboo' && seen(q) && (q.x < this.w * 0.2 || q.x > this.w * 0.8) && !this.isSolid(q.x, q.z - 2) && !this.inClearZone(q.x, q.z));
          if (kasa && cane) { kasa.state = 'toLurk'; kasa.tx = cane.x + 3; kasa.tz = cane.z - 2; kasa.timer = 900; }
          return false;
        }
        const walker = among(o => (o.species === 'hare' || o.species === 'mouse' || (o.species === 'tanuki' && free(o) && !o.disguise) || o.species === 'deer') && this.scareable(o) && dist(o, lurker) < 170)[0];
        if (!walker) return false;
        walker.tx = lurker.x + between(-6, 6); walker.tz = lurker.z + 6;
        if (walker.species === 'deer') { walker.state = 'walk'; walker.timer = 500; }
        else if (walker.species === 'hare') { walker.state = 'hop'; walker.timer = 500; }
        else walker.timer = Math.max(walker.timer, 400);
        return true;
      },
    ];
    // Whichever comes up first and can actually happen, with the umbrella (which manages on its own) as a last resort.
    const start = Math.floor(Math.random() * 3);
    for (let k = 0; k < 3; k++) {
      if (scenes[(start + k) % 3]()) { this.lastScene = this.tick; return; }
    }
    if (scenes[3]()) this.lastScene = this.tick;
  }

  // --- a crow on the teapot ----------------------------------------------------------

  /** A yelp from inside the thing it's been pecking, and the tanuki is out and after the crow. */
  private yelp(t: ShrineCreature, crow: ShrineCreature) {
    const kind = t.disguise;
    this.endDisguise(t);
    t.state = 'chase';
    t.foe = crow;
    t.timer = 190;
    t.vh = 1.7;
    t.altar = null;
    this.setFacing(t, crow.x - t.x);
    this.emote(t, 'bang', 60);
    this.burst('star', t.x, t.z, 18, 5, 0.6, 0.8);
    this.caught++;
    this.log('caught', `A crow pecks ${t.name} out of a ${kind}`, t);
  }

  private thinkChaseCrow(c: ShrineCreature) {
    const crow = c.foe;
    c.mood = 'chasing';
    this.fall(c, 0.12);
    if (!crow?.alive || crow.state !== 'taunt' || --c.timer <= 0) {
      // It got away. A last jump at the sky, and a glare.
      c.foe = null; c.state = 'roam'; c.timer = 60; c.vx = 0; c.vz = 0;
      if (c.h === 0) c.vh = 1.1;
      this.emote(c, 'bang', 45);
      return;
    }
    const d = this.walkTo(c, crow.x, crow.z, SHRINE_SPECIES.tanuki.speed * 2.3);
    if (this.tick % 5 === 0) this.burst('dust', c.x, c.z, 0, 1, 0.1, 0.1);
    // Leaping for its tail, and just now and then getting a mouthful of feathers.
    if (d < 26 && c.h === 0 && this.tick % 7 === 0) { c.vh = 1.3; c.squash = 0.5; }
    if (d < 11 && c.h > 3 && this.tick % 6 === 0) { this.burst('tuft', crow.x, crow.z, crow.h, 4, 0.5, 0.5); crow.squash = 0.5; this.emote(crow, 'bang', 24); }
  }

  // --- a fox with suspicions ---------------------------------------------------------

  private startSniffTest(c: ShrineCreature, statue: ShrineCreature) {
    c.prey = statue;
    statue.pest = c;
    c.state = 'suspect';
    c.timer = 230;
    c.angle = Math.atan2((c.z - statue.z) / 9, (c.x - statue.x) / 15);
    c.food = null; c.altar = null;
    this.emote(c, 'what', 60);
  }

  /** Round it, closer, a good long sniff, and then a kick to see what happens. */
  private thinkSniffTest(c: ShrineCreature) {
    this.fall(c, 0.1);
    if (c.state === 'gloat') {
      c.mood = 'barking';
      this.halt(c);
      if (this.tick % 40 === 0) this.burst('note', c.x + c.facing * 7, c.z, 30, 1, 0.1, 0.4);
      if (--c.timer <= 0) { c.prey = null; c.state = 'roam'; c.timer = 30; }
      return;
    }
    const t = c.prey;
    if (!t?.alive || t.disguise !== 'statue' || t.state !== 'disguised') { c.prey = null; c.state = 'roam'; c.timer = 30; return; }
    c.timer--;
    if (c.state === 'suspect') {
      c.mood = 'sniffing';
      c.angle += 0.04;
      this.walkTo(c, t.x + Math.cos(c.angle) * 15, t.z + Math.sin(c.angle) * 9, SHRINE_SPECIES.kitsune.speed * 1.1);
      if (c.timer <= 0) { c.state = 'sniff'; c.timer = 130; }
      return;
    }
    const side = c.x < t.x ? -1 : 1;
    const d = this.walkTo(c, t.x + side * 15, t.z + 1, SHRINE_SPECIES.kitsune.speed * 0.7);
    if (c.state === 'sniff') {
      c.mood = 'sniffing';
      if (d < 3) { c.vx = 0; c.vz = 0; c.facing = (t.x > c.x ? 1 : -1); c.turnHold = 10; }
      if (d < 3 && this.tick % 12 === 0) { c.squash = 0.25; this.burst('dust', c.x + c.facing * 8, c.z, 6, 1, 0.06, 0.15); }
      // The tail slips out, right under its nose, and the statue knows it.
      if (c.timer === 62) { t.tailOut = 44; t.squash = 0.3; this.emote(t, 'what', 40); }
      if (c.timer === 16) { this.emote(c, 'bang', 40); c.squash = 0.5; }
      if (c.timer <= 0) { c.state = 'kick'; c.timer = 26; c.vh = 0.85; c.h = 0.1; c.squash = 0.6; }
      return;
    }
    c.mood = 'kicking';
    c.vx = 0; c.vz = 0;
    c.facing = (t.x > c.x ? 1 : -1); c.turnHold = 10;
    if (c.timer <= 10) {
      // Over it goes.
      t.state = 'toppling';
      t.timer = TOPPLE_TICKS;
      t.foe = c;
      t.pest = null;
      t.facing = c.facing;
      t.turnHold = 40;
      t.tailOut = TOPPLE_TICKS;
      this.burst('star', t.x, t.z, 12, 2, 0.5, 0.7);
      c.state = 'gloat'; c.timer = 170;
      this.emote(c, 'note', 60);
    }
  }

  private thinkToppling(c: ShrineCreature) {
    c.mood = 'pretending';
    c.timer--;
    if (c.tailOut > 0) c.tailOut--;
    if (c.timer > TOPPLE_FLAT) c.x += c.facing * 0.2;
    // Stone hits the ground, and lies there a moment looking like a fallen statue.
    if (c.timer === TOPPLE_FLAT) { this.burst('dust', c.x, c.z, 1, 5, 0.8, 0.4); c.squash = 0.4; }
    if (c.timer > 0) return;
    const fox = c.foe;
    this.endDisguise(c);
    c.foe = fox;
    c.state = 'dazed';
    c.timer = 80;
    this.emote(c, 'what', 60);
    this.caught++;
    this.log('caught', `${fox?.name ?? 'A fox'} kicks over a statue, and out falls ${c.name}`, c);
  }

  private thinkDazed(c: ShrineCreature) {
    c.mood = 'dazed';
    this.halt(c);
    if (this.tick % 12 === 0) this.burst('star', c.x + between(-5, 5), c.z, 18, 1, 0.25, 0.4);
    if (--c.timer > 0) return;
    const fox = c.foe;
    c.foe = null;
    c.state = 'roam'; c.timer = 40;
    if (fox?.alive && fox.state === 'gloat' && !this.isYoung(c)) { fox.prey = null; this.startStandoff(c, fox); }
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
      this.fall(c);
      if (--c.timer <= 0 || d < 3) { c.state = 'roam'; c.timer = 30; }
      return;
    }
    if (this.tick % 10 === c.id % 10) {
      const threat = this.near(c, 22, o => (o.species === 'kitsune' && !o.disguise) || (o.species === 'kasa' && o.state !== 'lurk') || (o.species === 'owl' && o.state === 'swoop'));
      if (threat) { this.flee(c, threat, 50); return; }
      const altar = this.altars.find(a => a.item && Math.abs(a.x - c.x) < 34 && Math.abs(a.z - c.z) < 24);
      if (altar && Math.random() < 0.2) { c.tx = altar.x; c.tz = altar.z + 3; }
    }
    if (c.state === 'feed') { this.feeding(c, SHRINE_SPECIES.mouse.speed, 0.45); return; }
    // A little found on the ground keeps it going, but it's the berries it's after.
    c.energy = Math.min(1, c.energy + 0.00002);
    if (Math.hypot(c.tx - c.x, c.tz - c.z) < 2) {
      if (--c.timer > 0) { this.halt(c); return; }
      const food = c.energy < 0.85 ? this.foodNear(c, 90) : null;
      if (food) { c.food = food; c.state = 'feed'; c.timer = 80; return; }
      this.wanderTarget(c, 30);
      c.timer = Math.floor(between(20, 110));
    } else this.walkTo(c, c.tx, c.tz, SHRINE_SPECIES.mouse.speed);
  }

  private thinkHare(c: ShrineCreature) {
    if (c.state === 'sitWatch') { this.thinkSitting(c); return; }
    if (c.h > 0 || c.vh !== 0) { c.h = Math.max(0, c.h + c.vh); c.vh -= 0.12; if (c.h === 0) c.vh = 0; }
    if (c.state === 'flee') {
      c.mood = 'fleeing';
      this.walkTo(c, c.tx, c.tz, SHRINE_SPECIES.hare.speed * 2.2);
      if (this.tick % 7 === 0 && c.h === 0) c.vh = 0.8;
      if (--c.timer <= 0) { c.state = 'roam'; c.timer = 60; }
      return;
    }
    if (this.tick % 12 === c.id % 12) {
      const threat = this.near(c, 30, o => (o.species === 'kitsune' && !o.disguise && o.state === 'hunt') || (o.species === 'kasa' && o.state !== 'lurk'));
      if (threat) { this.flee(c, threat, 80); return; }
    }
    if (--c.timer <= 0) {
      const food = c.energy < 0.8 ? this.foodNear(c, 90) : null;
      if (food) { c.food = food; c.state = 'feed'; c.timer = 90; }
      else if (Math.random() < 0.5) { this.wanderTarget(c, 40); c.state = 'hop'; c.timer = 60; }
      else { c.state = 'graze'; c.timer = Math.floor(between(60, 240)); }
    }
    if (c.state === 'feed') { this.feeding(c, SHRINE_SPECIES.hare.speed, 0.4); return; }
    if (c.state === 'hop') {
      c.mood = 'hopping';
      this.walkTo(c, c.tx, c.tz, SHRINE_SPECIES.hare.speed);
      if (this.tick % 14 === 0 && c.h === 0) c.vh = 0.55;
    } else { c.mood = 'grazing'; this.halt(c); c.energy = Math.min(1, c.energy + 0.0003); }
  }

  private thinkDeer(c: ShrineCreature) {
    if (c.state === 'sitWatch') { this.thinkSitting(c); return; }
    if (c.state === 'toSoak' || c.state === 'soak') { this.thinkSoak(c); return; }
    if (c.state === 'flee') {
      c.mood = 'fleeing';
      this.walkTo(c, c.tx, c.tz, SHRINE_SPECIES.deer.speed * 3);
      this.fall(c);
      if (c.h === 0 && this.tick % 12 === 0) c.vh = 0.7;
      if (--c.timer <= 0) { c.state = 'walk'; c.timer = 60; }
      return;
    }
    if (--c.timer <= 0) {
      const roll = Math.random();
      if (roll < 0.14 && this.goSoaking(c)) return;
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
        // A tanuki in disguise makes a very good thing to stand on, and to peck.
        const mark = Math.random() < 0.7 ? this.near(c, 340, o => o.species === 'tanuki' && !!o.disguise && !o.pest && o.state === 'disguised' && !this.inClearZone(o.x, o.z)) : null;
        if (mark) { c.prey = mark; mark.pest = c; c.state = 'toPeck'; return; }
        const altar = this.altars.filter(a => a.item && Math.abs(a.z - c.z) < 220);
        if (altar.length && Math.random() < 0.7 && !this.hahakiNear(c.x, c.z, 30)) { c.altar = pick(altar); c.state = 'raid'; }
        else this.settleOnCedar(c);
      }
      return;
    }
    if (c.state === 'toPeck' || c.state === 'peck') {
      const t = c.prey;
      if (!t?.alive || !t.disguise || t.state !== 'disguised') { c.prey = null; c.state = 'away'; return; }
      const top = DISGUISE_ROWS[t.disguise] / ELEVATION;
      if (c.state === 'toPeck') {
        c.mood = 'flying';
        const dx = t.x - c.x, dz = t.z - c.z, d = Math.hypot(dx, dz) || 1;
        const speed = Math.min(d, SHRINE_SPECIES.crow.speed * 1.6);
        c.x += (dx / d) * speed; c.z += (dz / d) * speed;
        this.setFacing(c, dx);
        c.h += ((d < 34 ? top : 44) - c.h) * (d < 34 ? 0.12 : 0.05);
        if (d < 1.5 && Math.abs(c.h - top) < 3) {
          c.state = 'peck'; c.timer = 150; c.squash = 0.4;
          t.squash = 0.35;
          this.burst('dust', t.x, t.z, top, 2, 0.3, 0.2);
        }
        return;
      }
      c.mood = 'pecking';
      c.x = t.x; c.z = t.z + 0.1; c.h = top;
      // Every so often it looks up to see how it's going.
      if (this.tick % 70 === 0) c.facing = (c.facing * -1) as 1 | -1;
      if (--c.timer % PECK_EVERY === 0) {
        t.squash = 0.4;
        this.burst('star', c.x + c.facing * 6, c.z, top, 2, 0.35, 0.45);
        if (c.timer === PECK_EVERY * 4) { t.tailOut = 40; this.emote(t, 'what', 40); }
      }
      if (c.timer <= 0) {
        this.yelp(t, c);
        // Up and away, low enough to be worth chasing.
        // Along the gutter rather than across the page, so the chase stays out where it can be seen.
        const down = c.z < (this.viewZ.z0 + this.viewZ.z1) / 2 ? 1 : -1;
        c.prey = null;
        c.state = 'taunt';
        c.timer = 170;
        c.tx = clamp(c.x + between(-26, 26), 8, this.w - 9);
        c.tz = clamp(c.z + down * 120, 8, this.h - 9);
        this.burst('tuft', c.x, c.z, c.h, 5, 0.5, 0.5);
        this.emote(c, 'note', 50);
      }
      return;
    }
    if (c.state === 'taunt') {
      c.mood = 'flying';
      const dx = c.tx - c.x, dz = c.tz - c.z, d = Math.hypot(dx, dz) || 1;
      const speed = Math.min(d, SHRINE_SPECIES.crow.speed * 0.76);
      c.x += (dx / d) * speed; c.z += (dz / d) * speed;
      this.setFacing(c, dx);
      c.h += (18 + Math.sin(this.tick * 0.12) * 6 - c.h) * 0.1;
      if (--c.timer <= 0 || d < 3) c.state = 'away';
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

  // --- the dream-eater -------------------------------------------------------------

  /** It plods from sleeper to sleeper, and stands over each one drinking a pink wisp of dream. */
  private thinkBaku(c: ShrineCreature) {
    const speed = SHRINE_SPECIES.baku.speed;
    const sleeper = c.prey;
    if (c.state === 'sip') {
      c.mood = 'sipping';
      this.halt(c);
      if (!sleeper?.alive || sleeper.state !== 'sleep') { c.prey = null; c.state = 'roam'; c.timer = 120; return; }
      sleeper.timer = Math.max(sleeper.timer, 40);
      this.setFacing(c, sleeper.x - c.x);
      if (this.tick % 12 === 0 && this.motes.length < MAX_MOTES) {
        // A wisp lifts off the sleeper's head and drifts to the trunk.
        const life = 44;
        const fromH = 14, toH = 16;
        const tx = c.x + c.facing * 12;
        this.motes.push({ kind: 'dream', x: sleeper.x, z: sleeper.z, h: fromH, vx: (tx - sleeper.x) / life, vz: (c.z - sleeper.z) / life, vh: (toH - fromH) / life, life, max: life, seed: Math.floor(Math.random() * 100) });
      }
      if (--c.timer <= 0) {
        this.log('visit', `A baku drinks ${sleeper.name}'s dream`, sleeper);
        c.prey = null; c.state = 'roam'; c.timer = 400; c.squash = 0.3;
      }
      return;
    }
    if (c.state === 'seek') {
      c.mood = 'wandering';
      if (!sleeper?.alive || sleeper.state !== 'sleep') { c.prey = null; c.state = 'roam'; c.timer = 60; return; }
      const side = c.x < sleeper.x ? -1 : 1;
      const d = this.walkTo(c, sleeper.x + side * 16, sleeper.z - 1, speed);
      if (d < 3) { c.state = 'sip'; c.timer = 220; c.vx = 0; c.vz = 0; }
      return;
    }
    c.mood = 'wandering';
    if (--c.timer <= 0) {
      c.timer = 60;
      const next = this.near(c, 170, o => (o.species === 'tanuki' || o.species === 'kitsune') && o.state === 'sleep' && !this.creatures.some(b => b.species === 'baku' && b.prey === o));
      if (next) { c.prey = next; c.state = 'seek'; return; }
    }
    if (Math.hypot(c.tx - c.x, c.tz - c.z) < 4) this.wanderTarget(c, 70);
    this.walkTo(c, c.tx, c.tz, speed * 0.8);
  }

  // --- the tsuchinoko -----------------------------------------------------------------

  /**
   * A fat little snake that takes its tail in its mouth and bowls down the
   * path like a wheel. Nobody ever quite sees one: as soon as anything looks
   * its way (a cursor counts), it's gone, and turns up later further along.
   */
  private thinkTsuchinoko(c: ShrineCreature) {
    if (c.state === 'roam') { this.rollIn(c); return; }
    if (c.hidden) {
      if (--c.timer <= 0) this.rollIn(c);
      return;
    }
    if (this.tick % 5 === c.id % 5) {
      const p = this.pointer;
      const seen = (p && Math.hypot(p.x - c.x, p.z - c.z) < 34)
        || this.near(c, 24, o => o.h < 12 && !o.disguise && o.species !== 'tsuchinoko' && o.species !== 'koi' && o.species !== 'kodama' && o.species !== 'hitodama' && o.species !== 'frog');
      if (seen || this.parade && Math.abs(c.z - this.parade.headRow) < 60) { this.vanish(c, typeof seen === 'object' && seen ? seen as ShrineCreature : null); return; }
    }
    if (c.state === 'peek') {
      c.mood = 'sitting';
      c.vx = 0; c.vz = 0;
      if (--c.timer <= 0) { c.state = 'rollAlong'; c.timer = Math.floor(between(240, 560)); }
      return;
    }
    c.mood = 'rolling';
    // tx is how far along the path it has come, tz how far off the middle.
    c.tx += SHRINE_SPECIES.tsuchinoko.speed;
    const z = this.rowAlong(c.tx);
    if (z > this.h - 6) { c.hidden = true; c.timer = 300; return; }
    const row = clamp(Math.round(z), 0, this.h - 1);
    const nx = this.pathX[row] + c.tz * (this.pathHalf[row] / PATH_HALF);
    c.vx = nx - c.x; c.vz = z - c.z;
    this.setFacing(c, c.vx);
    c.x = nx; c.z = z;
    // A bump now and then, as a wheel goes over the flagstones.
    c.h = (this.tick + c.id * 3) % 44 < 6 ? 1.6 : 0;
    if (this.tick % 9 === 0) this.burst('dust', c.x, c.z, 0, 1, 0.1, 0.1);
    if (--c.timer <= 0) { c.state = 'peek'; c.timer = 70; c.squash = 0.5; c.h = 0; }
  }

  private rollIn(c: ShrineCreature) {
    const row = clamp(Math.round(between(this.viewZ.z0 - 30, this.viewZ.z1 - 30)), 2, this.h - 40);
    c.tx = this.pathArc[row];
    c.tz = between(-4, 4);
    c.x = this.pathX[row] + c.tz; c.z = row;
    c.hidden = false;
    c.state = 'rollAlong';
    c.timer = Math.floor(between(240, 560));
  }

  private vanish(c: ShrineCreature, by: ShrineCreature | null) {
    this.burst('dust', c.x, c.z, 2, 5, 0.5, 0.5);
    if (by && (by.species === 'tanuki' || by.species === 'kitsune' || by.species === 'hahaki')) { this.emote(by, 'what', 40); this.setFacing(by, c.x - by.x); }
    c.hidden = true;
    c.state = 'gone';
    c.vx = 0; c.vz = 0;
    c.timer = Math.floor(between(500, 1300));
  }

  // --- the fox dance ---------------------------------------------------------------------

  private goDancing(c: ShrineCreature) {
    let best: MushroomRing | null = null;
    let bestD = 260;
    for (const q of this.rings) {
      const d = dist(c, q);
      if (d < bestD && q.dancers < 5) { bestD = d; best = q; }
    }
    if (!best) return false;
    c.ring = best;
    c.state = 'toRing';
    c.timer = 900;
    return true;
  }

  private thinkDance(c: ShrineCreature) {
    const q = c.ring;
    if (!q || --c.timer <= 0 || this.happening?.kind === 'parade') { c.ring = null; c.state = 'roam'; c.timer = 60; c.h = 0; c.vh = 0; return; }
    if (c.state === 'toRing') {
      c.mood = 'wandering';
      const d = this.walkTo(c, q.x, q.z, SHRINE_SPECIES.kitsune.speed);
      if (Math.abs(c.x - q.x) < q.rx * 0.7 && Math.abs(c.z - q.z) < q.rz * 0.7 || d < 6) {
        c.state = 'dance';
        c.timer = Math.floor(between(600, 1100));
        c.angle = Math.atan2((c.z - q.z) / q.rz, (c.x - q.x) / q.rx);
      }
      return;
    }
    // Round the ring in hops, stopping now and then to sit up and bark at the moon.
    c.mood = 'dancing';
    if (c.h > 0 || c.vh !== 0) { c.h = Math.max(0, c.h + c.vh); c.vh -= 0.1; if (c.h === 0) { c.vh = 0; c.squash = 0.35; } }
    if (isBarkTime(c, this.tick)) {
      c.vx = 0; c.vz = 0;
      if (this.tick % 40 === 0) this.burst('note', c.x + c.facing * 7, c.z, 30, 1, 0.1, 0.4);
      return;
    }
    if (c.h === 0 && (this.tick + c.id * 7) % 22 === 0) c.vh = 0.75;
    c.angle += 0.009;
    const tx = q.x + Math.cos(c.angle) * q.rx * 0.65, tz = q.z + Math.sin(c.angle) * q.rz * 0.65;
    c.vx = tx - c.x; c.vz = tz - c.z;
    c.x += c.vx * 0.1; c.z += c.vz * 0.1;
    this.setFacing(c, c.vx);
  }

  private updateRings() {
    if (this.tick % 30) return;
    for (const q of this.rings) {
      q.dancers = 0;
      for (const c of this.creatures) if (c.alive && c.ring === q && c.state === 'dance') q.dancers++;
      // It breathes out spores while they dance.
      if (q.dancers && q.z > this.viewZ.z0 - 30 && q.z < this.viewZ.z1 + 30) {
        for (let k = 0; k < q.dancers + 1; k++) {
          const s = pick(q.shrooms);
          this.burst('spore', s.x, s.z, 4, 1, 0.05, 0.25);
        }
      }
    }
  }

  // --- things to eat ------------------------------------------------------------------------

  /** The nearest berries or fallen fruit in reach. */
  private foodNear(c: ShrineCreature, range: number): BerryBush | Fruit | null {
    let best: BerryBush | Fruit | null = null;
    let bestD = range;
    for (const b of this.bushes) {
      if (b.berries <= 0) continue;
      const dx = Math.abs(b.x - c.x);
      if (dx > bestD) continue;
      const d = Math.hypot(b.x - c.x, b.z - c.z);
      if (d < bestD) { bestD = d; best = b; }
    }
    for (const f of this.fruits) {
      if (f.h > 0) continue;
      const d = Math.hypot(f.x - c.x, f.z - c.z);
      if (d < bestD) { bestD = d; best = f; }
    }
    return best;
  }

  private foodLeft(f: BerryBush | Fruit) { return 'berries' in f ? f.berries > 0 : f.life > 0; }

  /** Takes a bite from it, if there's anything left. */
  private takeFood(f: BerryBush | Fruit) {
    if (!this.foodLeft(f)) return false;
    if ('berries' in f) f.berries--;
    else f.life = 0;
    this.meals++;
    return true;
  }

  /** Going over to some food, and sitting nibbling at it. Returns once it's done. */
  private feeding(c: ShrineCreature, speed: number, gain: number) {
    c.mood = 'nibbling';
    const f = c.food;
    if (!f || !this.foodLeft(f)) { c.food = null; c.state = 'roam'; c.timer = 20; return; }
    const d = this.walkTo(c, f.x + (c.id & 1 ? 6 : -6), f.z + 3, speed);
    if (d > 2.5) return;
    this.setFacing(c, f.x - c.x);
    this.halt(c);
    if (this.tick % 14 === 0) { c.squash = 0.25; this.burst('crumb', f.x, f.z, 3, 1, 0.2, 0.3); }
    if (--c.timer > 0) return;
    if (this.takeFood(f)) {
      c.energy = Math.min(1, c.energy + gain);
      // A well-fed mouse has a litter, while there's room.
      if (c.species === 'mouse' && c.energy > 0.75 && Math.random() < 0.3 && this.creatures.filter(o => o.species === 'mouse' && o.alive).length < this.populationCap('mouse') + 3) {
        this.spawn('mouse', c.x, c.z, c);
        this.births++;
      }
    }
    c.food = null; c.state = 'roam'; c.timer = Math.floor(between(30, 90));
    c.tx = c.x; c.tz = c.z;
  }

  private updateFood() {
    if (this.tick % 30 === 0) {
      for (const b of this.bushes) {
        if (b.berries >= BUSH_BERRIES) continue;
        b.regrow += 30;
        if (b.regrow >= BERRY_REGROW) { b.regrow = 0; b.berries++; }
      }
    }
    // Ripe persimmons let go now and then: more where someone might see.
    if (this.tick % 150 === 0 && this.fruits.length < 24) {
      const trees = this.props.filter(p => p.kind === 'persimmonTree');
      if (trees.length) {
        const near = trees.filter(p => p.z > this.viewZ.z0 - 30 && p.z < this.viewZ.z1 + 60);
        const p = near.length && Math.random() < 0.7 ? pick(near) : pick(trees);
        const x = p.x + between(-p.size, p.size), z = p.z + between(-3, 5);
        if (!this.isWater(x, z)) this.fruits.push({ x, z, h: p.size * 2, vh: 0, life: 2400 });
      }
    }
    for (let i = this.fruits.length - 1; i >= 0; i--) {
      const f = this.fruits[i];
      if (f.h > 0) {
        f.vh -= 0.06;
        f.h += f.vh;
        if (f.h <= 0) { f.h = 0; this.burst('dust', f.x, f.z, 0, 1, 0.15, 0.2); }
        continue;
      }
      if (--f.life <= 0) this.fruits.splice(i, 1);
    }
  }

  // --- the wisteria walk --------------------------------------------------------------------

  /** Roofs the straightest stretch of the approach (out in a gutter, for choice) with a pergola of hanging wisteria. */
  private placeWisteria(r: () => number) {
    const { w, h, pathX, pathHalf } = this;
    const length = 96;
    const score = (z0: number) => {
      let out = 0;
      for (let z = z0; z < z0 + length; z += 4) {
        const half = pathHalf[z];
        if (half > PATH_HALF * 1.35 || this.inZone(pathX[z], z, half + 8, 0)) return -1;
        const i = z * w + Math.round(pathX[z]);
        if (this.ground[i] !== GROUND.stone) return -1;
        out += Math.abs(pathX[z] - w / 2);
      }
      return out;
    };
    const taken: number[] = [];
    const wanted = h > 1100 ? 2 : 1;
    for (let n = 0; n < wanted; n++) {
      let best = -1, bestRow = -1;
      for (let z0 = 10; z0 + length < h - 4; z0 += 12) {
        if (taken.some(t => Math.abs(t - z0) < 500)) continue;
        const s = score(z0);
        if (s > best) { best = s; bestRow = z0; }
      }
      if (bestRow < 0) break;
      taken.push(bestRow);
      for (let z = bestRow; z < bestRow + length; z += 24) {
        const half = pathHalf[z] + 5;
        const x = pathX[z];
        this.beams.push({ x, z, w: Math.round(half * 2) });
        const count = Math.round((half * 2) / 3);
        for (let k = 0; k < count; k++) {
          // Long at the posts and short over the middle, like curtains drawn back; the very middle stays open.
          const across = Math.abs((k + 0.5) / count - 0.5) * 2;
          if (across < 0.22 && r() < 0.75) continue;
          const len = Math.round(4 + across * across * 15 + r() * 5);
          this.strands.push({ x: x - half + 1 + (k + 0.5) * ((half * 2 - 2) / count) + (r() - 0.5), z: z + r() * 3 - 1.5, len, seed: Math.floor(r() * 4), phase: r() * 6.28, bx: 0, bv: 0 });
        }
      }
      // Clear away what the pergola takes the place of.
      const inside = (z: number) => z > bestRow - 8 && z < bestRow + length + 8;
      this.props = this.props.filter(p => !(p.kind === 'torii' && inside(p.z)));
      this.festoons = this.festoons.filter(f => !inside(f.z));
      this.lanterns = this.lanterns.filter(l => !(inside(l.z) && Math.abs(l.x - pathX[clamp(Math.round(l.z), 0, h - 1)]) < pathHalf[clamp(Math.round(l.z), 0, h - 1)] + 9));
    }
    this.beams.sort((a, b) => a.z - b.z);
    this.strands.sort((a, b) => a.z - b.z);
  }

  /** Anything brushing through pushes the sprays apart; they swing back, shedding a petal or two. */
  private updateWisteria() {
    if (this.tick % 2) return;
    const { z0, z1 } = this.viewZ;
    const pushers: { x: number; z: number }[] = this.creatures.filter(c => c.alive && !c.hidden && c.h < 16 && c.z > z0 - 20 && c.z < z1 + 40 && Math.abs(c.vx) + Math.abs(c.vz) > 0.03 && c.species !== 'koi' && c.species !== 'bat');
    if (this.parade) for (const m of this.parade.marchers) if (Math.abs(m.side) < 4) pushers.push(m);
    for (const s of this.strands) {
      if (s.z < z0 - 20 || s.z > z1 + 40) continue;
      for (const p of pushers) {
        const dx = s.x - p.x;
        if (Math.abs(dx) < 8 && Math.abs(s.z - p.z) < 4) {
          s.bv += (dx >= 0 ? 1 : -1) * 0.55;
          if (Math.random() < 0.03) this.burst('petal', s.x, s.z, 24, 1, 0.1, 0);
          break;
        }
      }
      s.bv += -s.bx * 0.06;
      s.bv *= 0.9;
      s.bx = clamp(s.bx + s.bv, -8, 8);
    }
  }

  // --- the hot spring -------------------------------------------------------------------

  private goSoaking(c: ShrineCreature) {
    if (this.happening) return false;
    let best: HotSpring | null = null;
    let bestD = 240;
    for (const q of this.springs) {
      const d = dist(c, q);
      if (d < bestD && this.creatures.filter(o => o.alive && o.spring === q).length < q.seats) { bestD = d; best = q; }
    }
    if (!best) return false;
    c.spring = best;
    c.state = 'toSoak';
    c.timer = 900;
    return true;
  }

  private settleInSpring(c: ShrineCreature, q: HotSpring) {
    const taken = this.creatures.filter(o => o.alive && o !== c && o.spring === q && o.state === 'soak').map(o => o.angle);
    const seat = [0, 1, 2, 3].find(k => !taken.includes(k)) ?? 0;
    c.angle = seat;
    c.x = q.x + (seat < 2 ? -1 : 1) * q.rx * 0.45 + (seat % 2 ? 4 : -4);
    c.z = q.z + (seat % 2 ? 0.4 : -0.3) * q.rz;
    c.vx = 0; c.vz = 0; c.h = 0;
    c.facing = c.x < q.x ? 1 : -1;
    c.state = 'soak';
    c.timer = Math.floor(between(900, 1800));
  }

  /** Over to the rocks and in, and there it stays with its eyes shut, until it's had enough. */
  private thinkSoak(c: ShrineCreature) {
    const q = c.spring;
    if (!q) { c.state = 'roam'; c.timer = 30; return; }
    if (c.state === 'toSoak') {
      c.mood = 'wandering';
      const a = Math.atan2(c.z - q.z, c.x - q.x);
      const d = this.walkTo(c, q.x + Math.cos(a) * q.rx * 1.25, q.z + Math.sin(a) * q.rz * 1.3, SHRINE_SPECIES[c.species].speed);
      if (d < 4) {
        this.settleInSpring(c, q);
        this.burst('ring', c.x, c.z, 0, 1, 0, 0);
        this.burst('splash', c.x, c.z, 0, 5, 0.4, 0.7);
        return;
      }
      if (--c.timer <= 0) { c.spring = null; c.state = 'roam'; c.timer = 30; }
      return;
    }
    c.mood = 'soaking';
    c.energy = Math.min(1, c.energy + 0.0001);
    if (this.tick % 120 === c.id % 120) this.emote(c, 'zed', 50);
    if (--c.timer <= 0) {
      // Out and away over the rocks, shaking itself dry.
      const a = Math.random() * 6.28;
      c.x = q.x + Math.cos(a) * q.rx * 1.3; c.z = q.z + Math.sin(a) * q.rz * 1.35;
      if (this.isSolid(c.x, c.z)) this.freeSpot(c);
      this.burst('splash', c.x, c.z, 4, 6, 0.5, 0.6);
      c.spring = null;
      c.state = 'roam';
      c.timer = 120;
      c.tx = c.x; c.tz = c.z;
    }
  }

  private updateSprings() {
    if (this.tick % 6) return;
    for (const q of this.springs) {
      if (q.z < this.viewZ.z0 - 50 || q.z > this.viewZ.z1 + 60) continue;
      const a = Math.random() * 6.28, d = Math.sqrt(Math.random());
      this.burst('steam', q.x + Math.cos(a) * q.rx * d, q.z + Math.sin(a) * q.rz * d, 0, 1, 0.02, 0.1);
    }
    if (this.tick % 240 === 0) {
      for (const q of this.basins) q.dirt = Math.min(1, q.dirt + 0.04);
    }
  }

  private updatePrints() {
    if (this.tick % 10) return;
    const prints = this.prints;
    let n = 0;
    for (let i = 0; i < prints.length; i++) {
      prints[i].life -= 10;
      if (prints[i].life > 0) prints[n++] = prints[i];
    }
    prints.length = n;
  }

  // --- gatherings: moon viewing and the contest --------------------------------------------

  /** A row in the current view clear of the hero text, for something everyone should see. */
  private stageRow() {
    let z = clamp((this.viewZ.z0 + this.viewZ.z1) / 2 + 14, 30, this.h - 30);
    for (const q of this.zones) if (z > q.z0 - 10 && z < q.z1 + 18) z = q.z1 + 18;
    return Math.min(z, this.viewZ.z1 - 12);
  }

  /** Open ground in view for the contest: clear of the hero text, water, buildings and the path, and out toward the page's edges for choice. */
  private findStage() {
    const { w, ground, solid } = this;
    // Far enough down the view for a gate on its side to fit, and in the middle of it for choice.
    const z0 = Math.max(40, this.viewZ.z0 + 50), z1 = Math.min(this.h - 26, this.viewZ.z1 - 22);
    const middle = (z0 + z1) / 2;
    const inFront = this.props.filter(p => (p.kind === 'cedar' || p.kind === 'sacred' || p.kind === 'maple' || p.kind === 'goldMaple' || p.kind === 'persimmonTree' || p.kind === 'sakura') && p.z > z0 && p.z < z1 + 110);
    let best = { x: w / 2, z: this.stageRow() };
    let bestScore = -Infinity;
    for (let z = z0; z <= z1; z += 8) {
      for (let x = 30; x <= w - 30; x += 10) {
        if (this.zones.some(q => x + 46 > q.x0 && x - 46 < q.x1 && z + 26 > q.z0 && z - 42 < q.z1)) continue;
        let clear = true;
        for (let zz = z - 8; zz <= z + 24 && clear; zz += 4) {
          for (let xx = x - 32; xx <= x + 32; xx += 4) {
            const xi = clamp(xx, 0, w - 1);
            const i = Math.round(clamp(zz, 0, this.h - 1)) * w + xi;
            if (solid[i] || ground[i] === GROUND.water || ground[i] === GROUND.spring || ground[i] === GROUND.stone) { clear = false; break; }
          }
        }
        if (!clear) continue;
        // Nothing standing in front to hide it.
        if (inFront.some(p => p.z > z - 30 && p.z - p.size * 3.6 < z + 10 && Math.abs(p.x - x) < 50 + p.size)) continue;
        const score = Math.abs(x - w / 2) + 40 - Math.abs(z - middle) * 0.4;
        if (score > bestScore) { bestScore = score; best = { x, z }; }
      }
    }
    return best;
  }

  /** Calls in the nearest of a kind to sit somewhere, sending for more from the edge of the page if they're short. */
  private summon(species: ShrineSpecies, x: number, z: number, facing: 1 | -1) {
    let best: ShrineCreature | null = null;
    let bestD = 280;
    for (const c of this.creatures) {
      if (!c.alive || c.species !== species || c.hidden || c.disguise || c.state === 'sitWatch' || c.state === 'contest' || c.state === 'soak' || this.isYoung(c)) continue;
      const d = dist(c, { x, z });
      if (d < bestD) { bestD = d; best = c; }
    }
    const c = best ?? this.spawn(species, x < this.w / 2 ? 3 : this.w - 4, z);
    c.food = null; c.ring = null; c.spring = null; c.foe = null; c.altar = null; c.prey = null;
    c.h = 0; c.vh = 0;
    c.state = 'sitWatch';
    c.tx = x; c.tz = z;
    c.angle = facing;
    c.timer = 0;
    return c;
  }

  /** Walks to its place and sits there, facing the way it was told, for as long as the gathering lasts. */
  private thinkSitting(c: ShrineCreature) {
    c.mood = this.moonview ? 'moonviewing' : 'watching';
    const d = Math.hypot(c.tx - c.x, c.tz - c.z);
    if (d > 2.5) { this.walkTo(c, c.tx, c.tz, SHRINE_SPECIES[c.species].speed * 2); return; }
    c.vx = 0; c.vz = 0;
    c.facing = (c.angle > 0 ? 1 : -1);
  }

  private endGathering() {
    this.moonview = null;
    const contest = this.contest;
    this.contest = null;
    if (contest) { contest.a.hidden = false; contest.b.hidden = false; }
    for (const c of this.creatures) {
      if (c.state === 'sitWatch' || c.state === 'contest') { c.state = 'roam'; c.timer = Math.floor(between(20, 120)); c.hidden = false; c.tx = c.x; c.tz = c.z; }
    }
  }

  /** Truce: hares, foxes and tanuki in a row beside the path, all looking the same way, in a wash of moonlight. */
  private startMoonview() {
    const z = this.stageRow();
    const row = clamp(Math.round(z), 0, this.h - 1);
    const px = this.pathX[row] + (this.pathX[row] < this.w / 2 ? 1 : -1) * (this.pathHalf[row] + 10);
    const dir = this.pathX[row] < this.w / 2 ? 1 : -1;
    const room = dir > 0 ? this.w - 10 - px : px - 10;
    const count = clamp(Math.floor(room / 19), 3, 9);
    const order: ShrineSpecies[] = ['tanuki', 'hare', 'kitsune'];
    for (let k = 0; k < count; k++) {
      this.summon(order[k % 3], px + dir * k * 19, z + (k % 2 ? 1.5 : -1.5), 1);
    }
    this.moonview = { x: px + (dir * count * 19) / 2, z };
    this.log('visit', 'A truce for moon viewing', null);
  }

  /** On a gutter away from the path, the two rivals face off to see who can turn into the most ridiculous thing. */
  private startContest() {
    const { x, z } = this.findStage();
    // The gate falls whichever way has room, so it stays on the page.
    const side: 1 | -1 = this.w - x > x ? 1 : -1;
    const a = this.summon('tanuki', x - 12, z, 1);
    const b = this.summon('kitsune', x + 12, z, -1);
    a.state = 'contest'; b.state = 'contest';
    // A small crowd, all looking in.
    this.summon('hare', x - 20, z + 15, 1);
    this.summon('tanuki', x + 20, z + 15, -1);
    this.summon('kitsune', x, z + 18, 1);
    this.contest = { x, z, side, a, b, round: 0, t: 0, stage: 'gather' };
    this.log('visit', 'The great disguise contest begins', null);
  }

  private crowdCheers() {
    for (const c of this.creatures) {
      if (c.state === 'sitWatch' && Math.random() < 0.6) { c.squash = 0.4; this.burst('note', c.x, c.z, 20, 1, 0.1, 0.4); }
    }
  }

  private updateContest() {
    const k = this.contest;
    if (!k) return;
    k.t++;
    if (k.stage === 'gather') {
      const ready = Math.hypot(k.a.tx - k.a.x, k.a.tz - k.a.z) < 3 && Math.hypot(k.b.tx - k.b.x, k.b.tz - k.b.z) < 3;
      if (ready || k.t > 420) {
        k.a.x = k.a.tx; k.a.z = k.a.tz; k.b.x = k.b.tx; k.b.z = k.b.tz;
        k.stage = 'show'; k.t = 0; k.round = 0;
        this.poofAt(this.contestant(k));
        this.contestant(k).hidden = true;
      }
      return;
    }
    if (k.stage === 'over') {
      if (k.t > 150) { if (this.happening?.kind === 'contest') this.happening = null; this.endGathering(); }
      return;
    }
    const form = CONTEST_FORMS[k.round];
    const who = this.contestant(k);
    if (form === 'torii') {
      // It holds for a proud moment, begins to lean, and goes over with a crash.
      if (k.t === CONTEST_TORII_STAND + CONTEST_TORII_FALL) {
        const end = k.x + k.side * 40;
        for (let s = 0; s < 8; s++) this.burst('dust', k.x + (k.side * (20 + s * 5)), k.z, 1, 3, 0.6, 0.6);
        this.burst('star', end, k.z, 6, 5, 0.7, 0.9);
        this.crowdCheers();
      }
      if (k.t >= CONTEST_TORII_STAND + CONTEST_TORII_FALL + 70) {
        // Back to itself, seeing stars, and the other one takes the honours.
        who.hidden = false;
        this.poofAt(who);
        who.vh = 0.9;
        this.emote(who, 'what', 110);
        const other = who === k.a ? k.b : k.a;
        this.emote(other, 'heart', 110);
        this.burst('star', who.x, who.z, 22, 5, 0.3, 0.3);
        k.stage = 'over'; k.t = 0;
        this.log('visit', `${who.name} tries to be a whole torii, and falls over`, who);
      }
      return;
    }
    if (k.t === 70) this.crowdCheers();
    if (k.t >= CONTEST_ROUND) {
      who.hidden = false;
      this.poofAt(who);
      k.round++; k.t = 0;
      const next = this.contestant(k);
      this.poofAt(next);
      next.hidden = true;
    }
  }

  private contestant(k: Contest) { return k.round % 2 ? k.b : k.a; }
  private poofAt(c: ShrineCreature) {
    this.burst('smoke', c.x, c.z, 6, 10, 0.7, 0.7);
    this.burst('greenLeaf', c.x, c.z, 16, 1, 0.1, 0.2);
    c.squash = 0.8;
  }

  // --- the nekomata ----------------------------------------------------------------------------

  /** Along the ridges and gate-tops it goes; leaps from one to the next; and dances on its hind legs when it's sure it's alone. */
  private thinkNekomata(c: ShrineCreature) {
    if (!c.perch) {
      const p = this.nearestPerch(c, Infinity);
      if (!p) { c.hidden = true; return; }
      c.hidden = false;
      c.perch = p;
      c.x = (p.x0 + p.x1) / 2; c.z = p.z; c.h = p.h;
      c.state = 'prowl'; c.timer = Math.floor(between(200, 500));
    }
    const p = c.perch;
    if (c.state === 'leap') {
      c.mood = 'flying';
      c.timer--;
      const t = 1 - c.timer / Math.max(1, c.angle);
      const from = { x: c.tx, z: c.tz, h: c.vh };
      c.x = from.x + (((p.x0 + p.x1) / 2) - from.x) * t;
      c.z = from.z + (p.z - from.z) * t;
      c.h = from.h + (p.h - from.h) * t + Math.sin(t * Math.PI) * 26;
      if (c.timer <= 0) { c.x = (p.x0 + p.x1) / 2; c.z = p.z; c.h = p.h; c.vh = 0; c.squash = 0.5; c.state = 'prowl'; c.timer = Math.floor(between(200, 500)); }
      return;
    }
    c.z = p.z; c.h = p.h;
    const watched = (this.pointer && Math.hypot(this.pointer.x - c.x, this.pointer.z - (c.z - c.h * ELEVATION)) < 44)
      || !!this.near(c, 46, o => o.species === 'tanuki' || o.species === 'kitsune' || o.species === 'hahaki' || o.species === 'deer');
    if (c.state === 'dance') {
      c.mood = 'dancing';
      c.vx = 0;
      if (watched) { this.emote(c, 'bang', 40); c.state = 'sit'; c.timer = 120; return; }
      if (this.tick % 34 === 0) this.burst('note', c.x, c.z, c.h + 22, 1, 0.1, 0.35);
      if (--c.timer <= 0) { c.state = 'prowl'; c.timer = Math.floor(between(200, 500)); }
      return;
    }
    if (c.state === 'sit') {
      c.mood = 'perched';
      c.vx = 0;
      if (--c.timer <= 0) { c.state = 'prowl'; c.timer = Math.floor(between(120, 400)); }
      return;
    }
    c.mood = 'prowling';
    c.vx = c.facing * SHRINE_SPECIES.nekomata.speed;
    c.x += c.vx;
    if (c.x < p.x0) { c.x = p.x0; c.facing = 1; }
    if (c.x > p.x1) { c.x = p.x1; c.facing = -1; }
    if (--c.timer <= 0) {
      const roll = Math.random();
      if (roll < 0.45 && !watched) { c.state = 'dance'; c.timer = Math.floor(between(180, 340)); return; }
      if (roll < 0.75) {
        const next = this.nearestPerch(c, 170, p);
        if (next) {
          c.tx = c.x; c.tz = c.z; c.vh = c.h;
          c.perch = next;
          c.angle = Math.max(26, Math.round(Math.hypot(next.x0 - c.x, next.z - c.z) / 1.6));
          c.timer = c.angle;
          c.state = 'leap';
          c.facing = next.x0 > c.x ? 1 : -1;
          c.squash = 0.5;
          return;
        }
      }
      c.state = 'sit';
      c.timer = Math.floor(between(120, 300));
    }
  }

  private nearestPerch(c: ShrineCreature, range: number, not?: Perch) {
    let best: Perch | null = null;
    let bestD = range;
    for (const p of this.perches) {
      if (p === not) continue;
      const d = Math.hypot((p.x0 + p.x1) / 2 - c.x, p.z - c.z);
      if (d < bestD) { bestD = d; best = p; }
    }
    return best;
  }

  // --- the akaname -----------------------------------------------------------------------------

  /** It creeps up to a fouled basin and licks it clean with an enormous tongue, off like a shot if anything comes near. */
  private thinkAkaname(c: ShrineCreature) {
    const speed = SHRINE_SPECIES.akaname.speed;
    if (c.state === 'scuttle') {
      c.mood = 'fleeing';
      this.walkTo(c, c.tx, c.tz, speed * 3.4);
      if (this.tick % 5 === 0) this.burst('dust', c.x, c.z, 0, 1, 0.1, 0.1);
      if (--c.timer <= 0) { c.state = 'roam'; c.timer = 200; }
      return;
    }
    const p = this.pointer;
    const spotted = (p && Math.hypot(p.x - c.x, p.z - c.z) < 30)
      || this.near(c, 26, o => o.h < 12 && (o.species === 'tanuki' || o.species === 'kitsune' || o.species === 'hahaki' || o.species === 'deer' || o.species === 'hare' || o.species === 'baku'));
    if ((c.state === 'creep' || c.state === 'lick') && spotted) {
      this.emote(c, 'bang', 30);
      c.basin = null;
      const from = typeof spotted === 'object' && 'x' in spotted ? spotted : c;
      this.flee(c, from, 130);
      c.state = 'scuttle';
      return;
    }
    if (c.state === 'lick') {
      const b = c.basin;
      c.mood = 'licking';
      c.vx = 0; c.vz = 0;
      if (!b) { c.state = 'roam'; return; }
      this.setFacing(c, b.x - c.x);
      b.dirt = Math.max(0, b.dirt - 0.004);
      if (this.tick % 18 === 0) { c.squash = 0.2; this.burst('splash', b.x, b.z, 8, 1, 0.2, 0.3); }
      if (b.dirt <= 0) {
        this.burst('star', b.x, b.z, 10, 3, 0.3, 0.5);
        c.basin = null;
        this.wanderTarget(c, 80);
        c.state = 'roam'; c.timer = 500;
      }
      return;
    }
    if (c.state === 'creep') {
      const b = c.basin;
      c.mood = 'sneaking';
      if (!b) { c.state = 'roam'; return; }
      const d = this.walkTo(c, b.x - 11, b.z + 2, speed);
      if (d < 3) { c.state = 'lick'; c.vx = 0; c.vz = 0; }
      return;
    }
    c.mood = 'wandering';
    if (--c.timer <= 0) {
      c.timer = 90;
      const b = this.basins.filter(q => q.dirt > 0.35 && !this.creatures.some(o => o.basin === q)).sort((q, r) => dist(q, c) - dist(r, c))[0];
      if (b) { c.basin = b; c.state = 'creep'; return; }
    }
    if (Math.hypot(c.tx - c.x, c.tz - c.z) < 4) this.wanderTarget(c, 50);
    this.walkTo(c, c.tx, c.tz, speed * 0.7);
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
    if (c.state === 'lurk') {
      // Shut up tight among the canes, one eye on the path.
      c.mood = 'lurking';
      c.vx = 0; c.vz = 0;
      if (this.tick % 6 === c.id % 6) {
        const mark = this.near(c, 30, o => this.scareable(o));
        if (mark) { this.jumpScare(c, mark); return; }
      }
      if (--c.timer <= 0) { c.state = 'roam'; c.timer = Math.floor(between(200, 500)); this.wanderTarget(c, 60); }
      return;
    }
    if (c.state === 'cackle') {
      // Beside itself: bouncing on the spot, tongue out.
      c.mood = 'cackling';
      c.vx = 0; c.vz = 0;
      if (c.h === 0) { c.vh = 0.7; c.facing = (c.facing * -1) as 1 | -1; }
      if (this.tick % 14 === 0) this.burst('note', c.x, c.z, 34, 1, 0.2, 0.4);
      // It takes a while to get over how funny that was.
      if (--c.timer <= 0) { c.state = 'roam'; c.timer = Math.floor(between(1200, 2400)); this.wanderTarget(c, 50); }
      return;
    }
    if (c.state === 'boo') {
      c.mood = 'cackling';
      this.walkTo(c, c.tx, c.tz, 0.7);
      if (c.h === 0 && c.vh === 0) { c.state = 'cackle'; c.timer = 110; this.burst('dust', c.x, c.z, 0, 6, 0.5, 0.3); }
      return;
    }
    if (c.state === 'toLurk') {
      c.mood = 'sneaking';
      const d = Math.hypot(c.tx - c.x, c.tz - c.z);
      if (--c.timer <= 0) { c.state = 'roam'; c.timer = 200; return; }
      if (d < 4 && c.h === 0) {
        c.state = 'lurk'; c.timer = Math.floor(between(900, 1800)); c.vx = 0; c.vz = 0; c.squash = 0.4;
        return;
      }
      if (c.h === 0 && this.tick % 26 === c.id % 26) { c.vh = 1; c.squash = 0.4; }
      if (c.h > 0) this.walkTo(c, c.tx, c.tz, SHRINE_SPECIES.kasa.speed * 1.4);
      else { c.vx = 0; c.vz = 0; }
      return;
    }
    // Back to the bamboo, once it's had enough of being out in the open.
    if (--c.timer <= 0) {
      c.timer = 240;
      const cane = this.bambooNear(c, 420);
      if (cane) { c.state = 'toLurk'; c.tx = cane.x + (c.id & 1 ? 3 : -3); c.tz = cane.z - 2; c.timer = 900; return; }
    }
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

  private bambooNear(c: ShrineCreature, range: number) {
    let best: Cane | null = null;
    let bestD = range;
    for (const q of this.canes) {
      if (q.kind !== 'bamboo' || this.isSolid(q.x, q.z - 2) || this.inClearZone(q.x, q.z)) continue;
      const d = dist(c, q);
      if (d < bestD) { bestD = d; best = q; }
    }
    return best;
  }

  /** Whether this one is going about its business, and so can be made to regret it. */
  private scareable(o: ShrineCreature) {
    if (o.disguise || o.drum || o.h > 2) return false;
    if (o.species === 'tanuki' || o.species === 'kitsune') return o.state === 'roam' || o.state === 'forage' || o.state === 'approach';
    if (o.species === 'mouse' || o.species === 'hare') return o.state !== 'flee' && o.state !== 'sitWatch';
    return o.species === 'deer' && (o.state === 'walk' || o.state === 'graze');
  }

  /** Whump: open it flies, tongue out, and everyone within reach leaves the ground. */
  private jumpScare(c: ShrineCreature, mark: ShrineCreature) {
    c.state = 'boo';
    c.vh = 2.7; c.h = 0.1; c.squash = 1;
    // Out in front of the canes, where it can be seen in all its glory.
    c.tx = mark.x; c.tz = Math.max(mark.z, c.z + 10);
    this.setFacing(c, mark.x - c.x);
    this.emote(c, 'bang', 60);
    this.burst('greenLeaf', c.x, c.z, 24, 8, 0.6, 0.4);
    for (const q of this.canes) {
      const dx = q.x - c.x;
      if (Math.abs(dx) < 16 && Math.abs(q.z - c.z) < 10) q.bv += (dx > 0 ? 1 : -1) * 2.4;
    }
    let scared = 0;
    for (const o of this.creatures) {
      if (!o.alive || o === c || o.hidden || dist(o, c) > 44 || !this.scareable(o)) continue;
      this.startle(o, c);
      scared++;
    }
    this.scares++;
    this.log('visit', scared > 1 ? 'An old umbrella sends a crowd running from the bamboo' : `An old umbrella leaps out of the bamboo at a ${SHRINE_SPECIES[mark.species].label.toLowerCase()}`, mark);
  }

  /** Straight up in the air, and then gone. */
  private startle(o: ShrineCreature, from: { x: number; z: number }) {
    this.emote(o, 'bang', 50);
    o.vh = o.species === 'mouse' ? 1.1 : 1.8;
    o.h = 0.1;
    o.squash = 0.7;
    o.food = null; o.altar = null; o.prey = null;
    this.flee(o, from, o.species === 'deer' ? 120 : 110);
  }

  // --- the drum circle --------------------------------------------------------------------

  /** A tanuki finds a good clearing and starts on its belly. Fails if there's no room to dance. */
  private startDrumCircle(c: ShrineCreature, force = false) {
    if (!force && (this.happening || this.isYoung(c) || this.drums.length >= 2 || this.drums.some(d => dist(d, c) < 260))) return false;
    const rx = 26, rz = 18;
    if (!force) for (let a = 0; a < 6.28; a += 0.78) {
      const x = c.x + Math.cos(a) * rx, z = c.z + Math.sin(a) * rz;
      if (this.isSolid(x, z) || this.inClearZone(x, z) || this.isWater(x, z)) return false;
    }
    const d: DrumCircle = { x: c.x, z: c.z, rx, rz, drummer: c, t: 0, dur: Math.floor(between(780, 1080)), beatAt: 0, beats: 0, pulse: false, stunned: 0, over: false };
    this.drums.push(d);
    c.drum = d;
    c.state = 'drumLead';
    c.food = null; c.altar = null; c.foe = null; c.prey = null;
    c.h = 0; c.vh = 0;
    this.drumCircles++;
    this.emote(c, 'note', 50);
    this.log('visit', `${c.name} starts drumming, and the forest comes to listen`, c);
    return true;
  }

  private joinDrum(c: ShrineCreature, d: DrumCircle) {
    c.drum = d;
    c.state = 'toDrum';
    c.food = null; c.altar = null; c.foe = null; c.prey = null; c.ring = null;
    c.angle = Math.atan2((c.z - d.z) / d.rz, (c.x - d.x) / d.rx);
    this.emote(c, 'note', 40);
  }

  private drawnToDrum(c: ShrineCreature) {
    if (c.drum || c.hidden || c.disguise) return false;
    if (c.species === 'kitsune') return c.state === 'roam' && !this.isYoung(c);
    if (c.species === 'mouse') return c.state !== 'flee' && c.state !== 'sitWatch';
    if (c.species === 'kasa') return c.state === 'roam' || c.state === 'lurk';
    return c.species === 'hitodama' || c.species === 'chochin';
  }

  private updateDrums() {
    for (let i = this.drums.length - 1; i >= 0; i--) {
      const d = this.drums[i];
      d.t++;
      d.pulse = false;
      if (d.over) { this.drums.splice(i, 1); continue; }
      const lead = d.drummer;
      if (!lead.alive || lead.drum !== d) { this.endDrum(d); continue; }
      if (d.stunned > 0) {
        // Silence. Everyone stares at the heap in the middle.
        if (++d.stunned > 46) this.endDrum(d);
        continue;
      }
      // Faster and faster toward the end, until one beat too many.
      const push = clamp((d.t - d.dur * 0.55) / (d.dur * 0.45), 0, 1);
      if (d.t >= d.beatAt) {
        d.beatAt = d.t + Math.round(16 - push * 10);
        d.beats++;
        d.pulse = true;
        lead.squash = 0.35 + push * 0.3;
        this.burst('note', lead.x + lead.facing * 7, lead.z, 22, push > 0.5 ? 2 : 1, 0.3, 0.45);
        if (d.beats % 4 === 0) this.burst('dust', lead.x, lead.z, 1, 3 + Math.round(push * 5), 0.6, 0.2);
      }
      if (d.t >= d.dur) {
        d.stunned = 1;
        lead.vh = 2.1; lead.h = 0.1; lead.squash = 1;
        this.emote(lead, 'bang', 46);
        this.burst('star', lead.x, lead.z, 16, 16, 1, 1);
        this.burst('note', lead.x, lead.z, 22, 8, 0.8, 0.8);
        this.burst('dust', lead.x, lead.z, 1, 16, 1.1, 0.5);
        for (const c of this.creatures) {
          if (c.drum === d && c !== lead) { this.emote(c, 'bang', 40); c.squash = 0.5; }
        }
        this.log('visit', `${lead.name} hits one note too hard, and goes over`, lead);
        continue;
      }
      // The music carries: every so often someone new wanders in.
      if (d.t % 16 === 0 && d.t < d.dur * 0.8) {
        let dancers = 0;
        for (const c of this.creatures) if (c.alive && c.drum === d && c !== lead) dancers++;
        if (dancers < 12) {
          let joined = 0;
          for (const c of this.creatures) {
            if (!c.alive || !this.drawnToDrum(c) || dist(c, d) > 300) continue;
            this.joinDrum(c, d);
            if (++dancers >= 12 || ++joined >= 2) break;
          }
        }
      }
    }
  }

  private thinkDrum(c: ShrineCreature) {
    const d = c.drum!;
    if (c === d.drummer) {
      c.vx *= 0.7; c.vz *= 0.7;
      c.mood = 'drumming';
      this.fall(c, 0.12);
      return;
    }
    c.mood = c.state === 'toDrum' ? 'following' : 'dancing';
    const floats = c.species === 'hitodama' || c.species === 'chochin';
    if (!floats) this.fall(c, 0.1);
    // Frozen in the silence after the last note.
    if (d.stunned) { c.vx = 0; c.vz = 0; if (floats) c.h += ((c.species === 'chochin' ? 18 : 14) - c.h) * 0.05; return; }
    const ring = c.species === 'mouse' ? 0.6 : c.species === 'kitsune' ? 0.88 : 1.08;
    const tx = d.x + Math.cos(c.angle) * d.rx * ring, tz = d.z + Math.sin(c.angle) * d.rz * ring;
    if (c.state === 'toDrum') {
      // Hurrying, the further there is to come, so as not to miss it.
      const speed = clamp(Math.hypot(tx - c.x, tz - c.z) / 110, 0.4, 0.95);
      let gone: number;
      if (floats) {
        const dx = tx - c.x, dz = tz - c.z;
        gone = Math.hypot(dx, dz) || 1;
        c.x += (dx / gone) * speed; c.z += (dz / gone) * speed;
        this.setFacing(c, dx);
        c.h += ((c.species === 'chochin' ? 18 : 14) - c.h) * 0.04;
      } else {
        gone = this.walkTo(c, tx, tz, speed);
        if (c.species === 'kasa' && c.h === 0 && this.tick % 20 === c.id % 20) c.vh = 0.9;
      }
      if (gone < 5) c.state = 'drumDance';
      return;
    }
    // Round the drummer, everyone jumping on alternate beats.
    c.angle += 0.011;
    const nx = c.x + (tx - c.x) * 0.12, nz = c.z + (tz - c.z) * 0.12;
    c.vx = nx - c.x; c.vz = nz - c.z;
    c.x = nx; c.z = nz;
    this.setFacing(c, c.vx);
    if (floats) {
      c.h += ((c.species === 'chochin' ? 18 : 14) + Math.sin(this.tick * 0.1 + c.id) * 3 - c.h) * 0.1;
      if (d.pulse) c.h += 2;
    } else if (d.pulse && c.h === 0 && (d.beats + c.id) % 2 === 0) {
      c.vh = c.species === 'mouse' ? 0.75 : c.species === 'kasa' ? 1.1 : 0.85;
      c.squash = 0.4;
    }
  }

  /** The party's over: the drummer flat on its back, everyone else off about their night. */
  private endDrum(d: DrumCircle) {
    d.over = true;
    const lead = d.drummer;
    for (const c of this.creatures) {
      if (c.drum !== d) continue;
      c.drum = null;
      if (c.species !== 'hitodama' && c.species !== 'chochin') { c.h = 0; c.vh = 0; }
      c.vx = 0; c.vz = 0;
      c.tx = c.x; c.tz = c.z;
      c.state = 'roam';
      c.timer = Math.floor(between(20, 120));
      if (c === lead) continue;
      if (c.species === 'mouse') this.flee(c, d, 60);
      else if (d.stunned && c.species === 'kitsune') this.emote(c, 'note', 40);
    }
    if (lead.alive && d.stunned) {
      lead.state = 'passedOut';
      lead.timer = 200;
      lead.h = 0; lead.vh = 0;
      this.burst('dust', lead.x, lead.z, 1, 8, 0.6, 0.3);
      this.emote(lead, 'zed', 200);
    }
  }

  private endDrums() {
    for (const d of this.drums) this.endDrum(d);
    this.drums = [];
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
        case 'ring': case 'dream': break;
        case 'steam': m.vh = 0.09; m.vx += between(-0.012, 0.012); m.vx *= 0.97; break;
        case 'sakura': m.vh = -0.035; m.vx = 0.2 + Math.sin(this.tick * 0.03 + m.seed) * 0.14; m.vz = Math.sin(this.tick * 0.02 + m.seed * 2) * 0.06; if (m.h <= 0) { m.h = 0; m.vx = 0; m.vz = 0; m.vh = 0; } break;
        case 'spore': m.vh = 0.1; m.vx += between(-0.015, 0.015); break;
        default:
          m.vh -= 0.07;
          if (m.h <= 0) { m.h = 0; m.vx = 0; m.vz = 0; m.vh = 0; }
      }
    }
    // The old cherry sheds without end, and the air carries it a long way down the page.
    if (this.tick % 9 === 0 && this.motes.length < MAX_MOTES - 50) {
      for (const p of this.props) {
        if (p.kind !== 'sakura' || p.z < this.viewZ.z0 - 120 || p.z > this.viewZ.z1 + 220) continue;
        const h = between(50, 120);
        this.motes.push({ kind: 'sakura', x: p.x + between(-40, 40), z: p.z + between(-10, 14), h, vx: 0.2, vz: 0, vh: -0.035, life: Math.floor(between(700, 1300)), max: 1300, seed: Math.floor(Math.random() * 100) });
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
    this.endDrums();
    this.endGathering();
    if (this.happening?.kind === 'parade') this.parade = null;
    this.happening = { kind, t: 0, dur: HAPPENING_LENGTH[kind] };
    if (kind === 'parade') this.startParade();
    if (kind === 'moonview') this.startMoonview();
    if (kind === 'contest') this.startContest();
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
      if (ev.t >= ev.dur) { this.happening = null; this.endGathering(); }
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
      const row = clamp(Math.round(m.z), 0, this.h - 1);
      m.x = this.pathX[row] + m.side * (this.pathHalf[row] / PATH_HALF);
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
        if (Math.abs(c.x - px) > this.pathHalf[clamp(Math.round(c.z), 0, this.h - 1)] + 17) continue;
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
      berries: this.bushes.reduce((n, b) => n + b.berries, 0),
      berriesFull: this.bushes.length * BUSH_BERRIES,
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
    if (kind === 'bush') {
      this.bushes.push({ x, z, kind: Math.floor(Math.random() * 3) as BushKind, berries: BUSH_BERRIES, regrow: 0, seed: Math.floor(Math.random() * 4) });
      this.bushes.sort((a, b) => a.z - b.z);
      return;
    }
    if (kind === 'peck') {
      const t = this.spawn('tanuki', x, z);
      this.startDisguise(t, 'teapot');
      const crow = this.spawn('crow', x + 70, z - 20);
      crow.h = 40; crow.prey = t; t.pest = crow; crow.state = 'toPeck';
      return;
    }
    if (kind === 'sniff') {
      const t = this.spawn('tanuki', x, z);
      this.startDisguise(t, 'statue');
      this.startSniffTest(this.spawn('kitsune', x - 36, z + 6), t);
      return;
    }
    if (kind === 'boo') {
      // An umbrella in the nearest bamboo, and somebody just about to walk past it.
      const c = this.spawn('kasa', x, z);
      const cane = this.bambooNear(c, Infinity);
      if (!cane) return;
      c.x = cane.x + 3; c.z = cane.z - 2; c.state = 'lurk'; c.timer = 900;
      for (const [s, off] of [['hare', -50], ['deer', 56], ['tanuki', 62], ['mouse', -60]] as [ShrineSpecies, number][]) {
        const o = this.spawn(s, c.x + off, c.z + 6);
        o.tx = c.x + 2; o.tz = c.z + 4;
        if (s === 'deer') { o.state = 'walk'; o.timer = 400; } else if (s === 'hare') { o.state = 'hop'; o.timer = 400; } else o.timer = 400;
      }
      return;
    }
    if (kind === 'drum') { this.startDrumCircle(this.spawn('tanuki', x, z), true); return; }
    if (kind === 'dance') {
      // Every fox nearby off to the nearest ring.
      const ring = this.rings.length ? this.rings.reduce((b, q) => (Math.hypot(q.x - x, q.z - z) < Math.hypot(b.x - x, b.z - z) ? q : b)) : null;
      if (!ring) return;
      for (let k = 0; k < 3; k++) {
        const c = this.spawn('kitsune', ring.x + between(-20, 20), ring.z + between(-8, 8));
        c.ring = ring; c.state = 'toRing'; c.timer = 1400;
      }
      return;
    }
    if (kind === 'nekomata') { const c = this.spawn(kind, x, z); const p = this.nearestPerch(c, Infinity); if (p) { c.perch = p; c.x = (p.x0 + p.x1) / 2; c.z = p.z; c.h = p.h; c.state = 'prowl'; } return; }
    if (kind === 'tsuchinoko') { const c = this.spawn(kind, x, z); this.rollIn(c); c.tx = this.pathArc[clamp(Math.round(z), 0, this.h - 1)]; return; }
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
    case 'sakura': return box(34, 8, 34);
    case 'teahouse': return box(38, 8, 26);
    case 'onsen': return box(34 * k + 8, 19 * k + 8, 19 * k + 8);
    default: return null;
  }
};

const DRUM_GAP = 2400;
/** How tall each disguise stands, in rows, for a crow to land on; and how often it pecks (the view times its beak by this too). */
const DISGUISE_ROWS: Record<DisguiseKind, number> = { teapot: 12, lantern: 16, statue: 15 };
export const PECK_EVERY = 16;
/** How long a kicked statue takes to go over and be found out, and when in that (counting down) it lands flat. */
export const TOPPLE_TICKS = 50;
export const TOPPLE_FLAT = 40;
/** How long (ticks) the forest waits between staging one scene in view and the next, and between drum circles. */
const SCENE_GAP = 600;

/** How long (ticks) a bush takes to grow one berry back. */
const BERRY_REGROW = 900;
/** Whether a dancing fox has stopped to sit up and bark, for a stretch out of every so often. */
export const isBarkTime = (c: { id: number }, tick: number) => (tick + c.id * 53) % 260 < 50;

/** How long each form in the contest holds, and how long the fake torii stands and takes to fall. */
const CONTEST_ROUND = 130;
export const CONTEST_TORII_STAND = 90;
export const CONTEST_TORII_FALL = 34;

const DISGUISE_ROTATION: DisguiseKind[] = ['teapot', 'lantern', 'statue'];
const OFFERING_NAME: Record<string, string> = { rice: 'rice balls', inari: 'inari sushi', sake: 'sake', mikan: 'mikan', fish: 'fish', cucumber: 'cucumber' };
