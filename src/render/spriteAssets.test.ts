import { Texture, TextureSource } from 'pixi.js';
import { expect, it, vi } from 'vitest';
import { spriteSheets } from '../core/spriteSheets';
import { loadSpriteSheet } from './spriteAssets';
import { SpriteSheet } from './sprites';

it('retries a failed load, then reuses frame textures across sheet selections', async () => {
  const definition = spriteSheets.player;
  const texture = new Texture({
    source: new TextureSource({
      width: definition.frameWidth * definition.columns,
      height: definition.frameHeight * definition.rows,
    }),
  });
  const sheet = new SpriteSheet(definition, texture);
  const load = vi
    .spyOn(SpriteSheet, 'load')
    .mockRejectedValueOnce(new Error('Temporary load failure'))
    .mockResolvedValue(sheet);
  try {
    await expect(loadSpriteSheet('player')).rejects.toThrow('Temporary load failure');
    const [first, second] = await Promise.all([
      loadSpriteSheet('player'),
      loadSpriteSheet('player'),
    ]);
    expect(first).toBe(sheet);
    expect(second).toBe(first);
    expect(await loadSpriteSheet('player')).toBe(first);
    expect(load).toHaveBeenCalledTimes(2);
  } finally {
    load.mockRestore();
    texture.destroy(true);
  }
});
