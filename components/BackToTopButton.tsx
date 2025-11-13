import React, { useState, useEffect } from 'react';
import { ArrowUpIcon } from './Icons';
import { useTheme } from '../contexts/ThemeContext';

const BackToTopButton: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const { theme } = useTheme();

  useEffect(() => {
    const toggleVisibility = () => {
      if (window.scrollY > 300) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', toggleVisibility);

    return () => window.removeEventListener('scroll', toggleVisibility);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  const buttonColors = theme === 'underwater' 
    ? "bg-cyan-500/30 border-cyan-400/30 hover:bg-cyan-500/50 focus:ring-cyan-400"
    : "bg-indigo-500/30 border-indigo-400/30 hover:bg-indigo-500/50 focus:ring-indigo-400";


  return (
    <button
      type="button"
      onClick={scrollToTop}
      aria-label="Go to top"
      className={`fixed bottom-24 right-8 z-40 p-3 rounded-full backdrop-blur-sm text-white shadow-lg border hover:scale-110 focus:outline-none focus:ring-2 focus:ring-opacity-75 transition-all duration-300 ${buttonColors} ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}
    >
      <ArrowUpIcon className="w-6 h-6" />
    </button>
  );
};

export default BackToTopButton;