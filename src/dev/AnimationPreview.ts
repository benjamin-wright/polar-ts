import { advancePlayback, animationFrameIndex } from '../core/animation';
import type {
  AnimationClip,
  AnimationState,
  Facing,
  SpriteSheetDefinition,
} from '../core/animation';

/** Preview-only state. Definitions are read, never edited, by these controls. */
export class AnimationPreview {
  state: AnimationState = { clip: 'walk', facing: 'right', elapsed: 0 };
  playing = true;
  speed = 1;
  zoom = 4;

  constructor(public definition: SpriteSheetDefinition) {}

  get frame(): number {
    return animationFrameIndex(this.definition, this.state);
  }

  get frameCount(): number {
    return this.definition.animations[this.state.clip].frames.length;
  }

  selectSheet(definition: SpriteSheetDefinition): void {
    this.definition = definition;
    this.state = { ...this.state, elapsed: 0 };
  }

  selectClip(clip: AnimationClip): void {
    this.state = { ...this.state, clip, elapsed: 0 };
  }

  selectFacing(facing: Facing): void {
    this.state = { ...this.state, facing };
  }

  scrub(frame: number): void {
    this.playing = false;
    const clamped = Math.max(0, Math.min(this.frameCount - 1, Math.round(frame)));
    this.state = {
      ...this.state,
      elapsed: clamped / this.definition.animations[this.state.clip].fps,
    };
  }

  step(direction: -1 | 1): void {
    this.scrub((this.frame + direction + this.frameCount) % this.frameCount);
  }

  advance(dt: number): void {
    if (this.playing) {
      this.state = advancePlayback(this.state, dt * this.speed, this.definition);
    }
  }
}
