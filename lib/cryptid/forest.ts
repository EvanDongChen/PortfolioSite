/**
 * The cryptid forest's world: a dark wood at night, seen from above at an
 * angle the way the shrine forest is, lit by the moon through the canopy, by a
 * smouldering campfire and glowing mushrooms, and by the visitor's flashlight,
 * which follows the cursor. Built the way the sky islands are (see lib/sky/sky.ts
 * and the pixel-3d skill): every solid thing is a cloud of surfels with a
 * material and a shade, light is soft glows, and `forestView.ts` turns it all
 * into pixel art. The forest floor itself isn't geometry: the view paints it in
 * its pixel pass (moss, leaf litter, the trail, clearings, ponds) wherever no
 * solid is, so glows show over it.
 *
 * No DOM. Coordinates are CSS pixels: x across the page, y down it, z towards
 * the viewer; the floor is the plane z = 0, which scrolls with the content.
 * Things standing on it lean towards the viewer by `TILT` (their up is
 * (0, -cos, sin)), so trees rise up the screen and their crowns come nearer:
 * the forest is seen from above at an angle.
 */

import { DISC, GOLDEN, IDENTITY, SPACING, V3, cross, fbm, focalFor, mul3, mulberry, norm, rotX, rotY, rotate } from '../space/space';
import { ForestLife, populateLife } from './forestLife';

export { focalFor };

// ---------------------------------------------------------------- palette ---

/** Material ramps, darkest first. Moonlight reaches the first two or three steps; the flashlight and fire the rest. */
export const RAMPS: string[][] = [
  /* 0 bark     */ ['#07080f', '#14121c', '#261e26', '#3e3030', '#5e4838', '#86684a'],
  /* 1 needle   */ ['#050b10', '#0b1a1e', '#12302c', '#1e4a38', '#336c44', '#5c9652'],
  /* 2 leaf     */ ['#060e12', '#0e2020', '#1a3a26', '#2c5a2c', '#4a8234', '#86b250'],
  /* 3 moss     */ ['#08120f', '#12261e', '#1e4228', '#346230', '#568a38', '#94bc56'],
  /* 4 stone    */ ['#0a0c18', '#171a28', '#282c3c', '#424656', '#666a76', '#9c9ea4'],
  /* 5 fur      */ ['#0a0708', '#1a1012', '#2e1e1a', '#4a3022', '#704a30', '#9e6e46'],
  /* 6 pale     */ ['#121628', '#2c3250', '#585f7e', '#9098ae', '#cad0dc', '#f4f6f8'],
  /* 7 moth     */ ['#08080e', '#131119', '#221e2a', '#36303e', '#544c5c', '#7a7080'],
  /* 8 redeye   */ ['#4a080c', '#7c1212', '#b81e1e', '#e8382a', '#ff6a48', '#ffb08a'],
  /* 9 shine    */ ['#123e28', '#206a3e', '#3aa452', '#6ed470', '#acf29a', '#e6ffd6'],
  /* 10 deer    */ ['#0e090c', '#1e1416', '#36241e', '#563a2a', '#80583a', '#ac8458'],
  /* 11 owl     */ ['#0c090e', '#1c1519', '#322624', '#523e32', '#78624a', '#a68e6a'],
  /* 12 coon    */ ['#09090f', '#16161e', '#2a2a34', '#44444e', '#686870', '#9a9aa0'],
  /* 13 black   */ ['#030306', '#07070c', '#0e0e14', '#18181e', '#24242c', '#34343e'],
  /* 14 fire    */ ['#6a160a', '#a8300c', '#e05e18', '#f8942a', '#ffc850', '#fff0a0'],
  /* 15 canvas  */ ['#0c1018', '#18202a', '#283640', '#3e5452', '#5c7464', '#8aa084'],
  /* 16 cooler  */ ['#10080e', '#260e18', '#461420', '#721e26', '#a63430', '#dc6446'],
  /* 17 glowcap */ ['#0c3442', '#125a68', '#1a8690', '#36b8b4', '#78e0d4', '#c6fff2'],
  /* 18 devil   */ ['#0e0606', '#220e0c', '#3c1812', '#5c2618', '#863a20', '#b0582e'],
  /* 19 wendigo */ ['#100e14', '#24202a', '#403a44', '#665e68', '#948a90', '#c6bebe'],
  /* 20 bone    */ ['#161210', '#2e2620', '#504234', '#786650', '#a89272', '#d8c8a2'],
  /* 21 nessie  */ ['#04090c', '#0a1618', '#122a26', '#1e4034', '#325c48', '#548466'],
  /* 22 gold    */ ['#3a3208', '#6a5a10', '#a2881a', '#d4b430', '#f2dc5c', '#fff6a8'],
  /* 23 autumn  */ ['#100808', '#241210', '#422012', '#6a3418', '#984e22', '#c87632'],
  /* 24 birch   */ ['#16181e', '#30343a', '#5a5e62', '#8e9090', '#c4c4be', '#ecebe2'],
  /* 25 amanita */ ['#1a0608', '#3a0a0e', '#661214', '#9a1e1a', '#cc3626', '#f2643c'],
  /* 26 mud     */ ['#050406', '#0c0a0c', '#161212', '#221c18', '#342a22', '#4a3c2e'],
  /* 27 snack   */ ['#2a1a08', '#4e3412', '#7e5a1e', '#b48a30', '#e0ba52', '#fff0a0'],
  /* 28 white   */ ['#2a2e3a', '#565c6a', '#8a909a', '#bcc0c6', '#e2e4e6', '#ffffff'],
  /* 29 blue    */ ['#060a1a', '#0c1630', '#14264e', '#203c74', '#345aa0', '#5a86cc'],
];
export const SHADES = 6;
export const M = {
  bark: 0, needle: 1, leaf: 2, moss: 3, stone: 4, fur: 5, pale: 6, moth: 7, redeye: 8, shine: 9, deer: 10, owl: 11, coon: 12,
  black: 13, fire: 14, canvas: 15, cooler: 16, glowcap: 17, devil: 18, wendigo: 19, bone: 20, nessie: 21, gold: 22, autumn: 23,
  birch: 24, amanita: 25, mud: 26, snack: 27, white: 28, blue: 29,
} as const;

/**
 * What the forest floor and the glows over it snap to. Each ground colour is
 * here at moonlight levels (cold and dark), at flashlight levels (warm), and by
 * firelight; then the light's own colours.
 */
export const FLOOR_PALETTE: string[] = (() => {
  const grounds: V3[] = [
    [0.22, 0.36, 0.2], // moss
    [0.42, 0.26, 0.14], // leaf litter
    [0.4, 0.32, 0.22], // the trail's dirt
    [0.3, 0.42, 0.24], // clearing grass
    [0.12, 0.16, 0.22], // pond water
  ];
  const out: string[] = [];
  const hex = (c: V3) => '#' + c.map(v => Math.round(Math.max(0, Math.min(1, v)) * 255).toString(16).padStart(2, '0')).join('');
  out.push('#020308', '#05070e', '#080b14');
  for (const g of grounds) {
    for (const k of [0.1, 0.17, 0.26, 0.36]) out.push(hex([g[0] * k * 0.7 + 0.01, g[1] * k * 0.85 + 0.015, g[2] * k + 0.04 * k / 0.36]));
    for (const k of [0.55, 0.8, 1.05, 1.35]) out.push(hex([g[0] * k * 1.1, g[1] * k, g[2] * k * 0.8]));
    for (const k of [0.5, 0.85]) out.push(hex([g[0] * k * 1.6, g[1] * k * 0.95, g[2] * k * 0.5]));
  }
  out.push(
    // The flashlight's hot spot and the moon on water.
    '#fff4d8', '#f4e2b4', '#a8b8d8', '#6e80a8',
    // Firelight and embers.
    '#ff9a3a', '#ffc860', '#e05a1a', '#8a2a10',
    // Glowing mushrooms and foxfire.
    '#3abcb4', '#7ae0d4', '#1a6a70',
    // Fireflies.
    '#e6f070', '#b4d044', '#fffcb0',
    // Mist.
    '#3a4458', '#5a6478', '#8a92a6',
    // Eyes in the dark.
    '#ff4a3a', '#7ae07a',
  );
  return out;
})();

/** Surfel flags. */
export const F = {
  emissive: 1, twoSided: 2,
  /** Sways side to side with height above the object's wobble base. */
  wobble: 8,
  /** Hidden while the object blinks (its state is on). */
  eye: 16,
  /** Eyeshine: dark until the flashlight finds it, then it glows. */
  shine: 32,
  /** A moth: flutters round its spot. */
  flit: 64,
  /** Flickers like flame. */
  flame: 128,
  /** Shown only while the object's state is on (a screech, open wings). */
  on: 256,
  /** Shown only while the object's state is off (folded wings). */
  off: 512,
} as const;
/** Glow flags. */
export const G = {
  /** Rises its stream length (negative) and fades: sparks, smoke. */
  rise: 1, flicker: 2,
  /** A firefly: drifts round its spot and pulses, and goes dark in the flashlight's beam. */
  firefly: 4,
  /** Only as bright as the object's state. */
  gate: 16,
} as const;

/** Floats per surfel: x y z, nx ny nz, radius, material, albedo, object, flags. */
export const SOLID_STRIDE = 11;
/** Floats per glow: x y z, radius, r g b, object, flags, seed, stream length. */
export const GLOW_STRIDE = 11;
/** Texels per object in the transform texture: three rows of a 3x4 matrix, its look (visibility), then its state. */
export const OBJ_TEXELS = 5;

/** How far things standing on the floor lean towards the viewer, from the page's plane (radians). */
export const TILT = 0.62;
/** Up, for something standing on the floor. */
export const UP: V3 = [0, -Math.cos(TILT), Math.sin(TILT)];
/** The rotation that stands something built upright (local -y up, facing +x) on the floor, turned by `yaw`. */
export const upright = (yaw = 0) => mul3(rotX(-TILT), rotY(yaw));

// ---------------------------------------------------------------- objects ---

export type ForestKind =
  | 'ground' | 'bigfoot' | 'limb' | 'crawler' | 'mothman' | 'wing' | 'devil' | 'wendigo' | 'nessie'
  | 'owl' | 'owlhead' | 'deer' | 'raccoon' | 'moths' | 'flies' | 'snack' | 'flash' | 'leaves' | 'prints';

export interface Body {
  kind: ForestKind;
  name: string;
  /** Centre at time 0. */
  pos: V3;
  radius: number;
  base: number[];
  /** Set each frame by behaviour; for an attached part only `rot` is used, relative to its parent. */
  live?: { c: V3; rot: number[] };
  scale?: V3;
  attach?: { parent: number; offset: V3 };
  /** Wobble amount, wobble base, blink or gate, phase. */
  params?: [number, number, number, number];
  /** How much of it shows (dissolving in and out of the dark), 0..1. */
  vis?: number;
}

/** A place up in a dead tree where something can perch: where, and which way is out from the trunk. */
export interface Perch { p: V3; out: number; tree: number }

/** A tree, for the creatures to hide behind and perch in. */
export interface Tree { foot: V3; h: number; r: number; kind: 'pine' | 'dead' | 'birch' }

export interface Pond { c: V3; rx: number; ry: number }

export interface Camp {
  c: V3;
  fire: V3;
  cooler: V3;
  /** Where the raccoons' prize is tipped out: in front of the cooler. */
  spill: V3;
  r: number;
}

export interface Clearing { c: V3; r: number }

/** A light on the floor: position, reach, colour and how it flickers. */
export interface Light { p: V3; r: number; col: V3; flicker: number; kind: 'fire' | 'cap' }

export interface ForestScene {
  solid: Float32Array;
  solidCount: number;
  glow: Float32Array;
  glowCount: number;
  bodies: Body[];
  focal: number;
  viewW: number;
  viewH: number;
  pageH: number;
  s: number;
  /** The trail's line down the page: x = path[0] + Σ amp·sin(y·freq + phase) for the three waves after it. */
  path: number[];
  pathW: number;
  ponds: Pond[];
  clearings: Clearing[];
  camp: Camp;
  trees: Tree[];
  perches: Perch[];
  lights: Light[];
  life: ForestLife;
  /** Every body's centre and rotation as last posed. */
  centres?: V3[];
  rots?: number[][];
}

export class Builder {
  solid: number[] = [];
  glow: number[] = [];
  bodies: Body[] = [];

  body(b: Partial<Body> & { kind: ForestKind; pos: V3 }): number {
    this.bodies.push({ name: b.kind, radius: 0, base: IDENTITY, ...b });
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

/** Cover a sphere of radius R, centred at `c` in its body's frame, with surfels spaced `sp` apart. */
export const sphere = (B: Builder, obj: number, R: number, sp: number, surface: Surface, c: V3 = [0, 0, 0], flags = 0) => {
  const N = Math.max(12, Math.round((4 * Math.PI * R * R) / (sp * sp)));
  for (let i = 0; i < N; i++) {
    const y = 1 - (2 * (i + 0.5)) / N;
    const r = Math.sqrt(1 - y * y);
    const phi = i * GOLDEN;
    const d: V3 = [Math.cos(phi) * r, y, Math.sin(phi) * r];
    const s = surface(d);
    if (!s) continue;
    const k = R * (1 + (s.h ?? 0));
    B.surfel([c[0] + d[0] * k, c[1] + d[1] * k, c[2] + d[2] * k], s.n ?? d, sp * DISC, s.mat, s.alb, obj, flags | (s.flags ?? 0));
  }
};

/** An ellipsoid with semi-axes `ax`, centred at `c`. */
export const ellipsoid = (B: Builder, obj: number, ax: V3, sp: number, surface: Surface, c: V3 = [0, 0, 0], flags = 0) => {
  const mean = (ax[0] * ax[1] + ax[1] * ax[2] + ax[0] * ax[2]) / 3;
  const N = Math.max(12, Math.round((4 * Math.PI * mean) / (sp * sp)));
  for (let i = 0; i < N; i++) {
    const y = 1 - (2 * (i + 0.5)) / N;
    const r = Math.sqrt(1 - y * y);
    const phi = i * GOLDEN;
    const d: V3 = [Math.cos(phi) * r, y, Math.sin(phi) * r];
    const s = surface(d);
    if (!s) continue;
    const n = norm([d[0] / ax[0], d[1] / ax[1], d[2] / ax[2]]);
    B.surfel([c[0] + d[0] * ax[0], c[1] + d[1] * ax[1], c[2] + d[2] * ax[2]], s.n ?? n, sp * DISC, s.mat, s.alb, obj, flags | (s.flags ?? 0));
  }
};

/** A tube along a path: rings of surfels round each step, `radius(u)` thick at a share `u` of the way along. */
export const tube = (B: Builder, obj: number, path: V3[], radius: (u: number) => number, sp: number, surface: (u: number, n: V3) => { mat: number; alb: number; flags?: number } | null, flags = 0) => {
  let run = 0;
  let next = 0;
  const total = path.reduce((s, p, i) => (i ? s + Math.hypot(p[0] - path[i - 1][0], p[1] - path[i - 1][1], p[2] - path[i - 1][2]) : 0), 0);
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1], b = path[i];
    const seg = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    const t = norm([b[0] - a[0], b[1] - a[1], b[2] - a[2]]);
    const ref: V3 = Math.abs(t[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
    const e1 = norm(cross(t, ref));
    const e2 = cross(t, e1);
    while (next <= run + seg) {
      const f = (next - run) / Math.max(seg, 1e-6);
      const c: V3 = [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
      const u = next / Math.max(total, 1e-6);
      const r = radius(u);
      const n = Math.max(4, Math.round((2 * Math.PI * r) / sp));
      for (let k = 0; k < n; k++) {
        const ang = (k / n) * Math.PI * 2;
        const d: V3 = [e1[0] * Math.cos(ang) + e2[0] * Math.sin(ang), e1[1] * Math.cos(ang) + e2[1] * Math.sin(ang), e1[2] * Math.cos(ang) + e2[2] * Math.sin(ang)];
        const s = surface(u, d);
        if (!s) continue;
        B.surfel([c[0] + d[0] * r, c[1] + d[1] * r, c[2] + d[2] * r], d, Math.max(sp, (2 * Math.PI * r) / n) * DISC, s.mat, s.alb, obj, flags | (s.flags ?? 0));
      }
      next += sp * 0.8;
    }
    run += seg;
  }
};

export const hexToRgb = (hex: string): V3 => [parseInt(hex.slice(1, 3), 16) / 255, parseInt(hex.slice(3, 5), 16) / 255, parseInt(hex.slice(5, 7), 16) / 255];
const hash2 = (a: number, b: number) => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); };

/**
 * Turns everything added since `from` (surfels) and `gfrom` (glows) by `rot`
 * and moves it to `pos`: for scenery built upright and stood on the floor in
 * the ground body. Surfels left facing well away from the viewer are dropped,
 * since nothing ever turns them round.
 */
export const place = (B: Builder, from: number, gfrom: number, rot: number[], pos: V3, cull = true) => {
  const S = B.solid;
  let w = from;
  for (let i = from; i < S.length; i += SOLID_STRIDE) {
    const p = rotate(rot, [S[i], S[i + 1], S[i + 2]]);
    const n = rotate(rot, [S[i + 3], S[i + 4], S[i + 5]]);
    const flags = S[i + 10];
    if (cull && !(flags & F.twoSided) && n[2] < -0.45) continue;
    S[w] = p[0] + pos[0]; S[w + 1] = p[1] + pos[1]; S[w + 2] = p[2] + pos[2];
    S[w + 3] = n[0]; S[w + 4] = n[1]; S[w + 5] = n[2];
    for (let k = 6; k < SOLID_STRIDE; k++) S[w + k] = S[i + k];
    w += SOLID_STRIDE;
  }
  S.length = w;
  const Gl = B.glow;
  for (let i = gfrom; i < Gl.length; i += GLOW_STRIDE) {
    const p = rotate(rot, [Gl[i], Gl[i + 1], Gl[i + 2]]);
    Gl[i] = p[0] + pos[0]; Gl[i + 1] = p[1] + pos[1]; Gl[i + 2] = p[2] + pos[2];
  }
};

/** A point built upright at `local` (relative to something stood at `foot`, turned by `yaw`), in the world. */
export const standAt = (foot: V3, local: V3, yaw = 0): V3 => {
  const w = rotate(upright(yaw), local);
  return [foot[0] + w[0], foot[1] + w[1], foot[2] + w[2]];
};

// ---------------------------------------------------------------- scenery ---
// Each builder works upright, about its own foot (local -y up), into the
// ground body; `stand` then turns it onto the floor.

interface Ctx {
  rand: () => number;
  s: number;
  sp: number;
}

/** A dark pine: a straight trunk under tiers of drooping, ragged boughs. */
const pine = (B: Builder, g: number, h: number, ctx: Ctx, seed: number) => {
  const { rand } = ctx;
  const sp = ctx.sp * 2.1;
  const trunkR = h * 0.035;
  for (let y = 0; y < h * 0.35; y += sp * 0.75) {
    const n = Math.max(5, Math.round((2 * Math.PI * trunkR) / (sp * 0.8)));
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const d: V3 = [Math.cos(a), 0, Math.sin(a)];
      B.surfel([d[0] * trunkR, -y, d[2] * trunkR], d, sp * DISC, M.bark, 0.42 + (hash2(a * 3, y) - 0.5) * 0.25, g);
    }
  }
  // Tiers of boughs, each a star of drooping sprays: lit along their ridges, dark in the gaps between,
  // so the tree reads as layered boughs rather than one dark cone.
  const tiers = 6 + Math.floor(rand() * 2);
  for (let t = 0; t < tiers; t++) {
    const u = t / (tiers - 1);
    const rimY = -h * (0.14 + u * 0.74);
    const R = h * 0.2 * (1 - u * 0.82) * (0.88 + rand() * 0.24) + h * 0.02;
    const tall = h * 0.13 + R * 0.25;
    const boughs = t < 2 ? 8 : t < 4 ? 7 : 5;
    const ph = rand() * Math.PI * 2;
    const rows = Math.ceil(tall / (sp * 0.9));
    for (let j = 0; j <= rows; j++) {
      const v = j / rows; // 0 at the rim, 1 at the tier's top
      const r = R * (1 - v);
      const n = Math.max(3, Math.round((2 * Math.PI * r * 1.15) / sp));
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + j * 0.21;
        const star = (0.5 + 0.5 * Math.cos(a * boughs + ph + Math.sin(a * 3 + seed) * 0.6)) ** 1.6;
        const clump = fbm(Math.cos(a) * 2.2 + t * 5, Math.sin(a) * 2.2, v * 2, seed + t, 2);
        const rr = r * (0.62 + star * 0.46 + (clump - 0.5) * 0.15);
        // The sprays droop at their ends, more along the ridges.
        const droop = (1 - v) ** 2 * R * (0.15 + star * 0.22);
        const d = norm([Math.cos(a) * (0.6 + star * 0.4), -0.5 - v * 0.5, Math.sin(a) * (0.6 + star * 0.4)]);
        const alb = 0.18 + star * 0.5 + (v < 0.25 ? star * 0.12 : 0) + (clump - 0.5) * 0.18;
        B.surfel([Math.cos(a) * rr, rimY - v * tall + droop, Math.sin(a) * rr], d, sp * DISC, M.needle, alb, g);
      }
    }
  }
  // A spike of a leader at the very top.
  tube(B, g, [[0, -h * 0.84, 0], [0, -h * 1.0, 0]], u => h * 0.025 * (1 - u * 0.8), sp * 0.7, u => ({ mat: M.needle, alb: 0.45 + u * 0.1 }));
};

/**
 * A dead tree: a gnarled grey trunk forking into bare, crooked limbs, the
 * perches for the owls, the Jersey Devil and Mothman. Returns the perches, upright.
 */
const deadTree = (B: Builder, g: number, h: number, ctx: Ctx): { p: V3; out: number }[] => {
  const { rand } = ctx;
  const sp = ctx.sp * 1.5;
  const perches: { p: V3; out: number }[] = [];
  const lean = (rand() - 0.5) * 0.14;
  const trunk: V3[] = [];
  for (let i = 0; i <= 8; i++) {
    const u = i / 8;
    trunk.push([lean * u * h + Math.sin(u * 5 + h) * h * 0.02, -u * h * 0.82, Math.cos(u * 4 + h) * h * 0.015]);
  }
  const bark = (u: number, n: V3) => ({ mat: M.bark, alb: 0.5 + n[0] * 0.08 + (hash2(u * 40, n[1] * 9) - 0.5) * 0.35 });
  tube(B, g, trunk, u => h * 0.045 * (1 - u * 0.65) + (u < 0.06 ? h * 0.03 * (1 - u / 0.06) : 0), sp, bark);
  // Roots splaying out at the foot.
  for (let r = 0; r < 4; r++) {
    const a = (r / 4) * Math.PI * 2 + rand();
    tube(B, g, [[0, -h * 0.05, 0], [Math.cos(a) * h * 0.07, -h * 0.01, Math.sin(a) * h * 0.07], [Math.cos(a) * h * 0.13, h * 0.01, Math.sin(a) * h * 0.13]], u => h * 0.025 * (1 - u * 0.7), sp, bark);
  }
  const limbs = 4 + Math.floor(rand() * 2);
  for (let l = 0; l < limbs; l++) {
    const u0 = 0.45 + (l / limbs) * 0.45;
    const start = trunk[Math.round(u0 * 8)];
    const side = l % 2 === 0 ? 1 : -1;
    const a = (side > 0 ? 0 : Math.PI) + (rand() - 0.5) * 1.1;
    const len = h * (0.32 - u0 * 0.12) * (0.8 + rand() * 0.4);
    const path: V3[] = [start];
    let p = start;
    let dir: V3 = norm([Math.cos(a), -0.7 - rand() * 0.4, Math.sin(a) * 0.7]);
    for (let k = 0; k < 5; k++) {
      dir = norm([dir[0] + (rand() - 0.5) * 0.5, dir[1] + (rand() - 0.3) * 0.3, dir[2] + (rand() - 0.5) * 0.4]);
      p = [p[0] + dir[0] * len / 5, p[1] + dir[1] * len / 5, p[2] + dir[2] * len / 5];
      path.push(p);
    }
    tube(B, g, path, u => h * 0.022 * (1 - u * 0.75), sp, bark);
    // A crook along it where something can sit, and a twig or two off its end.
    const seat = path[2];
    perches.push({ p: [seat[0], seat[1] - h * 0.02, seat[2]], out: Math.sign(seat[0] || side) });
    for (let tw = 0; tw < 2; tw++) {
      const from = path[3 + tw];
      const ta = a + (rand() - 0.5) * 2;
      tube(B, g, [from, [from[0] + Math.cos(ta) * len * 0.25, from[1] - len * 0.25, from[2] + Math.sin(ta) * len * 0.2]], u => h * 0.009 * (1 - u * 0.6), sp, bark);
    }
  }
  return perches;
};

/** A silver birch: a pale trunk with dark marks, a sparse crown of golden autumn leaves. */
const birch = (B: Builder, g: number, h: number, ctx: Ctx, seed: number) => {
  const { rand } = ctx;
  const sp = ctx.sp * 1.4;
  const lean = (rand() - 0.5) * 0.2;
  const path: V3[] = [];
  for (let i = 0; i <= 6; i++) { const u = i / 6; path.push([lean * u * h + Math.sin(u * 3 + seed) * h * 0.02, -u * h * 0.9, 0]); }
  tube(B, g, path, u => h * 0.03 * (1 - u * 0.5), sp, (u, n) => {
    const mark = fbm(n[0] * 2 + seed, u * 26, n[2] * 2, seed, 2) > 0.62;
    return { mat: mark ? M.bark : M.birch, alb: mark ? 0.35 : 0.55 + n[0] * 0.12 };
  });
  // A thin crown of turning leaves in small, loose clumps along the upper trunk: mostly rust, a few still gold.
  for (let c = 0; c < 7; c++) {
    const at = path[3 + Math.floor(rand() * 4)];
    const a = rand() * Math.PI * 2;
    const r = h * (0.045 + rand() * 0.04);
    const cc: V3 = [at[0] + Math.cos(a) * h * 0.08, at[1] - h * rand() * 0.06, at[2] + Math.sin(a) * h * 0.08];
    const gold = rand() < 0.3;
    sphere(B, g, r, sp * 1.2, d => {
      if (d[1] > 0.3 || hash2(d[0] * 13 + c, d[2] * 11 + d[1] * 7) > 0.6) return null;
      return { mat: gold ? M.gold : M.autumn, alb: 0.32 - d[1] * 0.2 + (hash2(d[0] * 7, d[2] * 5) - 0.5) * 0.3 };
    }, cc);
  }
};

/** A mossy boulder. */
const rock = (B: Builder, g: number, r: number, ctx: Ctx, seed: number) => {
  ellipsoid(B, g, [r * 1.2, r * 0.75, r], ctx.sp, d => {
    if (d[1] > 0.5) return null;
    const bump = fbm(d[0] * 2.5, d[1] * 2.5, d[2] * 2.5, seed, 2);
    const mossy = d[1] < -0.35 + (bump - 0.5) * 0.6;
    return { mat: mossy ? M.moss : M.stone, alb: 0.48 + (bump - 0.5) * 0.5 - d[1] * 0.1, h: (bump - 0.5) * 0.18 };
  }, [0, -r * 0.35, 0]);
};

/** A fallen log lying across, mossy on top, with shelf fungus or a glowing cluster on it. */
const log = (B: Builder, g: number, L: number, r: number, ctx: Ctx, seed: number) => {
  const path: V3[] = [];
  for (let i = 0; i <= 4; i++) path.push([-L / 2 + (i / 4) * L, -r + Math.sin(i + seed) * r * 0.15, Math.cos(i * 1.3 + seed) * r * 0.3]);
  tube(B, g, path, u => r * (1 - Math.abs(u - 0.5) * 0.25), ctx.sp, (u, n) => {
    const top = -n[1];
    const mossy = top > 0.35 + (fbm(u * 8, n[0], n[2], seed, 2) - 0.5) * 0.7;
    return { mat: mossy ? M.moss : M.bark, alb: 0.45 + top * 0.15 + (hash2(u * 50, n[2] * 7) - 0.5) * 0.3 };
  });
  // The cut ends, pale rings of wood.
  for (const end of [0, 4]) {
    const c = path[end];
    const nx = end === 0 ? -1 : 1;
    for (let rr = 0; rr < r; rr += ctx.sp * 0.8) {
      const n = Math.max(1, Math.round((2 * Math.PI * rr) / (ctx.sp * 0.8)));
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        B.surfel([c[0], c[1] + Math.sin(a) * rr, c[2] + Math.cos(a) * rr], [nx, 0, 0], ctx.sp * DISC, M.bone, 0.4 + (Math.round(rr / (r * 0.25)) % 2) * 0.15, g);
      }
    }
  }
};

/** A fern: a rosette of arching fronds. */
const fern = (B: Builder, g: number, size: number, ctx: Ctx) => {
  const { rand } = ctx;
  const sp = ctx.sp * 1.3;
  const fronds = 5 + Math.floor(rand() * 3);
  for (let f = 0; f < fronds; f++) {
    const a = (f / fronds) * Math.PI * 2 + rand() * 0.4;
    const len = size * (0.75 + rand() * 0.35);
    const path: V3[] = [];
    for (let i = 0; i <= 5; i++) {
      const u = i / 5;
      path.push([Math.cos(a) * len * u, -Math.sin(u * Math.PI * 0.85) * len * 0.45 - u * len * 0.05, Math.sin(a) * len * u]);
    }
    // Leaflets along the frond: a flat strip of surfels either side of it, narrowing to the tip.
    for (let i = 0; i < 5; i++) {
      const p0 = path[i], p1 = path[i + 1];
      const segs = Math.max(1, Math.round(Math.hypot(p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]) / (sp * 0.7)));
      for (let k = 0; k < segs; k++) {
        const u = (i + k / segs) / 5;
        const c: V3 = [p0[0] + (p1[0] - p0[0]) * (k / segs), p0[1] + (p1[1] - p0[1]) * (k / segs), p0[2] + (p1[2] - p0[2]) * (k / segs)];
        const w = size * 0.16 * Math.sin(Math.min(1, u * 1.2) * Math.PI) + sp * 0.3;
        for (let side = -w; side <= w; side += sp * 0.8) {
          const p: V3 = [c[0] - Math.sin(a) * side, c[1] + Math.abs(side) * 0.25, c[2] + Math.cos(a) * side];
          B.surfel(p, [0, -1, 0], sp * DISC, M.leaf, 0.45 + u * 0.15 - Math.abs(side) / (w + 1) * 0.15 + (rand() - 0.5) * 0.1, g, F.twoSided);
        }
      }
    }
  }
};

/** A low bush of dark leaves. */
const bush = (B: Builder, g: number, r: number, ctx: Ctx, seed: number) => {
  const { rand } = ctx;
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + rand();
    const rr = r * (0.55 + rand() * 0.25);
    sphere(B, g, rr, ctx.sp * 1.5, d => (d[1] > 0.35 ? null : { mat: M.leaf, alb: 0.42 - d[1] * 0.2 + (fbm(d[0] * 3, d[1] * 3, d[2] * 3, seed + i, 2) - 0.5) * 0.5 }), [Math.cos(a) * r * 0.45, -rr * 0.85, Math.sin(a) * r * 0.45]);
  }
};

/** A cluster of mushrooms: glowing blue-green caps that light the floor round them, or red toadstools with white spots. */
const mushrooms = (B: Builder, g: number, size: number, glow: boolean, ctx: Ctx) => {
  const { rand } = ctx;
  const sp = ctx.sp * 0.6;
  const n = 3 + Math.floor(rand() * 4);
  for (let i = 0; i < n; i++) {
    const a = rand() * Math.PI * 2;
    const rr = size * rand() * 0.9;
    const h = size * (0.35 + rand() * 0.45);
    const capR = size * (0.18 + rand() * 0.16);
    const x = Math.cos(a) * rr, z = Math.sin(a) * rr;
    tube(B, g, [[x, 0, z], [x, -h, z]], () => capR * 0.25, sp, () => ({ mat: glow ? M.glowcap : M.white, alb: glow ? 0.25 : 0.5, flags: glow ? F.emissive : 0 }));
    sphere(B, g, capR, sp, d => {
      if (d[1] > 0.15) return null;
      if (glow) return { mat: M.glowcap, alb: 0.55 - d[1] * 0.35, flags: F.emissive };
      const spot = hash2(d[0] * 9 + i, d[2] * 9) > 0.8;
      return { mat: spot ? M.white : M.amanita, alb: spot ? 0.7 : 0.55 - d[1] * 0.2 };
    }, [x, -h, z]);
    if (glow && i % 2 === 0) B.glowAt([x, -h, z], capR * 3, [0.12, 0.42, 0.42], g, G.flicker, rand());
  }
};

/** A tuft of tall grass. */
const tuft = (B: Builder, g: number, h: number, ctx: Ctx) => {
  const { rand } = ctx;
  for (let i = 0; i < 6; i++) {
    const a = rand() * Math.PI * 2;
    const lean = 0.2 + rand() * 0.4;
    const hh = h * (0.6 + rand() * 0.5);
    tube(B, g, [[0, 0, 0], [Math.cos(a) * hh * lean * 0.4, -hh * 0.6, Math.sin(a) * hh * lean * 0.4], [Math.cos(a) * hh * lean, -hh, Math.sin(a) * hh * lean]], u => ctx.sp * 0.35 * (1 - u * 0.5), ctx.sp * 0.8, u => ({ mat: M.moss, alb: 0.35 + u * 0.3 }), F.twoSided);
  }
};

/** Reeds and cattails round a pond's edge. */
const cattail = (B: Builder, g: number, h: number, ctx: Ctx) => {
  const { rand } = ctx;
  const bend = (rand() - 0.5) * h * 0.2;
  tube(B, g, [[0, 0, 0], [bend * 0.4, -h * 0.5, 0], [bend, -h, 0]], () => ctx.sp * 0.3, ctx.sp * 0.8, () => ({ mat: M.moss, alb: 0.45 }), F.twoSided);
  if (rand() < 0.6) tube(B, g, [[bend * 0.85, -h * 0.72, 0], [bend * 0.95, -h * 0.9, 0]], () => ctx.sp * 0.75, ctx.sp * 0.6, () => ({ mat: M.fur, alb: 0.5 }));
};

// -------------------------------------------------------------- campsite ---

/**
 * The abandoned campsite: a tent fallen in on one side, a ring of stones round
 * a smouldering fire, logs to sit on, a cooler left with its lid ajar, a
 * lantern on its side. Built upright about the camp's middle.
 */
const campsite = (B: Builder, g: number, R: number, ctx: Ctx) => {
  const { rand } = ctx;
  const sp = ctx.sp * 0.8;
  // The fire ring.
  const ringR = R * 0.16;
  for (let i = 0; i < 11; i++) {
    const a = (i / 11) * Math.PI * 2;
    const r = R * (0.035 + rand() * 0.015);
    sphere(B, g, r, sp, d => (d[1] > 0.3 ? null : { mat: M.stone, alb: 0.5 - d[1] * 0.2 }), [Math.cos(a) * ringR, -r * 0.4, Math.sin(a) * ringR]);
  }
  // Charred sticks, and embers that glow and flicker.
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + 0.3;
    tube(B, g, [[Math.cos(a) * ringR * 0.75, -R * 0.01, Math.sin(a) * ringR * 0.75], [Math.cos(a) * ringR * 0.1, -R * 0.07, Math.sin(a) * ringR * 0.1]], () => R * 0.014, sp, u => ({ mat: u > 0.55 ? M.fire : M.black, alb: u > 0.55 ? 0.35 + u * 0.3 : 0.3, flags: u > 0.55 ? F.emissive | F.flame : 0 }));
  }
  sphere(B, g, R * 0.05, sp, d => (d[1] > 0.2 ? null : { mat: M.fire, alb: 0.3 - d[1] * 0.4, flags: F.emissive | F.flame }), [0, -R * 0.01, 0]);
  // Sparks rising off it, and the glow of the coals.
  for (let i = 0; i < 14; i++) B.glowAt([(rand() - 0.5) * R * 0.06, -R * 0.05, (rand() - 0.5) * R * 0.06], R * 0.012, [1, 0.55, 0.18], g, G.rise, rand(), -R * (0.25 + rand() * 0.25));
  B.glowAt([0, -R * 0.03, 0], R * 0.12, [0.7, 0.28, 0.08], g, G.flicker, rand());

  // The tent, beyond the fire: a ridge tent whose far pole has given way, so it slumps to the ground at the back.
  const tx = -R * 0.42, tz = -R * 0.32;
  const tl = R * 0.42, tw = R * 0.24, th = R * 0.22;
  for (let u = 0; u <= 1; u += sp / tl) {
    const ridge = th * (u < 0.55 ? 1 - u * 0.15 : Math.max(0.12, (1 - u) * 1.9 * 0.9)) * (1 + Math.sin(u * 9) * 0.03);
    for (const side of [-1, 1]) {
      for (let v = 0; v <= 1; v += sp / Math.hypot(tw, ridge)) {
        const sag = Math.sin(v * Math.PI) * ridge * 0.12;
        const x = tx + (u - 0.5) * tl;
        const y = -ridge * (1 - v) + sag;
        const z = tz + side * tw * v;
        const n = norm([0, -tw, side * ridge]);
        const flap = u < 0.06 && v < 0.85;
        B.surfel([x, y, z], n, sp * DISC, flap ? M.black : M.canvas, 0.45 + side * 0.08 + (hash2(u * 30, v * 20) - 0.5) * 0.12, g, F.twoSided);
      }
    }
  }
  // Its front pole, still standing, and a guy line.
  tube(B, g, [[tx - tl * 0.5, 0, tz], [tx - tl * 0.5, -th * 1.05, tz]], () => R * 0.008, sp, () => ({ mat: M.stone, alb: 0.6 }));

  // Two logs to sit on.
  for (const [lx, lz, len, yaw] of [[R * 0.3, R * 0.12, R * 0.26, 0.5], [-R * 0.05, R * 0.32, R * 0.22, -0.2]] as const) {
    const from = B.solid.length;
    log(B, g, len, R * 0.04, { ...ctx, sp }, 9 + lx);
    const S = B.solid;
    const c = Math.cos(yaw), s = Math.sin(yaw);
    for (let i = from; i < S.length; i += SOLID_STRIDE) {
      const x = S[i], z = S[i + 2], nx = S[i + 3], nz = S[i + 5];
      S[i] = x * c - z * s + lx; S[i + 2] = x * s + z * c + lz;
      S[i + 3] = nx * c - nz * s; S[i + 5] = nx * s + nz * c;
    }
  }

  // The cooler: a red box with a white lid, left ajar.
  const cx = R * 0.36, cz = -R * 0.2;
  const cw = R * 0.1, ch = R * 0.065, cd = R * 0.065;
  const box = (x0: number, y0: number, z0: number, w: number, h: number, d: number, mat: number) => {
    for (const [nx, ny, nz] of [[1, 0, 0], [-1, 0, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]] as const) {
      const ax = nx ? [0, 1, 2] : ny ? [1, 0, 2] : [2, 0, 1];
      const ext = [w, h, d];
      const e1 = ext[ax[1]], e2 = ext[ax[2]];
      for (let a = -e1 / 2; a <= e1 / 2; a += sp * 0.8) {
        for (let b = -e2 / 2; b <= e2 / 2; b += sp * 0.8) {
          const p = [0, 0, 0];
          p[ax[0]] = (nx || ny || nz) * ext[ax[0]] / 2;
          p[ax[1]] = a; p[ax[2]] = b;
          B.surfel([x0 + p[0], y0 + p[1], z0 + p[2]], [nx, ny, nz], sp * DISC, mat, 0.55, g);
        }
      }
    }
  };
  box(cx, -ch / 2, cz, cw, ch, cd, M.cooler);
  box(cx - cw * 0.06, -ch - R * 0.012, cz + cd * 0.08, cw * 1.04, R * 0.014, cd * 1.04, M.white);
  // The lantern, on its side and out.
  tube(B, g, [[-R * 0.2, -R * 0.02, R * 0.12], [-R * 0.12, -R * 0.02, R * 0.15]], () => R * 0.022, sp, u => ({ mat: u < 0.2 || u > 0.8 ? M.blue : M.stone, alb: 0.5 }));
  return { fire: [0, 0, 0] as V3, cooler: [cx, 0, cz] as V3, spill: [cx - cw * 0.2, 0, cz + cd * 1.4] as V3 };
};

// ------------------------------------------------------------ the scene ---

export const buildScene = (viewW: number, viewH: number, pageH: number, seed = 13): ForestScene => {
  const rand = mulberry(seed);
  const B = new Builder();
  const f = focalFor(viewH);
  const s = Math.min(1.1, Math.max(0.55, viewW / 1400));
  const phone = viewW < 640;
  const ctx: Ctx = { rand, s, sp: SPACING };
  const ground = B.body({ kind: 'ground', name: 'forest', pos: [0, 0, 0] });

  // Things already standing, so later ones keep their distance: centre and radius on the floor.
  const taken: { x: number; y: number; r: number }[] = [];
  const free = (x: number, y: number, r: number) => taken.every(o => Math.hypot(o.x - x, o.y - y) > o.r + r);
  // The hero's words: nothing tall in the opening view's left and middle.
  const inHero = (x: number, y: number, r: number) => y - r < viewH * 0.82 && x + r > viewW * 0.03 && x - r < viewW * (phone ? 1 : 0.68);

  // The trail, winding down the page from gutter to gutter.
  const pathW = (phone ? 26 : 36) * s;
  const path = [viewW * 0.5, viewW * (phone ? 0.3 : 0.37), 1 / 430, rand() * 6, viewW * 0.05, 1 / 170, rand() * 6, viewW * 0.025, 1 / 77, rand() * 6];
  const pathX = (y: number) => path[0] + path[1] * Math.sin(y * path[2] + path[3]) + path[4] * Math.sin(y * path[5] + path[6]) + path[7] * Math.sin(y * path[8] + path[9]);
  const onPath = (x: number, y: number, r: number) => Math.abs(x - pathX(y)) < pathW + r;

  // The campsite, in the opening view's right-hand gutter (on a phone, just below it).
  const campR = (phone ? 170 : 230) * s;
  const camp: Camp = (() => {
    const c: V3 = phone ? [viewW * 0.62, viewH * 1.05, 0] : [viewW * 0.84, viewH * 0.66, 0];
    const yaw = -0.15;
    const from = B.solid.length, gfrom = B.glow.length;
    const parts = campsite(B, ground, campR, ctx);
    place(B, from, gfrom, upright(yaw), c, false);
    taken.push({ x: c[0], y: c[1], r: campR * 0.6 });
    return { c, fire: standAt(c, parts.fire, yaw), cooler: standAt(c, parts.cooler, yaw), spill: standAt(c, parts.spill, yaw), r: campR };
  })();

  // Ponds in the gutters, a little way down: the lake monster lives in the first.
  const ponds: Pond[] = [];
  const pondCount = Math.max(1, Math.round(pageH / 3200));
  for (let i = 0; i < pondCount; i++) {
    const left = i % 2 === 0;
    for (let tries = 0; tries < 20; tries++) {
      const rx = (phone ? 120 : 170 + rand() * 40) * s, ry = rx * (0.55 + rand() * 0.1);
      const y = viewH * 1.3 + ((i + rand() * 0.6) / pondCount) * (pageH - viewH * 2);
      const x = left ? viewW * (phone ? 0.15 : 0.1) : viewW * (phone ? 0.85 : 0.9);
      if (!free(x, y, rx) || onPath(x, y, rx)) continue;
      const c: V3 = [x, y, 0];
      ponds.push({ c, rx, ry });
      taken.push({ x, y, r: rx * 1.05 });
      // Reeds and cattails round the near and side edges.
      for (let k = 0; k < 26; k++) {
        const a = Math.PI * (0.05 + rand() * 0.9) * (rand() < 0.75 ? 1 : -1);
        const p: V3 = [x + Math.cos(a) * rx * (0.92 + rand() * 0.12), y + Math.sin(a) * ry * (0.92 + rand() * 0.12), 0];
        const from = B.solid.length, gfrom = B.glow.length;
        cattail(B, ground, (28 + rand() * 30) * s, ctx);
        place(B, from, gfrom, upright(rand() * 6), p);
      }
      break;
    }
  }

  // Clearings where the fireflies dance: open grass, no trees.
  const clearings: Clearing[] = [];
  const clearCount = Math.max(2, Math.round(pageH / 1500));
  for (let i = 0; i < clearCount; i++) {
    for (let tries = 0; tries < 20; tries++) {
      const r = (phone ? 110 : 150 + rand() * 60) * s;
      const right = (i + (phone ? 0 : 1)) % 2 === 0;
      const x = viewW * (right ? 0.86 + rand() * 0.08 : 0.06 + rand() * 0.08);
      const y = viewH * (i === 0 ? 1.0 : 0.9) + (i / clearCount) * (pageH - viewH * 1.5) + rand() * 200;
      if (!free(x, y, r * 0.8)) continue;
      clearings.push({ c: [x, y, 0], r });
      taken.push({ x, y, r: r * 0.85 });
      break;
    }
  }

  // The trees. Thick in the gutters, thinner across the middle (behind the cards, showing between them).
  const trees: Tree[] = [];
  const perches: Perch[] = [];
  const plant = (x: number, y: number, kind: Tree['kind'], h: number) => {
    const foot: V3 = [x, y, 0];
    const from = B.solid.length, gfrom = B.glow.length;
    const yaw = rand() * Math.PI * 2;
    if (kind === 'pine') pine(B, ground, h, ctx, seed + trees.length);
    else if (kind === 'birch') birch(B, ground, h, ctx, trees.length);
    else {
      const ps = deadTree(B, ground, h, ctx);
      for (const pp of ps) perches.push({ p: standAt(foot, pp.p, yaw), out: pp.out, tree: trees.length });
    }
    place(B, from, gfrom, upright(yaw), foot);
    trees.push({ foot, h, r: kind === 'pine' ? h * 0.27 : h * 0.06, kind });
    taken.push({ x, y, r: kind === 'pine' ? h * 0.12 : h * 0.05 });
  };
  const blocked = (x: number, y: number, r: number) =>
    !free(x, y, r) || onPath(x, y, r) || clearings.some(c => Math.hypot(c.c[0] - x, c.c[1] - y) < c.r + r) || ponds.some(p => Math.hypot((p.c[0] - x) / (p.rx + r), (p.c[1] - y) / (p.ry + r)) < 1);
  const gutter = phone ? 0.12 : 0.17;
  const rows = Math.ceil(pageH / (phone ? 120 : 95));
  for (let i = 0; i < rows; i++) {
    for (const side of [0, 1]) {
      for (let tries = 0; tries < 6; tries++) {
        const u = rand() * (gutter + 0.06) - 0.06;
        const x = viewW * (side ? 1 - u : u);
        const y = (i + rand()) * (pageH / rows) + 40;
        const roll = rand();
        const kind: Tree['kind'] = roll < 0.62 ? 'pine' : roll < 0.82 ? 'dead' : 'birch';
        const h = (kind === 'pine' ? 230 + rand() * 170 : kind === 'dead' ? 200 + rand() * 120 : 190 + rand() * 110) * s;
        if (blocked(x, y, kind === 'pine' ? h * 0.1 : h * 0.05)) continue;
        if (inHero(x, y - h * 0.5, h * 0.35)) continue;
        plant(x, y, kind, h);
        break;
      }
    }
  }
  // Across the middle: fewer, so the trail and the ground between them show.
  const midCount = Math.round(pageH / (phone ? 260 : 170));
  for (let i = 0; i < midCount; i++) {
    for (let tries = 0; tries < 6; tries++) {
      const x = viewW * (gutter + rand() * (1 - gutter * 2));
      const y = rand() * pageH;
      const kind: Tree['kind'] = rand() < 0.55 ? 'pine' : rand() < 0.5 ? 'birch' : 'dead';
      const h = (kind === 'pine' ? 200 + rand() * 150 : 180 + rand() * 120) * s;
      if (blocked(x, y, h * 0.1) || inHero(x, y - h * 0.5, h * 0.35)) continue;
      plant(x, y, kind, h);
      break;
    }
  }

  // The undergrowth: ferns, bushes, boulders, fallen logs, mushrooms and grass, everywhere the trees left room.
  const lights: Light[] = [];
  // Undergrowth grows in patches: fern beds, thickets of bushes, open floor between them.
  const ferny = (x: number, y: number) => fbm(x / (260 * s), y / (260 * s), 1.5, seed + 31, 3);
  const bushy = (x: number, y: number) => fbm(x / (320 * s), y / (320 * s), 4.5, seed + 47, 3);
  const clutter = Math.round((pageH * viewW) / (phone ? 7000 : 5200));
  for (let i = 0; i < clutter; i++) {
    const x = rand() * viewW, y = rand() * pageH;
    const fe = ferny(x, y), bu = bushy(x, y);
    const roll = rand();
    const kind = fe > 0.6 ? 'fern' : bu > 0.63 ? 'bush' : roll < 0.035 ? 'rock' : roll < 0.05 ? 'log' : roll < 0.065 ? 'shroom' : roll < 0.075 ? 'glowcap' : null;
    const inClearing = clearings.some(c => Math.hypot(c.c[0] - x, c.c[1] - y) < c.r);
    if (!kind && !(inClearing && roll < 0.25)) continue;
    const r = (kind === 'log' ? 60 : kind === 'bush' ? 26 : 20) * s;
    if (!free(x, y, r * 0.6) || onPath(x, y, r * 0.3) || ponds.some(p => Math.hypot((p.c[0] - x) / (p.rx + r), (p.c[1] - y) / (p.ry + r)) < 1)) continue;
    if (Math.hypot(camp.c[0] - x, camp.c[1] - y) < campR * 0.55) continue;
    const from = B.solid.length, gfrom = B.glow.length;
    const yaw = rand() * Math.PI * 2;
    if (inClearing) tuft(B, ground, (16 + rand() * 14) * s, ctx);
    else if (kind === 'fern') fern(B, ground, (20 + rand() * 18) * s, ctx);
    else if (kind === 'bush') bush(B, ground, (24 + rand() * 16) * s, ctx, i);
    else if (kind === 'rock') rock(B, ground, (12 + rand() * 16) * s, ctx, i);
    else if (kind === 'log') {
      log(B, ground, (90 + rand() * 60) * s, (9 + rand() * 4) * s, ctx, i);
      if (rand() < 0.5) {
        const mf = B.solid.length;
        const glow = rand() < 0.5;
        mushrooms(B, ground, 10 * s, glow, ctx);
        for (let k = mf; k < B.solid.length; k += SOLID_STRIDE) B.solid[k + 1] -= 18 * s;
        if (glow) lights.push({ p: [x, y, 20 * s], r: 60 * s, col: [0.08, 0.36, 0.36], flicker: 0.15, kind: 'cap' });
      }
    } else {
      const glow = kind === 'glowcap';
      mushrooms(B, ground, (12 + rand() * 6) * s, glow, ctx);
      if (glow) lights.push({ p: [x, y, 6 * s], r: 70 * s, col: [0.1, 0.42, 0.42], flicker: 0.15, kind: 'cap' });
    }
    place(B, from, gfrom, upright(yaw), [x, y, 0]);
    taken.push({ x, y, r: r * 0.5 });
  }
  // A ring of glowing mushrooms in each clearing.
  for (const cl of clearings) {
    const n = 9;
    const rr = cl.r * 0.45;
    const ox = (rand() - 0.5) * cl.r * 0.3, oy = (rand() - 0.5) * cl.r * 0.2;
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2;
      const p: V3 = [cl.c[0] + ox + Math.cos(a) * rr, cl.c[1] + oy + Math.sin(a) * rr * 0.7, 0];
      const from = B.solid.length, gfrom = B.glow.length;
      mushrooms(B, ground, 8 * s, true, ctx);
      place(B, from, gfrom, upright(rand() * 6), p);
    }
    lights.push({ p: [cl.c[0] + ox, cl.c[1] + oy, 8 * s], r: rr * 1.8, col: [0.1, 0.4, 0.4], flicker: 0.1, kind: 'cap' });
  }
  lights.unshift({ p: [camp.fire[0], camp.fire[1], 14 * s], r: campR * 1.1, col: [1.0, 0.45, 0.14], flicker: 0.35, kind: 'fire' });

  const life = populateLife(B, { rand, s, f, viewW, viewH, pageH, phone, trees, perches, ponds, clearings, camp, pathX, pathW });

  return {
    solid: new Float32Array(B.solid),
    solidCount: B.solid.length / SOLID_STRIDE,
    glow: new Float32Array(B.glow),
    glowCount: B.glow.length / GLOW_STRIDE,
    bodies: B.bodies,
    focal: f,
    viewW, viewH, pageH, s,
    path, pathW,
    ponds, clearings, camp, trees, perches, lights,
    life,
  };
};

// ------------------------------------------------------------------ camera ---

/** The camera, as the view draws with it. */
export interface ForestCamera { viewW: number; viewH: number; scrollY: number; offX: number; offY: number }

/** Where a world point lands in the window, in CSS pixels. */
export const toScreen = (scene: ForestScene, cam: ForestCamera, w: V3): [number, number] => {
  const sc = scene.focal / (scene.focal - w[2]);
  return [cam.viewW / 2 + (w[0] - cam.viewW / 2 - cam.offX) * sc + cam.offX, cam.viewH / 2 + (w[1] - cam.scrollY - cam.viewH / 2 - cam.offY) * sc + cam.offY];
};

/** The world point at depth `z` that lands on window point (`sx`, `sy`). */
export const fromScreen = (scene: ForestScene, cam: ForestCamera, sx: number, sy: number, z: number): V3 => {
  const sc = scene.focal / (scene.focal - z);
  return [(sx - cam.viewW / 2 - cam.offX) / sc + cam.viewW / 2 + cam.offX, (sy - cam.viewH / 2 - cam.offY) / sc + cam.scrollY + cam.viewH / 2 + cam.offY, z];
};

/** The trail's x at page height y. */
export const pathXOf = (scene: ForestScene, y: number) => {
  const p = scene.path;
  return p[0] + p[1] * Math.sin(y * p[2] + p[3]) + p[4] * Math.sin(y * p[5] + p[6]) + p[7] * Math.sin(y * p[8] + p[9]);
};

/**
 * Writes every body's transform into `out`: three rows of a 3x4 matrix, its
 * look, and its state. Attached parts ride their parents, which come first.
 */
export const poseBodies = (scene: ForestScene, out: Float32Array) => {
  const { bodies } = scene;
  const centres: V3[] = scene.centres && scene.centres.length === bodies.length ? scene.centres : new Array(bodies.length);
  const rots: number[][] = scene.rots && scene.rots.length === bodies.length ? scene.rots : new Array(bodies.length);
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
      c = b.pos;
      rot = b.base;
    }
    centres[i] = c;
    rots[i] = rot;
    const sc = b.scale ?? [1, 1, 1];
    const o = i * OBJ_TEXELS * 4;
    out[o] = rot[0] * sc[0]; out[o + 1] = rot[1] * sc[1]; out[o + 2] = rot[2] * sc[2]; out[o + 3] = c[0];
    out[o + 4] = rot[3] * sc[0]; out[o + 5] = rot[4] * sc[1]; out[o + 6] = rot[5] * sc[2]; out[o + 7] = c[1];
    out[o + 8] = rot[6] * sc[0]; out[o + 9] = rot[7] * sc[1]; out[o + 10] = rot[8] * sc[2]; out[o + 11] = c[2];
    // A part attached to something shares its look.
    let vis = b.vis ?? 1;
    if (b.attach && b.vis === undefined) vis = bodies[b.attach.parent].vis ?? 1;
    out[o + 12] = vis; out[o + 13] = 0; out[o + 14] = 0; out[o + 15] = 0;
    const p = b.params;
    out[o + 16] = p ? p[0] : 0; out[o + 17] = p ? p[1] : 0; out[o + 18] = p ? p[2] : 0; out[o + 19] = p ? p[3] : 0;
  }
  scene.centres = centres;
  scene.rots = rots;
};
