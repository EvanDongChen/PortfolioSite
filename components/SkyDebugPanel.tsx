import React, { useEffect, useState } from 'react';
import type { SkyEventKind } from '../lib/skyEvents';

/** What the debug panel can ask the running sky to do. */
export interface SkyDebugActions {
  event: (kind: SkyEventKind) => void;
  /** Brings the dragon (and its pearl) into view. */
  callDragon: () => void;
  setSpeed: (speed: number) => void;
}

// ↑ ↑ ↓ ↓ ← → ← → B A, as on the other pages.
const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
const SPEEDS = [1, 2, 4];

interface SkyDebugPanelProps {
  actions: React.MutableRefObject<SkyDebugActions | null>;
}

/** A hidden panel for starting the sky's events and calling its creatures, revealed by typing the Konami code. */
const SkyDebugPanel: React.FC<SkyDebugPanelProps> = ({ actions }) => {
  const [open, setOpen] = useState(false);
  const [speed, setSpeed] = useState(1);

  useEffect(() => {
    let progress = 0;
    const handleKey = (e: KeyboardEvent) => {
      if ((e.target as Element | null)?.closest('input, textarea, select')) return;
      if (e.key === 'Escape') { setOpen(false); return; }
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      progress = key === KONAMI[progress] ? progress + 1 : key === KONAMI[0] ? 1 : 0;
      if (progress === KONAMI.length) { progress = 0; setOpen(o => !o); }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  useEffect(() => {
    if (!open) { setSpeed(1); actions.current?.setSpeed(1); }
  }, [open, actions]);

  if (!open) return null;
  const act = actions.current;
  const changeSpeed = (s: number) => { setSpeed(s); act?.setSpeed(s); };

  return (
    <section className="reef-debug pond-debug fixed left-8 bottom-24 z-[70] w-80" data-reef-ui aria-label="Sky debug tools">
      <header className="reef-debug-header">
        <span>Sky debug</span>
        <button type="button" onClick={() => setOpen(false)} aria-label="Close debug tools">×</button>
      </header>
      <p className="reef-debug-label">Creatures</p>
      <div className="reef-debug-events">
        <button type="button" onClick={() => act?.callDragon()}>Call the dragon</button>
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

export default SkyDebugPanel;
