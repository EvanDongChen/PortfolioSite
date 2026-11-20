import { buildScene } from './sky';

/** Builds sky scenes off the main thread; the surfel buffers come back transferred. */
self.onmessage = (e: MessageEvent<{ id: number; w: number; h: number; page: number }>) => {
  const { id, w, h, page } = e.data;
  const scene = buildScene(w, h, page);
  (self as unknown as Worker).postMessage({ id, scene }, [scene.solid.buffer, scene.glow.buffer]);
};
