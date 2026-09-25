import { describe, expect, it } from 'vitest';
import island from '../../../assets/tilemaps/island.json';
import movementConfig from '../../../assets/data/player-movement.json';
import { isFootprintClear, sweepFootprint } from './collision';
import { parseTileMap } from './tilemap';

function grid(blocked: [number, number][] = []) {
  const map = {
    width: 10,
    height: 8,
    tileWidth: 10,
    tileHeight: 10,
    walkable: Array<boolean>(80).fill(true),
  };
  for (const [col, row] of blocked) map.walkable[row * map.width + col] = false;
  return map;
}
const footprint = { halfWidth: 2, halfHeight: 2 };

describe('sweepFootprint', () => {
  it('preserves arbitrary positions and headings across open ground', () => {
    const to = { x: 62.375, y: 47.125 };
    expect(sweepFootprint(grid(), { x: 15.25, y: 15.5 }, to, footprint)).toEqual(to);
    expect(sweepFootprint(grid(), to, to, footprint)).toEqual(to);
  });

  it('stops at the first obstacle, even when the endpoint beyond multiple tiles is clear', () => {
    const map = grid([
      [4, 1],
      [6, 1],
    ]);
    const result = sweepFootprint(map, { x: 15, y: 15 }, { x: 95, y: 15 }, footprint);
    expect(result.x).toBeCloseTo(38, 6);
    expect(result.x).toBeLessThanOrEqual(38);
    expect(result.y).toBe(15);
    expect(isFootprintClear(map, result, footprint)).toBe(true);
  });

  it('stops both axes at continuous diagonal contact without sliding or snapping', () => {
    const map = grid([[4, 3]]);
    const from = { x: 15.25, y: 15.5 };
    const result = sweepFootprint(map, from, { x: 75.25, y: 55.5 }, footprint);
    expect(result.x).toBeCloseTo(38, 6);
    expect(result.y).toBeCloseTo(15.5 + ((38 - 15.25) * 2) / 3, 6);
    expect((result.x - from.x) / 60).toBeCloseTo((result.y - from.y) / 40, 12);
    expect(isFootprintClear(map, result, footprint)).toBe(true);
  });

  it('catches an obstacle corner touched by the footprint when the centre line misses the tile', () => {
    const map = grid([[4, 3]]);
    const result = sweepFootprint(map, { x: 15, y: 29 }, { x: 75, y: 29 }, footprint);
    expect(result.x).toBeCloseTo(38, 6);
    expect(result.y).toBe(29);
    expect(isFootprintClear(map, result, footprint)).toBe(true);
  });

  it('stops at a diagonal corner even when there is walkable ground beyond it', () => {
    const map = grid([[4, 3]]);
    const result = sweepFootprint(map, { x: 28, y: 18 }, { x: 68, y: 58 }, footprint);
    expect(result.x).toBeCloseTo(38, 6);
    expect(result.y).toBeCloseTo(28, 6);
    expect(isFootprintClear(map, result, footprint)).toBe(true);
  });

  it.each([
    [
      { x: -100, y: 15 },
      { x: 2, y: 15 },
    ],
    [
      { x: 200, y: 15 },
      { x: 98, y: 15 },
    ],
    [
      { x: 15, y: -100 },
      { x: 15, y: 2 },
    ],
    [
      { x: 15, y: 200 },
      { x: 15, y: 78 },
    ],
    [
      { x: -100, y: -100 },
      { x: 2, y: 2 },
    ],
  ])('contains the whole footprint when aiming outside the map at %j', (to, expected) => {
    const map = grid();
    const result = sweepFootprint(map, { x: 15, y: 15 }, to, footprint);
    expect(result.x).toBeCloseTo(expected.x, 6);
    expect(result.y).toBeCloseTo(expected.y, 6);
    expect(isFootprintClear(map, result, footprint)).toBe(true);
  });

  it('handles negative travel and rectangular tiles/footprints', () => {
    const map = { ...grid([[4, 3]]), tileHeight: 20 };
    const shape = { halfWidth: 3, halfHeight: 5 };
    const result = sweepFootprint(map, { x: 85, y: 70 }, { x: 15, y: 70 }, shape);
    expect(result.x).toBeCloseTo(53, 6);
    expect(result.y).toBe(70);
    expect(isFootprintClear(map, result, shape)).toBe(true);
  });

  it('allows a fitting gap and blocks a gap narrower than the footprint', () => {
    const map = grid([
      [4, 2],
      [4, 4],
    ]);
    const from = { x: 15, y: 35 };
    const to = { x: 75, y: 35 };
    expect(sweepFootprint(map, from, to, { halfWidth: 2, halfHeight: 5 })).toEqual(to);
    const wide = { halfWidth: 2, halfHeight: 5.1 };
    const result = sweepFootprint(map, from, to, wide);
    expect(result.x).toBeCloseTo(38, 6);
    expect(isFootprintClear(map, result, wide)).toBe(true);
  });

  it('allows steering away from or parallel to a touching edge, but blocks entering it', () => {
    const map = grid([[4, 3]]);
    const from = { x: 38, y: 35 };
    for (const to of [
      { x: 20, y: 35 },
      { x: 38, y: 20 },
    ]) {
      expect(sweepFootprint(map, from, to, footprint)).toEqual(to);
    }
    expect(sweepFootprint(map, from, { x: 75, y: 35 }, footprint)).toEqual(from);
  });

  it('remains stable through repeated attempts against the same barrier', () => {
    const map = grid([[4, 3]]);
    const aim = { x: 85, y: 55 };
    const first = sweepFootprint(map, { x: 15, y: 15 }, aim, footprint);
    let position = first;
    for (let i = 0; i < 600; i++) position = sweepFootprint(map, position, aim, footprint);
    expect(position.x).toBeCloseTo(first.x, 10);
    expect(position.y).toBeCloseTo(first.y, 10);
    expect(isFootprintClear(map, position, footprint)).toBe(true);
  });

  it('checks actual island shoreline and rock passability and spawn clearance', () => {
    const map = parseTileMap(island);
    const shape = movementConfig.footprint;
    expect(isFootprintClear(map, map.spawn, shape)).toBe(true);
    const shore = sweepFootprint(map, { x: 304, y: 100 }, { x: 304, y: 16 }, shape);
    expect(shore.y).toBeCloseTo(64 + shape.halfHeight, 6);
    expect(isFootprintClear(map, shore, shape)).toBe(true);
    const rock = sweepFootprint(map, { x: 180, y: 176 }, { x: 310, y: 176 }, shape);
    expect(rock.x).toBeCloseTo(224 - shape.halfWidth, 6);
    expect(isFootprintClear(map, rock, shape)).toBe(true);
  });

  it('rejects an overlapping footprint even when the centre tile is walkable', () => {
    const map = grid([[4, 3]]);
    const point = { x: 39, y: 35 };
    expect(isFootprintClear(map, point, footprint)).toBe(false);
    expect(sweepFootprint(map, point, { x: 60, y: 35 }, footprint)).toEqual(point);
    expect(isFootprintClear(map, { x: 1, y: 15 }, footprint)).toBe(false);
  });
});
