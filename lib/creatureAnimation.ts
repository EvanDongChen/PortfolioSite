import { TurtleState, JellyfishState } from '../types';

// Shared 30fps animation pump for the large ambient creatures (whale,
// turtle, jellyfish, angler fish). Kept as a single module-level rAF chain
// (rather than one requestAnimationFrame loop per creature) so subscribing
// components share one scheduling cost.
export type AnimationSubscriber = (timestamp: number) => void;

const subscribers = new Set<AnimationSubscriber>();
let frameId: number | null = null;

const tick = (timestamp: number) => {
  frameId = null;
  if (document.hidden) return;
  subscribers.forEach(subscriber => subscriber(timestamp));
  if (subscribers.size > 0) {
    frameId = window.requestAnimationFrame(tick);
  }
};

const resumeIfNeeded = () => {
  if (!document.hidden && frameId === null && subscribers.size > 0) {
    frameId = window.requestAnimationFrame(tick);
  }
};

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', resumeIfNeeded);
}

export const subscribeToCreatureAnimation = (subscriber: AnimationSubscriber) => {
  subscribers.add(subscriber);
  if (frameId === null) {
    frameId = window.requestAnimationFrame(tick);
  }

  return () => {
    subscribers.delete(subscriber);
    if (subscribers.size === 0 && frameId !== null) {
      window.cancelAnimationFrame(frameId);
      frameId = null;
    }
  };
};

export const randomInRange = (minMs: number, maxMs: number) => minMs + Math.random() * (maxMs - minMs);

export const SCROLL_PARALLAX = 1.0;
export const FISH_SIMULATION_FPS = 30;
export const FISH_SIMULATION_FRAME_MS = 1000 / FISH_SIMULATION_FPS;

// Cross-creature read-only snapshots. Turtle steers toward the jellyfish and
// "eats" it on contact; jellyfish needs the turtle's position for that same
// contact check. Whale/turtle spawn logic keeps them apart. Since each
// creature's position now lives in its own component's state (so its 30fps
// position updates don't force the whole app to re-render), these plain
// module-level snapshots are how sibling creature components see each
// other's latest position without sharing a React state/re-render.
export const largeCreatureSnapshots: {
  turtle: TurtleState | null;
  jellyfish: JellyfishState | null;
} = { turtle: null, jellyfish: null };
