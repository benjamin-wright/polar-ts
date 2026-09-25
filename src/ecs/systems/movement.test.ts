import { addComponent, addEntity } from 'bitecs';
import { describe, expect, it } from 'vitest';
import { Transform, Velocity } from '../components';
import { createGameWorld } from '../world';
import { movementSystem } from './movement';

function setup() {
  const world = createGameWorld();
  const eid = addEntity(world);
  addComponent(world, eid, Transform);
  addComponent(world, eid, Velocity);
  Transform.x[eid] = 10.25;
  Transform.y[eid] = 20.5;
  Velocity.x[eid] = 30;
  Velocity.y[eid] = -40;
  return { world, eid };
}

describe('movementSystem', () => {
  it('integrates signed velocity without rounding world coordinates', () => {
    const { world, eid } = setup();
    movementSystem(world, 0.25);
    expect(Transform.x[eid]).toBe(17.75);
    expect(Transform.y[eid]).toBe(10.5);
  });

  it('produces the same displacement across fixed-step partitions', () => {
    const first = setup();
    movementSystem(first.world, 1);
    const expected = { x: Transform.x[first.eid], y: Transform.y[first.eid] };
    const second = setup();
    for (let i = 0; i < 60; i++) movementSystem(second.world, 1 / 60);
    expect(Transform.x[second.eid]).toBeCloseTo(expected.x);
    expect(Transform.y[second.eid]).toBeCloseTo(expected.y);
  });

  it('does not move stationary entities or transforms without velocity', () => {
    const { world, eid } = setup();
    Velocity.x[eid] = 0;
    Velocity.y[eid] = 0;
    const scenery = addEntity(world);
    addComponent(world, scenery, Transform);
    Transform.x[scenery] = 8;
    Transform.y[scenery] = 12;
    movementSystem(world, 1);
    expect([Transform.x[eid], Transform.y[eid]]).toEqual([10.25, 20.5]);
    expect([Transform.x[scenery], Transform.y[scenery]]).toEqual([8, 12]);
  });
});
