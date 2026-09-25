# polar-ts

Mobile-first, top-down 2D sprite RPG with a force-balance sailing model, built
in TypeScript on an ECS core and served as a static site. See
[docs/architecture.md](docs/architecture.md) for the design and
[docs/plan.md](docs/plan.md) for the phased roadmap.

## Getting started

Use the Node.js version pinned in `.nvmrc`:

```sh
nvm install
nvm use
npm ci
npm run dev        # dev server (game at /, dev previewer at /dev/)
```

The current demo renders the first island with a placeholder player. Tap to walk
to a location after releasing, or hold a finger or the primary mouse button and
drag to steer. Releasing a drag or long hold stops movement. Taps stop at the first
obstacle; held movement slides along rocks, shorelines, and map boundaries.
Walking speed, the follow dead zone, tap thresholds, and the collision footprint
are configured in `assets/data/player-movement.json`.
The camera follows the player, clamps at map edges, and centres maps smaller than
the view. `assets/data/camera.json` sets the zoom (currently 2×). Held steering
keeps following the pointer as the view pans; completed taps keep their world
destination. Player animation is the next Phase 1 task. See the
[map format and preview notes](assets/tilemaps/README.md) to edit the island or
review this slice.

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

CI (lint, format check, tests, build) runs on PRs targeting `main` and pushes to
`main`, then publishes `dist/` over SSH with rsync: PRs deploy to a shared QA
directory (`polar-qa/`, served at `/polar-qa/`) and pushes to `main` deploy to
production (`polar/`, served at `/polar/`). Publishing uses the
`SSH_USER` / `SSH_HOST` / `SSH_PASSWORD` secrets.
