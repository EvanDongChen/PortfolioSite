import React, { useEffect, useState } from 'react';
import type { DebugName } from '../../lib/cryptid/forestLife';

/** What the debug panel can ask the running forest to do. */
export interface CryptidDebugActions {
  /** Calls a creature into view, or sets something going, by name. */
  act: (name: DebugName) => void;
  setSpeed: (speed: number) => void;
}

// ↑ ↑ ↓ ↓ ← → ← → B A, as on the other pages.
const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
const SPEEDS = [1, 2, 4];

const CRYPTIDS: [DebugName, string][] = [
  ['bigfoot', 'Bigfoot'],
  ['crawlers', 'Nightcrawlers'],
  ['mothman', 'Mothman'],
  ['devil', 'Jersey Devil'],
  ['wendigo', 'Wendigo'],
  ['nessie', 'Lake monster'],
];
const ANIMALS: [DebugName, string][] = [
  ['deer', 'Deer'],
  ['owl', 'Owl'],
  ['raid', 'Raccoon raid'],
  ['moths', 'Moth cloud'],
];
const OTHER: [DebugName, string][] = [
  ['document', 'Document nearest'],
  ['visit', 'Cryptid visits camp'],
];

interface CryptidDebugPanelProps {
  actions: React.MutableRefObject<CryptidDebugActions | null>;
}

/** A hidden panel for calling the forest's creatures into view, revealed by typing the Konami code. */
const CryptidDebugPanel: React.FC<CryptidDebugPanelProps> = ({ actions }) => {
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
  const buttons = (list: [DebugName, string][]) => (
    <div className="reef-debug-events">
      {list.map(([name, label]) => <button key={name} type="button" onClick={() => act?.act(name)}>{label}</button>)}
    </div>
  );

  return (
    <section className="reef-debug pond-debug fixed left-8 bottom-24 z-[70] w-80" data-reef-ui aria-label="Forest debug tools">
      <header className="reef-debug-header">
        <span>Forest debug</span>
        <button type="button" onClick={() => setOpen(false)} aria-label="Close debug tools">×</button>
      </header>
      <p className="reef-debug-label">Cryptids</p>
      {buttons(CRYPTIDS)}
      <p className="reef-debug-label">Animals</p>
      {buttons(ANIMALS)}
      <p className="reef-debug-label">Happenings</p>
      {buttons(OTHER)}
      <p className="reef-debug-label">Simulation speed</p>
      <div className="reef-debug-speed" role="radiogroup" aria-label="Simulation speed">
        {SPEEDS.map(s => (
          <button key={s} type="button" role="radio" aria-checked={speed === s} onClick={() => changeSpeed(s)}>{s}×</button>
        ))}
      </div>
    </section>
  );
};

export default CryptidDebugPanel;
