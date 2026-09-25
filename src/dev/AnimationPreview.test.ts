import { describe, expect, it } from 'vitest';
import { advanceAnimation, animationFrame } from '../core/animation';
import { spriteSheets } from '../core/spriteSheets';
import { AnimationPreview } from './AnimationPreview';

const sheet = spriteSheets.player;

describe('animation preview controls', () => {
  it('matches the game sequence and timing at normal speed', () => {
    const preview = new AnimationPreview(sheet);
    let gameState = { ...preview.state };
    const frames = new Set<number>();
    for (let i = 0; i < 120; i++) {
      preview.advance(1 / 60);
      gameState = advanceAnimation(gameState, { x: 200, y: 0 }, 1 / 60, sheet);
      expect(preview.state).toEqual(gameState);
      expect(animationFrame(sheet, preview.state)).toBe(animationFrame(sheet, gameState));
      frames.add(preview.frame);
    }
    expect([...frames].sort()).toEqual([0, 1, 2, 3]);
  });

  it('pauses, scrubs to an exact frame, and resumes from that frame', () => {
    const preview = new AnimationPreview(sheet);
    preview.scrub(2);
    expect(preview.playing).toBe(false);
    expect(animationFrame(sheet, preview.state)).toBe(11);
    const paused = { ...preview.state };
    preview.advance(10);
    expect(preview.state).toEqual(paused);
    preview.playing = true;
    preview.advance(1 / 8);
    expect(preview.frame).toBe(3);
  });

  it('steps in either direction, wraps the clip, and remains paused', () => {
    const preview = new AnimationPreview(sheet);
    preview.step(-1);
    expect(preview.frame).toBe(3);
    expect(preview.playing).toBe(false);
    preview.step(1);
    expect(preview.frame).toBe(0);
    preview.step(1);
    expect(preview.frame).toBe(1);
  });

  it('scrubs repeated idle poses by sequence position, including the blink', () => {
    const preview = new AnimationPreview(sheet);
    preview.selectClip('idle');
    preview.scrub(6);
    expect(preview.frame).toBe(6);
    expect(animationFrame(sheet, preview.state)).toBe(8);
    preview.step(1);
    expect(preview.frame).toBe(7);
    expect(animationFrame(sheet, preview.state)).toBe(9);
  });

  it('changes facing on the current pose and restarts a newly selected clip', () => {
    const preview = new AnimationPreview(sheet);
    preview.scrub(2);
    preview.selectFacing('left');
    expect(preview.frame).toBe(2);
    expect(animationFrame(sheet, preview.state)).toBe(7);
    preview.selectClip('idle');
    expect(preview.frame).toBe(0);
    expect(preview.frameCount).toBe(8);
    expect(preview.state.facing).toBe('left');
    expect(preview.playing).toBe(false);
  });

  it.each([0.25, 0.5, 1, 2])('applies %s× speed without changing saved playback rates', (speed) => {
    const preview = new AnimationPreview(sheet);
    preview.speed = speed;
    preview.advance(0.2);
    expect(preview.state.elapsed).toBeCloseTo(0.2 * speed);
    expect(sheet.animations.walk.fps).toBe(8);
  });

  it('resets the timeline when another sheet has a different frame count and rate', () => {
    const preview = new AnimationPreview(sheet);
    preview.scrub(3);
    preview.selectSheet({
      ...sheet,
      label: 'Second sheet',
      animations: { ...sheet.animations, walk: { frames: [2, 3], fps: 4 } },
    });
    expect(preview.frameCount).toBe(2);
    expect(preview.frame).toBe(0);
    preview.playing = true;
    preview.advance(0.25);
    expect(preview.frame).toBe(1);
  });

  it('keeps tuning and selection local to each preview without modifying definitions', () => {
    const definition = structuredClone(sheet);
    const saved = structuredClone(definition);
    const preview = new AnimationPreview(definition);
    preview.speed = 2;
    preview.zoom = 8;
    preview.selectClip('idle');
    preview.selectFacing('up');
    preview.advance(0.5);
    preview.scrub(999);
    expect(preview.frame).toBe(7);
    expect(definition).toEqual(saved);
    const second = new AnimationPreview(definition);
    expect(second.state).toEqual({ clip: 'walk', facing: 'right', elapsed: 0 });
    expect(second.speed).toBe(1);
    expect(second.zoom).toBe(4);
  });
});
