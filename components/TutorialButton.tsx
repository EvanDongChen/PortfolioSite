import React from 'react';
import { useTheme } from '../contexts/ThemeContext';

interface TutorialButtonProps {
  isOpen: boolean;
  onToggle: () => void;
}

const TutorialButton: React.FC<TutorialButtonProps> = ({ isOpen, onToggle }) => {
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
      data-is-tutorial="true"
      className={`fixed bottom-40 right-8 z-[70] h-12 w-12 rounded-full backdrop-blur-sm shadow-lg border hover:scale-110 focus:outline-none focus:ring-2 focus:ring-opacity-75 transition-all duration-300 font-extrabold text-2xl leading-none ${ringClass} ${
        isOpen ? activeClass : inactiveClass
      }`}
      title={isOpen ? 'Close tutorial' : 'Open tutorial'}
      aria-label={isOpen ? 'Close tutorial' : 'Open tutorial'}
      aria-pressed={isOpen}
    >
      ?
    </button>
  );
};

export default TutorialButton;
