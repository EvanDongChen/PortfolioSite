import React, { useLayoutEffect, useRef, useState } from 'react';

const BLOCK = 16;
const DURATION_MS = 1100;
/** How long (as a share of the whole) one block takes to shrink away. */
const FADE = 0.3;
/** Blocks shrink in whole steps of this many pixels, so it stays pixel-art. */
const STEP = 4;
const INK = '#050d14';
const EDGE = '#0c2230';

// 4x4 ordered-dither thresholds: neighbouring blocks clear at different
// moments, so the reef shows through as an even pixel pattern, not holes.
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

/**
 * Covers the screen in dark blocks that open out from the middle in an
 * ordered dither, each shrinking away in pixel steps, then removes itself.
 */
const PixelTransition: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [done, setDone] = useState(() => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false);

  // Cover the screen before the first paint, so the page never flashes through.
  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const cols = Math.ceil(window.innerWidth / BLOCK);
    const rows = Math.ceil(window.innerHeight / BLOCK);
    canvas.width = cols * BLOCK;
    canvas.height = rows * BLOCK;

    // When each block starts to clear: mostly by distance from the centre,
    // broken up by the dither so the opening edge is soft.
    const cx = cols / 2;
    const cy = rows / 2;
    const reach = Math.hypot(cx, cy);
    const starts = new Float32Array(cols * rows);
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const radial = Math.hypot(x - cx, y - cy) / reach;
        const dither = BAYER[(y & 3) * 4 + (x & 3)] / 16;
        starts[y * cols + x] = (radial * 0.6 + dither * 0.4) * (1 - FADE);
      }
    }

    const draw = (p: number) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let i = 0; i < starts.length; i++) {
        const local = Math.min(1, Math.max(0, (p - starts[i]) / FADE));
        const size = Math.round((BLOCK * (1 - local)) / STEP) * STEP;
        if (size <= 0) continue;
        const x = (i % cols) * BLOCK + (BLOCK - size) / 2;
        const y = Math.floor(i / cols) * BLOCK + (BLOCK - size) / 2;
        // Blocks about to go are a shade lighter, which softens the edge.
        ctx.fillStyle = local > 0.5 ? EDGE : INK;
        ctx.fillRect(x, y, size, size);
      }
    };
    draw(0);

    let raf = 0;
    const start = performance.now();
    const frame = (now: number) => {
      const t = Math.min(1, (now - start) / DURATION_MS);
      draw(easeInOut(t));
      if (t < 1) raf = requestAnimationFrame(frame);
      else setDone(true);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);

  if (done) return null;
  return <canvas ref={canvasRef} className="fixed left-0 top-0 z-[300] pointer-events-none" aria-hidden="true" />;
};

export default PixelTransition;
