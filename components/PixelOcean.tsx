import React, { useEffect, useRef } from 'react';
import { PixelOcean as Ocean, OceanStats } from '../lib/pixelOcean';
import { usePerformance, PerformanceTier } from '../contexts/PerformanceContext';

// Screen pixels per simulated cell. Bigger cells mean fewer to simulate.
const CELL_SIZE: Record<PerformanceTier, number> = { high: 4, medium: 5, low: 6 };
const TICK_MS = 1000 / 30;
const STATS_INTERVAL_MS = 500;

interface PixelOceanProps {
  isFoodMode: boolean;
  onStats: (stats: OceanStats) => void;
}

/** Full-screen canvas behind the content that runs and draws the ocean. */
const PixelOcean: React.FC<PixelOceanProps> = ({ isFoodMode, onStats }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isFoodModeRef = useRef(isFoodMode);
  isFoodModeRef.current = isFoodMode;
  const onStatsRef = useRef(onStats);
  onStatsRef.current = onStats;

  const { tier, reducedMotion, override } = usePerformance();
  const cell = CELL_SIZE[override ?? (reducedMotion ? 'low' : tier)];

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d', { alpha: false });
    if (!canvas || !ctx) return;

    let ocean: Ocean | null = null;
    let image: ImageData;
    let pixels: Uint32Array;

    const fit = () => {
      const w = Math.ceil(window.innerWidth / cell);
      const h = Math.ceil(window.innerHeight / cell);
      if (ocean) ocean.resize(w, h);
      else ocean = new Ocean(w, h);
      canvas.width = w;
      canvas.height = h;
      canvas.style.width = `${w * cell}px`;
      canvas.style.height = `${h * cell}px`;
      image = ctx.createImageData(w, h);
      pixels = new Uint32Array(image.data.buffer);
      ocean.render(pixels);
      ctx.putImageData(image, 0, 0);
    };
    fit();

    let raf = 0;
    let last = performance.now();
    let pending = 0;
    let lastStats = 0;
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      // After a hidden tab, catch up a few ticks rather than fast-forwarding.
      pending = Math.min(pending + now - last, TICK_MS * 3);
      last = now;
      if (pending < TICK_MS || !ocean) return;
      while (pending >= TICK_MS) {
        ocean.step();
        pending -= TICK_MS;
      }
      ocean.render(pixels);
      ctx.putImageData(image, 0, 0);
      if (now - lastStats > STATS_INTERVAL_MS) {
        lastStats = now;
        onStatsRef.current(ocean.stats());
      }
    };
    raf = requestAnimationFrame(frame);

    let resizeTimer = 0;
    const handleResize = () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(fit, 150);
    };
    const handlePointerMove = (e: PointerEvent) => ocean?.setPointer(e.clientX / cell, e.clientY / cell);
    const handlePointerLeave = () => ocean?.clearPointer();
    const handlePointerDown = (e: PointerEvent) => {
      if (!isFoodModeRef.current) return;
      if ((e.target as Element | null)?.closest('button, a, input, textarea, select, [role="dialog"]')) return;
      ocean?.dropFood(e.clientX / cell, e.clientY / cell);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('pointermove', handlePointerMove);
    document.documentElement.addEventListener('pointerleave', handlePointerLeave);
    window.addEventListener('pointerdown', handlePointerDown);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(resizeTimer);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('pointermove', handlePointerMove);
      document.documentElement.removeEventListener('pointerleave', handlePointerLeave);
      window.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [cell]);

  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none" aria-hidden="true">
      <canvas ref={canvasRef} className="block" style={{ imageRendering: 'pixelated' }} />
    </div>
  );
};

export default React.memo(PixelOcean);
