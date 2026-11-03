import React, { useEffect, useRef, useState } from 'react';
import { FrogStage, POND_SPECIES, PondMood, PondStats, TICKS_PER_SECOND } from '../lib/pond';
import { PondLayout } from '../lib/pondView';
import { FromPond, PondAdoption, PondEngine, PondEngineInit, PondInspected, ToPond } from '../lib/pondEngine';
import { POND_ADOPTION_KEY, displayName, loadAdoption, saveAdoption } from '../lib/adoption';
import PixelMeter from './PixelMeter';
import PondDebugPanel, { PondDebugActions } from './PondDebugPanel';
import { usePerformance, PerformanceTier } from '../contexts/PerformanceContext';

// Screen pixels per art pixel, as on the reef.
const PIXEL_SIZE: Record<PerformanceTier, number> = { high: 4, medium: 5, low: 6 };
const NOTICE_MS = 7000;
const MAX_NAME_LENGTH = 16;
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

const MOOD_LABEL: Record<PondMood, string> = {
  sitting: 'Sitting tight', croaking: 'Croaking', catching: 'Catching a fly', leaping: 'Leaping!', swimming: 'Swimming',
  floating: 'Floating, eyes up', climbing: 'Climbing out', fleeing: 'Fleeing!', diving: 'Diving', singing: 'Singing in the chorus',
  calling: 'Calling for a mate', clasping: 'Clasping his mate', laying: 'Laying spawn', developing: 'Developing',
  wriggling: 'Wriggling', schooling: 'Schooling', grazing: 'Grazing algae', emerging: 'Heading for dry land',
  paddling: 'Paddling', dabbling: 'Dabbling, tail up', preening: 'Preening', quacking: 'Quacking', takingOff: 'Taking off',
  flying: 'Flying', landing: 'Coming in to land', nesting: 'Sitting on her eggs', following: 'Following in line', walking: 'Waddling',
  cruising: 'Cruising', rising: 'Rising for a fly', rooting: 'Rooting in the mud', lurking: 'Lurking in the weeds', striking: 'Striking!',
  resting: 'Resting after a meal', hovering: 'Hovering', darting: 'Darting', skating: 'Skating', creeping: 'Creeping',
  basking: 'Basking in the sun', stalking: 'Stalking the shallows', leaving: 'Leaving',
  spinning: 'Spinning in circles', perched: 'Perched, watching', fluttering: 'Fluttering', feeding: 'Sipping nectar',
  pecking: 'Picking over a lily pad', surfacing: 'Coming up for air', sinking: 'Sinking back down', skimming: 'Skimming for a sip',
  gnawing: 'Gnawing off a branch', towing: 'Hauling timber home', building: 'Working on the dam', slapping: 'Tail slap!', grooming: 'Grooming on the lodge',
};
const STAGE_LABEL: Record<FrogStage, string> = {
  spawn: 'Frogspawn', tadpole: 'Tadpole', backLegs: 'Tadpole, back legs', fourLegs: 'Tadpole, four legs', froglet: 'Froglet', adult: 'Frog',
};
const LAYER_LABEL: Record<string, string> = { bed: 'on the bed', under: 'underwater', surface: 'at the surface', air: 'out of the water' };

interface PondActions {
  adopt: (name: string) => void;
  find: () => void;
  letGo: () => void;
}

const formatAge = (ticks: number) => {
  const seconds = Math.floor(ticks / TICKS_PER_SECOND);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
};

const baseName = (name: string) => name.replace(/\s+#\d+$/, '');
const kindLabel = (i: PondInspected) => (i.stage ? STAGE_LABEL[i.stage as FrogStage] : POND_SPECIES[i.species].label);

interface PondWaterProps {
  onStats: (stats: PondStats) => void;
}

/**
 * The pond behind the content: as tall as the page and scrolled with it.
 * Like the reef (see PixelOcean.tsx), the pond runs in a worker wherever the
 * browser can draw from one; this component only places its canvases, passes
 * on the scroll, the pointer and the visitor's actions, and shows what comes back.
 */
const PondWater: React.FC<PondWaterProps> = ({ onStats }) => {
  const layerRef = useRef<HTMLDivElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const sendRef = useRef<((m: ToPond) => void) | null>(null);
  const actionsRef = useRef<PondActions | null>(null);
  const debugRef = useRef<PondDebugActions | null>(null);
  const [inspected, setInspected] = useState<PondInspected | null>(null);
  const [adoption, setAdoption] = useState<PondAdoption | null>(() => loadAdoption(POND_ADOPTION_KEY));
  const [notice, setNotice] = useState<string | null>(null);
  const [draftName, setDraftName] = useState('');
  const onStatsRef = useRef(onStats);
  onStatsRef.current = onStats;

  const { tier, reducedMotion, override, frameRate } = usePerformance();
  // Settled once, as on the reef: changing it rebuilds the whole world.
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
        case 'tip': tipAt = m.at; placeTip(); break;
        case 'inspected': setInspected(m.inspected); break;
        case 'stats': onStatsRef.current(m.stats); break;
        case 'adoption':
          saveAdoption(m.adoption, POND_ADOPTION_KEY);
          setAdoption(m.adoption);
          if (m.notice) setNotice(m.notice);
          break;
        case 'scrollTo': window.scrollTo({ top: m.y - window.innerHeight / 2, behavior: 'smooth' }); break;
      }
    };

    const size = worldSize();
    const init = (): Omit<PondEngineInit, 'floor' | 'light' | 'sprites' | 'worker'> => ({
      px, w: size.w, h: size.h,
      scrollY: window.scrollY, viewW: window.innerWidth, viewH: window.innerHeight,
      frameMs: frameMsRef.current, zones: heroZones(px), adoption: loadAdoption(POND_ADOPTION_KEY),
    });

    let stop = () => {};
    // In development, `?pond-main` runs the pond here instead, where tests
    // and benchmarks can reach it as window.__pond.
    const debugHere = import.meta.env.DEV && new URLSearchParams(window.location.search).has('pond-main');
    const runHere = () => {
      const [floor, light, a, b] = makeCanvases();
      const engine = new PondEngine({ ...init(), floor, light, sprites: [a, b], worker: false }, receive);
      sendRef.current = m => engine.handleMessage(m);
      stop = () => engine.stop();
      if (debugHere) (window as unknown as { __pond?: PondEngine }).__pond = engine;
    };
    if (canDrawInWorker() && !debugHere) {
      const offscreen = makeCanvases().map(c => c.transferControlToOffscreen());
      const worker = new Worker(new URL('../lib/pondWorker.ts', import.meta.url), { type: 'module' });
      let heard = false;
      worker.onmessage = (e: MessageEvent<FromPond>) => { heard = true; receive(e.data); };
      // If the worker can't start at all, fall back to running the pond here.
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

    // The hero can still move after this (web fonts, its slide-in): measure it again once settled.
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
      spawn: kind => send({ type: 'debug', action: 'spawn', kind }),
      happening: kind => send({ type: 'debug', action: 'happening', kind }),
      heronOver: () => send({ type: 'debug', action: 'heronOver' }),
      heronLands: () => send({ type: 'debug', action: 'heronLands' }),
      setSpeed: speed => send({ type: 'debug', action: 'speed', speed }),
    };

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
      send({ type: 'click', x: e.clientX, y: e.clientY + window.scrollY });
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

  return (
    <>
      <div ref={layerRef} className="absolute inset-0 z-0 overflow-hidden pointer-events-none" aria-hidden="true">
        {/* The top of the screen is further from the camera: a little haze over the far water. */}
        <div className="fixed inset-0 bg-gradient-to-b from-[#0b1a14]/45 via-[#0b1a14]/10 to-transparent" />
      </div>
      <div ref={tipRef} className={`px-tooltip ${inspected ? '' : 'hidden'}`} aria-live="polite">
        {inspected && (
          <>
            <div className="px-tooltip-name">{inspected.adopted ? '★ ' : ''}{inspected.name}</div>
            <div className="px-tooltip-kind">{kindLabel(inspected)} · age {formatAge(inspected.age)}</div>
            <div className="px-tooltip-row">
              <span>Energy</span>
              <PixelMeter value={inspected.energy} color={inspected.energy < 0.25 ? '#ff8a6a' : '#a8e08a'} />
            </div>
            <div className="px-tooltip-mood">
              {inspected.energy < 0.15 ? 'Starving' : MOOD_LABEL[inspected.mood]}
              {' · '}{LAYER_LABEL[inspected.layer]}
            </div>
            {inspected.pinned && <div className="px-tooltip-hint">Following · click away to release</div>}
          </>
        )}
      </div>

      <PondDebugPanel actions={debugRef} />
      {(followedName || adoption || notice) && (
        <div className="adopt-bar" data-reef-ui role="region" aria-label="Your creature">
          {notice && <p className="adopt-notice" role="status">{notice}</p>}
          {followedName && inspected ? (
            <form className="adopt-row" onSubmit={submitAdoption}>
              <span className="adopt-label">Adopt this {kindLabel(inspected).toLowerCase()}?</span>
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
                {displayName(adoption)} · {POND_SPECIES[adoption.species].label}
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

export default React.memo(PondWater);
