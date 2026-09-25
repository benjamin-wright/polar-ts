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

/** Earliest contact and the blocked axes, including simultaneous corner hits. */
function firstContact(
  map: CollisionMap,
  from: Point,
  to: Point,
  footprint: Footprint,
): { time: number; blockX: boolean; blockY: boolean } {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  let contact = { time: 1, blockX: false, blockY: false };
  const consider = (time: number, blockX: boolean, blockY: boolean): void => {
    if (time < 0 || time > 1) return;
    if (time < contact.time - 1e-10) {
      contact = { time, blockX, blockY };
    } else if (Math.abs(time - contact.time) <= 1e-10) {
      contact.time = Math.min(time, contact.time);
      contact.blockX ||= blockX;
      contact.blockY ||= blockY;
    }
  };
  // World boundaries constrain the footprint, not just its centre.
  const maxX = map.width * map.tileWidth - footprint.halfWidth;
  const maxY = map.height * map.tileHeight - footprint.halfHeight;
  if (dx > 0) consider((maxX - from.x) / dx, true, false);
  if (dx < 0) consider((footprint.halfWidth - from.x) / dx, true, false);
  if (dy > 0) consider((maxY - from.y) / dy, false, true);
  if (dy < 0) consider((footprint.halfHeight - from.y) / dy, false, true);

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
      if (enter < exit && exit > 0) {
        consider(Math.max(0, enter), enterX >= enterY, enterY >= enterX);
      }
    }
  }
  return contact;
}

function resolveFootprint(
  map: CollisionMap,
  from: Point,
  to: Point,
  footprint: Footprint,
  slide: boolean,
): Point {
  if (!isFootprintClear(map, from, footprint) || !Number.isFinite(to.x) || !Number.isFinite(to.y)) {
    return { ...from };
  }
  let position = { ...from };
  let remaining = { x: to.x - from.x, y: to.y - from.y };
  // Each contact removes at least one motion axis. Two sweeps cover a wall slide
  // followed by another wall/corner, including large steps and thin obstacles.
  for (let pass = 0; pass < 2; pass++) {
    const distance = Math.hypot(remaining.x, remaining.y);
    if (distance === 0) break;
    const target = pass === 0 ? to : { x: position.x + remaining.x, y: position.y + remaining.y };
    const contact = firstContact(map, position, target, footprint);
    if (contact.time === 1) return { ...target };
    // Keep a tiny world-space clearance so rounding never places us inside a tile.
    const travel = Math.max(0, contact.time - 1e-7 / distance);
    position = { x: position.x + remaining.x * travel, y: position.y + remaining.y * travel };
    if (!slide) break;
    if (contact.blockX && contact.blockY) {
      // Adjacent tiles can report a corner on an otherwise flat wall. Sweep both
      // possible tangents against the whole grid instead of snagging on the seam.
      // At a real inside corner both sweeps stop; at an outside corner choose the
      // tangent with more progress. Each candidate still checks its full segment.
      const alongX = resolveFootprint(
        map,
        position,
        {
          x: position.x + remaining.x * (1 - travel),
          y: position.y,
        },
        footprint,
        false,
      );
      const alongY = resolveFootprint(
        map,
        position,
        {
          x: position.x,
          y: position.y + remaining.y * (1 - travel),
        },
        footprint,
        false,
      );
      return Math.abs(alongX.x - position.x) >= Math.abs(alongY.y - position.y) ? alongX : alongY;
    }
    remaining = {
      x: contact.blockX ? 0 : remaining.x * (1 - travel),
      y: contact.blockY ? 0 : remaining.y * (1 - travel),
    };
  }
  return position;
}

/** Straight-line sweep for tap destinations; stops at first contact. */
export function sweepFootprint(
  map: CollisionMap,
  from: Point,
  to: Point,
  footprint: Footprint,
): Point {
  return resolveFootprint(map, from, to, footprint, false);
}

/** Follow movement keeps its tangential displacement after hitting a boundary. */
export function slideFootprint(
  map: CollisionMap,
  from: Point,
  to: Point,
  footprint: Footprint,
): Point {
  return resolveFootprint(map, from, to, footprint, true);
}
