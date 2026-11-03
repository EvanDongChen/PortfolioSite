// Runs the pond, as reefEngine.ts runs the reef: the simulation, the drawing
// and everything the visitor can do to it, driven by messages and answering
// with messages. It never touches the DOM, so the page can run it in a
// worker (lib/pondWorker.ts) or, where a browser can't draw from one, on the
// main thread.

import { ClearZone, Pond, TICKS_PER_SECOND } from './pond';
import { PondLayout, PondView } from './pondView';

const TICK_MS = 1000 / TICKS_PER_SECOND;
const STATS_INTERVAL_MS = 500;
// The same pacing as the reef: lower the frame rate rather than stutter, and
// leave out the finishing touches first.
const SLOW_DRAW_MS = 20;
const SLOW_FRAME_MS = 1000 / 20;
const LEAN_DRAW_MS = 9;
const LEAN_RECOVER_MS = 5;

export interface PondEngineInit {
  floor: HTMLCanvasElement;
  light: HTMLCanvasElement;
  sprites: [HTMLCanvasElement, HTMLCanvasElement];
  px: number;
  w: number;
  h: number;
  scrollY: number;
  viewW: number;
  viewH: number;
  frameMs: number;
  zones: ClearZone[];
  worker: boolean;
}

/** From the page to the pond. Points are page coordinates (CSS pixels). */
export type ToPond =
  | { type: 'view'; scrollY: number; viewW: number; viewH: number }
  | { type: 'world'; w: number; h: number; zones: ClearZone[] }
  | { type: 'zones'; zones: ClearZone[] }
  | { type: 'pointer'; x: number; y: number; mouse: boolean }
  | { type: 'pointerLeave' }
  | { type: 'frameMs'; ms: number }
  | { type: 'visible'; visible: boolean };

/** From the pond to the page. */
export type FromPond =
  | { type: 'layout'; layout: PondLayout };

export class PondEngine {
  private pond: Pond;
  private view: PondView;
  private scrollY: number;
  private viewW: number;
  private viewH: number;
  private frameMs: number;
  private running = true;
  private visible = true;
  private handle = 0;
  private last = 0;
  private pending = 0;
  private lastDraw = 0;
  private drawCost = 0;
  private drawnScroll = Number.NaN;
  private speed = 1;

  constructor(init: PondEngineInit, private post: (message: FromPond) => void) {
    this.pond = new Pond(init.w, init.h);
    this.pond.setClearZones(init.zones);
    this.view = new PondView(this.pond, init.floor, init.light, init.sprites, init.px,
      layout => this.post({ type: 'layout', layout }), init.worker ? 2 : 1);
    this.scrollY = init.scrollY;
    this.viewW = init.viewW;
    this.viewH = init.viewH;
    this.frameMs = init.frameMs;
    this.draw();
    this.last = performance.now();
    this.schedule();
  }

  stop() {
    this.running = false;
    cancelFrame(this.handle);
  }

  handleMessage(m: ToPond) {
    const { pond } = this;
    switch (m.type) {
      case 'view':
        this.scrollY = m.scrollY;
        this.viewW = m.viewW;
        this.viewH = m.viewH;
        break;
      case 'world':
        pond.resize(m.w, m.h);
        pond.setClearZones(m.zones);
        this.draw();
        break;
      case 'zones':
        pond.setClearZones(m.zones);
        break;
      case 'pointer': {
        // The cursor moves through the water like a swimmer at the surface.
        const p = this.view.pageToWorld(m.x, m.y, 0);
        pond.setPointer(p.x, p.z);
        break;
      }
      case 'pointerLeave':
        pond.clearPointer();
        break;
      case 'frameMs':
        this.frameMs = m.ms;
        break;
      case 'visible':
        if (m.visible && !this.visible) {
          this.visible = true;
          this.last = performance.now();
          this.schedule();
        }
        this.visible = m.visible;
        break;
    }
  }

  private draw() {
    this.drawnScroll = this.scrollY;
    this.view.render(this.scrollY, this.viewW, this.viewH);
  }

  private schedule() {
    if (this.running && this.visible) this.handle = nextFrame(now => this.frame(now));
  }

  private frame(now: number) {
    if (!this.running || !this.visible) return;
    this.schedule();
    const { pond, view } = this;
    this.pending = Math.min(this.pending + (now - this.last) * this.speed, TICK_MS * 3 * this.speed);
    this.last = now;
    let ticked = false;
    while (this.pending >= TICK_MS) {
      pond.step();
      this.pending -= TICK_MS;
      ticked = true;
    }
    const scrolled = this.scrollY !== this.drawnScroll && view.scrolledFar(this.scrollY);
    const gap = this.drawCost > SLOW_DRAW_MS ? SLOW_FRAME_MS : this.frameMs;
    if ((ticked || scrolled) && now - this.lastDraw >= gap - 2) {
      this.lastDraw = now;
      const started = performance.now();
      this.draw();
      this.drawCost += (performance.now() - started - this.drawCost) * 0.1;
      if (!view.lean && this.drawCost > LEAN_DRAW_MS) view.lean = true;
      else if (view.lean && this.drawCost < LEAN_RECOVER_MS) view.lean = false;
    }
    void STATS_INTERVAL_MS;
  }
}

const hasRaf = typeof requestAnimationFrame === 'function';
const nextFrame = (f: (now: number) => void) =>
  hasRaf ? requestAnimationFrame(f) : (setTimeout(() => f(performance.now()), 16) as unknown as number);
const cancelFrame = (handle: number) => (hasRaf ? cancelAnimationFrame(handle) : clearTimeout(handle));
