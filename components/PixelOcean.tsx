import React, { useEffect, useRef } from 'react';
import { PixelOcean as Ocean, OceanStats } from '../lib/pixelOcean';
import { OceanView } from '../lib/pixelOceanView';
import { usePerformance, PerformanceTier } from '../contexts/PerformanceContext';

// Screen pixels per art pixel. Bigger pixels mean a smaller world to simulate.
const PIXEL_SIZE: Record<PerformanceTier, number> = { high: 4, medium: 5, low: 6 };
const TICK_MS = 1000 / 30;
const STATS_INTERVAL_MS = 500;
// Food is dropped near the surface so it visibly sinks to the floor.
const DROP_HEIGHT = 90;
// Fish shy away from the cursor at roughly their own swimming height.
const POINTER_HEIGHT = 25;

interface PixelOceanProps {
  isFoodMode: boolean;
  onStats: (stats: OceanStats) => void;
}

/** The reef behind the content: as tall as the page and scrolled with it. */
const PixelOcean: React.FC<PixelOceanProps> = ({ isFoodMode, onStats }) => {
  const floorRef = useRef<HTMLCanvasElement>(null);
  const spriteRef = useRef<HTMLCanvasElement>(null);
  const isFoodModeRef = useRef(isFoodMode);
  isFoodModeRef.current = isFoodMode;
  const onStatsRef = useRef(onStats);
  onStatsRef.current = onStats;

  const { tier, reducedMotion, override, frameRate } = usePerformance();
  const px = PIXEL_SIZE[override ?? (reducedMotion ? 'low' : tier)];
  const frameMsRef = useRef(1000 / frameRate);
  frameMsRef.current = 1000 / frameRate;

  useEffect(() => {
    const floor = floorRef.current;
    const sprites = spriteRef.current;
    if (!floor || !sprites) return;

    const worldSize = () => ({
      w: Math.ceil(window.innerWidth / px),
      h: Math.max(Math.ceil(window.innerHeight / px), Math.ceil(document.documentElement.scrollHeight / px)),
    });
    const size = worldSize();
    const ocean = new Ocean(size.w, size.h);
    const view = new OceanView(ocean, floor, sprites, px);
    const draw = () => view.render(window.scrollY, window.innerWidth, window.innerHeight, window.devicePixelRatio || 1);
    draw();

    let raf = 0;
    let last = performance.now();
    let pending = 0;
    let lastDraw = 0;
    let lastScroll = window.scrollY;
    let lastStats = 0;
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      // After a hidden tab, catch up a few ticks rather than fast-forwarding.
      pending = Math.min(pending + now - last, TICK_MS * 3);
      last = now;
      let ticked = false;
      while (pending >= TICK_MS) {
        ocean.step();
        pending -= TICK_MS;
        ticked = true;
      }
      // Redraw for new ticks, and while scrolling so the perspective follows.
      const scrolled = window.scrollY !== lastScroll;
      if ((ticked || scrolled) && now - lastDraw >= frameMsRef.current - 2) {
        lastDraw = now;
        lastScroll = window.scrollY;
        draw();
      }
      if (now - lastStats > STATS_INTERVAL_MS) {
        lastStats = now;
        onStatsRef.current(ocean.stats());
      }
    };
    raf = requestAnimationFrame(frame);

    // The world is as tall as the page, so follow the content's height too.
    let resizeTimer = 0;
    const handleResize = () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        const next = worldSize();
        ocean.resize(next.w, next.h);
        draw();
      }, 150);
    };
    const observer = new ResizeObserver(handleResize);
    observer.observe(document.body);

    const handlePointerMove = (e: PointerEvent) => {
      const p = view.screenToWorld(e.clientX, e.clientY, POINTER_HEIGHT);
      ocean.setPointer(p.x, p.z);
    };
    const handlePointerLeave = () => ocean.clearPointer();
    const handlePointerDown = (e: PointerEvent) => {
      if (!isFoodModeRef.current) return;
      if ((e.target as Element | null)?.closest('button, a, input, textarea, select, [role="dialog"]')) return;
      const p = view.screenToWorld(e.clientX, e.clientY, DROP_HEIGHT);
      ocean.dropFood(p.x, p.z, DROP_HEIGHT);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('pointermove', handlePointerMove);
    document.documentElement.addEventListener('pointerleave', handlePointerLeave);
    window.addEventListener('pointerdown', handlePointerDown);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(resizeTimer);
      observer.disconnect();
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('pointermove', handlePointerMove);
      document.documentElement.removeEventListener('pointerleave', handlePointerLeave);
      window.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [px]);

  // Both canvases sit in the page (not fixed) so native scrolling moves them
  // between frames; the clip keeps them from ever stretching the page.
  return (
    <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none" aria-hidden="true">
      <canvas ref={floorRef} className="absolute left-0 top-0 block" style={{ imageRendering: 'pixelated' }} />
      <canvas ref={spriteRef} className="absolute left-0 top-0 block" />
      {/* The top of the screen is further from the camera: fade it into the deep. */}
      <div className="fixed inset-0 bg-gradient-to-b from-[#020b24]/60 via-[#020b24]/15 to-transparent" />
    </div>
  );
};

export default React.memo(PixelOcean);
