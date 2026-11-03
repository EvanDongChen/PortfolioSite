import React, { useEffect, useRef } from 'react';
import { PondLayout } from '../lib/pondView';
import { FromPond, PondEngine, PondEngineInit, ToPond } from '../lib/pondEngine';
import { usePerformance, PerformanceTier } from '../contexts/PerformanceContext';

// Screen pixels per art pixel, as on the reef.
const PIXEL_SIZE: Record<PerformanceTier, number> = { high: 4, medium: 5, low: 6 };
const HERO_CLEARANCE = 24;
const HERO_SETTLE_MS = 1200;
const RESIZE_SETTLE_MS = 150;

/** The area behind the hero's text (not the photo), in world units. */
const heroZones = (px: number) => {
  const items = Array.from(document.getElementById('home')?.children ?? [])
    .filter(el => !el.classList.contains('profile-photo'))
    .map(el => el.getBoundingClientRect())
    .filter(r => r.width > 0 && r.height > 0);
  if (!items.length) return [];
  const top = Math.min(...items.map(r => r.top)) + window.scrollY - HERO_CLEARANCE;
  const bottom = Math.max(...items.map(r => r.bottom)) + window.scrollY + HERO_CLEARANCE;
  const left = Math.min(...items.map(r => r.left)) - HERO_CLEARANCE;
  const right = Math.max(...items.map(r => r.right)) + HERO_CLEARANCE;
  return [{ x0: left / px, z0: top / px, x1: right / px, z1: bottom / px }];
};

/** Whether this browser can hand canvases to a worker and draw on them there. */
const canDrawInWorker = () => {
  try {
    return typeof Worker !== 'undefined' && typeof OffscreenCanvas !== 'undefined'
      && 'transferControlToOffscreen' in HTMLCanvasElement.prototype
      && !!new OffscreenCanvas(1, 1).getContext('2d');
  } catch {
    return false;
  }
};

/**
 * The pond behind the content: as tall as the page and scrolled with it.
 * Like the reef (see PixelOcean.tsx), the pond runs in a worker wherever the
 * browser can draw from one; this component only places its canvases, passes
 * on the scroll, the pointer and the visitor's actions, and shows what comes back.
 */
const PondWater: React.FC = () => {
  const layerRef = useRef<HTMLDivElement>(null);
  const sendRef = useRef<((m: ToPond) => void) | null>(null);

  const { tier, reducedMotion, override, frameRate } = usePerformance();
  const [startingPx] = React.useState(() => PIXEL_SIZE[reducedMotion ? 'low' : tier]);
  const px = override ? PIXEL_SIZE[override] : startingPx;
  const frameMsRef = useRef(1000 / frameRate);
  frameMsRef.current = 1000 / frameRate;
  useEffect(() => { sendRef.current?.({ type: 'frameMs', ms: 1000 / frameRate }); }, [frameRate]);

  useEffect(() => {
    const layer = layerRef.current;
    if (!layer) return;

    const worldSize = () => ({
      w: Math.ceil(window.innerWidth / px),
      h: Math.max(Math.ceil(window.innerHeight / px), Math.ceil(document.documentElement.scrollHeight / px)),
    });

    let canvases: HTMLCanvasElement[] = [];
    const makeCanvases = () => {
      const fade = layer.lastElementChild;
      canvases = ['floor', 'light', 'sprites', 'sprites'].map(kind => {
        const c = document.createElement('canvas');
        c.className = 'absolute left-0 top-0 block';
        c.style.imageRendering = 'pixelated';
        if (kind === 'light') c.style.mixBlendMode = 'plus-lighter';
        if (kind === 'sprites') c.style.visibility = 'hidden';
        layer.insertBefore(c, fade);
        return c;
      });
      return canvases;
    };

    const applyLayout = (layout: PondLayout) => {
      const [floor, light, ...sprites] = canvases;
      if (layout.kind === 'floor') {
        for (const c of [floor, light]) {
          c.style.width = `${layout.width}px`;
          c.style.height = `${layout.height}px`;
        }
        return;
      }
      const shown = sprites[layout.buffer];
      shown.style.width = `${layout.width}px`;
      shown.style.height = `${layout.height}px`;
      shown.style.transform = `translateY(${layout.top}px)`;
      shown.style.visibility = 'visible';
      sprites[layout.buffer ^ 1].style.visibility = 'hidden';
    };

    const receive = (m: FromPond) => {
      switch (m.type) {
        case 'layout': applyLayout(m.layout); break;
      }
    };

    const size = worldSize();
    const init = (): Omit<PondEngineInit, 'floor' | 'light' | 'sprites' | 'worker'> => ({
      px, w: size.w, h: size.h,
      scrollY: window.scrollY, viewW: window.innerWidth, viewH: window.innerHeight,
      frameMs: frameMsRef.current, zones: heroZones(px),
    });

    let stop = () => {};
    const runHere = () => {
      const [floor, light, a, b] = makeCanvases();
      const engine = new PondEngine({ ...init(), floor, light, sprites: [a, b], worker: false }, receive);
      sendRef.current = m => engine.handleMessage(m);
      stop = () => engine.stop();
    };
    if (canDrawInWorker()) {
      const offscreen = makeCanvases().map(c => c.transferControlToOffscreen());
      const worker = new Worker(new URL('../lib/pondWorker.ts', import.meta.url), { type: 'module' });
      let heard = false;
      worker.onmessage = (e: MessageEvent<FromPond>) => { heard = true; receive(e.data); };
      worker.onerror = () => {
        if (heard) return;
        worker.terminate();
        for (const c of canvases) c.remove();
        runHere();
      };
      worker.postMessage(
        { type: 'init', ...init(), floor: offscreen[0], light: offscreen[1], sprites: [offscreen[2], offscreen[3]], worker: true },
        offscreen,
      );
      sendRef.current = m => worker.postMessage(m);
      stop = () => worker.terminate();
    } else {
      runHere();
    }
    const send = (m: ToPond) => sendRef.current?.(m);

    let live = true;
    const remeasure = () => { if (live) send({ type: 'zones', zones: heroZones(px) }); };
    document.fonts?.ready.then(remeasure);
    const settleTimer = window.setTimeout(remeasure, HERO_SETTLE_MS);

    let viewQueued = 0;
    const sendView = () => {
      viewQueued = 0;
      send({ type: 'view', scrollY: window.scrollY, viewW: window.innerWidth, viewH: window.innerHeight });
    };
    const handleScroll = () => { if (!viewQueued) viewQueued = requestAnimationFrame(sendView); };

    let resizeTimer = 0;
    const handleResize = () => {
      handleScroll();
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        const next = worldSize();
        send({ type: 'world', w: next.w, h: next.h, zones: heroZones(px) });
      }, RESIZE_SETTLE_MS);
    };
    const observer = new ResizeObserver(handleResize);
    observer.observe(document.body);
    const handleVisibility = () => send({ type: 'visible', visible: document.visibilityState === 'visible' });

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleResize);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      live = false;
      stop();
      for (const c of canvases) c.remove();
      cancelAnimationFrame(viewQueued);
      window.clearTimeout(resizeTimer);
      window.clearTimeout(settleTimer);
      observer.disconnect();
      sendRef.current = null;
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [px]);

  return (
    <div ref={layerRef} className="absolute inset-0 z-0 overflow-hidden pointer-events-none" aria-hidden="true">
      {/* The top of the screen is further from the camera: a little haze over the far water. */}
      <div className="fixed inset-0 bg-gradient-to-b from-[#0b1a14]/45 via-[#0b1a14]/10 to-transparent" />
    </div>
  );
};

export default React.memo(PondWater);
