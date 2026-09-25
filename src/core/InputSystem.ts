export interface PointerPosition {
  x: number;
  y: number;
}

export interface MovementInput {
  held: PointerPosition | null;
  /** A drag or long hold has been confirmed; a pending tap moves straight. */
  following: boolean;
  tap: PointerPosition | null;
  cancelled: boolean;
}

export interface TapConfig {
  maxDurationMs: number;
  maxTravelPx: number;
}

/** One captured pointer owns the hold; game logic receives canvas CSS coordinates. */
export class InputSystem {
  private activePointerId: number | null = null;
  private clientX = 0;
  private clientY = 0;
  private pressX = 0;
  private pressY = 0;
  private pressTime = 0;
  private dragged = false;
  private tap: PointerPosition | null = null;
  private cancelled = false;
  private readonly document: Document;
  private readonly view: Window | null;

  constructor(
    private readonly target: HTMLElement,
    private readonly isPlayable: (point: PointerPosition) => boolean = () => true,
    private readonly tapConfig: TapConfig = { maxDurationMs: 250, maxTravelPx: 10 },
  ) {
    this.document = target.ownerDocument;
    this.view = this.document.defaultView;
    target.addEventListener('pointerdown', this.onPointerDown);
    target.addEventListener('pointermove', this.onPointerMove);
    target.addEventListener('pointerup', this.onPointerUp);
    target.addEventListener('pointercancel', this.onPointerEnd);
    target.addEventListener('lostpointercapture', this.onPointerEnd);
    target.addEventListener('pointerleave', this.onPointerEnd);
    this.view?.addEventListener('blur', this.cancelHold);
    this.view?.addEventListener('pagehide', this.cancelHold);
    this.view?.addEventListener('resize', this.cancelHold);
    this.document.addEventListener('visibilitychange', this.onVisibilityChange);
  }

  /** Drain gesture events once; a held pointer remains live between polls. */
  consumeMovement(): MovementInput {
    const held = this.heldPoint();
    const following =
      held !== null &&
      (this.dragged || performance.now() - this.pressTime > this.tapConfig.maxDurationMs);
    const input = { held, following, tap: this.tap, cancelled: this.cancelled };
    this.tap = null;
    this.cancelled = false;
    return input;
  }

  /** Poll each simulation step, even when no new pointer event has arrived. */
  heldPoint(): PointerPosition | null {
    if (this.activePointerId === null) return null;
    const point = this.playablePoint(this.clientX, this.clientY);
    if (!point) this.cancelHold();
    return point;
  }

  private playablePoint(clientX: number, clientY: number): PointerPosition | null {
    const rect = this.target.getBoundingClientRect();
    const point = { x: clientX - rect.left, y: clientY - rect.top };
    if (
      !Number.isFinite(point.x) ||
      !Number.isFinite(point.y) ||
      point.x < 0 ||
      point.y < 0 ||
      point.x >= rect.width ||
      point.y >= rect.height ||
      !this.isPlayable(point)
    ) {
      return null;
    }
    return point;
  }

  /** Cancellation is latched: moving back inside cannot restart an old hold. */
  cancelHold = (): void => {
    this.tap = null;
    this.cancelled = true;
    const id = this.activePointerId;
    this.activePointerId = null;
    if (id !== null && this.target.hasPointerCapture(id)) {
      this.target.releasePointerCapture(id);
    }
  };

  destroy(): void {
    this.cancelHold();
    this.target.removeEventListener('pointerdown', this.onPointerDown);
    this.target.removeEventListener('pointermove', this.onPointerMove);
    this.target.removeEventListener('pointerup', this.onPointerUp);
    this.target.removeEventListener('pointercancel', this.onPointerEnd);
    this.target.removeEventListener('lostpointercapture', this.onPointerEnd);
    this.target.removeEventListener('pointerleave', this.onPointerEnd);
    this.view?.removeEventListener('blur', this.cancelHold);
    this.view?.removeEventListener('pagehide', this.cancelHold);
    this.view?.removeEventListener('resize', this.cancelHold);
    this.document.removeEventListener('visibilitychange', this.onVisibilityChange);
  }

  private onPointerDown = (event: PointerEvent): void => {
    if (this.activePointerId !== null || !event.isPrimary || event.button !== 0) return;
    if (!this.playablePoint(event.clientX, event.clientY)) return;
    this.activePointerId = event.pointerId;
    this.clientX = event.clientX;
    this.clientY = event.clientY;
    this.pressX = event.clientX;
    this.pressY = event.clientY;
    this.pressTime = performance.now();
    this.dragged = false;
    this.tap = null;
    try {
      this.target.setPointerCapture(event.pointerId);
    } catch {
      // A detached surface or an ended pointer must not leave movement active.
      this.cancelHold();
      return;
    }
    event.preventDefault();
  };

  private onPointerMove = (event: PointerEvent): void => {
    if (event.pointerId !== this.activePointerId) return;
    // Also covers releasing the primary button while another mouse button stays down.
    if ((event.buttons & 1) === 0) {
      this.cancelHold();
      return;
    }
    this.clientX = event.clientX;
    this.clientY = event.clientY;
    this.trackDrag();
    this.heldPoint(); // Cancel immediately on crossing the playable boundary.
  };

  private trackDrag(): void {
    this.dragged ||=
      Math.hypot(this.clientX - this.pressX, this.clientY - this.pressY) >
      this.tapConfig.maxTravelPx;
  }

  private onPointerUp = (event: PointerEvent): void => {
    if (event.pointerId !== this.activePointerId) return;
    this.clientX = event.clientX;
    this.clientY = event.clientY;
    this.trackDrag();
    const point = this.heldPoint();
    const tapped =
      !this.dragged && performance.now() - this.pressTime <= this.tapConfig.maxDurationMs;
    // Clear ownership before releasing capture; the resulting lost-capture event
    // must not discard a completed tap. A normal drag/long-hold release just stops.
    this.cancelHold();
    if (point && tapped) this.tap = point;
  };

  private onPointerEnd = (event: PointerEvent): void => {
    if (event.pointerId === this.activePointerId) this.cancelHold();
  };

  private onVisibilityChange = (): void => {
    if (this.document.hidden) this.cancelHold();
  };
}
