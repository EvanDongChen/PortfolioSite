import React from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { DiveIcon, SurfaceIcon } from './Icons';

const ThemeToggleButton: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  const buttonColors = theme === 'underwater'
    ? "bg-cyan-500/30 border-cyan-400/30 hover:bg-cyan-500/50 focus:ring-cyan-400"
    : "bg-emerald-500/20 border-emerald-400/30 hover:bg-emerald-500/40 focus:ring-emerald-400";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={theme === 'underwater' ? 'Switch to deep sea' : 'Return to surface'}
      className={`fixed bottom-8 right-8 z-40 p-3 rounded-full backdrop-blur-sm text-white shadow-lg border hover:scale-110 focus:outline-none focus:ring-2 focus:ring-opacity-75 transition-all duration-300 ${buttonColors}`}
    >
      {theme === 'underwater' ? (
        <DiveIcon className="w-6 h-6" />
      ) : (
        <SurfaceIcon className="w-6 h-6" />
      )}
    </button>
  );
};

export default ThemeToggleButton;