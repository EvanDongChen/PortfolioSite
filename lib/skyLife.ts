import { V3, dot, norm, rotZ, rotX, cross } from './space';
import {
  Builder, F, G, Island, M, SkyCamera, SkyScene, ellipsoid, frameAlong, fromScreen, sphere, toScreen, tube,
} from './sky';
import { Critters, populateCritters, stepCritters } from './skyCritters';

/**
 * The sky's creatures. The stars are two long dragons in the old Chinese manner
 * (serpents' bodies of scaled segments with plated bellies, crests of spines and
 * four clawed legs, antlered heads with long whiskers and flowing manes): a red
 * and gold one and an azure one with a white belly, playing with one flaming
 * pearl as the two dragons of the old paintings do. The red one goes straight
 * for it, the azure one circles round it, so they spiral about each other. The pearl wanders between islands,
 * circles one now and then (so the dragon loops round it, passing behind and in
 * front), follows the cursor when it moves, and darts off whenever the dragon's
 * jaws come close, which the dragon answers with a barrel roll.
 *
 * Built as surfels like everything else; behaviour (`stepLife`) runs each
 * frame on the main thread and moves the bodies through `live`.
 */

const SEGMENTS = 44;
/** Space between body segments along the trail, in dragon radii. */
const GAP = 1.0;

/** A dragon's colours, as materials. */
export interface Coat { body: number; belly: number; fringe: number; crest: number; root: number; horn: number; mane: [number, number]; whisker: number; claw: number; ridge: number; iris: number; mouth: number }

/** Built as functions: sky.ts and this module import each other, so nothing imported is touched at load. */
const COATS = (): Coat[] => [
  { body: M.dragon, belly: M.gold, fringe: M.gold, crest: M.cream, root: M.gold, horn: M.gold, mane: [M.gold, M.cream], whisker: M.cream, claw: M.cream, ridge: M.gold, iris: M.gold, mouth: M.coral },
  { body: M.azure, belly: M.cloud, fringe: M.blossom, crest: M.cloud, root: M.crystal, horn: M.cream, mane: [M.cloud, M.crystal], whisker: M.cloud, claw: M.cloud, ridge: M.crystal, iris: M.gold, mouth: M.blossom },
];

export interface Dragon {
  coat: Coat;
  head: number;
  segs: number[];
  legs: { body: number; seg: number; phase: number }[];
  tail: number;
  R: number;
  pos: V3;
  dir: V3;
  speed: number;
  /** The head's path: points with their distance along it, and the roll there. */
  trail: { p: V3; s: number; roll: number }[];
  roll: number;
  /** A barrel roll in progress, 0 to 1 (1: none). */
  spin: number;
  blinkIn: number;
  blinking: number;
  phase: number;
}

export interface Pearl {
  body: number;
  pos: V3;
  vel: V3;
  target: V3;
  mode: 'wander' | 'orbit' | 'cursor' | 'dart';
  t: number;
  dur: number;
  island: number;
  orbitA: number;
}

export interface SkyLife { dragons: Dragon[]; pearl: Pearl; critters: Critters; lastPointer: { x: number; y: number; t: number } | null; time: number }

interface Ctx {
  rand: () => number;
  at: (sx: number, y: number, z: number) => V3;
  k: (z: number) => number;
  sp: (z: number) => number;
  s: number;
  f: number;
  viewW: number;
  viewH: number;
  pageH: number;
  islands: Island[];
  seed: number;
}

const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const scl = (a: V3, k: number): V3 => [a[0] * k, a[1] * k, a[2] * k];
const len = (a: V3) => Math.hypot(a[0], a[1], a[2]);
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

/** Rodrigues: `v` turned by `a` round unit axis `u`. */
const turn = (v: V3, u: V3, a: number): V3 => {
  const c = Math.cos(a), s = Math.sin(a);
  const d = dot(u, v);
  const x = cross(u, v);
  return [v[0] * c + x[0] * s + u[0] * d * (1 - c), v[1] * c + x[1] * s + u[1] * d * (1 - c), v[2] * c + x[2] * s + u[2] * d * (1 - c)];
};

// ------------------------------------------------------------- the dragon ---

/** How thick the body is along its length (0 at the neck, 1 at the tail tip). */
const girth = (u: number) => (u < 0.12 ? 0.78 + u * 1.8 : 1 - Math.max(0, u - 0.35) * 1.0);

/** A body segment: a scaled barrel, red above and gold-plated beneath, with a spine on top. */
const buildSegment = (B: Builder, coat: Coat, r: number, R: number, sp: number, i: number, mane: boolean) => {
  const body = B.body({ kind: 'dragon', name: 'dragon', pos: [0, -1e6, 0], radius: r * 1.6 });
  // Long enough to overlap its neighbours even where the tail thins, so it never parts into beads.
  ellipsoid(B, body, [Math.max(r * 0.82, R * GAP * 0.68), r, r], sp, d => {
    if (d[1] > 0.42) {
      // Belly plates, ridged crosswise.
      const ridge = ((d[0] + 1) * 1.6 + i * 0.5) % 1 < 0.25;
      return { mat: coat.belly, alb: 0.7 + (ridge ? -0.2 : 0.04) };
    }
    // A fringe where the belly meets the scales.
    if (d[1] > 0.3) return { mat: coat.fringe, alb: 0.62 };
    // Scales: offset rows of little scallops.
    const ang = Math.atan2(d[2], -d[1]);
    const row = Math.floor(ang * 2.4);
    const sc = (((d[0] + 1) * 1.8 + row * 0.5 + i * 0.25) % 1 + 1) % 1;
    const edge = sc > 0.72;
    return { mat: coat.body, alb: 0.56 + (edge ? -0.2 : 0.05) - d[1] * 0.12 };
  });
  // The crest: a backward-raked spine, cream with a gold root.
  const h = r * 0.95;
  for (let y = 0; y < h; y += sp * 0.7) {
    const w = (1 - y / h) * r * 0.6;
    for (let x = -w; x <= w * 0.4; x += sp * 0.7) {
      B.surfel([x - y * 0.45, -r * 0.92 - y, 0], [0, 0, 1], sp * 0.85, y < h * 0.35 ? coat.root : coat.crest, 0.6 + y / h * 0.2, body, F.twoSided);
    }
  }
  if (mane) {
    // A tuft of mane, flowing back.
    for (let j = 0; j < 3; j++) {
      ellipsoid(B, body, [r * 0.55, r * 0.22, r * 0.3], sp, d => ({ mat: coat.mane[1], alb: 0.6 - d[1] * 0.2 }), [-r * 0.4 - j * r * 0.25, -r * 0.85 + j * r * 0.08, (j - 1) * r * 0.35]);
    }
  }
  return body;
};

/** A leg: a stout limb with a gold, three-clawed foot, hung below the body. */
const buildLeg = (B: Builder, coat: Coat, r: number, sp: number, seg: number, side: number) => {
  const body = B.body({ kind: 'leg', name: 'leg', pos: [0, 0, 0], attach: { parent: seg, offset: [0, r * 0.55, side * r * 0.75] } });
  ellipsoid(B, body, [r * 0.4, r * 0.72, r * 0.36], sp, d => ({ mat: d[0] > 0.35 ? coat.belly : coat.body, alb: 0.55 - d[1] * 0.1 }), [0, r * 0.55, 0]);
  for (let c = -1; c <= 1; c++) {
    ellipsoid(B, body, [r * 0.34, r * 0.13, r * 0.13], sp, () => ({ mat: coat.claw, alb: 0.8 }), [r * 0.3, r * 1.25, c * r * 0.22]);
  }
  return body;
};

/** The head, facing local +x: antlers, big eyes, snout and open jaw, whiskers and mane trailing back. */
const buildHead = (B: Builder, coat: Coat, R: number, sp: number) => {
  const head = B.body({ kind: 'head', name: 'dragon', pos: [0, -1e6, 0], radius: R * 4, params: [0.07, R * 0.3, 0, 0] });
  const red = (alb: number) => ({ mat: coat.body, alb });
  // Cranium, with heavy brows.
  sphere(B, head, R * 1.15, sp, d => red(0.58 - d[1] * 0.15));
  // Snout, its top gold where the nose ridge runs.
  ellipsoid(B, head, [R * 1.15, R * 0.58, R * 0.72], sp, d => (d[1] < -0.55 && Math.abs(d[2]) < 0.4 ? { mat: coat.ridge, alb: 0.6 } : red(0.6 - d[1] * 0.12)), [R * 1.25, R * 0.12, 0]);
  // A bulb of a nose.
  ellipsoid(B, head, [R * 0.38, R * 0.32, R * 0.55], sp, d => red(0.7 - d[1] * 0.2), [R * 2.3, -R * 0.05, 0]);
  // The lower jaw, dropped a little: cream inside, gold beneath, a row of teeth.
  ellipsoid(B, head, [R * 1.05, R * 0.26, R * 0.6], sp, d => ({ mat: d[1] < 0 ? coat.mouth : coat.belly, alb: 0.55 }), [R * 1.15, R * 0.78, 0]);
  for (const zs of [-1, 1]) {
    for (let t = 0; t < 4; t++) sphere(B, head, R * 0.11, sp, () => ({ mat: M.cream, alb: 0.85 }), [R * (1.4 + t * 0.25), R * 0.52, zs * R * 0.4]);
  }
  // Eyes on either side: white, a gold iris, a dark slit and a glint, under a ridge.
  for (const zs of [-1, 1]) {
    const c: V3 = [R * 0.45, -R * 0.42, zs * R * 0.86];
    sphere(B, head, R * 0.44, sp, d => (d[2] * zs < 0 ? null : { mat: M.eye, alb: 0.8 }), c);
    sphere(B, head, R * 0.3, sp, d => (d[2] * zs < 0.2 ? null : Math.abs(d[0]) < 0.32 ? { mat: M.pupil, alb: 0.3, flags: F.eye } : { mat: coat.iris, alb: 0.75, flags: F.eye }), [c[0] + R * 0.06, c[1] + R * 0.02, c[2] + zs * R * 0.2]);
    sphere(B, head, R * 0.08, sp, () => ({ mat: M.eye, alb: 1, flags: F.emissive | F.eye }), [c[0] + R * 0.15, c[1] - R * 0.12, c[2] + zs * R * 0.46]);
    // The brow ridge.
    ellipsoid(B, head, [R * 0.55, R * 0.16, R * 0.3], sp, () => red(0.72), [c[0] - R * 0.05, c[1] - R * 0.38, c[2] * 0.9]);
  }
  // Antlers: a gold beam sweeping back and up, with two tines.
  const branch = (from: V3, dir: V3, length: number, thick: number) => {
    const to = add(from, scl(norm(dir), length));
    tube(B, head, [from, to], u => thick * (1 - u * 0.45), sp, (u, n) => ({ mat: coat.horn, alb: 0.55 - n[1] * 0.25 + u * 0.15 }));
    return to;
  };
  for (const zs of [-1, 1]) {
    const root: V3 = [-R * 0.1, -R * 0.95, zs * R * 0.5];
    const mid = branch(root, [-0.8, -0.75, zs * 0.25], R * 1.3, R * 0.19);
    branch(mid, [-0.9, -0.2, zs * 0.15], R * 0.85, R * 0.14);
    branch(add(root, [-R * 0.55, -R * 0.5, zs * R * 0.1]), [0.2, -1, zs * 0.2], R * 0.6, R * 0.13);
  }
  // Whiskers: long cream barbels from the snout, sweeping up and back over the head in a wave.
  for (const zs of [-1, 1]) {
    let p: V3 = [R * 2.2, -R * 0.1, zs * R * 0.5];
    let d: V3 = norm([0.6, -1, zs * 0.35]);
    const L = R * 5;
    const path: V3[] = [p];
    for (let u = 0; u < L; u += sp * 0.5) {
      // Curling back over the head: the heading swings from up and forward to behind, with a ripple.
      d = norm(add(d, [-0.05, 0.012 + Math.sin(u / R * 1.6) * 0.025, -zs * 0.01]));
      p = add(p, scl(d, sp * 0.5));
      path.push(p);
    }
    tube(B, head, path, u => R * 0.12 * (1 - u * 0.35), sp, () => ({ mat: coat.whisker, alb: 0.8 }), F.trail);
  }
  // The beard, under the chin.
  for (let j = 0; j < 3; j++) ellipsoid(B, head, [R * 0.5, R * 0.18, R * 0.2], sp, () => ({ mat: coat.whisker, alb: 0.65 }), [R * 0.5 - j * R * 0.35, R * 1.05 + j * R * 0.12, (j - 1) * R * 0.22], F.trail);
  // The mane: separate locks streaming back from the crown like flames, gold and cream in turn.
  for (let j = 0; j < 6; j++) {
    const zc = (j % 2 ? 1 : -1) * R * (0.55 + (j >> 1) * 0.12);
    let p: V3 = [-R * 0.7, -R * (0.6 - (j >> 1) * 0.35), zc];
    let d: V3 = norm([-1, -0.25, zc / R * 0.25]);
    const L = R * (1.9 + (j % 3) * 0.5);
    const path: V3[] = [p];
    for (let u = 0; u < L; u += sp * 0.55) {
      d = norm(add(d, [0, 0.025, 0]));
      p = add(p, scl(d, sp * 0.55));
      path.push(p);
    }
    tube(B, head, path, u => R * 0.2 * (1 - u * 0.7), sp, (_u, n) => ({ mat: coat.mane[j % 2], alb: 0.66 - n[1] * 0.2 }), F.trail);
  }
  return head;
};

/** The tail's end: a flame-like tuft of cream and gold, flicking behind. */
const buildTail = (B: Builder, coat: Coat, R: number, sp: number, parent: number) => {
  const tail = B.body({ kind: 'dragon', name: 'dragon', pos: [0, 0, 0], attach: { parent, offset: [-R * 0.2, 0, 0] }, params: [0.1, 0, 0, 1] });
  for (let j = 0; j < 5; j++) {
    const a = (j / 4 - 0.5) * 2;
    ellipsoid(B, tail, [R * 1.0, R * 0.2, R * 0.26], sp, dd => ({ mat: coat.mane[j % 2], alb: 0.6 - dd[1] * 0.2 }), [-R * 0.9 - Math.abs(a) * R * 0.2, Math.sin(a) * R * 0.5, Math.cos(a) * R * 0.35 - R * 0.1], F.trail);
  }
  return tail;
};

const buildPearl = (B: Builder, R: number, sp: number, rand: () => number) => {
  const body = B.body({ kind: 'pearl', name: 'pearl', pos: [0, -1e6, 0], radius: R * 3 });
  sphere(B, body, R, sp, d => ({ mat: M.pearl, alb: 0.75 - d[1] * 0.2 + d[2] * 0.1, flags: F.emissive }));
  B.glowAt([0, 0, 0], R * 3.2, [0.6, 0.35, 0.4], body, G.flicker, 0.2);
  B.glowAt([0, 0, 0], R * 1.8, [0.9, 0.7, 0.6], body, 0, 0.6);
  // Its flames, licking up and back.
  for (let i = 0; i < 16; i++) {
    const a = rand() * Math.PI * 2;
    B.glowAt([Math.cos(a) * R * 0.9, -R * 0.6 - rand() * R * 0.8, Math.sin(a) * R * 0.9], R * (0.5 + rand() * 0.4), [1, 0.55 + rand() * 0.25, 0.25], body, G.flicker, rand());
  }
  return body;
};

export const populateLife = (B: Builder, ctx: Ctx): SkyLife => {
  const { rand, s, f, viewW, viewH } = ctx;
  const R = 26 * s;
  const sp = ctx.sp(0) * 0.75;
  const z = -0.1 * f;
  // On arrival they're already mid-flight in the opening view, their bodies trailing in waves off the edges.
  const starts: [V3, V3][] = [[ctx.at(0.72, viewH * 0.2, z), [1, 0, 0]], [ctx.at(0.92, viewH * 0.75, z), [-0.3, -1, 0]]];
  const dragons = COATS().map((coat, n): Dragon => {
    // A big head for its body, as the old paintings have it.
    const head = buildHead(B, coat, R * 1.5, sp);
    const segs: number[] = [];
    for (let i = 0; i < SEGMENTS; i++) segs.push(buildSegment(B, coat, R * girth(i / (SEGMENTS - 1)), R, sp, i, i % 9 === 4));
    const legs: Dragon['legs'] = [];
    for (const [seg, phase] of [[6, 0], [27, Math.PI * 0.6]] as const) {
      const r = R * girth(seg / (SEGMENTS - 1));
      for (const side of [-1, 1]) legs.push({ body: buildLeg(B, coat, r, sp, segs[seg], side), seg, phase: phase + (side > 0 ? Math.PI : 0) });
    }
    const tail = buildTail(B, coat, R * girth(1), sp, segs[SEGMENTS - 1]);
    const [start, dir0] = starts[n];
    const dir = norm(dir0);
    const trail: Dragon['trail'] = [];
    const total = (SEGMENTS + 4) * GAP * R;
    const side = norm(cross(dir, [0, 0, 1]));
    for (let u = total; u >= 0; u -= 3) {
      const w = Math.sin(u / (R * 6)) * R * 2.2;
      trail.push({ p: [start[0] - dir[0] * u + side[0] * w, start[1] - dir[1] * u + side[1] * w, z + Math.sin(u / (R * 9)) * R * 3], s: total - u, roll: 0 });
    }
    return {
      coat, head, segs, legs, tail, R,
      pos: [start[0], start[1], z], dir, speed: 160 * s,
      trail, roll: 0, spin: 1, blinkIn: 2 + n, blinking: 0, phase: rand() * 6,
    };
  });
  const pearlBody = buildPearl(B, R * 0.7, sp, rand);
  const pearlPos = ctx.at(0.9, viewH * 0.32, z);
  const pearl: Pearl = { body: pearlBody, pos: pearlPos, vel: [0, 0, 0], target: pearlPos, mode: 'wander', t: 0, dur: 4, island: -1, orbitA: 0 };
  void viewW;
  const critters = populateCritters(B, ctx);
  return { dragons, pearl, critters, lastPointer: null, time: 0 };
};

// -------------------------------------------------------------- behaviour ---

/** The point `back` along the trail behind its newest end, and the roll there. */
const along = (trail: Dragon['trail'], back: number): { p: V3; roll: number } => {
  const end = trail[trail.length - 1].s;
  const target = end - back;
  let lo = 0, hi = trail.length - 1;
  if (target <= trail[0].s) return trail[0];
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (trail[m].s < target) lo = m; else hi = m; }
  const a = trail[lo], b = trail[hi];
  const t = (target - a.s) / Math.max(1e-6, b.s - a.s);
  return { p: [a.p[0] + (b.p[0] - a.p[0]) * t, a.p[1] + (b.p[1] - a.p[1]) * t, a.p[2] + (b.p[2] - a.p[2]) * t], roll: a.roll + (b.roll - a.roll) * t };
};

/** Up, turned round the direction of travel by `roll`. */
const rolledUp = (fwd: V3, roll: number): V3 => turn([0, -1, 0], norm(fwd), roll);

/**
 * Whether a window point lies over the hero's words, which the dragon keeps clear of:
 * the left and middle of the opening view on a desktop, everything below the photo on a phone.
 */
const overHero = (cam: SkyCamera, x: number, y: number) => {
  const py = y + cam.scrollY;
  if (cam.viewW < 640) return py > cam.viewH * 0.36 && py < cam.viewH * 1.1;
  return x > cam.viewW * 0.12 && x < cam.viewW * 0.66 && py < cam.viewH * 0.88;
};

/** A spot in the visitor's view for the pearl to make for: in the gutters or the open sky, at a depth among the islands. */
const viewSpot = (scene: SkyScene, cam: SkyCamera, rand: () => number, from?: V3): V3 => {
  const f = scene.focal;
  const start = from ? toScreen(scene, cam, from) : null;
  let spot: V3 = [0, 0, 0];
  for (let i = 0; i < 16; i++) {
    const z = -(0.02 + rand() * 0.33) * f;
    const side = rand();
    const sx = side < 0.4 ? 0.06 + rand() * 0.16 : side < 0.8 ? 0.78 + rand() * 0.16 : 0.25 + rand() * 0.5;
    const sy = (0.18 + rand() * 0.64) * cam.viewH;
    spot = fromScreen(scene, cam, sx * cam.viewW, sy, z);
    // Not behind the hero's words, nor across them on the way there.
    let clear = !overHero(cam, sx * cam.viewW, sy);
    if (clear && start) {
      for (let k = 1; k < 6 && clear; k++) clear = !overHero(cam, start[0] + (sx * cam.viewW - start[0]) * k / 6, start[1] + (sy - start[1]) * k / 6);
    }
    if (clear) break;
  }
  return spot;
};

const inView = (scene: SkyScene, cam: SkyCamera, p: V3, margin: number) => {
  const [x, y] = toScreen(scene, cam, p);
  return x > -margin && x < cam.viewW + margin && y > -margin && y < cam.viewH + margin;
};

let rng = Math.random;

const stepPearl = (scene: SkyScene, life: SkyLife, dt: number, cam: SkyCamera, pointer: { x: number; y: number } | null) => {
  const { pearl, dragons } = life;
  const dragon = dragons[0];
  const f = scene.focal;
  pearl.t += dt;
  // A moving cursor calls the pearl over; it lingers there a while after the cursor stops.
  if (pointer && (!life.lastPointer || Math.hypot(pointer.x - life.lastPointer.x, pointer.y - life.lastPointer.y) > 3)) {
    life.lastPointer = { x: pointer.x, y: pointer.y, t: life.time };
  }
  const recent = life.lastPointer && pointer && life.time - life.lastPointer.t < 4 && !overHero(cam, pointer.x, pointer.y);
  if (recent && pearl.mode !== 'dart') {
    pearl.mode = 'cursor';
    pearl.target = fromScreen(scene, cam, pointer!.x, pointer!.y, -0.12 * f);
  } else if (pearl.mode === 'cursor') {
    pearl.mode = 'wander'; pearl.t = 0; pearl.dur = 3;
  }
  if (pearl.mode === 'orbit') {
    const isl = scene.islands[pearl.island];
    const c = scene.centres?.[isl.body] ?? scene.bodies[isl.body].pos;
    pearl.orbitA += dt * 0.55;
    const r = isl.R * 1.55;
    pearl.target = [c[0] + Math.cos(pearl.orbitA) * r, c[1] + isl.R * 0.25 + Math.sin(pearl.orbitA * 2) * isl.R * 0.25, c[2] + Math.sin(pearl.orbitA) * r * 0.9];
    if (pearl.t > pearl.dur || !inView(scene, cam, c, 200)) { pearl.mode = 'wander'; pearl.t = 0; pearl.dur = 2; }
  } else if (pearl.mode !== 'cursor' && (pearl.t > pearl.dur || !inView(scene, cam, pearl.target, -40))) {
    if (pearl.mode === 'dart' && pearl.t < pearl.dur) { /* still darting */ } else {
      // Next: circle an island in view now and then, else make for another spot.
      const near = scene.islands.map((isl, i) => ({ isl, i })).filter(({ isl }) => !isl.far && inView(scene, cam, scene.centres?.[isl.body] ?? scene.bodies[isl.body].pos, -60));
      if (near.length && rng() < 0.45) {
        const pick = near[Math.floor(rng() * near.length)];
        const c = scene.centres?.[pick.isl.body] ?? scene.bodies[pick.isl.body].pos;
        pearl.mode = 'orbit'; pearl.island = pick.i; pearl.t = 0; pearl.dur = 9 + rng() * 5;
        pearl.orbitA = Math.atan2(pearl.pos[2] - c[2], pearl.pos[0] - c[0]);
      } else {
        pearl.mode = 'wander'; pearl.t = 0; pearl.dur = 3 + rng() * 3;
        pearl.target = viewSpot(scene, cam, rng, pearl.pos);
      }
    }
  }
  // Caught (by either): the pearl darts off somewhere far across the view, and the catcher rolls.
  const catcher = dragons.find(d => len(sub(add(d.pos, scl(d.dir, d.R * 2.2)), pearl.pos)) < d.R * 2.4);
  if (catcher && pearl.mode !== 'dart') {
    let best = viewSpot(scene, cam, rng, pearl.pos);
    for (let i = 0; i < 6; i++) { const c = viewSpot(scene, cam, rng, pearl.pos); if (len(sub(c, pearl.pos)) > len(sub(best, pearl.pos))) best = c; }
    pearl.mode = 'dart'; pearl.t = 0; pearl.dur = 2.5; pearl.target = best;
    if (catcher.spin >= 1) catcher.spin = 0;
    if (life.lastPointer) life.lastPointer.t = -99;
  }
  // A spring towards the target, quick when darting, and a little bob as it floats.
  const stiff = pearl.mode === 'dart' ? 5 : pearl.mode === 'cursor' ? 3.2 : 1.4;
  const damp = 2 * Math.sqrt(stiff);
  const d = sub(pearl.target, pearl.pos);
  pearl.vel = add(pearl.vel, scl(sub(scl(d, stiff), scl(pearl.vel, damp)), dt));
  pearl.pos = add(pearl.pos, scl(pearl.vel, dt));
  pearl.pos[2] = clamp(pearl.pos[2], -0.5 * f, 0.18 * f);
  const bob = Math.sin(life.time * 2.3) * dragon.R * 0.3;
  scene.bodies[pearl.body].live = { c: [pearl.pos[0], pearl.pos[1] + bob, pearl.pos[2]], rot: rotZ(life.time * 0.8) };
};

const stepDragon = (scene: SkyScene, life: SkyLife, dr: Dragon, n: number, dt: number, cam: SkyCamera) => {
  const { pearl } = life;
  const t = life.time;
  // The first makes straight for the pearl; the other circles round it, so they spiral about each other.
  const aim: V3 = n === 0 ? pearl.pos : add(pearl.pos, [Math.cos(t * 0.6 + n * 2) * dr.R * 6, Math.sin(t * 0.8) * dr.R * 3, Math.sin(t * 0.6 + n * 2) * dr.R * 5]);
  // Steer for it, weaving up and down as it goes.
  let want = norm(sub(aim, dr.pos));
  // Never head-on into the other: shy off when their heads come close.
  for (const o of life.dragons) {
    if (o === dr) continue;
    const away = sub(dr.pos, o.pos);
    const dd = len(away);
    if (dd < dr.R * 5) want = norm(add(want, scl(away, (1 - dd / (dr.R * 5)) * 1.5 / Math.max(dd, 1e-3))));
  }
  // Heading over the hero's words: swerve out of them, right on a desktop, up on a phone.
  const [hx, hy] = toScreen(scene, cam, add(dr.pos, scl(dr.dir, dr.R * 4)));
  if (overHero(cam, hx, hy)) want = norm(add(want, cam.viewW < 640 ? [0, -1.6, 0] : [1.6, 0, 0]));
  const dist = len(sub(aim, dr.pos));
  const side = norm(cross(dr.dir, [0, -1, 0]));
  const upv = norm(cross(side, dr.dir));
  const weave = add(want, add(scl(upv, Math.sin(t * 1.6 + dr.phase) * 0.45), scl(side, Math.sin(t * 0.9) * 0.2)));
  const goal = norm(weave);
  const ang = Math.acos(clamp(dot(dr.dir, goal), -1, 1));
  const rate = 1.7;
  if (ang > 1e-4) {
    const axis = cross(dr.dir, goal);
    const al = len(axis);
    if (al > 1e-6) dr.dir = norm(turn(dr.dir, scl(axis, 1 / al), Math.min(ang, rate * dt)));
  }
  // Faster when far behind, slower close up so it doesn't overshoot.
  const target = clamp(dist * 0.9, 110 * (dr.R / 19), 380 * (dr.R / 19));
  dr.speed += (target - dr.speed) * Math.min(1, dt * 1.5);
  dr.pos = add(dr.pos, scl(dr.dir, dr.speed * dt));
  dr.pos[2] = clamp(dr.pos[2], -0.55 * scene.focal, 0.2 * scene.focal);
  // Bank into turns, and roll right over when it has just missed the pearl.
  const bank = clamp(dot(side, goal) * 1.4, -0.9, 0.9);
  if (dr.spin < 1) dr.spin = Math.min(1, dr.spin + dt / 1.4);
  const barrel = dr.spin < 1 ? (1 - Math.cos(dr.spin * Math.PI)) * Math.PI : 0;
  dr.roll += (bank - dr.roll) * Math.min(1, dt * 2);
  const last = dr.trail[dr.trail.length - 1];
  const moved = len(sub(dr.pos, last.p));
  if (moved > 1.5) dr.trail.push({ p: [...dr.pos] as V3, s: last.s + moved, roll: dr.roll + barrel });
  const keep = (SEGMENTS + 6) * GAP * dr.R;
  while (dr.trail.length > 2 && dr.trail[dr.trail.length - 1].s - dr.trail[1].s > keep) dr.trail.shift();

  // Pose the head along its heading, and each segment along the trail behind it.
  const { bodies } = scene;
  bodies[dr.head].live = { c: [...dr.pos] as V3, rot: frameAlong(dr.dir, rolledUp(dr.dir, dr.roll + barrel)) };
  let prev = along(dr.trail, 0).p;
  for (let i = 0; i < dr.segs.length; i++) {
    const back = (i + 1.15) * GAP * dr.R;
    const here = along(dr.trail, back);
    const fwd = sub(prev, here.p);
    const f = len(fwd) > 1e-3 ? fwd : dr.dir;
    bodies[dr.segs[i]].live = { c: here.p, rot: frameAlong(f, rolledUp(f, here.roll)) };
    prev = here.p;
  }
  // Legs paddle at the air as it swims through it.
  for (const leg of dr.legs) bodies[leg.body].live = { c: [0, 0, 0], rot: rotZ(Math.sin(t * 3.2 + leg.phase) * 0.7 - 0.3) };
  bodies[dr.tail].live = { c: [0, 0, 0], rot: rotX(Math.sin(t * 2.4) * 0.4) };
  // Blinks.
  dr.blinkIn -= dt;
  if (dr.blinkIn <= 0) { dr.blinking = 0.16; dr.blinkIn = 2.5 + rng() * 4; }
  dr.blinking = Math.max(0, dr.blinking - dt);
  bodies[dr.head].params = [0.07, dr.R * 0.3, dr.blinking > 0 ? 1 : 0, dr.phase];
  bodies[dr.tail].params = [0.1, 0, 0, dr.phase + 1];
};

/** Runs the creatures for a frame of `dt` seconds. */
export const stepLife = (scene: SkyScene, _t: number, dt: number, cam: SkyCamera, pointer: { x: number; y: number } | null, rand: () => number = Math.random) => {
  rng = rand;
  const life = scene.life;
  life.time += dt;
  if (dt <= 0) {
    // Still pose everything once, so a frozen page still shows the dragon.
    life.dragons.forEach((d, n) => { if (!scene.bodies[d.head].live) stepDragon(scene, life, d, n, 0.001, cam); });
    if (!scene.bodies[life.pearl.body].live) stepPearl(scene, life, 0.001, cam, null);
    if (!scene.bodies[life.critters.whale.body].live) stepCritters(scene, life.time, 0.001, cam, null, rng);
    return;
  }
  stepCritters(scene, life.time, dt, cam, pointer, rng);
  // Long frames are split so the chase stays smooth.
  const n = Math.ceil(dt / 0.034);
  for (let i = 0; i < n; i++) {
    stepPearl(scene, life, dt / n, cam, pointer);
    life.dragons.forEach((d, k) => stepDragon(scene, life, d, k, dt / n, cam));
  }
};

/** Puts the pearl (and so the dragons) somewhere in the visitor's view at once, one dragon coming in from each side. */
export const callDragon = (scene: SkyScene, cam: SkyCamera) => {
  const { pearl, dragons } = scene.life;
  const spot = viewSpot(scene, cam, Math.random);
  pearl.pos = spot; pearl.target = spot; pearl.vel = [0, 0, 0]; pearl.mode = 'wander'; pearl.t = 0;
  dragons.forEach((dragon, n) => {
    const from = fromScreen(scene, cam, n ? cam.viewW + 200 : -200, cam.viewH * (0.4 + n * 0.25), spot[2]);
    dragon.pos = from;
    dragon.dir = norm(sub(spot, from));
    dragon.trail = [{ p: sub(from, scl(dragon.dir, (SEGMENTS + 4) * GAP * dragon.R)), s: 0, roll: 0 }, { p: [...from] as V3, s: (SEGMENTS + 4) * GAP * dragon.R, roll: 0 }];
  });
};
