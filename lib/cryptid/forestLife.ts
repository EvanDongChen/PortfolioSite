import { V3, mul3, norm, rotX, rotY, rotZ } from '../space/space';
import {
  Builder, Camp, Clearing, F, ForestCamera, ForestScene, G, M, Perch, Pond, Tree, UP, ellipsoid, fromScreen, pathXOf, sphere, toScreen, tube, upright,
} from './forest';

/**
 * Everything that lives in the cryptid forest, and the flashlight they live in
 * fear (or awe) of.
 *
 * The cryptids:
 * - Bigfoot strides through the trees along the gutters. Caught in the beam,
 *   it freezes mid-step and looks back over its shoulder at you, then hurries
 *   off to stand behind the nearest pine until the coast is clear. Now and then
 *   it wanders into the abandoned camp to rummage in the cooler.
 * - Fresno Nightcrawlers, a pair of white pants-on-legs, waddle stiffly along
 *   the trail in the dark and speed-walk off when the light finds them.
 * - Mothman perches high in a dead tree, two red eyes in the dark. When the
 *   light rests in one place long enough the moths gather in it, and he comes:
 *   wings spread, he swoops down and circles the beam, then goes back up.
 * - The Jersey Devil hops from branch to branch on bat wings; lit, it screeches
 *   (wings flung wide, a shower of leaves shaken loose) and flees to another tree.
 * - The Wendigo is only there when you aren't looking: a gaunt, antlered shape
 *   at the edge of the dark that dissolves in the beam, and each time you sweep
 *   back it stands a little closer. Catch it square in the light and it's gone.
 * - Something lives in the first pond: when nobody's watching the water, a long
 *   neck rises out of it in silhouette, looks about, and sinks again in rings.
 *
 * Holding a cryptid in the light long enough documents it: a camera flash, and
 * a photo for the case file (`snaps`, picked up by the host).
 *
 * And the ordinary night: owls on the dead trees whose eyes shine green and
 * whose heads follow the beam; deer that freeze in it, eyes glowing, then bound
 * off with their white tails up; raccoons raiding the camp cooler and
 * squabbling over what they find; fireflies in the clearings that go dark in
 * the beam; moths that gather wherever it rests.
 */

const PARKED: V3 = [0, -1e6, 0];
const TAU = Math.PI * 2;

export type CryptidKind = 'bigfoot' | 'crawler' | 'mothman' | 'devil' | 'wendigo' | 'nessie';
export const CRYPTIDS: CryptidKind[] = ['bigfoot', 'crawler', 'mothman', 'devil', 'wendigo', 'nessie'];
export const CRYPTID_NAME: Record<CryptidKind, string> = {
  bigfoot: 'Bigfoot', crawler: 'Fresno Nightcrawlers', mothman: 'Mothman', devil: 'Jersey Devil', wendigo: 'Wendigo', nessie: 'The lake monster',
};

interface Walker {
  body: number;
  pos: V3;
  heading: number;
  /** Seconds of stride, for the walk cycle. */
  stride: number;
  /** Squash and stretch. */
  sq: number;
  sqv: number;
}

export interface Bigfoot extends Walker {
  kind: 'bigfoot';
  head: number; legs: [number, number]; arms: [number, number]; H: number;
  mode: 'walk' | 'frozen' | 'hide' | 'lurk' | 'rummage' | 'leave';
  target: V3; t: number; look: number; tree: number; exposure: number;
}
export interface Crawler extends Walker {
  kind: 'crawler';
  legs: [number, number]; H: number;
  /** Which way along the trail: +1 down the page, -1 up it. */
  dir: number; lead: boolean; mode: 'waddle' | 'scurry'; t: number; exposure: number; lag: number;
}
export interface Mothman {
  kind: 'mothman';
  body: number; wings: [number, number]; H: number;
  pos: V3; heading: number; perch: number; mode: 'perch' | 'swoop' | 'circle' | 'return';
  t: number; flap: number; spread: number; exposure: number; from: V3; to: V3; orbit: number; blinkIn: number; blink: number;
}
export interface Devil {
  kind: 'devil';
  body: number; wings: [number, number]; H: number;
  pos: V3; heading: number; perch: number; mode: 'perch' | 'hop' | 'screech' | 'flee';
  t: number; dur: number; from: V3; to: V3; flap: number; spread: number; exposure: number; rest: number;
}
export interface Wendigo {
  kind: 'wendigo';
  body: number; H: number;
  pos: V3; heading: number; vis: number;
  /** How near it dares come to the light now: shrinks each time it's swept. */
  dare: number; mode: 'stalk' | 'gone'; t: number; lit: number; exposure: number;
}
export interface Nessie {
  kind: 'nessie';
  body: number; H: number; pond: number;
  pos: V3; heading: number; rise: number; mode: 'below' | 'rising' | 'up' | 'sinking';
  t: number; unwatched: number; exposure: number; look: number;
}
export interface Owl { body: number; head: number; perch: number; pos: V3; turn: number; blinkIn: number; blink: number; hoot: number; r: number }
export interface Deer extends Walker {
  head: number; legs: number[]; r: number;
  mode: 'graze' | 'walk' | 'frozen' | 'flee'; target: V3; t: number; home: V3; hop: number; look: number;
}
export interface Raccoon extends Walker {
  r: number; mode: 'forage' | 'raid' | 'tug' | 'run' | 'frozen'; target: V3; t: number; carry: boolean; look: number;
}

export interface FeedEvent { t: number; text: string; star?: boolean }

/** Everything that lives in the forest. */
export interface ForestLife {
  /** The flashlight: where its beam is on screen (CSS px), how wide, how bright. */
  beam: { x: number; y: number; r: number; on: number };
  /** Where the beam has come to rest on the floor, and for how long. */
  rest: { p: V3; t: number };
  /** Rings spreading on the ponds: x, y, radius, strength. */
  ripples: [number, number, number, number][];
  /** A camera flash whitening everything, 0..1; it goes off the frame after a photo is taken, so the photo isn't washed out. */
  flash: number;
  flashNext: boolean;
  bigfoot: Bigfoot[];
  crawlers: Crawler[];
  mothman: Mothman;
  devil: Devil;
  wendigo: Wendigo;
  nessie: Nessie | null;
  owls: Owl[];
  deer: Deer[];
  raccoons: Raccoon[];
  snack: { body: number; pos: V3; holder: number; t: number; raid: number };
  moths: { body: number; density: number; p: V3 };
  leaves: { body: number; t: number };
  fireflies: number;
  perches: Perch[];
  trees: Tree[];
  camp: Camp;
  ponds: Pond[];
  clearings: Clearing[];
  s: number;
  phone: boolean;
  time: number;
  /** Times each cryptid has been documented, and the photos waiting for the host to take. */
  documented: Record<CryptidKind, number>;
  snaps: { kind: CryptidKind; x: number; y: number; r: number }[];
  events: FeedEvent[];
}

export interface LifeCtx {
  rand: () => number;
  s: number;
  f: number;
  viewW: number;
  viewH: number;
  pageH: number;
  phone: boolean;
  trees: Tree[];
  perches: Perch[];
  ponds: Pond[];
  clearings: Clearing[];
  camp: Camp;
  pathX: (y: number) => number;
  pathW: number;
}

// ------------------------------------------------------------------ maths ---

const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const scl = (a: V3, k: number): V3 => [a[0] * k, a[1] * k, a[2] * k];
const lerp3 = (a: V3, b: V3, t: number): V3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const wrap = (a: number) => { a = (a + Math.PI) % TAU; return a < 0 ? a + TAU - Math.PI : a - Math.PI; };
const dist2 = (a: V3, b: V3) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const smooth = (t: number) => t * t * (3 - 2 * t);
/** Turns `from` towards `to` by at most `rate` radians. */
const turnTo = (from: number, to: number, rate: number) => { const d = wrap(to - from); return from + clamp(d, -rate, rate); };
/** Standing on the floor at `p`, facing page heading `h` (0 = right, π/2 = down the page, towards the viewer). */
const facing = (h: number) => upright(-h);
/** Raised `k` px off the floor, along up. */
const lift = (p: V3, k: number): V3 => [p[0] + UP[0] * k, p[1] + UP[1] * k, p[2] + UP[2] * k];

/** The flashlight's strength at window point (sx, sy), as the shaders work it out. */
const spotAt = (life: ForestLife, sx: number, sy: number) => {
  const b = life.beam;
  const d = Math.hypot(sx - b.x, sy - b.y);
  const ss = (e0: number, e1: number, x: number) => { const t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); };
  return (ss(b.r, b.r * 0.72, d) * 0.88 + ss(b.r * 1.7, b.r * 0.9, d) * 0.12) * b.on;
};
const spotOn = (scene: ForestScene, cam: ForestCamera, p: V3) => { const [x, y] = toScreen(scene, cam, p); return spotAt(scene.life, x, y); };
const onScreen = (scene: ForestScene, cam: ForestCamera, p: V3, m = 0) => {
  const [x, y] = toScreen(scene, cam, p);
  return x > -m && x < cam.viewW + m && y > -m && y < cam.viewH + m;
};
/** The floor point under the beam's middle. */
const beamFloor = (scene: ForestScene, cam: ForestCamera): V3 => fromScreen(scene, cam, scene.life.beam.x, scene.life.beam.y, 0);

const say = (life: ForestLife, text: string, star = false) => {
  life.events.unshift({ t: life.time, text, star });
  if (life.events.length > 12) life.events.length = 12;
};

/**
 * Held in the light, a cryptid is documented: a flash, a photo for the case
 * file. `exposure` builds while it's lit and fades when it isn't.
 */
const expose = (scene: ForestScene, cam: ForestCamera, c: { exposure: number }, kind: CryptidKind, p: V3, r: number, spot: number, dt: number) => {
  const life = scene.life;
  if (spot > 0.45) c.exposure += dt * spot;
  else c.exposure = Math.max(0, c.exposure - dt * 0.6);
  if (c.exposure < 1.3) return false;
  c.exposure = -30; // a good while before the same one can be snapped again
  life.documented[kind]++;
  life.flashNext = true;
  const [x, y] = toScreen(scene, cam, p);
  life.snaps.push({ kind, x, y, r: r * scene.focal / (scene.focal - p[2]) });
  say(life, `${CRYPTID_NAME[kind]} documented!`, true);
  return true;
};

// --------------------------------------------------------------- builders ---
// Each is built upright about its own foot (local -y up), facing +x, its side along z.

const furAlb = (d: V3, k: number) => 0.45 - d[1] * 0.2 + (Math.sin(d[0] * 37 + d[2] * 29 + d[1] * 4) > 0.3 ? k : -k * 0.6);

/** Bigfoot: a hulking, hairy figure, long-armed, with a crested head and eyes that shine in the light. */
const buildBigfoot = (B: Builder, H: number, sp: number) => {
  const body = B.body({ kind: 'bigfoot', name: 'Bigfoot', pos: PARKED, radius: H * 0.6, params: [0, 0, 0, 0] });
  // A barrel of a torso, hunched forward, with a hump of shoulders.
  ellipsoid(B, body, [H * 0.17, H * 0.25, H * 0.2], sp, d => ({ mat: M.fur, alb: furAlb(d, 0.12) }), [H * 0.02, -H * 0.62, 0]);
  ellipsoid(B, body, [H * 0.15, H * 0.1, H * 0.25], sp, d => (d[1] > 0.4 ? null : { mat: M.fur, alb: furAlb(d, 0.12) + 0.05 }), [-H * 0.01, -H * 0.78, 0]);
  // Hips.
  ellipsoid(B, body, [H * 0.14, H * 0.1, H * 0.17], sp, d => ({ mat: M.fur, alb: furAlb(d, 0.1) - 0.05 }), [0, -H * 0.43, 0]);
  const head = B.body({ kind: 'limb', name: 'Bigfoot', pos: [0, 0, 0], attach: { parent: body, offset: [H * 0.07, -H * 0.86, 0] } });
  sphere(B, head, H * 0.1, sp, d => ({ mat: M.fur, alb: furAlb(d, 0.12) }), [0, -H * 0.03, 0]);
  // A sagittal crest, and the face: dark leathery skin under a heavy brow.
  ellipsoid(B, head, [H * 0.07, H * 0.06, H * 0.035], sp, d => ({ mat: M.fur, alb: 0.45 - d[1] * 0.2 }), [-H * 0.02, -H * 0.12, 0]);
  ellipsoid(B, head, [H * 0.05, H * 0.07, H * 0.075], sp, d => (d[0] < 0 ? null : { mat: M.black, alb: 0.55 + d[1] * 0.15 }), [H * 0.06, -H * 0.01, 0]);
  ellipsoid(B, head, [H * 0.04, H * 0.018, H * 0.085], sp, () => ({ mat: M.fur, alb: 0.5 }), [H * 0.085, -H * 0.055, 0]);
  for (const zs of [-1, 1]) sphere(B, head, H * 0.017, sp * 0.6, () => ({ mat: M.redeye, alb: 0.6, flags: F.shine }), [H * 0.11, -H * 0.04, zs * H * 0.035]);
  const legs: number[] = [];
  for (const zs of [-1, 1]) {
    const leg = B.body({ kind: 'limb', name: 'leg', pos: [0, 0, 0], attach: { parent: body, offset: [0, -H * 0.42, zs * H * 0.09] } });
    tube(B, leg, [[0, 0, 0], [H * 0.02, H * 0.22, 0], [0, H * 0.4, 0]], u => H * (0.085 - u * 0.03), sp, (u, n) => ({ mat: M.fur, alb: 0.4 + n[0] * 0.1 - u * 0.1 }));
    ellipsoid(B, leg, [H * 0.08, H * 0.025, H * 0.045], sp, () => ({ mat: M.black, alb: 0.5 }), [H * 0.04, H * 0.41, 0]);
    legs.push(leg);
  }
  const arms: number[] = [];
  for (const zs of [-1, 1]) {
    const arm = B.body({ kind: 'limb', name: 'arm', pos: [0, 0, 0], attach: { parent: body, offset: [H * 0.03, -H * 0.76, zs * H * 0.23] } });
    tube(B, arm, [[0, 0, 0], [0, H * 0.22, zs * H * 0.02], [H * 0.03, H * 0.42, zs * H * 0.01]], u => H * (0.06 - u * 0.02), sp, (u, n) => ({ mat: M.fur, alb: 0.42 + n[0] * 0.1 - u * 0.05 }));
    sphere(B, arm, H * 0.04, sp, () => ({ mat: M.black, alb: 0.5 }), [H * 0.03, H * 0.45, zs * H * 0.01]);
    arms.push(arm);
  }
  return { body, head, legs: legs as [number, number], arms: arms as [number, number] };
};

/** A Fresno Nightcrawler: a little white hood of a body perched on two long, stiff legs. */
const buildCrawler = (B: Builder, H: number, sp: number) => {
  const body = B.body({ kind: 'crawler', name: 'Fresno Nightcrawler', pos: PARKED, radius: H * 0.6 });
  ellipsoid(B, body, [H * 0.15, H * 0.22, H * 0.13], sp, d => ({ mat: M.pale, alb: 0.6 - d[1] * 0.15, flags: F.emissive }), [0, -H * 0.78, 0]);
  // A faint pair of dark marks where a face might be.
  for (const zs of [-1, 1]) sphere(B, body, H * 0.022, sp * 0.6, () => ({ mat: M.pale, alb: 0.1, flags: F.emissive }), [H * 0.14, -H * 0.84, zs * H * 0.045]);
  const legs: number[] = [];
  for (const zs of [-1, 1]) {
    const leg = B.body({ kind: 'limb', name: 'leg', pos: [0, 0, 0], attach: { parent: body, offset: [0, -H * 0.58, zs * H * 0.065] } });
    tube(B, leg, [[0, 0, 0], [0, H * 0.58, 0]], u => H * (0.05 - u * 0.015), sp, () => ({ mat: M.pale, alb: 0.5, flags: F.emissive }));
    legs.push(leg);
  }
  return { body, legs: legs as [number, number] };
};

/** A wing of membrane between long fingers, reaching out along +z (or -z), its own body so it can beat. */
const batWing = (B: Builder, parent: number, offset: V3, side: number, span: number, sp: number, mat: number) => {
  const wing = B.body({ kind: 'wing', name: 'wing', pos: [0, 0, 0], attach: { parent, offset } });
  const fingers = 4;
  for (let f = 0; f <= fingers; f++) {
    const a = (f / fingers) * 1.4 - 0.2;
    const tip: V3 = [-Math.sin(a) * span * 0.6, Math.cos(a) * span * 0.25 - span * 0.15, side * Math.cos(a * 0.6) * span];
    tube(B, wing, [[0, 0, 0], [tip[0] * 0.5, tip[1] * 0.5 - span * 0.12, tip[2] * 0.5], tip], () => sp * 0.4, sp, () => ({ mat, alb: 0.35 }), F.twoSided);
  }
  // The membrane: a fan of surfels between the fingers, scalloped at the trailing edge.
  for (let u = 0.08; u <= 1; u += sp / span * 0.9) {
    for (let a = -0.2; a <= 1.2; a += (sp / (span * u + 1)) * 0.9) {
      const scallop = 1 - 0.18 * Math.abs(Math.sin(((a + 0.2) / 1.4) * fingers * Math.PI));
      if (u > scallop) continue;
      const tip: V3 = [-Math.sin(a) * span * 0.6, Math.cos(a) * span * 0.25 - span * 0.15, side * Math.cos(a * 0.6) * span];
      const sag = Math.sin(u * Math.PI) * span * 0.08;
      B.surfel([tip[0] * u, tip[1] * u - span * 0.12 * Math.sin(u * Math.PI) + sag, tip[2] * u], [0, -1, 0], sp * 0.9, mat, 0.3 + u * 0.15, wing, F.twoSided);
    }
  }
  return wing;
};

/** Mothman: a tall dark figure with great moth wings and two burning red eyes. */
const buildMothman = (B: Builder, H: number, sp: number) => {
  const body = B.body({ kind: 'mothman', name: 'Mothman', pos: PARKED, radius: H * 0.8, params: [0, 0, 0, 0] });
  ellipsoid(B, body, [H * 0.12, H * 0.3, H * 0.13], sp, d => ({ mat: M.moth, alb: 0.4 - d[1] * 0.15 + Math.sin(d[1] * 30) * 0.05 }), [0, -H * 0.6, 0]);
  // A furred collar, like a moth's.
  ellipsoid(B, body, [H * 0.12, H * 0.07, H * 0.16], sp, d => ({ mat: M.moth, alb: 0.5 - d[1] * 0.1 }), [0, -H * 0.84, 0]);
  sphere(B, body, H * 0.09, sp, d => ({ mat: M.moth, alb: 0.35 - d[1] * 0.1 }), [H * 0.02, -H * 0.95, 0]);
  // Feathery antennae.
  for (const zs of [-1, 1]) tube(B, body, [[H * 0.03, -H * 1.02, zs * H * 0.03], [H * 0.06, -H * 1.12, zs * H * 0.08], [H * 0.03, -H * 1.18, zs * H * 0.12]], u => H * 0.012 * (1 + Math.sin(u * 9) * 0.4), sp * 0.7, () => ({ mat: M.owl, alb: 0.5 }));
  // The eyes: big, red, always burning.
  for (const zs of [-1, 1]) {
    sphere(B, body, H * 0.045, sp * 0.6, d => ({ mat: M.redeye, alb: 0.5 + d[0] * 0.12, flags: F.emissive | F.eye }), [H * 0.08, -H * 0.96, zs * H * 0.045]);
    B.glowAt([H * 0.1, -H * 0.96, zs * H * 0.045], H * 0.09, [0.7, 0.08, 0.05], body, G.flicker, Math.random());
  }
  // Thin legs, and clawed feet that grip a branch.
  for (const zs of [-1, 1]) tube(B, body, [[0, -H * 0.32, zs * H * 0.05], [H * 0.03, -H * 0.15, zs * H * 0.06], [0, 0, zs * H * 0.06]], () => H * 0.025, sp, () => ({ mat: M.moth, alb: 0.35 }));
  const wings: number[] = [];
  for (const zs of [-1, 1]) {
    const wing = B.body({ kind: 'wing', name: 'wing', pos: [0, 0, 0], attach: { parent: body, offset: [-H * 0.06, -H * 0.78, zs * H * 0.08] } });
    // A moth's wing: broad forewing and a rounder hindwing, dusky with a pale eyespot.
    const fw = (u: number, v: number): V3 => [-H * 0.05 - v * H * 0.25 + u * H * 0.1, -H * 0.05 + v * H * 0.18 - u * H * 0.1, zs * (H * 0.04 + u * H * 0.62)];
    for (let u = 0; u <= 1; u += sp / (H * 0.62)) {
      for (let v = 0; v <= 1; v += sp / (H * 0.3)) {
        const edge = Math.sin(u * Math.PI * 0.95 + 0.1) * 0.9 + 0.1;
        if (v > edge) continue;
        const p = fw(u, v);
        const eye = Math.hypot(u - 0.62, v - 0.4) < 0.08;
        B.surfel(p, [0, -1, 0], sp * 0.95, eye ? M.redeye : M.moth, eye ? 0.15 : 0.32 + u * 0.08 - v * 0.12, wing, F.twoSided);
        // Hindwing beneath, darker.
        if (u < 0.65) B.surfel([p[0] - H * 0.12 - v * H * 0.1, p[1] + H * 0.15, p[2] * 0.8], [0, -1, 0], sp * 0.95, M.moth, 0.22 + v * 0.08, wing, F.twoSided);
      }
    }
    wings.push(wing);
  }
  return { body, wings: wings as [number, number] };
};

/** The Jersey Devil: a horse-headed, horned, bat-winged thing with a forked tail and hooves. */
const buildDevil = (B: Builder, H: number, sp: number) => {
  const body = B.body({ kind: 'devil', name: 'Jersey Devil', pos: PARKED, radius: H, params: [0, 0, 0, 0] });
  ellipsoid(B, body, [H * 0.22, H * 0.16, H * 0.14], sp, d => ({ mat: M.devil, alb: 0.45 - d[1] * 0.15 }), [0, -H * 0.45, 0]);
  // A long neck up to a horse's head, with horns and a mouth that opens to screech.
  tube(B, body, [[H * 0.12, -H * 0.5, 0], [H * 0.2, -H * 0.72, 0], [H * 0.25, -H * 0.85, 0]], u => H * (0.08 - u * 0.02), sp, (u, n) => ({ mat: M.devil, alb: 0.42 + n[0] * 0.1 }));
  ellipsoid(B, body, [H * 0.16, H * 0.07, H * 0.065], sp, d => ({ mat: M.devil, alb: 0.45 - d[1] * 0.1 }), [H * 0.34, -H * 0.86, 0]);
  for (const zs of [-1, 1]) {
    tube(B, body, [[H * 0.24, -H * 0.92, zs * H * 0.04], [H * 0.2, -H * 1.05, zs * H * 0.07], [H * 0.12, -H * 1.12, zs * H * 0.06]], u => H * 0.025 * (1 - u * 0.7), sp * 0.7, () => ({ mat: M.bone, alb: 0.55 }));
    sphere(B, body, H * 0.022, sp * 0.5, () => ({ mat: M.redeye, alb: 0.75, flags: F.emissive }), [H * 0.33, -H * 0.9, zs * H * 0.055]);
  }
  ellipsoid(B, body, [H * 0.08, H * 0.03, H * 0.05], sp * 0.6, () => ({ mat: M.redeye, alb: 0.35, flags: F.emissive | F.on }), [H * 0.42, -H * 0.82, 0]);
  // Hind legs like a kangaroo's, ending in hooves; little forelegs.
  for (const zs of [-1, 1]) {
    tube(B, body, [[-H * 0.08, -H * 0.4, zs * H * 0.1], [H * 0.05, -H * 0.2, zs * H * 0.11], [-H * 0.05, 0, zs * H * 0.1]], u => H * (0.06 - u * 0.03), sp, () => ({ mat: M.devil, alb: 0.4 }));
    sphere(B, body, H * 0.035, sp * 0.6, () => ({ mat: M.black, alb: 0.4 }), [-H * 0.04, -H * 0.01, zs * H * 0.1]);
    tube(B, body, [[H * 0.15, -H * 0.42, zs * H * 0.08], [H * 0.24, -H * 0.3, zs * H * 0.09]], () => H * 0.025, sp * 0.7, () => ({ mat: M.devil, alb: 0.4 }));
  }
  // The forked tail.
  tube(B, body, [[-H * 0.2, -H * 0.42, 0], [-H * 0.38, -H * 0.3, 0], [-H * 0.5, -H * 0.38, 0], [-H * 0.58, -H * 0.55, 0]], u => H * 0.025 * (1 - u * 0.5), sp * 0.7, () => ({ mat: M.devil, alb: 0.4 }));
  for (const zs of [-1, 1]) tube(B, body, [[-H * 0.58, -H * 0.55, 0], [-H * 0.62, -H * 0.62, zs * H * 0.05]], () => H * 0.02, sp * 0.6, () => ({ mat: M.devil, alb: 0.5 }));
  const wings: number[] = [];
  for (const zs of [-1, 1]) wings.push(batWing(B, body, [-H * 0.02, -H * 0.55, zs * H * 0.1], zs, H * 0.6, sp, M.devil));
  return { body, wings: wings as [number, number] };
};

/** The Wendigo: impossibly tall and thin, ribs showing, long arms, a deer's skull crowned with antlers. Dimly pale. */
const buildWendigo = (B: Builder, H: number, sp: number) => {
  const body = B.body({ kind: 'wendigo', name: 'Wendigo', pos: PARKED, radius: H * 0.6, vis: 0 });
  const E = F.emissive;
  // A gaunt torso, ribs as bands.
  ellipsoid(B, body, [H * 0.07, H * 0.2, H * 0.09], sp, d => ({ mat: M.wendigo, alb: 0.32 + (Math.sin(d[1] * 22) > 0.4 && d[0] > 0 ? 0.14 : 0) - d[1] * 0.05, flags: E }), [H * 0.03, -H * 0.62, 0]);
  ellipsoid(B, body, [H * 0.06, H * 0.06, H * 0.08], sp, () => ({ mat: M.wendigo, alb: 0.28, flags: E }), [0, -H * 0.42, 0]);
  // Legs: long and bony.
  for (const zs of [-1, 1]) tube(B, body, [[0, -H * 0.42, zs * H * 0.05], [H * 0.04, -H * 0.2, zs * H * 0.055], [-H * 0.01, 0, zs * H * 0.06]], u => H * (0.03 - u * 0.012), sp, () => ({ mat: M.wendigo, alb: 0.3, flags: E }));
  // Arms hanging past its knees, ending in long fingers.
  for (const zs of [-1, 1]) {
    tube(B, body, [[H * 0.03, -H * 0.8, zs * H * 0.1], [H * 0.06, -H * 0.55, zs * H * 0.13], [H * 0.08, -H * 0.3, zs * H * 0.12]], u => H * (0.022 - u * 0.006), sp, () => ({ mat: M.wendigo, alb: 0.3, flags: E }));
    for (let k = -1; k <= 1; k++) tube(B, body, [[H * 0.08, -H * 0.3, zs * H * 0.12], [H * 0.09 + k * H * 0.012, -H * 0.2, zs * H * 0.12 + k * H * 0.01]], () => H * 0.007, sp * 0.6, () => ({ mat: M.wendigo, alb: 0.34, flags: E }));
  }
  // A long skull of a head, bone white, black-eyed, with two small burning pupils.
  ellipsoid(B, body, [H * 0.075, H * 0.05, H * 0.045], sp * 0.8, d => ({ mat: M.bone, alb: 0.42 - d[1] * 0.1, flags: E }), [H * 0.09, -H * 0.88, 0]);
  for (const zs of [-1, 1]) {
    sphere(B, body, H * 0.016, sp * 0.5, () => ({ mat: M.black, alb: 0.2, flags: E }), [H * 0.12, -H * 0.9, zs * H * 0.025]);
    sphere(B, body, H * 0.007, sp * 0.4, () => ({ mat: M.white, alb: 0.95, flags: E }), [H * 0.135, -H * 0.9, zs * H * 0.025]);
  }
  // Antlers: two great branching racks.
  for (const zs of [-1, 1]) {
    const base: V3 = [H * 0.07, -H * 0.93, zs * H * 0.03];
    const main: V3[] = [base, [H * 0.05, -H * 1.02, zs * H * 0.1], [H * 0.02, -H * 1.12, zs * H * 0.16], [H * 0.04, -H * 1.22, zs * H * 0.2]];
    tube(B, body, main, u => H * 0.012 * (1 - u * 0.5), sp * 0.6, () => ({ mat: M.bone, alb: 0.4, flags: E }));
    for (const [i, len] of [[1, 0.08], [2, 0.1], [3, 0.06]] as const) {
      const p = main[i];
      tube(B, body, [p, [p[0] + H * 0.03, p[1] - H * len, p[2] - zs * H * 0.02]], u => H * 0.009 * (1 - u * 0.5), sp * 0.6, () => ({ mat: M.bone, alb: 0.4, flags: E }));
    }
  }
  return body;
};

/** The lake monster: a long dark neck in an S, a small head, a hump behind. Built rising from its surface point. */
const buildNessie = (B: Builder, H: number, sp: number) => {
  const body = B.body({ kind: 'nessie', name: 'lake monster', pos: PARKED, radius: H, params: [0, 0, 0, 0] });
  const neck: V3[] = [];
  for (let i = 0; i <= 10; i++) {
    const u = i / 10;
    neck.push([Math.sin(u * 2.4) * H * 0.18 + u * H * 0.08, -u * H, 0]);
  }
  tube(B, body, neck, u => H * (0.085 - u * 0.04), sp, (u, n) => ({ mat: M.nessie, alb: 0.42 + n[0] * 0.1 + (n[0] < -0.3 ? 0.08 : 0) }));
  const top = neck[10];
  ellipsoid(B, body, [H * 0.11, H * 0.055, H * 0.06], sp, d => ({ mat: M.nessie, alb: 0.45 - d[1] * 0.1 }), [top[0] + H * 0.07, top[1] - H * 0.01, 0]);
  for (const zs of [-1, 1]) sphere(B, body, H * 0.014, sp * 0.5, () => ({ mat: M.shine, alb: 0.5, flags: F.shine | F.emissive }), [top[0] + H * 0.1, top[1] - H * 0.04, zs * H * 0.04]);
  // A hump breaking the surface behind.
  ellipsoid(B, body, [H * 0.22, H * 0.1, H * 0.12], sp, d => (d[1] > 0.2 ? null : { mat: M.nessie, alb: 0.4 - d[1] * 0.1 }), [-H * 0.42, H * 0.02, 0]);
  return body;
};

/** An owl: a round ball of mottled feathers; its head (with ear tufts and two shining eyes) turns on its own. */
const buildOwl = (B: Builder, r: number, sp: number) => {
  const body = B.body({ kind: 'owl', name: 'owl', pos: PARKED, radius: r * 2, params: [0, 0, 0, 0] });
  ellipsoid(B, body, [r * 0.8, r, r * 0.8], sp, d => ({ mat: M.owl, alb: 0.45 - d[1] * 0.15 + (Math.sin(d[1] * 20 + d[2] * 9) > 0.6 ? 0.12 : 0) }), [0, -r, 0]);
  const head = B.body({ kind: 'owlhead', name: 'owl', pos: [0, 0, 0], attach: { parent: body, offset: [0, -r * 2, 0] }, params: [0, 0, 0, 0] });
  sphere(B, head, r * 0.72, sp, d => ({ mat: M.owl, alb: 0.5 - d[1] * 0.15 }), [0, -r * 0.3, 0]);
  // The facial disc, pale, facing forward; ear tufts.
  ellipsoid(B, head, [r * 0.15, r * 0.5, r * 0.6], sp, () => ({ mat: M.bone, alb: 0.4 }), [r * 0.55, -r * 0.3, 0]);
  for (const zs of [-1, 1]) {
    tube(B, head, [[0, -r * 0.9, zs * r * 0.35], [-r * 0.05, -r * 1.25, zs * r * 0.45]], u => r * 0.14 * (1 - u * 0.6), sp * 0.6, () => ({ mat: M.owl, alb: 0.45 }));
    sphere(B, head, r * 0.17, sp * 0.5, () => ({ mat: M.shine, alb: 0.32, flags: F.shine | F.emissive | F.eye }), [r * 0.66, -r * 0.4, zs * r * 0.26]);
  }
  return { body, head };
};

/** A white-tailed deer: legs and head on their own bodies, a tail that flags white when it runs. */
const buildDeer = (B: Builder, r: number, sp: number) => {
  const body = B.body({ kind: 'deer', name: 'deer', pos: PARKED, radius: r * 2, params: [0, 0, 0, 0] });
  ellipsoid(B, body, [r, r * 0.42, r * 0.38], sp, d => ({ mat: d[1] > 0.35 ? M.bone : M.deer, alb: 0.5 - d[1] * 0.15 }), [0, -r * 1.25, 0]);
  // The tail: brown and down while calm, a white flag up when it bolts.
  ellipsoid(B, body, [r * 0.12, r * 0.2, r * 0.12], sp * 0.7, () => ({ mat: M.deer, alb: 0.45, flags: F.off }), [-r * 1.0, -r * 1.3, 0]);
  ellipsoid(B, body, [r * 0.14, r * 0.3, r * 0.16], sp * 0.7, () => ({ mat: M.white, alb: 0.7, flags: F.on }), [-r * 1.08, -r * 1.65, 0]);
  const head = B.body({ kind: 'limb', name: 'deer', pos: [0, 0, 0], attach: { parent: body, offset: [r * 0.8, -r * 1.45, 0] } });
  tube(B, head, [[0, 0, 0], [r * 0.2, -r * 0.45, 0]], u => r * (0.2 - u * 0.06), sp, () => ({ mat: M.deer, alb: 0.5 }));
  ellipsoid(B, head, [r * 0.32, r * 0.17, r * 0.16], sp * 0.8, d => ({ mat: d[0] > 0.7 ? M.black : M.deer, alb: 0.5 - d[1] * 0.15 }), [r * 0.38, -r * 0.55, 0]);
  for (const zs of [-1, 1]) {
    ellipsoid(B, head, [r * 0.08, r * 0.15, r * 0.05], sp * 0.6, () => ({ mat: M.deer, alb: 0.45 }), [r * 0.2, -r * 0.78, zs * r * 0.16]);
    sphere(B, head, r * 0.06, sp * 0.5, () => ({ mat: M.shine, alb: 0.6, flags: F.shine }), [r * 0.45, -r * 0.62, zs * r * 0.13]);
  }
  const legs: number[] = [];
  for (const [lx, zs] of [[0.65, -1], [0.65, 1], [-0.65, -1], [-0.65, 1]]) {
    const leg = B.body({ kind: 'limb', name: 'leg', pos: [0, 0, 0], attach: { parent: body, offset: [lx * r, -r * 1.1, zs * r * 0.2] } });
    tube(B, leg, [[0, 0, 0], [0, r * 1.1, 0]], u => r * (0.09 - u * 0.04), sp * 0.8, u => ({ mat: u > 0.9 ? M.black : M.deer, alb: 0.42 }));
    legs.push(leg);
  }
  return { body, head, legs };
};

/** A raccoon: grey and round, black mask, ringed tail, eyes that shine. */
const buildRaccoon = (B: Builder, r: number, sp: number) => {
  const body = B.body({ kind: 'raccoon', name: 'raccoon', pos: PARKED, radius: r * 2 });
  ellipsoid(B, body, [r, r * 0.6, r * 0.65], sp, d => ({ mat: M.coon, alb: 0.5 - d[1] * 0.2 + Math.sin(d[0] * 20 + d[2] * 14) * 0.05 }), [0, -r * 0.7, 0]);
  sphere(B, body, r * 0.45, sp, d => {
    const mask = d[0] > 0.2 && d[1] > -0.45 && d[1] < 0.15;
    return { mat: mask ? M.black : d[0] > 0.6 ? M.white : M.coon, alb: mask ? 0.4 : 0.55 - d[1] * 0.2 };
  }, [r * 0.95, -r * 0.95, 0]);
  for (const zs of [-1, 1]) {
    ellipsoid(B, body, [r * 0.08, r * 0.15, r * 0.1], sp * 0.6, () => ({ mat: M.coon, alb: 0.6 }), [r * 0.85, -r * 1.4, zs * r * 0.25]);
    sphere(B, body, r * 0.08, sp * 0.5, () => ({ mat: M.shine, alb: 0.6, flags: F.shine }), [r * 1.35, -r * 1.0, zs * r * 0.17]);
  }
  // The ringed tail.
  const tail: V3[] = [[-r * 0.9, -r * 0.7, 0], [-r * 1.4, -r * 0.6, 0], [-r * 1.9, -r * 0.75, 0]];
  tube(B, body, tail, u => r * 0.22 * (1 - u * 0.3), sp, u => ({ mat: Math.floor(u * 6) % 2 ? M.black : M.coon, alb: 0.5 }));
  for (const [lx, zs] of [[0.5, -1], [0.5, 1], [-0.5, -1], [-0.5, 1]]) tube(B, body, [[lx * r, -r * 0.3, zs * r * 0.35], [lx * r, 0, zs * r * 0.35]], () => r * 0.12, sp * 0.7, () => ({ mat: M.black, alb: 0.4 }));
  return body;
};

// ------------------------------------------------------------- populating ---

export const populateLife = (B: Builder, ctx: LifeCtx): ForestLife => {
  const { rand, s, viewW, viewH, pageH, phone } = ctx;
  const gutterX = (right: boolean) => viewW * (right ? 0.9 + rand() * 0.06 : 0.04 + rand() * 0.07);

  // Bigfoot: one, a second on a long page, starting in the gutters below the hero.
  const bigfoot: Bigfoot[] = [];
  const nBig = pageH > 6000 ? 2 : 1;
  for (let i = 0; i < nBig; i++) {
    const H = 120 * s;
    const b = buildBigfoot(B, H, 3 * 0.7);
    const pos: V3 = [gutterX(i % 2 === 0), viewH * (0.9 + i * 2.2) + rand() * 200, 0];
    bigfoot.push({ kind: 'bigfoot', ...b, H, pos, heading: Math.PI / 2, stride: 0, sq: 1, sqv: 0, mode: 'walk', target: pos, t: 0, look: 0, tree: -1, exposure: 0 });
  }

  // A pair of nightcrawlers on the trail, a little way down.
  const crawlers: Crawler[] = [];
  for (let i = 0; i < 2; i++) {
    const H = 64 * s;
    const c = buildCrawler(B, H, 3 * 0.55);
    const y = viewH * 0.95 + i * 40 * s;
    crawlers.push({ kind: 'crawler', ...c, H, pos: [ctx.pathX(y), y, 0], heading: Math.PI / 2, stride: rand(), sq: 1, sqv: 0, dir: 1, lead: i === 0, mode: 'waddle', t: 0, exposure: 0, lag: 40 * s });
  }

  const perches = ctx.perches;
  const perchNear = (y: number) => {
    let best = 0, bd = Infinity;
    perches.forEach((p, i) => { const d = Math.abs(p.p[1] - y) + rand() * 200; if (d < bd) { bd = d; best = i; } });
    return best;
  };

  const mH = 100 * s;
  const mm = buildMothman(B, mH, 3 * 0.65);
  const mPerch = perches.length ? perchNear(viewH * 1.2) : -1;
  const mothman: Mothman = {
    kind: 'mothman', ...mm, H: mH, pos: mPerch >= 0 ? perches[mPerch].p : [viewW * 0.06, viewH * 1.2, 120], heading: Math.PI / 2, perch: mPerch,
    mode: 'perch', t: 0, flap: 0, spread: 0, exposure: 0, from: [0, 0, 0], to: [0, 0, 0], orbit: 0, blinkIn: 3, blink: 0,
  };

  const dH = 58 * s;
  const dv = buildDevil(B, dH, 3 * 0.6);
  let dPerch = perches.length ? perchNear(viewH * 0.75) : -1;
  if (dPerch === mPerch && perches.length > 1) dPerch = (dPerch + 1) % perches.length;
  const devil: Devil = {
    kind: 'devil', ...dv, H: dH, pos: dPerch >= 0 ? perches[dPerch].p : [viewW * 0.94, viewH, 100], heading: Math.PI / 2, perch: dPerch,
    mode: 'perch', t: 0, dur: 1, from: [0, 0, 0], to: [0, 0, 0], flap: 0, spread: 0, exposure: 0, rest: 4 + rand() * 4,
  };

  const wH = 165 * s;
  const wendigo: Wendigo = { kind: 'wendigo', body: buildWendigo(B, wH, 3 * 0.75), H: wH, pos: [gutterX(true), viewH * 1.5, 0], heading: Math.PI, vis: 0, dare: 420 * s, mode: 'gone', t: 6, lit: 0, exposure: 0 };

  let nessie: Nessie | null = null;
  if (ctx.ponds.length) {
    const pd = ctx.ponds[0];
    const H = 110 * s;
    nessie = { kind: 'nessie', body: buildNessie(B, H, 3 * 0.7), H, pond: 0, pos: [pd.c[0], pd.c[1] - pd.ry * 0.1, 0], heading: Math.PI / 2, rise: 0, mode: 'below', t: 0, unwatched: 0, exposure: 0, look: 0 };
  }

  // Owls on the dead trees, one to a tree, not on the perches Mothman and the devil are using.
  const owls: Owl[] = [];
  const usedTree = new Set<number>();
  perches.forEach((p, i) => {
    if (owls.length >= Math.max(3, Math.round(pageH / 900)) || usedTree.has(p.tree) || i === mPerch || i === dPerch || rand() < 0.35) return;
    usedTree.add(p.tree);
    const r = 11 * s;
    const o = buildOwl(B, r, 3 * 0.45);
    owls.push({ ...o, perch: i, pos: p.p, turn: 0, blinkIn: rand() * 5, blink: 0, hoot: 0, r });
  });

  // Deer: a little herd in each of the first clearings.
  const deer: Deer[] = [];
  ctx.clearings.slice(0, phone ? 2 : 3).forEach((cl, ci) => {
    const n = 2 + (ci % 2);
    for (let i = 0; i < n; i++) {
      const r = 26 * s * (i === 0 ? 1.1 : 0.85 + rand() * 0.15);
      const d = buildDeer(B, r, 3 * 0.6);
      const a = rand() * TAU;
      const home: V3 = [cl.c[0] + Math.cos(a) * cl.r * 0.4, cl.c[1] + Math.sin(a) * cl.r * 0.3, 0];
      deer.push({ ...d, r, pos: [...home] as V3, heading: rand() * TAU, stride: 0, sq: 1, sqv: 0, mode: 'graze', target: home, t: rand() * 4, home, hop: 0, look: 0 });
    }
  });

  // Raccoons at the camp, and the bag of chips they fight over.
  const raccoons: Raccoon[] = [];
  for (let i = 0; i < 3; i++) {
    const r = 20 * s;
    const body = buildRaccoon(B, r, 3 * 0.5);
    const a = rand() * TAU;
    const p: V3 = [ctx.camp.c[0] + Math.cos(a) * ctx.camp.r * 0.45, ctx.camp.c[1] + Math.sin(a) * ctx.camp.r * 0.3, 0];
    raccoons.push({ body, r, pos: p, heading: rand() * TAU, stride: 0, sq: 1, sqv: 0, mode: 'forage', target: p, t: rand() * 3, carry: false, look: 0 });
  }
  const snackBody = B.body({ kind: 'snack', name: 'bag of chips', pos: PARKED });
  {
    const w = 11 * s;
    ellipsoid(B, snackBody, [w, w * 0.35, w * 0.75], 3 * 0.45, d => ({ mat: Math.abs(d[2]) > 0.75 ? M.cooler : M.snack, alb: 0.6 - d[1] * 0.2 }), [0, -w * 0.4, 0]);
  }

  // Moths: a cloud of pale specks that gathers wherever the light rests.
  const mothBody = B.body({ kind: 'moths', name: 'moths', pos: PARKED, vis: 0 });
  for (let i = 0; i < 46; i++) {
    const a = rand() * TAU, rr = (14 + rand() * 46) * s;
    B.surfel([Math.cos(a) * rr, -(rand() * 60) * s, Math.sin(a) * rr], [0, 0, 1], 2.2 * s + 1, M.bone, 0.85, mothBody, F.flit | F.twoSided | F.emissive);
  }

  // The leaves the Jersey Devil shakes loose.
  const leafBody = B.body({ kind: 'leaves', name: 'leaves', pos: PARKED, vis: 0, params: [0, 0, 0, 0] });
  for (let i = 0; i < 40; i++) {
    const a = rand() * TAU, rr = rand() * 40 * s;
    B.surfel([Math.cos(a) * rr, -rand() * 20 * s, Math.sin(a) * rr], [0, -1, 0], (2.4 + rand()) * s + 0.8, rand() < 0.7 ? M.autumn : M.gold, 0.6 + rand() * 0.3, leafBody, F.fall | F.twoSided);
  }

  // Fireflies over the clearings and along the pond margins: they pulse in the dark and go dark in the beam.
  let fireflies = 0;
  const fly = (c: V3, rad: number, n: number) => {
    for (let i = 0; i < n; i++) {
      const a = rand() * TAU, rr = Math.sqrt(rand()) * rad;
      B.glowAt([c[0] + Math.cos(a) * rr, c[1] + Math.sin(a) * rr * 0.75, (8 + rand() * 40) * s], (6 + rand() * 4) * s, [1.0, 0.92, 0.35], 0, G.firefly, rand(), (18 + rand() * 24) * s);
      fireflies++;
    }
  };
  for (const cl of ctx.clearings) fly(cl.c, cl.r * 1.2, phone ? 24 : 40);
  for (const pd of ctx.ponds) fly(pd.c, pd.rx * 1.2, 12);
  // A few drifting through the gutters everywhere else.
  for (let y = viewH * 0.3; y < pageH; y += 200) fly([gutterX(rand() < 0.5), y, 0], 140 * s, 5);
  // Eyes in the dark: pairs that open, blink and close again down the gutters, and are gone when the light comes near.
  const eyeCols: V3[] = [[1, 0.25, 0.15], [0.5, 1, 0.4], [1, 0.8, 0.25]];
  for (let y = viewH * 0.25; y < pageH; y += 170 + rand() * 120) {
    const x = gutterX(rand() < 0.5), z = (6 + rand() * 40) * s, gap = (5 + rand() * 4) * s;
    const col = eyeCols[Math.floor(rand() * eyeCols.length)];
    const seed = rand();
    for (const side of [-1, 1]) B.glowAt([x + side * gap, y, z], 4.5 * s, col, 0, G.eyes, seed, 0);
  }

  // Bigfoot's tracks, leading out of the camp and away into the trees.
  {
    const c = ctx.camp.c;
    const out = c[0] > viewW / 2 ? 1 : -1;
    let p: V3 = [c[0] - out * ctx.camp.r * 0.05, c[1] + ctx.camp.r * 0.12, 0];
    let h = out > 0 ? 0.3 : Math.PI - 0.3;
    for (let k = 0; k < 14; k++) {
      h += (rand() - 0.5) * 0.3;
      p = [p[0] + Math.cos(h) * 30 * s, p[1] + Math.sin(h) * 30 * s, 0];
      const side = k % 2 ? 1 : -1;
      const fx = p[0] - Math.sin(h) * side * 9 * s, fy = p[1] + Math.cos(h) * side * 9 * s;
      // A big oval print, heel to toes, pressed into the mud.
      for (let u = -1; u <= 1; u += 0.34) {
        const wv = Math.sqrt(1 - u * u * 0.8) * 5 * s;
        for (let v = -wv; v <= wv; v += 2.2 * s) {
          const x = fx + Math.cos(h) * u * 11 * s - Math.sin(h) * v, y = fy + Math.sin(h) * u * 11 * s + Math.cos(h) * v;
          B.surfel([x, y, 0.6], [0, 0, 1], 2.4 * s, M.mud, 0.35, 0);
        }
      }
      for (let t = -2; t <= 2; t++) {
        const x = fx + Math.cos(h) * 14 * s - Math.sin(h) * t * 2.8 * s, y = fy + Math.sin(h) * 14 * s + Math.cos(h) * t * 2.8 * s;
        B.surfel([x, y, 0.6], [0, 0, 1], 1.6 * s, M.mud, 0.35, 0);
      }
    }
  }

  return {
    beam: { x: viewW * 0.72, y: viewH * 0.62, r: Math.max(110, 150 * s), on: 1 },
    rest: { p: [0, 0, 0], t: 0 },
    ripples: [], flash: 0, flashNext: false,
    bigfoot, crawlers, mothman, devil, wendigo, nessie, owls, deer, raccoons,
    snack: { body: snackBody, pos: [...ctx.camp.spill] as V3, holder: -1, t: 0, raid: 6 },
    moths: { body: mothBody, density: 0, p: [0, 0, 0] },
    leaves: { body: leafBody, t: 99 },
    fireflies,
    perches, trees: ctx.trees, camp: ctx.camp, ponds: ctx.ponds, clearings: ctx.clearings,
    s, phone, time: 0,
    documented: { bigfoot: 0, crawler: 0, mothman: 0, devil: 0, wendigo: 0, nessie: 0 },
    snaps: [], events: [],
  };
};

// -------------------------------------------------------------- behaviour ---

/** Walks `w` towards `target` at `speed` px/s, turning as it goes; returns how far it is still to go. */
const walkTo = (w: Walker, target: V3, speed: number, dt: number, turn = 4) => {
  const dx = target[0] - w.pos[0], dy = target[1] - w.pos[1];
  const d = Math.hypot(dx, dy);
  if (d < 1) return 0;
  w.heading = turnTo(w.heading, Math.atan2(dy, dx), turn * dt);
  // Walk the way it faces, slowing while it turns.
  const along = Math.max(0, Math.cos(wrap(Math.atan2(dy, dx) - w.heading)));
  const step = Math.min(d, speed * dt * (0.3 + along * 0.7));
  w.pos = [w.pos[0] + Math.cos(w.heading) * step, w.pos[1] + Math.sin(w.heading) * step, 0];
  w.stride += step;
  return d - step;
};

/** Squash-and-stretch spring towards 1. */
const spring = (w: { sq: number; sqv: number }, dt: number) => {
  w.sqv += ((1 - w.sq) * 160 - w.sqv * 12) * dt;
  w.sq += w.sqv * dt;
};

/** A spot in a gutter, just off the top or bottom of the view, for something to walk in from. */
const edgeSpot = (life: ForestLife, cam: ForestCamera, right: boolean, rand: () => number): V3 => {
  const below = rand() < 0.5;
  const y = below ? cam.scrollY + cam.viewH + 80 : cam.scrollY - 80;
  return [cam.viewW * (right ? 0.9 + rand() * 0.07 : 0.03 + rand() * 0.07), Math.max(life.s * 80, y), 0];
};

const stepBigfoot = (scene: ForestScene, bf: Bigfoot, dt: number, cam: ForestCamera, rand: () => number) => {
  const life = scene.life;
  const bodyB = scene.bodies[bf.body];
  const head = scene.bodies[bf.head];
  const spot = spotOn(scene, cam, lift(bf.pos, bf.H * 0.6));
  const seen = onScreen(scene, cam, bf.pos, 60);
  bf.t += dt;
  let speed = 0;
  let lookTo = 0;
  switch (bf.mode) {
    case 'walk': {
      // Striding from tree to tree down the gutter; off screen for long, it comes back round to the view.
      if (!seen && bf.t > 14) {
        bf.pos = edgeSpot(life, cam, rand() < 0.5, rand);
        bf.t = 0;
      }
      if (dist2(bf.pos, bf.target) < 20 || bf.t > 25) {
        const right = bf.pos[0] > cam.viewW / 2;
        // Now and then it goes to see what's at the camp, if the camp's in view.
        if (onScreen(scene, cam, life.camp.c, 0) && rand() < 0.35) {
          bf.mode = 'rummage'; bf.target = [life.camp.cooler[0] - 30 * life.s, life.camp.cooler[1] + 26 * life.s, 0]; bf.t = 0;
          say(life, 'Something big is going through the camp cooler');
          break;
        }
        const y = clamp(bf.pos[1] + (rand() - 0.35) * 500, 60, scene.pageH - 60);
        bf.target = [cam.viewW * (right ? 0.88 + rand() * 0.1 : 0.02 + rand() * 0.1), y, 0];
        bf.t = 0;
      }
      speed = 62 * life.s;
      walkTo(bf, bf.target, speed, dt, 2.2);
      if (spot > 0.35) { bf.mode = 'frozen'; bf.t = 0; say(life, 'Bigfoot froze in your light'); }
      break;
    }
    case 'frozen': {
      // Stock still mid-stride, looking back over its shoulder at you.
      lookTo = wrap(Math.PI / 2 - bf.heading);
      if (bf.t > 1.6 || (bf.t > 0.8 && spot < 0.2)) {
        // Off to stand behind the nearest pine.
        let best = -1, bd = Infinity;
        life.trees.forEach((tr, i) => {
          if (tr.kind !== 'pine') return;
          const d = dist2(tr.foot, bf.pos);
          if (d < bd && d > 30) { bd = d; best = i; }
        });
        bf.tree = best;
        bf.target = best >= 0 ? [life.trees[best].foot[0], life.trees[best].foot[1] - life.trees[best].h * 0.08, 0] : edgeSpot(life, cam, bf.pos[0] > cam.viewW / 2, rand);
        bf.mode = 'hide'; bf.t = 0;
      }
      break;
    }
    case 'hide': {
      speed = 150 * life.s;
      if (walkTo(bf, bf.target, speed, dt, 6) < 4 || bf.t > 6) { bf.mode = 'lurk'; bf.t = 0; }
      break;
    }
    case 'lurk': {
      lookTo = Math.sin(bf.t * 0.7) * 0.8;
      if (bf.t > 5 + rand() * 0.02 && spot < 0.2) { bf.mode = 'walk'; bf.t = 0; bf.target = bf.pos; }
      break;
    }
    case 'rummage': {
      if (bf.t < 0.1 || dist2(bf.pos, bf.target) > 6) {
        speed = 70 * life.s;
        walkTo(bf, bf.target, speed, dt, 3);
        if (bf.t > 20) { bf.mode = 'leave'; bf.t = 0; }
      } else {
        // Hunched at the cooler, rummaging; the raccoons scatter.
        bf.heading = turnTo(bf.heading, Math.atan2(life.camp.cooler[1] - bf.pos[1], life.camp.cooler[0] - bf.pos[0]), dt * 3);
        for (const rc of life.raccoons) if (rc.mode !== 'run' && dist2(rc.pos, bf.pos) < 200 * life.s) { rc.mode = 'run'; rc.t = 0; rc.target = add(rc.pos, [(rc.pos[0] - bf.pos[0]) * 2, (rc.pos[1] - bf.pos[1]) * 2, 0]); }
        if (bf.t > 7) { bf.mode = 'leave'; bf.t = 0; bf.target = edgeSpot(life, cam, bf.pos[0] > cam.viewW / 2, rand); }
      }
      if (spot > 0.35) { bf.mode = 'frozen'; bf.t = 0; say(life, 'Caught Bigfoot in the camp!'); }
      break;
    }
    case 'leave': {
      speed = 80 * life.s;
      if (walkTo(bf, bf.target, speed, dt, 3) < 10 || bf.t > 15) { bf.mode = 'walk'; bf.t = 0; }
      if (spot > 0.35) { bf.mode = 'frozen'; bf.t = 0; }
      break;
    }
  }
  expose(scene, cam, bf, 'bigfoot', lift(bf.pos, bf.H * 0.6), bf.H * 0.6, spot, dt);
  // The walk: a swing of the legs and arms, a bob. Frozen, it holds the pose it was in.
  const phase = bf.stride / (bf.H * 0.5);
  const moving = speed > 0;
  const swing = moving || bf.mode === 'frozen' ? Math.sin(phase) * 0.5 : 0;
  const crouch = bf.mode === 'rummage' && dist2(bf.pos, bf.target) < 8;
  bf.look = turnTo(bf.look, lookTo, dt * 5);
  const bob = moving ? Math.abs(Math.cos(phase)) * bf.H * 0.03 : 0;
  // Frozen, the body half turns to the viewer too: the classic over-the-shoulder look.
  const twist = bf.mode === 'frozen' ? clamp(bf.look * 0.35, -0.6, 0.6) : 0;
  bodyB.live = { c: lift(bf.pos, bob), rot: facing(bf.heading + twist) };
  bodyB.scale = crouch ? [1, 0.86, 1] : [1, 1, 1];
  head.live = { c: [0, 0, 0], rot: rotY(-(bf.look - twist)) };
  scene.bodies[bf.legs[0]].live = { c: [0, 0, 0], rot: rotZ(swing) };
  scene.bodies[bf.legs[1]].live = { c: [0, 0, 0], rot: rotZ(-swing) };
  const rum = crouch ? Math.sin(bf.t * 9) * 0.4 - 0.9 : 0;
  scene.bodies[bf.arms[0]].live = { c: [0, 0, 0], rot: rotZ(-swing * 0.8 + rum) };
  scene.bodies[bf.arms[1]].live = { c: [0, 0, 0], rot: rotZ(swing * 0.8 + (crouch ? -Math.sin(bf.t * 9) * 0.4 - 0.9 : 0)) };
};

const stepCrawlers = (scene: ForestScene, dt: number, cam: ForestCamera, rand: () => number) => {
  const life = scene.life;
  const [lead, follow] = life.crawlers;
  if (!lead) return;
  const spot = Math.max(...life.crawlers.map(c => spotOn(scene, cam, lift(c.pos, c.H * 0.7))));
  lead.t += dt;
  // Off screen a long while, they turn up on the trail at the edge of the view.
  if (!onScreen(scene, cam, lead.pos, 80) && lead.t > 18) {
    lead.dir = rand() < 0.5 ? 1 : -1;
    const y = lead.dir > 0 ? cam.scrollY - 40 : cam.scrollY + cam.viewH + 40;
    const yy = clamp(y, 40, scene.pageH - 40);
    lead.pos = [pathXOf(scene, yy), yy, 0];
    follow.pos = [pathXOf(scene, yy - lead.dir * follow.lag), yy - lead.dir * follow.lag, 0];
    lead.t = 0;
    lead.mode = 'waddle';
  }
  if (lead.mode === 'waddle' && spot > 0.35) {
    lead.mode = 'scurry'; lead.t = 0;
    // Away from the light along the trail.
    const bf = beamFloor(scene, cam);
    lead.dir = bf[1] > lead.pos[1] ? -1 : 1;
    say(life, 'A pair of nightcrawlers speed-walked off the trail');
  }
  if (lead.mode === 'scurry' && lead.t > 3.5 && spot < 0.2) { lead.mode = 'waddle'; lead.t = 0; }
  const fast = lead.mode === 'scurry';
  for (const c of life.crawlers) {
    c.mode = lead.mode;
    const speed = (fast ? 190 : 34) * life.s;
    let ty = (c === lead ? c.pos[1] + c.dir * 60 * life.s : lead.pos[1] - lead.dir * c.lag);
    if (c !== lead) c.dir = lead.dir;
    ty = clamp(ty, 20, scene.pageH - 20);
    if (c === lead && (ty <= 20 || ty >= scene.pageH - 20)) c.dir = -c.dir;
    const side = c === lead ? 0 : 14 * life.s;
    walkTo(c, [pathXOf(scene, ty) + side, ty, 0], c === lead ? speed : speed * 1.15, dt, 6);
    const b = scene.bodies[c.body];
    // Stiff little steps: the legs scissor without bending, the body sways from side to side.
    const ph = c.stride / (c.H * (fast ? 0.18 : 0.12));
    const swing = Math.sin(ph) * (fast ? 0.45 : 0.3);
    b.live = { c: lift(c.pos, Math.abs(Math.sin(ph)) * c.H * 0.03), rot: mul3(facing(c.heading), rotX(Math.sin(ph) * 0.08)) };
    scene.bodies[c.legs[0]].live = { c: [0, 0, 0], rot: rotZ(swing) };
    scene.bodies[c.legs[1]].live = { c: [0, 0, 0], rot: rotZ(-swing) };
  }
  expose(scene, cam, lead, 'crawler', lift(lead.pos, lead.H * 0.6), lead.H * 1.2, spot, dt);
};

/** A perch's world point with something of height `k` sitting on it. */
const perchAt = (life: ForestLife, i: number): V3 => life.perches[i].p;

/** The free perch nearest the view's middle (and away from `avoid`), preferring ones on screen. */
const pickPerch = (scene: ForestScene, cam: ForestCamera, taken: number[], avoid: V3 | null, rand: () => number) => {
  const life = scene.life;
  let best = -1, bs = -Infinity;
  life.perches.forEach((p, i) => {
    if (taken.includes(i)) return;
    const [x, y] = toScreen(scene, cam, p.p);
    let score = -Math.abs(y - cam.viewH * 0.5) / cam.viewH - (x > 0 && x < cam.viewW && y > 0 && y < cam.viewH ? 0 : 1.5) + rand() * 0.6;
    if (avoid) score += Math.min(1, dist2(p.p, avoid) / 500);
    if (score > bs) { bs = score; best = i; }
  });
  return best;
};

const stepMothman = (scene: ForestScene, dt: number, cam: ForestCamera, rand: () => number) => {
  const life = scene.life;
  const m = life.mothman;
  const b = scene.bodies[m.body];
  m.t += dt;
  const spot = spotOn(scene, cam, lift(m.pos, m.H * 0.6));
  const taken = [life.devil.perch, ...life.owls.map(o => o.perch)];
  switch (m.mode) {
    case 'perch': {
      m.spread = Math.max(0, m.spread - dt * 2);
      if (m.perch >= 0) m.pos = perchAt(life, m.perch);
      // Off screen a long while, he moves to a tree in view.
      if (!onScreen(scene, cam, m.pos, 50) && m.t > 16 && life.perches.length) {
        const p = pickPerch(scene, cam, taken, null, rand);
        if (p >= 0) { m.perch = p; m.pos = perchAt(life, p); m.t = 0; }
      }
      // The moths have gathered in a resting light: he comes for it.
      if (life.moths.density > 0.8 && m.t > 4) {
        m.mode = 'swoop'; m.t = 0; m.from = m.pos; m.to = lift(life.rest.p, 70 * life.s); m.orbit = Math.atan2(m.pos[1] - life.rest.p[1], m.pos[0] - life.rest.p[0]);
        say(life, 'Two red eyes left their tree and are coming for your light');
      }
      break;
    }
    case 'swoop': {
      const u = Math.min(1, m.t / 1.6);
      const to = lift(life.rest.p, 70 * life.s);
      m.pos = add(lerp3(m.from, to, smooth(u)), lift([0, 0, 0], Math.sin(u * Math.PI) * 50 * life.s));
      m.heading = turnTo(m.heading, Math.atan2(to[1] - m.from[1], to[0] - m.from[0]), dt * 6);
      m.spread = Math.min(1, m.spread + dt * 3);
      if (u >= 1) { m.mode = 'circle'; m.t = 0; }
      break;
    }
    case 'circle': {
      // Round and round the beam, like a moth to a lamp.
      const R = life.beam.r * 0.75;
      m.orbit += dt * 1.5;
      const c = life.moths.density > 0.1 ? life.rest.p : beamFloor(scene, cam);
      m.pos = lift([c[0] + Math.cos(m.orbit) * R, c[1] + Math.sin(m.orbit) * R * 0.7, 0], (70 + Math.sin(m.t * 2) * 15) * life.s);
      m.heading = m.orbit + Math.PI / 2;
      m.spread = 1;
      if (m.t > 7 || (m.t > 3 && life.moths.density < 0.2)) {
        const p = pickPerch(scene, cam, taken, null, rand);
        m.perch = p;
        m.mode = 'return'; m.t = 0; m.from = m.pos; m.to = p >= 0 ? perchAt(life, p) : edgeSpot(life, cam, rand() < 0.5, rand);
      }
      break;
    }
    case 'return': {
      const u = Math.min(1, m.t / 2);
      m.pos = add(lerp3(m.from, m.to, smooth(u)), lift([0, 0, 0], Math.sin(u * Math.PI) * 60 * life.s));
      m.heading = turnTo(m.heading, Math.atan2(m.to[1] - m.from[1], m.to[0] - m.from[0]), dt * 5);
      if (u >= 1) { m.mode = 'perch'; m.t = 0; m.heading = Math.PI / 2; }
      break;
    }
  }
  expose(scene, cam, m, 'mothman', lift(m.pos, m.H * 0.6), m.H * 0.8, spot, dt);
  // Wings: folded down his back when perched, spread and beating in flight.
  const flying = m.mode !== 'perch';
  m.flap += dt * (flying ? 7 : 1.5);
  const ang = -1.25 + m.spread * (1.35 + (flying ? Math.sin(m.flap) * 0.55 : 0));
  scene.bodies[m.wings[0]].live = { c: [0, 0, 0], rot: rotX(ang) };
  scene.bodies[m.wings[1]].live = { c: [0, 0, 0], rot: rotX(-ang) };
  m.blinkIn -= dt;
  if (m.blinkIn < 0) { m.blink = 0.15; m.blinkIn = 2 + rand() * 4; }
  m.blink -= dt;
  b.live = { c: m.pos, rot: facing(m.heading) };
  b.params = [0, 0, m.blink > 0 ? 1 : 0, 0];
};

const stepDevil = (scene: ForestScene, dt: number, cam: ForestCamera, rand: () => number) => {
  const life = scene.life;
  const d = life.devil;
  const b = scene.bodies[d.body];
  d.t += dt;
  const spot = spotOn(scene, cam, lift(d.pos, d.H * 0.6));
  const taken = [life.mothman.perch, ...life.owls.map(o => o.perch)];
  const jump = (to: number, dur: number) => { d.from = d.pos; d.perch = to; d.to = to >= 0 ? perchAt(life, to) : edgeSpot(life, cam, rand() < 0.5, rand); d.dur = dur; d.t = 0; };
  switch (d.mode) {
    case 'perch': {
      d.spread = Math.max(0, d.spread - dt * 3);
      if (d.perch >= 0) d.pos = perchAt(life, d.perch);
      d.heading = Math.PI / 2 + Math.sin(life.time * 0.8) * 0.6;
      if (spot > 0.4) {
        d.mode = 'screech'; d.t = 0;
        life.leaves.t = 0;
        const lb = scene.bodies[life.leaves.body];
        lb.live = { c: d.pos, rot: facing(0) };
        say(life, 'The Jersey Devil screeched at you and fled');
        break;
      }
      d.rest -= dt;
      if (d.rest < 0 && life.perches.length > 1) {
        // A hop to another branch, usually one nearby.
        let best = -1, bd = Infinity;
        life.perches.forEach((p, i) => {
          if (i === d.perch || taken.includes(i)) return;
          const dd = dist2(p.p, d.pos) + rand() * 250;
          if (dd < bd) { bd = dd; best = i; }
        });
        if (!onScreen(scene, cam, d.pos, 60)) best = pickPerch(scene, cam, [...taken, d.perch], null, rand);
        if (best >= 0) { d.mode = 'hop'; jump(best, 1.1); }
        d.rest = 4 + rand() * 5;
      }
      break;
    }
    case 'screech': {
      d.spread = 1;
      d.heading = Math.PI / 2;
      if (d.t > 0.8) {
        d.mode = 'flee';
        const bf = beamFloor(scene, cam);
        jump(pickPerch(scene, cam, [...taken, d.perch], bf, rand), 1.6);
      }
      break;
    }
    case 'hop':
    case 'flee': {
      const u = Math.min(1, d.t / d.dur);
      d.pos = add(lerp3(d.from, d.to, smooth(u)), lift([0, 0, 0], Math.sin(u * Math.PI) * (d.mode === 'flee' ? 90 : 45) * life.s));
      d.heading = turnTo(d.heading, Math.atan2(d.to[1] - d.from[1], d.to[0] - d.from[0]), dt * 8);
      d.spread = Math.min(1, d.spread + dt * 5);
      if (u >= 1) { d.mode = 'perch'; d.t = 0; }
      break;
    }
  }
  expose(scene, cam, d, 'devil', lift(d.pos, d.H * 0.6), d.H, spot, dt);
  d.flap += dt * (d.mode === 'hop' || d.mode === 'flee' ? 14 : d.mode === 'screech' ? 3 : 1);
  const ang = -1.1 + d.spread * (1.3 + (d.mode === 'hop' || d.mode === 'flee' ? Math.sin(d.flap) * 0.7 : d.mode === 'screech' ? 0.3 : 0));
  scene.bodies[d.wings[0]].live = { c: [0, 0, 0], rot: rotX(ang) };
  scene.bodies[d.wings[1]].live = { c: [0, 0, 0], rot: rotX(-ang) };
  b.live = { c: d.pos, rot: facing(d.heading) };
  // The mouth gapes while it screeches.
  b.params = [0, 0, d.mode === 'screech' ? 1 : 0, 0];
  b.scale = d.mode === 'screech' ? [1, 1 + Math.sin(d.t * 30) * 0.04, 1] : [1, 1, 1];
  // The leaves it shook loose.
  const lv = life.leaves;
  lv.t += dt;
  const lb = scene.bodies[lv.body];
  lb.vis = lv.t < 3 ? 1 : Math.max(0, 1 - (lv.t - 3));
  lb.params = [0, 0, 0, lv.t];
  if (lv.t > 4.5) lb.live = { c: PARKED, rot: facing(0) };
};

const stepWendigo = (scene: ForestScene, dt: number, cam: ForestCamera, rand: () => number) => {
  const life = scene.life;
  const w = life.wendigo;
  const b = scene.bodies[w.body];
  w.t += dt;
  const bf = beamFloor(scene, cam);
  const spot = spotOn(scene, cam, lift(w.pos, w.H * 0.5));
  if (w.mode === 'gone') {
    w.vis = Math.max(0, w.vis - dt * 3);
    if (w.t > 4) {
      // Back again at the edge of the dark, `dare` from the light, in a gutter if it can.
      const side = bf[0] > cam.viewW / 2 ? -1 : 1;
      let p: V3 = [bf[0] + side * w.dare * (0.7 + rand() * 0.3), bf[1] + (rand() - 0.5) * w.dare * 0.8, 0];
      p = [clamp(p[0], cam.viewW * 0.03, cam.viewW * 0.97), clamp(p[1], cam.scrollY + w.H * 0.9, cam.scrollY + cam.viewH - 20), 0];
      if (dist2(p, bf) < w.dare * 0.6) p = [cam.viewW * (bf[0] > cam.viewW / 2 ? 0.05 : 0.95), p[1], 0];
      w.pos = p;
      w.heading = Math.atan2(bf[1] - p[1], bf[0] - p[0]);
      w.mode = 'stalk'; w.t = 0; w.lit = 0;
    }
  } else {
    // Only there when it isn't looked at: it dissolves in the beam and creeps closer while you look away.
    const target = clamp(1 - spot * 2.2, 0, 1);
    w.vis += (target - w.vis) * Math.min(1, dt * (target < w.vis ? 5 : 1.2));
    if (spot < 0.1 && w.t > 1.5) {
      const towards = Math.atan2(bf[1] - w.pos[1], bf[0] - w.pos[0]);
      w.heading = turnTo(w.heading, towards, dt);
      if (dist2(w.pos, bf) > w.dare * 0.55) w.pos = [w.pos[0] + Math.cos(w.heading) * 9 * life.s * dt, w.pos[1] + Math.sin(w.heading) * 9 * life.s * dt, 0];
    }
    if (spot > 0.3) w.lit += dt;
    // Swept by the light, it's gone, to come back nearer; caught square in it, it's documented and gone for good (for now).
    if (spot > 0.75 && w.lit < 0.6 && w.vis > 0.15) {
      if (expose(scene, cam, { exposure: 2 }, 'wendigo', lift(w.pos, w.H * 0.5), w.H * 0.6, 1, dt)) say(life, 'It was right there. Then it was not.');
      w.mode = 'gone'; w.t = -8; w.dare = 420 * life.s;
    } else if (w.lit > 0.25) {
      w.mode = 'gone'; w.t = 0;
      w.dare = Math.max(140 * life.s, w.dare * 0.72);
      if (w.dare < 200 * life.s) say(life, 'Something antlered keeps getting closer');
    }
    if (!onScreen(scene, cam, w.pos, 40)) { w.mode = 'gone'; w.t = 0; }
  }
  b.vis = w.vis;
  b.live = { c: w.vis > 0.01 ? w.pos : PARKED, rot: facing(w.heading) };
};

const stepNessie = (scene: ForestScene, dt: number, cam: ForestCamera, rand: () => number) => {
  const life = scene.life;
  const n = life.nessie;
  if (!n) return;
  const pd = life.ponds[n.pond];
  const b = scene.bodies[n.body];
  n.t += dt;
  // Watched means the beam is anywhere on the pond.
  const [px, py] = toScreen(scene, cam, pd.c);
  const watched = spotAt(life, px, py) > 0.05 || Math.hypot(life.beam.x - px, life.beam.y - py) < pd.rx + life.beam.r * 0.8;
  const visible = onScreen(scene, cam, pd.c, -40);
  n.unwatched = watched || !visible ? 0 : n.unwatched + dt;
  const ring = (k = 1) => life.ripples.push([n.pos[0], n.pos[1], 4 * life.s, 0.9 * k]);
  const headP = lift(n.pos, n.H * n.rise * 0.9);
  const spot = spotOn(scene, cam, headP);
  switch (n.mode) {
    case 'below':
      n.rise = 0;
      if (n.unwatched > 3.5 && n.t > 5) {
        n.mode = 'rising'; n.t = 0;
        const a = rand() * TAU;
        n.pos = [pd.c[0] + Math.cos(a) * pd.rx * 0.35, pd.c[1] + Math.sin(a) * pd.ry * 0.3, 0];
        n.heading = Math.PI / 2 + (rand() - 0.5) * 1.5;
        ring(); ring(0.6);
      }
      break;
    case 'rising':
      n.rise = Math.min(1, n.rise + dt * 0.35);
      if (Math.random() < dt * 2) ring(0.5);
      if (n.rise >= 1) { n.mode = 'up'; n.t = 0; say(life, 'Rings spreading on the pond…'); }
      if (watched) { n.mode = 'sinking'; n.t = 0; }
      break;
    case 'up':
      n.look = Math.sin(n.t * 0.6) * 0.9;
      if (watched || n.t > 9) { n.mode = 'sinking'; n.t = 0; }
      break;
    case 'sinking':
      n.rise = Math.max(0, n.rise - dt * (spot > 0.2 ? 1.4 : 0.5));
      if (Math.random() < dt * 3) ring(0.7);
      if (n.rise <= 0) { n.mode = 'below'; n.t = 0; ring(1.2); }
      break;
  }
  if (n.rise > 0.4) expose(scene, cam, n, 'nessie', headP, n.H * 0.6, spot, dt);
  // Rising out of the water, its neck sways; below the surface it's clipped away.
  const sink = (1 - n.rise) * n.H * 1.05;
  b.live = { c: lift(n.pos, -sink), rot: mul3(facing(n.heading + n.look), rotZ(Math.sin(life.time * 0.9) * 0.05)) };
};

const stepOwls = (scene: ForestScene, dt: number, cam: ForestCamera, rand: () => number) => {
  const life = scene.life;
  for (const o of life.owls) {
    const b = scene.bodies[o.body];
    const h = scene.bodies[o.head];
    // Its head follows the beam: towards it on screen, as far as an owl's neck goes (a long way).
    const [sx, sy] = toScreen(scene, cam, o.pos);
    const want = Math.atan2(life.beam.y - sy, life.beam.x - sx);
    const body = Math.PI / 2;
    const rel = clamp(wrap(want - body), -2.6, 2.6);
    o.turn = turnTo(o.turn, rel, dt * 3);
    o.blinkIn -= dt;
    if (o.blinkIn < 0) { o.blink = 0.18; o.blinkIn = 2 + rand() * 6; }
    o.blink -= dt;
    o.hoot -= dt;
    if (o.hoot < -8 - rand() * 20) o.hoot = 0.6;
    const puff = o.hoot > 0 ? 1 + Math.sin(o.hoot * 10) * 0.08 : 1;
    b.live = { c: o.pos, rot: facing(body) };
    b.scale = [puff, 1 / puff, puff];
    h.live = { c: [0, 0, 0], rot: rotY(-o.turn) };
    h.params = [0, 0, o.blink > 0 ? 1 : 0, 0];
  }
};

const stepDeer = (scene: ForestScene, dt: number, cam: ForestCamera, rand: () => number) => {
  const life = scene.life;
  for (const d of life.deer) {
    d.t += dt;
    const spot = spotOn(scene, cam, lift(d.pos, d.r * 1.4));
    let speed = 0;
    let headDown = 0;
    let lookTo = 0;
    switch (d.mode) {
      case 'graze':
        headDown = 1;
        if (d.t > 4 + rand() * 0.1) {
          d.mode = 'walk'; d.t = 0;
          const a = rand() * TAU;
          d.target = [d.home[0] + Math.cos(a) * 70 * life.s, d.home[1] + Math.sin(a) * 50 * life.s, 0];
        }
        break;
      case 'walk':
        speed = 22 * life.s;
        if (walkTo(d, d.target, speed, dt, 2) < 3 || d.t > 8) { d.mode = 'graze'; d.t = rand() * 2; }
        break;
      case 'frozen':
        // Head up, staring into the light, eyes shining.
        lookTo = wrap(Math.PI / 2 - d.heading);
        if (d.t > 1.3) {
          d.mode = 'flee'; d.t = 0;
          const bf = beamFloor(scene, cam);
          const away = Math.atan2(d.pos[1] - bf[1], d.pos[0] - bf[0]) + (rand() - 0.5) * 0.8;
          d.target = [clamp(d.pos[0] + Math.cos(away) * 380 * life.s, 20, cam.viewW - 20), d.pos[1] + Math.sin(away) * 320 * life.s, 0];
        }
        break;
      case 'flee':
        speed = 210 * life.s;
        if (walkTo(d, d.target, speed, dt, 5) < 10 || d.t > 4) {
          d.mode = 'graze'; d.t = -3; d.home = d.pos;
        }
        break;
    }
    if ((d.mode === 'graze' || d.mode === 'walk') && spot > 0.35) {
      d.mode = 'frozen'; d.t = 0;
      if (life.deer.indexOf(d) === 0 || rand() < 0.3) say(life, 'A deer froze in your light, eyes glowing');
      // The rest of the herd freezes too.
      for (const o of life.deer) if (o !== d && (o.mode === 'graze' || o.mode === 'walk') && dist2(o.pos, d.pos) < 200 * life.s) { o.mode = 'frozen'; o.t = -0.2 - rand() * 0.3; }
    }
    d.look = turnTo(d.look, lookTo, dt * 4);
    const b = scene.bodies[d.body];
    // Bounding: long hops with the legs tucked; walking: a steady four-legged gait.
    const bounding = d.mode === 'flee';
    const ph = d.stride / (d.r * (bounding ? 2.2 : 0.7));
    const hop = bounding ? Math.abs(Math.sin(ph)) * d.r * 1.4 : 0;
    b.live = { c: lift(d.pos, hop), rot: mul3(facing(d.heading), rotZ(bounding ? Math.cos(ph) * 0.25 : 0)) };
    b.params = [0, 0, bounding ? 1 : 0, 0];
    const h = scene.bodies[d.head];
    h.live = { c: [0, 0, 0], rot: mul3(rotY(-d.look), rotZ(-headDown * (1.0 + Math.sin(d.t * 3) * 0.1))) };
    d.legs.forEach((l, i) => {
      const sw = speed > 0 ? Math.sin(ph + (i === 0 || i === 3 ? 0 : Math.PI)) * (bounding ? 0.2 : 0.4) : 0;
      const tuck = bounding ? (i < 2 ? -0.6 : 0.6) * Math.abs(Math.sin(ph)) : 0;
      scene.bodies[l].live = { c: [0, 0, 0], rot: rotZ(sw + tuck) };
    });
  }
};

const stepRaccoons = (scene: ForestScene, dt: number, cam: ForestCamera, rand: () => number) => {
  const life = scene.life;
  const camp = life.camp;
  const sn = life.snack;
  sn.raid -= dt;
  const busy = life.raccoons.some(r => r.mode === 'raid' || r.mode === 'tug' || (r.mode === 'run' && r.carry));
  if (sn.raid < 0 && !busy) {
    // A raid on the cooler: the first one in finds the chips, the others want them.
    sn.raid = 22 + rand() * 14;
    sn.holder = -1;
    sn.pos = [...camp.spill] as V3;
    life.raccoons.forEach((r, i) => { r.mode = 'raid'; r.t = -i * 0.6; r.carry = false; r.target = [camp.spill[0] + (i - 1) * 16 * life.s, camp.spill[1] + 10 * life.s, 0]; });
    if (onScreen(scene, cam, camp.c, 0)) say(life, 'The raccoons are into the cooler again');
  }
  let tugging = 0;
  life.raccoons.forEach((r, i) => {
    r.t += dt;
    const spot = spotOn(scene, cam, lift(r.pos, r.r));
    let speed = 0;
    switch (r.mode) {
      case 'forage':
        if (dist2(r.pos, r.target) < 4 || r.t > 6) {
          const a = rand() * TAU;
          r.target = [camp.c[0] + Math.cos(a) * camp.r * 0.5, camp.c[1] + Math.sin(a) * camp.r * 0.35, 0];
          r.t = 0;
        }
        speed = 26 * life.s;
        walkTo(r, r.target, speed, dt, 4);
        break;
      case 'raid':
        if (r.t < 0) break;
        speed = 60 * life.s;
        if (walkTo(r, r.target, speed, dt, 5) < 3) {
          r.heading = turnTo(r.heading, Math.atan2(sn.pos[1] - r.pos[1], sn.pos[0] - r.pos[0]), dt * 6);
          if (r.t > 1.5) { r.mode = 'tug'; r.t = 0; }
        }
        break;
      case 'tug': {
        // Two of them pull at the bag, going round and round it in a scuffle.
        tugging++;
        const a = life.time * 2.4 + i * Math.PI;
        const want: V3 = [sn.pos[0] + Math.cos(a) * 15 * life.s, sn.pos[1] + Math.sin(a) * 11 * life.s, 0];
        r.pos = lerp3(r.pos, want, Math.min(1, dt * 8));
        r.heading = Math.atan2(sn.pos[1] - r.pos[1], sn.pos[0] - r.pos[0]);
        r.stride += dt * 40 * life.s;
        r.sq = 1 + Math.sin(life.time * 22 + i) * 0.08;
        if (r.t > 4 + i) {
          // One wins and runs off into the dark with it; the rest give up.
          const winner = life.raccoons.findIndex(o => o.mode === 'tug');
          life.raccoons.forEach((o, k) => {
            if (o.mode !== 'tug') return;
            o.mode = 'run'; o.t = 0; o.carry = k === winner;
            const away = camp.c[0] > cam.viewW / 2 ? 1 : -1;
            o.target = k === winner ? [clamp(camp.c[0] + away * 260 * life.s, 10, cam.viewW - 10), camp.c[1] + (rand() - 0.3) * 200 * life.s, 0] : [camp.c[0] + (rand() - 0.5) * camp.r * 0.8, camp.c[1] + (rand() - 0.5) * camp.r * 0.5, 0];
          });
          if (winner >= 0) { sn.holder = winner; if (onScreen(scene, cam, camp.c, 0)) say(life, 'One raccoon made off with the chips'); }
        }
        break;
      }
      case 'run':
        speed = (r.carry ? 110 : 70) * life.s;
        if (walkTo(r, r.target, speed, dt, 6) < 4 || r.t > 6) {
          if (r.carry) { r.carry = false; sn.holder = -2; }
          r.mode = 'forage'; r.t = 0; r.target = r.pos;
        }
        break;
      case 'frozen':
        if (r.t > 0.9) { r.mode = 'forage'; r.t = 0; }
        break;
    }
    if (spot > 0.4 && r.mode === 'forage') { r.mode = 'frozen'; r.t = 0; }
    r.sq += (1 - r.sq) * Math.min(1, dt * 6);
    const b = scene.bodies[r.body];
    const ph = r.stride / (r.r * 0.5);
    b.live = { c: lift(r.pos, speed > 0 ? Math.abs(Math.sin(ph)) * r.r * 0.12 : 0), rot: facing(r.heading) };
    b.scale = [1 / r.sq, r.sq, 1];
  });
  // The bag: in the cooler, tipped out, fought over, carried off, then eaten (gone until the next raid).
  const sb = scene.bodies[sn.body];
  if (sn.holder >= 0) {
    const r = life.raccoons[sn.holder];
    sn.pos = [r.pos[0] + Math.cos(r.heading) * r.r * 1.4, r.pos[1] + Math.sin(r.heading) * r.r * 1.4, 0];
    sb.live = { c: lift(sn.pos, r.r * 0.6), rot: facing(r.heading) };
  } else if (sn.holder === -1 && (tugging || life.raccoons.some(r => r.mode === 'raid' && r.t > 0.5))) {
    sb.live = { c: lift(sn.pos, tugging ? Math.abs(Math.sin(life.time * 15)) * 4 * life.s : 0), rot: facing(life.time * (tugging ? 2.4 : 0)) };
  } else {
    sb.live = { c: PARKED, rot: facing(0) };
  }
};

/**
 * The flashlight: on the cursor if there is one, else wandering the view on
 * its own. Where it rests, moths gather (and Mothman notices).
 */
const stepBeam = (scene: ForestScene, dt: number, cam: ForestCamera, pointer: { x: number; y: number } | null) => {
  const life = scene.life;
  const beam = life.beam;
  if (pointer) {
    beam.x = pointer.x; beam.y = pointer.y;
  } else {
    // A slow sweep of the view on its own, lingering in the gutters.
    const t = life.time;
    const tx = cam.viewW * (0.08 + 0.84 * (0.5 + 0.5 * Math.sin(t * 0.17 + Math.sin(t * 0.05) * 2)));
    const ty = cam.viewH * (0.3 + 0.45 * (0.5 + 0.5 * Math.sin(t * 0.23 + 1.3)));
    beam.x += (tx - beam.x) * Math.min(1, dt * 1.5);
    beam.y += (ty - beam.y) * Math.min(1, dt * 1.5);
  }
  const p = beamFloor(scene, cam);
  if (dist2(p, life.rest.p) < 26 * life.s) life.rest.t += dt;
  else { life.rest.t = 0; life.rest.p = p; }
  // Moths gather in a light that's been still a while, and scatter when it moves.
  const m = life.moths;
  const want = life.rest.t > 2.2 ? Math.min(1, (life.rest.t - 2.2) / 3) : 0;
  m.density += (want - m.density) * Math.min(1, dt * (want > m.density ? 1 : 3));
  if (want > 0) m.p = life.rest.p;
  const mb = scene.bodies[m.body];
  mb.vis = m.density;
  mb.live = { c: m.density > 0.01 ? lift(m.p, 40 * life.s) : PARKED, rot: facing(0) };
  if (m.density > 0.95 && life.rest.t < 5.3 && life.rest.t > 5.2) say(life, 'Moths are gathering in your light');
};

export const stepLife = (scene: ForestScene, _t: number, dt: number, cam: ForestCamera, pointer: { x: number; y: number } | null, rand: () => number = Math.random) => {
  const life = scene.life;
  life.time += dt;
  if (life.flashNext) { life.flash = 1; life.flashNext = false; }
  stepBeam(scene, dt, cam, pointer);
  for (const bf of life.bigfoot) stepBigfoot(scene, bf, dt, cam, rand);
  stepCrawlers(scene, dt, cam, rand);
  stepMothman(scene, dt, cam, rand);
  stepDevil(scene, dt, cam, rand);
  stepWendigo(scene, dt, cam, rand);
  stepNessie(scene, dt, cam, rand);
  stepOwls(scene, dt, cam, rand);
  stepDeer(scene, dt, cam, rand);
  stepRaccoons(scene, dt, cam, rand);
  for (const r of life.ripples) { r[2] += dt * 26 * life.s; r[3] -= dt * 0.35; }
  life.ripples = life.ripples.filter(r => r[3] > 0).slice(-8);
  life.flash = Math.max(0, life.flash - dt * 4);
};

// ------------------------------------------------------------------ stats ---

export interface ForestStats {
  documented: Record<CryptidKind, number>;
  counts: { owl: number; deer: number; raccoon: number; firefly: number; moth: number };
  events: FeedEvent[];
}

/** What the census shows. */
export const forestStats = (life: ForestLife): ForestStats => ({
  documented: { ...life.documented },
  counts: {
    owl: life.owls.length, deer: life.deer.length, raccoon: life.raccoons.length, firefly: life.fireflies,
    moth: Math.round(life.moths.density * 46),
  },
  events: life.events.slice(0, 4),
});

// ------------------------------------------------------------------ debug ---

/** What the debug panel can ask for, by name (see CryptidDebugPanel). */
export type DebugName = string;

/** Brings something into view, or sets something going. */
export const debugAction = (scene: ForestScene, name: DebugName, cam: ForestCamera) => {
  const life = scene.life;
  const mid: V3 = fromScreen(scene, cam, cam.viewW / 2, cam.viewH / 2, 0);
  const gut = (right: boolean): V3 => [cam.viewW * (right ? 0.9 : 0.1), mid[1] + cam.viewH * 0.15, 0];
  const nearPerch = () => pickPerch(scene, cam, [life.mothman.perch, life.devil.perch], null, Math.random);
  switch (name) {
    case 'bigfoot': {
      const bf = life.bigfoot[0];
      bf.pos = gut(true); bf.mode = 'walk'; bf.t = 0; bf.target = [cam.viewW * 0.9, mid[1] + cam.viewH * 0.4, 0];
      break;
    }
    case 'crawlers': {
      const [a, b] = life.crawlers;
      const y = mid[1];
      a.pos = [pathXOf(scene, y), y, 0]; b.pos = [pathXOf(scene, y - 40), y - 40, 0]; a.dir = 1; a.mode = 'waddle'; a.t = 0;
      break;
    }
    case 'mothman': {
      const p = nearPerch();
      if (p >= 0) { life.mothman.perch = p; life.mothman.pos = life.perches[p].p; life.mothman.mode = 'perch'; life.mothman.t = 0; }
      break;
    }
    case 'devil': {
      const p = pickPerch(scene, cam, [life.mothman.perch], null, Math.random);
      if (p >= 0) { life.devil.perch = p; life.devil.pos = life.perches[p].p; life.devil.mode = 'perch'; life.devil.t = 0; }
      break;
    }
    case 'wendigo': life.wendigo.mode = 'gone'; life.wendigo.t = 4; break;
    case 'nessie': if (life.nessie) { life.nessie.mode = 'below'; life.nessie.t = 10; life.nessie.unwatched = 10; } break;
    case 'deer': {
      const d0 = life.deer[0];
      if (d0) for (const d of life.deer.slice(0, 3)) { d.pos = add(gut(false), [(Math.random() - 0.5) * 80, (Math.random() - 0.5) * 60, 0]); d.home = d.pos; d.mode = 'graze'; d.t = 0; }
      break;
    }
    case 'owl': {
      const o = life.owls[0];
      const p = nearPerch();
      if (o && p >= 0) { o.perch = p; o.pos = life.perches[p].p; }
      break;
    }
    case 'raid': life.snack.raid = 0; break;
    case 'moths': life.rest.t = 6; life.rest.p = fromScreen(scene, cam, life.beam.x, life.beam.y, 0); break;
    case 'document': {
      const all: [CryptidKind, V3][] = [
        ['bigfoot', life.bigfoot[0].pos], ['crawler', life.crawlers[0].pos], ['mothman', life.mothman.pos], ['devil', life.devil.pos], ['wendigo', life.wendigo.pos],
      ];
      if (life.nessie) all.push(['nessie', life.nessie.pos]);
      let best = all[0], bd = Infinity;
      for (const a of all) { const d = dist2(a[1], mid); if (d < bd) { bd = d; best = a; } }
      expose(scene, cam, { exposure: 5 }, best[0], lift(best[1], 50 * life.s), 80 * life.s, 1, 0);
      break;
    }
    case 'visit': {
      const bf = life.bigfoot[0];
      bf.pos = [life.camp.c[0] + 160 * life.s, life.camp.c[1] + 60 * life.s, 0];
      bf.mode = 'rummage'; bf.t = 0; bf.target = [life.camp.cooler[0] - 30 * life.s, life.camp.cooler[1] + 26 * life.s, 0];
      break;
    }
  }
  void scl; void norm;
};
