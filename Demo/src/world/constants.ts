export const WORLD_TILES = 500;
export const TILE_SIZE = 32;
export const CHUNK_SIZE = 32;
export const WORLD_PIXELS = WORLD_TILES * TILE_SIZE;
export const WORLD_GENERATION_VERSION = 6;

export const enum TerrainKind {
  Grass = 0,
  Meadow = 1,
  Water = 2,
  Shore = 3,
  Forest = 4,
  Mountain = 5,
  Road = 6,
  Bridge = 7,
  Town = 8,
  Hill = 9,
  CaveFloor = 10,
  CaveWall = 11,
  SectGround = 12,
}

export const enum ObjectKind {
  None = 0,
  TreeOak = 1,
  TreePine = 2,
  HouseWall = 3,
  HouseRoof = 4,
  Fence = 5,
  Lantern = 6,
  Shrine = 7,
  HiddenCache = 8,
  HouseDoor = 9,
  HouseWindow = 10,
  HouseEave = 11,
  FenceHorizontal = 12,
  FenceVertical = 13,
  FencePost = 14,
  GatePost = 15,
  MarketStall = 16,
  MarketSign = 17,
  Inn = 18,
  CaveEntrance = 19,
  TreasureChest = 20,
  HerbPatch = 21,
  TeleportArray = 22,
  CaveExit = 23,
  SectHall = 24,
  SectPillar = 25,
  SectShop = 26,
  SpiritPool = 27,
  TaskBoard = 28,
}

export const enum BiomeKind {
  Lowland = 0,
  RiverPlain = 1,
  DenseForest = 2,
  Highland = 3,
  MountainPass = 4,
  Settlement = 5,
}
