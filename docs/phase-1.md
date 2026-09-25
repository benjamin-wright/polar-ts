# Phase 1 — Walking demo tasks

Phase 1 is complete when a player can explore one small island on a phone:
tap to navigate around obstacles, see the character animate, and have the camera
follow. The developer previewer must also support inspecting those animations.
See [the roadmap](./plan.md) and [architecture](./architecture.md).

The starting point is the Phase 0 sprite, straight-line movement, pointer input,
fixed-step loop, and ECS/render separation. The tasks below are planned work,
not completed features. Each task is intended to be a separate reviewable change
with a deployable result.

## Scope and shared decisions

- Use one small, finite, orthogonal Tiled map with a deliberately limited export
  format. Start with terrain, solid obstacles, and a player spawn. Document the
  supported layers and properties; reject unsupported data clearly.
- Keep map exports in `assets/tilemaps/`, sprite assets in `assets/sprites/`, and
  gameplay/animation configuration in JSON under `assets/data/`. Placeholder
  art is sufficient; final art direction does not block this phase.
- Share one walkability grid between collision and pathfinding. Start with
  four-neighbour movement and tile-centre destinations to avoid diagonal corner
  cutting. Water, solid obstacles, and out-of-map positions are blocked.
- Identify the controlled player explicitly. The current controller targets
  every entity with a transform; adding map entities must not make them move.
- Preserve the fixed system order: input and player/path control before movement
  integration, collision after integration, then camera and render sync. Add new
  systems as separate files. Animation reads resolved movement before render sync.
- Keep simulation and map/path calculations renderer-agnostic. Pixi objects and
  screen-to-world adaptation belong in `render/`; pointer events stay in `core/`.
- Sailing, swimming, NPCs, economy, combat, saving, PWA hardening, and large-world
  chunking remain in later phases.

## 1.1 — Render the first island

**Depends on:** Phase 0. **Outcome:** the existing player appears at a map-defined
spawn on a visible island, using temporary terrain art.

Add a small Tiled map and tileset, a typed map loader under `game/world/`, and a
tile renderer under `render/`. Define tile size, layer order, walkability, spawn,
and world bounds in the content contract. Wire loading into the game entry.

- [ ] Terrain and obstacles render in the correct positions and layer order;
      the player starts on a valid land tile.
- [ ] The loader produces map dimensions, a walkability grid, and spawn data
      without importing Pixi. Invalid dimensions, tile references, and spawn
      data fail with useful errors, covered by focused unit tests.
- [ ] Map and image assets load from a production build under both `/polar/`
      and `/polar-qa/`; the supported Tiled export format is documented.

This intermediate demo still uses straight-line movement. Collision arrives in
1.2; no generic world editor or complete Tiled feature set is required.

## 1.2 — Keep the player on walkable land

**Depends on:** 1.1. **Outcome:** taps move the player across land, but the player
stops at shorelines and obstacles.

Add an explicit player marker, a small collision footprint, and a collision
system using the shared grid. Resolve movement after integration, keeping a
valid previous position when a move is blocked. Clear blocked movement cleanly.

- [ ] The player cannot enter water, solid tiles, or leave the map, including
      when a movement step crosses more than one tile.
- [ ] Collision checks and future pathfinding use the same clearance rules;
      the character does not clip through obstacle corners or narrow gaps.
- [ ] A tap only controls the player. Tests cover boundaries, large steps,
      blocked movement, valid movement, and a second non-player entity.

## 1.3 — Route taps around obstacles

**Depends on:** 1.2. **Outcome:** tapping reachable ground makes the player walk
around rocks and other obstructions to reach it.

Implement a pure A* function under `game/world/` and a player waypoint system.
Reuse the existing movement integration to travel between waypoints. A valid
new destination replaces the current route; blocked, out-of-bounds, or
unreachable taps leave the current route unchanged. Tapping the current tile
stops the player.

- [ ] Routes stay on the shared walkability grid, follow four-neighbour steps,
      and terminate at the destination tile centre without overshooting.
- [ ] Rapid retargeting replaces the route cleanly; arriving clears movement;
      blocked movement cannot leave the controller retrying forever.
- [ ] Unit tests cover detours, unreachable goals, invalid coordinates,
      start-equals-goal, deterministic routing, and waypoint progression.

## 1.4 — Follow the player with the camera

**Depends on:** 1.3. **Outcome:** the player can explore beyond the initial view,
and taps still select the correct world tile as the camera moves.

Add a shared world container for terrain and entities, a follow camera in
`render/`, and paired world/screen coordinate conversions. Keep screen overlays
outside the world transform. Initially use direct following; smoothing is optional.

- [ ] The camera follows the player and clamps to map bounds; maps smaller
      than the viewport are centred consistently.
- [ ] Pointer coordinates are converted to world coordinates exactly once,
      accounting for the canvas position, camera offset, and scale.
- [ ] Coordinate conversion and camera-bound tests cover map edges, non-unit
      scale, and small maps; browser checks confirm accurate taps after panning.

## 1.5 — Animate the player character

**Depends on:** 1.2; may proceed independently of 1.3–1.4.
**Outcome:** a simple polar bear cub sprite idles and walks in the appropriate
direction instead of using the Phase 0 square.

Add an initial sprite sheet and JSON metadata for frames, animations, playback
rates, and facing. Keep animation state renderer-agnostic and texture handling
in `render/`. Record asset provenance or licensing with any imported artwork.

- [ ] Idle and walk animations use actual resolved movement; arrival or
      collision returns the character to idle while preserving its facing.
- [ ] Playback is driven by elapsed simulation time, with tests for frame
      progression and state transitions; walking does not restart every tick.
- [ ] The sprite's anchor and ground position agree with its collision
      footprint, and its assets load in the deployed static build.

## 1.6 — Deliver the animation previewer

**Depends on:** 1.5. **Outcome:** artists and developers can inspect the same
sprite sheets and animation definitions used by the game at `/dev/`.

Build previewer panel #1 with Tweakpane/plain DOM controls and the shared
animation/rendering code. Add the documented `?dev` entry route with subpath-safe
navigation to the previewer.

- [ ] Select a sheet and animation, play/pause, scrub frames, change playback
      speed, and zoom against a checkerboard background.
- [ ] The preview matches in-game frame order and timing; controls do not
      alter the saved asset data or run the game simulation behind the preview.
- [ ] Both `/dev/` and the `?dev` route work beneath production and QA subpaths;
      returning to the game works without a reload loop.

## 1.7 — Make the viewport work on phones

**Depends on:** 1.4 and 1.5. **Outcome:** the walking demo remains usable in
portrait and landscape, including after rotation or browser resizing.

Implement the planned fixed logical viewport with aspect-preserving scaling,
device-pixel-ratio handling, and safe-area-aware layout. Reuse the camera's
coordinate conversion rather than adding a separate mobile input path.

- [ ] The world is not stretched, the player remains visible, and tap targets
      stay accurate across viewport sizes, rotation, and high-density displays.
- [ ] Taps outside the playable viewport are ignored; touch cancellation,
      dragging, and additional fingers do not create stray movement commands.
- [ ] Mouse input still works. Exercise the key input/coordinate cases with
      focused tests and a touch-capable browser check.

## 1.8 — Validate and ship the walking demo

**Depends on:** 1.1–1.7. **Outcome:** a tested Phase 1 build is available in QA,
with a recorded phone walkthrough and any remaining issues identified.

Use a compact island route that demonstrates open ground, a shoreline, an
obstacle detour, an unreachable destination, and camera movement. Fix issues
found during this acceptance pass and document how to run the demo/previewer.

- [ ] Lint, formatting, unit tests, typechecking, and the production build
      pass using `.nvmrc`. CI uses that same Node version.
- [ ] Smoke-test the built game and previewer under both deployment subpaths;
      confirm no missing assets or console errors and verify the QA deployment.
- [ ] Complete a walkthrough on at least one real phone and desktop browser:
      navigate the route, retarget while walking, rotate the phone, and inspect
      animations. Record device/browser, results, and observed performance;
      emulation alone does not count as a real-device check.

## Delivery order and completion

Start with **1.1**, then **1.2**. Navigation and camera work proceed through
**1.3 → 1.4**, while sprites and previewer can proceed through **1.5 → 1.6** once
collision is in place. **1.7** joins the camera and sprite work; **1.8** closes the
phase after all previous tasks are complete.

For each task, run the existing CI checks and add focused tests for new pure
logic or meaningful regressions. Include the task's demo steps in its review.
Do not mark a task complete until its acceptance criteria have evidence; record
unavailable device or deployment checks as outstanding. Production remains the
normal deployment from `main` after review and merge.
