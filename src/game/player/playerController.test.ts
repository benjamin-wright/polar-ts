import { addComponent, addEntity } from 'bitecs';
import { describe, expect, it } from 'vitest';
import movementConfig from '../../../assets/data/player-movement.json';
import { Transform, Velocity, WalkIntent } from '../../ecs/components';
import { movementSystem } from '../../ecs/systems/movement';
import { createGameWorld } from '../../ecs/world';
import { playerControllerSystem } from './playerController';
import { spawnPlayer } from './spawn';

const follow = (held: { x: number; y: number } | null) => ({
  held,
  following: true,
  tap: null,
  cancelled: false,
});

describe('playerControllerSystem with integration', () => {
  it('moves while held, steers on drag, and stops immediately on release', () => {
    const world = createGameWorld();
    const player = spawnPlayer(world, 0, 0);
    const step = 1 / 60;
    for (let i = 0; i < 6; i++) {
      playerControllerSystem(world, follow({ x: 100, y: 0 }), step);
      movementSystem(world, step);
    }
    expect(Transform.x[player]).toBeCloseTo(movementConfig.walkSpeed * step * 6);
    const turnX = Transform.x[player];
    playerControllerSystem(world, follow({ x: turnX, y: 100 }), step);
    movementSystem(world, step);
    expect(Transform.x[player]).toBeCloseTo(turnX);
    expect(Transform.y[player]).toBeCloseTo(movementConfig.walkSpeed * step);
    const stopY = Transform.y[player];
    for (let i = 0; i < 60; i++) {
      playerControllerSystem(world, follow(null), step);
      movementSystem(world, step);
    }
    expect(Transform.x[player]).toBeCloseTo(turnX);
    expect(Transform.y[player]).toBe(stopY);
    expect(Velocity.x[player]).toBe(0);
    expect(Velocity.y[player]).toBe(0);
  });

  it('leaves a second non-player entity under its own control', () => {
    const world = createGameWorld();
    spawnPlayer(world, 0, 0);
    const other = addEntity(world);
    addComponent(world, other, Transform);
    addComponent(world, other, Velocity);
    Transform.x[other] = 12;
    Transform.y[other] = 18;
    Velocity.x[other] = -10;
    Velocity.y[other] = 0;
    playerControllerSystem(world, follow({ x: 100, y: 100 }), 0.1);
    movementSystem(world, 0.1);
    expect(Transform.x[other]).toBe(11);
    expect(Transform.y[other]).toBe(18);
    playerControllerSystem(world, follow(null), 0.1);
    expect(Velocity.x[other]).toBe(-10);
  });

  it('stays at rest near the aim, then resumes toward a new aim without a release', () => {
    const world = createGameWorld();
    const player = spawnPlayer(world, 0, 0);
    const aim = { x: 15.5, y: 2.75 };
    for (let i = 0; i < 60; i++) {
      playerControllerSystem(world, follow(aim), 1 / 60);
      movementSystem(world, 1 / 60);
    }
    const x = Transform.x[player];
    const y = Transform.y[player];
    expect(Math.hypot(aim.x - x, aim.y - y)).toBeLessThanOrEqual(movementConfig.deadZone);
    expect(Velocity.x[player]).toBe(0);
    playerControllerSystem(world, follow({ x: x - 50, y }), 1 / 60);
    movementSystem(world, 1 / 60);
    expect(Transform.x[player]).toBeLessThan(x);
  });

  it('retains a fixed tap destination after release and reaches it inside the follow dead zone', () => {
    const world = createGameWorld();
    const player = spawnPlayer(world, 0, 0);
    const tap = { x: 14.25, y: 2.5 };
    const destination = { ...tap };
    playerControllerSystem(world, { held: null, following: false, tap, cancelled: true }, 1 / 60);
    movementSystem(world, 1 / 60);
    tap.x = 100; // Later pointer/camera changes cannot move the saved world target.
    for (let i = 0; i < 60; i++) {
      playerControllerSystem(world, follow(null), 1 / 60);
      movementSystem(world, 1 / 60);
    }
    expect(Transform.x[player]).toBeCloseTo(destination.x, 10);
    expect(Transform.y[player]).toBeCloseTo(destination.y, 10);
    expect(WalkIntent.mode[player]).toBe('idle');
    expect(Velocity.x[player]).toBe(0);
    expect(Velocity.y[player]).toBe(0);
  });

  it('replaces a tap with a new tap or a hold and never resumes the old target on release', () => {
    const world = createGameWorld();
    const player = spawnPlayer(world, 0, 0);
    playerControllerSystem(
      world,
      { held: null, following: false, tap: { x: 100, y: 0 }, cancelled: false },
      0.1,
    );
    movementSystem(world, 0.1);
    playerControllerSystem(
      world,
      { held: null, following: false, tap: { x: 20, y: 100 }, cancelled: false },
      0.1,
    );
    movementSystem(world, 0.1);
    expect(Transform.x[player]).toBe(20);
    expect(Transform.y[player]).toBe(20);
    playerControllerSystem(world, follow({ x: -100, y: 20 }), 0.1);
    movementSystem(world, 0.1);
    expect(Transform.x[player]).toBe(0);
    expect(WalkIntent.mode[player]).toBe('follow');
    playerControllerSystem(world, follow(null), 0.1);
    movementSystem(world, 0.1);
    expect(Transform.x[player]).toBe(0);
    expect(Transform.y[player]).toBe(20);
    expect(WalkIntent.mode[player]).toBe('idle');
  });

  it('cancels an in-flight tap on focus loss or viewport cancellation', () => {
    const world = createGameWorld();
    const player = spawnPlayer(world, 0, 0);
    playerControllerSystem(
      world,
      { held: null, following: false, tap: { x: 100, y: 0 }, cancelled: false },
      0.1,
    );
    movementSystem(world, 0.1);
    playerControllerSystem(
      world,
      { held: null, following: false, tap: null, cancelled: true },
      0.1,
    );
    movementSystem(world, 0.1);
    expect(Transform.x[player]).toBe(20);
    expect(WalkIntent.mode[player]).toBe('idle');
    expect(Velocity.x[player]).toBe(0);
  });
});
