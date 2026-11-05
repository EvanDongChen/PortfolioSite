import React, { useEffect, useRef, useState } from 'react';
import { Page, useTheme } from '../contexts/ThemeContext';
import './ThemeSwitch.css';

// The pages on the switch; the aquarium is archived, in the settings panel.
type SwitchPage = Exclude<Page, 'aquarium'>;

// Pixel icons for them ('X' drawn, 'O' cut out of it).
const ICONS: Record<SwitchPage, string[]> = {
  // A little reef fish.
  reef: ['.....XXX..', '...XXXXXX.', 'X.XXXXXX.X', 'XXXXXXXO.X', 'X.XXXXXXX.', '...XXXXX..', '.....XX...'],
  // A torii gate.
  shrine: ['X..........X', 'XXXXXXXXXXXX', '.XXXXXXXXXX.', '..X......X..', 'XXXXXXXXXXXX', '..X......X..', '..X......X..', '..X......X..', '.XX......XX.'],
  // A lily pad with a frog's eyes peeping over it.
  pond: ['...XX..XX...', '...XX..XX...', '............', '...XXXX.....', '.XXXXXXXX...', 'XXXXXXXXX..X', 'XXXXXXXXXXXX', '.XXXXXXXXXX.', '...XXXXXX...'],
};
const PAGES: { page: SwitchPage; label: string }[] = [
  { page: 'reef', label: 'Pixel reef' },
  { page: 'pond', label: 'Pixel pond' },
  { page: 'shrine', label: 'Shrine forest' },
];

const Icon: React.FC<{ page: SwitchPage }> = ({ page }) => {
  const rows = ICONS[page];
  return (
    <svg className="theme-switch-icon" viewBox={`0 0 ${rows[0].length} ${rows.length}`} fill="currentColor" shapeRendering="crispEdges" aria-hidden="true">
      {rows.flatMap((row, y) => [...row].map((ch, x) => (ch === 'X' ? <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" /> : null)))}
    </svg>
  );
};

/**
 * Switches between the three pixel pages: a three-way switch in the right-hand
 * stack, its stops on the stack's spacing. Click a page's icon and the
 * thumb springs over to it, then the page changes; arrow keys move between
 * the stops, Enter or Space picks one. On the archived aquarium no stop is
 * lit, and any of them leads back.
 */
const ThemeSwitch: React.FC = () => {
  const { page, setPage } = useTheme();
  const [picked, setPicked] = useState<Page>(page);
  const timer = useRef(0);
  const stops = useRef<(HTMLButtonElement | null)[]>([]);
  useEffect(() => () => clearTimeout(timer.current), []);

  const pick = (to: Page) => {
    if (to === picked) return;
    setPicked(to);
    // Let the thumb land before the page goes.
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    timer.current = window.setTimeout(() => setPage(to), reduced ? 0 : 420);
  };

  const onKeyDown = (e: React.KeyboardEvent, k: number) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(PAGES[k].page); return; }
    const step = e.key === 'ArrowUp' || e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : 0;
    if (!step) return;
    e.preventDefault();
    stops.current[Math.max(0, Math.min(PAGES.length - 1, k + step))]?.focus();
  };

  const at = PAGES.findIndex(p => p.page === picked);
  return (
    <div
      role="radiogroup"
      aria-label="Choose a page"
      className={`theme-switch fixed right-8 ${page === 'aquarium' ? 'bottom-[12.5rem]' : 'bottom-[9rem]'} z-[55]`}
      style={{ '--at': at } as React.CSSProperties}
    >
      {at >= 0 && <span className="theme-switch-thumb" aria-hidden="true" />}
      {PAGES.map(({ page: p, label }, k) => (
        <button
          key={p}
          ref={el => { stops.current[k] = el; }}
          type="button"
          role="radio"
          aria-checked={p === picked}
          aria-label={label}
          tabIndex={p === picked || (at < 0 && k === 0) ? 0 : -1}
          className={`theme-switch-stop ${p === picked ? 'is-on' : ''}`}
          onClick={() => pick(p)}
          onKeyDown={e => onKeyDown(e, k)}
        >
          <Icon page={p} />
          <span className="theme-switch-label">{label}</span>
        </button>
      ))}
    </div>
  );
};

export default React.memo(ThemeSwitch);
