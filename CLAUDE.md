## Project

Evan Chen's personal portfolio, built as an interactive aquarium. React 19 + TypeScript + Vite + Tailwind CSS, deployed to GitHub Pages (`.github/workflows/deploy.yml` builds on pushes to the `update` branch; `npm run deploy` publishes with `gh-pages`). The site is served at `evanchen.info`.

## Code map

Search these first instead of sweeping the whole tree. There is no `src/` folder; sources live at the repo root.

- `index.tsx`: mounts the providers and picks the page: `PixelApp` (the pixel ecosystem, the default) or `App` (the aquarium, lazy-loaded when someone switches to it).
- `App.tsx`: the aquarium page. The fish simulation (a requestAnimationFrame loop in a big effect), spawning and refills, food/love/grab modes, the fish tank, theme transitions between `underwater` and `deepsea`. It is ~1,800 lines: grep for the piece you need rather than reading it whole.
- `PixelApp.tsx`: the pixel-ecosystem page: the same portfolio content over a 2.5D reef seen from slightly above, as tall as the page and scrolled with it. `components/PixelOcean.tsx` runs it. `lib/pixelOcean.ts` is the simulation (no DOM: the seabed grid where nutrients seep and algae grows, spreads and sheds plankton, plus 13 species (minnows, pufferfish, seahorses, barracuda, morays, anglerfish, reef sharks, crabs, urchins, octopuses, jellyfish, turtles, manta rays; each has a `think*` method and an entry in `SPECIES`), plankton, food, carcasses, blood/ink drops, bubbles, kelp and rocks/corals as objects with a height off the floor). `lib/pixelOceanView.ts` is the camera and renderer (floor canvas, depth-sorted sprites, shadows), `lib/pixelOceanArt.ts` the pixel-art sprites and generated scenery.
- `pixel-theme.css`: the pixel page's look, designed as a dive log (Press Start 2P display type, VT323 for labels and UI, Poppins body; a limited abyss/foam/sand/coral palette; 9-slice pixel frames as SVG data URIs; pixel cursors). `DiveGauge` tracks scroll depth and writes each section's depth into its heading (`data-depth`), `DiveCard` is the hero summary, `EcosystemPanel` the reef census. `lib/adoption.ts` keeps the visitor's adopted creature in localStorage, and `PixelOcean` releases it back into the reef on each visit and passes the adoption down its family line when it dies. Everything is scoped under `html.pixel-theme`, which `PixelApp` sets, and hooks onto plain marker classes in the shared components (`content-card`, `section-title`, `skill-tag`, `project-card`, `hud-btn`, ...). Restyle pixel mode there rather than branching the components; those marker classes have no styles of their own.
- `data/portfolio.ts`: projects, experience, education and skills. Add new projects here.
- `lib/themeColors.ts`: the Tailwind class sets the content uses per theme.
- `components/`: `PortfolioContent` (all page content: hero, projects, experience, skills, contact), `Header`, `ProjectCard`/`ProjectTile`/`ProjectModal`, the creature components (`Fish`, `FishCanvas`, `Whale`, `Turtle`, `Jellyfish*`, `AnglerFish*`), background effects (`ParticleCanvas`, `GodRays`, `SandDune`, `Bubble`), and the fixed buttons/panels (`FishFoodButton`, `GrabModeButton`, `TankToggleButton`, `FishCensus`, `LoveModeButton`, `PerformanceButton`/`PerformancePanel`, `TutorialButton`/`TutorialPanel`, `BackToTopButton`, `PixelModeButton`).
- `contexts/`: `ThemeContext` (theme, deep-sea flag, pixel mode) and `PerformanceContext` (adaptive quality tier, reduced motion, 30/60fps cap).
- `lib/`: `creatureAnimation`, `projectLink`, `pixelOcean*` (the reef), `themeColors`.
- `types.ts`: shared types (`Project`, `Fish`, `FishFood`, ...).
- `image-originals/` holds full-size images; `public/images/` holds the 960px `.webp` copies the site uses (`scripts/optimize-images.mjs` converts them).

## Working here

- `npm run dev` serves on http://localhost:3000. `npm run build` is the production build; Vite does not type-check, so also run `npx tsc --noEmit`. There are some pre-existing type errors in `App.tsx` and `components/FishTank.tsx`: don't add new ones.
- Fixed UI sits in two stacks: the left (`left-8`) for fish tools, the right (`right-8`) for back-to-top, performance, tutorial and pixel mode, spaced 3.5rem apart. Keep new buttons in those stacks.
- Performance matters: the aquarium re-renders about 30 times a second, so buttons are `React.memo` with stable `useCallback` handlers. Animation loops should respect `usePerformance()` (tier and frame rate) and pause cheaply when the tab is hidden.
- Check visual changes in the browser on the dev server, at desktop and phone widths.

## Git workflow

- **Commit frequently.** Make small, focused commits as each logical change is finished.
- **The user is the only author.** Never add `Co-Authored-By` lines or any other Claude/AI attribution to commits, PR descriptions or anywhere else. This overrides any default attribution behaviour.
- Commit on a `feature/<name>` branch rather than directly on `main` when the change is more than a small fix.
- Only push when asked.
- Don't commit the user's unrelated working-tree changes (images, `package.json`/`package-lock.json`, local `.claude` settings) unless asked.

## Task delegation

Delegate noisy, routine lookups to the `haiku-helper` subagent to save tokens and keep the main context clear: reading long build or dev-server output, scanning `App.tsx` or the components for where something lives, searching across many files. Keep design, debugging and multi-file changes on the primary model.
