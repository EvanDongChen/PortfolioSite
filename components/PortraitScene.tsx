import React, { memo, useEffect, useRef } from 'react';
import { usePerformance } from '../contexts/PerformanceContext';
import { ART, makePortraitScene, type PortraitWorld } from '../lib/portraitScenes';

const BASE_URL = import.meta.env.BASE_URL;

/** How far each layer slides at full tilt, in CSS px: the scene away from the pointer, the person towards it. */
const SCENE_SHIFT = { x: 10, y: 8 };
const PERSON_SHIFT = { x: 7, y: 4 };

type TiltPermission = { requestPermission?: () => Promise<'granted' | 'denied'> };

interface Props {
  world: PortraitWorld;
}

/**
 * The portrait for a pixel world: the world drawn live on a small pixel
 * canvas behind, the person cut out in front, and the two sliding apart as
 * the cursor moves (or the phone tilts) so the person stands out from the scene.
 */
const PortraitScene: React.FC<Props> = ({ world }) => {
  const { tier, reducedMotion } = usePerformance();
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const personRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const root = rootRef.current, canvas = canvasRef.current, person = personRef.current;
    if (!root || !canvas || !person) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const scene = makePortraitScene(world);
    const still = document.createElement('canvas');
    still.width = still.height = ART;
    const sctx = still.getContext('2d')!;
    scene.paintStatic(sctx);

    const draw = (t: number) => {
      ctx.drawImage(still, 0, 0);
      scene.paintFrame(ctx, t);
    };

    if (reducedMotion) {
      draw(0);
      return;
    }

    const fps = tier === 'low' ? 8 : 15;
    const target = { x: 0, y: 0 };
    const cur = { x: 0, y: 0 };
    let tiltSeen = false;
    let raf = 0;
    let onScreen = true;
    let lastDraw = -1;
    let lastFrame = performance.now();
    const start = lastFrame;

    const clamp = (v: number) => Math.max(-1, Math.min(1, v));

    const onPointer = (e: PointerEvent) => {
      if (tiltSeen || e.pointerType === 'touch') return;
      const r = root.getBoundingClientRect();
      target.x = clamp((e.clientX - (r.left + r.width / 2)) / (r.width * 2.5));
      target.y = clamp((e.clientY - (r.top + r.height / 2)) / (r.height * 2.5));
    };
    const onLeave = () => { if (!tiltSeen) target.x = target.y = 0; };
    const onTilt = (e: DeviceOrientationEvent) => {
      if (e.gamma == null || e.beta == null) return;
      tiltSeen = true;
      target.x = clamp(e.gamma / 25);
      target.y = clamp((e.beta - 45) / 25);
    };
    // iOS only reports tilt once asked, and only from inside a tap.
    const askTilt = () => {
      const D = (window as unknown as { DeviceOrientationEvent?: TiltPermission }).DeviceOrientationEvent;
      D?.requestPermission?.().catch(() => {});
    };

    const place = () => {
      canvas.style.transform = `translate3d(${(-cur.x * SCENE_SHIFT.x).toFixed(2)}px, ${(-cur.y * SCENE_SHIFT.y).toFixed(2)}px, 0) scale(1.12)`;
      person.style.transform = `translate3d(${(cur.x * PERSON_SHIFT.x).toFixed(2)}px, ${(cur.y * PERSON_SHIFT.y).toFixed(2)}px, 0) scale(1.08)`;
    };

    const tick = (now: number) => {
      raf = 0;
      if (!onScreen || document.hidden) return;
      const dt = Math.min(0.1, (now - lastFrame) / 1000);
      lastFrame = now;
      const k = 1 - Math.exp(-dt * 6);
      cur.x += (target.x - cur.x) * k;
      cur.y += (target.y - cur.y) * k;
      place();
      const t = (now - start) / 1000;
      if (t - lastDraw >= 1 / fps) {
        lastDraw = t;
        draw(t);
      }
      raf = requestAnimationFrame(tick);
    };
    const resume = () => {
      if (!raf && onScreen && !document.hidden) {
        lastFrame = performance.now();
        raf = requestAnimationFrame(tick);
      }
    };

    const io = new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting;
      resume();
    });
    io.observe(root);
    draw(0);
    resume();

    window.addEventListener('pointermove', onPointer, { passive: true });
    document.documentElement.addEventListener('pointerleave', onLeave);
    window.addEventListener('deviceorientation', onTilt);
    root.addEventListener('pointerdown', askTilt);
    document.addEventListener('visibilitychange', resume);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      window.removeEventListener('pointermove', onPointer);
      document.documentElement.removeEventListener('pointerleave', onLeave);
      window.removeEventListener('deviceorientation', onTilt);
      root.removeEventListener('pointerdown', askTilt);
      document.removeEventListener('visibilitychange', resume);
    };
  }, [world, tier, reducedMotion]);

  return (
    <div ref={rootRef} className="relative w-full h-full overflow-hidden">
      <canvas
        ref={canvasRef}
        width={ART}
        height={ART}
        className="absolute inset-0 w-full h-full"
        style={{ imageRendering: 'pixelated', transform: 'scale(1.12)' }}
      />
      <img
        ref={personRef}
        src={`${BASE_URL}images/portraits/person-${world}.webp`}
        alt="Evan Chen"
        className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        style={{ transform: 'scale(1.08)' }}
        fetchPriority="high"
        decoding="async"
        draggable={false}
      />
    </div>
  );
};

export default memo(PortraitScene);
