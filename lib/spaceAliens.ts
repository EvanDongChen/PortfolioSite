import {
  Builder, F, G, M, SpaceCamera, SpaceScene, V3, centreAt, lumpy, mul3, norm, dot, rotX, rotY, rotZ, sphere, toScreen, uprightOn,
} from './space';

/**
 * The cute ones. Blips are little round aliens (one or two big eyes, blushing
 * cheeks, wobbly antennae with glowing tips) living on small clusters of rocks
 * in the page's margins: they hop from rock to rock, blink, look about, and
 * turn to wave at the cursor when it comes near. Saucers, each flown by a pink
 * blip, swoop between the planets and the colonies, hover, and switch on a
 * tractor beam; over a colony the beam lifts a delighted blip up and lets it
 * float back down.
 *
 * Blips and saucers are built here as surfels like everything else; their
 * behaviour (`stepAliens`) runs on the main thread each frame and moves
 * them by setting `live`, `scale` and `params` on their bodies.
 */

type Mode = 'sit' | 'crouch' | 'hop' | 'beamed' | 'falling';

export interface Rock { body: number; r: number; occupant: number }
export interface Colony { rocks: Rock[]; y: number }
export interface Blip {
  body: number;
  arms: [number, number];
  r: number;
  /** -1 for a saucer's pilot. */
  colony: number;
  rock: number;
  mode: Mode;
  t: number;
  wait: number;
  from: V3;
  to: number;
  dur: number;
  pos: V3;
  sq: number;
  sqv: number;
  yaw: number;
  pitch: number;
  lookYaw: number;
  lookPitch: number;
  lookTimer: number;
  blinkIn: number;
  blinking: number;
  wave: number;
  flip: number;
  flipDir: number;
  phase: number;
  /** The saucer lifting it, while beamed. */
  saucer: number;
  /** The rock it means to hop to next, chasing the cursor. */
  chase: number;
  tagCool: number;
  /** Hands over its eyes (meteors!), 0 to 1. */
  cover: number;
}
export interface Saucer {
  body: number;
  beam: number;
  pilot: number;
  R: number;
  mode: 'fly' | 'hover';
  t: number;
  dur: number;
  from: V3;
  pos: V3;
  target: { kind: 'planet' | 'colony'; index: number };
  beamOn: number;
  lifting: number;
  bank: number;
  happy: number;
}
export interface Flower { body: number; n: V3; g: number; state: 'bare' | 'growing' | 'bloom' | 'wilting'; life: number }
export interface Gardener { blip: number; n: V3; target: number; mode: 'walk' | 'water' | 'admire'; t: number; can: number; water: number; pour: number; heading: number }
export interface Garden { moon: number; R: number; flowers: Flower[]; gardeners: Gardener[] }
export interface AlienLife { colonies: Colony[]; blips: Blip[]; saucers: Saucer[]; garden: Garden | null }

interface Ctx {
  rand: () => number;
  at: (sx: number, y: number, z: number) => V3;
  k: (z: number) => number;
  sp: (z: number) => number;
  s: number;
  f: number;
  viewW: number;
  pageH: number;
  planets: number[];
  seed: number;
}

/** Height of a hop, in blip radii. */
const HOP_HEIGHT = 3.2;
const HOP_TIME = 0.85;
const BEAM_LENGTH = 4.6;
const NOTICE_PX = 170;

const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const lerp3 = (a: V3, b: V3, t: number): V3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

// ------------------------------------------------------------- the models ---

/** A blip: body, eyes, cheeks, smile, antennae and feet in one object; its arms are their own, to wave. */
const buildBlip = (B: Builder, ctx: Ctx, r: number, z: number, mat: number, rand: () => number, attach?: { parent: number; offset: V3 }) => {
  const sp = ctx.sp(z) * 0.5;
  const one = rand() < 0.35;
  const twin = rand() < 0.4;
  const cheek = mat === M.pink ? M.light : M.pink;
  const body = B.body({ kind: 'blip', name: 'blip', pos: [0, 0, 0], radius: r * 1.8, attach, params: [0.12, r * 0.88, 0, rand() * 6] });
  const ns = Math.floor(rand() * 1e6);
  sphere(B, body, r, sp, d => {
    for (const sx of [-1, 1]) {
      if (dot(d, norm([sx * 0.62, 0.18, 0.76])) > 0.965) return { mat: cheek, alb: 0.62 };
    }
    // A small smile, its corners turned up (y runs down the page).
    if (d[2] > 0.55 && Math.abs(d[0]) < 0.34 && Math.abs(d[1] - (0.36 - d[0] * d[0] * 2)) < 0.085) return { mat: M.pupil, alb: 0.35 };
    const belly = d[1] > 0.25 && d[2] > 0.2 ? 0.14 : 0;
    return { mat, alb: 0.52 + belly + (Math.sin(d[0] * 9 + ns) * Math.sin(d[1] * 7) * 0.05) };
  });
  // Eyes, as pupils facing straight out with a glint, so they follow wherever the body turns.
  const eyes: [number, number][] = one ? [[0, 0.44]] : [[-0.34, 0.3], [0.34, 0.3]];
  for (const [ex, er0] of eyes) {
    const er = er0 * r;
    const c: V3 = [ex * r, -0.22 * r, (Math.sqrt(1 - ex * ex) * 0.86) * r - er * 0.25];
    const fwd = norm([0, 0.05, 1]);
    const glint = norm([-0.45, -0.5, 0.75]);
    const start = B.solid.length;
    sphere(B, body, er, sp * 0.7, d => {
      if (d[2] < -0.1) return null;
      if (dot(d, glint) > 0.955) return { mat: M.eye, alb: 1, flags: F.emissive | F.eye };
      if (dot(d, fwd) > 0.76) return { mat: M.pupil, alb: 0.55, flags: F.eye };
      return { mat: M.eye, alb: 0.72, flags: F.eye };
    });
    // Move the eye just placed (round the origin) out to its spot.
    for (let i = start; i < B.solid.length; i += 11) { B.solid[i] += c[0]; B.solid[i + 1] += c[1]; B.solid[i + 2] += c[2]; }
  }
  // Antennae: a curving stalk to a glowing tip, swaying.
  for (const ax of twin ? [-0.32, 0.32] : [0]) {
    const lean = ax === 0 ? (rand() - 0.5) * 0.5 : ax * 0.9;
    const tip: V3 = [ax * r + lean * r, -1.72 * r, 0.06 * r];
    const steps = Math.ceil((0.9 * r) / sp) + 1;
    for (let i = 0; i <= steps; i++) {
      const u = i / steps;
      const p: V3 = [ax * r + lean * r * u * u, -(0.9 + 0.75 * u) * r, 0.06 * r * u];
      B.surfel(p, [0, 0, 1], sp * 0.9, mat, 0.45, body, F.wobble | F.twoSided);
    }
    const tipStart = B.solid.length;
    sphere(B, body, 0.17 * r, sp * 0.7, () => ({ mat: M.light, alb: 0.85, flags: F.emissive | F.wobble }));
    for (let i = tipStart; i < B.solid.length; i += 11) { B.solid[i] += tip[0]; B.solid[i + 1] += tip[1]; B.solid[i + 2] += tip[2]; }
    B.glowAt(tip, r * 0.55, [0.7, 0.55, 0.25], body, G.wobble | G.flicker, rand());
  }
  // Two stubby feet.
  for (const fx of [-0.4, 0.4]) {
    const start = B.solid.length;
    sphere(B, body, 0.24 * r, sp * 0.8, () => ({ mat, alb: 0.38 }));
    for (let i = start; i < B.solid.length; i += 11) { B.solid[i] += fx * r; B.solid[i + 1] += 0.84 * r; B.solid[i + 2] += 0.14 * r; }
  }
  // Arms: three little beads each, their own bodies so they can wave.
  const arms = [-1, 1].map(side => {
    const arm = B.body({ kind: 'arm', name: 'arm', pos: [0, 0, 0], attach: { parent: body, offset: [side * 0.86 * r, 0.12 * r, 0.06 * r] } });
    for (const u of [0.15, 0.5, 0.85]) {
      const start = B.solid.length;
      sphere(B, arm, 0.15 * r, sp * 0.8, () => ({ mat, alb: 0.5 }));
      for (let i = start; i < B.solid.length; i += 11) { B.solid[i] += side * u * 0.42 * r; B.solid[i + 1] += u * 0.2 * r; }
    }
    return arm;
  }) as [number, number];
  return { body, arms };
};

const newBlip = (body: number, arms: [number, number], r: number, colony: number, rock: number, rand: () => number): Blip => ({
  body, arms, r, colony, rock, mode: 'sit', t: 0, wait: 0.5 + rand() * 4, from: [0, 0, 0], to: -1, dur: HOP_TIME, pos: [0, 0, 0],
  sq: 0, sqv: 0, yaw: 0, pitch: 0, lookYaw: (rand() - 0.5) * 0.8, lookPitch: 0, lookTimer: rand() * 3, blinkIn: rand() * 4, blinking: 0,
  wave: 0, flip: 0, flipDir: 1, phase: rand() * 6, saucer: -1, chase: -1, tagCool: 0, cover: 0,
});

/** An open-top saucer: a metal hull with a bright rim, chasing lights, an engine glow beneath, a pink pilot, and its beam. */
const buildSaucer = (B: Builder, ctx: Ctx, pos: V3, R: number, rand: () => number, blips: Blip[]) => {
  const sp = ctx.sp(pos[2]) * 0.55;
  const body = B.body({ kind: 'saucer', name: 'saucer', pos, radius: R * 1.2 });
  const N = Math.round((4 * Math.PI * R * R * 0.62) / (sp * sp));
  const FLAT = 0.32;
  for (let i = 0; i < N; i++) {
    const y = 1 - (2 * (i + 0.5)) / N;
    const rr = Math.sqrt(1 - y * y);
    const a = i * Math.PI * (3 - Math.sqrt(5));
    const d: V3 = [Math.cos(a) * rr, y, Math.sin(a) * rr];
    const n = norm([d[0], d[1] / FLAT, d[2]]);
    let mat: number = M.metal;
    let alb = d[1] < 0 ? 0.62 : 0.34;
    let flags = 0;
    if (Math.abs(d[1]) < 0.13) alb = 0.86;
    if (d[1] > 0.86) { mat = M.teal; alb = 0.8; flags = F.emissive; }
    if (d[1] < -0.55 && d[1] > -0.7) alb = 0.4;
    B.surfel([d[0] * R, d[1] * R * FLAT, d[2] * R], n, sp * 0.85, mat, alb, body, flags);
  }
  // The cockpit's rim.
  const rimSteps = Math.round((2 * Math.PI * 0.46 * R) / sp);
  for (let i = 0; i < rimSteps; i++) {
    const a = (i / rimSteps) * Math.PI * 2;
    for (const h of [0, 0.06, 0.12]) B.surfel([Math.cos(a) * 0.46 * R, -(0.28 + h) * R, Math.sin(a) * 0.46 * R], norm([Math.cos(a), -0.3, Math.sin(a)]), sp * 0.85, M.metal, 0.75 - h, body, 0);
  }
  // Chasing lights round the rim.
  const LIGHTS = 12;
  for (let l = 0; l < LIGHTS; l++) {
    const a = (l / LIGHTS) * Math.PI * 2;
    const start = B.solid.length;
    sphere(B, body, 0.075 * R, sp * 0.5, () => ({ mat: M.light, alb: l / LIGHTS, flags: F.emissive | F.light }));
    for (let i = start; i < B.solid.length; i += 11) { B.solid[i] += Math.cos(a) * R * 1.01; B.solid[i + 1] += 0.02 * R; B.solid[i + 2] += Math.sin(a) * R * 1.01; }
  }
  B.glowAt([0, 0.3 * R, 0], R * 0.9, [0.15, 0.55, 0.5], body, G.flicker, rand());
  // The pilot, sitting in the cockpit.
  const pr = 0.4 * R;
  const pilotParts = buildBlip(B, ctx, pr, pos[2], M.pink, rand, { parent: body, offset: [0, -0.5 * R, 0] });
  const pilot = blips.length;
  blips.push(newBlip(pilotParts.body, pilotParts.arms, pr, -1, -1, rand));
  // The beam: its own body, pointing straight down from the hull.
  const beam = B.body({ kind: 'beam', name: 'beam', pos: [0, 0, 0], base: rotZ(Math.PI / 2), attach: { parent: body, offset: [0, 0.3 * R, 0] }, params: [0, 0, 0, 0] });
  const len = R * BEAM_LENGTH;
  for (let i = 0; i < 34; i++) {
    B.glowAt([0, (rand() - 0.5) * R * 0.5, (rand() - 0.5) * R * 0.5], R * 0.32, [0.35, 0.95, 0.7], beam, G.stream | G.beam, rand(), len);
  }
  for (let i = 0; i < 9; i++) {
    const u = i / 8;
    B.glowAt([u * len, 0, 0], R * (0.35 + u * 0.75), [0.1, 0.32, 0.24], beam, G.beam, rand());
  }
  return { body, beam, pilot };
};

// ------------------------------------------------------------ populating ---

export const populateAliens = (B: Builder, ctx: Ctx): AlienLife => {
  const { rand, at, k, s, pageH } = ctx;
  const colonies: Colony[] = [];
  const blips: Blip[] = [];
  const saucers: Saucer[] = [];

  // Colonies down the margins, the first beside the hero so they're there on arrival.
  const count = Math.max(2, Math.round((pageH - 400) / 1600) + 1);
  for (let c = 0; c < count; c++) {
    const y = c === 0 ? 520 : 520 + c * 1600 + (rand() - 0.5) * 300;
    if (y > pageH - 200) break;
    // The margin across from the nearest planet, so the two don't pile up.
    const nearest = ctx.planets.map(i => B.bodies[i]).sort((a, b) => Math.abs(a.pos[1] - y) - Math.abs(b.pos[1] - y))[0];
    const left = c === 0 || !nearest || Math.abs(nearest.pos[1] - y) > 900 ? c % 2 === 0 : nearest.pos[0] > ctx.viewW / 2;
    const z = -rand() * 0.08 * ctx.f;
    const kz = k(z);
    const anchor = at(left ? 0.075 : 0.885, y, z);
    const rocks: Rock[] = [];
    const spots: [number, number][] = [];
    for (let tries = 0; spots.length < 5 && tries < 80; tries++) {
      const dx = (rand() - 0.5) * 170, dy = (rand() - 0.5) * 420;
      if (spots.every(([x, yy]) => Math.hypot(x - dx, yy - dy) > 105)) spots.push([dx, dy]);
    }
    const colony = colonies.length;
    for (const [dx, dy] of spots) {
      const R = (30 + rand() * 10) * s * kz;
      const body = B.body({
        kind: 'rock', name: 'rock', pos: [anchor[0] + dx * s * kz, anchor[1] + dy * s, z + (rand() - 0.5) * 30], radius: R * 1.3,
        base: rotZ((rand() - 0.5) * 0.4), bob: { amp: 5 * s * kz, rate: 0.35 + rand() * 0.25, phase: rand() * 6 },
      });
      lumpy(B, body, R, ctx.sp(z) * 0.7, ctx.seed * 13 + body, rand() < 0.4 ? M.rust : M.rock, 0.22);
      rocks.push({ body, r: R, occupant: -1 });
    }
    colonies.push({ rocks, y });
    const residents = Math.min(rocks.length - 1, 3);
    for (let i = 0; i < residents; i++) {
      const r = (27 + rand() * 5) * s * kz;
      const colours = [M.blip, M.blip, M.pink, M.teal, M.violet];
      const mat = colours[Math.floor(rand() * colours.length)];
      const parts = buildBlip(B, ctx, r, z, mat, rand);
      rocks[i].occupant = blips.length;
      blips.push(newBlip(parts.body, parts.arms, r, colony, i, rand));
    }
  }

  // Saucers, roughly one per screenful or two; the first starts over the hero's colony.
  const nSaucers = Math.max(1, Math.round(pageH / 3200));
  for (let i = 0; i < nSaucers; i++) {
    const startColony = i === 0 ? 0 : -1;
    const startY = i === 0 ? colonies[0]?.y ?? 500 : rand() * pageH;
    const pos = at(i === 0 ? 0.12 : rand(), startY - 260, 0);
    const R = 50 * s;
    const parts = buildSaucer(B, ctx, pos, R, rand, blips);
    saucers.push({
      ...parts, R, mode: startColony >= 0 ? 'hover' : 'fly', t: startColony >= 0 ? 0.8 : 0, dur: startColony >= 0 ? 14 : 5,
      from: pos, pos, target: startColony >= 0 ? { kind: 'colony', index: 0 } : { kind: 'planet', index: Math.floor(rand() * ctx.planets.length) },
      beamOn: 0, lifting: -1, bank: 0, happy: 0,
    });
  }
  const garden = plantGarden(B, ctx, blips);
  return { colonies, blips, saucers, garden };
};

/** The garden moon: a grey moon in a margin where two blips with watering cans grow glowing flowers. */
const plantGarden = (B: Builder, ctx: Ctx, blips: Blip[]): Garden | null => {
  const { rand, at, k, s } = ctx;
  const y = Math.min(ctx.pageH * 0.4, 1550);
  if (y < 900) return null;
  const nearest = ctx.planets.map(i => B.bodies[i]).sort((a, b) => Math.abs(a.pos[1] - y) - Math.abs(b.pos[1] - y))[0];
  const left = nearest ? nearest.pos[0] > ctx.viewW / 2 : false;
  const z = -0.05 * ctx.f;
  const kz = k(z);
  const R = 82 * s * kz;
  const moon = B.body({ kind: 'gardenmoon', name: 'garden moon', pos: at(left ? 0.09 : 0.9, y, z), radius: R });
  const craters = Array.from({ length: 10 }, () => ({ c: norm([rand() - 0.5, rand() - 0.5, rand() - 0.5]), r: 0.12 + rand() * 0.2 }));
  sphere(B, moon, R, ctx.sp(z) * 0.7, d => {
    let alb = 0.5 + (Math.sin(d[0] * 7 + 1) * Math.sin(d[1] * 5) * Math.sin(d[2] * 6)) * 0.12;
    for (const c of craters) { const a = Math.acos(Math.min(1, dot(d, c.c))) / c.r; if (a < 1) alb -= 0.14; else if (a < 1.3) alb += 0.08; }
    return { mat: M.moon, alb };
  });

  // Flower beds over the moon's top and front, where they can be seen.
  const flowers: Flower[] = [];
  const fr = 26 * s * kz;
  const sp = ctx.sp(z) * 0.45;
  const blooms = [M.pink, M.light, M.teal, M.violet, M.pink];
  const glowOf: Record<number, V3> = { [M.pink]: [1, 0.4, 0.7], [M.light]: [1, 0.85, 0.35], [M.teal]: [0.3, 1, 0.75], [M.violet]: [0.7, 0.45, 1] };
  for (let tries = 0; flowers.length < 7 && tries < 300; tries++) {
    const n = norm([(rand() - 0.5) * 2.2, -1, 0.15 + rand() * 0.6]);
    if (n[1] > -0.38 || flowers.some(f => dot(f.n, n) > Math.cos(0.3))) continue;
    const body = B.body({ kind: 'flower', name: 'flower', pos: [0, -1e6, 0], params: [0.05, 0, 0, rand() * 6] });
    const steps = Math.ceil(fr / sp);
    for (let i = 0; i <= steps; i++) B.surfel([Math.sin(i / steps * 2) * fr * 0.05, -(i / steps) * fr, 0], [0, 0, 1], sp * 0.9, M.land, 0.55, body, F.twoSided | F.wobble);
    for (const [lx, ly] of [[-0.22, -0.38], [0.22, -0.55]]) {
      const start = B.solid.length;
      sphere(B, body, 0.17 * fr, sp * 0.7, () => ({ mat: M.land, alb: 0.62 }));
      for (let i = start; i < B.solid.length; i += 11) { B.solid[i] += lx * fr; B.solid[i + 1] += ly * fr; }
    }
    const mat = blooms[flowers.length % blooms.length];
    const start = B.solid.length;
    sphere(B, body, 0.3 * fr, sp * 0.6, d => ({ mat, alb: dot(d, norm([-0.4, -0.6, 0.7])) > 0.6 ? 1 : 0.7, flags: F.emissive | F.wobble }));
    for (let i = start; i < B.solid.length; i += 11) B.solid[i + 1] -= fr;
    B.glowAt([0, -fr, 0], fr * 1.2, (glowOf[mat] ?? [1, 1, 1]).map(c => c * 0.45) as V3, body, G.gate | G.wobble, rand());
    // A few start in bloom, so the garden is something on arrival.
    const blooming = flowers.length % 3 === 0;
    flowers.push({ body, n, g: blooming ? 1 : 0, state: blooming ? 'bloom' : 'bare', life: 20 + rand() * 40 });
  }

  const gardeners: Gardener[] = [];
  for (const mat of [M.blip, M.teal]) {
    const r = 22 * s * kz;
    const parts = buildBlip(B, ctx, r, z, mat, rand);
    const blip = blips.length;
    blips.push({ ...newBlip(parts.body, parts.arms, r, -2, -1, rand), mode: 'sit' });
    // A watering can in its right hand, its spout pouring a stream when tipped.
    const can = B.body({ kind: 'can', name: 'watering can', pos: [0, 0, 0], attach: { parent: parts.arms[1], offset: [0.48 * r, 0.24 * r, 0.14 * r] } });
    sphere(B, can, 0.21 * r, sp * 0.6, d => ({ mat: M.metal, alb: d[1] < -0.6 ? 0.9 : 0.6 }));
    for (let i = 0; i < 5; i++) B.surfel([0.14 * r + i * 0.07 * r, -0.04 * r - i * 0.045 * r, 0], [0, 0, 1], sp * 0.8, M.metal, 0.7, can, F.twoSided);
    const water = B.body({ kind: 'water', name: 'water', pos: [0, 0, 0], base: rotZ(1.15), attach: { parent: can, offset: [0.44 * r, -0.24 * r, 0] }, params: [0, 0, 0, 0] });
    for (let i = 0; i < 16; i++) B.glowAt([0, (rand() - 0.5) * r * 0.06, (rand() - 0.5) * r * 0.06], r * 0.08, [0.45, 0.75, 1], water, G.stream | G.gate, rand(), r * 1.1);
    const n = norm([(rand() - 0.5) * 0.9, -1, 0.35]);
    gardeners.push({ blip, n, target: -1, mode: 'admire', t: 1 + rand() * 2, can, water, pour: 0, heading: 0 });
  }
  return { moon, R, flowers, gardeners };
};

// ------------------------------------------------------------- behaviour ---

const screenOf = (scene: SpaceScene, cam: SpaceCamera, w: V3) => toScreen(scene, cam, w);

const rockTop = (scene: SpaceScene, rock: Rock, blipR: number, t: number): V3 => {
  const c = centreAt(scene, rock.body, t);
  return [c[0], c[1] - rock.r * 0.9 - blipR * 0.95, c[2]];
};

/** Where a saucer hovers for its target, and whether that target is a colony. */
const hoverPoint = (scene: SpaceScene, sc: Saucer, t: number): V3 => {
  const { target } = sc;
  if (target.kind === 'colony') {
    const col = scene.life.colonies[target.index];
    const cs = col.rocks.map(r => centreAt(scene, r.body, t));
    const x = cs.reduce((m, c) => m + c[0], 0) / cs.length;
    const top = Math.min(...cs.map((c, i) => c[1] - col.rocks[i].r));
    return [x, top - sc.R * (BEAM_LENGTH - 0.6), cs[0][2]];
  }
  const pl = scene.bodies[target.index];
  const c = centreAt(scene, target.index, t);
  return [c[0], c[1] - pl.radius - sc.R * (BEAM_LENGTH - 1.2), c[2] + pl.radius * 0.2];
};

const pickTarget = (scene: SpaceScene, sc: Saucer): Saucer['target'] => {
  const { colonies } = scene.life;
  const planets = scene.bodies.map((b, i) => (b.kind === 'planet' ? i : -1)).filter(i => i >= 0);
  const near = (y: number) => Math.abs(y - sc.pos[1]) < 2000;
  const options: Saucer['target'][] = [
    ...colonies.map((c, i) => ({ kind: 'colony' as const, index: i, y: c.y })).filter(o => near(o.y)),
    ...colonies.map((c, i) => ({ kind: 'colony' as const, index: i, y: c.y })).filter(o => near(o.y)),
    ...planets.map(i => ({ kind: 'planet' as const, index: i, y: scene.bodies[i].pos[1] })).filter(o => near(o.y)),
  ].filter(o => !(o.kind === sc.target.kind && o.index === sc.target.index));
  if (!options.length) return planets.length ? { kind: 'planet', index: planets[Math.floor(Math.random() * planets.length)] } : sc.target;
  const o = options[Math.floor(Math.random() * options.length)];
  return { kind: o.kind, index: o.index };
};

/** Moves every blip and saucer on by `dt` seconds. `pointer` is the cursor in the window, if there is one. */
export const stepAliens = (scene: SpaceScene, t: number, dt: number, cam: SpaceCamera, pointer: { x: number; y: number } | null) => {
  const { life, bodies } = scene;
  const f = scene.focal;

  // Saucers first, so the blips they lift know where the beam is.
  life.saucers.forEach((sc, si) => {
    sc.t += dt;
    const hover = hoverPoint(scene, sc, t);
    if (sc.mode === 'fly') {
      const u = clamp(sc.t / sc.dur, 0, 1);
      const e = ease(u);
      const prev = sc.pos;
      sc.pos = add(lerp3(sc.from, hover, e), [0, -Math.sin(Math.PI * u) * 120, Math.sin(Math.PI * u) * 0.3 * f]);
      const vx = dt > 0 ? (sc.pos[0] - prev[0]) / dt : 0;
      sc.bank += (clamp(-vx * 0.0025, -0.5, 0.5) - sc.bank) * Math.min(1, dt * 4);
      if (u >= 1) { sc.mode = 'hover'; sc.t = 0; sc.dur = 6 + Math.random() * 4; }
    } else {
      sc.pos = add(hover, [Math.sin(t * 0.9 + si) * 6, Math.sin(t * 1.7 + si) * 5, 0]);
      sc.bank *= 1 - Math.min(1, dt * 3);
      const on = sc.t > 1 && sc.t < sc.dur - 1.2;
      sc.beamOn += ((on ? 1 : 0) - sc.beamOn) * Math.min(1, dt * 3);
      // Over a colony, the beam lifts one of its blips.
      if (on && sc.lifting < 0 && sc.target.kind === 'colony' && sc.t > 1.6) {
        const pick = life.blips.findIndex(b => b.colony === sc.target.index && b.mode === 'sit');
        if (pick >= 0) { const b = life.blips[pick]; b.mode = 'beamed'; b.t = 0; b.saucer = si; b.from = b.pos; sc.lifting = pick; }
      }
      if (!on && sc.lifting >= 0) {
        const b = life.blips[sc.lifting];
        if (b.mode === 'beamed') { b.mode = 'falling'; b.t = 0; b.from = b.pos; }
        sc.lifting = -1;
      }
      if (sc.t >= sc.dur) {
        sc.mode = 'fly'; sc.t = 0; sc.from = sc.pos;
        sc.target = pickTarget(scene, sc);
        const to = hoverPoint(scene, sc, t);
        sc.dur = clamp(Math.hypot(to[0] - sc.pos[0], to[1] - sc.pos[1], to[2] - sc.pos[2]) / 230, 3, 9);
      }
    }
    // A wiggle of delight when the cursor comes close.
    const [px, py] = screenOf(scene, cam, sc.pos);
    const near = pointer && Math.hypot(pointer.x - px, pointer.y - py) < NOTICE_PX * 1.2;
    sc.happy += ((near ? 1 : 0) - sc.happy) * Math.min(1, dt * 3);
    const wiggle = Math.sin(t * 9) * 0.12 * sc.happy;
    bodies[sc.body].live = { c: sc.pos, rot: mul3(rotZ(sc.bank + wiggle), rotX(-0.28)) };
    bodies[sc.beam].params = [0, 0, sc.beamOn, 0];
  });

  const garden = life.garden;
  if (garden) stepGarden(scene, garden, dt);
  const shower = scene.events.shower > 0;

  for (const b of life.blips) {
    b.t += dt;
    const body = bodies[b.body];
    const pilot = b.colony === -1;
    const gardener = b.colony === -2 && garden ? garden.gardeners.find(g => g.blip === life.blips.indexOf(b)) ?? null : null;
    let basis: number[] | null = null;
    if (gardener && garden) {
      const mc = centreAt(scene, garden.moon, t);
      const step = gardener.mode === 'walk' ? Math.abs(Math.sin(t * 9 + b.phase)) * b.r * 0.35 : 0;
      const lift = garden.R + b.r * 0.95 + step;
      b.pos = [mc[0] + gardener.n[0] * lift, mc[1] + gardener.n[1] * lift, mc[2] + gardener.n[2] * lift];
      basis = uprightOn(gardener.n);
    }
    let home: V3 = b.pos;
    let airborne = false;
    let handsUp = 0;

    if (!pilot && !gardener) {
      const col = life.colonies[b.colony];
      home = rockTop(scene, col.rocks[b.rock], b.r, t);
      if (b.mode === 'sit') {
        b.pos = home;
        b.wait -= dt;
        b.tagCool -= dt;
        // Tag: with the cursor about, hop to whichever free rock is nearest it.
        b.chase = -1;
        if (pointer && !shower) {
          const at = (i: number) => { const p = screenOf(scene, cam, centreAt(scene, col.rocks[i].body, t)); return Math.hypot(p[0] - pointer.x, p[1] - pointer.y); };
          const mine = at(b.rock);
          let best = -1, bestD = Math.min(mine - 45, 360);
          col.rocks.forEach((r, i) => { if (r.occupant < 0) { const d = at(i); if (d < bestD) { bestD = d; best = i; } } });
          if (best >= 0) { b.chase = best; b.wait = Math.min(b.wait, 0.15 + Math.random() * 0.35); }
          // Touched: a happy flip on the spot.
          const [bx, by] = screenOf(scene, cam, b.pos);
          const reach = b.r * scene.focal / (scene.focal - b.pos[2]);
          if (b.tagCool <= 0 && Math.hypot(bx - pointer.x, by - pointer.y) < reach) {
            b.tagCool = 2.5; b.to = b.rock; b.mode = 'crouch'; b.t = 0;
          }
        }
        if (b.mode === 'sit' && b.wait <= 0) {
          const free = col.rocks.map((r, i) => (r.occupant < 0 ? i : -1)).filter(i => i >= 0);
          if (free.length) {
            b.to = b.chase >= 0 && col.rocks[b.chase].occupant < 0 ? b.chase : free[Math.floor(Math.random() * free.length)];
            col.rocks[b.to].occupant = life.blips.indexOf(b);
            b.mode = 'crouch';
            b.t = 0;
          } else b.wait = 1 + Math.random() * 2;
        }
      } else if (b.mode === 'crouch') {
        b.pos = home;
        b.sq += (0.32 - b.sq) * Math.min(1, dt * 14);
        b.sqv = 0;
        if (b.t > 0.2) {
          b.mode = 'hop'; b.t = 0; b.from = home; b.sq = -0.28; b.sqv = 0;
          const inPlace = b.to === b.rock;
          if (!inPlace) col.rocks[b.rock].occupant = -1;
          b.flip = 0;
          b.flipDir = inPlace || Math.random() < 0.3 ? (Math.random() < 0.5 ? -1 : 1) : 0;
        }
      } else if (b.mode === 'hop') {
        const u = clamp(b.t / HOP_TIME, 0, 1);
        const dest = rockTop(scene, col.rocks[b.to], b.r, t);
        b.pos = add(lerp3(b.from, dest, ease(u)), [0, -4 * u * (1 - u) * b.r * HOP_HEIGHT, 0]);
        b.flip = b.flipDir * ease(u) * Math.PI * 2;
        airborne = true;
        handsUp = 0.7;
        if (u >= 1) {
          b.rock = b.to; b.mode = 'sit'; b.t = 0; b.flip = 0;
          b.sq = 0.38; b.sqv = 0;
          b.wait = b.chase >= 0 ? 0.2 : 2 + Math.random() * 6;
        }
      } else if (b.mode === 'beamed') {
        const sc = life.saucers[b.saucer];
        const top: V3 = [sc.pos[0], sc.pos[1] + sc.R * 1.6 + b.r, sc.pos[2]];
        const u = ease(clamp(b.t / 2.2, 0, 1));
        b.pos = add(lerp3(b.from, lerp3(home, top, 0.72), u), [Math.sin(t * 2.2) * b.r * 0.3, Math.sin(t * 3) * b.r * 0.15, 0]);
        b.flip = Math.sin(t * 1.6) * 0.5;
        airborne = true;
        handsUp = 1;
      } else if (b.mode === 'falling') {
        const u = clamp(b.t / 1.4, 0, 1);
        b.pos = lerp3(b.from, home, u * u);
        b.flip *= 1 - Math.min(1, dt * 3);
        airborne = true;
        handsUp = 0.8;
        if (u >= 1) { b.mode = 'sit'; b.t = 0; b.flip = 0; b.sq = 0.4; b.sqv = 0; b.wait = 2 + Math.random() * 4; }
      }
    }

    // Squash and stretch on a spring, with a little breathing when still.
    if (b.mode !== 'crouch') {
      b.sqv += (-160 * b.sq - 9 * b.sqv) * dt;
      b.sq += b.sqv * dt;
    }
    const breathe = airborne ? 0 : Math.sin(t * 2.6 + b.phase) * 0.035;
    const sq = clamp(b.sq + breathe, -0.35, 0.45);

    // Look about, or at the cursor when it's near (and wave).
    const centre = pilot ? (scene.centres?.[b.body] ?? b.pos) : b.pos;
    const [sx, sy] = screenOf(scene, cam, centre);
    const noticed = pointer ? Math.hypot(pointer.x - sx, pointer.y - sy) < NOTICE_PX : false;
    if (noticed && pointer) {
      b.lookYaw = clamp((pointer.x - sx) / 160, -0.75, 0.75);
      b.lookPitch = -clamp((pointer.y - sy) / 220, -0.5, 0.5);
    } else if ((b.lookTimer -= dt) <= 0) {
      b.lookTimer = 1.5 + Math.random() * 3;
      b.lookYaw = Math.random() < 0.5 ? 0 : (Math.random() - 0.5) * 0.9;
      b.lookPitch = (Math.random() - 0.5) * 0.3;
    }
    b.yaw += (b.lookYaw - b.yaw) * Math.min(1, dt * 5);
    b.pitch += (b.lookPitch - b.pitch) * Math.min(1, dt * 5);
    b.wave += ((noticed ? 1 : 0) - b.wave) * Math.min(1, dt * 5);

    // Blinks, now and then a double.
    if (b.blinking > 0) b.blinking -= dt;
    else if ((b.blinkIn -= dt) <= 0) { b.blinking = 0.13; b.blinkIn = Math.random() < 0.2 ? 0.28 : 2 + Math.random() * 4; }
    // Meteors overhead: hands over eyes, squeezed shut, with the odd peek.
    b.cover += ((shower ? 1 : 0) - b.cover) * Math.min(1, dt * 4);
    const peeking = Math.sin(t * 1.1 + b.phase * 3) > 0.88;
    const shut = b.blinking > 0 || (b.cover > 0.5 && !peeking);

    if (gardener) {
      // Turned towards where it's going, or towards the flower it's watering.
      b.yaw += (gardener.heading - b.yaw) * Math.min(1, dt * 4);
      b.flip = gardener.mode === 'water' ? -0.22 * Math.sign(gardener.heading || 1) : 0;
    }
    let rot = mul3(rotY(b.yaw), mul3(rotX(b.pitch), rotZ(b.flip)));
    if (basis) rot = mul3(basis, rot);
    if (pilot) body.live = { c: [0, 0, 0], rot };
    else body.live = { c: [b.pos[0], b.pos[1] + (airborne ? 0 : b.r * sq * 0.9), b.pos[2]], rot };
    body.scale = [1 + sq * 0.55, 1 - sq, 1 + sq * 0.55];
    const wob = 0.1 + Math.min(0.5, Math.abs(b.sqv) * 0.08) + (airborne ? 0.25 : 0);
    body.params = [wob, b.r * 0.88, shut ? 1 : 0, b.phase];

    // Arms: a gentle sway, up in the air while flying, and a wave (with the right) when noticed.
    const sway = Math.sin(t * 2 + b.phase) * 0.15;
    const up = Math.max(handsUp, 0);
    const waveR = b.wave * (1.5 + Math.sin(t * 13) * 0.55);
    let left = rotZ(sway + up * 1.6);
    let right = rotZ(-sway - Math.max(up * 1.6, waveR));
    if (gardener) {
      // The can stays in the right hand; the left does the waving.
      left = rotZ(sway + waveR);
      right = rotZ(-0.35 - gardener.pour * 0.55);
    }
    if (b.cover > 0.02) {
      left = mul3(rotY(b.cover * 1.0), rotZ(b.cover * 2.3));
      right = mul3(rotY(-b.cover * 1.0), rotZ(-b.cover * 2.3));
    }
    bodies[b.arms[0]].live = { c: [0, 0, 0], rot: left };
    bodies[b.arms[1]].live = { c: [0, 0, 0], rot: right };
  }
};

const angle = (a: V3, b: V3) => Math.acos(Math.max(-1, Math.min(1, dot(a, b))));

/** The gardeners walk to bare ground, water it until a flower comes up, and admire what they've grown; old flowers wilt. */
const stepGarden = (scene: SpaceScene, garden: Garden, dt: number) => {
  const { bodies } = scene;
  const mc = centreAt(scene, garden.moon, 0);
  for (const fl of garden.flowers) {
    if (fl.state === 'growing') { fl.g = Math.min(1, fl.g + dt / 3.5); if (fl.g >= 1) { fl.state = 'bloom'; fl.life = 35 + Math.random() * 30; } }
    else if (fl.state === 'bloom') { if ((fl.life -= dt) <= 0) fl.state = 'wilting'; }
    else if (fl.state === 'wilting') { fl.g = Math.max(0, fl.g - dt / 4); if (fl.g <= 0) fl.state = 'bare'; }
    const b = bodies[fl.body];
    if (fl.g < 0.03) { b.live = { c: [0, -1e6, 0], rot: b.base }; b.params = [0.05, 0, 0, b.params?.[3] ?? 0]; continue; }
    const grow = fl.state === 'growing' ? 1 - (1 - fl.g) ** 2 : fl.g;
    const droop = fl.state === 'wilting' ? (1 - fl.g) * 0.9 : 0;
    b.live = { c: [mc[0] + fl.n[0] * garden.R, mc[1] + fl.n[1] * garden.R, mc[2] + fl.n[2] * garden.R], rot: mul3(uprightOn(fl.n), rotZ(droop)) };
    b.scale = [grow, grow, grow];
    b.params = [0.05, 0, grow * (fl.state === 'wilting' ? 0.5 : 1), b.params?.[3] ?? 0];
  }

  for (const gd of garden.gardeners) {
    gd.t -= dt;
    const tended = garden.gardeners.filter(o => o !== gd).map(o => o.target);
    const fl = gd.target >= 0 ? garden.flowers[gd.target] : null;
    // Stand just beside the flower, on the side it came from.
    const aim = (f: Flower): V3 => {
      const side = norm([gd.n[0] - f.n[0], gd.n[1] - f.n[1], gd.n[2] - f.n[2]]);
      return norm([f.n[0] + side[0] * 0.16, f.n[1] + side[1] * 0.16, f.n[2] + side[2] * 0.16]);
    };
    if (gd.mode === 'walk' && fl) {
      const to = aim(fl);
      const a = angle(gd.n, to);
      const stepA = 0.32 * dt;
      if (a <= stepA) {
        gd.n = to;
        gd.mode = fl.state === 'bare' ? 'water' : 'admire';
        gd.t = fl.state === 'bare' ? 2.6 : 2.5;
      } else {
        const u = stepA / a;
        gd.n = norm([gd.n[0] + (to[0] - gd.n[0]) * u, gd.n[1] + (to[1] - gd.n[1]) * u, gd.n[2] + (to[2] - gd.n[2]) * u]);
        gd.heading = Math.sign(to[0] - gd.n[0]) * 0.75;
      }
    } else if (gd.mode === 'water' && fl) {
      gd.heading = Math.sign(fl.n[0] - gd.n[0]) * 0.55;
      if (gd.t <= 0) { gd.mode = 'admire'; gd.t = 1.5 + Math.random() * 2; if (fl.state === 'bare') { fl.state = 'growing'; fl.g = 0.04; } }
    } else if (gd.t <= 0) {
      // Next: bare ground first, else go and admire a bloom.
      const bare = garden.flowers.map((f, i) => (f.state === 'bare' && !tended.includes(i) ? i : -1)).filter(i => i >= 0);
      const any = garden.flowers.map((f, i) => (!tended.includes(i) ? i : -1)).filter(i => i >= 0);
      const pool = bare.length ? bare : any;
      gd.target = pool.length ? pool[Math.floor(Math.random() * pool.length)] : -1;
      gd.mode = gd.target >= 0 ? 'walk' : 'admire';
      gd.t = 2;
    }
    gd.pour += ((gd.mode === 'water' && gd.t < 2.2 ? 1 : 0) - gd.pour) * Math.min(1, dt * 5);
    bodies[gd.water].params = [0, 0, gd.pour, 0];
  }
};

