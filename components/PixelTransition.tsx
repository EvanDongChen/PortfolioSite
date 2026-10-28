import React, { useEffect, useRef, useState } from 'react';

const BLOCK = 32;
const DURATION_MS = 750;
const SHADES = ['#050d14', '#0c2230', '#1d4256', '#0c2230', '#8fe3dc', '#050d14'];

/** Covers the screen in blocks that dissolve in a ragged sweep, then removes itself. */
const PixelTransition: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [done, setDone] = useState(() => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const cols = Math.ceil(window.innerWidth / BLOCK);
    const rows = Math.ceil(window.innerHeight / BLOCK);
    canvas.width = cols * BLOCK;
    canvas.height = rows * BLOCK;

    // A ragged diagonal sweep from the top left.
    const key = (i: number) => ((i % cols) + Math.floor(i / cols)) / (cols + rows) + Math.random() * 0.35;
    const keys = Array.from({ length: cols * rows }, (_, i) => key(i));
    const order = keys.map((_, i) => i).sort((a, b) => keys[a] - keys[b]);
    order.forEach(i => {
      ctx.fillStyle = SHADES[Math.floor(Math.random() * SHADES.length)];
      ctx.fillRect((i % cols) * BLOCK, Math.floor(i / cols) * BLOCK, BLOCK, BLOCK);
    });

    let cleared = 0;
    let raf = 0;
    const start = performance.now();
    const frame = (now: number) => {
      const t = Math.min(1, (now - start) / DURATION_MS);
      const target = Math.floor(order.length * t);
      for (; cleared < target; cleared++) {
        const i = order[cleared];
        ctx.clearRect((i % cols) * BLOCK, Math.floor(i / cols) * BLOCK, BLOCK, BLOCK);
      }
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
