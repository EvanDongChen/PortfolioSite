/**
 * The sauce bar: a wooden board of four dipping bowls that slides out at the
 * bottom left of the window when its button is pressed. Carry a piece of food
 * over a bowl with the mouse and let go, and the chopsticks dunk it, bring it
 * up coated in that sauce, and carry it off to be eaten.
 *
 * The board is part of the 3D scene, held above the broth (so it casts a
 * shadow on it) and placed each frame in window space, so it stays put while
 * the page scrolls under it.
 */

import { Builder, F, HotpotCamera, HotpotScene, M, SPACING, V3, fbm, rotZ, slab } from './hotpot';
import type { Chopsticks, Item } from './hotpotLife';

/** The sauces, left to right and top to bottom, with what they're called and the colour they leave on food. */
export const SAUCES = [
  { name: 'Sesame paste', mat: () => M.sesame },
  { name: 'Chili oil', mat: () => M.chilioil },
  { name: 'Garlic & scallion', mat: () => M.garlic },
  { name: 'Black vinegar', mat: () => M.vinegar },
] as const;

/** Where it sits in the window, in CSS px from the bottom left: the board, and each bowl's centre and radius. */
export const SAUCE_LAYOUT = {
  left: 24, bottom: 100, w: 176, h: 176,
  bowls: [[48, 48], [128, 48], [48, 128], [128, 128]] as [number, number][],
  r: 34,
};
/** How high above the broth the board is held. */
const HEIGHT = 70;
/** How far off the window's left edge it waits when it's put away. */
const AWAY = 260;
/** Only on windows wide enough for it to sit clear of the content. */
export const SAUCE_MIN_WIDTH = 1100;

export interface SauceBar {
  board: number;
  bowls: number[];
  /** 0 put away, 1 out. */
  open: number;
  target: number;
  /** The bowl the carried food is over, if any. */
  hover: number;
  /** Each bowl's scale, springing up while food hovers over it. */
  pop: number[];
  /** Each bowl's sauce surface in the world, as of this frame. */
  surface: V3[];
  /** Board size in world units (it's built for its height above the broth). */
  k: number;
}

const sauceTop = (u: number, v: number, R: number, kind: number, seed: number) => {
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

/** A porcelain dipping bowl, its centre at the origin: a blue-banded rim round a pool of sauce. */
const buildBowl = (B: Builder, obj: number, R: number, kind: number, s: number, rand: () => number) => {
  const seed = Math.floor(rand() * 1e5);
  const sp = SPACING * 0.75;
  slab(B, obj, R, R, sp, (u, v) => {
    const r = Math.hypot(u, v) / R;
    if (r > 1) return null;
    if (r < 0.76) return { h: -2 * s, ...sauceTop(u, v, R, kind, seed) };
    // The rim: rounded, with a blue band round it.
    const lip = 1 - ((r - 0.88) / 0.12) ** 2;
    return { h: 4 * s * Math.max(0, lip), mat: r > 0.9 && r < 0.95 ? M.glaze : M.porcelain, alb: 0.6 };
  }, -12 * s, F.gloss);
};

export const populateSauce = (B: Builder, ctx: { rand: () => number; s: number; f: number }): SauceBar => {
  const { rand, s, f } = ctx;
  // Built at the size it should look from its height.
  const k = (f - HEIGHT * s) / f;
  const L = SAUCE_LAYOUT;
  const board = B.body({ kind: 'sauce', pos: [-1e5, -1e5, -2e4] });
  slab(B, board, (L.w / 2) * k, (L.h / 2) * k, SPACING, (u, v) => {
    const plank = Math.floor((v / k + L.h / 2) / 22);
    const grain = fbm(u * 0.05, v * 0.4, plank, 31, 3);
    const edge = Math.max(Math.abs(u) / ((L.w / 2) * k), Math.abs(v) / ((L.h / 2) * k));
    return { h: -14 * s - (edge > 0.94 ? (edge - 0.94) * 60 * s : 0), mat: M.wood, alb: 0.45 + (grain - 0.5) * 0.5 - ((v / k + L.h / 2) % 22 < 1.5 ? 0.2 : 0) };
  }, -24 * s);
  const bowls = SAUCES.map((_, i) => {
    const b = B.body({ kind: 'sauce', pos: [-1e5, -1e5, -2e4] });
    buildBowl(B, b, L.r * k, i, s, rand);
    return b;
  });
  return { board, bowls, open: 0, target: 0, hover: -1, pop: [1, 1, 1, 1], surface: bowls.map(() => [-1e5, -1e5, -2e4] as V3), k };
};

/** The world point that shows at window point (sx, sy) at height z (as the view projects it). */
const fromScreen = (scene: HotpotScene, cam: HotpotCamera, sx: number, sy: number, z: number): V3 => {
  const sc = scene.focal / (scene.focal - z);
  return [(sx - cam.viewW / 2 - cam.offX) / sc + cam.viewW / 2 + cam.offX, (sy - cam.viewH / 2 - cam.offY) / sc + cam.scrollY + cam.viewH / 2 + cam.offY, z];
};

/** The bowl under window point (sx, sy), if the bar is out: -1 if none. */
export const bowlAt = (scene: HotpotScene, cam: HotpotCamera, sx: number, sy: number) => {
  const S = scene.sauce;
  if (S.open < 0.9) return -1;
  const L = SAUCE_LAYOUT;
  const top = cam.viewH - L.bottom - L.h;
  return L.bowls.findIndex(([bx, by]) => Math.hypot(sx - (L.left + bx), sy - (top + by)) < L.r * 1.15);
};

/** Food carried over a bowl and let go: the chopsticks dunk it there. False if it wasn't over one. */
export const dipInto = (scene: HotpotScene, cam: HotpotCamera, sx: number, sy: number, it: Item, p: Chopsticks) => {
  const bowl = bowlAt(scene, cam, sx, sy);
  if (bowl < 0) return false;
  p.state = 'dip'; p.t = 0; p.dipBowl = bowl; p.from = [...p.tip] as V3;
  void it;
  return true;
};

/** One frame of the bar: sliding out or away, held in place in the window, a bowl lifting under carried food. */
export const stepSauce = (scene: HotpotScene, dt: number, cam: HotpotCamera, pointer: { x: number; y: number } | null) => {
  const S = scene.sauce;
  const s = scene.s;
  const target = cam.viewW >= SAUCE_MIN_WIDTH ? S.target : 0;
  S.open += Math.sign(target - S.open) * Math.min(Math.abs(target - S.open), dt / 0.45);
  const hidden = S.open <= 0.001 && target === 0;
  const e = 1 - (1 - S.open) ** 3;
  const L = SAUCE_LAYOUT;
  const z = HEIGHT * s;
  const top = cam.viewH - L.bottom - L.h;
  const slide = -AWAY * (1 - e);
  const park: V3 = [-1e5, -1e5, -2e4];
  const board = scene.bodies[S.board];
  board.live = { c: hidden ? park : fromScreen(scene, cam, L.left + L.w / 2 + slide, top + L.h / 2, z), rot: rotZ(0) };
  S.hover = scene.life.drag && pointer ? bowlAt(scene, cam, pointer.x, pointer.y) : -1;
  S.bowls.forEach((bi, i) => {
    const [bx, by] = L.bowls[i];
    const c = fromScreen(scene, cam, L.left + bx + slide, top + by, z);
    S.pop[i] += ((S.hover === i ? 1.14 : 1) - S.pop[i]) * Math.min(1, dt * 14);
    const b = scene.bodies[bi];
    b.live = { c: hidden ? park : c, rot: rotZ(0) };
    b.scale = [S.pop[i], S.pop[i], S.pop[i]];
    S.surface[i] = [c[0], c[1], c[2] - 2 * s];
  });
};
