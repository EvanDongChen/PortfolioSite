import React, { useEffect, useState } from 'react';
import { FROG_STAGES, FrogStage, POND_SPECIES, PondHappening, PondSpawnable, PondSpecies } from '../lib/pond';
import { pondIcon } from '../lib/pondArt';

/** What the debug panel can ask the running pond to do. */
export interface PondDebugActions {
  spawn: (kind: PondSpawnable) => void;
  happening: (kind: PondHappening) => void;
  heronOver: () => void;
  heronLands: () => void;
  setSpeed: (speed: number) => void;
}

// ↑ ↑ ↓ ↓ ← → ← → B A, as on the reef.
const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
const SPEEDS = [1, 2, 4];
const STAGE_LABEL: Record<FrogStage, string> = {
  spawn: 'Frogspawn', tadpole: 'Tadpoles', backLegs: 'Back legs', fourLegs: 'Four legs', froglet: 'Froglet', adult: 'Frog',
};
/** Everything else that can be spawned (frogs come by stage). */
const OTHERS: PondSpecies[] = ['mallard', 'tufted', 'minnow', 'koi', 'catfish', 'pike', 'dragonfly', 'strider', 'snail', 'turtle', 'heron'];
const OTHER_LABEL: Partial<Record<PondSpecies, string>> = { mallard: 'Mallards + brood', heron: 'Heron (lands)' };

// Icons drawn once.
let icons: Record<string, string> | null = null;
const iconOf = (kind: string) => {
  icons ??= Object.fromEntries([...FROG_STAGES, ...OTHERS].map(k => [k, pondIcon(k).toDataURL()]));
  return icons[kind];
};

interface PondDebugPanelProps {
  actions: React.MutableRefObject<PondDebugActions | null>;
}

/**
 * A hidden panel for spawning any creature or frog life stage and starting
 * each event, revealed by typing the Konami code. Everything appears in the
 * middle of the screen.
 */
const PondDebugPanel: React.FC<PondDebugPanelProps> = ({ actions }) => {
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
    <section className="reef-debug pond-debug fixed left-8 bottom-24 z-[70] w-80" data-reef-ui aria-label="Pond debug tools">
      <header className="reef-debug-header">
        <span>Pond debug</span>
        <button type="button" onClick={() => setOpen(false)} aria-label="Close debug tools">×</button>
      </header>
      <p className="reef-debug-label">A frog's life, in the middle of the screen</p>
      <div className="reef-debug-species">
        {FROG_STAGES.map(s => (
          <button key={s} type="button" onClick={() => act?.spawn(s)} title={`Spawn ${STAGE_LABEL[s].toLowerCase()}`}>
            <img src={iconOf(s)} alt="" />
            <span>{STAGE_LABEL[s]}</span>
          </button>
        ))}
      </div>
      <p className="reef-debug-label">Other pond life</p>
      <div className="reef-debug-species">
        {OTHERS.map(s => (
          <button key={s} type="button" onClick={() => act?.spawn(s)} title={`Spawn a ${POND_SPECIES[s].label.toLowerCase()}`}>
            <img src={iconOf(s)} alt="" />
            <span>{OTHER_LABEL[s] ?? POND_SPECIES[s].label}</span>
          </button>
        ))}
      </div>
      <p className="reef-debug-label">Events</p>
      <div className="reef-debug-events">
        <button type="button" onClick={() => act?.happening('rain')}>Rain shower</button>
        <button type="button" onClick={() => act?.happening('hatch')}>Mayfly hatch</button>
        <button type="button" onClick={() => act?.happening('chorus')}>Evening chorus</button>
        <button type="button" onClick={() => act?.heronOver()}>Heron passes over</button>
        <button type="button" onClick={() => act?.heronLands()}>Heron comes to fish</button>
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

export default PondDebugPanel;
