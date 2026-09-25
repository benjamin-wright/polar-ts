import { describe, expect, it } from 'vitest';
import island from '../../../assets/tilemaps/island.json';
import { parseTileMap } from './tilemap';

function fixture() {
  return structuredClone(island);
}

describe('parseTileMap', () => {
  it('loads the real island, preserves draw order, and combines terrain and obstacle passability', () => {
    const map = parseTileMap(island);
    expect(map.bounds).toEqual({ x: 0, y: 0, width: 640, height: 512 });
    expect([map.tileWidth, map.tileHeight]).toEqual([32, 32]);
    expect(map.layers.map((layer) => layer.name)).toEqual(['terrain', 'obstacles']);
    expect(map.tileset).toEqual({
      image: 'island-tiles.png',
      imageWidth: 128,
      imageHeight: 32,
      columns: 4,
      tileCount: 4,
    });
    expect(map.spawn).toEqual({ x: 304, y: 272 });
    expect(map.walkable).toHaveLength(320);
    expect(map.walkable[0]).toBe(false); // water
    expect(map.walkable[2 * 20 + 7]).toBe(true); // coastal ice
    expect(map.walkable[8 * 20 + 9]).toBe(true); // snow at spawn
    expect(map.walkable[5 * 20 + 7]).toBe(false); // rock over snow
  });

  it('preserves a continuous spawn position rather than snapping it to a tile', () => {
    const data = fixture();
    const point = data.layers[2].objects?.[0];
    if (!point) throw new Error('Fixture is missing its spawn');
    point.x = 300.25;
    point.y = 270.5;
    expect(parseTileMap(data).spawn).toEqual({ x: 300.25, y: 270.5 });
  });

  it.each([0, -1, 2.5, NaN, 257, '20'])('rejects invalid map width %s', (width) => {
    expect(() => parseTileMap({ ...fixture(), width })).toThrow(/width must be an integer/);
  });

  it.each([null, [], 'map'])('rejects a non-object map %s', (value) => {
    expect(() => parseTileMap(value)).toThrow(/map must be an object/);
  });

  it.each([
    { orientation: 'isometric' },
    { infinite: true },
    { tilewidth: 0 },
    { renderorder: 'left-up' },
    { tilesets: [] },
  ])('rejects unsupported map configuration %j', (change) => {
    expect(() => parseTileMap({ ...fixture(), ...change })).toThrow(/Invalid tile map/);
  });

  it.each([0, -1, 5, 1.5, 0x80000001])('rejects invalid or flipped terrain GID %s', (gid) => {
    const data = fixture();
    data.layers[0].data = [gid, ...(data.layers[0].data ?? []).slice(1)];
    expect(() => parseTileMap(data)).toThrow(/terrain.data\[0\]/);
  });

  it('rejects mismatched layer sizes and truncated tile data', () => {
    const dimensions = fixture();
    dimensions.layers[0].width = 19;
    expect(() => parseTileMap(dimensions)).toThrow(/terrain dimensions/);
    const truncated = fixture();
    truncated.layers[1].data?.pop();
    expect(() => parseTileMap(truncated)).toThrow(/obstacles.data length/);
  });

  it('rejects reordered, invisible, offset, or encoded tile layers', () => {
    const data = fixture();
    [data.layers[0], data.layers[1]] = [data.layers[1], data.layers[0]];
    expect(() => parseTileMap(data)).toThrow(/layers\[0\].name/);
    for (const change of [
      { visible: false },
      { offsetx: 4 },
      { encoding: 'base64' },
      { type: 'group' },
    ]) {
      const changed = fixture();
      Object.assign(changed.layers[0], change);
      expect(() => parseTileMap(changed)).toThrow(/Invalid tile map/);
    }
  });

  it('rejects external tilesets, invalid atlas geometry, and missing passability', () => {
    for (const change of [
      { source: 'island.tsj' },
      { firstgid: 2 },
      { tilewidth: 16 },
      { imagewidth: 64 },
      { imageheight: 64 },
      { spacing: 1 },
      { image: '../outside.png' },
      { tiles: [] },
    ]) {
      const data = fixture();
      Object.assign(data.tilesets[0], change);
      expect(() => parseTileMap(data)).toThrow(/Invalid tile map/);
    }
  });

  it('rejects duplicate tile IDs and non-boolean walkable properties', () => {
    const duplicate = fixture();
    duplicate.tilesets[0].tiles[1].id = 0;
    expect(() => parseTileMap(duplicate)).toThrow(/id must be unique/);
    const wrongProperty = fixture();
    wrongProperty.tilesets[0].tiles[0].properties[0].type = 'string';
    expect(() => parseTileMap(wrongProperty)).toThrow(/walkable must be one boolean/);
  });

  it.each([
    { x: -1, y: 272 },
    { x: 640, y: 272 },
    { x: 304, y: 512 },
    { x: Infinity, y: 272 },
    { x: 16, y: 16 },
    { x: 240, y: 176 },
  ])('rejects spawn outside walkable ground: %j', (point) => {
    const data = fixture();
    Object.assign(data.layers[2].objects?.[0] ?? {}, point);
    expect(() => parseTileMap(data)).toThrow(/spawn/);
  });

  it('requires exactly one named point spawn', () => {
    for (const objects of [
      [],
      [{ name: 'player-spawn', point: false }],
      [{ name: 'other', point: true }],
      [{}, {}],
    ]) {
      const data = fixture();
      Object.assign(data.layers[2], { objects });
      expect(() => parseTileMap(data)).toThrow(/spawn/);
    }
  });
});
