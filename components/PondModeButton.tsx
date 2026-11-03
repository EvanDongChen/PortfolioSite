import React from 'react';
import { useTheme } from '../contexts/ThemeContext';

// A tiny pixel lily pad with its notch, and a frog's two eyes peeping over it.
const PAD = [
  '...XXXX.....',
  '.XXXXXXXX...',
  'XXXXXXXXX..X',
  'XXXXXXXXXXXX',
  'XXXXXXXXXXXX',
  '.XXXXXXXXXX.',
  '...XXXXXX...',
];
const PAD_CELLS = PAD.flatMap((row, y) => [...row].map((ch, x) => (ch === 'X' ? [x, y + 3] : null)))
  .filter((cell): cell is number[] => cell !== null);
const EYES = [[3, 1], [4, 1], [3, 2], [4, 2], [7, 1], [8, 1], [7, 2], [8, 2]];

/**
 * Switches to the pixel pond, or back to the page it was opened from. It
 * sits in the right-hand stack: above the pixel-mode button on the reef and
 * the aquarium, and in that button's slot on the pond itself.
 */
const PondModeButton: React.FC = () => {
  const { isPondMode, isPixelMode, togglePondMode } = useTheme();
  const label = isPondMode ? `Leave the pond for the ${isPixelMode ? 'reef' : 'aquarium'}` : 'Switch to the pixel pond';
  const slot = isPondMode ? 'bottom-[9rem]' : isPixelMode ? 'bottom-[12.5rem]' : 'bottom-[16rem]';

  return (
    <button
      type="button"
      onClick={togglePondMode}
      title={label}
      aria-label={label}
      aria-pressed={isPondMode}
      className={`hud-btn pond-btn fixed ${slot} right-8 z-[55] h-12 w-12 rounded-full backdrop-blur-sm shadow-lg border hover:scale-110 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-opacity-75 transition-all duration-300 flex items-center justify-center ${
        isPondMode
          ? 'bg-emerald-500/50 border-emerald-400/50 text-emerald-50'
          : 'bg-emerald-500/30 border-emerald-400/30 hover:bg-emerald-500/50 text-slate-100'
      }`}
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" viewBox="0 0 12 10" fill="currentColor" shapeRendering="crispEdges">
        {PAD_CELLS.map(([x, y]) => (
          <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" />
        ))}
        {EYES.map(([x, y]) => (
          <rect key={`e${x}-${y}`} x={x} y={y} width="1" height="1" opacity="0.6" />
        ))}
      </svg>
    </button>
  );
};

export default React.memo(PondModeButton);
