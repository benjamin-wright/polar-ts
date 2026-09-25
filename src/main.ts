import { Application } from 'pixi.js';
import islandUrl from '../assets/tilemaps/island.json?url';
import tilesUrl from '../assets/tilemaps/island-tiles.png?url';
import { GameLoop, InputSystem } from './core';
import { loadJson } from './core/AssetLoader';
import { movementSystem } from './ecs/systems/movement';
import { createGameWorld } from './ecs/world';
import { playerControllerSystem } from './game/player/playerController';
import { spawnPlayer } from './game/player/spawn';
import { parseTileMap } from './game/world/tilemap';
import { RenderSync } from './render/RenderSync';
import { TileMapView } from './render/TileMapView';
import { buildSpriteTextures } from './render/sprites';

async function main(): Promise<void> {
  const map = parseTileMap(await loadJson(islandUrl));
  const tileMap = await TileMapView.load(map, { 'island-tiles.png': tilesUrl });
  const app = new Application();
  await app.init({
    background: '#23485c',
    resizeTo: window,
    // Crisp sprites on high-density phone screens.
    resolution: Math.min(window.devicePixelRatio || 1, 2),
    autoDensity: true,
    antialias: true,
    // We drive render() ourselves each tick so nested sprites are always
    // rendered with up-to-date transforms (deterministic across browsers).
    autoStart: false,
  });
  document.getElementById('app')?.appendChild(app.canvas);

  buildSpriteTextures(app.renderer);

  const world = createGameWorld();
  const input = new InputSystem(app.canvas, (point) => tileMap.toWorld(point) !== null);
  const renderSync = new RenderSync(world);
  tileMap.container.addChild(renderSync.container);
  app.stage.addChild(tileMap.container);
  const fitMap = (): void => tileMap.fit(app.screen.width, app.screen.height);
  app.renderer.on('resize', fitMap);
  fitMap();

  spawnPlayer(world, map.spawn.x, map.spawn.y);
  renderSync.sync();

  const loop = new GameLoop();
  app.ticker.add((ticker) => {
    loop.advance(ticker.deltaMS / 1000, (step) => {
      const held = input.heldPoint();
      playerControllerSystem(world, held ? tileMap.toWorld(held) : null, step);
      movementSystem(world, step);
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
