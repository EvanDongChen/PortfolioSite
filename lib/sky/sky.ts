/**
 * The sky-islands page's world: grass-topped islands hanging at different
 * depths down the page, waterfalls pouring off their edges into cloud, puffy
 * cumulus drifting between them, and a long dragon weaving through it all.
 * Built the way the space page is (see lib/space.ts and the pixel-3d skill):
 * every surface is a cloud of surfels with a material and a shade, light and
 * spray are soft glows, and `lib/skyView.ts` turns it all into pixel art.
 *
 * No DOM. Coordinates are CSS pixels: x across the page, y down it, z towards
 * the viewer; the plane z = 0 scrolls exactly with the content. Up is -y.
 */

import {
  DISC, Disc, GOLDEN, IDENTITY, SPACING, V3, basisFor, cross, fbm, focalFor, mul3, mulberry, norm, rotX, rotY, rotate, screenClearance,
} from '../space/space';
import { SkyLife, populateLife } from './skyLife';
import { SkyEvents, populateEvents } from './skyEvents';

export { focalFor };

// ---------------------------------------------------------------- palette ---

/** Material ramps, darkest first: shadows lean blue and violet, light leans warm. */
export const RAMPS: string[][] = [
  /* 0 grass    */ ['#1e4650', '#25644c', '#358444', '#58a83e', '#90c84a', '#d2e66e'],
  /* 1 soil     */ ['#2a2442', '#45304a', '#674240', '#8e5a42', '#b67e54', '#dcac78'],
  /* 2 stone    */ ['#2a3258', '#414c78', '#626c98', '#8890b2', '#b2b8cc', '#e0e0e2'],
  /* 3 sandstone*/ ['#36294a', '#5a3c54', '#86585a', '#b07c66', '#d6a47a', '#f2cea0'],
  /* 4 cloud    */ ['#7484c4', '#92a4da', '#b2c4ec', '#d0def6', '#eaf2fc', '#ffffff'],
  /* 5 water    */ ['#24569a', '#3478be', '#52a2da', '#84ccec', '#bceaf6', '#f2ffff'],
  /* 6 leaf     */ ['#12363c', '#1a4e42', '#286a40', '#408a3c', '#66aa42', '#a2ca58'],
  /* 7 blossom  */ ['#56386a', '#86487a', '#bc6894', '#e692b4', '#f8bad0', '#ffe4ee'],
  /* 8 bark     */ ['#282036', '#3c2c38', '#583c3c', '#785242', '#986c50', '#be9068'],
  /* 9 sun      */ ['#ffb848', '#ffcc68', '#ffe088', '#fff0b8', '#fff8dc', '#ffffff'],
  /* 10 far     */ ['#5c7cbc', '#6c8cc6', '#80a0d0', '#96b4dc', '#aec8e6', '#c8dcf0'],
  /* 11 fargrass*/ ['#5884b4', '#6698b8', '#78acbc', '#8ec0c0', '#a6d2c8', '#c2e2d2'],
  /* 12 dragon  */ ['#3c1032', '#6c1836', '#a62434', '#d8392c', '#f26a38', '#ffa25c'],
  /* 13 gold    */ ['#4a2a22', '#7a4a1e', '#b0761e', '#e0a42c', '#f8d052', '#fff4a2'],
  /* 14 cream   */ ['#6a5a70', '#9a8a8e', '#c4b4a6', '#e4d6c0', '#f6ecd8', '#fffaf0'],
  /* 15 eye     */ ['#3a3a5a', '#7a7c9a', '#b8bccc', '#e4e8ee', '#f8faff', '#ffffff'],
  /* 16 pupil   */ ['#0a0812', '#120e1e', '#1a1428', '#241c36', '#2e2444', '#3a2e52'],
  /* 17 pearl   */ ['#a07ab8', '#c498cc', '#e2b8dc', '#f6d6e6', '#fff0f2', '#ffffff'],
  /* 18 storm   */ ['#262844', '#363a5a', '#4a4c6e', '#626484', '#7e7e9c', '#a2a0b8'],
  /* 19 whale   */ ['#1a1840', '#2a2660', '#3e3a80', '#5852a0', '#7a70bc', '#a294d4'],
  /* 20 coral   */ ['#5a2a4a', '#8a3e56', '#c45a5a', '#ec8a6a', '#ffb88a', '#ffe0b8'],
  /* 21 face    */ ['#2a2440', '#382e4c', '#4a3c58', '#5e4c66', '#766078', '#94788e'],
  /* 22 jade    */ ['#0e3440', '#14504c', '#1e7058', '#2e9468', '#52b88a', '#98dcb4'],
  /* 23 crystal */ ['#3a3a8a', '#4e5ab0', '#6a86d4', '#8cb4ec', '#bcdcf8', '#f0faff'],
  /* 24 azure   */ ['#0a1a34', '#0d2c50', '#11426c', '#185c88', '#2a7ea4', '#58a8c4'],
  /* 25 wisteria*/ ['#3a2a6a', '#5a3e94', '#7c5cb8', '#a084d4', '#c6aee8', '#eee4fa'],
];
export const SHADES = 6;
export const M = {
  grass: 0, soil: 1, stone: 2, sand: 3, cloud: 4, water: 5, leaf: 6, blossom: 7, bark: 8, sun: 9,
  far: 10, fargrass: 11, dragon: 12, gold: 13, cream: 14, eye: 15, pupil: 16, pearl: 17, storm: 18,
  whale: 19, coral: 20, face: 21, jade: 22, crystal: 23, azure: 24, wisteria: 25,
} as const;

/** What open sky and its glows snap to: the blues, the warm haze low down, mist, and the jewels. */
export const SKY_PALETTE = [
  // Sky, deep zenith to pale horizon.
  '#2c5aa8', '#3468b8', '#3c78c4', '#4888d0', '#5898da', '#6aa8e2', '#7eb8ea', '#94c8f0', '#acd6f4', '#c4e4f6', '#dceef6', '#eef6f4',
  // Warm haze, and the sun's glare.
  '#fff4dc', '#ffe8c0', '#ffd8a0', '#fffaf0', '#ffffff',
  // Mist and spray.
  '#e4ecf6', '#cfdcee',
  // Rainbow.
  '#f06a6a', '#f8a860', '#f8e070', '#8ad87a', '#6ab4ec', '#a88ce0',
  // The pearl's flame and glow.
  '#ff9a4a', '#ffc860', '#ffc8d8', '#ffe2ea',
  // A storm's dark sky and its lightning.
  '#3e4668', '#525c80', '#6a769a', '#f4f0ff', '#c8c0f0',
];
/** The sky's own colour, top of the window to the bottom, at the top of the page and at its foot. */
export const SKY_TOP = ['#3468b8', '#7eb8ea'];
export const SKY_BOTTOM = ['#acd6f4', '#fff0d4'];

/** Surfel flags. */
export const F = {
  emissive: 1, twoSided: 2,
  /** Sways side to side with height above the object's wobble base (manes, whiskers, tails). */
  wobble: 8,
  /** Hidden while the object blinks. */
  eye: 16,
  /** Falling water: bright streaks run down it. */
  flow: 128,
  /** Streams out behind (local -x) and ripples, more the further back it reaches past the object's wobble base (whiskers, mane, tail). */
  trail: 256,
  /** Shown only while the object's state is off (dry wool). */
  dry: 512,
  /** Shown only while the object's state is on (wet wool, a lightning bolt). */
  wet: 1024,
} as const;
/** Glow flags. */
export const G = {
  stream: 1, flicker: 2,
  /** Only as bright as the object's state (lightning, the rainbow). */
  gate: 16,
  /** Falls down (local +y) its stream length, fading: rain, or spray rising if the length is negative. */
  rain: 32,
  /** Paints its own colour over the sky rather than adding light (the rainbow's bands). */
  paint: 64,
} as const;

/** Floats per surfel: x y z, nx ny nz, radius, material, albedo, object, flags. */
export const SOLID_STRIDE = 11;
/** Floats per glow: x y z, radius, r g b, object, flags, seed, stream length. */
export const GLOW_STRIDE = 11;
/** Texels per object in the transform texture: three rows of a 3x4 matrix, a spare, then its state. */
export const OBJ_TEXELS = 5;

// ---------------------------------------------------------------- objects ---

export type SkyKind =
  | 'sun' | 'island' | 'far' | 'cloud' | 'sea' | 'dragon' | 'head' | 'leg' | 'pearl'
  | 'bird' | 'wing' | 'sheep' | 'whale' | 'fin' | 'rainbow' | 'storm' | 'bolt'
  | 'vine' | 'pillar' | 'arch' | 'kite' | 'puff' | 'flower' | 'dog';

export interface Body {
  kind: SkyKind;
  name: string;
  /** Centre at time 0. */
  pos: V3;
  radius: number;
  base: number[];
  spin: number;
  spin0: number;
  drift?: { vx: number; min: number; max: number };
  /** A gentle drift round its spot. */
  bob?: { amp: number; rate: number; phase: number };
  /** Set each frame by behaviour; for an attached part only `rot` is used, relative to its parent. */
  live?: { c: V3; rot: number[] };
  scale?: V3;
  attach?: { parent: number; offset: V3 };
  /** Wobble amount, wobble base, blink or gate, phase. */
  params?: [number, number, number, number];
}

/** An island, for the creatures: where it is and where on it they can land (in its own frame). */
/** An island, for the creatures: where it is, where on it they can land, and the nests under its rim (in its own frame). */
export interface Island {
  body: number; R: number; z: number; far: boolean; perches: V3[]; falls: V3 | null; nests: V3[];
  /** Its solid shape, in its own frame: how deep the underside hangs, and the edge's radius at 24 angles round it. */
  H: number; edge: number[];
  /** A rock pillar rather than an island: its sides drop nearly straight before tapering. */
  pillar?: boolean;
  /** Strands of vine and wisteria hanging from its rim, each its own body so it can swing. */
  vines: { body: number; root: V3; len: number }[];
}

/** A floating rock arch: its body, the radius of its curve, and the middle of its opening (in its own frame). */
export interface Arch { body: number; R: number; opening: V3 }

export interface SkyScene {
  solid: Float32Array;
  solidCount: number;
  glow: Float32Array;
  glowCount: number;
  bodies: Body[];
  sun: V3;
  focal: number;
  viewW: number;
  viewH: number;
  pageH: number;
  islands: Island[];
  arches: Arch[];
  life: SkyLife;
  events: SkyEvents;
  /** Every body's centre and rotation as last posed. */
  centres?: V3[];
  rots?: number[][];
}

export class Builder {
  solid: number[] = [];
  glow: number[] = [];
  bodies: Body[] = [];

  body(b: Partial<Body> & { kind: SkyKind; pos: V3 }): number {
    this.bodies.push({ name: b.kind, radius: 0, base: IDENTITY, spin: 0, spin0: 0, ...b });
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

/** An ellipsoid with semi-axes `ax`, centred at `c`: for snouts, bellies, wings and fins. */
export const ellipsoid = (B: Builder, obj: number, ax: V3, sp: number, surface: Surface, c: V3 = [0, 0, 0], flags = 0) => {
  const R = Math.max(ax[0], ax[1], ax[2]);
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
  void R;
};

/**
 * A tube along a path (whiskers, locks of mane, antlers): rings of surfels round
 * each step, `radius(u)` thick at a share `u` of the way along.
 */
export const tube = (B: Builder, obj: number, path: V3[], radius: (u: number) => number, sp: number, surface: (u: number, n: V3) => { mat: number; alb: number }, flags = 0) => {
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
        // Discs as wide as the gap to their neighbours round the ring (at least the spacing along it).
        B.surfel([c[0] + d[0] * r, c[1] + d[1] * r, c[2] + d[2] * r], d, Math.max(sp, (2 * Math.PI * r) / n) * DISC, s.mat, s.alb, obj, flags);
      }
      next += sp * 0.8;
    }
    run += seg;
  }
};

export const hexToRgb =(hex: string): V3 => [parseInt(hex.slice(1, 3), 16) / 255, parseInt(hex.slice(3, 5), 16) / 255, parseInt(hex.slice(5, 7), 16) / 255];
const hash2 = (a: number, b: number) => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); };

interface Ctx {
  rand: () => number;
  k: (z: number) => number;
  sp: (z: number) => number;
  s: number;
}

// ---------------------------------------------------------------- islands ---

/** A round tree (or a blossom tree, or a pine) standing at `p` on an island, `h` tall. */
export const tree = (B: Builder, obj: number, p: V3, h: number, sp: number, kind: 'round' | 'blossom' | 'pine', far: boolean, rand: () => number) => {
  const bark = far ? M.far : M.bark;
  const trunkR = h * 0.09;
  const trunkH = kind === 'pine' ? h * 0.3 : h * 0.5;
  // The trunk, a little cylinder, with a lean.
  const lean = (rand() - 0.5) * 0.25;
  for (let y = 0; y < trunkH; y += sp * 0.7) {
    const n = Math.max(5, Math.round((2 * Math.PI * trunkR) / (sp * 0.7)));
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const d: V3 = [Math.cos(a), 0, Math.sin(a)];
      B.surfel([p[0] + d[0] * trunkR + lean * y, p[1] - y, p[2] + d[2] * trunkR], d, sp * DISC * 0.8, bark, 0.45 + d[0] * 0.1, obj);
    }
  }
  const top: V3 = [p[0] + lean * trunkH, p[1] - trunkH, p[2]];
  const leaf = far ? M.fargrass : kind === 'blossom' ? M.blossom : M.leaf;
  if (kind === 'pine') {
    // Three tiers of cone, narrowing upward.
    for (let tier = 0; tier < 3; tier++) {
      const r0 = h * (0.34 - tier * 0.08);
      const y0 = top[1] + h * 0.12 - tier * h * 0.22;
      const tall = h * 0.34;
      for (let y = 0; y < tall; y += sp * 0.75) {
        const r = r0 * (1 - y / tall);
        const n = Math.max(4, Math.round((2 * Math.PI * r) / (sp * 0.75)));
        for (let i = 0; i < n; i++) {
          const a = (i / n) * Math.PI * 2 + tier;
          const d = norm([Math.cos(a), -0.55, Math.sin(a)]);
          B.surfel([top[0] + Math.cos(a) * r, y0 - y, top[2] + Math.sin(a) * r], d, sp * DISC, leaf, 0.4 + (y / tall) * 0.25 + (rand() - 0.5) * 0.15, obj);
        }
      }
    }
    return;
  }
  // A canopy of three or four puffs.
  const puffs = 3 + Math.floor(rand() * 2);
  for (let i = 0; i < puffs; i++) {
    const a = (i / puffs) * Math.PI * 2 + rand();
    const r = h * (0.26 + rand() * 0.08);
    const c: V3 = [top[0] + Math.cos(a) * h * 0.2, top[1] - h * 0.12 - (i === 0 ? h * 0.1 : 0), top[2] + Math.sin(a) * h * 0.2];
    sphere(B, obj, r, sp, d => {
      if (d[1] > 0.6) return null;
      const dots = kind === 'round' && !far && hash2(d[0] * 9 + i, d[2] * 9) > 0.93;
      return { mat: dots ? M.blossom : leaf, alb: 0.5 - d[1] * 0.2 + (fbm(d[0] * 3, d[1] * 3, d[2] * 3, i * 13, 2) - 0.5) * 0.5 };
    }, c);
  }
};

/** `outward`: +1 on the right of the page, -1 on the left, so waterfalls pour away from the cards. */
interface IslandOpts { far: boolean; seed: number; falls: boolean; trees: number; crystals: boolean; outward: number; garden?: boolean }

/**
 * A floating island: a grassy top with an irregular edge, planted with trees and
 * flowers, over a craggy underside that tapers to a point in bands of rock. A
 * pond near the edge spills off it as a waterfall. Its top tilts towards the
 * viewer, so it reads as seen from slightly above.
 */
const island = (B: Builder, ctx: Ctx, pos: V3, Rapp: number, z: number, o: IslandOpts): Island => {
  const { k, rand } = ctx;
  const R = Rapp * k(z);
  const sp = ctx.sp(z) * (o.far ? 1.25 : 1);
  const tilt = -0.36 - rand() * 0.12;
  const yaw = rand() * Math.PI * 2;
  const base = mul3(rotX(tilt), rotY(yaw));
  const body = B.body({ kind: o.far ? 'far' : 'island', name: o.far ? 'distant island' : 'island', pos, radius: R * 1.25, base, bob: { amp: (o.far ? 4 : 7) * k(z), rate: 0.22 + rand() * 0.12, phase: rand() * 6 } });
  const ns = o.seed;
  const edge = (a: number) => R * (0.84 + (fbm(Math.cos(a) * 1.4 + 5, Math.sin(a) * 1.4 + 5, 0.5, ns, 3) - 0.5) * 0.8);
  const topY = (x: number, zz: number) => {
    const a = Math.atan2(zz, x);
    const u = Math.hypot(x, zz) / edge(a);
    return -R * 0.07 * (1 - u * u) + (u > 0.88 ? ((u - 0.88) / 0.12) ** 2 * R * 0.06 : 0) + (fbm(x / R * 3, zz / R * 3, 1, ns + 2, 2) - 0.5) * R * 0.04;
  };
  const grass = o.far ? M.fargrass : M.grass;
  const rock = o.far ? M.far : M.stone;
  const sand = o.far ? M.far : M.sand;
  const soil = o.far ? M.far : M.soil;

  // Which way the waterfall pours: towards the viewer, and out towards the page's edge rather than behind the cards.
  let fallA = 0, fallBest = -Infinity;
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    const w = rotate(base, [Math.cos(a), 0, Math.sin(a)]);
    const score = w[2] * 1.2 + w[0] * o.outward * 0.6;
    if (score > fallBest) { fallBest = score; fallA = a; }
  }
  const pondC: V3 = [Math.cos(fallA) * R * 0.5, 0, Math.sin(fallA) * R * 0.5];
  const pondR = R * 0.2;
  const inWater = (x: number, zz: number) => {
    if (!o.falls) return false;
    if (Math.hypot(x - pondC[0], zz - pondC[2]) < pondR * (0.85 + fbm(x / R * 6, zz / R * 6, 3, ns + 4, 2) * 0.3)) return true;
    // The stream from the pond to the lip.
    const a = Math.atan2(zz, x);
    let da = Math.abs(a - fallA); da = Math.min(da, Math.PI * 2 - da);
    const u = Math.hypot(x, zz) / R;
    return u > 0.5 && da * u < 0.07;
  };

  // The top: grass, flower patches, the pond.
  const flowerMats = [M.blossom, M.gold, M.cream, M.coral];
  const span = R * 1.2;
  const N = Math.round((Math.PI * span * span) / (sp * sp));
  const perches: V3[] = [];
  for (let i = 0; i < N; i++) {
    const rr = span * Math.sqrt((i + 0.5) / N);
    const a = i * GOLDEN;
    const e = edge(a);
    if (rr > e) continue;
    const x = Math.cos(a) * rr, zz = Math.sin(a) * rr;
    const u = rr / e;
    const y = topY(x, zz);
    const lip = u > 0.82 ? (u - 0.82) * 4 : 0;
    const n = norm([Math.cos(a) * lip + (rand() - 0.5) * 0.15, -1, Math.sin(a) * lip + (rand() - 0.5) * 0.15]);
    if (inWater(x, zz)) {
      // Darker than the sky it reflects, so it reads as water rather than snow; the stream to the lip runs.
      B.surfel([x, y + R * 0.01, zz], [0, -1, 0], sp * DISC, M.water, 0.12 + (rand() - 0.5) * 0.2, body, u > 0.6 ? F.flow : 0);
      continue;
    }
    const patch = fbm(x / R * 5, zz / R * 5, 7, ns + 9, 2);
    if (!o.far && patch > 0.64 && rand() < 0.55) {
      B.surfel([x, y - sp * 0.3, zz], n, sp * DISC, flowerMats[Math.floor(patch * 97) % flowerMats.length], 0.75, body);
      continue;
    }
    B.surfel([x, y, zz], n, sp * DISC, grass, 0.5 + (fbm(x / R * 4, zz / R * 4, 0, ns + 1, 3) - 0.5) * 0.9 + (u > 0.9 ? -0.1 : 0), body);
    if (u < 0.75 && i % 97 === 0) perches.push([x, y, zz]);
  }

  // The underside: craggy, banded rock tapering to a point, soil and dangling grass at the top.
  const H = R * (0.95 + rand() * 0.45);
  const P = (t: number) => (1 - t) ** 0.72 * (1 - 0.12 * t);
  const under = (t: number, a: number): V3 => {
    const lump = 1 + (fbm(Math.cos(a) * 2.2 + t * 2, Math.sin(a) * 2.2, t * 4, ns + 5, 3) - 0.5) * 0.55;
    const r = edge(a) * P(t) * (t < 0.04 ? 1 : lump);
    return [Math.cos(a) * r, R * 0.04 + t * H, Math.sin(a) * r];
  };
  // A touch coarser than the top: it's mostly in shade, where detail counts for less.
  const usp = sp * 1.15;
  const rows = Math.ceil((H * 1.25) / usp);
  for (let j = 0; j < rows; j++) {
    const t = (j + 0.5) / rows;
    const ring = Math.max(6, Math.round((2 * Math.PI * R * P(t) * 0.95) / usp));
    for (let i = 0; i < ring; i++) {
      const a = ((i + (j % 2) * 0.5) / ring) * Math.PI * 2;
      const p = under(t, a);
      const pa = under(t, a + 0.02), pt = under(Math.min(1, t + 0.01), a);
      let n = norm(cross([pt[0] - p[0], pt[1] - p[1], pt[2] - p[2]], [pa[0] - p[0], pa[1] - p[1], pa[2] - p[2]]));
      if (n[0] * Math.cos(a) + n[2] * Math.sin(a) + n[1] * 0.3 < 0) n = [-n[0], -n[1], -n[2]];
      const band = Math.floor((t * H) / (R * 0.13) + fbm(Math.cos(a) * 2, Math.sin(a) * 2, t * 3, ns + 8, 2) * 1.6);
      let mat: number = band % 3 === 1 ? rock : sand;
      let alb = 0.5 + (fbm(Math.cos(a) * 5, Math.sin(a) * 5, t * 8, ns + 6, 2) - 0.5) * 0.7 - t * 0.15;
      if (t < 0.03) { mat = grass; alb = 0.42; }
      else if (t < 0.11 + (fbm(Math.cos(a) * 3, Math.sin(a) * 3, 0, ns + 3, 2) - 0.5) * 0.08) { mat = soil; alb = 0.5 - t; }
      if (o.crystals && t > 0.55 && hash2(i * 0.37 + j, ns) > 0.9) { mat = M.crystal; alb = 0.75; }
      B.surfel(p, n, usp * DISC, mat, alb, body, mat === M.crystal ? F.emissive : 0);
    }
  }
  if (o.crystals && !o.far) {
    const tip = under(0.92, 0);
    B.glowAt(tip, R * 0.35, [0.35, 0.5, 0.9], body, G.flicker, rand());
  }
  // Roots and grass hanging from the rim.
  if (!o.far) {
    for (let v = 0; v < 9; v++) {
      const a = rand() * Math.PI * 2;
      const start = under(0.06, a);
      const len = R * (0.15 + rand() * 0.4);
      const mat = rand() < 0.6 ? M.leaf : M.bark;
      for (let y = 0; y < len; y += sp * 0.55) {
        const sway = Math.sin(y / len * 2.5 + v) * R * 0.03;
        B.surfel([start[0] + Math.cos(a) * (sp + sway), start[1] + y, start[2] + Math.sin(a) * (sp + sway)], [Math.cos(a), 0.2, Math.sin(a)], sp * DISC * 0.6, mat, 0.45 - (y / len) * 0.1, body, F.twoSided);
      }
    }
  }

  // Mud nests stuck under the rim on the side facing the viewer, for the puffball birds.
  const nests: V3[] = [];
  let front = 0;
  if (!o.far) {
    let best = 0, bestZ = -Infinity;
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      const w = rotate(base, [Math.cos(a), 0, Math.sin(a)]);
      const score = w[2] - w[0] * o.outward * 0.4;
      if (score > bestZ && Math.abs(a - fallA) > 0.6) { bestZ = score; best = a; }
    }
    front = best;
    for (const da of [-0.45, 0.4]) {
      const a = best + da;
      const p = under(0.16, a);
      const out: V3 = [Math.cos(a), 0, Math.sin(a)];
      const cr = R * 0.11;
      const c: V3 = [p[0] + out[0] * cr * 0.6, p[1] + cr * 0.2, p[2] + out[2] * cr * 0.6];
      // A cup of mud and twigs, open at the top.
      sphere(B, body, cr, sp * 0.8, d => (d[1] < -0.25 ? null : { mat: (d[0] * 7 + d[2] * 5) % 1 > 0.5 ? M.bark : M.soil, alb: 0.5 + d[1] * 0.15 + (hash2(d[0] * 30, d[2] * 30) - 0.5) * 0.3 }), c);
      nests.push([c[0], c[1] - cr * 0.3, c[2]]);
    }
  }

  // Trees and boulders on top, clear of the pond.
  const kinds: ('round' | 'blossom' | 'pine')[] = ['round', 'blossom', 'pine', 'round'];
  let planted = 0;
  for (let tries = 0; planted < o.trees && tries < 60; tries++) {
    const a = rand() * Math.PI * 2;
    const rr = edge(a) * Math.sqrt(rand()) * 0.7;
    const x = Math.cos(a) * rr, zz = Math.sin(a) * rr;
    if (o.falls && Math.hypot(x - pondC[0], zz - pondC[2]) < pondR * 1.6) continue;
    const kind = kinds[(planted + o.seed) % kinds.length];
    tree(B, body, [x, topY(x, zz), zz], R * (0.32 + rand() * 0.16), sp, kind, o.far, rand);
    planted++;
  }
  for (let b = 0; b < 3; b++) {
    const a = rand() * Math.PI * 2;
    const rr = edge(a) * (0.5 + rand() * 0.3);
    const x = Math.cos(a) * rr, zz = Math.sin(a) * rr;
    if (inWater(x, zz)) continue;
    const r = R * (0.05 + rand() * 0.05);
    sphere(B, body, r, sp, d => (d[1] > 0.3 ? null : { mat: rock, alb: 0.55 - d[1] * 0.2 }), [x, topY(x, zz) - r * 0.4, zz]);
  }

  // The waterfall: over the lip, then straight down past the underside into the mist below.
  let falls: V3 | null = null;
  if (o.falls) {
    const dirx = Math.cos(fallA), dirz = Math.sin(fallA);
    const lipR = edge(fallA);
    const w = R * 0.13;
    const L = H * 1.35 + R * 0.5;
    const step = sp * 0.75;
    for (let s = 0; s < L; s += step) {
      const outward = lipR + R * 0.03 + R * 0.1 * Math.sqrt(Math.min(1, s / (R * 0.35)));
      const spread = 1 + (s / L) * 0.7;
      const thin = (s / L) ** 3;
      for (let c = -w / 2; c <= w / 2; c += step) {
        if (rand() < thin * 0.9) continue;
        const cx = c * spread;
        B.surfel(
          [dirx * outward - dirz * cx, topY(dirx * lipR, dirz * lipR) + s, dirz * outward + dirx * cx],
          [dirx, -0.1, dirz], sp * DISC, M.water, 0.55 + (rand() - 0.5) * 0.25 + (Math.abs(c) > w * 0.38 ? 0.15 : 0), body, F.flow | F.twoSided,
        );
      }
    }
    // Spray where it breaks up, and mist at its foot.
    const foot: V3 = [dirx * (lipR + R * 0.13), topY(dirx * lipR, dirz * lipR) + L, dirz * (lipR + R * 0.13)];
    for (let m = 0; m < 10; m++) {
      const u = 0.55 + m * 0.05;
      B.glowAt([foot[0] + (rand() - 0.5) * w * 2, foot[1] * u + (rand() - 0.5) * R * 0.1, foot[2]], R * (0.12 + rand() * 0.1), [0.75, 0.82, 0.9], body, G.flicker, rand());
    }
    falls = foot;
  }

  // A hanging garden: curtains of vine and wisteria down the front of the rim.
  const vines: Island['vines'] = [];
  if (o.garden && !o.far) {
    const angDist = (a: number, b: number) => { const d = Math.abs(((a - b) % (Math.PI * 2) + Math.PI * 3) % (Math.PI * 2) - Math.PI); return d; };
    for (let k = 0; k < 11; k++) {
      const a = front + Math.PI * 0.55 + (k / 10 - 0.5) * 2.6;
      if (o.falls && angDist(a, fallA) < 0.3) continue;
      if (angDist(a, front - 0.45) < 0.22 || angDist(a, front + 0.4) < 0.22) continue;
      const rootP = under(0.06, a);
      const rootOut: V3 = [rootP[0] + Math.cos(a) * sp, rootP[1], rootP[2] + Math.sin(a) * sp];
      const len = R * (0.4 + rand() * 0.75);
      const vb = B.body({ kind: 'vine', name: 'wisteria', pos: [0, 0, 0], attach: { parent: body, offset: rootOut }, params: [0, 0, 0, rand() * 6] });
      const path: V3[] = [];
      const wig = rand() * 6;
      for (let y = 0; y <= len; y += sp) path.push([Math.sin(y / len * 3 + wig) * R * 0.025, y, 0]);
      tube(B, vb, path, () => sp * 0.5, sp, () => ({ mat: M.leaf, alb: 0.4 }), F.twoSided);
      // Racemes of wisteria hanging off it, pale at their tips, with a few leaves.
      for (let y = len * 0.15; y < len; y += R * (0.12 + rand() * 0.07)) {
        const side = (rand() - 0.5) * R * 0.05;
        const rl = R * (0.09 + rand() * 0.05);
        const c: V3 = [side, y + rl * 0.6, (rand() - 0.5) * R * 0.03];
        ellipsoid(B, vb, [R * 0.04, rl, R * 0.04], sp * 1.1, d => ({ mat: rand() < 0.08 ? M.cream : M.wisteria, alb: 0.45 + d[1] * 0.3 }), c);
        if (rand() < 0.5) sphere(B, vb, R * 0.025, sp * 0.8, () => ({ mat: M.leaf, alb: 0.55 }), [side + R * 0.04, y, 0]);
      }
      vines.push({ body: vb, root: rootOut, len });
    }
  }

  const edges = Array.from({ length: 24 }, (_, i) => edge((i / 24) * Math.PI * 2));
  return { body, R, z, far: o.far, perches, falls, nests, H, edge: edges, vines };
};

// -------------------------------------------------------- pillars, arches ---

/**
 * A floating rock pillar: a tall column of banded rock, nearly straight-sided,
 * tapering to a point far below, with a cap of grass and pines on top.
 */
const pillar = (B: Builder, ctx: Ctx, pos: V3, Rapp: number, Happ: number, z: number, seed: number): Island => {
  const { k, rand } = ctx;
  const R = Rapp * k(z), H = Happ * k(z);
  const sp = ctx.sp(z);
  const base = mul3(rotX(-0.22), rotY(rand() * Math.PI * 2));
  const body = B.body({ kind: 'pillar', name: 'rock pillar', pos, radius: H * 0.6, base, bob: { amp: 5 * k(z), rate: 0.2 + rand() * 0.1, phase: rand() * 6 } });
  const edge = (a: number) => R * (0.9 + (fbm(Math.cos(a) * 1.6 + 2, Math.sin(a) * 1.6 + 2, 0.5, seed, 3) - 0.5) * 0.5);
  const prof = (t: number) => (t < 0.85 ? 1 - 0.15 * t : 0.8725 * ((1 - t) / 0.15) ** 0.6);
  const at = (t: number, a: number): V3 => {
    const lump = 1 + (fbm(Math.cos(a) * 2 + t * 3, Math.sin(a) * 2, t * 9, seed + 5, 3) - 0.5) * 0.35;
    const r = edge(a) * prof(t) * (t < 0.02 ? 1 : lump);
    return [Math.cos(a) * r, t * H, Math.sin(a) * r];
  };
  const rows = Math.ceil(H / sp);
  for (let j = 0; j < rows; j++) {
    const t = (j + 0.5) / rows;
    const ring = Math.max(6, Math.round((2 * Math.PI * R * prof(t)) / sp));
    for (let i = 0; i < ring; i++) {
      const a = ((i + (j % 2) * 0.5) / ring) * Math.PI * 2;
      const p = at(t, a);
      const pa = at(t, a + 0.03), pt = at(Math.min(1, t + 0.01), a);
      let n = norm(cross([pt[0] - p[0], pt[1] - p[1], pt[2] - p[2]], [pa[0] - p[0], pa[1] - p[1], pa[2] - p[2]]));
      if (n[0] * Math.cos(a) + n[2] * Math.sin(a) < 0) n = [-n[0], -n[1], -n[2]];
      const band = Math.floor(t * H / (R * 0.35) + fbm(Math.cos(a) * 2, Math.sin(a) * 2, t * 4, seed + 8, 2) * 1.4);
      let mat: number = band % 3 === 1 ? M.stone : M.sand;
      if (t < 0.025) mat = M.grass;
      // Moss streaking down the shaded side.
      else if (fbm(Math.cos(a) * 3, t * 12, Math.sin(a) * 3, seed + 11, 2) > 0.66) mat = M.leaf;
      B.surfel(p, n, sp * DISC, mat, 0.5 + (fbm(Math.cos(a) * 6, Math.sin(a) * 6, t * 20, seed + 6, 2) - 0.5) * 0.7, body);
    }
  }
  // The grassy cap.
  const perches: V3[] = [];
  const span = R * 1.1;
  const N = Math.round((Math.PI * span * span) / (sp * sp));
  for (let i = 0; i < N; i++) {
    const rr = span * Math.sqrt((i + 0.5) / N);
    const a = i * GOLDEN;
    if (rr > edge(a)) continue;
    const x = Math.cos(a) * rr, zz = Math.sin(a) * rr;
    const flower = rand() < 0.05;
    B.surfel([x, -R * 0.04 * (1 - (rr / edge(a)) ** 2), zz], [0, -1, 0], sp * DISC, flower ? M.blossom : M.grass, flower ? 0.75 : 0.5 + (rand() - 0.5) * 0.3, body);
    if (i % 41 === 0 && rr < edge(a) * 0.6) perches.push([x, -R * 0.04, zz]);
  }
  tree(B, body, [R * 0.15, -R * 0.03, -R * 0.1], R * 0.95, sp, 'pine', false, rand);
  tree(B, body, [-R * 0.35, -R * 0.02, R * 0.25], R * 0.6, sp, rand() < 0.5 ? 'round' : 'blossom', false, rand);
  const edges = Array.from({ length: 24 }, (_, i) => edge((i / 24) * Math.PI * 2));
  return { body, R, z, far: false, perches, falls: null, nests: [], H, edge: edges, pillar: true, vines: [] };
};

/** A floating arch of rock: a lumpy bow of banded stone, grassed on top, its feet tapering away below. */
const arch = (B: Builder, ctx: Ctx, pos: V3, Rapp: number, z: number, seed: number, yaw: number): Arch => {
  const { k, rand } = ctx;
  const R = Rapp * k(z);
  const sp = ctx.sp(z);
  const body = B.body({ kind: 'arch', name: 'stone arch', pos, radius: R * 1.4, base: mul3(rotY(yaw), rotX(-0.12)), bob: { amp: 5 * k(z), rate: 0.18 + rand() * 0.1, phase: rand() * 6 } });
  const thick = (u: number) => R * (0.2 + (1 - Math.sin(Math.PI * u)) * 0.1) * (1 + (fbm(u * 5, 0.5, 0.5, seed, 2) - 0.5) * 0.5);
  const band = (u: number, n: V3) => (Math.floor(u * 11 + n[0] * 0.8 + fbm(u * 3, n[1], n[2], seed + 4, 2) * 1.5) % 3 === 1 ? M.stone : M.sand);
  const path: V3[] = [];
  for (let i = 0; i <= 48; i++) { const a = Math.PI * (i / 48); path.push([-Math.cos(a) * R, -Math.sin(a) * R, 0]); }
  tube(B, body, path, thick, sp, (u, n) => (n[1] < -0.55 && u > 0.06 && u < 0.94 ? { mat: M.grass, alb: 0.5 + (fbm(u * 20, n[0], n[2], seed + 2, 2) - 0.5) * 0.6 } : { mat: band(u, n), alb: 0.5 + n[1] * 0.1 + (fbm(u * 30, n[0] * 3, n[2] * 3, seed + 3, 2) - 0.5) * 0.6 }));
  // The feet, hanging away to points below.
  for (const side of [-1, 1]) {
    const foot: V3[] = [];
    for (let i = 0; i <= 10; i++) foot.push([side * R * (1 + i * 0.006), (i / 10) * R * 0.85, 0]);
    tube(B, body, foot, u => thick(side < 0 ? 0 : 1) * 1.05 * (1 - u) ** 0.7 + sp * 0.3, sp, (u, n) => ({ mat: band(u + 0.3, n), alb: 0.45 - u * 0.15 + n[1] * 0.1 }));
  }
  // A pine leaning off the crown, and moss trailing from the inside of the curve.
  tree(B, body, [R * 0.12, -R - thick(0.5) * 0.85, 0], R * 0.42, sp, 'pine', false, rand);
  for (let v = 0; v < 7; v++) {
    const a = Math.PI * (0.2 + rand() * 0.6);
    const r0 = R - thick(a / Math.PI) * 0.9;
    const len = R * (0.12 + rand() * 0.25);
    const strand: V3[] = [];
    for (let y = 0; y <= len; y += sp) strand.push([-Math.cos(a) * r0, -Math.sin(a) * r0 + y, (rand() - 0.5) * thick(0.5) * 0.6]);
    if (strand.length > 1) tube(B, body, strand, () => sp * 0.45, sp, () => ({ mat: M.leaf, alb: 0.45 }), F.twoSided);
  }
  return { body, R, opening: [0, -R * 0.45, 0] };
};

// ----------------------------------------------------------------- clouds ---

/**
 * A puffy cumulus: a row of overlapping puffs with a taller one or two on top,
 * flat underneath, lit on top. Only the side facing the viewer is built.
 */
export const cloud = (B: Builder, ctx: Ctx, pos: V3, Wapp: number, z: number, opts: { drift?: number; minX?: number; maxX?: number; mat?: number; kind?: SkyKind; flat?: number } = {}) => {
  const { k, rand } = ctx;
  const W = Wapp * k(z);
  // Clouds are soft, smooth shapes, so their surfels can be spaced wider than rock's.
  const sp = ctx.sp(z) * 2;
  const mat = opts.mat ?? M.cloud;
  const body = B.body({
    kind: opts.kind ?? 'cloud', name: 'cloud', pos, radius: W * 0.6,
    drift: opts.drift ? { vx: opts.drift * k(z), min: opts.minX ?? -W, max: opts.maxX ?? 1e4 } : undefined,
  });
  const flat = W * (opts.flat ?? 0.1);
  const puffs: [V3, number][] = [];
  const n = 4 + Math.floor(rand() * 3);
  for (let i = 0; i < n; i++) {
    const u = n === 1 ? 0 : i / (n - 1) - 0.5;
    const r = W * (0.17 + rand() * 0.08) * (1 - Math.abs(u) * 0.5);
    puffs.push([[u * W * 0.78, flat - r * 0.75, (rand() - 0.5) * W * 0.12], r]);
  }
  for (let i = 0; i < 1 + Math.floor(rand() * 2); i++) {
    const r = W * (0.22 + rand() * 0.07);
    puffs.push([[(rand() - 0.5) * W * 0.35, flat - r * 1.25, W * 0.04], r]);
  }
  const ns = Math.floor(rand() * 1e5);
  for (const [c, r] of puffs) {
    sphere(B, body, r, sp, d => {
      if (d[2] < -0.25) return null;
      // Nothing buried inside another puff.
      const p: V3 = [c[0] + d[0] * r, c[1] + d[1] * r, c[2] + d[2] * r];
      for (const [c2, r2] of puffs) if (c2 !== c && (p[0] - c2[0]) ** 2 + (p[1] - c2[1]) ** 2 + (p[2] - c2[2]) ** 2 < r2 * r2 * 0.92) return null;
      const y = p[1];
      // Flat underneath: anything below the base is pressed up onto it.
      if (y > flat) return d[1] > 0.2 ? { mat, alb: 0.28, n: [0, 1, 0.3] as V3, h: (flat - c[1]) / (d[1] * r) - 1 } : null;
      return { mat, alb: 0.5 - d[1] * 0.28 + (fbm(d[0] * 2.5, d[1] * 2.5, d[2] * 2.5, ns, 2) - 0.5) * 0.35 };
    }, c);
  }
  return body;
};

// -------------------------------------------------------------- the scene ---

/**
 * Builds the whole scene for a viewport `viewW` x `viewH` over a page `pageH` tall.
 * Positions depend on all three, so it is rebuilt when they change much.
 */
export const buildScene = (viewW: number, viewH: number, pageH: number, seed = 11): SkyScene => {
  const rand = mulberry(seed);
  const B = new Builder();
  const f = focalFor(viewH);
  const k = (z: number) => (f - z) / f;
  const at = (sx: number, y: number, z: number): V3 => [viewW / 2 + (sx * viewW - viewW / 2) * k(z), y, z];
  const sp = (z: number) => SPACING * k(z);
  const s = Math.min(1.1, Math.max(0.5, viewW / 1400));
  const phone = viewW < 640;
  const ctx: Ctx = { rand, k, sp, s };

  // The sun, high in the top right corner, haloed.
  const sunZ = -2.5 * f;
  const sunR = 70 * s * k(sunZ);
  const sunPos = at(0.88, 40, sunZ);
  const sun = B.body({ kind: 'sun', name: 'sun', pos: sunPos, radius: sunR });
  sphere(B, sun, sunR, sp(sunZ) * 1.5, d => (d[2] < -0.1 ? null : { mat: M.sun, alb: 0.85 + d[2] * 0.15, flags: F.emissive }));
  B.glowAt([0, 0, 0], sunR * 4.2, [0.55, 0.45, 0.25], sun, 0, 0);
  B.glowAt([0, 0, 0], sunR * 2.4, [0.9, 0.8, 0.55], sun, 0, 0.3);
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    B.glowAt([Math.cos(a) * sunR * 1.5, Math.sin(a) * sunR * 1.5, 0], sunR * 0.6, [0.6, 0.5, 0.3], sun, G.flicker, rand());
  }

  const islands: Island[] = [];
  const discs: Disc[] = [];
  const clear = (d: Disc, margin: number) => discs.every(o => screenClearance(d, o, f, viewW, viewH) > margin);
  // Near things only: what pillars and arches must keep clear of (the far islands are well behind them).
  const nearDiscs: Disc[] = [];
  const clearNear = (d: Disc, margin: number) => nearDiscs.every(o => screenClearance(d, o, f, viewW, viewH) > margin);
  // Keep the hero's words clear: nothing big in the opening view's left and middle.
  const heroClear = (d: Disc) => {
    const kz = k(d.pos[2]);
    const sx = (d.pos[0] - viewW / 2) / kz + viewW / 2;
    const sy = d.pos[1] / kz + (viewH / 2) * (1 - 1 / kz);
    const r = d.r / kz;
    return !(sy - r < viewH * 0.95 && sx + r > viewW * 0.04 && sx - r < viewW * (phone ? 1 : 0.7));
  };

  // Distant islands first, hazy and blue, far behind everything (they show in the gaps between cards).
  const farCount = Math.max(4, Math.round(pageH / 750));
  for (let i = 0; i < farCount; i++) {
    for (let tries = 0; tries < 12; tries++) {
      const z = -(1.6 + rand() * 1.6) * f;
      const Rapp = (55 + rand() * 45) * s;
      const pos = at(0.08 + rand() * 0.84, ((i + 0.3 + rand() * 0.5) / farCount) * pageH, z);
      const d: Disc = { pos: [pos[0], pos[1] + Rapp * k(z) * 0.5, z], r: Rapp * k(z) * 1.4 };
      if (!clear(d, 10) || !heroClear(d)) continue;
      discs.push(d);
      islands.push(island(B, ctx, pos, Rapp, z, { far: true, seed: seed * 50 + i, falls: rand() < 0.4, trees: 2 + Math.floor(rand() * 3), crystals: false, outward: pos[0] > viewW / 2 ? 1 : -1 }));
      break;
    }
  }

  // The near islands, down the gutters on alternate sides, at a range of depths.
  const first = viewH * 0.55;
  const step = phone ? 620 : 680;
  const nearCount = Math.max(3, Math.floor((pageH - first) / step) + 1);
  for (let i = 0; i < nearCount; i++) {
    const right = i % 2 === 0;
    for (let tries = 0; tries < 14; tries++) {
      const z = -(0.12 + rand() * 0.55) * f;
      const Rapp = (phone ? 80 : 115 + rand() * 45) * s;
      const sx = right ? 0.9 - rand() * 0.06 : 0.1 + rand() * 0.06;
      const pos = at(sx, first + i * step + (rand() - 0.5) * 220 + tries * 30, z);
      const d: Disc = { pos: [pos[0], pos[1] + Rapp * k(z) * 0.45, z], r: Rapp * k(z) * 1.35 };
      if ((!clear(d, 20) || !heroClear(d)) && tries < 13) continue;
      discs.push(d); nearDiscs.push(d);
      const isl = island(B, ctx, pos, Rapp, z, { far: false, seed: seed * 10 + i, falls: i % 3 !== 2, trees: 3 + Math.floor(rand() * 3), crystals: i % 3 === 2, outward: right ? 1 : -1, garden: i % 2 === 1 || i % 5 === 0 });
      islands.push(isl);
      // A cloud at the foot of the falls, a little nearer, so the water pours into it.
      if (isl.falls) {
        const foot = rotate(B.bodies[isl.body].base, isl.falls);
        const cz = z + 0.05 * f;
        cloud(B, ctx, [pos[0] + foot[0], pos[1] + foot[1] + Rapp * 0.35 * k(cz), cz], Rapp * 1.15, cz, { flat: 0.05 });
      }
      break;
    }
  }

  // Rock pillars and arches in the gaps between the islands, clear of them and of the hero.
  const arches: Arch[] = [];
  const pillarCount = Math.max(2, Math.round(pageH / 1700));
  const archCount = Math.max(1, Math.round(pageH / 3000));
  for (let i = 0; i < pillarCount + archCount; i++) {
    const isArch = i % 3 === 1 && arches.length < archCount;
    for (let tries = 0; tries < 40; tries++) {
      // Near ones first; failing that, further back among the islands, where a little overlap on screen is only depth.
      const deeper = tries >= 20;
      const z = -(deeper ? 0.65 + rand() * 0.5 : 0.18 + rand() * 0.4) * f;
      const margin = deeper ? -40 : 12;
      const right = rand() < 0.5;
      const sx = right ? 0.86 + rand() * 0.08 : 0.06 + rand() * 0.08;
      const y = viewH + rand() * (pageH - viewH * 1.6);
      if (isArch) {
        const Ra = (phone ? 64 : 92) * s;
        // Arches may reach in behind the cards' edges: the dragons threading them still show in the gutter.
        const pos = at(right ? sx - 0.06 : sx + 0.06, y, z);
        const d: Disc = { pos: [pos[0], pos[1] - Ra * k(z) * 0.2, z], r: Ra * k(z) * 1.45 };
        if (!clearNear(d, deeper ? -20 : 30) || !heroClear(d)) continue;
        nearDiscs.push(d);
        arches.push(arch(B, ctx, pos, Ra, z, seed * 3 + i, (right ? -1 : 1) * (0.55 + rand() * 0.3)));
      } else {
        const Rp = (phone ? 30 : 42) * s, Hp = (phone ? 190 : 270) * s;
        const pos = at(sx, y, z);
        // A tall, narrow thing: its room is checked as three small discs down its length.
        const ds: Disc[] = [0.05, 0.4, 0.75].map(u => ({ pos: [pos[0], pos[1] + Hp * k(z) * u, z], r: Math.max(Rp * 1.6, Hp * 0.2) * k(z) }));
        if (!ds.every(d => clearNear(d, margin) && heroClear(d))) continue;
        nearDiscs.push(...ds);
        islands.push(pillar(B, ctx, pos, Rp, Hp, z, seed * 7 + i));
      }
      break;
    }
  }

  // Clouds everywhere else, drifting slowly across: deep ones small and pale, near ones big.
  const cloudCount = Math.round(pageH / (phone ? 380 : 300));
  for (let i = 0; i < cloudCount; i++) {
    const deep = rand();
    const z = deep < 0.6 ? -(0.8 + rand() * 2) * f : -(0.05 + rand() * 0.6) * f;
    const W = (deep < 0.6 ? 120 + rand() * 120 : 170 + rand() * 160) * s;
    const y = rand() * pageH;
    const pos = at(rand() * 1.2 - 0.1, y, z);
    const kz = k(z);
    if (!heroClear({ pos, r: W * kz * 0.5 })) continue;
    const span = viewW * kz;
    cloud(B, ctx, pos, W, z, { drift: (3 + rand() * 5) * (rand() < 0.5 ? -1 : 1), minX: viewW / 2 - span * 0.8, maxX: viewW / 2 + span * 0.8 });
  }

  // A sea of cloud at the foot of the page, the islands' long way down.
  {
    const rows = 2;
    for (let r = 0; r < rows; r++) {
      const z = -(0.2 + r * 0.7) * f;
      const y = pageH - 40 + r * 70;
      const across = Math.ceil((viewW * 1.4) / (360 * s));
      for (let i = 0; i <= across; i++) {
        const pos = at(-0.2 + (i / across) * 1.4, y + (rand() - 0.5) * 50, z);
        cloud(B, ctx, pos, (300 + rand() * 120) * s, z, { kind: 'sea', flat: 0.3 });
      }
    }
  }

  const life = populateLife(B, { rand, at, k, sp, s, f, viewW, viewH, pageH, islands, seed });
  const events = populateEvents(B, { rand, at, k, sp, s, f, viewW, viewH, pageH });

  return {
    solid: new Float32Array(B.solid),
    solidCount: B.solid.length / SOLID_STRIDE,
    glow: new Float32Array(B.glow),
    glowCount: B.glow.length / GLOW_STRIDE,
    bodies: B.bodies,
    sun: sunPos,
    focal: f,
    viewW, viewH, pageH,
    islands,
    arches,
    life,
    events,
  };
};

// ------------------------------------------------------------------ camera ---

/** The camera, as the view draws with it. */
export interface SkyCamera { viewW: number; viewH: number; scrollY: number; offX: number; offY: number }

/** Where a world point lands in the window, in CSS pixels. */
export const toScreen = (scene: SkyScene, cam: SkyCamera, w: V3): [number, number] => {
  const sc = scene.focal / (scene.focal - w[2]);
  return [cam.viewW / 2 + (w[0] - cam.viewW / 2 - cam.offX) * sc + cam.offX, cam.viewH / 2 + (w[1] - cam.scrollY - cam.viewH / 2 - cam.offY) * sc + cam.offY];
};

/** The world point at depth `z` that lands on window point (`sx`, `sy`). */
export const fromScreen = (scene: SkyScene, cam: SkyCamera, sx: number, sy: number, z: number): V3 => {
  const sc = scene.focal / (scene.focal - z);
  return [(sx - cam.viewW / 2 - cam.offX) / sc + cam.viewW / 2 + cam.offX, (sy - cam.viewH / 2 - cam.offY) / sc + cam.scrollY + cam.viewH / 2 + cam.offY, z];
};

/** Where a free body (not attached, not driven) is at time `t`. */
export const centreAt = (b: Body, t: number): V3 => {
  if (b.drift) {
    const span = b.drift.max - b.drift.min;
    const x = b.drift.min + ((((b.pos[0] - b.drift.min + t * b.drift.vx) % span) + span) % span);
    return [x, b.pos[1], b.pos[2]];
  }
  if (b.bob) {
    const a = t * b.bob.rate + b.bob.phase;
    return [b.pos[0] + Math.sin(a * 0.7) * b.bob.amp * 0.4, b.pos[1] + Math.sin(a) * b.bob.amp, b.pos[2]];
  }
  return b.pos;
};

/** A point in an island's own frame, in the world, now. */
/**
 * If `p` is inside island `isl` (padded by `pad`), the nearest point just outside it,
 * over its top or out through its side; otherwise null. `c` and `rot` are where the
 * island is and how it's turned (posed, or as built).
 */
export const outOfIsland = (isl: Island, c: V3, rot: number[], p: V3, pad: number): V3 | null => {
  const d: V3 = [p[0] - c[0], p[1] - c[1], p[2] - c[2]];
  // Into the island's own frame (the rotation's transpose).
  const lx = rot[0] * d[0] + rot[3] * d[1] + rot[6] * d[2];
  const ly = rot[1] * d[0] + rot[4] * d[1] + rot[7] * d[2];
  const lz = rot[2] * d[0] + rot[5] * d[1] + rot[8] * d[2];
  const top = -isl.R * 0.08 - pad;
  if (ly < top || ly > isl.H + pad) return null;
  const radial = Math.hypot(lx, lz);
  if (radial > isl.R * 1.25 + pad) return null;
  const a = (Math.atan2(lz, lx) + Math.PI * 2) % (Math.PI * 2);
  const f = (a / (Math.PI * 2)) * 24;
  const i = Math.floor(f) % 24;
  const e = isl.edge[i] + (isl.edge[(i + 1) % 24] - isl.edge[i]) * (f - Math.floor(f));
  const t = Math.max(0, Math.min(1, ly / isl.H));
  const prof = isl.pillar ? (t < 0.85 ? 1 - 0.15 * t : 0.8725 * ((1 - t) / 0.15) ** 0.6) * 1.12 : (1 - t) ** 0.72 * (1 - 0.12 * t) * 1.08;
  const rr = e * prof + pad;
  if (radial > rr) return null;
  // Out by the shorter way: up over the top, or out through the side.
  let ox = lx, oy = ly, oz = lz;
  if (ly - top < rr - radial) oy = top;
  else { const k = rr / Math.max(radial, 1e-3); ox = lx * k; oz = lz * k; }
  return [c[0] + rot[0] * ox + rot[1] * oy + rot[2] * oz, c[1] + rot[3] * ox + rot[4] * oy + rot[5] * oz, c[2] + rot[6] * ox + rot[7] * oy + rot[8] * oz];
};

/** `p` moved out of any near island it's inside (padded by `pad`), skipping island `skip`. */
export const clearOfIslands = (scene: SkyScene, p: V3, pad: number, skip = -1): V3 => {
  let q = p;
  for (let i = 0; i < scene.islands.length; i++) {
    const isl = scene.islands[i];
    if (isl.far || i === skip) continue;
    const c = scene.centres?.[isl.body] ?? scene.bodies[isl.body].pos;
    if (Math.abs(q[2] - c[2]) > isl.R * 1.3 + pad || Math.abs(q[0] - c[0]) > isl.R * 1.3 + pad || Math.abs(q[1] - c[1] - isl.H * 0.4) > isl.H + pad) continue;
    const out = outOfIsland(isl, c, scene.rots?.[isl.body] ?? scene.bodies[isl.body].base, q, pad);
    if (out) q = out;
  }
  return q;
};

export const onIsland = (scene: SkyScene, isl: Island, local: V3): V3 => {
  const c = scene.centres?.[isl.body] ?? scene.bodies[isl.body].pos;
  const w = rotate(scene.rots?.[isl.body] ?? scene.bodies[isl.body].base, local);
  return [c[0] + w[0], c[1] + w[1], c[2] + w[2]];
};

/** A rotation (columns) with local +x along `fwd` and local -y as near `up` as it can be. */
export const frameAlong = (fwd: V3, up: V3 = [0, -1, 0]): number[] => {
  const x = norm(fwd);
  // Local y points down: away from `up`, square to the heading.
  const k = up[0] * x[0] + up[1] * x[1] + up[2] * x[2];
  let d: V3 = [x[0] * k - up[0], x[1] * k - up[1], x[2] * k - up[2]];
  if (Math.hypot(d[0], d[1], d[2]) < 1e-4) d = cross(x, [0, 0, 1]);
  const y = norm(d);
  // x × y = z keeps the frame right-handed.
  const z = cross(x, y);
  return [x[0], y[0], z[0], x[1], y[1], z[1], x[2], y[2], z[2]];
};

/**
 * Writes every body's transform at time `t` (seconds) into `out`: three rows of
 * a 3x4 matrix, a spare texel, and its state. Attached parts ride their
 * parents, which come first.
 */
export const poseBodies = (scene: SkyScene, t: number, out: Float32Array) => {
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
      c = centreAt(b, t);
      rot = b.spin ? mul3(b.base, rotY(b.spin0 + t * b.spin)) : b.base;
    }
    centres[i] = c;
    rots[i] = rot;
    const sc = b.scale ?? [1, 1, 1];
    const o = i * OBJ_TEXELS * 4;
    out[o] = rot[0] * sc[0]; out[o + 1] = rot[1] * sc[1]; out[o + 2] = rot[2] * sc[2]; out[o + 3] = c[0];
    out[o + 4] = rot[3] * sc[0]; out[o + 5] = rot[4] * sc[1]; out[o + 6] = rot[5] * sc[2]; out[o + 7] = c[1];
    out[o + 8] = rot[6] * sc[0]; out[o + 9] = rot[7] * sc[1]; out[o + 10] = rot[8] * sc[2]; out[o + 11] = c[2];
    out[o + 12] = 0; out[o + 13] = 0; out[o + 14] = 0; out[o + 15] = 0;
    const p = b.params;
    out[o + 16] = p ? p[0] : 0; out[o + 17] = p ? p[1] : 0; out[o + 18] = p ? p[2] : 0; out[o + 19] = p ? p[3] : 0;
  }
  scene.centres = centres;
  scene.rots = rots;
};

export { basisFor };
