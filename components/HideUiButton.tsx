import React, { useCallback, useEffect, useState } from 'react';

/** The class on <html> that hides the page's UI (see index.css). */
const HIDDEN_CLASS = 'ui-hidden';

const isTyping = (e: KeyboardEvent) =>
  !!(e.target as Element | null)?.closest?.('input, textarea, select, [contenteditable="true"]');

/**
 * Hides everything over the world (the portfolio content, the header and the
 * fixed buttons and panels) so a visitor can just watch it, then brings it all
 * back. It stays in the right-hand stack while the rest is hidden. H toggles it,
 * and Escape brings the UI back.
 */
const HideUiButton: React.FC = () => {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle(HIDDEN_CLASS, hidden);
    return () => root.classList.remove(HIDDEN_CLASS);
  }, [hidden]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || isTyping(e)) return;
      if (e.key === 'h' || e.key === 'H') setHidden(h => !h);
      else if (e.key === 'Escape') setHidden(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const toggle = useCallback(() => setHidden(h => !h), []);
  const label = hidden ? 'Show the page (H)' : 'Hide the page to watch the world (H)';

  return (
    <button
      type="button"
      onClick={toggle}
      className="hud-btn ui-toggle fixed bottom-[9rem] right-8 z-[55] h-12 w-12 rounded-full backdrop-blur-sm shadow-lg border bg-cyan-500/30 border-cyan-400/30 hover:bg-cyan-500/50 text-slate-100 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-opacity-75 transition-all duration-300 flex items-center justify-center"
      title={label}
      aria-label={label}
      aria-pressed={hidden}
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
        {!hidden && <path d="M3 3l18 18" />}
      </svg>
    </button>
  );
};

export default React.memo(HideUiButton);
