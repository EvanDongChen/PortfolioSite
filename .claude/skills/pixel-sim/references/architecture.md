# How the simulations are built

The reef, the pond and the shrine forest (`lib/shrine*`, `ShrineApp.tsx`) share one design. Reuse it rather than inventing another: it is what keeps them smooth while filling a full page.

| Layer | Reef | Pond | Rule |
|---|---|---|---|
| Simulation | `lib/pixelOcean.ts` | `lib/pond.ts` | No DOM. Runs at `TICKS_PER_SECOND` (30), so it can be stepped in Node |
| Renderer and camera | `lib/pixelOceanView.ts` | `lib/pondView.ts` | Floor, light and two sprite canvases that take turns, so sprites never jump |
| Art | `lib/pixelOceanArt.ts` | `lib/pondArt.ts` | Sprites as character grids plus palettes, drawn once and cached |
| Engine | `lib/reefEngine.ts` | `lib/pondEngine.ts` | Message-driven, no DOM: pacing, hover, click, adopt, debug, stats |
| Worker | `lib/reefWorker.ts` | `lib/pondWorker.ts` | Hosts the engine with OffscreenCanvas where the browser allows |
| Host | `components/PixelOcean.tsx` | `components/PondWater.tsx` | Places canvases, forwards scroll and pointer, shows what comes back |
| Page and theme | `PixelApp.tsx`, `pixel-theme.css` | `PondApp.tsx`, `pond-theme.css` | Same portfolio content, restyled through marker classes |
| Panels | `EcosystemPanel`, `ReefDebugPanel` | `PondCensus`, `PondDebugPanel` | Census closed by default; debug opens with the Konami code |

Coordinates are world cells (`x`, `z`, and height `h`). The world spans the whole page and scrolls with it. Anything a visitor sees belongs to the world, so it must not be positioned in screen space.

## Adding a creature

Follow an existing relative through the code. Searching for it across `lib/` and `components/` finds every place below. These lists were traced from `newt` in the pond and `lionfish` in the reef.

**Pond:**
1. `lib/pond.ts`: the `PondSpecies` union, `POND_SPECIES_LIST`, an entry in `POND_SPECIES` (speed, vision, metabolism, age, `cap`, names), a `case` in the think switch and a `think*` method. Add it to `WILD` with a placement in `spawnWild` if it needs a special spot, and to the arrivals list in the step loop if short-lived.
2. `lib/pondArt.ts`: frames, palette, and a `case` in the icon function.
3. `lib/pondView.ts`: body width in the width table, a `case` to draw it, and `SIZE` if needed.
4. `components/PondCensus.tsx` and `components/PondDebugPanel.tsx`: the species lists and labels.

**Reef:**
1. `lib/pixelOcean.ts`: the species union, an entry in `SPECIES`, a `think*` method and its dispatch, and any relationship tables, such as which hunters avoid it.
2. `lib/pixelOceanArt.ts`: the sprite kinds, frames and `PALETTES`.
3. `lib/pixelOceanView.ts`: body width, `SIZE`, the wake and shadow tables if it needs them, and a `case` to draw it.
4. `components/EcosystemPanel.tsx` and `components/ReefDebugPanel.tsx`: the labels and lists.

**For every creature, decide:**
- What eats it, what it eats, and how it flees.
- Where it rests, and what it does when idle.
- How it dies: a bite with blood and halves, not vanishing.
- How it interacts with what's already there. Reacting to neighbours, like garden eels ducking as something big passes, is what makes it feel like a world.
- How many, and whether enough appear in the opening view (`someZ` in the pond). Keep big ones clear of the hero text.
- Its size next to neighbours. Mouths, reach, spacing, shadows and reticles follow the drawn size, so check them too.
- Turning: hold a new heading for a few ticks, as the reef's `turnHold` does, or it will flicker left and right. The pond has no shared helper for this.
- Same-species spacing, if it doesn't school (the reef's `keepApart`), so crowds read as several animals.

## Adding plants, biomes and landmarks

- Pond biomes live in `placeBiomes` and `plantBiomes`. Every kind should appear before any repeats, and some should get a chance to sprawl.
- Static flora is drawn into cached strips (`floraBand`). Moving plants use bend springs and react to passing bodies (`bend`).
- Shallow biomes lift the bed, and pads should leave them their own water.
- Use `isWater`, `waterX` and `toWater` in the pond rather than the shore arrays.
- Check that a new patch fills the page centre as well as the sides, and that big ones are still light enough to draw.
- Landmarks should be used by animals. A prop that nothing perches on, hides in or swims round feels like set dressing.

## Adding an event

Reef: coral spawning, bait balls, whale falls. Pond: rain, mayfly hatch, evening chorus. An event should change what animals do, be visible from anywhere on the page, and be triggerable from the debug panel. Give it a small visual signature with particles, and test it by triggering it rather than waiting.

## Starting a new simulation

Build it in slices, showing Evan early, because a technically complete but empty world got the harshest feedback. The first pass of the pond was "dead" and "gross", and most of the later work went into looks. So put looks first this time:

1. **Agree the concept.** Which layers exist, and what the signature spectacle is. Offer a menu of animals and biomes in the usual format.
2. **Make an empty world beautiful before adding any animals.** Copy the pond's files as the starting point, with the `lib/`, host, page and CSS layers from the table above. Paint the floor, light and water or air until a still screenshot is pleasant. Compare it side by side with the reef. Avoid hard frames at the page edges: let the world run off them.
3. **Fill it.** Add plants and a few distinct biomes, then a broad cast at once, stocked in the opening view and all the way across the middle. Don't ship a sparse version: a world with five animals reads as dead.
4. **Add the systems:** food chains, life cycles, resting places and renewal of what gets consumed.
5. **Add the shared features:** inspect and adopt (`lib/adoption.ts`), a census closed by default, a Konami debug panel covering every species and event, and passing shadows if they suit it.
6. **Add events and polish:** squash and stretch, wakes, puffs, reactive plants and light.

To wire in the page:
- `contexts/ThemeContext.tsx`: add to `Page` and `setPage`.
- `index.tsx`: lazy-load the new page. Only the reef loads eagerly.
- `components/ThemeSwitch.tsx`: a new stop in `PAGES` with a pixel icon in `ICONS`, spaced to the stack.
- A theme CSS file re-colouring the pixel UI, scoped under the page's root class, hooking the marker classes (`content-card`, `section-title`, `hud-btn`, ...). Pixel frames for it can be generated like `scripts/pond-frames.mjs`.
- `.claude/skills/pixel-sim/scripts/bench.mjs`: an entry in `SIMS`.
- `CLAUDE.md`: a section in the code map.
