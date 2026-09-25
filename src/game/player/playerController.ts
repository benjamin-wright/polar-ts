import { addComponent, query } from 'bitecs';
import { MoveTarget, Transform } from '../../ecs/components';
import type { World } from '../../ecs/world';

/**
 * Phase 0 tap-to-walk controller: a pending tap in world coordinates becomes
 * a MoveTarget on each entity with a Transform. Phase 1 replaces this with
 * player-only hold-to-move steering and continuous collision; see docs/phase-1.md.
 */
export function playerControllerSystem(world: World, tap: { x: number; y: number } | null): void {
  if (!tap) return;
  for (const eid of query(world, [Transform])) {
    addComponent(world, eid, MoveTarget);
    MoveTarget.x[eid] = tap.x;
    MoveTarget.y[eid] = tap.y;
  }
}
