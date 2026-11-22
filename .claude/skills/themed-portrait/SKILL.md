---
name: themed-portrait
description: Make or update the animated, per-world profile portraits on Evan's portfolio site — his photo cut out with a recoloured tie and graded light, standing in front of a live pixel-art scene of the world that slides apart from him on cursor move or phone tilt (lib/portraitScenes.ts, components/PortraitScene.tsx, scripts/person.py). Use this for a new photo, a new world's portrait, changing a portrait's backdrop creatures or motion, tie colours, framing ("I'm not centred"), the parallax, or "my portrait doesn't match the page".
---

# Themed animated portraits

On every pixel world the profile photo is two layers inside `.profile-frame`:

1. **Behind:** a live pixel scene of that world, drawn on a 120×120 canvas
   scaled up with `image-rendering: pixelated`.
2. **In front:** Evan cut out of his photo (`public/images/portraits/person-<world>.webp`).
   The tie is recoloured to the world and the light is graded toward the world's,
   with a soft rim of its colour on one edge.

As the cursor moves anywhere on the page, the scene slides away from it and the
person towards it, eased, so he stands in front of the world. On phones,
device tilt drives it; iOS asks permission on the first tap of the photo. The
archived aquarium keeps the plain `images/profile.webp`.

## Where things live

- `components/ProfilePhoto.tsx` picks `PortraitScene` when `isPortraitWorld(page)`,
  else the plain photo. Drag-to-spin wraps both.
- `components/PortraitScene.tsx`: the canvas, the person `<img>`, the parallax
  (`SCENE_SHIFT`, `PERSON_SHIFT`; scene scaled 1.12 and person 1.08 so the edges
  never show), one rAF loop that eases the layers every frame but redraws
  the canvas at 15 fps (8 on the `low` tier). It pauses off screen
  (IntersectionObserver) and when the tab is hidden, and draws one still frame
  under reduced motion.
- `lib/portraitScenes.ts`: the scenes. Each world is a function returning
  `paintStatic` (drawn once: gradient, moon, torii, planets) and
  `paintFrame(ctx, t)` (the motifs, from time `t` in seconds). Helpers:
  `gradient` (banded, dithered seams), `sprite(rows, x, y, pal, flip, s=2)`,
  `disc`, `dot`, `ring`, a seeded `rng`, `wrap`, and `visible`/`scatter`,
  which keep fixed motifs off the head and shoulders.
- `.claude/skills/themed-portrait/scripts/person.py`: makes the person layers.
  Source photo: `image-originals/evan_portrait_base.png`.

## Making the person layers

```sh
pip install "rembg[cpu]" pillow numpy   # first cut downloads a ~1 GB model to ~/.rembg
python .claude/skills/themed-portrait/scripts/person.py \
  --src image-originals/evan_portrait_base.png --out public/images/portraits
# one world:   --world pond
# fit the tie: --check-tie  (writes tie-check.png: the mask in magenta)
```

The cutout (rembg's `birefnet-portrait`, clean round hair and glasses) is
cached as `<src>.cut.png` beside the source; it is git-ignored, and you delete
it to redo the cut. Each world's tie, tint, rim and gamma are in `WORLDS` at the
top of the script; keep them in step with that world's palette in its
`styles/<world>-theme.css` and its scene.

**A new photo** needs three constants refitted, all in the source photo's pixels:
- `CENTRE_X`: centre between the face and the shoulders, not on either. The
  first version centred on the photo and Evan read as off-centre.
- `ZOOM`: about 1.1. The bottom edge stays put, since the shirt runs off the frame.
- `TIE_POLY`: run `--check-tie` and adjust it until the magenta covers the tie.
  It can be generous: only dark and pink pixels inside it change. For a
  different tie, retune the `pink` and `darkw` weights in `recolour_tie`.

Check the layers with a contact sheet before shipping, and look at the ties up
close: a mask that is too loose stains the shirt's shadow beside the knot.

## Adding or changing a world's scene

1. Write the world function in `lib/portraitScenes.ts`, add it to `WORLDS`
   there (the `PortraitWorld` type, `isPortraitWorld` and so `ProfilePhoto`
   follow), and add its row to `WORLDS` in `person.py` and run it.
2. **Use the world's own creatures.** Evan noticed koi in the pond portrait,
   which the pond page doesn't have, and had them swapped for its dragonflies
   and butterflies. Copy sprite rows and colours from that world's art file
   (for example `lib/pond/pondArt.ts`) rather than inventing new animals.
3. Size motifs for the display: the photo shows at 256px (192 on phones), so a
   sprite under ~8 art pixels across at `s=2` turns into a speck.
4. Moving motifs may pass behind the head, which helps the depth. Keep fixed
   ones where they show, using `scatter`/`visible`.
5. Motion recipes already in use: swim across and wrap, with a tail flick and bob
   (reef fish); dart to a `visible` spot, then hover with the wing frames
   swapping fast (pond dragonflies); Lissajous loops with an open/half wing
   flap (butterflies); flicker from two sines on glow radius and core colour
   (lanterns); drift and wrap (clouds, petals); rise with fading
   `globalAlpha` (steam); blink by `sin > threshold` (stars, glints); a timed
   streak (the shooting star every 8 s). State that steps over time (the
   dragonflies) gets `dt` from the last `t` inside the closure.
6. Night worlds stay dark and lit by their lanterns; no outlines on sprites;
   no humans other than Evan himself; no wakes.

## Checking it

`npx tsc --noEmit`, then on `npm run dev` screenshot the photo per page with
`.claude/skills/pixel-sim/scripts/shot.mjs --page <world> --zoom 924,310,280,280,1.5`
(the frame sits at about x 936, y 322 at 1440×900). The site now opens on a
random world, so make sure the shot really switched; look at the result. To
check the parallax, pass `--eval` with a promise that dispatches a
`pointermove` and reads the canvas's and img's `style.transform`. Also look at
phone width.
