import React, { useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { usePerformance, PerformanceTier, SimulationFrameRate } from '../contexts/PerformanceContext';

interface PerformancePanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const TIER_LABELS: Record<PerformanceTier, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
};

const TIER_DESCRIPTIONS: Record<PerformanceTier, string> = {
  low: 'Fewest fish, glow effects off. Best for older phones and low-power devices.',
  medium: 'Moderate fish count, glow effects reduced.',
  high: 'Full fish count and full glow effects.',
};

const PerformancePanel: React.FC<PerformancePanelProps> = ({ isOpen, onClose }) => {
  const { theme } = useTheme();
  const { tier, reducedMotion, override, setOverride, frameRate, setFrameRate } = usePerformance();

  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  const panelClasses = theme === 'deepsea'
    ? 'bg-black/80 border-emerald-400/30 text-emerald-100'
    : 'bg-slate-900/75 border-cyan-300/35 text-cyan-100';
  const mutedTextClasses = theme === 'deepsea' ? 'text-emerald-200/70' : 'text-cyan-200/75';
  const slotClasses = theme === 'deepsea'
    ? 'border-emerald-400/25 bg-emerald-950/30'
    : 'border-cyan-300/25 bg-cyan-950/30';
  const activeTierClasses = theme === 'deepsea'
    ? 'bg-emerald-500/40 border-emerald-300/60 text-emerald-50'
    : 'bg-cyan-500/40 border-cyan-300/60 text-cyan-50';
  const inactiveTierClasses = 'bg-white/5 border-white/15 hover:bg-white/10';

  const statusLabel = override
    ? `Forced to ${TIER_LABELS[override]}`
    : reducedMotion
      ? 'Reduced motion (system setting)'
      : 'Auto-detected';

  return (
    <>
      <div
        className={`fixed inset-0 z-[65] bg-black/40 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />
      <aside
        aria-hidden={!isOpen}
        className={`fixed z-[70] right-3 left-3 sm:left-auto sm:right-6 top-20 sm:top-24 w-auto sm:w-96 max-h-[calc(100vh-7rem)] rounded-2xl border shadow-2xl backdrop-blur-lg transition-all duration-300 overflow-hidden ${panelClasses} ${
          isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
        }`}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <h2 className="text-lg font-semibold tracking-wide">Performance</h2>
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 rounded-full border border-white/20 hover:bg-white/10 transition-colors"
            aria-label="Close performance settings"
          >
            x
          </button>
        </div>

        <div className="px-5 py-4 overflow-y-auto max-h-[calc(100vh-13rem)] space-y-4">
          <p className={`text-sm leading-relaxed ${mutedTextClasses}`}>
            This site automatically lowers fish count and glow effects on slower devices so the page stays smooth. You can override that here for testing, or to trade visuals for smoothness yourself.
          </p>

          <div className={`rounded-xl border p-3 ${slotClasses}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold">Current: {TIER_LABELS[tier]}</span>
              <span className={`text-[11px] ${mutedTextClasses}`}>{statusLabel}</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {(['low', 'medium', 'high'] as PerformanceTier[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setOverride(t)}
                  className={`rounded-lg border px-2 py-2 text-xs font-semibold uppercase tracking-wide transition-colors ${
                    override === t ? activeTierClasses : inactiveTierClasses
                  }`}
                  aria-pressed={override === t}
                >
                  {TIER_LABELS[t]}
                </button>
              ))}
            </div>
            <p className={`mt-2 text-[11px] leading-relaxed ${mutedTextClasses}`}>
              {TIER_DESCRIPTIONS[override ?? tier]}
            </p>
            <button
              type="button"
              onClick={() => setOverride(null)}
              disabled={override === null}
              className={`mt-3 w-full rounded-lg border px-2 py-2 text-xs font-semibold uppercase tracking-wide transition-colors ${
                override === null
                  ? 'bg-white/5 border-white/10 text-white/40 cursor-default'
                  : 'bg-white/5 border-white/15 hover:bg-white/10'
              }`}
            >
              Back to Auto
            </button>
          </div>

          <div className={`rounded-xl border p-3 ${slotClasses}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold">Simulation frame rate</span>
              <span className={`text-[11px] ${mutedTextClasses}`}>{frameRate} fps</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {([30, 60] as SimulationFrameRate[]).map((fps) => (
                <button
                  key={fps}
                  type="button"
                  onClick={() => setFrameRate(fps)}
                  className={`rounded-lg border px-2 py-2 text-xs font-semibold uppercase tracking-wide transition-colors ${
                    frameRate === fps ? activeTierClasses : inactiveTierClasses
                  }`}
                  aria-pressed={frameRate === fps}
                >
                  {fps} fps
                </button>
              ))}
            </div>
            <p className={`mt-2 text-[11px] leading-relaxed ${mutedTextClasses}`}>
              30fps (default) is easier on slower devices. 60fps is smoother but roughly doubles the simulation and rendering work per second.
            </p>
          </div>
        </div>
      </aside>
    </>
  );
};

export default React.memo(PerformancePanel);
