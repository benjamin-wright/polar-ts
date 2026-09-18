/**
 * Unified pointer input layer (Pointer Events cover touch, mouse and pen).
 *
 * Listeners are attached to a target element (typically the Pixi canvas);
 * consumers poll `pointer` each frame. `consumeTap()` hands out a tap exactly
 * once, so a single tap can never trigger two actions.
 *
 * Game logic reads this via the shared `InputState` component (see
 * ecs/components) and never touches DOM events directly.
 */
export interface PointerState {
  /** Canvas-space coordinates of the latest pointer event. */
  x: number;
  y: number;
  /** True while a pointer is held down. */
  down: boolean;
  /** True on the frame the pointer went down. */
  justPressed: boolean;
  /** Tap (press + quick release without dragging) awaiting consumption. */
  tap: { x: number; y: number } | null;
}

const MAX_TAP_DURATION_MS = 300;
const MAX_TAP_TRAVEL_PX = 12;

export class InputSystem {
  readonly pointer: PointerState = { x: 0, y: 0, down: false, justPressed: false, tap: null };

  private pressTime = 0;
  private pressX = 0;
  private pressY = 0;

  constructor(private readonly target: HTMLElement) {
    target.addEventListener('pointerdown', this.onPointerDown);
    target.addEventListener('pointermove', this.onPointerMove);
    target.addEventListener('pointerup', this.onPointerUp);
    target.addEventListener('pointercancel', this.onPointerCancel);
  }

  /** Returns the pending tap once, clearing it. */
  consumeTap(): { x: number; y: number } | null {
    const tap = this.pointer.tap;
    this.pointer.tap = null;
    return tap;
  }

  /** Clears per-frame flags. Call once at the end of every frame. */
  endFrame(): void {
    this.pointer.justPressed = false;
  }

  destroy(): void {
    this.target.removeEventListener('pointerdown', this.onPointerDown);
    this.target.removeEventListener('pointermove', this.onPointerMove);
    this.target.removeEventListener('pointerup', this.onPointerUp);
    this.target.removeEventListener('pointercancel', this.onPointerCancel);
  }

  private position(event: PointerEvent): { x: number; y: number } {
    const rect = this.target.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  private onPointerDown = (event: PointerEvent): void => {
    const { x, y } = this.position(event);
    this.pointer.x = x;
    this.pointer.y = y;
    this.pointer.down = true;
    this.pointer.justPressed = true;
    this.pressTime = performance.now();
    this.pressX = x;
    this.pressY = y;
  };

  private onPointerMove = (event: PointerEvent): void => {
    const { x, y } = this.position(event);
    this.pointer.x = x;
    this.pointer.y = y;
  };

  private onPointerUp = (event: PointerEvent): void => {
    const { x, y } = this.position(event);
    this.pointer.x = x;
    this.pointer.y = y;
    this.pointer.down = false;
    const quick = performance.now() - this.pressTime <= MAX_TAP_DURATION_MS;
    const still = Math.hypot(x - this.pressX, y - this.pressY) <= MAX_TAP_TRAVEL_PX;
    if (quick && still) {
      this.pointer.tap = { x, y };
    }
  };

  private onPointerCancel = (): void => {
    this.pointer.down = false;
  };
}
