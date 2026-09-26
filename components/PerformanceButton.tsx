import React from 'react';
import { useTheme } from '../contexts/ThemeContext';

interface PerformanceButtonProps {
  isOpen: boolean;
  onToggle: () => void;
}

const PerformanceButton: React.FC<PerformanceButtonProps> = ({ isOpen, onToggle }) => {
  const { theme } = useTheme();
  const ringClass = theme === 'deepsea' ? 'focus:ring-emerald-400' : 'focus:ring-cyan-400';
  const activeClass = theme === 'deepsea'
    ? 'bg-emerald-500/45 border-emerald-400/55 scale-110 shadow-emerald-500/20 text-emerald-50'
    : 'bg-cyan-500/50 border-cyan-400/50 scale-110 shadow-cyan-500/20 text-cyan-50';
  const inactiveClass = theme === 'deepsea'
    ? 'bg-emerald-500/20 border-emerald-400/30 hover:bg-emerald-500/35 text-slate-200'
    : 'bg-cyan-500/30 border-cyan-400/30 hover:bg-cyan-500/50 text-slate-100';

  return (
    <button
      type="button"
      onClick={onToggle}
      className={`fixed bottom-[5.5rem] right-8 z-[55] h-12 w-12 rounded-full backdrop-blur-sm shadow-lg border hover:scale-110 focus:outline-none focus:ring-2 focus:ring-opacity-75 transition-all duration-300 flex items-center justify-center ${ringClass} ${
        isOpen ? activeClass : inactiveClass
      }`}
      title={isOpen ? 'Close performance settings' : 'Open performance settings'}
      aria-label={isOpen ? 'Close performance settings' : 'Open performance settings'}
      aria-pressed={isOpen}
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" />
        <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09a1.65 1.65 0 00-1.08-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09a1.65 1.65 0 001.51-1.08 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z" />
      </svg>
    </button>
  );
};

export default React.memo(PerformanceButton);
