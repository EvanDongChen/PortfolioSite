import React from 'react';

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
 * The sauce bar's button, bottom left. The board and its bowls are drawn in
 * the pot's scene (lib/hotpotSauce.ts), with no labels over them: each sauce
 * shows what it is by its colour.
 */
const SauceBar: React.FC<SauceBarProps> = ({ open, onToggle }) => (
  <button
    type="button"
    onClick={onToggle}
    aria-pressed={open}
    aria-label={open ? 'Put the sauce bar away' : 'Pull out the sauce bar'}
    className="hud-btn sauce-bar-btn fixed bottom-8 left-8 z-[60] p-3"
  >
    <svg viewBox={`0 0 ${ICON[0].length} ${ICON.length}`} className="w-6 h-6" fill="currentColor" shapeRendering="crispEdges" aria-hidden="true">
      {ICON.flatMap((row, y) => [...row].map((ch, x) => (ch === 'X' ? <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" /> : null)))}
    </svg>
  </button>
);

export default React.memo(SauceBar);
