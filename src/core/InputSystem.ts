export interface PointerPosition {
  x: number;
  y: number;
}

/** One captured pointer owns the hold; game logic receives canvas CSS coordinates. */
export class InputSystem {
  private activePointerId: number | null = null;
  private clientX = 0;
  private clientY = 0;
  private readonly document: Document;
  private readonly view: Window | null;

  constructor(
    private readonly target: HTMLElement,
    private readonly isPlayable: (point: PointerPosition) => boolean = () => true,
  ) {
    this.document = target.ownerDocument;
    this.view = this.document.defaultView;
    target.addEventListener('pointerdown', this.onPointerDown);
    target.addEventListener('pointermove', this.onPointerMove);
    target.addEventListener('pointerup', this.onPointerEnd);
    target.addEventListener('pointercancel', this.onPointerEnd);
    target.addEventListener('lostpointercapture', this.onPointerEnd);
    target.addEventListener('pointerleave', this.onPointerEnd);
    this.view?.addEventListener('blur', this.cancelHold);
    this.view?.addEventListener('pagehide', this.cancelHold);
    this.view?.addEventListener('resize', this.cancelHold);
    this.document.addEventListener('visibilitychange', this.onVisibilityChange);
  }

  /** Poll each simulation step, even when no new pointer event has arrived. */
  heldPoint(): PointerPosition | null {
    if (this.activePointerId === null) return null;
    const rect = this.target.getBoundingClientRect();
    const point = { x: this.clientX - rect.left, y: this.clientY - rect.top };
    if (
      !Number.isFinite(point.x) ||
      !Number.isFinite(point.y) ||
      point.x < 0 ||
      point.y < 0 ||
      point.x >= rect.width ||
      point.y >= rect.height ||
      !this.isPlayable(point)
    ) {
      this.cancelHold();
      return null;
    }
    return point;
  }

  /** Cancellation is latched: moving back inside cannot restart an old hold. */
  cancelHold = (): void => {
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
    this.target.removeEventListener('pointerup', this.onPointerEnd);
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
    this.activePointerId = event.pointerId;
    this.clientX = event.clientX;
    this.clientY = event.clientY;
    if (!this.heldPoint()) return;
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
    this.heldPoint(); // Cancel immediately on crossing the playable boundary.
  };

  private onPointerEnd = (event: PointerEvent): void => {
    if (event.pointerId === this.activePointerId) this.cancelHold();
  };

  private onVisibilityChange = (): void => {
    if (this.document.hidden) this.cancelHold();
  };
}
