// The reef's own thread: the page hands over its canvases and sends the
// scroll position, the pointer and the visitor's actions; the engine runs
// the simulation and draws here, so neither ever holds up the page.

import { EngineInit, FromEngine, ReefEngine, ToEngine } from './reefEngine';

// Typed loosely: this file is built for a worker, but checked with the page's DOM types.
const scope = self as unknown as {
  onmessage: ((e: MessageEvent<({ type: 'init' } & EngineInit) | ToEngine>) => void) | null;
  postMessage: (message: FromEngine) => void;
};

let engine: ReefEngine | null = null;

scope.onmessage = e => {
  const m = e.data;
  if (m.type === 'init') engine = new ReefEngine(m, message => scope.postMessage(message));
  else engine?.handleMessage(m);
};
