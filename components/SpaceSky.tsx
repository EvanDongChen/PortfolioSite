import React, { useEffect, useRef } from 'react';
import { SpaceScene, buildScene } from '../lib/space';
import { SpaceView } from '../lib/spaceView';
import { usePerformance, PerformanceTier } from '../contexts/PerformanceContext';

// Screen pixels per art pixel; phones get a finer grid so planets keep their detail.
const PIXEL_SIZE: Record<PerformanceTier, number> = { high: 4, medium: 5, low: 6 };
const pixelFor = (tier: PerformanceTier, w: number) => (w < 640 ? Math.max(3, PIXEL_SIZE[tier] - 1) : PIXEL_SIZE[tier]);
/** How far the camera leans with the pointer, in CSS pixels at the content's depth. */
const LEAN = 36;
const REBUILD_MS = 250;

interface SpaceSkyProps {
  onReady: () => void;
}

/**
 * Space behind the content: a 3D scene drawn as pixel art (see lib/spaceView.ts)
 * on one fixed canvas the size of the window. The camera follows the page's
 * scroll, snapped to whole art pixels, and the canvas is nudged by what's left
 * over, so things at the content's depth scroll exactly with it and the rest
 * parallax behind. The pointer leans the camera a little, to show it's 3D.
 */
const SpaceSky: React.FC<SpaceSkyProps> = ({ onReady }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { tier, reducedMotion, frameRate } = usePerformance();
  const settings = useRef({ tier, reducedMotion, frameRate });
  settings.current = { tier, reducedMotion, frameRate };
  const readyRef = useRef(onReady);
  readyRef.current = onReady;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let view: SpaceView;
    try {
      view = new SpaceView(canvas, pixelFor(settings.current.tier, window.innerWidth));
    } catch {
      readyRef.current();
      return;
    }
    let built = { w: 0, h: 0, page: 0 };
    let hasScene = false;
    // The scene takes a moment to build, so it's built in a worker where possible.
    let worker: Worker | null = null;
    try {
      worker = new Worker(new URL('../lib/spaceWorker.ts', import.meta.url), { type: 'module' });
    } catch {
      worker = null;
    }
    let buildId = 0;
    if (worker) {
      worker.onmessage = (e: MessageEvent<{ id: number; scene: SpaceScene }>) => {
        if (e.data.id !== buildId) return;
        view.setScene(e.data.scene);
        hasScene = true;
      };
    }
    const build = () => {
      const w = window.innerWidth, h = window.innerHeight;
      const page = Math.max(document.documentElement.scrollHeight, h);
      built = { w, h, page };
      if (worker) worker.postMessage({ id: ++buildId, w, h, page });
      else { view.setScene(buildScene(w, h, page)); hasScene = true; }
    };
    build();

    let rebuildTimer = 0;
    const maybeRebuild = () => {
      const w = window.innerWidth, h = window.innerHeight;
      const page = document.documentElement.scrollHeight;
      if (w === built.w && Math.abs(h - built.h) < built.h * 0.2 && Math.abs(page - built.page) < built.page * 0.08) return;
      clearTimeout(rebuildTimer);
      rebuildTimer = window.setTimeout(build, REBUILD_MS);
    };
    const observer = new ResizeObserver(maybeRebuild);
    observer.observe(document.body);
    window.addEventListener('resize', maybeRebuild);

    const lean = { x: 0, y: 0, tx: 0, ty: 0 };
    let pointer: { x: number; y: number } | null = null;
    const onPointer = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      pointer = { x: e.clientX, y: e.clientY };
      lean.tx = (e.clientX / window.innerWidth - 0.5) * LEAN;
      lean.ty = (e.clientY / window.innerHeight - 0.5) * LEAN * 0.6;
    };
    window.addEventListener('pointermove', onPointer, { passive: true });
    const onLeave = () => { pointer = null; };
    document.documentElement.addEventListener('mouseleave', onLeave);

    let raf = 0;
    let last = performance.now();
    let lastDraw = 0;
    let time = 40; // start part-way in, so orbits and the comet are already somewhere interesting
    let first = true;
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      if (!hasScene) return;
      const { tier: t, reducedMotion: still, frameRate: fps } = settings.current;
      if (now - lastDraw < 1000 / fps - 2) return;
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      lastDraw = now;
      if (!still) time += dt;
      const w = window.innerWidth, h = window.innerHeight;
      const px = pixelFor(t, w);
      const { w: aw, h: ah } = view.resize(w, h, px);
      canvas.style.width = `${aw * px}px`;
      canvas.style.height = `${ah * px}px`;
      const ease = still ? 1 : 1 - Math.exp(-dt * 3);
      lean.x += (lean.tx + (still ? 0 : Math.sin(time * 0.13) * 6) - lean.x) * ease;
      lean.y += (lean.ty + (still ? 0 : Math.cos(time * 0.11) * 4) - lean.y) * ease;
      const scroll = window.scrollY;
      const snapped = Math.floor(scroll / px) * px;
      canvas.style.transform = `translate3d(0, ${snapped - scroll}px, 0)`;
      view.draw({ viewW: w, viewH: h, scrollY: snapped, offX: lean.x, offY: lean.y, time, dt: still ? 0 : dt, pointer });
      if (first) { first = false; readyRef.current(); }
    };
    const onVisibility = () => {
      cancelAnimationFrame(raf);
      if (!document.hidden) { last = performance.now(); raf = requestAnimationFrame(frame); }
    };
    document.addEventListener('visibilitychange', onVisibility);
    raf = requestAnimationFrame(frame);
    if (import.meta.env.DEV) (window as unknown as { __space: unknown }).__space = { view, build };

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(rebuildTimer);
      observer.disconnect();
      window.removeEventListener('resize', maybeRebuild);
      window.removeEventListener('pointermove', onPointer);
      document.documentElement.removeEventListener('mouseleave', onLeave);
      document.removeEventListener('visibilitychange', onVisibility);
      worker?.terminate();
      view.dispose();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="space-sky fixed left-0 top-0 pointer-events-none"
      style={{ zIndex: 0, imageRendering: 'pixelated' }}
    />
  );
};

export default SpaceSky;
