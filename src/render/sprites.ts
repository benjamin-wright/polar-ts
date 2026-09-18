import { Assets, Texture } from 'pixi.js';

/**
 * Placeholder textures until real sprite sheets land in phase 1 (Tiled map,
 * idle/walk animations). Kept as a tiny data-driven registry so swapping in
 * sheet-based textures later touches only this file.
 */
const SPRITE_SOURCES: Record<string, string> = {
  // 32x32 ice-blue square with a lighter outline.
  player:
    'data:image/svg+xml,' +
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32">` +
        `<rect x="1" y="1" width="30" height="30" rx="4" fill="#38bdf8" stroke="#e0f2fe" stroke-width="2"/>` +
        `</svg>`,
    ),
};

const cache = new Map<string, Texture>();

/** Loads (once) the texture for a Sprite kind. */
export async function loadSpriteTextures(): Promise<void> {
  await Promise.all(
    Object.entries(SPRITE_SOURCES).map(async ([kind, src]) => {
      cache.set(kind, await Assets.load<Texture>(src));
    }),
  );
}

/** Synchronous lookup — call after `loadSpriteTextures()` resolved. */
export function spriteTexture(kind: string): Texture {
  // Texture.WHITE makes a missing texture obvious without crashing.
  return cache.get(kind) ?? Texture.WHITE;
}
