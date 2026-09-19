import { hasComponent } from 'bitecs';
import { describe, expect, it } from 'vitest';
import { Health, MoveTarget, Sprite, Transform, Velocity } from '../../ecs/components';
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

  it('initializes numeric transform/velocity fields so renderers never see NaN', () => {
    const world = createGameWorld();
    const eid = spawnPlayer(world, 40, 24);

    // Regression: an uninitialized (undefined) rotation written into Pixi
    // produced NaN and collapsed the sprite to zero size — invisible sprite.
    expect(Transform.rotation[eid]).toBe(0);
    expect(Velocity.x[eid]).toBe(0);
    expect(Velocity.y[eid]).toBe(0);
    expect(Number.isNaN(Transform.rotation[eid])).toBe(false);
  });
});
