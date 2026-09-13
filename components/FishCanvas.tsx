import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { Fish as FishType } from '../types';

export interface FishCanvasRef {
  setFishSnapshot: (fishes: FishType[]) => void;
  setScrollY: (scrollY: number) => void;
}

interface FishCanvasProps {
  enabled: boolean;
  isDeepSea: boolean;
}

const FishCanvas = forwardRef<FishCanvasRef, FishCanvasProps>(({ enabled, isDeepSea }, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fishesRef = useRef<FishType[]>([]);
  const scrollYRef = useRef(0);
  const imageCacheRef = useRef<Map<string, HTMLImageElement>>(new Map());

  const getFishImage = (fish: FishType, redraw: () => void) => {
    const key = `${fish.color1}|${fish.color2}`;
    const cached = imageCacheRef.current.get(key);
    if (cached) return cached;

    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 50" width="120" height="50" preserveAspectRatio="none">
        <defs>
          <linearGradient id="fishGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="${fish.color1}" stop-opacity="0.85" />
            <stop offset="100%" stop-color="${fish.color2}" stop-opacity="0.7" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="1.5" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <g filter="url(#glow)">
          <path fill="url(#fishGradient)" d="M 90,25 C 80,10 30,5 10,25 C 30,45 80,40 90,25" />
          <path fill="url(#fishGradient)" d="M 10,25 L 0,15 L 5,25 L 0,35 L 10,25" />
          <circle cx="75" cy="22" r="2.2" fill="rgba(255, 255, 255, 0.95)" />
        </g>
      </svg>`;
    const image = new Image();
    image.onload = redraw;
    image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    imageCacheRef.current.set(key, image);
    return image;
  };

  const draw = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!enabled) return;
    const viewportTop = scrollYRef.current;

    for (const fish of fishesRef.current) {
      if (fish.variant && fish.variant !== 'default') continue;

      const displayY = fish.y - viewportTop;
      if (displayY < -100 || displayY > canvas.height + 100) continue;

      const width = 120 * fish.scale;
      const height = 50 * fish.scale;
      const image = getFishImage(fish, draw);
      if (!image.complete || image.naturalWidth === 0) continue;

      ctx.save();
      ctx.translate(fish.x + width / 2, displayY + height / 2);
      ctx.rotate(fish.rotation * Math.PI / 180);
      ctx.scale(1, fish.isFlipped ? -1 : 1);
      ctx.filter = isDeepSea ? 'brightness(1.6) saturate(2.2)' : 'none';

      if (isDeepSea) {
        ctx.shadowColor = fish.color1;
        ctx.shadowBlur = 10;
      }

      ctx.drawImage(image, -width / 2, -height / 2, width, height);
      ctx.restore();
    }
  };

  useImperativeHandle(ref, () => ({
    setFishSnapshot: (fishes) => {
      fishesRef.current = fishes;
      draw();
    },
    setScrollY: (scrollY) => {
      scrollYRef.current = scrollY;
      draw();
    },
  }), [enabled, isDeepSea]);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = window.innerWidth * pixelRatio;
      canvas.height = window.innerHeight * pixelRatio;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      canvas.getContext('2d')?.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      draw();
    };

    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [enabled, isDeepSea]);

  React.useEffect(() => {
    draw();
  }, [enabled, isDeepSea]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ display: enabled ? 'block' : 'none' }}
      aria-hidden="true"
    />
  );
});

export default React.memo(FishCanvas);
