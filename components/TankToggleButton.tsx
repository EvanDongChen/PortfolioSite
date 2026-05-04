import React from 'react';
import { TankIcon } from './Icons';
import { useTheme } from '../contexts/ThemeContext';

interface TankToggleButtonProps {
  isActive: boolean;
  onToggle: () => void;
  count: number;
}

const TankToggleButton: React.FC<TankToggleButtonProps> = ({ isActive, onToggle, count }) => {
  const { theme } = useTheme();
  const ringClass = theme === 'deepsea' ? 'focus:ring-emerald-400' : 'focus:ring-cyan-400';
  const activeClass = theme === 'deepsea'
    ? 'bg-emerald-500/45 border-emerald-400/55 scale-110 shadow-emerald-500/20'
    : 'bg-cyan-500/50 border-cyan-400/50 scale-110 shadow-cyan-500/20';
  const inactiveClass = theme === 'deepsea'
    ? 'bg-emerald-500/20 border-emerald-400/30 hover:bg-emerald-500/35'
    : 'bg-cyan-500/30 border-cyan-400/30 hover:bg-cyan-500/50';
  const iconClass = isActive
    ? (theme === 'deepsea' ? 'text-emerald-100' : 'text-cyan-200')
    : 'text-slate-300 group-hover:text-white';
  const badgeClass = theme === 'deepsea' ? 'bg-emerald-500' : 'bg-cyan-500';

  return (
    <button
      onClick={onToggle}
      className={`fixed bottom-[17rem] left-8 z-[60] p-3 rounded-full backdrop-blur-sm text-white shadow-lg border hover:scale-110 focus:outline-none focus:ring-2 focus:ring-opacity-75 transition-all duration-300 group ${ringClass} ${
        isActive 
          ? activeClass
          : inactiveClass
      }`}
      title={isActive ? "Close Portable Tank" : "Open Portable Tank"}
      aria-label={isActive ? "Close Portable Tank" : "Open Portable Tank"}
    >
      <TankIcon className={`w-6 h-6 transition-colors duration-300 ${iconClass}`} />
      
      {/* Count Badge */}
      {count > 0 && (
        <span className={`absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white border border-slate-900 shadow-md ${badgeClass}`}>
          {count}
        </span>
      )}
    </button>
  );
};

export default TankToggleButton;
