import { addComponent, addEntity, hasComponent } from 'bitecs';
import { describe, expect, it } from 'vitest';
import { MoveTarget, Transform } from '../components';
import { createGameWorld } from '../world';
import { movementSystem } from './movement';

function spawnMover(world: ReturnType<typeof createGameWorld>, x: number, y: number, speed = 100) {
  const eid = addEntity(world);
  addComponent(world, eid, Transform);
  addComponent(world, eid, MoveTarget);
  Transform.x[eid] = x;
  Transform.y[eid] = y;
  MoveTarget.x[eid] = x;
  MoveTarget.y[eid] = y;
  MoveTarget.speed[eid] = speed;
  return eid;
}

describe('movementSystem', () => {
  it('moves the entity toward its target proportionally to dt', () => {
    const world = createGameWorld();
    const eid = spawnMover(world, 0, 0);
    MoveTarget.x[eid] = 100;
    MoveTarget.y[eid] = 0;

    movementSystem(world, 0.5);

    expect(Transform.x[eid]).toBeCloseTo(50);
    expect(Transform.y[eid]).toBeCloseTo(0);
    expect(hasComponent(world, eid, MoveTarget)).toBe(true);
  });

  it('moves diagonally at constant speed', () => {
    const world = createGameWorld();
    const eid = spawnMover(world, 0, 0, 50);
    MoveTarget.x[eid] = 30;
    MoveTarget.y[eid] = 40; // distance 50

    movementSystem(world, 0.5); // step 25 = half way

    expect(Transform.x[eid]).toBeCloseTo(15);
    expect(Transform.y[eid]).toBeCloseTo(20);
  });

  it('snaps to the target and removes MoveTarget on arrival', () => {
    const world = createGameWorld();
    const eid = spawnMover(world, 0, 0);
    MoveTarget.x[eid] = 10;
    MoveTarget.y[eid] = 0;

    movementSystem(world, 1); // step 100 > distance 10

    expect(Transform.x[eid]).toBe(10);
    expect(Transform.y[eid]).toBe(0);
    expect(hasComponent(world, eid, MoveTarget)).toBe(false);
  });

  it('treats a zero-distance target as arrived', () => {
    const world = createGameWorld();
    const eid = spawnMover(world, 5, 5);
    MoveTarget.x[eid] = 5;
    MoveTarget.y[eid] = 5;

    movementSystem(world, 1 / 60);

    expect(hasComponent(world, eid, MoveTarget)).toBe(false);
  });
});
