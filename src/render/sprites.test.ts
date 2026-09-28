import { removeEntity } from 'bitecs';
import { Sprite as PixiSprite, Texture, TextureSource } from 'pixi.js';
import { describe, expect, it } from 'vitest';
import sheetDataUrl from '../../assets/sprites/polar-bear-cub.png?inline';
import studyDataUrl from '../../assets/sprites/polar-bear-cub-walk-right.png?inline';
import type { SpriteSheetDefinition } from '../core/animation';
import { spriteSheets } from '../core/spriteSheets';
import { Animation } from '../ecs/components';
import { createGameWorld } from '../ecs/world';
import { spawnPlayer } from '../game/player/spawn';
import { RenderSync } from './RenderSync';
import { SpriteSheet } from './sprites';

const definition = spriteSheets.player;
function atlas(definition: SpriteSheetDefinition = spriteSheets.player) {
  return new Texture({
    source: new TextureSource({
      width: definition.frameWidth * definition.columns,
      height: definition.frameHeight * definition.rows,
    }),
  });
}

describe('sprite sheet rendering', () => {
  it.each([
    ['player', sheetDataUrl],
    ['walk-study', studyDataUrl],
  ])('ships %s as a transparent PNG matching its atlas and frame metadata', (id, dataUrl) => {
    const definition = spriteSheets[id];
    const png = Uint8Array.from(atob(dataUrl.split(',')[1]), (char) => char.charCodeAt(0));
    const header = new DataView(png.buffer);
    expect([...png.subarray(1, 4)]).toEqual([80, 78, 71]); // PNG signature.
    expect(header.getUint32(16)).toBe(definition.frameWidth * definition.columns);
    expect(header.getUint32(20)).toBe(definition.frameHeight * definition.rows);
    expect(png[25]).toBe(6); // RGBA, rather than a painted checkerboard background.
    for (const row of Object.values(definition.facings)) {
      expect(row).toBeGreaterThanOrEqual(0);
      expect(row).toBeLessThan(definition.rows);
    }
    for (const animation of Object.values(definition.animations)) {
      expect(animation.fps).toBeGreaterThan(0);
      for (const offset of animation.frames) {
        expect(offset).toBeGreaterThanOrEqual(0);
        for (const row of Object.values(definition.facings)) {
          expect(row * definition.columns + offset).toBeLessThan(
            definition.rows * definition.columns,
          );
        }
      }
    }
  });

  it('uses the correct direction and frame from one shared nearest-filtered atlas', () => {
    const texture = atlas();
    const sheet = new SpriteSheet(definition, texture);
    const frame = sheet.texture({ clip: 'walk', facing: 'up', elapsed: 0.25 });
    expect(frame.source).toBe(texture.source);
    expect(frame.source.scaleMode).toBe('nearest');
    expect(frame.frame.x).toBe(3 * definition.frameWidth);
    expect(frame.frame.y).toBe(3 * definition.frameHeight);
    texture.destroy(true);
  });

  it('rejects a mismatched image instead of silently selecting the wrong regions', () => {
    expect(() => new SpriteSheet(definition, Texture.WHITE)).toThrow('dimensions do not match');
  });

  it('plays all eight study textures across the row boundary with stable registration', () => {
    const study = spriteSheets['walk-study'];
    const texture = atlas(study);
    const sheet = new SpriteSheet(study, texture);
    const frames = Array.from({ length: 8 }, (_, index) =>
      sheet.texture({ clip: 'walk', facing: 'right', elapsed: index / 16 }),
    );
    expect(new Set(frames).size).toBe(8);
    expect(frames[3].frame.x).toBe(1330.5);
    expect(frames[3].frame.y).toBe(0);
    expect(frames[4].frame.x).toBe(0);
    expect(frames[4].frame.y).toBe(429.5);
    for (const frame of frames) {
      expect(frame.source).toBe(texture.source);
      expect(frame.frame.width).toBe(443.5);
      expect(frame.frame.height).toBe(443.5);
      expect(frame.frame.right).toBeLessThanOrEqual(texture.width);
      expect(frame.frame.bottom).toBeLessThanOrEqual(texture.height);
    }
    expect(sheet.texture({ clip: 'walk', facing: 'right', elapsed: 0.5 })).toBe(frames[0]);
    texture.destroy(true);
  });

  it('rejects registration offsets that sample outside the image', () => {
    const texture = atlas();
    expect(
      () =>
        new SpriteSheet(
          {
            ...definition,
            frameOffsets: { '0': { x: -1, y: 0 } },
          },
          texture,
        ),
    ).toThrow('out of bounds');
    texture.destroy(true);
  });

  it('keeps the ground anchor fixed when animation frames change and removes deleted sprites', () => {
    const texture = atlas();
    const world = createGameWorld();
    const sync = new RenderSync(world, { player: new SpriteSheet(definition, texture) });
    const player = spawnPlayer(world, 304, 272);
    sync.sync();
    const sprite = sync.container.children[0] as PixiSprite;
    const initial = sprite.texture;
    expect(sprite.x).toBe(304);
    expect(sprite.y).toBe(272);
    expect(sprite.anchor.x).toBe(definition.anchor.x);
    expect(sprite.anchor.y).toBe(definition.anchor.y);
    expect(sprite.width).toBe(definition.displayWidth);
    expect(sprite.height).toBe(definition.displayHeight);
    Animation.clip[player] = 'walk';
    Animation.facing[player] = 'left';
    Animation.elapsed[player] = 0.25;
    sync.sync();
    expect(sprite.texture).not.toBe(initial);
    expect(sprite.x).toBe(304);
    expect(sprite.y).toBe(272);
    expect(sprite.anchor.y).toBe(definition.anchor.y);
    // Rendering never advances or resets simulation-owned playback time.
    sync.sync();
    expect(Animation.elapsed[player]).toBe(0.25);
    removeEntity(world, player);
    expect(sync.container.children).toHaveLength(0);
    sync.container.destroy();
    texture.destroy(true);
  });
});
