/**
 * The pot's events: a ladle that comes down, stirs a circle and leaves a
 * whirlpool spinning everything round it, and an egg cracked in that spreads
 * into silky ribbons drifting on the currents. Each starts on its own every
 * minute or so, somewhere in view, and from the debug panel.
 *
 * Runs on the main thread every frame (`stepEvents`), before `stepLife`; the
 * whirlpool reaches the ingredients through `life.vortex`.
 */

import { Builder, DISC, HotpotCamera, HotpotScene, M, SPACING, V3, ellipsoid, fbm, mul3, rotX, rotZ, slab, tube, wallDist } from './hotpot';
import { MAX_BUBBLES, addRipple, flowAt, jiggle, splashAt, toss } from './hotpotLife';

export type HotpotEventKind = 'ladle' | 'egg' | 'erupt';

/** A rolling boil erupting: bubbles crowd up, then it surges and throws the food up out of the broth. */
interface Eruption { on: boolean; t: number; x: number; y: number; surged: boolean; lastBubble: number }
/** Seconds from the first bubbles to the surge, and to the end. */
const SURGE = 0.6, ERUPT_LEN = 2.4;

interface Ladle {
  body: number;
  state: 'idle' | 'in' | 'stir' | 'out';
  t: number;
  /** The circle it stirs round, which way, and where it started on it. */
  cx: number; cy: number; r: number; dir: number; a0: number;
  /** Which way the handle points (towards the nearer edge of the page). */
  heading: number;
  pos: V3;
  lastRing: number;
}

interface Ribbon { body: number; x: number; y: number; z: number; vx: number; vy: number; ang: number; age: number }

interface EggDrop {
  body: number;
  state: 'idle' | 'falling' | 'ribbons';
  x: number; y: number; z: number; vz: number; spin: number;
  ribbons: Ribbon[];
}

export interface HotpotEvents {
  ladle: Ladle;
  egg: EggDrop;
  erupt: Eruption;
  next: Record<HotpotEventKind, number>;
}

const PARKED: V3 = [-1e5, -1e5, -2e4];
/** The ladle's bowl radius, the length of its handle, and how big the whirlpool it leaves is, at full size. */
const BOWL = 34, HANDLE = 300, SWIRL = 170;
/** How long the egg's ribbons last before they sink out of sight. */
const RIBBON_LIFE = 38;

/** A ladle with its bowl at the origin, open to the sky, and its handle rising along +x. */
const buildLadle = (B: Builder, obj: number, s: number) => {
  const sp = SPACING * 0.8;
  const R = BOWL * s;
  // Inside the bowl (what you see from above), its rim, then the handle.
  const N = Math.round((2 * Math.PI * R * R) / (sp * sp));
  for (let i = 0; i < N; i++) {
    const z = -((i + 0.5) / N);
    const rr = Math.sqrt(1 - z * z);
    const a = i * Math.PI * (3 - Math.sqrt(5));
    const d: V3 = [Math.cos(a) * rr, Math.sin(a) * rr, z];
    B.surfel([d[0] * R, d[1] * R, d[2] * R], [-d[0], -d[1], -d[2]], sp * DISC, M.steel, 0.45 + (fbm(d[0] * 3, d[1] * 3, 0, 5) - 0.5) * 0.2, obj);
  }
  tube(B, obj, sp, t => ({ x: Math.cos(t * Math.PI * 2) * R, y: Math.sin(t * Math.PI * 2) * R, r: 4 * s }), () => ({ mat: M.steel, alb: 0.75 }));
  const L = HANDLE * s;
  tube(B, obj, sp, t => ({ x: R * 0.95 + t * L * 0.45, y: 0, z: 2 + t * L * 0.85, r: (7 - t * 2) * s }), t => ({ mat: t > 0.8 ? M.wood : M.steel, alb: 0.6 }));
};

/** A hen's egg, whole. */
const buildEgg = (B: Builder, obj: number, s: number) => {
  ellipsoid(B, obj, 22 * s, 16 * s, 15 * s, SPACING * 0.8, d => ({ mat: M.fishball, alb: 0.55 + (fbm(d[0] * 4, d[1] * 4, d[2] * 4, 9) - 0.5) * 0.2 }), [0, 0, 0], 0, -1);
};

/** A ribbon of egg: a wavy, ragged strip of yolk-yellow streaked with white. */
const buildRibbon = (B: Builder, obj: number, s: number, rand: () => number) => {
  const L = (36 + rand() * 16) * s, ph = rand() * 6, seed = Math.floor(rand() * 1e5);
  slab(B, obj, L, 18 * s, SPACING * 0.8, (u, v) => {
    if (Math.abs(u) > L) return null;
    const mid = Math.sin(u * 0.11 + ph) * 6 * s;
    const w = (5 + fbm(u * 0.08, 0.5, 0, seed) * 9) * s * (1 - (Math.abs(u) / L) ** 3);
    if (Math.abs(v - mid) > w) return null;
    const white = fbm(u * 0.12, v * 0.12, 0, seed + 3) > 0.58;
    return { h: 1.5, mat: white ? M.tofu : M.yolk, alb: 0.55 + (fbm(u * 0.3, v * 0.3, 0, seed + 7) - 0.5) * 0.3 };
  }, 0);
};

export const populateEvents = (B: Builder, ctx: { rand: () => number; s: number }): HotpotEvents => {
  const { rand, s } = ctx;
  const ladle = B.body({ kind: 'ladle', pos: PARKED });
  buildLadle(B, ladle, s);
  const egg = B.body({ kind: 'egg', pos: PARKED });
  buildEgg(B, egg, s);
  const ribbons: Ribbon[] = [];
  for (let i = 0; i < 8; i++) {
    const body = B.body({ kind: 'ribbon', pos: PARKED });
    buildRibbon(B, body, s, rand);
    ribbons.push({ body, x: 0, y: 0, z: 0, vx: 0, vy: 0, ang: 0, age: 0 });
  }
  return {
    ladle: { body: ladle, state: 'idle', t: 0, cx: 0, cy: 0, r: 0, dir: 1, a0: 0, heading: 0, pos: PARKED, lastRing: 0 },
    egg: { body: egg, state: 'idle', x: 0, y: 0, z: 0, vz: 0, spin: 0, ribbons },
    // The ladle first comes soon after arrival, the egg a little later.
    erupt: { on: false, t: 0, x: 0, y: 0, surged: false, lastBubble: 0 },
    next: { ladle: 22 + rand() * 10, egg: 45 + rand() * 15, erupt: 10 + rand() * 6 },
  };
};

/** Somewhere in view to put an event: preferring the margins, on the broth, away from the divider and the hero text. */
const pickSpot = (scene: HotpotScene, cam: HotpotCamera, room: number) => {
  const life = scene.life;
  for (let tries = 0; tries < 40; tries++) {
    const g = Math.random();
    const x = tries < 25 ? (g < 0.5 ? 0.07 + Math.random() * 0.12 : 0.81 + Math.random() * 0.12) * life.viewW : room + Math.random() * (life.viewW - room * 2);
    const y = cam.scrollY + cam.viewH * (0.25 + Math.random() * 0.5);
    if (Math.abs(wallDist(life.wall, x, y)) < room * 0.7) continue;
    if (life.clear.some(c => x > c.x - room && x < c.x + c.w + room && y > c.y - room && y < c.y + c.h + room)) continue;
    return { x, y };
  }
  return null;
};

export const startEvent = (scene: HotpotScene, kind: HotpotEventKind, cam: HotpotCamera) => {
  const ev = scene.events;
  const s = scene.s;
  if (kind === 'erupt') {
    const R = ev.erupt;
    if (R.on) return false;
    // At the hardest-rolling spot in view, the margins first.
    const life = scene.life;
    let best: [number, number, number] | null = null, bestScore = -Infinity;
    for (const p of life.plumes) {
      const sy = p[1] - cam.scrollY;
      if (sy < cam.viewH * 0.15 || sy > cam.viewH * 0.85) continue;
      if (life.clear.some(c => p[0] > c.x - 60 * s && p[0] < c.x + c.w + 60 * s && p[1] > c.y - 60 * s && p[1] < c.y + c.h + 60 * s)) continue;
      // Where there's food to throw.
      let food = 0;
      for (const it of life.items) if (it.state === 'float' && it.R > 12 * s && Math.abs(it.x - p[0]) < 110 * s && Math.abs(it.y - p[1]) < 110 * s) food++;
      const score = p[2] + Math.min(4, food) * 0.5 + (p[0] < scene.viewW * 0.22 || p[0] > scene.viewW * 0.78 ? 1 : 0) + Math.random() * 0.4;
      if (score > bestScore) { bestScore = score; best = p; }
    }
    if (!best) return false;
    Object.assign(R, { on: true, t: 0, x: best[0], y: best[1], surged: false, lastBubble: 0 });
    return true;
  }
  if (kind === 'ladle') {
    const L = ev.ladle;
    if (L.state !== 'idle') return false;
    const spot = pickSpot(scene, cam, SWIRL * s);
    if (!spot) return false;
    L.cx = spot.x; L.cy = spot.y; L.r = 64 * s;
    L.dir = Math.random() < 0.5 ? 1 : -1;
    L.a0 = Math.random() * Math.PI * 2;
    // The handle points up the page and out towards the nearer edge.
    L.heading = spot.x < scene.viewW / 2 ? Math.PI + 0.9 : -0.9;
    L.state = 'in'; L.t = 0;
    return true;
  }
  const E = ev.egg;
  if (E.state !== 'idle') return false;
  const spot = pickSpot(scene, cam, 80 * s);
  if (!spot) return false;
  E.x = spot.x; E.y = spot.y; E.z = 420; E.vz = 0; E.spin = (Math.random() - 0.5) * 6;
  E.state = 'falling';
  return true;
};

const easeInOut = (u: number) => (u < 0.5 ? 2 * u * u : 1 - (-2 * u + 2) ** 2 / 2);
const flow = { vx: 0, vy: 0, heat: 0 };

const stepLadle = (scene: HotpotScene, t: number, dt: number) => {
  const L = scene.events.ladle;
  const life = scene.life;
  const s = scene.s;
  const body = scene.bodies[L.body];
  const vt = life.vortex;
  // A whirlpool left behind winds down.
  if (vt && L.state !== 'stir') {
    vt.k *= Math.exp(-dt / 7);
    if (vt.k < 0.02) life.vortex = null;
  }
  if (L.state === 'idle') { body.live = { c: PARKED, rot: rotZ(0) }; return; }
  L.t += dt;
  const R = BOWL * s;
  const dipped = R * 0.4;
  const at = (a: number): V3 => [L.cx + Math.cos(a) * L.r, L.cy + Math.sin(a) * L.r, dipped];
  const turns = 1.75;
  if (L.state === 'in') {
    const u = Math.min(1, L.t / 0.9);
    const p = at(L.a0);
    const e = 1 - (1 - u) ** 3;
    L.pos = [p[0] - Math.cos(L.heading) * 120 * (1 - e), p[1], dipped + (340 - dipped) * (1 - e)];
    if (u >= 1) { L.state = 'stir'; L.t = 0; addRipple(life, p[0], p[1], 0.8); life.vortex = { x: L.cx, y: L.cy, k: 0, R: SWIRL * s }; }
  } else if (L.state === 'stir') {
    const u = Math.min(1, L.t / 4.5);
    const a = L.a0 + L.dir * turns * Math.PI * 2 * easeInOut(u);
    L.pos = at(a);
    if (life.vortex) life.vortex.k = Math.min(1, u * 1.4);
    if (t - L.lastRing > 0.14) { L.lastRing = t; addRipple(life, L.pos[0], L.pos[1], 0.45); }
    // The bowl shoves whatever it meets along with it.
    for (const it of life.items) {
      if (it.state !== 'float') continue;
      const dx = it.x - L.pos[0], dy = it.y - L.pos[1];
      const d = Math.hypot(dx, dy) || 1;
      if (d > it.R + R * 1.3) continue;
      const tx = -Math.sin(a) * L.dir, ty = Math.cos(a) * L.dir;
      it.vx += (tx * 160 * s + (dx / d) * 80 * s) * dt * 6;
      it.vy += (ty * 160 * s + (dy / d) * 80 * s) * dt * 6;
      it.spin += L.dir * dt * 6;
      jiggle(it, dt * 1.5);
    }
    if (u >= 1) { L.state = 'out'; L.t = 0; addRipple(life, L.pos[0], L.pos[1], 0.9); }
  } else if (L.state === 'out') {
    const u = Math.min(1, L.t / 1);
    const e = u * u;
    const p = at(L.a0 + L.dir * turns * Math.PI * 2);
    L.pos = [p[0] + Math.cos(L.heading) * 260 * e, p[1], dipped + (420 - dipped) * e];
    if (u >= 1) { L.state = 'idle'; L.pos = PARKED; }
  }
  // Tipped a touch towards the way it's going, so it reads as being pushed round.
  const lean = L.state === 'stir' ? 0.12 * L.dir : 0;
  body.live = { c: L.pos, rot: mul3(rotZ(L.heading), rotX(lean)) };
};

const stepEgg = (scene: HotpotScene, t: number, dt: number) => {
  const E = scene.events.egg;
  const life = scene.life;
  const s = scene.s;
  const body = scene.bodies[E.body];
  if (E.state === 'falling') {
    E.vz -= 1700 * dt;
    E.z += E.vz * dt;
    body.live = { c: [E.x, E.y, Math.max(E.z, 0)], rot: mul3(rotZ(t * E.spin), rotX(t * 2)) };
    if (E.z <= 0) {
      // Cracked on landing: a splash, and the egg spreads out in ribbons.
      splashAt(scene, E.x, E.y);
      addRipple(life, E.x, E.y, 1);
      body.live = { c: PARKED, rot: rotZ(0) };
      E.state = 'ribbons';
      E.ribbons.forEach((r, i) => {
        const a = (i / E.ribbons.length) * Math.PI * 2 + Math.random() * 0.5;
        const v = (60 + Math.random() * 70) * s;
        r.x = E.x + Math.cos(a) * 6 * s; r.y = E.y + Math.sin(a) * 6 * s; r.z = 0.5;
        r.vx = Math.cos(a) * v; r.vy = Math.sin(a) * v; r.ang = a; r.age = 0;
      });
    }
    return;
  }
  if (E.state !== 'ribbons') { body.live = { c: PARKED, rot: rotZ(0) }; return; }
  let alive = 0;
  for (const r of E.ribbons) {
    const b = scene.bodies[r.body];
    r.age += dt;
    if (r.age > RIBBON_LIFE) { b.live = { c: PARKED, rot: rotZ(0) }; continue; }
    alive++;
    flowAt(life, r.x, r.y, t, flow);
    const k = Math.min(1, dt * 0.9);
    r.vx += (flow.vx - r.vx) * k;
    r.vy += (flow.vy - r.vy) * k;
    r.x += r.vx * dt; r.y += r.vy * dt;
    // Keep to its broth.
    const d0 = wallDist(life.wall, E.x, E.y), d = wallDist(life.wall, r.x, r.y);
    if (Math.sign(d) !== Math.sign(d0) || Math.abs(d) < life.wall.half + 12 * s) { r.x -= r.vx * dt * 2; r.vx *= -0.3; }
    // Lie along the way it's drifting, slowly.
    const sp = Math.hypot(r.vx, r.vy);
    if (sp > 2) {
      let da = Math.atan2(r.vy, r.vx) - r.ang;
      da = Math.atan2(Math.sin(da), Math.cos(da));
      r.ang += da * Math.min(1, dt * 0.6);
    }
    // Unfurls out of the splash, then late on sinks away under the surface.
    const grow = Math.min(1, 0.3 + r.age / 3);
    r.z = r.age > RIBBON_LIFE - 9 ? 0.5 - ((r.age - (RIBBON_LIFE - 9)) / 9) * 18 * s : 0.5 + Math.sin(t * 1.5 + r.body) * 0.6;
    b.live = { c: [r.x, r.y, r.z], rot: rotZ(r.ang) };
    b.scale = [grow, 0.4 + grow * 0.6, 1];
  }
  if (!alive) E.state = 'idle';
};

/** One frame of the pot's events. */
export const stepEvents = (scene: HotpotScene, t: number, dt: number, cam: HotpotCamera) => {
  const ev = scene.events;
  if (dt > 0) {
    for (const kind of ['ladle', 'egg'] as HotpotEventKind[]) {
      if (t < ev.next[kind]) continue;
      // Not both at once; try again shortly if there's nowhere to put it.
      const busy = ev.ladle.state !== 'idle' || ev.egg.state === 'falling';
      ev.next[kind] = t + (busy || !startEvent(scene, kind, cam) ? 6 : kind === 'ladle' ? 55 + Math.random() * 30 : 70 + Math.random() * 30);
    }
    if (t >= ev.next.erupt) ev.next.erupt = t + (startEvent(scene, 'erupt', cam) ? 20 + Math.random() * 15 : 4);
  }
  stepLadle(scene, t, dt);
  stepEgg(scene, t, dt);
  stepErupt(scene, t, dt);
};

const stepErupt = (scene: HotpotScene, t: number, dt: number) => {
  const R = scene.events.erupt;
  if (!R.on) return;
  const life = scene.life;
  const s = scene.s;
  R.t += dt;
  const reach = 120 * s;
  // Big bubbles crowding up, faster and faster.
  if (R.t < ERUPT_LEN - 0.6 && t - R.lastBubble > (R.t < SURGE ? 0.12 : 0.07) && life.bubbles.length < MAX_BUBBLES) {
    R.lastBubble = t;
    const a = Math.random() * Math.PI * 2, d = Math.sqrt(Math.random()) * reach * 0.8;
    life.bubbles.push({ x: R.x + Math.cos(a) * d, y: R.y + Math.sin(a) * d, t0: t - Math.random() * 0.4, r: (16 + Math.random() * 16) * s, popped: false });
  }
  if (!R.surged && R.t >= SURGE) {
    // The surge: everything near is thrown up, the nearest highest.
    R.surged = true;
    splashAt(scene, R.x, R.y);
    addRipple(life, R.x, R.y, 1.4);
    for (const it of life.items) {
      const d = Math.hypot(it.x - R.x, it.y - R.y);
      if (d > reach + it.R * 0.5 || it.state !== 'float') continue;
      toss(it, (240 + Math.random() * 220) * s * (1 - (d / reach) * 0.5));
      it.vx += ((it.x - R.x) / (d || 1)) * 60 * s; it.vy += ((it.y - R.y) / (d || 1)) * 60 * s;
    }
  }
  if (R.t >= ERUPT_LEN) R.on = false;
};
