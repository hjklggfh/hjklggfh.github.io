# Architecture Notes

## Runtime Flow

`Game` owns the main loop:

1. `AssetManager` loads project assets and builds a tile registry.
2. `WorldGenerator` creates a deterministic 500×500 tile world.
3. `CanvasRenderer` renders only visible 32×32 chunks.
4. `InputManager` updates player intent.
5. `Player`, `NPC`, `WorldAtmosphere`, and UI update every fixed step.
6. `SaveSystem` persists seed, player, inventory, atmosphere, and NPC state to localStorage.

## Extension Points

- Add new terrain: extend `TerrainKind`, `WorldMap.toTileIds`, and `WorldGenerator`.
- Add new objects: extend `ObjectKind`, `WorldMap.toTileIds`, and collision rules.
- Add explicit asset metadata: enrich `TileDefinition` and `AssetManager`.
- Add combat: replace `Game.handleNPCAction` with a combat scene/state.
- Add quests: attach quest state to `NPCProfile` and persist it in `SaveData`.
- Add pathfinding: create a service over `WorldMap.isBlockedTile`.

## Rendering Contract

World tile size is fixed at 32×32 pixels. External tilesets may be 16, 24, 32, 48, or 64 pixels; `AssetManager` detects source tile size, slices sheets, and scales slices to the runtime 32×32 canvas tile.

## Asset Naming

Filename classification is intentionally tolerant. For production, prefer adding sidecar metadata later so each tileset can declare:

- source tile size
- collision
- animation frames
- layer
- terrain tags
- object tags
