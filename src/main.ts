import { Application } from 'pixi.js';
import { GameLoop, InputSystem } from './core';
import { movementSystem } from './ecs/systems/movement';
import { createGameWorld } from './ecs/world';
import { playerControllerSystem } from './game/player/playerController';
import { spawnPlayer } from './game/player/spawn';
import { RenderSync } from './render/RenderSync';
import { buildSpriteTextures } from './render/sprites';

async function main(): Promise<void> {
  const app = new Application();
  await app.init({
    background: '#101827',
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
  const input = new InputSystem(app.canvas);
  const renderSync = new RenderSync(world);
  app.stage.addChild(renderSync.container);

  spawnPlayer(world, app.screen.width / 2, app.screen.height / 2);
  renderSync.sync();

  const loop = new GameLoop();
  app.ticker.add((ticker) => {
    loop.advance(ticker.deltaMS / 1000, (step) => {
      playerControllerSystem(world, input.consumeTap());
      movementSystem(world, step);
    });
    renderSync.sync();
    input.endFrame();
    app.render();
  });
  app.ticker.start();
}

void main();
