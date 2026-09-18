import { addComponent, query } from 'bitecs';
import { MoveTarget, Transform } from '../../ecs/components';
import type { World } from '../../ecs/world';

/**
 * Tap-to-walk controller (phase 0 form): a pending tap in world coordinates
 * becomes a MoveTarget on the tapped entity. A* pathfinding and collision
 * arrive with the tile map in phase 1; for now movers walk straight.
 */
export function playerControllerSystem(world: World, tap: { x: number; y: number } | null): void {
  if (!tap) return;
  for (const eid of query(world, [Transform])) {
    addComponent(world, eid, MoveTarget);
    MoveTarget.x[eid] = tap.x;
    MoveTarget.y[eid] = tap.y;
  }
}
