import React from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { PlanetIcon, WaterDropIcon } from './Icons';

const ThemeToggleButton: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  const buttonColors = theme === 'underwater' 
    ? "bg-cyan-500/30 border-cyan-400/30 hover:bg-cyan-500/50 focus:ring-cyan-400"
    : "bg-indigo-500/30 border-indigo-400/30 hover:bg-indigo-500/50 focus:ring-indigo-400";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label="Toggle theme"
      className={`fixed bottom-8 right-8 z-40 p-3 rounded-full backdrop-blur-sm text-white shadow-lg border hover:scale-110 focus:outline-none focus:ring-2 focus:ring-opacity-75 transition-all duration-300 ${buttonColors}`}
    >
      {theme === 'underwater' ? (
        <PlanetIcon className="w-6 h-6" />
      ) : (
        <WaterDropIcon className="w-6 h-6" />
      )}
    </button>
  );
};

export default ThemeToggleButton;