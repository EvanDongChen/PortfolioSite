import React, { useState } from 'react';
import { Fish as FishType } from '../types';
import { useTheme } from '../contexts/ThemeContext';

interface FishCensusProps {
  fishes: FishType[];
  highlightedBehavior: FishType['behavior'] | null;
  onHighlightBehavior: (behavior: FishType['behavior'] | null) => void;
}

const FishCensus: React.FC<FishCensusProps> = ({ fishes, highlightedBehavior, onHighlightBehavior }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { theme } = useTheme();
  const isDeepSea = theme === 'deepsea';

  const censusButtonClasses = isDeepSea
    ? 'focus:ring-emerald-400 bg-emerald-500/20 border-emerald-400/30 hover:bg-emerald-500/35'
    : 'focus:ring-cyan-400 bg-cyan-500/30 border-cyan-400/30 hover:bg-cyan-500/50';
  const panelBorderClass = isDeepSea ? 'border-emerald-500/30' : 'border-cyan-500/30';
  const headerBorderClass = isDeepSea ? 'border-emerald-500/20' : 'border-cyan-500/20';
  const headerTextClass = isDeepSea ? 'text-emerald-300' : 'text-cyan-300';
  const sectionLabelClass = isDeepSea ? 'text-emerald-500/70' : 'text-cyan-500/70';

  // Derive stats
  const total = fishes.length;
  const behaviors = {
    cruise: 0,
    dart: 0,
    loiter: 0,
    conga: 0,
    curious: 0,
    mating: 0,
  };

  fishes.forEach(f => {
    if (behaviors[f.behavior] !== undefined) {
      behaviors[f.behavior]++;
    }
  });

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-[9rem] left-8 z-[60] p-3 rounded-full backdrop-blur-sm text-white shadow-lg border hover:scale-110 focus:outline-none focus:ring-2 focus:ring-opacity-75 transition-all duration-300 ${censusButtonClasses}`}
        title="Aquarium Census"
        aria-label="Open Fish Census"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 opacity-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      </button>
    );
  }

  return (
    <div className={`fixed bottom-[9rem] left-8 z-[70] bg-slate-900/60 backdrop-blur-xl border rounded-2xl p-5 shadow-2xl w-64 text-slate-200 pointer-events-auto ${panelBorderClass}`}>
      <div className={`flex justify-between items-center mb-4 pb-2 border-b ${headerBorderClass}`}>
        <h3 className={`${headerTextClass} font-bold tracking-wider text-sm flex items-center gap-2`}>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          AQUARIUM CENSUS
        </h3>
        <button
          onClick={() => setIsOpen(false)}
          className="text-slate-400 hover:text-white transition-colors"
          aria-label="Close Census"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="space-y-3 font-mono text-sm">
        <div className="flex justify-between items-center">
          <span className="text-slate-400">Total Fish</span>
          <span className="text-white font-bold">{total}</span>
        </div>

        <div className="pt-2">
          <div className={`text-xs mb-2 font-sans tracking-widest uppercase ${sectionLabelClass}`}>Live Behaviors</div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            {[
              { id: 'cruise', label: 'Schooling', color: isDeepSea ? 'text-emerald-100' : 'text-cyan-100', activeBg: isDeepSea ? 'bg-emerald-500/20' : 'bg-cyan-500/20', borderColor: isDeepSea ? 'border-emerald-400/50' : 'border-cyan-400/50' },
              { id: 'conga', label: 'Conga', color: 'text-purple-300', activeBg: 'bg-purple-500/20', borderColor: 'border-purple-400/50' },
              { id: 'dart', label: 'Darting', color: 'text-orange-300', activeBg: 'bg-orange-500/20', borderColor: 'border-orange-400/50' },
              { id: 'curious', label: 'Curious', color: 'text-pink-300', activeBg: 'bg-pink-500/20', borderColor: 'border-pink-400/50' },
              { id: 'mating', label: 'Mating', color: 'text-rose-400', activeBg: 'bg-rose-500/20', borderColor: 'border-rose-400/50' },
              { id: 'loiter', label: 'Loitering', color: 'text-slate-300', activeBg: 'bg-slate-500/20', borderColor: 'border-slate-400/50' },
            ].map(b => (
              <button
                key={b.id}
                onClick={() => onHighlightBehavior(highlightedBehavior === b.id ? null : b.id as FishType['behavior'])}
                className={`flex justify-between items-center p-1.5 -mx-1.5 rounded transition-all duration-200 border border-transparent ${highlightedBehavior === b.id ? `${b.activeBg} ${b.borderColor}` : 'hover:bg-slate-800/50'}`}
                aria-label={`Highlight ${b.label} fish`}
              >
                <span className="text-slate-400 pointer-events-none">{b.label}</span>
                <span className={`${b.color} pointer-events-none`}>{behaviors[b.id as keyof typeof behaviors]}</span>
              </button>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};

export default FishCensus;
