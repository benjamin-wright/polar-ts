export interface WalkConfig {
  /** World pixels per second, independent of heading or pointer distance. */
  walkSpeed: number;
  /** World-pixel radius around the player within which movement stops. */
  deadZone: number;
}

interface Point {
  x: number;
  y: number;
}

/** Pure velocity intent; integration consumes it once for the same fixed step. */
export function walkVelocity(
  position: Point,
  aim: Point | null,
  dt: number,
  config: WalkConfig,
): Point {
  if (!aim || dt <= 0) return { x: 0, y: 0 };
  const dx = aim.x - position.x;
  const dy = aim.y - position.y;
  const distance = Math.hypot(dx, dy);
  if (distance === 0 || distance <= config.deadZone) return { x: 0, y: 0 };
  // Shorten only the final step, so integration cannot pass the aim point.
  const speed = Math.min(config.walkSpeed, distance / dt);
  return { x: (dx / distance) * speed, y: (dy / distance) * speed };
}
