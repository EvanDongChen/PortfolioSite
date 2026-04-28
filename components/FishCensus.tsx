import React, { useState } from 'react';
import { Fish as FishType } from '../types';

interface FishCensusProps {
  fishes: FishType[];
}

const FishCensus: React.FC<FishCensusProps> = ({ fishes }) => {
  const [isOpen, setIsOpen] = useState(false);

  // Derive stats
  const total = fishes.length;
  const behaviors = {
    cruise: 0,
    dart: 0,
    loiter: 0,
    conga: 0,
    curious: 0,
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
        className="fixed bottom-[5.5rem] left-8 z-40 p-3 rounded-full backdrop-blur-sm text-white shadow-lg border hover:scale-110 focus:outline-none focus:ring-2 focus:ring-opacity-75 focus:ring-cyan-400 transition-all duration-300 bg-cyan-500/30 border-cyan-400/30 hover:bg-cyan-500/50"
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
    <div className="fixed bottom-[5.5rem] left-8 z-50 bg-slate-900/60 backdrop-blur-xl border border-cyan-500/30 rounded-2xl p-5 shadow-2xl w-64 text-slate-200 pointer-events-auto">
      <div className="flex justify-between items-center mb-4 pb-2 border-b border-cyan-500/20">
        <h3 className="text-cyan-300 font-bold tracking-wider text-sm flex items-center gap-2">
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
          <div className="text-xs text-cyan-500/70 mb-2 font-sans tracking-widest uppercase">Live Behaviors</div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            <div className="flex justify-between">
              <span className="text-slate-400">Schooling</span>
              <span className="text-cyan-100">{behaviors.cruise}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Conga</span>
              <span className="text-purple-300">{behaviors.conga}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Darting</span>
              <span className="text-orange-300">{behaviors.dart}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Curious</span>
              <span className="text-pink-300">{behaviors.curious}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Loitering</span>
              <span className="text-slate-300">{behaviors.loiter}</span>
            </div>
          </div>
        </div>

        {/* Dynamic Activity Meter */}
        <div className="mt-4 pt-3 border-t border-cyan-500/20">
          <div className="flex justify-between items-center mb-1 text-xs text-slate-400">
            <span>Activity Level</span>
            <span>{Math.round(((behaviors.dart + behaviors.curious) / Math.max(1, total)) * 100)}%</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div 
              className="bg-gradient-to-r from-cyan-500 to-purple-500 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${Math.min(100, ((behaviors.dart + behaviors.curious) / Math.max(1, total)) * 100 * 2)}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default FishCensus;
