import React from 'react';
import { useTheme } from '../contexts/ThemeContext';

interface FishFoodButtonProps {
  isActive: boolean;
  onToggle: () => void;
}

const FishFoodButton: React.FC<FishFoodButtonProps> = ({ isActive, onToggle }) => {
  const { theme } = useTheme();

  if (theme !== 'underwater') return null;

  return (
    <button
      type="button"
      onClick={onToggle}
      title={isActive ? 'Food mode on – click anywhere to place fish food' : 'Feed the fish!'}
      aria-label="Toggle fish food mode"
      className={`fixed bottom-8 left-8 z-40 p-3 rounded-full backdrop-blur-sm text-white shadow-lg border hover:scale-110 focus:outline-none focus:ring-2 focus:ring-opacity-75 transition-all duration-300 ${
        isActive
          ? 'bg-amber-500/50 border-amber-400/60 focus:ring-amber-400 scale-110'
          : 'bg-cyan-500/30 border-cyan-400/30 hover:bg-cyan-500/50 focus:ring-cyan-400'
      }`}
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {/* Bag / pouch shape */}
        <path d="M9 3h6l1 4H8L9 3z" fill={isActive ? 'rgba(251,191,36,0.6)' : 'rgba(255,255,255,0.2)'} />
        <rect x="7" y="7" width="10" height="13" rx="2" fill={isActive ? 'rgba(251,191,36,0.4)' : 'rgba(255,255,255,0.1)'} />
        {/* Pellet dots spilling out */}
        <circle cx="10" cy="13" r="1.2" fill={isActive ? '#fbbf24' : 'currentColor'} />
        <circle cx="14" cy="12" r="1.2" fill={isActive ? '#fbbf24' : 'currentColor'} />
        <circle cx="12" cy="15" r="1.2" fill={isActive ? '#fbbf24' : 'currentColor'} />
      </svg>
    </button>
  );
};

export default FishFoodButton;
