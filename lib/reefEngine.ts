// Runs the reef: the simulation, the drawing and everything the visitor can
// do to it, driven by messages and answering with messages. It never touches
// the DOM, so the page can run it in a worker (where it usually lives, so the
// page itself stays smooth) or, where a browser can't draw from one, right
// on the main thread. The page owns the canvases' places in the document,
// the scroll position, the pointer and the visitor's saved adoption.

import { Creature, Mood, PixelOcean, OceanStats, Species, ClearZone, TICKS_PER_SECOND } from './pixelOcean';
import { OceanView, ReefLayout } from './pixelOceanView';
import { Adoption, displayName } from './adoption';

const TICK_MS = 1000 / TICKS_PER_SECOND;
const STATS_INTERVAL_MS = 500;
// When drawing a frame takes longer than this on average, animate at a lower
// frame rate (SLOW_FRAME_MS apart) instead of stuttering.
const SLOW_DRAW_MS = 20;
const SLOW_FRAME_MS = 1000 / 20;
// Past this (and until it drops back under LEAN_RECOVER_MS), leave out the
// reef's finishing touches before resorting to a lower frame rate.
const LEAN_DRAW_MS = 9;
const LEAN_RECOVER_MS = 5;
// Food is dropped near the surface so it visibly sinks to the floor.
const DROP_HEIGHT = 90;
// Fish shy away from the cursor at roughly their own swimming height.
const POINTER_HEIGHT = 25;
const INSPECT_INTERVAL_MS = 100;
// Only a cursor moving at least this far between events startles fish, so a
// gentle hover can inspect one without chasing it off.
const STARTLE_DISTANCE = 10;
/** How close (page pixels) a click or tap must be to pick a creature. */
const CLICK_REACH = 32;

/** The creature under inspection, as the tooltip shows it. */
export interface Inspected {
  name: string;
  species: Species;
  mood: Mood;
  energy: number;
  hungry: boolean;
  age: number;
  pinned: boolean;
  adopted: boolean;
}

export type DebugAction =
  | { action: 'spawn'; species: Species }
  | { action: 'whale' | 'pod' | 'scent' | 'parasites' | 'spawning' | 'baitBall' | 'shell' }
  | { action: 'speed'; speed: number };

export interface EngineInit {
  floor: HTMLCanvasElement;
  light: HTMLCanvasElement;
  sprites: [HTMLCanvasElement, HTMLCanvasElement];
  px: number;
  /** World size in cells. */
  w: number;
  h: number;
  scrollY: number;
  viewW: number;
  viewH: number;
  frameMs: number;
  zones: ClearZone[];
  /** The visitor's saved adoption, released back into the reef. */
  adoption: Adoption | null;
  /** True when running in a worker: new sprite windows wait a frame longer. */
  worker: boolean;
}

/** From the page to the reef. Points are page coordinates (CSS pixels). */
export type ToEngine =
  | { type: 'view'; scrollY: number; viewW: number; viewH: number }
  | { type: 'world'; w: number; h: number; zones: ClearZone[] }
  | { type: 'zones'; zones: ClearZone[] }
  | { type: 'pointer'; x: number; y: number; mouse: boolean }
  | { type: 'pointerLeave' }
  | { type: 'click'; x: number; y: number; food: boolean }
  | { type: 'adopt'; name: string }
  | { type: 'find' }
  | { type: 'letGo' }
  | { type: 'frameMs'; ms: number }
  | { type: 'visible'; visible: boolean }
  | ({ type: 'debug' } & DebugAction);

/** From the reef to the page. */
export type FromEngine =
  | { type: 'layout'; layout: ReefLayout }
  /** Where the inspected creature is now (page pixels), or null when there's none. */
  | { type: 'tip'; at: { x: number; y: number } | null }
  | { type: 'inspected'; inspected: Inspected | null }
  | { type: 'stats'; stats: OceanStats }
  /** Save this adoption (null forgets it), with a word for the visitor if something happened. */
  | { type: 'adoption'; adoption: Adoption | null; notice?: string }
  | { type: 'scrollTo'; y: number };

export class ReefEngine {
  private ocean: PixelOcean;
  private view: OceanView;
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
  /** A running average of how long a frame takes to draw, in ms. */
  private drawCost = 0;
  private drawnScroll = Number.NaN;
  private lastStats = 0;
  private lastInspect = 0;
  private speed = 1;
  private hovered: Creature | null = null;
  private pinned: Creature | null = null;
  private shown = false;
  private hadTip = false;
  private lastPointer = { x: 0, y: 0 };
  private line: Adoption | null;
  private adopted: Creature | null;

  constructor(init: EngineInit, private post: (message: FromEngine) => void) {
    this.ocean = new PixelOcean(init.w, init.h);
    this.ocean.setClearZones(init.zones);
    this.view = new OceanView(this.ocean, init.floor, init.light, init.sprites, init.px,
      layout => this.post({ type: 'layout', layout }), init.worker ? 2 : 1);
    this.scrollY = init.scrollY;
    this.viewW = init.viewW;
    this.viewH = init.viewH;
    this.frameMs = init.frameMs;
    // A returning visitor's creature swims back in.
    this.line = init.adoption;
    this.adopted = init.adoption ? this.ocean.release(init.adoption.species, displayName(init.adoption), init.adoption.palette) : null;
    this.draw();
    this.last = performance.now();
    this.schedule();
  }

  stop() {
    this.running = false;
    cancelFrame(this.handle);
  }

  handleMessage(m: ToEngine) {
    const { ocean, view } = this;
    switch (m.type) {
      case 'view':
        this.scrollY = m.scrollY;
        this.viewW = m.viewW;
        this.viewH = m.viewH;
        break;
      case 'world':
        ocean.resize(m.w, m.h);
        ocean.setClearZones(m.zones);
        this.draw();
        break;
      case 'zones':
        ocean.setClearZones(m.zones);
        break;
      case 'pointer': {
        const moved = Math.hypot(m.x - this.lastPointer.x, m.y - this.lastPointer.y);
        this.lastPointer = { x: m.x, y: m.y };
        if (moved >= STARTLE_DISTANCE) {
          const p = view.pageToWorld(m.x, m.y, POINTER_HEIGHT);
          ocean.setPointer(p.x, p.z);
        } else {
          ocean.clearPointer();
        }
        this.hovered = m.mouse ? view.pick(m.x, m.y) : null;
        break;
      }
      case 'pointerLeave':
        ocean.clearPointer();
        break;
      case 'click':
        if (m.food) {
          const p = view.pageToWorld(m.x, m.y, DROP_HEIGHT);
          ocean.dropFood(p.x, p.z, DROP_HEIGHT);
        } else {
          // Clicking (or tapping) a creature keeps it under inspection; elsewhere lets go.
          this.pinned = view.pick(m.x, m.y, CLICK_REACH);
          this.lastInspect = 0;
        }
        break;
      case 'adopt': {
        const pinned = this.pinned;
        if (!pinned?.alive) break;
        if (this.adopted && this.adopted !== pinned) this.adopted.adopted = false;
        const line: Adoption = { name: m.name, species: pinned.species, palette: pinned.palette, generation: 1, since: Date.now() };
        ocean.adopt(pinned, m.name);
        this.adopted = pinned;
        this.setLine(line);
        this.lastInspect = 0;
        break;
      }
      case 'find':
        if (!this.adopted?.alive) break;
        this.pinned = this.adopted;
        this.post({ type: 'scrollTo', y: view.pagePosition(this.adopted).y });
        break;
      case 'letGo':
        if (this.adopted) this.adopted.adopted = false;
        this.adopted = null;
        this.setLine(null);
        this.lastInspect = 0;
        break;
      case 'frameMs':
        this.frameMs = m.ms;
        break;
      case 'visible':
        // A hidden tab needn't animate; on return, catch up a few ticks rather than fast-forwarding.
        if (m.visible && !this.visible) {
          this.visible = true;
          this.last = performance.now();
          this.schedule();
        }
        this.visible = m.visible;
        break;
      case 'debug':
        this.debug(m);
        break;
    }
  }

  /** The hidden debug panel works on the middle of the screen. */
  private debug(m: DebugAction) {
    const { ocean } = this;
    const p = this.view.pageToWorld(this.viewW / 2, this.scrollY + this.viewH / 2, 0);
    switch (m.action) {
      case 'spawn': ocean.debugSpawn(m.species, p.x, p.z); break;
      case 'whale': ocean.debugWhale(p.x, p.z); break;
      case 'pod': ocean.debugPod(p.x, p.z); break;
      case 'scent': ocean.debugScent(p.x, p.z); break;
      case 'parasites': ocean.debugParasites(); break;
      case 'spawning': ocean.debugSpawning(); break;
      case 'baitBall': ocean.debugBaitBall(p.x, p.z); break;
      case 'shell': ocean.debugShell(p.x, p.z); break;
      case 'speed': this.speed = m.speed; break;
    }
  }

  private setLine(line: Adoption | null, notice?: string) {
    this.line = line;
    this.post({ type: 'adoption', adoption: line, notice });
  }

  /** When the adopted creature dies, a child (if any) carries on the line. */
  private checkLine() {
    const adopted = this.adopted;
    if (!adopted || adopted.alive) return;
    const heir = this.ocean.heirOf(adopted);
    if (this.line && heir) {
      const next: Adoption = { ...this.line, generation: this.line.generation + 1, palette: heir.palette };
      this.ocean.adopt(heir, displayName(next));
      if (this.pinned === adopted) this.pinned = heir;
      this.adopted = heir;
      this.setLine(next, `${adopted.name} died. ${displayName(next)} carries on the line.`);
    } else {
      this.adopted = null;
      this.setLine(null, `${adopted.name} died, and the line has ended. Click any creature to adopt another.`);
    }
  }

  /** Follows the inspected creature every frame; refreshes its details less often. */
  private inspect(now: number) {
    if (this.pinned && !this.pinned.alive) this.pinned = null;
    const target = this.pinned ?? (this.hovered?.alive ? this.hovered : null);
    this.view.highlighted = target;
    if (target) {
      this.post({ type: 'tip', at: this.view.pagePosition(target) });
      this.hadTip = true;
    } else if (this.hadTip) {
      this.post({ type: 'tip', at: null });
      this.hadTip = false;
    }
    if (!target) {
      if (this.shown) { this.shown = false; this.post({ type: 'inspected', inspected: null }); }
      return;
    }
    if (now - this.lastInspect < INSPECT_INTERVAL_MS && this.shown) return;
    this.lastInspect = now;
    this.shown = true;
    this.post({
      type: 'inspected',
      inspected: {
        name: target.name,
        species: target.species,
        mood: target.mood,
        energy: target.energy,
        hungry: target.hungry,
        age: target.age,
        pinned: target === this.pinned,
        adopted: target.adopted,
      },
    });
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
    const { ocean, view } = this;
    // After a pause, catch up a few ticks rather than fast-forwarding.
    this.pending = Math.min(this.pending + (now - this.last) * this.speed, TICK_MS * 3 * this.speed);
    this.last = now;
    let ticked = false;
    while (this.pending >= TICK_MS) {
      ocean.step();
      this.pending -= TICK_MS;
      ticked = true;
    }
    // Redraw for new ticks, and for scrolling far enough to bring new sprites
    // into view (the canvases scroll with the page by themselves).
    const scrolled = this.scrollY !== this.drawnScroll && view.scrolledFar(this.scrollY);
    // On a device that can't keep up, draw less often rather than stutter;
    // the simulation itself keeps its pace either way.
    const gap = this.drawCost > SLOW_DRAW_MS ? SLOW_FRAME_MS : this.frameMs;
    if ((ticked || scrolled) && now - this.lastDraw >= gap - 2) {
      this.lastDraw = now;
      this.inspect(now);
      const started = performance.now();
      this.draw();
      this.drawCost += (performance.now() - started - this.drawCost) * 0.1;
      if (!view.lean && this.drawCost > LEAN_DRAW_MS) view.lean = true;
      else if (view.lean && this.drawCost < LEAN_RECOVER_MS) view.lean = false;
    }
    if (now - this.lastStats > STATS_INTERVAL_MS) {
      this.lastStats = now;
      this.checkLine();
      this.post({ type: 'stats', stats: ocean.stats() });
    }
  }
}

// Workers in some browsers have no requestAnimationFrame; a timer will do there.
const hasRaf = typeof requestAnimationFrame === 'function';
const nextFrame = (f: (now: number) => void) =>
  hasRaf ? requestAnimationFrame(f) : (setTimeout(() => f(performance.now()), 16) as unknown as number);
const cancelFrame = (handle: number) => (hasRaf ? cancelAnimationFrame(handle) : clearTimeout(handle));
