# polar-ts — Architecture & Game Design

## 1. Vision

A mobile-first, top-down 2D sprite RPG served as a static site: explore islands on
foot, gather resources, trade them in a supply-and-demand economy, and sail between
islands using a simplified-but-realistic force-balance sailing model. Built in
TypeScript with an ECS core and a bundled developer previewer for assets,
animations, and sailing physics tuning.

Key game features:

- **Exploration**: top-down tile-based world with tap destinations and hold-to-move
  controls and a camera that pans to follow the player.
- **Resource gathering**: harvestable resource nodes feeding the economy.
- **Supply-and-demand economy**: per-port stock and dynamic prices.
- **Dialogue**: popup dialogs with character portraits.
- **Sailing**: force-balance model with wind/water vector fields, sail sheet
  control, rudder control, crash-jibe damage, and swim mechanics as a fallback
  when the boat is disabled.

## 2. Technology Decisions

| Concern             | Choice                                                                       | Rationale / alternatives considered                                                                                                                                                                                                                          |
| ------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Language            | TypeScript (strict)                                                          | Type safety pays off for ECS component schemas and data-driven content                                                                                                                                                                                       |
| Build/dev server    | Vite                                                                         | Instant HMR, outputs pure static files that can be served by any static host                                                                                                                                                                                 |
| Renderer            | PixiJS v8 (WebGL, Canvas fallback)                                           | Battle-tested 2D sprite renderer with batching, filters, texture atlases. **Alternative: Phaser** — rejected; it is a monolith whose scene/physics model fights a custom ECS and a custom sailing simulation. We only need rendering, not its arcade physics |
| ECS                 | bitecs                                                                       | Minimal, fast, structure-of-arrays ECS that stays out of the way. Alternatives: miniplex (more ergonomic, slower) or a small hand-rolled ECS — noted as fallbacks                                                                                            |
| Physics             | Custom kinematic model (pure functions, no library)                          | The sailing model is the game's differentiator; planck.js/matter.js rigid-body physics would not model sail/keel/rudder force balance any better than ~100 lines of testable math                                                                            |
| Tile maps           | Tiled editor → JSON export, thin custom render layer over Pixi               | Industry-standard editor; our maps are simple enough that pixi-tilemap (unmaintained) isn't needed                                                                                                                                                           |
| Land movement       | Tap destinations and continuous hold-to-move steering with swept collision   | World-space positions and headings are independent of tile resolution; taps stop at obstacles, while held movement slides along boundaries                                                                                                                   |
| Audio (later phase) | Howler                                                                       | De-facto standard, tiny                                                                                                                                                                                                                                      |
| Dialogue content    | Data-driven JSON now; Yarn Spinner evaluated later if branching gets complex | Keeps writing decoupled from code                                                                                                                                                                                                                            |
| Dev previewer UI    | Tweakpane for parameter panels + plain DOM                                   | Zero-framework controls for sliders/toggles; no React needed                                                                                                                                                                                                 |
| Unit tests          | Vitest                                                                       | Sailing model and economy are pure functions — highly testable headlessly                                                                                                                                                                                    |
| Lint/format         | ESLint + Prettier                                                            | Standard                                                                                                                                                                                                                                                     |
| Hosting/CI          | GitHub Actions → build → deploy `dist/` via rsync over SSH                   | Static hosting with separate production and QA directories; the pipeline runs lint, formatting checks, tests, and a typechecked build before publishing                                                                                                      |

Pushes to `main` publish to the SSH host's `polar/` directory (served at
`/polar/`); pull requests targeting `main` publish to the shared `polar-qa/`
directory (served at `/polar-qa/`). The workflows use the `SSH_USER`, `SSH_HOST`,
and `SSH_PASSWORD` secrets. Vite's relative asset paths let the same static build
work under either subpath. See [the README](../README.md) for local setup and the
[main](../.github/workflows/main.yml) and [PR](../.github/workflows/mr.yaml)
workflows for the deployment configuration.

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
    player/    tap/hold movement controller, swimming, embark/disembark
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
`Input → PlayerController | SailingController → WindField → SailForces → HullForces → Integration → Collision → Animation → EconomyTick → CameraSync → RenderSync`.

Animation reads collision-resolved velocity and advances a renderer-independent
clip, facing, and elapsed time. Pixi adapters select atlas textures from this
state without advancing playback. Sprite layouts, anchors, frame sequences, and
rates live in `assets/data/`; the game and previewer share those definitions and
the pure frame-selection functions.

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
  along the sail's force axis; sail _luffs_ (force → ~0) when pointed too close to
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

- Unified pointer layer (Pointer Events) → semantic actions. One active pointer
  owns movement until released or cancelled; holding the mouse button gives
  desktop players the same controls as touch.
- Land: hold a point in the playable viewport to move directly toward it.
  Dragging the held pointer changes direction immediately. Move at a fixed
  walking speed in any direction, using continuous world coordinates; diagonal
  movement is no faster than axial movement. A small dead zone around the player
  prevents jitter, and movement never overshoots the current aim point. Walking
  speed and dead-zone size are data-driven tuning values.
- A quick tap saves a world-space destination and continues moving after release,
  arriving exactly at that point without the follow dead zone. Tap duration and
  pointer-travel thresholds are configured in JSON; a drag or long hold releases
  without leaving a destination. A new tap replaces the destination, and a new
  hold takes over immediately without resuming the old destination afterwards.
- The camera pans with the player. Recompute the aim from the held screen
  position and current camera transform each simulation step, even when the
  pointer has not moved. Holding ahead therefore continues steering ahead as
  the world scrolls, rather than retaining the initial world destination.
- Releasing a drag or long hold stops following. Pointer cancellation, unexpected
  lost capture, window blur, or viewport changes cancel movement; cancellation
  also clears any tap destination. Leaving the playable viewport during a hold
  cancels that gesture. Reaching the follow aim point or its dead zone stops
  translation while the hold remains active; dragging away resumes movement.
- Terrain tiles supply collision data without snapping the player's position
  or heading to a grid. Check the player's continuous footprint along each
  movement step. Taps stop at the first obstacle, shoreline, or world boundary
  and clear their destination. Held movement removes the blocked component of
  motion and slides along the boundary, checking that sliding segment against
  other obstacles too. Head-on contact and inside corners stop translation; the
  hold stays active so dragging can steer away. There is no path planner or
  automatic route around an obstacle.
- Sailing: on-screen cluster — rudder ◀ ▶ buttons and sheet in/out buttons (or
  slider), sized for thumbs, respecting safe-area insets.
- Viewport: fixed logical resolution scaled to fit, `devicePixelRatio`-aware, PWA
  manifest for fullscreen add-to-home-screen.

## 4. Developer Previewer

Second Vite entry (`/dev/`) sharing the core playback and render adapters, also
reachable in production via `?dev` for demos. The game bootstrap redirects before
importing or starting the game. Relative navigation keeps both entries beneath
the deployment directory and clears the preview flag on return. The animation
panel uses labelled native DOM controls; later parameter-heavy panels can use
Tweakpane. Panels:

1. **Sprite/animation preview** — pick a sheet + animation, scrub frames, adjust
   fps, zoom on a checkerboard.
2. **Asset browser** — tilemaps, portraits, audio.
3. **Sailing force visualizer** — sliders for wind speed/direction, heading,
   rudder, sheet length; live vector arrows (apparent wind, sail force, keel
   resistance, net); numeric readouts; "jibe risk" indicator. Doubles as the
   physics tuning workbench and a demo of the simulation.
4. **Economy sandbox** (later) — watch stock/price curves, inject trades.

The animation preview owns its selection, elapsed time, pause state, speed, and
zoom. It shares `advancePlayback`, `animationFrameIndex`, and `applySpriteFrame`
with the game, and uses the same fixed-step clock without a game world or player
input system. Sheet definitions remain unchanged. The render asset registry
caches frame textures across sheet selections, and failed loads may be retried.

## 5. Key Risks & Mitigations

- **Sailing feel**: the model can look right on paper but feel bad on a phone →
  the force visualizer plus generous tuning constants are built from day one.
- **Mobile performance**: Pixi batching + fixed logical resolution +
  chunk-culled tile rendering; measure on a real device each phase.
- **Scope creep in economy/dialogue**: both are strictly data-driven JSON from the
  start, so depth can grow without code changes.
