import { query, removeComponent } from 'bitecs';
import { MoveTarget, Transform } from '../components';
import type { World } from '../world';

/**
 * Moves entities with a MoveTarget toward it at their speed, removing the
 * target component on arrival. Pure simulation — no rendering.
 */
export function movementSystem(world: World, dt: number): void {
  for (const eid of query(world, [Transform, MoveTarget])) {
    const dx = MoveTarget.x[eid] - Transform.x[eid];
    const dy = MoveTarget.y[eid] - Transform.y[eid];
    const dist = Math.hypot(dx, dy);
    const step = MoveTarget.speed[eid] * dt;

    if (dist <= step || dist === 0) {
      Transform.x[eid] = MoveTarget.x[eid];
      Transform.y[eid] = MoveTarget.y[eid];
      removeComponent(world, eid, MoveTarget);
    } else {
      Transform.x[eid] += (dx / dist) * step;
      Transform.y[eid] += (dy / dist) * step;
    }
  }
}
