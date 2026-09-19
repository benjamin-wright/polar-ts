import { observe, onAdd, onRemove, query } from 'bitecs';
import { Container, Sprite as PixiSprite } from 'pixi.js';
import { Sprite, Transform } from '../ecs/components';
import type { World } from '../ecs/world';
import { spriteTexture } from './sprites';

/**
 * Mirrors ECS Sprite/Transform state onto the Pixi stage. The only place
 * game entities become display objects — game logic never imports Pixi.
 */
export class RenderSync {
  private readonly stage = new Container();
  private readonly sprites = new Map<number, PixiSprite>();

  constructor(private readonly world: World) {
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
    }
  }

  private attach(eid: number): void {
    const kind = Sprite.kind[eid] ?? 'player';
    const sprite = new PixiSprite(spriteTexture(kind));
    sprite.anchor.set(0.5);
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
