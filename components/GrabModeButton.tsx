import React from 'react';
import { NetIcon } from './Icons';
import { useTheme } from '../contexts/ThemeContext';

interface GrabModeButtonProps {
  isActive: boolean;
  onToggle: () => void;
}

const GrabModeButton: React.FC<GrabModeButtonProps> = ({ isActive, onToggle }) => {
  const { theme } = useTheme();
  const ringClass = theme === 'deepsea' ? 'focus:ring-emerald-400' : 'focus:ring-cyan-400';
  const activeClass = theme === 'deepsea'
    ? 'bg-emerald-500/50 border-emerald-400/60 scale-110 shadow-emerald-500/20'
    : 'bg-amber-500/50 border-amber-400/50 scale-110 shadow-amber-500/20';
  const inactiveClass = theme === 'deepsea'
    ? 'bg-emerald-500/20 border-emerald-400/30 hover:bg-emerald-500/35'
    : 'bg-cyan-500/30 border-cyan-400/30 hover:bg-cyan-500/50';
  const iconClass = isActive
    ? (theme === 'deepsea' ? 'text-emerald-100' : 'text-amber-200')
    : 'text-slate-300 group-hover:text-white';

  return (
    <button
      onClick={onToggle}
      className={`fixed bottom-[13rem] left-8 z-[60] p-3 rounded-full backdrop-blur-sm text-white shadow-lg border hover:scale-110 focus:outline-none focus:ring-2 focus:ring-opacity-75 transition-all duration-300 group ${ringClass} ${
        isActive 
          ? activeClass
          : inactiveClass
      }`}
      title={isActive ? "Exit Grab Mode" : "Enter Grab Mode"}
      aria-label={isActive ? "Exit Grab Mode" : "Enter Grab Mode"}
    >
      <NetIcon className={`w-6 h-6 transition-colors duration-300 ${iconClass}`} />
      
      {/* Small badge if active */}
      {isActive && (
        <span className="absolute -top-1 -right-1 flex h-3 w-3">
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${theme === 'deepsea' ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
          <span className={`relative inline-flex rounded-full h-3 w-3 ${theme === 'deepsea' ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
        </span>
      )}
    </button>
  );
};

export default GrabModeButton;
