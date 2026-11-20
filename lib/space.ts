/**
 * The space page's world: a real 3D scene, built the way pixel-art Gaussian
 * splats are (after cobanov/pixelart-gaussiansplat). Every surface is a cloud of
 * small flat discs (surfels), each with a position, a normal, a material and a
 * shade; translucent light (nebulae, coronas, comet tails) is a second cloud of
 * soft glows. `lib/spaceView.ts` renders both at twice the art resolution and
 * reduces each 2x2 block to one art pixel by coverage and a palette vote.
 *
 * No DOM. Coordinates are CSS pixels: x across the page, y down it, z towards
 * the viewer. The camera sits at z = focal and follows the page's scroll, so
 * the plane z = 0 scrolls exactly with the content and deeper things parallax.
 */

import { AlienLife, populateAliens } from './spaceAliens';
import { SpaceEvents, populateEvents } from './spaceEvents';

export const FOV_Y = (45 * Math.PI) / 180;
export const focalFor = (viewH: number) => viewH / 2 / Math.tan(FOV_Y / 2);

/** Surfel spacing, in CSS pixels as seen on screen. */
export const SPACING = 3;
/** Disc radius as a share of the spacing, so neighbours overlap. */
export const DISC = 0.85;

// ---------------------------------------------------------------- palette ---

/** Material ramps, darkest first: cool shadows, warm light (6 shades each). */
export const RAMPS: string[][] = [
  /* 0 rock   */ ['#1a1726', '#2e2838', '#4a3f4c', '#6e5e62', '#9a857c', '#c8b29c'],
  /* 1 rust   */ ['#1c1222', '#3a1a2a', '#6a2a2e', '#a2443a', '#d0704a', '#f0a070'],
  /* 2 ice    */ ['#121a32', '#1e3452', '#2e5a7a', '#4a8aa6', '#84c0d0', '#d4f0f0'],
  /* 3 tan    */ ['#1e1426', '#3e2a36', '#6e4a40', '#a87a5a', '#d6ac80', '#f2dcb0'],
  /* 4 amber  */ ['#201226', '#44203a', '#7a3a36', '#b8603a', '#e8904a', '#ffc070'],
  /* 5 ocean  */ ['#0a1230', '#10224e', '#183c78', '#2264a0', '#3a94c4', '#7cc8e0'],
  /* 6 land   */ ['#101a20', '#1a3030', '#2a5038', '#457a3e', '#78a24a', '#b8c868'],
  /* 7 cloud  */ ['#1a2038', '#3a4460', '#6a7890', '#a0aeb8', '#d4dcd8', '#fbfbf0'],
  /* 8 lava   */ ['#2a0a12', '#6a1414', '#b02a10', '#e8581a', '#ffa030', '#ffe890'],
  /* 9 violet */ ['#160e2a', '#2a1844', '#4a2a6a', '#74408e', '#a466b0', '#d8a0cc'],
  /* 10 ring  */ ['#141220', '#2a2634', '#4e4650', '#7c6e6a', '#ae9c88', '#dccaa8'],
  /* 11 sun   */ ['#7a2410', '#b84418', '#ec7a20', '#ffb030', '#ffe07a', '#fff8dc'],
  /* 12 star  */ ['#262848', '#4a5084', '#8890c8', '#c8d0f4', '#eef0ff', '#ffffff'],
  /* 13 teal  */ ['#0c1a28', '#123040', '#1a5058', '#26806e', '#4ab08a', '#9ae0b0'],
  /* 14 ash   */ ['#0e0a12', '#1c1218', '#2e1c1e', '#44282a', '#5e3a34', '#7a5040'],
  /* 15 moon  */ ['#121420', '#262a38', '#444a58', '#6a7080', '#9aa2ae', '#d0d6dc'],
  /* 16 blip  */ ['#0e2420', '#1a4030', '#2a6a3e', '#4aa04a', '#86d060', '#d0f490'],
  /* 17 eye   */ ['#3a3a5a', '#7a7c9a', '#b8bccc', '#e4e8ee', '#f8faff', '#ffffff'],
  /* 18 pupil */ ['#0a0812', '#120e1e', '#1a1428', '#241c36', '#2e2444', '#3a2e52'],
  /* 19 pink  */ ['#2a1028', '#4a1a44', '#7a2a68', '#b44a8e', '#e07ab0', '#ffb8d4'],
  /* 20 metal */ ['#141828', '#262c40', '#44506a', '#6e7c96', '#a4b0c4', '#e0e8f0'],
  /* 21 light */ ['#4a2a10', '#8a5010', '#d09020', '#ffd040', '#fff080', '#ffffe0'],
];
export const SHADES = 6;
export const M = {
  rock: 0, rust: 1, ice: 2, tan: 3, amber: 4, ocean: 5, land: 6, cloud: 7,
  lava: 8, violet: 9, ring: 10, sun: 11, star: 12, teal: 13, ash: 14, moon: 15,
  blip: 16, eye: 17, pupil: 18, pink: 19, metal: 20, light: 21,
} as const;

/** What empty space and its glows snap to: ink, nebula violets and pinks, teal, starlight. */
export const SKY_PALETTE = [
  '#04030a', '#08071a', '#0e0c26', '#161236', '#211848', '#301c5a', '#44226c', '#5e2a7c',
  '#7c3288', '#a0408e', '#c85a96', '#ec84a0', '#ffb4aa', '#ffdcbc', '#fff4e0',
  '#0a1a30', '#0f2c48', '#164866', '#1e6a84', '#3a98a8', '#86d2cc',
  '#18245a', '#2a3c8e', '#4a64c0',
  // Flame, for the solar flare.
  '#c8461e', '#ff8a32', '#ffc456',
  // Aurora green.
  '#1f8a58', '#46d48a', '#a4f4b8',
];

/** Surfel flags. */
export const F = {
  emissive: 1, twoSided: 2, star: 4,
  /** Sways side to side with height above the object's wobble base (antennae). */
  wobble: 8,
  /** Hidden while the object blinks. */
  eye: 16,
  /** A chasing light: its albedo is its place in the chase. */
  light: 32,
  /** The black hole's disk: marks the parts nearer than the hole, which the lensing leaves alone. */
  front: 64,
} as const;
/** Glow flags. */
export const G = {
  stream: 1, flicker: 2,
  /** A tractor beam: streams towards its source, only while the object's state is on. */
  beam: 4,
  wobble: 8,
  /** Only as bright as the object's state (meteors, the flare, watering). */
  gate: 16,
  /** Travels up and over an arc as wide as its length (the solar flare's loop). */
  arc: 32,
  /** A ripple of the aurora: brightness rolls round the pole. */
  aurora: 64,
} as const;

/** Floats per surfel: x y z, nx ny nz, radius, material, albedo, object, flags. */
export const SOLID_STRIDE = 11;
/** Floats per glow: x y z, radius, r g b, object, flags, seed, stream length. */
export const GLOW_STRIDE = 11;
/**
 * Texels (RGBA floats) per object in the transform texture: three rows of a 3x4
 * matrix, the sphere that can shadow it, then its state (wobble amount, wobble
 * base, blink or beam, phase).
 */
export const OBJ_TEXELS = 5;

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

/** A rotation (columns) taking local +Y to `axis`. */
export const basisFor = (axis: V3): number[] => {
  const y = norm(axis);
  const ref: V3 = Math.abs(y[0]) < 0.9 ? [1, 0, 0] : [0, 0, 1];
  const z = norm(cross(ref, y));
  const x = cross(y, z);
  return [x[0], y[0], z[0], x[1], y[1], z[1], x[2], y[2], z[2]]; // row-major 3x3
};
export const mul3 = (a: number[], b: number[]) => {
  const r = new Array(9);
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) r[i * 3 + j] = a[i * 3] * b[j] + a[i * 3 + 1] * b[3 + j] + a[i * 3 + 2] * b[6 + j];
  return r;
};
export const rotY = (t: number) => { const c = Math.cos(t), s = Math.sin(t); return [c, 0, s, 0, 1, 0, -s, 0, c]; };
export const IDENTITY = [1, 0, 0, 0, 1, 0, 0, 0, 1];
export const rotX = (t: number) => { const c = Math.cos(t), s = Math.sin(t); return [1, 0, 0, 0, c, -s, 0, s, c]; };
export const rotZ = (t: number) => { const c = Math.cos(t), s = Math.sin(t); return [c, -s, 0, s, c, 0, 0, 0, 1]; };

// ---------------------------------------------------------------- objects ---

export type BodyKind = 'stars' | 'sun' | 'planet' | 'ring' | 'clouds' | 'moon' | 'asteroid' | 'comet' | 'galaxy' | 'nebula' | 'rock' | 'blip' | 'arm' | 'saucer' | 'beam' | 'blackhole' | 'aurora' | 'meteor' | 'flare' | 'eclipse' | 'gardenmoon' | 'flower' | 'can' | 'water';

export interface Body {
  kind: BodyKind;
  name: string;
  /** Centre at time 0. */
  pos: V3;
  /** Bounding radius (for shadows and hit tests). */
  radius: number;
  base: number[];
  spin: number;
  spin0: number;
  orbit?: { parent: number; radius: number; rate: number; phase: number; base: number[] };
  drift?: { vx: number; min: number; max: number };
  path?: { from: V3; to: V3; period: number; phase: number };
  /** Index of the body whose sphere can shadow this one. */
  shadow: number;
  /** Turn local +X away from the sun (comets). */
  faceAway?: boolean;
  /** A gentle drift round its spot (the rocks the blips live on). */
  bob?: { amp: number; rate: number; phase: number };
  /** Set each frame by the aliens' behaviour; for an attached part, only `rot` is used, relative to its parent. */
  live?: { c: V3; rot: number[] };
  /** Squash and stretch along local x, y, z. */
  scale?: V3;
  /** Rides on another body, at `offset` in that body's frame. */
  attach?: { parent: number; offset: V3 };
  /** Wobble amount, wobble base, blink or beam, phase (see OBJ_TEXELS). */
  params?: [number, number, number, number];
}

export interface SpaceScene {
  solid: Float32Array;
  solidCount: number;
  glow: Float32Array;
  glowCount: number;
  bodies: Body[];
  sun: V3;
  focal: number;
  life: AlienLife;
  events: SpaceEvents;
  /** The black hole: its body and the radius nothing comes back from. */
  blackHole: { body: number; r: number } | null;
  /** Every body's centre as last posed. */
  centres?: V3[];
}

export class Builder {
  solid: number[] = [];
  glow: number[] = [];
  bodies: Body[] = [];

  body(b: Partial<Body> & { kind: BodyKind; pos: V3 }): number {
    this.bodies.push({ name: b.kind, radius: 0, base: IDENTITY, spin: 0, spin0: 0, shadow: -1, ...b });
    return this.bodies.length - 1;
  }

  surfel(p: V3, n: V3, r: number, mat: number, alb: number, obj: number, flags = 0) {
    this.solid.push(p[0], p[1], p[2], n[0], n[1], n[2], r, mat, alb, obj, flags);
  }

  glowAt(p: V3, r: number, col: V3, obj: number, flags = 0, seed = Math.random(), len = 0) {
    this.glow.push(p[0], p[1], p[2], r, col[0], col[1], col[2], obj, flags, seed, len);
  }
}

export type Surface = (d: V3) => { mat: number; alb: number; n?: V3; h?: number; flags?: number } | null;

/** Cover a sphere of radius R with surfels spaced `sp` apart. */
export const sphere = (B: Builder, obj: number, R: number, sp: number, surface: Surface, flags = 0) => {
  const N = Math.max(24, Math.round((4 * Math.PI * R * R) / (sp * sp)));
  for (let i = 0; i < N; i++) {
    const y = 1 - (2 * (i + 0.5)) / N;
    const r = Math.sqrt(1 - y * y);
    const phi = i * GOLDEN;
    const d: V3 = [Math.cos(phi) * r, y, Math.sin(phi) * r];
    const s = surface(d);
    if (!s) continue;
    const k = R * (1 + (s.h ?? 0));
    B.surfel([d[0] * k, d[1] * k, d[2] * k], s.n ?? d, sp * DISC, s.mat, s.alb, obj, flags | (s.flags ?? 0));
  }
};

/** Craters: centres on the sphere with angular radii. */
const makeCraters = (rand: () => number, count: number, big: number) =>
  Array.from({ length: count }, () => {
    const d = norm([rand() * 2 - 1, rand() * 2 - 1, rand() * 2 - 1]);
    return { c: d, r: big * (0.25 + rand() ** 2 * 0.75) };
  });

/** Bowls darken their floors and tilt their walls, so the light catches one side. */
const applyCraters = (d: V3, craters: { c: V3; r: number }[]) => {
  let alb = 0;
  let n: V3 = d;
  for (const k of craters) {
    const ang = Math.acos(Math.min(1, Math.max(-1, dot(d, k.c))));
    if (ang > k.r * 1.35) continue;
    const t = ang / k.r;
    if (t < 1) {
      alb -= 0.16 * (1 - t * 0.5);
      const toward = norm([k.c[0] - d[0], k.c[1] - d[1], k.c[2] - d[2]]);
      const tilt = 0.9 * t;
      n = norm([n[0] + toward[0] * tilt, n[1] + toward[1] * tilt, n[2] + toward[2] * tilt]);
    } else {
      alb += 0.14 * (1 - (t - 1) / 0.35);
    }
  }
  return { alb, n };
};

// ------------------------------------------------------------ the surfaces ---

const gasGiant = (seed: number, mats: [number, number, number], bands: number, spot?: { c: V3; r: number; mat: number }): Surface => d => {
  const warp = fbm(d[0] * 2.5, d[1] * 2.5, d[2] * 2.5, seed, 3) - 0.5;
  const lat = d[1] + warp * 0.18;
  const band = Math.sin(lat * bands + Math.sin(lat * bands * 0.37) * 1.4);
  const fine = fbm(d[0] * 9, d[1] * 22, d[2] * 9, seed + 5, 3) - 0.5;
  let mat = band > 0.4 ? mats[0] : band < -0.35 ? mats[1] : mats[2];
  let alb = 0.5 + band * 0.12 + fine * 0.5;
  if (spot) {
    const a = Math.acos(Math.min(1, dot(d, spot.c))) / spot.r;
    if (a < 1) { mat = spot.mat; alb = 0.55 + (1 - a) * 0.3 + fine * 0.3; }
  }
  return { mat, alb };
};

const rocky = (seed: number, mat: number, craters: { c: V3; r: number }[], dark = M.rock): Surface => d => {
  const e = fbm(d[0] * 2.2, d[1] * 2.2, d[2] * 2.2, seed);
  const k = applyCraters(d, craters);
  const maria = e < 0.44;
  return { mat: maria ? dark : mat, alb: 0.5 + (e - 0.5) * 0.9 + k.alb, n: k.n };
};

const earthlike = (seed: number): Surface => d => {
  const e = fbm(d[0] * 1.8, d[1] * 1.8, d[2] * 1.8, seed, 5);
  if (Math.abs(d[1]) > 0.86 - (e - 0.5) * 0.3) return { mat: M.cloud, alb: 0.6 };
  if (e < 0.52) return { mat: M.ocean, alb: 0.3 + e * 0.6 };
  if (e > 0.66) return { mat: M.rock, alb: 0.45 + (e - 0.66) * 2 };
  const dry = fbm(d[0] * 4, d[1] * 4, d[2] * 4, seed + 9) > 0.58;
  return { mat: dry ? M.tan : M.land, alb: 0.45 + (e - 0.52) * 1.5 };
};

const cloudShell = (seed: number): Surface => d => {
  const w = fbm(d[0] * 2, d[1] * 2, d[2] * 2, seed + 3, 3);
  const c = fbm(d[0] * 3 + w * 2, d[1] * 6, d[2] * 3 + w * 2, seed + 11, 4);
  if (c < 0.56) return null;
  return { mat: M.cloud, alb: 0.45 + (c - 0.56) * 3 };
};

const lavaWorld = (seed: number, craters: { c: V3; r: number }[]): Surface => d => {
  const e = fbm(d[0] * 2.6, d[1] * 2.6, d[2] * 2.6, seed);
  const ridge = Math.abs(fbm(d[0] * 3.4, d[1] * 3.4, d[2] * 3.4, seed + 7) - 0.5);
  if (ridge < 0.03 || e > 0.7) return { mat: M.lava, alb: 0.55 + (0.03 - Math.min(ridge, 0.03)) * 12, flags: F.emissive };
  const k = applyCraters(d, craters);
  return { mat: M.ash, alb: 0.5 + (e - 0.5) * 0.8 + k.alb, n: k.n };
};

const iceWorld = (seed: number): Surface => d => {
  const e = fbm(d[0] * 2, d[1] * 2, d[2] * 2, seed);
  const crack = Math.abs(fbm(d[0] * 5, d[1] * 5, d[2] * 5, seed + 2) - 0.5) < 0.02;
  return { mat: crack ? M.rust : M.ice, alb: crack ? 0.45 : 0.42 + (e - 0.5) * 0.9 + d[1] * 0.08 };
};

const sunSurface = (seed: number): Surface => d => {
  const g = fbm(d[0] * 7, d[1] * 7, d[2] * 7, seed, 3);
  const spot = fbm(d[0] * 2.4, d[1] * 2.4, d[2] * 2.4, seed + 4, 3) > 0.7;
  return { mat: M.sun, alb: spot ? 0.25 : 0.5 + (g - 0.5) * 1.4, flags: F.emissive };
};

// -------------------------------------------------------------- the scene ---

const ring = (B: Builder, obj: number, r1: number, r2: number, sp: number, seed: number, mat: number) => {
  const N = Math.round((Math.PI * (r2 * r2 - r1 * r1)) / (sp * sp));
  for (let i = 0; i < N; i++) {
    const rr = Math.sqrt(r1 * r1 + ((r2 * r2 - r1 * r1) * (i + 0.5)) / N);
    const t = i * GOLDEN;
    const u = (rr - r1) / (r2 - r1);
    const bands = vnoise(u * 14, 0.5, 0.5, seed);
    if (bands < 0.26 || (u > 0.62 && u < 0.67)) continue; // gaps, and one clean division
    const alb = 0.35 + bands * 0.55 + (vnoise(u * 60, 0.5, 0.5, seed + 1) - 0.5) * 0.25;
    B.surfel([Math.cos(t) * rr, 0, Math.sin(t) * rr], [0, 1, 0], sp * DISC, mat, alb, obj, F.twoSided);
  }
};

/** A lumpy rock: a sphere pushed in and out by noise, its normals taken from the bumps. */
export const lumpy = (B: Builder, obj: number, R: number, sp: number, seed: number, mat: number, rough = 0.38) => {
  const h = (d: V3) => 1 + (fbm(d[0] * 1.6 + 3, d[1] * 1.6, d[2] * 1.6, seed, 3) - 0.5) * 2 * rough;
  const at = (d: V3): V3 => { const k = R * h(d); return [d[0] * k, d[1] * k, d[2] * k]; };
  const N = Math.max(16, Math.round((4 * Math.PI * R * R) / (sp * sp)));
  for (let i = 0; i < N; i++) {
    const y = 1 - (2 * (i + 0.5)) / N;
    const r = Math.sqrt(1 - y * y);
    const phi = i * GOLDEN;
    const d: V3 = [Math.cos(phi) * r, y, Math.sin(phi) * r];
    const ref: V3 = Math.abs(d[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
    const t1 = norm(cross(d, ref));
    const t2 = cross(d, t1);
    const e = 0.08;
    const p = at(d);
    const a = at(norm([d[0] + t1[0] * e, d[1] + t1[1] * e, d[2] + t1[2] * e]));
    const b = at(norm([d[0] + t2[0] * e, d[1] + t2[1] * e, d[2] + t2[2] * e]));
    let n = norm(cross([a[0] - p[0], a[1] - p[1], a[2] - p[2]], [b[0] - p[0], b[1] - p[1], b[2] - p[2]]));
    if (dot(n, d) < 0) n = [-n[0], -n[1], -n[2]];
    const alb = 0.5 + (fbm(d[0] * 5, d[1] * 5, d[2] * 5, seed + 3, 2) - 0.5) * 0.7;
    B.surfel(p, n, sp * DISC, mat, alb, obj);
  }
};

export const hexToRgb = (hex: string): V3 => [parseInt(hex.slice(1, 3), 16) / 255, parseInt(hex.slice(3, 5), 16) / 255, parseInt(hex.slice(5, 7), 16) / 255];
export const scaleRgb = (c: V3, k: number): V3 => [c[0] * k, c[1] * k, c[2] * k];
export const mixRgb = (a: V3, b: V3, t: number): V3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

const PLANET_KINDS = ['ringed', 'rust', 'icegiant', 'earth', 'lava', 'violet', 'ice'] as const;

/**
 * Builds the whole scene for a viewport `viewW` x `viewH` over a page `pageH` tall.
 * Positions depend on all three, so it is rebuilt when they change much.
 */
export const buildScene = (viewW: number, viewH: number, pageH: number, seed = 7): SpaceScene => {
  const rand = mulberry(seed);
  const B = new Builder();
  const f = focalFor(viewH);
  const k = (z: number) => (f - z) / f; // world units per screen pixel at depth z
  /** Where to put something so it shows at `sx` (a share of the width) when page y `y` is mid-screen. */
  const at = (sx: number, y: number, z: number): V3 => [viewW / 2 + (sx * viewW - viewW / 2) * k(z), y, z];
  const sp = (z: number) => SPACING * k(z);
  // Things are drawn at a size that suits the screen: smaller on a phone.
  const s = Math.min(1.1, Math.max(0.5, viewW / 1400));

  // The starfield, deep behind everything: a few layers that parallax at different speeds.
  const stars = B.body({ kind: 'stars', pos: [0, 0, 0] });
  for (const [z, density] of [[-2 * f, 1 / 7000], [-4 * f, 1 / 5000], [-8 * f, 1 / 3200]] as const) {
    const kz = k(z);
    const w = viewW * kz * 1.15;
    const y0 = viewH / 2 - (viewH / 2) * kz - 200;
    const y1 = pageH - viewH / 2 + (viewH / 2) * kz + 200;
    const n = Math.round(((w * (y1 - y0)) / (kz * kz)) * density);
    for (let i = 0; i < n; i++) {
      const p: V3 = [viewW / 2 + (rand() - 0.5) * w, y0 + rand() * (y1 - y0), z * (0.85 + rand() * 0.3)];
      const warm = rand() < 0.15;
      const bright = rand() ** 6;
      B.surfel(p, [0, 0, 1], 1, warm ? M.sun : M.star, 0.15 + bright * 0.95, stars, F.emissive | F.star);
      if (bright > 0.75) B.glowAt(p, (7 + bright * 10) * kz, scaleRgb(warm ? [1, 0.75, 0.5] : [0.6, 0.7, 1], 0.5 + bright * 0.4), stars, G.flicker, rand());
    }
  }

  // Nebulae, far back: soft clouds of glow in violets, pinks and teals.
  const nebulaColours: [string, string, string][] = [
    ['#5e2a7c', '#c85a96', '#ffb4aa'],
    ['#164866', '#3a98a8', '#86d2cc'],
    ['#2a3c8e', '#7c3288', '#ec84a0'],
  ];
  const nebula = B.body({ kind: 'nebula', pos: [0, 0, 0] });
  const nebulaCount = Math.max(3, Math.round(pageH / 1300));
  for (let c = 0; c < nebulaCount; c++) {
    const z = -3.2 * f;
    const kz = k(z);
    const sx = c % 2 ? 0.15 + rand() * 0.2 : 0.65 + rand() * 0.2;
    const centre = at(sx, ((c + 0.6) / nebulaCount) * pageH, z);
    const cols = nebulaColours[c % nebulaColours.length].map(hexToRgb);
    const rx = (380 + rand() * 260) * s * kz;
    const ry = (300 + rand() * 300) * s * kz;
    const ns = seed * 31 + c;
    for (let i = 0; i < 320; i++) {
      const a = rand() * Math.PI * 2;
      const r = Math.sqrt(rand());
      const px = Math.cos(a) * r, py = Math.sin(a) * r;
      const dens = fbm(px * 1.8 + c, py * 1.8, c, ns, 4);
      if (dens < 0.46) continue;
      const t = Math.min(1, Math.max(0, (dens - 0.46) * 4));
      const col = t < 0.5 ? mixRgb(cols[0], cols[1], t * 2) : mixRgb(cols[1], cols[2], (t - 0.5) * 2);
      const p: V3 = [centre[0] + px * rx, centre[1] + py * ry, z + (rand() - 0.5) * f * 0.4];
      B.glowAt(p, (80 + rand() * 90) * s * kz, scaleRgb(col, (0.035 + t * 0.06) * (1 - r * 0.7)), nebula, 0, rand());
    }
  }

  // A distant spiral galaxy, turning very slowly.
  {
    const z = -6 * f;
    const kz = k(z);
    const R = 150 * s * kz;
    const g = B.body({ kind: 'galaxy', name: 'galaxy', pos: at(0.82, pageH * 0.42, z), radius: R, base: basisFor([0.25, -1, 0.55]), spin: 0.01 });
    for (let i = 0; i < 1400; i++) {
      const arm = i % 2;
      const t = rand() ** 0.7;
      const theta = t * 9 + arm * Math.PI + (rand() - 0.5) * 0.7;
      const r = R * (0.06 + t * 0.94);
      const p: V3 = [Math.cos(theta) * r, (rand() - 0.5) * R * 0.05, Math.sin(theta) * r];
      B.surfel(p, [0, 1, 0], 1, t < 0.25 ? M.sun : M.star, 0.2 + (1 - t) * 0.5, g, F.emissive | F.star);
      if (i % 4 === 0) B.glowAt(p, R * 0.12, scaleRgb(t < 0.3 ? [1, 0.7, 0.55] : [0.45, 0.5, 1], 0.09), g, 0, rand());
    }
    B.glowAt([0, 0, 0], R * 0.45, [0.9, 0.7, 0.55], g, 0, 0);
  }

  // The sun, up in the top corner: everything is lit by it.
  const sunZ = -0.7 * f;
  const sunR = 120 * s * k(sunZ);
  const sunPos = at(0.97, 60, sunZ);
  const sun = B.body({ kind: 'sun', name: 'sun', pos: sunPos, radius: sunR, base: basisFor([0.1, -1, 0.2]), spin: 0.03 });
  sphere(B, sun, sunR, sp(sunZ), sunSurface(seed));
  B.glowAt([0, 0, 0], sunR * 2.6, [1, 0.55, 0.25], sun, 0, 0);
  B.glowAt([0, 0, 0], sunR * 1.6, [1, 0.8, 0.45], sun, 0, 0.3);
  for (let i = 0; i < 40; i++) {
    const d = norm([rand() - 0.5, rand() - 0.5, rand() - 0.5]);
    const r = sunR * (1.02 + rand() * 0.15);
    B.glowAt([d[0] * r, d[1] * r, d[2] * r], sunR * (0.2 + rand() * 0.3), [1, 0.6 + rand() * 0.3, 0.3], sun, G.flicker, rand());
  }

  // Planets down the page, on alternate sides, each a different world.
  const first = 1300;
  const step = 1050;
  const count = Math.max(2, Math.floor((pageH - first + 400) / step));
  for (let i = 0; i < count; i++) {
    const kind = PLANET_KINDS[i % PLANET_KINDS.length];
    // The first on the right, leaving the hero's left margin to the blips.
    const left = i % 2 === 1;
    const z = -(0.25 + rand() * 0.6) * f;
    const kz = k(z);
    const spz = sp(z);
    const apparent = (kind === 'ringed' || kind === 'violet' ? 165 : kind === 'icegiant' ? 135 : 110) * s * (0.9 + rand() * 0.2);
    const R = apparent * kz;
    const sx = left ? 0.07 + rand() * 0.05 : 0.93 - rand() * 0.05;
    const pos = at(sx, first + i * step + (rand() - 0.5) * 200, z);
    const axis = norm([(rand() - 0.5) * 0.6, -1, (rand() - 0.2) * 0.9]);
    const base = basisFor(axis);
    const ps = seed * 100 + i * 7;
    const planet = B.body({ kind: 'planet', name: kind, pos, radius: R, base, spin: 0.04 + rand() * 0.05, spin0: rand() * 6 });
    const crater = (n: number, big: number) => makeCraters(rand, n, big);
    if (kind === 'ringed') {
      sphere(B, planet, R, spz, gasGiant(ps, [M.tan, M.amber, M.tan], 13));
      const r = B.body({ kind: 'ring', name: 'rings', pos, radius: R * 2.3, base, shadow: planet });
      ring(B, r, R * 1.35, R * 2.3, spz, ps, M.ring);
    } else if (kind === 'violet') {
      sphere(B, planet, R, spz, gasGiant(ps, [M.violet, M.teal, M.violet], 10, { c: norm([0.5, 0.25, 0.8]), r: 0.22, mat: M.amber }));
    } else if (kind === 'icegiant') {
      sphere(B, planet, R, spz, gasGiant(ps, [M.teal, M.ice, M.ice], 7));
      const r = B.body({ kind: 'ring', name: 'rings', pos, radius: R * 1.9, base: basisFor(norm([axis[0] + 0.3, axis[1], axis[2] - 0.5])), shadow: planet });
      ring(B, r, R * 1.5, R * 1.9, spz, ps, M.ice);
    } else if (kind === 'earth') {
      sphere(B, planet, R, spz, earthlike(ps));
      const cl = B.body({ kind: 'clouds', name: 'clouds', pos, radius: R * 1.04, base, spin: 0.09, shadow: -1 });
      sphere(B, cl, R * 1.04, spz, cloudShell(ps));
      B.glowAt([0, 0, 0], R * 1.25, [0.12, 0.3, 0.55], planet, 0, 0);
      // Aurorae: curtains round both poles, green at their feet and pink above.
      const au = B.body({ kind: 'aurora', name: 'aurora', pos, radius: R * 1.5, base });
      const green: V3 = [0.25, 1, 0.55], pink: V3 = [1, 0.35, 0.75];
      for (const pole of [-1, 1]) {
        for (let i = 0; i < 64; i++) {
          const a = (i / 64) * Math.PI * 2 + rand() * 0.05;
          const colat = 0.36 + Math.sin(a * 3 + pole) * 0.05;
          for (let h = 0; h < 5; h++) {
            const lift = 1.04 + h * 0.1;
            const d: V3 = [Math.sin(colat) * Math.cos(a), pole * Math.cos(colat), Math.sin(colat) * Math.sin(a)];
            B.glowAt([d[0] * R * lift, d[1] * R * lift, d[2] * R * lift], R * 0.12, scaleRgb(mixRgb(green, pink, h / 4), 0.3), au, G.aurora, i / 64);
          }
        }
      }
    } else if (kind === 'rust') {
      sphere(B, planet, R, spz, rocky(ps, M.rust, crater(26, 0.32), M.rock));
    } else if (kind === 'lava') {
      sphere(B, planet, R, spz, lavaWorld(ps, crater(14, 0.25)));
      B.glowAt([0, 0, 0], R * 1.3, [0.5, 0.12, 0.04], planet, G.flicker, 0.5);
    } else {
      sphere(B, planet, R, spz, iceWorld(ps));
    }
    // Moons, on tilted orbits, shadowed by their planet as they pass behind it.
    const moons = kind === 'rust' ? 2 : kind === 'earth' || kind === 'violet' || kind === 'ringed' ? 1 : kind === 'ice' ? 1 : 0;
    for (let m = 0; m < moons; m++) {
      const mr = R * (0.16 + rand() * 0.1);
      const orbitR = R * (kind === 'ringed' ? 2.8 : 1.9 + m * 0.7 + rand() * 0.3);
      const moon = B.body({
        kind: 'moon', name: 'moon', pos, radius: mr, base: basisFor([rand() - 0.5, -1, rand() - 0.5]), spin: 0.1, shadow: planet,
        orbit: { parent: planet, radius: orbitR, rate: (0.12 + rand() * 0.1) * (rand() < 0.5 ? -1 : 1), phase: rand() * 6.28, base: basisFor(norm([rand() - 0.5, -1, 0.35])) },
      });
      sphere(B, moon, mr, spz, rocky(ps + 40 + m, M.moon, crater(12, 0.45), M.rock));
    }
  }

  // An asteroid belt crossing the middle of the page, drifting and tumbling, with stragglers everywhere.
  const rock = (y: number, z: number, apparent: number, belt: boolean) => {
    const kz = k(z);
    const R = apparent * s * kz;
    const pos = at(rand() * 1.2 - 0.1, y, z);
    const span = viewW * kz;
    const id = B.body({
      kind: 'asteroid', name: 'asteroid', pos, radius: R * 1.4, base: basisFor(norm([rand() - 0.5, rand() - 0.5, rand() - 0.5])),
      spin: (0.2 + rand() * 0.6) * (rand() < 0.5 ? -1 : 1), spin0: rand() * 6,
      drift: { vx: (belt ? 6 + rand() * 10 : (rand() - 0.5) * 8) * kz, min: viewW / 2 - span * 0.75, max: viewW / 2 + span * 0.75 },
    });
    lumpy(B, id, R, sp(z), seed * 7 + B.bodies.length, rand() < 0.3 ? M.rust : M.rock);
  };
  const beltY = pageH * 0.55;
  for (let i = 0; i < 90; i++) rock(beltY + (rand() - 0.5) * 520 + (rand() - 0.5) * 300, -(rand() ** 1.5) * 1.2 * f + 0.1 * f, 3 + rand() ** 3 * 22, true);
  for (let i = 0; i < Math.round(pageH / 180); i++) rock(rand() * pageH, -rand() * 0.8 * f, 3 + rand() ** 4 * 14, false);
  // A few big ones close to the camera, drifting past in front of everything.
  for (let i = 0; i < Math.round(pageH / 1800) + 1; i++) rock(rand() * pageH, 0.25 * f + rand() * 0.15 * f, 18 + rand() * 14, false);

  // A black hole, far back, its disk swirling and everything behind it bent into a ring.
  let blackHole: SpaceScene['blackHole'] = null;
  {
    const z = -1.2 * f;
    const kz = k(z);
    const rh = 24 * s * kz;
    // Somewhere in a margin no planet ever passes over.
    const y0 = pageH * (pageH > 4000 ? 0.7 : 0.6);
    const cands: Disc[] = [];
    for (const dy of [0, -350, 350, -700, 700, -1050, 1050]) for (const sx of [0.1, 0.88]) cands.push({ pos: at(sx, Math.min(pageH - 300, Math.max(900, y0 + dy)), z), r: rh * 5 });
    const spot = pickClear(cands, obstaclesOf(B.bodies), f, viewW, viewH);
    const bh = B.body({ kind: 'blackhole', name: 'black hole', pos: spot.pos, radius: rh * 4.2, base: basisFor(norm([0.12, -1, 0.32])), spin: 0.55 });
    const spd = sp(z) * 0.7;
    const r1 = rh * 1.7, r2 = rh * 4.2;
    const N = Math.round((Math.PI * (r2 * r2 - r1 * r1)) / (spd * spd));
    for (let i = 0; i < N; i++) {
      const rr = Math.sqrt(r1 * r1 + ((r2 * r2 - r1 * r1) * (i + 0.5)) / N);
      const a = i * GOLDEN;
      const u = (rr - r1) / (r2 - r1);
      const streak = fbm(Math.cos(a) * 2 + u * 6, Math.sin(a) * 2 + u * 6, a * 0.3, seed + 77, 3);
      const hot = 1 - u;
      const mat = hot > 0.62 ? M.sun : M.lava;
      B.surfel([Math.cos(a) * rr, 0, Math.sin(a) * rr], [0, 1, 0], spd * DISC, mat, Math.min(1, 0.2 + hot * 0.6 + (streak - 0.5) * 0.9), bh, F.emissive | F.twoSided | F.front);
    }
    for (let i = 0; i < 26; i++) {
      const a = (i / 26) * Math.PI * 2;
      const rr = rh * (2 + rand() * 1.8);
      B.glowAt([Math.cos(a) * rr, 0, Math.sin(a) * rr], rh * 1.2, [0.55, 0.22, 0.08], bh, G.flicker, rand());
    }
    blackHole = { body: bh, r: rh };
  }

  // A comet sweeping across, its tails streaming away from the sun.
  {
    const z = -0.35 * f;
    const kz = k(z);
    const y = pageH * 0.3;
    const R = 7 * s * kz;
    const comet = B.body({
      kind: 'comet', name: 'comet', pos: at(0.5, y, z), radius: R, faceAway: true,
      path: { from: at(-0.25, y - 320, z), to: at(1.25, y + 260, z), period: 140, phase: 0.3 },
    });
    lumpy(B, comet, R, sp(z) * 0.8, seed + 900, M.ice, 0.3);
    B.glowAt([0, 0, 0], R * 4, [0.55, 0.85, 1], comet, 0, 0);
    B.glowAt([0, 0, 0], R * 7, [0.2, 0.45, 0.7], comet, 0, 0.5);
    const len = 360 * s * kz;
    for (let i = 0; i < 70; i++) {
      const ion = i % 2 === 0;
      const spread = ion ? 0.25 : 1;
      B.glowAt([0, (rand() - 0.5) * R * 2 * spread, (rand() - 0.5) * R * 2 * spread], R * (ion ? 1.6 : 2.4), ion ? [0.35, 0.6, 1] : [0.8, 0.6, 0.5], comet, G.stream, rand(), len * (ion ? 1 : 0.7));
    }
  }

  // The cute ones: blips on their rocks, and saucers visiting them.
  const planets = B.bodies.map((b, i) => (b.kind === 'planet' ? i : -1)).filter(i => i >= 0);
  const life = populateAliens(B, { rand, at, k, sp, s, f, viewW, viewH, pageH, planets, seed });
  const events = populateEvents(B, { rand, k, sp, s, f, sunR, sunZ });

  return {
    solid: new Float32Array(B.solid),
    solidCount: B.solid.length / SOLID_STRIDE,
    glow: new Float32Array(B.glow),
    glowCount: B.glow.length / GLOW_STRIDE,
    bodies: B.bodies,
    sun: sunPos,
    focal: f,
    life,
    events,
    blackHole,
  };
};

/** A circle in the world, for keeping things from piling up on screen. */
export interface Disc { pos: V3; r: number }

/**
 * How far apart two discs ever come on screen, edge to edge, over any scroll
 * where both are in view (negative: they overlap). Deeper things scroll slower,
 * so two that look apart at one scroll can meet at another.
 */
export const screenClearance = (a: Disc, b: Disc, f: number, viewW: number, viewH: number) => {
  const ka = (f - a.pos[2]) / f, kb = (f - b.pos[2]) / f;
  const ra = a.r / ka, rb = b.r / kb;
  const dx = Math.abs((a.pos[0] - viewW / 2) / ka - (b.pos[0] - viewW / 2) / kb);
  // Scrolls (camera centre y) where each is at least partly in view.
  const lo = Math.max(a.pos[1] - (viewH / 2 + ra) * ka, b.pos[1] - (viewH / 2 + rb) * kb);
  const hi = Math.min(a.pos[1] + (viewH / 2 + ra) * ka, b.pos[1] + (viewH / 2 + rb) * kb);
  if (lo > hi) return Infinity;
  const gap = (c: number) => (a.pos[1] - c) / ka - (b.pos[1] - c) / kb;
  const g0 = gap(lo), g1 = gap(hi);
  const dy = g0 * g1 <= 0 ? 0 : Math.min(Math.abs(g0), Math.abs(g1));
  return Math.hypot(dx, dy) - ra - rb;
};

/** Everything big already in the scene: the sun, planets with their rings and moons' orbits, the black hole. */
export const obstaclesOf = (bodies: Body[]): Disc[] => bodies.flatMap(b => {
  if (b.kind === 'planet' || b.kind === 'ring' || b.kind === 'sun' || b.kind === 'blackhole' || b.kind === 'gardenmoon') return [{ pos: b.pos, r: b.radius * 1.1 }];
  if (b.kind === 'moon' && b.orbit) return [{ pos: bodies[b.orbit.parent].pos, r: b.orbit.radius + b.radius * 1.5 }];
  return [];
});

/** The first candidate clear of every obstacle, or failing that the one with the most room (`room` says how much). */
export const pickClear = (cands: Disc[], obstacles: Disc[], f: number, viewW: number, viewH: number, margin = 24): Disc & { room: number } => {
  let best = cands[0], bestRoom = -Infinity;
  for (const c of cands) {
    const room = Math.min(Infinity, ...obstacles.map(o => screenClearance(c, o, f, viewW, viewH)));
    if (room >= margin) return { ...c, room };
    if (room > bestRoom) { bestRoom = room; best = c; }
  }
  return { ...best, room: bestRoom };
};

/** The camera, as the view draws with it. */
export interface SpaceCamera { viewW: number; viewH: number; scrollY: number; offX: number; offY: number }

/** Where a world point lands in the window, in CSS pixels. */
export const toScreen = (scene: SpaceScene, cam: SpaceCamera, w: V3): [number, number] => {
  const sc = scene.focal / (scene.focal - w[2]);
  return [cam.viewW / 2 + (w[0] - cam.viewW / 2 - cam.offX) * sc + cam.offX, cam.viewH / 2 + (w[1] - cam.scrollY - cam.viewH / 2 - cam.offY) * sc + cam.offY];
};

/** The world point at depth `z` that lands on window point (`sx`, `sy`). */
export const fromScreen = (scene: SpaceScene, cam: SpaceCamera, sx: number, sy: number, z: number): V3 => {
  const sc = scene.focal / (scene.focal - z);
  return [(sx - cam.viewW / 2 - cam.offX) / sc + cam.viewW / 2 + cam.offX, (sy - cam.viewH / 2 - cam.offY) / sc + cam.scrollY + cam.viewH / 2 + cam.offY, z];
};

/** A rotation whose local up (-y) points along `n`, its face (+z) as near the viewer as it can. */
export const uprightOn = (n: V3): number[] => {
  const y: V3 = [-n[0], -n[1], -n[2]];
  const x = norm(cross(y, [0, 0, 1]));
  const z = cross(x, y);
  return [x[0], y[0], z[0], x[1], y[1], z[1], x[2], y[2], z[2]];
};

/** Where a free body (not attached, not driven by behaviour) is at time `t`. */
export const centreAt = (scene: SpaceScene, i: number, t: number, centres?: V3[]): V3 => {
  const b = scene.bodies[i];
  if (b.orbit) {
    const pc = centres ? centres[b.orbit.parent] : centreAt(scene, b.orbit.parent, t);
    const a = b.orbit.phase + t * b.orbit.rate;
    const o = b.orbit.base;
    const lx = Math.cos(a) * b.orbit.radius, lz = Math.sin(a) * b.orbit.radius;
    return [pc[0] + o[0] * lx + o[2] * lz, pc[1] + o[3] * lx + o[5] * lz, pc[2] + o[6] * lx + o[8] * lz];
  }
  if (b.drift) {
    const span = b.drift.max - b.drift.min;
    const x = b.drift.min + ((((b.pos[0] - b.drift.min + t * b.drift.vx) % span) + span) % span);
    return [x, b.pos[1], b.pos[2]];
  }
  if (b.path) {
    const u = (((t / b.path.period + b.path.phase) % 1) + 1) % 1;
    return [
      b.path.from[0] + (b.path.to[0] - b.path.from[0]) * u,
      b.path.from[1] + (b.path.to[1] - b.path.from[1]) * u,
      b.path.from[2] + (b.path.to[2] - b.path.from[2]) * u,
    ];
  }
  if (b.bob) {
    const a = t * b.bob.rate + b.bob.phase;
    return [b.pos[0] + Math.sin(a * 0.7) * b.bob.amp * 0.6, b.pos[1] + Math.sin(a) * b.bob.amp, b.pos[2] + Math.cos(a * 0.8) * b.bob.amp * 0.5];
  }
  return b.pos;
};

export const rotate = (m: number[], v: V3): V3 => [m[0] * v[0] + m[1] * v[1] + m[2] * v[2], m[3] * v[0] + m[4] * v[1] + m[5] * v[2], m[6] * v[0] + m[7] * v[1] + m[8] * v[2]];

/**
 * Writes every body's transform at time `t` (seconds) into `out`: per body,
 * three rows of a 3x4 matrix, the sphere that can shadow it (centre, radius),
 * and its state. Attached parts ride their parents, which come first.
 */
export const poseBodies = (scene: SpaceScene, t: number, out: Float32Array) => {
  const { bodies } = scene;
  const centres: V3[] = [];
  const rots: number[][] = [];
  for (let i = 0; i < bodies.length; i++) {
    const b = bodies[i];
    let c: V3;
    let rot: number[];
    if (b.attach) {
      const pr = rots[b.attach.parent];
      const ps = bodies[b.attach.parent].scale ?? [1, 1, 1];
      const off = rotate(pr, [b.attach.offset[0] * ps[0], b.attach.offset[1] * ps[1], b.attach.offset[2] * ps[2]]);
      const pc = centres[b.attach.parent];
      c = [pc[0] + off[0], pc[1] + off[1], pc[2] + off[2]];
      rot = mul3(pr, b.live?.rot ?? b.base);
    } else if (b.live) {
      c = b.live.c;
      rot = b.live.rot;
    } else {
      c = centreAt(scene, i, t, centres);
      rot = b.spin ? mul3(b.base, rotY(b.spin0 + t * b.spin)) : b.base;
    }
    if (b.faceAway) {
      const x = norm([c[0] - scene.sun[0], c[1] - scene.sun[1], c[2] - scene.sun[2]]);
      const y = norm(cross([0, 0, 1], x));
      const z = cross(x, y);
      rot = [x[0], y[0], z[0], x[1], y[1], z[1], x[2], y[2], z[2]];
    }
    centres.push(c);
    rots.push(rot);
    const sc = b.scale ?? [1, 1, 1];
    const o = i * OBJ_TEXELS * 4;
    out[o] = rot[0] * sc[0]; out[o + 1] = rot[1] * sc[1]; out[o + 2] = rot[2] * sc[2]; out[o + 3] = c[0];
    out[o + 4] = rot[3] * sc[0]; out[o + 5] = rot[4] * sc[1]; out[o + 6] = rot[5] * sc[2]; out[o + 7] = c[1];
    out[o + 8] = rot[6] * sc[0]; out[o + 9] = rot[7] * sc[1]; out[o + 10] = rot[8] * sc[2]; out[o + 11] = c[2];
    out[o + 12] = 0; out[o + 13] = 0; out[o + 14] = 0; out[o + 15] = 0;
    const p = b.params;
    out[o + 16] = p ? p[0] : 0; out[o + 17] = p ? p[1] : 0; out[o + 18] = p ? p[2] : 0; out[o + 19] = p ? p[3] : 0;
  }
  // Shadow spheres last, once every centre is known.
  for (let i = 0; i < bodies.length; i++) {
    const sh = bodies[i].shadow;
    if (sh < 0) continue;
    const o = i * OBJ_TEXELS * 4 + 12;
    out[o] = centres[sh][0]; out[o + 1] = centres[sh][1]; out[o + 2] = centres[sh][2]; out[o + 3] = bodies[sh].radius;
  }
  scene.centres = centres;
};
