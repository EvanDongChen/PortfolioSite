import React from 'react';
import { useTheme } from '../contexts/ThemeContext';

// A tiny pixel fish (off) or a wave (on, i.e. "back to the aquarium").
const PIXEL_FISH = [
  [9, 7], [10, 7], [11, 7], [7, 8], [8, 8], [9, 8], [10, 8], [11, 8], [12, 8],
  [4, 9], [6, 9], [7, 9], [8, 9], [9, 9], [10, 9], [11, 9], [13, 9],
  [4, 10], [5, 10], [6, 10], [7, 10], [8, 10], [9, 10], [10, 10], [11, 10], [12, 10], [13, 10],
  [4, 11], [6, 11], [7, 11], [8, 11], [9, 11], [10, 11], [11, 11], [12, 11],
  [7, 12], [8, 12], [9, 12], [10, 12], [11, 12], [9, 13], [10, 13],
];

const PixelModeButton: React.FC = () => {
  const { isPixelMode, togglePixelMode } = useTheme();
  // The pixel page has no tutorial button, so there it takes that slot in the stack.
  const label = isPixelMode ? 'Back to the aquarium' : 'Switch to the pixel ecosystem';

  return (
    <button
      type="button"
      onClick={togglePixelMode}
      title={label}
      aria-label={label}
      aria-pressed={isPixelMode}
      className={`fixed ${isPixelMode ? 'bottom-[9rem]' : 'bottom-[12.5rem]'} right-8 z-[55] h-12 w-12 rounded-full backdrop-blur-sm shadow-lg border hover:scale-110 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-opacity-75 transition-all duration-300 flex items-center justify-center ${
        isPixelMode
          ? 'bg-cyan-500/50 border-cyan-400/50 text-cyan-50'
          : 'bg-cyan-500/30 border-cyan-400/30 hover:bg-cyan-500/50 text-slate-100'
      }`}
    >
      {isPixelMode ? (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 9c2 0 2-2 4-2s2 2 4 2 2-2 4-2 2 2 4 2 2-2 4-2" />
          <path d="M2 15c2 0 2-2 4-2s2 2 4 2 2-2 4-2 2 2 4 2 2-2 4-2" />
        </svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" viewBox="3 5 12 10" fill="currentColor" shapeRendering="crispEdges">
          {PIXEL_FISH.map(([x, y]) => (
            <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" />
          ))}
          <rect x="11" y="9" width="1" height="1" className="text-slate-900" fill="currentColor" />
        </svg>
      )}
    </button>
  );
};

export default React.memo(PixelModeButton);
