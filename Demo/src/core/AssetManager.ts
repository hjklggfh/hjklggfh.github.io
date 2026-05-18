import { createBuiltinTileRegistry } from '../assets/builtinTiles';
import type { TileDefinition, TileLayer, TileRegistry } from '../world/tiles';

const projectAssetModules: Record<string, () => Promise<unknown>> = {
  ...import.meta.glob('/src/assets/**/*.{png,jpg,jpeg,webp,gif,bmp}', {
    query: '?url',
    import: 'default',
  }),
  ...import.meta.glob('/assets/**/*.{png,jpg,jpeg,webp,gif,bmp}', {
    query: '?url',
    import: 'default',
  }),
  ...import.meta.glob('/game-assets/**/*.{png,jpg,jpeg,webp,gif,bmp}', {
    query: '?url',
    import: 'default',
  }),
  ...import.meta.glob('/tilesets/**/*.{png,jpg,jpeg,webp,gif,bmp}', {
    query: '?url',
    import: 'default',
  }),
  ...import.meta.glob('/tiles/**/*.{png,jpg,jpeg,webp,gif,bmp}', {
    query: '?url',
    import: 'default',
  }),
  ...import.meta.glob('/sprites/**/*.{png,jpg,jpeg,webp,gif,bmp}', {
    query: '?url',
    import: 'default',
  }),
  ...import.meta.glob('/resources/**/*.{png,jpg,jpeg,webp,gif,bmp}', {
    query: '?url',
    import: 'default',
  }),
  ...import.meta.glob('/art/**/*.{png,jpg,jpeg,webp,gif,bmp}', {
    query: '?url',
    import: 'default',
  }),
  ...import.meta.glob('/素材/**/*.{png,jpg,jpeg,webp,gif,bmp}', {
    query: '?url',
    import: 'default',
  }),
};

interface BrowserFileHandle {
  kind: 'file';
  name: string;
  getFile(): Promise<File>;
}

interface BrowserDirectoryHandle {
  kind: 'directory';
  name: string;
  entries(): AsyncIterableIterator<[string, BrowserFileHandle | BrowserDirectoryHandle]>;
}

interface ClassifiedAsset {
  key: string;
  tags: string[];
  layer: TileLayer;
  walkable: boolean;
}

interface IndexedAssetTile {
  path: string;
  spriteId: string;
  classified: ClassifiedAsset;
  col: number;
  row: number;
}

export interface AssetScanReport {
  source: TileRegistry['source'];
  loadedImages: number;
  generatedTiles: number;
  tileSize: number;
  sourceTileSize?: number;
  warnings: string[];
}

function classify(path: string): ClassifiedAsset {
  const lower = path.toLowerCase();
  const has = (...words: string[]) => words.some((word) => lower.includes(word));

  if (has('water', 'river', 'lake', 'pond', 'sea')) {
    return { key: 'water.auto', tags: ['water'], layer: 'ground', walkable: false };
  }
  if (has('sand', 'shore', 'beach', 'bank')) {
    return { key: 'shore.auto', tags: ['shore'], layer: 'ground', walkable: true };
  }
  if (has('bridge')) {
    const directional = has('bridge_h', 'bridge-horizontal', 'bridge horizontal', 'horizontal_bridge') ? ['horizontal'] : has('bridge_v', 'bridge-vertical', 'bridge vertical', 'vertical_bridge') ? ['vertical'] : [];
    return { key: 'bridge.auto', tags: ['bridge', 'road', ...directional], layer: 'ground', walkable: true };
  }
  if (has('road', 'path', 'dirt', 'trail')) {
    return { key: 'road.auto', tags: ['road'], layer: 'ground', walkable: true };
  }
  if (has('forest_floor', 'forest-floor') || (has('forest', 'wood') && has('floor', 'ground', 'terrain'))) {
    return { key: 'forest.auto', tags: ['forest'], layer: 'ground', walkable: true };
  }
  if (has('tree', 'forest', 'wood')) {
    return { key: 'tree.auto', tags: ['tree', 'forest'], layer: 'object', walkable: false };
  }
  if (has('mountain', 'cliff', 'rock', 'hill')) {
    return { key: 'mountain.auto', tags: ['mountain'], layer: 'ground', walkable: false };
  }
  if (has('market', 'stall', 'bazaar', 'booth')) {
    return { key: 'market.auto', tags: ['market'], layer: 'object', walkable: true };
  }
  if (has('house', 'hut', 'roof', 'wall', 'door', 'window', 'eave', 'shop')) {
    return { key: 'house.auto', tags: ['house'], layer: 'object', walkable: false };
  }
  if (has('fence')) {
    const directional = has('fence_h', 'fence-horizontal', 'fence horizontal', 'horizontal_fence') ? ['horizontal'] : has('fence_v', 'fence-vertical', 'fence vertical', 'vertical_fence') ? ['vertical'] : [];
    return { key: 'fence.auto', tags: ['fence', ...directional], layer: 'object', walkable: false };
  }
  if (has('lantern', 'lamp')) {
    return { key: 'lantern.auto', tags: ['lantern', 'light'], layer: 'object', walkable: true };
  }
  if (has('npc', 'character', 'person', 'cultivator')) {
    return { key: 'npc.auto', tags: ['npc'], layer: 'object', walkable: false };
  }
  return { key: 'grass.auto', tags: ['grass'], layer: 'ground', walkable: true };
}

function imageFromUrl(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
    img.src = url;
  });
}

function getImageSize(image: CanvasImageSource): { width: number; height: number } {
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
      32,
    height:
      (typeof naturalHeight === 'number' && naturalHeight > 0 ? naturalHeight : undefined) ??
      (typeof height === 'number' && height > 0 ? height : undefined) ??
      (typeof displayHeight === 'number' && displayHeight > 0 ? displayHeight : undefined) ??
      32,
  };
}

function detectTileSize(images: CanvasImageSource[]): number {
  const candidates = [16, 24, 32, 48, 64];
  const scores = candidates.map((size) => {
    let score = 0;
    for (const image of images) {
      const { width, height } = getImageSize(image);
      if (width % size === 0) score += 2;
      if (height % size === 0) score += 2;
      if (width === size || height === size) score += 1;
    }
    return { size, score };
  });
  scores.sort((a, b) => b.score - a.score || Math.abs(32 - a.size) - Math.abs(32 - b.size));
  return scores[0]?.size ?? 32;
}

function cropTile(image: CanvasImageSource, sx: number, sy: number, sw: number, sh: number, tileSize: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = tileSize;
  canvas.height = tileSize;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas2D is unavailable.');
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, tileSize, tileSize);
  ctx.drawImage(image, sx, sy, sw, sh, 0, 0, tileSize, tileSize);
  return canvas;
}

function applyRecognizedSpritesToBuiltinTiles(tiles: TileDefinition[], indexed: IndexedAssetTile[]): void {
  const assignments: { keys: string[]; tags: string[]; layer: TileLayer }[] = [
    { keys: ['grass.a', 'grass.b', 'grass.flower', 'grass.dark'], tags: ['grass'], layer: 'ground' },
    { keys: ['water.a', 'water.b'], tags: ['water'], layer: 'ground' },
    { keys: ['sand'], tags: ['shore'], layer: 'ground' },
    { keys: ['road'], tags: ['road'], layer: 'ground' },
    { keys: ['forest.floor'], tags: ['forest'], layer: 'ground' },
    { keys: ['mountain', 'cliff'], tags: ['mountain'], layer: 'ground' },
    { keys: ['bridge', 'bridge.horizontal', 'bridge.vertical'], tags: ['bridge'], layer: 'ground' },
    { keys: ['tree.oak', 'tree.pine'], tags: ['tree'], layer: 'object' },
    { keys: ['house.wall', 'house.roof', 'house.door', 'house.window', 'house.eave'], tags: ['house'], layer: 'object' },
    { keys: ['fence', 'fence.horizontal', 'fence.vertical', 'fence.post', 'gate.post'], tags: ['fence'], layer: 'object' },
    { keys: ['market.stall', 'market.sign'], tags: ['market'], layer: 'object' },
    { keys: ['lantern'], tags: ['lantern'], layer: 'object' },
  ];

  for (const assignment of assignments) {
    const matches = indexed.filter(
      (entry) => entry.classified.layer === assignment.layer && assignment.tags.some((tag) => entry.classified.tags.includes(tag)),
    );
    if (matches.length === 0) continue;
    assignment.keys.forEach((key, index) => {
      const tile = tiles.find((entry) => entry.key === key);
      if (tile) tile.spriteId = matches[index % matches.length].spriteId;
    });
  }
}

function applyRecognizedEntitySprites(sprites: Record<string, CanvasImageSource>, indexed: IndexedAssetTile[]): void {
  const npcSprites = indexed.filter((entry) => entry.classified.tags.includes('npc'));
  if (npcSprites.length === 0) return;
  sprites.npc_robed = npcSprites[0].spriteId ? sprites[npcSprites[0].spriteId] : sprites.npc_robed;
  sprites.npc_trader = npcSprites[1]?.spriteId ? sprites[npcSprites[1].spriteId] : sprites.npc_trader;
  sprites.npc_guard = npcSprites[2]?.spriteId ? sprites[npcSprites[2].spriteId] : sprites.npc_guard;
  sprites.player = npcSprites[3]?.spriteId ? sprites[npcSprites[3].spriteId] : sprites.player;
}

function mergeAutoTiles(base: TileRegistry, images: { path: string; image: CanvasImageSource }[], source: TileRegistry['source']): TileRegistry {
  if (images.length === 0) {
    base.source = 'builtin';
    return base;
  }

  const sourceTileSize = detectTileSize(images.map((entry) => entry.image));
  const outputTileSize = base.tileSize;
  const sprites = { ...base.sprites };
  const tiles = base.tiles.map((tile) => ({ ...tile, tags: [...tile.tags] }));
  let nextTileId = 1000;
  let nextSpriteId = 0;
  const indexed: IndexedAssetTile[] = [];

  for (const entry of images) {
    const classified = classify(entry.path);
    const { width, height } = getImageSize(entry.image);
    const cols = Math.max(1, Math.floor(width / sourceTileSize));
    const rows = Math.max(1, Math.floor(height / sourceTileSize));
    const maxSlices = Math.min(cols * rows, 2048);
    for (let slice = 0; slice < maxSlices; slice++) {
      const col = slice % cols;
      const row = Math.floor(slice / cols);
      const spriteId = `asset_${nextSpriteId++}`;
      const key = `${classified.key}.${nextTileId}`;
      const sx = col * sourceTileSize;
      const sy = row * sourceTileSize;
      sprites[spriteId] =
        cols === 1 && rows === 1 && width === outputTileSize && height === outputTileSize
          ? entry.image
          : cropTile(entry.image, sx, sy, sourceTileSize, sourceTileSize, outputTileSize);
      indexed.push({ path: entry.path, spriteId, classified, col, row });
      const tile: TileDefinition = {
        id: nextTileId++,
        key,
        layer: classified.layer,
        spriteId,
        walkable: classified.walkable,
        tags: [...classified.tags, 'asset', `col:${col}`, `row:${row}`],
        animated: classified.tags.includes('water') && cols > 1,
      };
      tiles.push(tile);
    }
  }

  applyRecognizedSpritesToBuiltinTiles(tiles, indexed);
  applyRecognizedEntitySprites(sprites, indexed);

  return {
    tileSize: outputTileSize,
    sprites,
    tiles,
    byId: new Map(tiles.map((tile) => [tile.id, tile])),
    byKey: new Map(tiles.map((tile) => [tile.key, tile])),
    source,
  };
}

function detectSourceTileSize(images: { image: CanvasImageSource }[]): number | undefined {
  return images.length > 0 ? detectTileSize(images.map((entry) => entry.image)) : undefined;
}

export class AssetManager {
  registry: TileRegistry = createBuiltinTileRegistry();
  report: AssetScanReport = {
    source: 'builtin',
    loadedImages: 0,
    generatedTiles: this.registry.tiles.length,
    tileSize: this.registry.tileSize,
    warnings: [],
  };

  async loadProjectAssets(): Promise<void> {
    const warnings: string[] = [];
    const entries = Object.entries(projectAssetModules);
    const loaded: { path: string; image: CanvasImageSource }[] = [];
    for (const [path, loader] of entries) {
      try {
        const url = (await loader()) as string;
        loaded.push({ path, image: await imageFromUrl(url) });
      } catch (error) {
        warnings.push(error instanceof Error ? error.message : String(error));
      }
    }
    this.registry = mergeAutoTiles(createBuiltinTileRegistry(), loaded, loaded.length > 0 ? 'mixed' : 'builtin');
    this.report = {
      source: this.registry.source,
      loadedImages: loaded.length,
      generatedTiles: this.registry.tiles.length,
      tileSize: this.registry.tileSize,
      sourceTileSize: detectSourceTileSize(loaded),
      warnings,
    };
  }

  async loadBrowserDirectory(): Promise<AssetScanReport> {
    const picker = window as Window & {
      showDirectoryPicker?: () => Promise<BrowserDirectoryHandle>;
    };
    if (!picker.showDirectoryPicker) {
      this.report.warnings.push('当前浏览器不支持 File System Access API。');
      return this.report;
    }

    const dir = await picker.showDirectoryPicker();
    const loaded: { path: string; image: CanvasImageSource }[] = [];
    const warnings: string[] = [];
    await this.walkDirectory(dir, dir.name, loaded, warnings);
    this.registry = mergeAutoTiles(createBuiltinTileRegistry(), loaded, loaded.length > 0 ? 'browser-directory' : 'builtin');
    this.report = {
      source: this.registry.source,
      loadedImages: loaded.length,
      generatedTiles: this.registry.tiles.length,
      tileSize: this.registry.tileSize,
      sourceTileSize: detectSourceTileSize(loaded),
      warnings,
    };
    return this.report;
  }

  private async walkDirectory(
    dir: BrowserDirectoryHandle,
    prefix: string,
    loaded: { path: string; image: CanvasImageSource }[],
    warnings: string[],
  ): Promise<void> {
    for await (const [name, handle] of dir.entries()) {
      const path = `${prefix}/${name}`;
      if (handle.kind === 'directory') {
        await this.walkDirectory(handle, path, loaded, warnings);
        continue;
      }
      if (!/\.(png|jpe?g|webp|gif|bmp)$/i.test(name)) continue;
      try {
        const file = await handle.getFile();
        const url = URL.createObjectURL(file);
        try {
          loaded.push({ path, image: await imageFromUrl(url) });
        } finally {
          URL.revokeObjectURL(url);
        }
      } catch (error) {
        warnings.push(error instanceof Error ? error.message : String(error));
      }
    }
  }

  findTileByTags(layer: TileLayer, ...tags: string[]): TileDefinition | undefined {
    return this.registry.tiles.find((tile) => tile.layer === layer && tags.every((tag) => tile.tags.includes(tag)));
  }

  findTilesByTag(layer: TileLayer, tag: string): TileDefinition[] {
    return this.registry.tiles.filter((tile) => tile.layer === layer && tile.tags.includes(tag));
  }
}
