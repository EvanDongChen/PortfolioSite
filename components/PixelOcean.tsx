import React, { useEffect, useRef, useState } from 'react';
import { Creature, Mood, PixelOcean as Ocean, OceanStats, SPECIES, Species, TICKS_PER_SECOND } from '../lib/pixelOcean';
import { Adoption, displayName, loadAdoption, saveAdoption } from '../lib/adoption';
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
const NOTICE_MS = 7000;
const MAX_NAME_LENGTH = 16;
// Breathing room kept clear around the hero text, in page pixels.
const HERO_CLEARANCE = 24;

/** Where the hero's text (not the photo) sits at the top of the page, in world units. */
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
};

interface Inspected {
  name: string;
  species: Species;
  mood: Mood;
  energy: number;
  hungry: boolean;
  age: number;
  pinned: boolean;
  adopted: boolean;
}

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

/** The reef behind the content: a fixed, one-screen backdrop the page scrolls over. */
const PixelOcean: React.FC<PixelOceanProps> = ({ isFoodMode, onStats }) => {
  const floorRef = useRef<HTMLCanvasElement>(null);
  const spriteRef = useRef<HTMLCanvasElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const oceanRef = useRef<Ocean | null>(null);
  const actionsRef = useRef<ReefActions | null>(null);
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

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), NOTICE_MS);
    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    const floor = floorRef.current;
    const sprites = spriteRef.current;
    if (!floor || !sprites) return;

    // The reef is a fixed backdrop exactly one screen in size.
    const worldSize = () => ({
      w: Math.ceil(window.innerWidth / px),
      h: Math.ceil(window.innerHeight / px),
    });
    const size = worldSize();
    const ocean = new Ocean(size.w, size.h);
    oceanRef.current = ocean;
    ocean.setClearZones(heroZones(px));
    // Web fonts can shift the hero once they load, so measure it again then.
    document.fonts?.ready.then(() => { if (oceanRef.current === ocean) ocean.setClearZones(heroZones(px)); });
    const view = new OceanView(ocean, floor, sprites, px);
    const draw = () => view.render(0, window.innerWidth, window.innerHeight, window.devicePixelRatio || 1);

    // A returning visitor's creature swims back in.
    const saved = loadAdoption();
    let adopted: Creature | null = saved ? ocean.release(saved.species, displayName(saved), saved.palette) : null;
    draw();

    let raf = 0;
    let last = performance.now();
    let pending = 0;
    let lastDraw = 0;
    let lastStats = 0;
    let lastInspect = 0;
    let hovered: Creature | null = null;
    let pinned: Creature | null = null;
    let shown = false;

    // When the adopted creature dies, a child (if any) carries on the line.
    const checkLine = () => {
      if (!adopted || adopted.alive) return;
      const line = loadAdoption();
      const heir = ocean.heirOf(adopted);
      if (line && heir) {
        const next: Adoption = { ...line, generation: line.generation + 1, palette: heir.palette };
        ocean.adopt(heir, displayName(next));
        saveAdoption(next);
        setAdoption(next);
        setNotice(`${adopted.name} died. ${displayName(next)} carries on the line.`);
        if (pinned === adopted) pinned = heir;
        adopted = heir;
      } else {
        setNotice(`${adopted.name} died, and the line has ended. Click any creature to adopt another.`);
        saveAdoption(null);
        setAdoption(null);
        adopted = null;
      }
    };

    actionsRef.current = {
      adopt: (name: string) => {
        if (!pinned?.alive) return;
        if (adopted && adopted !== pinned) adopted.adopted = false;
        const line: Adoption = { name, species: pinned.species, palette: pinned.palette, generation: 1, since: Date.now() };
        ocean.adopt(pinned, name);
        adopted = pinned;
        saveAdoption(line);
        setAdoption(line);
        lastInspect = 0;
      },
      find: () => {
        if (adopted?.alive) pinned = adopted;
      },
      letGo: () => {
        if (adopted) adopted.adopted = false;
        adopted = null;
        saveAdoption(null);
        setAdoption(null);
        lastInspect = 0;
      },
    };

    // Follows the inspected creature every frame; refreshes its details less often.
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
        adopted: target.adopted,
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
      if (ticked && now - lastDraw >= frameMsRef.current - 2) {
        lastDraw = now;
        inspect(now);
        draw();
      }
      if (now - lastStats > STATS_INTERVAL_MS) {
        lastStats = now;
        checkLine();
        onStatsRef.current(ocean.stats());
      }
    };
    raf = requestAnimationFrame(frame);

    let resizeTimer = 0;
    const handleResize = () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        const next = worldSize();
        ocean.resize(next.w, next.h);
        ocean.setClearZones(heroZones(px));
        draw();
      }, 150);
    };

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
      if ((e.target as Element | null)?.closest('button, a, input, textarea, select, [role="dialog"], [data-reef-ui]')) return;
      if (isFoodModeRef.current) {
        const p = view.screenToWorld(e.clientX, e.clientY, DROP_HEIGHT);
        ocean.dropFood(p.x, p.z, DROP_HEIGHT);
        return;
      }
      // Clicking (or tapping) a creature keeps it under inspection; elsewhere lets go.
      pinned = view.pick(e.clientX, e.clientY, 32);
      lastInspect = 0;
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('pointermove', handlePointerMove);
    document.documentElement.addEventListener('pointerleave', handlePointerLeave);
    window.addEventListener('pointerdown', handlePointerDown);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(resizeTimer);
      oceanRef.current = null;
      actionsRef.current = null;
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('pointermove', handlePointerMove);
      document.documentElement.removeEventListener('pointerleave', handlePointerLeave);
      window.removeEventListener('pointerdown', handlePointerDown);
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

  // A fixed backdrop: the page content scrolls over the reef.
  return (
    <>
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <canvas ref={floorRef} className="absolute left-0 top-0 block" style={{ imageRendering: 'pixelated' }} />
        <canvas ref={spriteRef} className="absolute left-0 top-0 block" />
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
