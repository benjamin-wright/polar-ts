import { Container } from 'pixi.js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import island from '../../assets/tilemaps/island.json';
import { GameLoop } from '../core/GameLoop';
import { InputSystem } from '../core/InputSystem';
import { Transform, Velocity, WalkIntent } from '../ecs/components';
import { movementSystem } from '../ecs/systems/movement';
import { createGameWorld } from '../ecs/world';
import { playerControllerSystem } from '../game/player/playerController';
import { spawnPlayer } from '../game/player/spawn';
import { collisionSystem } from '../game/world/collisionSystem';
import { parseTileMap } from '../game/world/tilemap';
import { FollowCamera } from './FollowCamera';
import { cameraSyncSystem } from './cameraSync';

const cleanup: (() => void)[] = [];
afterEach(() => {
  for (const dispose of cleanup.splice(0)) dispose();
  vi.restoreAllMocks();
});

function setup(x = 160) {
  const world = createGameWorld();
  const map = parseTileMap(island);
  map.walkable.fill(true);
  const player = spawnPlayer(world, x, 256);
  const camera = new FollowCamera(map.bounds, 2);
  camera.resize(320, 240);
  const worldView = new Container();
  cameraSyncSystem(player, camera, worldView);
  const rect = { left: 100, top: 50, width: 320, height: 240 };
  const view = new EventTarget();
  const captures = new Set<number>();
  const surface = Object.assign(new EventTarget(), {
    ownerDocument: Object.assign(new EventTarget(), { defaultView: view, hidden: false }),
    getBoundingClientRect: () => rect,
    setPointerCapture: (id: number) => captures.add(id),
    hasPointerCapture: (id: number) => captures.has(id),
    releasePointerCapture: (id: number) => captures.delete(id),
  });
  const input = new InputSystem(
    surface as unknown as HTMLElement,
    (point) => camera.toWorld(point) !== null,
  );
  const now = vi.spyOn(performance, 'now').mockReturnValue(0);
  cleanup.push(() => {
    input.destroy();
    worldView.destroy({ children: true });
  });
  const pointer = (type: string, point: { x: number; y: number }): void => {
    surface.dispatchEvent(
      Object.assign(new Event(type), {
        pointerId: 1,
        isPrimary: true,
        button: 0,
        buttons: type === 'pointerup' ? 0 : 1,
        clientX: rect.left + point.x,
        clientY: rect.top + point.y,
      }),
    );
  };
  const tick = (dt = 1 / 60): void => {
    const event = input.consumeMovement();
    playerControllerSystem(
      world,
      {
        ...event,
        held: event.held ? camera.toWorld(event.held) : null,
        tap: event.tap ? camera.toWorld(event.tap) : null,
      },
      dt,
    );
    movementSystem(world, dt);
    collisionSystem(world, map, dt);
    cameraSyncSystem(player, camera, worldView);
  };
  return { map, player, camera, worldView, rect, view, input, now, pointer, tick };
}

describe('input → movement → collision → camera', () => {
  it('keeps following a stationary held screen point through multiple catch-up steps', () => {
    const { player, camera, worldView, input, now, pointer, tick } = setup();
    const held = { x: 240, y: 120 };
    const initialAim = camera.toWorld(held);
    pointer('pointerdown', held);
    now.mockReturnValue(300);
    const loop = new GameLoop();
    for (let i = 0; i < 4; i++) loop.advance(0.25, tick);
    expect(Transform.x[player]).toBeCloseTo(360, 8); // Beyond the initial 200px aim.
    expect(Transform.y[player]).toBe(256);
    expect(initialAim).toEqual({ x: 200, y: 256 });
    expect(camera.toWorld(held)?.x).toBeCloseTo(400, 8);
    expect(input.heldPoint()).toEqual(held); // No pointermove event was sent.
    expect(worldView.x).toBeCloseTo(-560, 8);
    expect(worldView.toGlobal({ x: Transform.x[player], y: Transform.y[player] })).toMatchObject({
      x: 160,
      y: 120,
    });
  });

  it('stops within the follow dead zone once the camera clamps and the aim is reached', () => {
    const { player, camera, input, now, pointer, tick } = setup(540);
    const held = { x: 280, y: 120 };
    pointer('pointerdown', held);
    now.mockReturnValue(300);
    for (let i = 0; i < 120; i++) tick();
    expect(camera.transform.x).toBe(-960);
    expect(camera.toWorld(held)).toEqual({ x: 620, y: 256 });
    expect(Transform.x[player]).toBeGreaterThanOrEqual(614);
    expect(Transform.x[player]).toBeLessThanOrEqual(620);
    expect(Velocity.x[player]).toBe(0);
    expect(input.heldPoint()).toEqual(held);
    const stopped = Transform.x[player];
    tick();
    expect(Transform.x[player]).toBe(stopped);
  });

  it('keeps a released tap fixed in world space as the camera pans', () => {
    const { player, camera, pointer, tick } = setup();
    const point = { x: 260, y: 120 };
    pointer('pointerdown', point);
    pointer('pointerup', point);
    for (let i = 0; i < 60; i++) tick();
    expect(Transform.x[player]).toBeCloseTo(210, 8);
    expect(WalkIntent.x[player]).toBe(210);
    expect(WalkIntent.mode[player]).toBe('idle');
    expect(camera.toWorld(point)?.x).toBeCloseTo(260, 8); // New screen aim differs from saved tap.
    expect(camera.toScreen({ x: 210, y: 256 })).toEqual({ x: 160, y: 120 });
  });

  it('follows the collision-resolved position rather than the rejected movement', () => {
    const { map, player, camera, pointer, tick } = setup();
    map.walkable[8 * map.width + 7] = false;
    const point = { x: 280, y: 120 };
    pointer('pointerdown', point);
    pointer('pointerup', point);
    tick(1);
    expect(Transform.x[player]).toBeCloseTo(212, 6);
    expect(camera.toScreen({ x: Transform.x[player], y: Transform.y[player] })).toEqual({
      x: 160,
      y: 120,
    });
  });

  it('applies the camera to terrain and entities together without moving screen overlays', () => {
    const { player, camera, worldView } = setup();
    const stage = new Container();
    const terrain = new Container();
    const entities = new Container();
    const overlay = new Container();
    terrain.position.set(200, 256);
    entities.position.set(200, 256);
    overlay.position.set(20, 30);
    worldView.addChild(terrain, entities);
    stage.addChild(worldView, overlay);
    Transform.x[player] = 200;
    cameraSyncSystem(player, camera, worldView);
    expect(terrain.toGlobal({ x: 0, y: 0 })).toMatchObject({ x: 160, y: 120 });
    expect(entities.toGlobal({ x: 0, y: 0 })).toMatchObject({ x: 160, y: 120 });
    expect(overlay.toGlobal({ x: 0, y: 0 })).toMatchObject({ x: 20, y: 30 });
    overlay.destroy();
    stage.removeChild(worldView);
    stage.destroy();
  });

  it('cancels on resize and converts a new press using the new canvas offset and camera', () => {
    const { player, camera, worldView, rect, view, now, pointer, tick } = setup();
    pointer('pointerdown', { x: 240, y: 120 });
    now.mockReturnValue(300);
    tick();
    Object.assign(rect, { left: 40, top: 90, width: 240, height: 320 });
    view.dispatchEvent(new Event('resize'));
    camera.resize(240, 320);
    cameraSyncSystem(player, camera, worldView);
    const x = Transform.x[player];
    tick();
    expect(Transform.x[player]).toBe(x);
    pointer('pointerdown', { x: 180, y: 160 });
    now.mockReturnValue(600);
    tick();
    expect(Transform.x[player]).toBeGreaterThan(x);
    expect(Transform.y[player]).toBe(256);
  });
});
