import { query } from 'bitecs';
import { Transform, Velocity } from '../components';
import type { World } from '../world';

/** Integrate world-space velocity; controllers determine intent before this step. */
export function movementSystem(world: World, dt: number): void {
  for (const eid of query(world, [Transform, Velocity])) {
    Transform.previousX[eid] = Transform.x[eid];
    Transform.previousY[eid] = Transform.y[eid];
    Transform.x[eid] += Velocity.x[eid] * dt;
    Transform.y[eid] += Velocity.y[eid] * dt;
  }
}
