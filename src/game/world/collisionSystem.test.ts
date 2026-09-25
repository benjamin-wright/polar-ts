import { addComponent, addEntity } from 'bitecs';
import { describe, expect, it } from 'vitest';
import island from '../../../assets/tilemaps/island.json';
import { Collider, Transform, Velocity } from '../../ecs/components';
import { movementSystem } from '../../ecs/systems/movement';
import { createGameWorld } from '../../ecs/world';
import { playerControllerSystem } from '../player/playerController';
import { spawnPlayer } from '../player/spawn';
import { isFootprintClear } from './collision';
import { collisionSystem } from './collisionSystem';
import { parseTileMap } from './tilemap';

function setup() {
  const world = createGameWorld();
  const map = parseTileMap(island);
  map.walkable.fill(true);
  map.walkable[8 * map.width + 12] = false;
  const player = spawnPlayer(world, 304, 272);
  const tick = (aim: { x: number; y: number } | null, dt = 1 / 60): void => {
    playerControllerSystem(world, aim, dt);
    movementSystem(world, dt);
    collisionSystem(world, map, dt);
  };
  return { world, map, player, tick };
}

describe('controller → integration → collision', () => {
  it('approaches a barrier, stays still while held, and steers away without a release', () => {
    const { player, tick } = setup();
    const aim = { x: 600, y: 272 };
    tick(aim);
    expect(Transform.x[player]).toBeGreaterThan(304);
    for (let i = 0; i < 120; i++) tick(aim);
    const stoppedX = Transform.x[player];
    expect(stoppedX).toBeCloseTo(384 - Collider.halfWidth[player], 6);
    expect(Transform.y[player]).toBe(272);
    expect(Velocity.x[player]).toBe(0);
    expect(Velocity.y[player]).toBe(0);
    for (let i = 0; i < 120; i++) tick(aim);
    expect(Transform.x[player]).toBe(stoppedX);
    tick({ x: 200, y: 260 });
    expect(Transform.x[player]).toBeLessThan(stoppedX);
    expect(Transform.y[player]).toBeLessThan(272);
    const released = { x: Transform.x[player], y: Transform.y[player] };
    tick(null);
    expect({ x: Transform.x[player], y: Transform.y[player] }).toEqual(released);
  });

  it('resolves a large step and publishes the shortened movement for later animation', () => {
    const { player, map, tick } = setup();
    tick({ x: 620, y: 272 }, 2);
    expect(Transform.previousX[player]).toBe(304);
    expect(Transform.previousY[player]).toBe(272);
    expect(Transform.x[player]).toBeCloseTo(372, 6);
    expect(Velocity.x[player]).toBeCloseTo((372 - 304) / 2, 6);
    expect(
      isFootprintClear(
        map,
        { x: Transform.x[player], y: Transform.y[player] },
        {
          halfWidth: Collider.halfWidth[player],
          halfHeight: Collider.halfHeight[player],
        },
      ),
    ).toBe(true);
  });

  it('leaves non-colliding entities alone and resolves other colliders independently of input', () => {
    const { world, map } = setup();
    const entities = [addEntity(world), addEntity(world)];
    for (const eid of entities) {
      addComponent(world, eid, Transform);
      addComponent(world, eid, Velocity);
      Transform.x[eid] = 304;
      Transform.y[eid] = 272;
      Velocity.x[eid] = 200;
      Velocity.y[eid] = 0;
    }
    const [ghost, solid] = entities;
    addComponent(world, solid, Collider);
    Collider.halfWidth[solid] = 4;
    Collider.halfHeight[solid] = 4;
    movementSystem(world, 1);
    collisionSystem(world, map, 1);
    expect(Transform.x[ghost]).toBe(504);
    expect(Velocity.x[ghost]).toBe(200);
    expect(Transform.x[solid]).toBeCloseTo(380, 6);
  });
});
