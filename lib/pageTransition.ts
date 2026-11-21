import type { Page } from '../contexts/ThemeContext';

/**
 * The move between pages: a wave of pixel blocks ripples out from wherever the
 * reader clicked, covering the old page block by block, then carries on from the
 * same spot and uncovers the new one. It lives outside React so that it survives
 * the old page being replaced underneath it.
 */

const BLOCK = 16;
/** Blocks grow and shrink in whole steps of this many pixels, so it stays pixel-art. */
const STEP = 4;
/** Screen pixels to a canvas pixel: nothing here is finer than this, so the canvas can be a quarter of the size. */
const UNIT = 2;
const CLOSE_MS = 480;
const OPEN_MS = 720;
/** How long (as a share of a sweep) one block takes to grow or shrink. */
const FADE = 0.34;
/** The longest to wait, behind the cover, for the new page to load and for its world to appear (the 3D worlds build theirs first). */
const MAX_PREPARE_MS = 2500;
const MAX_READY_MS = 6000;
/** A frame that took longer than this only moves the wave on by this much, so a busy moment never makes it jump. */
const MAX_STEP_MS = 34;

const COLOURS: Record<Page, { ink: string; edge: string; glint: string }> = {
  reef: { ink: '#050d14', edge: '#124558', glint: '#8fe3dc' },
  pond: { ink: '#0b1a14', edge: '#25533c', glint: '#f2b8cc' },
  shrine: { ink: '#0a1022', edge: '#3a2348', glint: '#ffc978' },
  space: { ink: '#04030a', edge: '#301c5a', glint: '#ec84a0' },
  sky: { ink: '#14284e', edge: '#3c78c4', glint: '#f8d052' },
  hotpot: { ink: '#1e0406', edge: '#801a0e', glint: '#ffa040' },
  aquarium: { ink: '#000428', edge: '#0d3a6e', glint: '#7fdcff' },
};

// 4x4 ordered-dither thresholds: neighbouring blocks turn at different moments,
// so the wave's edge is an even pixel pattern, not a hard ring.
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
// A tab hidden part-way through gets no animation frames, so the timer keeps the move from stalling.
const nextFrame = () => new Promise<void>(resolve => { requestAnimationFrame(() => resolve()); setTimeout(resolve, 250); });
const within = (work: Promise<unknown>, ms: number) => Promise.race([work.catch(() => undefined), new Promise(resolve => setTimeout(resolve, ms))]);

// The new page says when its world is ready to be looked at.
let onReady: (() => void) | null = null;
export const markPageReady = () => { onReady?.(); };

let running = false;
let queued: (() => void) | null = null;

export interface PageMove {
  to: Page;
  /** Where the wave starts, in window coordinates; the middle of the screen if not given. */
  origin?: { x: number; y: number };
  /** Everything that should be fetched behind the cover. */
  prepare: () => Promise<unknown>;
  /** Swaps the page. */
  swap: () => void;
  /** Start with the screen already covered (the first load), rather than sweeping over it. */
  covered?: boolean;
}

export const movePage = (move: PageMove) => {
  if (running) { queued = () => movePage(move); return; }
  running = true;
  run(move).finally(() => {
    running = false;
    const next = queued;
    queued = null;
    next?.();
  });
};

/**
 * A first visit that opens on a 3D world (they take a moment to build their scene):
 * the screen starts covered, so nothing shows until the world is drawn, then
 * uncovers with the same wave as a switch. Call before the page first renders.
 */
export const coverFirstLoad = (page: Page) => {
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
  movePage({ to: page, prepare: () => Promise.resolve(), swap: () => {}, covered: true });
};

const run = async ({ to, origin, prepare, swap, covered = false }: PageMove) => {
  // Fetching starts straight away, while the wave is still on its way across.
  const prepared = within(prepare(), MAX_PREPARE_MS);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) { await prepared; swap(); return; }
  const cols = Math.ceil(window.innerWidth / BLOCK);
  const rows = Math.ceil(window.innerHeight / BLOCK);
  const cell = BLOCK / UNIT;
  canvas.width = cols * cell;
  canvas.height = rows * cell;
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.cssText = `position:fixed;left:0;top:0;z-index:300;pointer-events:none;image-rendering:pixelated;width:${cols * BLOCK}px;height:${rows * BLOCK}px`;
  document.body.appendChild(canvas);

  const { ink, edge, glint } = COLOURS[to];
  const ox = (origin?.x ?? window.innerWidth / 2) / BLOCK;
  const oy = (origin?.y ?? window.innerHeight / 2) / BLOCK;
  const reach = Math.max(Math.hypot(ox, oy), Math.hypot(cols - ox, oy), Math.hypot(ox, rows - oy), Math.hypot(cols - ox, rows - oy)) || 1;
  // When each block turns: by distance from the click, softened by the dither.
  const starts = new Float32Array(cols * rows);
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const radial = Math.hypot(x + 0.5 - ox, y + 0.5 - oy) / reach;
      starts[y * cols + x] = (radial * 0.82 + (BAYER[(y & 3) * 4 + (x & 3)] / 16) * 0.18) * (1 - FADE);
    }
  }

  // What each block last looked like, so a frame only touches the ones in the wave's band.
  const drawn = new Uint8Array(starts.length);
  // That frame's blocks, by colour: setting a colour is the costly part, so it's set once for each.
  const colours = [ink, edge, glint];
  const queues = colours.map(() => new Int32Array(starts.length));
  const counts = colours.map(() => 0);
  // share: how far each block has grown (closing) or how far it still has to shrink (opening).
  const draw = (p: number, closing: boolean) => {
    counts.fill(0);
    for (let i = 0; i < starts.length; i++) {
      const local = Math.min(1, Math.max(0, (p - starts[i]) / FADE));
      const share = closing ? local : 1 - local;
      const steps = Math.round((BLOCK * share) / STEP);
      // Still turning: a lighter shade at the wave's edge.
      const turning = share < 0.75;
      const look = steps * 2 + (turning ? 1 : 0);
      if (look === drawn[i] || (steps === 0 && drawn[i] <= 1)) continue;
      drawn[i] = look;
      // A growing block just paints over itself; only a shrinking one leaves anything to clear.
      if (!closing) ctx.clearRect((i % cols) * cell, Math.floor(i / cols) * cell, cell, cell);
      if (steps === 0) continue;
      // With the odd fleck of the new theme's jewel colour.
      const c = !turning ? 0 : (i * 7 + (i % cols) * 3) % 23 === 0 ? 2 : 1;
      queues[c][counts[c]++] = i;
    }
    for (let c = 0; c < colours.length; c++) {
      if (!counts[c]) continue;
      ctx.fillStyle = colours[c];
      const queue = queues[c];
      for (let k = 0; k < counts[c]; k++) {
        const i = queue[k];
        const size = ((drawn[i] >> 1) * STEP) / UNIT;
        ctx.fillRect((i % cols) * cell + (cell - size) / 2, Math.floor(i / cols) * cell + (cell - size) / 2, size, size);
      }
    }
  };

  const sweep = async (ms: number, closing: boolean) => {
    let elapsed = 0;
    let last = performance.now();
    while (elapsed < ms) {
      await nextFrame();
      const now = performance.now();
      // Nobody's watching a hidden tab, so there's no wave to wait for.
      elapsed += document.hidden ? ms : Math.min(now - last, MAX_STEP_MS);
      last = now;
      draw(easeInOut(Math.min(1, elapsed / ms)), closing);
    }
  };

  // The 3D worlds take a second or two to build their scene. Until the new page has
  // drawn its world the cover stays, and if that takes a while a scattering of its
  // blocks twinkles in the new theme's colours, so the wait reads as loading, not stuck.
  const sparkles = Array.from({ length: starts.length }, (_, i) => i).filter(i => {
    let h = Math.imul(i, 0x27d4eb2d);
    h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d);
    return ((h ^ (h >>> 12)) >>> 0) % 997 < 30;
  });
  const lit = new Uint8Array(sparkles.length);
  const paintSparkle = (k: number, level: number) => {
    const i = sparkles[k];
    const x = (i % cols) * cell, y = Math.floor(i / cols) * cell;
    ctx.fillStyle = ink;
    ctx.fillRect(x, y, cell, cell);
    if (!level) return;
    const size = level === 2 ? cell / 2 : cell / 4;
    ctx.fillStyle = level === 2 ? glint : edge;
    ctx.fillRect(x + (cell - size) / 2, y + (cell - size) / 2, size, size);
  };
  const waitBehindCover = async (ready: () => boolean) => {
    const t0 = performance.now();
    while (!ready() && !document.hidden && performance.now() - t0 < MAX_READY_MS) {
      await nextFrame();
      const t = (performance.now() - t0) / 1000;
      // Quick pages are back before anything twinkles.
      if (t < 0.25) continue;
      for (let k = 0; k < sparkles.length; k++) {
        const wave = Math.sin(t * 2.6 + sparkles[k] * 0.71);
        const level = wave > 0.92 ? 2 : wave > 0.7 ? 1 : 0;
        if (level !== lit[k]) { lit[k] = level; paintSparkle(k, level); }
      }
    }
    // Back to solid cover, as the opening sweep expects.
    for (let k = 0; k < sparkles.length; k++) if (lit[k]) { lit[k] = 0; paintSparkle(k, 0); }
  };

  // Listening from the start: a first load's page can be ready before this would otherwise get to it.
  let isReady = false;
  onReady = () => { isReady = true; };
  // Whatever goes wrong, the cover must not stay over the page.
  try {
    if (covered) draw(1, true);
    else await sweep(CLOSE_MS, true);
    await prepared;
    swap();
    await waitBehindCover(() => isReady);
    // Let what the new page has just done reach the screen before uncovering it.
    await nextFrame();
    await nextFrame();
    await sweep(OPEN_MS, false);
  } finally {
    onReady = null;
    canvas.remove();
  }
};
