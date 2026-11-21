import React, { useEffect, useRef } from 'react';
import { Clear, HotpotScene, buildScene } from '../lib/hotpot';
import { dragTo, foodAt, grabAt, pluckNow, pourIn, pressAt, releaseDrag, rollingBoil } from '../lib/hotpotLife';
import { HotpotDebugActions } from './HotpotDebugPanel';
import { HotpotView } from '../lib/hotpotView';
import { startEvent } from '../lib/hotpotEvents';
import { dipInto } from '../lib/hotpotSauce';
import { usePerformance, PerformanceTier } from '../contexts/PerformanceContext';

// Screen pixels per art pixel; phones get a finer grid so the ingredients keep their detail.
const PIXEL_SIZE: Record<PerformanceTier, number> = { high: 4, medium: 5, low: 6 };
const pixelFor = (tier: PerformanceTier, w: number) => (w < 640 ? Math.max(3, PIXEL_SIZE[tier] - 1) : PIXEL_SIZE[tier]);
/** How far the camera leans with the pointer, in CSS pixels at the broth's surface. */
const LEAN = 28;
const REBUILD_MS = 250;

interface HotpotBrothProps {
  onReady: () => void;
  /** Whether the sauce bar is pulled out. */
  sauceOpen?: boolean;
  /** Filled in with what the debug panel can do. */
  debug?: React.MutableRefObject<HotpotDebugActions | null>;
}

/** The hero's text, in page coordinates, for the ingredients to keep off. */
const heroClear = (): Clear[] => {
  const out: Clear[] = [];
  for (const el of document.querySelectorAll('#home > *')) {
    const r = el.getBoundingClientRect();
    out.push({ x: r.left, y: r.top + window.scrollY, w: r.width, h: r.height });
  }
  return out;
};

/**
 * The hot pot behind the content: a 3D scene drawn as pixel art (see
 * lib/hotpotView.ts) on one fixed canvas the size of the window. The camera
 * looks straight down and follows the page's scroll, snapped to whole art
 * pixels, so the broth's surface scrolls exactly with the content and
 * anything lifted out of it comes up towards the viewer.
 */
const HotpotBroth: React.FC<HotpotBrothProps> = ({ onReady, debug, sauceOpen = false }) => {
  const sauceRef = useRef(sauceOpen);
  sauceRef.current = sauceOpen;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { tier, reducedMotion, frameRate } = usePerformance();
  const settings = useRef({ tier, reducedMotion, frameRate });
  settings.current = { tier, reducedMotion, frameRate };
  const readyRef = useRef(onReady);
  readyRef.current = onReady;
  const debugRef = useRef(debug);
  debugRef.current = debug;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let view: HotpotView;
    try {
      view = new HotpotView(canvas, pixelFor(settings.current.tier, window.innerWidth));
    } catch (err) {
      if (import.meta.env.DEV) console.error(err);
      readyRef.current();
      return;
    }
    let built = { w: 0, h: 0, page: 0 };
    let hasScene = false;
    // The scene takes a moment to build, so it's built in a worker where possible.
    let worker: Worker | null = null;
    try {
      worker = new Worker(new URL('../lib/hotpotWorker.ts', import.meta.url), { type: 'module' });
    } catch {
      worker = null;
    }
    let buildId = 0;
    if (worker) {
      worker.onmessage = (e: MessageEvent<{ id: number; scene: HotpotScene }>) => {
        if (e.data.id !== buildId) return;
        view.setScene(e.data.scene);
        hasScene = true;
      };
    }
    const build = () => {
      const w = window.innerWidth, h = window.innerHeight;
      const page = Math.max(document.documentElement.scrollHeight, h);
      const clear = heroClear();
      built = { w, h, page };
      if (worker) worker.postMessage({ id: ++buildId, w, h, page, clear });
      else { view.setScene(buildScene(w, h, page, clear)); hasScene = true; }
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
    // Food under the cursor (not under a card or a control) can be clicked to send the chopsticks for it.
    const OVER_UI = 'a, button, input, textarea, select, label, header, .content-card, .project-card, [data-reef-ui], [role="dialog"]';
    const overBroth = (e: MouseEvent) => !(e.target as Element | null)?.closest?.(OVER_UI);
    let showingFood = false;
    let pinchTimer = 0;
    const onHover = (e: PointerEvent) => {
      const food = !!view.scene && overBroth(e) && !!foodAt(view.scene, e.clientX, e.clientY + window.scrollY);
      if (food !== showingFood) { showingFood = food; document.documentElement.toggleAttribute('data-hotpot-food', food); }
    };
    // With a mouse: press on food and the chopsticks take it; hold and drag to carry it, let go to drop it.
    const onDown = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse' || e.button !== 0 || !view.scene || !overBroth(e)) return;
      if (!pressAt(view.scene, e.clientX, e.clientY + window.scrollY)) return;
      e.preventDefault();
      clearTimeout(pinchTimer);
      document.documentElement.setAttribute('data-hotpot-pinch', '');
    };
    const onUp = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse' || !view.scene?.life.drag) return;
      // Let go over a sauce bowl and it's dunked; anywhere else it drops back in.
      const sx = e.clientX, sy = e.clientY;
      releaseDrag(view.scene, (it, p) => dipInto(view.scene!, camNow(), sx, sy, it, p));
      pinchTimer = window.setTimeout(() => document.documentElement.removeAttribute('data-hotpot-pinch'), 150);
    };
    window.addEventListener('pointerdown', onDown);
    window.addEventListener('pointerup', onUp);
    // Touch: a tap sends the chopsticks for it.
    const onClick = (e: MouseEvent) => {
      if ((e as PointerEvent).pointerType === 'mouse' || !view.scene || !overBroth(e)) return;
      // The cursor's chopsticks pinch shut as the real ones go for it.
      if (grabAt(view.scene, e.clientX, e.clientY + window.scrollY)) {
        document.documentElement.setAttribute('data-hotpot-pinch', '');
        clearTimeout(pinchTimer);
        pinchTimer = window.setTimeout(() => document.documentElement.removeAttribute('data-hotpot-pinch'), 350);
      }
    };
    window.addEventListener('pointermove', onHover, { passive: true });
    window.addEventListener('click', onClick);
    document.documentElement.addEventListener('mouseleave', onLeave);

    let raf = 0;
    let last = performance.now();
    let lastDraw = 0;
    let time = 20;
    let speed = 1;
    const camNow = () => ({ viewW: window.innerWidth, viewH: window.innerHeight, scrollY: window.scrollY, offX: lean.x, offY: lean.y });
    if (debugRef.current) {
      debugRef.current.current = {
        pour: () => { if (view.scene) pourIn(view.scene, camNow()); },
        pluck: () => { if (view.scene) pluckNow(view.scene, camNow()); },
        boil: () => { if (view.scene) rollingBoil(view.scene); },
        ladle: () => { if (view.scene) startEvent(view.scene, 'ladle', camNow()); },
        egg: () => { if (view.scene) startEvent(view.scene, 'egg', camNow()); },
        erupt: () => { if (view.scene) startEvent(view.scene, 'erupt', camNow()); },
        strainer: () => { if (view.scene) startEvent(view.scene, 'strainer', camNow()); },
        setSpeed: s => { speed = s; },
      };
    }
    let first = true;
    let shownSize = '';
    let shownShift = NaN;
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      if (!hasScene) return;
      const { tier: t, reducedMotion: still, frameRate: fps } = settings.current;
      if (now - lastDraw < 1000 / fps - 2) return;
      const dt = Math.min(0.1, (now - last) / 1000) * speed;
      last = now;
      lastDraw = now;
      if (!still) time += dt;
      const w = window.innerWidth, h = window.innerHeight;
      const px = pixelFor(t, w);
      const { w: aw, h: ah } = view.resize(w, h, px);
      // The costlier finishing touches drop away on the slower tiers.
      view.quality = t === 'high' ? 2 : t === 'medium' ? 1 : 0;
      if (view.scene) view.scene.life.bubbleRate = t === 'high' ? 1 : t === 'medium' ? 0.7 : 0.4;
      // Style writes only when something changed, so the page isn't restyled every frame.
      const size = `${aw * px}x${ah * px}`;
      if (size !== shownSize) { shownSize = size; canvas.style.width = `${aw * px}px`; canvas.style.height = `${ah * px}px`; }
      const ease = still ? 1 : 1 - Math.exp(-dt * 3);
      lean.x += (lean.tx - lean.x) * ease;
      lean.y += (lean.ty - lean.y) * ease;
      const scroll = window.scrollY;
      const snapped = Math.floor(scroll / px) * px;
      if (snapped - scroll !== shownShift) { shownShift = snapped - scroll; canvas.style.transform = `translate3d(0, ${shownShift}px, 0)`; }
      if (view.scene) view.scene.sauce.target = sauceRef.current ? 1 : 0;
      // Whatever is being carried follows the mouse, scrolling included.
      if (pointer && view.scene?.life.drag) dragTo(view.scene, pointer.x, pointer.y + window.scrollY);
      view.draw({ viewW: w, viewH: h, scrollY: snapped, offX: lean.x, offY: lean.y, time, dt: still ? 0 : dt, pointer });
      if (first) { first = false; readyRef.current(); }
    };
    const onVisibility = () => {
      cancelAnimationFrame(raf);
      if (!document.hidden) { last = performance.now(); raf = requestAnimationFrame(frame); }
    };
    document.addEventListener('visibilitychange', onVisibility);
    raf = requestAnimationFrame(frame);
    if (import.meta.env.DEV) (window as unknown as { __hotpot: unknown }).__hotpot = { view, build, setSpeed: (s: number) => { speed = s; }, event: (k: 'ladle' | 'egg' | 'erupt' | 'strainer') => view.scene && startEvent(view.scene, k, camNow()) };

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(rebuildTimer);
      observer.disconnect();
      window.removeEventListener('resize', maybeRebuild);
      window.removeEventListener('pointermove', onPointer);
      window.removeEventListener('pointermove', onHover);
      window.removeEventListener('click', onClick);
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerup', onUp);
      document.documentElement.removeAttribute('data-hotpot-food');
      document.documentElement.removeAttribute('data-hotpot-pinch');
      clearTimeout(pinchTimer);
      document.documentElement.removeEventListener('mouseleave', onLeave);
      document.removeEventListener('visibilitychange', onVisibility);
      worker?.terminate();
      view.dispose();
      if (debugRef.current) debugRef.current.current = null;
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="hotpot-broth fixed left-0 top-0 pointer-events-none"
      style={{ zIndex: 0, imageRendering: 'pixelated' }}
    />
  );
};

export default HotpotBroth;
