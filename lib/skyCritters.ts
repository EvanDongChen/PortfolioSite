import { V3, norm, rotX, rotY, rotZ, mul3 } from './space';
import {
  Builder, F, G, Island, M, SkyCamera, SkyScene, ellipsoid, frameAlong, onIsland, sphere, toScreen, tree, tube,
} from './sky';

/**
 * The sky's smaller residents, alongside the dragon (lib/skyLife.ts).
 *
 * Puffball birds: round, fluffy and bright, living in mud nests stuck under
 * the islands' rims. They sit and blink, flutter out in little sorties round
 * their island and home again, now and then move house to another island in
 * view, scatter when the dragon swims close, and hurry home when a storm comes.
 *
 * Cloud-sheep: woolly clouds with dark faces and dangling legs, grazing in
 * herds along the margins. They soak up the damp air, slowly going grey, until
 * they rain themselves out in a little shower and spring back white and puffy.
 * The cursor startles them into a hop; a storm soaks them at once.
 *
 * The sky whale: a great slow whale with a garden growing on its back (grass,
 * flowers, a blossom tree), cruising across the view and back, beating its
 * flukes, blowing a spout now and then.
 */

const PARKED: V3 = [0, -1e6, 0];

export interface Bird {
  body: number;
  wings: [number, number];
  r: number;
  island: number;
  nest: number;
  mode: 'nest' | 'out' | 'home';
  pos: V3;
  vel: V3;
  target: V3;
  t: number;
  wait: number;
  flap: number;
  blinkIn: number;
  blink: number;
  phase: number;
  hop: number;
}

export interface Sheep {
  body: number;
  r: number;
  pos: V3;
  home: V3;
  heading: number;
  wet: number;
  raining: number;
  hop: number;
  hopV: number;
  sq: number;
  sqv: number;
  phase: number;
  blinkIn: number;
}

export interface Whale {
  body: number;
  fluke: number;
  fins: [number, number];
  len: number;
  pos: V3;
  dir: V3;
  turning: number;
  spout: number;
  spoutIn: number;
}

export interface Critters { birds: Bird[]; sheep: Sheep[]; whale: Whale; nestTaken: Map<string, number> }

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
}

const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const scl = (a: V3, k: number): V3 => [a[0] * k, a[1] * k, a[2] * k];
const len = (a: V3) => Math.hypot(a[0], a[1], a[2]);
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

// ------------------------------------------------------------------ birds ---

/** Plumage colours. (A function: sky.ts and this module import each other, so nothing imported is touched at load.) */
const birdColours = () => [M.coral, M.gold, M.blossom, M.jade, M.whale];

/** A puffball: a ball of feathers with a cream breast, a little gold beak, big eyes and a curl of a crest; wings are their own bodies. */
const buildBird = (B: Builder, r: number, sp: number, mat: number, rand: () => number) => {
  const body = B.body({ kind: 'bird', name: 'puffball bird', pos: PARKED, radius: r * 2, params: [0, 0, 0, rand() * 6] });
  sphere(B, body, r, sp, d => {
    if (d[1] > 0.05 && d[2] > 0.35 && Math.abs(d[0]) < 0.6) return { mat: M.cream, alb: 0.62 };
    // A fluffy edge: feather tufts as a little noise in the shade.
    return { mat, alb: 0.55 - d[1] * 0.2 + (Math.sin(d[0] * 13) * Math.sin(d[1] * 11 + d[2] * 7)) * 0.08 };
  });
  ellipsoid(B, body, [r * 0.2, r * 0.15, r * 0.3], sp, () => ({ mat: M.gold, alb: 0.75 }), [0, r * 0.1, r * 0.98]);
  for (const ex of [-1, 1]) {
    const c: V3 = [ex * r * 0.4, -r * 0.18, r * 0.84];
    sphere(B, body, r * 0.2, sp, d => (d[2] < 0 ? null : { mat: M.pupil, alb: 0.3, flags: F.eye }), c);
    sphere(B, body, r * 0.07, sp, () => ({ mat: M.eye, alb: 1, flags: F.emissive | F.eye }), [c[0] + r * 0.06, c[1] - r * 0.07, c[2] + r * 0.17]);
  }
  // A crest of three feathers, curling forward.
  for (let j = -1; j <= 1; j++) {
    tube(B, body, [[j * r * 0.18, -r * 0.9, 0], [j * r * 0.25, -r * 1.35, r * 0.05], [j * r * 0.3, -r * 1.45, r * 0.3]], u => r * 0.12 * (1 - u * 0.5), sp, () => ({ mat, alb: 0.75 }));
  }
  // A short fan of a tail.
  ellipsoid(B, body, [r * 0.4, r * 0.12, r * 0.35], sp, () => ({ mat, alb: 0.4 }), [0, r * 0.2, -r * 1.0]);
  const wings: number[] = [];
  for (const side of [-1, 1]) {
    const w = B.body({ kind: 'wing', name: 'wing', pos: [0, 0, 0], attach: { parent: body, offset: [side * r * 0.85, -r * 0.05, 0] } });
    ellipsoid(B, w, [r * 0.55, r * 0.14, r * 0.5], sp, d => ({ mat, alb: 0.45 - d[1] * 0.2 }), [side * r * 0.45, 0, 0]);
    wings.push(w);
  }
  return { body, wings: wings as [number, number] };
};

// ------------------------------------------------------------------ sheep ---

/** A cloud-sheep: wool of puffs round a core (built twice, white and rain-grey), a dark face, ears and dangling legs. Faces local +x. */
const buildSheep = (B: Builder, r: number, sp: number, rand: () => number) => {
  const body = B.body({ kind: 'sheep', name: 'cloud-sheep', pos: PARKED, radius: r * 1.6, params: [0, 0, 0, rand() * 6] });
  const puffs: [V3, number][] = [[[0, 0, 0], r * 0.75]];
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    puffs.push([[Math.cos(a) * r * 0.55, -Math.abs(Math.sin(a)) * r * 0.35 + r * 0.05, Math.sin(a) * r * 0.45], r * (0.45 + rand() * 0.1)]);
  }
  for (const [mat, flag] of [[M.cloud, F.dry], [M.storm, F.wet]] as const) {
    for (const [c, pr] of puffs) {
      sphere(B, body, pr, sp * 1.3, d => {
        const p: V3 = [c[0] + d[0] * pr, c[1] + d[1] * pr, c[2] + d[2] * pr];
        for (const [c2, r2] of puffs) if (c2 !== c && (p[0] - c2[0]) ** 2 + (p[1] - c2[1]) ** 2 + (p[2] - c2[2]) ** 2 < r2 * r2 * 0.9) return null;
        return { mat, alb: 0.55 - d[1] * 0.25 };
      }, c, flag);
    }
  }
  // The face, ears and eyes.
  const fc: V3 = [r * 0.95, r * 0.12, 0];
  ellipsoid(B, body, [r * 0.36, r * 0.42, r * 0.34], sp, d => ({ mat: M.face, alb: 0.5 - d[1] * 0.2 }), fc);
  for (const zs of [-1, 1]) {
    ellipsoid(B, body, [r * 0.12, r * 0.08, r * 0.24], sp, () => ({ mat: M.face, alb: 0.45 }), [fc[0] - r * 0.1, fc[1] - r * 0.3, zs * r * 0.42]);
    const e: V3 = [fc[0] + r * 0.22, fc[1] - r * 0.1, zs * r * 0.2];
    sphere(B, body, r * 0.1, sp, () => ({ mat: M.eye, alb: 0.9, flags: F.eye }), e);
    sphere(B, body, r * 0.055, sp, () => ({ mat: M.pupil, alb: 0.3, flags: F.eye }), [e[0] + r * 0.06, e[1], e[2] + zs * r * 0.04]);
  }
  // A woolly fringe on the brow.
  sphere(B, body, r * 0.22, sp, d => ({ mat: M.cloud, alb: 0.65 - d[1] * 0.2 }), [fc[0] - r * 0.02, fc[1] - r * 0.4, 0]);
  // Four little legs, dangling.
  for (const [lx, lz] of [[0.4, -0.3], [0.4, 0.3], [-0.4, -0.3], [-0.4, 0.3]]) {
    tube(B, body, [[lx * r, r * 0.5, lz * r], [lx * r, r * 0.95, lz * r]], () => r * 0.1, sp, () => ({ mat: M.face, alb: 0.4 }));
  }
  // The shower it lets go of when it's soaked through.
  for (let i = 0; i < 26; i++) {
    B.glowAt([(rand() - 0.5) * r * 1.6, r * 0.6, (rand() - 0.5) * r], r * 0.07, [0.78, 0.86, 0.95], body, G.rain | G.gate | G.paint, rand(), r * 3.5);
  }
  return body;
};

// ------------------------------------------------------------------ whale ---

/** The sky whale, along local +x: a long blue body with a grooved cream belly, flippers, flukes, and a garden on its back. */
const buildWhale = (B: Builder, L: number, sp: number, rand: () => number) => {
  const body = B.body({ kind: 'whale', name: 'sky whale', pos: PARKED, radius: L * 0.6, params: [0, 0, 0, 0] });
  const R = L * 0.18;
  const profile = (u: number) => R * (u < 0.18 ? Math.sqrt(u / 0.18) * 0.95 + 0.05 : 1 - Math.pow((u - 0.18) / 0.82, 1.6) * 0.82);
  const path: V3[] = [];
  for (let i = 0; i <= 40; i++) path.push([L * 0.5 - (i / 40) * L, 0, 0]);
  tube(B, body, path, profile, sp, (u, n) => {
    if (n[1] > 0.35) {
      const groove = (Math.abs(n[2]) * 9 + 0.5) % 1 < 0.3 && u < 0.55;
      return { mat: M.cream, alb: groove ? 0.35 : 0.6 };
    }
    return { mat: M.whale, alb: 0.5 - n[1] * 0.15 };
  });
  // Eyes and the line of the mouth.
  for (const zs of [-1, 1]) {
    sphere(B, body, R * 0.13, sp, () => ({ mat: M.pupil, alb: 0.3, flags: F.eye }), [L * 0.3, R * 0.2, zs * R * 0.86]);
    sphere(B, body, R * 0.05, sp, () => ({ mat: M.eye, alb: 1, flags: F.emissive | F.eye }), [L * 0.315, R * 0.14, zs * R * 0.97]);
    tube(B, body, [[L * 0.47, R * 0.32, zs * R * 0.3], [L * 0.38, R * 0.45, zs * R * 0.7], [L * 0.24, R * 0.4, zs * R * 0.9]], () => R * 0.035, sp, () => ({ mat: M.face, alb: 0.3 }));
  }
  // The garden on its back: a mound of grass, flowers, a blossom tree and a round one.
  const gx0 = -L * 0.12, gw = L * 0.42;
  const N = Math.round((gw * R * 1.3) / (sp * sp) * 1.3);
  for (let i = 0; i < N; i++) {
    const x = gx0 + (rand() - 0.5) * gw;
    const u = (L * 0.5 - x) / L;
    const pr = profile(u);
    const zz = (rand() - 0.5) * pr * 1.3;
    if (Math.abs(zz) > pr * 0.65) continue;
    const y = -Math.sqrt(Math.max(0, pr * pr - zz * zz)) - sp * 0.4;
    const flower = rand() < 0.07;
    B.surfel([x, y, zz], norm([0, -1, zz / pr * 0.6]), sp * 0.85, flower ? [M.blossom, M.gold, M.cream][Math.floor(rand() * 3)] : M.grass, flower ? 0.8 : 0.5 + (rand() - 0.5) * 0.3, body);
  }
  tree(B, body, [gx0 + gw * 0.15, -profile((L * 0.5 - gx0 - gw * 0.15) / L) * 0.95, 0], R * 1.0, sp, 'blossom', false, rand);
  tree(B, body, [gx0 - gw * 0.28, -profile((L * 0.5 - gx0 + gw * 0.28) / L) * 0.95, R * 0.2], R * 0.75, sp, 'round', false, rand);
  // The spout, rising from the blowhole.
  for (let i = 0; i < 26; i++) {
    B.glowAt([L * 0.28 + (rand() - 0.5) * R * 0.3, -R * 1.0, (rand() - 0.5) * R * 0.3], R * (0.12 + rand() * 0.1), [0.8, 0.9, 1], body, G.rain | G.gate, rand(), -R * (2.2 + rand()));
  }
  const fins: number[] = [];
  for (const zs of [-1, 1]) {
    const fin = B.body({ kind: 'fin', name: 'flipper', pos: [0, 0, 0], attach: { parent: body, offset: [L * 0.18, R * 0.55, zs * R * 0.8] } });
    ellipsoid(B, fin, [R * 0.55, R * 0.08, R * 0.25], sp, d => ({ mat: d[1] > 0 ? M.cream : M.whale, alb: 0.5 }), [-R * 0.3, R * 0.1, zs * R * 0.3]);
    fins.push(fin);
  }
  const fluke = B.body({ kind: 'fin', name: 'flukes', pos: [0, 0, 0], attach: { parent: body, offset: [-L * 0.5, 0, 0] } });
  for (const zs of [-1, 1]) ellipsoid(B, fluke, [R * 0.45, R * 0.07, R * 0.6], sp, d => ({ mat: d[1] > 0 ? M.cream : M.whale, alb: 0.5 }), [-R * 0.3, 0, zs * R * 0.5]);
  return { body, fluke, fins: fins as [number, number], R };
};

// ------------------------------------------------------------- populating ---

export const populateCritters = (B: Builder, ctx: Ctx): Critters => {
  const { rand, s, f, viewW, viewH, pageH } = ctx;
  // Birds: two or three per island with nests, sat in them.
  const birds: Bird[] = [];
  const nestTaken = new Map<string, number>();
  ctx.islands.forEach((isl, ii) => {
    if (isl.far || !isl.nests.length) return;
    const z = B.bodies[isl.body].pos[2];
    const r = 16 * s * ctx.k(z);
    const sp = ctx.sp(z) * 0.55;
    isl.nests.forEach((_, ni) => {
      const { body, wings } = buildBird(B, r, sp, birdColours()[(ii * 2 + ni) % 5], rand);
      nestTaken.set(`${ii}:${ni}`, birds.length);
      birds.push({ body, wings, r, island: ii, nest: ni, mode: 'nest', pos: [...PARKED] as V3, vel: [0, 0, 0], target: [0, 0, 0], t: 0, wait: 2 + rand() * 10, flap: 0, blinkIn: rand() * 3, blink: 0, phase: rand() * 6, hop: 0 });
    });
  });

  // Sheep: little herds grazing along the margins, a few in the opening view's lower corner.
  const sheep: Sheep[] = [];
  const z = -0.22 * f;
  const r = 30 * s * ctx.k(z);
  const sp = ctx.sp(z) * 0.6;
  const herds = Math.max(2, Math.round(pageH / 1300));
  for (let h = 0; h < herds; h++) {
    const left = h % 2 === 1;
    const y = h === 0 ? viewH * 0.95 : viewH * 0.95 + (h / herds) * (pageH - viewH * 1.5);
    const n = 3 + Math.floor(rand() * 2);
    for (let i = 0; i < n; i++) {
      const home = ctx.at(left ? 0.04 + rand() * 0.14 : 0.82 + rand() * 0.14, y + (rand() - 0.5) * 120, z + (rand() - 0.5) * 0.1 * f);
      const body = buildSheep(B, r * (0.85 + rand() * 0.3), sp, rand);
      sheep.push({ body, r, pos: [...home] as V3, home, heading: rand() < 0.5 ? 1 : -1, wet: rand() * 0.8, raining: 0, hop: 0, hopV: 0, sq: 1, sqv: 0, phase: rand() * 6, blinkIn: rand() * 4 });
    }
  }

  // The whale, cruising across the first stretch below the hero.
  const wz = -0.45 * f;
  const L = 300 * s * ctx.k(wz);
  const w = buildWhale(B, L, ctx.sp(wz) * 0.8, rand);
  const whale: Whale = {
    body: w.body, fluke: w.fluke, fins: w.fins, len: L,
    pos: ctx.at(-0.1, viewH * 1.35, wz), dir: [1, 0, 0], turning: 0, spout: 0, spoutIn: 6,
  };
  void viewW;
  return { birds, sheep, whale, nestTaken };
};

// -------------------------------------------------------------- behaviour ---

const nestPoint = (scene: SkyScene, b: Bird) => {
  const isl = scene.islands[b.island];
  const p = onIsland(scene, isl, isl.nests[b.nest]);
  return [p[0], p[1] - b.r * 0.55, p[2]] as V3;
};

const islandInView = (scene: SkyScene, cam: SkyCamera, i: number) => {
  const c = scene.centres?.[scene.islands[i].body];
  if (!c) return false;
  const [x, y] = toScreen(scene, cam, c);
  return x > -100 && x < cam.viewW + 100 && y > -100 && y < cam.viewH + 100;
};

const stepBirds = (scene: SkyScene, cr: Critters, t: number, dt: number, cam: SkyCamera, rand: () => number) => {
  const dragon = scene.life.dragon;
  const stormy = scene.events.light.gloom > 0.25;
  for (const b of cr.birds) {
    const bodies = scene.bodies;
    b.t += dt;
    const home = nestPoint(scene, b);
    const near = len(sub(dragon.pos, b.mode === 'nest' ? home : b.pos)) < dragon.R * 7;
    if (b.mode === 'nest') {
      b.pos = home;
      b.wait -= dt;
      // The dragon's too close: everybody out! (unless it's raining, when they huddle in).
      if ((near && !stormy) || (b.wait <= 0 && !stormy)) {
        b.mode = 'out'; b.t = 0;
        const isl = scene.islands[b.island];
        const c = scene.centres?.[isl.body] ?? home;
        const ang = rand() * Math.PI * 2;
        const reach = isl.R * (near ? 2.2 : 1.1 + rand() * 0.8);
        b.target = [c[0] + Math.cos(ang) * reach, c[1] - isl.R * (0.2 + rand() * 0.6), c[2] + Math.sin(ang) * reach * 0.6];
        b.vel = [0, -b.r * 4, b.r * 2];
        // Now and then a bird moves house to a free nest on another island in view.
        if (!near && rand() < 0.3) {
          const free: [number, number][] = [];
          scene.islands.forEach((is2, ii) => { if (ii !== b.island && !is2.far && islandInView(scene, cam, ii)) is2.nests.forEach((_, ni) => { if (!cr.nestTaken.has(`${ii}:${ni}`)) free.push([ii, ni]); }); });
          if (free.length) {
            const [ii, ni] = free[Math.floor(rand() * free.length)];
            cr.nestTaken.delete(`${b.island}:${b.nest}`);
            b.island = ii; b.nest = ni;
            cr.nestTaken.set(`${ii}:${ni}`, cr.birds.indexOf(b));
          }
        }
      }
    } else {
      // Out on a sortie, then home; storms send them straight back.
      if (b.mode === 'out' && (stormy || b.t > 7 || (b.t > 2.5 && len(sub(b.target, b.pos)) < b.r * 6))) { b.mode = 'home'; b.t = 0; }
      const goal = b.mode === 'home' ? home : b.target;
      const to = sub(goal, b.pos);
      const dist = len(to);
      const speed = b.r * (b.mode === 'home' ? 9 : 11) * (near ? 1.6 : 1);
      const want = scl(to, Math.min(1, dist / (b.r * 3)) * speed / Math.max(dist, 1e-3));
      // Fluttery: a little bounce on every wingbeat.
      want[1] += Math.sin(t * 9 + b.phase) * b.r * 2.5;
      b.vel = add(b.vel, scl(sub(want, b.vel), Math.min(1, dt * 3)));
      b.pos = add(b.pos, scl(b.vel, dt));
      if (b.mode === 'home' && dist < b.r * 0.6) {
        b.mode = 'nest'; b.wait = 6 + rand() * 14; b.hop = 1;
      }
    }
    // Pose: in the nest it faces out at the viewer and bobs; flying, it turns towards where it's going.
    let rot: number[];
    let flap: number;
    if (b.mode === 'nest') {
      b.hop = Math.max(0, b.hop - dt * 2.5);
      const bob = Math.sin(t * 2 + b.phase) * 0.06;
      rot = mul3(rotZ(bob), rotX(-0.15));
      flap = b.hop > 0 ? Math.sin(t * 30) * 0.8 : Math.max(0, Math.sin(t * 0.7 + b.phase) - 0.92) * 8 * Math.sin(t * 25);
      b.pos = [home[0], home[1] - Math.sin(b.hop * Math.PI) * b.r * 0.8, home[2]];
    } else {
      const yaw = clamp(b.vel[0] / (b.r * 8), -1, 1) * 1.1;
      rot = mul3(rotY(yaw), rotX(clamp(-b.vel[1] / (b.r * 20), -0.5, 0.5)));
      flap = Math.sin(t * 22 + b.phase) * 0.9;
    }
    bodies[b.body].live = { c: b.pos, rot };
    bodies[b.wings[0]].live = { c: [0, 0, 0], rot: rotZ(-flap - 0.2) };
    bodies[b.wings[1]].live = { c: [0, 0, 0], rot: rotZ(flap + 0.2) };
    b.blinkIn -= dt;
    if (b.blinkIn <= 0) { b.blink = 0.14; b.blinkIn = 2 + rand() * 4; }
    b.blink = Math.max(0, b.blink - dt);
    bodies[b.body].params = [0, 0, b.blink > 0 ? 1 : 0, b.phase];
  }
};

const stepSheep = (scene: SkyScene, cr: Critters, t: number, dt: number, cam: SkyCamera, pointer: { x: number; y: number } | null, rand: () => number) => {
  const gloom = scene.events.light.gloom;
  for (const sh of cr.sheep) {
    // Grazing: an amble along the margin, turning back now and then.
    sh.pos[0] += sh.heading * sh.r * 0.35 * dt;
    if (Math.abs(sh.pos[0] - sh.home[0]) > sh.r * 4) sh.heading = Math.sign(sh.home[0] - sh.pos[0]);
    else if (rand() < dt * 0.05) sh.heading = -sh.heading;
    // Damp air soaks in; a storm soaks them through at once.
    if (sh.raining > 0) {
      sh.raining -= dt;
      if (sh.raining <= 0) { sh.wet = 0; sh.sqv += 6; }
    } else {
      sh.wet += dt * (0.012 + gloom * 0.5);
      if (sh.wet >= 1) { sh.raining = 5; sh.sqv -= 3; }
    }
    // The cursor startles them: a hop.
    if (pointer && sh.hop === 0) {
      const [x, y] = toScreen(scene, cam, sh.pos);
      if (Math.hypot(x - pointer.x, y - pointer.y) < 90) { sh.hopV = -sh.r * 9; sh.hop = 1e-3; sh.sqv += 4; }
    }
    if (sh.hop !== 0) {
      sh.hopV += sh.r * 30 * dt;
      sh.hop += sh.hopV * dt;
      if (sh.hop >= 0) { sh.hop = 0; sh.hopV = 0; sh.sqv -= 3; }
    }
    // Squash and stretch on a spring.
    sh.sqv += (1 - sh.sq) * 60 * dt - sh.sqv * 6 * dt;
    sh.sq += sh.sqv * dt;
    const bob = Math.sin(t * 1.3 + sh.phase) * sh.r * 0.15;
    const c: V3 = [sh.pos[0], sh.pos[1] + bob + sh.hop + (sh.raining > 0 ? sh.r * 0.2 : 0), sh.pos[2]];
    const b = scene.bodies[sh.body];
    // Three-quarter view, towards the way it's walking.
    b.live = { c, rot: mul3(rotY(sh.heading > 0 ? -0.6 : Math.PI + 0.6), rotZ(Math.sin(t * 2 + sh.phase) * 0.05)) };
    const sq = clamp(sh.sq, 0.7, 1.35);
    b.scale = [1 / Math.sqrt(sq), sq, 1 / Math.sqrt(sq)];
    // While raining, the state switches the wool to grey and lets the shower fall; eyes shut tight.
    b.params = [0, 0, sh.raining > 0 ? 1 : 0, sh.phase];
  }
};

const stepWhale = (scene: SkyScene, cr: Critters, t: number, dt: number, cam: SkyCamera) => {
  const w = cr.whale;
  const f = scene.focal;
  const speed = w.len * 0.09;
  // Cruise across the view; once well past an edge, swing round in a long, deep turn and come back.
  const [sx] = toScreen(scene, cam, w.pos);
  if (w.turning <= 0 && ((w.dir[0] > 0 && sx > cam.viewW + w.len * 0.6) || (w.dir[0] < 0 && sx < -w.len * 0.6))) w.turning = 1;
  if (w.turning > 0) {
    w.turning -= dt / 7;
    const a = dt / 7 * Math.PI;
    const c = Math.cos(a), s = Math.sin(a);
    // Turn through the depth, so it swings away from the viewer and round.
    w.dir = norm([w.dir[0] * c + w.dir[2] * s, w.dir[1], -w.dir[0] * s + w.dir[2] * c]);
    if (w.turning <= 0) w.dir = [Math.sign(w.dir[0]) || 1, 0, 0];
  }
  // Keep to the visitor's part of the page: drift towards a cruising height below the middle of the view.
  const cruiseY = cam.scrollY + cam.viewH * 0.62;
  w.dir[1] = clamp((cruiseY - w.pos[1]) / (w.len * 6), -0.25, 0.25);
  w.dir = norm(w.dir);
  w.pos = add(w.pos, scl(w.dir, speed * dt));
  w.pos[2] = clamp(w.pos[2], -0.75 * f, -0.3 * f);
  // A gentle rise and fall with the stroke of the flukes.
  const stroke = Math.sin(t * 1.1);
  const bodies = scene.bodies;
  bodies[w.body].live = { c: [w.pos[0], w.pos[1] + stroke * w.len * 0.015, w.pos[2]], rot: mul3(frameAlong([w.dir[0], w.dir[1] * 0.4, w.dir[2]]), rotZ(stroke * 0.04)) };
  bodies[w.fluke].live = { c: [0, 0, 0], rot: rotZ(stroke * 0.35) };
  bodies[w.fins[0]].live = { c: [0, 0, 0], rot: rotX(Math.sin(t * 0.9) * 0.3) };
  bodies[w.fins[1]].live = { c: [0, 0, 0], rot: rotX(-Math.sin(t * 0.9) * 0.3) };
  // A spout every so often.
  w.spoutIn -= dt;
  if (w.spoutIn <= 0) { w.spout = 3; w.spoutIn = 12 + Math.random() * 10; }
  w.spout = Math.max(0, w.spout - dt);
  bodies[w.body].params = [0, 0, w.spout > 0 ? Math.min(1, w.spout) : 0, 0];
};

export const stepCritters = (scene: SkyScene, t: number, dt: number, cam: SkyCamera, pointer: { x: number; y: number } | null, rand: () => number) => {
  const cr = scene.life.critters;
  stepBirds(scene, cr, t, dt, cam, rand);
  stepSheep(scene, cr, t, dt, cam, pointer, rand);
  stepWhale(scene, cr, t, dt, cam);
};

/** Brings the whale into view, just off the nearer edge. */
export const callWhale = (scene: SkyScene, cam: SkyCamera) => {
  const w = scene.life.critters.whale;
  const z = -0.45 * scene.focal;
  const k = (scene.focal - z) / scene.focal;
  w.pos = [cam.viewW / 2 - (cam.viewW / 2 + w.len * 0.3) * k, cam.scrollY + cam.viewH * 0.6, z];
  w.dir = [1, 0, 0];
  w.turning = 0;
};

/** Soaks every sheep through, so they all rain at once. */
export const soakSheep = (scene: SkyScene) => { for (const sh of scene.life.critters.sheep) if (sh.raining <= 0) sh.wet = 1; };
