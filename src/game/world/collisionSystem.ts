import { query } from 'bitecs';
import { Collider, Transform, Velocity } from '../../ecs/components';
import type { World } from '../../ecs/world';
import { sweepFootprint } from './collision';
import type { TileMap } from './tilemap';

/** Resolve integrated movement before animation, camera, and render sync. */
export function collisionSystem(world: World, map: TileMap, dt: number): void {
  if (dt <= 0) return;
  for (const eid of query(world, [Transform, Velocity, Collider])) {
    const from = { x: Transform.previousX[eid], y: Transform.previousY[eid] };
    const position = sweepFootprint(
      map,
      from,
      { x: Transform.x[eid], y: Transform.y[eid] },
      { halfWidth: Collider.halfWidth[eid], halfHeight: Collider.halfHeight[eid] },
    );
    Transform.x[eid] = position.x;
    Transform.y[eid] = position.y;
    // Publish actual movement, including a shortened final step. Input intent is
    // recomputed next tick, so being blocked never cancels the user's hold.
    Velocity.x[eid] = (position.x - from.x) / dt;
    Velocity.y[eid] = (position.y - from.y) / dt;
  }
}
