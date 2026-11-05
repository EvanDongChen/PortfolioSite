import React, { useEffect, useState } from 'react';
import { SHRINE_SPECIES, SHRINE_SPECIES_LIST, ShrineHappening, ShrineSpawnable } from '../lib/shrine';
import { disguiseSprite, shrineIcon } from '../lib/shrineArt';

/** What the debug panel can ask the running forest to do. */
export interface ShrineDebugActions {
  spawn: (kind: ShrineSpawnable) => void;
  happening: (kind: ShrineHappening) => void;
  setSpeed: (speed: number) => void;
}

// ↑ ↑ ↓ ↓ ← → ← → B A, as on the reef.
const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
const SPEEDS = [1, 2, 4];
const DISGUISES = ['teapot', 'lantern', 'statue'] as const;

// Icons drawn once.
let icons: Record<string, string> | null = null;
const iconOf = (kind: string) => {
  icons ??= {
    ...Object.fromEntries(SHRINE_SPECIES_LIST.map(k => [k, shrineIcon(k).toDataURL()])),
    ...Object.fromEntries(DISGUISES.map(k => [k, disguiseSprite(k).toDataURL()])),
  };
  return icons[kind];
};

interface ShrineDebugPanelProps {
  actions: React.MutableRefObject<ShrineDebugActions | null>;
}

/**
 * A hidden panel for spawning any creature or disguise and starting each
 * event, revealed by typing the Konami code. Everything appears in the middle
 * of the screen.
 */
const ShrineDebugPanel: React.FC<ShrineDebugPanelProps> = ({ actions }) => {
  const [open, setOpen] = useState(false);
  const [speed, setSpeed] = useState(1);

  useEffect(() => {
    let progress = 0;
    const handleKey = (e: KeyboardEvent) => {
      if ((e.target as Element | null)?.closest('input, textarea, select')) return;
      if (e.key === 'Escape') { setOpen(false); return; }
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      progress = key === KONAMI[progress] ? progress + 1 : key === KONAMI[0] ? 1 : 0;
      if (progress === KONAMI.length) {
        progress = 0;
        setOpen(o => !o);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  // Back to normal speed when the panel goes away.
  useEffect(() => {
    if (!open) { setSpeed(1); actions.current?.setSpeed(1); }
  }, [open, actions]);

  if (!open) return null;
  const act = actions.current;
  const changeSpeed = (s: number) => { setSpeed(s); act?.setSpeed(s); };

  return (
    <section className="reef-debug pond-debug fixed left-8 bottom-24 z-[70] w-80" data-reef-ui aria-label="Shrine debug tools">
      <header className="reef-debug-header">
        <span>Shrine debug</span>
        <button type="button" onClick={() => setOpen(false)} aria-label="Close debug tools">×</button>
      </header>
      <p className="reef-debug-label">Somebody in disguise</p>
      <div className="reef-debug-species">
        {DISGUISES.map(k => (
          <button key={k} type="button" onClick={() => act?.spawn(k)} title={`Spawn a ${k}`}>
            <img src={iconOf(k)} alt="" />
            <span>{k[0].toUpperCase() + k.slice(1)}</span>
          </button>
        ))}
      </div>
      <p className="reef-debug-label">The forest's folk</p>
      <div className="reef-debug-species">
        {SHRINE_SPECIES_LIST.map(s => (
          <button key={s} type="button" onClick={() => act?.spawn(s)} title={`Spawn a ${SHRINE_SPECIES[s].label.toLowerCase()}`}>
            <img src={iconOf(s)} alt="" />
            <span>{SHRINE_SPECIES[s].label}</span>
          </button>
        ))}
      </div>
      <p className="reef-debug-label">Events</p>
      <div className="reef-debug-events">
        <button type="button" onClick={() => act?.happening('festival')}>Lantern festival</button>
        <button type="button" onClick={() => act?.happening('parade')}>Night parade</button>
        <button type="button" onClick={() => act?.happening('moonview')}>Moon viewing</button>
        <button type="button" onClick={() => act?.happening('contest')}>Disguise contest</button>
        <button type="button" onClick={() => act?.spawn('dance')}>Fox dance</button>
        <button type="button" onClick={() => act?.spawn('drum')}>Drum circle</button>
        <button type="button" onClick={() => act?.spawn('tag')}>Game of tag</button>
        <button type="button" onClick={() => act?.spawn('partners')}>Dance together</button>
        <button type="button" onClick={() => act?.spawn('catch')}>Catch with a flame</button>
        <button type="button" onClick={() => act?.spawn('conga')}>Follow the leader</button>
        <button type="button" onClick={() => act?.spawn('tug')}>Tug of war</button>
        <button type="button" onClick={() => act?.spawn('kick')}>Persimmon kickabout</button>
        <button type="button" onClick={() => act?.spawn('fruit')}>Fruit fight</button>
        <button type="button" onClick={() => act?.spawn('peck')}>Crow on a teapot</button>
        <button type="button" onClick={() => act?.spawn('sniff')}>Fox sniff test</button>
        <button type="button" onClick={() => act?.spawn('boo')}>Umbrella scare</button>
        <button type="button" onClick={() => act?.spawn('bush')}>Berry bush</button>
      </div>
      <p className="reef-debug-label">Simulation speed</p>
      <div className="reef-debug-speed" role="radiogroup" aria-label="Simulation speed">
        {SPEEDS.map(s => (
          <button key={s} type="button" role="radio" aria-checked={speed === s} onClick={() => changeSpeed(s)}>{s}×</button>
        ))}
      </div>
    </section>
  );
};

export default ShrineDebugPanel;
