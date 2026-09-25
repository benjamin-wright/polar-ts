import { query } from 'bitecs';
import { advanceAnimation } from '../../core/animation';
import { spriteSheets } from '../../core/spriteSheets';
import { Animation, Sprite, Velocity } from '../components';
import type { World } from '../world';

/** Run after collision so blocked motion idles and sliding uses its real facing. */
export function animationSystem(world: World, dt: number): void {
  for (const eid of query(world, [Animation, Sprite, Velocity])) {
    const definition = spriteSheets[Sprite.kind[eid]];
    if (!definition) continue;
    const state = advanceAnimation(
      { clip: Animation.clip[eid], facing: Animation.facing[eid], elapsed: Animation.elapsed[eid] },
      { x: Velocity.x[eid], y: Velocity.y[eid] },
      dt,
      definition,
    );
    Animation.clip[eid] = state.clip;
    Animation.facing[eid] = state.facing;
    Animation.elapsed[eid] = state.elapsed;
  }
}
