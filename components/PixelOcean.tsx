import React, { useEffect, useRef, useState } from 'react';
import { Mood, OceanStats, SPECIES, TICKS_PER_SECOND } from '../lib/pixelOcean';
import { Adoption, displayName, loadAdoption, saveAdoption } from '../lib/adoption';
import PixelMeter from './PixelMeter';
import ReefDebugPanel, { ReefDebugActions } from './ReefDebugPanel';
import { ReefLayout } from '../lib/pixelOceanView';
import { EngineInit, FromEngine, Inspected, ReefEngine, ToEngine } from '../lib/reefEngine';
import { usePerformance, PerformanceTier } from '../contexts/PerformanceContext';

// Screen pixels per art pixel. Bigger pixels mean a smaller world to simulate.
const PIXEL_SIZE: Record<PerformanceTier, number> = { high: 4, medium: 5, low: 6 };
const NOTICE_MS = 7000;
const MAX_NAME_LENGTH = 16;
// Breathing room kept clear around the hero text, in page pixels.
const HERO_CLEARANCE = 24;
// Longer than the sections' 0.8s fade-and-slide-in.
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
  clinging: 'Clinging to the kelp',
  carrying: 'Carrying eggs',
  camouflaged: 'Camouflaged',
  inking: 'Escaping in a cloud of ink',
  lurking: 'Lurking',
  striking: 'Striking!',
  puffed: 'Puffed up',
  gliding: 'Gliding',
  tracking: 'Following a scent of blood',
  balling: 'Packed into a bait ball',
  herding: 'Herding a bait ball',
  diving: 'Diving through the ball',
  leaving: 'Heading out to sea',
  courting: 'Courting',
  queueing: 'Queueing to be cleaned',
  cleaning: 'Being cleaned',
  hypnotising: 'Hypnotising its prey',
  mesmerised: 'Mesmerised',
  eating: 'Eating',
  nestled: 'Nestled in its anemone',
  crunching: 'Crunching coral',
  sleeping: 'Asleep in its mucus bubble',
  swaying: 'Swaying in the current',
  ducking: 'Ducked into its burrow',
  flaring: 'Fanning out its fins',
  swapping: 'Swapping shells',
};

/** What the adopt bar can ask the running reef to do. */
interface ReefActions {
  adopt: (name: string) => void;
  find: () => void;
  letGo: () => void;
}

const formatAge = (ticks: number) => {
  const seconds = Math.floor(ticks / TICKS_PER_SECOND);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
};

/** "Juno #170" -> "Juno": a sensible default name to adopt under. */
const baseName = (name: string) => name.replace(/\s+#\d+$/, '');

interface PixelOceanProps {
  isFoodMode: boolean;
  onStats: (stats: OceanStats) => void;
}

/**
 * The reef behind the content: as tall as the page and scrolled with it.
 * The reef itself runs in a worker (see lib/reefEngine.ts) wherever the
 * browser can draw from one, so it never holds up scrolling; this component
 * places its canvases, passes on the scroll, the pointer and the visitor's
 * actions, and shows what comes back.
 */
const PixelOcean: React.FC<PixelOceanProps> = ({ isFoodMode, onStats }) => {
  const layerRef = useRef<HTMLDivElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const sendRef = useRef<((m: ToEngine) => void) | null>(null);
  const actionsRef = useRef<ReefActions | null>(null);
  const debugRef = useRef<ReefDebugActions | null>(null);
  const [inspected, setInspected] = useState<Inspected | null>(null);
  const [adoption, setAdoption] = useState<Adoption | null>(() => loadAdoption());
  const [notice, setNotice] = useState<string | null>(null);
  const [draftName, setDraftName] = useState('');
  const isFoodModeRef = useRef(isFoodMode);
  isFoodModeRef.current = isFoodMode;
  const onStatsRef = useRef(onStats);
  onStatsRef.current = onStats;

  const { tier, reducedMotion, override, frameRate } = usePerformance();
  // The pixel size is settled once, when the reef first appears: changing it
  // rebuilds the whole world, which looks like a sudden zoom. Live frame-rate
  // sampling can lower the tier a few seconds in, so only a tier picked by
  // hand in the performance panel changes it afterwards.
  const [startingPx] = useState(() => PIXEL_SIZE[reducedMotion ? 'low' : tier]);
  const px = override ? PIXEL_SIZE[override] : startingPx;
  const frameMsRef = useRef(1000 / frameRate);
  frameMsRef.current = 1000 / frameRate;
  useEffect(() => { sendRef.current?.({ type: 'frameMs', ms: 1000 / frameRate }); }, [frameRate]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), NOTICE_MS);
    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    const layer = layerRef.current;
    if (!layer) return;

    const worldSize = () => ({
      w: Math.ceil(window.innerWidth / px),
      h: Math.max(Math.ceil(window.innerHeight / px), Math.ceil(document.documentElement.scrollHeight / px)),
    });

    // Where the inspected creature is on the page, kept up with the scroll here.
    let tipAt: { x: number; y: number } | null = null;
    const placeTip = () => {
      const tip = tipRef.current;
      if (tip && tipAt) tip.style.transform = `translate(${Math.round(tipAt.x + 24)}px, ${Math.round(tipAt.y - window.scrollY - 20)}px)`;
    };

    // Fresh canvases each time: one handed to a worker can't be taken back.
    let canvases: HTMLCanvasElement[] = [];
    const makeCanvases = () => {
      const fade = layer.lastElementChild;
      canvases = ['floor', 'light', 'sprites', 'sprites'].map(kind => {
        const c = document.createElement('canvas');
        c.className = 'absolute left-0 top-0 block';
        c.style.imageRendering = 'pixelated';
        // Caustic light, added onto the seabed by the browser.
        if (kind === 'light') c.style.mixBlendMode = 'plus-lighter';
        // Each sprite canvas waits to be shown until the reef has drawn on it.
        if (kind === 'sprites') c.style.visibility = 'hidden';
        layer.insertBefore(c, fade);
        return c;
      });
      return canvases;
    };

    const applyLayout = (layout: ReefLayout) => {
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

    const receive = (m: FromEngine) => {
      switch (m.type) {
        case 'layout': applyLayout(m.layout); break;
        case 'tip': tipAt = m.at; placeTip(); break;
        case 'inspected': setInspected(m.inspected); break;
        case 'stats': onStatsRef.current(m.stats); break;
        case 'adoption':
          saveAdoption(m.adoption);
          setAdoption(m.adoption);
          if (m.notice) setNotice(m.notice);
          break;
        case 'scrollTo': window.scrollTo({ top: m.y - window.innerHeight / 2, behavior: 'smooth' }); break;
      }
    };

    const size = worldSize();
    const init = (): Omit<EngineInit, 'floor' | 'light' | 'sprites' | 'worker'> => ({
      px, w: size.w, h: size.h,
      scrollY: window.scrollY, viewW: window.innerWidth, viewH: window.innerHeight,
      frameMs: frameMsRef.current, zones: heroZones(px), adoption: loadAdoption(),
    });

    let stop = () => {};
    // Runs the reef on the main thread: for browsers that can't draw from a worker.
    const runHere = () => {
      const [floor, light, a, b] = makeCanvases();
      const engine = new ReefEngine({ ...init(), floor, light, sprites: [a, b], worker: false }, receive);
      sendRef.current = m => engine.handleMessage(m);
      stop = () => engine.stop();
    };
    if (canDrawInWorker()) {
      const offscreen = makeCanvases().map(c => c.transferControlToOffscreen());
      const worker = new Worker(new URL('../lib/reefWorker.ts', import.meta.url), { type: 'module' });
      let heard = false;
      worker.onmessage = (e: MessageEvent<FromEngine>) => { heard = true; receive(e.data); };
      // If the worker can't start at all, fall back to running the reef here.
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
    const send = (m: ToEngine) => sendRef.current?.(m);

    // The hero can still move after this: its web fonts load and it slides in
    // as it fades up. Measure it again once both have settled.
    let live = true;
    const remeasure = () => { if (live) send({ type: 'zones', zones: heroZones(px) }); };
    document.fonts?.ready.then(remeasure);
    const settleTimer = window.setTimeout(remeasure, HERO_SETTLE_MS);

    actionsRef.current = {
      adopt: name => send({ type: 'adopt', name }),
      find: () => send({ type: 'find' }),
      letGo: () => send({ type: 'letGo' }),
    };
    debugRef.current = {
      spawn: species => send({ type: 'debug', action: 'spawn', species }),
      whale: () => send({ type: 'debug', action: 'whale' }),
      pod: () => send({ type: 'debug', action: 'pod' }),
      scent: () => send({ type: 'debug', action: 'scent' }),
      parasites: () => send({ type: 'debug', action: 'parasites' }),
      spawning: () => send({ type: 'debug', action: 'spawning' }),
      baitBall: () => send({ type: 'debug', action: 'baitBall' }),
      shell: () => send({ type: 'debug', action: 'shell' }),
      setSpeed: speed => send({ type: 'debug', action: 'speed', speed }),
    };

    // The scroll position goes over once a frame at most.
    let viewQueued = 0;
    const sendView = () => {
      viewQueued = 0;
      send({ type: 'view', scrollY: window.scrollY, viewW: window.innerWidth, viewH: window.innerHeight });
      placeTip();
    };
    const handleScroll = () => { if (!viewQueued) viewQueued = requestAnimationFrame(sendView); };

    // The world is as tall as the page, so follow the content's height too.
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

    const handlePointerMove = (e: PointerEvent) =>
      send({ type: 'pointer', x: e.clientX, y: e.clientY + window.scrollY, mouse: e.pointerType === 'mouse' });
    const handlePointerLeave = () => send({ type: 'pointerLeave' });
    const handlePointerDown = (e: PointerEvent) => {
      if ((e.target as Element | null)?.closest('button, a, input, textarea, select, [role="dialog"], [data-reef-ui]')) return;
      send({ type: 'click', x: e.clientX, y: e.clientY + window.scrollY, food: isFoodModeRef.current });
    };
    const handleVisibility = () => send({ type: 'visible', visible: document.visibilityState === 'visible' });

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleResize);
    window.addEventListener('pointermove', handlePointerMove);
    document.documentElement.addEventListener('pointerleave', handlePointerLeave);
    window.addEventListener('pointerdown', handlePointerDown);
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
      actionsRef.current = null;
      debugRef.current = null;
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('pointermove', handlePointerMove);
      document.documentElement.removeEventListener('pointerleave', handlePointerLeave);
      window.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [px]);

  // Offer the followed creature's own name when a new one is picked.
  const followedName = inspected?.pinned && !inspected.adopted ? inspected.name : null;
  useEffect(() => {
    if (followedName) setDraftName(baseName(followedName));
  }, [followedName]);

  const submitAdoption = (e: React.FormEvent) => {
    e.preventDefault();
    const name = draftName.trim().slice(0, MAX_NAME_LENGTH);
    if (name) actionsRef.current?.adopt(name);
  };

  // The canvases (added by the effect) sit in the page, not fixed, so native
  // scrolling moves them between frames; the clip keeps them from ever
  // stretching the page.
  return (
    <>
      <div ref={layerRef} className="absolute inset-0 z-0 overflow-hidden pointer-events-none" aria-hidden="true">
        {/* The top of the screen is further from the camera: fade it into the deep. */}
        <div className="fixed inset-0 bg-gradient-to-b from-[#050d14]/60 via-[#050d14]/15 to-transparent" />
      </div>
      <div ref={tipRef} className={`px-tooltip ${inspected ? '' : 'hidden'}`} aria-live="polite">
        {inspected && (
          <>
            <div className="px-tooltip-name">{inspected.adopted ? '★ ' : ''}{inspected.name}</div>
            <div className="px-tooltip-kind">{SPECIES[inspected.species].label} · age {formatAge(inspected.age)}</div>
            <div className="px-tooltip-row">
              <span>Energy</span>
              <PixelMeter value={inspected.energy} color={inspected.energy < 0.25 ? '#ff7a63' : '#7fd18b'} />
            </div>
            <div className="px-tooltip-mood">
              {inspected.energy < 0.15 ? 'Starving' : MOOD_LABEL[inspected.mood]}
              {inspected.hungry && inspected.mood !== 'foraging' && inspected.mood !== 'grazing' && inspected.energy >= 0.15 ? ' · hungry' : ''}
            </div>
            {inspected.pinned && <div className="px-tooltip-hint">Following · click away to release</div>}
          </>
        )}
      </div>

      <ReefDebugPanel actions={debugRef} />
      {(followedName || adoption || notice) && (
        <div className="adopt-bar" data-reef-ui role="region" aria-label="Your creature">
          {notice && <p className="adopt-notice" role="status">{notice}</p>}
          {followedName && inspected ? (
            <form className="adopt-row" onSubmit={submitAdoption}>
              <span className="adopt-label">Adopt this {SPECIES[inspected.species].label.toLowerCase()}?</span>
              <input
                className="adopt-input"
                value={draftName}
                maxLength={MAX_NAME_LENGTH}
                onChange={e => setDraftName(e.target.value)}
                aria-label="Name your creature"
              />
              <button type="submit" className="adopt-button">Adopt</button>
            </form>
          ) : adoption && (
            <div className="adopt-row">
              <span className="adopt-label">
                <span className="adopt-star" aria-hidden="true">★</span>
                {displayName(adoption)} · {SPECIES[adoption.species].label}
                {adoption.generation > 1 && ` · generation ${adoption.generation}`}
              </span>
              <button type="button" className="adopt-button" onClick={() => actionsRef.current?.find()}>Find</button>
              <button type="button" className="adopt-link" onClick={() => actionsRef.current?.letGo()}>Let go</button>
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default React.memo(PixelOcean);
