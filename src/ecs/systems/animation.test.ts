import { describe, expect, it } from 'vitest';
import island from '../../../assets/tilemaps/island.json';
import type { MovementInput } from '../../core/InputSystem';
import { animationFrame } from '../../core/animation';
import { spriteSheets } from '../../core/spriteSheets';
import { playerControllerSystem } from '../../game/player/playerController';
import { spawnPlayer } from '../../game/player/spawn';
import { collisionSystem } from '../../game/world/collisionSystem';
import { parseTileMap } from '../../game/world/tilemap';
import { Animation, Transform, WalkIntent } from '../components';
import { createGameWorld } from '../world';
import { animationSystem } from './animation';
import { movementSystem } from './movement';

const released: MovementInput = { held: null, following: false, tap: null, cancelled: false };
const follow = (x: number, y: number): MovementInput => ({
  ...released,
  held: { x, y },
  following: true,
});

function setup(x = 304) {
  const world = createGameWorld();
  const map = parseTileMap(island);
  map.walkable.fill(true);
  // A vertical wall at x=384; the player's right edge contacts it at x=372.
  for (let row = 0; row < map.height; row++) map.walkable[row * map.width + 12] = false;
  const player = spawnPlayer(world, x, 272);
  const tick = (input: MovementInput, dt = 1 / 60): void => {
    playerControllerSystem(world, input, dt);
    movementSystem(world, dt);
    collisionSystem(world, map, dt);
    animationSystem(world, dt);
  };
  return { player, tick };
}

describe('controller → integration → collision → animation', () => {
  it('advances walking across ticks, then idles on release and preserves facing', () => {
    const { player, tick } = setup();
    tick(follow(200, 272));
    for (let i = 0; i < 15; i++) tick(follow(200, 272));
    expect(Animation.elapsed[player]).toBeCloseTo(0.25);
    expect(
      animationFrame(spriteSheets.player, {
        clip: Animation.clip[player],
        facing: Animation.facing[player],
        elapsed: Animation.elapsed[player],
      }),
    ).toBe(7);
    const x = Transform.x[player];
    tick(released);
    expect(Transform.x[player]).toBe(x);
    expect(Animation.clip[player]).toBe('idle');
    expect(Animation.facing[player]).toBe('left');
  });

  it('faces along a wall slide even when input points mostly into the wall', () => {
    const { player, tick } = setup(372);
    for (let i = 0; i < 20; i++) tick(follow(600, 340));
    expect(Transform.x[player]).toBe(372);
    expect(Transform.y[player]).toBeGreaterThan(272);
    expect(Animation.clip[player]).toBe('walk');
    expect(Animation.facing[player]).toBe('down');
    expect(Animation.elapsed[player]).toBeGreaterThan(0);
  });

  it('idles when fully blocked while the hold stays active, and walks when steering away', () => {
    const { player, tick } = setup();
    for (let i = 0; i < 60; i++) tick(follow(600, 272));
    expect(WalkIntent.mode[player]).toBe('follow');
    expect(Animation.clip[player]).toBe('idle');
    expect(Animation.facing[player]).toBe('right');
    tick(follow(200, 272));
    expect(Animation.clip[player]).toBe('walk');
    expect(Animation.facing[player]).toBe('left');
  });

  it.each([320, 600])('idles after a released tap to %s arrives or hits an obstacle', (x) => {
    const { player, tick } = setup();
    tick({ ...released, tap: { x, y: 272 } });
    expect(Animation.clip[player]).toBe('walk');
    for (let i = 0; i < 60; i++) tick(released);
    expect(WalkIntent.mode[player]).toBe('idle');
    expect(Animation.clip[player]).toBe('idle');
    expect(Animation.facing[player]).toBe('right');
    expect(Transform.x[player]).toBeCloseTo(Math.min(x, 372), 6);
  });

  it('idles in the follow dead zone without cancelling the hold', () => {
    const { player, tick } = setup();
    for (let i = 0; i < 60; i++) tick(follow(304, 320));
    expect(WalkIntent.mode[player]).toBe('follow');
    expect(Animation.clip[player]).toBe('idle');
    expect(Animation.facing[player]).toBe('down');
  });

  it('cancels a moving tap and immediately returns to idle', () => {
    const { player, tick } = setup();
    tick({ ...released, tap: { x: 304, y: 100 } });
    expect(Animation.clip[player]).toBe('walk');
    tick({ ...released, cancelled: true });
    expect(Animation.clip[player]).toBe('idle');
    expect(Animation.facing[player]).toBe('up');
  });
});
