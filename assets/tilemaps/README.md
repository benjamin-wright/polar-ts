# First island

`island.json` is a finite Tiled JSON map: 20 × 16 tiles at 32 × 32 world pixels.
It can be opened directly in Tiled. `island-tiles.png` is an original placeholder
atlas drawn for this project, with water, snow, coastal ice, and a transparent
rock tile. No external artwork or attribution is required.

## Supported export contract

Use Tiled's JSON map format with these restrictions:

- Orthogonal, finite maps with `right-down` render order; dimensions and tile
  sizes are positive integers up to 256. Coordinates start at the upper left.
- Exactly one embedded image tileset, with `firstgid: 1`, matching map tile
  dimensions, complete atlas rows, and zero margin/spacing. Use a local PNG
  filename; its declared dimensions must match the image. External tilesets,
  image collections, tile offsets, animations, and collision objects are unsupported.
- Every tile ID has an explicit boolean `walkable` custom property. Water and
  rocks are false; snow and coastal ice are true. IDs in layer data are global
  IDs (local tile ID + 1), without flip/rotation flags.
- Exactly three layers, in order: `terrain` (tile layer), `obstacles` (tile
  layer), then `spawn` (object layer). Tile layers match the map dimensions and
  contain row-major numeric GID arrays. Every terrain cell has a tile; obstacle
  GID 0 means empty. Rendering draws terrain, then obstacles, then the player.
- Layers are visible and fully opaque, without offsets, tint, blending, or
  parallax. Group layers, infinite chunks, compressed/base64 data, and additional
  layers are unsupported. Editor IDs and descriptive metadata may be present.
- The spawn layer contains exactly one point named `player-spawn`, in world
  pixels, with zero rotation. Its position must be inside the map on walkable
  terrain without an impassable obstacle; it need not be a tile centre.

The loader in `src/game/world/tilemap.ts` validates this contract and produces
world bounds, ordered tile layers, spawn coordinates, and a combined row-major
walkability grid. A cell is walkable only when its terrain and any obstacle are
both walkable. Invalid exports fail with the offending field in the error.
The collision system sweeps the player's whole footprint against this grid after
movement integration. Tap destinations stop at first contact; held movement
slides along boundaries. Both modes sweep the whole movement segment without
pathfinding, and the sliding segment is checked against other obstacles too.
The full footprint must fit at the spawn; the game rejects a spawn too close to
blocked ground even if its centre tile is walkable.

Maps and atlas images are imported through Vite asset URLs, so the build emits
and hashes both files. If an atlas filename changes, update its import and the
image registry in `src/main.ts`; raw filenames inside JSON are not rewritten by
Vite. Keep assets relative to the app so the same build works at `/polar/` and
`/polar-qa/`.

## Preview this slice

Run `nvm use`, then `npm run dev`. The blue placeholder player starts at the spawn
with a following camera. Tap to walk to a location after release. Hold a finger or
the primary mouse button to follow it, drag to steer, and release a drag or long
hold to stop. Leaving the playable viewport during a hold, losing focus, or
resizing cancels movement; press again to resume. Presses in any surrounding
margin are ignored.

`assets/data/camera.json` sets the camera zoom (currently 2 CSS pixels per world
pixel). The view follows the player directly, clamps at map bounds, and centres
each axis where the map is smaller than the viewport. Holding a stationary
pointer ahead keeps steering as the world scrolls. A completed tap is converted
once into a world destination and stays fixed during panning. Terrain and entities
share a world container; screen overlays can remain outside it. The fixed logical
viewport and safe-area layout remain in task 1.7.

`assets/data/player-movement.json` configures `walkSpeed` in world pixels per
second and `deadZone` as a radius in world pixels. Reaching the aim point or its
dead zone stops movement while keeping the hold active, so dragging away resumes
travel without another press. Only the first primary pointer controls movement.
`tap.maxDurationMs` (250 ms) and `tap.maxTravelPx` (10 CSS pixels) distinguish
quick taps from long holds and drags. Moving beyond that distance counts as a
drag even if the pointer returns to its starting point. A tap keeps a fixed world
destination, ignores the follow dead zone, and clears on arrival, collision, or
cancellation. A new tap or hold replaces it.
`footprint.halfWidth` and `footprint.halfHeight` configure a centred, axis-aligned
ground footprint (currently 24 × 24 pixels). Touching a tile edge is allowed;
overlapping blocked ground is not. Collision checks the entire movement segment,
so even a large step cannot cross a rock or a strip of water. Taps stop both axes
at contact. Following preserves tangential movement along the boundary without
adding speed; direct head-on contact or an inside corner still stops translation.

For review, check the ice shore, rocks over snow, player above the terrain, and
accurate movement after resizing. Tap open snow, release, and watch the player
reach the destination. Tap beyond a rock and check that movement stops at the
rock. Then hold diagonally into its edge: the player should slide along it; drag
away to return to open ground. Repeat at the shoreline, and check that a long
hold or drag stops on release. Drag into the surrounding margin and resize
during a tap journey to check cancellation. Hold a stationary pointer ahead to
explore beyond the initial view, and confirm that landmarks move together with
the terrain while the player stays near the centre until the camera clamps.
Repeat after resizing to portrait and landscape; on a view larger than the map,
check that the island is centred and presses in the margins are ignored.
`npm test` validates map exports, steering, pointer cancellation, player-only
control, tap completion/cancellation, and swept collision (sliding, tile seams,
corners, narrow gaps, large steps, and blocked holds). Camera tests cover bounds,
coordinate conversion, canvas offsets, resize, stationary holds during catch-up
steps, and fixed tap destinations while panning.
`npm run build` produces the static assets for subpath smoke testing.

Format reference: [Tiled JSON map format](https://doc.mapeditor.org/en/stable/reference/json-map-format/).
