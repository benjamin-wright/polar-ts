import { hasComponent } from 'bitecs';
import { describe, expect, it } from 'vitest';
import { Health, MoveTarget, Sprite, Transform } from '../../ecs/components';
import { createGameWorld } from '../../ecs/world';
import { PLAYER_WALK_SPEED, spawnPlayer } from './spawn';

describe('spawnPlayer', () => {
  it('creates an entity at the given position with player sprite', () => {
    const world = createGameWorld();
    const eid = spawnPlayer(world, 40, 24);

    expect(Transform.x[eid]).toBe(40);
    expect(Transform.y[eid]).toBe(24);
    expect(Sprite.kind[eid]).toBe('player');
    expect(hasComponent(world, eid, Health)).toBe(true);
    expect(Health.current[eid]).toBe(Health.max[eid]);
  });

  it('initializes a stationary MoveTarget with the walk-speed default', () => {
    const world = createGameWorld();
    const eid = spawnPlayer(world, 40, 24);

    expect(hasComponent(world, eid, MoveTarget)).toBe(true);
    expect(MoveTarget.x[eid]).toBe(40);
    expect(MoveTarget.y[eid]).toBe(24);
    expect(MoveTarget.speed[eid]).toBe(PLAYER_WALK_SPEED);
  });
});
