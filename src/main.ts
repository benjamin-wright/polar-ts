import { Application, Container } from 'pixi.js';
import islandUrl from '../assets/tilemaps/island.json?url';
import tilesUrl from '../assets/tilemaps/island-tiles.png?url';
import movementConfig from '../assets/data/player-movement.json';
import cameraConfig from '../assets/data/camera.json';
import { GameLoop, InputSystem } from './core';
import { loadJson } from './core/AssetLoader';
import { movementSystem } from './ecs/systems/movement';
import { createGameWorld } from './ecs/world';
import { playerControllerSystem } from './game/player/playerController';
import { spawnPlayer } from './game/player/spawn';
import { isFootprintClear } from './game/world/collision';
import { collisionSystem } from './game/world/collisionSystem';
import { parseTileMap } from './game/world/tilemap';
import { FollowCamera } from './render/FollowCamera';
import { cameraSyncSystem } from './render/cameraSync';
import { RenderSync } from './render/RenderSync';
import { TileMapView } from './render/TileMapView';
import { buildSpriteTextures } from './render/sprites';

async function main(): Promise<void> {
  const map = parseTileMap(await loadJson(islandUrl));
  if (!isFootprintClear(map, map.spawn, movementConfig.footprint)) {
    throw new Error('Player spawn does not have room for the collision footprint');
  }
  const tileMap = await TileMapView.load(map, { 'island-tiles.png': tilesUrl });
  const app = new Application();
  await app.init({
    background: '#23485c',
    resizeTo: window,
    // Crisp sprites on high-density phone screens.
    resolution: Math.min(window.devicePixelRatio || 1, 2),
    autoDensity: true,
    // Multisampling exposes seams between adjoining tiles as the camera pans.
    antialias: false,
    // We drive render() ourselves each tick so nested sprites are always
    // rendered with up-to-date transforms (deterministic across browsers).
    autoStart: false,
  });
  document.getElementById('app')?.appendChild(app.canvas);

  buildSpriteTextures(app.renderer);

  const world = createGameWorld();
  const camera = new FollowCamera(map.bounds, cameraConfig.zoom);
  const input = new InputSystem(
    app.canvas,
    (point) => camera.toWorld(point) !== null,
    movementConfig.tap,
  );
  const renderSync = new RenderSync(world);
  // Terrain and entities share one transform; future screen overlays stay on stage.
  const worldView = new Container({ label: 'world' });
  worldView.addChild(tileMap.container, renderSync.container);
  app.stage.addChild(worldView);
  const player = spawnPlayer(world, map.spawn.x, map.spawn.y);
  const resizeCamera = (): void => {
    input.cancelHold();
    camera.resize(app.screen.width, app.screen.height);
    cameraSyncSystem(player, camera, worldView);
  };
  app.renderer.on('resize', resizeCamera);
  resizeCamera();
  renderSync.sync();

  const loop = new GameLoop();
  app.ticker.add((ticker) => {
    loop.advance(ticker.deltaMS / 1000, (step) => {
      const { held, following, tap, cancelled } = input.consumeMovement();
      playerControllerSystem(
        world,
        {
          held: held ? camera.toWorld(held) : null,
          following,
          tap: tap ? camera.toWorld(tap) : null,
          cancelled,
        },
        step,
      );
      movementSystem(world, step);
      collisionSystem(world, map, step);
      // Update every fixed step, including catch-up ticks within a single frame.
      cameraSyncSystem(player, camera, worldView);
    });
    renderSync.sync();
    app.render();
  });
  app.ticker.start();
}

void main().catch((error: unknown) => {
  console.error(error);
  const message = document.createElement('p');
  message.setAttribute('role', 'alert');
  message.style.cssText = 'color: white; padding: 1rem; font-family: sans-serif';
  message.textContent = `Could not load the island. ${error instanceof Error ? error.message : 'Please reload to try again.'}`;
  document.getElementById('app')?.replaceChildren(message);
});
