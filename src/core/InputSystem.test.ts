import { afterEach, describe, expect, it, vi } from 'vitest';
import { InputSystem } from './InputSystem';

/** EventTarget exercises the actual listener lifecycle without requiring a browser runtime. */
class Surface extends EventTarget {
  readonly view = new EventTarget();
  readonly ownerDocument = Object.assign(new EventTarget(), {
    defaultView: this.view,
    hidden: false,
  });
  readonly rect = { left: 100, top: 50, width: 640, height: 480 };
  readonly captures = new Set<number>();

  getBoundingClientRect() {
    return this.rect;
  }
  setPointerCapture(id: number) {
    this.captures.add(id);
  }
  hasPointerCapture(id: number) {
    return this.captures.has(id);
  }
  releasePointerCapture(id: number) {
    this.captures.delete(id);
    this.pointer('lostpointercapture', { pointerId: id });
  }

  pointer(type: string, overrides: Partial<PointerEvent> = {}) {
    const event = Object.assign(new Event(type, { cancelable: true }), {
      pointerId: 1,
      isPrimary: true,
      button: 0,
      buttons: 1,
      clientX: 200,
      clientY: 150,
      ...overrides,
    });
    this.dispatchEvent(event);
    return event;
  }
}

const inputs: InputSystem[] = [];
function setup(isPlayable?: (point: { x: number; y: number }) => boolean) {
  const surface = new Surface();
  const input = new InputSystem(surface as unknown as HTMLElement, isPlayable);
  inputs.push(input);
  return { surface, input };
}

afterEach(() => {
  for (const input of inputs.splice(0)) input.destroy();
  vi.restoreAllMocks();
});

describe('InputSystem holds', () => {
  it('ignores a margin press without cancelling an existing tap journey', () => {
    const { surface, input } = setup((point) => point.y >= 50);
    surface.pointer('pointerdown');
    surface.pointer('pointerup', { buttons: 0 });
    expect(input.consumeMovement().tap).not.toBeNull();
    surface.pointer('pointerdown', { clientY: 75 });
    surface.pointer('pointerup', { clientY: 75, buttons: 0 });
    expect(input.consumeMovement()).toEqual({
      held: null,
      following: false,
      tap: null,
      cancelled: false,
    });
  });

  it('confirms following on drag or elapsed hold time, keeping initial taps straight', () => {
    const { surface, input } = setup();
    const now = vi.spyOn(performance, 'now').mockReturnValue(0);
    surface.pointer('pointerdown');
    expect(input.consumeMovement().following).toBe(false);
    now.mockReturnValue(251);
    expect(input.consumeMovement().following).toBe(true);
    surface.pointer('pointerup', { buttons: 0 });
    surface.pointer('pointerdown');
    surface.pointer('pointermove', { clientX: 220 });
    expect(input.consumeMovement().following).toBe(true);
  });

  it('emits a short tap once, including when press and release occur between simulation ticks', () => {
    const { surface, input } = setup();
    surface.pointer('pointerdown');
    surface.pointer('pointerup', { buttons: 0, clientX: 203, clientY: 152 });
    expect(input.consumeMovement()).toEqual({
      held: null,
      following: false,
      tap: { x: 103, y: 102 },
      cancelled: true,
    });
    // Capture loss after a normal release must not turn a tap into cancellation.
    surface.pointer('lostpointercapture');
    expect(input.consumeMovement()).toEqual({
      held: null,
      following: false,
      tap: null,
      cancelled: false,
    });
  });

  it('a stationary long hold stops on release instead of creating a tap destination', () => {
    const { surface, input } = setup();
    const now = vi.spyOn(performance, 'now').mockReturnValue(0);
    surface.pointer('pointerdown');
    now.mockReturnValue(300);
    expect(input.consumeMovement().held).toEqual({ x: 100, y: 100 });
    surface.pointer('pointerup', { buttons: 0 });
    expect(input.consumeMovement()).toEqual({
      held: null,
      following: false,
      tap: null,
      cancelled: true,
    });
  });

  it('a drag that returns to its starting point cannot become a tap', () => {
    const { surface, input } = setup();
    surface.pointer('pointerdown');
    surface.pointer('pointermove', { clientX: 230 });
    surface.pointer('pointermove', { clientX: 200 });
    surface.pointer('pointerup', { buttons: 0 });
    expect(input.consumeMovement().tap).toBeNull();
  });

  it('rejects an out-of-bounds release even without an intervening pointer-move event', () => {
    const { surface, input } = setup();
    surface.pointer('pointerdown');
    surface.pointer('pointerup', { buttons: 0, clientX: 900 });
    expect(input.consumeMovement()).toEqual({
      held: null,
      following: false,
      tap: null,
      cancelled: true,
    });
  });

  it.each(['blur', 'resize', 'pagehide'])('%s cancels a queued or already-consumed tap', (type) => {
    const { surface, input } = setup();
    for (const consumed of [false, true]) {
      surface.pointer('pointerdown');
      surface.pointer('pointerup', { buttons: 0 });
      if (consumed) expect(input.consumeMovement().tap).not.toBeNull();
      surface.view.dispatchEvent(new Event(type));
      expect(input.consumeMovement()).toEqual({
        held: null,
        following: false,
        tap: null,
        cancelled: true,
      });
    }
  });

  it('never generates taps on pointer cancellation or from another finger', () => {
    const { surface, input } = setup();
    surface.pointer('pointerdown');
    surface.pointer('pointerup', { pointerId: 2, isPrimary: false, buttons: 0 });
    expect(input.consumeMovement()).toEqual({
      held: { x: 100, y: 100 },
      following: false,
      tap: null,
      cancelled: false,
    });
    surface.pointer('pointercancel');
    expect(input.consumeMovement()).toEqual({
      held: null,
      following: false,
      tap: null,
      cancelled: true,
    });
  });

  it('continues a stationary hold across polls, updates on drag, and stops on release', () => {
    const { surface, input } = setup();
    expect(input.heldPoint()).toBeNull();
    surface.pointer('pointerdown');
    expect(surface.hasPointerCapture(1)).toBe(true);
    expect(input.heldPoint()).toEqual({ x: 100, y: 100 });
    expect(input.heldPoint()).toEqual({ x: 100, y: 100 });
    surface.pointer('pointermove', { clientX: 345.5, clientY: 275.25 });
    expect(input.heldPoint()).toEqual({ x: 245.5, y: 225.25 });
    surface.pointer('pointerup', { buttons: 0 });
    expect(input.heldPoint()).toBeNull();
    expect(surface.hasPointerCapture(1)).toBe(false);
    surface.pointer('pointermove');
    expect(input.heldPoint()).toBeNull();
  });

  it.each(['pointercancel', 'lostpointercapture', 'pointerleave'])(
    '%s clears the hold until a new press',
    (type) => {
      const { surface, input } = setup();
      surface.pointer('pointerdown');
      surface.pointer(type);
      surface.pointer('pointermove');
      expect(input.heldPoint()).toBeNull();
      surface.pointer('pointerdown');
      expect(input.heldPoint()).toEqual({ x: 100, y: 100 });
    },
  );

  it.each(['blur', 'pagehide', 'resize'])('%s stops a hold even without pointer-up', (type) => {
    const { surface, input } = setup();
    surface.pointer('pointerdown');
    surface.view.dispatchEvent(new Event(type));
    expect(input.heldPoint()).toBeNull();
    surface.pointer('pointermove');
    expect(input.heldPoint()).toBeNull();
  });

  it('stops when the document becomes hidden', () => {
    const { surface, input } = setup();
    surface.pointer('pointerdown');
    surface.ownerDocument.hidden = true;
    surface.ownerDocument.dispatchEvent(new Event('visibilitychange'));
    expect(input.heldPoint()).toBeNull();
  });

  it('ignores other fingers and their releases, including after the owner ends', () => {
    const { surface, input } = setup();
    surface.pointer('pointerdown');
    const secondary = { pointerId: 2, isPrimary: false, clientX: 500 };
    surface.pointer('pointerdown', secondary);
    surface.pointer('pointermove', secondary);
    surface.pointer('pointercancel', secondary);
    surface.pointer('pointerup', secondary);
    expect(input.heldPoint()).toEqual({ x: 100, y: 100 });
    surface.pointer('pointerup');
    surface.pointer('pointermove', secondary);
    surface.pointer('pointerdown', secondary);
    expect(input.heldPoint()).toBeNull();
  });

  it('does not let a primary pointer of another device take over an active hold', () => {
    const { surface, input } = setup();
    surface.pointer('pointerdown');
    surface.pointer('pointerdown', { pointerId: 2, isPrimary: true, clientX: 500 });
    surface.pointer('pointermove', { pointerId: 2, clientX: 500 });
    expect(input.heldPoint()).toEqual({ x: 100, y: 100 });
  });

  it('ignores secondary mouse buttons and clears a hold when the primary button is released', () => {
    const { surface, input } = setup();
    surface.pointer('pointerdown', { button: 2, buttons: 2 });
    expect(input.heldPoint()).toBeNull();
    surface.pointer('pointerdown');
    surface.pointer('pointermove', { button: 0, buttons: 2 });
    expect(input.heldPoint()).toBeNull();
  });

  it('rejects presses in letterboxing and cancels immediately when a drag leaves the playable area', () => {
    const { surface, input } = setup((point) => point.y >= 50 && point.y < 300);
    surface.pointer('pointerdown', { clientY: 75 });
    surface.pointer('pointermove');
    expect(input.heldPoint()).toBeNull();
    surface.pointer('pointerdown');
    surface.pointer('pointermove', { clientY: 400 });
    surface.pointer('pointermove');
    expect(input.heldPoint()).toBeNull();
    surface.pointer('pointerdown');
    expect(input.heldPoint()).not.toBeNull();
  });

  it.each([{ clientX: 99 }, { clientX: 740 }, { clientY: 49 }, { clientY: 530 }])(
    'stops a captured pointer outside the canvas: %j',
    (point) => {
      const { surface, input } = setup();
      surface.pointer('pointerdown');
      surface.pointer('pointermove', point);
      expect(input.heldPoint()).toBeNull();
    },
  );

  it('rechecks a stationary pointer against changed layout and playable bounds', () => {
    let playable = true;
    const { surface, input } = setup(() => playable);
    surface.pointer('pointerdown');
    surface.rect.left = 120;
    expect(input.heldPoint()).toEqual({ x: 80, y: 100 });
    playable = false;
    expect(input.heldPoint()).toBeNull();
    playable = true;
    expect(input.heldPoint()).toBeNull();
  });

  it('does not keep moving when capture cannot be established', () => {
    const { surface, input } = setup();
    vi.spyOn(surface, 'setPointerCapture').mockImplementation(() => {
      throw new Error('Detached');
    });
    surface.pointer('pointerdown');
    expect(input.heldPoint()).toBeNull();
  });

  it('releases capture and removes listeners when destroyed', () => {
    const { surface, input } = setup();
    surface.pointer('pointerdown');
    input.destroy();
    expect(surface.hasPointerCapture(1)).toBe(false);
    surface.pointer('pointerdown');
    expect(input.heldPoint()).toBeNull();
  });
});
