// Runs the pond, as reefEngine.ts runs the reef: the simulation, the drawing
// and everything the visitor can do to it, driven by messages and answering
// with messages. It never touches the DOM, so the page can run it in a
// worker (lib/pondWorker.ts) or, where a browser can't draw from one, on the
// main thread. The page owns the canvases' places in the document, the
// scroll position, the pointer and the visitor's saved adoption.

import { ClearZone, Pond, PondCreature, PondHappening, PondMood, PondSpawnable, PondSpecies, PondStats, TICKS_PER_SECOND } from './pond';
import { PondLayout, PondView } from './pondView';
import { Adoption, displayName } from './adoption';

const TICK_MS = 1000 / TICKS_PER_SECOND;
const STATS_INTERVAL_MS = 500;
// The same pacing as the reef: lower the frame rate rather than stutter, and
// leave out the finishing touches first.
const SLOW_DRAW_MS = 20;
const SLOW_FRAME_MS = 1000 / 20;
const LEAN_DRAW_MS = 9;
const LEAN_RECOVER_MS = 5;
const INSPECT_INTERVAL_MS = 100;
/** How close (page pixels) a click or tap must be to pick a creature. */
const CLICK_REACH = 32;

export type PondAdoption = Adoption<PondSpecies>;

/** The creature under inspection, as the tooltip shows it. */
export interface PondInspected {
  name: string;
  species: PondSpecies;
  /** Its life stage, for frogs (spawn to adult). */
  stage: string | null;
  mood: PondMood;
  layer: string;
  energy: number;
  hungry: boolean;
  age: number;
  pinned: boolean;
  adopted: boolean;
}

export type PondDebugAction =
  | { action: 'spawn'; kind: PondSpawnable }
  | { action: 'happening'; kind: PondHappening }
  | { action: 'heronOver' | 'heronLands' }
  | { action: 'speed'; speed: number };

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
  /** The visitor's saved adoption, released back into the pond. */
  adoption: PondAdoption | null;
  worker: boolean;
}

/** From the page to the pond. Points are page coordinates (CSS pixels). */
export type ToPond =
  | { type: 'view'; scrollY: number; viewW: number; viewH: number }
  | { type: 'world'; w: number; h: number; zones: ClearZone[] }
  | { type: 'zones'; zones: ClearZone[] }
  | { type: 'pointer'; x: number; y: number; mouse: boolean }
  | { type: 'pointerLeave' }
  | { type: 'click'; x: number; y: number }
  | { type: 'adopt'; name: string }
  | { type: 'find' }
  | { type: 'letGo' }
  | { type: 'frameMs'; ms: number }
  | { type: 'visible'; visible: boolean }
  | ({ type: 'debug' } & PondDebugAction);

/** From the pond to the page. */
export type FromPond =
  | { type: 'layout'; layout: PondLayout }
  | { type: 'tip'; at: { x: number; y: number } | null }
  | { type: 'inspected'; inspected: PondInspected | null }
  | { type: 'stats'; stats: PondStats }
  | { type: 'adoption'; adoption: PondAdoption | null; notice?: string }
  | { type: 'scrollTo'; y: number };

export class PondEngine {
  readonly pond: Pond;
  readonly view: PondView;
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
  drawCost = 0;
  private drawnScroll = Number.NaN;
  private lastStats = 0;
  private lastInspect = 0;
  private speed = 1;
  private hovered: PondCreature | null = null;
  private pinned: PondCreature | null = null;
  private shown = false;
  private hadTip = false;
  private line: PondAdoption | null;
  private adopted: PondCreature | null;

  constructor(init: PondEngineInit, private post: (message: FromPond) => void) {
    // Stocked with a good share of its life where the visitor is looking.
    this.pond = new Pond(init.w, init.h, { z0: init.scrollY / init.px, z1: (init.scrollY + init.viewH) / init.px }, init.zones);
    this.pond.setClearZones(init.zones);
    this.view = new PondView(this.pond, init.floor, init.light, init.sprites, init.px,
      layout => this.post({ type: 'layout', layout }), init.worker ? 2 : 1);
    this.scrollY = init.scrollY;
    this.viewW = init.viewW;
    this.viewH = init.viewH;
    this.frameMs = init.frameMs;
    // A returning visitor's creature comes back.
    this.line = init.adoption;
    this.adopted = init.adoption ? this.pond.release(init.adoption.species, displayName(init.adoption), init.adoption.palette) : null;
    this.watch();
    this.draw();
    this.last = performance.now();
    this.schedule();
  }

  /** Tells the pond which rows the visitor can see, so visits happen in view. */
  private watch() {
    const top = this.view.pageToWorld(0, this.scrollY, 0).z;
    const bottom = this.view.pageToWorld(0, this.scrollY + this.viewH, 0).z;
    this.pond.viewZ = { z0: top, z1: bottom };
  }

  stop() {
    this.running = false;
    cancelFrame(this.handle);
  }

  handleMessage(m: ToPond) {
    const { pond, view } = this;
    switch (m.type) {
      case 'view':
        this.scrollY = m.scrollY;
        this.viewW = m.viewW;
        this.viewH = m.viewH;
        this.watch();
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
        const p = view.pageToWorld(m.x, m.y, 0);
        pond.setPointer(p.x, p.z);
        this.hovered = m.mouse ? view.pick(m.x, m.y) : null;
        break;
      }
      case 'pointerLeave':
        pond.clearPointer();
        break;
      case 'click':
        // Clicking (or tapping) a creature keeps it under inspection; elsewhere lets go.
        this.pinned = view.pick(m.x, m.y, CLICK_REACH);
        this.lastInspect = 0;
        break;
      case 'adopt': {
        const pinned = this.pinned;
        if (!pinned?.alive) break;
        if (this.adopted && this.adopted !== pinned) this.adopted.adopted = false;
        const species = pinned.species === 'spawn' || pinned.species === 'tadpole' ? 'frog' : pinned.species;
        pond.adopt(pinned, m.name);
        this.adopted = pinned;
        this.setLine({ name: m.name, species, palette: pinned.palette, generation: 1, since: Date.now() });
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
  private debug(m: PondDebugAction) {
    const { pond } = this;
    const p = this.view.pageToWorld(this.viewW / 2, this.scrollY + this.viewH / 2, 0);
    switch (m.action) {
      case 'spawn': pond.debugSpawn(m.kind, p.x, p.z); break;
      case 'happening': pond.startHappening(m.kind); break;
      case 'heronOver': pond.heronOver(); break;
      case 'heronLands': pond.heronLands({ x: p.x, z: p.z }); break;
      case 'speed': this.speed = m.speed; break;
    }
  }

  private setLine(line: PondAdoption | null, notice?: string) {
    this.line = line;
    this.post({ type: 'adoption', adoption: line, notice });
  }

  /** When the adopted creature dies, a relative (if any) carries on the line. */
  private checkLine() {
    const adopted = this.adopted;
    if (!adopted || adopted.alive) return;
    const heir = this.pond.heirOf(adopted);
    if (this.line && heir) {
      const next: PondAdoption = { ...this.line, generation: this.line.generation + 1, palette: heir.palette };
      this.pond.adopt(heir, displayName(next));
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
        stage: this.pond.stageOf(target),
        mood: target.mood,
        layer: target.layer,
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
    const { pond, view } = this;
    // After a pause, catch up a few ticks rather than fast-forwarding.
    this.pending = Math.min(this.pending + (now - this.last) * this.speed, TICK_MS * 3 * this.speed);
    this.last = now;
    let ticked = false;
    while (this.pending >= TICK_MS) {
      pond.step();
      this.pending -= TICK_MS;
      ticked = true;
    }
    // Redraw for new ticks, and for scrolling far enough to bring new sprites into view.
    const scrolled = this.scrollY !== this.drawnScroll && view.scrolledFar(this.scrollY);
    // On a device that can't keep up, draw less often rather than stutter.
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
      this.post({ type: 'stats', stats: pond.stats() });
    }
  }
}

// Workers in some browsers have no requestAnimationFrame; a timer will do there.
const hasRaf = typeof requestAnimationFrame === 'function';
const nextFrame = (f: (now: number) => void) =>
  hasRaf ? requestAnimationFrame(f) : (setTimeout(() => f(performance.now()), 16) as unknown as number);
const cancelFrame = (handle: number) => (hasRaf ? cancelAnimationFrame(handle) : clearTimeout(handle));
