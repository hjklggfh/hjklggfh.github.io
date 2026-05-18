import type { Camera } from '../core/Camera';
import { chunkKey, floorDiv } from '../core/math';
import { CHUNK_SIZE, TerrainKind, TILE_SIZE } from '../world/constants';
import type { TileRegistry } from '../world/tiles';
import type { Chunk, WorldMap } from '../world/WorldMap';

export interface RenderStats {
  visibleChunks: number;
  cachedChunks: number;
  visibleTiles: number;
}

export interface AtmosphereState {
  timeOfDay: number;
  weather: 'clear' | 'rain' | 'fog' | 'wind';
  weatherIntensity: number;
  dayNightTint: string;
  globalAlpha: number;
}

export class CanvasRenderer {
  private readonly chunks = new Map<string, Chunk>();
  private frame = 0;
  stats: RenderStats = { visibleChunks: 0, cachedChunks: 0, visibleTiles: 0 };

  constructor(
    private readonly ctx: CanvasRenderingContext2D,
    private readonly registry: TileRegistry,
  ) {
    this.ctx.imageSmoothingEnabled = false;
  }

  setRegistry(registry: TileRegistry): CanvasRenderer {
    return new CanvasRenderer(this.ctx, registry);
  }

  render(map: WorldMap, camera: Camera, atmosphere: AtmosphereState, timeSeconds: number): void {
    const ctx = this.ctx;
    const dpr = window.devicePixelRatio || 1;
    const pixelWidth = Math.floor(camera.viewportWidth * dpr);
    const pixelHeight = Math.floor(camera.viewportHeight * dpr);
    if (ctx.canvas.width !== pixelWidth || ctx.canvas.height !== pixelHeight) {
      ctx.canvas.width = pixelWidth;
      ctx.canvas.height = pixelHeight;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, camera.viewportWidth, camera.viewportHeight);

    const visible = camera.visibleWorldRect(TILE_SIZE * 2);
    const minChunkX = Math.max(0, floorDiv(visible.x, TILE_SIZE * CHUNK_SIZE));
    const minChunkY = Math.max(0, floorDiv(visible.y, TILE_SIZE * CHUNK_SIZE));
    const maxChunkX = Math.min(map.chunksX - 1, floorDiv(visible.x + visible.w, TILE_SIZE * CHUNK_SIZE));
    const maxChunkY = Math.min(map.chunksY - 1, floorDiv(visible.y + visible.h, TILE_SIZE * CHUNK_SIZE));

    let visibleChunks = 0;
    let visibleTiles = 0;
    for (let cy = minChunkY; cy <= maxChunkY; cy++) {
      for (let cx = minChunkX; cx <= maxChunkX; cx++) {
        const chunk = this.getChunk(map, cx, cy, timeSeconds);
        chunk.lastTouched = this.frame;
        visibleChunks++;
        visibleTiles += chunk.width * chunk.height;
        const sx = Math.floor((chunk.startX * TILE_SIZE - camera.x) * camera.zoom);
        const sy = Math.floor((chunk.startY * TILE_SIZE - camera.y) * camera.zoom);
        const sw = Math.ceil(chunk.width * TILE_SIZE * camera.zoom);
        const sh = Math.ceil(chunk.height * TILE_SIZE * camera.zoom);
        ctx.drawImage(chunk.canvas, sx, sy, sw, sh);
      }
    }

    this.renderAnimatedOverlays(map, camera, atmosphere, timeSeconds);
    this.renderDiscoveryMask(map, camera);
    this.renderAtmosphere(camera, atmosphere, timeSeconds);
    this.pruneChunks();
    this.frame++;
    this.stats = { visibleChunks, cachedChunks: this.chunks.size, visibleTiles };
  }

  invalidateAll(): void {
    for (const chunk of this.chunks.values()) chunk.dirty = true;
  }

  invalidateTile(x: number, y: number): void {
    const key = chunkKey(Math.floor(x / CHUNK_SIZE), Math.floor(y / CHUNK_SIZE));
    const chunk = this.chunks.get(key);
    if (chunk) chunk.dirty = true;
  }

  private getChunk(map: WorldMap, cx: number, cy: number, timeSeconds: number): Chunk {
    const key = chunkKey(cx, cy);
    let chunk = this.chunks.get(key);
    if (!chunk) {
      const startX = cx * CHUNK_SIZE;
      const startY = cy * CHUNK_SIZE;
      const width = Math.min(CHUNK_SIZE, map.width - startX);
      const height = Math.min(CHUNK_SIZE, map.height - startY);
      const canvas = document.createElement('canvas');
      canvas.width = width * TILE_SIZE;
      canvas.height = height * TILE_SIZE;
      chunk = { cx, cy, startX, startY, width, height, dirty: true, lastTouched: this.frame, canvas };
      this.chunks.set(key, chunk);
    }
    if (chunk.dirty) {
      this.renderChunk(map, chunk, timeSeconds);
      chunk.dirty = false;
    }
    return chunk;
  }

  private renderChunk(map: WorldMap, chunk: Chunk, timeSeconds: number): void {
    const ctx = chunk.canvas.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, chunk.canvas.width, chunk.canvas.height);

    for (let localY = 0; localY < chunk.height; localY++) {
      for (let localX = 0; localX < chunk.width; localX++) {
        const x = chunk.startX + localX;
        const y = chunk.startY + localY;
        const ids = map.toTileIds(x, y, timeSeconds);
        this.drawTile(ctx, ids.ground, localX * TILE_SIZE, localY * TILE_SIZE, x, y, timeSeconds);
      }
    }

    for (let localY = 0; localY < chunk.height; localY++) {
      for (let localX = 0; localX < chunk.width; localX++) {
        const x = chunk.startX + localX;
        const y = chunk.startY + localY;
        const ids = map.toTileIds(x, y, timeSeconds);
        if (ids.object) {
          const sway = map.get(x, y).terrain === TerrainKind.Forest ? Math.sin(timeSeconds * 1.5 + x * 0.4) * 1 : 0;
          this.drawTile(ctx, ids.object, localX * TILE_SIZE + sway, localY * TILE_SIZE, x, y, timeSeconds);
        }
      }
    }

    for (let localY = 0; localY < chunk.height; localY++) {
      for (let localX = 0; localX < chunk.width; localX++) {
        const x = chunk.startX + localX;
        const y = chunk.startY + localY;
        const ids = map.toTileIds(x, y, timeSeconds);
        if (ids.overlay) {
          ctx.globalAlpha = 0.55;
          this.drawTile(ctx, ids.overlay, localX * TILE_SIZE, localY * TILE_SIZE, x, y, timeSeconds);
          ctx.globalAlpha = 1;
        }
      }
    }
  }

  private drawTile(
    ctx: CanvasRenderingContext2D,
    tileId: number,
    dx: number,
    dy: number,
    x: number,
    y: number,
    timeSeconds: number,
  ): void {
    const tile = this.registry.byId.get(tileId);
    if (!tile) return;
    const sprite = this.registry.sprites[tile.spriteId];
    if (!sprite) return;
    const { width: sourceW, height: sourceH } = this.getImageSize(sprite);
    const sw = sourceW > 0 ? Math.min(this.registry.tileSize, sourceW) : this.registry.tileSize;
    const sh = sourceH > 0 ? Math.min(this.registry.tileSize, sourceH) : this.registry.tileSize;

    let sx = 0;
    let sy = 0;
    if (tile.animated && typeof sourceW === 'number' && sourceW >= this.registry.tileSize * 2) {
      const frames = Math.max(1, Math.floor(sourceW / this.registry.tileSize));
      sx = (Math.floor(timeSeconds * 3 + x * 0.13 + y * 0.11) % frames) * this.registry.tileSize;
    }

    ctx.drawImage(sprite, sx, sy, sw, sh, Math.round(dx), Math.round(dy), TILE_SIZE, TILE_SIZE);
  }

  private getImageSize(image: CanvasImageSource): { width: number; height: number } {
    const source = image as unknown as Record<string, unknown>;
    const naturalWidth = source.naturalWidth;
    const naturalHeight = source.naturalHeight;
    const width = source.width;
    const height = source.height;
    const displayWidth = source.displayWidth;
    const displayHeight = source.displayHeight;
    return {
      width:
        (typeof naturalWidth === 'number' && naturalWidth > 0 ? naturalWidth : undefined) ??
        (typeof width === 'number' && width > 0 ? width : undefined) ??
        (typeof displayWidth === 'number' && displayWidth > 0 ? displayWidth : undefined) ??
        this.registry.tileSize,
      height:
        (typeof naturalHeight === 'number' && naturalHeight > 0 ? naturalHeight : undefined) ??
        (typeof height === 'number' && height > 0 ? height : undefined) ??
        (typeof displayHeight === 'number' && displayHeight > 0 ? displayHeight : undefined) ??
        this.registry.tileSize,
    };
  }

  private renderAnimatedOverlays(map: WorldMap, camera: Camera, atmosphere: AtmosphereState, timeSeconds: number): void {
    const ctx = this.ctx;
    const visible = camera.visibleWorldRect(TILE_SIZE);
    const minX = Math.max(0, Math.floor(visible.x / TILE_SIZE));
    const minY = Math.max(0, Math.floor(visible.y / TILE_SIZE));
    const maxX = Math.min(map.width - 1, Math.ceil((visible.x + visible.w) / TILE_SIZE));
    const maxY = Math.min(map.height - 1, Math.ceil((visible.y + visible.h) / TILE_SIZE));
    const visibleRivers = map.rivers.filter((river) => {
      const margin = 12;
      const minRiverX = Math.min(...river.points.map((point) => point.x - point.width - margin));
      const maxRiverX = Math.max(...river.points.map((point) => point.x + point.width + margin));
      const minRiverY = Math.min(...river.points.map((point) => point.y - point.width - margin));
      const maxRiverY = Math.max(...river.points.map((point) => point.y + point.width + margin));
      return minRiverX <= maxX && maxRiverX >= minX && minRiverY <= maxY && maxRiverY >= minY;
    });

    ctx.save();
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const cell = map.get(x, y);
        if (cell.terrain === TerrainKind.Water) {
          const screen = camera.worldToScreen(x * TILE_SIZE, y * TILE_SIZE);
          const riverFlow = this.riverFlowAt(visibleRivers, x + 0.5, y + 0.5);
          ctx.globalAlpha = 0.16 + cell.waterDepth * 0.08;
          ctx.fillStyle = '#b6e7ef';
          const wave = Math.sin(timeSeconds * 3 + x * 0.65 + y * 0.31) * 2;
          ctx.fillRect(screen.x + 4 * camera.zoom, screen.y + (14 + wave) * camera.zoom, 14 * camera.zoom, 1 * camera.zoom);
          if (riverFlow) {
            const phase = (timeSeconds * 5.4 + riverFlow.t * 18 + x * 0.09 + y * 0.06) % 1;
            const px = (6 + phase * 18) * camera.zoom;
            const py = (16 + Math.sin(timeSeconds * 4 + riverFlow.t * 11) * 2) * camera.zoom;
            ctx.globalAlpha = 0.22 + cell.waterDepth * 0.18;
            ctx.strokeStyle = '#d4f3ee';
            ctx.lineWidth = Math.max(1, camera.zoom);
            ctx.beginPath();
            ctx.moveTo(screen.x + px - riverFlow.dx * 7 * camera.zoom, screen.y + py - riverFlow.dy * 7 * camera.zoom);
            ctx.lineTo(screen.x + px + riverFlow.dx * 7 * camera.zoom, screen.y + py + riverFlow.dy * 7 * camera.zoom);
            ctx.stroke();
          }
        }
        if ((cell.terrain === TerrainKind.Grass || cell.terrain === TerrainKind.Meadow) && atmosphere.weather === 'wind' && (x * 7 + y * 5) % 9 === 0) {
          const screen = camera.worldToScreen(x * TILE_SIZE, y * TILE_SIZE);
          ctx.globalAlpha = 0.18 * atmosphere.weatherIntensity;
          ctx.fillStyle = '#dbe98d';
          const sway = Math.sin(timeSeconds * 4 + x) * 2;
          ctx.fillRect(screen.x + (15 + sway) * camera.zoom, screen.y + 19 * camera.zoom, 1 * camera.zoom, 5 * camera.zoom);
        }
      }
    }
    ctx.restore();
  }

  private riverFlowAt(rivers: WorldMap['rivers'], x: number, y: number): { dx: number; dy: number; t: number } | null {
    let best: { distance: number; dx: number; dy: number; t: number } | null = null;
    for (const river of rivers) {
      for (let i = 0; i < river.points.length - 1; i++) {
        const a = river.points[i];
        const b = river.points[i + 1];
        const result = this.pointToSegmentDistance(x, y, a.x, a.y, b.x, b.y);
        const width = Math.max(a.width, b.width) + 0.8;
        if (result.distance > width) continue;
        if (!best || result.distance < best.distance) {
          const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
          best = {
            distance: result.distance,
            dx: (b.x - a.x) / len,
            dy: (b.y - a.y) / len,
            t: (i + result.t) / Math.max(1, river.points.length - 1),
          };
        }
      }
    }
    return best;
  }

  private pointToSegmentDistance(px: number, py: number, ax: number, ay: number, bx: number, by: number): { distance: number; t: number } {
    const abx = bx - ax;
    const aby = by - ay;
    const lenSq = abx * abx + aby * aby;
    const t = lenSq === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * abx + (py - ay) * aby) / lenSq));
    const nx = ax + abx * t;
    const ny = ay + aby * t;
    return { distance: Math.hypot(px - nx, py - ny), t };
  }

  private renderDiscoveryMask(map: WorldMap, camera: Camera): void {
    const ctx = this.ctx;
    const visible = camera.visibleWorldRect(TILE_SIZE);
    const minX = Math.max(0, Math.floor(visible.x / TILE_SIZE));
    const minY = Math.max(0, Math.floor(visible.y / TILE_SIZE));
    const maxX = Math.min(map.width - 1, Math.ceil((visible.x + visible.w) / TILE_SIZE));
    const maxY = Math.min(map.height - 1, Math.ceil((visible.y + visible.h) / TILE_SIZE));
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.46)';
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        if (map.get(x, y).discovered) continue;
        const screen = camera.worldToScreen(x * TILE_SIZE, y * TILE_SIZE);
        ctx.fillRect(screen.x, screen.y, Math.ceil(TILE_SIZE * camera.zoom), Math.ceil(TILE_SIZE * camera.zoom));
      }
    }
    ctx.restore();
  }

  private renderAtmosphere(camera: Camera, atmosphere: AtmosphereState, timeSeconds: number): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = atmosphere.globalAlpha;
    ctx.fillStyle = atmosphere.dayNightTint;
    ctx.fillRect(0, 0, camera.viewportWidth, camera.viewportHeight);
    ctx.restore();

    if (atmosphere.weather === 'fog') {
      ctx.save();
      ctx.globalAlpha = 0.16 * atmosphere.weatherIntensity;
      ctx.fillStyle = '#d6ded2';
      const offset = (timeSeconds * 12) % 120;
      for (let y = -40; y < camera.viewportHeight + 40; y += 74) {
        for (let x = -120; x < camera.viewportWidth + 120; x += 160) {
          ctx.fillRect(x + offset, y + Math.sin(timeSeconds + y) * 8, 96, 8);
          ctx.fillRect(x + offset + 42, y + 18, 128, 7);
        }
      }
      ctx.restore();
    }

    if (atmosphere.weather === 'rain') {
      ctx.save();
      ctx.globalAlpha = 0.28 * atmosphere.weatherIntensity;
      ctx.strokeStyle = '#9ab7c6';
      ctx.lineWidth = 1;
      const count = Math.floor((camera.viewportWidth * camera.viewportHeight) / 9000);
      for (let i = 0; i < count; i++) {
        const x = (i * 97 + timeSeconds * 240) % (camera.viewportWidth + 60);
        const y = (i * 53 + timeSeconds * 420) % (camera.viewportHeight + 60);
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - 8, y + 18);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  private pruneChunks(): void {
    if (this.chunks.size < 120) return;
    for (const [key, chunk] of this.chunks) {
      if (this.frame - chunk.lastTouched > 180) this.chunks.delete(key);
    }
  }
}
