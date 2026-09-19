import { addComponent, addEntity } from 'bitecs';
import { Health, MoveTarget, Sprite, Transform, Velocity } from '../../ecs/components';
import type { World } from '../../ecs/world';

/** Player tap-to-walk speed in world units per second. */
export const PLAYER_WALK_SPEED = 200;

/**
 * Creates the player entity with the shared components it needs so far.
 * MoveTarget is pre-attached (stationary at spawn) so its speed default
 * lives here rather than being patched by systems later.
 */
export function spawnPlayer(world: World, x: number, y: number): number {
  const eid = addEntity(world);
  addComponent(world, eid, Transform);
  addComponent(world, eid, Velocity);
  addComponent(world, eid, Sprite);
  addComponent(world, eid, Health);
  addComponent(world, eid, MoveTarget);
  Transform.x[eid] = x;
  Transform.y[eid] = y;
  // bitecs array stores are uninitialized (undefined) until written — writing
  // undefined into Pixi's rotation yields NaN and a zero-size sprite, so every
  // numeric field must get an explicit default here.
  Transform.rotation[eid] = 0;
  Velocity.x[eid] = 0;
  Velocity.y[eid] = 0;
  Sprite.kind[eid] = 'player';
  Sprite.zIndex[eid] = 1;
  Health.current[eid] = 100;
  Health.max[eid] = 100;
  MoveTarget.x[eid] = x;
  MoveTarget.y[eid] = y;
  MoveTarget.speed[eid] = PLAYER_WALK_SPEED;
  return eid;
}
