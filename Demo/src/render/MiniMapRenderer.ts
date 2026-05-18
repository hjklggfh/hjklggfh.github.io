import type { WorldMap } from '../world/WorldMap';
import { TerrainKind } from '../world/constants';
import type { Player } from '../entities/Player';

export class MiniMapRenderer {
  private readonly canvas: HTMLCanvasElement;
  private readonly overlay: HTMLDivElement;
  private readonly closeButton: HTMLButtonElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly localSize = 168;
  private readonly expandedSize = 720;
  private readonly localRadius = 64;
  private size = this.localSize;
  private frameSkip = 0;
  private expanded = false;
  private dirty = true;
  private expandedZoom = 1;
  private expandedPan = { x: 0, y: 0 };
  private dragPointerId: number | null = null;
  private lastDrag = { x: 0, y: 0 };
  private lastExpandedMap: WorldMap | null = null;

  constructor(private readonly root: HTMLElement) {
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'minimap';
    this.canvas.width = this.localSize;
    this.canvas.height = this.localSize;
    this.overlay = document.createElement('div');
    this.overlay.className = 'world-map-overlay';
    this.overlay.hidden = true;
    this.closeButton = document.createElement('button');
    this.closeButton.className = 'world-map-overlay__close';
    this.closeButton.type = 'button';
    this.closeButton.textContent = '关闭';
    this.closeButton.addEventListener('click', () => this.closeExpanded());
    this.overlay.appendChild(this.closeButton);
    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas2D is unavailable.');
    this.ctx = ctx;
    this.canvas.addEventListener('wheel', this.onWheel, { passive: false });
    this.canvas.addEventListener('pointerdown', this.onPointerDown);
    this.canvas.addEventListener('pointermove', this.onPointerMove);
    this.canvas.addEventListener('pointerup', this.onPointerEnd);
    this.canvas.addEventListener('pointercancel', this.onPointerEnd);
    this.root.appendChild(this.canvas);
    this.root.appendChild(this.overlay);
  }

  toggleExpanded(): void {
    this.setExpanded(!this.expanded);
  }

  closeExpanded(): void {
    this.setExpanded(false);
  }

  private setExpanded(expanded: boolean): void {
    this.expanded = expanded;
    this.size = expanded ? this.expandedSize : this.localSize;
    this.canvas.width = this.size;
    this.canvas.height = this.size;
    this.canvas.classList.toggle('minimap--expanded', expanded);
    this.overlay.hidden = !expanded;
    if (expanded) {
      this.expandedZoom = 1;
      this.expandedPan = { x: 0, y: 0 };
      this.overlay.appendChild(this.canvas);
      this.overlay.appendChild(this.closeButton);
    } else {
      this.dragPointerId = null;
      this.root.appendChild(this.canvas);
    }
    this.dirty = true;
  }

  render(map: WorldMap, player: Player): void {
    this.frameSkip = (this.frameSkip + 1) % 6;
    if (!this.dirty && this.frameSkip !== 0) return;
    this.dirty = false;

    if (this.expanded) {
      this.renderExpanded(map, player);
      return;
    }
    this.renderLocal(map, player);
  }

  private renderLocal(map: WorldMap, player: Player): void {
    const ctx = this.ctx;
    const tile = player.currentTile();
    const span = this.localRadius * 2 + 1;
    const scale = this.size / span;
    const startX = tile.x - this.localRadius;
    const startY = tile.y - this.localRadius;

    ctx.clearRect(0, 0, this.size, this.size);
    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, this.size, this.size);

    for (let localY = 0; localY < span; localY++) {
      const y = startY + localY;
      for (let localX = 0; localX < span; localX++) {
        const x = startX + localX;
        if (!map.inBounds(x, y)) continue;
        const cell = map.get(x, y);
        if (!cell.discovered) continue;
        ctx.fillStyle = this.colorForTerrain(cell.terrain);
        ctx.fillRect(Math.floor(localX * scale), Math.floor(localY * scale), Math.ceil(scale) + 1, Math.ceil(scale) + 1);
      }
    }

    for (const settlement of map.settlements) {
      const sx = Math.round(settlement.x);
      const sy = Math.round(settlement.y);
      if (sx < startX || sx > startX + span || sy < startY || sy > startY + span) continue;
      if (!map.get(sx, sy).discovered) continue;
      ctx.fillStyle = '#c69a4a';
      ctx.fillRect(Math.floor((settlement.x - startX) * scale) - 2, Math.floor((settlement.y - startY) * scale) - 2, 4, 4);
    }

    for (const sect of map.sects) {
      const sx = Math.round(sect.x);
      const sy = Math.round(sect.y);
      if (sx < startX || sx > startX + span || sy < startY || sy > startY + span) continue;
      if (!map.get(sx, sy).discovered) continue;
      ctx.fillStyle = '#d7d58a';
      ctx.fillRect(Math.floor((sect.x - startX) * scale) - 2, Math.floor((sect.y - startY) * scale) - 2, 5, 5);
    }

    for (const beast of map.beasts) {
      if (beast.x < startX || beast.x > startX + span || beast.y < startY || beast.y > startY + span) continue;
      if (!map.get(beast.x, beast.y).discovered) continue;
      ctx.fillStyle = '#8b2f2f';
      ctx.fillRect(Math.floor((beast.x - startX) * scale), Math.floor((beast.y - startY) * scale), 2, 2);
    }

    ctx.fillStyle = '#f8f2d8';
    ctx.fillRect(Math.floor(this.localRadius * scale) - 2, Math.floor(this.localRadius * scale) - 2, 5, 5);
  }

  private renderExpanded(map: WorldMap, player: Player): void {
    this.lastExpandedMap = map;
    const ctx = this.ctx;
    const baseScale = Math.min(this.size / map.width, this.size / map.height);
    const scale = baseScale * this.expandedZoom;
    this.clampExpandedPan(map, scale);
    const offsetX = (this.size - map.width * scale) / 2 + this.expandedPan.x;
    const offsetY = (this.size - map.height * scale) / 2 + this.expandedPan.y;
    ctx.clearRect(0, 0, this.size, this.size);
    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, this.size, this.size);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, this.size, this.size);
    ctx.clip();

    for (let y = 0; y < map.height; y++) {
      for (let x = 0; x < map.width; x++) {
        const cell = map.get(x, y);
        if (!cell.discovered) continue;
        ctx.fillStyle = this.colorForTerrain(cell.terrain);
        ctx.fillRect(Math.floor(offsetX + x * scale), Math.floor(offsetY + y * scale), Math.ceil(scale) + 1, Math.ceil(scale) + 1);
      }
    }

    for (const settlement of map.settlements) {
      if (!map.get(Math.round(settlement.x), Math.round(settlement.y)).discovered) continue;
      ctx.fillStyle = '#c69a4a';
      const sx = offsetX + settlement.x * scale;
      const sy = offsetY + settlement.y * scale;
      ctx.fillRect(Math.floor(sx) - 3, Math.floor(sy) - 3, 7, 7);
      ctx.save();
      ctx.font = `${Math.max(10, Math.min(18, 9.5 * this.expandedZoom))}px "Microsoft YaHei", sans-serif`;
      ctx.textBaseline = 'bottom';
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(0,0,0,0.72)';
      ctx.fillStyle = '#fff3c4';
      ctx.strokeText(settlement.name, sx + 6, sy - 4);
      ctx.fillText(settlement.name, sx + 6, sy - 4);
      ctx.restore();
    }

    for (const sect of map.sects) {
      if (!map.get(Math.round(sect.x), Math.round(sect.y)).discovered) continue;
      ctx.fillStyle = '#d7d58a';
      const sx = offsetX + sect.x * scale;
      const sy = offsetY + sect.y * scale;
      ctx.fillRect(Math.floor(sx) - 4, Math.floor(sy) - 4, 9, 9);
      ctx.save();
      ctx.font = `${Math.max(10, Math.min(18, 9.5 * this.expandedZoom))}px "Microsoft YaHei", sans-serif`;
      ctx.textBaseline = 'bottom';
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(0,0,0,0.72)';
      ctx.fillStyle = '#eff0b0';
      ctx.strokeText(sect.name, sx + 8, sy - 5);
      ctx.fillText(sect.name, sx + 8, sy - 5);
      ctx.restore();
    }

    for (const inn of map.inns) {
      if (!map.get(inn.x, inn.y).discovered) continue;
      ctx.fillStyle = '#d9b66d';
      ctx.fillRect(Math.floor(offsetX + inn.x * scale) - 1, Math.floor(offsetY + inn.y * scale) - 1, 3, 3);
    }

    const tile = player.currentTile();
    ctx.fillStyle = '#f8f2d8';
    ctx.fillRect(Math.floor(offsetX + tile.x * scale) - 3, Math.floor(offsetY + tile.y * scale) - 3, 7, 7);
    ctx.restore();
  }

  private readonly onWheel = (event: WheelEvent): void => {
    if (!this.expanded) return;
    event.preventDefault();
    event.stopPropagation();
    const rect = this.canvas.getBoundingClientRect();
    const mx = event.clientX - rect.left;
    const my = event.clientY - rect.top;
    const oldZoom = this.expandedZoom;
    const nextZoom = Math.max(1, Math.min(8, oldZoom * (event.deltaY < 0 ? 1.18 : 0.84)));
    if (Math.abs(nextZoom - oldZoom) < 0.001) return;
    const map = this.lastExpandedMap;
    if (map) {
      const baseScale = Math.min(this.size / map.width, this.size / map.height);
      const oldScale = baseScale * oldZoom;
      const newScale = baseScale * nextZoom;
      const oldOffsetX = (this.size - map.width * oldScale) / 2 + this.expandedPan.x;
      const oldOffsetY = (this.size - map.height * oldScale) / 2 + this.expandedPan.y;
      const mapX = (mx - oldOffsetX) / oldScale;
      const mapY = (my - oldOffsetY) / oldScale;
      this.expandedPan.x = mx - (this.size - map.width * newScale) / 2 - mapX * newScale;
      this.expandedPan.y = my - (this.size - map.height * newScale) / 2 - mapY * newScale;
    }
    this.expandedZoom = nextZoom;
    this.dirty = true;
    this.renderLastFrameSoon();
  };

  private readonly onPointerDown = (event: PointerEvent): void => {
    if (!this.expanded) return;
    this.dragPointerId = event.pointerId;
    this.lastDrag = { x: event.clientX, y: event.clientY };
    this.canvas.setPointerCapture(event.pointerId);
  };

  private readonly onPointerMove = (event: PointerEvent): void => {
    if (!this.expanded || this.dragPointerId !== event.pointerId) return;
    this.expandedPan.x += event.clientX - this.lastDrag.x;
    this.expandedPan.y += event.clientY - this.lastDrag.y;
    this.lastDrag = { x: event.clientX, y: event.clientY };
    this.dirty = true;
    this.renderLastFrameSoon();
  };

  private readonly onPointerEnd = (event: PointerEvent): void => {
    if (this.dragPointerId !== event.pointerId) return;
    this.dragPointerId = null;
  };

  private clampExpandedPan(map: WorldMap, scale: number): void {
    const mapW = map.width * scale;
    const mapH = map.height * scale;
    const limitX = Math.max(0, (mapW - this.size) / 2);
    const limitY = Math.max(0, (mapH - this.size) / 2);
    this.expandedPan.x = Math.max(-limitX, Math.min(limitX, this.expandedPan.x));
    this.expandedPan.y = Math.max(-limitY, Math.min(limitY, this.expandedPan.y));
  }

  private renderLastFrameSoon(): void {
    this.frameSkip = 0;
  }

  private colorForTerrain(terrain: TerrainKind): string {
    switch (terrain) {
      case TerrainKind.Water:
      case TerrainKind.Bridge:
        return '#4d92b5';
      case TerrainKind.Mountain:
        return '#767b68';
      case TerrainKind.Hill:
        return '#8aa45a';
      case TerrainKind.Forest:
        return '#2f6238';
      case TerrainKind.CaveWall:
        return '#171814';
      case TerrainKind.CaveFloor:
        return '#8b7a55';
      case TerrainKind.SectGround:
        return '#9ca36f';
      case TerrainKind.Road:
      case TerrainKind.Town:
        return '#b89961';
      case TerrainKind.Shore:
        return '#d6c27a';
      default:
        return '#73a65a';
    }
  }
}
