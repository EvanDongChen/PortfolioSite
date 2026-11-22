import { V3 } from '../space/space';
import type { Builder, Camp, Clearing, ForestCamera, ForestScene, Perch, Pond, Tree } from './forest';

/** Everything that lives in the forest. */
export interface ForestLife {
  /** The flashlight: where its beam is on screen (CSS px), how wide, how bright. */
  beam: { x: number; y: number; r: number; on: number };
  /** Rings spreading on the ponds: x, y, radius, strength. */
  ripples: [number, number, number, number][];
  /** A camera flash whitening everything, 0..1. */
  flash: number;
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

export const populateLife = (_B: Builder, ctx: LifeCtx): ForestLife => {
  return { beam: { x: ctx.viewW * 0.7, y: ctx.viewH * 0.6, r: 140 * ctx.s, on: 1 }, ripples: [], flash: 0 };
};

export const stepLife = (scene: ForestScene, _t: number, _dt: number, _cam: ForestCamera, pointer: { x: number; y: number } | null) => {
  const beam = scene.life.beam;
  if (pointer) { beam.x = pointer.x; beam.y = pointer.y; }
  void ([] as V3[]);
};

/** What the debug panel can ask for, by name (see CryptidDebugPanel). */
export type DebugName = string;

export const debugAction = (scene: ForestScene, name: DebugName, cam: ForestCamera) => {
  void scene; void name; void cam;
};
