---
name: pixel-sim
description: Build and improve the living pixel-art simulations on Evan's portfolio site (the reef, the pond, and any new one). Use this for adding species, plants, biomes, landmarks or events; for suggesting what to add next; for reactions like "it feels dead", "it's ugly", "doesn't match", "not to scale" or "I don't see the X"; for starting a new simulation theme; and for polishing or speeding up a simulation. Use it even for a small tweak to anything in lib/pond*, lib/pixelOcean*, the reef or pond engines or their panels, and whenever the user asks "what should we add next", even if they don't say "simulation". Not for the non-pixel aquarium (App.tsx) or for changing the portfolio's written content.
---

# Pixel simulations

The site's backgrounds are small living worlds that a visitor scrolls through. What follows comes from building two of them with Evan, including everything they rejected and why. CLAUDE.md has the code map; this skill holds the taste and the working method.

Read [references/architecture.md](references/architecture.md) before adding anything to a simulation or starting a new one. When something looks or behaves wrong, check [references/known-problems.md](references/known-problems.md) first, because most of these bugs have happened before.

## What makes a good one

The standard is the reef: it is pretty, busy and believable. When the pond fell short, the complaints were "dead", "plain", "gross" and "not pretty like the ocean". A simulation can work correctly and still fail, so judge it as something to look at first and as a system second.

**It looks beautiful at a glance.** Open the screenshot and ask whether someone would stop and look. Prefer luminous water, saturated jewel-like accents against calm backgrounds, soft gradients and organic shapes. Colour matters: Evan liked the swaying seagrass and seaweed and immediately asked for more colourful options in the same vein.

**It is alive the moment you arrive.** Animals should already be moving in the first view, not spawning in later. Every part of the page must be stocked, particularly the middle columns: the pond once had full sides and a bare centre. The opening view gets a deliberate share of the population (see `someZ`).

**Behaviour has to be visible.** A behaviour nobody can see might as well not exist. Make the verbs legible and big: Evan wanted to *see* beavers swim far out and drag logs back, not have logs quietly accumulate. Before calling a behaviour done, confirm that it happens often enough, on screen, to be noticed by someone watching for a minute. "I don't see the garden eels" is a bug report.

**It reads as what it is.** A whale fall must look like a whale fall. Puffers crowded around an anemone must read as several puffers. If it needs a label to be understood, redraw it.

**It works like an ecosystem.** Animals eat, flee, rest, breed and die, and things depend on one another. Evan asks the questions a naturalist would: "do the swallows ever land?" and "isn't there a finite supply of logs?" So give every animal somewhere to rest, make every consumed resource renew itself (driftwood floats in), and make sure the world still looks good after an hour. Everything should be animated, with particles where they earn it. Violence is welcome: fish get bitten in half, with blood, rather than vanishing.

**Generation has variety and character.** Prefer distinct biomes over one evenly spread texture. Mix patches of a single variety with mixed ones, and give some a chance to sprawl to twice the usual size or more. Simulated, reactive plants that sway and bend away from swimmers are a favourite.

## What Evan doesn't like

Each of these was tried and rejected. Don't bring them back without being asked.

| Avoid | Do instead |
|---|---|
| Dark outlines on sprites, or dark rings round islands ("it really looks weird") | Shade edges with the sprite's own colours: lighter on the lit side, a step darker beneath. This overrides the pxl skill's advice to use its `outline` option, so leave `outline` off |
| New art in a different style ("looks like a different art style", said more than once) | Put the new sprite beside existing ones and match their detail, palette and pixel size before showing it |
| Things out of scale (shark the size of an octopus, logs the size of lily pads) | Check every new thing against its neighbours; see `SIZE` in each view |
| Literal per-cell simulation ("way too pixel") | Pixel-art sprites moving freely, seen in 2.5D from slightly above, scrolling with the page |
| Hard edges and jarring framing (land down the sides, abrupt cuts) | Gradual fades, and water that runs off the page edges. Keep most of the world open and let a few planted islands punctuate it |
| Bare land, plain grass, ugly filler props | Plant everything. If a structure comes with ugly props, redraw it instead of accepting it |
| Day/night cycles, the shipwreck, coral bommies, parrotfish | Leave them out. Don't re-propose them |
| Abrupt or unnatural transitions (the "unpixelation" intro) | Pixel-styled transitions are good, as long as they are gentle |
| UI that looks AI-generated, or default-styled icons on a pixel page | A bespoke pixel look for every control. Hold UI to "could win best design at a hackathon" |
| Scenery under the hero text, or effects that drift against the page on scroll | Keep clear zones in world space, faded at the edges, and pin effects to the world |

## How to work with Evan

**"What should we add next?" means a menu, not work.** Don't start building, and don't explore the code at length first. Reply with plenty of ideas, about 15 to 25, grouped by animals, plants and biomes, events and visuals. Write each one as a name and one sentence about what you'd *see* it do:

> Mantis shrimp: lives in a burrow and strikes passing crabs with a flash and a crack.

Evan answers by pasting back the ones they want, often edited, so each line has to stand alone. Their pasted text is the spec, including details they added. Favour things you can watch: new animals and how they behave, plants, biomes, events and graphics polish. These are what Evan has picked. Site features, infrastructure and abstract systems haven't been, including deep ideas like evolution or water currents when they were offered. If they say "more" or "I don't like these", give a fresh batch with different ideas rather than rewording.

**Change only what was asked.** Evan said the moss was following the screen, and the response was to turn the whole reef into a fixed backdrop. The reply was "No what why did you do all this, revert." When a request is narrow, keep the change narrow, and never answer a bug report with an architecture change. If it can be read two ways and the readings differ a lot in size, ask one short question. If a change goes wrong, revert it cleanly rather than patching over it. When they say a small imperfection is fine ("It's okay if there is a little bit"), stop working on it.

**Believe what they see, even if you can't reproduce it.** That same moss bug was reported three times while tests said the code was correct. It was real: a frozen canvas that only appeared in their dev setup. If your test disagrees with their eyes, your test is missing something, so keep looking for the cause rather than explaining why it should be fine.

**A repeated complaint means the last fix failed.** "The logs are *still* so tiny" means it wasn't fixed enough to notice. Make the next change bold enough to be obvious, and compare before and after screenshots yourself.

**Take aesthetic complaints at face value.** "It's ugly" and "lock in" are not requests for a discussion. Look at a screenshot, name what specifically looks wrong, fix it properly, and look again. If the direction itself is wrong, be willing to discard it: the pond's land layout was rebuilt several times before settling on mostly open water.

**Decide the technical details yourself.** Evan cares about the result ("whatever keeps the performance good"). Do propose concrete choices when they asked for a proposal, as with the list of size changes.

**Keep the dev server running so they can look.** Start it if it is down, and restart it after anything that kills it.

**Keep replies short.** Say what changed in terms of what they will see, and mention any real trade-off. Skip the implementation tour unless they ask.

**Only push when told to.** "Push when you're done" and "if performance is good, push" are common. The second means you must measure first and report the number. Follow the Git section of CLAUDE.md, including no AI attribution on commits, even when a default says otherwise.

## The build loop

1. **Look at the existing thing first.** Read the nearest relative in the code (a similar animal, plant or event), and copy its structure and art treatment.
2. **Draw the art with the pxl skill**, then view it enlarged beside existing sprites from the same simulation. Fix style and scale before writing behaviour.
3. **Write the behaviour**, starting from what the viewer should see, and follow the checklist in [references/architecture.md](references/architecture.md).
4. **Look at it in the real page.** Use the bundled script (below), at desktop and phone widths and at several scroll depths, including the opening view. If a behaviour needs time to appear, wait for it or trigger it through the debug panel's methods, then actually read the images. Type-checking says nothing about whether it's pretty.
5. **Let it run.** Step a world for a few simulated hours in Node and check that populations and resources haven't collapsed or exploded.
6. **Measure performance** against the previous commit, and keep it level. New features must pay their way (see below).
7. **Critique it as Evan would** with the checklist below, fix what fails, and only then report back.
8. **Finish up:** run `npx tsc --noEmit` with no new errors, make small commits whose messages describe what the visitor sees ("Have the beavers tow logs home from far off"), and update the code map in CLAUDE.md for anything new.

### Before showing Evan

- Is it pretty in a screenshot, at normal size?
- Does the new art match its neighbours, with no outlines, at the right scale?
- Can you see the new behaviour without looking for it?
- Is it animated, with particles where they'd help?
- Is the first view busy, including the middle of the page?
- Is the hero text still readable? Do effects stay put when you scroll?
- Does it look right on a phone?
- Is performance level with the last commit?
- Is everything new reachable from the debug panel and counted in the census?

## Tools

Both scripts need Node 22+. Run them from the repo root and write images to the scratchpad. They need the dev server on port 3000, except `bench.mjs --no-draw`.

```bash
# Screenshots: --page reef|pond|aquarium, several scroll depths, optional phone size
node .claude/skills/pixel-sim/scripts/shot.mjs --out <scratchpad>/pond --page pond --scroll 0,900,1800
node .claude/skills/pixel-sim/scripts/shot.mjs --out <scratchpad>/pond-phone --page pond --phone
# Enlarge a region (x,y,w,h,scale) to judge sprites up close
node .claude/skills/pixel-sim/scripts/shot.mjs --out <scratchpad>/zoom --page pond --zoom 200,100,300,200,3

# Performance: step and draw ms, with step time compared to a git ref
node .claude/skills/pixel-sim/scripts/bench.mjs pond --base HEAD
```

`shot.mjs --eval '<js>'` runs code in the page before the shots. The pond can run on the main thread with `--query pond-main`, which exposes the engine as `window.__pond` for spawning things or reading `drawCost`. The reef runs in a worker with no such hook, so to stage a reef scene, `--eval` can `import('/lib/pixelOcean.ts')` and build one directly.

Page cards cover the centre of the page, so judge the world from the gutters and the gaps between cards, as a visitor would.

### Performance

Performance is a hard requirement, and optimising must not change the look or remove features. Evan's phrase was "while keeping all our current features intact". The usual ways to keep it level:

- Cache what doesn't change: floors and flora drawn once into strips, sprites drawn once per frame variant.
- Do less per tick: update some things on alternate ticks, and use grids so that creatures only check what's near them.
- Draw only near the view, and let the page's own scrolling move canvases that are already drawn.
- Run the simulation in the worker, and avoid any React or CSS work per frame.
- Let finishing touches drop out through `lean` when draw time climbs. They must fade, not blink.
- Patch sizes and population caps are the easy place to lose performance, so re-measure after adding a big biome.
