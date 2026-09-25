import { query } from 'bitecs';
import movementConfig from '../../../assets/data/player-movement.json';
import { PlayerControlled, Transform, Velocity } from '../../ecs/components';
import type { World } from '../../ecs/world';
import { walkVelocity } from './steering';

/**
 * Recompute player intent from the current hold before each integration step.
 * A null aim stops movement; other entities retain their own velocity.
 */
export function playerControllerSystem(
  world: World,
  aim: { x: number; y: number } | null,
  dt: number,
): void {
  for (const eid of query(world, [PlayerControlled, Transform, Velocity])) {
    const velocity = walkVelocity(
      { x: Transform.x[eid], y: Transform.y[eid] },
      aim,
      dt,
      movementConfig,
    );
    Velocity.x[eid] = velocity.x;
    Velocity.y[eid] = velocity.y;
  }
}
