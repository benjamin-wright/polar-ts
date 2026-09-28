import { advancePlayback, animationFrameIndex, animationSequence } from '../core/animation';
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

  constructor(public definition: SpriteSheetDefinition) {
    this.selectSheet(definition);
  }

  get frame(): number {
    return animationFrameIndex(this.definition, this.state);
  }

  get frameCount(): number {
    return animationSequence(this.definition, this.state).frames.length;
  }

  get fps(): number {
    return animationSequence(this.definition, this.state).fps;
  }

  selectSheet(definition: SpriteSheetDefinition): void {
    const clip = definition.animations[this.state.clip]
      ? this.state.clip
      : (Object.keys(definition.animations)[0] as AnimationClip | undefined);
    const facing =
      definition.facings[this.state.facing] !== undefined
        ? this.state.facing
        : (Object.keys(definition.facings)[0] as Facing | undefined);
    if (!clip || !facing) throw new Error('A preview sheet needs an animation and a facing');
    this.definition = definition;
    this.state = { clip, facing, elapsed: 0 };
  }

  selectClip(clip: AnimationClip): void {
    if (!this.definition.animations[clip]) return;
    this.state = { ...this.state, clip, elapsed: 0 };
  }

  selectFacing(facing: Facing): void {
    if (this.definition.facings[facing] === undefined) return;
    this.state = { ...this.state, facing };
  }

  scrub(frame: number): void {
    this.playing = false;
    const clamped = Math.max(0, Math.min(this.frameCount - 1, Math.round(frame)));
    this.state = {
      ...this.state,
      elapsed: clamped / this.fps,
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
