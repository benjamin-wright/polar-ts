import { describe, expect, it, vi } from 'vitest';
import { GameLoop } from './GameLoop';

describe('GameLoop', () => {
  it('runs no tick when less than one step has elapsed', () => {
    const loop = new GameLoop(1 / 60);
    const tick = vi.fn();

    loop.advance(1 / 120, tick);

    expect(tick).not.toHaveBeenCalled();
  });

  it('runs exactly one tick per fixed step', () => {
    const loop = new GameLoop(1 / 60);
    const tick = vi.fn();

    loop.advance(1 / 60, tick);
    expect(tick).toHaveBeenCalledTimes(1);

    loop.advance(1 / 60, tick);
    expect(tick).toHaveBeenCalledTimes(2);
  });

  it('catches up with multiple ticks after a long frame', () => {
    const loop = new GameLoop(1 / 60);
    const tick = vi.fn();

    loop.advance(3.5 / 60, tick);

    expect(tick).toHaveBeenCalledTimes(3);
  });

  it('carries leftover time as interpolation alpha', () => {
    const loop = new GameLoop(1 / 60);

    const alpha = loop.advance(1.5 / 60, vi.fn());

    expect(alpha).toBeCloseTo(0.5);
  });

  it('clamps huge frame times to avoid a spiral of death', () => {
    const loop = new GameLoop(1 / 60, 0.25);
    const tick = vi.fn();

    loop.advance(10, tick);

    expect(tick).toHaveBeenCalledTimes(15); // 0.25s / (1/60)s
    expect(loop.simTime).toBeCloseTo(0.25);
  });

  it('rejects a non-positive step', () => {
    expect(() => new GameLoop(0)).toThrow();
  });
});
