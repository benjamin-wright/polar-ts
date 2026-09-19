import { createWorld } from 'bitecs';

export type World = ReturnType<typeof createGameWorld>;

/**
 * The single ECS world. Renderer-agnostic: components here never reference
 * Pixi objects — render/ adapters mirror this state onto the stage.
 */
export function createGameWorld() {
  return createWorld();
}
