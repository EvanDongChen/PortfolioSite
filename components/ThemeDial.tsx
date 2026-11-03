import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Page, useTheme } from '../contexts/ThemeContext';
import { usePerformance } from '../contexts/PerformanceContext';
import './ThemeDial.css';

// The dial is drawn on a grid of 56 units, one unit an art pixel (4 screen
// pixels): a D-shaped gauge opening to the left of the knob, with the three
// pages as stations round its rim. On the pixel pages every part of it is
// whole cells (the needle re-drawn cell by cell as it swings); on the
// aquarium it is drawn smooth.
const UNIT = 4;
const C = 28;
const SIZE = C * 2;
/** The face's radius, the knob's, and how far out the stations' icons sit. */
const R = 27;
const KNOB = 6;
const ICON_R = 15.5;
/** How far the needle can be turned either way (degrees from pointing straight left, down positive). */
const SWING = 72;

interface Station { page: Page; label: string; angle: number; icon: string[] }
const STATIONS: Station[] = [
  {
    page: 'aquarium', label: 'Aquarium', angle: -50,
    icon: ['.XX...XX...', 'X..X.X..X.X', '....X....X.', '...........', '.XX...XX...', 'X..X.X..X.X', '....X....X.'],
  },
  {
    page: 'reef', label: 'Reef', angle: 0,
    icon: ['.....XXX..', '...XXXXXX.', 'X.XXXXXX.X', 'XXXXXXXO.X', 'X.XXXXXXX.', '...XXXXX..', '.....XX...'],
  },
  {
    page: 'pond', label: 'Pond', angle: 50,
    icon: ['...OO..OO...', '...OO..OO...', '...XXXX.....', '.XXXXXXXX...', 'XXXXXXXXX..X', 'XXXXXXXXXXXX', '.XXXXXXXXXX.', '...XXXXXX...'],
  },
];
const angleOf = (page: Page) => STATIONS.find(s => s.page === page)!.angle;
const rad = (deg: number) => (deg * Math.PI) / 180;
/** A point `r` out from the centre along a dial angle. */
const along = (deg: number, r: number) => ({ x: C - Math.cos(rad(deg)) * r, y: C + Math.sin(rad(deg)) * r });

type Cell = [number, number, string];

/** Cells into runs along each row, one rect per run of a colour. */
const runs = (cells: Cell[]) => {
  const byRow = new Map<string, Cell[]>();
  for (const c of cells) {
    const k = `${c[1]}|${c[2]}`;
    (byRow.get(k) ?? byRow.set(k, []).get(k)!).push(c);
  }
  const out: { x: number; y: number; w: number; cls: string }[] = [];
  for (const row of byRow.values()) {
    row.sort((a, b) => a[0] - b[0]);
    let start = row[0][0], prev = start;
    for (let k = 1; k <= row.length; k++) {
      const x = row[k]?.[0];
      if (x === prev + 1) { prev = x; continue; }
      out.push({ x: start, y: row[0][1], w: prev - start + 1, cls: row[0][2] });
      if (x !== undefined) { start = x; prev = x; }
    }
  }
  return out;
};

/** The face, its rim and ticks, as cells: lit along the top, deeper toward the rim. */
const faceCells = (): Cell[] => {
  const cells: Cell[] = [];
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const px = x + 0.5 - C, py = y + 0.5 - C, d = Math.hypot(px, py);
      const inFace = (px <= 0.5 && d <= R) || d <= KNOB + 2.5;
      if (!inFace) continue;
      const rim = d > R - 1.5 || (px > -1 && d > KNOB + 1.5);
      if (rim) cells.push([x, y, py < 0 ? 'td-rim-lit' : 'td-rim']);
      else cells.push([x, y, d > R - 3 ? 'td-face-deep' : 'td-face']);
    }
  }
  // Ticks round the rim, the stations' longer and brighter.
  const ticks: Cell[] = [];
  for (let a = -SWING; a <= SWING; a += 9) {
    const major = STATIONS.some(s => Math.abs(s.angle - a) < 4.5);
    for (let r = major ? R - 5.5 : R - 4; r <= R - 2.5; r += 0.5) {
      const p = along(major ? STATIONS.find(s => Math.abs(s.angle - a) < 4.5)!.angle : a, r);
      ticks.push([Math.floor(p.x), Math.floor(p.y), major ? 'td-tick-major' : 'td-tick']);
    }
  }
  const at = new Map(cells.map(c => [`${c[0]},${c[1]}`, c]));
  for (const t of ticks) { const c = at.get(`${t[0]},${t[1]}`); if (c) c[2] = t[2]; }
  return cells;
};

/** The knob: a round cap lit from the upper left, a ring of grip, and a notch toward the needle. */
const knobCells = (deg: number): Cell[] => {
  const cells: Cell[] = [];
  for (let y = C - KNOB - 1; y <= C + KNOB; y++) {
    for (let x = C - KNOB - 1; x <= C + KNOB; x++) {
      const px = x + 0.5 - C, py = y + 0.5 - C, d = Math.hypot(px, py);
      if (d > KNOB) continue;
      const lit = -px * 0.6 - py * 0.8;
      cells.push([x, y, d < 2 ? 'td-cap' : d > KNOB - 1.2 ? (lit > 0 ? 'td-knob-lit' : 'td-knob-shade') : 'td-knob']);
    }
  }
  const n = along(deg, KNOB - 1.6);
  cells.push([Math.floor(n.x), Math.floor(n.y), 'td-notch']);
  return cells;
};

/** The needle, cell by cell along its angle: a stub of tail behind the cap, thicker at its root, a bright tip. */
const needleCells = (deg: number): Cell[] => {
  const seen = new Set<string>();
  const cells: Cell[] = [];
  const put = (x: number, y: number, cls: string) => {
    const k = `${x},${y}`;
    if (seen.has(k)) return;
    seen.add(k);
    cells.push([x, y, cls]);
  };
  const side = { x: Math.sin(rad(deg)), y: Math.cos(rad(deg)) };
  for (let t = KNOB + 0.5; t <= ICON_R - 5; t += 0.4) {
    const p = along(deg, t);
    put(Math.floor(p.x), Math.floor(p.y), t > ICON_R - 6.5 ? 'td-needle-tip' : 'td-needle');
    if (t < KNOB + 3) put(Math.floor(p.x + side.x * 0.8), Math.floor(p.y + side.y * 0.8), 'td-needle-dark');
  }
  return cells;
};

const Cells: React.FC<{ cells: Cell[] }> = ({ cells }) => (
  <>
    {runs(cells).map((r, k) => <rect key={k} x={r.x} y={r.y} width={r.w} height={1} className={r.cls} />)}
  </>
);

/** A station's icon, centred on a point, as cells. */
const Icon: React.FC<{ icon: string[]; x: number; y: number }> = ({ icon, x, y }) => {
  const w = icon[0].length, h = icon.length;
  const x0 = Math.round(x - w / 2), y0 = Math.round(y - h / 2);
  const cells: Cell[] = [];
  icon.forEach((row, j) => [...row].forEach((ch, i) => {
    if (ch !== '.') cells.push([x0 + i, y0 + j, ch === 'O' ? 'td-icon-eye' : 'td-icon']);
  }));
  return <Cells cells={cells} />;
};

/**
 * Switches between the three pages: a knob in the right-hand stack that
 * opens into a gauge. Click a station (or turn the knob, or use the arrow
 * keys and Enter) and the needle swings over to it, springing past and
 * settling, before the page changes.
 */
const ThemeDial: React.FC = () => {
  const { page, setPage } = useTheme();
  const { reducedMotion } = usePerformance();
  const pixel = page !== 'aquarium';
  const [open, setOpen] = useState(false);
  const [angle, setAngle] = useState(() => angleOf(page));
  const [hover, setHover] = useState<Page | null>(null);
  const [chosen, setChosen] = useState<Page | null>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const knob = useRef<HTMLButtonElement>(null);
  const spring = useRef({ a: angleOf(page), v: 0, target: angleOf(page), raf: 0 });
  const drag = useRef<{ id: number; x: number; y: number; moved: boolean } | null>(null);
  const timer = useRef(0);
  /** Set when a turn of the knob ends, so the click that follows it doesn't also close the dial. */
  const turned = useRef(false);

  // The needle springs toward its target, overshooting a little and settling.
  const run = useCallback(() => {
    const s = spring.current;
    if (s.raf) return;
    const step = () => {
      if (reducedMotion) { s.a = s.target; s.v = 0; }
      else { s.v = (s.v + (s.target - s.a) * 0.16) * 0.72; s.a += s.v; }
      setAngle(s.a);
      if (Math.abs(s.target - s.a) < 0.05 && Math.abs(s.v) < 0.05) { s.a = s.target; setAngle(s.a); s.raf = 0; return; }
      s.raf = requestAnimationFrame(step);
    };
    s.raf = requestAnimationFrame(step);
  }, [reducedMotion]);

  const aim = useCallback((deg: number) => { spring.current.target = deg; run(); }, [run]);

  useEffect(() => () => { cancelAnimationFrame(spring.current.raf); clearTimeout(timer.current); }, []);

  const close = useCallback(() => {
    setOpen(false);
    setChosen(null);
    aim(angleOf(page));
  }, [aim, page]);

  const choose = useCallback((to: Page) => {
    if (chosen) return;
    aim(angleOf(to));
    if (to === page) { timer.current = window.setTimeout(close, 300); return; }
    setChosen(to);
    // Let the needle land before the page goes.
    timer.current = window.setTimeout(() => setPage(to), reducedMotion ? 150 : 650);
  }, [aim, chosen, close, page, reducedMotion, setPage]);

  // Clicks elsewhere and Escape close it.
  useEffect(() => {
    if (!open) return;
    const down = (e: PointerEvent) => { if (!wrap.current?.contains(e.target as Node)) close(); };
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') { close(); knob.current?.focus(); } };
    document.addEventListener('pointerdown', down);
    document.addEventListener('keydown', key);
    return () => { document.removeEventListener('pointerdown', down); document.removeEventListener('keydown', key); };
  }, [open, close]);

  const centre = () => {
    const r = wrap.current!.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  };
  const nearest = (deg: number) => STATIONS.reduce((a, b) => (Math.abs(b.angle - deg) < Math.abs(a.angle - deg) ? b : a));

  // Turning the knob: the needle follows the pointer round, and snaps to the nearest station when let go.
  const onPointerDown = (e: React.PointerEvent) => {
    if (!open || chosen) return;
    drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY, moved: false };
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    if (!d.moved && Math.hypot(e.clientX - d.x, e.clientY - d.y) < 5) return;
    d.moved = true;
    const c = centre();
    const deg = (Math.atan2(e.clientY - c.y, -(e.clientX - c.x)) * 180) / Math.PI;
    aim(Math.max(-SWING, Math.min(SWING, deg)));
    setHover(nearest(deg).page);
  };
  const onPointerUp = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    drag.current = null;
    if (d.moved) { turned.current = true; setHover(null); choose(nearest(spring.current.target).page); }
  };

  const onKnobClick = () => {
    if (turned.current) { turned.current = false; return; }
    if (!open) { setOpen(true); return; }
    close();
  };
  const onKnobKey = (e: React.KeyboardEvent) => {
    if (!open || chosen) return;
    const k = STATIONS.findIndex(s => s.page === nearest(spring.current.target).page);
    if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') { e.preventDefault(); aim(STATIONS[Math.max(0, k - 1)].angle); }
    else if (e.key === 'ArrowDown' || e.key === 'ArrowRight') { e.preventDefault(); aim(STATIONS[Math.min(STATIONS.length - 1, k + 1)].angle); }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); choose(STATIONS[k].page); }
  };

  const face = useMemo(() => faceCells(), []);
  const pointing = nearest(angle).page;
  const current = STATIONS.find(s => s.page === page)!;
  const label = open ? `Choose a page (now on the ${current.label.toLowerCase()})` : `Switch page: now on the ${current.label.toLowerCase()}`;
  const tip = along(angle, ICON_R - 5);

  return (
    <div
      ref={wrap}
      className={`theme-dial fixed right-8 ${page === 'aquarium' ? 'bottom-[12.5rem]' : 'bottom-[9rem]'} z-[60] h-12 w-12 ${pixel ? 'theme-dial--pixel' : 'theme-dial--smooth'} ${open ? 'is-open' : ''} ${chosen ? 'is-chosen' : ''}`}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <svg
        className="theme-dial-svg"
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        width={SIZE * UNIT}
        height={SIZE * UNIT}
        shapeRendering={pixel ? 'crispEdges' : 'geometricPrecision'}
        aria-hidden="true"
      >
        <g className="theme-dial-face" onPointerDown={onPointerDown}>
          {pixel ? <Cells cells={face} /> : (
            <>
              <path className="td-face" d={`M ${C + 0.5} ${C - R} A ${R} ${R} 0 0 0 ${C + 0.5} ${C + R} Z`} />
              <circle className="td-face" cx={C} cy={C} r={KNOB + 2.5} />
              <path className="td-rim-line" d={`M ${C + 0.5} ${C - R + 0.75} A ${R - 0.75} ${R - 0.75} 0 0 0 ${C + 0.5} ${C + R - 0.75}`} />
              {Array.from({ length: (SWING * 2) / 9 + 1 }, (_, k) => -SWING + k * 9).map(a => {
                const st = STATIONS.find(s => Math.abs(s.angle - a) < 4.5);
                const p0 = along(st ? st.angle : a, st ? R - 5.5 : R - 4), p1 = along(st ? st.angle : a, R - 2.5);
                return <line key={a} className={st ? 'td-tick-major' : 'td-tick'} x1={p0.x} y1={p0.y} x2={p1.x} y2={p1.y} />;
              })}
            </>
          )}
          {STATIONS.map(s => {
            const p = along(s.angle, ICON_R);
            const lit = s.page === (chosen ?? hover ?? pointing);
            return (
              <g
                key={s.page}
                className={`td-station ${lit ? 'is-lit' : ''} ${s.page === page ? 'is-current' : ''} ${s.page === chosen ? 'is-picked' : ''}`}
                role="button"
                tabIndex={open ? 0 : -1}
                aria-label={`Switch to the ${s.label.toLowerCase()}`}
                onClick={() => choose(s.page)}
                onPointerEnter={() => setHover(s.page)}
                onPointerLeave={() => setHover(null)}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); choose(s.page); } }}
              >
                <circle className="td-station-hit" cx={p.x} cy={p.y + 1.5} r={7.5} />
                <Icon icon={s.icon} x={p.x} y={p.y - 1} />
                <text className="td-label" x={p.x} y={p.y + 6.6} textAnchor="middle">{s.label.toUpperCase()}</text>
              </g>
            );
          })}
        </g>
        {pixel ? (
          <>
            <g className="td-needle-g"><Cells cells={needleCells(angle)} /></g>
            <Cells cells={knobCells(angle)} />
          </>
        ) : (
          <>
            <line className="td-needle-line" x1={C} y1={C} x2={tip.x} y2={tip.y} />
            <circle className="td-needle-tip" cx={tip.x} cy={tip.y} r={0.9} />
            <circle className="td-knob" cx={C} cy={C} r={KNOB} />
            <circle className="td-knob-ring" cx={C} cy={C} r={KNOB - 0.6} />
            <circle className="td-cap" cx={C} cy={C} r={1.8} />
            <circle className="td-notch" cx={along(angle, KNOB - 1.8).x} cy={along(angle, KNOB - 1.8).y} r={0.7} />
          </>
        )}
      </svg>
      <button
        ref={knob}
        type="button"
        className="theme-dial-knob"
        aria-label={label}
        title={open ? 'Turn the dial, or pick a page' : 'Switch page'}
        aria-expanded={open}
        onClick={onKnobClick}
        onKeyDown={onKnobKey}
        onPointerDown={onPointerDown}
      />
    </div>
  );
};

export default React.memo(ThemeDial);
