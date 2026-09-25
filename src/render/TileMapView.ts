import { Assets, Container, Rectangle, Sprite, Texture } from 'pixi.js';
import type { TileMap } from '../game/world/tilemap';

/** Static map presentation; terrain tiles are not ECS entities or movable actors. */
export class TileMapView {
  readonly container = new Container();

  private constructor(
    private readonly map: TileMap,
    atlas: Texture,
  ) {
    atlas.source.scaleMode = 'nearest';
    const textures = Array.from(
      { length: map.tileset.tileCount },
      (_, id) =>
        new Texture({
          source: atlas.source,
          frame: new Rectangle(
            (id % map.tileset.columns) * map.tileWidth,
            Math.floor(id / map.tileset.columns) * map.tileHeight,
            map.tileWidth,
            map.tileHeight,
          ),
        }),
    );
    for (const layer of map.layers) {
      const container = new Container({ label: layer.name });
      for (const [cell, gid] of layer.tiles.entries()) {
        if (gid === 0) continue;
        const sprite = new Sprite(textures[gid - 1]);
        sprite.position.set(
          (cell % map.width) * map.tileWidth,
          Math.floor(cell / map.width) * map.tileHeight,
        );
        container.addChild(sprite);
      }
      this.container.addChild(container);
    }
  }

  static async load(map: TileMap, images: Readonly<Record<string, string>>): Promise<TileMapView> {
    const url = images[map.tileset.image];
    if (!url) throw new Error(`No bundled tileset image: ${map.tileset.image}`);
    const atlas = await Assets.load<Texture>(url);
    if (atlas.width !== map.tileset.imageWidth || atlas.height !== map.tileset.imageHeight) {
      throw new Error(`Tileset image ${map.tileset.image} dimensions do not match the map`);
    }
    return new TileMapView(map, atlas);
  }

  /** Fit the whole first island until the following camera lands in subtask 1.4. */
  fit(width: number, height: number): void {
    const scale = Math.min(1, width / this.map.bounds.width, height / this.map.bounds.height);
    this.container.scale.set(scale);
    this.container.position.set(
      (width - this.map.bounds.width * scale) / 2,
      (height - this.map.bounds.height * scale) / 2,
    );
  }

  toWorld(point: { x: number; y: number }): { x: number; y: number } | null {
    const position = this.container.toLocal(point);
    if (
      position.x < 0 ||
      position.y < 0 ||
      position.x >= this.map.bounds.width ||
      position.y >= this.map.bounds.height
    ) {
      return null;
    }
    return { x: position.x, y: position.y };
  }
}
