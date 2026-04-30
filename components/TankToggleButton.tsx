import React from 'react';
import { TankIcon } from './Icons';

interface TankToggleButtonProps {
  isActive: boolean;
  onToggle: () => void;
  count: number;
}

const TankToggleButton: React.FC<TankToggleButtonProps> = ({ isActive, onToggle, count }) => {
  return (
    <button
      onClick={onToggle}
      className={`fixed bottom-[17rem] left-8 z-[60] p-3 rounded-full backdrop-blur-sm text-white shadow-lg border hover:scale-110 focus:outline-none focus:ring-2 focus:ring-opacity-75 focus:ring-cyan-400 transition-all duration-300 group ${
        isActive 
          ? 'bg-cyan-500/50 border-cyan-400/50 scale-110 shadow-cyan-500/20' 
          : 'bg-cyan-500/30 border-cyan-400/30 hover:bg-cyan-500/50'
      }`}
      title={isActive ? "Close Portable Tank" : "Open Portable Tank"}
      aria-label={isActive ? "Close Portable Tank" : "Open Portable Tank"}
    >
      <TankIcon className={`w-6 h-6 transition-colors duration-300 ${
        isActive ? 'text-cyan-200' : 'text-slate-300 group-hover:text-white'
      }`} />
      
      {/* Count Badge */}
      {count > 0 && (
        <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-cyan-500 text-[10px] font-bold text-white border border-slate-900 shadow-md">
          {count}
        </span>
      )}
    </button>
  );
};

export default TankToggleButton;
