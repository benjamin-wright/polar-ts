import { hasComponent } from 'bitecs';
import { describe, expect, it } from 'vitest';
import movementConfig from '../../../assets/data/player-movement.json';
import {
  Animation,
  Collider,
  Health,
  PlayerControlled,
  Sprite,
  Transform,
  Velocity,
} from '../../ecs/components';
import { createGameWorld } from '../../ecs/world';
import { spawnPlayer } from './spawn';

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

  it('marks the player for input and starts stationary', () => {
    const world = createGameWorld();
    const eid = spawnPlayer(world, 40, 24);

    expect(hasComponent(world, eid, PlayerControlled)).toBe(true);
    expect(Velocity.x[eid]).toBe(0);
    expect(Velocity.y[eid]).toBe(0);
    expect(hasComponent(world, eid, Animation)).toBe(true);
    expect(Animation.clip[eid]).toBe('idle');
    expect(Animation.facing[eid]).toBe('down');
    expect(Animation.elapsed[eid]).toBe(0);
  });

  it('initializes the configured footprint and a stationary collision segment', () => {
    const world = createGameWorld();
    const eid = spawnPlayer(world, 40.25, 24.5);
    expect(hasComponent(world, eid, Collider)).toBe(true);
    expect(Collider.halfWidth[eid]).toBe(movementConfig.footprint.halfWidth);
    expect(Collider.halfHeight[eid]).toBe(movementConfig.footprint.halfHeight);
    expect(Transform.previousX[eid]).toBe(40.25);
    expect(Transform.previousY[eid]).toBe(24.5);
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
