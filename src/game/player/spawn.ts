import { addComponent, addEntity } from 'bitecs';
import movementConfig from '../../../assets/data/player-movement.json';
import {
  Animation,
  Collider,
  Health,
  PlayerControlled,
  Sprite,
  Transform,
  Velocity,
  WalkIntent,
} from '../../ecs/components';
import type { World } from '../../ecs/world';

/** Creates a stationary, explicitly player-controlled entity. */
export function spawnPlayer(world: World, x: number, y: number): number {
  const eid = addEntity(world);
  addComponent(world, eid, Transform);
  addComponent(world, eid, Velocity);
  addComponent(world, eid, Sprite);
  addComponent(world, eid, Animation);
  addComponent(world, eid, Health);
  addComponent(world, eid, PlayerControlled);
  addComponent(world, eid, Collider);
  addComponent(world, eid, WalkIntent);
  WalkIntent.mode[eid] = 'idle';
  WalkIntent.x[eid] = x;
  WalkIntent.y[eid] = y;
  Transform.x[eid] = x;
  Transform.y[eid] = y;
  Transform.previousX[eid] = x;
  Transform.previousY[eid] = y;
  Collider.halfWidth[eid] = movementConfig.footprint.halfWidth;
  Collider.halfHeight[eid] = movementConfig.footprint.halfHeight;
  // bitecs array stores are uninitialized (undefined) until written — writing
  // undefined into Pixi's rotation yields NaN and a zero-size sprite, so every
  // numeric field must get an explicit default here.
  Transform.rotation[eid] = 0;
  Velocity.x[eid] = 0;
  Velocity.y[eid] = 0;
  Sprite.kind[eid] = 'player';
  Sprite.zIndex[eid] = 1;
  Animation.clip[eid] = 'idle';
  Animation.facing[eid] = 'down';
  Animation.elapsed[eid] = 0;
  Health.current[eid] = 100;
  Health.max[eid] = 100;
  return eid;
}
