import React, { useEffect, useRef, useState } from 'react';
import { Creature, Mood, PixelOcean as Ocean, OceanStats, SPECIES, Species, TICKS_PER_SECOND } from '../lib/pixelOcean';
import PixelMeter from './PixelMeter';
import { OceanView } from '../lib/pixelOceanView';
import { usePerformance, PerformanceTier } from '../contexts/PerformanceContext';

// Screen pixels per art pixel. Bigger pixels mean a smaller world to simulate.
const PIXEL_SIZE: Record<PerformanceTier, number> = { high: 4, medium: 5, low: 6 };
const TICK_MS = 1000 / TICKS_PER_SECOND;
const STATS_INTERVAL_MS = 500;
// Food is dropped near the surface so it visibly sinks to the floor.
const DROP_HEIGHT = 90;
// Fish shy away from the cursor at roughly their own swimming height.
const POINTER_HEIGHT = 25;
const INSPECT_INTERVAL_MS = 100;
// Only a cursor moving at least this far between events startles fish, so a
// gentle hover can inspect one without chasing it off.
const STARTLE_DISTANCE = 10;

const MOOD_LABEL: Record<Mood, string> = {
  cruising: 'Cruising',
  schooling: 'Schooling',
  foraging: 'Looking for food',
  grazing: 'Grazing algae',
  fleeing: 'Fleeing!',
  hiding: 'Hiding in the kelp',
  hunting: 'Hunting',
  scavenging: 'Scavenging',
  drifting: 'Drifting',
};

interface Inspected {
  name: string;
  species: Species;
  mood: Mood;
  energy: number;
  hungry: boolean;
  age: number;
  pinned: boolean;
}

const formatAge = (ticks: number) => {
  const seconds = Math.floor(ticks / TICKS_PER_SECOND);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
};

interface PixelOceanProps {
  isFoodMode: boolean;
  onStats: (stats: OceanStats) => void;
}

/** The reef behind the content: as tall as the page and scrolled with it. */
const PixelOcean: React.FC<PixelOceanProps> = ({ isFoodMode, onStats }) => {
  const floorRef = useRef<HTMLCanvasElement>(null);
  const spriteRef = useRef<HTMLCanvasElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const [inspected, setInspected] = useState<Inspected | null>(null);
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
    let lastInspect = 0;
    let hovered: Creature | null = null;
    let pinned: Creature | null = null;
    let shown = false;

    // Follows the inspected fish every frame; refreshes its details less often.
    const inspect = (now: number) => {
      if (pinned && !pinned.alive) pinned = null;
      const target = pinned ?? (hovered?.alive ? hovered : null);
      view.highlighted = target;
      const tip = tipRef.current;
      if (target && tip) {
        const p = view.clientPosition(target);
        tip.style.transform = `translate(${Math.round(p.x + 24)}px, ${Math.round(p.y - 20)}px)`;
      }
      if (!target) {
        if (shown) { shown = false; setInspected(null); }
        return;
      }
      if (now - lastInspect < INSPECT_INTERVAL_MS && shown) return;
      lastInspect = now;
      shown = true;
      setInspected({
        name: target.name,
        species: target.species,
        mood: target.mood,
        energy: target.energy,
        hungry: target.hungry,
        age: target.age,
        pinned: target === pinned,
      });
    };

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
        inspect(now);
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

    let lastPointer = { x: 0, y: 0 };
    const handlePointerMove = (e: PointerEvent) => {
      const moved = Math.hypot(e.clientX - lastPointer.x, e.clientY - lastPointer.y);
      lastPointer = { x: e.clientX, y: e.clientY };
      if (moved >= STARTLE_DISTANCE) {
        const p = view.screenToWorld(e.clientX, e.clientY, POINTER_HEIGHT);
        ocean.setPointer(p.x, p.z);
      } else {
        ocean.clearPointer();
      }
      hovered = e.pointerType === 'mouse' ? view.pick(e.clientX, e.clientY) : null;
    };
    const handlePointerLeave = () => ocean.clearPointer();
    const handlePointerDown = (e: PointerEvent) => {
      if ((e.target as Element | null)?.closest('button, a, input, textarea, select, [role="dialog"]')) return;
      if (isFoodModeRef.current) {
        const p = view.screenToWorld(e.clientX, e.clientY, DROP_HEIGHT);
        ocean.dropFood(p.x, p.z, DROP_HEIGHT);
        return;
      }
      // Clicking (or tapping) a fish keeps it under inspection; elsewhere lets go.
      pinned = view.pick(e.clientX, e.clientY, 32);
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
    <>
    <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none" aria-hidden="true">
      <canvas ref={floorRef} className="absolute left-0 top-0 block" style={{ imageRendering: 'pixelated' }} />
      <canvas ref={spriteRef} className="absolute left-0 top-0 block" />
      {/* The top of the screen is further from the camera: fade it into the deep. */}
      <div className="fixed inset-0 bg-gradient-to-b from-[#050d14]/60 via-[#050d14]/15 to-transparent" />
    </div>
    <div ref={tipRef} className={`px-tooltip ${inspected ? '' : 'hidden'}`} aria-live="polite">
      {inspected && (
        <>
          <div className="px-tooltip-name">{inspected.name}</div>
          <div className="px-tooltip-kind">{SPECIES[inspected.species].label} · age {formatAge(inspected.age)}</div>
          <div className="px-tooltip-row">
            <span>Energy</span>
            <PixelMeter value={inspected.energy} color={inspected.energy < 0.25 ? '#ff6b6b' : '#7bd88f'} />
          </div>
          <div className="px-tooltip-mood">
            {inspected.energy < 0.15 ? 'Starving' : MOOD_LABEL[inspected.mood]}
            {inspected.hungry && inspected.mood !== 'foraging' && inspected.mood !== 'grazing' && inspected.energy >= 0.15 ? ' · hungry' : ''}
          </div>
          {inspected.pinned && <div className="px-tooltip-hint">Following · click away to release</div>}
        </>
      )}
    </div>
    </>
  );
};

export default React.memo(PixelOcean);
