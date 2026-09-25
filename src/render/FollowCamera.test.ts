import { describe, expect, it } from 'vitest';
import { FollowCamera } from './FollowCamera';

const bounds = { x: 100, y: 50, width: 640, height: 512 };

describe('FollowCamera', () => {
  it('centres the followed point while there is room to pan', () => {
    const camera = new FollowCamera(bounds, 2);
    camera.resize(320, 240);
    camera.follow({ x: 400.25, y: 250.5 });
    expect(camera.toScreen({ x: 400.25, y: 250.5 })).toEqual({ x: 160, y: 120 });
    expect(camera.transform).toEqual({ x: -640.5, y: -381, scale: 2 });
  });

  it.each([
    [
      { x: 100, y: 50 },
      { x: -200, y: -100, scale: 2 },
    ],
    [
      { x: 740, y: 50 },
      { x: -1160, y: -100, scale: 2 },
    ],
    [
      { x: 100, y: 562 },
      { x: -200, y: -884, scale: 2 },
    ],
    [
      { x: 740, y: 562 },
      { x: -1160, y: -884, scale: 2 },
    ],
  ])('clamps to map edges when following %j', (point, expected) => {
    const camera = new FollowCamera(bounds, 2);
    camera.resize(320, 240);
    camera.follow(point);
    expect(camera.transform).toEqual(expected);
    const topLeft = camera.toScreen(bounds);
    const bottomRight = camera.toScreen({ x: 740, y: 562 });
    expect(topLeft.x).toBeLessThanOrEqual(0);
    expect(topLeft.y).toBeLessThanOrEqual(0);
    expect(bottomRight.x).toBeGreaterThanOrEqual(320);
    expect(bottomRight.y).toBeGreaterThanOrEqual(240);
  });

  it('centres a small map regardless of the player location and rejects its margins', () => {
    const camera = new FollowCamera({ x: 10, y: 20, width: 100, height: 80 }, 2);
    camera.resize(400, 300);
    camera.follow({ x: 10, y: 20 });
    expect(camera.transform).toEqual({ x: 80, y: 30, scale: 2 });
    expect(camera.toWorld({ x: 100, y: 70 })).toEqual({ x: 10, y: 20 });
    for (const point of [
      { x: 99, y: 100 },
      { x: 300, y: 100 },
      { x: 200, y: 69 },
      { x: 200, y: 230 },
    ]) {
      expect(camera.toWorld(point)).toBeNull();
    }
    camera.follow({ x: 90, y: 80 });
    expect(camera.transform).toEqual({ x: 80, y: 30, scale: 2 });
  });

  it('centres a small axis while continuing to follow on the other axis', () => {
    const camera = new FollowCamera({ x: 0, y: 0, width: 1000, height: 100 }, 1.5);
    camera.resize(400, 300);
    camera.follow({ x: 500, y: 20 });
    expect(camera.transform).toEqual({ x: -550, y: 75, scale: 1.5 });
    camera.follow({ x: 600, y: 80 });
    expect(camera.transform).toEqual({ x: -700, y: 75, scale: 1.5 });
  });

  it.each([0.5, 1, 1.75, 2])('round-trips fractional coordinates at zoom %s', (zoom) => {
    const camera = new FollowCamera({ x: 0, y: 0, width: 2000, height: 2000 }, zoom);
    camera.resize(390, 844);
    camera.follow({ x: 1000.25, y: 1000.5 });
    const point = { x: 1050.125, y: 1040.625 };
    const result = camera.toWorld(camera.toScreen(point));
    expect(result?.x).toBeCloseTo(point.x, 10);
    expect(result?.y).toBeCloseTo(point.y, 10);
  });

  it('recomputes centring and clamping on resize while preserving the followed point', () => {
    const camera = new FollowCamera(bounds, 2);
    camera.resize(320, 240);
    const player = { x: 400.25, y: 250.5 };
    camera.follow(player);
    camera.resize(2000, 1500);
    expect(camera.toScreen(bounds)).toEqual({ x: 360, y: 238 });
    camera.resize(240, 320);
    expect(camera.toScreen(player)).toEqual({ x: 120, y: 160 });
    expect(camera.toWorld({ x: 120, y: 160 })).toEqual(player);
  });

  it('ignores coordinates outside the canvas even when they map to valid world positions', () => {
    const camera = new FollowCamera(bounds, 2);
    camera.resize(320, 240);
    camera.follow({ x: 400, y: 250 });
    for (const point of [
      { x: -1, y: 120 },
      { x: 320, y: 120 },
      { x: 160, y: -1 },
      { x: 160, y: 240 },
      { x: NaN, y: 0 },
    ]) {
      expect(camera.toWorld(point)).toBeNull();
    }
    camera.resize(0, 0);
    expect(camera.toWorld({ x: 0, y: 0 })).toBeNull();
  });

  it('rejects zoom values that make coordinate conversion undefined', () => {
    for (const zoom of [0, -1, NaN, Infinity]) {
      expect(() => new FollowCamera(bounds, zoom)).toThrow(/zoom must be positive/);
    }
  });
});
