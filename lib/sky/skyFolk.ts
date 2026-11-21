import { V3, norm, rotX, rotY, rotZ, mul3 } from '../space/space';
import {
  Builder, F, G, Island, M, SkyCamera, SkyScene, clearOfIslands, ellipsoid, frameAlong, fromScreen, onIsland, sphere, toScreen, tube,
} from './sky';

/**
 * More of the sky's residents, alongside the critters (lib/skyCritters.ts).
 *
 * Paper kites: flat koi-shaped kites in bright patterns, with a bamboo spine
 * and ribbon streamers, swimming the air in shoals. A shoal roams its stretch
 * of the page and turns as one; a dragon swimming close scatters it, each kite
 * darting its own way, and it regathers once the dragon has gone.
 *
 * Seed puffs: dandelion spirits riding the wind in little clusters across the
 * view. Now and then one drifts down onto an island, and where it lands a new
 * flower grows; the puff melts away and joins its cluster again upwind. The
 * flowers last a while, then wilt and make room for new ones.
 *
 * The shepherd dog: a fluffy dog that runs on little clouds, keeping the
 * cloud-sheep together. Sheep slowly wander from their herd; the dog flies
 * round behind the furthest straggler and nips it, and it hops back to the
 * others. With nothing to do it circles its herd, tail going.
 *
 * Hanging gardens: the wisteria curtains under some islands swing when birds,
 * kites, the dog or a dragon pass through them.
 */

const PARKED: V3 = [0, -1e6, 0];

interface Kite { body: number; L: number; school: number; slot: V3; pos: V3; vel: V3; flee: number; fleeDir: V3; face: V3; phase: number }
interface School { centre: V3; vel: V3; target: V3; t: number; band: [number, number]; z: number }
interface Puff { body: number; r: number; cluster: number; mode: 'ride' | 'fall' | 'melt'; pos: V3; vel: V3; t: number; wait: number; island: number; perch: number; orbit: number; phase: number }
interface Cluster { centre: V3; z: number }
interface Flower { body: number; island: number; age: number; life: number }
interface Vine { body: number; island: number; root: V3; len: number; ax: number; az: number; vx: number; vz: number; phase: number }
interface Dog { body: number; tail: number; r: number; herd: number; pos: V3; vel: V3; mode: 'patrol' | 'chase' | 'rest'; target: number; t: number; heading: number; bark: number; orbit: number }

export interface Folk { kites: Kite[]; schools: School[]; puffs: Puff[]; clusters: Cluster[]; flowers: Flower[]; vines: Vine[]; dog: Dog | null; wind: number }

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

// ------------------------------------------------------------------ kites ---

/** Kite patterns: a ground colour and the colour of its patches. (A function: sky.ts and this module import each other.) */
const kitePatterns = (): [number, number][] => [[M.cream, M.dragon], [M.gold, M.coral], [M.azure, M.cloud], [M.blossom, M.cream], [M.jade, M.gold], [M.cream, M.azure]];

/** A paper kite shaped like a koi, flat in its own x-y plane, facing +x: painted body, forked tail, an eye, a bamboo spine and two streamers. */
const buildKite = (B: Builder, L: number, sp: number, [ground, patch]: [number, number], rand: () => number) => {
  const body = B.body({ kind: 'kite', name: 'paper kite', pos: PARKED, radius: L, params: [0.045, L * 0.3, 0, rand() * 6] });
  const ns = rand() * 100;
  const step = sp * 0.75;
  for (let x = -0.58 * L; x <= 0.46 * L; x += step) {
    for (let y = -0.3 * L; y <= 0.3 * L; y += step) {
      const bx = (x - 0.06 * L) / (0.38 * L), by = y / (0.17 * L);
      const inBody = bx * bx + by * by < 1;
      const t = (-0.26 * L - x) / (0.32 * L);
      const inTail = t > 0 && t < 1 && Math.abs(y) < 0.03 * L + t * 0.21 * L && !(t > 0.55 && Math.abs(y) < (t - 0.55) * 0.3 * L);
      const fin = x > -0.12 * L && x < 0.1 * L && y < -0.15 * L && y > -0.17 * L - (0.1 * L - Math.abs(x + 0.01 * L)) * 0.8;
      if (!inBody && !inTail && !fin) continue;
      // The eye.
      const ex = x - 0.3 * L, ey = y + 0.035 * L;
      const er = Math.hypot(ex, ey);
      if (er < 0.035 * L) { B.surfel([x, y, 0], [0, 0, 1], step * 0.85, M.pupil, 0.3, body, F.twoSided); continue; }
      if (er < 0.065 * L) { B.surfel([x, y, 0], [0, 0, 1], step * 0.85, M.eye, 0.85, body, F.twoSided); continue; }
      const spot = Math.sin(x / L * 9 + ns) * Math.sin(y / L * 11 + ns * 0.7) + Math.sin(x / L * 4 - ns) * 0.6 > 0.45;
      const edgeBand = inBody && bx * bx + by * by > 0.8;
      const mat = inTail || fin ? patch : spot ? patch : ground;
      B.surfel([x, y, 0], [0, 0, 1], step * 0.85, mat, edgeBand ? 0.4 : 0.6 + (inTail ? -0.05 : 0), body, F.twoSided);
    }
  }
  // The bamboo spine down its middle, and the streamers flying from the tail.
  tube(B, body, [[0.42 * L, 0, sp * 0.4], [-0.3 * L, 0, sp * 0.4]], () => sp * 0.35, sp, () => ({ mat: M.bark, alb: 0.6 }));
  for (const side of [-1, 1]) {
    const path: V3[] = [];
    for (let u = 0; u <= 1; u += 0.08) path.push([-0.55 * L - u * 0.9 * L, side * (0.2 * L + u * 0.06 * L), 0]);
    tube(B, body, path, () => sp * 0.7, sp, () => ({ mat: patch, alb: 0.65 }), F.trail | F.twoSided);
  }
  return body;
};

// ------------------------------------------------------------ seed puffs ---

/** A dandelion seed spirit: a little glowing core in a clock of feathery seeds. */
const buildPuff = (B: Builder, r: number, sp: number, rand: () => number) => {
  const body = B.body({ kind: 'puff', name: 'seed puff', pos: PARKED, radius: r * 3, params: [0, 0, 0, rand() * 6] });
  sphere(B, body, r, sp, d => ({ mat: M.cream, alb: 0.75 - d[1] * 0.2 }));
  // The seeds: fine stalks radiating, each tipped with a tuft.
  const n = 22;
  for (let i = 0; i < n; i++) {
    const y = 1 - (2 * (i + 0.5)) / n, rr = Math.sqrt(1 - y * y), a = i * 2.39996;
    const d: V3 = [Math.cos(a) * rr, y, Math.sin(a) * rr];
    if (d[2] < -0.3) continue;
    tube(B, body, [scl(d, r * 0.9), scl(d, r * 2.4)], () => sp * 0.3, sp, () => ({ mat: M.cloud, alb: 0.7 }));
    sphere(B, body, r * 0.42, sp, () => ({ mat: M.cloud, alb: 0.85 }), scl(d, r * 2.6));
  }
  B.glowAt([0, 0, 0], r * 4, [0.55, 0.55, 0.45], body, G.flicker, rand());
  return body;
};

/** A flower that grows where a seed puff lands, hidden until then (its surfels show only while its state is on). */
const buildFlower = (B: Builder, isl: Island, h: number, sp: number, petal: number) => {
  const body = B.body({ kind: 'flower', name: 'flower', pos: [0, 0, 0], attach: { parent: isl.body, offset: [0, 0, 0] }, scale: [0.01, 0.01, 0.01], params: [0, 0, 0, 0] });
  tube(B, body, [[0, 0, 0], [h * 0.05, -h * 0.5, 0], [0, -h, 0]], () => Math.max(sp * 0.4, h * 0.06), sp, () => ({ mat: M.leaf, alb: 0.5 }), F.wet);
  for (const side of [-1, 1]) ellipsoid(B, body, [h * 0.2, h * 0.07, h * 0.1], sp, () => ({ mat: M.grass, alb: 0.6 }), [side * h * 0.18, -h * 0.35, 0], F.wet);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    ellipsoid(B, body, [h * 0.2, h * 0.2, h * 0.08], sp, dd => ({ mat: petal, alb: 0.62 + dd[2] * 0.1 }), [Math.cos(a) * h * 0.22, -h + Math.sin(a) * h * 0.22, h * 0.02], F.wet);
  }
  sphere(B, body, h * 0.13, sp, () => ({ mat: M.gold, alb: 0.8 }), [0, -h, h * 0.08], F.wet);
  return body;
};

// -------------------------------------------------------------------- dog ---

/** The shepherd dog, facing +x: a fluffy cream body with gold patches and floppy ears, little clouds under its paws, and a tail of its own to wag. */
const buildDog = (B: Builder, r: number, sp: number) => {
  const body = B.body({ kind: 'dog', name: 'shepherd dog', pos: PARKED, radius: r * 2.5, params: [0, 0, 0, 0] });
  ellipsoid(B, body, [r * 1.05, r * 0.72, r * 0.68], sp, d => ({ mat: d[1] < -0.35 && d[0] < 0.2 ? M.gold : M.cream, alb: 0.6 - d[1] * 0.15 }));
  // Fluff along the back and chest.
  for (let i = 0; i < 6; i++) sphere(B, body, r * 0.32, sp, d => ({ mat: i % 3 === 0 ? M.gold : M.cream, alb: 0.65 - d[1] * 0.2 }), [-r * 0.6 + i * r * 0.28, -r * 0.55 + Math.abs(i - 2.5) * r * 0.04, (i % 2 ? 1 : -1) * r * 0.2]);
  sphere(B, body, r * 0.62, sp, d => ({ mat: M.cream, alb: 0.62 - d[1] * 0.15 }), [r * 1.05, -r * 0.5, 0]);
  ellipsoid(B, body, [r * 0.34, r * 0.24, r * 0.27], sp, () => ({ mat: M.cream, alb: 0.7 }), [r * 1.6, -r * 0.36, 0]);
  sphere(B, body, r * 0.12, sp, () => ({ mat: M.pupil, alb: 0.3 }), [r * 1.93, -r * 0.42, 0]);
  ellipsoid(B, body, [r * 0.1, r * 0.17, r * 0.08], sp, () => ({ mat: M.blossom, alb: 0.7 }), [r * 1.62, -r * 0.1, 0]);
  for (const zs of [-1, 1]) {
    sphere(B, body, r * 0.1, sp, () => ({ mat: M.pupil, alb: 0.3, flags: F.eye }), [r * 1.38, -r * 0.68, zs * r * 0.32]);
    sphere(B, body, r * 0.035, sp, () => ({ mat: M.eye, alb: 1, flags: F.emissive | F.eye }), [r * 1.44, -r * 0.73, zs * r * 0.4]);
    ellipsoid(B, body, [r * 0.18, r * 0.34, r * 0.12], sp, () => ({ mat: M.gold, alb: 0.5 }), [r * 0.85, -r * 0.78, zs * r * 0.5]);
  }
  // Stubby legs on little clouds.
  for (const [lx, lz] of [[0.6, -0.35], [0.6, 0.35], [-0.55, -0.35], [-0.55, 0.35]]) {
    ellipsoid(B, body, [r * 0.16, r * 0.26, r * 0.16], sp, () => ({ mat: M.cream, alb: 0.55 }), [lx * r, r * 0.62, lz * r]);
    sphere(B, body, r * 0.3, sp * 1.3, d => (d[1] < -0.3 ? null : { mat: M.cloud, alb: 0.7 - d[1] * 0.2 }), [lx * r, r * 0.9, lz * r]);
  }
  // A woof: puffs from the mouth while it barks.
  for (let i = 0; i < 6; i++) B.glowAt([r * 2.2 + i * r * 0.25, -r * 0.2 - i * r * 0.15, 0], r * 0.35, [0.9, 0.95, 1], body, G.gate | G.flicker, i / 6);
  const tail = B.body({ kind: 'dog', name: 'tail', pos: [0, 0, 0], attach: { parent: body, offset: [-r * 1.0, -r * 0.35, 0] } });
  tube(B, tail, [[0, 0, 0], [-r * 0.35, -r * 0.35, 0], [-r * 0.3, -r * 0.8, 0]], u => r * (0.2 - u * 0.08), sp, u => ({ mat: u > 0.7 ? M.gold : M.cream, alb: 0.65 }));
  return { body, tail };
};

// ------------------------------------------------------------- populating ---

export const populateFolk = (B: Builder, ctx: Ctx, herds: { anchor: V3 }[]): Folk => {
  const { rand, s, f, viewH, pageH } = ctx;
  // Kites: three shoals, each roaming its own stretch of the page, the first in the opening view.
  const schools: School[] = [];
  const kites: Kite[] = [];
  const nSchools = Math.max(2, Math.min(4, Math.round(pageH / 2000)));
  for (let i = 0; i < nSchools; i++) {
    const z = -(0.1 + rand() * 0.25) * f;
    const band: [number, number] = [(i / nSchools) * pageH, ((i + 1) / nSchools) * pageH];
    const centre = i === 0 ? ctx.at(0.86, viewH * 0.55, z) : ctx.at(rand() < 0.5 ? 0.12 : 0.88, (band[0] + band[1]) / 2, z);
    schools.push({ centre, vel: [0, 0, 0], target: centre, t: 0, band, z });
    const L = 78 * s * ctx.k(z);
    const sp = ctx.sp(z) * 0.55;
    const pats = kitePatterns();
    for (let j = 0; j < 5; j++) {
      const body = buildKite(B, L * (0.85 + rand() * 0.3), sp, pats[(i * 2 + j) % pats.length], rand);
      // Loose ranks: staggered back and up and down, so each kite reads on its own.
      const slot: V3 = [(j - 2) * L * 0.9 + (rand() - 0.5) * L * 0.4, ((j % 2) - 0.5) * L * 1.3 + (rand() - 0.5) * L * 0.5, (rand() - 0.5) * L * 1.5];
      kites.push({ body, L, school: i, slot, pos: add(centre, slot), vel: [0, 0, 0], flee: 0, fleeDir: [1, 0, 0], face: [1, 0, 0], phase: rand() * 6 });
    }
  }

  // Seed puffs: a few clusters on the wind.
  const clusters: Cluster[] = [];
  const puffs: Puff[] = [];
  for (let c = 0; c < 3; c++) {
    const z = -(0.08 + rand() * 0.2) * f;
    clusters.push({ centre: ctx.at(0.1 + c * 0.35, viewH * (0.3 + c * 0.25), z), z });
    const r = 5 * s * ctx.k(z);
    for (let i = 0; i < 5; i++) {
      puffs.push({ body: buildPuff(B, r, ctx.sp(z) * 0.5, rand), r, cluster: c, mode: 'ride', pos: [...clusters[c].centre] as V3, vel: [0, 0, 0], t: 0, wait: 6 + rand() * 20, island: -1, perch: 0, orbit: rand() * 6, phase: rand() * 6 });
    }
  }
  // A few flowers' worth on each island, waiting for a seed.
  const flowers: Flower[] = [];
  const petals = [M.blossom, M.gold, M.coral, M.wisteria, M.crystal];
  ctx.islands.forEach((isl, ii) => {
    if (isl.far || !isl.perches.length) return;
    const z = B.bodies[isl.body].pos[2];
    for (let j = 0; j < 3; j++) flowers.push({ body: buildFlower(B, isl, 26 * s * ctx.k(z), ctx.sp(z) * 0.5, petals[(ii + j) % petals.length]), island: ii, age: -1, life: 0 });
  });

  // The vines of the hanging gardens.
  const vines: Vine[] = [];
  ctx.islands.forEach((isl, ii) => isl.vines.forEach(v => vines.push({ body: v.body, island: ii, root: v.root, len: v.len, ax: 0, az: 0, vx: 0, vz: 0, phase: rand() * 6 })));

  // The dog, with the first herd.
  let dog: Dog | null = null;
  if (herds.length) {
    const z = herds[0].anchor[2];
    const r = 28 * s * ctx.k(z);
    const { body, tail } = buildDog(B, r, ctx.sp(z) * 0.55);
    dog = { body, tail, r, herd: 0, pos: add(herds[0].anchor, [0, -r * 4, 0]), vel: [0, 0, 0], mode: 'patrol', target: -1, t: 0, heading: 1, bark: 0, orbit: 0 };
  }
  return { kites, schools, puffs, clusters, flowers, vines, dog, wind: 1 };
};

// -------------------------------------------------------------- behaviour ---

const inView = (scene: SkyScene, cam: SkyCamera, p: V3, margin: number) => {
  const [x, y] = toScreen(scene, cam, p);
  return x > -margin && x < cam.viewW + margin && y > -margin && y < cam.viewH + margin;
};

const stepKites = (scene: SkyScene, folk: Folk, t: number, dt: number, cam: SkyCamera, rand: () => number) => {
  const heads = scene.life.dragons.map(d => d.pos);
  const R = scene.life.dragons[0]?.R ?? 26;
  for (const sc of folk.schools) {
    sc.t += dt;
    // Roam the shoal's stretch of the page: spots in view when the view is over it, else somewhere along it.
    const viewMid = cam.scrollY + cam.viewH / 2;
    const overBand = viewMid > sc.band[0] - cam.viewH * 0.3 && viewMid < sc.band[1] + cam.viewH * 0.3;
    if (sc.t > 7 || len(sub(sc.target, sc.centre)) < 30) {
      sc.t = 0;
      if (overBand) {
        const right = rand() < 0.5 || cam.scrollY < cam.viewH * 0.8;
        sc.target = fromScreen(scene, cam, cam.viewW * (right ? 0.74 + rand() * 0.2 : 0.06 + rand() * 0.2), cam.viewH * (0.2 + rand() * 0.6), sc.z);
      } else {
        sc.target = [scene.viewW * (rand() < 0.5 ? 0.12 : 0.88), sc.band[0] + rand() * (sc.band[1] - sc.band[0]), sc.z];
      }
      sc.target = clearOfIslands(scene, sc.target, R * 4);
    }
    const to = sub(sc.target, sc.centre);
    const want = scl(to, Math.min(1, len(to) / 200) * 70 * (scene.viewW / 1400) / Math.max(len(to), 1e-3));
    sc.vel = add(sc.vel, scl(sub(want, sc.vel), Math.min(1, dt * 0.8)));
    sc.centre = add(sc.centre, scl(sc.vel, dt));
  }
  for (const k of folk.kites) {
    const sc = folk.schools[k.school];
    // A dragon close by sends each kite darting its own way.
    for (const h of heads) {
      const away = sub(k.pos, h);
      const d = len(away);
      if (d < R * 9 && k.flee <= 0) { k.flee = 2.5; k.fleeDir = norm(add(away, [(rand() - 0.5) * d, (rand() - 0.5) * d, (rand() - 0.5) * d * 0.5])); }
    }
    let want: V3;
    if (k.flee > 0) {
      k.flee -= dt;
      want = scl(k.fleeDir, k.L * 7);
    } else {
      // Hold its place in the shoal, swaying a little, moving as the shoal moves.
      const slot = add(sc.centre, [k.slot[0] + Math.sin(t * 0.7 + k.phase) * k.L * 0.4, k.slot[1] + Math.sin(t * 1.1 + k.phase) * k.L * 0.3, k.slot[2]]);
      want = add(sc.vel, scl(sub(slot, k.pos), 1.2));
    }
    // Room from its neighbours.
    for (const o of folk.kites) {
      if (o === k || o.school !== k.school) continue;
      const d = sub(k.pos, o.pos);
      const dl = len(d);
      if (dl < k.L * 1.1 && dl > 1e-3) want = add(want, scl(d, (k.L * 1.1 - dl) * 2 / dl));
    }
    // Round islands, never through them.
    const ahead = add(k.pos, scl(k.vel, 0.6));
    const clear = clearOfIslands(scene, ahead, k.L * 0.6);
    if (clear !== ahead) want = add(want, add(scl(sub(clear, ahead), 3), [0, -k.L * 3, 0]));
    k.vel = add(k.vel, scl(sub(want, k.vel), Math.min(1, dt * 2.5)));
    const sp = len(k.vel);
    if (sp > k.L * 8) k.vel = scl(k.vel, k.L * 8 / sp);
    k.pos = clearOfIslands(scene, add(k.pos, scl(k.vel, dt)), k.L * 0.4);
    // Painted face to the viewer, as a kite faces the wind, nose along its way across the screen; a wag of the tail.
    const mv = Math.hypot(k.vel[0], k.vel[1]);
    if (mv > k.L * 0.3) k.face = norm([k.face[0] * 0.85 + (k.vel[0] / mv) * 0.15, k.face[1] * 0.85 + (k.vel[1] / mv) * 0.1, 0]);
    scene.bodies[k.body].live = { c: k.pos, rot: mul3(frameAlong(k.face), rotY(Math.sin(t * 5 + k.phase) * 0.18)) };
  }
};

const stepPuffs = (scene: SkyScene, folk: Folk, t: number, dt: number, cam: SkyCamera, rand: () => number) => {
  folk.wind = 1 + Math.sin(t * 0.13) * 0.4;
  const drift = 26 * (scene.viewW / 1400) * folk.wind;
  // While the hero's words are on screen, an updraft carries the puffs up the right-hand margin instead of across them.
  const updraft = cam.scrollY < cam.viewH * 0.9;
  for (const cl of folk.clusters) {
    if (updraft) {
      cl.centre[1] -= drift * 0.8 * dt;
      cl.centre[0] += Math.sin(t * 0.5 + cl.z) * 10 * dt;
    } else {
      // Ride the wind across the view; blown out of it, come round again from upwind.
      cl.centre[0] += drift * dt;
      cl.centre[1] += Math.sin(t * 0.4 + cl.z) * 8 * dt;
    }
    const [x, y] = toScreen(scene, cam, cl.centre);
    const gone = updraft ? y < -150 || x < cam.viewW * 0.68 || x > cam.viewW + 100 : x > cam.viewW + 150 || y < -300 || y > cam.viewH + 300;
    if (gone) {
      cl.centre = updraft
        ? fromScreen(scene, cam, cam.viewW * (0.76 + rand() * 0.16), cam.viewH + 80, cl.z)
        : fromScreen(scene, cam, -120, cam.viewH * (0.15 + rand() * 0.7), cl.z);
    }
  }
  for (const pf of folk.puffs) {
    const cl = folk.clusters[pf.cluster];
    const b = scene.bodies[pf.body];
    pf.t += dt;
    if (pf.mode === 'ride') {
      pf.orbit += dt * 0.6;
      const home = add(cl.centre, [Math.cos(pf.orbit + pf.phase) * pf.r * 9, Math.sin(pf.orbit * 1.3 + pf.phase) * pf.r * 6, Math.sin(pf.orbit + pf.phase) * pf.r * 5]);
      pf.pos = add(pf.pos, scl(sub(home, pf.pos), Math.min(1, dt * 1.5)));
      pf.wait -= dt;
      // Time to settle: drift down onto an island in view with room for a flower.
      if (pf.wait <= 0) {
        pf.wait = 8 + rand() * 14;
        const options = scene.islands.map((isl, i) => i).filter(i => {
          const isl = scene.islands[i];
          return !isl.far && isl.perches.length && inView(scene, cam, scene.centres?.[isl.body] ?? PARKED, -40) && folk.flowers.some(fl => fl.island === i);
        });
        if (options.length) { pf.mode = 'fall'; pf.island = options[Math.floor(rand() * options.length)]; pf.perch = Math.floor(rand() * 1000); pf.t = 0; }
      }
      b.scale = [1, 1, 1];
    } else if (pf.mode === 'fall') {
      const isl = scene.islands[pf.island];
      const spot = onIsland(scene, isl, isl.perches[pf.perch % isl.perches.length]);
      const to = sub(spot, pf.pos);
      const d = len(to);
      // Drifting down, swaying on the air.
      const v = Math.min(d, pf.r * 14) / Math.max(d, 1e-3);
      pf.pos = add(pf.pos, add(scl(to, v * dt), [Math.sin(t * 2 + pf.phase) * pf.r * 3 * dt, 0, 0]));
      if (d < pf.r * 1.5 || pf.t > 15) {
        if (d < pf.r * 1.5) {
          // A flower grows where it lands: a free one on this island, or the oldest.
          const mine = folk.flowers.filter(fl => fl.island === pf.island);
          const fl = mine.find(m => m.age < 0) ?? mine.reduce((a, m) => (m.age > a.age ? m : a), mine[0]);
          if (fl) {
            fl.age = 0; fl.life = 50 + rand() * 40;
            scene.bodies[fl.body].attach!.offset = [...isl.perches[pf.perch % isl.perches.length]] as V3;
          }
        }
        pf.mode = 'melt'; pf.t = 0;
      }
    } else {
      // Melting away, then back to its cluster.
      const k = Math.max(0.01, 1 - pf.t / 1.2);
      b.scale = [k, k, k];
      if (pf.t > 1.2) { pf.mode = 'ride'; pf.pos = [...cl.centre] as V3; pf.t = 0; }
    }
    b.live = { c: pf.pos, rot: rotZ(Math.sin(t * 1.5 + pf.phase) * 0.3) };
  }
  // Flowers grow, bloom a while, then wilt away.
  for (const fl of folk.flowers) {
    const b = scene.bodies[fl.body];
    if (fl.age < 0) { b.params = [0, 0, 0, 0]; continue; }
    fl.age += dt;
    const grow = Math.min(1, fl.age / 2.5);
    const wilt = fl.age > fl.life ? Math.max(0, 1 - (fl.age - fl.life) / 3) : 1;
    // A springy pop as it opens.
    const k = Math.max(0.01, (grow < 1 ? grow * (1 + Math.sin(grow * Math.PI) * 0.25) : 1) * wilt);
    b.scale = [k, k, k];
    b.live = { c: [0, 0, 0], rot: rotZ(Math.sin(t * 1.3 + fl.body) * 0.08 + (1 - wilt) * 0.6) };
    b.params = [0, 0, 1, 0];
    if (wilt <= 0) fl.age = -1;
  }
};

const stepVines = (scene: SkyScene, folk: Folk, t: number, dt: number, cam: SkyCamera) => {
  // Everything that can brush through a curtain, with how fast it's going.
  const movers: { p: V3; v: V3; r: number }[] = [];
  for (const b of scene.life.critters.birds) if (b.mode !== 'nest' && b.mode !== 'perch') movers.push({ p: b.pos, v: b.vel, r: b.r * 2 });
  for (const k of folk.kites) movers.push({ p: k.pos, v: k.vel, r: k.L });
  if (folk.dog) movers.push({ p: folk.dog.pos, v: folk.dog.vel, r: folk.dog.r * 2 });
  for (const d of scene.life.dragons) {
    const v = scl(d.dir, d.speed);
    movers.push({ p: d.pos, v, r: d.R * 1.6 });
    for (let i = 0; i < d.segs.length; i += 4) { const c = scene.centres?.[d.segs[i]]; if (c) movers.push({ p: c, v, r: d.R * 1.4 }); }
  }
  for (const vn of folk.vines) {
    const isl = scene.islands[vn.island];
    const mid = onIsland(scene, isl, [vn.root[0], vn.root[1] + vn.len * 0.5, vn.root[2]]);
    if (inView(scene, cam, mid, 200)) {
      for (const m of movers) {
        const dx = m.p[0] - mid[0], dy = m.p[1] - mid[1], dz = m.p[2] - mid[2];
        const reach = vn.len * 0.55 + m.r;
        if (dx * dx + dy * dy + dz * dz < reach * reach) {
          // Pushed along with whatever goes through.
          vn.vz += (m.v[0] / vn.len) * dt * 6;
          vn.vx -= (m.v[2] / vn.len) * dt * 6;
        }
      }
    }
    // A spring back to hanging, with a breath of wind.
    const breeze = Math.sin(t * 0.8 + vn.phase) * 0.04 * folk.wind;
    vn.vz += (-(vn.az - breeze) * 9 - vn.vz * 2.2) * dt;
    vn.vx += (-vn.ax * 9 - vn.vx * 2.2) * dt;
    vn.az = clamp(vn.az + vn.vz * dt, -0.9, 0.9);
    vn.ax = clamp(vn.ax + vn.vx * dt, -0.7, 0.7);
    scene.bodies[vn.body].live = { c: [0, 0, 0], rot: mul3(rotZ(vn.az), rotX(vn.ax)) };
  }
};

const stepDog = (scene: SkyScene, folk: Folk, t: number, dt: number, cam: SkyCamera, rand: () => number) => {
  const dog = folk.dog;
  if (!dog) return;
  const cr = scene.life.critters;
  const herds = cr.herds;
  // Work the herd nearest the view.
  const viewMid = cam.scrollY + cam.viewH / 2;
  let best = dog.herd;
  herds.forEach((h, i) => { if (Math.abs(h.anchor[1] - viewMid) < Math.abs(herds[best].anchor[1] - viewMid) - cam.viewH * 0.3) best = i; });
  if (best !== dog.herd) { dog.herd = best; dog.mode = 'patrol'; dog.target = -1; }
  const herd = herds[dog.herd];
  const flock = cr.sheep.filter(sh => sh.herd === dog.herd);
  dog.t += dt;
  let goal: V3;
  if (dog.mode === 'chase' && dog.target >= 0) {
    const sh = cr.sheep[dog.target];
    // Round behind it, on the far side from the herd, then in for a nip.
    const out = norm(sub(sh.home, herd.anchor));
    const behind = add(sh.pos, add(scl(out, sh.r * 2.6), [0, -sh.r * 0.4, 0]));
    goal = dog.t > 2.2 ? sh.pos : behind;
    if (len(sub(dog.pos, sh.pos)) < sh.r * 1.9 && dog.t > 1.2) {
      // Nip! It hops and heads back to the others.
      sh.hopV = -sh.r * 10; sh.hop = 1e-3; sh.sqv += 5;
      sh.home = add(herd.anchor, scl(sub(sh.home, herd.anchor), 0.25));
      sh.heading = Math.sign(herd.anchor[0] - sh.pos[0]) || 1;
      dog.bark = 0.6;
      dog.mode = 'patrol'; dog.t = 0; dog.target = -1;
    }
    if (dog.t > 9) { dog.mode = 'patrol'; dog.t = 0; }
  } else {
    // Circle the herd, keeping an eye out for anyone wandering off.
    dog.orbit += dt * 0.5;
    const rr = (flock[0]?.r ?? 30) * 5;
    goal = add(herd.anchor, [Math.cos(dog.orbit) * rr, -rr * 0.5 + Math.sin(dog.orbit * 2) * rr * 0.2, Math.sin(dog.orbit) * rr * 0.4]);
    if (dog.t > 1.5) {
      let far = -1, farD = 0;
      flock.forEach(sh => { const d = len(sub(sh.home, herd.anchor)); if (d > farD) { farD = d; far = cr.sheep.indexOf(sh); } });
      if (far >= 0 && farD > cr.sheep[far].r * 3.2) { dog.mode = 'chase'; dog.target = far; dog.t = 0; }
    }
  }
  goal = clearOfIslands(scene, goal, dog.r * 1.5);
  const to = sub(goal, dog.pos);
  const d = len(to);
  const speed = dog.r * (dog.mode === 'chase' ? 9 : 5);
  const want = scl(to, Math.min(1, d / (dog.r * 2)) * speed / Math.max(d, 1e-3));
  dog.vel = add(dog.vel, scl(sub(want, dog.vel), Math.min(1, dt * 3)));
  dog.pos = clearOfIslands(scene, add(dog.pos, scl(dog.vel, dt)), dog.r * 1.2);
  if (Math.abs(dog.vel[0]) > dog.r * 0.5) dog.heading = Math.sign(dog.vel[0]);
  dog.bark = Math.max(0, dog.bark - dt);
  // A bounding gait as it runs on its clouds.
  const gait = Math.abs(Math.sin(t * 9)) * dog.r * 0.25 * Math.min(1, len(dog.vel) / (dog.r * 3));
  const b = scene.bodies[dog.body];
  b.live = { c: [dog.pos[0], dog.pos[1] - gait, dog.pos[2]], rot: mul3(rotY(dog.heading > 0 ? -0.55 : Math.PI + 0.55), rotZ(clamp(-dog.vel[1] / (dog.r * 20), -0.3, 0.3))) };
  b.params = [0, 0, dog.bark > 0.3 ? 1 : 0, 0];
  scene.bodies[dog.tail].live = { c: [0, 0, 0], rot: rotY(Math.sin(t * (dog.mode === 'chase' ? 18 : 11)) * 0.7) };
  void rand;
};

export const stepFolk = (scene: SkyScene, t: number, dt: number, cam: SkyCamera, rand: () => number) => {
  const folk = scene.life.critters.folk;
  stepKites(scene, folk, t, dt, cam, rand);
  stepPuffs(scene, folk, t, dt, cam, rand);
  stepDog(scene, folk, t, dt, cam, rand);
  stepVines(scene, folk, t, dt, cam);
};

/** Sends every herd's sheep wandering off, for the dog to round up. */
export const scatterSheep = (scene: SkyScene) => {
  const cr = scene.life.critters;
  for (const sh of cr.sheep) {
    const h = cr.herds[sh.herd];
    const out = norm(add(sub(sh.home, h.anchor), [(Math.random() - 0.5) * sh.r, (Math.random() - 0.5) * sh.r, 0]));
    const to = add(h.anchor, scl(out, sh.r * (4 + Math.random() * 2)));
    if (clearOfIslands(scene, to, sh.r * 1.8) === to) sh.home = to;
  }
};

/** Sets a seed puff drifting down onto an island in view at once. */
export const dropSeeds = (scene: SkyScene) => { for (const pf of scene.life.critters.folk.puffs) pf.wait = Math.min(pf.wait, Math.random() * 3); };
