/**
 * The hot pot page's world: a split pot of broth seen from above, built the
 * same way as the space page (after cobanov/pixelart-gaussiansplat). Every
 * ingredient is a cloud of small flat discs (surfels) with a material and a
 * shade; steam and splashes are soft glows. The broth itself isn't geometry:
 * `lib/hotpotView.ts` paints it in the pixel pass wherever no ingredient is,
 * with its oil, bubbles and ripples, so it can fill the whole page for free.
 *
 * No DOM. Coordinates are CSS pixels: x across the page, y down it, z up out
 * of the broth towards the viewer. The broth's surface is the plane z = 0,
 * which scrolls exactly with the content; things lifted out of it (by the
 * chopsticks) come up towards the camera.
 */

import { HotpotLife, populateLife } from './hotpotLife';
import { HotpotEvents, populateEvents } from './hotpotEvents';

export const FOV_Y = (45 * Math.PI) / 180;
export const focalFor = (viewH: number) => viewH / 2 / Math.tan(FOV_Y / 2);

/** Surfel spacing, in CSS pixels as seen on screen. */
export const SPACING = 3;
/** Disc radius as a share of the spacing, so neighbours overlap. */
export const DISC = 0.85;

// ---------------------------------------------------------------- palette ---

/**
 * Material ramps, darkest first (6 shades each). A surfel flagged `F.cook`
 * turns into the ramp right after its own as its ingredient cooks, and one
 * flagged `F.over` into the one after that if it's left in too long, so raw,
 * cooked and overcooked sit next to each other.
 */
export const RAMPS: string[][] = [
  /* 0  steel        */ ['#1a1414', '#3a3434', '#5e5a58', '#8a8682', '#bab6ae', '#f0ece2'],
  /* 1  beef raw     */ ['#3a0a12', '#5e1018', '#861c24', '#ac2c34', '#cc4448', '#ec6c6a'],
  /* 2  beef cooked  */ ['#2a1410', '#3e221a', '#563428', '#6e4836', '#8a5e48', '#a87a5c'],
  /* 3  beef over    */ ['#24181a', '#382a2a', '#4e403c', '#665850', '#807268', '#9c8e84'],
  /* 4  fat raw      */ ['#5a3a40', '#946e74', '#c4a2a4', '#e6cac8', '#f8e8e6', '#ffffff'],
  /* 5  fat cooked   */ ['#4a3a30', '#6a5444', '#8a725a', '#a89072', '#c6ae8c', '#e2cca8'],
  /* 6  fat over     */ ['#3e3630', '#5a5048', '#766a5e', '#928676', '#aca08e', '#c6baa6'],
  /* 7  shrimp raw   */ ['#26283a', '#46485e', '#6c7086', '#989eac', '#c6cad2', '#eef0f2'],
  /* 8  shrimp done  */ ['#5a1410', '#982a16', '#d44e28', '#f27e48', '#ffb486', '#ffe6cc'],
  /* 9  tofu         */ ['#4a4030', '#887a5e', '#c2b28c', '#e4d8b6', '#f6eed6', '#fffcf0'],
  /* 10 tofu stained */ ['#5a2010', '#923e1c', '#c4682e', '#e6944a', '#f8be78', '#ffecc4'],
  /* 11 dough raw    */ ['#5a5450', '#98928a', '#ccc6ba', '#ebe5d8', '#f9f5ec', '#ffffff'],
  /* 12 dough done   */ ['#3e4234', '#767c62', '#aab292', '#d0d6b6', '#e8ecd2', '#f8faea'],
  /* 13 leaf         */ ['#0e2a14', '#1a4a1e', '#2a7028', '#4a9a34', '#7cc448', '#c0ec7a'],
  /* 14 leaf cooked  */ ['#082010', '#103a18', '#185a22', '#24802c', '#46a83a', '#8cd060'],
  /* 15 leaf over    */ ['#0e1408', '#1a240e', '#2a3614', '#3c4a1c', '#526226', '#6c7c34'],
  /* 16 stem         */ ['#3a4a2a', '#6a8a4a', '#a0c078', '#cce4a4', '#e8f6cc', '#fbfff0'],
  /* 17 shiitake     */ ['#1e0e08', '#3a1e10', '#5e341c', '#86502e', '#b07a4c', '#d8a878'],
  /* 18 enoki        */ ['#4a4030', '#80745a', '#b8aa84', '#ddd2ac', '#f2eccc', '#fffbea'],
  /* 19 enoki        */ ['#4a4030', '#80745a', '#b8aa84', '#ddd2ac', '#f2eccc', '#fffbea'],
  /* 20 enoki limp   */ ['#3a3424', '#5e5640', '#82785a', '#a49a78', '#c2b896', '#dcd4b4'],
  /* 21 lotus        */ ['#4a3a34', '#8a766a', '#bca898', '#ddccbc', '#f2e6d8', '#fffaf2'],
  /* 22 lotus soaked */ ['#4a2420', '#7a3a30', '#a8584a', '#c87a66', '#e09a84', '#f4bca4'],
  /* 23 corn         */ ['#4a2a04', '#8a5a08', '#c89014', '#f0c030', '#ffe060', '#fff4a8'],
  /* 24 corn soaked  */ ['#4a1a04', '#8a3a08', '#c05a14', '#e48030', '#f6a850', '#ffd080'],
  /* 25 chili        */ ['#2a0404', '#5a0a0a', '#9a140e', '#d02a14', '#f0502a', '#ff9060'],
  /* 26 wood ear     */ ['#0e0608', '#1e0c10', '#321418', '#4a2024', '#683230', '#8c4c40'],
  /* 27 anise        */ ['#1a0a04', '#3a1a0a', '#5e2e14', '#844420', '#a86434', '#cc8a54'],
  /* 28 scallion     */ ['#123a10', '#1e5a16', '#2e8420', '#4cac2e', '#86d44a', '#cef68a'],
  /* 29 wood         */ ['#2a1408', '#4a2410', '#74401c', '#a0642c', '#c88c48', '#ecbc78'],
  /* 30 goji         */ ['#3a0806', '#6a120a', '#a8200e', '#e03e16', '#ff6e2a', '#ffb070'],
  /* 31 pepper       */ ['#1a0806', '#2e100a', '#46180e', '#602414', '#7a321c', '#984428'],
  /* 32 fishball     */ ['#4a4a50', '#88888e', '#c2c2c0', '#e2e0da', '#f6f4ee', '#ffffff'],
  /* 33 fishball pf  */ ['#4a4438', '#8a8270', '#c4baa0', '#e4dcc4', '#f6f0e0', '#fffcf4'],
  /* 34 lacquer      */ ['#2a0408', '#520a10', '#86121a', '#b82026', '#e04434', '#ff8060'],
  /* 35 fish raw     */ ['#2e2a34', '#4a4652', '#6e6a76', '#948e98', '#bab4bc', '#dcd8de'],
  /* 36 fish cooked  */ ['#4a4440', '#86807a', '#bcb6ae', '#e0dcd4', '#f4f2ec', '#ffffff'],
  /* 37 fish over    */ ['#4a4438', '#867e6c', '#bab09a', '#dcd4be', '#f0ead8', '#fcf8ee'],
  /* 38 noodle raw   */ ['#4a4640', '#86827a', '#bcb8ae', '#dedad0', '#f2f0ea', '#ffffff'],
  /* 39 noodle clear */ ['#2e3a3e', '#46585c', '#6a8284', '#94acac', '#c4dcd8', '#f4fffc'],
  /* 40 quail shell  */ ['#4a3826', '#7a6040', '#a8885e', '#cbaa7e', '#e2c69c', '#f4e0be'],
  /* 41 shell speck  */ ['#1e140c', '#2e2016', '#3e2c1e', '#4e3a28', '#5e4832', '#70583e'],
  /* 42 meat raw     */ ['#3a1a18', '#5e2c28', '#86443c', '#a8604e', '#c47e66', '#dca088'],
  /* 43 meat cooked  */ ['#26140c', '#3e2414', '#5a381e', '#78502c', '#946c3e', '#b08a56'],
  /* 44 tripe        */ ['#3a3830', '#5e5a4e', '#86806e', '#aaa48e', '#c8c2aa', '#e2dcc4'],
  /* 45 rice raw     */ ['#4a4844', '#82807a', '#b6b2aa', '#d8d4cc', '#ece8e0', '#f8f6f0'],
  /* 46 rice glossy  */ ['#40444a', '#767c84', '#aab0b6', '#d2d8dc', '#eef2f4', '#ffffff'],
  /* 47 tofu puff    */ ['#4a2a08', '#7e4a14', '#b47224', '#d8963a', '#eeb858', '#fcd884'],
  /* 48 puff soaked  */ ['#2a1406', '#46220c', '#663614', '#864c20', '#a4642e', '#c08040'],
  /* 49 crab red     */ ['#3a0a0a', '#6a1410', '#a02418', '#cc3c24', '#ec6038', '#ff9060'],
  /* 50 squid raw    */ ['#3a2c34', '#5c4a54', '#806c76', '#a49098', '#c6b4ba', '#e4d8dc'],
  /* 51 squid done   */ ['#4a4644', '#86827e', '#bcb8b2', '#e0ddd6', '#f4f2ee', '#ffffff'],
  /* 52 napa         */ ['#2a3a1a', '#4a6430', '#74904a', '#a2bc70', '#cce098', '#ecf8c4'],
  /* 53 napa limp    */ ['#26301e', '#3e4c32', '#5a6a48', '#788a60', '#98aa7c', '#b8c89a'],
  /* 54 napa rib     */ ['#4a4a3c', '#7e8068', '#b0b298', '#d6d8c0', '#eef0dc', '#fcfff2'],
  /* 55 rib limp     */ ['#34382c', '#565c48', '#7a8266', '#9ea688', '#bec6a6', '#dae0c4'],
  /* 56 egg ribbon   */ ['#5a4a1a', '#8a7430', '#bca24a', '#e2c86a', '#f6e294', '#fff6c8'],
];
export const SHADES = 6;
export const M = {
  steel: 0, beef: 1, fat: 4, shrimp: 7, tofu: 9, dough: 11, leaf: 13, stem: 16,
  shiitake: 17, enoki: 18, lotus: 21, corn: 23, chili: 25, woodear: 26, anise: 27,
  scallion: 28, wood: 29, goji: 30, pepper: 31, fishball: 32, lacquer: 34,
  fish: 35, noodle: 38, shell: 40, speck: 41, meat: 42, tripe: 44, rice: 45, puff: 47,
  crab: 49, squid: 50, napa: 52, rib: 54, yolk: 56,
} as const;

/** What the broth, steam and splashes snap to: chili-oil reds, oil gold, bone-broth creams, a few garnish greens. */
export const BROTH_PALETTE = [
  // Mala: deep chili reds up to the oil's orange and gold.
  '#1e0406', '#320808', '#4a0c0a', '#64120c', '#801a0e', '#a02612', '#c03814', '#dc5418', '#f07824', '#ffa040', '#ffcc6a',
  // Bone broth: shadowed tan up to milky cream.
  '#5e5040', '#7e6e58', '#9e8c70', '#bca888', '#d4c4a2', '#e6dabc', '#f2ead4', '#fcf6e8',
  // Fat droplets and steam over the reds.
  '#f6d690', '#e8a08c', '#f8d0c0',
  // Garnish flecks.
  '#4a8a2a', '#8cc44a',
];
/** Which broth each palette colour belongs to (-1 mala, 1 bone, 0 either), so neither side dithers in the other's colours. */
export const PALETTE_SIDE = [-1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, 1, 1, 1, 1, 1, 1, 1, 1, 1, -1, -1, 0, 0];

/** Surfel flags. Bits 8–11 hold the surfel's place in its cooking order (0 cooks first), bits 12–15 the piece it breaks off with. */
export const F = {
  emissive: 1, twoSided: 2,
  /** Turns into the next ramp as the body's cook state (params[2]) passes its place in the order. */
  cook: 4,
  /** Curls up at both ends along local x by params[0] (beef as it cooks; negative droops). */
  curl: 8,
  /** Wet and shiny: a highlight where it faces the lamp. */
  gloss: 16,
  /** Turns into the ramp two after its own as the body's overcook state (params[1]) passes its place. */
  over: 32,
  /** Drifts away from the middle with its piece as params[1] rises (fish flaking, crab sticks unrolling, shell cracking). */
  flake: 64,
  /** With flake: sinks as it goes, and is gone by the end (eggshell). */
  shed: 128,
  /** Ripples along local x as time passes (tripe). */
  ripple: 1 << 17,
  /** Curls along local y too, into a dome (squid scoring opening into a pinecone). */
  curl2: 1 << 18,
} as const;
export const cookOrder = (k: number) => Math.max(0, Math.min(15, Math.round(k * 15))) << 8;
/** The piece a surfel breaks off with: 0 stays put; 1–8 head off at (piece - 1) × 45°. */
export const piece = (p: number) => (p & 15) << 12;
/** The piece heading outward at angle `a` (radians). */
export const pieceAt = (a: number) => piece(1 + (Math.round((((a % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)) / (Math.PI / 4)) % 8));
/** Glow flags. */
export const G = {
  /** Rises towards the camera, spreading and fading (steam). */
  steam: 1,
  flicker: 2,
  /** Thrown out from the centre and back down, from the body's start time (params[3]); only while params[2] is on. */
  splash: 4,
  /** A wisp of steam rising off food being carried: up and spreading, only while params[2] is on. */
  wisp: 8,
} as const;

/** Floats per surfel: x y z, nx ny nz, radius, material, albedo, object, flags. */
export const SOLID_STRIDE = 11;
/** Floats per glow: x y z, radius, r g b, object, flags, seed, length. */
export const GLOW_STRIDE = 11;
/** Texels (RGBA floats) per object: three rows of a 3x4 matrix, then its state (curl, overcook, cook, phase). */
export const OBJ_TEXELS = 4;

// ------------------------------------------------------------------ maths ---

export type V3 = [number, number, number];
export const norm = (v: V3): V3 => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
export const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const GOLDEN = Math.PI * (3 - Math.sqrt(5));

export const mulberry = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const hash = (x: number, y: number, z: number, s: number) => {
  let h = Math.imul(x, 0x27d4eb2d) ^ Math.imul(y, 0x165667b1) ^ Math.imul(z, 0x9e3779b1) ^ Math.imul(s, 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d);
  h = Math.imul(h ^ (h >>> 12), 0x297a2d39);
  return ((h ^ (h >>> 15)) >>> 0) / 4294967296;
};
const smooth = (t: number) => t * t * (3 - 2 * t);
export const vnoise = (x: number, y: number, z: number, s: number) => {
  const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z);
  const fx = smooth(x - ix), fy = smooth(y - iy), fz = smooth(z - iz);
  const l = (a: number, b: number, t: number) => a + (b - a) * t;
  const c = (dx: number, dy: number, dz: number) => hash(ix + dx, iy + dy, iz + dz, s);
  return l(
    l(l(c(0, 0, 0), c(1, 0, 0), fx), l(c(0, 1, 0), c(1, 1, 0), fx), fy),
    l(l(c(0, 0, 1), c(1, 0, 1), fx), l(c(0, 1, 1), c(1, 1, 1), fx), fy),
    fz,
  );
};
/** Fractal noise, about 0..1 with mean 0.5. */
export const fbm = (x: number, y: number, z: number, s: number, oct = 4) => {
  let sum = 0, amp = 0.5, total = 0, fr = 1;
  for (let o = 0; o < oct; o++) { sum += vnoise(x * fr, y * fr, z * fr, s + o * 17) * amp; total += amp; amp *= 0.5; fr *= 2.03; }
  return sum / total;
};

export const mul3 = (a: number[], b: number[]) => {
  const r = new Array(9);
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) r[i * 3 + j] = a[i * 3] * b[j] + a[i * 3 + 1] * b[3 + j] + a[i * 3 + 2] * b[6 + j];
  return r;
};
export const IDENTITY = [1, 0, 0, 0, 1, 0, 0, 0, 1];
export const rotX = (t: number) => { const c = Math.cos(t), s = Math.sin(t); return [1, 0, 0, 0, c, -s, 0, s, c]; };
export const rotY = (t: number) => { const c = Math.cos(t), s = Math.sin(t); return [c, 0, s, 0, 1, 0, -s, 0, c]; };
export const rotZ = (t: number) => { const c = Math.cos(t), s = Math.sin(t); return [c, -s, 0, s, c, 0, 0, 0, 1]; };
/** A rotation by `t` about the unit axis `a` (row-major). */
export const rotAxis = (a: V3, t: number) => {
  const c = Math.cos(t), s = Math.sin(t), k = 1 - c;
  const [x, y, z] = a;
  return [c + x * x * k, x * y * k - z * s, x * z * k + y * s, y * x * k + z * s, c + y * y * k, y * z * k - x * s, z * x * k - y * s, z * y * k + x * s, c + z * z * k];
};
/** A rotation (row-major) whose local +x points along `x`, with local +z as near world +z as it can be. */
export const frameAlong = (x: V3): number[] => {
  const ax = norm(x);
  const side = Math.abs(ax[2]) < 0.95 ? norm(cross([0, 0, 1], ax)) : [0, 1, 0] as V3;
  const az = cross(ax, side);
  return [ax[0], side[0], az[0], ax[1], side[1], az[1], ax[2], side[2], az[2]];
};

// ---------------------------------------------------------------- objects ---

export type BodyKind = 'wall' | 'steam' | 'splash' | 'chopstick' | 'ladle' | 'egg' | 'ribbon' | Ingredient;

/** Everything that goes into the pot. */
export type Ingredient =
  | 'beef' | 'shrimp' | 'tofu' | 'fishball' | 'dumpling' | 'egg' | 'bokchoy' | 'shiitake' | 'enoki'
  | 'lotus' | 'corn' | 'woodear' | 'chili' | 'pepper' | 'anise' | 'goji' | 'scallion'
  | 'fish' | 'noodles' | 'quail' | 'meatball' | 'tripe' | 'ricecake' | 'puff' | 'crab' | 'squid' | 'napa';

export interface Body {
  kind: BodyKind;
  pos: V3;
  /** Bounding radius in the broth's plane. */
  radius: number;
  base: number[];
  /** Set each frame by behaviour. */
  live?: { c: V3; rot: number[] };
  /** Squash and stretch along local x, y, z. */
  scale?: V3;
  /** Curl, overcook, cook, phase (see OBJ_TEXELS). */
  params?: [number, number, number, number];
}

/** The yin-yang divider: x = cx + amp * sin((y - y0) * k). The left side holds the mala, the right the bone broth. */
export interface Wall { cx: number; amp: number; y0: number; k: number; half: number }
export const wallX = (w: Wall, y: number) => w.cx + w.amp * Math.sin((y - w.y0) * w.k);
/** Signed distance from the divider's centre line, negative on the mala side. */
export const wallDist = (w: Wall, x: number, y: number) => {
  const slope = w.amp * w.k * Math.cos((y - w.y0) * w.k);
  return (x - wallX(w, y)) / Math.sqrt(1 + slope * slope);
};

/** A spot where the broth boils up from below: x, y, strength. */
export type Plume = [number, number, number];

/** A rectangle on the page that ingredients keep out of (the hero's lettering). */
export interface Clear { x: number; y: number; w: number; h: number }

export interface HotpotScene {
  solid: Float32Array;
  solidCount: number;
  glow: Float32Array;
  glowCount: number;
  bodies: Body[];
  focal: number;
  viewW: number;
  pageH: number;
  /** Phone-sized things are drawn smaller. */
  s: number;
  wall: Wall;
  plumes: Plume[];
  life: HotpotLife;
  events: HotpotEvents;
}

export class Builder {
  solid: number[] = [];
  glow: number[] = [];
  bodies: Body[] = [];

  body(b: Partial<Body> & { kind: BodyKind; pos: V3 }): number {
    this.bodies.push({ radius: 0, base: IDENTITY, ...b });
    return this.bodies.length - 1;
  }

  surfel(p: V3, n: V3, r: number, mat: number, alb: number, obj: number, flags = 0) {
    this.solid.push(p[0], p[1], p[2], n[0], n[1], n[2], r, mat, alb, obj, flags);
  }

  glowAt(p: V3, r: number, col: V3, obj: number, flags = 0, seed = Math.random(), len = 0) {
    this.glow.push(p[0], p[1], p[2], r, col[0], col[1], col[2], obj, flags, seed, len);
  }
}

// ------------------------------------------------------------- builders ---

export type Surface = (d: V3) => { mat: number; alb: number; flags?: number } | null;

/** An ellipsoid with radii rx, ry, rz, its surfels spaced `sp` apart; only the half that can be seen from above is built. */
export const ellipsoid = (B: Builder, obj: number, rx: number, ry: number, rz: number, sp: number, surface: Surface, off: V3 = [0, 0, 0], flags = 0, below = -0.35) => {
  const area = 4 * Math.PI * Math.pow((Math.pow(rx * ry, 1.6) + Math.pow(rx * rz, 1.6) + Math.pow(ry * rz, 1.6)) / 3, 1 / 1.6);
  const N = Math.max(20, Math.round(area / (sp * sp)));
  for (let i = 0; i < N; i++) {
    const zz = 1 - (2 * (i + 0.5)) / N;
    if (zz < below) continue;
    const r = Math.sqrt(1 - zz * zz);
    const phi = i * GOLDEN;
    const d: V3 = [Math.cos(phi) * r, Math.sin(phi) * r, zz];
    const s = surface(d);
    if (!s) continue;
    const n = norm([d[0] / rx, d[1] / ry, d[2] / rz]);
    B.surfel([off[0] + d[0] * rx, off[1] + d[1] * ry, off[2] + d[2] * rz], n, sp * DISC, s.mat, s.alb, obj, flags | (s.flags ?? 0));
  }
};

/** What a slab's top looks like at (u, v): the height of its top and its colour, or null outside it. */
export type Shape = (u: number, v: number) => { h: number; mat: number; alb: number; flags?: number } | null;

/**
 * A flat thing seen from above (a slice, a leaf, a cake of tofu): its top is a
 * height field over a grid, normals from its slopes, and wherever the outline
 * runs, a wall of surfels goes down to `bottom`.
 */
export const slab = (B: Builder, obj: number, hw: number, hh: number, sp: number, shape: Shape, bottom: number, flags = 0) => {
  // The shape once per grid point (with a ring of padding), then slopes and the outline from neighbours.
  const nx = Math.ceil(hw / sp) + 1, ny = Math.ceil(hh / sp) + 1;
  const W = nx * 2 + 1;
  const grid: ReturnType<Shape>[] = [];
  for (let j = -ny; j <= ny; j++) for (let i = -nx; i <= nx; i++) grid.push(Math.abs(i) === nx || Math.abs(j) === ny ? null : shape(i * sp, j * sp));
  const at = (i: number, j: number) => grid[(j + ny) * W + (i + nx)];
  for (let j = -ny + 1; j < ny; j++) {
    for (let i = -nx + 1; i < nx; i++) {
      const u = i * sp, v = j * sp;
      const s = at(i, j);
      if (!s) continue;
      const r = at(i + 1, j), l = at(i - 1, j), d = at(i, j + 1), up = at(i, j - 1);
      const hx = (r?.h ?? s.h) - (l?.h ?? s.h);
      const hy = (d?.h ?? s.h) - (up?.h ?? s.h);
      const fl = flags | (s.flags ?? 0);
      B.surfel([u, v, s.h], norm([-hx / (2 * sp), -hy / (2 * sp), 1]), sp * DISC, s.mat, s.alb, obj, fl);
      // The outline: a wall down the side facing out.
      let ox = 0, oy = 0;
      if (!r) ox += 1;
      if (!l) ox -= 1;
      if (!d) oy += 1;
      if (!up) oy -= 1;
      if (!ox && !oy) continue;
      const n = norm([ox, oy, 0.25]);
      for (let z = s.h - sp; z > bottom; z -= sp) B.surfel([u + ox * sp * 0.3, v + oy * sp * 0.3, z], n, sp * DISC, s.mat, s.alb - 0.08, obj, fl);
    }
  }
};

/** A tube along a curve in the broth's plane (shrimp, chilies): `at(t)` gives the centre line and radius for t in 0..1. */
export const tube = (B: Builder, obj: number, sp: number, at: (t: number) => { x: number; y: number; z?: number; r: number }, colour: (t: number, around: number) => { mat: number; alb: number; flags?: number }, flags = 0) => {
  let len = 0;
  const S = 64;
  for (let i = 0; i < S; i++) { const a = at(i / S), b = at((i + 1) / S); len += Math.hypot(b.x - a.x, b.y - a.y); }
  const steps = Math.max(4, Math.round(len / sp));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const a = at(Math.max(0, t - 0.01)), b = at(Math.min(1, t + 0.01));
    const c = at(t);
    const tx = b.x - a.x, ty = b.y - a.y;
    const tl = Math.hypot(tx, ty) || 1;
    const px = -ty / tl, py = tx / tl;
    const ring = Math.max(3, Math.round((Math.PI * c.r) / sp));
    for (let k = 0; k <= ring; k++) {
      const th = (k / ring) * Math.PI * 1.2 - Math.PI * 0.1; // the upper half and a little more
      const cx = Math.cos(th), cz = Math.sin(th);
      const n: V3 = [px * cx, py * cx, cz];
      const col = colour(t, k / ring);
      B.surfel([c.x + n[0] * c.r, c.y + n[1] * c.r, (c.z ?? 0) + n[2] * c.r], n, sp * DISC, col.mat, col.alb, obj, flags | (col.flags ?? 0));
    }
  }
};

// --------------------------------------------------------- the ingredients ---

/**
 * How big each ingredient is (half its longest side, CSS px at full size), how far its centre sits under the broth once
 * cooked and, for those that sink when raw, before; how long it takes to cook (seconds; 0: it doesn't), and how wide it
 * is for its length (for keeping it off the divider, whichever way it's turned).
 */
export const INGREDIENTS: Record<Ingredient, { r: number; sink: number; cook: number; rawSink?: number; aspect: number }> = {
  beef: { r: 60, sink: 1, cook: 16, rawSink: 16, aspect: 0.55 },
  shrimp: { r: 40, sink: 4, cook: 22, rawSink: 20, aspect: 0.8 },
  tofu: { r: 34, sink: 12, cook: 38, aspect: 1 },
  fishball: { r: 21, sink: 6, cook: 30, rawSink: 24, aspect: 1 },
  dumpling: { r: 40, sink: 4, cook: 30, rawSink: 22, aspect: 0.62 },
  egg: { r: 16, sink: 5, cook: 40, rawSink: 16, aspect: 0.78 },
  bokchoy: { r: 56, sink: 1, cook: 24, aspect: 0.5 },
  shiitake: { r: 32, sink: 5, cook: 0, aspect: 1 },
  enoki: { r: 50, sink: 1, cook: 0, aspect: 0.75 },
  lotus: { r: 32, sink: 2, cook: 0, aspect: 1 },
  corn: { r: 36, sink: 10, cook: 0, aspect: 0.6 },
  woodear: { r: 32, sink: 1, cook: 0, aspect: 0.9 },
  chili: { r: 20, sink: 1, cook: 0, aspect: 0.35 },
  pepper: { r: 6, sink: 1, cook: 0, aspect: 1 },
  anise: { r: 14, sink: 1, cook: 0, aspect: 1 },
  goji: { r: 8, sink: 1, cook: 0, aspect: 0.7 },
  scallion: { r: 9, sink: 1, cook: 0, aspect: 1 },
  fish: { r: 44, sink: 1, cook: 14, rawSink: 16, aspect: 0.48 },
  noodles: { r: 44, sink: 2, cook: 26, rawSink: 12, aspect: 0.55 },
  quail: { r: 16, sink: 5, cook: 30, rawSink: 20, aspect: 0.8 },
  meatball: { r: 22, sink: 6, cook: 34, rawSink: 36, aspect: 1 },
  tripe: { r: 44, sink: 1, cook: 0, rawSink: 14, aspect: 0.62 },
  ricecake: { r: 26, sink: 4, cook: 28, rawSink: 18, aspect: 0.55 },
  puff: { r: 26, sink: 6, cook: 30, aspect: 1 },
  crab: { r: 34, sink: 3, cook: 20, rawSink: 18, aspect: 0.3 },
  squid: { r: 34, sink: 2, cook: 14, rawSink: 16, aspect: 0.65 },
  napa: { r: 60, sink: -3, cook: 22, aspect: 0.62 },
};

/** Builds one ingredient's surfels into `obj`, `s` times full size. */
export const buildIngredient = (B: Builder, obj: number, kind: Ingredient, s: number, rand: () => number) => {
  const seed = Math.floor(rand() * 1e6);
  const sp = SPACING * (kind === 'pepper' || kind === 'goji' || kind === 'scallion' || kind === 'anise' ? 0.6 : 0.85);
  const R = INGREDIENTS[kind].r * s;
  const n2 = (u: number, v: number, f: number, o = 0) => fbm(u * f, v * f, 0.5, seed + o, 3);
  switch (kind) {
    case 'beef': {
      // A thin, wavy slice with streaks of fat through it; it browns from the edges in.
      const rx = R, ry = R * 0.55;
      slab(B, obj, rx, ry, sp, (u, v) => {
        const wob = 1 + (n2(u, v, 0.05) - 0.5) * 0.5;
        const e = (u / rx) ** 2 + (v / (ry * wob)) ** 2;
        if (e > 1) return null;
        const streak = Math.abs(Math.sin(u * 0.11 + v * 0.05 + (n2(u, v, 0.04, 3) - 0.5) * 7));
        const fat = streak > 0.9 || n2(u, v, 0.09, 5) > 0.7;
        const order = Math.min(1, e * 0.75 + n2(u, v, 0.08, 9) * 0.5);
        return { h: 3 + Math.sin(u * 0.16 + v * 0.05) * 1.3, mat: fat ? M.fat : M.beef, alb: 0.5 + (n2(u, v, 0.2, 7) - 0.5) * 0.5 + (fat ? 0.1 : 0), flags: F.cook | F.over | cookOrder(1 - order) };
      }, -1, F.curl | F.gloss);
      break;
    }
    case 'shrimp': {
      // Curled into a C: plump at the head, tapering to a fanned tail, striped at every segment.
      const Rc = R * 0.55;
      tube(B, obj, sp, t => {
        const a = -Math.PI * 0.15 + t * Math.PI * 1.35;
        return { x: Math.cos(a) * Rc, y: Math.sin(a) * Rc, r: R * (0.34 - t * 0.2) };
      }, (t, around) => {
        const seg = (t * 7) % 1;
        const vein = Math.abs(around - 0.5) < 0.08;
        return { mat: M.shrimp, alb: 0.55 - (seg < 0.16 ? 0.22 : 0) - (vein ? 0.12 : 0) + (around > 0.25 && around < 0.45 ? 0.12 : 0), flags: F.cook | cookOrder(Math.abs(t - 0.5) * 2 * 0.6 + rand() * 0.4) };
      }, F.gloss);
      // The tail fan.
      const ta = -Math.PI * 0.15 + Math.PI * 1.35;
      const tx = Math.cos(ta) * Rc, ty = Math.sin(ta) * Rc;
      const start = B.solid.length;
      slab(B, obj, R * 0.3, R * 0.3, sp * 0.8, (u, v) => {
        const r = Math.hypot(u, v);
        const a = Math.atan2(v, u);
        if (r > R * 0.3 || Math.abs(a - ta + Math.PI * 0.5) > 0.7) return null;
        return { h: 2, mat: M.shrimp, alb: 0.45 + (r / (R * 0.3)) * 0.25, flags: F.cook | cookOrder(0) };
      }, 0);
      for (let i = start; i < B.solid.length; i += SOLID_STRIDE) { B.solid[i] += tx; B.solid[i + 1] += ty; }
      break;
    }
    case 'tofu': {
      // A cube with softened edges, its top a little uneven; it soaks up the chili oil's colour.
      const h = R * 0.9;
      slab(B, obj, R, R, sp, (u, v) => {
        const m = Math.max(Math.abs(u), Math.abs(v));
        if (m > R) return null;
        const edge = Math.max(0, m - R * 0.78) / (R * 0.22);
        return { h: h * 0.55 - edge * edge * 5 + (n2(u, v, 0.3) - 0.5) * 1.2, mat: M.tofu, alb: 0.55 + (n2(u, v, 0.25, 2) - 0.5) * 0.3, flags: F.cook | cookOrder(1 - m / R * 0.8 - rand() * 0.2) };
      }, h * 0.55 - 20 * s, F.gloss);
      break;
    }
    case 'fishball':
      ellipsoid(B, obj, R, R, R * 0.92, sp, d => ({ mat: M.fishball, alb: 0.55 + (fbm(d[0] * 3, d[1] * 3, d[2] * 3, seed) - 0.5) * 0.35, flags: F.cook | cookOrder(rand()) }), [0, 0, 0], F.gloss);
      break;
    case 'egg':
      ellipsoid(B, obj, R, R * 0.78, R * 0.7, sp, () => ({ mat: M.tofu, alb: 0.62, flags: F.cook | cookOrder(rand()) }), [0, 0, 0], F.gloss);
      break;
    case 'dumpling': {
      // A plump crescent of dough with its pleated seam along the top.
      const rx = R, ry = R * 0.62;
      slab(B, obj, rx, ry, sp, (u, v) => {
        const e = (u / rx) ** 2 + ((v - ry * 0.1) / ry) ** 2;
        const seam = -ry * 0.55 + (u / rx) ** 2 * ry * 0.75;
        if (e > 1 || v < seam - ry * 0.25) return null;
        const onSeam = v < seam + ry * 0.12;
        const pleat = onSeam ? Math.sin(u * 0.45) * 1.6 : 0;
        const dome = Math.sqrt(Math.max(0, 1 - e)) * ry * 0.75;
        return { h: 2 + (onSeam ? ry * 0.55 + pleat : dome), mat: M.dough, alb: 0.55 + (onSeam ? pleat * 0.07 : 0) + (n2(u, v, 0.2) - 0.5) * 0.2, flags: F.cook | cookOrder(rand()) };
      }, -ry * 0.3, F.gloss);
      break;
    }
    case 'bokchoy': {
      // Half a head: a pale, ribbed stem opening into a dark green leaf with a white midrib.
      slab(B, obj, R, R * 0.5, sp, (u, v) => {
        const t = (u + R) / (2 * R); // 0 at the stem's end, 1 at the leaf tip
        if (t < 0 || t > 1) return null;
        const w = R * (t < 0.45 ? 0.17 + t * 0.32 : 0.34 + Math.sin(((t - 0.45) / 0.55) * Math.PI * 0.9) * 0.14) * (1 + (n2(u, v, 0.15) - 0.5) * 0.25);
        if (Math.abs(v) > w) return null;
        const leaf = t > 0.42 && Math.abs(v) > R * (0.05 + (1 - t) * 0.1);
        const vein = leaf && Math.abs(Math.sin((u - Math.abs(v) * 0.8) * 0.35)) < 0.15;
        return {
          h: (leaf ? 2.5 : 5 - Math.abs(v) / w * 2.5) + (n2(u, v, 0.3, 4) - 0.5) * 1.8,
          mat: leaf ? M.leaf : M.stem,
          alb: leaf ? 0.5 + (vein ? 0.18 : 0) + (n2(u, v, 0.2, 3) - 0.5) * 0.35 : 0.55 + Math.cos(v * 0.9) * 0.1,
          flags: leaf ? F.cook | F.over | cookOrder(1 - Math.abs(v) / w) : 0,
        };
      }, -1, F.gloss | F.curl);
      break;
    }
    case 'shiitake': {
      // A brown cap with a white star cut into it.
      slab(B, obj, R, R, sp, (u, v) => {
        const r = Math.hypot(u, v) / (R * (1 + (n2(u, v, 0.08) - 0.5) * 0.12));
        if (r > 1) return null;
        const a = Math.atan2(v, u);
        const cut = r < 0.72 && r > 0.08 && [0, Math.PI / 3, (2 * Math.PI) / 3].some(c => Math.abs(Math.sin(a - c)) * r * R < 2.4 * s + sp * 0.3);
        const dome = Math.sqrt(1 - r * r) * R * 0.42;
        return cut
          ? { h: dome - 1.5, mat: M.enoki, alb: 0.55 }
          : { h: dome, mat: M.shiitake, alb: 0.52 + (1 - r) * 0.15 + (n2(u, v, 0.3, 2) - 0.5) * 0.4 - (r > 0.86 ? 0.15 : 0) };
      }, -2, F.gloss);
      break;
    }
    case 'enoki': {
      // A bundle of long, thin stalks fanning from their base, each tipped with a tiny cap.
      // Spread wide enough that each stalk keeps a pixel of broth either side of it.
      const stalks = 5;
      const pivot = -R * 0.8, reach = R * 1.62;
      slab(B, obj, R, R * 0.75, sp * 0.8, (u, v) => {
        if (u < -R || u > R) return null;
        if (u < -R * 0.62) return Math.abs(v) < R * 0.2 ? { h: 5, mat: M.enoki, alb: 0.32 + (n2(u, v, 0.3) - 0.5) * 0.3 } : null;
        const du = u - pivot;
        for (let k = 0; k < stalks; k++) {
          const ang = (k - (stalks - 1) / 2) * 0.2;
          const ca = Math.cos(ang), sa = Math.sin(ang);
          // Along and across this stalk.
          const al = du * ca + v * sa, ac = -du * sa + v * ca;
          if (Math.hypot(al - reach, ac) < 6 * s) return { h: 5.5, mat: M.enoki, alb: 0.78, flags: F.over | cookOrder(rand()) };
          if (al > 0 && al < reach && Math.abs(ac) < 3.4 * s) return { h: 3.5, mat: M.enoki, alb: 0.5 + (k % 2) * 0.08, flags: F.over | cookOrder(1 - al / reach) };
        }
        return null;
      }, 0, F.gloss | F.curl);
      break;
    }
    case 'lotus': {
      // A slice of lotus root: cream flesh, a ring of round holes, a tan skin.
      const holes: [number, number, number][] = [[0, 0, 0.17]];
      for (let k = 0; k < 7; k++) { const a = (k / 7) * Math.PI * 2 + 0.3; holes.push([Math.cos(a) * 0.55, Math.sin(a) * 0.55, k % 2 ? 0.17 : 0.2]); }
      slab(B, obj, R, R, sp * 0.8, (u, v) => {
        const x = u / R, y = v / R;
        const r = Math.hypot(x, y);
        if (r > 1) return null;
        if (holes.some(([hx, hy, hr]) => Math.hypot(x - hx, y - hy) < hr)) return null;
        const edge = Math.min(1 - r, ...holes.map(([hx, hy, hr]) => Math.hypot(x - hx, y - hy) - hr));
        return { h: 3 + (n2(u, v, 0.4) - 0.5) * 0.8, mat: M.lotus, alb: r > 0.9 ? 0.32 : 0.55 + (n2(u, v, 0.3, 2) - 0.5) * 0.2, flags: F.cook | cookOrder(Math.min(1, edge * 4) * 0.8 + rand() * 0.2) };
      }, -2, F.gloss);
      break;
    }
    case 'corn': {
      // A length of cob on its side: rows of plump kernels.
      const rr = R * 0.6;
      slab(B, obj, R, rr, sp * 0.8, (u, v) => {
        if (Math.abs(u) > R || Math.abs(v) > rr) return null;
        const a = Math.asin(v / rr);
        const ki = Math.round(u / (7.5 * s)), kj = Math.round(a / 0.36);
        const ku = u - ki * 7.5 * s, ka = (a - kj * 0.36) * rr;
        const bump = Math.max(0, 1 - (ku * ku + ka * ka) / (4 * s) ** 2);
        const end = Math.abs(u) > R - 2;
        return { h: Math.sqrt(rr * rr - v * v) * 0.8 + bump * 1.6, mat: M.corn, alb: end ? 0.3 : 0.32 + bump * 0.38, flags: F.cook | cookOrder((1 - bump) * 0.6 + rand() * 0.4) };
      }, -2, F.gloss);
      break;
    }
    case 'woodear': {
      // A frilled, glossy black ear of fungus.
      slab(B, obj, R, R, sp, (u, v) => {
        const a = Math.atan2(v, u);
        const r = Math.hypot(u, v) / R;
        // Lobed and ruffled at the rim, gathered at the middle.
        if (r > 0.72 + Math.sin(a * 5 + seed) * 0.12 + n2(Math.cos(a) * 30, Math.sin(a) * 30, 0.05) * 0.25) return null;
        const ruffle = Math.sin(a * 11 + r * 9);
        return { h: 3 + ruffle * 2.2 * r - (1 - r) * 1.5, mat: M.woodear, alb: 0.45 + ruffle * 0.25 * r };
      }, -1, F.gloss);
      break;
    }
    case 'chili': {
      // A dried red chili, a little bent, with its green-brown cap.
      const bend = (rand() - 0.5) * 0.6;
      tube(B, obj, sp, t => ({ x: (t - 0.5) * R * 2, y: Math.sin(t * Math.PI) * bend * R, r: R * (t < 0.15 ? 0.24 : 0.3 - (t - 0.15) * 0.25) }),
        (t, around) => (t < 0.08 ? { mat: M.anise, alb: 0.4 } : { mat: M.chili, alb: 0.45 + (around > 0.3 && around < 0.5 ? 0.25 : 0) + (fbm(t * 9, around * 3, 0, seed) - 0.5) * 0.3 }), F.gloss);
      break;
    }
    case 'pepper':
      ellipsoid(B, obj, R, R, R, sp, d => ({ mat: M.pepper, alb: 0.45 + (fbm(d[0] * 4, d[1] * 4, d[2] * 4, seed) - 0.5) * 0.6 }));
      break;
    case 'goji':
      ellipsoid(B, obj, R * 1.3, R * 0.8, R * 0.7, sp, () => ({ mat: M.goji, alb: 0.55 }), [0, 0, 0], F.gloss);
      break;
    case 'anise': {
      // An eight-pointed star pod.
      slab(B, obj, R, R, sp * 0.8, (u, v) => {
        const a = Math.atan2(v, u);
        const r = Math.hypot(u, v) / R;
        const lobe = 0.45 + 0.55 * Math.abs(Math.cos(a * 4));
        if (r > lobe) return null;
        return { h: 3 * (1 - r / lobe) + 1, mat: M.anise, alb: 0.4 + (1 - r) * 0.3 };
      }, 0);
      break;
    }
    case 'scallion': {
      // A ring of spring onion.
      slab(B, obj, R, R, sp * 0.7, (u, v) => {
        const r = Math.hypot(u, v) / R;
        if (r > 1 || r < 0.5) return null;
        return { h: 1.5, mat: M.scallion, alb: 0.45 + (r - 0.5) * 0.5 };
      }, 0);
      break;
    }
    case 'fish': {
      // A fillet: glassy grey going opaque white, with the lines of its flakes; left in, it falls apart along them.
      const rx = R, ry = R * 0.48;
      slab(B, obj, rx, ry, sp, (u, v) => {
        const taper = 1 - 0.35 * Math.max(0, u / rx);
        const e = (u / rx) ** 2 + (v / (ry * taper)) ** 2;
        if (e > 1) return null;
        const flake = Math.abs(Math.sin((u + v * v * 0.025) * 0.26));
        const r = Math.sqrt(e);
        return {
          h: 3 + (1 - e) * 2.5, mat: M.fish, alb: 0.5 + (flake < 0.18 ? -0.16 : 0.04) + (n2(u, v, 0.2) - 0.5) * 0.2,
          flags: F.cook | F.over | F.flake | cookOrder(r * 0.7 + rand() * 0.3) | (r < 0.45 || flake < 0.18 ? 0 : pieceAt(Math.atan2(v, u) + (n2(u, v, 0.08, 6) - 0.5) * 1.5)),
        };
      }, -1, F.gloss);
      break;
    }
    case 'noodles': {
      // A loose tangle of glass noodles, opaque while raw, clear once cooked.
      // A loose skein: long wavy strands lying side by side, crossing now and then.
      for (let k = 0; k < 4; k++) {
        const off = (k - 1.5) * 8.5 * s, ph = rand() * 6, amp = (3 + rand() * 4) * s;
        tube(B, obj, sp * 0.8, t => ({ x: (t - 0.5) * R * 2, y: off + Math.sin(t * 9 + ph) * amp + Math.sin(t * Math.PI) * 6 * s, z: Math.sin(t * 13 + k) * 1.2, r: 3.3 * s }),
          () => ({ mat: M.noodle, alb: 0.6, flags: F.cook | cookOrder(rand()) }), F.gloss);
      }
      break;
    }
    case 'quail': {
      // A quail egg still in its speckled shell; the boil cracks it and the shell falls away in pieces.
      ellipsoid(B, obj, R * 0.9, R * 0.72, R * 0.64, sp * 0.8, () => ({ mat: M.tofu, alb: 0.62, flags: F.cook | cookOrder(rand()) }), [0, 0, 0], F.gloss);
      ellipsoid(B, obj, R, R * 0.8, R * 0.72, sp * 0.8, d => {
        const speck = fbm(d[0] * 6, d[1] * 6, d[2] * 6, seed) > 0.6;
        return { mat: speck ? M.speck : M.shell, alb: speck ? 0.45 : 0.55 + (fbm(d[0] * 3, d[1] * 3, d[2] * 3, seed + 4) - 0.5) * 0.3, flags: F.flake | F.shed | pieceAt(Math.atan2(d[1], d[0]) + (rand() - 0.5) * 0.6) };
      });
      break;
    }
    case 'meatball':
      // Bumpy, pink raw and browning as it cooks.
      ellipsoid(B, obj, R, R, R * 0.95, sp, d => {
        const bump = fbm(d[0] * 5, d[1] * 5, d[2] * 5, seed);
        return { mat: M.meat, alb: 0.5 + (bump - 0.5) * 0.9, flags: F.cook | cookOrder(rand()) };
      }, [0, 0, 0], 0, -1);
      break;
    case 'tripe': {
      // A sheet of honeycomb tripe: raised ridges round sunken cells, rippling as it floats.
      const cell = 12 * s;
      slab(B, obj, R, R * 0.6, sp * 0.8, (u, v) => {
        const m = Math.max(Math.abs(u) / R, Math.abs(v) / (R * 0.6));
        if (m > 1 - n2(u, v, 0.05) * 0.12) return null;
        // Nearest centre on a hexagonal lattice.
        const row = Math.round(v / (cell * 0.866));
        const cx = (Math.round(u / cell - (row & 1) * 0.5) + (row & 1) * 0.5) * cell;
        const d = Math.hypot(u - cx, v - row * cell * 0.866) / cell;
        const ridge = d > 0.34;
        return { h: 2 + (ridge ? 2 : 0), mat: M.tripe, alb: ridge ? 0.72 : 0.12 };
      }, -1, F.ripple | F.gloss);
      break;
    }
    case 'ricecake': {
      // A white oval of rice cake: matte raw, glossy once cooked.
      slab(B, obj, R, R * 0.55, sp, (u, v) => {
        const e = (u / R) ** 2 + (v / (R * 0.55)) ** 2;
        if (e > 1) return null;
        return { h: 3 + Math.sqrt(1 - e) * 6, mat: M.rice, alb: 0.55 + (n2(u, v, 0.2) - 0.5) * 0.15, flags: F.cook | cookOrder(rand()) };
      }, -2, F.gloss);
      break;
    }
    case 'puff': {
      // A golden fried tofu puff, crinkled, darkening as it soaks up broth.
      slab(B, obj, R, R, sp, (u, v) => {
        const m = (Math.abs(u) / R) ** 4 + (Math.abs(v) / R) ** 4;
        if (m > 1) return null;
        const crinkle = n2(u, v, 0.25);
        return { h: 4 + Math.sqrt(1 - m) * R * 0.45 + (crinkle - 0.5) * 3, mat: M.puff, alb: 0.5 + (crinkle - 0.5) * 0.6, flags: F.cook | cookOrder(m * 0.6 + rand() * 0.4) };
      }, -2, F.gloss);
      break;
    }
    case 'crab': {
      // A crab stick, red along the top and white beneath, that loosens into ribbons as it heats.
      tube(B, obj, sp * 0.8, t => ({ x: (t - 0.5) * R * 2, y: 0, r: 7 * s }), (t, around) => {
        const top = around > 0.3 && around < 0.7;
        const p = around < 0.33 ? piece(3) : around > 0.67 ? piece(7) : 0;
        return { mat: top ? M.crab : M.fishball, alb: top ? 0.5 + Math.sin(t * 40) * 0.08 : 0.6, flags: F.flake | p };
      }, F.gloss);
      break;
    }
    case 'squid': {
      // A piece of squid scored in a diamond grid, translucent raw; cooked it turns white and curls into a pinecone.
      const ry = R * 0.62;
      slab(B, obj, R, ry, sp * 0.8, (u, v) => {
        const m = (Math.abs(u) / R) ** 3 + (Math.abs(v) / ry) ** 3;
        if (m > 1) return null;
        const score = Math.abs(Math.sin((u + v) * 0.24)) < 0.3 || Math.abs(Math.sin((u - v) * 0.24)) < 0.3;
        return { h: 3 - (score ? 1.5 : 0), mat: M.squid, alb: score ? 0.12 : 0.62, flags: F.cook | cookOrder(m * 0.7 + rand() * 0.3) };
      }, -1, F.curl | F.curl2 | F.gloss);
      break;
    }
    case 'napa': {
      // A big leaf of napa cabbage: a broad white rib and crinkled pale green, going limp and see-through.
      const ry = R * 0.6;
      slab(B, obj, R, ry, sp, (u, v) => {
        const t = (u + R) / (2 * R);
        const w = ry * Math.sin(Math.PI * Math.min(1, t * 1.05)) ** 0.7 * (1 + (n2(u, v, 0.09) - 0.5) * 0.25);
        if (t < 0 || t > 1 || Math.abs(v) > w) return null;
        const rib = Math.abs(v) < R * 0.17 * (1 - t * 0.7);
        const crinkle = n2(u, v, 0.18, 4);
        return rib
          ? { h: 4, mat: M.rib, alb: 0.6 + Math.cos(v * 0.8) * 0.08, flags: F.cook | cookOrder(rand()) }
          : { h: 2.5 + (crinkle - 0.5) * 4, mat: M.napa, alb: 0.5 + (crinkle - 0.5) * 0.6 + (Math.abs(Math.sin((u - Math.abs(v)) * 0.25)) < 0.12 ? 0.15 : 0), flags: F.cook | cookOrder(rand()) };
      }, 0, F.curl | F.gloss);
      break;
    }
  }
};

/** A chopstick, lying along +x from its tip at the origin: square, tapering, with a lacquered band at the far end. */
export const buildChopstick = (B: Builder, obj: number, L: number, s: number) => {
  const sp = SPACING * 0.8;
  const steps = Math.round(L / sp);
  for (let i = 0; i <= steps; i++) {
    const x = (i / steps) * L;
    const t = x / L;
    const w = (2.2 + t * 2.4) * s;
    const band = t > 0.68 && t < 0.8;
    const mat = band ? M.lacquer : M.wood;
    const per = Math.max(2, Math.round((w * 2) / sp));
    for (let k = 0; k <= per; k++) {
      const q = -w + (k / per) * w * 2;
      const grain = 0.5 + Math.sin(x * 0.9 + q) * 0.06;
      // Four faces.
      B.surfel([x, q, w], [0, 0, 1], sp * DISC, mat, grain + 0.05, obj);
      B.surfel([x, q, -w], [0, 0, -1], sp * DISC, mat, grain - 0.1, obj);
      B.surfel([x, w, q], [0, 1, 0], sp * DISC, mat, grain, obj);
      B.surfel([x, -w, q], [0, -1, 0], sp * DISC, mat, grain, obj);
    }
  }
  // The tip's end face.
  for (let a = -2; a <= 2; a++) for (let b = -2; b <= 2; b++) B.surfel([0, a * 1.1 * s, b * 1.1 * s], [-1, 0, 0], sp * DISC, M.wood, 0.6, obj);
};

// -------------------------------------------------------------- the scene ---

/**
 * Builds the whole pot for a viewport `viewW` x `viewH` over a page `pageH` tall,
 * keeping ingredients off the `clear` rectangles (the hero's lettering).
 */
export const buildScene = (viewW: number, viewH: number, pageH: number, clear: Clear[] = [], seed = 11): HotpotScene => {
  const rand = mulberry(seed);
  const B = new Builder();
  const f = focalFor(viewH);
  const s = Math.min(1.1, Math.max(0.6, viewW / 1400));

  // The divider: a steel wall snaking down the page, so each margin takes turns at the mala and the bone broth.
  // At the hero it sits far right, so the name is over the red.
  const period = Math.max(1500, viewH * 1.9);
  const wall: Wall = { cx: viewW / 2, amp: viewW * 0.38, y0: viewH * 0.42 - period / 4, k: (Math.PI * 2) / period, half: 6 * s };
  {
    const body = B.body({ kind: 'wall', pos: [0, 0, 0] });
    const top = 22 * s, low = -4;
    const sp = SPACING * 1.25;
    let y = -viewH;
    while (y < pageH + viewH) {
      const slope = wall.amp * wall.k * Math.cos((y - wall.y0) * wall.k);
      const inv = 1 / Math.sqrt(1 + slope * slope);
      // Across the wall (unit normal in the plane) and along it.
      const nx = inv, ny = -slope * inv;
      const cx = wallX(wall, y);
      const brushed = 0.5 + (vnoise(y * 0.02, 0.5, 0.5, seed + 3) - 0.5) * 0.25;
      // The rounded top, then the two sides down into the broth.
      const arc = Math.max(4, Math.round((Math.PI * wall.half) / sp));
      for (let k = 0; k <= arc; k++) {
        const a = (k / arc) * Math.PI;
        const c = Math.cos(a), sn = Math.sin(a);
        B.surfel([cx + nx * c * wall.half, y + ny * c * wall.half, top + sn * wall.half * 0.8], [nx * c, ny * c, sn], sp * DISC, M.steel, brushed + 0.1, body);
      }
      for (let z = top; z > low; z -= sp) {
        for (const side of [-1, 1]) B.surfel([cx + nx * side * wall.half, y + ny * side * wall.half, z], [nx * side, ny * side, 0.15], sp * DISC, M.steel, brushed - 0.05 + (z / top) * 0.1, body);
      }
      y += sp * inv;
    }
  }

  // Where the broth boils up: a loose grid of plumes, stronger along the middle where the flame is.
  const plumes: Plume[] = [];
  const step = 260 * s;
  for (let y = step * 0.5; y < pageH + step; y += step * (0.8 + rand() * 0.4)) {
    for (let x = step * 0.3 + rand() * step * 0.5; x < viewW; x += step * (0.8 + rand() * 0.5)) {
      plumes.push([x + (rand() - 0.5) * step * 0.4, y + (rand() - 0.5) * step * 0.4, 0.45 + rand() * 0.55]);
    }
  }

  // Steam: wisps rising off the boil towards the camera.
  {
    const body = B.body({ kind: 'steam', pos: [0, 0, 0] });
    for (const [x, y, st] of plumes) {
      const n = 1 + Math.round(st * 2);
      for (let i = 0; i < n; i++) {
        B.glowAt([x + (rand() - 0.5) * 120 * s, y + (rand() - 0.5) * 120 * s, 6], (26 + rand() * 18) * s, [0.2, 0.17, 0.15], body, G.steam, rand(), 220 + rand() * 160);
      }
    }
  }

  const life = populateLife(B, { rand, s, f, viewW, viewH, pageH, wall, plumes, clear });
  const events = populateEvents(B, { rand, s });

  return {
    solid: new Float32Array(B.solid),
    solidCount: B.solid.length / SOLID_STRIDE,
    glow: new Float32Array(B.glow),
    glowCount: B.glow.length / GLOW_STRIDE,
    bodies: B.bodies,
    focal: f,
    viewW,
    pageH,
    s,
    wall,
    plumes,
    life,
    events,
  };
};

/** The camera, as the view draws with it. */
export interface HotpotCamera { viewW: number; viewH: number; scrollY: number; offX: number; offY: number }

/** Where a world point lands in the window, in CSS pixels. */
export const toScreen = (scene: HotpotScene, cam: HotpotCamera, w: V3): [number, number] => {
  const sc = scene.focal / (scene.focal - w[2]);
  return [cam.viewW / 2 + (w[0] - cam.viewW / 2 - cam.offX) * sc + cam.offX, cam.viewH / 2 + (w[1] - cam.scrollY - cam.viewH / 2 - cam.offY) * sc + cam.offY];
};

/**
 * Writes every body's transform into `out`: per body, three rows of a 3x4
 * matrix (rotation x scale, then the centre) and its state.
 */
export const poseBodies = (scene: HotpotScene, out: Float32Array) => {
  const { bodies } = scene;
  for (let i = 0; i < bodies.length; i++) {
    const b = bodies[i];
    const c = b.live ? b.live.c : b.pos;
    const rot = b.live ? b.live.rot : b.base;
    const sc = b.scale ?? [1, 1, 1];
    const o = i * OBJ_TEXELS * 4;
    out[o] = rot[0] * sc[0]; out[o + 1] = rot[1] * sc[1]; out[o + 2] = rot[2] * sc[2]; out[o + 3] = c[0];
    out[o + 4] = rot[3] * sc[0]; out[o + 5] = rot[4] * sc[1]; out[o + 6] = rot[5] * sc[2]; out[o + 7] = c[1];
    out[o + 8] = rot[6] * sc[0]; out[o + 9] = rot[7] * sc[1]; out[o + 10] = rot[8] * sc[2]; out[o + 11] = c[2];
    const p = b.params;
    out[o + 12] = p ? p[0] : 0; out[o + 13] = p ? p[1] : 0; out[o + 14] = p ? p[2] : 0; out[o + 15] = p ? p[3] : 0;
  }
};
