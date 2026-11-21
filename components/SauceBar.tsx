import React from 'react';
import { SAUCES, SAUCE_LAYOUT } from '../lib/hotpotSauce';

// A dipping bowl with a pair of chopsticks over it ('X' drawn).
const ICON = [
  '.........XX.',
  '.......XX...',
  '.....XX..XX.',
  '...XX..XX...',
  '.....XX.....',
  'XXXXXXXXXXXX',
  'X.XXXXXXXX.X',
  '.XXXXXXXXXX.',
  '..XXXXXXXX..',
  '...XXXXXX...',
];

interface SauceBarProps {
  open: boolean;
  onToggle: () => void;
}

/**
 * The sauce bar's button, bottom left, and the names of its bowls. The board
 * and bowls themselves are drawn in the pot's scene (lib/hotpotSauce.ts); these
 * labels slide out with them, on the same layout.
 */
const SauceBar: React.FC<SauceBarProps> = ({ open, onToggle }) => {
  const L = SAUCE_LAYOUT;
  return (
    <>
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={open}
        aria-label={open ? 'Put the sauce bar away' : 'Pull out the sauce bar'}
        title={open ? 'Put the sauce bar away' : 'Sauce bar: carry food onto a bowl to dip it'}
        className="hud-btn sauce-bar-btn fixed bottom-8 left-8 z-[60] p-3"
      >
        <svg viewBox={`0 0 ${ICON[0].length} ${ICON.length}`} className="w-6 h-6" fill="currentColor" shapeRendering="crispEdges" aria-hidden="true">
          {ICON.flatMap((row, y) => [...row].map((ch, x) => (ch === 'X' ? <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" /> : null)))}
        </svg>
      </button>
      <div
        className={`sauce-bar-labels fixed z-[5] pointer-events-none ${open ? 'is-open' : ''}`}
        style={{ left: L.left, top: `calc(50% - ${L.h / 2}px)`, width: L.w, height: L.h }}
        aria-hidden="true"
      >
        <span className="sauce-bar-title">Sauce bar · carry food in and swish it</span>
        {SAUCES.map((sauce, i) => (
          <span key={sauce.name} className="sauce-bar-name" style={{ left: L.w + 6, top: L.bowls[i][1] - 8 }}>
            {sauce.name}
          </span>
        ))}
      </div>
    </>
  );
};

export default React.memo(SauceBar);
