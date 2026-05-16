import React from 'react';
import { ArrowUpIcon } from './Icons';
import { useTheme } from '../contexts/ThemeContext';

const BackToTopButton: React.FC = () => {
  const { theme } = useTheme();

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  const buttonColors = theme === 'underwater' 
    ? "bg-cyan-500/30 border-cyan-400/30 hover:bg-cyan-500/50 focus:ring-cyan-400"
    : "bg-emerald-500/20 border-emerald-400/30 hover:bg-emerald-500/40 focus:ring-emerald-400";


  return (
    <button
      type="button"
      onClick={scrollToTop}
      aria-label="Go to top"
      className={`fixed bottom-24 right-8 z-40 p-3 rounded-full backdrop-blur-sm text-white shadow-lg border hover:scale-110 focus:outline-none focus:ring-2 focus:ring-opacity-75 transition-all duration-300 opacity-100 translate-y-0 ${buttonColors}`}
    >
      <ArrowUpIcon className="w-6 h-6" />
    </button>
  );
};

export default BackToTopButton;