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
The grid is ready for the collision subtask; this slice does not enforce it yet.

Maps and atlas images are imported through Vite asset URLs, so the build emits
and hashes both files. If an atlas filename changes, update its import and the
image registry in `src/main.ts`; raw filenames inside JSON are not rewritten by
Vite. Keep assets relative to the app so the same build works at `/polar/` and
`/polar-qa/`.

## Preview this slice

Run `nvm use`, then `npm run dev`. The full island is centred and scaled down
when necessary, with the blue placeholder player at the spawn. Hold a finger or
the primary mouse button inside the island to move straight toward it, drag to
steer, and release to stop. Leaving the island's rectangular viewport or losing
focus clears the hold; press again to resume. Presses in the surrounding margin
are ignored. Travel still passes through water and rocks: collision arrives in
1.3, followed by the camera in 1.4.

`assets/data/player-movement.json` configures `walkSpeed` in world pixels per
second and `deadZone` as a radius in world pixels. Reaching the aim point or its
dead zone stops movement while keeping the hold active, so dragging away resumes
travel without another press. Only the first primary pointer controls movement.

For review, check the ice shore, rocks over snow, player above the terrain, and
accurate movement after resizing. Hold at different angles, drag to change
direction, release, and drag into the surrounding margin to check cancellation.
`npm test` validates map exports, steering, pointer cancellation, and player-only
control; `npm run build` produces the static assets for subpath smoke testing.

Format reference: [Tiled JSON map format](https://doc.mapeditor.org/en/stable/reference/json-map-format/).
