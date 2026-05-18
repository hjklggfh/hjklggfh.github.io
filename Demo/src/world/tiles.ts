export type TileLayer = 'ground' | 'object' | 'overlay';

export interface TileDefinition {
  id: number;
  key: string;
  layer: TileLayer;
  spriteId: string;
  walkable: boolean;
  animated?: boolean;
  tags: string[];
}

export interface TileRegistry {
  tileSize: number;
  sprites: Record<string, CanvasImageSource>;
  tiles: TileDefinition[];
  byId: Map<number, TileDefinition>;
  byKey: Map<string, TileDefinition>;
  source: 'builtin' | 'project-assets' | 'browser-directory' | 'mixed';
}

export const TileIds = {
  GrassA: 1,
  GrassB: 2,
  GrassFlower: 3,
  GrassDark: 4,
  WaterA: 5,
  WaterB: 6,
  Sand: 7,
  Road: 8,
  ForestFloor: 9,
  Mountain: 10,
  Cliff: 11,
  Bridge: 12,
  BridgeHorizontal: 13,
  BridgeVertical: 14,
  TreeOak: 100,
  TreePine: 101,
  HouseWall: 102,
  HouseRoof: 103,
  Fence: 104,
  Lantern: 105,
  Mist: 106,
  HouseDoor: 107,
  HouseWindow: 108,
  HouseEave: 109,
  FenceHorizontal: 110,
  FenceVertical: 111,
  FencePost: 112,
  GatePost: 113,
  MarketStall: 114,
  MarketSign: 115,
  Inn: 116,
  Hill: 117,
  CaveFloor: 118,
  CaveWall: 119,
  CaveEntrance: 120,
  TreasureChest: 121,
  HerbPatch: 122,
  TeleportArray: 123,
  CaveExit: 124,
  SectGround: 125,
  SectHall: 126,
  SectPillar: 127,
  SectShop: 128,
  SpiritPool: 129,
  TaskBoard: 130,
} as const;

export type TileId = (typeof TileIds)[keyof typeof TileIds];

export function cloneRegistry(registry: TileRegistry): TileRegistry {
  return {
    tileSize: registry.tileSize,
    sprites: { ...registry.sprites },
    tiles: registry.tiles.map((tile) => ({ ...tile, tags: [...tile.tags] })),
    byId: new Map(registry.byId),
    byKey: new Map(registry.byKey),
    source: registry.source,
  };
}
