import { describe, expect, it } from 'vitest';
import { advanceAnimation, animationFrame, movementFacing } from './animation';
import type { AnimationState, Facing } from './animation';
import { spriteSheets } from './spriteSheets';

const sheet = spriteSheets.player;
const idle: AnimationState = { clip: 'idle', facing: 'down', elapsed: 0 };

describe('sprite animation playback', () => {
  it('plays the data-defined walk sequence, loops, and handles long steps', () => {
    let state: AnimationState = { clip: 'walk', facing: 'right', elapsed: 0 };
    const frames: number[] = [];
    for (let i = 0; i < 5; i++) {
      frames.push(animationFrame(sheet, state));
      state = advanceAnimation(state, { x: 200, y: 0 }, 0.125, sheet);
    }
    expect(frames).toEqual([10, 8, 11, 8, 10]);
    state = advanceAnimation(state, { x: 200, y: 0 }, 100, sheet);
    expect(state.elapsed).toBeCloseTo(0.125);
    expect(animationFrame(sheet, state)).toBe(8);
  });

  it('advances by simulation time rather than the number of ticks', () => {
    let smallSteps: AnimationState = { clip: 'walk', facing: 'down', elapsed: 0 };
    for (let i = 0; i < 24; i++) {
      smallSteps = advanceAnimation(smallSteps, { x: 0, y: 200 }, 1 / 60, sheet);
    }
    const largeStep = advanceAnimation({ ...smallSteps, elapsed: 0 }, { x: 0, y: 200 }, 0.4, sheet);
    expect(smallSteps.elapsed).toBeCloseTo(largeStep.elapsed);
    expect(animationFrame(sheet, smallSteps)).toBe(animationFrame(sheet, largeStep));
    expect(animationFrame(sheet, smallSteps)).toBe(0);
  });

  it('restarts on idle/walk changes, preserves facing at rest, and keeps gait on turns', () => {
    let state = advanceAnimation({ ...idle, elapsed: 1.75 }, { x: -200, y: 0 }, 0.1, sheet);
    expect(state).toEqual({ clip: 'walk', facing: 'left', elapsed: 0 });
    state = advanceAnimation(state, { x: -200, y: 0 }, 0.25, sheet);
    state = advanceAnimation(state, { x: 0, y: -200 }, 0.05, sheet);
    expect(state).toEqual({ clip: 'walk', facing: 'up', elapsed: 0.3 });
    state = advanceAnimation(state, { x: 0, y: 0 }, 0.1, sheet);
    expect(state).toEqual({ clip: 'idle', facing: 'up', elapsed: 0 });
    state = advanceAnimation(state, { x: 0, y: 0 }, 1.75, sheet);
    expect(animationFrame(sheet, state)).toBe(13);
  });

  it('does not walk or change facing from numerical contact clearance', () => {
    expect(advanceAnimation(idle, { x: 1e-7, y: -1e-7 }, 0.1, sheet)).toEqual({
      ...idle,
      elapsed: 0.1,
    });
    expect(advanceAnimation(idle, { x: 0, y: -0.01 }, 0.1, sheet).clip).toBe('walk');
  });

  it('keeps a paused animation on its current frame', () => {
    const state: AnimationState = { clip: 'walk', facing: 'left', elapsed: 0.25 };
    expect(advanceAnimation(state, { x: -200, y: 0 }, 0, sheet)).toEqual(state);
  });

  it.each<[number, number, Facing]>([
    [200, 20, 'right'],
    [-200, 20, 'left'],
    [20, 200, 'down'],
    [20, -200, 'up'],
  ])('faces along the dominant axis of (%s, %s)', (x, y, facing) => {
    expect(movementFacing(x, y, 'down')).toBe(facing);
  });

  it('retains the previous axis on exact diagonals, with the correct sign', () => {
    expect(movementFacing(100, -100, 'right')).toBe('right');
    expect(movementFacing(100, -100, 'down')).toBe('up');
    expect(movementFacing(-100, 100, 'right')).toBe('left');
    expect(movementFacing(0, 0, 'left')).toBe('left');
  });
});
