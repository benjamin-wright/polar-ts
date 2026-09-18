import { addComponent, addEntity, hasComponent, query } from 'bitecs';
import { describe, expect, it } from 'vitest';
import { Health, Sprite, Transform, Velocity } from './components';
import { createGameWorld } from './world';

describe('createGameWorld', () => {
  it('creates entities and registers shared components', () => {
    const world = createGameWorld();
    const eid = addEntity(world);

    addComponent(world, eid, Transform);
    addComponent(world, eid, Velocity);
    addComponent(world, eid, Sprite);
    addComponent(world, eid, Health);

    expect(hasComponent(world, eid, Transform)).toBe(true);
    expect(hasComponent(world, eid, Health)).toBe(true);
  });

  it('queries entities by component combination', () => {
    const world = createGameWorld();
    const a = addEntity(world);
    addComponent(world, a, Transform);
    addComponent(world, a, Velocity);
    const b = addEntity(world);
    addComponent(world, b, Transform);

    expect(Array.from(query(world, [Transform, Velocity]))).toEqual([a]);
    expect(Array.from(query(world, [Transform]))).toEqual([a, b]);
  });

  it('component stores read and write per entity', () => {
    const world = createGameWorld();
    const eid = addEntity(world);
    addComponent(world, eid, Transform);

    Transform.x[eid] = 12.5;
    Transform.y[eid] = -4;

    expect(Transform.x[eid]).toBeCloseTo(12.5);
    expect(Transform.y[eid]).toBeCloseTo(-4);
  });
});
