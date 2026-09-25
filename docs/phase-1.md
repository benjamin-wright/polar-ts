# Phase 1 — Walking demo tasks

Phase 1 is complete when a player can explore one small island on a phone:
hold to move toward the touch point, steer around obstacles manually, see the
character animate, and have the camera pan to follow. The developer previewer
must also support inspecting those animations.
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
- Use continuous world-space positions and movement in any direction, with no
  tile-centre snapping. Terrain tiles supply collision data for the player's
  footprint. Water, solid obstacles, and out-of-map positions are blocked.
- Hold a touch or mouse button to move straight toward the current pointer;
  drag to steer and release to stop. Stop at obstacles without sliding or
  automatic avoidance. No path planner, route queue, or waypoint system is needed.
- Recompute aim from the held screen position and current camera transform on
  each simulation step. Holding a stationary finger ahead keeps the player
  moving as the camera pans. A dead zone prevents jitter near the player.
- Identify the controlled player explicitly. The current controller targets
  every entity with a transform; adding map entities must not make them move.
- Preserve the fixed system order: input and player control before movement
  integration, collision after integration, then camera and render sync. Add new
  systems as separate files. Animation reads resolved movement before render sync.
- Keep simulation and map/collision calculations renderer-agnostic. Pixi objects and
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
1.3, after hold-to-move controls in 1.2; no generic world editor or complete
Tiled feature set is required.

## 1.2 — Deliver continuous hold-to-move controls

**Depends on:** 1.1. **Outcome:** holding a finger or mouse button moves the player
straight toward it, dragging steers, and releasing stops.

Replace the Phase 0 tap destination with active-pointer state and an explicit
player marker. Add a player steering system that produces continuous movement
intent for the fixed-step integration. Configure walking speed and the dead zone
in JSON under `assets/data/`. Keep direction/speed calculations pure and the
pointer-to-world adapter in `render/`, ready for the camera in 1.4.

- [ ] Movement supports arbitrary headings and positions, including distances
      smaller than a tile, at equal speed in all directions. Clamp travel to
      the aim point and stop within the dead zone without oscillating.
- [ ] Release, cancellation, lost pointer capture, window blur, or leaving
      the playable viewport clears movement until a new press. Additional
      fingers cannot take over the active pointer or leave movement stuck on.
- [ ] Tests cover continuous direction/speed, zero-distance aim, overshoot,
      drag steering, release/cancellation, and a second non-player entity.
      Holding toward impassable ground is allowed; collision in 1.3 stops travel.

## 1.3 — Stop at shorelines and obstacles

**Depends on:** 1.2. **Outcome:** the player moves freely across land and stops
at the first obstacle or shoreline along the direction being held.

Add a small world-space collision footprint and a collision system that checks
the whole proposed movement segment against impassable terrain and world bounds.
Resolve after integration, stopping at the last safe position before first
contact. The tile grid describes terrain; it does not quantize movement.

- [ ] The footprint cannot enter water, solid tiles, or leave the map, including
      during diagonal movement or a step that crosses multiple tiles. Positions
      remain continuous at contact, with no snapping to tile centres.
- [ ] Holding toward a barrier stops translation without sliding, jitter, or
      accumulating motion. The hold stays active: dragging toward a clear
      direction moves away immediately, without a release/repress cycle.
- [ ] Unit tests cover first contact, shorelines, map bounds, obstacle corners,
      narrow gaps, large steps, and steering away while blocked. Aiming beyond
      an obstacle approaches it and stops; no detour is generated.

## 1.4 — Follow the player with the camera

**Depends on:** 1.3. **Outcome:** the player can explore beyond the initial view,
and the held touch point keeps steering correctly as the camera pans.

Add a shared world container for terrain and entities, a follow camera in
`render/`, and paired world/screen coordinate conversions. Keep screen overlays
outside the world transform. Initially use direct following; smoothing is optional.

- [ ] The camera follows the player and clamps to map bounds; maps smaller
      than the viewport are centred consistently.
- [ ] The latest held screen position is converted through the current camera
      transform each simulation step, accounting for canvas position, camera
      offset, and scale, even when there are no new pointer-move events.
- [ ] Coordinate conversion and camera-bound tests cover map edges, non-unit
      scale, and small maps. A stationary held pointer keeps steering while the
      camera pans; when the camera is clamped, reaching the aim/dead zone stops
      movement without overshoot.

## 1.5 — Animate the player character

**Depends on:** 1.3; may proceed independently of 1.4.
**Outcome:** a simple polar bear cub sprite idles and walks in the appropriate
direction instead of using the Phase 0 square.

Add an initial sprite sheet and JSON metadata for frames, animations, playback
rates, and facing. Keep animation state renderer-agnostic and texture handling
in `render/`. Record asset provenance or licensing with any imported artwork.

- [ ] Idle and walk animations use actual resolved movement; release, reaching
      the aim/dead zone, or collision returns the character to idle while
      preserving its facing.
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

- [ ] The world is not stretched, the player remains visible, and held-pointer
      steering stays accurate across viewport sizes and high-density displays.
- [ ] Presses outside the playable viewport are ignored. Leaving it or rotating
      the phone clears the hold; a new press works with the updated layout.
      Verify deliberate drag steering and cancellation with real touch input.
- [ ] Mouse input still works. Exercise the key input/coordinate cases with
      focused tests and a touch-capable browser check.

## 1.8 — Validate and ship the walking demo

**Depends on:** 1.1–1.7. **Outcome:** a tested Phase 1 build is available in QA,
with a recorded phone walkthrough and any remaining issues identified.

Use a compact island walkthrough that demonstrates free movement across open
ground, stopping at a shoreline, manually steering around an obstacle, holding
toward blocked ground, and following-camera movement. Fix issues
found during this acceptance pass and document how to run the demo/previewer.

- [ ] Lint, formatting, unit tests, typechecking, and the production build
      pass using `.nvmrc`. CI uses that same Node version.
- [ ] Smoke-test the built game and previewer under both deployment subpaths;
      confirm no missing assets or console errors and verify the QA deployment.
- [ ] Complete a walkthrough on at least one real phone and desktop browser:
      hold to walk, drag to steer, release to stop, keep holding as the camera
      pans, stop at an obstacle, steer away, rotate the phone, and inspect
      animations. Record device/browser, results, and observed performance;
      emulation alone does not count as a real-device check.

## Delivery order and completion

Start with **1.1 → 1.2 → 1.3**: island, hold-to-move controls, then collision.
After that, the camera (**1.4**) and sprites/previewer (**1.5 → 1.6**) can proceed
independently. **1.7** joins the camera and sprite work; **1.8** closes the phase
after all previous tasks are complete.

For each task, run the existing CI checks and add focused tests for new pure
logic or meaningful regressions. Include the task's demo steps in its review.
Do not mark a task complete until its acceptance criteria have evidence; record
unavailable device or deployment checks as outstanding. Production remains the
normal deployment from `main` after review and merge.
