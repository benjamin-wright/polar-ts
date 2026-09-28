import { Assets, Rectangle, Texture } from 'pixi.js';
import type { Sprite } from 'pixi.js';
import { animationFrame } from '../core/animation';
import type { AnimationState, SpriteSheetDefinition } from '../core/animation';

/** Pixi textures share one PNG source; playback remains in the simulation. */
export class SpriteSheet {
  private readonly frames: Texture[];

  constructor(
    readonly definition: SpriteSheetDefinition,
    atlas: Texture,
  ) {
    const { frameWidth, frameHeight, columns, rows } = definition;
    if (atlas.width !== frameWidth * columns || atlas.height !== frameHeight * rows) {
      throw new Error(`Sprite sheet ${definition.image} dimensions do not match its metadata`);
    }
    atlas.source.scaleMode = 'nearest';
    this.frames = Array.from({ length: columns * rows }, (_, index) => {
      const offset = definition.frameOffsets?.[index];
      const frame = new Rectangle(
        (index % columns) * frameWidth + (offset?.x ?? 0),
        Math.floor(index / columns) * frameHeight + (offset?.y ?? 0),
        frameWidth,
        frameHeight,
      );
      if (frame.x < 0 || frame.y < 0 || frame.right > atlas.width || frame.bottom > atlas.height) {
        throw new Error(`Sprite sheet ${definition.image} frame ${index} is out of bounds`);
      }
      return new Texture({
        source: atlas.source,
        frame,
      });
    });
  }

  texture(state: AnimationState): Texture {
    return this.frames[animationFrame(this.definition, state)];
  }

  static async load(definition: SpriteSheetDefinition, url: string): Promise<SpriteSheet> {
    return new SpriteSheet(definition, await Assets.load<Texture>(url));
  }
}

/** Identical frame geometry for game entities and preview sprites. */
export function applySpriteFrame(sprite: Sprite, sheet: SpriteSheet, state: AnimationState): void {
  sprite.texture = sheet.texture(state);
  const { anchor, displayWidth, displayHeight } = sheet.definition;
  sprite.anchor.set(anchor.x, anchor.y);
  sprite.width = displayWidth;
  sprite.height = displayHeight;
}
