# Problems we've already had

Each of these came up in the reef or the pond. Search here by symptom. When adding something similar, avoid the cause in advance.

## Flicker and popping

| Symptom | Cause | Fix |
|---|---|---|
| Animals flip left and right rapidly | Facing followed the sign of the velocity directly, so small jitters flipped it | Use a threshold, and hold a new heading for a few ticks (`turnHold`). Add a margin to any state that switches on a boundary, such as hiding |
| Sun rays or shafts flicker in and out, mostly on slower machines | Draw cost hovered around the `lean` line, so the effect switched on and off, and it was drawn all-or-nothing | Require draw cost to stay past the line for a while before switching (`LEAN_HOLD_MS`, `RECOVER_HOLD_MS`), and ease the effect's strength instead of toggling it. Apply fixes to both simulations, since they share this code shape |
| Crowds look like a single blob | Same-species fish stacked on the same spot | Personal space (`keepApart`) |
| Seabed freezes on a stale frame in development, which then slides down the page and looks like scenery following the screen | React mounts twice in development onto the same canvas. The second view skipped making its pixel buffer because the canvas was already the right size | Each view makes its own buffers regardless of canvas size. Any new view must survive a double mount |

## Scrolling

| Symptom | Cause | Fix |
|---|---|---|
| Effects move with the screen instead of the world (shadows, moss gaps) | They were positioned in view space | Pin them to world coordinates. After any such change, take shots at two scroll depths and compare |
| Moss cut off hard around the hero, or still behind the text | The clear zone had a sharp edge, and was measured before the pixel fonts loaded and the hero finished sliding in | Fade it with a dithered edge (`clearMask` on the reef), and re-measure after fonts load and the hero settles. A little overlap is fine |
| Making the world a fixed backdrop | Tried and reverted | The world scrolls with the page. Don't revisit this |
| Page seems to zoom in a few seconds after loading | The frame-rate check dropped the quality tier, which rebuilt the world with bigger pixels and restarted the simulation | Set the pixel size once when the world appears. Only a tier picked by hand in the performance panel may change it |
| Scrolling is janky | Per-frame CSS animation or React work, or layout from `top` | Use a slow shared timer for blinking, `transform` instead of `top`, re-render only when values change, and redraw on scroll only when new sprites can come into view |

## Looks

| Symptom | Cause | Fix |
|---|---|---|
| New art "looks like a different style" | Drawn alone, without reference to existing sprites | Compare side by side; match pixel size, detail and palette. Redraw rather than tweak |
| Dark ring round islands, dark rims on pads | Edge-darkening or outlining passes | Remove them and shade in the object's own colours |
| Things look off in size | Each was sized alone | Compare the whole cast; use `SIZE`. Logs ended up 34 to 60 cells long, drawn stouter as they grow |
| Water looks like a flat dark sheet | Tiled pattern, caustics that visibly repeat, deep water too dark | Caustics fading with depth, no visible tiling, clear enough water that swimmers show, and reflections broken up by ripples |
| Middle of the page is empty | Plants only rooted in the shallows, and the shallows hugged the sides | Add shoals and rafts down the middle regardless of depth. Check shots through the centre column |
| Land reads as bare or ugly | Plain grass, few plants, framing banks | Few islands, densely planted, with most of the page as water |
| A pixel-art icon looks wrong on the page | Default-styled control or SVG on a pixel page | Draw a pixel icon, including the favicon |

## Behaviour and balance

| Symptom | Cause | Fix |
|---|---|---|
| "I don't see them" | Too few, too small or placed away from the view, or spawned only at the edges | Check placement and counts at several depths. Make them bigger, more numerous, or stock them in the opening view |
| A behaviour happens but nobody notices (beavers) | Short distances, or too rare or off-screen | Make the journeys long and the action large. Tow visible logs behind them (`Log.angle`, `trail`) |
| A resource runs out over time | Nothing replenishes it | Add a source (`driftIn`). Run the world for simulated hours to catch this |
| An animal never rests | Only a moving state exists | Add perches and a resting state (`roosting`, `planRoost`) |
| Companions overlap (drake on hen) | Follow target was the partner's position | Follow from a body-length back |

## Load and first paint

| Symptom | Cause | Fix |
|---|---|---|
| Unstyled flash before the pixel theme applies | CSS or class applied late | Set the class and critical style in `index.html` before first paint |
| Build fails intermittently on an inline `<style>` in `index.html` | Vite's HTML proxy for inline style blocks breaks when the drive letter's case varies (`C:\` vs `c:\`) | Use `style` attributes in `index.html`, which Vite leaves alone |
| World takes a while to appear | Whole-page terrain painted on the first frame | Paint around the view first, and the rest in bands over later frames. Compute noise per row and column once |
