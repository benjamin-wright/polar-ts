import { hasComponent, query } from 'bitecs';
import { Collider, Transform, Velocity, WalkIntent } from '../../ecs/components';
import type { World } from '../../ecs/world';
import { slideFootprint, sweepFootprint } from './collision';
import type { TileMap } from './tilemap';

/** Resolve integrated movement before animation, camera, and render sync. */
export function collisionSystem(world: World, map: TileMap, dt: number): void {
  if (dt <= 0) return;
  for (const eid of query(world, [Transform, Velocity, Collider])) {
    const from = { x: Transform.previousX[eid], y: Transform.previousY[eid] };
    const walking = hasComponent(world, eid, WalkIntent);
    const resolve = walking && WalkIntent.mode[eid] === 'follow' ? slideFootprint : sweepFootprint;
    const proposed = { x: Transform.x[eid], y: Transform.y[eid] };
    const position = resolve(map, from, proposed, {
      halfWidth: Collider.halfWidth[eid],
      halfHeight: Collider.halfHeight[eid],
    });
    Transform.x[eid] = position.x;
    Transform.y[eid] = position.y;
    if (
      walking &&
      WalkIntent.mode[eid] === 'tap' &&
      (position.x !== proposed.x ||
        position.y !== proposed.y ||
        Math.hypot(position.x - WalkIntent.x[eid], position.y - WalkIntent.y[eid]) < 1e-7)
    ) {
      // A tap finishes on arrival or at its first obstacle. Following stays active.
      WalkIntent.mode[eid] = 'idle';
    }
    // Publish actual movement, including a shortened final step. Input intent is
    // recomputed next tick, so being blocked never cancels the user's hold.
    Velocity.x[eid] = (position.x - from.x) / dt;
    Velocity.y[eid] = (position.y - from.y) / dt;
  }
}
