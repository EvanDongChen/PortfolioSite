// The pond's own thread, like the reef's (see reefWorker.ts): the page hands
// over its canvases and sends the scroll, the pointer and the visitor's
// actions; the engine runs the simulation and draws here.

import { FromPond, PondEngine, PondEngineInit, ToPond } from './pondEngine';

// Typed loosely: this file is built for a worker, but checked with the page's DOM types.
const scope = self as unknown as {
  onmessage: ((e: MessageEvent<({ type: 'init' } & PondEngineInit) | ToPond>) => void) | null;
  postMessage: (message: FromPond) => void;
};

let engine: PondEngine | null = null;

scope.onmessage = e => {
  const m = e.data;
  if (m.type === 'init') engine = new PondEngine(m, message => scope.postMessage(message));
  else engine?.handleMessage(m);
};
