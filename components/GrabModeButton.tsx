import React from 'react';
import { NetIcon } from './Icons';

interface GrabModeButtonProps {
  isActive: boolean;
  onToggle: () => void;
}

const GrabModeButton: React.FC<GrabModeButtonProps> = ({ isActive, onToggle }) => {
  return (
    <button
      onClick={onToggle}
      className={`fixed bottom-[13rem] left-8 z-[60] p-3 rounded-full backdrop-blur-sm text-white shadow-lg border hover:scale-110 focus:outline-none focus:ring-2 focus:ring-opacity-75 focus:ring-cyan-400 transition-all duration-300 group ${
        isActive 
          ? 'bg-amber-500/50 border-amber-400/50 scale-110 shadow-amber-500/20' 
          : 'bg-cyan-500/30 border-cyan-400/30 hover:bg-cyan-500/50'
      }`}
      title={isActive ? "Exit Grab Mode" : "Enter Grab Mode"}
      aria-label={isActive ? "Exit Grab Mode" : "Enter Grab Mode"}
    >
      <NetIcon className={`w-6 h-6 transition-colors duration-300 ${
        isActive ? 'text-amber-200' : 'text-slate-300 group-hover:text-white'
      }`} />
      
      {/* Small badge if active */}
      {isActive && (
        <span className="absolute -top-1 -right-1 flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
        </span>
      )}
    </button>
  );
};

export default GrabModeButton;
