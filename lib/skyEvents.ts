import { V3 } from './space';
import { Builder, F, G, M, SkyCamera, SkyScene, cloud, fromScreen, hexToRgb, tube } from './sky';

/**
 * The sky's events. A thunderhead rolls into view: the sky greys, rain pours
 * from under it, lightning flickers inside it and forks down out of it, the
 * puffball birds hurry home and the cloud-sheep are soaked through. When it has
 * passed, a rainbow arcs across the sky behind the islands. Rainbows come on
 * their own now and then too. The debug panel can start either (`startEvent`).
 *
 * Their effect on the light is gathered in `light`, which the view hands to its shaders.
 */

export type SkyEventKind = 'rainbow' | 'storm';

export interface SkyEvents {
  storm: { body: number; bolt: number; t: number; dur: number; next: number; from: V3 | null; to: V3; flashIn: number; flash: number };
  rainbow: { body: number; t: number; dur: number; next: number; z: number };
  /** Multipliers for the shaders: sunlight, glows, a lightning flash, storm gloom. */
  light: { sun: number; glow: number; flash: number; gloom: number };
}

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
}

const PARKED: V3 = [0, -1e6, 0];
const IDENT = [1, 0, 0, 0, 1, 0, 0, 0, 1];
const STORM_TIME = 24;
const RAINBOW_TIME = 22;
const RAINBOW = ['#f06a6a', '#f8a860', '#f8e070', '#8ad87a', '#6ab4ec', '#a88ce0'];

export const populateEvents = (B: Builder, ctx: Ctx): SkyEvents => {
  const { rand, s, f, viewW } = ctx;

  // The thunderhead: a big, dark, towering cloud, with rain beneath it.
  const sz = -0.35 * f;
  const W = 420 * s * ctx.k(sz);
  const storm = cloud(B, { rand, k: ctx.k, sp: ctx.sp, s }, PARKED, 420 * s, sz, { mat: M.storm, kind: 'storm', flat: 0.12 });
  B.bodies[storm].params = [0, 0, 0, 0];
  for (let i = 0; i < 240; i++) {
    B.glowAt([(rand() - 0.5) * W * 0.85, W * 0.12 + rand() * W * 0.05, (rand() - 0.5) * W * 0.2], W * 0.013, [0.66, 0.72, 0.86], storm, G.rain | G.gate | G.paint, rand(), W * (0.9 + rand() * 0.6));
  }
  // The bolt: a jagged fork of white-hot light down out of the cloud, shown only while it strikes.
  const bolt = B.body({ kind: 'bolt', name: 'lightning', pos: [0, 0, 0], attach: { parent: storm, offset: [0, 0, 0] }, params: [0, 0, 0, 0] });
  const fork = (from: V3, steps: number, spread: number) => {
    const path: V3[] = [from];
    let p = from;
    for (let i = 0; i < steps; i++) { p = [p[0] + (rand() - 0.5) * spread, p[1] + W * 0.07, p[2]]; path.push(p); }
    tube(B, bolt, path, u => W * 0.011 * (1 - u * 0.5), ctx.sp(sz) * 0.8, () => ({ mat: M.sun, alb: 1 }), F.emissive | F.wet);
    return path;
  };
  const trunk = fork([W * 0.05, W * 0.1, W * 0.05], 12, W * 0.09);
  fork(trunk[4], 5, W * 0.12);
  fork(trunk[8], 4, W * 0.1);
  // Light flickering inside the cloud as it strikes.
  for (let i = 0; i < 8; i++) B.glowAt([(rand() - 0.5) * W * 0.6, -W * 0.1 + (rand() - 0.5) * W * 0.2, W * 0.15], W * 0.25, [0.9, 0.9, 1], bolt, G.gate | G.flicker, rand());

  // The rainbow: six painted bands in an arch, far back behind the islands.
  const rz = -1.6 * f;
  const Rr = viewW * 0.42 * ctx.k(rz);
  const band = Rr * 0.045;
  const rainbow = B.body({ kind: 'rainbow', name: 'rainbow', pos: PARKED, params: [0, 0, 0, 0] });
  RAINBOW.forEach((hex, b) => {
    const r = Rr - b * band;
    const n = Math.round((Math.PI * r) / (band * 0.5));
    for (let i = 0; i <= n; i++) {
      const a = Math.PI * (i / n);
      B.glowAt([Math.cos(a) * r, -Math.sin(a) * r, 0], band * 0.75, hexToRgb(hex), rainbow, G.paint | G.gate, rand());
    }
  });

  return {
    storm: { body: storm, bolt, t: -1, dur: STORM_TIME, next: 95, from: null, to: PARKED, flashIn: 0, flash: 0 },
    rainbow: { body: rainbow, t: -1, dur: RAINBOW_TIME, next: 28, z: rz },
    light: { sun: 1, glow: 1, flash: 0, gloom: 0 },
  };
};

const smooth = (a: number, b: number, x: number) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const envelope = (t: number, dur: number, rise: number, fall: number) => smooth(0, rise, t) * (1 - smooth(dur - fall, dur, t));

/** Starts an event now, where the visitor is looking (the next step places it). */
export const startEvent = (ev: SkyEvents, kind: SkyEventKind) => {
  if (kind === 'storm') { ev.storm.t = 0; ev.storm.from = null; ev.rainbow.t = -1; }
  else { ev.rainbow.t = 0; }
};

export const stepEvents = (scene: SkyScene, dt: number, cam: SkyCamera) => {
  const ev = scene.events;
  const { storm, rainbow, light } = ev;
  const bodies = scene.bodies;
  const f = scene.focal;
  // Their own schedules: a rainbow soon after arriving, a storm a while later, then each every few minutes.
  storm.next -= dt;
  rainbow.next -= dt;
  if (storm.t < 0 && storm.next <= 0 && rainbow.t < 0) { storm.t = 0; storm.from = null; }
  if (rainbow.t < 0 && rainbow.next <= 0 && storm.t < 0) rainbow.t = 0;

  light.gloom = 0;
  light.flash = 0;
  light.sun = 1;
  if (storm.t >= 0) {
    if (!storm.from) {
      // Roll in across the top of the view, from the side away from the hero's words.
      const z = -0.35 * f;
      const fromLeft = cam.scrollY > cam.viewH && Math.random() < 0.5;
      storm.from = fromScreen(scene, cam, fromLeft ? cam.viewW * 0.02 : cam.viewW * 1.02, cam.viewH * 0.2, z);
      storm.to = fromScreen(scene, cam, fromLeft ? cam.viewW * 0.28 : cam.viewW * 0.74, cam.viewH * 0.24, z);
      storm.flashIn = 3;
    }
    storm.t += dt;
    const u = storm.t / storm.dur;
    const glide = smooth(0, 0.35, u) - smooth(0.7, 1, u);
    const from = storm.from;
    bodies[storm.body].live = { c: [from[0] + (storm.to[0] - from[0]) * glide, from[1] + (storm.to[1] - from[1]) * glide, from[2]], rot: IDENT };
    const strength = envelope(storm.t, storm.dur, 4, 5);
    light.gloom = strength * 0.85;
    light.sun = 1 - strength * 0.35;
    // Rain once it's well in.
    bodies[storm.body].params = [0, 0, strength > 0.5 ? 1 : 0, 0];
    // Lightning: a strike every few seconds, a double flicker of white.
    storm.flashIn -= dt;
    if (storm.flashIn <= 0 && strength > 0.6) { storm.flash = 0.35; storm.flashIn = 2 + Math.random() * 3.5; }
    storm.flash = Math.max(0, storm.flash - dt);
    const on = storm.flash > 0.22 || (storm.flash > 0 && storm.flash < 0.1);
    light.flash = on ? 0.6 : 0;
    bodies[storm.bolt].params = [0, 0, on ? 1 : 0, 0];
    if (storm.t >= storm.dur) {
      storm.t = -1;
      storm.next = 200 + Math.random() * 120;
      bodies[storm.body].live = { c: PARKED, rot: IDENT };
      // After the rain, a rainbow.
      rainbow.t = 0;
    }
  } else {
    bodies[storm.body].params = [0, 0, 0, 0];
    bodies[storm.bolt].params = [0, 0, 0, 0];
  }

  if (rainbow.t >= 0) {
    if (rainbow.t === 0) {
      // Arching over the middle of the view, its feet below the bottom edge.
      const p = fromScreen(scene, cam, cam.viewW * 0.5, cam.viewH * 1.08, rainbow.z);
      bodies[rainbow.body].live = { c: p, rot: IDENT };
    }
    rainbow.t += dt;
    bodies[rainbow.body].params = [0, 0, envelope(rainbow.t, rainbow.dur, 4, 5) * 0.75, 0];
    if (rainbow.t >= rainbow.dur) { rainbow.t = -1; rainbow.next = 150 + Math.random() * 100; bodies[rainbow.body].params = [0, 0, 0, 0]; }
  }
};
