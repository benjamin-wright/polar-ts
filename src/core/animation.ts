export type Facing = 'down' | 'left' | 'right' | 'up';
export type AnimationClip = 'idle' | 'walk';

/** Atlas layout and playback data, shared by the game and developer previewer. */
export interface SpriteSheetDefinition {
  image: string;
  label: string;
  frameWidth: number;
  frameHeight: number;
  columns: number;
  rows: number;
  displayWidth: number;
  displayHeight: number;
  anchor: { x: number; y: number };
  facings: Record<Facing, number>;
  animations: Record<AnimationClip, { frames: readonly number[]; fps: number }>;
}

export interface AnimationState {
  clip: AnimationClip;
  facing: Facing;
  elapsed: number;
}

/** Select the dominant movement axis, retaining the current axis on diagonals. */
export function movementFacing(x: number, y: number, previous: Facing): Facing {
  const horizontal = Math.abs(x);
  const vertical = Math.abs(y);
  if (horizontal === 0 && vertical === 0) return previous;
  if (Math.abs(horizontal - vertical) < 1e-6) {
    return previous === 'left' || previous === 'right'
      ? x < 0
        ? 'left'
        : 'right'
      : y < 0
        ? 'up'
        : 'down';
  }
  return horizontal > vertical ? (x < 0 ? 'left' : 'right') : y < 0 ? 'up' : 'down';
}

/** Use collision-resolved velocity, never pointer intent, to select the pose. */
export function advanceAnimation(
  state: AnimationState,
  velocity: { x: number; y: number },
  dt: number,
  definition: SpriteSheetDefinition,
): AnimationState {
  // Ignore numerical contact clearance, while retaining even a slow wall slide.
  const moving = Math.hypot(velocity.x, velocity.y) > 1e-4;
  const clip = moving ? 'walk' : 'idle';
  const next = {
    clip,
    facing: moving ? movementFacing(velocity.x, velocity.y, state.facing) : state.facing,
    // Only a clip transition restarts playback; turning keeps the current gait.
    elapsed: clip === state.clip ? state.elapsed : 0,
  } satisfies AnimationState;
  return advancePlayback(next, clip === state.clip ? dt : 0, definition);
}

/** Advance a selected clip without needing a movement controller or ECS world. */
export function advancePlayback(
  state: AnimationState,
  dt: number,
  definition: SpriteSheetDefinition,
): AnimationState {
  const animation = definition.animations[state.clip];
  return {
    ...state,
    elapsed: (state.elapsed + Math.max(0, dt)) % (animation.frames.length / animation.fps),
  };
}

/** Index in the clip sequence, including repeated poses such as the idle hold. */
export function animationFrameIndex(
  definition: SpriteSheetDefinition,
  state: AnimationState,
): number {
  const animation = definition.animations[state.clip];
  return Math.floor(Math.max(0, state.elapsed) * animation.fps + 1e-9) % animation.frames.length;
}

/** Row-major atlas frame; elapsed is simulation time in seconds. */
export function animationFrame(definition: SpriteSheetDefinition, state: AnimationState): number {
  const animation = definition.animations[state.clip];
  const index = animationFrameIndex(definition, state);
  return definition.facings[state.facing] * definition.columns + animation.frames[index];
}
