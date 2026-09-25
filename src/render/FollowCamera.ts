interface Point {
  x: number;
  y: number;
}

interface Bounds extends Point {
  width: number;
  height: number;
}

/**
 * Camera geometry in canvas CSS pixels, independent of Pixi and device pixel
 * ratio. The same transform drives presentation and pointer-to-world conversion.
 */
export class FollowCamera {
  private width = 0;
  private height = 0;
  private focus: Point;
  private offset = { x: 0, y: 0 };

  constructor(
    private readonly bounds: Bounds,
    readonly zoom: number,
  ) {
    if (!Number.isFinite(zoom) || zoom <= 0) throw new Error('Camera zoom must be positive');
    this.focus = { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
  }

  get transform(): { x: number; y: number; scale: number } {
    return { ...this.offset, scale: this.zoom };
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.update();
  }

  follow(point: Point): void {
    this.focus = { ...point };
    this.update();
  }

  toScreen(point: Point): Point {
    return { x: point.x * this.zoom + this.offset.x, y: point.y * this.zoom + this.offset.y };
  }

  /** Ignore canvas edges and margins around maps smaller than the viewport. */
  toWorld(point: Point): Point | null {
    if (
      !Number.isFinite(point.x) ||
      !Number.isFinite(point.y) ||
      point.x < 0 ||
      point.y < 0 ||
      point.x >= this.width ||
      point.y >= this.height
    )
      return null;
    const world = {
      x: (point.x - this.offset.x) / this.zoom,
      y: (point.y - this.offset.y) / this.zoom,
    };
    if (
      world.x < this.bounds.x ||
      world.y < this.bounds.y ||
      world.x >= this.bounds.x + this.bounds.width ||
      world.y >= this.bounds.y + this.bounds.height
    )
      return null;
    return world;
  }

  private update(): void {
    this.offset = {
      x: this.axisOffset(this.focus.x, this.bounds.x, this.bounds.width, this.width),
      y: this.axisOffset(this.focus.y, this.bounds.y, this.bounds.height, this.height),
    };
  }

  private axisOffset(focus: number, start: number, size: number, viewport: number): number {
    const scaledSize = size * this.zoom;
    // Centre each small axis independently, including nonzero world origins.
    if (scaledSize <= viewport) return (viewport - scaledSize) / 2 - start * this.zoom;
    const desired = viewport / 2 - focus * this.zoom;
    return Math.min(-start * this.zoom, Math.max(viewport - (start + size) * this.zoom, desired));
  }
}
