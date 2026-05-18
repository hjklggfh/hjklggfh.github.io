import { clamp, Rect } from './math';

export class Camera {
  x = 0;
  y = 0;
  zoom = 2;
  targetZoom = 2;

  constructor(
    public viewportWidth = 1,
    public viewportHeight = 1,
    private worldWidthPx = 1,
    private worldHeightPx = 1,
  ) {}

  resize(width: number, height: number): void {
    this.viewportWidth = width;
    this.viewportHeight = height;
  }

  follow(targetX: number, targetY: number, delta: number): void {
    this.zoom += (this.targetZoom - this.zoom) * Math.min(1, delta * 8);
    const desiredX = targetX - this.viewportWidth / this.zoom / 2;
    const desiredY = targetY - this.viewportHeight / this.zoom / 2;
    this.x += (desiredX - this.x) * Math.min(1, delta * 7.5);
    this.y += (desiredY - this.y) * Math.min(1, delta * 7.5);
    this.clampToWorld();
  }

  setImmediateCenter(x: number, y: number): void {
    this.x = x - this.viewportWidth / this.zoom / 2;
    this.y = y - this.viewportHeight / this.zoom / 2;
    this.clampToWorld();
  }

  setWorldSize(widthPx: number, heightPx: number): void {
    this.worldWidthPx = widthPx;
    this.worldHeightPx = heightPx;
    this.clampToWorld();
  }

  worldToScreen(x: number, y: number): { x: number; y: number } {
    return {
      x: Math.round((x - this.x) * this.zoom),
      y: Math.round((y - this.y) * this.zoom),
    };
  }

  screenToWorld(x: number, y: number): { x: number; y: number } {
    return {
      x: x / this.zoom + this.x,
      y: y / this.zoom + this.y,
    };
  }

  visibleWorldRect(padding = 0): Rect {
    return {
      x: this.x - padding,
      y: this.y - padding,
      w: this.viewportWidth / this.zoom + padding * 2,
      h: this.viewportHeight / this.zoom + padding * 2,
    };
  }

  private clampToWorld(): void {
    const viewW = this.viewportWidth / this.zoom;
    const viewH = this.viewportHeight / this.zoom;
    this.x = clamp(this.x, 0, Math.max(0, this.worldWidthPx - viewW));
    this.y = clamp(this.y, 0, Math.max(0, this.worldHeightPx - viewH));
  }
}
