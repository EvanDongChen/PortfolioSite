/**
 * The sauce bar: a wooden board of four dipping bowls in a column that slides
 * out from the middle of the window's left edge when its button is pressed.
 * Carry a piece of food over a bowl with the mouse and the chopsticks lower it
 * into the sauce; swish it about yourself to coat it. The sauce is thick: the
 * food drags through it, the sauce sloshes and ripples as it's pushed, and it
 * flings drops if you go at it hard. Lift it out coated and let go, and it's
 * carried off to be eaten.
 *
 * The board is part of the 3D scene, held above the broth (so it casts a
 * shadow on it) and placed each frame in window space, so it stays put while
 * the page scrolls under it.
 */

import { Builder, F, HotpotCamera, HotpotScene, INGREDIENTS, M, SPACING, V3, fbm, rotZ, slab } from './hotpot';
import type { Chopsticks, Item } from './hotpotLife';

/** The sauces, top to bottom, with what they're called and the colour they leave on food. */
export const SAUCES = [
  { name: 'Sesame paste', mat: () => M.sesame },
  { name: 'Chili oil', mat: () => M.chilioil },
  { name: 'Garlic & scallion', mat: () => M.garlic },
  { name: 'Black vinegar', mat: () => M.vinegar },
] as const;

/**
 * Where it sits in the window, in CSS px at full size: the board's left edge and size (centred down the window), and
 * each bowl's centre and radius on it. The bowls are sized like real dipping dishes beside the food in the pot.
 */
export const SAUCE_LAYOUT = {
  left: 24, w: 172, h: 640,
  bowls: [[86, 78], [86, 238], [86, 398], [86, 558]] as [number, number][],
  r: 66,
};
/** How much it's shrunk to fit a window `viewH` tall (1: full size). */
export const sauceScale = (viewH: number) => Math.max(0.55, Math.min(1, (viewH - 90) / SAUCE_LAYOUT.h));
/** The board's top edge in a window `viewH` tall. */
export const sauceTop = (viewH: number) => Math.round(viewH / 2 - (SAUCE_LAYOUT.h * sauceScale(viewH)) / 2);
/** How high above the broth the board is held. */
const HEIGHT = 70;
/** How far off the window's left edge it waits when it's put away. */
const AWAY = 260;
/** Only on windows wide enough for it to sit clear of the content. */
export const SAUCE_MIN_WIDTH = 1100;

export interface SauceBar {
  board: number;
  bowls: number[];
  /** The pool of sauce in each bowl, a body of its own so it can slosh. */
  pools: number[];
  /** 0 put away, 1 out. */
  open: number;
  target: number;
  /** The bowl the carried food is over, if any. */
  hover: number;
  /** Each bowl's scale, springing up while food hovers over it. */
  pop: number[];
  /** Each bowl's sauce surface centre in the world, as of this frame. */
  surface: V3[];
  /** Each pool's slosh: tilt (x, y) and its speed, and the height of the ripples running out from the food. */
  slosh: { tx: number; ty: number; vx: number; vy: number; wave: number }[];
  /** Where the carried food's lowest point should touch into the sauce, following the mouse (world). */
  dipAt: V3 | null;
  /** The last splash of drops flung out, so they don't come every frame. */
  lastFling: number;
  /** How much it was shrunk to fit the window it was built for. */
  scale: number;
}

const sauceSurface = (u: number, v: number, R: number, kind: number, seed: number) => {
  const r = Math.hypot(u, v) / R;
  const swirl = Math.sin(Math.atan2(v, u) * 2 + r * 9);
  const n = fbm(u * 0.25, v * 0.25, 0.5, seed, 3);
  switch (kind) {
    case 0: // Sesame paste: smooth and thick, with a drizzle of chili oil swirled through.
      return Math.abs(swirl) < 0.12 && r > 0.25 ? { mat: M.chilioil, alb: 0.6 } : { mat: M.sesame, alb: 0.5 + swirl * 0.1 };
    case 1: // Chili oil: red oil, flakes and sesame seeds.
      if (n > 0.66) return { mat: M.chili, alb: 0.45 };
      if (fbm(u * 0.32 + 13.1, v * 0.32 + 7.7, 1.5, seed + 5, 3) > 0.7) return { mat: M.sesame, alb: 0.85 };
      return { mat: M.chilioil, alb: 0.55 + (n - 0.5) * 0.4 };
    case 2: // Garlic and scallion in sesame oil.
      if (n > 0.64) return { mat: M.tofu, alb: 0.7 };
      if (fbm(u * 0.3 + 5.3, v * 0.3 + 2.9, 2.5, seed + 9, 3) > 0.66) return { mat: M.scallion, alb: 0.6 };
      return { mat: M.garlic, alb: 0.5 + (n - 0.5) * 0.3 };
    default: // Black vinegar, a few bits of garlic floating in it.
      if (n > 0.72) return { mat: M.tofu, alb: 0.6 };
      return { mat: M.vinegar, alb: 0.5 + swirl * 0.15 };
  }
};

/** A porcelain dipping bowl, its centre at the origin: a blue-banded rim round a deep well (the sauce is its own body). */
const buildBowl = (B: Builder, obj: number, R: number, s: number) => {
  slab(B, obj, R, R, SPACING * 0.75, (u, v) => {
    const r = Math.hypot(u, v) / R;
    if (r > 1) return null;
    // The well under the sauce, dark so nothing pale shows if the sauce parts as it sloshes.
    if (r < 0.76) return { h: -9 * s, mat: M.vinegar, alb: 0.3 };
    const lip = 1 - ((r - 0.88) / 0.12) ** 2;
    return { h: 4 * s * Math.max(0, lip), mat: r > 0.9 && r < 0.95 ? M.glaze : M.porcelain, alb: 0.6 };
  }, -12 * s, F.gloss);
};

/** The pool of sauce in a bowl: a disc that sloshes and ripples (F.slosh). */
const buildPool = (B: Builder, obj: number, R: number, kind: number, rand: () => number) => {
  const seed = Math.floor(rand() * 1e5);
  // Packed tight, so it stays whole as it tilts and ripples.
  slab(B, obj, R, R, SPACING * 0.55, (u, v) => {
    if (Math.hypot(u, v) > R) return null;
    return { h: 0, ...sauceSurface(u, v, R, kind, seed) };
  }, 0, F.gloss | F.slosh);
};

const PARKED: V3 = [-1e5, -1e5, -2e4];

export const populateSauce = (B: Builder, ctx: { rand: () => number; s: number; f: number; viewH: number }): SauceBar => {
  const { rand, s, f } = ctx;
  const scale = sauceScale(ctx.viewH);
  // Built at the size it should look from its height, shrunk to fit the window.
  const k = ((f - HEIGHT * s) / f) * scale;
  const L = SAUCE_LAYOUT;
  const board = B.body({ kind: 'sauce', pos: PARKED });
  slab(B, board, (L.w / 2) * k, (L.h / 2) * k, SPACING, (u, v) => {
    const plank = Math.floor((u / k + L.w / 2) / 28);
    const grain = fbm(u * 0.4, v * 0.05, plank, 31, 3);
    const edge = Math.max(Math.abs(u) / ((L.w / 2) * k), Math.abs(v) / ((L.h / 2) * k));
    return { h: -14 * s - (edge > 0.95 ? (edge - 0.95) * 60 * s : 0), mat: M.wood, alb: 0.45 + (grain - 0.5) * 0.5 - ((u / k + L.w / 2) % 28 < 1.5 ? 0.2 : 0) };
  }, -24 * s);
  const bowls: number[] = [], pools: number[] = [];
  SAUCES.forEach((_, i) => {
    const b = B.body({ kind: 'sauce', pos: PARKED });
    buildBowl(B, b, L.r * k, s);
    bowls.push(b);
    const p = B.body({ kind: 'sauce', pos: PARKED, params: [0, 0, 0, 0] });
    buildPool(B, p, L.r * k * 0.76, i, rand);
    pools.push(p);
  });
  return {
    board, bowls, pools, open: 0, target: 0, hover: -1, pop: [1, 1, 1, 1],
    surface: bowls.map(() => PARKED), slosh: bowls.map(() => ({ tx: 0, ty: 0, vx: 0, vy: 0, wave: 0 })),
    dipAt: null, lastFling: 0, scale,
  };
};

/** The world point that shows at window point (sx, sy) at height z (as the view projects it). */
const fromScreen = (scene: HotpotScene, cam: HotpotCamera, sx: number, sy: number, z: number): V3 => {
  const sc = scene.focal / (scene.focal - z);
  return [(sx - cam.viewW / 2 - cam.offX) / sc + cam.viewW / 2 + cam.offX, (sy - cam.viewH / 2 - cam.offY) / sc + cam.scrollY + cam.viewH / 2 + cam.offY, z];
};

/** The bowl under window point (sx, sy), if the bar is out: -1 if none. */
export const bowlAt = (scene: HotpotScene, cam: HotpotCamera, sx: number, sy: number) => {
  if (scene.sauce.open < 0.9) return -1;
  const L = SAUCE_LAYOUT;
  const top = sauceTop(cam.viewH);
  const q = scene.sauce.scale;
  return L.bowls.findIndex(([bx, by]) => Math.hypot(sx - (L.left + bx * q), sy - (top + by * q)) < L.r * q * 1.1);
};

/** Pieces too long to lie in a bowl are dipped end first. */
export const isLong = (it: Item) => it.R > 26 * 1.1 || INGREDIENTS[it.kind].aspect < 0.7;
/** How steeply a long piece is tipped as it's dipped. */
export const DIP_PITCH = 0.95;

/**
 * One frame of the bar: sliding out or away, held in place in the window; and, while food is carried over a bowl,
 * where it should sit in the sauce, how the sauce sloshes and ripples round it, and how much it picks up.
 */
export const stepSauce = (scene: HotpotScene, dt: number, t: number, cam: HotpotCamera, pointer: { x: number; y: number } | null) => {
  const S = scene.sauce;
  const life = scene.life;
  const s = scene.s;
  const target = cam.viewW >= SAUCE_MIN_WIDTH ? S.target : 0;
  S.open += Math.sign(target - S.open) * Math.min(Math.abs(target - S.open), dt / 0.45);
  const hidden = S.open <= 0.001 && target === 0;
  // Where the board reaches across the window, for food shaken loose over it.
  life.sauceBoard = S.open > 0.01 ? SAUCE_LAYOUT.left + SAUCE_LAYOUT.w * S.scale + 30 : 0;
  const e = 1 - (1 - S.open) ** 3;
  const L = SAUCE_LAYOUT;
  const z = HEIGHT * s;
  const top = sauceTop(cam.viewH);
  const q = S.scale;
  const slide = -AWAY * (1 - e);
  scene.bodies[S.board].live = { c: hidden ? PARKED : fromScreen(scene, cam, L.left + (L.w / 2) * q + slide, top + (L.h / 2) * q, z), rot: rotZ(0) };

  // The food being carried, and the bowl (if any) it's over.
  const d = life.drag;
  const carried = d && d.pair.state === 'carry' ? d.item : null;
  S.hover = carried && pointer ? bowlAt(scene, cam, pointer.x, pointer.y) : -1;
  S.dipAt = null;
  const R = L.r * q * ((scene.focal - z) / scene.focal) * 0.76;

  S.bowls.forEach((bi, i) => {
    const [bx, by] = L.bowls[i];
    const c = fromScreen(scene, cam, L.left + bx * q + slide, top + by * q, z);
    S.pop[i] += ((S.hover === i ? 1.08 : 1) - S.pop[i]) * Math.min(1, dt * 14);
    const b = scene.bodies[bi];
    b.live = { c: hidden ? PARKED : c, rot: rotZ(0) };
    b.scale = [S.pop[i], S.pop[i], S.pop[i]];
    const surface: V3 = [c[0], c[1], c[2] - 2 * s];
    S.surface[i] = surface;

    // The sauce: a tilt that springs back (sloshing to and fro) and ripples that die away.
    const sl = S.slosh[i];
    if (S.hover === i && carried && pointer && d) {
      // Where the mouse is, at the sauce's height, kept inside the bowl: the food pushes against its side.
      // A long piece is dipped end first, tipped up out of the bowl to the right, so its end stays in the left part.
      let at = fromScreen(scene, cam, pointer.x, pointer.y, surface[2]);
      const long = isLong(carried);
      const lim = long ? R * 0.55 : Math.max(0, R * 0.92 - carried.R);
      const cx = long ? c[0] - R * 0.3 : c[0];
      const ox = at[0] - cx, oy = at[1] - c[1], od = Math.hypot(ox, oy);
      if (od > lim) at = [cx + (od ? (ox / od) * lim : 0), c[1] + (od ? (oy / od) * lim : 0), at[2]];
      S.dipAt = at;
      // Pushing through it: the sauce heaps up ahead and sloshes back, ripples run out, drops fly if it's hard.
      const speed = Math.hypot(d.vx, d.vy);
      // In the sauce when its lowest point is: the dipped end of a long piece, the bottom of a small one.
      const deep = long ? carried.fz - carried.R * Math.sin(DIP_PITCH) < surface[2] + 2 * s : carried.fz < surface[2] + carried.R * 0.5;
      if (deep) {
        // The sauce heaps up the way it's pushed.
        sl.vx += (d.vx / R) * dt * 2.8;
        sl.vy += (d.vy / R) * dt * 2.8;
        sl.wave = Math.min(2.6 * s, sl.wave + speed * dt * 0.03);
        // Coating: a little just for being in it, much more for swishing it about.
        const mat = SAUCES[i].mat();
        const had = carried.coat && carried.coat[0] === mat ? carried.coat[1] : (carried.coat?.[1] ?? 0) * 0.4;
        // Never all over: some of the food always shows through.
        carried.coat = [mat, Math.min(0.55, had + dt * 0.04 + speed * dt * 0.0016)];
        if (speed > 150 * s && t - S.lastFling > 0.3) {
          S.lastFling = t;
          flingDrops(scene, surface, d.vx, d.vy);
        }
      }
    }
    // Springs: the tilt swings back past level and settles; the ripples fade.
    sl.vx += (-sl.tx * 90 - sl.vx * 4) * dt; sl.tx += sl.vx * dt;
    sl.vy += (-sl.ty * 90 - sl.vy * 4) * dt; sl.ty += sl.vy * dt;
    sl.tx = Math.max(-0.2, Math.min(0.2, sl.tx)); sl.ty = Math.max(-0.2, Math.min(0.2, sl.ty));
    sl.wave *= Math.exp(-dt * 1.6);
    const pool = scene.bodies[S.pools[i]];
    pool.live = { c: hidden ? PARKED : surface, rot: rotZ(0) };
    pool.scale = [S.pop[i], S.pop[i], 1];
    pool.params = [sl.tx, sl.ty, sl.wave, S.dipAt && S.hover === i ? 1 : 0];
    // Where the ripples spread from: the food, in the pool's own frame.
    pool.coat = S.dipAt && S.hover === i ? [S.dipAt[0] - surface[0], S.dipAt[1] - surface[1]] : [0, 0];
  });
};

/** Let go of food that's been dipped: it's carried off to be eaten (true). Anything not sauced yet is left to drop. */
export const eatIfDipped = (it: Item, p: Chopsticks) => {
  if (!it.coat || it.coat[1] < 0.15) return false;
  p.state = 'away'; p.t = 0; p.from = [...p.tip] as V3;
  return true;
};

/** Drops of sauce flung out of a bowl the way the food was going. */
const flingDrops = (scene: HotpotScene, at: V3, vx: number, vy: number) => {
  const life = scene.life;
  const sp = life.splashes.reduce((a, b) => (a.t0 < b.t0 ? a : b));
  sp.t0 = life.time;
  const b = scene.bodies[sp.body];
  b.live = { c: [at[0], at[1], at[2]], rot: rotZ(Math.atan2(vy, vx) - Math.PI / 2) };
  b.params = [0, 0, 1, life.time];
};
