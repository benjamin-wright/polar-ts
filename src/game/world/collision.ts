import type { TileMap } from './tilemap';

type CollisionMap = Pick<TileMap, 'width' | 'height' | 'tileWidth' | 'tileHeight' | 'walkable'>;
interface Point {
  x: number;
  y: number;
}
export interface Footprint {
  halfWidth: number;
  halfHeight: number;
}

/** Touching tile edges is safe; overlapping impassable ground is not. */
export function isFootprintClear(map: CollisionMap, point: Point, footprint: Footprint): boolean {
  const left = point.x - footprint.halfWidth;
  const right = point.x + footprint.halfWidth;
  const top = point.y - footprint.halfHeight;
  const bottom = point.y + footprint.halfHeight;
  if (
    !Number.isFinite(point.x) ||
    !Number.isFinite(point.y) ||
    !Number.isFinite(footprint.halfWidth) ||
    !Number.isFinite(footprint.halfHeight) ||
    footprint.halfWidth <= 0 ||
    footprint.halfHeight <= 0 ||
    left < 0 ||
    top < 0 ||
    right > map.width * map.tileWidth ||
    bottom > map.height * map.tileHeight
  ) {
    return false;
  }
  for (
    let row = Math.floor(top / map.tileHeight);
    row < Math.ceil(bottom / map.tileHeight);
    row++
  ) {
    for (
      let col = Math.floor(left / map.tileWidth);
      col < Math.ceil(right / map.tileWidth);
      col++
    ) {
      if (!map.walkable[row * map.width + col]) return false;
    }
  }
  return true;
}

/** Interval during which a swept point lies strictly inside one axis of a box. */
function axisInterval(start: number, delta: number, min: number, max: number): [number, number] {
  if (delta === 0) {
    return start > min && start < max ? [-Infinity, Infinity] : [Infinity, -Infinity];
  }
  const a = (min - start) / delta;
  const b = (max - start) / delta;
  return [Math.min(a, b), Math.max(a, b)];
}

/**
 * Sweep a centred rectangular footprint along the entire proposed segment.
 * Expanding each blocked tile by the footprint reduces the test to segment/box
 * intersection. Both axes stop at the earliest contact: no tunnelling or sliding.
 */
export function sweepFootprint(
  map: CollisionMap,
  from: Point,
  to: Point,
  footprint: Footprint,
): Point {
  if (!isFootprintClear(map, from, footprint) || !Number.isFinite(to.x) || !Number.isFinite(to.y)) {
    return { ...from };
  }
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const distance = Math.hypot(dx, dy);
  if (distance === 0) return { ...from };

  let contact = 1;
  // World boundaries constrain the footprint, not just its centre.
  const maxX = map.width * map.tileWidth - footprint.halfWidth;
  const maxY = map.height * map.tileHeight - footprint.halfHeight;
  if (dx > 0) contact = Math.min(contact, (maxX - from.x) / dx);
  if (dx < 0) contact = Math.min(contact, (footprint.halfWidth - from.x) / dx);
  if (dy > 0) contact = Math.min(contact, (maxY - from.y) / dy);
  if (dy < 0) contact = Math.min(contact, (footprint.halfHeight - from.y) / dy);

  // Only inspect cells in the swept footprint's bounding box, clipped to the map.
  const left = Math.max(
    0,
    Math.floor((Math.min(from.x, to.x) - footprint.halfWidth) / map.tileWidth),
  );
  const right = Math.min(
    map.width - 1,
    Math.floor((Math.max(from.x, to.x) + footprint.halfWidth) / map.tileWidth),
  );
  const top = Math.max(
    0,
    Math.floor((Math.min(from.y, to.y) - footprint.halfHeight) / map.tileHeight),
  );
  const bottom = Math.min(
    map.height - 1,
    Math.floor((Math.max(from.y, to.y) + footprint.halfHeight) / map.tileHeight),
  );
  for (let row = top; row <= bottom; row++) {
    for (let col = left; col <= right; col++) {
      if (map.walkable[row * map.width + col]) continue;
      const [enterX, exitX] = axisInterval(
        from.x,
        dx,
        col * map.tileWidth - footprint.halfWidth,
        (col + 1) * map.tileWidth + footprint.halfWidth,
      );
      const [enterY, exitY] = axisInterval(
        from.y,
        dy,
        row * map.tileHeight - footprint.halfHeight,
        (row + 1) * map.tileHeight + footprint.halfHeight,
      );
      const enter = Math.max(enterX, enterY);
      const exit = Math.min(exitX, exitY);
      // Open intervals allow moving away from or parallel to a touching edge.
      if (enter < exit && exit > 0 && enter < contact) contact = Math.max(0, enter);
    }
  }
  if (contact === 1) return { ...to };
  // A tiny world-space clearance avoids rounding into a tile at exact contact.
  const travel = Math.max(0, contact - 1e-7 / distance);
  return { x: from.x + dx * travel, y: from.y + dy * travel };
}
