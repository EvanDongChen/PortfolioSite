/**
 * What happens in the pot: ingredients drift on the boil's currents, bob,
 * jostle and cook (beef browns from the edges in and curls, shrimp turn pink,
 * tofu soaks up the chili oil, dumplings and fish balls rise once done);
 * chopsticks come down for whatever is cooked and carry it off, and fresh
 * ingredients are dropped back in with a splash. The cursor stirs the broth.
 *
 * Runs on the main thread every frame (`stepLife`), writing each body's pose.
 */

import {
  Body, Builder, Clear, G, HotpotCamera, HotpotScene, INGREDIENTS, Ingredient, Plume, V3, Wall,
  IDENTITY, buildChopstick, buildIngredient, frameAlong, mul3, norm, rotAxis, rotZ, wallDist,
} from './hotpot';

export type Side = -1 | 1; // -1: the mala, 1: the bone broth

export interface Item {
  body: number;
  kind: Ingredient;
  side: Side;
  R: number;
  x: number; y: number; z: number;
  vx: number; vy: number;
  ang: number; spin: number; phase: number;
  /** 0 raw, 1 done; it keeps going past 1. */
  cook: number;
  state: 'float' | 'held' | 'gone' | 'falling';
  /** Height while falling, and its speed. */
  fz: number; vz: number;
  /** A dip after a splash, as a spring. */
  bump: number; vb: number;
  /** A tilt knocked in by a bubble, as a spring. */
  tx: number; ty: number; vtx: number; vty: number;
  /** How a meatball has rolled. */
  roll: number[];
  /** Rice cakes stuck to this one. */
  stuck: Item[];
  /** A meatball that has come up. */
  popped: boolean;
  /** How hot the broth is where it is, as of this frame. */
  heat: number;
}

export interface Chopsticks {
  a: number; b: number;
  state: 'idle' | 'down' | 'pinch' | 'lift';
  t: number;
  item: Item | null;
  /** Up the sticks, from the tips towards the hand that isn't there. */
  dir: V3;
  tip: V3;
  gap: number;
  from: V3;
  /** Seconds to come down: quicker when someone asked for it. */
  dur: number;
}

export interface Ripple { x: number; y: number; t0: number; a: number }

/** A big bubble coming up beside something; when it pops, it knocks it about. */
export interface Bubble { x: number; y: number; t0: number; r: number; popped: boolean }
/** Seconds a bubble grows before it pops. */
export const BUBBLE_GROW = 0.9;

export interface HotpotLife {
  items: Item[];
  sticks: Chopsticks[];
  splashes: { body: number; t0: number }[];
  ripples: Ripple[];
  bubbles: Bubble[];
  drops: { item: Item; at: number }[];
  time: number;
  /** Boil strength; a rolling boil raises it for a while. */
  boil: number;
  boilUntil: number;
  nextPluck: number;
  /** Let the next pluck take anything half cooked (the debug panel). */
  eager: boolean;
  lastPointer: { x: number; y: number; t: number } | null;
  wall: Wall;
  plumes: Plume[];
  clear: Clear[];
  s: number;
  viewW: number;
  pageH: number;
  stickLen: number;
  /** A whirlpool the ladle left: centre, strength 0..1 and size (see hotpotEvents). */
  vortex: { x: number; y: number; k: number; R: number } | null;
  frame: number;
}

/** What each broth is stocked with, and how often (relative). */
const STOCK: Record<Side, [Ingredient, number][]> = {
  [-1]: [['beef', 5], ['tofu', 2], ['fishball', 2], ['woodear', 2], ['lotus', 2], ['enoki', 3], ['bokchoy', 2], ['shrimp', 1], ['egg', 1],
    ['tripe', 3], ['puff', 3], ['meatball', 2], ['noodles', 2], ['squid', 1], ['fish', 2], ['napa', 1], ['quail', 1]],
  [1]: [['dumpling', 3], ['shrimp', 3], ['beef', 2], ['quail', 2], ['corn', 2], ['shiitake', 2], ['fishball', 2], ['bokchoy', 2], ['woodear', 1], ['lotus', 1], ['tofu', 1],
    ['fish', 3], ['ricecake', 4], ['crab', 3], ['squid', 2], ['napa', 2], ['noodles', 1], ['meatball', 2]],
};
const GARNISH: Record<Side, [Ingredient, number][]> = {
  [-1]: [['chili', 6], ['pepper', 3], ['anise', 1]],
  [1]: [['goji', 4], ['scallion', 5], ['anise', 1]],
};
const pick = (list: [Ingredient, number][], rand: () => number) => {
  let total = 0;
  for (const [, w] of list) total += w;
  let r = rand() * total;
  for (const [k, w] of list) { r -= w; if (r <= 0) return k; }
  return list[0][0];
};

const PARKED: V3 = [-1e5, -1e5, -2e4];
/** Seconds a vegetable sits in the pot before it counts as done. */
const VEG_DONE = 32;

interface Ctx {
  rand: () => number;
  s: number;
  f: number;
  viewW: number;
  viewH: number;
  pageH: number;
  wall: Wall;
  plumes: Plume[];
  clear: Clear[];
}

const inClear = (clear: Clear[], x: number, y: number, pad: number) =>
  clear.some(c => x > c.x - pad && x < c.x + c.w + pad && y > c.y - pad && y < c.y + c.h + pad);

/** Stocks the pot: ingredients spread over the whole page on both sides of the divider, garnish thick between them. */
export const populateLife = (B: Builder, ctx: Ctx): HotpotLife => {
  const { rand, s, viewW, pageH, wall } = ctx;
  const items: Item[] = [];
  const place = (kind: Ingredient, side: Side, x: number, y: number) => {
    const R = INGREDIENTS[kind].r * s;
    const body = B.body({ kind, pos: [x, y, 0], radius: R });
    buildIngredient(B, body, kind, s, rand);
    const it: Item = {
      body, kind, side, R, x, y, z: 0, vx: 0, vy: 0,
      ang: rand() * Math.PI * 2, spin: (rand() - 0.5) * 0.3, phase: rand() * 10,
      // Some already done, some just in.
      cook: rand() * 1.3,
      state: 'float', fz: 0, vz: 0, bump: 0, vb: 0,
      tx: 0, ty: 0, vtx: 0, vty: 0, roll: IDENTITY, stuck: [], popped: false, heat: 0.5,
    };
    items.push(it);
    poseItem(B.bodies[body], it, 0, 0.5, s);
  };
  const scatter = (count: number, table: Record<Side, [Ingredient, number][]>, room: number) => {
    for (let i = 0; i < count; i++) {
      for (let tries = 0; tries < 12; tries++) {
        // The cards cover the middle, so the margins get more than their share.
        const g = rand();
        const x = g < 0.5 ? (g < 0.25 ? rand() * 0.2 : 0.8 + rand() * 0.2) * viewW : rand() * viewW;
        const y = rand() * pageH;
        const d = wallDist(wall, x, y);
        if (Math.abs(d) < wall.half + room) continue;
        if (inClear(ctx.clear, x, y, room)) continue;
        const side: Side = d < 0 ? -1 : 1;
        place(pick(table[side], rand), side, x, y);
        break;
      }
    }
  };
  const area = viewW * pageH;
  scatter(Math.round(area / (205 * 205 * s * s)), STOCK, 40 * s);
  scatter(Math.round(area / (190 * 190 * s * s)), GARNISH, 12 * s);
  // Big things first in the list, so garnish gets pushed out of their way rather than the other way round.
  items.sort((a, b) => b.R - a.R);

  const stickLen = 360 * s;
  const sticks: Chopsticks[] = [];
  for (let i = 0; i < 3; i++) {
    const a = B.body({ kind: 'chopstick', pos: PARKED });
    buildChopstick(B, a, stickLen, s);
    const b = B.body({ kind: 'chopstick', pos: PARKED });
    buildChopstick(B, b, stickLen, s);
    sticks.push({ a, b, state: 'idle', t: 0, item: null, dir: [0, 0, 1], tip: PARKED, gap: 0, from: PARKED, dur: 1.4 });
  }

  // Splashes: droplets thrown out and back down where something lands.
  const splashes: { body: number; t0: number }[] = [];
  for (let i = 0; i < 4; i++) {
    const body = B.body({ kind: 'splash', pos: PARKED, params: [0, 0, 0, -99] });
    for (let k = 0; k < 26; k++) B.glowAt([0, 0, 0], (3 + rand() * 4) * s, [0.55, 0.42, 0.3], body, G.splash, rand(), (40 + rand() * 50) * s);
    splashes.push({ body, t0: -99 });
  }

  ctx.plumes.sort((a, b) => a[1] - b[1]);
  return {
    items, sticks, splashes, ripples: [], bubbles: [], drops: [], time: 0, boil: 1, boilUntil: -1,
    nextPluck: 3.5, eager: false, lastPointer: null,
    wall, plumes: ctx.plumes, clear: ctx.clear, s, viewW, pageH, stickLen, vortex: null, frame: 0,
  };
};

/**
 * How far below the surface an item's centre sits. Meat, seafood, dumplings and the like go in under the broth and rise
 * as they cook, breaking the surface when they're about done; meatballs stay down until done, then come up all at once.
 */
const sinkOf = (it: Item) => {
  const g = INGREDIENTS[it.kind];
  // A tofu puff soaks up broth and settles lower.
  if (it.kind === 'puff') return g.sink + Math.min(1, it.cook) * 8;
  if (g.rawSink === undefined) return g.sink;
  const u = it.kind === 'meatball' ? Math.min(1, Math.max(0, (it.cook - 1) / 0.06)) : Math.min(1, Math.max(0, (it.cook - 0.2) / 0.75));
  return g.rawSink + (g.sink - g.rawSink) * u * u * (3 - 2 * u);
};

/** The cook state the shader sees: tofu and eggs only take colour from the chili oil. */
const shownCook = (it: Item) => {
  // Lotus root and corn slowly take on the chili oil's red the longer they sit in it.
  if (it.kind === 'lotus' || it.kind === 'corn') return it.side < 0 ? Math.min(1, it.cook * 0.45) : 0;
  if (!INGREDIENTS[it.kind].cook) return 0;
  if ((it.kind === 'tofu' || it.kind === 'egg' || it.kind === 'quail') && it.side === 1) return 0;
  return Math.min(1, it.cook);
};

/** How far gone it is, 0..1, for the things that change when left in too long; and for a few, how far along a change of shape is. */
const overOf = (it: Item) => {
  switch (it.kind) {
    case 'beef': case 'bokchoy': case 'enoki': case 'fish':
      return Math.min(1, Math.max(0, (it.cook - 1.7) / 0.9));
    // The shell cracks and falls away part-way through.
    case 'quail': return Math.min(1, Math.max(0, (it.cook - 0.45) / 0.45));
    // The crab stick loosens into ribbons as it heats.
    case 'crab': return Math.min(1, Math.max(0, (it.cook - 0.3) / 0.8));
    default: return 0;
  }
};

/** rotX(a) · rotY(b) · rotZ(c), in one go (this runs for every ingredient every frame). */
const tiltXY = (a: number, b: number, c: number) => {
  const ca = Math.cos(a), sa = Math.sin(a), cb = Math.cos(b), sb = Math.sin(b), cc = Math.cos(c), sc = Math.sin(c);
  return [
    cb * cc, -cb * sc, sb,
    sa * sb * cc + ca * sc, -sa * sb * sc + ca * cc, -sa * cb,
    -ca * sb * cc + sa * sc, ca * sb * sc + sa * cc, ca * cb,
  ];
};

const poseItem = (b: Body, it: Item, t: number, heat: number, s: number) => {
  const wob = 0.06 + heat * 0.06;
  const ax = Math.sin(t * 1.3 + it.phase) * wob + it.tx, ay = Math.cos(t * 1.1 + it.phase * 1.7) * wob + it.ty;
  const cook = shownCook(it);
  let z: number;
  if (it.state === 'falling' || it.state === 'held') z = it.fz;
  else z = -sinkOf(it) * s + Math.sin(t * 1.7 + it.phase) * 1.2 * heat + it.bump;
  it.z = z;
  b.live = { c: [it.x, it.y, z], rot: it.kind === 'meatball' ? mul3(tiltXY(ax, ay, 0), it.roll) : tiltXY(ax, ay, it.ang) };
  const over = overOf(it);
  const done = Math.min(1, it.cook);
  // Beef and squid curl as they cook; greens and napa droop as they wilt.
  let curl = 0;
  if (it.kind === 'beef') curl = (done * 0.32) / it.R;
  else if (it.kind === 'squid') curl = (done * 0.6) / it.R;
  else if (it.kind === 'napa') curl = (-done * 0.3) / it.R;
  else if (it.kind === 'bokchoy' || it.kind === 'enoki') curl = (-over * 0.4) / it.R;
  // Fish balls puff up; overcooked beef shrinks; glass noodles pulse like a jellyfish.
  if (it.kind === 'fishball') { const p = 1 + done * 0.14; b.scale = [p, p, p]; }
  else if (it.kind === 'beef') { const p = 1 - over * 0.16; b.scale = [p, p, 1]; }
  else if (it.kind === 'noodles') { const p = Math.sin(t * 1.9 + it.phase) * 0.07; b.scale = [1 + p, 1 - p, 1]; }
  b.params = [curl, over, cook, it.phase];
};

/** The boil's currents at (x, y): out from each plume and turning a little, plus a slow wander. Also how hot it is there. */
export const flowAt = (life: HotpotLife, x: number, y: number, t: number, out: { vx: number; vy: number; heat: number }) => {
  const sig = 120 * life.s;
  let vx = 0, vy = 0, heat = 0.25;
  const plumes = life.plumes;
  // The first plume within reach above, by bisection (they're sorted by y).
  let lo = 0, hi = plumes.length;
  while (lo < hi) { const mid = (lo + hi) >> 1; if (plumes[mid][1] < y - sig * 3) lo = mid + 1; else hi = mid; }
  for (let i = lo; i < plumes.length; i++) {
    const [px, py, st] = plumes[i];
    const dy = y - py;
    if (dy < -sig * 3) break;
    const dx = x - px;
    if (dx > sig * 3 || dx < -sig * 3) continue;
    const g = Math.exp(-(dx * dx + dy * dy) / (sig * sig)) * st * (0.75 + 0.25 * Math.sin(t * 0.7 + px * 0.01));
    vx += (dx / sig) * g * 34 - (dy / sig) * g * 12;
    vy += (dy / sig) * g * 34 + (dx / sig) * g * 12;
    heat += g;
  }
  const w = 22 * life.s;
  vx += Math.sin(y * 0.0123 + t * 0.11) * Math.cos(x * 0.0071 - t * 0.07) * w;
  vy += Math.sin(x * 0.0109 - t * 0.09) * Math.cos(y * 0.0083 + t * 0.13) * w;
  out.vx = vx * life.boil;
  out.vy = vy * life.boil;
  out.heat = Math.min(1.4, heat) * life.boil;
  // Round and round the ladle's whirlpool, drawn a little in towards its middle.
  const vt = life.vortex;
  if (vt && vt.k > 0.01) {
    const dx = x - vt.x, dy = y - vt.y;
    const d = Math.hypot(dx, dy) + 1;
    const u = d / vt.R;
    const sp = vt.k * 120 * life.s * u * Math.exp(1 - u);
    out.vx += (-dy / d) * sp - (dx / d) * sp * 0.15;
    out.vy += (dx / d) * sp - (dy / d) * sp * 0.15;
  }
};

const ease = (u: number) => 1 - (1 - u) ** 3;
const easeIn = (u: number) => u * u;

/** Adds a ring to the broth. */
export const addRipple = (life: HotpotLife, x: number, y: number, a: number) => {
  life.ripples.push({ x, y, t0: life.time, a });
  if (life.ripples.length > 12) life.ripples.shift();
};

export const splashAt = (scene: HotpotScene, x: number, y: number) => {
  const life = scene.life;
  const sp = life.splashes.reduce((a, b) => (a.t0 < b.t0 ? a : b));
  sp.t0 = life.time;
  const b = scene.bodies[sp.body];
  b.live = { c: [x, y, 0], rot: rotZ(Math.random() * 6) };
  b.params = [0, 0, 1, life.time];
  addRipple(life, x, y, 1);
};

/** How far `it` reaches from its centre along direction (nx, ny), from its length, width and which way it's turned. */
const reach = (it: Item, nx: number, ny: number) => {
  const th = Math.atan2(ny, nx) - it.ang;
  const a = INGREDIENTS[it.kind].aspect;
  return it.R * Math.hypot(Math.cos(th), a * Math.sin(th));
};

/** Pushes `it` out of the divider, back onto its own side, and stops it moving into it. */
const keepOffWall = (life: HotpotLife, it: Item) => {
  const w = life.wall;
  const slope = w.amp * w.k * Math.cos((it.y - w.y0) * w.k);
  const inv = 1 / Math.sqrt(1 + slope * slope);
  // The wall's normal, pointing to the bone broth's side.
  const nx = inv, ny = -slope * inv;
  const need = w.half + 2 * life.s + reach(it, nx, ny);
  const d = it.side * wallDist(w, it.x, it.y);
  if (d >= need) return;
  it.x += nx * it.side * (need - d);
  it.y += ny * it.side * (need - d);
  const into = (it.vx * nx + it.vy * ny) * it.side;
  if (into < 0) { it.vx -= nx * it.side * into; it.vy -= ny * it.side * into; }
};

/** Is page point (x, y) somewhere a visitor can see, clear of the middle column the cards cover? */
const inGutter = (life: HotpotLife, x: number) => x < life.viewW * 0.2 || x > life.viewW * 0.8;

/** Drops `it` back into the pot, raw, somewhere in view on its own side of the divider. */
const dropIn = (scene: HotpotScene, it: Item, cam: HotpotCamera) => {
  const life = scene.life;
  for (let tries = 0; tries < 40; tries++) {
    const gutter = tries < 25 && Math.random() < 0.7;
    const x = gutter
      ? (Math.random() < 0.5 ? Math.random() * 0.2 : 0.8 + Math.random() * 0.2) * life.viewW
      : it.R + Math.random() * (life.viewW - it.R * 2);
    const y = cam.scrollY + cam.viewH * (0.15 + Math.random() * 0.7);
    const d = wallDist(life.wall, x, y);
    if ((d < 0 ? -1 : 1) !== it.side || Math.abs(d) < life.wall.half + it.R) continue;
    if (inClear(life.clear, x, y, it.R)) continue;
    it.x = x; it.y = y;
    it.cook = 0;
    it.popped = false;
    for (const o of it.stuck) o.stuck = o.stuck.filter(q => q !== it);
    it.stuck = [];
    it.state = 'falling';
    it.fz = 380 + Math.random() * 120;
    it.vz = 0;
    it.spin = (Math.random() - 0.5) * 5;
    return true;
  }
  return false;
};

/** Pours a handful of fresh ingredients into the view (the debug panel's "drop in"). */
export const pourIn = (scene: HotpotScene, cam: HotpotCamera, n = 6) => {
  const life = scene.life;
  const viewY = cam.scrollY + cam.viewH / 2;
  // Ones nobody is watching: parked or far off screen.
  const spare = life.items.filter(it => it.R > 9 * life.s && (it.state === 'gone' || (it.state === 'float' && Math.abs(it.y - viewY) > cam.viewH * 1.5)));
  for (let i = 0; i < n && spare.length; i++) {
    const it = spare.splice(Math.floor(Math.random() * spare.length), 1)[0];
    life.drops = life.drops.filter(d => d.item !== it);
    life.drops.push({ item: it, at: life.time + i * 0.25 });
  }
};

/** Brings a pair of chopsticks down for something cooked in view. */
const startPluck = (scene: HotpotScene, cam: HotpotCamera) => {
  const life = scene.life;
  const pair = life.sticks.find(p => p.state === 'idle');
  if (!pair) return false;
  const busy = new Set(life.sticks.map(p => p.item));
  let best: Item | null = null, bestScore = -Infinity;
  for (const it of life.items) {
    if (it.state !== 'float' || busy.has(it) || it.R < 9 * life.s) continue;
    const sy = it.y - cam.scrollY;
    if (sy < 80 || sy > cam.viewH - 80) continue;
    const done = INGREDIENTS[it.kind].cook ? it.cook : it.cook * (INGREDIENTS.beef.cook / VEG_DONE);
    if (done < (life.eager ? 0.3 : 1)) continue;
    const score = done + (inGutter(life, it.x) ? 2 : 0) + Math.random() * 0.5;
    if (score > bestScore) { bestScore = score; best = it; }
  }
  if (!best) return false;
  sendSticks(life, pair, best, 1.4);
  life.eager = false;
  return true;
};

/** Sends `pair` down for `it`, coming in from the nearer side of the page. */
const sendSticks = (life: HotpotLife, pair: Chopsticks, it: Item, dur: number) => {
  const sx = it.x < life.viewW / 2 ? -1 : 1;
  pair.dir = norm([sx * 0.55, -0.3, 0.78]);
  pair.item = it;
  pair.state = 'down';
  pair.t = 0;
  pair.dur = dur;
  pair.from = [it.x + pair.dir[0] * 520, it.y + pair.dir[1] * 520, it.z + pair.dir[2] * 520];
  pair.tip = pair.from;
  pair.gap = 20 * life.s;
};

/** The ingredient floating under page point (x, y), if any (garnish too small to pick up doesn't count). */
export const foodAt = (scene: HotpotScene, x: number, y: number): Item | null => {
  const life = scene.life;
  let best: Item | null = null, bestD = Infinity;
  for (const it of life.items) {
    if (it.state !== 'float' || it.R < 9 * life.s) continue;
    const d = Math.hypot(it.x - x, it.y - y) / it.R;
    if (d < 1 && d < bestD) { bestD = d; best = it; }
  }
  return best;
};

/** Someone clicked the food at page point (x, y): a free pair of chopsticks comes straight down for it, cooked or not. */
export const grabAt = (scene: HotpotScene, x: number, y: number) => {
  const life = scene.life;
  const it = foodAt(scene, x, y);
  if (!it || life.sticks.some(p => p.item === it)) return false;
  // A free pair, or failing that the one that has furthest to go.
  const pair = life.sticks.find(p => p.state === 'idle') ?? life.sticks.find(p => p.state === 'down' && p.t < 0.5);
  if (!pair) return false;
  if (pair.item && pair.item.state === 'held') pair.item.state = 'float';
  sendSticks(life, pair, it, 0.9);
  return true;
};

/** Debug: send chopsticks for something now, cooked or not. */
export const pluckNow = (scene: HotpotScene, cam: HotpotCamera) => {
  scene.life.eager = true;
  if (!startPluck(scene, cam)) scene.life.nextPluck = scene.life.time;
};

export const rollingBoil = (scene: HotpotScene, seconds = 16) => {
  scene.life.boilUntil = scene.life.time + seconds;
};

const poseSticks = (scene: HotpotScene, p: Chopsticks) => {
  const a = scene.bodies[p.a], b = scene.bodies[p.b];
  if (p.state === 'idle') {
    a.live = { c: PARKED, rot: a.base };
    b.live = { c: PARKED, rot: b.base };
    return;
  }
  const d = p.dir;
  const side = norm([-d[1], d[0], 0]);
  const L = scene.life.stickLen;
  const butt: V3 = [p.tip[0] + d[0] * L, p.tip[1] + d[1] * L, p.tip[2] + d[2] * L];
  const hand = 10 * scene.life.s;
  for (const [body, sgn] of [[a, 1], [b, -1]] as const) {
    const tip: V3 = [p.tip[0] + side[0] * sgn * p.gap * 0.5, p.tip[1] + side[1] * sgn * p.gap * 0.5, p.tip[2]];
    const end: V3 = [butt[0] + side[0] * sgn * hand, butt[1] + side[1] * sgn * hand, butt[2]];
    body.live = { c: tip, rot: frameAlong([end[0] - tip[0], end[1] - tip[1], end[2] - tip[2]]) };
  }
};

const stepSticks = (scene: HotpotScene, p: Chopsticks, dt: number) => {
  const life = scene.life;
  const it = p.item;
  if (p.state === 'idle' || !it) { p.state = 'idle'; poseSticks(scene, p); return; }
  p.t += dt;
  const top = it.R * 0.35 + 4 * life.s;
  if (p.state === 'down') {
    const u = Math.min(1, p.t / p.dur);
    const goal: V3 = [it.x, it.y, it.z + top];
    const e = ease(u);
    p.tip = [p.from[0] + (goal[0] - p.from[0]) * e, p.from[1] + (goal[1] - p.from[1]) * e, p.from[2] + (goal[2] - p.from[2]) * e];
    p.gap = 20 * life.s + (it.R * 2.2 + 10 * life.s - 20 * life.s) * Math.min(1, u * 1.5);
    if (u >= 1) { p.state = 'pinch'; p.t = 0; it.state = 'held'; it.fz = it.z; addRipple(life, it.x, it.y, 0.5); }
  } else if (p.state === 'pinch') {
    const u = Math.min(1, p.t / 0.3);
    p.gap = it.R * 2.2 + 10 * life.s - (it.R * 2.2 + 10 * life.s - it.R * 1.3) * ease(u);
    if (u >= 1) { p.state = 'lift'; p.t = 0; p.from = [...p.tip] as V3; addRipple(life, it.x, it.y, 0.8); }
  } else if (p.state === 'lift') {
    const u = Math.min(1, p.t / 1.7);
    const e = easeIn(u);
    const reach = 760;
    p.tip = [p.from[0] + p.dir[0] * reach * e, p.from[1] + p.dir[1] * reach * e, p.from[2] + p.dir[2] * reach * e];
    it.x = p.tip[0]; it.y = p.tip[1]; it.fz = p.tip[2] - top;
    if (u >= 1) {
      it.state = 'gone';
      p.state = 'idle';
      p.item = null;
      life.drops.push({ item: it, at: life.time + 1.5 + Math.random() * 2.5 });
    }
  }
  poseSticks(scene, p);
};

const flow = { vx: 0, vy: 0, heat: 0 };

/** One frame of the pot: `t` and `dt` in seconds, the camera, and the cursor in the window if there is one. */
export const stepLife = (scene: HotpotScene, t: number, dt: number, cam: HotpotCamera, pointer: { x: number; y: number } | null) => {
  const life = scene.life;
  life.time = t;
  const { s, wall } = life;
  const target = t < life.boilUntil ? 1.8 : 1;
  life.boil += (target - life.boil) * Math.min(1, dt * 0.8);

  // The cursor is a spoon: it pushes things aside and leaves rings behind it.
  let px = 0, py = 0;
  if (pointer) {
    px = pointer.x; py = pointer.y + cam.scrollY;
    const lp = life.lastPointer;
    if (!lp || (Math.hypot(px - lp.x, py - lp.y) > 14 && t - lp.t > 0.09)) {
      if (lp && dt > 0) addRipple(life, px, py, 0.32);
      life.lastPointer = { x: px, y: py, t };
    }
  }

  // Fresh ingredients due to land.
  if (life.drops.length) {
    life.drops = life.drops.filter(d => {
      if (t < d.at) return true;
      if (d.item.state === 'gone' || d.item.state === 'float') { if (!dropIn(scene, d.item, cam)) d.item.state = 'gone'; }
      return false;
    });
  }

  // Chopsticks.
  if (t > life.nextPluck && dt > 0) {
    if (startPluck(scene, cam)) life.nextPluck = t + 3 + Math.random() * 5;
    else life.nextPluck = t + 1.5;
  }
  for (const p of life.sticks) stepSticks(scene, p, dt);

  // Splashes run their course, then switch off.
  for (const sp of life.splashes) if (sp.t0 > -50 && t - sp.t0 > 1.2) { scene.bodies[sp.body].params![2] = 0; sp.t0 = -99; }

  const viewY = cam.scrollY + cam.viewH / 2;
  const near = cam.viewH * 0.75 + 150;
  // Little garnish is moved on alternate frames, to halve its cost.
  life.frame = (life.frame + 1) & 1;
  // A coarse grid for keeping things apart.
  const cell = 90 * s;
  const grid = new Map<number, Item[]>();
  const active: Item[] = [];
  for (const it of life.items) {
    if (it.state === 'gone') { scene.bodies[it.body].live = { c: PARKED, rot: scene.bodies[it.body].base }; continue; }
    const cookTime = INGREDIENTS[it.kind].cook || VEG_DONE;
    if (Math.abs(it.y - viewY) > near && it.state === 'float') { it.cook += (dt * 0.6) / cookTime; continue; }
    if (it.state === 'float' && it.R < 10 * s && (it.body & 1) !== life.frame) continue;
    active.push(it);
    if (it.state !== 'float') continue;
    const key = Math.floor(it.x / cell) + Math.floor(it.y / cell) * 4096;
    const list = grid.get(key);
    if (list) list.push(it); else grid.set(key, [it]);
  }

  for (const it of active) {
    const b = scene.bodies[it.body];
    if (it.state === 'falling') {
      it.vz -= 1700 * dt;
      it.fz += it.vz * dt;
      it.ang += it.spin * dt;
      const rest = -sinkOf(it) * s;
      if (it.fz <= rest) {
        it.state = 'float';
        it.bump = -8 * s; it.vb = 0;
        it.spin = (Math.random() - 0.5) * 0.4;
        splashAt(scene, it.x, it.y);
      }
      poseItem(b, it, t, 1, s);
      continue;
    }
    if (it.state === 'held') { poseItem(b, it, t, 0.3, s); continue; }

    flowAt(life, it.x, it.y, t, flow);
    it.heat = flow.heat;
    // Light things follow the current closely, big ones lag; the noodles drift along slowly.
    const k = Math.min(1, dt * (it.kind === 'noodles' ? 0.6 : it.R < 10 * s ? 2.5 : 1.2));
    it.vx += (flow.vx - it.vx) * k;
    it.vy += (flow.vy - it.vy) * k;
    // The spoon.
    if (pointer) {
      const dx = it.x - px, dy = it.y - py;
      const d = Math.hypot(dx, dy);
      const reach = 70 * s + it.R;
      if (d < reach && d > 0.01) {
        const push = (1 - d / reach) * 260 * dt;
        it.vx += (dx / d) * push * 4; it.vy += (dy / d) * push * 4;
        it.spin += (Math.random() - 0.5) * push * 0.1;
      }
    }
    it.x += it.vx * dt;
    it.y += it.vy * dt;
    it.ang += (it.spin + (flow.vx * 0.002)) * dt;
    // Things in the whirlpool spin as they go round.
    const vt = life.vortex;
    if (vt && vt.k > 0.05) {
      const dv = Math.hypot(it.x - vt.x, it.y - vt.y);
      if (dv < vt.R * 2) it.ang += vt.k * 1.6 * Math.exp(-dv / vt.R) * dt;
    }
    it.spin *= 1 - Math.min(1, dt * 0.3);
    it.vb += (-it.bump * 40 - it.vb * 6) * dt;
    it.bump += it.vb * dt;
    it.cook += (dt * (0.5 + flow.heat * 0.6)) / (INGREDIENTS[it.kind].cook || VEG_DONE);
    if (it.kind === 'meatball') {
      if (!it.popped && it.cook >= 1) { it.popped = true; it.vb = 70 * s; addRipple(life, it.x, it.y, 0.9); }
      const sp = Math.hypot(it.vx, it.vy);
      if (sp > 0.5 && dt > 0) it.roll = mul3(rotAxis([-it.vy / sp, it.vx / sp, 0], (sp * dt) / it.R), it.roll);
    }
    // The tilt a bubble knocked in settles.
    it.vtx += (-it.tx * 30 - it.vtx * 5) * dt; it.tx += it.vtx * dt;
    it.vty += (-it.ty * 30 - it.vty * 5) * dt; it.ty += it.vty * dt;

    // Keep to its own broth, off the page's edges and off the hero's lettering.
    keepOffWall(life, it);
    if (it.x < it.R * 0.5) it.vx += 40 * dt * s;
    if (it.x > life.viewW - it.R * 0.5) it.vx -= 40 * dt * s;
    if (it.y < it.R) it.vy += 40 * dt * s;
    if (it.y > life.pageH - it.R) it.vy -= 40 * dt * s;
    // However hard it's pushed (a whirlpool, the spoon), never off the page.
    it.x = Math.min(life.viewW, Math.max(0, it.x));
    it.y = Math.min(life.pageH, Math.max(0, it.y));
    for (const c of life.clear) {
      if (it.x > c.x - it.R && it.x < c.x + c.w + it.R && it.y > c.y - it.R && it.y < c.y + c.h + it.R) {
        const out = [it.x - (c.x - it.R), c.x + c.w + it.R - it.x, it.y - (c.y - it.R), c.y + c.h + it.R - it.y];
        const m = Math.min(...out);
        // Firmly, so a whirlpool or a spoon can't leave anything over the lettering.
        const push = 160 * s * dt;
        it.vx *= 0.9; it.vy *= 0.9;
        if (m === out[0]) it.x -= push; else if (m === out[1]) it.x += push; else if (m === out[2]) it.y -= push; else it.y += push;
      }
    }
  }

  // Jostling: overlapping things push apart, the smaller one more.
  for (const it of active) {
    if (it.state !== 'float') continue;
    const cx = Math.floor(it.x / cell), cy = Math.floor(it.y / cell);
    for (let gy = cy - 1; gy <= cy + 1; gy++) for (let gx = cx - 1; gx <= cx + 1; gx++) {
      const list = grid.get(gx + gy * 4096);
      if (!list) continue;
      for (const o of list) {
        if (o === it || o.body < it.body) continue;
        if (it.kind === 'napa' || o.kind === 'napa') continue;
        const dx = o.x - it.x, dy = o.y - it.y;
        const min = (it.R + o.R) * 0.82;
        const d2 = dx * dx + dy * dy;
        if (d2 >= min * min || d2 < 1e-4) continue;
        const d = Math.sqrt(d2);
        if (it.kind === 'ricecake' && o.kind === 'ricecake' && it.cook > 0.6 && o.cook > 0.6 && !it.stuck.includes(o) && it.stuck.length < 3 && o.stuck.length < 3) {
          it.stuck.push(o); o.stuck.push(it);
        }
        const over = (min - d) * Math.min(1, dt * 6);
        const wa = o.R * o.R / (it.R * it.R + o.R * o.R);
        it.x -= (dx / d) * over * wa; it.y -= (dy / d) * over * wa;
        o.x += (dx / d) * over * (1 - wa); o.y += (dy / d) * over * (1 - wa);
      }
    }
  }

  // Big bubbles come up beside things where it's hot, and when they pop the things next to them get knocked about.
  if (dt > 0) {
    for (const it of active) {
      if (it.state !== 'float' || it.R < 9 * s || life.bubbles.length >= 16) continue;
      if (Math.random() > dt * 0.05 * it.heat) continue;
      const a = Math.random() * Math.PI * 2;
      const r = (18 + Math.random() * 12) * s;
      life.bubbles.push({ x: it.x + Math.cos(a) * (it.R * 0.8 + r * 0.3), y: it.y + Math.sin(a) * (it.R * 0.8 + r * 0.3), t0: t, r, popped: false });
    }
    for (const b of life.bubbles) {
      if (b.popped || t - b.t0 < BUBBLE_GROW) continue;
      b.popped = true;
      addRipple(life, b.x, b.y, 0.4);
      for (const it of active) {
        if (it.state !== 'float') continue;
        const dx = it.x - b.x, dy = it.y - b.y;
        const d = Math.hypot(dx, dy) || 1;
        const reach = it.R + b.r * 2;
        if (d > reach) continue;
        const k = 1 - d / reach;
        // Up, away and tipped over away from it.
        it.vb += 60 * s * k;
        it.vx += (dx / d) * 45 * s * k; it.vy += (dy / d) * 45 * s * k;
        it.vtx += (dy / d) * 2.2 * k; it.vty -= (dx / d) * 2.2 * k;
        it.spin += (Math.random() - 0.5) * 1.5 * k;
      }
    }
    life.bubbles = life.bubbles.filter(b => t - b.t0 < BUBBLE_GROW + 0.6);
  }

  // Stuck rice cakes keep touching and move as one.
  for (const it of active) {
    if (!it.stuck.length) continue;
    for (const o of [...it.stuck]) {
      if (o.state !== 'float' || it.state !== 'float') { it.stuck = it.stuck.filter(x => x !== o); o.stuck = o.stuck.filter(x => x !== it); continue; }
      if (o.body < it.body) continue;
      const dx = o.x - it.x, dy = o.y - it.y;
      const d = Math.hypot(dx, dy) || 1;
      const pull = (d - (it.R + o.R) * 0.78) * Math.min(1, dt * 5) * 0.5;
      it.x += (dx / d) * pull; it.y += (dy / d) * pull;
      o.x -= (dx / d) * pull; o.y -= (dy / d) * pull;
      const vx = (it.vx + o.vx) / 2, vy = (it.vy + o.vy) / 2;
      it.vx = o.vx = vx; it.vy = o.vy = vy;
    }
  }

  // Last of all, nothing may overlap the divider: pushed straight back out, however it's turned.
  for (const it of active) if (it.state === 'float') keepOffWall(life, it);

  for (const it of active) if (it.state === 'float') poseItem(scene.bodies[it.body], it, t, it.heat, s);

  // Old rings fade out.
  if (life.ripples.length && t - life.ripples[0].t0 > 3) life.ripples.shift();
};
