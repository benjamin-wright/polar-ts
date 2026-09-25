import { Application, Sprite } from 'pixi.js';
import type { AnimationState } from '../core/animation';
import { applySpriteFrame } from './sprites';
import type { SpriteSheet } from './sprites';

/** One transparent canvas; the checkerboard and controls are ordinary DOM. */
export class AnimationPreviewView {
  private readonly sprite = new Sprite();

  private constructor(private readonly app: Application) {
    app.stage.addChild(this.sprite);
  }

  static async create(container: HTMLElement): Promise<AnimationPreviewView> {
    const app = new Application();
    await app.init({
      backgroundAlpha: 0,
      resizeTo: container,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
      autoDensity: true,
      antialias: false,
      autoStart: false,
    });
    app.canvas.setAttribute('role', 'img');
    app.canvas.setAttribute('aria-label', 'Animated sprite preview');
    container.appendChild(app.canvas);
    return new AnimationPreviewView(app);
  }

  render(sheet: SpriteSheet, state: AnimationState, zoom: number): void {
    applySpriteFrame(this.sprite, sheet, state);
    const { displayWidth, displayHeight, anchor } = sheet.definition;
    this.sprite.width *= zoom;
    this.sprite.height *= zoom;
    this.sprite.position.set(
      this.app.screen.width / 2 + displayWidth * zoom * (anchor.x - 0.5),
      this.app.screen.height / 2 + displayHeight * zoom * (anchor.y - 0.5),
    );
    this.app.render();
  }

  start(tick: (dt: number) => void): void {
    this.app.ticker.add((ticker) => tick(ticker.deltaMS / 1000));
    this.app.ticker.start();
  }

  destroy(): void {
    this.app.destroy(true, { children: true });
  }
}
