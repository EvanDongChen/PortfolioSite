import React, { useEffect, useState } from 'react';

/** What the debug panel can ask the running pot to do. */
export interface HotpotDebugActions {
  pour: () => void;
  pluck: () => void;
  boil: () => void;
  ladle: () => void;
  egg: () => void;
  setSpeed: (speed: number) => void;
}

// ↑ ↑ ↓ ↓ ← → ← → B A, as on the other pages.
const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
const SPEEDS = [1, 2, 4];

interface HotpotDebugPanelProps {
  actions: React.MutableRefObject<HotpotDebugActions | null>;
}

/** A hidden panel for stirring things up in the pot, revealed by typing the Konami code. */
const HotpotDebugPanel: React.FC<HotpotDebugPanelProps> = ({ actions }) => {
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
    <section className="reef-debug pond-debug fixed left-8 bottom-24 z-[70] w-80" data-reef-ui aria-label="Hot pot debug tools">
      <header className="reef-debug-header">
        <span>Hot pot debug</span>
        <button type="button" onClick={() => setOpen(false)} aria-label="Close debug tools">×</button>
      </header>
      <p className="reef-debug-label">Events</p>
      <div className="reef-debug-events">
        <button type="button" onClick={() => act?.pour()}>Drop in a handful</button>
        <button type="button" onClick={() => act?.pluck()}>Chopsticks</button>
        <button type="button" onClick={() => act?.boil()}>Rolling boil</button>
        <button type="button" onClick={() => act?.ladle()}>Ladle swirl</button>
        <button type="button" onClick={() => act?.egg()}>Egg drop</button>
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

export default HotpotDebugPanel;
