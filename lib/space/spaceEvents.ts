import { Builder, F, G, M, SpaceCamera, SpaceScene, V3, centreAt, cross, fbm, fromScreen, norm, sphere, toScreen, uprightOn } from './space';

/**
 * The sky's events. A meteor shower sends streaks across wherever the visitor
 * is looking (and blips cover their eyes); lone shooting stars cross now and
 * then. A solar flare throws a loop of fire off the sun and warms the light on
 * everything. An eclipse slides a dark moon over the sun and dims the page,
 * while the blips' antennae glow brighter. Each comes round on its own, and the
 * debug panel can start them (`startEvent`).
 *
 * Their effect on the light is gathered in `light`, which the view hands to
 * its shaders.
 */

export type SpaceEventKind = 'meteors' | 'flare' | 'eclipse';

interface Meteor { body: number; t: number; dur: number; from: V3; to: V3; on: boolean }

export interface SpaceEvents {
  sun: number;
  meteors: Meteor[];
  /** Seconds of meteor shower left. */
  shower: number;
  nextShower: number;
  nextShooting: number;
  spawnIn: number;
  flare: { body: number; t: number; dur: number; next: number };
  eclipse: { body: number; t: number; dur: number; next: number; z: number; R: number };
  /** Multipliers for the shaders: sunlight, glows, antenna tips, antenna frizz, warmth, aurora. */
  light: { sun: number; glow: number; antenna: number; frizz: number; warm: number; aurora: number };
}

interface Ctx {
  rand: () => number;
  k: (z: number) => number;
  sp: (z: number) => number;
  s: number;
  f: number;
  sunR: number;
  sunZ: number;
}

const POOL = 18;
const SHOWER_TIME = 14;
const FLARE_TIME = 10;
const ECLIPSE_TIME = 20;
const PARKED: V3 = [0, -1e6, 0];

export const populateEvents = (B: Builder, ctx: Ctx): SpaceEvents => {
  const { rand, s, f } = ctx;
  const sun = B.bodies.findIndex(b => b.kind === 'sun');

  // A pool of meteors, each a bright head and a fading streak behind it (local +x).
  const meteors: Meteor[] = [];
  for (let i = 0; i < POOL; i++) {
    const body = B.body({ kind: 'meteor', name: 'meteor', pos: PARKED, params: [0, 0, 0, 0] });
    sphere(B, body, 4 * s, ctx.sp(0) * 0.5, () => ({ mat: M.star, alb: 1, flags: F.emissive }));
    const L = (170 + rand() * 120) * s;
    for (let j = 0; j < 22; j++) {
      const u = j / 21;
      const warm = rand() < 0.3;
      B.glowAt([u * L, 0, 0], (9 - u * 5) * s, (warm ? [1, 0.75, 0.5] : [0.75, 0.85, 1]).map(c => c * 2.2 * (1 - u) ** 1.3) as V3, body, G.gate, rand());
    }
    meteors.push({ body, t: 0, dur: 1, from: PARKED, to: PARKED, on: false });
  }

  // The flare: motes that travel up and over a loop, with bright feet where it leaves and rejoins the sun.
  const flareBody = B.body({ kind: 'flare', name: 'flare', pos: PARKED, params: [0, 0, 0, 0] });
  const R = ctx.sunR;
  const span = R * 0.55;
  for (let i = 0; i < 90; i++) {
    B.glowAt([(rand() - 0.5) * R * 0.08, (rand() - 0.5) * R * 0.08, (rand() - 0.5) * R * 0.08], R * (0.07 + rand() * 0.05), [1, 0.5 + rand() * 0.25, 0.15], flareBody, G.arc | G.gate, rand(), span);
  }
  for (const x of [-span, span]) B.glowAt([x, 0, 0], R * 0.26, [1, 0.6, 0.2], flareBody, G.gate | G.flicker, rand());

  // The eclipse's moon: dark, since its lit side faces away, and a touch larger on screen than the sun.
  const z = -0.3 * f;
  const sunApparent = ctx.sunR / ctx.k(ctx.sunZ);
  const mR = sunApparent * 1.08 * ctx.k(z);
  const moon = B.body({ kind: 'eclipse', name: 'eclipse moon', pos: PARKED, radius: mR });
  sphere(B, moon, mR, ctx.sp(z), d => ({ mat: M.ash, alb: 0.2 + (fbm(d[0] * 3, d[1] * 3, d[2] * 3, 41) - 0.5) * 0.4 }));

  return {
    sun, meteors, shower: 0, nextShower: 25, nextShooting: 6, spawnIn: 0,
    flare: { body: flareBody, t: -1, dur: FLARE_TIME, next: 48 },
    eclipse: { body: moon, t: -1, dur: ECLIPSE_TIME, next: 90, z, R: sunApparent },
    light: { sun: 1, glow: 1, antenna: 1, frizz: 0, warm: 0, aurora: 1 },
  };
};

export const startEvent = (ev: SpaceEvents, kind: SpaceEventKind) => {
  if (kind === 'meteors') { ev.shower = SHOWER_TIME; ev.spawnIn = 0; }
  else if (kind === 'flare') ev.flare.t = 0;
  else ev.eclipse.t = 0;
};

const smooth = (a: number, b: number, x: number) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
/** Up over `rise` seconds, down over the last `fall`. */
const envelope = (t: number, dur: number, rise: number, fall: number) => smooth(0, rise, t) * (1 - smooth(dur - fall, dur, t));

const launch = (scene: SpaceScene, cam: SpaceCamera, m: Meteor, shower: boolean) => {
  const f = scene.focal;
  const z = -Math.random() * 0.7 * f + 0.12 * f;
  const dir = norm([-0.74 + (Math.random() - 0.5) * 0.15, 0.67, 0]);
  const sx = cam.viewW * (0.25 + Math.random() * 0.95);
  const sy = -30 + Math.random() * cam.viewH * (shower ? 0.5 : 0.3);
  const travel = cam.viewH * (0.6 + Math.random() * 0.5);
  m.from = fromScreen(scene, cam, sx, sy, z);
  m.to = fromScreen(scene, cam, sx + dir[0] * travel, sy + dir[1] * travel, z);
  m.t = 0;
  m.dur = 0.75 + Math.random() * 0.5;
  m.on = true;
};

/** Moves the events on by `dt` seconds and works out the light they leave. */
export const stepEvents = (scene: SpaceScene, dt: number, cam: SpaceCamera) => {
  const ev = scene.events;
  const { bodies } = scene;

  // Meteors: a shower now and then, and single shooting stars between.
  if ((ev.nextShower -= dt) <= 0) { ev.nextShower = 100 + Math.random() * 60; startEvent(ev, 'meteors'); }
  if (ev.shower > 0) ev.shower -= dt;
  const idle = () => ev.meteors.find(m => !m.on);
  if (ev.shower > 0 && (ev.spawnIn -= dt) <= 0) {
    ev.spawnIn = 0.1 + Math.random() * 0.25;
    const m = idle();
    if (m) launch(scene, cam, m, true);
  }
  if ((ev.nextShooting -= dt) <= 0) {
    ev.nextShooting = 9 + Math.random() * 14;
    const m = idle();
    if (m) launch(scene, cam, m, false);
  }
  for (const m of ev.meteors) {
    const b = bodies[m.body];
    if (!m.on) { b.live = { c: PARKED, rot: b.base }; b.params = [0, 0, 0, 0]; continue; }
    m.t += dt;
    const u = Math.min(1, m.t / m.dur);
    const c: V3 = [m.from[0] + (m.to[0] - m.from[0]) * u, m.from[1] + (m.to[1] - m.from[1]) * u, m.from[2] + (m.to[2] - m.from[2]) * u];
    const x = norm([m.from[0] - m.to[0], m.from[1] - m.to[1], m.from[2] - m.to[2]]);
    const y = norm(cross([0, 0, 1], x));
    const zz = cross(x, y);
    b.live = { c, rot: [x[0], y[0], zz[0], x[1], y[1], zz[1], x[2], y[2], zz[2]] };
    b.params = [0, 0, Math.sin(Math.PI * u) ** 0.5, 0];
    if (u >= 1) m.on = false;
  }

  const light = { sun: 1, glow: 1, antenna: 1, frizz: 0, warm: 0, aurora: 1 };
  const busy = () => ev.flare.t >= 0 || ev.eclipse.t >= 0;

  // The flare: a loop of fire rising off the sun's lower-left limb.
  const fl = ev.flare;
  if ((fl.next -= dt) <= 0) { fl.next = 80 + Math.random() * 50; if (!busy()) fl.t = 0; }
  const fb = bodies[fl.body];
  if (fl.t >= 0) {
    fl.t += dt;
    const S = centreAt(scene, ev.sun, 0);
    const sunR = bodies[ev.sun].radius;
    const dir = norm([-1, 0.55, 0]);
    const g = smooth(0, 2.5, fl.t);
    const on = envelope(fl.t, fl.dur, 0.8, 2.5);
    fb.live = { c: [S[0] + dir[0] * sunR * 0.96, S[1] + dir[1] * sunR * 0.96, S[2] + dir[2] * sunR * 0.96], rot: uprightOn(dir) };
    fb.scale = [0.6 + 0.4 * g, 0.15 + 0.85 * g, 1];
    fb.params = [0, 0, on, 0];
    light.sun *= 1 + 0.3 * on;
    light.warm = on;
    light.frizz = on;
    light.aurora = 1 + 1.8 * on;
    if (fl.t >= fl.dur) fl.t = -1;
  } else {
    fb.live = { c: PARKED, rot: fb.base };
    fb.params = [0, 0, 0, 0];
  }

  // The eclipse: the moon crosses in front of the sun, lingering as it covers it.
  const ec = ev.eclipse;
  if ((ec.next -= dt) <= 0) { ec.next = 160 + Math.random() * 80; if (!busy()) ec.t = 0; }
  const eb = bodies[ec.body];
  if (ec.t >= 0) {
    ec.t += dt;
    const sunAt = toScreen(scene, cam, centreAt(scene, ev.sun, 0));
    const o = (ec.t / ec.dur - 0.5) * 2;
    const off = Math.sign(o) * Math.abs(o) ** 1.7 * 2.6 * ec.R;
    eb.live = { c: fromScreen(scene, cam, sunAt[0] + off, sunAt[1] - off * 0.14, ec.z), rot: eb.base };
    const e = Math.max(0, 1 - Math.abs(off) / (ec.R * 2.08)) ** 0.8;
    light.sun *= 1 - 0.72 * e;
    light.glow *= 1 - 0.5 * e;
    light.antenna = 1 + 2.2 * e;
    if (ec.t >= ec.dur) ec.t = -1;
  } else {
    eb.live = { c: PARKED, rot: eb.base };
  }

  ev.light = light;
};
