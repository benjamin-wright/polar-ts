import { Container, Graphics, Texture } from 'pixi.js';
import type { Renderer } from 'pixi.js';

/**
 * Placeholder textures until real sprite sheets land in phase 1 (Tiled map,
 * idle/walk animations). They are generated procedurally with the renderer
 * rather than loaded from SVG data-URIs: iOS Safari's SVG→texture decode is
 * unreliable and can silently yield a blank texture, which is exactly the
 * "no sprite on iPhone" symptom phase 0 must avoid. Swapping in sheet-based
 * textures later touches only this file.
 */
const cache = new Map<string, Texture>();

function drawPlayer(): Graphics {
  return new Graphics()
    .roundRect(1, 1, 30, 30, 4)
    .fill(0x38bdf8) // ice-blue body
    .stroke({ width: 2, color: 0xe0f2fe }); // light outline
}

const SPRITE_BUILDERS: Record<string, () => Container> = {
  player: drawPlayer,
};

/** Generates (once) the texture for every Sprite kind. */
export function buildSpriteTextures(renderer: Renderer): void {
  for (const [kind, build] of Object.entries(SPRITE_BUILDERS)) {
    cache.set(kind, renderer.generateTexture(build()));
  }
}

/** Synchronous lookup — call after `buildSpriteTextures()` ran. */
export function spriteTexture(kind: string): Texture {
  return cache.get(kind) ?? Texture.WHITE;
}
