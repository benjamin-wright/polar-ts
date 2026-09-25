import { describe, expect, it } from 'vitest';
import { walkVelocity } from './steering';

const config = { walkSpeed: 200, deadZone: 6 };
const origin = { x: 0, y: 0 };

describe('walkVelocity', () => {
  it.each([
    { x: 100, y: 0 },
    { x: 100, y: 100 },
    { x: -30, y: 40 },
  ])('has the same speed at any heading: %j', (aim) => {
    const v = walkVelocity(origin, aim, 1 / 60, config);
    expect(Math.hypot(v.x, v.y)).toBeCloseTo(200);
    expect(v.x / Math.hypot(v.x, v.y)).toBeCloseTo(aim.x / Math.hypot(aim.x, aim.y));
    expect(v.y / Math.hypot(v.x, v.y)).toBeCloseTo(aim.y / Math.hypot(aim.x, aim.y));
  });

  it('moves from fractional positions with a step smaller than a tile', () => {
    const v = walkVelocity({ x: 10.25, y: 8.5 }, { x: 22.25, y: 24.5 }, 1 / 60, config);
    expect(v).toEqual({ x: 120, y: 160 });
    expect(v.x / 60).toBe(2);
    expect(v.y / 60).toBeCloseTo(8 / 3);
  });

  it.each([null, origin, { x: 2, y: 3 }, { x: 6, y: 0 }])(
    'stops for no aim or an aim in the dead zone: %j',
    (aim) => {
      expect(walkVelocity(origin, aim, 1 / 60, config)).toEqual(origin);
    },
  );

  it('shortens a large final step to avoid passing the aim point', () => {
    const aim = { x: 7.5, y: 10 };
    const v = walkVelocity(origin, aim, 0.5, config);
    const arrival = { x: v.x * 0.5, y: v.y * 0.5 };
    expect(arrival).toEqual(aim);
    expect(walkVelocity(arrival, aim, 0.5, config)).toEqual(origin);
  });

  it('uses configured speed and dead zone', () => {
    expect(walkVelocity(origin, { x: 50, y: 0 }, 1, { walkSpeed: 10, deadZone: 2 })).toEqual({
      x: 10,
      y: 0,
    });
    expect(walkVelocity(origin, { x: 50, y: 0 }, 1, { walkSpeed: 10, deadZone: 60 })).toEqual(
      origin,
    );
  });

  it('avoids division by zero when no simulation time elapses', () => {
    expect(walkVelocity(origin, { x: 10, y: 0 }, 0, config)).toEqual(origin);
  });
});
