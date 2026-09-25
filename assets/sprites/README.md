# Sprites

## Polar bear cub

`polar-bear-cub.png` is the Phase 1 placeholder character sheet: a transparent
RGBA PNG with four rows (down, left, right, up) and four columns (idle, blink,
first walking step, second walking step). It was created for this repository on
2026-09-25 using the built-in image generation tool, without reference artwork
or a third-party asset pack. The exact generation prompt is saved in
[`polar-bear-cub-prompt.txt`](./polar-bear-cub-prompt.txt). Side-facing walk poses
were then revised with the same tool so the rear paws visibly push off and swing
forward. The refinement and final alpha-extraction prompts are recorded in
[`polar-bear-cub-edits.txt`](./polar-bear-cub-edits.txt).

The generated PNG is 1254 × 1254 pixels. The original image and alpha are
preserved; its four equal cells per axis are 313.5 pixels wide. Pixi's fractional
texture rectangles slice the grid directly, and all artwork stays clear of cell
edges. The sheet is bundled through Vite's `?url` import, so its URL stays relative
to the production or QA deployment directory.

[`player-animation.json`](../data/player-animation.json) defines the atlas,
direction rows, frame sequences, playback rates, display size, and anchor.
Each frame displays at 48 × 48 world pixels including transparent padding. The
anchor `(0.5, 0.82)` puts the ground point among the paws; it is the same position
as the centre of the player's conservative 24 × 24 collision footprint. The
head extends above the ground footprint. Every frame uses the same size and
anchor, so changing texture does not move the entity.

Idle repeats the open-eye pose before a blink (the rear view breathes instead).
Walking alternates steps with the neutral pose at 8 fps. The fixed simulation
step advances playback after collision: sliding follows the resolved direction,
fully blocked movement idles, and stopping retains the last facing. Turning
keeps the current gait phase; changing between idle and walk starts a new clip.
On exact diagonals, the prior facing axis wins to avoid flickering between rows.

`src/core/animation.ts` owns pure timing and frame selection;
`src/ecs/systems/animation.ts` updates ECS state;
`src/render/sprites.ts` owns Pixi textures. The previewer at `/dev/` reuses the
same definitions, playback, frame geometry, and cached sheet loader. Use its
frame slider or step buttons to pause and inspect the rear-paw poses closely.

## Try it

Run `npm run dev` with the `.nvmrc` Node version and open the game:

1. Leave the cub still to see its idle blink.
2. Tap open ground in each direction; the cub keeps walking after release,
   then idles facing the direction it travelled.
3. Hold and drag into a rock at an angle. The walking direction follows the
   slide along its edge; head-on contact idles even while the pointer is held.
4. Steer away from the rock and release the drag. The cub walks, then stops
   without changing its facing. Resize the browser and repeat.

The first island's terrain atlas lives in [`assets/tilemaps/`](../tilemaps/README.md)
beside its Tiled map.
