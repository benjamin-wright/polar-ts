import { query } from 'bitecs';
import movementConfig from '../../../assets/data/player-movement.json';
import type { MovementInput } from '../../core/InputSystem';
import { PlayerControlled, Transform, Velocity, WalkIntent } from '../../ecs/components';
import type { World } from '../../ecs/world';
import { walkVelocity } from './steering';

/**
 * Input coordinates have already been converted to world space by the render
 * adapter. Taps persist; held input replaces them and is refreshed each tick.
 */
export function playerControllerSystem(world: World, input: MovementInput, dt: number): void {
  for (const eid of query(world, [PlayerControlled, Transform, Velocity, WalkIntent])) {
    if (input.cancelled || WalkIntent.mode[eid] === 'follow') WalkIntent.mode[eid] = 'idle';
    const point = input.held ?? input.tap;
    if (point) {
      WalkIntent.mode[eid] = input.held && input.following ? 'follow' : 'tap';
      WalkIntent.x[eid] = point.x;
      WalkIntent.y[eid] = point.y;
    }
    const mode = WalkIntent.mode[eid];
    const aim = mode === 'idle' ? null : { x: WalkIntent.x[eid], y: WalkIntent.y[eid] };
    const velocity = walkVelocity(
      { x: Transform.x[eid], y: Transform.y[eid] },
      aim,
      dt,
      // Taps arrive exactly at their destination; only following needs a dead zone.
      mode === 'tap' ? { ...movementConfig, deadZone: 0 } : movementConfig,
    );
    if (mode === 'tap' && velocity.x === 0 && velocity.y === 0) WalkIntent.mode[eid] = 'idle';
    Velocity.x[eid] = velocity.x;
    Velocity.y[eid] = velocity.y;
  }
}
