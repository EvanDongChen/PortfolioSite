import React, { useEffect, useState } from 'react';
import { SPECIES, SPECIES_LIST, Species } from '../lib/pixelOcean';
import { creatureSprite } from '../lib/pixelOceanArt';

/** What the debug panel can ask the running reef to do. */
export interface ReefDebugActions {
  spawn: (species: Species) => void;
  whale: () => void;
  pod: () => void;
  scent: () => void;
  parasites: () => void;
  setSpeed: (speed: number) => void;
}

// ↑ ↑ ↓ ↓ ← → ← → B A
const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
const SPEEDS = [1, 2, 4];

interface ReefDebugPanelProps {
  actions: React.MutableRefObject<ReefDebugActions | null>;
}

/**
 * A hidden panel for spawning creatures and starting events, revealed by
 * typing the Konami code. Everything appears in the middle of the screen.
 */
const ReefDebugPanel: React.FC<ReefDebugPanelProps> = ({ actions }) => {
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
    <section className="reef-debug fixed left-8 bottom-24 z-[70] w-80" data-reef-ui aria-label="Reef debug tools">
      <header className="reef-debug-header">
        <span>Reef debug</span>
        <button type="button" onClick={() => setOpen(false)} aria-label="Close debug tools">×</button>
      </header>
      <p className="reef-debug-label">Spawn in the middle of the screen</p>
      <div className="reef-debug-species">
        {SPECIES_LIST.map(s => (
          <button key={s} type="button" onClick={() => act?.spawn(s)} title={`Spawn a ${SPECIES[s].label.toLowerCase()}`}>
            <img src={creatureSprite(s, 0, 0).toDataURL()} alt="" />
            <span>{SPECIES[s].label}</span>
          </button>
        ))}
      </div>
      <p className="reef-debug-label">Events</p>
      <div className="reef-debug-events">
        <button type="button" onClick={() => act?.whale()}>Whale fall here</button>
        <button type="button" onClick={() => act?.pod()}>Dolphin pod</button>
        <button type="button" onClick={() => act?.scent()}>Scent of blood</button>
        <button type="button" onClick={() => act?.parasites()}>Parasites on big fish</button>
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

export default ReefDebugPanel;
