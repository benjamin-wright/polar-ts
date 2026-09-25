import type { Container } from 'pixi.js';
import { Transform } from '../ecs/components';
import type { FollowCamera } from './FollowCamera';

/** Follow resolved ECS movement after collision, before the next input sample. */
export function cameraSyncSystem(player: number, camera: FollowCamera, worldView: Container): void {
  camera.follow({ x: Transform.x[player], y: Transform.y[player] });
  const { x, y, scale } = camera.transform;
  worldView.position.set(x, y);
  worldView.scale.set(scale);
}
