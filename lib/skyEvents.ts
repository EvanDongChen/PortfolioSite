import { V3 } from './space';
import { Builder, SkyCamera, SkyScene } from './sky';

/**
 * The sky's events. Their effect on the light is gathered in `light`, which the
 * view hands to its shaders.
 */

export type SkyEventKind = 'rainbow' | 'storm';

export interface SkyEvents {
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

export const populateEvents = (_B: Builder, _ctx: Ctx): SkyEvents => ({
  light: { sun: 1, glow: 1, flash: 0, gloom: 0 },
});

export const startEvent = (_ev: SkyEvents, _kind: SkyEventKind) => {};

export const stepEvents = (_scene: SkyScene, _dt: number, _cam: SkyCamera) => {};
