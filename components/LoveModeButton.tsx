import React from 'react';

interface LoveModeButtonProps {
  isActive: boolean;
  onToggle: () => void;
}

const LoveModeButton: React.FC<LoveModeButtonProps> = ({ isActive, onToggle }) => {
  return (
    <button
      onClick={onToggle}
      className={`fixed bottom-[10.5rem] left-8 z-40 p-3 rounded-full backdrop-blur-sm text-white shadow-lg border hover:scale-110 focus:outline-none focus:ring-2 focus:ring-opacity-75 focus:ring-rose-400 transition-all duration-300 ${
        isActive 
          ? 'bg-rose-500/60 border-rose-400/50 shadow-rose-500/20' 
          : 'bg-rose-500/20 border-rose-400/30 hover:bg-rose-500/40'
      }`}
      title={isActive ? "Disable Love Mode" : "Enable Love Mode"}
      aria-label="Toggle Love Mode"
    >
      <svg xmlns="http://www.w3.org/2000/svg" className={`w-6 h-6 ${isActive ? 'animate-pulse' : 'opacity-80'}`} fill={isActive ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
      </svg>
      {isActive && (
        <span className="absolute -top-1 -right-1 flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
        </span>
      )}
    </button>
  );
};

export default LoveModeButton;
