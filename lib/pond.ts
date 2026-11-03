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

export type PondSpecies = 'spawn' | 'tadpole' | 'frog' | 'mallard' | 'tufted' | 'minnow' | 'koi' | 'catfish' | 'pike'
  | 'dragonfly' | 'strider' | 'snail' | 'turtle' | 'heron';
export const POND_SPECIES_LIST: PondSpecies[] = [
  'frog', 'spawn', 'tadpole', 'mallard', 'tufted', 'minnow', 'koi', 'catfish', 'pike', 'dragonfly', 'strider', 'snail', 'turtle', 'heron',
];
/** Species that are a big, frightening shape to a frog, and steer clear of the page's hero text. */
const BIG: Partial<Record<PondSpecies, boolean>> = { mallard: true, tufted: true, heron: true, turtle: true };
const FISH: Partial<Record<PondSpecies, boolean>> = { minnow: true, koi: true, catfish: true, pike: true };
/** What the pike will take. */
const PIKE_PREY: Partial<Record<PondSpecies, number>> = { minnow: 1, tadpole: 0.7, koi: 0.15, frog: 0.35, mallard: 0.25 };
/** A frog's life, stage by stage, for the census. */
export type FrogStage = 'spawn' | 'tadpole' | 'backLegs' | 'fourLegs' | 'froglet' | 'adult';
export const FROG_STAGES: FrogStage[] = ['spawn', 'tadpole', 'backLegs', 'fourLegs', 'froglet', 'adult'];

/** What a creature is up to this tick, for the inspector. */
export type PondMood =
  | 'sitting' | 'croaking' | 'catching' | 'leaping' | 'swimming' | 'floating' | 'climbing' | 'fleeing' | 'diving'
  | 'singing' | 'calling' | 'clasping' | 'laying' | 'developing' | 'wriggling' | 'schooling' | 'grazing' | 'emerging'
  | 'paddling' | 'dabbling' | 'preening' | 'quacking' | 'takingOff' | 'flying' | 'landing' | 'nesting' | 'following' | 'walking'
  | 'cruising' | 'rising' | 'rooting' | 'lurking' | 'striking' | 'resting'
  | 'hovering' | 'darting' | 'skating' | 'creeping' | 'basking' | 'stalking' | 'leaving';

/** Something a frog can sit on: a lily pad, a floating log, or a spot on the bank. */
export type Perch =
  | { kind: 'pad'; pad: Pad; ox: number; oz: number }
  | { kind: 'log'; log: Log; ox: number }
  | { kind: 'bank'; x: number; z: number };

export interface PondCreature {
  id: number;
  name: string;
  species: PondSpecies;
  mood: PondMood;
  /** Which layer of the pond it is in: on the bed, underwater, at the surface or above it. */
  layer: Layer;
  x: number; z: number; h: number;
  vx: number; vz: number; vh: number;
  facing: 1 | -1;
  energy: number;
  hungry: boolean;
  age: number;
  maxAge: number;
  breedCooldown: number;
  palette: number;
  heading: number;
  /** Counts down the current state (a croak, a swim, a sit). */
  timer: number;
  perch: Perch | null;
  /** A leap in progress: where from and to, how far through, and where it lands. */
  leap: { x0: number; z0: number; h0: number; x1: number; z1: number; h1: number; t: number; dur: number; arc: number; onto: Perch | null } | null;
  /** The midge a frog's tongue is out for, and how far out it is (0 to 1 and back). */
  target: Midge | PondCreature | null;
  /** What a pike (or the heron) is striking at. */
  prey: PondCreature | null;
  /** A spare number: a dragonfly's flying height, the heron's patience left before a strike. */
  cruise: number;
  tongue: number;
  /** A frog's throat sac, 0 (flat) to 1 (fully puffed). */
  throat: number;
  /** Squash and stretch: positive stretches it along its length. */
  squash: number;
  squashV: number;
  /** Frogs: female or male. A pair in amplexus are each other's mate. */
  sex: 'f' | 'm';
  mate: PondCreature | null;
  /** Where it is making for: a female's laying site, a froglet's way out. */
  goal: { x: number; z: number } | null;
  /** A duckling's leader: the one ahead of it in the line behind its mother. */
  leader: PondCreature | null;
  lineId: number;
  adopted: boolean;
  alive: boolean;
}

/** The census, as the page shows it. */
export interface PondStats {
  tick: number;
  counts: Record<PondSpecies, number>;
  /** Frogs by life stage, from spawn to adult. */
  stages: Record<FrogStage, number>;
  frogCap: number;
  algae: number;
  duckweed: number;
  midges: number;
  meals: number;
  births: number;
  deaths: Record<PondDeath, number>;
  /** The event under way, and how far through it is (0 to 1). */
  happening: { kind: PondHappening; progress: number } | null;
  /** Most recent first. */
  events: PondEvent[];
}

/** What the debug panel can spawn: any species, or a frog at any stage of its life. */
export type PondSpawnable = PondSpecies | FrogStage;

/** How a creature died: eaten, starved, of old age, or lost (the many young that never make it). */
export type PondDeath = 'eaten' | 'starved' | 'oldAge' | 'lost';
/** A mallard's nest on the bank, with the hen sitting on her eggs. */
export interface Nest { x: number; z: number; eggs: number; hen: PondCreature; timer: number; alive: boolean }
export interface PondEvent { tick: number; kind: 'mating' | 'spawn' | 'hatch' | 'emerge' | 'eaten' | 'visit' | 'nest'; text: string; starred: boolean }
const EVENT_LOG_SIZE = 6;

/**
 * A midge dancing in its swarm over the reeds, or a mayfly from a hatch
 * (swarm -1): food for frogs, dragonflies and rising fish. A mayfly's life
 * is short; spent, it falls to lie on the water.
 */
export interface Midge { x: number; z: number; h: number; vx: number; vz: number; vh: number; swarm: number; alive: boolean; life?: number; spent?: boolean }
/** A mayfly nymph climbing a reed stem out of the water to emerge. */
export interface Nymph { x: number; z: number; h: number; top: number; timer: number; dragonfly: boolean; alive: boolean }
/** A firefly blinking over the bank on a summer night. */
export interface Firefly { x: number; z: number; h: number; vx: number; vz: number; phase: number; alive: boolean }
/** The pond's events: a shower of rain, a mayfly hatch, and the evening chorus (dusk, night and dawn). */
export type PondHappening = 'rain' | 'hatch' | 'chorus';
export interface Swarm { x: number; z: number; h: number }
/** A ring spreading across the surface from a splash, a raindrop or a rising fish. */
export interface Ring { x: number; z: number; r: number; speed: number; life: number; maxLife: number; alive: boolean }
/** A droplet thrown up by a splash, arcing back down to the water. */
/** A cloud of silt stirred up off the bed, slowly settling. */
export interface Silt { x: number; z: number; h: number; vx: number; life: number; maxLife: number; alive: boolean }
export interface Droplet { x: number; z: number; h: number; vx: number; vz: number; vh: number; life: number; alive: boolean }

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
  /** One per this many water cells, clamped to [min, max]. */
  cap: [number, number, number];
  palettes: number;
}

// Ticks run at 30 a second.
export const POND_SPECIES: Record<PondSpecies, SpeciesDef> = {
  spawn: {
    label: 'Frogspawn', names: ['Clump', 'Jelly', 'Cluster', 'Brood', 'Pearls', 'Beads'],
    cruise: 0, burst: 0, vision: 0, metabolism: 0, maxAge: [99999, 99999], mature: 0, hungerLine: 0,
    cap: [26000, 0, 7], palettes: 1,
  },
  tadpole: {
    label: 'Tadpole', names: ['Wriggle', 'Comma', 'Dot', 'Squiggle', 'Nib', 'Tad', 'Polly', 'Wiggle', 'Speck', 'Inky'],
    cruise: 0.14, burst: 0.4, vision: 14, metabolism: 0.00025, maxAge: [99999, 99999], mature: 0, hungerLine: 0.75,
    cap: [2400, 0, 90], palettes: 1,
  },
  mallard: {
    label: 'Mallard', names: ['Drake', 'Mallory', 'Puddle', 'Quackers', 'Dabble', 'Webster', 'Waddles', 'Daisy', 'Bill', 'Feather'],
    cruise: 0.16, burst: 1.1, vision: 40, metabolism: 0.00005, maxAge: [40000, 60000], mature: 6000, hungerLine: 0.75,
    cap: [26000, 2, 8], palettes: 2,
  },
  tufted: {
    label: 'Tufted duck', names: ['Tuft', 'Diver', 'Crest', 'Pebble', 'Bob', 'Inkwell'],
    cruise: 0.15, burst: 0.9, vision: 30, metabolism: 0.00005, maxAge: [40000, 60000], mature: 6000, hungerLine: 0.75,
    cap: [120000, 0, 2], palettes: 1,
  },
  minnow: {
    label: 'Minnow', names: ['Flick', 'Glint', 'Dart', 'Sliver', 'Fin', 'Zip', 'Scale', 'Spark', 'Quill', 'Nimble'],
    cruise: 0.28, burst: 0.8, vision: 24, metabolism: 0.0002, maxAge: [6000, 9000], mature: 900, hungerLine: 0.6,
    cap: [3600, 10, 70], palettes: 1,
  },
  koi: {
    label: 'Koi', names: ['Goldie', 'Sakura', 'Kohaku', 'Sunset', 'Biscuit', 'Lantern', 'Marmalade'],
    cruise: 0.12, burst: 0.5, vision: 30, metabolism: 0.00006, maxAge: [60000, 90000], mature: 6000, hungerLine: 0.7,
    cap: [45000, 2, 6], palettes: 2,
  },
  catfish: {
    label: 'Catfish', names: ['Whiskers', 'Murk', 'Silt', 'Barbel', 'Mudpie', 'Grumble'],
    cruise: 0.08, burst: 0.4, vision: 16, metabolism: 0.00005, maxAge: [60000, 90000], mature: 6000, hungerLine: 0.7,
    cap: [90000, 1, 3], palettes: 1,
  },
  pike: {
    label: 'Pike', names: ['Jaws', 'Lurker', 'Esox', 'Fang', 'Spear', 'Ambush'],
    cruise: 0.1, burst: 1.5, vision: 26, metabolism: 0.00012, maxAge: [60000, 90000], mature: 6000, hungerLine: 0.7,
    cap: [160000, 1, 2], palettes: 1,
  },
  dragonfly: {
    label: 'Dragonfly', names: ['Zephyr', 'Azure', 'Darter', 'Glimmer', 'Hawker', 'Skimmer', 'Sapphire'],
    cruise: 0.3, burst: 2.2, vision: 20, metabolism: 0.0001, maxAge: [7000, 11000], mature: 0, hungerLine: 0.7,
    cap: [40000, 2, 8], palettes: 2,
  },
  strider: {
    label: 'Water strider', names: ['Skate', 'Glide', 'Dimple', 'Pond-skater', 'Skimmy', 'Stilts'],
    cruise: 0.4, burst: 0.8, vision: 10, metabolism: 0.0001, maxAge: [8000, 12000], mature: 600, hungerLine: 0.7,
    cap: [9000, 4, 20], palettes: 1,
  },
  snail: {
    label: 'Pond snail', names: ['Spiral', 'Shelly', 'Slowpoke', 'Coil', 'Whorl', 'Gastro'],
    cruise: 0.015, burst: 0.015, vision: 8, metabolism: 0.00004, maxAge: [20000, 30000], mature: 1500, hungerLine: 0.8,
    cap: [7000, 4, 26], palettes: 1,
  },
  turtle: {
    label: 'Turtle', names: ['Basker', 'Shellby', 'Terrapin', 'Sunny', 'Old Log', 'Pebble'],
    cruise: 0.1, burst: 0.3, vision: 30, metabolism: 0.00002, maxAge: [200000, 200000], mature: 0, hungerLine: 0.5,
    cap: [1e9, 0, 1], palettes: 1,
  },
  heron: {
    label: 'Grey heron', names: ['Stilts', 'Grey', 'Dagger', 'Patience', 'Ardea', 'Long-legs'],
    cruise: 0.05, burst: 1.0, vision: 14, metabolism: 0, maxAge: [1e9, 1e9], mature: 0, hungerLine: 1,
    cap: [1e9, 0, 1], palettes: 1,
  },
  frog: {
    label: 'Frog', names: ['Ribbit', 'Hopper', 'Lily', 'Pond', 'Croaky', 'Toad', 'Jumper', 'Fern', 'Moss', 'Bog', 'Kermie', 'Pip', 'Leap', 'Basil'],
    cruise: 0.18, burst: 0.6, vision: 30, metabolism: 0.00006, maxAge: [12000, 18000], mature: 2400, hungerLine: 0.7,
    cap: [7000, 6, 26], palettes: 3,
  },
};

/** How far a frog can leap, and how far its tongue reaches (cells). */
const LEAP_RANGE = 46;
const TONGUE_REACH = 16;
const TONGUE_TICKS = 14;
/** How high (h) a perch's top is: on a pad its bob, on a log its rounded top. */
export const LOG_TOP = 7.5;
/** A frog floats this far down: only its eyes break the surface. */
const FLOAT_H = -0.7;
/** How far a fast cursor startles a frog off its perch (cells). */
const STARTLE_REACH = 16;
const MAX_MIDGES = 420;
/** Frogspawn takes this long to hatch, and a tadpole this long to turn into a froglet. */
export const SPAWN_TICKS = 1500;
export const TADPOLE_TICKS = 2700;
/** A froglet's tail is gone after this many ticks. */
export const TAIL_TICKS = 700;
/** Tadpoles that hatch from one clump. */
const BROOD: [number, number] = [5, 9];
/** How long a pair stay in amplexus at the laying site before the spawn is out. */
const LAYING_TICKS = 150;
/** After laying, before either frog will pair again. */
const FROG_BREED_COOLDOWN = 3600;
/** A tadpole's chance of dying any tick (disease, cold): most never make it. */
const TADPOLE_MORTALITY = 0.00012;
/** On top of that, more die (and more froglets never make it) when the pond is crowded with frogs. */
const CROWDING_MORTALITY = 0.0012;
const BUCKET = 32;
/** Ducks: how long a hen sits on her eggs, how many hatch, how far ducklings keep behind. */
const NEST_TICKS = 1800;
const CLUTCH: [number, number] = [4, 7];
const DUCKLING_GAP = 4.5;
const DUCK_BREED_COOLDOWN = 20000;
/** How high ducks fly, and how far off a frog takes fright at one. */
const FLIGHT_H = 40;
const DUCK_FRIGHT = 14;
/** The pike: how far it strikes from, how long a strike lasts, and how long it rests after a meal. */
const STRIKE_REACH = 18;
const STRIKE_TICKS = 14;
const PIKE_REST = 900;
/** How far a heron's beak reaches, and how long it stays before flying off. */
const HERON_REACH = 13;
const HERON_STAY: [number, number] = [1500, 2400];
/** Ticks between a heron passing over (as a shadow) or landing to fish. */
const HERON_GAP: [number, number] = [1500, 3000];
/** How far around its shadow (or itself) frogs take fright at a heron. */
const HERON_FRIGHT = 24;
/** How long each event lasts, and the gap between events (ticks). */
const RAIN_TICKS = 1500;
const HATCH_TICKS = 1800;
const CHORUS_TICKS = 3000;
const HAPPENING_GAP: [number, number] = [5400, 9000];
const MAX_NYMPHS = 90;
const MAX_FIREFLIES = 90;
const MAYFLY_LIFE: [number, number] = [500, 1000];

const rand = (min: number, max: number) => min + Math.random() * (max - min);
const randInt = (min: number, max: number) => Math.floor(rand(min, max + 1));
const compact = <T extends { alive: boolean }>(list: T[]) => {
  let n = 0;
  for (const item of list) if (item.alive) list[n++] = item;
  list.length = n;
};

const samePerch = (a: Perch, b: Perch) =>
  a.kind === b.kind && (a.kind === 'pad' ? a.pad === (b as { pad: Pad }).pad
    : a.kind === 'log' ? a.log === (b as { log: Log }).log && Math.abs(a.ox - (b as { ox: number }).ox) < 7
      : Math.hypot(a.x - (b as { x: number }).x, a.z - (b as { z: number }).z) < 6);

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
  /** How fast the pointer is moving (cells a tick, fading): a quick one startles the frogs. */
  pointerSpeed = 0;

  creatures: PondCreature[] = [];
  midges: Midge[] = [];
  swarms: Swarm[] = [];
  rings: Ring[] = [];
  droplets: Droplet[] = [];
  nests: Nest[] = [];
  silt: Silt[] = [];
  /** A heron passing high overhead: only its shadow crosses the water (x, z of the shadow). */
  heronPass: { x: number; z: number; dir: 1 | -1 } | null = null;
  private nextHeron = randInt(900, 1800);
  /** The rows the visitor is looking at, so visits and events happen where they can be seen. */
  viewZ = { z0: 0, z1: 200 };
  /** The event under way, if any: what it is, how far through, and how long it lasts (ticks). */
  happening: { kind: PondHappening; t: number; dur: number } | null = null;
  private nextHappening = randInt(2400, 4200);
  private lastHappening: PondHappening | null = null;
  nymphs: Nymph[] = [];
  fireflies: Firefly[] = [];
  private nextId = 1;
  births = 0;
  /** Midges and other insects caught, for the census. */
  meals = 0;
  deaths: Record<PondDeath, number> = { eaten: 0, starved: 0, oldAge: 0, lost: 0 };
  /** Recent happenings for the census, newest first. */
  events: PondEvent[] = [];
  private grid: PondCreature[][] = [];
  private gridCols = 0;
  private gridRows = 0;

  /** Random phases for the shorelines, so every visit has its own pond. */
  private shorePhase = Array.from({ length: 8 }, () => rand(0, Math.PI * 2));
  private clearZones: ClearZone[] = [];
  private windAngle = rand(0, Math.PI * 2);
  private seed = (Math.random() * 0xffffffff) >>> 0 || 1;

  constructor(w: number, h: number) {
    this.resize(w, h);
    for (const species of POND_SPECIES_LIST) {
      if (species === 'mallard' || species === 'heron') continue;
      if (species === 'turtle' && !this.logs.some(l => l.floating)) continue;
      // Minnows arrive in schools of six.
      const n0 = Math.max(species === 'tufted' ? 0 : 1, Math.round(this.cap(species) * 0.6));
      for (let n = species === 'minnow' ? Math.ceil(n0 / 6) : n0; n > 0; n--) this.spawn(species);
    }
    for (let n = Math.max(1, Math.round(this.cap('mallard') * 0.25)); n > 0; n--) this.spawnDuckPair();
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
    // Midges dance over the reeds and over the lily pads.
    this.swarms = [
      ...this.clumps.filter((_, n) => n % 2 === 0).map(c => ({ x: c.x + (c.x < w / 2 ? 6 : -6), z: c.z, h: rand(8, 14) })),
      ...this.pads.filter((_, n) => n % 2 === 0).map(p => ({ x: p.x, z: p.z, h: rand(9, 14) })),
    ];
    for (const m of this.midges) m.swarm = Math.min(m.swarm, this.swarms.length - 1);
    if (!this.swarms.length) this.midges.length = 0;
    for (const c of this.creatures) {
      if (c.x >= w || c.z >= h) c.alive = false;
      // The world was replanted under it: off its perch and into the water.
      if (from === 0 && c.perch) { c.perch = null; c.leap = null; this.dropIn(c); }
    }
    this.gridCols = Math.ceil(w / BUCKET);
    this.gridRows = Math.ceil(h / BUCKET);
    this.grid = [];
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

  setPointer(x: number, z: number) {
    if (this.pointer) this.pointerSpeed = Math.max(this.pointerSpeed, Math.hypot(x - this.pointer.x, z - this.pointer.z));
    this.pointer = { x, z };
  }
  clearPointer() { this.pointer = null; this.pointerSpeed = 0; }

  // --- simulation -------------------------------------------------------------

  step() {
    this.tick++;
    this.counted = null;
    this.updateWind();
    this.updateFloor();
    this.updatePads();
    this.updateReeds();
    this.updateDuckweed();
    this.buildGrid();
    this.updateCreatures();
    this.updateMidges();
    this.updateRings();
    this.updateDroplets();
    this.updateHeron();
    this.updateHappening();
    this.pointerSpeed *= 0.8;
    compact(this.creatures);
    compact(this.midges);
    compact(this.rings);
    compact(this.droplets);
    compact(this.nests);
    this.updateSilt();
    compact(this.silt);
    compact(this.nymphs);
    compact(this.fireflies);
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
    for (let k = Math.max(100, Math.round(n / 260)); k > 0; k -= FLOOR_RUN) {
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

  /** Points (x, z, reach each) that push things floating on the surface aside, worked out once a tick. */
  private pushers: number[] = [];
  private pushersAt = -1;
  private surfacePushers() {
    if (this.pushersAt === this.tick) return this.pushers;
    this.pushersAt = this.tick;
    const out = this.pushers;
    out.length = 0;
    if (this.pointer) out.push(this.pointer.x, this.pointer.z, PART_REACH);
    for (const c of this.creatures) {
      if (c.layer === 'surface' && (c.vx !== 0 || c.vz !== 0)) out.push(c.x, c.z, BIG[c.species] && c.age > 1500 ? 9 : 4);
    }
    return out;
  }

  /** Reeds spring back upright; things pushing through them bend them. */
  private updateReeds() {
    const parity = this.tick & 1;
    const pushers = this.surfacePushers();
    const local: number[] = [];
    for (let n = 0; n < this.clumps.length; n++) {
      const c = this.clumps[n];
      // Only the pushers close enough to this clump to reach any of its stems.
      local.length = 0;
      if ((n & 1) === parity) {
        for (let k = 0; k < pushers.length; k += 3) {
          if (Math.abs(pushers[k] - c.x) < 14 + pushers[k + 2] && Math.abs(pushers[k + 1] - c.z) < 10 + pushers[k + 2]) local.push(pushers[k], pushers[k + 1], pushers[k + 2]);
        }
      }
      for (const st of c.stems) this.bend(st, st.x, st.z, local.length ? local : null);
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
    const all = this.surfacePushers();
    // Each patch only feels the pushers near it.
    const near = patches.map(p => {
      const out: number[] = [];
      for (let k = 0; k < all.length; k += 3) {
        if (Math.abs(all[k] - p.x) < p.rx * 2 + all[k + 2] && Math.abs(all[k + 1] - p.z) < p.rz * 2 + all[k + 2]) out.push(all[k], all[k + 1], all[k + 2]);
      }
      return out;
    });
    for (const p of patches) p.count = 0;
    for (const f of this.fronds) {
      if (!f.alive) continue;
      const p = patches[f.patch];
      const pushers = near[f.patch];
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

  // --- creatures ----------------------------------------------------------

  /** How many of a species the pond holds, by how much water there is. */
  cap(species: PondSpecies) {
    const key = `${this.w}x${this.h}`;
    if (key !== this.capsFor) { this.caps.clear(); this.capsFor = key; }
    let cap = this.caps.get(species);
    if (cap === undefined) {
      const [cells, min, max] = POND_SPECIES[species].cap;
      let water = 0;
      for (let z = 0; z < this.h; z++) water += Math.max(0, this.shoreR[z] - this.shoreL[z]);
      cap = Math.max(min, Math.min(max, Math.round(water / cells)));
      this.caps.set(species, cap);
    }
    return cap;
  }

  private spawn(species: PondSpecies, parent: PondCreature | null = null): PondCreature {
    const sp = POND_SPECIES[species];
    const id = this.nextId++;
    const c: PondCreature = {
      id, name: `${sp.names[id % sp.names.length]} #${id}`, species, mood: 'sitting', layer: 'surface',
      x: 0, z: 0, h: 0, vx: 0, vz: 0, vh: 0, facing: Math.random() < 0.5 ? 1 : -1,
      energy: rand(0.6, 0.9), hungry: false, age: parent ? 0 : randInt(sp.mature, sp.maxAge[0] * 0.6),
      maxAge: randInt(sp.maxAge[0], sp.maxAge[1]), breedCooldown: randInt(0, 1200), palette: randInt(0, sp.palettes - 1),
      heading: rand(0, Math.PI * 2), timer: randInt(30, 300), perch: null, leap: null, target: null, prey: null, cruise: 0, tongue: 0, throat: 0,
      squash: 0, squashV: 0, sex: Math.random() < 0.5 ? 'f' : 'm', mate: null, goal: null, leader: null,
      lineId: parent ? parent.lineId : id, adopted: false, alive: true,
    };
    this.creatures.push(c);
    if (species === 'spawn' || species === 'tadpole') {
      // Laid (or hatched) in the shallows: a fresh clump, or tadpoles of any age.
      c.age = parent ? 0 : randInt(0, species === 'spawn' ? SPAWN_TICKS * 0.6 : TADPOLE_TICKS * 0.8);
      c.layer = 'under';
      c.mood = species === 'spawn' ? 'developing' : 'wriggling';
      const site = parent ? { x: parent.x, z: parent.z } : this.layingSite(rand(0, this.w), rand(0, this.h));
      c.x = site.x + (species === 'tadpole' ? rand(-3, 3) : 0);
      c.z = site.z + (species === 'tadpole' ? rand(-2, 2) : 0);
      c.h = species === 'spawn' ? -1.6 : -rand(1.5, 4);
      if (!this.isWater(c.x, c.z)) { c.x = site.x; c.z = site.z; }
      return c;
    }
    if (species === 'dragonfly' || species === 'strider' || species === 'snail' || species === 'turtle' || species === 'heron') {
      c.age = parent ? 0 : randInt(POND_SPECIES[species].mature, Math.max(POND_SPECIES[species].mature + 1, POND_SPECIES[species].maxAge[0] * 0.5));
      c.palette = randInt(0, POND_SPECIES[species].palettes - 1);
      c.z = parent ? parent.z : rand(10, this.h - 10);
      const row = Math.round(c.z);
      const side: 1 | -1 = Math.random() < 0.5 ? 1 : -1;
      c.x = parent ? parent.x : this.offShore(c.z, side, rand(4, 26));
      if (!this.isWater(c.x, c.z)) c.x = (this.shoreL[row] + this.shoreR[row]) / 2;
      if (species === 'dragonfly') { c.layer = 'air'; c.mood = 'hovering'; c.h = rand(10, 22); }
      else if (species === 'strider') { c.layer = 'surface'; c.mood = 'skating'; c.h = 0; }
      else if (species === 'snail') { c.layer = 'under'; c.mood = 'creeping'; this.placeSnail(c); }
      else if (species === 'turtle') {
        const log = this.logs.find(l => l.floating);
        if (log) { c.perch = { kind: 'log', log, ox: rand(-0.2, 0.2) * log.len }; const p = this.perchPoint(c.perch); c.x = p.x; c.z = p.z; c.h = p.h; }
        c.layer = 'air'; c.mood = 'basking'; c.timer = randInt(1200, 3000);
      } else { c.layer = 'air'; c.mood = 'flying'; c.h = 40; }
      return c;
    }
    if (FISH[species]) {
      c.layer = 'under';
      c.mood = species === 'pike' ? 'lurking' : species === 'catfish' ? 'rooting' : 'cruising';
      c.age = parent ? 0 : randInt(POND_SPECIES[species].mature, POND_SPECIES[species].maxAge[0] * 0.5);
      c.palette = randInt(0, POND_SPECIES[species].palettes - 1);
      if (parent) { c.x = parent.x + rand(-3, 3); c.z = parent.z + rand(-2, 2); } else {
        // Out in the water deep enough to swim in; a pike in a weed bed.
        for (let tries = 0; tries < 30; tries++) {
          const bed = species === 'pike' && this.weedBeds.length ? this.weedBeds[randInt(0, this.weedBeds.length - 1)] : null;
          c.z = bed ? bed.z + rand(-2, 2) : rand(10, this.h - 10);
          const row = Math.round(c.z);
          c.x = bed ? bed.x + rand(-4, 4) : rand(this.shoreL[row] + 6, this.shoreR[row] - 6);
          if (this.isWater(c.x, c.z) && this.depthAt(c.x, c.z) > (species === 'minnow' ? 4 : 8)) break;
        }
      }
      if (!this.isWater(c.x, c.z)) { const row = Math.round(c.z); c.x = (this.shoreL[row] + this.shoreR[row]) / 2; }
      c.h = -this.fishDepth(c);
      if (species === 'minnow' && !parent) {
        // Minnows come as a school.
        for (let k = 0; k < 5; k++) {
          const m = this.spawn('minnow', c);
          m.age = randInt(POND_SPECIES.minnow.mature, 4000);
        }
      }
      return c;
    }
    if (species === 'mallard' || species === 'tufted') {
      // Ducks start out on the open water.
      c.layer = 'surface';
      c.mood = 'paddling';
      c.age = parent ? 0 : randInt(POND_SPECIES[species].mature, 20000);
      c.palette = species === 'mallard' && c.sex === 'f' ? 1 : 0;
      if (parent) { c.x = parent.x; c.z = parent.z; } else {
        c.z = rand(10, this.h - 10);
        const row = Math.round(c.z);
        c.x = rand(this.shoreL[row] + 8, this.shoreR[row] - 8);
      }
      c.h = 0;
      return c;
    }
    // A frog starts on a free pad, a log or the bank, or out in the water.
    const perch = this.findPerch(rand(4, this.w - 4), rand(4, this.h - 4), 1e9);
    if (perch && Math.random() < 0.8) this.sitOn(c, perch);
    else {
      c.x = rand(this.w * 0.2, this.w * 0.8);
      c.z = rand(4, this.h - 4);
      if (!this.isWater(c.x, c.z)) c.x = (this.shoreL[Math.round(c.z)] + this.shoreR[Math.round(c.z)]) / 2;
      this.dropIn(c);
    }
    return c;
  }

  /** Where a perch puts whoever is sitting on it, and how high. */
  perchPoint(p: Perch) {
    switch (p.kind) {
      case 'pad': return { x: p.pad.x + p.ox, z: p.pad.z + p.oz, h: this.padTop(p.pad) + 0.3 };
      case 'log': return { x: p.log.x + p.ox, z: p.log.z - 0.2, h: LOG_TOP };
      case 'bank': return { x: p.x, z: p.z, h: 0 };
    }
  }

  /** A pad's surface height this tick: it bobs on the water and is pushed under by weight. */
  padTop(p: Pad) {
    return Math.sin(this.tick * 0.05 + p.phase) * 0.45 + p.dip;
  }

  private perchTaken(p: Perch, by: PondCreature | null) {
    return this.creatures.some(o => o !== by && o.alive && ((o.perch && samePerch(o.perch, p)) || (o.leap?.onto && samePerch(o.leap.onto, p))));
  }

  /**
   * A free place to sit within reach of a point: a lily pad, a spot on a
   * floating log, or the bank by the water. Nearer ones are likelier.
   */
  private findPerch(x: number, z: number, reach: number, by: PondCreature | null = null, minDist = 0): Perch | null {
    const options: { perch: Perch; d: number }[] = [];
    for (const pad of this.pads) {
      const d = Math.hypot(pad.x - x, pad.z - z);
      if (d > reach || d < minDist || pad.r < 5) continue;
      const perch: Perch = { kind: 'pad', pad, ox: rand(-0.3, 0.3) * pad.r, oz: rand(-0.15, 0.15) * pad.r };
      if (!this.perchTaken(perch, by)) options.push({ perch, d });
    }
    for (const log of this.logs) {
      if (!log.floating) continue;
      const ox = rand(-0.3, 0.3) * log.len;
      const d = Math.hypot(log.x + ox - x, log.z - z);
      if (d > reach || d < minDist) continue;
      const perch: Perch = { kind: 'log', log, ox };
      if (!this.creatures.some(o => o !== by && o.perch?.kind === 'log' && o.perch.log === log && Math.abs(o.perch.ox - ox) < 7)) options.push({ perch, d });
    }
    // The bank, a few cells up from the water's edge.
    for (const side of [1, -1] as const) {
      const bz = Math.max(3, Math.min(this.h - 3, z + rand(-20, 20)));
      const bx = this.offShore(bz, side, -rand(2, 6));
      const d = Math.hypot(bx - x, bz - z);
      if (d <= reach && d >= minDist && bx > 2 && bx < this.w - 2 && !this.isClear(bx, bz)) options.push({ perch: { kind: 'bank', x: bx, z: bz }, d: d * 1.4 });
    }
    if (!options.length) return null;
    options.sort((a, b) => a.d - b.d);
    return options[Math.floor(Math.random() ** 2 * Math.min(options.length, 6))].perch;
  }

  private isClear(x: number, z: number) {
    return this.clearZones.some(r => x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1);
  }

  private sitOn(c: PondCreature, perch: Perch) {
    c.perch = perch;
    const p = this.perchPoint(perch);
    c.x = p.x; c.z = p.z; c.h = p.h;
    c.vx = c.vz = c.vh = 0;
    c.layer = 'air';
    c.mood = 'sitting';
    c.timer = randInt(60, 400);
  }

  /** Into the water from wherever it is: under the surface, swimming. */
  private dropIn(c: PondCreature) {
    c.perch = null;
    c.layer = 'under';
    c.mood = 'swimming';
    c.h = -1.5;
    c.vh = -0.25;
    c.timer = randInt(150, 450);
  }

  private buildGrid() {
    const size = this.gridCols * this.gridRows;
    if (this.grid.length !== size) this.grid = Array.from({ length: size }, () => []);
    for (const b of this.grid) b.length = 0;
    const cols = this.gridCols, rows = this.gridRows;
    for (const c of this.creatures) {
      const gx = Math.max(0, Math.min(cols - 1, (c.x / BUCKET) | 0));
      const gz = Math.max(0, Math.min(rows - 1, (c.z / BUCKET) | 0));
      this.grid[gz * cols + gx].push(c);
    }
  }

  near(x: number, z: number, radius: number, visit: (c: PondCreature) => void) {
    const c0 = Math.max(0, Math.floor((x - radius) / BUCKET)), c1 = Math.min(this.gridCols - 1, Math.floor((x + radius) / BUCKET));
    const r0 = Math.max(0, Math.floor((z - radius) / BUCKET)), r1 = Math.min(this.gridRows - 1, Math.floor((z + radius) / BUCKET));
    for (let r = r0; r <= r1; r++) for (let k = c0; k <= c1; k++) for (const c of this.grid[r * this.gridCols + k] ?? []) visit(c);
  }

  /** How many of each species are alive, counted once a tick (see updateCreatures). */
  private counted: Record<PondSpecies, number> | null = null;
  private counts() {
    if (this.counted) return this.counted;
    const counts = Object.fromEntries(POND_SPECIES_LIST.map(s => [s, 0])) as Record<PondSpecies, number>;
    for (const c of this.creatures) if (c.alive) counts[c.species]++;
    return counts;
  }
  /** Caps by species, worked out once per world size (they count the water). */
  private caps = new Map<PondSpecies, number>();
  private capsFor = '';

  /** How far over its cap the frog population is (0 when it has room). */
  private crowding = 0;

  private updateCreatures() {
    this.counted = null;
    const counts = this.counts();
    this.counted = counts;
    if (this.tick % 30 === 0) this.crowding = Math.max(0, (counts.frog + counts.tadpole * 0.25) / this.cap('frog') - 0.8);
    for (let n = 0, total = this.creatures.length; n < total; n++) {
      const c = this.creatures[n];
      if (c.alive) this.updateCreature(c);
    }
    // Newcomers hop in from the bank if the frogs are down to their last few.
    if (this.tick % 150 === 0) {
      if (counts.frog < POND_SPECIES.frog.cap[1] && Math.random() < 0.4) { this.spawn('frog'); this.logEvent('visit', this.creatures[this.creatures.length - 1]); }
      // Fish find their way in (down the stream, or with the ducks) if they are down to their last few.
      if (counts.minnow < POND_SPECIES.minnow.cap[1] && Math.random() < 0.3) this.spawn('minnow');
      for (const sp of ['koi', 'catfish', 'pike'] as PondSpecies[]) {
        if (counts[sp] < POND_SPECIES[sp].cap[1] && Math.random() < 0.1) this.spawn(sp);
      }
      // Insects and snails drift back in if they are down to their last few.
      for (const sp of ['dragonfly', 'strider', 'snail'] as PondSpecies[]) {
        if (counts[sp] < POND_SPECIES[sp].cap[1] && Math.random() < 0.3) this.spawn(sp);
      }
      if (counts.tufted === 0 && Math.random() < 0.02) {
        const t = this.spawn('tufted');
        t.goal = { x: t.x, z: t.z }; t.x += 150; t.z -= 50; t.h = FLIGHT_H; t.layer = 'air'; t.mood = 'flying';
      }
      // A pair of mallards flies in now and then if the pond has none.
      if (counts.mallard < 2 && Math.random() < 0.15) this.flyIn(this.spawnDuckPair());
    }
  }

  private updateCreature(c: PondCreature) {
    const sp = POND_SPECIES[c.species];
    c.age++;
    if (c.breedCooldown > 0) c.breedCooldown--;
    if (c.squash !== 0 || c.squashV !== 0) {
      c.squashV = (c.squashV - c.squash * 0.25) * 0.78;
      c.squash += c.squashV;
      if (Math.abs(c.squash) + Math.abs(c.squashV) < 0.015) c.squash = c.squashV = 0;
    }
    if (c.energy < sp.hungerLine) c.hungry = true;
    else if (c.energy > 0.95) c.hungry = false;
    switch (c.species) {
      case 'frog': this.thinkFrog(c); break;
      case 'spawn': this.thinkSpawn(c); break;
      case 'tadpole': this.thinkTadpole(c); break;
      case 'mallard': case 'tufted': this.thinkDuck(c); break;
      case 'minnow': case 'koi': case 'catfish': this.thinkFish(c); break;
      case 'pike': this.thinkPike(c); break;
      case 'dragonfly': this.thinkDragonfly(c); break;
      case 'strider': this.thinkStrider(c); break;
      case 'snail': this.thinkSnail(c); break;
      case 'turtle': this.thinkTurtle(c); break;
      case 'heron': this.thinkHeron(c); break;
    }
    if (!c.alive) return;
    c.energy -= sp.metabolism * (c.mood === 'swimming' || c.mood === 'leaping' ? 2 : 1);
    if (c.energy <= 0) this.die(c, 'starved');
    else if (c.age > c.maxAge) this.die(c, 'oldAge');
  }

  private die(c: PondCreature, cause: PondDeath) {
    c.alive = false;
    this.deaths[cause]++;
    const mate = c.mate;
    if (mate) { mate.mate = null; if (mate.mood === 'clasping') mate.mood = 'swimming'; }
    c.mate = null;
  }

  /** Where a frog is in its life: spawn, tadpole (then with legs), froglet or adult. */
  stageOf(c: PondCreature): FrogStage | null {
    if (c.species === 'spawn') return 'spawn';
    if (c.species === 'tadpole') {
      const dev = c.age / TADPOLE_TICKS;
      return dev < 0.4 ? 'tadpole' : dev < 0.72 ? 'backLegs' : 'fourLegs';
    }
    if (c.species === 'frog') return c.age < POND_SPECIES.frog.mature ? 'froglet' : 'adult';
    return null;
  }

  /**
   * Somewhere in the shallows to lay spawn: among the reeds by the water's
   * edge, or under a lily pad. The nearest few to a point, picked at random.
   */
  layingSite(x: number, z: number) {
    const sites: { x: number; z: number; d: number }[] = [];
    for (const c of this.clumps) {
      const st = c.stems.find(st => this.isWater(st.x, st.z) && this.depthAt(st.x, st.z) > 1.5);
      if (st) sites.push({ x: st.x + rand(-1, 1), z: st.z, d: Math.hypot(st.x - x, st.z - z) });
    }
    // At a pad's near edge, peeping out from under it.
    for (const p of this.pads) sites.push({ x: p.x + rand(-0.4, 0.4) * p.r, z: p.z + p.r * 0.6 + 1.5, d: Math.hypot(p.x - x, p.z - z) });
    if (!sites.length) return { x: this.w / 2, z };
    sites.sort((a, b) => a.d - b.d);
    return sites[randInt(0, Math.min(3, sites.length - 1))];
  }

  logEvent(kind: PondEvent['kind'], a: PondCreature | null, b: PondCreature | null = null, text?: string) {
    const name = (c: PondCreature | null) => c?.name.replace(/ #\d+$/, '') ?? '';
    const say = text ?? {
      mating: `${name(a)} and ${name(b)} paired up`,
      spawn: `${name(a)} laid frogspawn`,
      hatch: 'Tadpoles hatched',
      emerge: `${name(a)} climbed out as a froglet`,
      eaten: `${name(b)} ate ${name(a)}`,
      visit: `${name(a)} arrived`,
      nest: `${name(a)} built a nest`,
    }[kind];
    this.events.unshift({ tick: this.tick, kind, text: say, starred: !!(a?.adopted || b?.adopted) });
    if (this.events.length > EVENT_LOG_SIZE) this.events.length = EVENT_LOG_SIZE;
  }

  // --- the life cycle -----------------------------------------------------------

  /** Frogspawn: the eggs darken as they develop and the jelly wobbles; then the tadpoles hatch. */
  private thinkSpawn(c: PondCreature) {
    c.h = -1.6 + Math.sin(this.tick * 0.05 + c.id) * 0.15;
    if (c.age < SPAWN_TICKS) return;
    const counts = this.counts();
    const room = this.cap('tadpole') - counts.tadpole;
    for (let k = Math.min(randInt(BROOD[0], BROOD[1]), Math.max(1, room)); k > 0; k--) {
      const t = this.spawn('tadpole', c);
      t.lineId = c.lineId;
      this.births++;
    }
    this.logEvent('hatch', c);
    c.alive = false;
  }

  /**
   * Tadpoles wriggle about in loose schools, nibbling algae off the bed, and
   * grow back legs, then front legs; then they turn into froglets.
   */
  private thinkTadpole(c: PondCreature) {
    c.layer = 'under';
    if (Math.random() < TADPOLE_MORTALITY + CROWDING_MORTALITY * this.crowding) { this.die(c, 'lost'); return; }
    if (c.age >= TADPOLE_TICKS) { this.metamorphose(c); return; }
    const depth = this.depthAt(c.x, c.z);
    let sx = 0, sz = 0, sh = 0;
    // Loosely together with the tadpoles nearby.
    let n = 0, cx = 0, cz = 0;
    this.near(c.x, c.z, 10, o => {
      if (o === c || o.species !== 'tadpole') return;
      const dx = o.x - c.x, dz = o.z - c.z;
      const d = Math.hypot(dx, dz);
      if (d > 10) return;
      n++; cx += o.x; cz += o.z;
      // Not on top of each other.
      if (d < 2 && d > 0) { sx -= dx / d * 0.02; sz -= dz / d * 0.02; }
    });
    if (n) { sx += (cx / n - c.x) * 0.002; sz += (cz / n - c.z) * 0.002; }
    c.heading += rand(-0.3, 0.3);
    sx += Math.cos(c.heading) * 0.012;
    sz += Math.sin(c.heading) * 0.009;
    // They keep to the warm shallows, where the algae grows.
    if (depth > MAX_DEPTH * 0.45) sx += (c.x < this.w / 2 ? -1 : 1) * 0.01;
    // Hungry: down to the bed to nibble the algae there.
    if (c.hungry) {
      c.mood = 'grazing';
      sh = (-(depth - 0.8) - c.h) * 0.03;
      const i = this.cellAt(c.x, this.bedRow(c.x, c.z));
      if (c.h < -(depth - 2) && this.algae[i] >= ALGAE_PER_UNIT && (this.tick + c.id) % 8 === 0) {
        this.algae[i] -= ALGAE_PER_UNIT;
        if (this.nutrients[i] < 255) this.nutrients[i]++;
        c.energy = Math.min(1, c.energy + 0.03);
      }
    } else {
      c.mood = n > 2 ? 'schooling' : 'wriggling';
      sh = (-Math.min(depth - 1, 3 + (c.id % 4)) - c.h) * 0.01;
    }
    c.vx = (c.vx + sx) * 0.9;
    c.vz = (c.vz + sz) * 0.9;
    c.vh = (c.vh + sh) * 0.9;
    const sp = POND_SPECIES.tadpole;
    const speed = Math.hypot(c.vx, c.vz);
    if (speed > sp.cruise) { c.vx *= sp.cruise / speed; c.vz *= sp.cruise / speed; }
    this.swimMove(c, depth);
    if (Math.abs(c.vx) > 0.02) c.facing = c.vx > 0 ? 1 : -1;
  }

  /** A tadpole with four legs becomes a froglet: up it swims, to climb out onto something. */
  private metamorphose(c: PondCreature) {
    c.species = 'frog';
    const sp = POND_SPECIES.frog;
    c.name = `${sp.names[c.id % sp.names.length]} #${c.id}`;
    c.age = 0;
    c.maxAge = randInt(sp.maxAge[0], sp.maxAge[1]);
    c.breedCooldown = FROG_BREED_COOLDOWN;
    c.palette = randInt(0, sp.palettes - 1);
    c.mood = 'emerging';
    c.timer = 1;
    c.energy = Math.max(c.energy, 0.7);
    c.squashV += 0.4;
  }

  // --- frogs ----------------------------------------------------------------

  private thinkFrog(c: PondCreature) {
    // Froglets are easy pickings: in a crowded pond, many don't make it.
    if (c.age < POND_SPECIES.frog.mature && Math.random() < CROWDING_MORTALITY * this.crowding * 0.5) { this.die(c, 'lost'); return; }
    // A tongue out for a midge snaps back whatever the frog is doing.
    if (c.tongue > 0 || c.target) this.flickTongue(c);
    if (c.leap) { this.stepLeap(c); return; }
    if (c.mate) { this.frogPairing(c); return; }
    if (this.readyToBreed(c) && (this.tick + c.id) % (this.nightfall() > 0.5 ? 10 : 30) === 0) this.seekMate(c);
    if (c.perch) { this.frogOnPerch(c); return; }
    if (c.mood === 'floating') this.frogFloating(c);
    else this.frogSwimming(c);
  }

  // --- frogs: courtship and spawning -------------------------------------------------

  private readyToBreed(c: PondCreature) {
    if (c.species !== 'frog' || c.age < POND_SPECIES.frog.mature || c.breedCooldown > 0 || c.energy < 0.5 || c.mate) return false;
    const counts = this.counts();
    return counts.spawn < this.cap('spawn') && counts.tadpole < this.cap('tadpole') * 0.7 && counts.frog < this.cap('frog') + 4;
  }

  /**
   * A ready female goes to the nearest calling male; a ready male calls
   * (croaks) from where he sits until one comes. The pair meet in the
   * water, where he clasps her from behind.
   */
  private seekMate(c: PondCreature) {
    if (c.sex === 'm') {
      if (c.perch && c.mood !== 'croaking' && Math.random() < 0.3) { c.mood = 'croaking'; c.timer = randInt(60, 120); }
      return;
    }
    // She hears the nearest calling male from a long way off.
    let best: PondCreature | null = null;
    let bestD = 400;
    for (const o of this.creatures) {
      if (o.species !== 'frog' || o.sex !== 'm' || o.mate || !o.alive || !this.readyToBreed(o)) continue;
      const d = Math.hypot(o.x - c.x, o.z - c.z);
      if (d < bestD) { bestD = d; best = o; }
    }
    if (!best) return;
    c.mate = best; best.mate = c;
    c.mood = 'swimming'; best.mood = 'calling';
    if (c.perch) this.leapIntoWater(c);
  }

  /** Off a perch and into the nearest water, in a leap. */
  private leapIntoWater(c: PondCreature) {
    const side = c.perch?.kind === 'bank' ? (c.x < this.w / 2 ? 1 : -1) : c.facing;
    let tx = c.perch?.kind === 'bank' ? this.offShore(c.z, side, rand(5, 10)) : c.x + side * rand(6, 12);
    if (!this.isWater(tx, c.z)) tx = this.offShore(c.z, c.x < this.w / 2 ? 1 : -1, rand(5, 10));
    this.leapTo(c, tx, c.z + rand(-3, 3), null, 0.7);
  }

  private frogPairing(c: PondCreature) {
    const mate = c.mate!;
    if (!mate.alive || mate.mate !== c) { c.mate = null; c.mood = c.perch ? 'sitting' : 'swimming'; return; }
    if (c.sex === 'm') {
      if (c.mood === 'clasping') {
        // Riding on her back, gripping tight.
        // Just behind her head and over her back, drawn in front of her.
        c.x = mate.x - mate.facing * 3; c.z = mate.z + 0.05; c.h = mate.h + 4.5;
        c.facing = mate.facing; c.layer = mate.layer === 'surface' ? 'surface' : 'under';
        c.vx = mate.vx; c.vz = mate.vz;
        return;
      }
      // Calling from his perch until she is close, then in after her.
      c.throat += ((c.perch && (this.tick >> 3) % 3 !== 2 ? 1 : 0) - c.throat) * 0.35;
      const d = Math.hypot(mate.x - c.x, mate.z - c.z);
      if (c.perch) {
        const at = this.perchPoint(c.perch);
        c.x = at.x; c.z = at.z; c.h = at.h;
        if (d < 18 && mate.layer !== 'air') { c.throat = 0; this.leapTo(c, mate.x, mate.z, null, 0.6); }
        return;
      }
      if (c.layer === 'under' || c.layer === 'surface') {
        if (d < 4) { c.mood = 'clasping'; c.squashV -= 0.4; this.logEvent('mating', c, mate); return; }
        this.swimToward(c, mate.x, mate.z, -2);
      }
      return;
    }
    // Her: first to him, then (with him on her back) to a laying site.
    const clasped = mate.mood === 'clasping';
    if (!clasped) {
      if (c.perch) { this.leapIntoWater(c); return; }
      if (c.layer === 'under' || c.layer === 'surface') this.swimToward(c, mate.x + mate.facing * 4, mate.z, -2);
      // Waited too long for him: give up.
      if (++c.timer > 2400) { c.mate = null; mate.mate = null; mate.mood = mate.perch ? 'sitting' : 'swimming'; }
      return;
    }
    if (!c.goal) c.goal = this.layingSite(c.x, c.z);
    const g = c.goal;
    const d = Math.hypot(g.x - c.x, g.z - c.z);
    if (c.mood !== 'laying') {
      c.mood = 'swimming';
      this.swimToward(c, g.x, g.z, -1.6);
      if (d < 3) { c.mood = 'laying'; c.timer = LAYING_TICKS; }
      return;
    }
    // Laying: a little shudder now and then as the eggs come.
    c.vx *= 0.8; c.vz *= 0.8;
    if ((this.tick + c.id) % 30 === 0) c.squashV += 0.2;
    if (--c.timer > 0) return;
    const clump = this.spawn('spawn', c);
    clump.x = g.x; clump.z = g.z;
    clump.lineId = c.lineId;
    this.logEvent('spawn', c, mate);
    c.mate = null; mate.mate = null;
    c.goal = null;
    c.breedCooldown = mate.breedCooldown = FROG_BREED_COOLDOWN;
    c.energy -= 0.25;
    c.mood = mate.mood = 'swimming';
    c.timer = mate.timer = randInt(100, 300);
  }

  /** Swims toward a point, at a depth, with frog kicks. */
  private swimToward(c: PondCreature, x: number, z: number, h: number) {
    const depth = this.depthAt(c.x, c.z);
    c.layer = 'under';
    const dx = x - c.x, dz = z - c.z;
    const d = Math.hypot(dx, dz) || 1;
    let sx = 0, sz = 0;
    if ((this.tick + c.id * 7) % 22 === 0) { sx = (dx / d) * 0.3; sz = (dz / d) * 0.25; c.squashV += 0.2; }
    c.vx = (c.vx + sx) * 0.94;
    c.vz = (c.vz + sz) * 0.94;
    c.vh = (c.vh + (Math.max(h, -(depth - 1)) - c.h) * 0.02) * 0.9;
    this.swimMove(c, depth);
    if (Math.abs(c.vx) > 0.03) c.facing = c.vx > 0 ? 1 : -1;
  }

  /** Something big and fast close by (for now, the visitor's cursor). */
  private threatened(c: PondCreature) {
    const p = this.pointer;
    if (p && this.pointerSpeed > 2.5 && Math.hypot(p.x - c.x, p.z - (c.z - c.h * ELEVATION)) < STARTLE_REACH) return true;
    // The shadow of a heron passing over.
    const hp = this.heronPass;
    if (hp && Math.abs(hp.x - c.x) < HERON_FRIGHT && Math.abs(hp.z - c.z) < HERON_FRIGHT * 0.7) return true;
    // A duck paddling up, a heron, or anything big landing close by.
    let scared = false;
    this.near(c.x, c.z, HERON_FRIGHT, o => {
      if (!scared && BIG[o.species] && o.age >= POND_SPECIES[o.species].mature * 0.5 && o.layer !== 'under' && o.mood !== 'basking'
        && Math.hypot(o.x - c.x, o.z - c.z) < (o.species === 'heron' ? HERON_FRIGHT : DUCK_FRIGHT)
        && (o.species === 'heron' || Math.hypot(o.vx, o.vz) > 0.05 || o.mood === 'landing')) scared = true;
    });
    return scared;
  }

  private frogOnPerch(c: PondCreature) {
    const perch = c.perch!;
    const at = this.perchPoint(perch);
    c.x = at.x; c.z = at.z; c.h = at.h;
    c.layer = 'air';
    c.throat += (((c.mood === 'croaking' || c.mood === 'singing') && (c.timer >> 3) % 3 !== 2 ? 1 : 0) - c.throat) * 0.35;
    if (this.threatened(c)) {
      // Plop: straight into the nearest water and down.
      c.mood = 'fleeing';
      const side = perch.kind === 'bank' ? (c.x < this.w / 2 ? 1 : -1) : c.facing;
      const tx = perch.kind === 'bank' ? this.offShore(c.z, side, rand(6, 12)) : c.x + side * rand(6, 12);
      this.leapTo(c, tx, c.z + rand(-4, 4), null, 0.7);
      return;
    }
    if (--c.timer > 0) {
      // A midge in reach: out goes the tongue.
      if (!c.target && c.tongue === 0 && (this.tick + c.id) % 4 === 0 && (c.hungry || Math.random() < 0.4)) {
        const m = this.nearestPrey(c, TONGUE_REACH) ?? this.nearestMidge(c, TONGUE_REACH);
        if (m) { c.target = m; c.mood = 'catching'; c.facing = m.x > c.x ? 1 : -1; }
      }
      return;
    }
    if (c.mood === 'croaking' || c.mood === 'catching' || c.mood === 'singing') c.mood = 'sitting';
    // Rain and the night set them all calling: at night, in waves across the pond.
    const calling = this.nightfall() > 0.5 ? 0.85 : this.rainAmount() > 0.3 ? 0.65 : 0.35;
    const roll = Math.random();
    if (roll < calling && c.age >= POND_SPECIES.frog.mature) {
      c.mood = this.nightfall() > 0.5 ? 'singing' : 'croaking';
      c.timer = this.nightfall() > 0.5 ? 40 + Math.round(Math.sin(this.tick * 0.01 + c.x * 0.02) * 20 + 20) : randInt(40, 90);
    } else if (roll < 0.75) {
      // Off to another pad, a log or the bank: a hungry frog to one where the midges are.
      const swarm = c.hungry ? this.nearestSwarm(c.x, c.z) : null;
      const next = swarm && Math.hypot(swarm.x - c.x, swarm.z - c.z) > TONGUE_REACH
        ? this.findPerch(c.x + Math.sign(swarm.x - c.x) * Math.min(LEAP_RANGE * 0.7, Math.abs(swarm.x - c.x)),
          c.z + Math.sign(swarm.z - c.z) * Math.min(LEAP_RANGE * 0.7, Math.abs(swarm.z - c.z)), LEAP_RANGE * 0.6, c, 8)
        : this.findPerch(c.x, c.z, LEAP_RANGE, c, 8);
      if (next) {
        const p = this.perchPoint(next);
        this.leapTo(c, p.x, p.z, next, 1);
      } else c.timer = randInt(60, 200);
    } else if (roll < 0.88) {
      // In for a swim.
      const tx = c.x + c.facing * rand(8, 18), tz = c.z + rand(-6, 6);
      if (this.isWater(tx, tz)) this.leapTo(c, tx, tz, null, 0.8);
      else c.timer = randInt(60, 200);
    } else {
      c.facing = c.facing > 0 ? -1 : 1;
      c.timer = randInt(60, 300);
    }
  }

  /** Springs off toward a point (onto a perch, or into the water if there is none) in an arc. */
  private leapTo(c: PondCreature, x: number, z: number, onto: Perch | null, power: number) {
    const from = c.perch;
    if (from?.kind === 'pad') { from.pad.dipV -= 0.35; from.pad.tilt = c.facing; }
    const d = Math.hypot(x - c.x, z - c.z);
    const h1 = onto ? this.perchPoint(onto).h : 0;
    c.leap = { x0: c.x, z0: c.z, h0: c.h, x1: x, z1: z, h1, t: 0, dur: Math.max(10, Math.round(d * 0.9)), arc: (5 + d * 0.35) * power, onto };
    c.perch = null;
    c.facing = x > c.x ? 1 : -1;
    c.mood = 'leaping';
    c.layer = 'air';
    // Crouch, then stretch out as it springs.
    c.squashV += 0.5;
  }

  private stepLeap(c: PondCreature) {
    const L = c.leap!;
    L.t++;
    const k = Math.min(1, L.t / L.dur);
    // A moving pad is followed through the air.
    if (L.onto) { const p = this.perchPoint(L.onto); L.x1 = p.x; L.z1 = p.z; L.h1 = p.h; }
    const px = c.x, pz = c.z, ph = c.h;
    c.x = L.x0 + (L.x1 - L.x0) * k;
    c.z = L.z0 + (L.z1 - L.z0) * k;
    c.h = L.h0 + (L.h1 - L.h0) * k + L.arc * 4 * k * (1 - k);
    c.vx = c.x - px; c.vz = c.z - pz; c.vh = c.h - ph;
    if (k < 1) return;
    c.leap = null;
    if (L.onto && !this.perchTaken(L.onto, c)) {
      this.sitOn(c, L.onto);
      // The landing: the pad dips and tips under it, the frog squashes down.
      if (L.onto.kind === 'pad') { L.onto.pad.dipV -= 0.7; L.onto.pad.tilt = c.facing; this.ring(c.x, c.z, 1, 0.25, 40); }
      c.squashV -= 0.5;
      return;
    }
    // Into the water: a splash, a ring, and down it goes.
    this.splash(c.x, c.z, 8);
    this.ring(c.x, c.z, 1, 0.3, 60);
    c.mood = 'diving';
    c.layer = 'under';
    c.h = -1;
    c.vx *= 0.5; c.vz *= 0.5;
    c.vh = -0.45;
    c.timer = randInt(150, 450);
  }

  /** Underwater: strong kicks and a glide, wandering, then back up to the surface. */
  private frogSwimming(c: PondCreature) {
    c.layer = 'under';
    const depth = this.depthAt(c.x, c.z);
    let sx = 0, sz = 0, sh = 0;
    c.heading += rand(-0.15, 0.15);
    // Keep to the water: turn away from the banks.
    const ahead = { x: c.x + Math.cos(c.heading) * 8, z: c.z + Math.sin(c.heading) * 8 };
    if (!this.isWater(ahead.x, ahead.z)) c.heading += Math.PI * 0.6;
    if (c.mood === 'diving' && c.h < -Math.min(depth - 2, 6)) c.mood = 'swimming';
    const surfacing = --c.timer <= 0 || c.mood === 'emerging';
    const want = surfacing ? FLOAT_H : -Math.min(depth - 1.5, 4 + (c.id % 5) * 1.5);
    sh = (want - c.h) * 0.02;
    // A kick every so often, then a glide.
    if ((this.tick + c.id * 7) % 22 === 0) {
      sx = Math.cos(c.heading) * 0.35;
      sz = Math.sin(c.heading) * 0.25;
      c.squashV += 0.25;
    }
    c.vx = (c.vx + sx) * 0.94;
    c.vz = (c.vz + sz) * 0.94;
    c.vh = (c.vh + sh) * 0.9;
    this.swimMove(c, depth);
    if (Math.abs(c.vx) > 0.03) c.facing = c.vx > 0 ? 1 : -1;
    if (surfacing && c.h > FLOAT_H - 0.4) {
      // A new froglet heads straight out of the water.
      const fresh = c.mood === 'emerging';
      c.mood = 'floating';
      c.layer = 'surface';
      c.h = FLOAT_H;
      c.vh = 0;
      c.timer = fresh ? 0 : randInt(120, 360);
      if (fresh) this.logEvent('emerge', c);
      this.ring(c.x, c.z, 1, 0.2, 40);
    }
  }

  /** Moves a swimmer, keeping it in the water and between the bed and the surface. */
  private swimMove(c: PondCreature, depth: number) {
    const nx = c.x + c.vx, nz = c.z + c.vz;
    if (this.isWater(nx, nz)) { c.x = nx; c.z = nz; } else { c.vx = -c.vx; c.vz = -c.vz; c.heading += Math.PI; }
    c.h = Math.max(-Math.max(1, depth - 1), Math.min(c.species === 'tufted' ? 0 : FLOAT_H, c.h + c.vh));
  }

  /** Eyes up at the surface: drifting, then off to climb out onto something, or back under. */
  private frogFloating(c: PondCreature) {
    c.layer = 'surface';
    c.h = FLOAT_H + Math.sin(this.tick * 0.07 + c.id) * 0.1;
    if (this.threatened(c)) { c.mood = 'diving'; c.layer = 'under'; c.vh = -0.4; c.timer = randInt(200, 400); this.ring(c.x, c.z, 1, 0.3, 40); return; }
    c.timer--;
    // A midge low over the water is fair game from here too.
    if (!c.target && c.tongue === 0 && (this.tick + c.id) % 6 === 0) {
      const m = this.nearestMidge(c, TONGUE_REACH * 0.8);
      if (m) { c.target = m; c.facing = m.x > c.x ? 1 : -1; }
    }
    const goal = c.target ? null : this.climbGoal(c);
    if (goal) {
      const g = this.perchPoint(goal);
      const dx = g.x - c.x, dz = g.z - c.z;
      const d = Math.hypot(dx, dz);
      // Close enough: a hop up out of the water onto it.
      if (d < (goal.kind === 'pad' ? goal.pad.r * 0.8 + 2 : 4)) {
        if (!this.perchTaken(goal, c)) { this.leapTo(c, g.x, g.z, goal, 0.35); c.mood = 'climbing'; return; }
        this.climbTarget.delete(c.id);
      }
      // A lazy breaststroke over to it.
      c.vx = (c.vx + (dx / d) * 0.006) * 0.95;
      c.vz = (c.vz + (dz / d) * 0.006) * 0.95;
    } else {
      c.vx = (c.vx + this.wind.x) * 0.97;
      c.vz = (c.vz + this.wind.z) * 0.97;
    }
    const nx = c.x + c.vx, nz = c.z + c.vz;
    if (this.isWater(nx, nz)) { c.x = nx; c.z = nz; }
    else if (c.timer < 0) {
      // Bumped into the bank: climb straight out onto it.
      const side = c.x < this.w / 2 ? 1 : -1;
      this.leapTo(c, this.offShore(c.z, side, -rand(2, 5)), c.z, { kind: 'bank', x: this.offShore(c.z, side, -rand(2, 5)), z: c.z }, 0.4);
      c.mood = 'climbing';
      return;
    }
    if (Math.abs(c.vx) > 0.02) c.facing = c.vx > 0 ? 1 : -1;
    if (c.timer < -600) { this.climbTarget.delete(c.id); this.dropIn(c); }
  }

  /** Where a floating frog is heading to climb out (chosen once its float is up). */
  private climbTarget = new Map<number, Perch>();
  private climbGoal(c: PondCreature): Perch | null {
    if (c.timer > 0) return null;
    let goal = this.climbTarget.get(c.id) ?? null;
    if (!goal || this.perchTaken(goal, c)) {
      goal = this.findPerch(c.x, c.z, 60, c);
      if (!goal) return null;
      this.climbTarget.set(c.id, goal);
    }
    return goal;
  }

  /** The tongue shoots out to the midge, snatches it and snaps back. */
  private flickTongue(c: PondCreature) {
    const m = c.target;
    if (m) {
      c.tongue = Math.min(1, c.tongue + 2 / TONGUE_TICKS);
      if (c.tongue >= 1) {
        if (m.alive && Math.hypot(m.x - c.x, m.z - c.z) < TONGUE_REACH + 3) {
          if ('species' in m) {
            // A dragonfly or a water strider: a bigger meal, but quick enough to get away.
            if (Math.random() < (m.species === 'dragonfly' ? 0.35 : 0.6)) {
              this.die(m, 'eaten');
              this.logEvent('eaten', m, c);
              c.energy = Math.min(1, c.energy + 0.35);
            } else if (m.species === 'dragonfly') { m.mood = 'darting'; m.timer = 0; }
          } else {
            m.alive = false;
            c.energy = Math.min(1, c.energy + 0.15);
          }
          this.meals++;
        }
        c.target = null;
      }
    } else {
      c.tongue = Math.max(0, c.tongue - 2 / TONGUE_TICKS);
      if (c.tongue === 0 && c.mood === 'catching') c.mood = 'sitting';
    }
  }

  /** Where a frog's tongue is reaching (it follows the midge it is after). */
  tongueTip(c: PondCreature) {
    const t = c.target;
    const mouth = { x: c.x + c.facing * 5, z: c.z, h: c.h + 6 };
    const to = t ?? { x: mouth.x + c.facing * 6, z: c.z, h: mouth.h };
    return { mouth, tip: { x: mouth.x + (to.x - mouth.x) * c.tongue, z: mouth.z + (to.z - mouth.z) * c.tongue, h: mouth.h + (to.h - mouth.h) * c.tongue } };
  }

  /** A dragonfly hovering low, or a water strider, within a frog's reach. */
  private nearestPrey(c: PondCreature, reach: number) {
    let best: PondCreature | null = null, bestD = reach;
    this.near(c.x, c.z, reach, o => {
      if (!o.alive || (o.species !== 'dragonfly' && o.species !== 'strider') || (o.species === 'dragonfly' && o.h > c.h + 16)) return;
      const d = Math.hypot(o.x - c.x, o.z - c.z);
      if (d < bestD) { bestD = d; best = o; }
    });
    return best;
  }

  private nearestSwarm(x: number, z: number) {
    let best: Swarm | null = null;
    let bestD = 200;
    for (const s of this.swarms) {
      const d = Math.hypot(s.x - x, s.z - z);
      if (d < bestD) { bestD = d; best = s; }
    }
    return best;
  }

  private nearestMidge(c: PondCreature, reach: number) {
    let best: Midge | null = null;
    let bestD = reach;
    for (const m of this.midges) {
      if (!m.alive) continue;
      const d = Math.hypot(m.x - c.x, m.z - c.z, (m.h - c.h - 6) * 0.5);
      if (d < bestD) { bestD = d; best = m; }
    }
    return best;
  }

  // --- ducks ---------------------------------------------------------------------

  private spawnDuckPair() {
    const hen = this.spawn('mallard');
    hen.sex = 'f'; hen.palette = 1;
    const drake = this.spawn('mallard');
    drake.sex = 'm'; drake.palette = 0;
    drake.x = hen.x + rand(-6, 6); drake.z = hen.z + rand(-3, 3);
    if (!this.isWater(drake.x, drake.z)) { drake.x = hen.x; drake.z = hen.z; }
    hen.mate = drake; drake.mate = hen;
    drake.lineId = hen.lineId;
    return hen;
  }

  /** Ducks arriving from elsewhere: high over the page, coming down to land. */
  private flyIn(hen: PondCreature) {
    for (const d of [hen, hen.mate!]) {
      d.goal = { x: d.x, z: d.z };
      d.x += rand(-1, 1) * 120; d.z += rand(-60, -20);
      d.h = FLIGHT_H;
      d.layer = 'air';
      d.mood = 'flying';
    }
    this.logEvent('visit', hen, null, 'A pair of mallards flew in');
  }

  private thinkDuck(c: PondCreature) {
    const young = c.age < POND_SPECIES[c.species].mature;
    if (young && c.leader && c.leader.alive && c.age < POND_SPECIES[c.species].mature * 0.8) { this.duckling(c); return; }
    c.leader = null;
    switch (c.mood) {
      case 'takingOff': this.duckTakeOff(c); return;
      case 'flying': case 'landing': this.duckFly(c); return;
      case 'nesting': this.duckNesting(c); return;
      case 'walking': this.duckWalk(c); return;
      case 'diving': this.duckDive(c); return;
    }
    c.layer = 'surface';
    c.h = 0;
    const sp = POND_SPECIES[c.species];
    // Drakes stay with their hen (and fly when she does).
    const hen = c.sex === 'm' && c.mate?.alive ? c.mate : null;
    if (hen && (hen.mood === 'flying' || hen.mood === 'takingOff')) {
      this.startTakeOff(c, hen.goal ?? { x: hen.x, z: hen.z });
      return;
    }
    if (c.timer-- > 0) {
      const busy = c.mood === 'dabbling' || c.mood === 'preening' || c.mood === 'quacking';
      if (c.mood === 'dabbling') this.dabble(c);
      if (!busy || c.mood === 'quacking') this.paddle(c, hen, sp.cruise);
      else { c.vx *= 0.9; c.vz *= 0.9; c.x += c.vx; c.z += c.vz; }
      return;
    }
    // Something new to do.
    c.mood = 'paddling';
    if (c.sex === 'f' && c.species === 'mallard' && this.readyToNest(c)) { this.goNest(c); return; }
    if (c.species === 'mallard' && !c.mate?.alive) {
      c.mate = null;
      // A grown duckling pairs up with another single bird; a crowded pond's spares fly off.
      const single = this.creatures.find(o => o !== c && o.alive && o.species === 'mallard' && o.sex !== c.sex && !o.mate?.alive && o.age >= POND_SPECIES.mallard.mature);
      if (single) { c.mate = single; single.mate = c; c.lineId = single.lineId = Math.min(c.lineId, single.lineId); }
      else if (this.counts().mallard > this.cap('mallard') && Math.random() < 0.3) { this.leave(c); return; }
    }
    const roll = Math.random();
    if (roll < 0.3) { c.mood = 'dabbling'; c.timer = randInt(80, 160); c.squashV += 0.3; }
    else if (roll < 0.42) { c.mood = 'preening'; c.timer = randInt(60, 140); }
    else if (roll < 0.52 && c.species === 'mallard') { c.mood = 'quacking'; c.timer = 24; }
    else if (roll < 0.6 && c.species === 'tufted') { this.startDive(c); }
    else if (roll < 0.64 && c.sex === 'f' && !this.hasDucklings(c)) {
      // Off to another part of the pond.
      const z = Math.max(20, Math.min(this.h - 20, c.z + rand(-1, 1) * 400));
      const row = Math.round(z);
      this.startTakeOff(c, { x: rand(this.shoreL[row] + 10, this.shoreR[row] - 10), z });
    } else c.timer = randInt(100, 300);
  }

  /** Off over the trees and away: it flies off the edge of the page and is gone. */
  private leave(c: PondCreature) {
    const side = c.x < this.w / 2 ? -1 : 1;
    this.startTakeOff(c, { x: side < 0 ? -80 : this.w + 80, z: c.z + rand(-60, 60) });
    this.leaving.add(c.id);
    this.logEvent('visit', c, null, `${c.name.replace(/ #\d+$/, '')} flew off`);
  }
  private leaving = new Set<number>();

  private hasDucklings(c: PondCreature) {
    return this.creatures.some(o => o.leader && o.alive && o.species === c.species && o.lineId === c.lineId && o.age < POND_SPECIES[o.species].mature);
  }

  /** Paddles about the open water (a drake keeps near his hen), turning away from the banks. */
  private paddle(c: PondCreature, follow: PondCreature | null, cruise: number) {
    let sx = 0, sz = 0;
    if (follow) {
      const dx = follow.x - follow.facing * 6 - c.x, dz = follow.z + 2 - c.z;
      const d = Math.hypot(dx, dz);
      if (d > 3) { sx += (dx / d) * 0.012; sz += (dz / d) * 0.012; }
    } else if (c.goal) {
      // Heading somewhere in particular: out from the bank with the brood.
      const dx = c.goal.x - c.x, dz = c.goal.z - c.z;
      const d = Math.hypot(dx, dz);
      if (d < 3) c.goal = null;
      else { sx += (dx / d) * 0.012; sz += (dz / d) * 0.012; c.heading = Math.atan2(dz, dx); }
    } else {
      c.heading += rand(-0.08, 0.08);
      // Hungry: drifting over toward the nearest duckweed.
      if (c.hungry && (this.tick + c.id) % 60 === 0) {
        let best: DuckweedPatch | null = null, bestD = 250;
        for (const p of this.patches) {
          const d = Math.hypot(p.x - c.x, p.z - c.z);
          if (p.count > 10 && d < bestD) { bestD = d; best = p; }
        }
        if (best) c.heading = Math.atan2(best.z - c.z, best.x - c.x);
      }
      sx += Math.cos(c.heading) * 0.008;
      sz += Math.sin(c.heading) * 0.005;
    }
    const ahead = { x: c.x + Math.cos(c.heading) * 14, z: c.z + Math.sin(c.heading) * 10 };
    if (!c.goal && !this.isWater(ahead.x, ahead.z)) c.heading += 0.15;
    // Big birds steer clear of the hero text.
    const away = this.awayFromZones(c.x, c.z, 20);
    sx += away.x * 0.02; sz += away.z * 0.02;
    c.vx = (c.vx + sx) * 0.96;
    c.vz = (c.vz + sz) * 0.96;
    const speed = Math.hypot(c.vx, c.vz);
    if (speed > cruise) { c.vx *= cruise / speed; c.vz *= cruise / speed; }
    const nx = c.x + c.vx, nz = c.z + c.vz;
    if (this.isWater(nx, nz)) { c.x = nx; c.z = nz; } else { c.vx *= -0.5; c.vz *= -0.5; c.heading += Math.PI * 0.7; c.goal = null; }
    if (Math.abs(c.vx) > 0.02) this.turn(c, c.vx);
  }

  /** Faces the way it is going, but not again for a moment, so it doesn't flicker. */
  private turn(c: PondCreature, vx: number) {
    const want = vx > 0 ? 1 : -1;
    if (want !== c.facing && (this.tick + c.id) % 12 === 0) c.facing = want;
  }

  /** A push away from the hero's clear zones, for anything within `margin` of one. */
  private awayFromZones(x: number, z: number, margin: number) {
    let ax = 0, az = 0;
    for (const r of this.clearZones) {
      const dx = x < r.x0 ? x - r.x0 : x > r.x1 ? x - r.x1 : 0;
      const dz = z < r.z0 ? z - r.z0 : z > r.z1 ? z - r.z1 : 0;
      const d = Math.hypot(dx, dz);
      if (d >= margin) continue;
      if (d === 0) { ax += x < (r.x0 + r.x1) / 2 ? -1 : 1; continue; }
      ax += (dx / d) * (1 - d / margin);
      az += (dz / d) * (1 - d / margin);
    }
    return { x: ax, z: az };
  }

  /** Tail up, head under: nibbling duckweed, and snapping up a tadpole if one is close. */
  private dabble(c: PondCreature) {
    if ((this.tick + c.id) % 10) return;
    let ate = 0;
    for (const f of this.fronds) {
      if (ate >= 2 || !f.alive || Math.abs(f.x - c.x) > 5 || Math.abs(f.z - c.z) > 3) continue;
      f.alive = false;
      ate++;
    }
    if (ate) c.energy = Math.min(1, c.energy + 0.004 * ate);
    // Grubbing about for weed, seeds and larvae, wherever it can reach the bottom (or near it).
    c.energy = Math.min(1, c.energy + 0.0012);
    const i = this.cellAt(c.x, this.bedRow(c.x, c.z));
    if (this.depthAt(c.x, c.z) < 12 && this.algae[i] >= ALGAE_PER_UNIT) { this.algae[i] -= ALGAE_PER_UNIT; c.energy = Math.min(1, c.energy + 0.002); }
    this.near(c.x, c.z, 6, o => {
      if (o.alive && o.species === 'tadpole' && Math.hypot(o.x - c.x, o.z - c.z) < 6 && Math.random() < 0.25) {
        this.die(o, 'eaten');
        this.logEvent('eaten', o, c, `${c.name.replace(/ #\d+$/, '')} snapped up a tadpole`);
        c.energy = Math.min(1, c.energy + 0.03);
      }
    });
  }

  /** A run across the water, wings beating, then up into the air. */
  private startTakeOff(c: PondCreature, goal: { x: number; z: number }) {
    c.mood = 'takingOff';
    c.goal = goal;
    c.timer = 40;
    c.heading = Math.atan2(goal.z - c.z, goal.x - c.x);
    c.facing = goal.x > c.x ? 1 : -1;
  }

  private duckTakeOff(c: PondCreature) {
    const t = 40 - c.timer--;
    const speed = Math.min(0.9, 0.15 + t * 0.03);
    c.vx = Math.cos(c.heading) * speed;
    c.vz = Math.sin(c.heading) * speed * 0.6;
    c.x += c.vx; c.z += c.vz;
    // Pattering across the surface, then lifting off.
    if (t < 26) {
      c.layer = 'surface';
      if (t % 4 === 0 && this.isWater(c.x, c.z)) { this.splash(c.x - c.facing * 4, c.z, 3); this.ring(c.x, c.z, 1, 0.25, 30); }
    } else {
      c.layer = 'air';
      c.h += 0.9;
    }
    if (c.timer <= 0) { c.mood = 'flying'; c.layer = 'air'; }
  }

  /** Flying to its goal, high over the pond, then gliding down to splash-land and skid to a stop. */
  private duckFly(c: PondCreature) {
    const g = c.goal ?? { x: c.x, z: c.z };
    c.layer = 'air';
    const dx = g.x - c.x, dz = g.z - c.z;
    const d = Math.hypot(dx, dz);
    if (c.mood === 'flying') {
      const speed = 1.1;
      c.vx = (dx / (d || 1)) * speed;
      c.vz = (dz / (d || 1)) * speed;
      c.h += (FLIGHT_H - c.h) * 0.04;
      if (d < 50) c.mood = 'landing';
    } else {
      // Gliding in: down in step with the distance left, wings set.
      c.vx = (dx / (d || 1)) * Math.max(0.35, Math.min(1, d / 30));
      c.vz = (dz / (d || 1)) * Math.max(0.35, Math.min(1, d / 30));
      c.h = Math.max(0, Math.min(c.h, d * 0.8));
    }
    c.x += c.vx; c.z += c.vz;
    // Gone over the edge of the page.
    if (this.leaving.has(c.id) && (c.x < -30 || c.x > this.w + 30)) { c.alive = false; this.leaving.delete(c.id); return; }
    if (this.leaving.has(c.id)) { c.mood = 'flying'; c.h = Math.max(c.h, FLIGHT_H * 0.8); }
    if (Math.abs(c.vx) > 0.05) c.facing = c.vx > 0 ? 1 : -1;
    if (c.mood === 'landing' && (c.h <= 0.3 || d < 1)) {
      // Touchdown: a skid, a long splash, a ring.
      c.h = 0;
      c.layer = 'surface';
      c.mood = 'paddling';
      c.timer = randInt(60, 200);
      c.vx *= 0.6; c.vz *= 0.6;
      c.squashV -= 0.5;
      this.splash(c.x, c.z, 12);
      this.ring(c.x, c.z, 2, 0.35, 70);
      c.goal = null;
      if (!this.isWater(c.x, c.z)) { const row = Math.round(c.z); c.x = (this.shoreL[row] + this.shoreR[row]) / 2; }
    }
  }

  private readyToNest(c: PondCreature) {
    if (c.breedCooldown > 0 || c.age < POND_SPECIES.mallard.mature || c.energy < 0.6 || !c.mate?.alive) return false;
    if (this.nests.some(n => n.alive) || this.hasDucklings(c)) return false;
    return this.counts().mallard < this.cap('mallard');
  }

  /** Off to the bank to make a nest: swims to the shore, then waddles up it. */
  private goNest(c: PondCreature) {
    const side: 1 | -1 = c.x < this.w / 2 ? 1 : -1;
    let z = c.z;
    for (let tries = 0; tries < 10 && this.isClear(this.offShore(z, side, -6), z); tries++) z += 40;
    c.goal = { x: this.offShore(z, side, -6), z };
    c.mood = 'walking';
    c.timer = 1200;
  }

  /** Paddling to the shore, then up onto the bank to the nest site. */
  private duckWalk(c: PondCreature) {
    const g = c.goal!;
    const dx = g.x - c.x, dz = g.z - c.z;
    const d = Math.hypot(dx, dz);
    const onLand = !this.isWater(c.x, c.z);
    c.layer = onLand ? 'air' : 'surface';
    c.h = 0;
    const speed = onLand ? 0.08 : 0.15;
    c.vx = (dx / (d || 1)) * speed; c.vz = (dz / (d || 1)) * speed;
    c.x += c.vx; c.z += c.vz;
    if (Math.abs(c.vx) > 0.02) c.facing = c.vx > 0 ? 1 : -1;
    if (d < 1.5 || --c.timer <= 0) {
      this.nests.push({ x: c.x, z: c.z, eggs: randInt(CLUTCH[0], CLUTCH[1]), hen: c, timer: NEST_TICKS, alive: true });
      c.mood = 'nesting';
      c.vx = c.vz = 0;
      this.logEvent('nest', c, null, `${c.name.replace(/ #\d+$/, '')} is sitting on a nest of eggs`);
    }
  }

  /** On the nest, now and then shuffling the eggs; when they hatch, back to the water with the brood. */
  private duckNesting(c: PondCreature) {
    const nest = this.nests.find(n => n.alive && n.hen === c);
    c.layer = 'air';
    c.h = 1;
    if (!nest) { c.mood = 'paddling'; return; }
    c.x = nest.x; c.z = nest.z;
    if (--nest.timer > 0) return;
    nest.alive = false;
    let leader: PondCreature = c;
    for (let k = 0; k < nest.eggs; k++) {
      const d = this.spawn('mallard', c);
      d.x = nest.x + rand(-2, 2); d.z = nest.z + rand(-1, 1);
      d.layer = 'air'; d.mood = 'following'; d.leader = leader; d.lineId = c.lineId;
      d.palette = 0;
      leader = d;
      this.births++;
    }
    this.logEvent('hatch', c, null, `${c.name.replace(/ #\d+$/, '')}'s ducklings hatched`);
    c.breedCooldown = DUCK_BREED_COOLDOWN;
    // Back down the bank and into the water, the ducklings in a line behind.
    const side = c.x < this.w / 2 ? 1 : -1;
    c.goal = { x: this.offShore(c.z, side, 14), z: c.z + 6 };
    c.mood = 'paddling';
    c.layer = 'surface';
    c.timer = 400;
    c.heading = side > 0 ? 0 : Math.PI;
    c.x = this.offShore(c.z, side, 2);
  }

  /** A duckling follows the one ahead of it, keeping a little gap: a line behind its mother. */
  private duckling(c: PondCreature) {
    const lead = c.leader!;
    c.mood = 'following';
    const back = lead.facing;
    const tx = lead.x - back * DUCKLING_GAP, tz = lead.z + 0.4;
    const dx = tx - c.x, dz = tz - c.z;
    const d = Math.hypot(dx, dz);
    const speed = Math.min(0.5, d * 0.08);
    c.vx = (dx / (d || 1)) * speed; c.vz = (dz / (d || 1)) * speed;
    c.x += c.vx; c.z += c.vz;
    c.layer = this.isWater(c.x, c.z) ? 'surface' : 'air';
    c.h = 0;
    if (Math.abs(c.vx) > 0.02) c.facing = c.vx > 0 ? 1 : -1;
    // A little dabble of its own now and then.
    if ((this.tick + c.id * 13) % 400 === 0) c.squashV += 0.3;
    c.energy = Math.min(1, c.energy + 0.00006);
  }

  /** A tufted duck dives clean under, swims about the bed, and pops back up. */
  private startDive(c: PondCreature) {
    c.mood = 'diving';
    c.layer = 'under';
    c.timer = randInt(100, 180);
    c.vh = -0.4;
    c.squashV += 0.4;
    this.ring(c.x, c.z, 1, 0.3, 50);
  }

  private duckDive(c: PondCreature) {
    const depth = this.depthAt(c.x, c.z);
    c.layer = 'under';
    c.heading += rand(-0.1, 0.1);
    c.vx = (c.vx + Math.cos(c.heading) * 0.01) * 0.95;
    c.vz = (c.vz + Math.sin(c.heading) * 0.008) * 0.95;
    const want = c.timer > 20 ? -(depth - 2) : 0;
    c.vh = (c.vh + (want - c.h) * 0.02) * 0.9;
    this.swimMove(c, depth);
    if (Math.abs(c.vx) > 0.02) c.facing = c.vx > 0 ? 1 : -1;
    this.near(c.x, c.z, 5, o => {
      if (o.alive && o.species === 'tadpole' && Math.random() < 0.1 && Math.hypot(o.x - c.x, o.z - c.z) < 5) { this.die(o, 'eaten'); c.energy = Math.min(1, c.energy + 0.03); }
    });
    // Snails and larvae picked off the bottom.
    if (c.h < -(depth - 3)) c.energy = Math.min(1, c.energy + 0.0008);
    if (--c.timer <= 0 && c.h > -1.5) {
      // Bob: back up, shaking off the water.
      c.mood = 'paddling';
      c.layer = 'surface';
      c.h = 0;
      c.timer = randInt(80, 200);
      c.squashV -= 0.4;
      this.ring(c.x, c.z, 1, 0.3, 50);
      this.splash(c.x, c.z, 4);
    }
  }

  // --- fish ---------------------------------------------------------------------

  /** How deep below the surface a fish likes to swim here (a fraction of the depth, by species). */
  private fishDepth(c: PondCreature) {
    const depth = this.depthAt(c.x, c.z);
    switch (c.species) {
      case 'catfish': return Math.max(1, depth - 1.5);
      case 'koi': return Math.min(depth - 1, 3 + (c.id % 3) * 2);
      case 'pike': return Math.max(1, depth * 0.6);
      default: return Math.min(depth - 1, 2 + (c.id % 5) * 1.6);
    }
  }

  /**
   * Minnows school and dart from the pike; koi cruise slowly and now and then
   * rise to sip an insect from the surface; the catfish roots along the bed,
   * stirring up silt. All of them nip at tadpoles.
   */
  private thinkFish(c: PondCreature) {
    const sp = POND_SPECIES[c.species];
    c.layer = 'under';
    const depth = this.depthAt(c.x, c.z);
    let sx = 0, sz = 0;
    let max = sp.cruise;
    c.heading += rand(-0.1, 0.1) * (c.species === 'minnow' ? 1.5 : 1);
    let want = -this.fishDepth(c);
    if (c.species === 'minnow') {
      // A school: keep near the others, line up with them, but not on top of them.
      let n = 0, cx = 0, cz = 0, ax = 0, az = 0;
      let threat: PondCreature | null = null;
      this.near(c.x, c.z, 16, o => {
        if (o === c) return;
        const d = Math.hypot(o.x - c.x, o.z - c.z);
        if (o.species === 'pike' && d < 20 && o.mood !== 'resting') threat = o;
        if (o.species !== 'minnow' || d > 12) return;
        n++; cx += o.x; cz += o.z; ax += o.vx; az += o.vz;
        if (d < 3 && d > 0) { sx -= (o.x - c.x) / d * 0.03; sz -= (o.z - c.z) / d * 0.03; }
      });
      if (n) {
        sx += (cx / n - c.x) * 0.003 + (ax / n) * 0.05;
        sz += (cz / n - c.z) * 0.003 + (az / n) * 0.05;
        c.mood = 'schooling';
      } else c.mood = 'cruising';
      const t = threat as PondCreature | null;
      if (t) {
        // Scatter: away from the pike, flat out.
        const d = Math.hypot(c.x - t.x, c.z - t.z) || 1;
        sx += (c.x - t.x) / d * 0.08; sz += (c.z - t.z) / d * 0.08;
        max = sp.burst;
        c.mood = 'fleeing';
      }
    }
    // In a hatch, fish rise to the spent mayflies lying on the water.
    if ((c.species === 'minnow' || c.species === 'koi') && this.happening?.kind === 'hatch' && (this.tick + c.id) % 15 === 0) {
      for (const m of this.midges) {
        if (!m.alive || !m.spent || Math.abs(m.x - c.x) > 18 || Math.abs(m.z - c.z) > 12) continue;
        c.heading = Math.atan2(m.z - c.z, m.x - c.x);
        if (Math.hypot(m.x - c.x, m.z - c.z) < 4) {
          m.alive = false;
          this.ring(m.x, m.z, 1, 0.25, 45);
          this.splash(m.x, m.z, 2);
          c.energy = Math.min(1, c.energy + 0.04);
        } else if (c.species === 'koi') c.mood = 'rising';
        else c.h = Math.min(-0.8, c.h + 0.6);
        break;
      }
    }
    if (c.species === 'koi') {
      // Rising for an insect: up to the surface, a sip, a ring.
      if (c.mood === 'rising') {
        want = -0.8;
        if (c.h > -1.3) {
          this.ring(c.x + c.facing * 9, c.z, 1, 0.25, 50);
          const m = this.nearestMidgeAt(c.x, c.z, 14);
          if (m) { m.alive = false; this.meals++; }
          c.energy = Math.min(1, c.energy + 0.05);
          c.mood = 'cruising';
          c.timer = randInt(300, 900);
        }
      } else if (--c.timer <= 0 && (c.hungry || Math.random() < 0.5)) c.mood = 'rising';
      else c.mood = 'cruising';
    } else if (c.species === 'catfish') {
      c.mood = 'rooting';
      // Rooting along the bottom stirs up clouds of silt.
      if ((this.tick + c.id) % 14 === 0 && Math.hypot(c.vx, c.vz) > 0.03) this.stirSilt(c.x - c.facing * 6, c.z, -depth + 0.5);
      const i = this.cellAt(c.x, this.bedRow(c.x, c.z));
      if ((this.tick + c.id) % 20 === 0 && this.algae[i] >= ALGAE_PER_UNIT) { this.algae[i] -= ALGAE_PER_UNIT; this.nutrients[i] = Math.min(255, this.nutrients[i] + 1); }
    }
    // Tiny things in the water keep them going; tadpoles are a treat.
    c.energy = Math.min(1, c.energy + sp.metabolism * 0.9);
    if ((this.tick + c.id) % 20 === 0) {
      this.near(c.x, c.z, 6, o => {
        if (!o.alive || o.species !== 'tadpole' || Math.hypot(o.x - c.x, o.z - c.z) > 6) return;
        const chance = c.species === 'minnow' ? 0.04 : c.species === 'koi' ? 0.15 : 0.1;
        if (Math.random() < chance) {
          this.die(o, 'eaten');
          c.energy = Math.min(1, c.energy + 0.05);
        }
      });
    }
    sx += Math.cos(c.heading) * 0.01;
    sz += Math.sin(c.heading) * 0.007;
    // Turn back from the shallows and the banks.
    const ahead = { x: c.x + Math.cos(c.heading) * 10, z: c.z + Math.sin(c.heading) * 8 };
    if (!this.isWater(ahead.x, ahead.z) || this.depthAt(ahead.x, ahead.z) < (c.species === 'minnow' ? 3 : 6)) c.heading += 0.25;
    // Big, bright koi keep out from behind the hero text.
    if (c.species === 'koi') { const away = this.awayFromZones(c.x, c.z, 16); sx += away.x * 0.02; sz += away.z * 0.02; }
    c.vx = (c.vx + sx) * 0.95;
    c.vz = (c.vz + sz) * 0.95;
    c.vh = (c.vh + (want - c.h) * 0.01) * 0.9;
    const speed = Math.hypot(c.vx, c.vz);
    if (speed > max) { c.vx *= max / speed; c.vz *= max / speed; }
    this.fishMove(c, depth);
    this.breedFish(c);
  }

  /** Moves a fish, keeping it in the water between the bed and the surface. */
  private fishMove(c: PondCreature, depth: number) {
    const nx = c.x + c.vx, nz = c.z + c.vz;
    if (this.isWater(nx, nz) && this.depthAt(nx, nz) > 1.5) { c.x = nx; c.z = nz; } else { c.vx = -c.vx * 0.5; c.vz = -c.vz * 0.5; c.heading += Math.PI * 0.8; }
    c.h = Math.max(-Math.max(1, depth - 0.8), Math.min(-0.6, c.h + c.vh));
    if (Math.abs(c.vx) > 0.04) this.turn(c, c.vx);
  }

  /** Fish spawn when there is room: minnows a few fry at a time, the big fish rarely. */
  private breedFish(c: PondCreature) {
    const sp = POND_SPECIES[c.species];
    if (c.age < sp.mature || c.breedCooldown > 0 || c.energy < 0.8 || (this.tick + c.id) % 300) return;
    if (this.counts()[c.species] >= this.cap(c.species)) return;
    const n = c.species === 'minnow' ? randInt(2, 4) : 1;
    for (let k = 0; k < n; k++) { const f = this.spawn(c.species, c); f.lineId = c.lineId; this.births++; }
    c.breedCooldown = c.species === 'minnow' ? 2400 : 20000;
    c.energy -= 0.3;
  }

  /**
   * The pike lies in wait in the weeds, barely moving, its fins just
   * stirring; when something swims close in front of it, it strikes in a
   * burst, and swallows. Fed, it rests, and after a while it moves on to
   * another weed bed.
   */
  private thinkPike(c: PondCreature) {
    const sp = POND_SPECIES.pike;
    c.layer = 'under';
    const depth = this.depthAt(c.x, c.z);
    if (c.mood === 'striking') {
      const prey = c.prey;
      c.timer--;
      if (prey?.alive) {
        const dx = prey.x - c.x, dz = prey.z - c.z, dh = prey.h - c.h;
        const d = Math.hypot(dx, dz, dh) || 1;
        c.vx = dx / d * sp.burst; c.vz = dz / d * sp.burst; c.vh = dh / d * sp.burst * 0.8;
        c.x += c.vx; c.z += c.vz; c.h = Math.min(-0.5, c.h + c.vh);
        c.facing = c.vx > 0 ? 1 : -1;
        if (d < 4) {
          // Snap.
          this.die(prey, 'eaten');
          this.logEvent('eaten', prey, c);
          if (prey.layer === 'surface') { this.splash(prey.x, prey.z, 6); this.ring(prey.x, prey.z, 1, 0.3, 50); }
          c.energy = Math.min(1, c.energy + (prey.species === 'tadpole' ? 0.08 : 0.35));
          c.squashV -= 0.4;
          c.prey = null;
          c.mood = 'resting';
          c.timer = c.energy > 0.9 ? PIKE_REST : 120;
          return;
        }
      }
      if (c.timer <= 0 || !prey?.alive) { c.prey = null; c.mood = 'lurking'; c.timer = randInt(200, 500); }
      return;
    }
    // Lurking (or resting): holding still in the weeds, drifting back to its spot.
    const bed = this.pikeHome.get(c.id) ?? this.nearestWeedBed(c.x, c.z);
    c.vx *= 0.9; c.vz *= 0.9;
    if (bed) {
      const dx = bed.x - c.x, dz = bed.z - c.z;
      const d = Math.hypot(dx, dz);
      if (d > Math.max(bed.rx, 4)) { c.vx += dx / d * 0.01; c.vz += dz / d * 0.01; }
    }
    c.vh = (c.vh + (-Math.max(1.5, depth * 0.55) - c.h) * 0.01) * 0.9;
    this.fishMove(c, depth);
    if (c.mood === 'resting') { if (--c.timer <= 0) c.mood = 'lurking'; return; }
    c.mood = 'lurking';
    // Something tasty close in front: strike.
    if ((this.tick + c.id) % 5 === 0 && (c.hungry || Math.random() < 0.2)) {
      let best: PondCreature | null = null, bestD = STRIKE_REACH;
      this.near(c.x, c.z, STRIKE_REACH, o => {
        const taste = PIKE_PREY[o.species];
        if (!o.alive || !taste || o === c) return;
        // Only what is in the water or sitting on it; ducklings, not grown ducks.
        if (o.layer === 'air' || o.layer === 'bed' || (o.species === 'mallard' && o.age > POND_SPECIES.mallard.mature * 0.5)) return;
        if ((o.x - c.x) * c.facing < -4) return;
        const d = Math.hypot(o.x - c.x, o.z - c.z, (o.h - c.h) * 0.5);
        if (d < bestD && Math.random() < taste) { bestD = d; best = o; }
      });
      if (best) { c.prey = best; c.mood = 'striking'; c.timer = STRIKE_TICKS; c.squashV += 0.6; return; }
    }
    // Restless after a long wait: off to another weed bed.
    if (--c.timer <= 0) {
      c.timer = randInt(1200, 3000);
      const beds = this.weedBeds;
      if (beds.length > 1 && Math.random() < 0.4) {
        const next = beds[randInt(0, beds.length - 1)];
        c.x += (next.x - c.x) * 0.02; c.z += (next.z - c.z) * 0.02;
        c.heading = Math.atan2(next.z - c.z, next.x - c.x);
        this.pikeHome.set(c.id, next);
      }
    }
    // Facing out of the weeds, fins stirring.
    if ((this.tick + c.id * 7) % 200 === 0) c.facing = c.facing > 0 ? -1 : 1;
  }
  private pikeHome = new Map<number, WeedBed>();

  private nearestWeedBed(x: number, z: number) {
    let best: WeedBed | null = null, bestD = Infinity;
    for (const b of this.weedBeds) {
      const d = Math.hypot(b.x - x, b.z - z);
      if (d < bestD) { bestD = d; best = b; }
    }
    return best;
  }

  /** A puff of silt off the bed, drifting and settling. */
  stirSilt(x: number, z: number, h: number) {
    if (this.silt.length > 300) return;
    for (let k = 0; k < 3; k++) {
      const life = randInt(60, 140);
      this.silt.push({ x: x + rand(-2, 2), z: z + rand(-1, 1), h: h + rand(0, 1.5), vx: rand(-0.04, 0.04), life, maxLife: life, alive: true });
    }
  }

  private updateSilt() {
    for (const p of this.silt) {
      p.x += p.vx; p.h += 0.01;
      if (--p.life <= 0) p.alive = false;
    }
  }

  private nearestMidgeAt(x: number, z: number, reach: number) {
    let best: Midge | null = null, bestD = reach;
    for (const m of this.midges) {
      const d = Math.hypot(m.x - x, m.z - z);
      if (m.alive && d < bestD) { bestD = d; best = m; }
    }
    return best;
  }

  // --- insects, snails, the turtle and the heron ----------------------------------

  /**
   * A dragonfly hovers, wings a blur, then darts off in a straight line to
   * hover somewhere else, snapping up midges on the way.
   */
  private thinkDragonfly(c: PondCreature) {
    c.layer = 'air';
    if (c.mood === 'darting') {
      if (c.timer === 0 || !c.goal) {
        const swarm = this.swarms.length ? this.swarms[randInt(0, this.swarms.length - 1)] : null;
        const near = swarm && Math.hypot(swarm.x - c.x, swarm.z - c.z) < 150;
        c.goal = near ? { x: swarm!.x + rand(-10, 10), z: swarm!.z + rand(-8, 8) } : { x: c.x + rand(-50, 50), z: c.z + rand(-40, 40) };
        c.goal.x = Math.max(4, Math.min(this.w - 4, c.goal.x));
        c.goal.z = Math.max(4, Math.min(this.h - 4, c.goal.z));
        c.cruise = rand(8, 22);
        c.timer = 1;
      }
      const dx = c.goal.x - c.x, dz = c.goal.z - c.z;
      const d = Math.hypot(dx, dz);
      const speed = Math.min(POND_SPECIES.dragonfly.burst, d * 0.25);
      c.vx = dx / (d || 1) * speed; c.vz = dz / (d || 1) * speed;
      c.x += c.vx; c.z += c.vz;
      c.h += (c.cruise - c.h) * 0.1;
      if (Math.abs(c.vx) > 0.1) c.facing = c.vx > 0 ? 1 : -1;
      for (const m of this.midges) {
        if (m.alive && Math.abs(m.x - c.x) < 3 && Math.abs(m.z - c.z) < 3) { m.alive = false; c.energy = Math.min(1, c.energy + 0.08); }
      }
      if (d < 1) { c.mood = 'hovering'; c.timer = randInt(30, 120); c.vx = c.vz = 0; }
      return;
    }
    c.mood = 'hovering';
    // Hovering: holding station with a little jitter.
    c.x += rand(-0.08, 0.08); c.z += rand(-0.05, 0.05); c.h += Math.sin(this.tick * 0.2 + c.id) * 0.05;
    c.energy = Math.min(1, c.energy + 0.00008);
    if (--c.timer <= 0) { c.mood = 'darting'; c.timer = 0; c.goal = null; }
  }

  /** A water strider skates in jerks across the calm water, its feet dimpling the surface. */
  private thinkStrider(c: PondCreature) {
    c.layer = 'surface';
    c.h = 0;
    if (--c.timer <= 0) {
      c.timer = randInt(20, 60);
      let a = rand(0, Math.PI * 2);
      // Keep near the shore and the pads, out of the open water.
      if (this.depthAt(c.x, c.z) > MAX_DEPTH * 0.6) a = Math.atan2(0, c.x < this.w / 2 ? -1 : 1);
      const kick = rand(0.25, 0.5);
      c.vx += Math.cos(a) * kick; c.vz += Math.sin(a) * kick * 0.6;
      if (Math.abs(c.vx) > 0.05) c.facing = c.vx > 0 ? 1 : -1;
    }
    // Fleeing from anything big.
    if (this.threatened(c)) { c.vx += rand(-0.3, 0.3); c.vz += rand(-0.2, 0.2); }
    c.vx *= 0.92; c.vz *= 0.92;
    const nx = c.x + c.vx, nz = c.z + c.vz;
    if (this.isWater(nx, nz)) { c.x = nx; c.z = nz; } else { c.vx = -c.vx; c.vz = -c.vz; }
    c.energy = Math.min(1, c.energy + 0.00009);
    if (c.age > POND_SPECIES.strider.mature && c.energy > 0.8 && (this.tick + c.id) % 900 === 0 && this.counts().strider < this.cap('strider')) {
      this.spawn('strider', c); this.births++;
    }
  }

  /** On a reed stem in the water, or on the bed: creeping, grazing algae. */
  private placeSnail(c: PondCreature) {
    const stems: Stem[] = [];
    for (const cl of this.clumps) for (const st of cl.stems) if (this.isWater(st.x, st.z) && this.depthAt(st.x, st.z) > 2) stems.push(st);
    if (stems.length && Math.random() < 0.7) {
      const st = stems[randInt(0, stems.length - 1)];
      c.x = st.x; c.z = st.z + 0.1;
      c.goal = { x: st.x, z: st.z };
      c.h = -rand(0.8, Math.max(1, this.depthAt(st.x, st.z) - 0.5));
      c.layer = 'under';
    } else {
      c.goal = null;
      c.h = -Math.max(1, this.depthAt(c.x, c.z) - 0.3);
      c.layer = 'bed';
    }
    c.vh = rand(0.004, 0.01) * (Math.random() < 0.5 ? 1 : -1);
  }

  private thinkSnail(c: PondCreature) {
    const depth = this.depthAt(c.x, c.z);
    if (c.goal) {
      // Up and down its stem.
      c.h += c.vh;
      if (c.h > -0.6 || c.h < -(depth - 0.5)) c.vh = -c.vh;
    } else {
      c.heading += rand(-0.05, 0.05);
      const nx = c.x + Math.cos(c.heading) * 0.012, nz = c.z + Math.sin(c.heading) * 0.008;
      if (this.isWater(nx, nz)) { c.x = nx; c.z = nz; } else c.heading += Math.PI;
      c.h = -Math.max(1, this.depthAt(c.x, c.z) - 0.3);
      const i = this.cellAt(c.x, this.bedRow(c.x, c.z));
      if ((this.tick + c.id) % 60 === 0 && this.algae[i] >= ALGAE_PER_UNIT) { this.algae[i] -= ALGAE_PER_UNIT; c.energy = Math.min(1, c.energy + 0.02); }
    }
    c.energy = Math.min(1, c.energy + 0.00003);
    if (c.age > POND_SPECIES.snail.mature && (this.tick + c.id) % 3000 === 0 && this.counts().snail < this.cap('snail')) {
      const k = this.spawn('snail', c); k.x = c.x; k.z = c.z; this.placeSnail(k); this.births++;
    }
  }

  /**
   * The turtle basks on its log, head out to the sun. Startled, or warm
   * enough, it slides into the water, swims about below, then climbs back.
   */
  private thinkTurtle(c: PondCreature) {
    if (c.leap) { this.stepLeap(c); if (!c.leap && c.perch) { c.mood = 'basking'; c.timer = randInt(1500, 3500); } return; }
    if (c.perch) {
      const at = this.perchPoint(c.perch);
      c.x = at.x; c.z = at.z; c.h = at.h;
      c.layer = 'air';
      c.mood = 'basking';
      // Warming up in the sun.
      c.energy = Math.min(1, c.energy + 0.00004);
      if (this.threatened(c) || --c.timer <= 0) {
        // Plop: off the log and under.
        const side = c.perch.kind === 'log' ? -c.perch.log.side : 1;
        this.leapTo(c, c.x + side * 8, c.z + 2, null, 0.3);
      }
      return;
    }
    c.layer = 'under';
    const depth = this.depthAt(c.x, c.z);
    const log = this.logs.find(l => l.floating);
    if (--c.timer <= 0 && log) {
      // Back to the log, and up onto it.
      const perch: Perch = { kind: 'log', log, ox: rand(-0.2, 0.2) * log.len };
      const p = this.perchPoint(perch);
      c.mood = 'swimming';
      if (Math.hypot(p.x - c.x, p.z - c.z) < 6) { this.leapTo(c, p.x, p.z, perch, 0.25); return; }
      this.swimToward(c, p.x, p.z, -1.5);
      return;
    }
    c.mood = 'swimming';
    // Browsing pondweed and the odd tadpole as it goes.
    c.energy = Math.min(1, c.energy + 0.00004);
    c.heading += rand(-0.05, 0.05);
    const ahead = { x: c.x + Math.cos(c.heading) * 12, z: c.z + Math.sin(c.heading) * 10 };
    if (!this.isWater(ahead.x, ahead.z)) c.heading += 0.3;
    c.vx = (c.vx + Math.cos(c.heading) * 0.004) * 0.97;
    c.vz = (c.vz + Math.sin(c.heading) * 0.003) * 0.97;
    c.vh = (c.vh + (-Math.min(depth - 1.5, 5) - c.h) * 0.01) * 0.9;
    this.swimMove(c, depth);
    if (Math.abs(c.vx) > 0.01) c.facing = c.vx > 0 ? 1 : -1;
    if (c.timer > 2400) c.timer = randInt(600, 1200);
  }

  /**
   * Now and then a heron passes high over the pond (only its shadow sweeps
   * across the water), or comes down to fish in the shallows.
   */
  private updateHeron() {
    const hp = this.heronPass;
    if (hp) {
      hp.x += hp.dir * 2.4;
      if (hp.x < -60 || hp.x > this.w + 60) this.heronPass = null;
    }
    if (this.tick < this.nextHeron) return;
    this.nextHeron = this.tick + randInt(HERON_GAP[0], HERON_GAP[1]);
    if (this.creatures.some(c => c.species === 'heron')) return;
    if (Math.random() < 0.6) this.heronOver();
    else this.heronLands();
  }

  heronOver() {
    const dir: 1 | -1 = Math.random() < 0.5 ? 1 : -1;
    this.heronPass = { x: dir > 0 ? -50 : this.w + 50, z: rand(this.viewZ.z0 + 30, Math.max(this.viewZ.z0 + 31, this.viewZ.z1 - 30)), dir };
  }

  /** A heron flies in to stand in the shallows near where the visitor is looking. */
  heronLands(near?: { x: number; z: number }) {
    if (this.creatures.some(c => c.species === 'heron')) return;
    let spot: { x: number; z: number } | null = null;
    for (let tries = 0; tries < 30 && !spot; tries++) {
      const z = near ? near.z + rand(-20, 20) : rand(this.viewZ.z0 + 20, Math.max(this.viewZ.z0 + 21, this.viewZ.z1 - 20));
      const side: 1 | -1 = near ? (near.x < this.w / 2 ? 1 : -1) : Math.random() < 0.5 ? 1 : -1;
      const x = this.offShore(z, side, rand(3, 8));
      if (this.isWater(x, z) && this.depthAt(x, z) < 6 && !this.isClear(x, z)) spot = { x, z };
    }
    if (!spot) return;
    const c = this.spawn('heron');
    c.goal = spot;
    c.x = spot.x + (spot.x < this.w / 2 ? -1 : 1) * 160;
    c.z = spot.z - 60;
    c.h = 50;
    c.mood = 'flying';
    c.layer = 'air';
    c.timer = randInt(HERON_STAY[0], HERON_STAY[1]);
    this.logEvent('visit', c, null, 'A grey heron came down to fish');
  }

  /** In the shallows: slow, deliberate steps, long stillness, and a lightning strike. */
  private thinkHeron(c: PondCreature) {
    if (c.mood === 'flying' || c.mood === 'landing' || c.mood === 'leaving') {
      const g = c.goal!;
      const dx = g.x - c.x, dz = g.z - c.z;
      const d = Math.hypot(dx, dz);
      const speed = c.mood === 'leaving' ? 1.6 : Math.max(0.3, Math.min(1.4, d * 0.04));
      c.vx = dx / (d || 1) * speed; c.vz = dz / (d || 1) * speed;
      c.x += c.vx; c.z += c.vz;
      c.facing = c.vx > 0 ? 1 : -1;
      c.layer = 'air';
      if (c.mood === 'leaving') {
        c.h = Math.min(60, c.h + 0.6);
        if (c.x < -60 || c.x > this.w + 60 || c.z < -60) c.alive = false;
        return;
      }
      c.h = Math.max(0, Math.min(c.h, d * 0.5));
      if (d < 1.2) { c.mood = 'stalking'; c.h = 0; c.layer = 'surface'; this.ring(c.x, c.z, 2, 0.3, 50); this.splash(c.x, c.z, 5); }
      return;
    }
    c.layer = 'surface';
    c.h = 0;
    if (c.mood === 'striking') {
      if (--c.timer > 0) return;
      const prey = c.prey;
      if (prey?.alive && Math.random() < 0.55) {
        this.die(prey, 'eaten');
        this.logEvent('eaten', prey, c);
        c.energy = Math.min(1, c.energy + 0.3);
      }
      this.splash(c.x + c.facing * 10, c.z, 5);
      this.ring(c.x + c.facing * 10, c.z, 1, 0.3, 40);
      c.prey = null;
      c.mood = 'stalking';
      c.timer = c.cruise;
      return;
    }
    // Stalking: a slow step every so often, otherwise utterly still, watching.
    if ((this.tick + c.id) % 90 < 20) {
      const nx = c.x + c.facing * 0.06, nz = c.z + Math.sin(this.tick * 0.01) * 0.02;
      if (this.isWater(nx, nz) && this.depthAt(nx, nz) < 8) c.x = nx; else c.facing = c.facing > 0 ? -1 : 1;
      c.vx = c.facing * 0.06;
    } else c.vx = 0;
    if ((this.tick + c.id) % 10 === 0) {
      let best: PondCreature | null = null, bestD = HERON_REACH;
      this.near(c.x, c.z, HERON_REACH, o => {
        if (!o.alive || o === c || !(FISH[o.species] || o.species === 'frog' || o.species === 'tadpole') || o.species === 'pike') return;
        if (o.layer === 'air' && !o.perch) return;
        if ((o.x - c.x) * c.facing < 0) return;
        const d = Math.hypot(o.x - c.x, o.z - c.z);
        if (d < bestD) { bestD = d; best = o; }
      });
      if (best) { c.prey = best; c.cruise = c.timer; c.mood = 'striking'; c.timer = 10; return; }
    }
    if (--c.timer <= 0) {
      // Off again, with a few slow beats of those great wings.
      c.mood = 'leaving';
      c.goal = { x: c.x < this.w / 2 ? -100 : this.w + 100, z: c.z - 80 };
      this.splash(c.x, c.z, 6);
    }
  }

  // --- midges, rings and splashes ---------------------------------------------

  /** Midges dance in swarms over the reeds, each jittering about its swarm's centre. */
  private updateMidges() {
    const { swarms } = this;
    if (!swarms.length) return;
    if (this.midges.length < MAX_MIDGES && this.tick % 4 === 0) {
      const sw = randInt(0, swarms.length - 1);
      const s = swarms[sw];
      this.midges.push({ x: s.x + rand(-3, 3), z: s.z + rand(-2, 2), h: s.h + rand(-2, 2), vx: 0, vz: 0, vh: 0, swarm: sw, alive: true });
    }
    for (const m of this.midges) {
      if (m.swarm < 0) { this.stepMayfly(m); continue; }
      const s = swarms[m.swarm];
      m.vx = (m.vx + rand(-0.08, 0.08) + (s.x - m.x) * 0.004) * 0.9;
      m.vz = (m.vz + rand(-0.06, 0.06) + (s.z - m.z) * 0.004) * 0.9;
      m.vh = (m.vh + rand(-0.08, 0.08) + (s.h - m.h) * 0.006) * 0.9;
      m.x += m.vx; m.z += m.vz; m.h += m.vh;
    }
  }

  /** A mayfly rises and falls in its dance over the water; spent, it lies on the surface. */
  private stepMayfly(m: Midge) {
    m.life = (m.life ?? 600) - 1;
    if (m.spent) {
      m.h = 0;
      if (m.life < -240) m.alive = false;
      return;
    }
    if (m.life <= 0) {
      m.spent = true;
      if (this.isWater(m.x, m.z)) this.ring(m.x, m.z, 0.5, 0.15, 40); else m.alive = false;
      return;
    }
    m.vx = (m.vx + rand(-0.05, 0.05) + this.wind.x * 4) * 0.94;
    m.vz = (m.vz + rand(-0.04, 0.04)) * 0.94;
    // Up in a flutter, then a long glide down: the mayfly's dance.
    m.vh = ((this.tick + Math.round(m.x * 7)) % 90 < 25 ? 0.18 : -0.06);
    m.x += m.vx; m.z += m.vz;
    m.h = Math.max(3, Math.min(26, m.h + m.vh));
  }

  ring(x: number, z: number, r: number, speed: number, life: number) {
    if (this.rings.length < 400) this.rings.push({ x, z, r, speed, life, maxLife: life, alive: true });
  }

  private updateRings() {
    for (const r of this.rings) {
      r.r += r.speed;
      if (--r.life <= 0) r.alive = false;
    }
  }

  /** Droplets thrown up from the surface. */
  splash(x: number, z: number, count: number) {
    for (let k = 0; k < count; k++) {
      const a = rand(0, Math.PI * 2), v = rand(0.1, 0.35);
      this.droplets.push({ x, z, h: 0.5, vx: Math.cos(a) * v, vz: Math.sin(a) * v * 0.6, vh: rand(0.5, 1.1), life: 60, alive: true });
    }
  }

  private updateDroplets() {
    for (const d of this.droplets) {
      d.x += d.vx; d.z += d.vz; d.h += d.vh;
      d.vh -= 0.08;
      if (d.h <= 0 || --d.life <= 0) {
        d.alive = false;
        if (Math.random() < 0.3 && this.isWater(d.x, d.z)) this.ring(d.x, d.z, 0.5, 0.15, 24);
      }
    }
  }

  // --- the census, the visitor's creature, and debugging -------------------------------

  /** Algae cover of the water's bed, as a percentage, counted every few seconds. */
  private algaeTotal = 0;
  private algaeAt = -1;

  stats(): PondStats {
    const counts = Object.fromEntries(POND_SPECIES_LIST.map(s => [s, 0])) as Record<PondSpecies, number>;
    const stages = Object.fromEntries(FROG_STAGES.map(s => [s, 0])) as Record<FrogStage, number>;
    for (const c of this.creatures) {
      if (!c.alive) continue;
      counts[c.species]++;
      const st = this.stageOf(c);
      if (st) stages[st]++;
    }
    if (this.algaeAt < 0 || this.tick - this.algaeAt > 90) {
      let sum = 0, cells = 0;
      for (let i = 0; i < this.algae.length; i += 7) { if (this.depth[i] > 0) { sum += this.algae[i]; cells++; } }
      this.algaeTotal = cells ? Math.round((sum / cells / 255) * 100) : 0;
      this.algaeAt = this.tick;
    }
    const ev = this.happening;
    return {
      tick: this.tick, counts, stages, frogCap: this.cap('frog'), algae: this.algaeTotal,
      duckweed: this.fronds.length, midges: this.midges.length, meals: this.meals, births: this.births,
      deaths: { ...this.deaths }, happening: ev ? { kind: ev.kind, progress: ev.t / ev.dur } : null, events: this.events.slice(),
    };
  }

  adopt(c: PondCreature, name: string) {
    c.name = name;
    c.adopted = true;
  }

  /** Brings a returning visitor's creature back, grown, with a relative or two so its line can go on. */
  release(species: PondSpecies, name: string, palette: number) {
    const kind = species === 'spawn' || species === 'tadpole' ? 'frog' : species;
    const c = kind === 'mallard' ? this.spawnDuckPair() : this.spawn(kind);
    c.palette = palette % POND_SPECIES[kind].palettes;
    c.age = Math.max(c.age, POND_SPECIES[kind].mature);
    this.adopt(c, name);
    if (kind === 'frog' || kind === 'minnow' || kind === 'snail' || kind === 'strider') {
      for (let k = 0; k < 2; k++) { const r = this.spawn(kind, c); r.age = POND_SPECIES[kind].mature; r.lineId = c.lineId; }
    }
    return c;
  }

  /** The oldest living member of a creature's family, to carry on its line. */
  heirOf(c: PondCreature) {
    let heir: PondCreature | null = null;
    for (const o of this.creatures) {
      if (o.alive && o !== c && o.lineId === c.lineId && (!heir || o.age > heir.age)) heir = o;
    }
    return heir;
  }

  /** Spawns a creature (or a frog at a stage of its life) at a point, for the debug panel. */
  debugSpawn(kind: PondSpawnable, x: number, z: number) {
    const row = Math.max(0, Math.min(this.h - 1, Math.round(z)));
    // Somewhere sensible near the point: in the water, or for some, on its edge.
    const wx = this.isWater(x, z) ? x : (this.shoreL[row] + this.shoreR[row]) / 2;
    const place = (c: PondCreature) => { c.x = wx + rand(-3, 3); c.z = z + rand(-2, 2); };
    switch (kind) {
      case 'spawn': case 'tadpole': case 'backLegs': case 'fourLegs': {
        const species = kind === 'spawn' ? 'spawn' : 'tadpole';
        const site = this.layingSite(x, z);
        const c = this.spawn(species);
        c.x = site.x; c.z = site.z;
        c.age = kind === 'spawn' ? 0 : kind === 'tadpole' ? 0 : kind === 'backLegs' ? TADPOLE_TICKS * 0.45 : TADPOLE_TICKS * 0.8;
        if (species === 'tadpole') for (let k = 0; k < 4; k++) { const t = this.spawn('tadpole', c); t.age = c.age; }
        return;
      }
      case 'froglet': case 'adult': case 'frog': {
        const c = this.spawn('frog');
        c.perch = null; c.leap = null; place(c); this.dropIn(c);
        c.age = kind === 'froglet' ? TAIL_TICKS / 2 : POND_SPECIES.frog.mature + 100;
        if (kind === 'froglet') c.mood = 'emerging';
        return;
      }
      case 'mallard': {
        const hen = this.spawnDuckPair();
        for (const d of [hen, hen.mate!]) place(d);
        // With a brood of ducklings in tow.
        let lead = hen;
        for (let k = 0; k < 4; k++) { const d = this.spawn('mallard', hen); d.leader = lead; d.lineId = hen.lineId; d.mood = 'following'; lead = d; }
        return;
      }
      case 'heron': this.heronLands({ x, z }); return;
      case 'turtle': {
        const c = this.spawn('turtle');
        if (!c.perch) { place(c); c.layer = 'under'; c.mood = 'swimming'; c.h = -2; c.timer = 600; }
        return;
      }
      default: {
        const c = this.spawn(kind);
        place(c);
        if (kind === 'snail') this.placeSnail(c);
        if (kind === 'dragonfly') c.h = rand(10, 20);
        if (FISH[kind]) c.h = -Math.min(this.depthAt(c.x, c.z) - 1, 3);
      }
    }
  }

  // --- events ---------------------------------------------------------------------

  /** Starts an event now (any under way ends). */
  startHappening(kind: PondHappening) {
    if (this.happening?.kind === 'hatch') this.nymphs.length = 0;
    const dur = kind === 'rain' ? RAIN_TICKS : kind === 'hatch' ? HATCH_TICKS : CHORUS_TICKS;
    this.happening = { kind, t: 0, dur };
    this.lastHappening = kind;
    this.logEvent('visit', null, null, kind === 'rain' ? 'Rain began to fall' : kind === 'hatch' ? 'A mayfly hatch began' : 'Evening fell over the pond');
  }

  private updateHappening() {
    const ev = this.happening;
    if (!ev) {
      if (this.tick < this.nextHappening) return;
      // Something different from last time.
      const kinds = (['rain', 'hatch', 'chorus'] as PondHappening[]).filter(k => k !== this.lastHappening);
      this.startHappening(kinds[randInt(0, kinds.length - 1)]);
      return;
    }
    ev.t++;
    if (ev.kind === 'rain') this.rainfall();
    else if (ev.kind === 'hatch') this.hatching(ev.t / ev.dur);
    this.updateNymphs();
    this.updateFireflies();
    if (ev.t >= ev.dur) {
      this.happening = null;
      this.nextHappening = this.tick + randInt(HAPPENING_GAP[0], HAPPENING_GAP[1]);
    }
  }

  /** How hard it is raining, 0 to 1: building up, steady, then easing off. */
  rainAmount() {
    const ev = this.happening;
    if (ev?.kind !== 'rain') return 0;
    const k = ev.t / ev.dur;
    return Math.min(1, k / 0.12, (1 - k) / 0.2);
  }

  /** Raindrops ring the surface everywhere, thickest where the visitor is looking. */
  private rainfall() {
    const amount = this.rainAmount();
    const { z0, z1 } = this.viewZ;
    const drop = (z: number) => {
      const row = Math.max(0, Math.min(this.h - 1, Math.round(z)));
      const x = rand(this.shoreL[row] + 1, this.shoreR[row] - 1);
      if (this.isWater(x, z)) this.ring(x, z, 0.5, rand(0.15, 0.25), randInt(20, 36));
    };
    for (let k = Math.round(amount * 6 + Math.random()); k > 0; k--) drop(rand(z0 - 20, z1 + 20));
    if (Math.random() < amount) drop(rand(0, this.h));
    // The midges take shelter.
    if (amount > 0.5 && this.midges.length > 60 && this.tick % 3 === 0) this.midges[randInt(0, this.midges.length - 1)].alive = false;
  }

  /** The mayfly hatch: nymphs climb the reed stems out of the water, near the visitor most of all. */
  private hatching(k: number) {
    if (k > 0.75 || this.nymphs.length >= MAX_NYMPHS || this.tick % 2) return;
    const { z0, z1 } = this.viewZ;
    const clumps = this.clumps.filter(c => c.z > z0 - 60 && c.z < z1 + 60);
    const pool = clumps.length && Math.random() < 0.8 ? clumps : this.clumps;
    if (!pool.length) return;
    const clump = pool[randInt(0, pool.length - 1)];
    const st = clump.stems[randInt(0, clump.stems.length - 1)];
    if (!this.isWater(st.x, st.z)) return;
    this.nymphs.push({ x: st.x + 0.6, z: st.z + 0.2, h: -1.2, top: rand(st.len * 0.25, st.len * 0.5), timer: 0, dragonfly: Math.random() < 0.08, alive: true });
  }

  /** Nymphs climb, pause, split their skins, and fly: a mayfly (or now and then a dragonfly). */
  private updateNymphs() {
    for (const n of this.nymphs) {
      if (n.h < n.top) { n.h += 0.035; continue; }
      if (++n.timer < 70) continue;
      n.alive = false;
      if (n.dragonfly) {
        if (this.counts().dragonfly < this.cap('dragonfly') + 2) {
          const d = this.spawn('dragonfly');
          d.x = n.x; d.z = n.z; d.h = n.h; d.age = 0; d.mood = 'darting'; d.timer = 0;
          this.logEvent('emerge', d, null, 'A dragonfly emerged from its nymph');
        }
      } else if (this.midges.length < MAX_MIDGES + 200) {
        this.midges.push({ x: n.x, z: n.z, h: n.h + 1, vx: 0, vz: 0, vh: 0.1, swarm: -1, alive: true, life: randInt(MAYFLY_LIFE[0], MAYFLY_LIFE[1]) });
      }
    }
  }

  /**
   * How far into the night it is, 0 (day) to 1 (full night): the evening
   * chorus's dusk deepens into night and lifts again at dawn.
   */
  nightfall() {
    const ev = this.happening;
    if (ev?.kind !== 'chorus') return 0;
    const k = ev.t / ev.dur;
    if (k < 0.12) return 0;
    if (k < 0.3) return (k - 0.12) / 0.18;
    if (k < 0.8) return 1;
    return Math.max(0, 1 - (k - 0.8) / 0.15);
  }

  /** The golden light of dusk (and a pinker dawn), 0 to 1. */
  duskGlow() {
    const ev = this.happening;
    if (ev?.kind !== 'chorus') return 0;
    const k = ev.t / ev.dur;
    if (k < 0.12) return k / 0.12;
    if (k < 0.3) return 1 - (k - 0.12) / 0.18;
    if (k > 0.8 && k < 0.95) return Math.sin(((k - 0.8) / 0.15) * Math.PI) * 0.7;
    return 0;
  }

  /** Fireflies come out over the banks and reeds at night, near the visitor, and go at dawn. */
  private updateFireflies() {
    const night = this.nightfall();
    if (night > 0.6 && this.fireflies.length < MAX_FIREFLIES && this.tick % 3 === 0) {
      const { z0, z1 } = this.viewZ;
      const z = rand(z0 - 20, z1 + 20);
      const side: 1 | -1 = Math.random() < 0.5 ? 1 : -1;
      const x = this.offShore(z, side, rand(-14, 6));
      this.fireflies.push({ x, z, h: rand(4, 16), vx: 0, vz: 0, phase: rand(0, 200), alive: true });
    }
    for (const f of this.fireflies) {
      f.vx = (f.vx + rand(-0.02, 0.02)) * 0.95;
      f.vz = (f.vz + rand(-0.015, 0.015)) * 0.95;
      f.x += f.vx; f.z += f.vz; f.h += Math.sin((this.tick + f.phase) * 0.03) * 0.03;
      if (night < 0.3 && Math.random() < 0.02) f.alive = false;
    }
  }
}
