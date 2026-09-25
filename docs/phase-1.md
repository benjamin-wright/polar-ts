# Phase 1 — Walking demo tasks

Phase 1 is complete when a player can explore one small island on a phone:
tap to walk to a location, hold and drag to steer along boundaries, see the
character animate, and have the camera pan to follow. The developer previewer
must also support inspecting those animations.
See [the roadmap](./plan.md) and [architecture](./architecture.md).

The starting point is the Phase 0 sprite, straight-line movement, pointer input,
fixed-step loop, and ECS/render separation. Checklists below record completed
acceptance checks; unchecked items remain planned work. Each task is intended to
be a separate reviewable change with a deployable result.

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
- Tap to save a world destination that survives release; stop on arrival or at
  the first obstacle. Hold a touch or mouse button to follow the current pointer,
  drag to steer, and release a drag or long hold to stop. Following slides along
  boundaries. No path planner, route queue, or waypoint system is needed.
- Recompute aim from the held screen position and current camera transform on
  each simulation step. Holding a stationary finger ahead keeps the player
  moving as the camera pans. A dead zone prevents jitter near the player.
- Identify the controlled player with `PlayerControlled`; its controller must
  leave other entities' movement intent unchanged.
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

- [x] Terrain and obstacles render in the correct positions and layer order;
      the player starts on a valid land tile.
- [x] The loader produces map dimensions, a walkability grid, and spawn data
      without importing Pixi. Invalid dimensions, tile references, and spawn
      data fail with useful errors, covered by focused unit tests.
- [x] Map and image assets load from a production build under both `/polar/`
      and `/polar-qa/`; the supported Tiled export format is documented.

Verified on 2026-09-25: 48 unit tests pass (32 for map loading), plus lint,
formatting, typechecking, and the production build. The built game rendered in
the browser under both subpaths without console warnings/errors. A 390 × 844
viewport check confirmed island fitting and accurate tap movement after resizing.
See [the map contract and preview instructions](../assets/tilemaps/README.md).

At delivery, this intermediate demo still used straight-line tap movement.
Hold-to-move controls follow in 1.2 and collision in 1.3; no generic world editor
or complete Tiled feature set is required.

## 1.2 — Deliver tap destinations and continuous hold-to-move controls

**Depends on:** 1.1. **Outcome:** holding a finger or mouse button moves the player
straight toward it, dragging steers, and releasing a drag or long hold stops.
A quick tap continues to a fixed world destination after release.

Combine tap destinations with active-pointer state and an explicit player marker.
Add a player steering system that produces continuous movement intent for the
fixed-step integration. Configure walking speed, tap thresholds, and the follow dead zone
in JSON under `assets/data/`. Keep direction/speed calculations pure and the
pointer-to-world adapter in `render/`, ready for the camera in 1.4.

- [x] Movement supports arbitrary headings and positions, including distances
      smaller than a tile, at equal speed in all directions. Clamp travel to
      the aim point without oscillating. Following has a dead zone; taps arrive
      exactly at their saved destination.
- [x] Releasing a drag or long hold stops following, while a quick tap continues.
      Cancellation, unexpected lost capture, window blur, resizing, or leaving
      the playable viewport during a hold clears movement. Additional
      fingers cannot take over the active pointer or leave movement stuck on.
- [x] Tests cover continuous direction/speed, zero-distance aim, overshoot,
      drag steering, release/cancellation, and a second non-player entity.
      Holding toward impassable ground is allowed; collision in 1.3 stops travel.
- [x] A new tap or hold replaces the old destination. Tap detection checks both
      duration and maximum pointer travel, including drags that return to start.

Verified on 2026-09-25: 80 unit tests pass, including 19 input-lifecycle tests,
11 pure steering tests, and three player-controller integration tests. Lint,
formatting, typechecking, and the production build pass. Browser checks of the
built game at `/polar-qa/` covered mouse press/drag/release, dragging beyond the
playable area, ignored presses in the margin, and steering after resizing to
390 × 844, without console warnings/errors. Multi-pointer ownership and focus,
capture, and visibility cancellation are covered by automated tests; real-phone
touch checks remain in 1.7 and 1.8. See the
[preview instructions](../assets/tilemaps/README.md) and
[movement tuning](../assets/data/player-movement.json).

## 1.3 — Stop at shorelines and obstacles

**Depends on:** 1.2. **Outcome:** the player moves freely across land. Taps stop
at first contact; held movement slides along obstacles and shorelines.

Add a small world-space collision footprint and a collision system that checks
the whole proposed movement segment against impassable terrain and world bounds.
Resolve after integration. Stop tap movement at first contact; for following,
remove blocked motion and sweep the remaining tangential segment too. The tile
grid describes terrain; it does not quantize movement.

- [x] The footprint cannot enter water, solid tiles, or leave the map, including
      during diagonal movement or a step that crosses multiple tiles. Positions
      remain continuous at contact, with no snapping to tile centres.
- [x] Following slides along boundaries without adding speed, snagging on tile
      seams, or penetrating a second obstacle. Head-on contact and inside corners
      stop translation; the hold stays active so dragging can steer away.
- [x] Unit tests cover first contact, shorelines, map bounds, obstacle corners,
      narrow gaps, large steps, and steering away while blocked. Aiming beyond
      an obstacle with a tap approaches it and stops; no detour is generated.

Verified on 2026-09-25: 100 unit tests pass, including 16 pure collision tests,
three controller/integration/collision tests, and a footprint initialization
check. Lint, formatting, and the typechecked production build pass with the
`.nvmrc` Node version. Browser checks via `npm run dev` covered repeated holds
against a rock, steering away during a drag, and shoreline contact after resizing
to 390 × 844, with no console warnings/errors. The collision system publishes
resolved velocity for the later animation task. Demo steps and footprint tuning
are documented in the [map notes](../assets/tilemaps/README.md).
Real-phone and deployed-build validation remain outstanding under 1.7/1.8.

Tap/follow refinement verified on 2026-09-25: 123 unit tests pass. Quick taps
continue to their fixed world destination after release; long holds and drags
slide along boundaries and stop on release. Tests cover gesture classification,
replacement/cancellation of destinations, exact arrival, tap collision, wall
sliding in both directions, tile seams, and a second obstacle during sliding.
The `npm run dev` browser check confirmed arrival after a released click, no
sliding for a tap into a rock, and sliding for a drag at the same rock edge.

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
      offset, and scale, even when there are no new pointer-move events. A tap
      destination is converted once and remains fixed as the camera pans.
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

- [ ] Idle and walk animations use actual resolved movement, including sliding.
      Releasing a drag/long hold, reaching the destination/dead zone, or becoming
      fully blocked returns the character to idle while preserving its facing.
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
      the phone cancels movement; a new press works with the updated layout.
      Verify deliberate drag steering and cancellation with real touch input.
- [ ] Mouse input still works. Exercise the key input/coordinate cases with
      focused tests and a touch-capable browser check.

## 1.8 — Validate and ship the walking demo

**Depends on:** 1.1–1.7. **Outcome:** a tested Phase 1 build is available in QA,
with a recorded phone walkthrough and any remaining issues identified.

Use a compact island walkthrough that demonstrates free movement across open
ground, tapping and releasing to reach a destination, sliding along a shoreline,
steering around an obstacle, and following-camera movement. Fix issues
found during this acceptance pass and document how to run the demo/previewer.

- [ ] Lint, formatting, unit tests, typechecking, and the production build
      pass using `.nvmrc`. CI uses that same Node version.
- [ ] Smoke-test the built game and previewer under both deployment subpaths;
      confirm no missing assets or console errors and verify the QA deployment.
- [ ] Complete a walkthrough on at least one real phone and desktop browser:
      tap to walk after release, hold/drag to steer, release following to stop,
      keep holding as the camera pans, slide at an obstacle, steer away, rotate, and inspect
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
