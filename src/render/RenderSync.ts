import { hasComponent, observe, onAdd, onRemove, query } from 'bitecs';
import { Container, Sprite as PixiSprite } from 'pixi.js';
import { Animation, Sprite, Transform } from '../ecs/components';
import type { World } from '../ecs/world';
import type { SpriteSheet } from './sprites';
import { applySpriteFrame } from './sprites';

/**
 * Mirrors ECS Sprite/Transform state onto the Pixi stage. The only place
 * game entities become display objects — game logic never imports Pixi.
 */
export class RenderSync {
  private readonly stage = new Container();
  private readonly sprites = new Map<number, PixiSprite>();

  constructor(
    private readonly world: World,
    private readonly sheets: Readonly<Record<string, SpriteSheet>>,
  ) {
    observe(world, onAdd(Sprite), (eid) => this.attach(eid));
    observe(world, onRemove(Sprite), (eid) => this.detach(eid));
  }

  get container(): Container {
    return this.stage;
  }

  /** Copies ECS transforms to display objects. Call once per frame. */
  sync(): void {
    for (const eid of query(this.world, [Sprite, Transform])) {
      const sprite = this.sprites.get(eid);
      if (!sprite) continue;
      // ?? guards against bitecs's uninitialized (undefined) store slots, which
      // would otherwise become NaN on the sprite and collapse it to zero size.
      sprite.position.set(Transform.x[eid] ?? 0, Transform.y[eid] ?? 0);
      sprite.rotation = Transform.rotation[eid] ?? 0;
      sprite.zIndex = Sprite.zIndex[eid] ?? 0;
      const sheet = this.sheets[Sprite.kind[eid]];
      if (sheet) {
        applySpriteFrame(
          sprite,
          sheet,
          hasComponent(this.world, eid, Animation)
            ? {
                clip: Animation.clip[eid],
                facing: Animation.facing[eid],
                elapsed: Animation.elapsed[eid],
              }
            : { clip: 'idle', facing: 'down', elapsed: 0 },
        );
      }
    }
  }

  private attach(eid: number): void {
    // onAdd fires before spawn has initialized component fields. Apply the
    // correct sheet in sync(), once the entity is fully initialized.
    const sprite = new PixiSprite();
    this.sprites.set(eid, sprite);
    this.stage.addChild(sprite);
  }

  private detach(eid: number): void {
    const sprite = this.sprites.get(eid);
    if (sprite) {
      this.stage.removeChild(sprite);
      sprite.destroy();
      this.sprites.delete(eid);
    }
  }
}
