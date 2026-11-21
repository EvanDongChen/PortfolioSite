# Recipes

## A new object or landmark

```ts
const z = -0.1 * f;                      // depth: 0 = the content's plane
const R = 80 * s * k(z);                 // 80 CSS px on screen, scaled for depth and phone
const spot = pickClear(cands, obstaclesOf(B.bodies), f, viewW, viewH);
const body = B.body({ kind: 'thing', name: 'thing', pos: spot.pos, radius: R });
sphere(B, body, R, sp(z), d => ({ mat: M.moon, alb: 0.5 + noise(d) }));
```

- `sphere(B, body, R, spacing, surface)` covers a sphere with surfels. The
  surface function gets the unit direction and returns `{ mat, alb, n?, h?,
  flags? }`, or `null` to leave a gap (cloud shells use that).
- `lumpy` makes a noisy rock with normals taken from its bumps.
- For a part offset from the body's centre (an eye, a foot), record
  `B.solid.length` before calling `sphere`, then add the offset to x, y and z
  of every surfel from that index (stride 11).
- Add the new `kind` to `BodyKind`. If it's big, add it to `obstaclesOf` so
  later placements avoid it. The debug panel's "go to" finds bodies by kind.

## Placing things so they never overlap

Give `pickClear` several candidate discs (both margins, a range of page y),
in order of preference, and the obstacles. It returns the first with at
least `margin` clearance over every scroll, or the roomiest, with `room`.
If a candidate set can come up empty, drop the optional thing (`room < 0`)
rather than letting it overlap. Place unique things before repeated ones
(the garden moon goes before the colonies, which can then skip a spot).
Check results across sizes with a `screenClearance` sweep (see "In the page"
below), not one screenshot.

## A creature

Copy `buildBlip` and `newBlip`:

- One body for the main shape, with eyes (`F.eye`), antennae (`F.wobble`)
  and emissive tips; separate attached bodies for limbs so they can rotate
  (`attach: { parent, offset }`).
- Behaviour goes in `stepAliens`: set `body.live = { c, rot }`, `body.scale`
  for squash and stretch (a spring on `sq`), `body.params = [wobble, wobbleBase,
  blink ? 1 : 0, phase]`, and limb `live.rot` (rotZ raises an arm; rotY swings
  it forward).
- Faces point along local +z and up is local -y (y runs down the page).
  `uprightOn(n)` stands something on a sphere's surface at normal `n`.
- Make it react: notice the cursor (`toScreen` + distance), look at it, wave.
  Make it rest, blink, breathe. Give it a reason to move that a visitor can
  see within a minute.

## An event

In `lib/space/spaceEvents.ts`: add state, a `startEvent` case, scheduling in
`stepEvents` (first time soon after arrival, then every couple of minutes,
not overlapping the other big ones), and its effect on `light`. Bodies an
event uses are built once in `populateEvents` and parked at `PARKED` when
idle. Gate their glows with `G.gate` and `params[2]`. Add a button to
`SpaceDebugPanel`.

## A new shader effect

Add a flag to `F` or `G` (the next free bit), handle it in the vertex shader,
and pass any new uniform from `draw`. Glows only show against empty space; to
show over a solid, put the light in the glow's alpha as the aurora does, or
make it a solid surfel.

## In the page

`window.__space` (dev only) has `view` (with `view.scene`) and `build`.
Examples for pixel-sim's `shot.mjs --page space --eval`:

```js
// Start an event and wait for its best moment.
(async () => { window.__space.view.scene.events.eclipse.t = 0; await new Promise(r => setTimeout(r, 9800)); return 'ok'; })()

// Where is something? (scroll there with --scroll centre-450)
(() => { const sc = window.__space.view.scene; const i = sc.bodies.findIndex(b => b.kind === 'gardenmoon'); return sc.centres[i].map(Math.round).join(','); })()
```

`--zoom x,y,w,h,scale` takes y relative to the page top plus the scroll, so
for a viewport region use the viewport y with the matching `--scroll`.

A soak, run with `--eval` on any page:

```js
(async () => {
  const s = await import('/lib/space/space.ts'), a = await import('/lib/space/spaceAliens.ts'), e = await import('/lib/space/spaceEvents.ts');
  const sc = s.buildScene(1440, 900, 6500); const out = new Float32Array(sc.bodies.length * 20);
  const cam = { viewW: 1440, viewH: 900, scrollY: 0, offX: 0, offY: 0 }; let t = 40;
  for (let i = 0; i < 6000; i++) { t += 0.1; e.stepEvents(sc, 0.1, cam); a.stepAliens(sc, t, 0.1, cam, i % 50 < 25 ? { x: 150, y: 500 } : null); s.poseBodies(sc, t, out); }
  return [...out].filter(v => !isFinite(v)).length + ' non-finite';
})()
```

A clearance sweep: build scenes at several sizes (1440×900, 1280×720,
1920×1080, 1366×768, 390×844) and report `screenClearance` of each sight
against `obstaclesOf` the rest.
