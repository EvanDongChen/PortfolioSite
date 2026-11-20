# Gotchas

Each of these happened while building the space page.

**A glow that never shows.** Glows are only drawn where no solid pixel won the
vote. The first solar flare leaned toward the viewer, so on screen it sat over
the sun's face and vanished. Put glows where they stand against empty space
(on a limb, in the screen plane), or route their light through the glow
alpha the way the aurora does.

**A colour that comes out wrong.** Background and glows snap to
`SKY_PALETTE`. Before flame oranges and aurora greens were added, the flare
came out pale pink and the aurora purple. Any new glow hue needs its colours
in the palette (two or three steps of it).

**Details that disappear.** The 2×2 vote drops anything under about 2 art
pixels. The first blips were 10 art pixels wide and their faces were lost;
they were scaled up about 1.5×, pupils shrunk so the white shows, and smiles
thickened (smiles are still borderline). Size things for the vote, then
check with `--zoom`.

**Something reads as something else.** The first aurora was tall pink and
green spikes off both poles, and Evan read it as an object hidden behind the
Earth ("the earth is blocking one of the constructs"). Real phenomena from
space are subtle. Model them as they'd look (a thin green oval over a pole
tipped toward the viewer). When Evan says something is covering, blocking
or odd, ask what they're looking at, or look at the exact spot in a zoomed
shot, before guessing.

**Overlaps that come and go with scroll or window size.** Placement by "the
side away from the nearest planet" failed because deeper things scroll
slower. Use `pickClear` and check a sweep of window sizes.

**A blank page after an edit.** `space.ts`, `spaceAliens.ts` and
`spaceEvents.ts` import each other. Any top-level use of an imported binding
(`const screenOf = toScreen`, `const COLOURS = [M.blip]`) throws during
module evaluation and React renders nothing. Keep uses inside functions.

**A black canvas in development.** React StrictMode mounts, unmounts and
mounts again. Losing the WebGL context in cleanup left the second mount with a
dead context. `dispose` frees resources but keeps the context.

**A page's look leaking onto another.** Every theme rule is scoped to the
page's root class, and page switches now clear the other pages' classes.
Hot reloads during editing can still leave Evan's open tab in an odd state;
in a fresh tab check the computed style before changing CSS.

**A bad performance sample.** One throttled run showed 26 fps where the next
showed 60: a scene rebuild (the page height changed as a font loaded) landed
in the measuring window. Run the comparison twice. Don't write canvas styles
every frame; only when they change.

**Text effects on labels.** Heading styles with text-shadow or stroke also
apply to their `::before` labels unless those are reset.
