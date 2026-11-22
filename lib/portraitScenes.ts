/**
 * Live pixel-art backdrops for the profile portrait, one per pixel world.
 * Drawn on a tiny canvas (ART x ART art pixels) scaled up with nearest
 * neighbour: `paintStatic` once, then `paintFrame` each tick over it.
 * The person sits in front as a separate cutout image; motifs may pass
 * behind them, which is what sells the depth.
 */

export type PortraitWorld = 'reef' | 'pond' | 'shrine' | 'space' | 'sky' | 'hotpot';

export const ART = 120;

type Ctx = CanvasRenderingContext2D;
type Pal = Record<string, string>;

export interface PortraitScene {
  paintStatic(ctx: Ctx): void;
  paintFrame(ctx: Ctx, t: number): void;
}

// ---------- helpers ----------

function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let r = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

const wrap = (v: number, lo: number, hi: number) => lo + ((((v - lo) % (hi - lo)) + (hi - lo)) % (hi - lo));

function hex(h: string): [number, number, number] {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function mix(a: string, b: string, f: number) {
  const A = hex(a), B = hex(b);
  return `rgb(${Math.round(A[0] + (B[0] - A[0]) * f)},${Math.round(A[1] + (B[1] - A[1]) * f)},${Math.round(A[2] + (B[2] - A[2]) * f)})`;
}

/** Banded vertical gradient with a dithered seam between bands. */
function gradient(ctx: Ctx, top: string, bottom: string, bands = 7) {
  for (let y = 0; y < ART; y++) {
    const f = (y / ART) * bands;
    ctx.fillStyle = mix(top, bottom, Math.floor(f) / (bands - 1));
    ctx.fillRect(0, y, ART, 1);
    if (f % 1 > 0.82 && Math.floor(f) + 1 < bands) {
      ctx.fillStyle = mix(top, bottom, (Math.floor(f) + 1) / (bands - 1));
      for (let x = (y % 2); x < ART; x += 2) ctx.fillRect(x, y, 1, 1);
    }
  }
}

function sprite(ctx: Ctx, rows: string[], x: number, y: number, pal: Pal, flip = false, s = 2) {
  x = Math.round(x); y = Math.round(y);
  const w = rows[0].length;
  for (let j = 0; j < rows.length; j++) {
    const row = rows[j];
    for (let i = 0; i < w; i++) {
      const c = pal[row[flip ? w - 1 - i : i]];
      if (!c) continue;
      ctx.fillStyle = c;
      ctx.fillRect(x + i * s, y + j * s, s, s);
    }
  }
}

function disc(ctx: Ctx, cx: number, cy: number, r: number, col: string) {
  ctx.fillStyle = col;
  for (let y = Math.floor(cy - r - 1); y <= cy + r + 1; y++) {
    const dy = y - cy;
    if (dy * dy > r * r) continue;
    const half = Math.sqrt(r * r - dy * dy);
    const x0 = Math.ceil(cx - half), x1 = Math.floor(cx + half);
    if (x1 >= x0) ctx.fillRect(x0, y, x1 - x0 + 1, 1);
  }
}

function dot(ctx: Ctx, x: number, y: number, col: string, s = 1) {
  ctx.fillStyle = col;
  ctx.fillRect(Math.round(x), Math.round(y), s, s);
}

/** Spots that show round the person: off the head and above the shoulders. */
function visible(x: number, y: number, w: number, h: number) {
  const cx = x + w / 2, cy = y + h / 2;
  const head = ((cx - 61) / 24) ** 2 + ((cy - 32) / 28) ** 2 < 1;
  const body = cy > 58 && cx > 8 && cx < 112;
  return !head && !body;
}

function scatter(r: () => number, n: number, w: number, h: number, gap: number, area = [2, 2, ART - 2, ART - 2]) {
  const pts: [number, number][] = [];
  for (let tries = 0; pts.length < n && tries < 4000; tries++) {
    const x = area[0] + Math.floor(r() * (area[2] - w - area[0]));
    const y = area[1] + Math.floor(r() * (area[3] - h - area[1]));
    if (!visible(x, y, w, h)) continue;
    if (pts.some(([px, py]) => Math.abs(x - px) < gap && Math.abs(y - py) < gap)) continue;
    pts.push([x, y]);
  }
  return pts;
}

// ---------- sprites ----------

const FISH = ['..aa.....', '.aaaa..b.', 'abaaaaabb', 'aaaaaaabb', '.aaaa..b.', '..aa.....'];
const FISH_FLICK = ['..aa.....', '.aaaa...b', 'abaaaaabb', 'aaaaaaab.', '.aaaa....', '..aa.....'];
const FISH_S = ['.aa...', 'abaa.b', 'aaaabb', '.aa..b'];
// The pond page's own dragonfly and butterfly (lib/pond/pondArt.ts), facing right.
const DFLY0 = ['..ww..ww...', '...WW.WW...', 'aaaaaaaAAEE', '...WW.WW...', '..ww..ww...'];
const DFLY1 = ['...........', '...........', 'aaaaaaaAAEE', '..wwWWwwW..', '...........'];
const FLY_OPEN = ['WW.WW', 'wWBWw', '.W.W.'];
const FLY_HALF = ['.W.W.', '.WBW.', '.....'];
const PAD = ['..aaaa..', '.aaaaaa.', 'aaaab.aa', 'aaaaa..a', '.aaaaaa.', '..aaaa..'];
const LANTERN = ['..d..', '.ddd.', 'aabaa', 'abbba', 'abbba', 'aabaa', '.ddd.', '..d..'];
const TORII = [
  'aaaaaaaaaaaaaa', '.aaaaaaaaaaaa.', '...a......a...', '.aaaaaaaaaaaa.',
  '...a......a...', '...a......a...', '...a......a...', '...a......a...', '...a......a...', '...a......a...',
];
const PETAL = ['.a', 'aa'];
const STAR_SMALL = ['.a.', 'aba', '.a.'];
const STAR_BIG = ['...a...', '...a...', '..aba..', 'aabbbaa', '..aba..', '...a...', '...a...'];
const CLOUD = [
  '......aaaa..........', '....aaaaaaaa..aaa...', '..aaaaaaaaaaaaaaaaa.',
  '.aaaaaaaaaaaaaaaaaaa', 'abbbbbbbbbbbbbbbbbbb', '.bbbbbbbbbbbbbbbbbb.',
];
const BIRD_UP = ['a...a', '.a.a.', '..a..'];
const BIRD_DOWN = ['.....', 'aa.aa', '..a..'];
const CHILI = ['....g', '...gg', '..aa.', '.aab.', 'aaa..', 'aa...', 'a....'];
const ANISE = ['..a..', '.aba.', 'abbba', '.aba.', '..a..'];
const STEAM = ['.a..', 'a...', '.a..', '..a.', '.a..'];

// ---------- the worlds ----------

function reef(r: () => number): PortraitScene {
  const pals: Pal[] = [
    { a: '#ffb86b', b: '#ff7a5a' },
    { a: '#7fe0d8', b: '#3bb3c3' },
    { a: '#f6d36b', b: '#d9a03c' },
  ];
  const lanes = [8, 22, 36, 50, 14, 44, 30];
  const fish = lanes.map((y) => {
    const dir = r() < 0.5 ? -1 : 1;
    return { y, x0: r() * 140, v: dir * (6 + r() * 8), big: r() < 0.6, pal: pals[Math.floor(r() * 3)], ph: r() * 6 };
  });
  const bubbles = Array.from({ length: 10 }, () => ({
    x: r() < 0.5 ? 4 + r() * 28 : 92 + r() * 24, y0: r() * 140, v: 5 + r() * 6, s: r() < 0.4 ? 2 : 1, ph: r() * 6,
  }));
  return {
    paintStatic(ctx) {
      gradient(ctx, '#0e5a73', '#06263a');
    },
    paintFrame(ctx, t) {
      // light shafts sway a little
      ctx.fillStyle = 'rgba(160,240,240,0.10)';
      for (const sx of [10, 40, 88]) {
        const sway = Math.round(Math.sin(t * 0.4 + sx) * 2);
        for (let y = 0; y < 90; y++) {
          for (let x = sx + sway + (y >> 2); x < sx + sway + (y >> 2) + 6; x++) {
            if ((x + y) % 2 === 0) ctx.fillRect(x, y, 1, 1);
          }
        }
      }
      for (const f of fish) {
        const x = wrap(f.x0 + f.v * t, -22, ART + 4);
        const y = f.y + Math.sin(t * 2 + f.ph) * 1.2;
        const flick = Math.sin(t * 8 + f.ph) > 0;
        const rows = f.big ? (flick ? FISH_FLICK : FISH) : FISH_S;
        sprite(ctx, rows, x, y, f.pal, f.v > 0);
      }
      for (const b of bubbles) {
        const y = wrap(b.y0 - b.v * t, -4, ART + 4);
        dot(ctx, b.x + Math.sin(t * 2 + b.ph) * 1.5, y, '#bfeef0', b.s);
      }
    },
  };
}

function pond(r: () => number): PortraitScene {
  const pads = scatter(r, 4, 16, 12, 22).map(([x, y]) => ({ x, y, ph: r() * 6, flip: r() < 0.5 }));
  // Dragonflies dart from spot to spot and hover there, wings a-blur: a blue hawker and a red darter.
  const spot = () => {
    for (let i = 0; i < 200; i++) {
      const x = 2 + r() * (ART - 26), y = 2 + r() * 54;
      if (visible(x, y, 22, 10)) return { x, y };
    }
    return { x: 4, y: 4 };
  };
  const dflies = [
    { a: '#1f7090', A: '#3ab8d8' },
    { a: '#962824', A: '#e2483a' },
  ].map((c) => {
    const at = spot();
    return { ...at, tx: at.x, ty: at.y, hold: r() * 1.5, flip: false, ph: r() * 6,
      pal: { a: c.a, A: c.A, w: '#d8f0f4', W: '#a8d4e0', E: '#101214' } };
  });
  let lastT = 0;
  // Butterflies flutter in loose loops: a tortoiseshell, a cabbage white, a common blue and a brimstone.
  const butterflies = [
    { cx: 20, cy: 30, rx: 14, ry: 18, W: '#ec882c', w: '#3c281e' },
    { cx: 102, cy: 28, rx: 12, ry: 16, W: '#f6f6ee', w: '#464646' },
    { cx: 58, cy: 6, rx: 44, ry: 4, W: '#6e8eec', w: '#cedafa' },
    { cx: 100, cy: 52, rx: 10, ry: 5, W: '#f2e260', w: '#d6ba3c' },
  ].map((b) => ({ ...b, sp: 0.35 + r() * 0.3, ph: r() * 6, pal: { W: b.W, w: b.w, B: '#28221e' } }));
  const glints = scatter(r, 9, 2, 2, 10).map(([x, y]) => ({ x, y, ph: r() * 6, v: 1 + r() * 2 }));
  return {
    paintStatic(ctx) {
      gradient(ctx, '#6fae7c', '#2c5e45');
    },
    paintFrame(ctx, t) {
      for (const p of pads) {
        sprite(ctx, PAD, p.x, p.y + Math.sin(t * 1.2 + p.ph) * 1.3, { a: '#3f8a4a', b: '#f2b8cc' }, p.flip);
      }
      for (const g of glints) {
        if (Math.sin(t * g.v + g.ph) > 0.55) dot(ctx, g.x, g.y, '#e4f4d8');
      }
      const dt = Math.max(0, Math.min(0.25, t - lastT));
      lastT = t;
      for (const d of dflies) {
        if (d.hold > 0) {
          d.hold -= dt;
          if (d.hold <= 0) {
            const next = spot();
            d.tx = next.x; d.ty = next.y;
            d.flip = next.x < d.x;
          }
        } else {
          const dx = d.tx - d.x, dy = d.ty - d.y, dist = Math.hypot(dx, dy);
          const step = 70 * dt;
          if (dist <= step) { d.x = d.tx; d.y = d.ty; d.hold = 0.8 + r() * 1.8; }
          else { d.x += (dx / dist) * step; d.y += (dy / dist) * step; }
        }
        const buzz = Math.sin(t * 40 + d.ph) > 0;
        const hover = d.hold > 0 ? Math.sin(t * 5 + d.ph) * 0.8 : 0;
        sprite(ctx, buzz ? DFLY0 : DFLY1, d.x, d.y + hover, d.pal, d.flip);
      }
      for (const b of butterflies) {
        const a = b.ph + b.sp * t;
        const x = b.cx + Math.sin(a) * b.rx + Math.sin(a * 2.7) * 3 - 5;
        const y = b.cy + Math.sin(a * 1.6) * b.ry + Math.sin(t * 7 + b.ph) * 1.2 - 3;
        const heading = Math.cos(a) + Math.cos(a * 2.7) * 0.8;
        sprite(ctx, Math.sin(t * 11 + b.ph) > 0 ? FLY_OPEN : FLY_HALF, x, y, b.pal, heading < 0);
      }
    },
  };
}

function shrine(r: () => number): PortraitScene {
  const lanterns = [[10, 6], [96, 38], [100, 66]].map(([x, y]) => ({ x, y, ph: r() * 10 }));
  const petals = Array.from({ length: 12 }, () => ({ x0: r() * ART, y0: r() * ART, v: 4 + r() * 4, ph: r() * 6 }));
  return {
    paintStatic(ctx) {
      gradient(ctx, '#1c2040', '#0a0c1c');
      disc(ctx, 100, 15, 10, '#f4efe2');
      disc(ctx, 104, 12, 9, '#1c2040');
      sprite(ctx, TORII, 0, 44, { a: '#a8321e' });
    },
    paintFrame(ctx, t) {
      for (const l of lanterns) {
        const fl = 0.5 + 0.3 * Math.sin(t * 7 + l.ph) + 0.2 * Math.sin(t * 13.3 + l.ph * 2);
        disc(ctx, l.x + 5, l.y + 8, 10 + fl * 2, '#2e2236');
        disc(ctx, l.x + 5, l.y + 8, 7 + fl * 1.5, '#4a3030');
        sprite(ctx, LANTERN, l.x, l.y, { a: '#e8452e', b: fl > 0.6 ? '#ffe0a0' : '#ffc978', d: '#2a1a1a' });
      }
      for (const p of petals) {
        const x = wrap(p.x0 + p.v * 0.6 * t + Math.sin(t * 1.5 + p.ph) * 3, -4, ART + 2);
        const y = wrap(p.y0 + p.v * t, -4, ART + 2);
        if (!visible(x, y, 4, 4) && y > 58) continue; // they'd only show as specks on the shirt
        sprite(ctx, PETAL, x, y, { a: '#f2b8cc' }, Math.sin(t * 3 + p.ph) > 0);
      }
    },
  };
}

function ring(ctx: Ctx, cx: number, cy: number, rx: number, ry: number, col: string, front: boolean) {
  ctx.fillStyle = col;
  for (let i = 0; i < 720; i++) {
    const a = (i / 720) * Math.PI * 2;
    if (Math.sin(a) > 0 !== front) continue;
    for (const k of [0, 1.5]) {
      ctx.fillRect(Math.round(cx + (rx + k) * Math.cos(a)), Math.round(cy + (ry + k * 0.35) * Math.sin(a)), 1, 1);
    }
  }
}

function space(r: () => number): PortraitScene {
  const clearOfPlanets = ([x, y]: [number, number]) =>
    (x - 96) ** 2 + (y - 22) ** 2 > 20 ** 2 && (x - 16) ** 2 + (y - 20) ** 2 > 11 ** 2;
  const stars = scatter(r, 40, 1, 1, 5).filter(clearOfPlanets).map(([x, y]) => ({
    x, y, ph: r() * 6, v: 1 + r() * 3, c: ['#ffffff', '#ffe8a0', '#a0d8ff'][Math.floor(r() * 3)],
  }));
  const sparkles = scatter(r, 12, 14, 14, 24).filter(([x, y]) => clearOfPlanets([x + 7, y + 7])).slice(0, 4)
    .map(([x, y]) => ({ x, y, ph: r() * 6 }));
  return {
    paintStatic(ctx) {
      gradient(ctx, '#2a1450', '#07051a');
      ring(ctx, 96, 22, 22, 6, '#ffb321', false);
      disc(ctx, 96, 22, 13, '#8e1e94');
      disc(ctx, 94, 20, 11, '#c42cc4');
      disc(ctx, 92, 17, 6, '#e060d8');
      ring(ctx, 96, 22, 22, 6, '#ffb321', true);
      disc(ctx, 16, 20, 7, '#0e6ea0');
      disc(ctx, 15, 19, 6, '#18aee2');
      disc(ctx, 13, 17, 3, '#7ad8f8');
    },
    paintFrame(ctx, t) {
      for (const s of stars) {
        const b = Math.sin(t * s.v + s.ph);
        if (b > -0.3) dot(ctx, s.x, s.y, b > 0.6 ? s.c : '#6a5a9a');
      }
      for (const s of sparkles) {
        const b = Math.sin(t * 1.6 + s.ph);
        const pal = { a: '#a0d8ff', b: '#ffffff' };
        if (b > 0.2) sprite(ctx, STAR_BIG, s.x, s.y, pal);
        else sprite(ctx, STAR_SMALL, s.x + 4, s.y + 4, pal);
      }
      // a shooting star every eight seconds or so
      const cyc = t % 8;
      if (cyc < 0.9) {
        const k = cyc / 0.9;
        const hx = 30 + k * 70, hy = 4 + k * 26;
        for (let i = 0; i < 8; i++) {
          dot(ctx, hx - i * 2.4, hy - i * 0.9, i < 2 ? '#ffffff' : i < 5 ? '#ffe8a0' : '#c42cc4');
        }
      }
    },
  };
}

function sky(r: () => number): PortraitScene {
  const clouds = [[-14, 6], [82, 46], [-20, 64], [86, 84]].map(([x, y], i) => ({ x, y, v: 1.5 + r() * 1.5, flip: i % 2 === 1 }));
  const birds = [[20, 30], [34, 22], [84, 30]].map(([x, y]) => ({ x, y, ph: r() * 6, v: 7 + r() * 4 }));
  return {
    paintStatic(ctx) {
      gradient(ctx, '#7fb0ea', '#dceaf8');
    },
    paintFrame(ctx, t) {
      const glow = 11 + Math.round(Math.sin(t * 1.2));
      disc(ctx, 102, 16, glow, '#fff1b8');
      disc(ctx, 102, 16, 8, '#f8d052');
      for (const c of clouds) {
        sprite(ctx, CLOUD, wrap(c.x + c.v * t, -44, ART + 4), c.y, { a: '#ffffff', b: '#d0def6' }, c.flip);
      }
      for (const b of birds) {
        const x = wrap(b.x + b.v * t, -12, ART + 4);
        const y = b.y + Math.sin(t * 1.3 + b.ph) * 3;
        sprite(ctx, Math.sin(t * 9 + b.ph) > 0 ? BIRD_UP : BIRD_DOWN, x, y, { a: '#3a5a8a' });
      }
    },
  };
}

function hotpot(r: () => number): PortraitScene {
  const chilis = scatter(r, 6, 10, 14, 22).map(([x, y]) => ({ x, y, ph: r() * 6, flip: r() < 0.5 }));
  const anise = scatter(r, 4, 10, 10, 22).filter(([x, y]) => !chilis.some((c) => Math.abs(c.x - x) < 14 && Math.abs(c.y - y) < 14))
    .map(([x, y]) => ({ x, y, ph: r() * 6 }));
  const steam = Array.from({ length: 10 }, () => ({ x: r() < 0.5 ? 4 + r() * 26 : 90 + r() * 24, y0: r() * 70, v: 6 + r() * 4, ph: r() * 6 }));
  const sparks = Array.from({ length: 10 }, () => ({ x: r() * ART, y0: r() * ART, v: 3 + r() * 5, ph: r() * 6 }));
  return {
    paintStatic(ctx) {
      gradient(ctx, '#a02612', '#3a0804');
    },
    paintFrame(ctx, t) {
      for (const s of steam) {
        const y = wrap(s.y0 - s.v * t, -10, 64);
        ctx.globalAlpha = Math.max(0, Math.min(1, (y + 10) / 30));
        sprite(ctx, STEAM, s.x + Math.sin(t * 1.5 + s.ph) * 2, y, { a: '#e8a080' });
      }
      ctx.globalAlpha = 1;
      for (const c of chilis) {
        sprite(ctx, CHILI, c.x, c.y + Math.sin(t * 1.6 + c.ph) * 1.5, { a: '#e8321e', b: '#ff8a6a', g: '#5aa03a' }, c.flip);
      }
      for (const a of anise) {
        sprite(ctx, ANISE, a.x, a.y + Math.sin(t * 1.3 + a.ph) * 1.5, { a: '#6a2a10', b: '#c07a38' });
      }
      for (const s of sparks) {
        const y = wrap(s.y0 - s.v * t, -2, ART + 2);
        const x = s.x + Math.sin(t * 2 + s.ph) * 2;
        if (!visible(x, y, 2, 2)) continue;
        dot(ctx, x, y, Math.sin(t * 5 + s.ph) > 0 ? '#ffcc6a' : '#ff8a3a', 2);
      }
    },
  };
}

const WORLDS: Record<PortraitWorld, (r: () => number) => PortraitScene> = { reef, pond, shrine, space, sky, hotpot };

export function makePortraitScene(world: PortraitWorld, seed = 7): PortraitScene {
  return WORLDS[world](rng(seed));
}

export const isPortraitWorld = (page: string): page is PortraitWorld => page in WORLDS;
