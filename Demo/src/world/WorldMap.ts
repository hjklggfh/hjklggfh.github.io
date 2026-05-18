import { CHUNK_SIZE, ObjectKind, TerrainKind, WORLD_TILES } from './constants';
import { TileIds } from './tiles';
import type { ItemCategory } from '../inventory/Inventory';
import type { ItemStack } from '../inventory/Inventory';
import type { Sect } from '../sect/SectTypes';

export type { Sect } from '../sect/SectTypes';

export interface TileCell {
  terrain: TerrainKind;
  object: ObjectKind;
  elevation: number;
  moisture: number;
  road: number;
  forest: number;
  waterDepth: number;
  collision: boolean;
  discovered: boolean;
  regionId: number;
  bridgeAxis: 'horizontal' | 'vertical' | null;
}

export interface Chunk {
  cx: number;
  cy: number;
  startX: number;
  startY: number;
  width: number;
  height: number;
  dirty: boolean;
  lastTouched: number;
  canvas: HTMLCanvasElement;
}

export interface River {
  id: number;
  points: { x: number; y: number; width: number }[];
}

export interface Road {
  id: number;
  points: { x: number; y: number; width?: number }[];
  kind: 'main' | 'forest' | 'town' | 'secret';
}

export interface Settlement {
  id: number;
  name: string;
  kind: 'village' | 'town' | 'house' | 'market';
  x: number;
  y: number;
  radius: number;
  bounds: { x: number; y: number; w: number; h: number };
  gate?: { x: number; y: number; nx: number; ny: number; width: number };
  connectedSettlementIds: number[];
  marketInventory: MarketInventoryItem[];
}

export interface MarketInventoryItem {
  itemId: string;
  name: string;
  category: ItemCategory;
  price: number;
  stock: number;
  description: string;
}

export interface InterestPoint {
  id: number;
  name: string;
  kind: 'cave' | 'shrine' | 'herb' | 'hidden';
  x: number;
  y: number;
  discovered: boolean;
}

export interface BeastSpawn {
  id: string;
  name: string;
  x: number;
  y: number;
  level: number;
  temperament: 'passive' | 'territorial' | 'aggressive';
  radius: number;
  spriteId: 'beast_wolf' | 'beast_spirit' | 'beast_boar';
}

export interface RoadsideInn {
  id: number;
  name: string;
  x: number;
  y: number;
  price: number;
}

export interface TeleportNode {
  id: number;
  settlementId: number;
  sectId?: number;
  name: string;
  kind?: 'settlement' | 'sect';
  x: number;
  y: number;
  unlocked: boolean;
}

export interface CaveFeature {
  id: string;
  x: number;
  y: number;
  kind: 'treasure' | 'herb' | 'beast' | 'exit';
  claimed: boolean;
  loot?: ItemStack[];
  beast?: BeastSpawn;
}

export interface CaveEntrance {
  id: number;
  name: string;
  x: number;
  y: number;
  map: WorldMap;
}

export class WorldMap {
  readonly chunksX: number;
  readonly chunksY: number;
  readonly cells: TileCell[];
  readonly rivers: River[] = [];
  readonly roads: Road[] = [];
  readonly settlements: Settlement[] = [];
  readonly interestPoints: InterestPoint[] = [];
  readonly beasts: BeastSpawn[] = [];
  readonly inns: RoadsideInn[] = [];
  readonly teleportNodes: TeleportNode[] = [];
  readonly caves: CaveEntrance[] = [];
  readonly caveFeatures: CaveFeature[] = [];
  readonly sects: Sect[] = [];
  spawn = { x: 250, y: 250 };

  constructor(
    readonly width = WORLD_TILES,
    readonly height = WORLD_TILES,
    readonly kind: 'world' | 'cave' = 'world',
  ) {
    this.chunksX = Math.ceil(width / CHUNK_SIZE);
    this.chunksY = Math.ceil(height / CHUNK_SIZE);
    this.cells = new Array(width * height);
    for (let i = 0; i < this.cells.length; i++) {
      this.cells[i] = {
        terrain: TerrainKind.Grass,
        object: ObjectKind.None,
        elevation: 0,
        moisture: 0,
        road: 0,
        forest: 0,
        waterDepth: 0,
        collision: false,
        discovered: false,
        regionId: 0,
        bridgeAxis: null,
      };
    }
  }

  inBounds(x: number, y: number): boolean {
    return x >= 0 && x < this.width && y >= 0 && y < this.height;
  }

  index(x: number, y: number): number {
    return y * this.width + x;
  }

  get(x: number, y: number): TileCell {
    if (!this.inBounds(x, y)) {
      return this.cells[0];
    }
    return this.cells[this.index(x, y)];
  }

  set(x: number, y: number, patch: Partial<TileCell>): void {
    if (!this.inBounds(x, y)) return;
    Object.assign(this.cells[this.index(x, y)], patch);
  }

  isBlockedTile(x: number, y: number): boolean {
    if (!this.inBounds(x, y)) return true;
    return this.get(x, y).collision;
  }

  markDiscovered(cx: number, cy: number, radius: number): void {
    const minX = Math.max(0, Math.floor(cx - radius));
    const maxX = Math.min(this.width - 1, Math.ceil(cx + radius));
    const minY = Math.max(0, Math.floor(cy - radius));
    const maxY = Math.min(this.height - 1, Math.ceil(cy + radius));
    const r2 = radius * radius;
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const dx = x - cx;
        const dy = y - cy;
        if (dx * dx + dy * dy <= r2) this.get(x, y).discovered = true;
      }
    }
  }

  toTileIds(x: number, y: number, timeSeconds: number): { ground: number; object: number | null; overlay: number | null } {
    const cell = this.get(x, y);
    let ground: number;
    switch (cell.terrain) {
      case TerrainKind.Water:
        ground = Math.floor(timeSeconds * 2 + x * 0.17 + y * 0.11) % 2 === 0 ? TileIds.WaterA : TileIds.WaterB;
        break;
      case TerrainKind.Shore:
        ground = TileIds.Sand;
        break;
      case TerrainKind.Forest:
        ground = TileIds.ForestFloor;
        break;
      case TerrainKind.Mountain:
        ground = cell.elevation > 0.82 ? TileIds.Mountain : TileIds.Cliff;
        break;
      case TerrainKind.Hill:
        ground = TileIds.Hill;
        break;
      case TerrainKind.CaveFloor:
        ground = TileIds.CaveFloor;
        break;
      case TerrainKind.CaveWall:
        ground = TileIds.CaveWall;
        break;
      case TerrainKind.SectGround:
        ground = TileIds.SectGround;
        break;
      case TerrainKind.Road:
      case TerrainKind.Town:
        ground = TileIds.Road;
        break;
      case TerrainKind.Bridge:
        ground = cell.bridgeAxis === 'vertical' ? TileIds.BridgeVertical : TileIds.BridgeHorizontal;
        break;
      case TerrainKind.Meadow:
        ground = (x * 13 + y * 7) % 11 === 0 ? TileIds.GrassFlower : TileIds.GrassB;
        break;
      case TerrainKind.Grass:
      default:
        ground = (x * 19 + y * 23) % 9 === 0 ? TileIds.GrassB : TileIds.GrassA;
        break;
    }

    let object: number | null = null;
    switch (cell.object) {
      case ObjectKind.TreeOak:
        object = TileIds.TreeOak;
        break;
      case ObjectKind.TreePine:
        object = TileIds.TreePine;
        break;
      case ObjectKind.HouseWall:
        object = TileIds.HouseWall;
        break;
      case ObjectKind.HouseRoof:
        object = TileIds.HouseRoof;
        break;
      case ObjectKind.HouseDoor:
        object = TileIds.HouseDoor;
        break;
      case ObjectKind.HouseWindow:
        object = TileIds.HouseWindow;
        break;
      case ObjectKind.HouseEave:
        object = TileIds.HouseEave;
        break;
      case ObjectKind.Fence:
      case ObjectKind.FenceHorizontal:
        object = TileIds.FenceHorizontal;
        break;
      case ObjectKind.FenceVertical:
        object = TileIds.FenceVertical;
        break;
      case ObjectKind.FencePost:
        object = TileIds.FencePost;
        break;
      case ObjectKind.GatePost:
        object = TileIds.GatePost;
        break;
      case ObjectKind.MarketStall:
        object = TileIds.MarketStall;
        break;
      case ObjectKind.MarketSign:
        object = TileIds.MarketSign;
        break;
      case ObjectKind.Inn:
        object = TileIds.Inn;
        break;
      case ObjectKind.CaveEntrance:
        object = TileIds.CaveEntrance;
        break;
      case ObjectKind.TreasureChest:
        object = TileIds.TreasureChest;
        break;
      case ObjectKind.HerbPatch:
        object = TileIds.HerbPatch;
        break;
      case ObjectKind.TeleportArray:
        object = TileIds.TeleportArray;
        break;
      case ObjectKind.CaveExit:
        object = TileIds.CaveExit;
        break;
      case ObjectKind.SectHall:
        object = TileIds.SectHall;
        break;
      case ObjectKind.SectPillar:
        object = TileIds.SectPillar;
        break;
      case ObjectKind.SectShop:
        object = TileIds.SectShop;
        break;
      case ObjectKind.SpiritPool:
        object = TileIds.SpiritPool;
        break;
      case ObjectKind.TaskBoard:
        object = TileIds.TaskBoard;
        break;
      case ObjectKind.Lantern:
        object = TileIds.Lantern;
        break;
    }

    const overlay = cell.terrain === TerrainKind.Forest && cell.moisture > 0.72 && (x * 31 + y * 17) % 23 === 0 ? TileIds.Mist : null;
    return { ground, object, overlay };
  }
}
