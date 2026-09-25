/**
 * Shared ECS components as structure-of-arrays stores, indexed by entity id.
 * bitecs sizes stores to the world's entity capacity on registration. Keep
 * these renderer-agnostic — no Pixi types here.
 */

/** World-space position. */
export const Transform = {
  x: [] as number[],
  y: [] as number[],
  /** Position before the latest integration step, used by collision/animation. */
  previousX: [] as number[],
  previousY: [] as number[],
  /** Radians, 0 = facing right, positive = clockwise (screen space). */
  rotation: [] as number[],
};

/** World-space velocity, units per second. */
export const Velocity = {
  x: [] as number[],
  y: [] as number[],
};

/** Renderable marker + sprite metadata for render/ adapters. */
export const Sprite = {
  /** Key into the render layer's texture registry (e.g. 'player'). */
  kind: [] as string[],
  /** Draw order hint; render adapter sorts on it. */
  zIndex: [] as number[],
};

/** Hit points, for later sailing damage and hazards. */
export const Health = {
  current: [] as number[],
  max: [] as number[],
};

/** Generic key-value inventory, quantities by good id. */
export const Inventory = {
  goods: [] as Map<string, number>[],
};

/** Marker for the entity controlled by player input. */
export const PlayerControlled = {};

/** Axis-aligned ground footprint centred on Transform, in world pixels. */
export const Collider = {
  halfWidth: [] as number[],
  halfHeight: [] as number[],
};
