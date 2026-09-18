# polar-ts

Mobile-first, top-down 2D sprite RPG with a force-balance sailing model, built
in TypeScript on an ECS core and served as a static site. See
[docs/architecture.md](docs/architecture.md) for the design and
[docs/plan.md](docs/plan.md) for the phased roadmap.

## Getting started

```sh
npm ci
npm run dev        # dev server (game at /, dev previewer at /dev/)
```

## Scripts

| Command                | Purpose                             |
| ---------------------- | ----------------------------------- |
| `npm run dev`          | Vite dev server with HMR            |
| `npm run build`        | Typecheck + static build to `dist/` |
| `npm run preview`      | Serve the production build locally  |
| `npm test`             | Vitest unit tests (headless, Node)  |
| `npm run lint`         | ESLint (typescript-eslint strict)   |
| `npm run format:check` | Prettier check (`format` to write)  |
| `npm run typecheck`    | `tsc --noEmit`                      |

## Layout

- `src/core/` — fixed-timestep loop, unified pointer input (renderer-agnostic)
- `src/ecs/` — bitecs world, shared components, simulation systems
- `src/game/` — domain logic (player, sailing, economy…; pure + testable)
- `src/render/` — PixiJS adapters mirroring ECS state onto the stage
- `src/dev/` — dev previewer entry (panels arrive in later phases)
- `assets/` — sprites, tilemaps, data-driven JSON content

CI (lint, format check, tests, build) runs on every PR; pushes to `main`
deploy `dist/` to GitHub Pages.
