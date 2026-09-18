/**
 * Fixed-timestep simulation loop decoupled from rendering.
 *
 * The simulation advances in fixed `step` increments (default 60 Hz) so that
 * game logic stays deterministic regardless of display refresh rate. Leftover
 * time is carried in an accumulator; `alpha` (0..1) tells renderers how far
 * between simulation states we are, for interpolation.
 *
 * Rendering itself is driven by Pixi's ticker (see render/), which calls
 * `advance()` once per animation frame.
 */
export class GameLoop {
  /** Fixed simulation step in seconds. */
  readonly step: number;
  /** Cap on simulated seconds per frame, to avoid the spiral of death. */
  private readonly maxFrameTime: number;

  private accumulator = 0;
  /** Total simulated seconds since the loop started. */
  simTime = 0;

  constructor(step = 1 / 60, maxFrameTime = 0.25) {
    if (step <= 0) throw new Error('GameLoop step must be > 0');
    this.step = step;
    this.maxFrameTime = maxFrameTime;
  }

  /**
   * Advance the simulation by `dt` real seconds, invoking `tick(step)` once
   * per fixed step that elapsed. Returns the interpolation alpha.
   */
  advance(dt: number, tick: (step: number) => void): number {
    this.accumulator += Math.min(Math.max(dt, 0), this.maxFrameTime);
    while (this.accumulator >= this.step) {
      tick(this.step);
      this.simTime += this.step;
      this.accumulator -= this.step;
    }
    return this.accumulator / this.step;
  }
}
