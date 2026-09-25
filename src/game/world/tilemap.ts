/** The deliberately small, renderer-independent subset of Tiled used by Phase 1. */
export interface TileMap {
  width: number;
  height: number;
  tileWidth: number;
  tileHeight: number;
  bounds: { x: number; y: number; width: number; height: number };
  tileset: {
    image: string;
    imageWidth: number;
    imageHeight: number;
    columns: number;
    tileCount: number;
  };
  layers: { name: string; tiles: number[] }[];
  /** Row-major passability, combining terrain and obstacles. */
  walkable: boolean[];
  /** World pixels, independent of tile centres. */
  spawn: { x: number; y: number };
}

type JsonObject = Record<string, unknown>;

function check(condition: boolean, path: string, message: string): asserts condition {
  if (!condition) throw new Error(`Invalid tile map: ${path} ${message}`);
}

function object(value: unknown, path: string): JsonObject {
  check(
    typeof value === 'object' && value !== null && !Array.isArray(value),
    path,
    'must be an object',
  );
  return value as JsonObject;
}

function array(value: unknown, path: string): unknown[] {
  check(Array.isArray(value), path, 'must be an array');
  return value;
}

function integer(value: unknown, path: string, min: number, max: number): number {
  check(
    typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max,
    path,
    `must be an integer from ${min} to ${max}`,
  );
  return value;
}

function coordinate(value: unknown, path: string, max: number): number {
  check(
    typeof value === 'number' && Number.isFinite(value) && value >= 0 && value < max,
    path,
    `must be inside the map (0 to less than ${max})`,
  );
  return value;
}

function defaults(data: JsonObject, path: string, expected: JsonObject): void {
  for (const [key, value] of Object.entries(expected)) {
    check(
      data[key] === undefined || data[key] === value,
      `${path}.${key}`,
      `must be ${String(value)}`,
    );
  }
}

function unsupported(data: JsonObject, path: string, keys: string[]): void {
  for (const key of keys) check(data[key] === undefined, `${path}.${key}`, 'is not supported');
}

/** Validate an untrusted JSON export before it reaches simulation or rendering. */
export function parseTileMap(value: unknown): TileMap {
  const map = object(value, 'map');
  check(map.type === 'map', 'type', 'must be map');
  check(map.orientation === 'orthogonal', 'orientation', 'must be orthogonal');
  check(map.infinite === false, 'infinite', 'must be false');
  defaults(map, 'map', { renderorder: 'right-down', parallaxoriginx: 0, parallaxoriginy: 0 });
  const width = integer(map.width, 'width', 1, 256);
  const height = integer(map.height, 'height', 1, 256);
  const tileWidth = integer(map.tilewidth, 'tilewidth', 1, 256);
  const tileHeight = integer(map.tileheight, 'tileheight', 1, 256);

  const tilesets = array(map.tilesets, 'tilesets');
  check(tilesets.length === 1, 'tilesets', 'must contain one embedded image tileset');
  const tileset = object(tilesets[0], 'tilesets[0]');
  unsupported(tileset, 'tileset', ['source', 'tileoffset', 'grid', 'transformations']);
  check(tileset.firstgid === 1, 'tileset.firstgid', 'must be 1');
  check(
    tileset.tilewidth === tileWidth && tileset.tileheight === tileHeight,
    'tileset tile dimensions',
    'must match the map',
  );
  defaults(tileset, 'tileset', { margin: 0, spacing: 0 });
  const tileCount = integer(tileset.tilecount, 'tileset.tilecount', 1, 1024);
  const columns = integer(tileset.columns, 'tileset.columns', 1, tileCount);
  check(tileCount % columns === 0, 'tileset.tilecount', 'must fill complete atlas rows');
  check(
    tileset.imagewidth === columns * tileWidth,
    'tileset.imagewidth',
    'must match the atlas columns',
  );
  check(
    tileset.imageheight === (tileCount / columns) * tileHeight,
    'tileset.imageheight',
    'must match the atlas rows',
  );
  check(
    typeof tileset.image === 'string' && /^[\w-]+\.png$/.test(tileset.image),
    'tileset.image',
    'must be a local PNG filename',
  );

  const definitions = array(tileset.tiles, 'tileset.tiles');
  check(definitions.length === tileCount, 'tileset.tiles', 'must define walkable for every tile');
  const passability = new Map<number, boolean>();
  for (const [index, entry] of definitions.entries()) {
    const path = `tileset.tiles[${index}]`;
    const tile = object(entry, path);
    const id = integer(tile.id, `${path}.id`, 0, tileCount - 1);
    check(!passability.has(id + 1), `${path}.id`, 'must be unique');
    unsupported(tile, path, ['animation', 'objectgroup', 'image']);
    const properties = array(tile.properties, `${path}.properties`);
    const walkable = properties
      .map((property) => object(property, `${path}.property`))
      .filter((property) => property.name === 'walkable');
    check(
      walkable.length === 1 &&
        walkable[0].type === 'bool' &&
        typeof walkable[0].value === 'boolean',
      `${path}.walkable`,
      'must be one boolean property',
    );
    passability.set(id + 1, walkable[0].value as boolean);
  }

  const rawLayers = array(map.layers, 'layers');
  check(rawLayers.length === 3, 'layers', 'must be terrain, obstacles, and spawn (in that order)');
  const names = ['terrain', 'obstacles', 'spawn'];
  const layers = rawLayers.map((entry, index) => {
    const layer = object(entry, `layers[${index}]`);
    check(layer.name === names[index], `layers[${index}].name`, `must be ${names[index]}`);
    defaults(layer, names[index], {
      visible: true,
      opacity: 1,
      x: 0,
      y: 0,
      offsetx: 0,
      offsety: 0,
      parallaxx: 1,
      parallaxy: 1,
      mode: 'normal',
    });
    unsupported(layer, names[index], ['tintcolor', 'chunks', 'layers', 'compression']);
    return layer;
  });
  const tileLayers = layers.slice(0, 2).map((layer, index) => {
    const name = names[index];
    check(layer.type === 'tilelayer', `${name}.type`, 'must be tilelayer');
    check(
      layer.width === width && layer.height === height,
      `${name} dimensions`,
      'must match the map',
    );
    defaults(layer, name, { encoding: 'csv' });
    const data = array(layer.data, `${name}.data`);
    check(data.length === width * height, `${name}.data`, 'length must match width × height');
    const tiles = data.map((gid, cell) =>
      integer(gid, `${name}.data[${cell}]`, index === 0 ? 1 : 0, tileCount),
    );
    return { name, tiles };
  });
  const walkable = tileLayers[0].tiles.map((gid, cell) => {
    const obstacle = tileLayers[1].tiles[cell];
    return passability.get(gid) === true && (obstacle === 0 || passability.get(obstacle) === true);
  });

  check(layers[2].type === 'objectgroup', 'spawn.type', 'must be objectgroup');
  const spawns = array(layers[2].objects, 'spawn.objects');
  check(spawns.length === 1, 'spawn.objects', 'must contain exactly one player-spawn point');
  const spawn = object(spawns[0], 'spawn');
  check(
    spawn.name === 'player-spawn' && spawn.point === true,
    'spawn',
    'must be a player-spawn point',
  );
  defaults(spawn, 'spawn', { rotation: 0, width: 0, height: 0, visible: true });
  unsupported(spawn, 'spawn', ['gid', 'template', 'polygon', 'polyline', 'ellipse', 'text']);
  const x = coordinate(spawn.x, 'spawn.x', width * tileWidth);
  const y = coordinate(spawn.y, 'spawn.y', height * tileHeight);
  check(
    walkable[Math.floor(y / tileHeight) * width + Math.floor(x / tileWidth)],
    'spawn',
    'must be on walkable ground without an obstacle',
  );

  return {
    width,
    height,
    tileWidth,
    tileHeight,
    bounds: { x: 0, y: 0, width: width * tileWidth, height: height * tileHeight },
    tileset: {
      image: tileset.image,
      imageWidth: columns * tileWidth,
      imageHeight: (tileCount / columns) * tileHeight,
      columns,
      tileCount,
    },
    layers: tileLayers,
    walkable,
    spawn: { x, y },
  };
}
