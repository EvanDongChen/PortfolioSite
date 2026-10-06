# Evan Chen Portfolio

My personal portfolio site, built as an interactive aquarium. Schools of fish swim behind the content, react to your cursor and can be fed, grabbed and bred, while the page shows my projects, experience, education and skills.

## Features

- **Two themes:** a sunlit underwater reef and a dark deep-sea mode with angler fish, jellyfish and plankton, with an animated dive between them.
- **Living fish:** fish school, dart, loiter, form conga lines, get curious about food and pair up to breed. Puffers puff up and the fish census tracks who is in the tank.
- **Interactive tools:** drop fish food (or love food), grab and carry fish, open the fish tank, and follow the built-in tutorial.
- **Searchable projects:** filter project cards by title, description or tag.
- **Performance controls:** a performance panel to scale back the effects on slower devices.

## Projects

| Project | Summary |
|---|---|
| [Blade & Brush](https://evandongchen.github.io/BladeAndBrush/) | Browser puzzle game set inside a procedurally generated Chinese ink landscape, built with TypeScript and Canvas 2D. |
| [The Wishing Terminal](https://matchabatcha.itch.io/thewishingterminal) | Adventure horror game built in Roblox for the SFU Summer Summit 2026 game jam. |
| [Cramsino](https://devpost.com/software/cramsino) | AI study app with focus detection and gacha rewards. Best UI at JourneyHacks 2026. |
| [WitchDog](https://devpost.com/software/witch-dog) | Real-time multiplayer trivia game in Unity with Socket.IO. |
| [Money Mango](https://github.com/EvanDongChen/MoneyMango) | Android personal finance app with OCR receipt parsing. |
| [Chord Breakers](https://angrycow05.itch.io/chord-breaker) | 2D action game in Unity with elemental combat and FSM-driven AI. |

The full list is on the site.

## Tech stack

React 19, TypeScript, Vite and Tailwind CSS. Deployed to GitHub Pages with `gh-pages`.

## Running locally

```sh
npm install
npm run dev      # http://localhost:3000
npm run build    # production build in dist/
npm run deploy   # build and publish to GitHub Pages
```

### Adding a project

1. Put the thumbnail in `image-originals/` and a 960px-wide `.webp` copy in `public/images/` (`scripts/optimize-images.mjs` converts PNG/JPG files in `public/images` to webp).
2. Add an entry to the `projects` list in `App.tsx` with a `title`, `description`, `image`, `tags`, `codeUrl` and an optional `linkLabel` (defaults to "View Code").
