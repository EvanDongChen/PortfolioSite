import React, { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';

export type PerformanceTier = 'low' | 'medium' | 'high';
export type SimulationFrameRate = 30 | 60;

interface PerformanceContextType {
  /** Current adaptive quality tier. Starts as a device-based guess, then can
   * only be downgraded further if measured frame times are actually poor.
   * Reflects `override` when one is set. */
  tier: PerformanceTier;
  /** True if the OS/browser asked for reduced motion; independent of tier. */
  reducedMotion: boolean;
  /** Manually forced tier (for debugging), or null to use automatic detection. */
  override: PerformanceTier | null;
  /** Force a specific tier, or pass null to hand control back to auto-detection. */
  setOverride: (tier: PerformanceTier | null) => void;
  /** Frame rate cap for the fish/particle simulation loops. Defaults to 30;
   * user can opt into 60 for smoother motion on hardware that can handle it. */
  frameRate: SimulationFrameRate;
  setFrameRate: (frameRate: SimulationFrameRate) => void;
}

const PerformanceContext = createContext<PerformanceContextType | undefined>(undefined);

// Cheap, synchronous signals available before we've measured a single frame.
// None of these are reliable in isolation (a powerful phone can have low
// hardwareConcurrency reporting, a laptop can be on battery saver, etc.), so
// this is only used as a starting guess that live FPS sampling then corrects.
const guessInitialTier = (): PerformanceTier => {
  if (typeof navigator === 'undefined') return 'high';

  const cores = navigator.hardwareConcurrency ?? 8;
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8;
  const isCoarsePointer = typeof window !== 'undefined'
    && window.matchMedia?.('(pointer: coarse)').matches;

  if (cores <= 2 || memory <= 2) return 'low';
  if (cores <= 4 || memory <= 4 || isCoarsePointer) return 'medium';
  return 'high';
};

// Sustained low FPS over this window triggers a downgrade. Kept generous so a
// brief GC pause or tab-switch hiccup doesn't overreact.
const SAMPLE_WINDOW_MS = 4000;
const LOW_FPS_THRESHOLD = 33; // below this on a 60fps display => downgrade
const VERY_LOW_FPS_THRESHOLD = 20; // below this => drop straight to 'low'
const REEVALUATION_COOLDOWN_MS = 8000;

const downgrade = (tier: PerformanceTier): PerformanceTier => {
  if (tier === 'high') return 'medium';
  return 'low';
};

export const PerformanceProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [tier, setTier] = useState<PerformanceTier>(() => guessInitialTier());
  const [reducedMotion, setReducedMotion] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  );
  const [override, setOverride] = useState<PerformanceTier | null>(null);
  const [frameRate, setFrameRate] = useState<SimulationFrameRate>(30);
  const tierRef = useRef(tier);
  tierRef.current = tier;
  const effectiveTier = override ?? tier;

  useEffect(() => {
    const media = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!media) return;
    const onChange = () => setReducedMotion(media.matches);
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    if (reducedMotion) return; // already as low-motion as the site gets; skip sampling churn
    if (tierRef.current === 'low') return; // nothing further to downgrade to

    let frameCount = 0;
    let windowStart = performance.now();
    let lastReevaluation = 0;
    let rafId = 0;
    let cancelled = false;

    const tick = (time: number) => {
      if (cancelled) return;
      frameCount += 1;
      const elapsed = time - windowStart;

      if (elapsed >= SAMPLE_WINDOW_MS) {
        const fps = (frameCount / elapsed) * 1000;
        if (time - lastReevaluation > REEVALUATION_COOLDOWN_MS) {
          if (fps < VERY_LOW_FPS_THRESHOLD && tierRef.current !== 'low') {
            setTier('low');
            lastReevaluation = time;
          } else if (fps < LOW_FPS_THRESHOLD && tierRef.current === 'high') {
            setTier(downgrade(tierRef.current));
            lastReevaluation = time;
          }
        }
        frameCount = 0;
        windowStart = time;

        if (tierRef.current === 'low') return; // stop sampling once fully downgraded
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
    };
    // Re-arm sampling whenever the tier changes, so a downgrade from
    // 'high'->'medium' keeps watching for a further drop to 'low'.
  }, [tier, reducedMotion]);

  return (
    <PerformanceContext.Provider value={{ tier: effectiveTier, reducedMotion, override, setOverride, frameRate, setFrameRate }}>
      {children}
    </PerformanceContext.Provider>
  );
};

export const usePerformance = () => {
  const context = useContext(PerformanceContext);
  if (context === undefined) {
    throw new Error('usePerformance must be used within a PerformanceProvider');
  }
  return context;
};
