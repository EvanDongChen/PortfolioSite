# The pipeline

## Data

**Bodies** (`Body` in `lib/space.ts`) are the moving things: a planet, its
ring, a blip, a blip's arm, a meteor. Every surfel and glow belongs to one
body and is stored in that body's local frame. Each frame `poseBodies` writes
`OBJ_TEXELS` (5) RGBA-float texels per body into a one-row texture:

| Texel | Holds |
|---|---|
| 0–2 | Rows of a 3×4 matrix: rotation × `scale`, and the centre |
| 3 | The sphere that can shadow this body (centre, radius; radius 0 for none) |
| 4 | State: wobble amount, wobble base height, blink-or-beam gate, phase (`params`) |

A body is posed in this order of precedence: attached (`attach`: its parent's
rotation × its own `live.rot` or `base`, at an offset in the parent's frame,
scaled by the parent's `scale`), driven (`live.c`/`live.rot`, set by
behaviour), or free (`centreAt`: orbit, drift, path or bob, plus spin). Parents
must come before their children in `bodies`.

**Surfels** have `SOLID_STRIDE` (11) floats: x y z, nx ny nz, disc radius,
material, albedo, body, flags. **Glows** have `GLOW_STRIDE` (11): x y z,
radius, r g b, body, flags, seed, stream length.

Surfel flags (`F`): `emissive` (albedo is the shade, no lighting), `twoSided`
(rings, stalks), `star` (one art pixel, snapped to the grid, twinkles),
`wobble` (sways with height above the wobble base; frizzes during a flare),
`eye` (hidden while the body blinks), `light` (chasing light, albedo is its
place in the chase), `front` (black hole disk: nearer than the hole, so the
lensing leaves it alone).

Glow flags (`G`): `stream` (moves out along local +x, fading; with `gate` it
runs fast, like water), `flicker`, `beam` (motes rising toward the source,
gated), `wobble` (follows the antenna; brightened by `u_antenna`), `gate`
(brightness × the body's state), `arc` (travels up and over a loop as wide as
its length), `aurora` (ripples round a pole; its light may fall over solids).

## Projection

There's no view matrix. In the shaders a world point maps to the window as:

```
d     = focal - w.z
scale = focal / d
s     = viewHalf + (w.xy - camXY) * scale + lean
```

where `camXY = (viewW/2 + lean.x, scrollSnapped + viewH/2 + lean.y)`. With the
pointer lean added both inside and outside, the plane z = 0 stays pinned to the
page while deeper and nearer things shift: that's the 3D feel. Depth goes to
the depth buffer linearly between `u_near` and `u_far`. `toScreen` and
`fromScreen` in `space.ts` do the same maths on the CPU (for the cursor, for
placing a meteor or the eclipse moon on screen).

The canvas is fixed, one art pixel taller than the window, sized in art
pixels and scaled up with `image-rendering: pixelated`. It's nudged up by
whatever part of the scroll the snapped camera left over.

## The three passes (`lib/spaceView.ts`)

1. **Solid**: surfels as `gl.POINTS` into an RGBA8 target at 2× art
   resolution with a depth buffer. The vertex shader poses, culls back faces,
   lights from the sun (the light leans toward the viewer so worlds show a
   lit face), tests the shadow sphere, and outputs a continuous shade. The
   fragment shader cuts the point to a disc, picks a ramp step with a
   light 4×4 Bayer dither, and writes material, shade index, the front flag
   and coverage. It never writes a colour.
2. **Glow**: glows as soft points, additive, into a second 2× target (half
   float where the GPU allows), sharing the depth buffer with depth writes
   off, so solids hide what's behind them. Alpha carries how much of a glow
   may fall over solids (only the aurora uses it).
3. **Pixel**: one fragment per art pixel. Black-hole lensing first: inside
   the horizon it's black; around it the sample point is bent inward
   (`rs = r - rh²·1.15/r`), with a bright photon ring, unless the pixel is
   the disk's near side. Then: if 2+ of the 4 samples are solid, the
   (material, shade) most of them chose wins; edge pixels shift one shade of
   their own ramp (lighter if lit, darker if not), never to an outline; any
   over-solid glow is dithered in as its nearest sky colour. Otherwise the
   pixel is the ink colour plus glow plus the event tint, snapped to the two
   nearest `SKY_PALETTE` colours and Bayer-dithered between them, which is
   what turns nebulae into flat pixel bands.

Uniforms that come from events (`events.light`): `u_sunGain` (flare up,
eclipse down), `u_glowGain`, `u_antenna`, `u_aurora`, `u_frizz`, and
`u_tint` (the flare's warmth in the sky).

## Each frame (`SpaceView.draw`)

`stepEvents` → `stepAliens` → `poseBodies` → upload the body texture → solid
pass → glow pass → pixel pass. Behaviour runs on the main thread with the
real `dt` (0 when reduced motion is on); the scene is only rebuilt (in the
worker) when the window width, height or page height changes a lot.

## Sizes worth knowing

- Art pixel: 4 CSS px (5 or 6 on lower tiers, 3 on phones).
- `SPACING` 3 CSS px between surfels as seen on screen, discs 1.7× that wide.
  Small detailed things (blips, flowers) use half the spacing.
- The scene is about 260k surfels and 2k glows on a desktop page; it builds in
  about 0.5 s in the worker and draws at 60 fps on integrated graphics.
