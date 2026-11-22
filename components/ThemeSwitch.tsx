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
  // A ringed planet.
  space: ['.......XX..', '..XXXX.X...', '.XXXXXX....', 'XXXOXXXX..X', 'XXXXXXXXXX.', '..XXXXXXX..', 'X.XXXXXX...', '.XXXXXXX...', '...XXXX....'],
  // A floating island, with a tree on top and its underside tapering away.
  sky: ['......XX....', '.....XXXX...', '......XX....', '......X.....', 'XXXXXXXXXXXX', '.XXXXXXXXXX.', '..XXXXXXXX..', '...XXOXXX...', '....XXXX....', '.....XX.....'],
  // A pot with steam rising off it.
  hotpot: ['..X...X...X.', '.X...X...X..', '..X...X...X.', '............', 'XXXXXXXXXXXX', '.XXXXXXXXXX.', '.XXXXXXXXXX.', '.XXXXXXXXXX.', '..XXXXXXXX..'],
  // A pair of eyes peering out from between two pines.
  cryptid: ['..X......X..', '..X......X..', '.XXX....XXX.', '.XXX....XXX.', 'XXXXX..XXXXX', '.XXX....XXX.', 'XXXXX..XXXXX', '..X..XX...X.', '..X.....X.X.', '..X......X..'],
  // A lily pad with a frog's eyes peeping over it.
  pond: ['...XX..XX...', '...XX..XX...', '............', '...XXXX.....', '.XXXXXXXX...', 'XXXXXXXXX..X', 'XXXXXXXXXXXX', '.XXXXXXXXXX.', '...XXXXXX...'],
};
const PAGES: { page: SwitchPage; label: string }[] = [
  { page: 'reef', label: 'Pixel reef' },
  { page: 'pond', label: 'Pixel pond' },
  { page: 'shrine', label: 'Shrine forest' },
  { page: 'space', label: 'Deep space' },
  { page: 'sky', label: 'Sky islands' },
  { page: 'hotpot', label: 'Hotpot' },
  { page: 'cryptid', label: 'Cryptid forest' },
];

const Icon: React.FC<{ page: SwitchPage }> = ({ page }) => {
  const rows = ICONS[page];
  return (
    <svg className="theme-switch-icon" viewBox={`0 0 ${rows[0].length} ${rows.length}`} fill="currentColor" shapeRendering="crispEdges" aria-hidden="true">
      {rows.flatMap((row, y) => [...row].map((ch, x) => (ch === 'X' ? <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" /> : null)))}
    </svg>
  );
};

/** Narrow or short screens, where the six stops would stand over the page's text. */
const COMPACT = '(max-width: 767px), (max-height: 640px)';
const useCompact = () => {
  const [compact, setCompact] = useState(() => window.matchMedia?.(COMPACT).matches ?? false);
  useEffect(() => {
    const mq = window.matchMedia?.(COMPACT);
    if (!mq) return;
    const update = () => setCompact(mq.matches);
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  return compact;
};

/**
 * Switches between the pixel pages: a switch in the right-hand
 * stack, its stops on the stack's spacing. Click a page's icon and the
 * thumb springs over to it, then the page changes; arrow keys move between
 * the stops, Enter or Space picks one. On the archived aquarium no stop is
 * lit, and any of them leads back. On a small screen it folds into one
 * stack button showing the current world, which opens a menu of them all.
 */
const ThemeSwitch: React.FC = () => {
  const { page, setPage } = useTheme();
  const [picked, setPicked] = useState<Page>(page);
  const timer = useRef(0);
  const stops = useRef<(HTMLButtonElement | null)[]>([]);
  const compact = useCompact();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  useEffect(() => () => clearTimeout(timer.current), []);

  // The menu closes on a tap outside it or Escape, and when the screen grows back.
  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); toggle.current?.focus(); } };
    document.addEventListener('pointerdown', away);
    document.addEventListener('keydown', esc);
    stops.current[Math.max(0, PAGES.findIndex(p => p.page === picked))]?.focus();
    return () => { document.removeEventListener('pointerdown', away); document.removeEventListener('keydown', esc); };
  }, [open]);
  useEffect(() => { if (!compact) setOpen(false); }, [compact]);

  const pick = (to: Page) => {
    if (to === picked) return;
    setPicked(to);
    // Let the thumb start on its way, then the page's transition ripples out from this stop.
    const box = stops.current[PAGES.findIndex(p => p.page === to)]?.getBoundingClientRect();
    const origin = box ? { x: box.left + box.width / 2, y: box.top + box.height / 2 } : undefined;
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    timer.current = window.setTimeout(() => setPage(to, origin), reduced ? 0 : 140);
  };

  const onKeyDown = (e: React.KeyboardEvent, k: number) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(PAGES[k].page); return; }
    const step = e.key === 'ArrowUp' || e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : 0;
    if (!step) return;
    e.preventDefault();
    stops.current[Math.max(0, Math.min(PAGES.length - 1, k + step))]?.focus();
  };

  const at = PAGES.findIndex(p => p.page === picked);
  const bottom = page === 'aquarium' ? 'bottom-[12.5rem]' : 'bottom-[9rem]';

  if (compact) {
    const current = at >= 0 ? PAGES[at] : null;
    return (
      <div ref={box} className={`theme-switch-compact fixed right-8 ${bottom} z-[55]`}>
        <button
          ref={toggle}
          type="button"
          className="hud-btn theme-switch-toggle h-12 w-12 rounded-full border shadow-lg flex items-center justify-center"
          aria-label={current ? `Choose a page (now ${current.label})` : 'Choose a page'}
          aria-haspopup="true"
          aria-expanded={open}
          aria-pressed={open}
          onClick={() => setOpen(o => !o)}
        >
          {current ? <Icon page={current.page} /> : <Icon page="reef" />}
        </button>
        {open && (
          <div role="radiogroup" aria-label="Choose a page" className="theme-switch-menu">
            {PAGES.map(({ page: p, label }, k) => (
              <button
                key={p}
                ref={el => { stops.current[k] = el; }}
                type="button"
                role="radio"
                aria-checked={p === picked}
                aria-label={label}
                tabIndex={p === picked || (at < 0 && k === 0) ? 0 : -1}
                className={`theme-switch-item ${p === picked ? 'is-on' : ''}`}
                onClick={() => { setOpen(false); pick(p); }}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(false); pick(p); return; }
                  onKeyDown(e, k);
                }}
              >
                <Icon page={p} />
                <span>{label}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      role="radiogroup"
      aria-label="Choose a page"
      className={`theme-switch fixed right-8 ${bottom} z-[55]`}
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
