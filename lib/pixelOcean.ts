// Pixel reef: the ecosystem behind the pixel page, seen from slightly above.
//
// The seabed is a grid where every cell is simulated: nutrients seep between
// neighbours, algae grows where they are, spreads, dies back into them and
// sheds plankton, and blood that reaches the floor stains it for a while.
// Above the floor, creatures, plankton, food, carcasses, blood and bubbles are
// free-moving objects with a height (h) off the seabed.
//
// Food web: algae -> plankton -> minnows, pufferfish, seahorses, jellyfish
// and manta rays; urchins graze the algae. Barracuda hunt the small fish,
// morays strike from their rock dens, anglerfish lure minnows in the deep,
// octopuses ambush crabs and urchins, turtles eat jellyfish and urchins, and
// reef sharks hunt barracuda and octopuses. Crabs and minnows pick at
// carcasses, and carcasses and waste rot back into the seabed's nutrients.
//
// Clownfish shelter in stinging anemones, starfish creep over the rocks eating
// urchins, cuttlefish hypnotise prey with rippling colours, dolphin pods visit
// to herd minnows into bait balls, and now and then a whale carcass sinks and
// the whole reef swarms it. Kills leave a scent trail that hunters follow in,
// big fish queue at cleaner stations, and courting fish pair up before they
// spawn.
//
// World units are art pixels: x across, z down the page, h up off the floor.

export const SURFACE = 110;
export const TICKS_PER_SECOND = 30;

export type Species =
  | 'minnow' | 'puffer' | 'seahorse' | 'barracuda' | 'eel' | 'angler' | 'shark'
  | 'crab' | 'urchin' | 'octopus' | 'jelly' | 'turtle' | 'manta'
  | 'clownfish' | 'starfish' | 'cuttlefish' | 'dolphin';
export const SPECIES_LIST: Species[] = [
  'minnow', 'puffer', 'seahorse', 'clownfish', 'barracuda', 'eel', 'angler', 'shark',
  'crab', 'urchin', 'starfish', 'octopus', 'cuttlefish', 'jelly', 'turtle', 'manta', 'dolphin',
];
export type DeathCause = 'eaten' | 'stung' | 'starved' | 'oldAge';
/** What a creature is up to this tick, for the inspector. */
export type Mood = 'cruising' | 'schooling' | 'foraging' | 'grazing' | 'fleeing' | 'hiding' | 'hunting' | 'scavenging' | 'drifting'
  | 'clinging' | 'carrying' | 'camouflaged' | 'inking' | 'lurking' | 'striking' | 'puffed' | 'gliding'
  | 'tracking' | 'balling' | 'herding' | 'diving' | 'leaving' | 'courting' | 'queueing' | 'cleaning'
  | 'hypnotising' | 'mesmerised' | 'eating' | 'nestled';

export interface OceanEvent {
  tick: number;
  kind: 'birth' | 'inked' | 'visit' | 'cleaned' | DeathCause;
  text: string;
  /** Involves a creature the visitor adopted. */
  starred: boolean;
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
  food: Particle | Carcass | WhaleFall | null;
  grazeCell: number;
  /** Kelp a turtle is browsing, or a minnow is using for cover. */
  kelp: Kelp | null;
  /** Tucked into kelp, where hunters only notice it up close. */
  hidden: boolean;
  /** Where it was born (or its parent was); it drifts back if it strays far. */
  homeZ: number;
  /** Shared by everyone descended from the same arrival: its family. */
  lineId: number;
  /** The visitor's own creature. */
  adopted: boolean;
  /** A moray's den, an octopus's home rock. */
  anchorX: number;
  anchorZ: number;
  /** Animation-driving states, each 0 to 1: a puffer's inflation, an
   * octopus's camouflage, how far a moray (or an anglerfish's jaw) is out. */
  puff: number;
  camo: number;
  lunge: number;
  /** Counts down a species' current state: puffed, inking, a strike. */
  timer: number;
  /** A seahorse carrying eggs: ticks until they hatch. */
  carrying: number;
  /** Parasites picked up over time (0 to 1); big fish get them cleaned off. */
  parasites: number;
  /** The cleaner station it is queueing at, if any. */
  station: Station | null;
  /** Its partner while courting, and how much longer the courtship lasts. */
  mate: Creature | null;
  courting: number;
  /** The partner who started the courtship (and so lays the eggs). */
  courtLead: boolean;
  /** Ticks spent looking for a partner, before giving up and spawning alone. */
  courtWait: number;
  /** Ticks left mesmerised by a cuttlefish (or pinned by a starfish). */
  dazed: number;
  /** A starfish's arms: nipped off by crabs and slowly regrown. */
  limbs: number;
  /** A clownfish's home. */
  anemone: Anemone | null;
  /** A dolphin's place in its pod. */
  podIndex: number;
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

/** A drop of blood (or jellyfish goo, or octopus ink) drifting in the water. */
export interface Drop {
  kind: 'blood' | 'goo' | 'ink' | 'heart' | 'sand' | 'scent' | 'sparkle';
  x: number; z: number; h: number;
  vx: number; vz: number; vh: number;
  life: number;
  maxLife: number;
  shade: number;
  alive: boolean;
}

/** A stinging anemone on the seabed, home to clownfish. */
export interface Anemone { x: number; z: number; palette: number; phase: number; retract: number; alive: boolean }

/** A rock where cleaner shrimp pick parasites off the big fish that queue there. */
export interface Station { rock: Decor; x: number; z: number; ht: number; side: 1 | -1; queue: Creature[] }

/** A whale carcass: it sinks, feeds the reef for minutes, and leaves its skeleton. */
export interface WhaleFall {
  x: number; z: number; h: number; vh: number;
  facing: 1 | -1;
  mass: number;
  fullMass: number;
  alive: boolean;
  landed: boolean;
  /** When the bare skeleton finally crumbles (0 while there is still meat). */
  bonesUntil: number;
  /** Marks it apart from other food. */
  whale: true;
}

/** The smell of blood in the water: it drifts and fades, and hunters follow it. */
export interface Scent { x: number; z: number; strength: number; alive: boolean }

interface Pod {
  cx: number; cz: number; ch: number;
  phase: 'arrive' | 'herd' | 'leave';
  until: number;
  diver: number;
  diveUntil: number;
  side: 1 | -1;
  eaten: number;
  /** Fish caught on the current dive: each pass snaps up only a couple. */
  diveCatch: number;
}

export interface Bubble { x: number; z: number; h: number; phase: number; alive: boolean }
export interface Kelp { x: number; z: number; length: number; maxLength: number; phase: number }
/** An area of the seabed kept free of scenery and algae, in world units. */
export interface ClearZone { x0: number; z0: number; x1: number; z1: number }

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
    cruise: 0.26, burst: 1.1, vision: 60, metabolism: 0.0005, maxAge: [6000, 9000], mature: 900, hungerLine: 0.8,
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
  puffer: {
    label: 'Pufferfish', names: ['Pokey', 'Balloon', 'Puff', 'Prickles', 'Bloat', 'Nib', 'Bubba', 'Dumpling'],
    cruise: 0.2, burst: 0.45, vision: 24, metabolism: 0.0008, maxAge: [5000, 8000], mature: 600, hungerLine: 0.7,
    breedAt: 0.88, breedCost: 0.5, breedCooldown: 1200, litter: [1, 2], units: 60, body: 16, minH: 4, maxH: 40,
    cap: [24000, 2, 26], palettes: 2,
  },
  seahorse: {
    label: 'Seahorse', names: ['Twirl', 'Sprig', 'Curly', 'Bea', 'Kelpie', 'Hippo', 'Coralie', 'Swish'],
    cruise: 0.07, burst: 0.1, vision: 10, metabolism: 0.00012, maxAge: [6000, 9000], mature: 700, hungerLine: 1,
    breedAt: 0.8, breedCost: 0.4, breedCooldown: 1800, litter: [2, 3], units: 30, body: 4, minH: 4, maxH: 40,
    cap: [30000, 3, 24], palettes: 3,
  },
  urchin: {
    label: 'Sea urchin', names: ['Spiny', 'Bristle', 'Pin', 'Thistle', 'Burr', 'Quill'],
    cruise: 0.02, burst: 0.02, vision: 30, metabolism: 0.00008, maxAge: [9000, 14000], mature: 1200, hungerLine: 0.8,
    breedAt: 0.9, breedCost: 0.5, breedCooldown: 3000, litter: [1, 2], units: 40, body: 6, minH: 0, maxH: 0,
    cap: [16000, 4, 40], palettes: 2,
  },
  octopus: {
    label: 'Octopus', names: ['Inky', 'Otto', 'Squish', 'Ollie', 'Tako', 'Marbles'],
    cruise: 0.13, burst: 1.0, vision: 32, metabolism: 0.00025, maxAge: [7000, 10000], mature: 1200, hungerLine: 0.75,
    breedAt: 0.9, breedCost: 0.6, breedCooldown: 4000, litter: [1, 1], units: 120, body: 30, minH: 0, maxH: 6,
    cap: [90000, 1, 6], palettes: 1,
  },
  eel: {
    label: 'Moray eel', names: ['Gnasher', 'Slink', 'Ribbon', 'Snap', 'Murk', 'Vera'],
    cruise: 0.1, burst: 0.7, vision: 15, metabolism: 0.00012, maxAge: [9000, 14000], mature: 1500, hungerLine: 0.8,
    breedAt: 0.9, breedCost: 0.5, breedCooldown: 4000, litter: [1, 1], units: 120, body: 30, minH: 2, maxH: 10,
    cap: [80000, 1, 6], palettes: 1,
  },
  shark: {
    label: 'Reef shark', names: ['Grey', 'Brute', 'Duke', 'Sable', 'Rex', 'Tooth'],
    cruise: 0.3, burst: 1.2, vision: 90, metabolism: 0.00015, maxAge: [12000, 18000], mature: 3000, hungerLine: 0.6,
    breedAt: 0.95, breedCost: 0.6, breedCooldown: 8000, litter: [1, 1], units: 400, body: 120, minH: 20, maxH: 60,
    cap: [250000, 1, 2], palettes: 1,
  },
  manta: {
    // Mantas glide through and never breed here.
    label: 'Manta ray', names: ['Glide', 'Halo', 'Atlas', 'Sky', 'Wing', 'Drift'],
    cruise: 0.28, burst: 0.3, vision: 12, metabolism: 0.00005, maxAge: [15000, 20000], mature: 3000, hungerLine: 1,
    breedAt: 2, breedCost: 0, breedCooldown: 0, litter: [1, 1], units: 200, body: 80, minH: 40, maxH: 65,
    cap: [300000, 1, 1], palettes: 1,
  },
  clownfish: {
    label: 'Clownfish', names: ['Nemo', 'Marlin', 'Coral', 'Sunny', 'Bubbles', 'Peach', 'Tango', 'Ember'],
    cruise: 0.2, burst: 0.6, vision: 14, metabolism: 0.0004, maxAge: [7000, 10000], mature: 700, hungerLine: 0.7,
    breedAt: 0.85, breedCost: 0.45, breedCooldown: 1500, litter: [1, 2], units: 50, body: 10, minH: 2, maxH: 14,
    cap: [18000, 4, 40], palettes: 1,
  },
  starfish: {
    label: 'Starfish', names: ['Patrick', 'Stella', 'Astra', 'Comet', 'Twinkle', 'Nova'],
    cruise: 0.015, burst: 0.015, vision: 40, metabolism: 0.00005, maxAge: [14000, 20000], mature: 2000, hungerLine: 0.8,
    breedAt: 0.9, breedCost: 0.5, breedCooldown: 5000, litter: [1, 1], units: 60, body: 8, minH: 0, maxH: 0,
    cap: [25000, 3, 24], palettes: 3,
  },
  cuttlefish: {
    label: 'Cuttlefish', names: ['Sepia', 'Flicker', 'Prism', 'Mesmer', 'Strobe', 'Zebra'],
    cruise: 0.12, burst: 0.45, vision: 34, metabolism: 0.0002, maxAge: [8000, 12000], mature: 1200, hungerLine: 0.7,
    breedAt: 0.9, breedCost: 0.5, breedCooldown: 3000, litter: [1, 2], units: 100, body: 20, minH: 6, maxH: 30,
    cap: [50000, 2, 10], palettes: 1,
  },
  dolphin: {
    // Dolphins visit as a pod (see spawnPod) and never breed here.
    label: 'Dolphin', names: ['Echo', 'Splash', 'Flip', 'Marina', 'Clicker', 'Sonar'],
    cruise: 0.5, burst: 1.3, vision: 120, metabolism: 0.00002, maxAge: [60000, 60000], mature: 0, hungerLine: 0,
    breedAt: 2, breedCost: 0, breedCooldown: 0, litter: [1, 1], units: 300, body: 100, minH: 10, maxH: 70,
    cap: [1e9, 0, 6], palettes: 1,
  },
  angler: {
    label: 'Anglerfish', names: ['Lantern', 'Gulp', 'Grin', 'Abyss', 'Murk', 'Lumen'],
    cruise: 0.05, burst: 0.5, vision: 30, metabolism: 0.0001, maxAge: [12000, 16000], mature: 2000, hungerLine: 0.8,
    breedAt: 0.9, breedCost: 0.5, breedCooldown: 5000, litter: [1, 1], units: 150, body: 30, minH: 6, maxH: 18,
    cap: [100000, 1, 4], palettes: 1,
  },
};

/** Who hunts whom (besides the special hunters: morays, octopuses, anglerfish). */
const PREY: Partial<Record<Species, Species[]>> = {
  barracuda: ['minnow', 'puffer', 'seahorse'],
  shark: ['barracuda', 'octopus', 'puffer', 'minnow'],
  turtle: ['jelly', 'urchin'],
};
/** What a minnow keeps an eye out for. */
const MINNOW_WATCHES: Species[] = ['barracuda', 'jelly', 'shark', 'dolphin'];
/** Big fish that pick up parasites and visit cleaner stations. */
const CLEANED: Species[] = ['shark', 'barracuda', 'turtle', 'manta', 'cuttlefish'];
/** Fish that court a partner before they spawn. */
const COURTERS: Species[] = ['minnow', 'puffer', 'clownfish', 'barracuda', 'shark', 'cuttlefish', 'turtle'];
/** What a clownfish darts home from. */
const CLOWNFISH_THREATS: Species[] = ['barracuda', 'shark', 'cuttlefish', 'eel', 'dolphin'];
/** Small fish an anemone stings if they brush against it. */
const STUNG_BY_ANEMONES: Species[] = ['minnow', 'puffer', 'seahorse'];
/** Creatures that position themselves rather than swim through move(). */
const SELF_PLACED: Species[] = ['eel', 'seahorse'];
const BUBBLERS: Species[] = ['minnow', 'barracuda', 'turtle', 'puffer', 'shark', 'angler', 'manta'];
/** How far a moray can reach out of its den. */
const EEL_REACH = 22;

const PLANKTON_UNITS = 5;
const PELLET_UNITS = 12;
const BITE_UNITS = 3;
/** Algae coverage (0-255 per cell) that one nutrient unit grows. */
const ALGAE_PER_UNIT = 16;
const BUCKET = 32;
const EVENT_LOG_SIZE = 6;
/** The sunlit shallows: life is richest within about this far of the top. */
const SHALLOWS = 260;
/** How close a hunter must be to notice prey hiding in kelp. */
const HIDDEN_SIGHT = 11;
/** How far a creature roams up or down the page from home before turning back. */
const HOME_RANGE = 60;
/** How long a seahorse carries its eggs before they hatch. */
const CARRY_TICKS = 450;
/** How far (in cells) moss fades out toward a clear zone. */
const CLEAR_EDGE = 18;
const COURT_TICKS = 120;
/** How long a fish looks for a partner before spawning alone. */
const COURT_PATIENCE = 240;
const PARASITE_RATE = 0.0002;
/** Parasite load at which a big fish heads for a cleaner station. */
const PARASITE_ITCH = 0.6;
/** How long a cuttlefish holds its hypnotic display before striking. */
const HYPNO_TICKS = 60;
const WHALE_MASS = 1500;
/** How much of a whale one bite actually removes (it feeds the eater a full bite). */
const WHALE_BITE_SHARE = 0.06;
const MAX_SCENTS = 60;

/** 1 at the top of the page, falling toward 0 in the depths. */
const sunlight = (z: number) => Math.exp(-z / SHALLOWS);
/** A depth biased toward the shallows. */
const shallowZ = (h: number) => Math.min(h - 4, 4 + h * Math.random() ** 2.2);

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
  anemones: Anemone[] = [];
  stations: Station[] = [];
  scents: Scent[] = [];
  whale: WhaleFall | null = null;
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
  private clearZones: ClearZone[] = [];
  /** Cells kept clear (behind the page text), worked out when the zones are set. */
  private clearMask = new Uint8Array(0);
  /** Sunlight for each row of the seabed. */
  private sunRow = new Float32Array(0);
  /** Rocks and corals by bucket, so creatures only check the ones nearby. */
  private decorGrid: Decor[][] = [];
  /** Just the hunters minnows watch for, by bucket, so they needn't scan every creature. */
  private hunterGrid: Creature[][] = [];
  /** State of the seabed's fast random numbers (it draws thousands a tick). */
  private seed = (Math.random() * 0xffffffff) >>> 0 || 1;
  private pod: Pod | null = null;
  /** When the next whale falls and the next dolphin pod visits (ticks). */
  private nextWhale = randInt(1350, 2250);
  private nextPod = randInt(750, 1350);
  /** A slowly turning current that carries scent. */
  private currentAngle = rand(0, Math.PI * 2);
  private noisePhase = Array.from({ length: 12 }, () => rand(0, Math.PI * 2));

  constructor(w: number, h: number) {
    this.resize(w, h);
    this.plantMeadows();
    this.plantAnemones();
    this.pickStations();
    for (const species of SPECIES_LIST) {
      if (species === 'dolphin') continue;
      for (let n = Math.max(1, Math.round(this.cap(species) * 0.5)); n > 0; n--) this.spawn(species, null);
    }
    for (let n = Math.round(this.planktonCap() * 0.4); n > 0; n--) {
      this.spawnParticle('plankton', rand(0, w), rand(0, h), rand(4, 40));
    }
  }

  // --- world --------------------------------------------------------------

  /** Anemones in the sunlit shallows, each with a pair of clownfish to come. */
  private plantAnemones() {
    const count = Math.max(3, Math.round(this.w / 70));
    for (let k = 0; k < count; k++) {
      this.anemones.push({
        x: rand(10, this.w - 10),
        z: rand(10, Math.min(this.h - 10, SHALLOWS * 1.4)),
        palette: randInt(0, 2),
        phase: rand(0, Math.PI * 2),
        retract: 0,
        alive: true,
      });
    }
  }

  /** A few of the bigger rocks become cleaner stations. */
  private pickStations() {
    const big = this.rocks().filter(r => r.ht >= 9);
    const count = Math.max(1, Math.min(3, Math.round((this.w * this.h) / 180000)));
    this.stations = [];
    while (this.stations.length < count && big.length) {
      const rock = big.splice(randInt(0, big.length - 1), 1)[0];
      this.stations.push({ rock, x: rock.x, z: rock.z, ht: rock.ht, side: Math.random() < 0.5 ? 1 : -1, queue: [] });
    }
  }

  /**
   * Dense kelp meadows ringed by seagrass in the sunlit shallows at the top
   * of the page: cover for minnows and the busiest part of the reef.
   */
  private plantMeadows() {
    const { w, h } = this;
    const count = Math.max(4, Math.round(w / 45));
    for (let m = 0; m < count; m++) {
      const cx = rand(16, w - 16);
      const cz = rand(10, Math.min(h - 10, SHALLOWS * 1.1));
      for (let k = randInt(8, 14); k > 0; k--) {
        const maxLength = randInt(30, 75);
        this.kelp.push({
          x: Math.min(w - 2, Math.max(2, cx + rand(-14, 14))),
          z: Math.min(h - 2, Math.max(2, cz + rand(-8, 8))),
          length: randInt(15, maxLength), maxLength, phase: rand(0, Math.PI * 2),
        });
      }
      const r = randInt(18, 30);
      for (let z = Math.max(0, Math.round(cz - r)); z < Math.min(h, cz + r); z++) {
        for (let x = Math.max(0, Math.round(cx - r * 1.4)); x < Math.min(w, cx + r * 1.4); x++) {
          const d = ((x - cx) / 1.4) ** 2 + (z - cz) ** 2;
          if (d > r * r * (0.7 + Math.random() * 0.3)) continue;
          const i = z * w + x;
          this.algae[i] = Math.max(this.algae[i], randInt(160, 255));
          this.nutrients[i] = Math.min(255, this.nutrients[i] + 4);
        }
      }
    }
  }

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
        const sun = sunlight(z);
        this.nutrients[i] = Math.max(0, Math.round(2 + fertile * 4 + sun * 4 + Math.random() * 2));
        if (fertile > 0.35 - sun * 0.3) this.algae[i] = Math.min(255, Math.round((fertile - 0.35 + sun * 0.3) * 500 + Math.random() * 40));
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
    this.clearMask = new Uint8Array(w * h);
    this.sunRow = Float32Array.from({ length: h }, (_, z) => sunlight(z));
    this.grid = [];
    this.foodGrid = [];
    this.hunterGrid = [];
    this.indexDecor();
    this.sweep();
  }

  /** Files each rock and coral under every bucket it might reach. */
  private indexDecor() {
    const cols = this.gridCols, rows = this.gridRows;
    this.decorGrid = Array.from({ length: cols * rows }, () => []);
    for (const d of this.decor) {
      const r = d.w * 0.5 + 2;
      for (let gz = Math.max(0, Math.floor((d.z - r) / BUCKET)); gz <= Math.min(rows - 1, Math.floor((d.z + r) / BUCKET)); gz++) {
        for (let gx = Math.max(0, Math.floor((d.x - r) / BUCKET)); gx <= Math.min(cols - 1, Math.floor((d.x + r) / BUCKET)); gx++) {
          this.decorGrid[gz * cols + gx].push(d);
        }
      }
    }
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
    const z = parent ? parent.z + rand(-3, 3) : this.spawnDepth(species);
    const creature: Creature = {
      id,
      name: `${sp.names[id % sp.names.length]} #${id}`,
      species,
      mood: species === 'jelly' ? 'drifting' : 'cruising',
      x: parent ? parent.x + rand(-3, 3) : rand(4, this.w - 4),
      z,
      homeZ: parent ? parent.homeZ : z,
      lineId: parent?.lineId ?? id,
      adopted: false,
      h: parent ? parent.h : sp.maxH === 0 ? 0 : rand(sp.minH + 2, Math.max(sp.minH + 2, sp.maxH - 2)),
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
      hidden: false,
      anchorX: 0,
      anchorZ: 0,
      puff: 0,
      camo: 0,
      lunge: 0,
      timer: 0,
      carrying: 0,
      parasites: rand(0, 0.4),
      station: null,
      mate: null,
      courting: 0,
      courtLead: false,
      courtWait: 0,
      dazed: 0,
      limbs: 5,
      anemone: parent?.anemone ?? null,
      podIndex: 0,
      scanIn: randInt(0, 10),
      prey: null,
      alive: true,
    };
    this.creatures.push(creature);
    if (species === 'eel') this.giveDen(creature);
    if (species === 'octopus') this.giveHomeRock(creature);
    if (species === 'clownfish' && !parent) {
      // Clownfish arrive at an anemone that isn't crowded yet.
      const homes = this.anemones.filter(a => this.creatures.filter(o => o.anemone === a).length < 3);
      const a = homes[randInt(0, homes.length - 1)] ?? null;
      creature.anemone = a;
      if (a) { creature.x = a.x + rand(-3, 3); creature.z = a.z + rand(-2, 2); creature.h = 4; creature.homeZ = a.z; }
    }
    if (species === 'seahorse' && !parent) {
      // Seahorses arrive clinging to kelp in the shallows.
      const meadow = this.kelp.filter(k => k.z < SHALLOWS * 1.5 && k.length > 15);
      const k = meadow[randInt(0, meadow.length - 1)];
      if (k) { creature.x = k.x; creature.z = k.z; creature.homeZ = k.z; creature.kelp = k; }
    }
    return creature;
  }

  private spawnDepth(species: Species) {
    switch (species) {
      // Morays den in the rocks of the busy shallows.
      case 'minnow': case 'barracuda': case 'puffer': case 'seahorse': case 'eel': case 'cuttlefish':
        return shallowZ(this.h);
      case 'angler':
        // Anglerfish keep to the darkest, deepest water at the bottom of the page.
        return rand(Math.max(4, this.h * 0.75), this.h - 4);
      default:
        return rand(4, this.h - 4);
    }
  }

  private rocks() {
    return this.decor.filter(d => d.kind === 'rock');
  }

  /** A moray takes the nearest free rock as its den (or a hole in the sand). */
  private giveDen(c: Creature) {
    const taken = new Set(this.creatures.filter(o => o.species === 'eel' && o !== c && o.alive).map(o => `${o.anchorX},${o.anchorZ}`));
    let den: Decor | null = null;
    let bestD = Infinity;
    for (const r of this.rocks()) {
      if (r.ht < 6 || taken.has(`${r.x},${r.z}`)) continue;
      const d = (r.x - c.x) ** 2 + (r.z - c.z) ** 2;
      if (d < bestD) { bestD = d; den = r; }
    }
    c.anchorX = den ? den.x : c.x;
    c.anchorZ = den ? den.z : c.z;
    c.x = c.anchorX;
    c.z = c.anchorZ + 1;
    c.h = 2;
    c.homeZ = c.anchorZ;
  }

  private giveHomeRock(c: Creature) {
    let best: Decor | null = null;
    let bestD = Infinity;
    for (const r of this.rocks()) {
      const d = (r.x - c.x) ** 2 + (r.z - c.z) ** 2;
      if (d < bestD) { bestD = d; best = r; }
    }
    c.anchorX = best ? best.x : c.x;
    c.anchorZ = best ? best.z + 3 : c.z;
  }

  private logEvent(kind: OceanEvent['kind'], text: string, ...involved: (Creature | null)[]) {
    this.events.unshift({ tick: this.tick, kind, text, starred: involved.some(c => c?.adopted) });
    if (this.events.length > EVENT_LOG_SIZE) this.events.length = EVENT_LOG_SIZE;
  }

  // --- keeping the page readable ----------------------------------------------

  /**
   * Keeps areas (like the space behind the hero text) free of algae, rocks,
   * corals and kelp. Things that stand up off the floor are drawn higher up
   * the screen than their base, so anything rooted a little below a zone that
   * would reach up into it goes too.
   */
  setClearZones(zones: ClearZone[]) {
    this.clearZones = zones;
    const blocks = (x: number, z: number, halfW: number, rise: number) =>
      zones.some(r => x + halfW >= r.x0 && x - halfW <= r.x1 && z >= r.z0 && z - rise <= r.z1);
    // Elevation lifts a unit of height about 0.55 of a unit up the screen.
    this.decor = this.decor.filter(d => !blocks(d.x, d.z, d.w / 2, d.ht));
    this.kelp = this.kelp.filter(k => !blocks(k.x, k.z, 2, k.maxLength * 0.6));
    for (const c of this.creatures) if (c.kelp && !this.kelp.includes(c.kelp)) c.kelp = null;
    for (const a of this.anemones) if (blocks(a.x, a.z, 4, 10)) a.alive = false;
    this.anemones = this.anemones.filter(a => a.alive);
    if (this.stations.some(st => !this.decor.includes(st.rock))) {
      for (const c of this.creatures) c.station = null;
      this.pickStations();
    }
    this.indexDecor();
    const { w, algae, nutrients } = this;
    this.clearMask.fill(0);
    for (const r of zones) {
      for (let z = Math.max(0, Math.floor(r.z0 - CLEAR_EDGE)); z <= Math.min(this.h - 1, r.z1 + CLEAR_EDGE); z++) {
        for (let x = Math.max(0, Math.floor(r.x0 - CLEAR_EDGE)); x <= Math.min(w - 1, r.x1 + CLEAR_EDGE); x++) {
          const i = z * w + x;
          if (!this.isClear(i, x, z)) continue;
          this.clearMask[i] = 1;
          nutrients[i] = Math.min(255, nutrients[i] + (algae[i] >> 4));
          algae[i] = 0;
        }
      }
    }
  }

  /**
   * Inside a clear zone. Past its edge the chance of a cell being kept clear
   * falls off evenly over CLEAR_EDGE cells, so meadows thin out gradually
   * (as a dither, using each cell's random grain) instead of stopping dead.
   */
  private isClear(i: number, x: number, z: number) {
    const reach = (this.grain[i] / 256) * CLEAR_EDGE;
    return this.clearZones.some(r => Math.max(r.x0 - x, x - r.x1, r.z0 - z, z - r.z1) < reach);
  }

  // --- the visitor's creature ------------------------------------------------

  /** Names a creature and makes it the visitor's own. */
  adopt(c: Creature, name: string) {
    c.name = name;
    c.adopted = true;
  }

  /**
   * Brings a returning visitor's creature back, grown, into the shallows,
   * with a few relatives so its line has somewhere to go.
   */
  release(species: Species, name: string, palette: number) {
    const c = this.spawn(species, null, 0.8);
    c.palette = palette % SPECIES[species].palettes;
    c.age = SPECIES[species].mature;
    this.adopt(c, name);
    for (let k = species === 'minnow' ? 4 : 1; k > 0; k--) {
      this.spawn(species, c, rand(0.6, 0.85)).age = SPECIES[species].mature;
    }
    return c;
  }

  /** The oldest living member of a creature's family, to carry on its line. */
  heirOf(c: Creature) {
    let heir: Creature | null = null;
    for (const o of this.creatures) {
      if (o.alive && o !== c && o.lineId === c.lineId && (!heir || o.age > heir.age)) heir = o;
    }
    return heir;
  }

  // --- simulation ---------------------------------------------------------

  step() {
    this.tick++;
    this.updateFloor();
    this.updateKelp();
    this.buildGrids();
    this.updateCreatures();
    this.updateAnemones();
    this.updateWhale();
    this.updatePod();
    this.updateScents();
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
    this.scents = this.scents.filter(sc => sc.alive);
    for (const st of this.stations) st.queue = st.queue.filter(c => c.alive && c.station === st);
  }

  /** Samples random cells: nutrients seep, algae grows, spreads and sheds plankton, stains fade. */
  private updateFloor() {
    const { w, h, algae, nutrients, stain, clearMask, sunRow } = this;
    const n = w * h;
    const planktonCap = this.planktonCap();
    // A local copy of the fast generator (xorshift32), saved back at the end.
    let seed = this.seed;
    const rnd = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return (seed >>> 0) / 4294967296; };
    for (let k = Math.max(200, Math.round(n / 80)); k > 0; k--) {
      const i = (rnd() * n) | 0;
      const x = i % w;
      const r = rnd();
      const j = r < 0.25 ? (x > 0 ? i - 1 : i)
        : r < 0.5 ? (x < w - 1 ? i + 1 : i)
          : r < 0.75 ? (i >= w ? i - w : i)
            : (i + w < n ? i + w : i);
      if (nutrients[i] > nutrients[j] + 1) { nutrients[i]--; nutrients[j]++; }
      if (stain[i] > 0) stain[i] = Math.max(0, stain[i] - 6);
      // Nothing takes root behind the page's text.
      if (clearMask[i]) continue;

      const sun = sunRow[(i / w) | 0];
      const a = algae[i];
      if (nutrients[i] > 0 && a <= 255 - ALGAE_PER_UNIT && (a > 0 || algae[j] >= 96 || rnd() < 0.002)) {
        // Algae grows fastest in the sunlit shallows.
        if (rnd() < 0.25 + 0.45 * sun) { algae[i] = a + ALGAE_PER_UNIT; nutrients[i]--; }
      } else if (a >= ALGAE_PER_UNIT && rnd() < 0.04) {
        algae[i] = a - ALGAE_PER_UNIT;
        if (nutrients[i] < 255) nutrients[i]++;
      }
      // Sunlit algae sheds plankton fastest, so the shallows feed the most fish.
      if (algae[i] >= 224 && this.plankton < planktonCap && rnd() < 0.004 * (1 + 3 * sun)) {
        algae[i] -= PLANKTON_UNITS * ALGAE_PER_UNIT;
        this.spawnParticle('plankton', x, Math.floor(i / w), 1);
      }
    }
    this.seed = (seed >>> 0) || 1;
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
    if (this.grid.length !== size) {
      this.grid = Array.from({ length: size }, () => []);
      this.foodGrid = Array.from({ length: size }, () => []);
      this.hunterGrid = Array.from({ length: size }, () => []);
    }
    for (let b = 0; b < size; b++) { this.grid[b].length = 0; this.foodGrid[b].length = 0; this.hunterGrid[b].length = 0; }
    const bucket = (x: number, z: number) =>
      Math.min(this.gridRows - 1, Math.max(0, (z / BUCKET) | 0)) * this.gridCols
      + Math.min(this.gridCols - 1, Math.max(0, (x / BUCKET) | 0));
    for (const c of this.creatures) {
      const b = bucket(c.x, c.z);
      this.grid[b].push(c);
      if (MINNOW_WATCHES.includes(c.species)) this.hunterGrid[b].push(c);
    }
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

  private updateCreatures() {
    const counts = this.counts();
    for (let n = 0, total = this.creatures.length; n < total; n++) {
      const c = this.creatures[n];
      if (c.alive) this.updateCreature(c, counts);
    }

    // Newcomers wander in so a crashed population can recover.
    if (this.tick % 150 === 0) {
      // Schools keep arriving in the shallows from open water, so the top of
      // the page recovers even when the rest of the reef is full.
      const shallow = this.creatures.filter(c => c.species === 'minnow' && c.z < SHALLOWS * 1.5).length;
      if (counts.minnow < this.cap('minnow') * 0.15 || shallow < this.cap('minnow') * 0.25) {
        const leader = this.spawn('minnow', null);
        for (let k = 0; k < 5; k++) this.spawn('minnow', leader, rand(0.5, 0.8)).age = SPECIES.minnow.mature;
      }
      if (counts.barracuda === 0 && counts.minnow > this.cap('minnow') * 0.5 && Math.random() < 0.35) this.spawn('barracuda', null);
      if (counts.crab < 2) this.spawn('crab', null);
      if (counts.jelly < 2 && Math.random() < 0.5) this.spawn('jelly', null);
      if (counts.turtle === 0 && counts.jelly > 3 && Math.random() < 0.15) this.spawn('turtle', null);
      // Every other species drifts back in now and then if it's down to its last few.
      for (const sp of ['puffer', 'seahorse', 'urchin', 'octopus', 'eel', 'shark', 'manta', 'angler', 'clownfish', 'starfish', 'cuttlefish'] as Species[]) {
        if (counts[sp] < SPECIES[sp].cap[1] && Math.random() < 0.25) this.spawn(sp, null);
      }
    }
  }

  private counts() {
    const counts = Object.fromEntries(SPECIES_LIST.map(s => [s, 0])) as Record<Species, number>;
    for (const c of this.creatures) if (c.alive) counts[c.species]++;
    return counts;
  }

  private updateCreature(c: Creature, counts: Record<Species, number>) {
    const sp = SPECIES[c.species];
    c.age++;
    if (c.breedCooldown > 0) c.breedCooldown--;
    if (c.energy < sp.hungerLine) c.hungry = true;
    else if (c.energy > 0.95) { c.hungry = false; c.food = null; c.grazeCell = -1; c.kelp = null; }
    if (CLEANED.includes(c.species)) c.parasites = Math.min(1, c.parasites + PARASITE_RATE);

    const steer = { x: 0, z: 0, h: 0, max: sp.cruise, effort: 1 };
    // Courting and queueing to be cleaned take over from everyday life.
    if (c.courting > 0 && this.court(c, steer)) { /* courting */ }
    else if (this.visitStation(c, steer)) { /* at the cleaner station */ }
    else switch (c.species) {
      case 'minnow': this.thinkMinnow(c, steer); break;
      case 'barracuda': this.thinkBarracuda(c, steer); break;
      case 'crab': this.thinkCrab(c, steer); break;
      case 'jelly': this.thinkJelly(c, steer); break;
      case 'turtle': this.thinkTurtle(c, steer); break;
      case 'puffer': this.thinkPuffer(c, steer); break;
      case 'seahorse': this.thinkSeahorse(c); break;
      case 'urchin': this.thinkUrchin(c, steer); break;
      case 'octopus': this.thinkOctopus(c, steer); break;
      case 'eel': this.thinkEel(c); break;
      case 'shark': this.thinkShark(c, steer); break;
      case 'manta': this.thinkManta(c, steer); break;
      case 'angler': this.thinkAngler(c, steer); break;
      case 'clownfish': this.thinkClownfish(c, steer); break;
      case 'starfish': this.thinkStarfish(c, steer); break;
      case 'cuttlefish': this.thinkCuttlefish(c, steer); break;
      case 'dolphin': this.thinkDolphin(c, steer); break;
    }
    if (!c.alive) return;
    // Mesmerised by a cuttlefish, or pinned by a starfish: barely moving.
    if (c.dazed > 0) {
      c.dazed--;
      steer.max = Math.min(steer.max, 0.04);
      if (c.species !== 'urchin') c.mood = 'mesmerised';
    }
    if (!SELF_PLACED.includes(c.species)) this.move(c, steer);

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

    // Seahorse fathers carry the eggs for a while before they hatch.
    if (c.carrying > 0 && --c.carrying === 0) this.hatch(c, counts);
    // A courtship ends in spawning. The partner who started it keeps the
    // count (the other just follows along), so turn order can't cancel it.
    if (c.courting > 0 && c.courtLead && --c.courting === 0) {
      const mate = c.mate;
      if (mate) { mate.mate = null; mate.courting = 0; }
      c.mate = null;
      if (mate?.alive) this.spawnBrood(c, counts, mate);
    }
    const ready = c.energy > sp.breedAt && c.age > sp.mature && c.breedCooldown === 0 && c.carrying === 0
      && c.courting === 0 && !c.station && counts[c.species] < this.cap(c.species);
    if (ready) {
      if (!COURTERS.includes(c.species)) this.spawnBrood(c, counts, null);
      else {
        const mate = (this.tick + c.id) % 10 === 0 ? this.findMate(c) : null;
        if (mate) {
          c.mate = mate; mate.mate = c;
          c.courting = mate.courting = COURT_TICKS;
          c.courtLead = true; mate.courtLead = false;
          c.courtWait = 0;
          if (c.species !== 'minnow') this.logEvent('birth', `${c.name} is courting ${mate.name}`, c, mate);
        } else if (++c.courtWait > COURT_PATIENCE) {
          c.courtWait = 0;
          this.spawnBrood(c, counts, null);
        }
      }
    }

    if (BUBBLERS.includes(c.species) && Math.random() < 0.0015) {
      this.bubbles.push({ x: c.x + c.facing * 4, z: c.z, h: c.h + 2, phase: rand(0, 6), alive: true });
    }
  }

  /** Pays for a litter and lays it (or, for seahorses, starts carrying it). */
  private spawnBrood(c: Creature, counts: Record<Species, number>, mate: Creature | null) {
    const sp = SPECIES[c.species];
    c.energy -= sp.breedCost;
    c.breedCooldown = sp.breedCooldown;
    if (mate) mate.breedCooldown = Math.max(mate.breedCooldown, sp.breedCooldown / 2);
    if (c.species === 'seahorse') c.carrying = CARRY_TICKS;
    else this.hatch(c, counts, mate);
  }

  /** A free adult of the same species nearby that is fit to court. */
  private findMate(c: Creature) {
    let best: Creature | null = null;
    let bestD = 40 * 40;
    this.near(this.grid, c.x, c.z, 40, o => {
      if (o === c || o.species !== c.species || !o.alive || o.mate || o.courting || o.station) return;
      if (o.age < SPECIES[o.species].mature || o.energy < 0.4) return;
      const d = (o.x - c.x) ** 2 + (o.z - c.z) ** 2;
      if (d < bestD) { bestD = d; best = o; }
    });
    return best as Creature | null;
  }

  /**
   * Courting partners swim in a tight loop around each other, flashing their
   * colours, with hearts rising from the pair.
   */
  private court(c: Creature, s: { x: number; z: number; h: number; max: number; effort: number }) {
    const mate = c.mate;
    if (!mate?.alive) { c.mate = null; c.courting = 0; return false; }
    const mx = (c.x + mate.x) / 2;
    const mz = (c.z + mate.z) / 2;
    const mh = Math.max(SPECIES[c.species].minH, (c.h + mate.h) / 2);
    const radius = c.species === 'shark' ? 9 : c.species === 'turtle' || c.species === 'barracuda' ? 7 : 4;
    const angle = this.tick * 0.12 + (c.courtLead ? 0 : Math.PI);
    this.toward(c, s, { x: mx + Math.cos(angle) * radius, z: mz + Math.sin(angle) * radius * 0.6, h: mh + Math.sin(angle * 2) }, 0.1);
    s.max = SPECIES[c.species].cruise * 1.3;
    c.mood = 'courting';
    // A heart now and then; minnows court so often that theirs get just one.
    const heart = c.species === 'minnow' ? c.courting === COURT_TICKS - 1 : this.tick % 30 === 0;
    if (c.courtLead && heart) this.splash('heart', { x: mx, z: mz, h: mh + 4 }, 1, [50, 70], 0.05);
    return true;
  }

  /**
   * Big fish carrying parasites queue at a cleaner station, hold still at
   * the front while the shrimp work, then go on their way. Nobody hunts in
   * the queue, not even the sharks.
   */
  private visitStation(c: Creature, s: { x: number; z: number; h: number; max: number; effort: number }) {
    if (!CLEANED.includes(c.species) || !this.stations.length) return false;
    if (!c.station) {
      if (c.parasites < PARASITE_ITCH || c.energy < 0.25) return false;
      let best: Station | null = null;
      let bestD = Infinity;
      for (const st of this.stations) {
        const d = (st.x - c.x) ** 2 + (st.z - c.z) ** 2 + st.queue.length * 2000;
        if (d < bestD) { bestD = d; best = st; }
      }
      if (!best) return false;
      best.queue.push(c);
      c.station = best;
      c.prey = null;
      c.food = null;
    }
    const st = c.station;
    const place = st.queue.indexOf(c);
    if (place < 0 || !this.stations.includes(st)) { c.station = null; return false; }
    c.homeZ = st.z;
    if (place === 0) {
      const d = this.toward(c, s, { x: st.x, z: st.z, h: st.ht + 5 }, 0.05);
      s.max = d < 8 ? 0.04 : SPECIES[c.species].cruise;
      if (d < 4) {
        c.mood = 'cleaning';
        c.parasites -= 0.005;
        if (this.tick % 12 === 0) this.splash('sparkle', { x: c.x, z: c.z, h: c.h + 2 }, 1, [30, 50], 0.1);
        if (c.parasites <= 0.02) {
          c.parasites = 0;
          st.queue.shift();
          c.station = null;
          this.splash('sparkle', { x: c.x, z: c.z, h: c.h + 2 }, 8, [30, 60], 0.2);
          this.logEvent('cleaned', `${c.name} got cleaned at the cleaner station`, c);
        }
      } else {
        c.mood = 'queueing';
      }
    } else {
      // Waiting in line beside the rock.
      const spot = { x: st.x + st.side * (14 + place * 12), z: st.z + 3, h: st.ht + 8 };
      const d = this.toward(c, s, spot, 0.04);
      s.max = d < 6 ? 0.03 : SPECIES[c.species].cruise;
      c.mood = 'queueing';
    }
    return true;
  }

  /** Brings a litter into the world; it shares what the parent spent on it. */
  private hatch(c: Creature, counts: Record<Species, number>, mate: Creature | null = null) {
    const sp = SPECIES[c.species];
    const litter = Math.min(this.cap(c.species) - counts[c.species], randInt(sp.litter[0], sp.litter[1]));
    if (litter <= 0) return;
    for (let k = 0; k < litter; k++) {
      const baby = this.spawn(c.species, c, sp.breedCost / litter);
      if (c.species === 'seahorse') baby.kelp = c.kelp;
    }
    counts[c.species] += litter;
    this.births += litter;
    const babies = litter === 1 ? 'a baby' : `${litter} babies`;
    this.logEvent('birth', mate ? `${c.name} and ${mate.name} had ${babies}` : `${c.name} had ${babies}`, c, mate);
    if (BUBBLERS.includes(c.species) || c.species === 'seahorse') {
      this.bubbles.push({ x: c.x, z: c.z, h: c.h + 3, phase: rand(0, 6), alive: true });
    }
  }

  /** Applies steering, wandering, bounds and rock avoidance, then moves. */
  private move(c: Creature, s: { x: number; z: number; h: number; max: number }) {
    const sp = SPECIES[c.species];
    if (c.x < 6) s.x += 0.06;
    if (c.x > this.w - 6) s.x -= 0.06;
    if (c.z < 6) s.z += 0.06;
    if (c.z > this.h - 6) s.z -= 0.06;
    const fromHome = c.homeZ - c.z;
    const stray = Math.abs(fromHome) - HOME_RANGE;
    if (stray > 0) s.z += Math.sign(fromHome) * Math.min(0.05, 0.012 + stray * 0.0004);
    if (sp.maxH > 0) {
      if (c.h < sp.minH && c.grazeCell < 0 && !c.station) s.h += 0.03;
      if (c.h > sp.maxH) s.h -= 0.03;
      // Rocks and corals are never taller than this.
      const bucket = Math.min(this.gridRows - 1, Math.max(0, (c.z / BUCKET) | 0)) * this.gridCols
        + Math.min(this.gridCols - 1, Math.max(0, (c.x / BUCKET) | 0));
      for (const d of c.h > 20 ? [] : this.decorGrid[bucket] ?? []) {
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
    c.h = sp.maxH === 0 ? 0 : Math.max(sp.minH === 0 ? 0 : 1, Math.min(SURFACE - 8, c.h + c.vh));
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
    let threatD = 45 * 45;
    let dolphins = false;
    this.near(this.hunterGrid, c.x, c.z, 45, o => {
      if (o.species === 'dolphin') { if ((o.x - c.x) ** 2 + (o.z - c.z) ** 2 < 45 * 45) dolphins = true; return; }
      if (o.species !== 'barracuda' && o.species !== 'jelly' && o.species !== 'shark') return;
      if (o.station) return; // Queueing hunters are at peace.
      // Jellyfish are only worth avoiding up close; a shark scatters everything.
      const reach = o.species === 'jelly' ? 4 : o.species === 'shark' ? 40 : 28;
      const d = (o.x - c.x) ** 2 + (o.z - c.z) ** 2 + ((o.h - c.h) * 0.5) ** 2;
      if (d < reach * reach && d < threatD) { threatD = d; threat = o; }
    });
    // Dolphins circling: pack in tight with the school and swirl.
    if (dolphins) {
      let n = 0, cx = 0, cz = 0, ch = 0;
      this.near(this.grid, c.x, c.z, 20, o => {
        if (o.species !== 'minnow' || o === c) return;
        n++; cx += o.x; cz += o.z; ch += o.h;
      });
      if (n) {
        cx /= n; cz /= n; ch /= n;
        const dx = cx - c.x, dz = cz - c.z;
        const d = Math.hypot(dx, dz) || 1;
        s.x += dx / d * 0.08 - dz / d * 0.07;
        s.z += dz / d * 0.08 + dx / d * 0.07;
        s.h += (ch - c.h) * 0.02;
        s.max = sp.burst;
        s.effort = 1.6;
        c.food = null;
        c.mood = 'balling';
        return;
      }
    }
    if (this.pointer) {
      const d = (this.pointer.x - c.x) ** 2 + (this.pointer.z - c.z) ** 2;
      if (d < 18 * 18 && d < threatD) { threatD = d; threat = this.pointer; }
    }
    // Keep track of the nearest kelp, a little at a time.
    if ((this.tick + c.id) % 15 === 0 || (threat && !c.kelp)) c.kelp = this.nearestKelp(c, 50);
    const k = c.kelp;
    const kd = k ? Math.hypot(k.x - c.x, k.z - c.z) : Infinity;
    c.hidden = !!k && kd < 5 && c.h < k.length;

    if (threat) {
      const t = threat as { x: number; z: number };
      const d = Math.sqrt(threatD) || 1;
      c.food = null;
      c.grazeCell = -1;
      s.max = sp.burst;
      s.effort = 1.8;
      // Bolt for nearby kelp unless the hunter is in the way; otherwise just run.
      const hunterInTheWay = (k ? (k.x - c.x) * (t.x - c.x) + (k.z - c.z) * (t.z - c.z) : 0) > kd * d * 0.5;
      if (k && kd < 50 && !hunterInTheWay) {
        const coverH = Math.min(k.length * 0.5, 20);
        if (c.hidden) {
          s.x += (k.x - c.x) * 0.02;
          s.z += (k.z - c.z) * 0.02;
          s.h += (coverH - c.h) * 0.01;
          c.mood = 'hiding';
        } else {
          this.toward(c, s, { x: k.x, z: k.z, h: coverH }, 0.16);
          c.mood = 'fleeing';
        }
        return;
      }
      s.x += (c.x - t.x) / d * 0.14;
      s.z += (c.z - t.z) / d * 0.14;
      s.h += 0.03;
      c.mood = 'fleeing';
      return;
    }
    // A hungry minnow can't resist an anglerfish's glowing lure.
    if (c.hungry) {
      let lure: { x: number; z: number; h: number } | null = null;
      this.near(this.grid, c.x, c.z, 45, o => {
        if (o.species === 'angler' && o.alive) lure = this.lureOf(o);
      });
      if (lure) {
        this.toward(c, s, lure, 0.05, 4);
        c.mood = 'foraging';
        return;
      }
    }
    if (c.hungry && this.forage(c, s)) return;
    c.mood = this.school(c, s) ? 'schooling' : 'cruising';
    // Idle schools loiter around the kelp.
    if (k && kd > 12 && kd < 50) {
      s.x += (k.x - c.x) / kd * 0.008;
      s.z += (k.z - c.z) / kd * 0.008;
    }
    this.wander(c, s);
  }

  private nearestKelp(c: Creature, radius: number, except: Kelp | null = null) {
    let best: Kelp | null = null;
    let bestD = radius * radius;
    for (const k of this.kelp) {
      if (k.length < 10 || k === except) continue;
      const d = (k.x - c.x) ** 2 + (k.z - c.z) ** 2;
      if (d < bestD) { bestD = d; best = k; }
    }
    return best;
  }

  private thinkBarracuda(c: Creature, s: { x: number; z: number; h: number; max: number; effort: number }) {
    if (this.fleeFrom(c, s, 'shark', 40)) return;
    if (c.hungry) {
      if (this.feedOnWhale(c, s, 200)) return;
      const prey = this.findPrey(c, PREY.barracuda!);
      if (prey) {
        this.chase(c, s, prey, 5, 6);
        return;
      }
      if (this.followScent(c, s, 160)) return;
      if (c.energy < 0.35 && this.forage(c, s)) return;
    }
    c.mood = 'cruising';
    this.wander(c, s);
  }

  /** Crabs scuttle sideways across the seabed to whatever has died or sunk. */
  private thinkCrab(c: Creature, s: { x: number; z: number; h: number; max: number; effort: number }) {
    if (c.hungry) {
      // A cheeky nip at a passing starfish's arm (it grows back).
      this.near(this.grid, c.x, c.z, 4, o => {
        if (o.species !== 'starfish' || o.limbs <= 3 || Math.random() > 0.002) return;
        if ((o.x - c.x) ** 2 + (o.z - c.z) ** 2 > 16) return;
        o.limbs--;
        c.energy = Math.min(1, c.energy + 0.05);
        this.splash('goo', { x: o.x, z: o.z, h: 1 }, 3);
      });
      if (this.whale?.alive && this.whale.landed && (this.whale.x - c.x) ** 2 + (this.whale.z - c.z) ** 2 < 150 * 150) {
        c.food = this.whale;
      }
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
        const at = this.foodPoint(c, t);
        const d = this.toward(c, s, { x: at.x, z: at.z, h: 0 }, 0.04);
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
      let bestD = 28 * 28;
      this.near(this.foodGrid, c.x, c.z, 28, p => {
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

  /** Turtles hunt jellyfish and urchins when hungry and otherwise browse the kelp. */
  private thinkTurtle(c: Creature, s: { x: number; z: number; h: number; max: number; effort: number }) {
    if (c.hungry) {
      const prey = this.findPrey(c, PREY.turtle!);
      if (prey) {
        this.chase(c, s, prey, 6, 6, 0.05);
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

  /**
   * Chases prey and eats it on contact. The energy gained is the prey's body
   * plus whatever it had eaten.
   */
  private chase(c: Creature, s: { x: number; z: number; h: number; max: number; effort: number }, prey: Creature, mouth: number, reach: number, force = 0.09) {
    const lead = c.species === 'turtle' ? 0 : 6;
    this.toward(c, s, { x: prey.x + prey.vx * lead, z: prey.z + prey.vz * lead, h: prey.h }, force);
    s.max = SPECIES[c.species].burst;
    s.effort = 1.5;
    c.mood = 'hunting';
    if (Math.hypot(prey.x - (c.x + c.facing * mouth), prey.z - c.z, prey.h - c.h) < reach) this.devour(c, prey);
  }

  private devour(c: Creature, prey: Creature, swallow = false) {
    const ps = SPECIES[prey.species];
    this.kill(prey, 'eaten', c, swallow);
    c.energy = Math.min(1, c.energy + (ps.body + prey.energy * ps.units * 0.5) / SPECIES[c.species].units);
    c.prey = null;
  }

  /** Swims away from the nearest of a species if one is within range. */
  private fleeFrom(c: Creature, s: { x: number; z: number; h: number; max: number; effort: number }, species: Species, range: number) {
    let threat: Creature | null = null;
    let bestD = range * range;
    this.near(this.grid, c.x, c.z, range, o => {
      if (o.species !== species || !o.alive) return;
      const d = (o.x - c.x) ** 2 + (o.z - c.z) ** 2;
      if (d < bestD) { bestD = d; threat = o; }
    });
    if (!threat) return false;
    const t = threat as Creature;
    const d = Math.sqrt(bestD) || 1;
    s.x += (c.x - t.x) / d * 0.12;
    s.z += (c.z - t.z) / d * 0.12;
    s.max = SPECIES[c.species].burst;
    s.effort = 1.6;
    c.mood = 'fleeing';
    return true;
  }

  /** Pufferfish forage like minnows, and swell into a spiky ball when cornered. */
  private thinkPuffer(c: Creature, s: { x: number; z: number; h: number; max: number; effort: number }) {
    if (c.timer > 0) c.timer--;
    let threat: Creature | null = null;
    let threatD = 30 * 30;
    this.near(this.grid, c.x, c.z, 30, o => {
      if (o.species !== 'barracuda' && o.species !== 'shark') return;
      const d = (o.x - c.x) ** 2 + (o.z - c.z) ** 2 + (o.h - c.h) ** 2;
      if (d < threatD) { threatD = d; threat = o; }
    });
    if (threat && threatD < 14 * 14) c.timer = 150;
    c.puff += ((c.timer > 0 ? 1 : 0) - c.puff) * 0.15;
    if (c.timer > 0) {
      // Puffed up, it can barely swim, but nothing will bite it.
      c.mood = 'puffed';
      s.max = 0.04;
      s.effort = 1.4;
      return;
    }
    if (threat) {
      const t = threat as Creature;
      const d = Math.sqrt(threatD) || 1;
      s.x += (c.x - t.x) / d * 0.1;
      s.z += (c.z - t.z) / d * 0.1;
      s.max = SPECIES.puffer.burst;
      c.mood = 'fleeing';
      return;
    }
    if (c.hungry && this.forage(c, s)) return;
    c.mood = 'cruising';
    this.wander(c, s, 0.015);
  }

  /**
   * Seahorses cling to a kelp stalk, sway with it and snap up passing
   * plankton, now and then drifting over to another stalk.
   */
  private thinkSeahorse(c: Creature) {
    if (!c.kelp || c.kelp.length < 8 || Math.random() < 0.0008) {
      const here = c.kelp;
      c.kelp = this.nearestKelp(c, here ? 40 : 400, here);
      c.mood = 'cruising';
    }
    const k = c.kelp;
    if (!k) return;
    const holdH = Math.min(c.cruiseH, k.length - 3);
    const dx = k.x + 1.5 - c.x;
    const dz = k.z - c.z;
    const dh = holdH - c.h;
    const d = Math.hypot(dx, dz, dh);
    if (d > 1) {
      // Upright and slow: a seahorse bobs its way over to the stalk.
      const step = Math.min(d, SPECIES.seahorse.cruise);
      c.x += dx / d * step;
      c.z += dz / d * step;
      c.h += dh / d * step;
      if (Math.abs(dx) > 0.2) c.facing = dx > 0 ? 1 : -1;
      c.mood = 'cruising';
    } else {
      c.mood = c.carrying > 0 ? 'carrying' : 'clinging';
    }
    c.hidden = d < 3;
    this.near(this.foodGrid, c.x, c.z, SPECIES.seahorse.vision, p => {
      if (p.alive && p.kind === 'plankton' && dist3(p, c) < SPECIES.seahorse.vision) this.eat(c, p);
    });
  }

  /** Urchins creep over the seabed grazing algae. */
  private thinkUrchin(c: Creature, s: { x: number; z: number; h: number; max: number; effort: number }) {
    if (this.graze(c, s, 0, 0.01)) return;
    c.mood = 'cruising';
    this.wander(c, s, 0.004);
  }

  /**
   * Octopuses sit camouflaged by their rock, crawl out to ambush crabs and
   * urchins, and squirt ink and jet away from sharks and barracuda.
   */
  private thinkOctopus(c: Creature, s: { x: number; z: number; h: number; max: number; effort: number }) {
    if (c.timer > 0) c.timer--;
    const moving = Math.hypot(c.vx, c.vz) > 0.05;
    const nearRock = (c.x - c.anchorX) ** 2 + (c.z - c.anchorZ) ** 2 < 15 * 15;
    c.camo += ((nearRock && !moving ? 1 : 0) - c.camo) * 0.03;
    c.hidden = c.camo > 0.6;

    let threat: Creature | null = null;
    let threatD = 26 * 26;
    this.near(this.grid, c.x, c.z, 26, o => {
      if (o.species !== 'barracuda' && o.species !== 'shark') return;
      const d = (o.x - c.x) ** 2 + (o.z - c.z) ** 2;
      if (d < threatD) { threatD = d; threat = o; }
    });
    if (c.timer > 260) {
      // Mid-escape: jetting away behind its ink.
      s.x += Math.cos(c.heading) * 0.3;
      s.z += Math.sin(c.heading) * 0.3;
      s.max = SPECIES.octopus.burst;
      s.effort = 2;
      c.mood = 'inking';
      return;
    }
    if (threat && !c.hidden && c.timer === 0) {
      const t = threat as Creature;
      this.splash('ink', c, 34, [140, 260]);
      c.heading = Math.atan2(c.z - t.z, c.x - t.x);
      c.timer = 300;
      c.camo = 0;
      this.logEvent('inked', `${c.name} inked and escaped ${t.name}`, c, t);
      return;
    }
    if (c.hungry) {
      const prey = this.findPrey(c, ['crab', 'urchin']);
      if (prey) {
        const d = Math.hypot(prey.x - c.x, prey.z - c.z);
        if (d < 10) {
          // Pounce.
          this.chase(c, s, prey, 0, 4, 0.2);
        } else {
          this.toward(c, s, { x: prey.x, z: prey.z, h: 0 }, 0.03);
          c.mood = 'hunting';
        }
        return;
      }
    }
    // Head home and hide.
    const home = { x: c.anchorX, z: c.anchorZ, h: 0 };
    if (!nearRock) this.toward(c, s, home, 0.02);
    c.mood = c.hidden ? 'camouflaged' : 'cruising';
  }

  /** Morays wait in their den with just the head out, then strike at passers-by. */
  private thinkEel(c: Creature) {
    const reachOut = Math.hypot(c.x - c.anchorX, c.z - (c.anchorZ + 1));
    let target: Creature | null = null;
    if (c.hungry) {
      let bestD = EEL_REACH * EEL_REACH;
      this.near(this.grid, c.anchorX, c.anchorZ, EEL_REACH, o => {
        if (!o.alive || o.hidden || (o.species !== 'minnow' && o.species !== 'puffer' && o.species !== 'seahorse')) return;
        if (o.species === 'puffer' && o.timer > 0) return;
        const d = (o.x - c.anchorX) ** 2 + (o.z - c.anchorZ) ** 2;
        if (d < bestD && o.h < 25) { bestD = d; target = o; }
      });
    }
    let gx: number, gz: number, gh: number, speed: number;
    if (target) {
      const t = target as Creature;
      gx = t.x; gz = t.z; gh = t.h; speed = SPECIES.eel.burst;
      c.mood = 'striking';
    } else {
      // Peek out of the den, swaying, and slowly withdraw after a strike.
      const peek = 14 + Math.sin(this.tick * 0.03 + c.id) * 3;
      gx = c.anchorX + c.facing * peek; gz = c.anchorZ + 2; gh = 4; speed = 0.08;
      c.mood = 'lurking';
      if (Math.random() < 0.003) c.facing = c.facing > 0 ? -1 : 1;
    }
    const dx = gx - c.x, dz = gz - c.z, dh = gh - c.h;
    const d = Math.hypot(dx, dz, dh);
    if (d > 0.01) {
      const step = Math.min(d, speed);
      c.x += dx / d * step; c.z += dz / d * step; c.h += dh / d * step;
    }
    // Never further out than the body allows.
    const out = Math.hypot(c.x - c.anchorX, c.z - (c.anchorZ + 1));
    if (out > EEL_REACH) {
      c.x = c.anchorX + (c.x - c.anchorX) * EEL_REACH / out;
      c.z = c.anchorZ + 1 + (c.z - c.anchorZ - 1) * EEL_REACH / out;
    }
    if (Math.abs(c.x - c.anchorX) > 0.5) c.facing = c.x > c.anchorX ? 1 : -1;
    c.lunge = Math.min(1, reachOut / EEL_REACH);
    if (target && dist3(target, c) < 3) this.devour(c, target);
  }

  /** Reef sharks patrol slowly and hunt barracuda, octopuses and pufferfish. */
  private thinkShark(c: Creature, s: { x: number; z: number; h: number; max: number; effort: number }) {
    if (c.hungry) {
      if (this.feedOnWhale(c, s, 320)) return;
      const prey = this.findPrey(c, PREY.shark!);
      if (prey) {
        this.chase(c, s, prey, 10, 7, 0.07);
        return;
      }
      if (this.followScent(c, s, 260)) return;
    }
    c.mood = 'cruising';
    this.wander(c, s, 0.012);
  }

  /** Manta rays glide in long, lazy arcs, filtering plankton as they go. */
  private thinkManta(c: Creature, s: { x: number; z: number; h: number; max: number; effort: number }) {
    c.mood = 'gliding';
    c.heading += Math.sin(this.tick * 0.003 + c.id) * 0.004;
    s.x += Math.cos(c.heading) * 0.02;
    s.z += Math.sin(c.heading) * 0.008;
    s.h += (c.cruiseH - c.h) * 0.001;
    this.near(this.foodGrid, c.x, c.z, SPECIES.manta.vision, p => {
      if (p.alive && p.kind === 'plankton' && dist3(p, c) < SPECIES.manta.vision) this.eat(c, p);
    });
  }

  /** Where an anglerfish's glowing lure dangles, in front of and above its head. */
  lureOf(c: Creature) {
    return { x: c.x + c.facing * 8, z: c.z, h: c.h + 6 + Math.sin(this.tick * 0.06 + c.id) * 1.2 };
  }

  /** Anglerfish hang still in the deep and swallow whatever their lure brings in. */
  private thinkAngler(c: Creature, s: { x: number; z: number; h: number; max: number; effort: number }) {
    c.mood = 'lurking';
    let near = Infinity;
    let meal: Creature | null = null;
    const mouth = { x: c.x + c.facing * 6, z: c.z, h: c.h };
    this.near(this.grid, c.x, c.z, 12, o => {
      if (o.species !== 'minnow' || !o.alive) return;
      const d = dist3(o, mouth);
      if (d < near) { near = d; meal = o; }
    });
    // The jaw creeps open as something swims close, then snaps.
    c.lunge += ((near < 10 ? 1 : 0) - c.lunge) * 0.2;
    if (meal && near < 4) {
      this.devour(c, meal, true);
      c.lunge = 0;
    }
    s.max = SPECIES.angler.cruise;
    this.wander(c, s, 0.003);
  }

  /** Where along a food item to aim: whale falls are long, so eaters spread out along them. */
  private foodPoint(c: Creature, t: Particle | Carcass | WhaleFall) {
    if (!('whale' in t)) return t;
    const along = ((c.id * 29) % 41) - 20;
    return { x: t.x + along * t.facing, z: t.z + ((c.id * 13) % 7) - 3, h: t.h + 2 + (c.id % 4) };
  }

  /** Hunters (and anything hungry nearby) feed on a whale fall. */
  private feedOnWhale(c: Creature, s: { x: number; z: number; h: number; max: number; effort: number }, range: number) {
    const wf = this.whale;
    if (!wf?.alive || (wf.x - c.x) ** 2 + (wf.z - c.z) ** 2 > range * range) return false;
    const d = this.toward(c, s, this.foodPoint(c, wf), 0.07);
    s.max = d > 20 ? SPECIES[c.species].burst * 0.7 : SPECIES[c.species].cruise;
    c.mood = 'scavenging';
    if (d < 5 && this.tick % 8 === 0) this.eat(c, wf);
    return true;
  }

  private addScent(x: number, z: number, strength: number) {
    this.scents.push({ x, z, strength, alive: true });
    if (this.scents.length > MAX_SCENTS) {
      this.scents.sort((a, b) => b.strength - a.strength);
      this.scents.length = MAX_SCENTS;
    }
  }

  /**
   * Follows the strongest scent of blood within range (stronger and nearer
   * is better); scents it has already reached are ignored.
   */
  private followScent(c: Creature, s: { x: number; z: number; h: number; max: number; effort: number }, range: number) {
    let best: Scent | null = null;
    let bestScore = 0;
    for (const sc of this.scents) {
      const d = Math.hypot(sc.x - c.x, sc.z - c.z);
      if (d > range || d < 8) continue;
      const score = sc.strength / (1 + d / 40);
      if (score > bestScore) { bestScore = score; best = sc; }
    }
    if (!best) return false;
    this.toward(c, s, { x: best.x, z: best.z, h: c.h }, 0.05);
    s.max = SPECIES[c.species].cruise * 1.5;
    c.mood = 'tracking';
    return true;
  }

  /** Scent drifts with a slow current, fades, and gives off faint wisps. */
  private updateScents() {
    this.currentAngle += rand(-0.01, 0.01);
    const dx = Math.cos(this.currentAngle) * 0.03;
    const dz = Math.sin(this.currentAngle) * 0.02;
    for (const sc of this.scents) {
      sc.strength *= 0.996;
      sc.x = Math.max(0, Math.min(this.w - 1, sc.x + dx));
      sc.z = Math.max(0, Math.min(this.h - 1, sc.z + dz));
      if (sc.strength < 0.05) { sc.alive = false; continue; }
      if (Math.random() < sc.strength * 0.08) {
        this.splash('scent', { x: sc.x + rand(-4, 4), z: sc.z + rand(-3, 3), h: rand(2, 24) }, 1, [70, 130], 0.05);
      }
    }
  }

  /** Anemones sting small fish that brush against them, and flinch shut. */
  private updateAnemones() {
    for (const a of this.anemones) {
      a.retract *= 0.97;
      this.near(this.grid, a.x, a.z, 5, o => {
        if (!o.alive || o.species === 'clownfish' || o.h > 7) return;
        if ((o.x - a.x) ** 2 + (o.z - a.z) ** 2 > 16) return;
        a.retract = 1;
        if (STUNG_BY_ANEMONES.includes(o.species) && Math.random() < 0.03) this.kill(o, 'stung', null, false, 'An anemone');
      });
    }
  }

  /** Clownfish bob about their anemone and dart into its tentacles when anything big comes by. */
  private thinkClownfish(c: Creature, s: { x: number; z: number; h: number; max: number; effort: number }) {
    if (!c.anemone?.alive) {
      let best: Anemone | null = null;
      let bestD = 300 * 300;
      for (const a of this.anemones) {
        const d = (a.x - c.x) ** 2 + (a.z - c.z) ** 2;
        if (d < bestD) { bestD = d; best = a; }
      }
      c.anemone = best;
      if (!best) { c.mood = 'cruising'; this.wander(c, s); return; }
    }
    const a = c.anemone!;
    c.homeZ = a.z;
    const home = { x: a.x, z: a.z, h: 3 };
    let threat = false;
    this.near(this.grid, c.x, c.z, 24, o => {
      if (CLOWNFISH_THREATS.includes(o.species) && !o.station && (o.x - c.x) ** 2 + (o.z - c.z) ** 2 < 24 * 24) threat = true;
    });
    const d = dist3(c, home);
    c.hidden = d < 3;
    if (threat) {
      this.toward(c, s, home, 0.15);
      s.max = SPECIES.clownfish.burst;
      c.mood = c.hidden ? 'hiding' : 'fleeing';
      return;
    }
    if (c.hungry) {
      // Only snaps up plankton that drifts close to home.
      let food: Particle | null = null;
      let bestD = 16 * 16;
      this.near(this.foodGrid, a.x, a.z, 16, p => {
        if (p.kind !== 'plankton') return;
        const dd = (p.x - a.x) ** 2 + (p.z - a.z) ** 2;
        if (dd < bestD) { bestD = dd; food = p; }
      });
      if (food) {
        const t = food as Particle;
        const fd = this.toward(c, s, t, 0.06, 3);
        c.mood = 'foraging';
        if (fd < 2.5) this.eat(c, t);
        return;
      }
    }
    // Bob in little loops over the tentacles.
    const angle = this.tick * 0.05 + c.id;
    this.toward(c, s, { x: a.x + Math.cos(angle) * 4, z: a.z + Math.sin(angle) * 2, h: 4 + Math.sin(angle * 1.7) * 2 }, 0.03);
    c.mood = 'nestled';
  }

  /**
   * Starfish creep over the seabed. They pin an urchin and slowly eat it,
   * scavenge whatever has died, and regrow arms the crabs nip off.
   */
  private thinkStarfish(c: Creature, s: { x: number; z: number; h: number; max: number; effort: number }) {
    if (c.limbs < 5 && c.age % 1500 === 0) c.limbs++;
    if (c.timer > 0) {
      c.timer--;
      c.mood = 'eating';
      s.max = 0;
      const prey = c.prey;
      if (!prey?.alive) { c.timer = 0; c.prey = null; return; }
      prey.dazed = Math.max(prey.dazed, 5);
      if (c.timer === 0) this.devour(c, prey, true);
      return;
    }
    if (c.hungry) {
      const prey = this.findPrey(c, ['urchin']);
      if (prey) {
        const d = this.toward(c, s, { x: prey.x, z: prey.z, h: 0 }, 0.01);
        c.heading += 0.004;
        c.mood = 'hunting';
        if (d < 3) { c.timer = 240; c.prey = prey; }
        return;
      }
      let food: Carcass | null = null;
      let bestD = SPECIES.starfish.vision ** 2;
      for (const k of this.carcasses) {
        if (k.h > 1) continue;
        const dd = (k.x - c.x) ** 2 + (k.z - c.z) ** 2;
        if (dd < bestD) { bestD = dd; food = k; }
      }
      if (food) {
        const t = food as Carcass;
        const d = this.toward(c, s, { x: t.x, z: t.z, h: 0 }, 0.01);
        c.mood = 'scavenging';
        if (d < 3 && this.tick % 20 === 0) this.eat(c, t);
        return;
      }
    }
    c.mood = 'cruising';
    c.heading += rand(-0.03, 0.03);
    s.x += Math.cos(c.heading) * 0.004;
    s.z += Math.sin(c.heading) * 0.003;
  }

  /**
   * Cuttlefish hover near the reef. Hunting, they creep up, hold still and
   * ripple bands of colour until the prey stops moving, then shoot out their
   * tentacles. Threatened, they ink and jet away.
   */
  private thinkCuttlefish(c: Creature, s: { x: number; z: number; h: number; max: number; effort: number }) {
    if (this.fleeFrom(c, s, 'shark', 30) || this.fleeFrom(c, s, 'barracuda', 22) || this.fleeFrom(c, s, 'dolphin', 30)) {
      if (c.timer > 0 && Math.random() < 0.5) this.splash('ink', c, 14, [100, 200]);
      c.timer = 0;
      c.lunge = 0;
      c.prey = null;
      return;
    }
    if (c.hungry) {
      const prey = c.prey?.alive ? c.prey : this.findPrey(c, ['minnow', 'crab', 'clownfish']);
      if (prey) {
        c.prey = prey;
        const d = dist3(prey, c);
        if (c.timer === 0 && d > 14) {
          this.toward(c, s, prey, 0.03);
          c.mood = 'hunting';
          c.lunge = 0;
          return;
        }
        if (d > 26) { c.timer = 0; c.prey = null; return; }
        c.facing = prey.x > c.x ? 1 : -1;
        c.timer++;
        s.max = 0.02;
        prey.dazed = Math.max(prey.dazed, 6);
        if (c.timer < HYPNO_TICKS) { c.mood = 'hypnotising'; c.lunge = 0; return; }
        c.mood = 'striking';
        c.lunge = Math.min(1, c.lunge + 0.2);
        if (c.lunge >= 1) {
          if (d < 22) this.devour(c, prey, true);
          c.timer = 0;
          c.prey = null;
        }
        return;
      }
    }
    c.timer = 0;
    c.lunge = Math.max(0, c.lunge - 0.1);
    c.mood = 'cruising';
    this.wander(c, s, 0.01);
  }

  // --- debug tools (the hidden panel) --------------------------------------

  /**
   * Spawns a grown creature at a point. Creatures with a home settle into
   * the nearest one: morays a rock den, octopuses a rock, clownfish an
   * anemone, seahorses a kelp stalk. Dolphins arrive as a pod.
   */
  debugSpawn(species: Species, x: number, z: number) {
    if (species === 'dolphin') { this.debugPod(x, z); return; }
    const c = this.spawn(species, null, 0.8);
    c.age = SPECIES[species].mature;
    c.x = Math.max(2, Math.min(this.w - 3, x));
    c.z = Math.max(2, Math.min(this.h - 3, z));
    c.homeZ = c.z;
    if (species === 'eel') this.giveDen(c);
    if (species === 'octopus') this.giveHomeRock(c);
    if (species === 'clownfish') {
      c.anemone = this.anemones.reduce<Anemone | null>((best, a) =>
        !best || (a.x - x) ** 2 + (a.z - z) ** 2 < (best.x - x) ** 2 + (best.z - z) ** 2 ? a : best, null);
      if (c.anemone) { c.x = c.anemone.x; c.z = c.anemone.z; c.homeZ = c.z; }
    }
    if (species === 'seahorse') {
      c.kelp = this.nearestKelp(c, 400);
      if (c.kelp) { c.x = c.kelp.x; c.z = c.kelp.z; c.homeZ = c.z; }
    }
    this.logEvent('visit', `${c.name} was dropped into the reef`, c);
  }

  /** Drops a whale fall right here, replacing any that is already down. */
  debugWhale(x: number, z: number) {
    this.startWhaleFall(x, z);
  }

  /** Sends the dolphins in now, after the school nearest this point. */
  debugPod(x: number, z: number) {
    for (const c of this.creatures) if (c.species === 'dolphin') c.alive = false;
    this.pod = null;
    this.spawnPod({ x, z });
  }

  /** A strong scent of blood here, to watch the hunters come. */
  debugScent(x: number, z: number) {
    this.addScent(x, z, 3);
    this.splash('blood', { x, z, h: 10 }, 20);
  }

  /** Loads every big fish with parasites, so they all head for the cleaners. */
  debugParasites() {
    for (const c of this.creatures) if (CLEANED.includes(c.species)) c.parasites = 1;
  }

  // --- visitors -------------------------------------------------------------

  /** A whale carcass sinks every few minutes, feeds the reef, and leaves its bones. */
  private updateWhale() {
    const wf = this.whale;
    if (!wf) {
      if (this.tick >= this.nextWhale) this.startWhaleFall(rand(30, this.w - 30), rand(60, this.h - 40));
      return;
    }
    if (!wf.landed) {
      wf.vh = Math.max(-0.22, wf.vh - 0.004);
      wf.h = Math.max(0, wf.h + wf.vh);
      if (this.tick % 6 === 0) this.bubbles.push({ x: wf.x + rand(-20, 20), z: wf.z, h: wf.h + 4, phase: rand(0, 6), alive: true });
      if (wf.h <= 0) {
        wf.landed = true;
        // A great cloud of sand thrown up along its length.
        for (let k = 0; k < 6; k++) this.splash('sand', { x: wf.x + rand(-22, 22), z: wf.z + rand(-3, 3), h: 1 }, 10, [50, 110], 0.6);
        this.addScent(wf.x, wf.z, 2);
        this.logEvent('visit', 'A whale fall hit the seabed: the feast begins');
      }
      return;
    }
    if (wf.mass > 0) {
      wf.mass = Math.max(0, wf.mass - 0.2);
      if (this.tick % 20 === 0) this.fertilise(wf.x, wf.z, 4, 24);
      if (this.tick % 40 === 0) this.addScent(wf.x + rand(-15, 15), wf.z, 1.2);
      if (wf.mass <= 0) {
        wf.alive = false;
        wf.bonesUntil = this.tick + 3600;
        this.logEvent('visit', 'The whale fall has been picked down to bones');
      }
    } else if (this.tick > wf.bonesUntil) {
      this.whale = null;
      this.nextWhale = this.tick + randInt(7200, 10800);
    }
  }

  /** Every few minutes a pod of dolphins arrives to herd a school into a bait ball. */
  private updatePod() {
    const pod = this.pod;
    if (!pod) {
      if (this.tick >= this.nextPod) this.spawnPod();
      return;
    }
    const pod2 = this.creatures.filter(c => c.species === 'dolphin' && c.alive);
    if (!pod2.length) {
      this.pod = null;
      this.nextPod = this.tick + randInt(5400, 9000);
      return;
    }
    if (pod.phase !== 'leave' && this.tick % 20 === 0) {
      // Keep the circle centred on the school; if it slips away, go after
      // the nearest minnows instead. Only an empty sea sends them home.
      let n = 0, cx = 0, cz = 0, ch = 0;
      this.near(this.grid, pod.cx, pod.cz, 60, o => {
        if (o.species !== 'minnow' || (o.x - pod.cx) ** 2 + (o.z - pod.cz) ** 2 > 60 * 60) return;
        n++; cx += o.x; cz += o.z; ch += o.h;
      });
      if (n >= 4) { pod.cx = cx / n; pod.cz = cz / n; pod.ch = Math.max(10, ch / n); }
      else {
        let best: Creature | null = null;
        let bestD = 160 * 160;
        for (const o of this.creatures) {
          if (o.species !== 'minnow' || !o.alive) continue;
          const d = (o.x - pod.cx) ** 2 + (o.z - pod.cz) ** 2;
          if (d < bestD) { bestD = d; best = o; }
        }
        if (best) { pod.cx = best.x; pod.cz = best.z; pod.ch = Math.max(10, best.h); }
        else pod.phase = 'leave';
      }
    }
    if (pod.phase === 'arrive' && pod2.some(d => Math.hypot(d.x - pod.cx, d.z - pod.cz) < 40)) {
      pod.phase = 'herd';
      pod.until = this.tick + 750;
    }
    if (pod.phase === 'herd') {
      if (this.tick > pod.until || pod.eaten >= 40) {
        pod.phase = 'leave';
        this.logEvent('visit', 'The dolphins are heading back out to sea');
      } else if (this.tick >= pod.diveUntil + 20) {
        // Take turns diving through the ball.
        pod.diver = (pod.diver + 1) % pod2.length;
        pod.diveUntil = this.tick + 45;
        pod.diveCatch = 0;
      }
    }
    if (pod.phase === 'arrive' && this.tick > pod.until) pod.phase = 'leave';
  }

  private startWhaleFall(x: number, z: number) {
    this.whale = {
      x: Math.max(30, Math.min(this.w - 30, x)), z: Math.max(10, Math.min(this.h - 10, z)), h: SURFACE - 10, vh: 0,
      facing: Math.random() < 0.5 ? 1 : -1,
      mass: WHALE_MASS, fullMass: WHALE_MASS, alive: true, landed: false, bonesUntil: 0,
      whale: true,
    };
    this.logEvent('visit', 'A whale carcass is sinking toward the reef');
  }

  /** Sends a pod after a school: the one nearest `near` if given, else one in the shallows. */
  private spawnPod(near?: { x: number; z: number }) {
    const minnows = this.creatures.filter(c => c.species === 'minnow' && c.alive);
    if (minnows.length < (near ? 1 : 20)) { this.nextPod = this.tick + 1800; return; }
    const shallow = minnows.filter(c => c.z < SHALLOWS * 1.5);
    const nearest = near && minnows.reduce((a, b) => ((a.x - near.x) ** 2 + (a.z - near.z) ** 2 < (b.x - near.x) ** 2 + (b.z - near.z) ** 2 ? a : b));
    const school = nearest ?? (shallow.length ? shallow : minnows)[randInt(0, (shallow.length || minnows.length) - 1)];
    const side: 1 | -1 = school.x < this.w / 2 ? -1 : 1;
    const size = randInt(3, 5);
    for (let k = 0; k < size; k++) {
      const d = this.spawn('dolphin', null, 1);
      d.x = side < 0 ? 3 + k * 3 : this.w - 4 - k * 3;
      d.z = school.z + rand(-12, 12);
      d.homeZ = d.z;
      d.h = 25;
      d.podIndex = k;
      d.facing = side < 0 ? 1 : -1;
    }
    this.pod = { cx: school.x, cz: school.z, ch: Math.max(10, school.h), phase: 'arrive', until: this.tick + 1200, diver: -1, diveUntil: 0, side, eaten: 0, diveCatch: 0 };
    this.logEvent('visit', `A pod of ${size} dolphins has arrived`);
  }

  /**
   * Dolphins circle a school to pack it into a bait ball, take turns diving
   * through it, then leave the way they came.
   */
  private thinkDolphin(c: Creature, s: { x: number; z: number; h: number; max: number; effort: number }) {
    c.homeZ = c.z;
    c.energy = 1;
    const pod = this.pod;
    if (!pod || pod.phase === 'leave') {
      const edge = (pod?.side ?? 1) < 0 ? 0 : this.w;
      this.toward(c, s, { x: edge, z: c.z, h: 30 }, 0.08);
      s.max = SPECIES.dolphin.burst * 0.8;
      c.mood = 'leaving';
      if (c.x < 8 || c.x > this.w - 9) c.alive = false;
      return;
    }
    const centre = { x: pod.cx, z: pod.cz, h: pod.ch };
    if (pod.phase === 'arrive') {
      this.toward(c, s, centre, 0.08);
      s.max = SPECIES.dolphin.burst * 0.8;
      c.mood = 'hunting';
      return;
    }
    const n = this.creatures.filter(o => o.species === 'dolphin' && o.alive).length || 1;
    const diving = pod.diver === c.podIndex % n && this.tick < pod.diveUntil;
    if (diving) {
      // Through the middle of the ball and out the far side.
      const dx = pod.cx - c.x, dz = pod.cz - c.z;
      const d = Math.hypot(dx, dz) || 1;
      this.toward(c, s, { x: pod.cx + dx / d * 18, z: pod.cz + dz / d * 18, h: pod.ch }, 0.25);
      s.max = SPECIES.dolphin.burst;
      s.effort = 2;
      c.mood = 'diving';
      if (this.tick % 3 === 0) this.bubbles.push({ x: c.x - c.facing * 6, z: c.z, h: c.h + 1, phase: rand(0, 6), alive: true });
      const mouth = { x: c.x + c.facing * 10, z: c.z, h: c.h };
      this.near(this.grid, mouth.x, mouth.z, 6, o => {
        if (o.species === 'minnow' && o.alive && pod.diveCatch < 2 && dist3(o, mouth) < 5) {
          this.devour(c, o, true);
          pod.eaten++;
          pod.diveCatch++;
        }
      });
      return;
    }
    const angle = this.tick * 0.035 + (c.podIndex * Math.PI * 2) / n;
    this.toward(c, s, { x: pod.cx + Math.cos(angle) * 26, z: pod.cz + Math.sin(angle) * 18, h: pod.ch + Math.sin(angle * 2) * 4 }, 0.12);
    s.max = SPECIES.dolphin.cruise * 1.4;
    c.mood = 'herding';
  }

  /** Steers toward food. Minnows prefer drifting food, then graze the algae. */
  private forage(c: Creature, s: { x: number; z: number; h: number }): boolean {
    if (c.food && !c.food.alive) c.food = null;
    if (--c.scanIn <= 0 || (!c.food && c.grazeCell < 0 && c.scanIn < 6)) {
      c.scanIn = 12;
      c.food = this.scanForFood(c);
      if (c.food) c.grazeCell = -1;
      else if ((c.species === 'minnow' || c.species === 'puffer') && c.grazeCell < 0) c.grazeCell = this.scanForAlgae(c);
    }

    if (c.food) {
      const t = c.food;
      const d = this.toward(c, s, this.foodPoint(c, t), 0.06, 4);
      c.mood = 'whale' in t ? 'scavenging' : 'foraging';
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

  private scanForFood(c: Creature): Particle | Carcass | WhaleFall | null {
    const r = SPECIES[c.species].vision;
    let best: Particle | Carcass | WhaleFall | null = null;
    let bestScore = r * r;
    const consider = (t: Particle | Carcass | WhaleFall, weight: number) => {
      const score = ((t.x - c.x) ** 2 + (t.z - c.z) ** 2 + (t.h - c.h) ** 2) * weight;
      if (score < bestScore) { bestScore = score; best = t; }
    };
    this.near(this.foodGrid, c.x, c.z, r, p => {
      if (c.species === 'minnow' || c.species === 'puffer') consider(p, p.kind === 'pellet' ? 0.4 : 1);
      else if (p.kind === 'pellet') consider(p, 1);
    });
    for (const k of this.carcasses) {
      if (k.species !== 'jelly' && k.mass > 0) consider(k, 0.8);
    }
    // A whale fall is worth a long swim.
    const wf = this.whale;
    if (wf?.alive && (wf.x - c.x) ** 2 + (wf.z - c.z) ** 2 < (r * 4) ** 2) consider(wf, 0.05);
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

  private eat(c: Creature, t: Particle | Carcass | WhaleFall) {
    const units = SPECIES[c.species].units;
    if ('fullMass' in t) {
      const big = c.species === 'shark' ? 5 : c.species === 'barracuda' || c.species === 'turtle' ? 2 : 1;
      if ('whale' in t) {
        // A whale is huge: each eater takes a bite now and then, and a bite
        // that fills a fish is only a sliver of the carcass.
        if ((this.tick + c.id) % 8) return;
        const bite = BITE_UNITS * big;
        t.mass = Math.max(0, t.mass - bite * WHALE_BITE_SHARE);
        c.energy = Math.min(1, c.energy + bite / units);
        if (Math.random() < 0.3) this.splash('blood', { x: c.x, z: c.z, h: Math.max(1, c.h) }, 2);
        return;
      }
      const bite = Math.min(t.mass, BITE_UNITS * big);
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

  /** The nearest prey this hunter can see; prey hiding in kelp only shows up close. */
  private findPrey(c: Creature, species: Species[]) {
    const seen = (o: Creature, d2: number) =>
      (!o.hidden || d2 < HIDDEN_SIGHT * HIDDEN_SIGHT) && !(o.species === 'puffer' && o.timer > 0);
    const p = c.prey;
    if (p && p.alive) {
      const d2 = (p.x - c.x) ** 2 + (p.z - c.z) ** 2;
      if (d2 < 80 * 80 && seen(p, d2)) return p;
    }
    let best: Creature | null = null;
    let bestD = SPECIES[c.species].vision ** 2;
    this.near(this.grid, c.x, c.z, SPECIES[c.species].vision, o => {
      if (!species.includes(o.species) || !o.alive) return;
      const d = (o.x - c.x) ** 2 + (o.z - c.z) ** 2 + (o.h - c.h) ** 2;
      if (d < bestD && seen(o, d)) { bestD = d; best = o; }
    });
    c.prey = best;
    return best;
  }

  // --- death --------------------------------------------------------------

  private die(c: Creature, cause: 'starved' | 'oldAge') {
    this.kill(c, cause, null);
  }

  /**
   * Ends a creature. Bitten ones are torn in half in a spray of blood (or
   * burst into goo, for jellyfish); the rest go belly-up and sink.
   */
  private kill(c: Creature, cause: DeathCause, killer: Creature | null, swallow = false, by = 'A jellyfish') {
    c.alive = false;
    this.deaths[cause]++;
    if (cause === 'eaten' || cause === 'stung') this.addScent(c.x, c.z, 1);
    const sp = SPECIES[c.species];
    const mass = Math.round(sp.body + Math.max(0, c.energy) * sp.units * 0.3);
    const base = { species: c.species, palette: c.palette, x: c.x, z: c.z, h: c.h, facing: c.facing, alive: true };

    if (cause === 'eaten' && c.species === 'jelly') {
      this.splash('goo', c, 16);
      this.logEvent(cause, `${killer?.name ?? 'Something'} ate ${c.name}`, killer, c);
      return;
    }
    if (cause === 'eaten' && swallow) {
      this.splash(c.species === 'urchin' || c.species === 'starfish' ? 'goo' : 'blood', c, 5);
      this.logEvent(cause, `${killer?.name ?? 'Something'} swallowed ${c.name} whole`, killer, c);
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
      this.logEvent(cause, `${killer?.name ?? 'Something'} bit ${c.name} in half`, killer, c);
      return;
    }

    this.carcasses.push({ ...base, part: 'whole', vx: c.vx * 0.3, vz: c.vz * 0.3, vh: 0, angle: 0, spin: 0, mass, fullMass: mass });
    if (cause === 'stung') {
      this.splash('blood', c, 6);
      this.logEvent(cause, `${killer?.name ?? by} stung ${c.name}`, killer, c);
    } else {
      this.logEvent(cause, `${c.name} ${cause === 'starved' ? 'starved' : 'died of old age'}`, c);
    }
  }

  private splash(kind: Drop['kind'], at: { x: number; z: number; h: number }, count: number, lives: [number, number] = [50, 130], maxSpeed = kind === 'ink' ? 0.3 : 0.45) {
    for (let k = 0; k < count; k++) {
      const a = rand(0, Math.PI * 2);
      const speed = rand(0.05, maxSpeed);
      const life = randInt(lives[0], lives[1]);
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
      // Ink hangs in the water, hearts and sparkles float up, scent wisps
      // drift, and blood, goo and sand sink.
      switch (d.kind) {
        case 'ink': d.vh *= 0.92; break;
        case 'heart': case 'sparkle': d.vh = d.vh * 0.9 + 0.006; break;
        case 'scent': d.vh = d.vh * 0.95 + 0.002; d.vx += Math.cos(this.currentAngle) * 0.004; break;
        default: d.vh = d.vh * 0.92 - 0.004;
      }
      d.x += d.vx;
      d.z += d.vz;
      d.h += d.vh;
      if (d.h <= 0) {
        d.alive = false;
        if (d.kind === 'blood' && Math.random() < 0.7) {
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
