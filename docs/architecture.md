# polar-ts — Architecture & Game Design

## 1. Vision

A mobile-first, top-down 2D sprite RPG served as a static site: explore islands on
foot, gather resources, trade them in a supply-and-demand economy, and sail between
islands using a simplified-but-realistic force-balance sailing model. Built in
TypeScript with an ECS core and a bundled developer previewer for assets,
animations, and sailing physics tuning.

Key game features:

- **Exploration**: top-down tile-based world, tap-to-walk navigation.
- **Resource gathering**: harvestable resource nodes feeding the economy.
- **Supply-and-demand economy**: per-port stock and dynamic prices.
- **Dialogue**: popup dialogs with character portraits.
- **Sailing**: force-balance model with wind/water vector fields, sail sheet
  control, rudder control, crash-jibe damage, and swim mechanics as a fallback
  when the boat is disabled.

## 2. Technology Decisions

| Concern | Choice | Rationale / alternatives considered |
|---|---|---|
| Language | TypeScript (strict) | Type safety pays off for ECS component schemas and data-driven content |
| Build/dev server | Vite | Instant HMR, outputs pure static files for GitHub Pages / itch.io / any static host |
| Renderer | PixiJS v8 (WebGL, Canvas fallback) | Battle-tested 2D sprite renderer with batching, filters, texture atlases. **Alternative: Phaser** — rejected; it is a monolith whose scene/physics model fights a custom ECS and a custom sailing simulation. We only need rendering, not its arcade physics |
| ECS | bitecs | Minimal, fast, structure-of-arrays ECS that stays out of the way. Alternatives: miniplex (more ergonomic, slower) or a small hand-rolled ECS — noted as fallbacks |
| Physics | Custom kinematic model (pure functions, no library) | The sailing model is the game's differentiator; planck.js/matter.js rigid-body physics would not model sail/keel/rudder force balance any better than ~100 lines of testable math |
| Tile maps | Tiled editor → JSON export, thin custom render layer over Pixi | Industry-standard editor; our maps are simple enough that pixi-tilemap (unmaintained) isn't needed |
| Pathfinding (tap-to-walk) | Small A* over the tile grid (hand-rolled or `pathfinding` npm lib) | Grid is already in memory for collision |
| Audio (later phase) | Howler | De-facto standard, tiny |
| Dialogue content | Data-driven JSON now; Yarn Spinner evaluated later if branching gets complex | Keeps writing decoupled from code |
| Dev previewer UI | Tweakpane for parameter panels + plain DOM | Zero-framework controls for sliders/toggles; no React needed |
| Unit tests | Vitest | Sailing model and economy are pure functions — highly testable headlessly |
| Lint/format | ESLint + Prettier | Standard |
| Hosting/CI | GitHub Actions → build → deploy `dist/` to GitHub Pages | Static site requirement satisfied for free; same pipeline runs lint+tests |

## 3. Runtime Architecture

### 3.1 Core loop and layering

Strict dependency direction, no cycles:

```
assets → core (loop, input, assets, scenes, save)
       → ecs (components + systems, renderer-agnostic)
       → game (domain: world, sailing, economy, dialogue, npc)
render (Pixi adapters) reads ECS state — game never imports Pixi directly
dev (previewer) sits beside game, reusing core + ecs
```

- Fixed-timestep simulation (e.g. 60 Hz) decoupled from render interpolation —
  critical for a deterministic sailing model.
- `game/` contains only pure logic + ECS components/systems; all Pixi objects live
  in `render/` adapters that mirror ECS state each frame. This keeps the sailing
  model unit-testable in Node and previewable outside the game.

### 3.2 Module layout

```
src/
  core/        GameLoop, AssetLoader, InputSystem (touch/mouse unified), SceneManager, SaveSystem (localStorage)
  ecs/         world setup, shared components (Transform, Velocity, Sprite, Health, Inventory...)
  game/
    world/     tilemap loading, collision grid, chunking, wind/current vector fields
    player/    tap-to-walk controller, swimming, embark/disembark
    sailing/   windfield, sail model, hull model, rudder, jibe detection, damage
    economy/   goods, markets, price engine, stock simulation
    dialogue/  dialogue runner, portrait metadata
    npc/       schedules, simple AI, traders
  render/      Pixi stage, sprite/animation adapters, camera, HUD, dialog UI (DOM overlay), touch controls overlay
  dev/         previewer entry + panels
assets/
  sprites/ tilemaps/ audio/ data/ (goods.json, dialogue/*.json, windfields)
index.html   dev/index.html   (two Vite entry points)
```

### 3.3 ECS systems

Systems run in a fixed order:
`Input → PlayerController | SailingController → WindField → SailForces → HullForces → Integration → Collision → EconomyTick → CameraSync → RenderSync`.

Systems are plain functions over queries, so new game systems (fishing, weather,
quests) are additive files — this is the main extensibility seam.

### 3.4 Sailing simulation

Modeled as a 2-DOF force balance per boat, integrated with semi-implicit Euler:

- **Wind field**: coarse spatial grid of wind vectors + optional time variation,
  bilinearly interpolated at boat position. Same mechanism for **water current**.
- **Apparent wind** = true wind − boat velocity.
- **Sail**: sheet (control line) length sets a maximum boom angle from centerline.
  The boom weather-vanes toward the apparent wind until the sheet goes taut. Sail
  force magnitude ∝ |apparent wind|² × angle-of-attack efficiency curve, applied
  along the sail's force axis; sail *luffs* (force → ~0) when pointed too close to
  the wind — so tacking and points of sail emerge naturally rather than being
  scripted.
- **Hull/keel**: anisotropic quadratic water resistance in the boat frame — low
  drag along the keel line, high drag lateral. This is what converts off-axis sail
  force into forward motion instead of pure leeway.
- **Rudder**: touch buttons apply yaw rate ∝ rudder angle × speed-through-water
  (no steerage at zero speed, like a real boat).
- **Crash jibe**: sailing downwind, if the wind crosses the stern (heading change
  or wind shift), the boom slams from one side to the other; damage ∝ wind
  strength × boom angular velocity. Damage accumulates; boat disabled → **swim
  mode**: slow omnidirectional movement with stamina, enough to reach shore.
- Tuning constants live in a typed config object so the dev previewer can mutate
  them live.

### 3.5 Economy

Data-driven (`goods.json`): each good has base price, bulk, per-port
production/consumption rates. Each port holds stock per good;
**price = base × f(stock vs. target stock)** with clamping. Stocks drift
toward/away from targets each tick (and later via NPC trader agents), so routes
and arbitrage opportunities shift. Trading UI is a simple buy/sell panel bound to
the port the player is docked at.

### 3.6 Dialogue

JSON dialogue trees (nodes: portrait id, text, choices, optional economy/quest
effects). Rendered as a DOM overlay popup (portrait + text + tap-to-advance) —
DOM is more accessible and easier to style than canvas text, and static hosting
imposes no constraint here.

### 3.7 Input & mobile

- Unified pointer layer (Pointer Events) → semantic actions.
- Land: tap → world coordinate → A* → waypoint-following component.
- Sailing: on-screen cluster — rudder ◀ ▶ buttons and sheet in/out buttons (or
  slider), sized for thumbs, respecting safe-area insets.
- Viewport: fixed logical resolution scaled to fit, `devicePixelRatio`-aware, PWA
  manifest for fullscreen add-to-home-screen.

## 4. Developer Previewer

Second Vite entry (`/dev/`) sharing `core/`, `ecs/`, and `game/` modules, gated to
also be reachable in production via `?dev` for demos. Panels (Tweakpane):

1. **Sprite/animation preview** — pick a sheet + animation, scrub frames, adjust
   fps, zoom on a checkerboard.
2. **Asset browser** — tilemaps, portraits, audio.
3. **Sailing force visualizer** — sliders for wind speed/direction, heading,
   rudder, sheet length; live vector arrows (apparent wind, sail force, keel
   resistance, net); numeric readouts; "jibe risk" indicator. Doubles as the
   physics tuning workbench and a demo of the simulation.
4. **Economy sandbox** (later) — watch stock/price curves, inject trades.

## 5. Key Risks & Mitigations

- **Sailing feel**: the model can look right on paper but feel bad on a phone →
  the force visualizer plus generous tuning constants are built from day one.
- **Mobile performance**: Pixi batching + fixed logical resolution +
  chunk-culled tile rendering; measure on a real device each phase.
- **Scope creep in economy/dialogue**: both are strictly data-driven JSON from the
  start, so depth can grow without code changes.
