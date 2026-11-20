---
name: pixel-3d
description: Build and improve real 3D scenes that are rendered as pixel art on Evan's portfolio site — the surfel ("pixel-art Gaussian splat") pipeline behind the deep-space page (lib/space*.ts, components/SpaceSky.tsx), and any new theme built the same way. Use this for anything on the space page (planets, aliens/blips, saucers, events like meteor showers or eclipses, the black hole, aurorae, the garden moon, its lettering or debug panel), for "make it 3D", "3D but pixel art", "like the space page", Gaussian-splat or voxel-looking ideas, for starting another 3D-to-pixel theme, and for fixing how such a scene looks or performs (things overlapping, features too small to read, colours snapping wrong, glows not showing). Use it alongside pixel-sim, which still holds Evan's taste and working rules; this skill holds the 3D technique.
---

# 3D scenes as pixel art

The space page is a real 3D scene drawn as pixel art, after
[cobanov/pixelart-gaussiansplat](https://github.com/cobanov/pixelart-gaussiansplat).
Evan loves the result. Everything in it is a cloud of small flat discs
(surfels) with a material and a shade, plus a second cloud of soft glows.
The renderer draws them at twice the art resolution and turns each 2×2 block
into one art pixel by coverage and vote. That's why it reads as hand-made
pixel art, not as a blurry downscale: colours are never averaged, so every
pixel is a real palette colour.

**Read the pixel-sim skill too.** Its "what makes a good one", "what Evan
doesn't like" and "how to work with Evan" sections apply here unchanged (no
dark outlines, things must be visible and alive, a narrow request gets a
narrow change, menus of ideas rather than unasked work, commit small, push
only when told). This skill only adds the 3D technique.

Before changing code, read [references/pipeline.md](references/pipeline.md)
(how the data and the three passes fit together). When adding something, use
[references/recipes.md](references/recipes.md). When something looks wrong,
check [references/gotchas.md](references/gotchas.md) first; nearly every bug
in it happened once already.

## The files

| File | Job |
|---|---|
| `lib/space.ts` | Builds the scene (`buildScene`, no DOM): palette ramps, flags, noise, surfel builders (`sphere`, `lumpy`, rings), the sun, planets, asteroids, comet, nebulae, galaxy, black hole, aurorae. `poseBodies` writes every body's transform each frame. Placement helpers (`screenClearance`, `obstaclesOf`, `pickClear`) and screen maths (`toScreen`, `fromScreen`, `uprightOn`) |
| `lib/spaceAliens.ts` | The creatures: blips (`buildBlip`), saucers, colonies on rocks, the garden moon. `stepAliens` runs their behaviour every frame |
| `lib/spaceEvents.ts` | Meteor showers, the solar flare, the eclipse; `events.light` carries their effect on the lighting |
| `lib/spaceView.ts` | WebGL2 renderer: solid pass, glow pass, pixel pass. Calls `stepEvents`, `stepAliens`, `poseBodies` each frame |
| `lib/spaceWorker.ts` | Builds the scene off the main thread (it takes about half a second) |
| `components/SpaceSky.tsx` | The host: one fixed canvas, scroll-snapped camera, pointer lean, frame pacing, debug hooks (`window.__space` in dev) |
| `components/SpaceDebugPanel.tsx` | Konami-code panel: events, jump-to, speed |
| `SpaceApp.tsx`, `space-theme.css` | The page and its look (retro disco lettering) |

## How the world sits on the page

Coordinates are CSS pixels: x across the page, y down it, z toward the
viewer. The camera sits at z = focal, follows the scroll and is snapped to
whole art pixels, so **the plane z = 0 scrolls exactly with the content** and
anything deeper parallaxes behind it. Keep that in mind for everything:

- Place things by where they should appear (`at(sx, y, z)` turns "this share
  of the width, at this page y" into world coordinates for that depth).
- Sizes are given as *apparent* CSS pixels and multiplied by `k(z)`, so
  something deep is built bigger to look the right size. Surfel spacing does
  the same (`sp(z)`).
- Deep things scroll slower, so two things that look apart at one scroll can
  meet at another. Never place by page y alone: use `pickClear` with
  `obstaclesOf` (see recipes).
- The page cards cover the middle, so sights live in the margins. Keep the
  hero's left margin for a blip colony; the sun owns the top right.

## Building something new

1. **Look at the nearest relative** in the code (a blip for a creature, the
   flare for an effect, the garden moon for a landmark) and copy its
   structure.
2. **Model it in surfels** at a size that survives the vote: anything that
   must read (an eye, a mouth, a flower) needs to be at least 2 art pixels
   across. Creatures are about 27 CSS px in radius for that reason.
3. **Colour it with ramps, not RGB.** A surfel has a material (a ramp of 6
   shades, cool shadows to warm light) and an albedo. Add a ramp to `RAMPS`
   if nothing fits. Glows snap to `SKY_PALETTE`, so a glow in a new hue needs
   that hue added there or it will come out as the nearest pink or teal.
4. **Animate it through its body**: `live` (position and rotation), `scale`
   (squash and stretch), `attach` (parts that ride a parent, like arms or a
   watering can) and `params` (wobble, blink/beam gate, phase). Shader flags
   do per-surfel motion (antenna wobble, chasing lights, streams, arcs).
5. **Look at it in the page** with pixel-sim's `shot.mjs`, zoomed (`--zoom`)
   and full-size, at desktop and phone widths. Stage it with `--eval` through
   `window.__space.view.scene` (start an event, scroll to a body; see
   recipes). Judge it as Evan would before saying it's done.
6. **Soak it**: step the world for ten simulated minutes in the page (recipe
   in recipes.md) and check for NaN, stuck states and runaway counts.
7. **Measure**: `node .claude/skills/pixel-3d/scripts/pages-perf.mjs` compares
   frame rate, slow frames and main-thread time across the pixel pages, plain
   and with the CPU throttled. Space should match the others. Run it twice;
   a scene rebuild during a run makes one sample look bad.
8. **Finish**: `npx tsc --noEmit` with no new errors, a small commit named for
   what the visitor sees, and the space section of `CLAUDE.md`'s code map
   updated.

## Starting another 3D theme

Copy the space files as the template (`space.ts`, `spaceView.ts`,
`spaceWorker.ts`, `SpaceSky.tsx`, `SpaceApp.tsx`, the theme CSS and its
frames script) and wire the page in as pixel-sim's architecture reference
describes (`ThemeContext` page and preload, `index.tsx` lazy load,
`pageLoaders`, `pageTransition` colours, a `ThemeSwitch` stop with a pixel
icon, theme colours). The renderer is generic: a new world mostly means new
builders, ramps and a sky palette. Make the empty world beautiful first, as
pixel-sim says, then fill it.
